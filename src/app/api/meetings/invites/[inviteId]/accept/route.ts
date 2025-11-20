import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

/**
 * POST /api/meetings/invites/[inviteId]/accept
 * Accept a debate meeting invitation
 */
export async function POST(
  request: Request,
  { params }: { params: { inviteId: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { inviteId } = params;

    // Get the invitation
    const invite = await prisma.debateMeetingInvite.findUnique({
      where: { id: inviteId },
      include: {
        meeting: {
          select: {
            id: true,
            title: true,
            callId: true,
          },
        },
      },
    });

    if (!invite) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Check if the invitation is for the current user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user || !user.email) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      );
    }

    if (invite.inviteeEmail !== user.email && invite.inviteeId !== userId) {
      return NextResponse.json(
        { error: 'This invitation is not for you' },
        { status: 403 }
      );
    }

    // Check if already responded
    if (invite.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Invitation already responded to' },
        { status: 400 }
      );
    }

    // Check if expired
    if (invite.expiresAt < new Date()) {
      await prisma.debateMeetingInvite.update({
        where: { id: inviteId },
        data: { status: 'EXPIRED' },
      });
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      );
    }

    // Accept the invitation
    await prisma.debateMeetingInvite.update({
      where: { id: inviteId },
      data: {
        status: 'ACCEPTED',
        respondedAt: new Date(),
        inviteeId: userId, // Update inviteeId in case it was null
      },
    });

    return NextResponse.json({
      message: 'Invitation accepted',
      meeting: invite.meeting,
    });
  } catch (error: any) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}
