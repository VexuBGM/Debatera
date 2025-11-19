import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

/**
 * POST /api/invitations/[id]/accept
 * Accept an institution invitation
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: inviteId } = await params;

    // Get user's email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user || !user.email) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find the invitation
    const invite = await prisma.institutionInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Verify the invitation is for this user
    if (invite.inviteeEmail !== user.email && invite.inviteeId !== userId) {
      return NextResponse.json(
        { error: 'This invitation is not for you' },
        { status: 403 }
      );
    }

    // Check if invitation is still valid
    if (invite.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'This invitation has already been responded to' },
        { status: 409 }
      );
    }

    if (invite.expiresAt < new Date()) {
      // Mark as expired
      await prisma.institutionInvite.update({
        where: { id: inviteId },
        data: { status: 'EXPIRED' },
      });
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 410 }
      );
    }

    // Check if user is already in an institution
    const existingMembership = await prisma.institutionMember.findUnique({
      where: { userId },
    });

    if (existingMembership) {
      if (existingMembership.institutionId === invite.institutionId) {
        // Already a member, just mark invite as accepted
        await prisma.institutionInvite.update({
          where: { id: inviteId },
          data: {
            status: 'ACCEPTED',
            respondedAt: new Date(),
          },
        });
        return NextResponse.json(
          { error: 'You are already a member of this institution' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'You are already a member of another institution' },
        { status: 409 }
      );
    }

    // Accept the invitation and create membership
    const [member] = await prisma.$transaction([
      prisma.institutionMember.create({
        data: {
          userId,
          institutionId: invite.institutionId,
          isCoach: invite.isCoach,
        },
        include: {
          institution: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              imageUrl: true,
            },
          },
        },
      }),
      prisma.institutionInvite.update({
        where: { id: inviteId },
        data: {
          status: 'ACCEPTED',
          respondedAt: new Date(),
          inviteeId: userId, // Update inviteeId if it was null
        },
      }),
    ]);

    return NextResponse.json(member, { status: 200 });
  } catch (error: any) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}
