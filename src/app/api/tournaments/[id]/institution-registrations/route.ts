import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { ensureUserInDB } from '@/lib/ensureUser';
import { InstitutionRole, TournamentInstitutionStatus } from '@prisma/client';

export const runtime = 'nodejs';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * POST /api/tournaments/[id]/institution-registrations
 * Body: { institutionId: string }
 * Creates TournamentInstitution with status PENDING.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureUserInDB();

  const { id: tournamentId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!isRecord(body) || typeof body.institutionId !== 'string' || !body.institutionId) {
    return NextResponse.json(
      { error: 'Validation error: institutionId must be a non-empty string' },
      { status: 400 }
    );
  }

  const institutionId = body.institutionId;

  try {
    // requester must be ADMIN of institution
    const membership = await prisma.institutionMember.findUnique({
      where: { institutionId_userId: { institutionId, userId } },
      select: { role: true },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (membership.role !== InstitutionRole.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // tournament exists and registrationClosesAt (if set) not passed
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { id: true, registrationClosesAt: true },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    if (tournament.registrationClosesAt && tournament.registrationClosesAt.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: 'Registration is closed for this tournament' },
        { status: 403 }
      );
    }

    // uniqueness check for clearer 409
    const existing = await prisma.tournamentInstitution.findUnique({
      where: { tournamentId_institutionId: { tournamentId, institutionId } },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Institution registration already exists for this tournament' },
        { status: 409 }
      );
    }

    const registration = await prisma.tournamentInstitution.create({
      data: {
        tournamentId,
        institutionId,
        status: TournamentInstitutionStatus.PENDING,
        requestedByUserId: userId,
      },
    });

    return NextResponse.json(registration, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * GET /api/tournaments/[id]/institution-registrations
 * Query: ?institutionId=...
 * Auth: requester must be ADMIN of institution.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureUserInDB();

  const { id: tournamentId } = await params;
  const url = new URL(req.url);
  const institutionId = url.searchParams.get('institutionId');

  if (!institutionId) {
    return NextResponse.json(
      { error: 'Validation error: institutionId query param is required' },
      { status: 400 }
    );
  }

  try {
    const membership = await prisma.institutionMember.findUnique({
      where: { institutionId_userId: { institutionId, userId } },
      select: { role: true },
    });

    if (!membership || membership.role !== InstitutionRole.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const registration = await prisma.tournamentInstitution.findUnique({
      where: { tournamentId_institutionId: { tournamentId, institutionId } },
      select: {
        id: true,
        tournamentId: true,
        institutionId: true,
        status: true,
        createdAt: true,
        requestedByUserId: true,
      },
    });

    return NextResponse.json(registration, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
