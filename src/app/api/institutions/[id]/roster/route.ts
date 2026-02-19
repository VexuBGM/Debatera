/**
 * Institution Roster API
 *
 * GET  /api/institutions/[id]/roster       - List roster entries
 * POST /api/institutions/[id]/roster       - Add a person to the roster
 *
 * Only institution ADMINs can manage the roster.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { InstitutionRole } from '@prisma/client';
import { z } from 'zod';
import { getOrCreatePerson, addPersonToInstitutionRoster } from '@/lib/identity';

export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ id: string }> };

const AddRosterPersonSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email().optional().nullable(),
});

/**
 * POST /api/institutions/[id]/roster
 *
 * Add a person to the institution roster.
 * Creates a Person record and an InstitutionRosterEntry.
 */
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: institutionId } = await params;
    const url = new URL(req.url);
    const tournamentId = url.searchParams.get('tournamentId');

    // Check admin membership
    const membership = await prisma.institutionMember.findUnique({
      where: { institutionId_userId: { institutionId, userId } },
      select: { role: true },
    });

    let canManage = membership?.role === InstitutionRole.ADMIN;

    if (!canManage && tournamentId) {
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { createdByUserId: true },
      });

      if (tournament?.createdByUserId === userId) {
        const registration = await prisma.tournamentInstitution.findUnique({
          where: { tournamentId_institutionId: { tournamentId, institutionId } },
          select: { id: true },
        });
        if (registration) {
          canManage = true;
        }
      }
    }

    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = AddRosterPersonSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { firstName, lastName, email } = parsed.data;

    const person = await getOrCreatePerson({ firstName, lastName, email });
    const rosterEntry = await addPersonToInstitutionRoster(
      institutionId,
      person.id,
      userId
    );

    return NextResponse.json(
      {
        id: rosterEntry.id,
        person: {
          id: person.id,
          firstName: person.firstName,
          lastName: person.lastName,
          emailNormalized: person.emailNormalized,
          claimed: !!person.claimedByUserId,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error('Error adding roster entry:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * GET /api/institutions/[id]/roster
 *
 * List all people on this institution's roster.
 */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: institutionId } = await params;
    const url = new URL(req.url);
    const tournamentId = url.searchParams.get('tournamentId');

    // Check membership (any role can view roster)
    const membership = await prisma.institutionMember.findUnique({
      where: { institutionId_userId: { institutionId, userId } },
      select: { role: true },
    });

    let canView = !!membership;

    if (!canView && tournamentId) {
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { createdByUserId: true },
      });

      if (tournament?.createdByUserId === userId) {
        const registration = await prisma.tournamentInstitution.findUnique({
          where: { tournamentId_institutionId: { tournamentId, institutionId } },
          select: { id: true },
        });
        if (registration) {
          canView = true;
        }
      }
    }

    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const entries = await prisma.institutionRosterEntry.findMany({
      where: { institutionId },
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
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      entries.map((entry) => ({
        id: entry.id,
        createdAt: entry.createdAt,
        person: {
          id: entry.person.id,
          firstName: entry.person.firstName,
          lastName: entry.person.lastName,
          emailNormalized: entry.person.emailNormalized,
          claimed: !!entry.person.claimedByUserId,
        },
      }))
    );
  } catch (err) {
    console.error('Error listing roster:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
