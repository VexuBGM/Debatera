import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/debates
 * Query debates/pairings with filters
 * Query params:
 * - roundId: Get all pairings for a specific round
 * - tournamentId: Get all pairings for a tournament
 * - userId: Get pairings where user is a participant or judge
 */
export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const roundId = searchParams.get("roundId");
    const tournamentId = searchParams.get("tournamentId");
    const userId = searchParams.get("userId");

    // Build query filter
    const where: any = {};

    if (roundId) {
      where.roundId = roundId;
    }

    if (tournamentId) {
      where.round = {
        tournamentId,
      };
    }

    if (userId) {
      where.OR = [
        { judgeId: userId },
        { participants: { some: { userId } } },
      ];
    }

    // Fetch pairings with all related data
    const pairings = await prisma.roundPairing.findMany({
      where,
      include: {
        round: {
          include: {
            tournament: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        propTeam: {
          include: {
            institution: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        oppTeam: {
          include: {
            institution: {
              select: {
                id: true,
                name: true,
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
        _count: {
          select: {
            ballots: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json(pairings);
  } catch (error) {
    console.error("Error fetching debates:", error);
    return NextResponse.json(
      { error: "Failed to fetch debates" },
      { status: 500 }
    );
  }
}
