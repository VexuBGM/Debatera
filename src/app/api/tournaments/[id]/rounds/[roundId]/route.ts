import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { RoundStatus } from '@prisma/client';

// PATCH /api/tournaments/[id]/rounds/[roundId] - Update round details
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; roundId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tournamentId, roundId } = await params;
    const body = await request.json();
    const { name, motion, infoSlide, status } = body;

    // Verify user is tournament owner
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    if (tournament.ownerId !== userId) {
      return NextResponse.json(
        { error: 'Only tournament owner can update rounds' },
        { status: 403 }
      );
    }

    // Update round
    const updateData: { name?: string; motion?: string; infoSlide?: string; status?: RoundStatus } = {};
    if (name !== undefined) updateData.name = name;
    if (motion !== undefined) updateData.motion = motion;
    if (infoSlide !== undefined) updateData.infoSlide = infoSlide;
    if (status !== undefined) updateData.status = status as RoundStatus;

    const round = await prisma.round.update({
      where: { id: roundId },
      data: updateData,
      include: {
        roundPairings: {
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
        },
      },
    });

    return NextResponse.json(round);
  } catch (error) {
    console.error('Error updating round:', error);
    return NextResponse.json(
      { error: 'Failed to update round' },
      { status: 500 }
    );
  }
}

// DELETE /api/tournaments/[id]/rounds/[roundId] - Delete a round
export async function DELETE(
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
        { error: 'Only tournament owner can delete rounds' },
        { status: 403 }
      );
    }

    // Delete round (cascade will delete pairings)
    await prisma.round.delete({
      where: { id: roundId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting round:', error);
    return NextResponse.json(
      { error: 'Failed to delete round' },
      { status: 500 }
    );
  }
}
