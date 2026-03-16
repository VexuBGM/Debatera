/**
 * Debate Result Computation
 *
 * After ballots for a debate are SUBMITTED, compute and persist
 * the winner via majority vote. Tie-break: chair's vote wins.
 * Special case: in a 2-judge panel, once the round is COMPLETED,
 * a submitted chair ballot can stand in as the official result.
 */

import { prisma } from '@/lib/prisma';
import { BallotStatus, Side, JudgeRole, Prisma, TournamentRoundStatus } from '@prisma/client';
import { PROP_ROLES, OPP_ROLES } from './constants';

const Decimal = Prisma.Decimal;

/**
 * Attempt to compute and store the debate result.
 * Normally waits for all ballots, but allows a completed 2-judge round
 * to use the chair ballot if that is the only submitted ballot.
 * Returns the DebateResult if created, null otherwise.
 */
export async function computeDebateResult(debateId: string) {
  const debate = await prisma.tournamentDebate.findUnique({
    where: { id: debateId },
    include: {
      round: {
        select: {
          status: true,
        },
      },
      ballots: {
        include: {
          speeches: true,
          adjudicator: true,
        },
      },
      judges: true,
    },
  });

  if (!debate) return null;

  const allJudgeIds = new Set(debate.judges.map((j) => j.id));
  const submittedBallots = debate.ballots.filter(
    (b) => b.status === BallotStatus.SUBMITTED
  );
  const submittedJudgeIds = new Set(
    submittedBallots.map((b) => b.adjudicatorId)
  );

  if (submittedBallots.length === 0) return null;

  const chairAssignment = debate.judges.find((j) => j.role === JudgeRole.CHAIR);
  const chairBallot = chairAssignment
    ? submittedBallots.find((b) => b.adjudicatorId === chairAssignment.id)
    : null;

  const allBallotsSubmitted = Array.from(allJudgeIds).every((judgeId) =>
    submittedJudgeIds.has(judgeId)
  );
  const canUseChairOnlyFallback =
    debate.round.status === TournamentRoundStatus.COMPLETED &&
    debate.judges.length === 2 &&
    submittedBallots.length === 1 &&
    chairBallot !== undefined &&
    chairBallot !== null;

  if (!allBallotsSubmitted && !canUseChairOnlyFallback) {
    return null;
  }

  const ballotsToCount = allBallotsSubmitted
    ? submittedBallots
    : chairBallot
      ? [chairBallot]
      : [];

  if (ballotsToCount.length === 0) return null;

  // Count votes
  let voteProp = 0;
  let voteOpp = 0;
  let chairVote: Side | null = null;

  for (const ballot of ballotsToCount) {
    if (!ballot.vote) continue;
    if (ballot.vote === 'PROPOSITION') voteProp++;
    else voteOpp++;

    // Identify chair's vote
    const judgeAssignment = debate.judges.find(
      (j) => j.id === ballot.adjudicatorId
    );
    if (judgeAssignment?.role === JudgeRole.CHAIR) {
      chairVote = ballot.vote;
    }
  }

  // Determine winner
  let winningSide: Side;
  let decidedByChair = false;

  if (voteProp > voteOpp) {
    winningSide = 'PROPOSITION';
  } else if (voteOpp > voteProp) {
    winningSide = 'OPPOSITION';
  } else {
    // Tie: chair's vote decides
    decidedByChair = true;
    winningSide = chairVote ?? 'PROPOSITION'; // Fallback shouldn't happen
  }

  // Compute average totals
  let propTotalSum = new Decimal(0);
  let oppTotalSum = new Decimal(0);

  for (const ballot of ballotsToCount) {
    if (ballot.propTotal) propTotalSum = propTotalSum.add(ballot.propTotal);
    if (ballot.oppTotal) oppTotalSum = oppTotalSum.add(ballot.oppTotal);
  }

  const count = new Decimal(ballotsToCount.length);
  const propTotalAvg = propTotalSum.div(count);
  const oppTotalAvg = oppTotalSum.div(count);

  // Determine winning team ID
  const winningTeamId =
    winningSide === 'PROPOSITION' ? debate.propTeamId : debate.oppTeamId;

  // Upsert the result
  const result = await prisma.debateResult.upsert({
    where: { debateId },
    update: {
      winningSide,
      winningTeamId,
      propTotalAvg,
      oppTotalAvg,
      voteProp,
      voteOpp,
      decidedByChair,
    },
    create: {
      debateId,
      winningSide,
      winningTeamId,
      propTotalAvg,
      oppTotalAvg,
      voteProp,
      voteOpp,
      decidedByChair,
    },
  });

  return result;
}
