import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

const CreateInstitutionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  description: z.string().max(2000).optional().or(z.literal('')),
});

/**
 * POST /api/institutions
 * Create a new institution. The creator is automatically assigned as a coach.
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const json = await req.json();
    const parsed = CreateInstitutionSchema.parse(json);

    // Check if user is already in an institution
    const existingMembership = await prisma.institutionMember.findUnique({
      where: { userId },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: 'You are already a member of an institution' },
        { status: 409 }
      );
    }

    // Create institution and add creator as coach in a transaction
    const institution = await prisma.$transaction(async (tx) => {
      const inst = await tx.institution.create({
        data: {
          name: parsed.name,
          description: parsed.description || null,
          createdById: userId,
        },
      });

      await tx.institutionMember.create({
        data: {
          userId,
          institutionId: inst.id,
          isCoach: true,
        },
      });

      return inst;
    });

    return NextResponse.json(institution, { status: 201 });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    if (err.code === 'P2002') {
      return NextResponse.json(
        { error: 'An institution with this name already exists' },
        { status: 409 }
      );
    }
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * GET /api/institutions
 * List all institutions
 */
export async function GET() {
  try {
    const institutions = await prisma.institution.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        _count: {
          select: {
            members: true,
            teams: true,
          },
        },
      },
    });
    return NextResponse.json(institutions, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
