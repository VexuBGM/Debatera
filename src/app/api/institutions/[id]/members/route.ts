import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { isCoach } from '@/lib/tournament-validation';

export const runtime = 'nodejs';

const AddMemberSchema = z.object({
  email: z.string().min(1, 'Email is required'),
  isCoach: z.boolean().optional().default(false),
});

/**
 * POST /api/institutions/[id]/members
 * Create an invitation for a user to join an institution (only coaches can do this)
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
  // Log incoming payload to help debug 400s from validation
  console.debug(json);
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
        { error: 'Only coaches can invite members to the institution' },
        { status: 403 }
      );
    }

    // Check if target user exists (lookup by email)
    const targetUser = await prisma.user.findUnique({
      where: { email: parsed.email },
    });

    const targetUserId = targetUser?.id;

    // Check if user is already in an institution (InstitutionMember has unique userId)
    if (targetUserId) {
      const existingMembership = await prisma.institutionMember.findUnique({
        where: { userId: targetUserId },
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
    }

    // Check if there's already a pending invitation for this email
    const existingInvite = await prisma.institutionInvite.findFirst({
      where: {
        institutionId,
        inviteeEmail: parsed.email,
        status: 'PENDING',
      },
    });

    if (existingInvite) {
      return NextResponse.json(
        { error: 'An invitation has already been sent to this email' },
        { status: 409 }
      );
    }

    // Create invitation (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = await prisma.institutionInvite.create({
      data: {
        institutionId,
        inviterId: currentUserId,
        inviteeEmail: parsed.email,
        inviteeId: targetUserId,
        isCoach: parsed.isCoach,
        expiresAt,
      },
      include: {
        institution: {
          select: {
            id: true,
            name: true,
          },
        },
        inviter: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(invite, { status: 201 });
  } catch (err: any) {
    // Return more explicit validation errors for Zod failures
    if (err instanceof z.ZodError) {
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
