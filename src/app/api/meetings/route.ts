import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth, currentUser } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

/**
 * POST /api/meetings
 * Create a new standalone debate meeting with invitations
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, description, callId, invites } = body;

    if (!title || !callId) {
      return NextResponse.json(
        { error: 'Title and callId are required' },
        { status: 400 }
      );
    }

    if (!invites || !Array.isArray(invites) || invites.length === 0) {
      return NextResponse.json(
        { error: 'At least one invite is required' },
        { status: 400 }
      );
    }

    // Validate invites structure
    for (const invite of invites) {
      if (!invite.email || !invite.role) {
        return NextResponse.json(
          { error: 'Each invite must have an email and role' },
          { status: 400 }
        );
      }
      if (!['DEBATER', 'JUDGE'].includes(invite.role)) {
        return NextResponse.json(
          { error: 'Role must be DEBATER or JUDGE' },
          { status: 400 }
        );
      }
    }

    // Get current user
    const user = await currentUser();
    if (!user || !user.emailAddresses?.[0]?.emailAddress) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      );
    }

    // Ensure user record exists in database
    await prisma.user.upsert({
      where: { id: userId },
      update: {
        email: user.emailAddresses[0].emailAddress,
        username: user.username || user.firstName || null,
        imageUrl: user.imageUrl || null,
      },
      create: {
        id: userId,
        email: user.emailAddresses[0].emailAddress,
        username: user.username || user.firstName || null,
        imageUrl: user.imageUrl || null,
      },
    });

    // Create meeting with invitations
    const meeting = await prisma.debateMeeting.create({
      data: {
        title,
        description: description || null,
        creatorId: userId,
        callId,
        scheduledAt: new Date(),
        invites: {
          create: invites.map((invite: { email: string; role: string }) => {
            // Check if the invitee is a registered user
            // We'll do this in a transaction to get their ID
            return {
              inviterId: userId,
              inviteeEmail: invite.email.toLowerCase(),
              role: invite.role,
              status: 'PENDING',
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            };
          }),
        },
      },
      include: {
        invites: true,
      },
    });

    // Update invites with inviteeId if the user exists
    for (const invite of meeting.invites) {
      const inviteeUser = await prisma.user.findUnique({
        where: { email: invite.inviteeEmail },
        select: { id: true },
      });

      if (inviteeUser) {
        await prisma.debateMeetingInvite.update({
          where: { id: invite.id },
          data: { inviteeId: inviteeUser.id },
        });
      }
    }

    return NextResponse.json({ meeting }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating meeting:', error);
    return NextResponse.json(
      { error: 'Failed to create meeting' },
      { status: 500 }
    );
  }
}
