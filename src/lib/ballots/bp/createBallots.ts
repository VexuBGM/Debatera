/**
 * BP Ballot Auto-Creation
 *
 * Creates DRAFT ballots with empty speech rows and team ranking rows
 * whenever judges are allocated to BP debates.
 */

import type { PrismaClient } from '@prisma/client';
import { BP_SPEECH_ORDER, BP_POSITIONS, BP_SPEECH_ROLE_POSITION } from './constants';

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Create a DRAFT BP ballot (with 8 empty BallotSpeech rows + 4 team ranking rows)
 * for a judge assignment. Skips silently if the ballot already exists.
 */
export async function createBpBallotForJudge(
  tx: TransactionClient,
  debateId: string,
  judgeAssignmentId: string
) {
  const existingBallot = await tx.ballot.findUnique({
    where: { adjudicatorId: judgeAssignmentId },
  });

  if (existingBallot) return existingBallot;

  // BP ballots use the BP speech roles and BP positions
  // The 'side' field on BallotSpeech isn't directly applicable for BP,
  // but we store PROPOSITION for Gov speeches, OPPOSITION for Opp speeches
  // for backwards-compatible queries.
  const speechSideMap: Record<string, 'PROPOSITION' | 'OPPOSITION'> = {
    BP_PM: 'PROPOSITION',
    BP_DPM: 'PROPOSITION',
    BP_MG: 'PROPOSITION',
    BP_GW: 'PROPOSITION',
    BP_LO: 'OPPOSITION',
    BP_DLO: 'OPPOSITION',
    BP_MO: 'OPPOSITION',
    BP_OW: 'OPPOSITION',
  };

  const ballot = await tx.ballot.create({
    data: {
      debateId,
      adjudicatorId: judgeAssignmentId,
      status: 'DRAFT',
      speeches: {
        create: BP_SPEECH_ORDER.map((role) => ({
          role,
          side: speechSideMap[role] ?? 'PROPOSITION',
        })),
      },
      teamRankings: {
        create: BP_POSITIONS.map((position, idx) => ({
          position,
          rank: idx + 1,  // Distinct placeholders 1–4; judge reorders on submit
          teamPoints: 0,  // Computed on submit
        })),
      },
    },
    include: { speeches: true, teamRankings: true },
  });

  return ballot;
}

/**
 * Create BP ballots for all judge assignments in a debate.
 */
export async function createBpBallotsForDebate(
  tx: TransactionClient,
  debateId: string
) {
  const judgeAssignments = await tx.tournamentDebateJudge.findMany({
    where: { debateId },
    select: { id: true },
  });

  const ballots = [];
  for (const assignment of judgeAssignments) {
    const ballot = await createBpBallotForJudge(tx, debateId, assignment.id);
    ballots.push(ballot);
  }

  return ballots;
}
