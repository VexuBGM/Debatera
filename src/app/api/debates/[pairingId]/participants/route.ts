import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ParticipantStatus } from '@prisma/client';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ pairingId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pairingId } = await params;

    // Get the pairing to verify it exists
    const pairing = await prisma.roundPairing.findUnique({
      where: { id: pairingId },
      include: {
        propTeam: { include: { institution: true, participations: true } },
        oppTeam: { include: { institution: true, participations: true } },
      },
    });

    if (!pairing) {
      return NextResponse.json({ error: 'Debate not found' }, { status: 404 });
    }

    // Get all active/reserved participants
    const participants = await prisma.debateParticipant.findMany({
      where: {
        pairingId,
        status: { in: [ParticipantStatus.ACTIVE, ParticipantStatus.RESERVED] },
      },
      include: {
        team: {
          include: {
            institution: true,
          },
        },
      },
    });

    // Get user information for each participant
    const participantsWithUsers = await Promise.all(
      participants.map(async (p: any) => {
        const user = await prisma.user.findUnique({
          where: { id: p.userId },
          select: {
            id: true,
            username: true,
            email: true,
          },
        });

        return {
          id: p.id,
          userId: p.userId,
          role: p.role,
          status: p.status,
          teamId: p.teamId,
          user,
          team: p.team,
        };
      })
    );

    // Organize by team
    const propTeamParticipants = participantsWithUsers.filter(
      (p: any) => p.teamId === pairing.propTeamId
    );
    const oppTeamParticipants = participantsWithUsers.filter(
      (p: any) => p.teamId === pairing.oppTeamId
    );
    const judges = participantsWithUsers.filter((p: any) => p.teamId === null);

    // Check if current user is eligible to join (either in a team or assigned as judge)
    const isInPropTeam = pairing.propTeam?.participations.some((p: any) => p.userId === userId);
    const isInOppTeam = pairing.oppTeam?.participations.some((p: any) => p.userId === userId);
    
    // Check if user is assigned as a judge for this pairing
    const judgeAssignments = await prisma.roundPairingJudge.findMany({
      where: { pairingId },
      include: { participation: true },
    });
    const isJudge = judgeAssignments.some((j: any) => j.participation.userId === userId);
    
    const canJoin = isInPropTeam || isInOppTeam || isJudge;
    
    // Determine which team the user belongs to
    let userTeamId: string | null = null;
    if (isInPropTeam) userTeamId = pairing.propTeamId;
    else if (isInOppTeam) userTeamId = pairing.oppTeamId;

    return NextResponse.json({
      callId: pairing.callId,
      canJoin,
      userTeamId,
      isJudge,
      propTeam: {
        id: pairing.propTeamId,
        name: pairing.propTeam?.name,
        institution: pairing.propTeam?.institution,
        participants: propTeamParticipants,
      },
      oppTeam: {
        id: pairing.oppTeamId,
        name: pairing.oppTeam?.name,
        institution: pairing.oppTeam?.institution,
        participants: oppTeamParticipants,
      },
      judges,
    });
  } catch (error) {
    console.error('Error fetching participants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch participants' },
      { status: 500 }
    );
  }
}
