import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

// PATCH /api/tournaments/[id]/rounds/[roundId]/pairings/[pairingId]/judges/[judgeId] - Update judge (e.g., toggle chair)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; roundId: string; pairingId: string; judgeId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tournamentId, pairingId, judgeId } = await params;
    const body = await request.json();
    const { isChair } = body;

    // Verify user is tournament owner
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    if (tournament.ownerId !== userId) {
      return NextResponse.json(
        { error: 'Only tournament owner can update judge assignments' },
        { status: 403 }
      );
    }

    // If setting as chair, unset any existing chair
    if (isChair) {
      await prisma.roundPairingJudge.updateMany({
        where: { pairingId, isChair: true, id: { not: judgeId } },
        data: { isChair: false },
      });
    }

    // Update judge assignment
    const judgeAssignment = await prisma.roundPairingJudge.update({
      where: { id: judgeId },
      data: { isChair },
      include: {
        participation: {
          include: {
            user: true,
            institution: true,
          },
        },
      },
    });

    return NextResponse.json(judgeAssignment);
  } catch (error) {
    console.error('Error updating judge:', error);
    return NextResponse.json(
      { error: 'Failed to update judge' },
      { status: 500 }
    );
  }
}

// DELETE /api/tournaments/[id]/rounds/[roundId]/pairings/[pairingId]/judges/[judgeId] - Remove judge from pairing
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; roundId: string; pairingId: string; judgeId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tournamentId, judgeId } = await params;

    // Verify user is tournament owner
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    if (tournament.ownerId !== userId) {
      return NextResponse.json(
        { error: 'Only tournament owner can remove judges' },
        { status: 403 }
      );
    }

    // Delete judge assignment
    await prisma.roundPairingJudge.delete({
      where: { id: judgeId },
    });

    return NextResponse.json({ message: 'Judge removed successfully' });
  } catch (error) {
    console.error('Error removing judge:', error);
    return NextResponse.json(
      { error: 'Failed to remove judge' },
      { status: 500 }
    );
  }
}
