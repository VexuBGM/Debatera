import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

// GET /api/debates/[pairingId] - Get pairing details for ballot/debate
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ pairingId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pairingId } = await params;
    const pairing = await prisma.roundPairing.findUnique({
      where: { id: pairingId },
      include: {
        round: {
          include: {
            tournament: true,
          },
        },
        propTeam: {
          include: {
            institution: true,
            participations: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        oppTeam: {
          include: {
            institution: true,
            participations: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        judges: {
          include: {
            participation: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        participants: {
          include: {
            team: true,
          },
          orderBy: {
            role: "asc",
          },
        },
      },
    });

    if (!pairing) {
      return NextResponse.json({ error: "Debate not found" }, { status: 404 });
    }

    // Check if user has access (is a participant, judge, or admin)
    const isParticipant = pairing.participants.some((p) => p.userId === user.id);
    const isJudge = pairing.judges.some((j) => j.participation.userId === user.id);
    const isAdmin = pairing.round.tournament.ownerId === user.id;

    if (!isParticipant && !isJudge && !isAdmin) {
      return NextResponse.json(
        { error: "You don't have access to this debate" },
        { status: 403 }
      );
    }

    // Fetch user data for participants
    const participantsWithUsers = await Promise.all(
      pairing.participants.map(async (participant) => {
        const userData = await prisma.user.findUnique({
          where: { id: participant.userId },
          select: { id: true, username: true, email: true },
        });
        return { ...participant, user: userData };
      })
    );

    return NextResponse.json({
      ...pairing,
      participants: participantsWithUsers,
    });
  } catch (error) {
    console.error("Error fetching debate:", error);
    return NextResponse.json(
      { error: "Failed to fetch debate" },
      { status: 500 }
    );
  }
}
