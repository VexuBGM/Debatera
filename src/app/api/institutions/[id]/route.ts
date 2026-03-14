import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { isInstitutionAdmin } from '@/lib/services/mvp';
import { getInstitutionViewAccess } from '@/lib/security/access';
import { rateLimit } from '@/lib/security/rateLimit';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

const UpdateInstitutionSchema = z.object({
  isPublic: z.boolean(),
});

/**
 * GET /api/institutions/[id]
 * Fetch details about an institution
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimited = rateLimit(req, 'api:institutions:get', {
      limit: 60,
      windowMs: 60_000,
    });
    if (rateLimited) return rateLimited;

    const { userId } = await auth();
    const { id } = await params;
    const access = await getInstitutionViewAccess(id, userId);

    if (!access.exists || !access.canView) {
      return NextResponse.json({ error: 'Institution not found' }, { status: 404 });
    }

    const userSelect = access.isMember
      ? {
          id: true,
          displayName: true,
          firstName: true,
          lastName: true,
          email: true,
          imageUrl: true,
        }
      : {
          id: true,
          displayName: true,
          firstName: true,
          lastName: true,
          imageUrl: true,
        };

    const institution = await prisma.institution.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        isPublic: true,
        createdAt: true,
        members: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            userId: true,
            role: true,
            createdAt: true,
            user: {
              select: userSelect,
            },
          },
        },
        tournamentInstitutions: {
          select: { id: true },
        },
      },
    });

    if (!institution) {
      return NextResponse.json({ error: 'Institution not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        ...institution,
        registrations: institution.tournamentInstitutions,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PATCH /api/institutions/[id]
 * Update institution-level fields (admin only)
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

    const { id: institutionId } = await params;

    const isAdmin = await isInstitutionAdmin(userId, institutionId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Only institution admins can update settings' }, { status: 403 });
    }

    const json = await req.json();
    const parsed = UpdateInstitutionSchema.parse(json);

    const updated = await prisma.institution.update({
      where: { id: institutionId },
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

