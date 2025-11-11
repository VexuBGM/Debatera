import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

/**
 * GET /api/tournaments/[id]
 * Fetch tournament details including rosterFreezeAt
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        frozenBy: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        _count: {
          select: {
            teams: true,
            participations: true,
          },
        },
      },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Add a computed field to indicate if roster is currently frozen
    const isFrozen = tournament.rosterFreezeAt ? new Date() >= tournament.rosterFreezeAt : false;

    return NextResponse.json(
      {
        ...tournament,
        isRosterFrozen: isFrozen,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
