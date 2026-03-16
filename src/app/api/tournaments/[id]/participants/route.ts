import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { ensureUserInDB } from '@/lib/ensureUser';
import {
  InstitutionRole,
  TournamentInstitutionStatus,
  TournamentParticipantRole,
} from '@prisma/client';
import { assertRegistrationOpen, TournamentSettingsLike } from '@/lib/guards/tournamentSettingsGuards';
import { createTournamentParticipantForUser } from '@/lib/participants/createTournamentParticipant';

export const runtime = 'nodejs';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const AllowedRoles = new Set<TournamentParticipantRole>([
  TournamentParticipantRole.DEBATER,
  TournamentParticipantRole.JUDGE,
]);

/**
 * POST /api/tournaments/[id]/participants
 * Body: { userId: string, institutionId: string, role: 'DEBATER' | 'JUDGE' }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: requesterUserId } = await auth();
  if (!requesterUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureUserInDB();

  const { id: tournamentId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: 'Validation error: body must be an object' }, { status: 400 });
  }

  const targetUserId = body.userId;
  const institutionId = body.institutionId;
  const roleRaw = body.role;

  if (typeof targetUserId !== 'string' || !targetUserId) {
    return NextResponse.json(
      { error: 'Validation error: userId must be a non-empty string' },
      { status: 400 }
    );
  }
  if (typeof institutionId !== 'string' || !institutionId) {
    return NextResponse.json(
      { error: 'Validation error: institutionId must be a non-empty string' },
      { status: 400 }
    );
  }
  if (typeof roleRaw !== 'string') {
    return NextResponse.json(
      { error: "Validation error: role must be 'DEBATER' or 'JUDGE'" },
      { status: 400 }
    );
  }

  const role = roleRaw as TournamentParticipantRole;
  if (!AllowedRoles.has(role)) {
    return NextResponse.json(
      { error: "Validation error: role must be 'DEBATER' or 'JUDGE'" },
      { status: 400 }
    );
  }

  try {
    // requester must be ADMIN of institution
    const requesterMembership = await prisma.institutionMember.findUnique({
      where: { institutionId_userId: { institutionId, userId: requesterUserId } },
      select: { role: true },
    });

    if (!requesterMembership || requesterMembership.role !== InstitutionRole.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // tournament exists and registration is open
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { settings: true },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    try {
      const settings: TournamentSettingsLike = tournament.settings ?? {
        registrationOpensAt: null,
        registrationClosesAt: null,
        teamSizeMin: 2,
        teamSizeMax: 5,
      };

      assertRegistrationOpen(settings);
    } catch (error: any) {
      if (error.message === 'REGISTRATION_CLOSED') {
        return NextResponse.json(
          { error: 'Registration is closed for this tournament' },
          { status: 403 }
        );
      }
      throw error;
    }

    // institution must have APPROVED TournamentInstitution
    const approvedRegistration = await prisma.tournamentInstitution.findUnique({
      where: { tournamentId_institutionId: { tournamentId, institutionId } },
      select: { status: true },
    });

    if (!approvedRegistration) {
      return NextResponse.json(
        { error: 'Institution is not registered for this tournament' },
        { status: 403 }
      );
    }

    if (approvedRegistration.status !== TournamentInstitutionStatus.APPROVED) {
      return NextResponse.json(
        { error: 'Institution registration is not approved for this tournament' },
        { status: 403 }
      );
    }

    // userId must be member of institution
    const targetMembership = await prisma.institutionMember.findUnique({
      where: { institutionId_userId: { institutionId, userId: targetUserId } },
      select: { id: true },
    });

    if (!targetMembership) {
      return NextResponse.json(
        { error: 'User is not a member of this institution' },
        { status: 403 }
      );
    }

    const participant = await createTournamentParticipantForUser(prisma, {
      tournamentId,
      userId: targetUserId,
      institutionId,
      role,
    });

    if (!participant.created) {
      const existing = await prisma.tournamentParticipant.findUnique({
        where: { tournamentId_userId: { tournamentId, userId: targetUserId } },
        select: {
          id: true,
          institution: { select: { name: true } },
        },
      });

      const institutionName = existing?.institution?.name ?? 'another institution';

      return NextResponse.json(
        {
          error: `User is already registered for this tournament by ${institutionName}`,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ id: participant.participantId }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * GET /api/tournaments/[id]/participants
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

    const participants = await prisma.tournamentParticipant.findMany({
      where: { tournamentId, institutionId },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            imageUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(participants, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
