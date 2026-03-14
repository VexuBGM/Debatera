import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { getInstitution, isInstitutionAdmin } from '@/lib/services/mvp';
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
    const { id } = await params;
    
    const institution = await getInstitution(id);

    if (!institution) {
      return NextResponse.json({ error: 'Institution not found' }, { status: 404 });
    }

    return NextResponse.json(institution, { status: 200 });
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
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

