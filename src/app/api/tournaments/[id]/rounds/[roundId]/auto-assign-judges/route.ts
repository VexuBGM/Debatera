import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

// POST /api/tournaments/[id]/rounds/[roundId]/auto-assign-judges - Auto-assign judges to pairings
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; roundId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tournamentId, roundId } = await params;

    // Verify user is tournament owner
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    if (tournament.ownerId !== userId) {
      return NextResponse.json(
        { error: 'Only tournament owner can auto-assign judges' },
        { status: 403 }
      );
    }

    // Verify round exists
    const round = await prisma.round.findUnique({
      where: { id: roundId },
    });

    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    // Get all pairings for this round
    const pairings = await prisma.roundPairing.findMany({
      where: { roundId },
      orderBy: { createdAt: 'asc' },
    });

    if (pairings.length === 0) {
      return NextResponse.json(
        { error: 'No pairings found. Create pairings first.' },
        { status: 400 }
      );
    }

    // Get all judges for this tournament
    const judges = await prisma.tournamentParticipation.findMany({
      where: {
        tournamentId,
        role: 'JUDGE',
      },
      orderBy: { createdAt: 'asc' },
    });

    if (judges.length === 0) {
      return NextResponse.json(
        { error: 'No judges registered for this tournament' },
        { status: 400 }
      );
    }

    // Clear existing judge assignments for this round
    await prisma.roundPairingJudge.deleteMany({
      where: {
        pairingId: {
          in: pairings.map(p => p.id),
        },
      },
    });

    // Simple round-robin assignment: distribute judges evenly across pairings
    const assignments = [];
    let judgeIndex = 0;

    for (let i = 0; i < pairings.length; i++) {
      const pairing = pairings[i];
      
      // Assign at least one judge per pairing (more if there are enough judges)
      const judgesPerPairing = Math.max(1, Math.floor(judges.length / pairings.length));
      
      for (let j = 0; j < judgesPerPairing && judgeIndex < judges.length; j++) {
        const judge = judges[judgeIndex % judges.length];
        
        // First judge assigned to each pairing becomes the chair
        const isChair = j === 0;
        
        const assignment = await prisma.roundPairingJudge.create({
          data: {
            pairingId: pairing.id,
            participationId: judge.id,
            isChair,
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
        
        assignments.push(assignment);
        judgeIndex++;
      }
    }

    // If there are leftover judges, distribute them to pairings that have fewer judges
    while (judgeIndex < judges.length) {
      for (let i = 0; i < pairings.length && judgeIndex < judges.length; i++) {
        const pairing = pairings[i];
        const judge = judges[judgeIndex % judges.length];
        
        // Check if this judge is already assigned to this pairing
        const existingAssignment = assignments.find(
          a => a.pairingId === pairing.id && a.participationId === judge.id
        );
        
        if (!existingAssignment) {
          const assignment = await prisma.roundPairingJudge.create({
            data: {
              pairingId: pairing.id,
              participationId: judge.id,
              isChair: false, // Additional judges are not chairs
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
          
          assignments.push(assignment);
        }
        
        judgeIndex++;
      }
    }

    return NextResponse.json({
      message: 'Judges auto-assigned successfully',
      assignmentsCount: assignments.length,
      judgesUsed: new Set(assignments.map(a => a.participationId)).size,
      pairingsCount: pairings.length,
    }, { status: 200 });
  } catch (error) {
    console.error('Error auto-assigning judges:', error);
    return NextResponse.json(
      { error: 'Failed to auto-assign judges' },
      { status: 500 }
    );
  }
}
