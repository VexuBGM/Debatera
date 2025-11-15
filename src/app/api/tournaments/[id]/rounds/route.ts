import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

// GET /api/tournaments/[id]/rounds - Get all rounds for a tournament
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tournamentId } = await params;

    // Verify tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Get all rounds with pairings
    const rounds = await prisma.round.findMany({
      where: { tournamentId },
      include: {
        roundPairings: {
          include: {
            propTeam: {
              include: {
                institution: true,
                participations: {
                  where: { role: 'DEBATER' },
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
                  where: { role: 'DEBATER' },
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { number: 'asc' },
    });

    return NextResponse.json(rounds);
  } catch (error) {
    console.error('Error fetching rounds:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rounds' },
      { status: 500 }
    );
  }
}

// POST /api/tournaments/[id]/rounds - Create a new round
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tournamentId } = await params;

    // Verify user is tournament owner
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    if (tournament.ownerId !== userId) {
      return NextResponse.json(
        { error: 'Only tournament owner can create rounds' },
        { status: 403 }
      );
    }

    // Get the current round count
    const roundCount = await prisma.round.count({
      where: { tournamentId },
    });

    const newRoundNumber = roundCount + 1;

    // Create new round
    const round = await prisma.round.create({
      data: {
        tournamentId,
        number: newRoundNumber,
        name: `Round ${newRoundNumber}`,
      },
      include: {
        roundPairings: true,
      },
    });

    return NextResponse.json(round, { status: 201 });
  } catch (error) {
    console.error('Error creating round:', error);
    return NextResponse.json(
      { error: 'Failed to create round' },
      { status: 500 }
    );
  }
}
