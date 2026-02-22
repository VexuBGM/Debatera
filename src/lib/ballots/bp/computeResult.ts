/**
 * BP Debate Result Computation
 *
 * After all ballots for a BP debate are SUBMITTED, compute and persist
 * team results. MVP: chair ballot determines the final ranking.
 *
 * TODO: Support averaged/majority ranking from multi-judge panels.
 */

import { prisma } from '@/lib/prisma';
import { BallotStatus, JudgeRole, Prisma, DebateTeamPosition } from '@prisma/client';
import {
  BP_POSITIONS,
  BP_POSITION_SPEECH_ROLES,
  rankToTeamPoints,
} from './constants';

const Decimal = Prisma.Decimal;

interface RankPointsMapping {
  first: number;
  second: number;
  third: number;
  fourth: number;
}

/**
 * Attempt to compute and store BP debate results.
 * Only runs if ALL ballots for the debate are SUBMITTED.
 * Returns the results if created, null otherwise.
 */
export async function computeBpDebateResult(debateId: string) {
  const debate = await prisma.tournamentDebate.findUnique({
    where: { id: debateId },
    include: {
      round: {
        include: {
          tournament: {
            include: { settings: true },
          },
        },
      },
      teamSlots: true,
      ballots: {
        include: {
          speeches: true,
          teamRankings: true,
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

  for (const judgeId of allJudgeIds) {
    if (!submittedJudgeIds.has(judgeId)) return null;
  }

  if (submittedBallots.length === 0) return null;

  // Get rank points mapping from tournament settings
  const settings = debate.round.tournament.settings;
  const rankPointsMapping: RankPointsMapping = {
    first: settings?.rankPointsFirst ?? 3,
    second: settings?.rankPointsSecond ?? 2,
    third: settings?.rankPointsThird ?? 1,
    fourth: settings?.rankPointsFourth ?? 0,
  };

  // MVP: Use chair's ballot for rankings. If no chair, use first submitted ballot.
  const chairJudge = debate.judges.find((j) => j.role === JudgeRole.CHAIR);
  const chairBallot = chairJudge
    ? submittedBallots.find((b) => b.adjudicatorId === chairJudge.id)
    : null;
  const decidingBallot = chairBallot ?? submittedBallots[0];

  if (!decidingBallot || decidingBallot.teamRankings.length !== 4) return null;

  // Build team slot lookup: position → teamId
  const positionTeamMap = new Map<DebateTeamPosition, string>();
  for (const slot of debate.teamSlots) {
    positionTeamMap.set(slot.position, slot.teamId);
  }

  // Compute speaker points per position (averaged across all submitted ballots)
  const positionSpeakerPoints = new Map<DebateTeamPosition, number>();

  for (const pos of BP_POSITIONS) {
    const roles = BP_POSITION_SPEECH_ROLES[pos];
    let totalScore = 0;
    let ballotCount = 0;

    for (const ballot of submittedBallots) {
      let ballotPosTotal = 0;
      let hasAllScores = true;

      for (const role of roles) {
        const speech = ballot.speeches.find((s) => s.role === role);
        if (speech?.score) {
          ballotPosTotal += new Decimal(speech.score).toNumber();
        } else {
          hasAllScores = false;
        }
      }

      if (hasAllScores) {
        totalScore += ballotPosTotal;
        ballotCount++;
      }
    }

    positionSpeakerPoints.set(
      pos as DebateTeamPosition,
      ballotCount > 0 ? totalScore / ballotCount : 0
    );
  }

  // Build results from the deciding ballot's rankings
  const results = decidingBallot.teamRankings.map((ranking) => {
    const teamId = positionTeamMap.get(ranking.position);
    if (!teamId) throw new Error(`No team found for position ${ranking.position}`);

    return {
      debateId,
      teamId,
      position: ranking.position,
      rank: ranking.rank,
      teamPoints: rankToTeamPoints(ranking.rank, rankPointsMapping),
      totalSpeakerPoints: positionSpeakerPoints.get(ranking.position) ?? 0,
    };
  });

  // Persist in a transaction
  await prisma.$transaction(async (tx) => {
    // Delete existing BP results for this debate
    await tx.bpDebateTeamResult.deleteMany({ where: { debateId } });

    // Create new results
    for (const result of results) {
      await tx.bpDebateTeamResult.create({
        data: {
          debateId: result.debateId,
          teamId: result.teamId,
          position: result.position,
          rank: result.rank,
          teamPoints: result.teamPoints,
          totalSpeakerPoints: result.totalSpeakerPoints,
        },
      });
    }
  });

  return results;
}
