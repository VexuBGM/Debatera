/**
 * API: My Participant record
 *
 * GET /api/tournaments/[id]/participants/me
 * Returns the current user's participant record (role, id) for this tournament,
 * or 404 if the user is not registered.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tournamentId } = await params;

    const participant = await prisma.tournamentParticipant.findUnique({
      where: {
        tournamentId_userId: { tournamentId, userId },
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!participant) {
      return NextResponse.json(
        { error: 'Not registered in this tournament' },
        { status: 404 }
      );
    }

    return NextResponse.json(participant, { status: 200 });
  } catch (err) {
    console.error('Error fetching participant/me:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
