import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

// PATCH /api/results/[id] - Update result (lock/unlock, manual override)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { isFinal, winnerTeamId } = body;

    const result = await prisma.debateResult.findUnique({
      where: { id: params.id },
      include: {
        pairing: {
          include: {
            round: { include: { tournament: true } },
            propTeam: true,
            oppTeam: true,
          },
        },
      },
    });

    if (!result) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }

    // Check if user is admin/owner of the tournament
    const isAdmin = result.pairing.round.tournament.ownerId === user.id;
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Only tournament administrators can update results" },
        { status: 403 }
      );
    }

    const updateData: any = {};

    if (typeof isFinal === "boolean") {
      updateData.isFinal = isFinal;
      if (isFinal && !result.publishedAt) {
        updateData.publishedAt = new Date();
      } else if (!isFinal) {
        updateData.publishedAt = null;
      }
    }

    if (winnerTeamId) {
      // Manual override of winner
      const propTeamId = result.pairing.propTeamId;
      const oppTeamId = result.pairing.oppTeamId;

      if (winnerTeamId !== propTeamId && winnerTeamId !== oppTeamId) {
        return NextResponse.json(
          { error: "Winner must be one of the teams in the debate" },
          { status: 400 }
        );
      }

      updateData.winnerTeamId = winnerTeamId;
      updateData.loserTeamId = winnerTeamId === propTeamId ? oppTeamId : propTeamId;
    }

    const updatedResult = await prisma.debateResult.update({
      where: { id: params.id },
      data: updateData,
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

    return NextResponse.json(updatedResult);
  } catch (error) {
    console.error("Error updating result:", error);
    return NextResponse.json(
      { error: "Failed to update result" },
      { status: 500 }
    );
  }
}
