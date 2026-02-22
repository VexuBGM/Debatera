/**
 * Generate BP Pairings – Orchestrator
 *
 * Coordinates between:
 *  1. DB queries (read teams/history)
 *  2. Pure BP algorithm (compute rooms)
 *  3. DB persistence (write TournamentDebate + TournamentDebateTeamSlot records)
 */

import { prisma } from '@/lib/prisma';
import { TournamentRoundStatus, JudgeRole, DebateTeamPosition } from '@prisma/client';
import { computeBpTeamRecords } from './computeBpData';
import { computeBpPairings } from './bpPairing';
import { createBpBallotsForDebate } from '@/lib/ballots/bp/createBallots';
import { displayNameFromDbUser } from '@/lib/users/displayName';
import { hasInstitutionConflict } from '@/lib/tournamentRounds/institutionConflict';
import { getTeamsForTournament, getJudgesForTournament } from '@/lib/tournamentRounds/queries';
import type {
  GenerateBpPairingsParams,
  GenerateBpPairingsResult,
} from './types';

const BP_POSITION_KEYS: DebateTeamPosition[] = ['BP_OG', 'BP_OO', 'BP_CG', 'BP_CO'];

/**
 * Generate BP pairings for a tournament round.
 */
export async function generateBpPairings(
  params: GenerateBpPairingsParams
): Promise<GenerateBpPairingsResult> {
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

  // 2. Build BP team records from prior rounds
  const teamRecords = await computeBpTeamRecords(tournamentId, round.number);

  if (teamRecords.length < 4) {
    throw new Error('Need at least 4 teams for BP pairings.');
  }

  // 3. Run pure algorithm
  const isFirstRound = round.number === 1;
  const rngSeed = `${tournamentId}:${roundId}:bp`;
  const { rooms, byes, warnings } = computeBpPairings({
    teams: teamRecords,
    rngSeed,
    isFirstRound,
  });

  // 4. Persist if not dry run
  let debatesCreated = 0;
  if (!dryRun) {
    debatesCreated = await persistBpPairings(tournamentId, roundId, rooms, byes, warnings);
  } else {
    debatesCreated = rooms.length + byes.length;
  }

  return { rooms, byes, warnings, debatesCreated };
}

// =============================================================================
// Persistence
// =============================================================================

async function persistBpPairings(
  tournamentId: string,
  roundId: string,
  rooms: GenerateBpPairingsResult['rooms'],
  byes: GenerateBpPairingsResult['byes'],
  warnings: string[]
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
    slots: { position: DebateTeamPosition; teamId: string }[];
    isBye: boolean;
    teamInstitutionIds: string[];
    judgeIds: string[];
  }

  const debatePlans: DebatePlan[] = rooms.map((room, i) => {
    const slots = BP_POSITION_KEYS.map((pos) => ({
      position: pos,
      teamId: room.slots[pos],
    }));
    const teamInstitutionIds = slots
      .map((s) => teamInstitutionMap.get(s.teamId))
      .filter((id): id is string => !!id);

    return {
      order: i,
      slots,
      isBye: false,
      teamInstitutionIds,
      judgeIds: [],
    };
  });

  // Add BYE debates
  for (let i = 0; i < byes.length; i++) {
    debatePlans.push({
      order: rooms.length + i,
      slots: [{ position: 'BP_OG' as DebateTeamPosition, teamId: byes[i].teamId }],
      isBye: true,
      teamInstitutionIds: [teamInstitutionMap.get(byes[i].teamId) ?? ''],
      judgeIds: [],
    });
  }

  // --- Judge allocation ---
  const nonByeDebates = debatePlans.filter((d) => !d.isBye);
  const assignedJudgeIds = new Set<string>();
  const shuffledJudges = [...judges].sort(() => Math.random() - 0.5);

  function eligibleFor(judge: JudgeData, debate: DebatePlan): boolean {
    if (assignedJudgeIds.has(judge.id)) return false;
    // Check against all team institutions in the room
    return !debate.teamInstitutionIds.includes(judge.institutionId);
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
        `Room ${debate.order + 1}: No eligible chair available.`
      );
      continue;
    }
    debate.judgeIds.push(eligible[0].id);
    assignedJudgeIds.add(eligible[0].id);
  }

  // Pass 2: assign PANELISTS in pairs
  let changed = true;
  while (changed) {
    changed = false;
    for (const debate of nonByeDebates) {
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
  for (const debate of nonByeDebates) {
    if (debate.judgeIds.length === 0) continue;
    const eligible = shuffledJudges.filter((j) => eligibleFor(j, debate));
    if (eligible.length === 1) {
      debate.judgeIds.push(eligible[0].id);
      assignedJudgeIds.add(eligible[0].id);
      warnings.push(
        `Room ${debate.order + 1} has an even number of judges (${debate.judgeIds.length}).`
      );
    }
  }

  // Warn about unstaffed rooms
  for (const debate of nonByeDebates) {
    if (debate.judgeIds.length === 0) {
      warnings.push(
        `Room ${debate.order + 1}: Could not assign any judge.`
      );
    }
  }

  const unassignedCount = judges.length - assignedJudgeIds.size;
  if (unassignedCount > 0) {
    warnings.push(
      `${unassignedCount} judge(s) could not be assigned.`
    );
  }

  // --- Persist in a transaction ---
  await prisma.$transaction(async (tx) => {
    // Delete existing debates for this round
    const existingDebates = await tx.tournamentDebate.findMany({
      where: { roundId },
      select: { id: true },
    });
    const existingDebateIds = existingDebates.map((d) => d.id);

    if (existingDebateIds.length > 0) {
      await tx.ballotTeamRanking.deleteMany({
        where: { ballot: { debateId: { in: existingDebateIds } } },
      });
      await tx.ballot.deleteMany({ where: { debateId: { in: existingDebateIds } } });
      await tx.bpDebateTeamResult.deleteMany({ where: { debateId: { in: existingDebateIds } } });
      await tx.tournamentDebateTeamSlot.deleteMany({ where: { debateId: { in: existingDebateIds } } });
      await tx.tournamentDebateJudge.deleteMany({ where: { debateId: { in: existingDebateIds } } });
      await tx.tournamentDebate.deleteMany({ where: { roundId } });
    }

    // Create new debates with team slots and judges
    for (const plan of debatePlans) {
      const createdDebate = await tx.tournamentDebate.create({
        data: {
          roundId,
          order: plan.order,
          isBye: plan.isBye,
          // For BP, we don't use propTeamId/oppTeamId; we use team slots
          propTeamId: null,
          oppTeamId: null,
          judges: {
            create: plan.judgeIds.map((participantId, index) => ({
              participantId,
              role: index === 0 ? JudgeRole.CHAIR : JudgeRole.PANELIST,
            })),
          },
        },
      });

      // Create team slots
      for (const slot of plan.slots) {
        await tx.tournamentDebateTeamSlot.create({
          data: {
            debateId: createdDebate.id,
            teamId: slot.teamId,
            position: slot.position,
          },
        });
      }

      // Create BP ballots for non-BYE debates
      if (!plan.isBye && plan.judgeIds.length > 0) {
        await createBpBallotsForDebate(tx, createdDebate.id);
      }
    }
  });

  return debatePlans.length;
}
