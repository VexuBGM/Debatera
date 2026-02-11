/**
 * Debate Result Computation
 *
 * After all ballots for a debate are SUBMITTED, compute and persist
 * the winner via majority vote. Tie-break: chair's vote wins.
 */

import { prisma } from '@/lib/prisma';
import { BallotStatus, Side, JudgeRole, Prisma } from '@prisma/client';
import { PROP_ROLES, OPP_ROLES } from './constants';

const Decimal = Prisma.Decimal;

/**
 * Attempt to compute and store the debate result.
 * Only runs if ALL ballots for the debate are SUBMITTED.
 * Returns the DebateResult if created, null otherwise.
 */
export async function computeDebateResult(debateId: string) {
  const debate = await prisma.tournamentDebate.findUnique({
    where: { id: debateId },
    include: {
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

  // All judges must have submitted ballots
  const allJudgeIds = new Set(debate.judges.map((j) => j.id));
  const submittedBallots = debate.ballots.filter(
    (b) => b.status === BallotStatus.SUBMITTED
  );
  const submittedJudgeIds = new Set(
    submittedBallots.map((b) => b.adjudicatorId)
  );

  // Not all judges have submitted yet
  for (const judgeId of allJudgeIds) {
    if (!submittedJudgeIds.has(judgeId)) return null;
  }

  if (submittedBallots.length === 0) return null;

  // Count votes
  let voteProp = 0;
  let voteOpp = 0;
  let chairVote: Side | null = null;

  for (const ballot of submittedBallots) {
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

  for (const ballot of submittedBallots) {
    if (ballot.propTotal) propTotalSum = propTotalSum.add(ballot.propTotal);
    if (ballot.oppTotal) oppTotalSum = oppTotalSum.add(ballot.oppTotal);
  }

  const count = new Decimal(submittedBallots.length);
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
