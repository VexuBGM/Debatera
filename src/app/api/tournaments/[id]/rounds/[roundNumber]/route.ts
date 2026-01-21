import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getRound } from '@/lib/services/mvp';

export const runtime = 'nodejs';

// GET /api/tournaments/[id]/rounds/[roundNumber] - Get a specific round with matches
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; roundNumber: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tournamentId, roundNumber } = await params;
    const roundNum = parseInt(roundNumber, 10);

    if (isNaN(roundNum) || roundNum < 1) {
      return NextResponse.json({ error: 'Invalid round number' }, { status: 400 });
    }

    const round = await getRound(tournamentId, roundNum);

    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    return NextResponse.json(round);
  } catch (error) {
    console.error('Error fetching round:', error);
    return NextResponse.json(
      { error: 'Failed to fetch round' },
      { status: 500 }
    );
  }
}
