/**
 * Generate Swiss Pairings – Orchestrator
 *
 * Coordinates between:
 *  1. DB queries (read teams/history)
 *  2. Pure Swiss algorithm (compute pairings)
 *  3. DB persistence (write TournamentDebate records)
 *
 * This is the single entry point for Swiss pairing generation.
 */

import { prisma } from '@/lib/prisma';
import { TournamentRoundStatus, JudgeRole } from '@prisma/client';
import { computeSwissTeamRecords } from './computeSwissData';
import { computeSwissPairings } from './swissPairing';
import { createBallotsForDebate } from '@/lib/ballots/createBallots';
import { displayNameFromDbUser } from '@/lib/users/displayName';
import { hasInstitutionConflict } from '@/lib/tournamentRounds/institutionConflict';
import { getTeamsForTournament, getJudgesForTournament } from '@/lib/tournamentRounds/queries';
import type {
  GenerateSwissPairingsParams,
  GenerateSwissPairingsResult,
} from './types';

// =============================================================================
// Public API
// =============================================================================

/**
 * Generate Swiss pairings for a tournament round.
 *
 * @param params.tournamentId - The tournament.
 * @param params.roundId      - The round to pair (must be DRAFT).
 * @param params.dryRun       - If true, return pairings without persisting.
 *
 * @throws Error if the round is not in DRAFT status or does not exist.
 */
export async function generateSwissPairings(
  params: GenerateSwissPairingsParams,
): Promise<GenerateSwissPairingsResult> {
  const { tournamentId, roundId, dryRun = false } = params;

  // 1. Validate round
  const round = await prisma.tournamentRound.findUnique({
    where: { id: roundId },
    select: { id: true, status: true, tournamentId: true, number: true },
  });

  if (!round) throw new Error('Round not found');
  if (round.tournamentId !== tournamentId) {
    throw new Error('Round does not belong to this tournament');
  }
  if (round.status !== TournamentRoundStatus.DRAFT) {
    throw new Error('Can only generate pairings for DRAFT rounds');
  }

  // 2. Build Swiss team records from prior rounds
  const teamRecords = await computeSwissTeamRecords(tournamentId, round.number);

  if (teamRecords.length < 2) {
    throw new Error('Need at least 2 teams to generate pairings.');
  }

  // 3. Determine if this is the first round
  const isFirstRound = round.number === 1;

  // 4. Run pure algorithm
  const rngSeed = `${tournamentId}:${roundId}`;
  const { pairings, warnings } = computeSwissPairings({
    teams: teamRecords,
    rngSeed,
    isFirstRound,
  });

  // 5. Persist if not dry run
  let debatesCreated = 0;

  if (!dryRun) {
    debatesCreated = await persistPairings(tournamentId, roundId, pairings, warnings);
  } else {
    debatesCreated = pairings.length;
  }

  return { pairings, warnings, debatesCreated };
}

// =============================================================================
// Persistence
// =============================================================================

import type { SwissPairing } from './types';

/**
 * Persist pairings as TournamentDebate records in a single transaction.
 * Also allocates judges using the existing conflict-aware algorithm.
 */
async function persistPairings(
  tournamentId: string,
  roundId: string,
  pairings: SwissPairing[],
  warnings: string[],
): Promise<number> {
  // Load teams and judges for judge allocation
  const teamsRaw = await getTeamsForTournament(tournamentId);
  const judgesRaw = await getJudgesForTournament(tournamentId);

  const teamInstitutionMap = new Map<string, string>();
  for (const t of teamsRaw) {
    teamInstitutionMap.set(t.id, t.institutionId);
  }

  interface JudgeData {
    id: string;
    institutionId: string;
    userName: string | null;
  }
  const judges: JudgeData[] = judgesRaw.map((j) => ({
    id: j.id,
    institutionId: j.institutionId,
    userName: displayNameFromDbUser(j.user) || null,
  }));

  // Build debate plans
  interface DebatePlan {
    order: number;
    propTeamId: string | null;
    oppTeamId: string | null;
    isBye: boolean;
    propInstitutionId: string | null;
    oppInstitutionId: string | null;
    judgeIds: string[];
  }

  const debatePlans: DebatePlan[] = pairings.map((p, i) => ({
    order: i,
    propTeamId: p.propTeamId,
    oppTeamId: p.oppTeamId,
    isBye: p.isBye,
    propInstitutionId: teamInstitutionMap.get(p.propTeamId) ?? null,
    oppInstitutionId: p.oppTeamId ? (teamInstitutionMap.get(p.oppTeamId) ?? null) : null,
    judgeIds: [],
  }));

  // --- Judge allocation (reuse existing conflict-aware algorithm) ---
  const nonByeDebates = debatePlans.filter((d) => !d.isBye);
  const assignedJudgeIds = new Set<string>();
  const shuffledJudges = [...judges].sort(() => Math.random() - 0.5); // light shuffle for fairness

  function eligibleFor(judge: JudgeData, debate: DebatePlan): boolean {
    if (assignedJudgeIds.has(judge.id)) return false;
    return !hasInstitutionConflict(
      judge.institutionId,
      debate.propInstitutionId,
      debate.oppInstitutionId,
    );
  }

  // Pass 1: assign CHAIR
  const debateOrder = [...nonByeDebates].sort((a, b) => {
    const aCount = shuffledJudges.filter((j) => eligibleFor(j, a)).length;
    const bCount = shuffledJudges.filter((j) => eligibleFor(j, b)).length;
    return aCount - bCount;
  });

  for (const debate of debateOrder) {
    const eligible = shuffledJudges.filter((j) => eligibleFor(j, debate));
    if (eligible.length === 0) {
      warnings.push(
        `Debate ${debate.order + 1}: No eligible chair available (all judges have institution conflicts).`,
      );
      continue;
    }
    debate.judgeIds.push(eligible[0].id);
    assignedJudgeIds.add(eligible[0].id);
  }

  // Pass 2: assign PANELISTS in pairs
  const debateOrderPass2 = [...nonByeDebates].sort((a, b) => {
    const aCount = shuffledJudges.filter((j) => eligibleFor(j, a)).length;
    const bCount = shuffledJudges.filter((j) => eligibleFor(j, b)).length;
    return aCount - bCount;
  });

  let changed = true;
  while (changed) {
    changed = false;
    for (const debate of debateOrderPass2) {
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

  // Fill remaining single judges
  for (const debate of debateOrderPass2) {
    if (debate.judgeIds.length === 0) continue;
    const eligible = shuffledJudges.filter((j) => eligibleFor(j, debate));
    if (eligible.length === 1) {
      debate.judgeIds.push(eligible[0].id);
      assignedJudgeIds.add(eligible[0].id);
      warnings.push(
        `Debate ${debate.order + 1} has an even number of judges (${debate.judgeIds.length}).`,
      );
    }
  }

  // Warn about unstaffed debates
  for (const debate of nonByeDebates) {
    if (debate.judgeIds.length === 0) {
      warnings.push(
        `Debate ${debate.order + 1}: Could not assign any judge without institution conflict.`,
      );
    }
  }

  const unassignedCount = judges.length - assignedJudgeIds.size;
  if (unassignedCount > 0) {
    warnings.push(
      `${unassignedCount} judge(s) could not be assigned (institution conflicts or all slots filled).`,
    );
  }

  // --- Persist in a transaction ---
  await prisma.$transaction(async (tx) => {
    // Delete existing debates for this round (cascade to judges, ballots)
    const existingDebates = await tx.tournamentDebate.findMany({
      where: { roundId },
      select: { id: true },
    });
    const existingDebateIds = existingDebates.map((d) => d.id);

    if (existingDebateIds.length > 0) {
      await tx.ballot.deleteMany({ where: { debateId: { in: existingDebateIds } } });
      await tx.debateResult.deleteMany({ where: { debateId: { in: existingDebateIds } } });
      await tx.tournamentDebateJudge.deleteMany({ where: { debateId: { in: existingDebateIds } } });
      await tx.tournamentDebate.deleteMany({ where: { roundId } });
    }

    // Create new debates with judges
    for (const plan of debatePlans) {
      const createdDebate = await tx.tournamentDebate.create({
        data: {
          roundId,
          order: plan.order,
          propTeamId: plan.propTeamId,
          oppTeamId: plan.isBye ? null : plan.oppTeamId,
          isBye: plan.isBye,
          judges: {
            create: plan.judgeIds.map((participantId, index) => ({
              participantId,
              role: index === 0 ? JudgeRole.CHAIR : JudgeRole.PANELIST,
            })),
          },
        },
      });

      // Create draft ballots for non-BYE debates with judges
      if (!plan.isBye && plan.judgeIds.length > 0) {
        await createBallotsForDebate(tx, createdDebate.id);
      }
    }
  });

  return debatePlans.length;
}
