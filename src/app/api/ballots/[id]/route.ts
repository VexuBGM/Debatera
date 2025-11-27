import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { BallotStatus } from "@prisma/client";

// GET /api/ballots/[id] - Get a specific ballot
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const ballot = await prisma.ballot.findUnique({
      where: { id },
      include: {
        pairing: {
          include: {
            propTeam: { include: { institution: true } },
            oppTeam: { include: { institution: true } },
            round: { include: { tournament: true } },
            participants: true,
          },
        },
        winnerTeam: true,
        speakerScores: {
          orderBy: { role: "asc" },
        },
      },
    });

    if (!ballot) {
      return NextResponse.json({ error: "Ballot not found" }, { status: 404 });
    }

    // Check if user has access to this ballot
    const isJudge = ballot.judgeId === user.id;
    const isAdmin = await prisma.tournament.findFirst({
      where: {
        id: ballot.pairing.round.tournamentId,
        ownerId: user.id,
      },
    });

    if (!isJudge && !isAdmin) {
      return NextResponse.json(
        { error: "You don't have permission to view this ballot" },
        { status: 403 }
      );
    }

    return NextResponse.json(ballot);
  } catch (error) {
    console.error("Error fetching ballot:", error);
    return NextResponse.json(
      { error: "Failed to fetch ballot" },
      { status: 500 }
    );
  }
}

// PATCH /api/ballots/[id] - Update ballot (admin actions: confirm, void, reopen)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { status, action } = body;

    const { id } = await params;
    const ballot = await prisma.ballot.findUnique({
      where: { id },
      include: {
        pairing: {
          include: {
            round: true,
          },
        },
      },
    });

    if (!ballot) {
      return NextResponse.json({ error: "Ballot not found" }, { status: 404 });
    }

    // Check if user is admin/owner of the tournament
    const isAdmin = await prisma.tournament.findFirst({
      where: {
        id: ballot.pairing.round.tournamentId,
        ownerId: user.id,
      },
    });

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Only tournament administrators can perform this action" },
        { status: 403 }
      );
    }

    let updateData: any = {};

    if (action === "confirm") {
      updateData = {
        status: BallotStatus.CONFIRMED,
        confirmedAt: new Date(),
      };
    } else if (action === "void") {
      updateData = {
        status: BallotStatus.VOIDED,
      };
    } else if (action === "reopen") {
      updateData = {
        status: BallotStatus.DRAFT,
        submittedAt: null,
        confirmedAt: null,
      };
    } else if (status) {
      updateData = { status };
    }

    const updatedBallot = await prisma.ballot.update({
      where: { id },
      data: updateData,
      include: {
        speakerScores: true,
        winnerTeam: true,
      },
    });

    return NextResponse.json(updatedBallot);
  } catch (error) {
    console.error("Error updating ballot:", error);
    return NextResponse.json(
      { error: "Failed to update ballot" },
      { status: 500 }
    );
  }
}

// DELETE /api/ballots/[id] - Delete a ballot (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const ballot = await prisma.ballot.findUnique({
      where: { id },
      include: {
        pairing: {
          include: {
            round: true,
          },
        },
      },
    });

    if (!ballot) {
      return NextResponse.json({ error: "Ballot not found" }, { status: 404 });
    }

    // Check if user is admin/owner of the tournament
    const isAdmin = await prisma.tournament.findFirst({
      where: {
        id: ballot.pairing.round.tournamentId,
        ownerId: user.id,
      },
    });

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Only tournament administrators can delete ballots" },
        { status: 403 }
      );
    }

    await prisma.ballot.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting ballot:", error);
    return NextResponse.json(
      { error: "Failed to delete ballot" },
      { status: 500 }
    );
  }
}
