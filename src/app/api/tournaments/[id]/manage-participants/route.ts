/**
 * Organizer: Tournament Participant Management (Person-based)
 *
 * POST /api/tournaments/[id]/manage-participants      - Create participant from person
 * GET  /api/tournaments/[id]/manage-participants      - List all participants with link/claim status
 *
 * Only the tournament creator (organizer) can use this endpoint.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { TournamentParticipantRole } from '@prisma/client';
import { z } from 'zod';
import {
  getOrCreatePerson,
  addPersonToInstitutionRoster,
  ensureParticipantPrivateLink,
} from '@/lib/identity';
import { displayNameForPerson } from '@/lib/identity/displayHelpers';

export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ id: string }> };

const CreateParticipantSchema = z.object({
  // Either provide a personId (from roster) or person details to create one
  personId: z.string().optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional().nullable(),
  institutionId: z.string().min(1, 'Institution is required'),
  role: z.enum(['DEBATER', 'JUDGE']),
});

/**
 * POST /api/tournaments/[id]/manage-participants
 *
 * Create a TournamentParticipant from a Person (no Clerk account needed).
 * Also creates a ParticipantPrivateLink and returns the raw token once.
 */
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

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    if (tournament.createdByUserId !== userId) {
      return NextResponse.json({ error: 'Forbidden: Only the organizer can manage participants' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = CreateParticipantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { personId: inputPersonId, firstName, lastName, email, institutionId, role } = parsed.data;

    // Get or create Person
    let personId = inputPersonId;
    if (!personId) {
      if (!firstName || !lastName) {
        return NextResponse.json(
          { error: 'Either personId or firstName + lastName is required' },
          { status: 400 }
        );
      }
      const person = await getOrCreatePerson({ firstName, lastName, email });
      personId = person.id;

      // Also add to institution roster
      await addPersonToInstitutionRoster(institutionId, personId, userId);
    }

    // Create TournamentParticipant
    const participant = await prisma.tournamentParticipant.create({
      data: {
        tournamentId,
        personId,
        institutionId,
        role: role as TournamentParticipantRole,
      },
      include: {
        person: true,
        institution: { select: { name: true } },
      },
    });

    // Create private link
    const linkResult = await ensureParticipantPrivateLink(participant.id, userId);

    return NextResponse.json(
      {
        participant: {
          id: participant.id,
          role: participant.role,
          personId: participant.personId,
          name: displayNameForPerson(participant.person),
          email: participant.person.emailNormalized,
          institution: participant.institution.name,
          claimed: !!participant.person.claimedByUserId,
        },
        privateLink: linkResult
          ? {
              rawToken: linkResult.rawToken,
              url: `/tournaments/${tournamentId}/p/${linkResult.rawToken}`,
            }
          : null,
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
        { error: 'This person is already a participant in this tournament' },
        { status: 409 }
      );
    }
    console.error('Error creating participant:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * GET /api/tournaments/[id]/manage-participants
 *
 * List all participants with link status and claimed state.
 * Only accessible by tournament organizer.
 */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tournamentId } = await params;

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

    const participants = await prisma.tournamentParticipant.findMany({
      where: { tournamentId },
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            emailNormalized: true,
            claimedByUserId: true,
          },
        },
        institution: { select: { id: true, name: true } },
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        privateLink: {
          select: {
            id: true,
            createdAt: true,
            lastUsedAt: true,
            expiresAt: true,
            revokedAt: true,
          },
        },
      },
      orderBy: [
        { institution: { name: 'asc' } },
        { person: { lastName: 'asc' } },
      ],
    });

    return NextResponse.json(
      participants.map((p) => ({
        id: p.id,
        role: p.role,
        createdAt: p.createdAt,
        person: {
          id: p.person.id,
          firstName: p.person.firstName,
          lastName: p.person.lastName,
          email: p.person.emailNormalized,
          claimed: !!p.person.claimedByUserId,
        },
        institution: p.institution,
        user: p.user
          ? {
              id: p.user.id,
              email: p.user.email,
              name: `${p.user.firstName ?? ''} ${p.user.lastName ?? ''}`.trim() || p.user.email,
            }
          : null,
        privateLink: p.privateLink
          ? {
              id: p.privateLink.id,
              active: !p.privateLink.revokedAt && (!p.privateLink.expiresAt || p.privateLink.expiresAt > new Date()),
              createdAt: p.privateLink.createdAt,
              lastUsedAt: p.privateLink.lastUsedAt,
              revokedAt: p.privateLink.revokedAt,
              expiresAt: p.privateLink.expiresAt,
            }
          : null,
      }))
    );
  } catch (err) {
    console.error('Error listing managed participants:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
