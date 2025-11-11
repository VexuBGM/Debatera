import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { isTournamentAdmin } from '@/lib/tournament-validation';

export const runtime = 'nodejs';

const FreezeRosterSchema = z.object({
  rosterFreezeAt: z.coerce.date(),
});

/**
 * POST /api/tournaments/[id]/freeze
 * Freeze the tournament roster at a specific time (admin only)
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
    const json = await req.json();
    const parsed = FreezeRosterSchema.parse(json);

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
        { error: 'Only tournament admins can freeze the roster' },
        { status: 403 }
      );
    }

    // Update tournament with freeze time
    const updated = await prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        rosterFreezeAt: new Date(parsed.rosterFreezeAt),
        frozenById: userId,
      },
      include: {
        frozenBy: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: "Zod validation error" }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * GET /api/tournaments/[id]/freeze
 * Get the tournament's freeze status
 */

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;

    // Check if tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    return NextResponse.json({ frozenAt: tournament.rosterFreezeAt }, { status: 200 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}