import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/tournaments/:id/my-next-round
 * Returns the current user's next round assignment
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: tournamentId } = await params;

    // Verify tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Find user's participation in this tournament
    const participation = await prisma.tournamentParticipation.findUnique({
      where: {
        userId_tournamentId: {
          userId,
          tournamentId,
        },
      },
      include: {
        team: {
          include: {
            institution: true,
          },
        },
        institution: true,
      },
    });

    if (!participation) {
      return NextResponse.json(
        { error: 'You are not registered for this tournament' },
        { status: 404 }
      );
    }

    // Get all rounds for this tournament, ordered by round number
    const rounds = await prisma.round.findMany({
      where: { tournamentId },
      orderBy: { number: 'asc' },
      include: {
        roundPairings: {
          include: {
            propTeam: {
              include: {
                institution: true,
                participations: {
                  include: {
                    user: true,
                  },
                },
              },
            },
            oppTeam: {
              include: {
                institution: true,
                participations: {
                  include: {
                    user: true,
                  },
                },
              },
            },
            judges: {
              include: {
                participation: {
                  include: {
                    user: true,
                    institution: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Find the next round where the user is involved
    for (const round of rounds) {
      for (const pairing of round.roundPairings) {
        // Check if user is a debater in this pairing
        if (participation.role === 'DEBATER' && participation.teamId) {
          const isInThisPairing =
            pairing.propTeamId === participation.teamId ||
            pairing.oppTeamId === participation.teamId;

          if (isInThisPairing) {
            const userTeam =
              pairing.propTeamId === participation.teamId
                ? pairing.propTeam
                : pairing.oppTeam;
            const opponentTeam =
              pairing.propTeamId === participation.teamId
                ? pairing.oppTeam
                : pairing.propTeam;
            const side =
              pairing.propTeamId === participation.teamId ? 'PROP' : 'OPP';

            return NextResponse.json({
              round: {
                id: round.id,
                number: round.number,
                name: round.name,
                motion: round.motion,
                infoSlide: round.infoSlide,
                status: round.status,
              },
              pairing: {
                id: pairing.id,
                scheduledAt: pairing.scheduledAt,
              },
              role: 'DEBATER',
              side,
              yourTeam: userTeam,
              opponentTeam: opponentTeam,
              judges: pairing.judges.map((j) => ({
                id: j.id,
                isChair: j.isChair,
                user: j.participation.user,
                institution: j.participation.institution,
              })),
              isAdmin: tournament.ownerId === userId,
            });
          }
        }

        // Check if user is a judge in this pairing
        if (participation.role === 'JUDGE') {
          const judgeAssignment = pairing.judges.find(
            (j) => j.participation.userId === userId
          );

          if (judgeAssignment) {
            return NextResponse.json({
              round: {
                id: round.id,
                number: round.number,
                name: round.name,
                motion: round.motion,
                infoSlide: round.infoSlide,
                status: round.status,
              },
              pairing: {
                id: pairing.id,
                scheduledAt: pairing.scheduledAt,
              },
              role: 'JUDGE',
              isChair: judgeAssignment.isChair,
              propTeam: pairing.propTeam,
              oppTeam: pairing.oppTeam,
              judges: pairing.judges.map((j) => ({
                id: j.id,
                isChair: j.isChair,
                user: j.participation.user,
                institution: j.participation.institution,
              })),
              isAdmin: tournament.ownerId === userId,
            });
          }
        }
      }
    }

    // No round assignment found
    return NextResponse.json(
      {
        message: 'No round assignment found yet',
        participation: {
          role: participation.role,
          team: participation.team,
          institution: participation.institution,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching next round:', error);
    return NextResponse.json(
      { error: 'Failed to fetch next round' },
      { status: 500 }
    );
  }
}
