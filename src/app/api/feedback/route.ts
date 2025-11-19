import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { BallotStatus } from "@prisma/client";

// GET /api/feedback - Get feedback for a team or user
export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");
    const tournamentId = searchParams.get("tournamentId");
    const roundId = searchParams.get("roundId");

    if (!teamId && !tournamentId) {
      return NextResponse.json(
        { error: "teamId or tournamentId is required" },
        { status: 400 }
      );
    }

    // Build query conditions
    const whereConditions: any = {
      status: { in: [BallotStatus.SUBMITTED, BallotStatus.CONFIRMED] },
      pairing: {
        OR: teamId
          ? [{ propTeamId: teamId }, { oppTeamId: teamId }]
          : undefined,
        round: {
          tournamentId: tournamentId || undefined,
          id: roundId || undefined,
          status: "FINAL", // Only show feedback for completed rounds
        },
      },
    };

    // Get ballots with feedback (including judge information)
    const ballots = await prisma.ballot.findMany({
      where: whereConditions,
      include: {
        pairing: {
          include: {
            propTeam: { include: { institution: true } },
            oppTeam: { include: { institution: true } },
            round: { include: { tournament: true } },
            result: true, // Include debate outcome
          },
        },
        winnerTeam: true,
        speakerScores: {
          where: teamId
            ? { teamId }
            : undefined,
        },
      },
      orderBy: {
        pairing: {
          round: {
            number: "asc",
          },
        },
      },
    });

    // Get judge information for each ballot
    const ballotsWithJudges = await Promise.all(
      ballots.map(async (ballot) => {
        const judge = await prisma.user.findUnique({
          where: { id: ballot.judgeId },
          select: { id: true, username: true, email: true },
        });
        return { ...ballot, judge };
      })
    );

    // Format feedback data with judge names and clear outcomes
    const feedbackData = ballotsWithJudges.map((ballot) => {
      const isProposition = ballot.pairing.propTeamId === teamId;
      const isOpposition = ballot.pairing.oppTeamId === teamId;
      const result = ballot.pairing.result;

      return {
        ballotId: ballot.id,
        roundNumber: ballot.pairing.round.number,
        roundName: ballot.pairing.round.name,
        tournamentName: ballot.pairing.round.tournament.name,
        opponentTeam: isProposition
          ? ballot.pairing.oppTeam
          : ballot.pairing.propTeam,
        // Clear outcome information
        isWinner: ballot.winnerTeamId === teamId,
        outcome: ballot.winnerTeamId === teamId ? "Win" : "Loss",
        // Judge information (non-anonymous)
        judgeName: ballot.judge?.username || ballot.judge?.email || "Unknown Judge",
        judgeId: ballot.judge?.id,
        isChair: ballot.isChair,
        // Result information if available
        result: result ? {
          finalWinner: result.winnerTeamId === teamId ? "Your Team" : "Opponent",
          panelVotes: `${result.panelVotesProp}-${result.panelVotesOpp}`,
          yourAvgScore: isProposition ? result.propAvgScore : result.oppAvgScore,
          opponentAvgScore: isProposition ? result.oppAvgScore : result.propAvgScore,
        } : null,
        // Feedback content
        teamFeedback: isProposition
          ? ballot.propFeedback
          : ballot.oppFeedback,
        generalComments: ballot.generalComments,
        speakerScores: ballot.speakerScores,
        submittedAt: ballot.submittedAt,
      };
    });

    return NextResponse.json(feedbackData);
  } catch (error) {
    console.error("Error fetching feedback:", error);
    return NextResponse.json(
      { error: "Failed to fetch feedback" },
      { status: 500 }
    );
  }
}
