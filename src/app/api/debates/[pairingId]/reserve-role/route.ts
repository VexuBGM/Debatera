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
    const { role } = body as { role: SpeakerRole };

    if (!role || !Object.values(SpeakerRole).includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
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
    if (isJudge && role !== SpeakerRole.JUDGE) {
      return NextResponse.json(
        { error: 'Judges can only join with JUDGE role' },
        { status: 400 }
      );
    }

    // Debaters cannot have JUDGE role
    if (!isJudge && userTeamId && role === SpeakerRole.JUDGE) {
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

    // Check if user already has a role reserved
    const existingParticipant = await prisma.debateParticipant.findUnique({
      where: {
        pairingId_userId: {
          pairingId,
          userId,
        },
      },
    });

    if (existingParticipant) {
      // User already has a role, return it (reconnect scenario)
      return NextResponse.json({
        success: true,
        role: existingParticipant.role,
        callId: pairing.callId,
        message: 'Rejoining with existing role',
      });
    }

    // For debaters, enforce the 3-person-per-team limit and role uniqueness
    if (userTeamId && role !== SpeakerRole.JUDGE) {
      // Count active debaters for this team
      const teamParticipants = await prisma.debateParticipant.findMany({
        where: {
          pairingId,
          teamId: userTeamId,
          role: { not: SpeakerRole.JUDGE },
          status: { in: [ParticipantStatus.ACTIVE, ParticipantStatus.RESERVED] },
        },
      });

      // Check if team already has 3 debaters
      if (teamParticipants.length >= 3) {
        return NextResponse.json(
          { error: 'Your team already has 3 debaters in this room' },
          { status: 400 }
        );
      }

      // Check if the role is already taken by someone else on the team
      const roleAlreadyTaken = teamParticipants.some(
        (p: any) => p.role === role && p.userId !== userId
      );

      if (roleAlreadyTaken) {
        return NextResponse.json(
          { error: 'That role is already taken by another team member' },
          { status: 400 }
        );
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

    // Reserve the role for the user
    const participant = await prisma.debateParticipant.create({
      data: {
        pairingId,
        userId,
        teamId: userTeamId,
        role,
        status: ParticipantStatus.RESERVED,
      },
    });

    return NextResponse.json({
      success: true,
      role: participant.role,
      callId,
      participantId: participant.id,
      message: 'Role reserved successfully',
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
