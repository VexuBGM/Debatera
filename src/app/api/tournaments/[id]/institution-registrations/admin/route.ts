import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { ensureUserInDB } from '@/lib/ensureUser';
import { TournamentInstitutionStatus } from '@prisma/client';

export const runtime = 'nodejs';

const AllowedStatuses = new Set<TournamentInstitutionStatus>([
  TournamentInstitutionStatus.PENDING,
  TournamentInstitutionStatus.APPROVED,
  TournamentInstitutionStatus.REJECTED,
]);

/**
 * GET /api/tournaments/[id]/institution-registrations/admin
 * Query:
 *  - status?: 'PENDING' | 'APPROVED' | 'REJECTED'
 * Auth: requester must be tournament organizer (MVP: Tournament.createdByUserId)
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureUserInDB();

  const { id: tournamentId } = await params;
  const url = new URL(req.url);
  const statusParam = url.searchParams.get('status');

  let status: TournamentInstitutionStatus | undefined;
  if (statusParam) {
    if (!AllowedStatuses.has(statusParam as TournamentInstitutionStatus)) {
      return NextResponse.json(
        { error: "Validation error: status must be 'PENDING', 'APPROVED', or 'REJECTED'" },
        { status: 400 }
      );
    }
    status = statusParam as TournamentInstitutionStatus;
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

    const registrations = await prisma.tournamentInstitution.findMany({
      where: {
        tournamentId,
        ...(status ? { status } : {}),
      },
      select: {
        id: true,
        tournamentId: true,
        status: true,
        createdAt: true,
        institution: {
          select: {
            id: true,
            name: true,
          },
        },
        requestedBy: {
          select: {
            id: true,
            email: true,
            username: true,
            imageUrl: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ items: registrations }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
