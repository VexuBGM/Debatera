/**
 * Auto-Generate Pairings Algorithm
 *
 * Simple random pairing generation for WSDC format debates:
 * - Teams are shuffled randomly and paired sequentially
 * - If odd number of teams, last team gets a BYE
 * - Judges are distributed to ensure odd panel sizes where possible
 */

import { prisma } from '@/lib/prisma';
import { TournamentRoundStatus, JudgeRole } from '@prisma/client';
import { getTeamsForTournament, getJudgesForTournament } from './queries';

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
    userName: j.user?.username || j.user?.email || null,
  }));

  // Step 3: Validate we have enough judges
  const hasOddTeams = teams.length % 2 !== 0;
  const numDebates = Math.floor(teams.length / 2);
  const numDebatesNeedingJudges = hasOddTeams ? numDebates : numDebates;
  // BYE debates don't need judges, so it's just numDebates

  if (judges.length < numDebatesNeedingJudges) {
    return {
      success: false,
      debatesCreated: 0,
      warnings,
      error: `Not enough judges. Need at least ${numDebatesNeedingJudges} judges for ${numDebatesNeedingJudges} debates, but only have ${judges.length}.`,
    };
  }

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

  // Step 6: Distribute judges to debates (odd panel sizes preferred)
  //
  // Strategy:
  // 1. Assign 1 judge to each non-bye debate first
  // 2. Add remaining judges in pairs (2 at a time) round-robin to keep panels odd (1->3->5)
  // 3. If exactly 1 judge remains, add to first debate (creating even panel)

  const nonByeDebates = debatePlans.filter((d) => !d.isBye);
  let judgeIndex = 0;

  // First pass: 1 judge per debate
  for (const debate of nonByeDebates) {
    if (judgeIndex < shuffledJudges.length) {
      debate.judgeIds.push(shuffledJudges[judgeIndex].id);
      judgeIndex++;
    }
  }

  // Second pass: add judges in pairs (round-robin) to maintain odd panels
  let debatePointer = 0;
  while (judgeIndex + 1 < shuffledJudges.length) {
    // Add 2 judges at a time
    const targetDebate = nonByeDebates[debatePointer % nonByeDebates.length];
    targetDebate.judgeIds.push(shuffledJudges[judgeIndex].id);
    targetDebate.judgeIds.push(shuffledJudges[judgeIndex + 1].id);
    judgeIndex += 2;
    debatePointer++;
  }

  // If exactly 1 judge remains, add to first debate (even panel warning)
  if (judgeIndex < shuffledJudges.length) {
    nonByeDebates[0].judgeIds.push(shuffledJudges[judgeIndex].id);
    warnings.push(`Debate 1 has an even number of judges (${nonByeDebates[0].judgeIds.length}).`);
  }

  // Check for judge-institution conflicts
  for (let i = 0; i < debatePlans.length; i++) {
    const debate = debatePlans[i];
    if (debate.isBye) continue;

    for (const judgeId of debate.judgeIds) {
      const judge = shuffledJudges.find((j) => j.id === judgeId);
      if (judge) {
        if (
          judge.institutionId === debate.propInstitutionId ||
          judge.institutionId === debate.oppInstitutionId
        ) {
          warnings.push(
            `Debate ${i + 1}: Judge ${judge.userName || judge.id} has a conflict (same institution as a team).`
          );
        }
      }
    }
  }

  // Step 7: Save to database in a transaction
  await prisma.$transaction(async (tx) => {
    // Delete existing debates for this round (cascades to judges)
    await tx.tournamentDebate.deleteMany({ where: { roundId } });

    // Create new debates with judges (first judge = CHAIR, rest = PANELIST)
    for (const plan of debatePlans) {
      await tx.tournamentDebate.create({
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
    }
  });

  return {
    success: true,
    debatesCreated: debatePlans.length,
    warnings,
  };
}
