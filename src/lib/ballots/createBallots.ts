/**
 * Ballot Auto-Creation
 *
 * Creates DRAFT ballots with empty speech rows whenever
 * judges are allocated to debates.
 */

import type { PrismaClient } from '@prisma/client';
import { WSDC_SPEECH_ORDER, SPEECH_ROLE_SIDE } from './constants';

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Create a DRAFT ballot (with 8 empty BallotSpeech rows) for a judge assignment.
 * Skips silently if the ballot already exists (idempotent upsert).
 */
export async function createBallotForJudge(
  tx: TransactionClient,
  debateId: string,
  judgeAssignmentId: string
) {
  const existingBallot = await tx.ballot.findUnique({
    where: { adjudicatorId: judgeAssignmentId },
  });

  if (existingBallot) return existingBallot;

  const ballot = await tx.ballot.create({
    data: {
      debateId,
      adjudicatorId: judgeAssignmentId,
      status: 'DRAFT',
      speeches: {
        create: WSDC_SPEECH_ORDER.map((role) => ({
          role,
          side: SPEECH_ROLE_SIDE[role as keyof typeof SPEECH_ROLE_SIDE],
        })),
      },
    },
    include: { speeches: true },
  });

  return ballot;
}

/**
 * Create ballots for all judge assignments in a debate.
 * Useful after saving pairings.
 */
export async function createBallotsForDebate(
  tx: TransactionClient,
  debateId: string
) {
  const judgeAssignments = await tx.tournamentDebateJudge.findMany({
    where: { debateId },
    select: { id: true },
  });

  const ballots = [];
  for (const assignment of judgeAssignments) {
    const ballot = await createBallotForJudge(tx, debateId, assignment.id);
    ballots.push(ballot);
  }

  return ballots;
}

/**
 * Remove draft ballots for judge assignments that no longer exist.
 * Only deletes DRAFT ballots — submitted ballots are preserved.
 */
export async function cleanupOrphanedDraftBallots(
  tx: TransactionClient,
  debateId: string,
  activeJudgeAssignmentIds: string[]
) {
  await tx.ballot.deleteMany({
    where: {
      debateId,
      status: 'DRAFT',
      adjudicatorId: { notIn: activeJudgeAssignmentIds },
    },
  });
}
