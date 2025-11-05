import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { isTournamentAdmin } from '@/lib/tournament-validation';

export const runtime = 'nodejs';

/**
 * POST /api/tournaments/[id]/override
 * Admin override to allow changes after roster freeze
 * This endpoint temporarily removes the freeze to allow modifications
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: tournamentId } = await params;

    // Check if tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Check if user is tournament admin
    const isAdmin = await isTournamentAdmin(userId, tournamentId);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only tournament admins can override the roster freeze' },
        { status: 403 }
      );
    }

    // Remove the freeze by setting rosterFreezeAt to null
    const updated = await prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        rosterFreezeAt: null,
        frozenById: null,
      },
    });

    return NextResponse.json(
      {
        message: 'Roster freeze has been removed. Changes can now be made.',
        tournament: updated,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
