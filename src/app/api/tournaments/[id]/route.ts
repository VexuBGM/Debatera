import { NextResponse } from 'next/server';
import { getTournament } from '@/lib/services/mvp';

export const runtime = 'nodejs';

/**
 * GET /api/tournaments/[id]
 * Fetch tournament details with registrations and rounds
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;

    const tournament = await getTournament(tournamentId);

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    return NextResponse.json(tournament, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

