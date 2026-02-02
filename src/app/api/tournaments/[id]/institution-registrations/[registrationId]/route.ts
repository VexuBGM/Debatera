import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { ensureUserInDB } from '@/lib/ensureUser';
import { TournamentInstitutionStatus } from '@prisma/client';

export const runtime = 'nodejs';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const AllowedStatuses = new Set<TournamentInstitutionStatus>([
  TournamentInstitutionStatus.APPROVED,
  TournamentInstitutionStatus.REJECTED,
]);

/**
 * PATCH /api/tournaments/[id]/institution-registrations/[registrationId]
 * Body: { status: 'APPROVED' | 'REJECTED' }
 * Auth: requester must be tournament organizer (MVP: Tournament.createdByUserId)
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; registrationId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureUserInDB();

  const { id: tournamentId, registrationId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!isRecord(body) || typeof body.status !== 'string') {
    return NextResponse.json(
      { error: "Validation error: status must be 'APPROVED' or 'REJECTED'" },
      { status: 400 }
    );
  }

  const status = body.status as TournamentInstitutionStatus;
  if (!AllowedStatuses.has(status)) {
    return NextResponse.json(
      { error: "Validation error: status must be 'APPROVED' or 'REJECTED'" },
      { status: 400 }
    );
  }

  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { createdByUserId: true },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    if (tournament.createdByUserId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.tournamentInstitution.findUnique({
      where: { id: registrationId },
      select: { id: true, tournamentId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Institution registration not found' }, { status: 404 });
    }

    if (existing.tournamentId !== tournamentId) {
      return NextResponse.json({ error: 'Institution registration not found' }, { status: 404 });
    }

    const updated = await prisma.tournamentInstitution.update({
      where: { id: registrationId },
      data: { status },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
