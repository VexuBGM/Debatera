import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { ensureUserInDB } from '@/lib/ensureUser';
import { InstitutionRole } from '@prisma/client';
import { assertRegistrationOpen, TournamentSettingsLike } from '@/lib/guards/tournamentSettingsGuards';

export const runtime = 'nodejs';

/**
 * DELETE /api/tournaments/[id]/participants/[participantId]
 * Auth: requester must be ADMIN of participant.institutionId
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  const { userId: requesterUserId } = await auth();
  if (!requesterUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureUserInDB();

  const { id: tournamentId, participantId } = await params;

  try {
    const participant = await prisma.tournamentParticipant.findUnique({
      where: { id: participantId },
      select: { id: true, tournamentId: true, institutionId: true } as any,
    });

    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    if (participant.tournamentId !== tournamentId) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    const membership = await prisma.institutionMember.findUnique({
      where: {
        institutionId_userId: {
          institutionId: participant.institutionId,
          userId: requesterUserId,
        },
      },
      select: { role: true },
    });

    if (!membership || membership.role !== InstitutionRole.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check registration
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { settings: true },
    });

    if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });

    try {
      const settings: TournamentSettingsLike = tournament.settings ?? {
        registrationOpensAt: null,
        registrationClosesAt: null,
        teamSizeMin: 2,
        teamSizeMax: 5,
      };

      assertRegistrationOpen(settings);
    } catch (error: any) {
      if (error.message === 'REGISTRATION_CLOSED') {
        return NextResponse.json(
          { error: 'Registration is closed for this tournament' },
          { status: 403 }
        );
      }
      throw error;
    }

    await prisma.tournamentParticipant.delete({ where: { id: participantId } });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
