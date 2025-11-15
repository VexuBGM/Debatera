import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

// PATCH /api/tournaments/[id]/rounds/[roundId]/pairings/[pairingId] - Update pairing
export async function PATCH(
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
    const { propTeamId, oppTeamId } = body;

    // Verify user is tournament owner
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    if (tournament.ownerId !== userId) {
      return NextResponse.json(
        { error: 'Only tournament owner can update pairings' },
        { status: 403 }
      );
    }

    // Update pairing
    const pairing = await prisma.roundPairing.update({
      where: { id: pairingId },
      data: {
        propTeamId: propTeamId === null ? null : propTeamId,
        oppTeamId: oppTeamId === null ? null : oppTeamId,
      },
      include: {
        propTeam: {
          include: {
            institution: true,
            participations: {
              where: { role: 'DEBATER' },
              include: { user: true },
            },
          },
        },
        oppTeam: {
          include: {
            institution: true,
            participations: {
              where: { role: 'DEBATER' },
              include: { user: true },
            },
          },
        },
      },
    });

    return NextResponse.json(pairing);
  } catch (error) {
    console.error('Error updating pairing:', error);
    return NextResponse.json(
      { error: 'Failed to update pairing' },
      { status: 500 }
    );
  }
}

// DELETE /api/tournaments/[id]/rounds/[roundId]/pairings/[pairingId] - Delete pairing
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; roundId: string; pairingId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tournamentId, pairingId } = await params;

    // Verify user is tournament owner
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    if (tournament.ownerId !== userId) {
      return NextResponse.json(
        { error: 'Only tournament owner can delete pairings' },
        { status: 403 }
      );
    }

    // Delete pairing
    await prisma.roundPairing.delete({
      where: { id: pairingId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting pairing:', error);
    return NextResponse.json(
      { error: 'Failed to delete pairing' },
      { status: 500 }
    );
  }
}
