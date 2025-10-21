import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const { propTeamId, oppTeamId, tournamentId, scheduledAt } = body;

    // Validation
    if (!propTeamId || !oppTeamId) {
      return NextResponse.json(
        { error: 'Both propTeamId and oppTeamId are required' },
        { status: 400 }
      );
    }

    if (propTeamId === oppTeamId) {
      return NextResponse.json(
        { error: 'propTeamId and oppTeamId must be different' },
        { status: 400 }
      );
    }

    // Verify both teams exist
    const [propTeam, oppTeam] = await Promise.all([
      prisma.team.findUnique({ where: { id: propTeamId } }),
      prisma.team.findUnique({ where: { id: oppTeamId } }),
    ]);

    if (!propTeam) {
      return NextResponse.json(
        { error: 'Proposition team not found' },
        { status: 404 }
      );
    }

    if (!oppTeam) {
      return NextResponse.json(
        { error: 'Opposition team not found' },
        { status: 404 }
      );
    }

    // Verify tournament if provided
    if (tournamentId) {
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
      });

      if (!tournament) {
        return NextResponse.json(
          { error: 'Tournament not found' },
          { status: 404 }
        );
      }
    }

    const debate = await prisma.debate.create({
      data: {
        propTeamId,
        oppTeamId,
        tournamentId: tournamentId || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
      include: {
        propTeam: true,
        oppTeam: true,
        tournament: true,
      },
    });

    return NextResponse.json(debate, { status: 201 });
  } catch (error) {
    console.error('Error creating debate:', error);
    return NextResponse.json(
      { error: 'Failed to create debate' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const debates = await prisma.debate.findMany({
      include: {
        propTeam: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    imageUrl: true,
                  },
                },
              },
            },
          },
        },
        oppTeam: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    imageUrl: true,
                  },
                },
              },
            },
          },
        },
        tournament: {
          select: {
            id: true,
            name: true,
            isVerified: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(debates);
  } catch (error) {
    console.error('Error fetching debates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch debates' },
      { status: 500 }
    );
  }
}
