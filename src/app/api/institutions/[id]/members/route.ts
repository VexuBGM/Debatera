import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { isCoach } from '@/lib/tournament-validation';

export const runtime = 'nodejs';

const AddMemberSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  isCoach: z.boolean().optional().default(false),
});

/**
 * POST /api/institutions/[id]/members
 * Add a user to an institution (only coaches can do this)
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: currentUserId } = await auth();
  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: institutionId } = await params;
    const json = await req.json();
    const parsed = AddMemberSchema.parse(json);

    // Check if institution exists
    const institution = await prisma.institution.findUnique({
      where: { id: institutionId },
    });

    if (!institution) {
      return NextResponse.json({ error: 'Institution not found' }, { status: 404 });
    }

    // Check if current user is a coach of this institution
    const isUserCoach = await isCoach(currentUserId, institutionId);
    if (!isUserCoach) {
      return NextResponse.json(
        { error: 'Only coaches can add members to the institution' },
        { status: 403 }
      );
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: parsed.userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is already in an institution
    const existingMembership = await prisma.institutionMember.findUnique({
      where: { userId: parsed.userId },
    });

    if (existingMembership) {
      if (existingMembership.institutionId === institutionId) {
        return NextResponse.json(
          { error: 'User is already a member of this institution' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'User is already a member of another institution' },
        { status: 409 }
      );
    }

    // Add user to institution
    const member = await prisma.institutionMember.create({
      data: {
        userId: parsed.userId,
        institutionId,
        isCoach: parsed.isCoach,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            imageUrl: true,
          },
        },
      },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * GET /api/institutions/[id]/members
 * List all members of an institution
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: institutionId } = await params;

    const members = await prisma.institutionMember.findMany({
      where: { institutionId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            imageUrl: true,
          },
        },
      },
      orderBy: [
        { isCoach: 'desc' },
        { joinedAt: 'asc' },
      ],
    });

    return NextResponse.json(members, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
