import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { generateRound, isTournamentOwner, getTournament } from '@/lib/services/mvp';

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

    // Get tournament with rounds
    const tournament = await getTournament(tournamentId);

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    return NextResponse.json(tournament.rounds);
  } catch (error) {
    console.error('Error fetching rounds:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rounds' },
      { status: 500 }
    );
  }
}

// POST /api/tournaments/[id]/rounds - Generate a new round with pairings
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
    const isOwner = await isTournamentOwner(userId, tournamentId);
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Only tournament owner can generate rounds' },
        { status: 403 }
      );
    }

    // Get current round count to determine next round number
    const roundCount = await prisma.round.count({
      where: { tournamentId },
    });

    const nextRoundNumber = roundCount + 1;

    // Generate the round with pairings
    const round = await generateRound(tournamentId, nextRoundNumber);

    return NextResponse.json(round, { status: 201 });
  } catch (error) {
    console.error('Error creating round:', error);
    const message = error instanceof Error ? error.message : 'Failed to create round';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
