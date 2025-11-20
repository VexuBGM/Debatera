import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

/**
 * GET /api/meetings/[meetingId]
 * Get meeting details and check if user has access
 */
export async function GET(
  request: Request,
  { params }: { params: { meetingId: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { meetingId } = params;

    // Get the meeting
    const meeting = await prisma.debateMeeting.findUnique({
      where: { id: meetingId },
      include: {
        invites: {
          where: {
            status: 'ACCEPTED',
          },
        },
      },
    });

    if (!meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      );
    }

    // Get user email
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

    // Check if user is the creator or has an accepted invitation
    const isCreator = meeting.creatorId === userId;
    const userInvite = meeting.invites.find(
      inv => inv.inviteeEmail === user.email || inv.inviteeId === userId
    );

    if (!isCreator && !userInvite) {
      return NextResponse.json(
        { error: 'You do not have access to this meeting' },
        { status: 403 }
      );
    }

    // Get all accepted participants with user details
    const participants = await Promise.all(
      meeting.invites.map(async (invite) => {
        const participant = await prisma.user.findFirst({
          where: {
            OR: [
              { id: invite.inviteeId || '' },
              { email: invite.inviteeEmail },
            ],
          },
          select: {
            id: true,
            username: true,
            email: true,
            imageUrl: true,
          },
        });

        return {
          inviteId: invite.id,
          role: invite.role,
          user: participant,
        };
      })
    );

    return NextResponse.json({
      meeting: {
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        callId: meeting.callId,
        scheduledAt: meeting.scheduledAt,
        status: meeting.status,
        isCreator,
        userRole: isCreator ? 'CREATOR' : userInvite?.role,
      },
      participants,
    });
  } catch (error: any) {
    console.error('Error fetching meeting:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meeting' },
      { status: 500 }
    );
  }
}
