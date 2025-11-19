import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { BallotStatus } from "@prisma/client";

// GET /api/ballots - Get ballots for a specific pairing or for the current judge
export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const pairingId = searchParams.get("pairingId");
    const judgeId = searchParams.get("judgeId");

    if (pairingId) {
      // Get all ballots for a specific debate (admin view)
      const ballots = await prisma.ballot.findMany({
        where: { pairingId },
        include: {
          pairing: {
            include: {
              propTeam: { include: { institution: true } },
              oppTeam: { include: { institution: true } },
              round: true,
            },
          },
          winnerTeam: true,
          speakerScores: {
            orderBy: { role: "asc" },
          },
        },
      });

      return NextResponse.json(ballots);
    } else {
      // Get all ballots for the current judge
      const ballots = await prisma.ballot.findMany({
        where: { judgeId: judgeId || user.id },
        include: {
          pairing: {
            include: {
              propTeam: { include: { institution: true } },
              oppTeam: { include: { institution: true } },
              round: true,
            },
          },
          winnerTeam: true,
          speakerScores: {
            orderBy: { role: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json(ballots);
    }
  } catch (error) {
    console.error("Error fetching ballots:", error);
    return NextResponse.json(
      { error: "Failed to fetch ballots" },
      { status: 500 }
    );
  }
}

// POST /api/ballots - Create or update a ballot
export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      pairingId,
      winnerTeamId,
      propFeedback,
      oppFeedback,
      generalComments,
      privateComments,
      speakerScores,
      status,
    } = body;

    // Check if judge is assigned to this debate
    const judgeAssignment = await prisma.roundPairingJudge.findFirst({
      where: {
        pairingId,
        participation: { userId: user.id },
      },
    });

    if (!judgeAssignment) {
      return NextResponse.json(
        { error: "You are not assigned as a judge for this debate" },
        { status: 403 }
      );
    }

    // Find or create ballot
    const existingBallot = await prisma.ballot.findUnique({
      where: {
        pairingId_judgeId: {
          pairingId,
          judgeId: user.id,
        },
      },
    });

    const ballotData = {
      pairingId,
      judgeId: user.id,
      isChair: judgeAssignment.isChair,
      winnerTeamId: winnerTeamId || null,
      propFeedback: propFeedback || null,
      oppFeedback: oppFeedback || null,
      generalComments: generalComments || null,
      privateComments: privateComments || null,
      status: status || BallotStatus.DRAFT,
      submittedAt:
        status === BallotStatus.SUBMITTED ? new Date() : undefined,
    };

    let ballot;
    if (existingBallot) {
      // Update existing ballot
      ballot = await prisma.ballot.update({
        where: { id: existingBallot.id },
        data: ballotData,
      });
    } else {
      // Create new ballot
      ballot = await prisma.ballot.create({
        data: ballotData,
      });
    }

    // Handle speaker scores
    if (speakerScores && Array.isArray(speakerScores)) {
      for (const score of speakerScores) {
        const { userId, teamId, role, totalScore, feedback } = score;

        await prisma.speakerScore.upsert({
          where: {
            ballotId_userId_role: {
              ballotId: ballot.id,
              userId,
              role,
            },
          },
          update: {
            totalScore,
            feedback,
          },
          create: {
            ballotId: ballot.id,
            userId,
            teamId,
            role,
            totalScore,
            feedback,
          },
        });
      }
    }

    // Fetch updated ballot with all relations
    const updatedBallot = await prisma.ballot.findUnique({
      where: { id: ballot.id },
      include: {
        speakerScores: {
          orderBy: { role: "asc" },
        },
        winnerTeam: true,
      },
    });

    return NextResponse.json(updatedBallot);
  } catch (error) {
    console.error("Error saving ballot:", error);
    return NextResponse.json(
      { error: "Failed to save ballot" },
      { status: 500 }
    );
  }
}
