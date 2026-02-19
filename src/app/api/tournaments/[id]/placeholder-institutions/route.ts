/**
 * Organizer: Create Placeholder Institution
 *
 * POST /api/tournaments/[id]/placeholder-institutions
 *   Body: { name: string }
 *
 * Creates an institution with source=ORGANIZER_CREATED.
 * Also auto-registers it for the tournament (APPROVED status).
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ id: string }> };

const CreateSchema = z.object({
  name: z.string().min(1, 'Institution name is required').max(200),
});

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tournamentId } = await params;

    // Must be tournament organizer
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { createdByUserId: true },
    });

    if (!tournament || tournament.createdByUserId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name } = parsed.data;

    // Create institution + auto-approve for tournament, all in one transaction
    const result = await prisma.$transaction(async (tx) => {
      const institution = await tx.institution.create({
        data: {
          name,
          source: 'ORGANIZER_CREATED',
          createdByUserId: userId,
        },
      });

      const tournamentInstitution = await tx.tournamentInstitution.create({
        data: {
          tournamentId,
          institutionId: institution.id,
          status: 'APPROVED',
          requestedByUserId: userId,
        },
      });

      return { institution, tournamentInstitution };
    });

    return NextResponse.json(
      {
        institution: {
          id: result.institution.id,
          name: result.institution.name,
          source: result.institution.source,
        },
        tournamentInstitution: {
          id: result.tournamentInstitution.id,
          status: result.tournamentInstitution.status,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'An institution with this name already exists' },
        { status: 409 }
      );
    }
    console.error('Error creating placeholder institution:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
