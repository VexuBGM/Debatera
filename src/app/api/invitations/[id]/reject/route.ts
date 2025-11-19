import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

/**
 * POST /api/invitations/[id]/reject
 * Reject an institution invitation
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

    // Check if invitation is still pending
    if (invite.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'This invitation has already been responded to' },
        { status: 409 }
      );
    }

    // Reject the invitation
    const rejectedInvite = await prisma.institutionInvite.update({
      where: { id: inviteId },
      data: {
        status: 'REJECTED',
        respondedAt: new Date(),
        inviteeId: userId, // Update inviteeId if it was null
      },
    });

    return NextResponse.json(rejectedInvite, { status: 200 });
  } catch (error: any) {
    console.error('Error rejecting invitation:', error);
    return NextResponse.json(
      { error: 'Failed to reject invitation' },
      { status: 500 }
    );
  }
}
