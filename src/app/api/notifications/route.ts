import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

/**
 * GET /api/notifications
 * Fetch all pending invitations and notifications for the current user
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get user's email for matching invitations
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user || !user.email) {
      return NextResponse.json({ 
        invitations: [] 
      });
    }

    // Fetch pending institution invitations
    const invitations = await prisma.institutionInvite.findMany({
      where: {
        OR: [
          { inviteeEmail: user.email },
          { inviteeId: userId },
        ],
        status: 'PENDING',
        expiresAt: {
          gt: new Date(), // Only get non-expired invitations
        },
      },
      include: {
        institution: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        inviter: {
          select: {
            id: true,
            username: true,
            email: true,
            imageUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Fetch pending debate meeting invitations
    const meetingInvites = await prisma.debateMeetingInvite.findMany({
      where: {
        OR: [
          { inviteeEmail: user.email },
          { inviteeId: userId },
        ],
        status: 'PENDING',
        expiresAt: {
          gt: new Date(), // Only get non-expired invitations
        },
      },
      include: {
        meeting: {
          select: {
            id: true,
            title: true,
            description: true,
            creatorId: true,
            callId: true,
            scheduledAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      invitations,
      meetingInvites,
      unreadCount: invitations.length + meetingInvites.length,
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
