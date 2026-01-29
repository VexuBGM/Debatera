import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { ensureUserInDB } from '@/lib/ensureUser';
import { InstitutionRole } from '@prisma/client';

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

    await prisma.tournamentParticipant.delete({ where: { id: participantId } });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
