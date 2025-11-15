import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

// POST /api/tournaments/[id]/rounds/[roundId]/pairings/[pairingId]/judges - Add judge to pairing
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; roundId: string; pairingId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tournamentId, pairingId } = await params;
    const body = await request.json();
    const { participationId, isChair } = body;

    // Verify user is tournament owner
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    if (tournament.ownerId !== userId) {
      return NextResponse.json(
        { error: 'Only tournament owner can assign judges' },
        { status: 403 }
      );
    }

    // Verify participation is a judge
    const participation = await prisma.tournamentParticipation.findUnique({
      where: { id: participationId },
    });

    if (!participation) {
      return NextResponse.json({ error: 'Participation not found' }, { status: 404 });
    }

    if (participation.role !== 'JUDGE') {
      return NextResponse.json(
        { error: 'Participation must be a judge' },
        { status: 400 }
      );
    }

    // Check if judge is already assigned to this pairing
    const existingAssignment = await prisma.roundPairingJudge.findUnique({
      where: {
        pairingId_participationId: {
          pairingId,
          participationId,
        },
      },
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'Judge already assigned to this pairing' },
        { status: 400 }
      );
    }

    // If this judge should be chair, unset any existing chair
    if (isChair) {
      await prisma.roundPairingJudge.updateMany({
        where: { pairingId, isChair: true },
        data: { isChair: false },
      });
    }

    // Create judge assignment
    const judgeAssignment = await prisma.roundPairingJudge.create({
      data: {
        pairingId,
        participationId,
        isChair: isChair || false,
      },
      include: {
        participation: {
          include: {
            user: true,
            institution: true,
          },
        },
      },
    });

    return NextResponse.json(judgeAssignment, { status: 201 });
  } catch (error) {
    console.error('Error adding judge:', error);
    return NextResponse.json(
      { error: 'Failed to add judge' },
      { status: 500 }
    );
  }
}
