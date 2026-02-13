import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getTournament, isTournamentOwner } from '@/lib/services/mvp';
import prisma from '@/lib/prisma';

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

/**
 * DELETE /api/tournaments/[id]
 * Delete a tournament (only the creator can delete it)
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tournamentId } = await params;

    const isOwner = await isTournamentOwner(userId, tournamentId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Only the tournament creator can delete it' }, { status: 403 });
    }

    await prisma.tournament.delete({ where: { id: tournamentId } });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

