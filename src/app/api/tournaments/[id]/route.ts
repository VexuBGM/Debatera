import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { isTournamentOwner } from '@/lib/services/mvp';
import { getTournamentViewAccess } from '@/lib/security/access';
import { rateLimit } from '@/lib/security/rateLimit';
import prisma from '@/lib/prisma';

const UpdateTournamentSchema = z.object({
  isPublic: z.boolean(),
});

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
    const rateLimited = rateLimit(req, 'api:tournaments:get', {
      limit: 90,
      windowMs: 60_000,
    });
    if (rateLimited) return rateLimited;

    const { userId } = await auth();
    const { id: tournamentId } = await params;
    const access = await getTournamentViewAccess(tournamentId, userId);

    if (!access.exists || !access.canView) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        createdByUserId: true,
        isPublic: true,
        registrationClosesAt: true,
        settings: {
          select: {
            eventMode: true,
          },
        },
      },
    });

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
 * PATCH /api/tournaments/[id]
 * Update tournament-level fields (owner only)
 */
export async function PATCH(
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
      return NextResponse.json({ error: 'Only the tournament creator can update it' }, { status: 403 });
    }

    const json = await req.json();
    const parsed = UpdateTournamentSchema.parse(json);

    const updated = await prisma.tournament.update({
      where: { id: tournamentId },
      data: { isPublic: parsed.isPublic },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
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

