import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SpeakerRole, ParticipantStatus } from '@prisma/client';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ pairingId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pairingId } = await params;
    const body = await request.json();
    const { roles } = body as { roles: SpeakerRole[] };

    if (!roles || !Array.isArray(roles) || roles.length === 0) {
      return NextResponse.json({ error: 'Invalid roles' }, { status: 400 });
    }

    // Validate all roles
    for (const role of roles) {
      if (!Object.values(SpeakerRole).includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
    }

    // Check if REPLY_SPEAKER is being requested with THIRD_SPEAKER
    const hasReply = roles.includes(SpeakerRole.REPLY_SPEAKER);
    const hasThird = roles.includes(SpeakerRole.THIRD_SPEAKER);
    const hasFirst = roles.includes(SpeakerRole.FIRST_SPEAKER);
    const hasSecond = roles.includes(SpeakerRole.SECOND_SPEAKER);
    const hasJudge = roles.includes(SpeakerRole.JUDGE);
    
    if (hasReply && hasThird) {
      return NextResponse.json(
        { error: 'Third speaker cannot be the reply speaker' },
        { status: 400 }
      );
    }

    // REPLY_SPEAKER must be combined with FIRST or SECOND speaker
    if (hasReply && !hasFirst && !hasSecond) {
      return NextResponse.json(
        { error: 'Reply speaker must also be first or second speaker' },
        { status: 400 }
      );
    }

    // Get the pairing with teams and round info
    const pairing = await prisma.roundPairing.findUnique({
      where: { id: pairingId },
      include: {
        propTeam: {
          include: {
            participations: true,
          },
        },
        oppTeam: {
          include: {
            participations: true,
          },
        },
        judges: {
          include: {
            participation: true,
          },
        },
        round: true,
      },
    });

    if (!pairing) {
      return NextResponse.json({ error: 'Debate not found' }, { status: 404 });
    }

    // Determine if user is a judge or debater
    const isJudge = pairing.judges.some((j: any) => j.participation.userId === userId);
    
    // Determine which team the user belongs to
    let userTeamId: string | null = null;
    if (pairing.propTeam?.participations.some((p: any) => p.userId === userId)) {
      userTeamId = pairing.propTeam.id;
    } else if (pairing.oppTeam?.participations.some((p: any) => p.userId === userId)) {
      userTeamId = pairing.oppTeam.id;
    }

    // Judges can only have JUDGE role
    if (isJudge && !hasJudge) {
      return NextResponse.json(
        { error: 'Judges can only join with JUDGE role' },
        { status: 400 }
      );
    }

    // Judges should only have JUDGE role (no other roles)
    if (isJudge && roles.length > 1) {
      return NextResponse.json(
        { error: 'Judges cannot have multiple roles' },
        { status: 400 }
      );
    }

    // Debaters cannot have JUDGE role
    if (!isJudge && userTeamId && hasJudge) {
      return NextResponse.json(
        { error: 'Debaters cannot join as JUDGE' },
        { status: 400 }
      );
    }

    // If user is neither a judge nor a debater in this debate
    if (!isJudge && !userTeamId) {
      return NextResponse.json(
        { error: 'You are not assigned to this debate' },
        { status: 403 }
      );
    }

    // Check if user already has roles reserved
    const existingParticipants = await prisma.debateParticipant.findMany({
      where: {
        pairingId,
        userId,
      },
    });

    // For judges, if they already have a role, just return it (reconnect scenario)
    if (isJudge && existingParticipants.length > 0) {
      return NextResponse.json({
        success: true,
        roles: existingParticipants.map(p => p.role),
        callId: pairing.callId,
        message: 'Rejoining with existing role',
      });
    }

    // For debaters, delete existing roles to allow re-selection each time they enter
    if (!isJudge && existingParticipants.length > 0) {
      await prisma.debateParticipant.deleteMany({
        where: {
          pairingId,
          userId,
        },
      });
    }

    // For debaters, enforce the 3-person-per-team limit and role uniqueness
    if (userTeamId && !hasJudge) {
      // Get current team participants (excluding the current user who we just deleted)
      const teamParticipants = await prisma.debateParticipant.findMany({
        where: {
          pairingId,
          teamId: userTeamId,
          role: { not: SpeakerRole.JUDGE },
          status: { in: [ParticipantStatus.ACTIVE, ParticipantStatus.RESERVED] },
        },
      });

      // Get unique user IDs (since users can have multiple roles)
      const uniqueUserIds = new Set(teamParticipants.map((p: any) => p.userId));
      
      // Check if team already has 3 different debaters
      if (uniqueUserIds.size >= 3) {
        return NextResponse.json(
          { error: 'Your team already has 3 debaters in this room' },
          { status: 400 }
        );
      }

      // Check if any main speaker role (FIRST, SECOND, THIRD) is already taken by someone else
      const mainRoles = roles.filter(r => r !== SpeakerRole.REPLY_SPEAKER);
      for (const role of mainRoles) {
        const roleAlreadyTaken = teamParticipants.some(
          (p: any) => p.role === role && p.userId !== userId
        );

        if (roleAlreadyTaken) {
          return NextResponse.json(
            { error: `That role is already taken by another team member` },
            { status: 400 }
          );
        }
      }
    }

    // Create or ensure callId exists for this pairing
    let callId = pairing.callId;
    if (!callId) {
      // Generate a unique callId (you can customize this format)
      callId = `debate_${pairingId}_${Date.now()}`;
      await prisma.roundPairing.update({
        where: { id: pairingId },
        data: { callId },
      });
    }

    // Reserve all the roles for the user
    const participants = await Promise.all(
      roles.map(role =>
        prisma.debateParticipant.create({
          data: {
            pairingId,
            userId,
            teamId: userTeamId,
            role,
            status: ParticipantStatus.RESERVED,
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      roles: participants.map(p => p.role),
      callId,
      participantIds: participants.map(p => p.id),
      message: 'Roles reserved successfully',
    });
  } catch (error) {
    console.error('Error reserving role:', error);
    
    // Handle unique constraint violations (race conditions)
    if (error instanceof Error && 'code' in error) {
      const prismaError = error as any;
      if (prismaError.code === 'P2002') {
        return NextResponse.json(
          { error: 'That role was just taken by another user. Please choose another role.' },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to reserve role' },
      { status: 500 }
    );
  }
}
