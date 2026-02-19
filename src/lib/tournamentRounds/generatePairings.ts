/**
 * Auto-Generate Pairings Algorithm
 *
 * Random pairing generation for WSDC format debates:
 * - Teams are shuffled randomly and paired sequentially
 * - If odd number of teams, last team gets a BYE
 * - Judges are allocated conflict-free (institution conflicts prevented)
 * - Hardest-to-staff debates (fewest eligible judges) are assigned first
 */

import { displayNameFromParticipant } from '@/lib/users/displayName';

import { prisma } from '@/lib/prisma';
import { TournamentRoundStatus, JudgeRole } from '@prisma/client';
import { getTeamsForTournament, getJudgesForTournament } from './queries';
import { hasInstitutionConflict } from './institutionConflict';
import { createBallotsForDebate } from '@/lib/ballots/createBallots';

// =============================================================================
// Types
// =============================================================================

export interface GenerateResult {
  success: boolean;
  debatesCreated: number;
  warnings: string[];
  error?: string;
}

interface TeamData {
  id: string;
  name: string;
  institutionId: string;
}

interface JudgeData {
  id: string; // participantId
  institutionId: string;
  userName: string | null;
}

// =============================================================================
// Algorithm
// =============================================================================

/**
 * Fisher-Yates shuffle for random ordering.
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generate pairings for a round.
 *
 * This replaces ALL existing debates and judge assignments for the round.
 * Only works when round is in DRAFT status.
 */
export async function generatePairings(
  roundId: string,
  tournamentId: string
): Promise<GenerateResult> {
  const warnings: string[] = [];

  // Step 1: Verify round exists and is in DRAFT status
  const round = await prisma.tournamentRound.findUnique({
    where: { id: roundId },
    select: { id: true, status: true, tournamentId: true },
  });

  if (!round) {
    return { success: false, debatesCreated: 0, warnings, error: 'Round not found' };
  }

  if (round.tournamentId !== tournamentId) {
    return { success: false, debatesCreated: 0, warnings, error: 'Round does not belong to this tournament' };
  }

  if (round.status !== TournamentRoundStatus.DRAFT) {
    return { success: false, debatesCreated: 0, warnings, error: 'Can only generate pairings for DRAFT rounds' };
  }

  // Step 2: Load teams and judges
  const teamsRaw = await getTeamsForTournament(tournamentId);
  const judgesRaw = await getJudgesForTournament(tournamentId);

  const teams: TeamData[] = teamsRaw.map((t) => ({
    id: t.id,
    name: t.name,
    institutionId: t.institutionId,
  }));

  const judges: JudgeData[] = judgesRaw.map((j) => ({
    id: j.id,
    institutionId: j.institutionId,
    userName: displayNameFromParticipant(j.person, j.user) || null,
  }));

  // Step 3: Validate minimums
  if (teams.length < 2) {
    return {
      success: false,
      debatesCreated: 0,
      warnings,
      error: 'Need at least 2 teams to generate pairings.',
    };
  }

  // Step 4: Shuffle teams and judges
  const shuffledTeams = shuffleArray(teams);
  const shuffledJudges = shuffleArray(judges);

  const hasOddTeams = teams.length % 2 !== 0;
  const numDebates = Math.floor(teams.length / 2);

  // Step 5: Create debate pairings
  interface DebatePlan {
    order: number;
    propTeamId: string | null;
    oppTeamId: string | null;
    isBye: boolean;
    propInstitutionId: string | null;
    oppInstitutionId: string | null;
    judgeIds: string[];
  }

  const debatePlans: DebatePlan[] = [];

  // Pair teams sequentially: (0,1), (2,3), (4,5), ...
  for (let i = 0; i < numDebates; i++) {
    const propTeam = shuffledTeams[i * 2];
    const oppTeam = shuffledTeams[i * 2 + 1];

    debatePlans.push({
      order: i,
      propTeamId: propTeam.id,
      oppTeamId: oppTeam.id,
      isBye: false,
      propInstitutionId: propTeam.institutionId,
      oppInstitutionId: oppTeam.institutionId,
      judgeIds: [],
    });

    // Check for same-institution matchup (warning)
    if (propTeam.institutionId === oppTeam.institutionId) {
      warnings.push(
        `Debate ${i + 1}: Same-institution matchup (${propTeam.name} vs ${oppTeam.name})`
      );
    }
  }

  // If odd number of teams, create a BYE for the last team
  if (hasOddTeams) {
    const byeTeam = shuffledTeams[shuffledTeams.length - 1];
    debatePlans.push({
      order: numDebates,
      propTeamId: byeTeam.id,
      oppTeamId: null,
      isBye: true,
      propInstitutionId: byeTeam.institutionId,
      oppInstitutionId: null,
      judgeIds: [],
    });
    warnings.push(`${byeTeam.name} receives a BYE this round.`);
  }

  // Step 6: Conflict-aware judge allocation
  //
  // Strategy:
  // 1. Build an eligible-judges list per debate, filter by institution conflict.
  // 2. Sort debates by eligible count ascending (hardest debates first).
  // 3. First pass: assign exactly 1 chair per debate from eligible judges.
  // 4. Second pass: fill panelists from remaining eligible judges (in pairs for odd panels).
  // 5. If a debate can't get a chair, leave it unstaffed and warn.

  const nonByeDebates = debatePlans.filter((d) => !d.isBye);
  const assignedJudgeIds = new Set<string>();

  /** Check whether a judge is eligible for a debate (no institution conflict & not yet assigned). */
  function eligibleFor(judge: JudgeData, debate: DebatePlan): boolean {
    if (assignedJudgeIds.has(judge.id)) return false;
    return !hasInstitutionConflict(
      judge.institutionId,
      debate.propInstitutionId,
      debate.oppInstitutionId
    );
  }

  // Sort debates by ascending eligible-judge count (hardest first).
  // We recompute eligibility dynamically, so this is the initial ordering hint.
  const debateOrder = [...nonByeDebates].sort((a, b) => {
    const aCount = shuffledJudges.filter((j) => eligibleFor(j, a)).length;
    const bCount = shuffledJudges.filter((j) => eligibleFor(j, b)).length;
    return aCount - bCount;
  });

  // --- Pass 1: assign CHAIR (exactly 1 per debate) ---
  for (const debate of debateOrder) {
    const eligible = shuffledJudges.filter((j) => eligibleFor(j, debate));
    if (eligible.length === 0) {
      warnings.push(
        `Debate ${debate.order + 1}: No eligible chair available (all judges have institution conflicts).`
      );
      continue;
    }
    const chair = eligible[0];
    debate.judgeIds.push(chair.id);
    assignedJudgeIds.add(chair.id);
  }

  // --- Pass 2: assign PANELISTS (remaining eligible judges, in pairs for odd panels) ---
  // Re-sort by remaining eligible count ascending.
  const debateOrderPass2 = [...nonByeDebates].sort((a, b) => {
    const aCount = shuffledJudges.filter((j) => eligibleFor(j, a)).length;
    const bCount = shuffledJudges.filter((j) => eligibleFor(j, b)).length;
    return aCount - bCount;
  });

  // Add panelists in pairs (round-robin) to keep panels odd (1→3→5)
  let changed = true;
  while (changed) {
    changed = false;
    for (const debate of debateOrderPass2) {
      // Only add if debate already has a chair
      if (debate.judgeIds.length === 0) continue;

      const eligible = shuffledJudges.filter((j) => eligibleFor(j, debate));
      if (eligible.length >= 2) {
        debate.judgeIds.push(eligible[0].id, eligible[1].id);
        assignedJudgeIds.add(eligible[0].id);
        assignedJudgeIds.add(eligible[1].id);
        changed = true;
      }
    }
  }

  // If exactly 1 unassigned eligible judge remains for any debate, add them
  // (creates an even panel — still better than wasting a judge, but warn).
  for (const debate of debateOrderPass2) {
    if (debate.judgeIds.length === 0) continue;
    const eligible = shuffledJudges.filter((j) => eligibleFor(j, debate));
    if (eligible.length === 1) {
      debate.judgeIds.push(eligible[0].id);
      assignedJudgeIds.add(eligible[0].id);
      warnings.push(
        `Debate ${debate.order + 1} has an even number of judges (${debate.judgeIds.length}).`
      );
    }
  }

  // Warn about debates with no judges at all
  for (const debate of nonByeDebates) {
    if (debate.judgeIds.length === 0) {
      warnings.push(
        `Debate ${debate.order + 1}: Could not assign any judge without institution conflict.`
      );
    }
  }

  // Warn about any totally unassigned judges
  const unassignedCount = shuffledJudges.length - assignedJudgeIds.size;
  if (unassignedCount > 0) {
    warnings.push(
      `${unassignedCount} judge(s) could not be assigned (institution conflicts or all slots filled).`
    );
  }

  // Step 7: Save to database in a transaction
  await prisma.$transaction(async (tx) => {
    // Delete existing debates for this round (cascades to judges)
    await tx.tournamentDebate.deleteMany({ where: { roundId } });

    // Create new debates with judges (first judge = CHAIR, rest = PANELIST)
    for (const plan of debatePlans) {
      const createdDebate = await tx.tournamentDebate.create({
        data: {
          roundId,
          order: plan.order,
          propTeamId: plan.propTeamId,
          oppTeamId: plan.oppTeamId,
          isBye: plan.isBye,
          judges: {
            create: plan.judgeIds.map((participantId, index) => ({
              participantId,
              role: index === 0 ? JudgeRole.CHAIR : JudgeRole.PANELIST,
            })),
          },
        },
      });

      // Create draft ballots for each judge in non-BYE debates
      if (!plan.isBye && plan.judgeIds.length > 0) {
        await createBallotsForDebate(tx, createdDebate.id);
      }
    }
  });

  return {
    success: true,
    debatesCreated: debatePlans.length,
    warnings,
  };
}
