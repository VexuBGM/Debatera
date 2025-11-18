import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ParticipantStatus } from '@prisma/client';

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

    // Update all participant records for this user in this pairing to LEFT status
    const result = await prisma.debateParticipant.updateMany({
      where: {
        pairingId,
        userId,
        status: { in: [ParticipantStatus.ACTIVE, ParticipantStatus.RESERVED] },
      },
      data: {
        status: ParticipantStatus.LEFT,
        leftAt: new Date(),
      },
    });

    return NextResponse.json({ 
      success: true,
      updated: result.count,
      message: 'Participant status updated to LEFT'
    });
  } catch (error) {
    console.error('Error updating participant status on leave:', error);
    return NextResponse.json(
      { error: 'Failed to update participant status' },
      { status: 500 }
    );
  }
}
