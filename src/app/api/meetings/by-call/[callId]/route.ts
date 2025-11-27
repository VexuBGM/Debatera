import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

/**
 * GET /api/meetings/by-call/[callId]
 * Get meeting by Stream call ID
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ callId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { callId } = await params;

    // Check if this is a tournament round pairing
    const pairing = await prisma.roundPairing.findFirst({
      where: { callId },
    });

    if (pairing) {
      return NextResponse.json({
        type: 'pairing',
        id: pairing.id,
      });
    }

    // Check if this is a standalone meeting
    const meeting = await prisma.debateMeeting.findFirst({
      where: { callId },
    });

    if (meeting) {
      return NextResponse.json({
        type: 'meeting',
        id: meeting.id,
      });
    }

    return NextResponse.json(
      { error: 'Meeting not found' },
      { status: 404 }
    );
  } catch (error: any) {
    console.error('Error finding meeting by call ID:', error);
    return NextResponse.json(
      { error: 'Failed to find meeting' },
      { status: 500 }
    );
  }
}
