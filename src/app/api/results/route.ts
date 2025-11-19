import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { BallotStatus } from "@prisma/client";

// GET /api/results - Get results for a round or pairing
export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const roundId = searchParams.get("roundId");
    const pairingId = searchParams.get("pairingId");

    if (pairingId) {
      // Get result for a specific debate
      const result = await prisma.debateResult.findUnique({
        where: { pairingId },
        include: {
          pairing: {
            include: {
              propTeam: { include: { institution: true } },
              oppTeam: { include: { institution: true } },
              round: true,
            },
          },
          winnerTeam: { include: { institution: true } },
          loserTeam: { include: { institution: true } },
        },
      });

      return NextResponse.json(result);
    } else if (roundId) {
      // Get all results for a round
      const results = await prisma.debateResult.findMany({
        where: {
          pairing: { roundId },
        },
        include: {
          pairing: {
            include: {
              propTeam: { include: { institution: true } },
              oppTeam: { include: { institution: true } },
            },
          },
          winnerTeam: { include: { institution: true } },
          loserTeam: { include: { institution: true } },
        },
      });

      return NextResponse.json(results);
    }

    return NextResponse.json({ error: "Missing roundId or pairingId" }, { status: 400 });
  } catch (error) {
    console.error("Error fetching results:", error);
    return NextResponse.json(
      { error: "Failed to fetch results" },
      { status: 500 }
    );
  }
}

// POST /api/results - Calculate and create/update result for a debate
export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { pairingId, isFinal } = body;

    if (!pairingId) {
      return NextResponse.json(
        { error: "pairingId is required" },
        { status: 400 }
      );
    }

    // Get the pairing with teams and round
    const pairing = await prisma.roundPairing.findUnique({
      where: { id: pairingId },
      include: {
        propTeam: true,
        oppTeam: true,
        round: { include: { tournament: true } },
      },
    });

    if (!pairing) {
      return NextResponse.json({ error: "Pairing not found" }, { status: 404 });
    }

    if (!pairing.propTeamId || !pairing.oppTeamId) {
      return NextResponse.json(
        { error: "Both teams must be assigned" },
        { status: 400 }
      );
    }

    // Check if user is admin/owner of the tournament
    const isAdmin = pairing.round.tournament.ownerId === user.id;
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Only tournament administrators can calculate results" },
        { status: 403 }
      );
    }

    // Get all submitted/confirmed ballots for this debate
    const ballots = await prisma.ballot.findMany({
      where: {
        pairingId,
        status: {
          in: [BallotStatus.SUBMITTED, BallotStatus.CONFIRMED],
        },
      },
      include: {
        speakerScores: true,
      },
    });

    if (ballots.length === 0) {
      return NextResponse.json(
        { error: "No submitted ballots found for this debate" },
        { status: 400 }
      );
    }

    // Count votes for each team
    let panelVotesProp = 0;
    let panelVotesOpp = 0;
    let propTotalScores: number[] = [];
    let oppTotalScores: number[] = [];

    for (const ballot of ballots) {
      if (ballot.winnerTeamId === pairing.propTeamId) {
        panelVotesProp++;
      } else if (ballot.winnerTeamId === pairing.oppTeamId) {
        panelVotesOpp++;
      }

      // Calculate team scores from speaker scores
      const propScores = ballot.speakerScores
        .filter((s) => s.teamId === pairing.propTeamId && s.totalScore !== null)
        .map((s) => s.totalScore as number);
      const oppScores = ballot.speakerScores
        .filter((s) => s.teamId === pairing.oppTeamId && s.totalScore !== null)
        .map((s) => s.totalScore as number);

      if (propScores.length > 0) {
        propTotalScores.push(propScores.reduce((a, b) => a + b, 0));
      }
      if (oppScores.length > 0) {
        oppTotalScores.push(oppScores.reduce((a, b) => a + b, 0));
      }
    }

    // Determine winner
    let winnerTeamId: string;
    let loserTeamId: string;

    if (panelVotesProp > panelVotesOpp) {
      winnerTeamId = pairing.propTeamId;
      loserTeamId = pairing.oppTeamId;
    } else if (panelVotesOpp > panelVotesProp) {
      winnerTeamId = pairing.oppTeamId;
      loserTeamId = pairing.propTeamId;
    } else {
      // Tie - use scores or require manual resolution
      const propAvg = propTotalScores.length > 0
        ? propTotalScores.reduce((a, b) => a + b, 0) / propTotalScores.length
        : 0;
      const oppAvg = oppTotalScores.length > 0
        ? oppTotalScores.reduce((a, b) => a + b, 0) / oppTotalScores.length
        : 0;

      if (propAvg > oppAvg) {
        winnerTeamId = pairing.propTeamId;
        loserTeamId = pairing.oppTeamId;
      } else if (oppAvg > propAvg) {
        winnerTeamId = pairing.oppTeamId;
        loserTeamId = pairing.propTeamId;
      } else {
        return NextResponse.json(
          { error: "Tie detected - manual resolution required" },
          { status: 400 }
        );
      }
    }

    // Calculate average scores
    const propAvgScore =
      propTotalScores.length > 0
        ? propTotalScores.reduce((a, b) => a + b, 0) / propTotalScores.length
        : null;
    const oppAvgScore =
      oppTotalScores.length > 0
        ? oppTotalScores.reduce((a, b) => a + b, 0) / oppTotalScores.length
        : null;

    // Create or update result
    const result = await prisma.debateResult.upsert({
      where: { pairingId },
      update: {
        winnerTeamId,
        loserTeamId,
        panelVotesProp,
        panelVotesOpp,
        propAvgScore,
        oppAvgScore,
        isFinal: isFinal ?? false,
        publishedAt: isFinal ? new Date() : undefined,
      },
      create: {
        pairingId,
        winnerTeamId,
        loserTeamId,
        panelVotesProp,
        panelVotesOpp,
        propAvgScore,
        oppAvgScore,
        isFinal: isFinal ?? false,
        publishedAt: isFinal ? new Date() : undefined,
      },
      include: {
        pairing: {
          include: {
            propTeam: { include: { institution: true } },
            oppTeam: { include: { institution: true } },
          },
        },
        winnerTeam: { include: { institution: true } },
        loserTeam: { include: { institution: true } },
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error calculating result:", error);
    return NextResponse.json(
      { error: "Failed to calculate result" },
      { status: 500 }
    );
  }
}
