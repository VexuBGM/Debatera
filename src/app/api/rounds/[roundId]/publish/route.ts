import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTournamentOrganizer } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roundId: string }> }
) {
  const { roundId } = await params;

  try {
    // Get round and check permissions
    const round = await prisma.round.findUnique({
      where: { id: roundId },
      include: {
        debates: true,
      },
    });

    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    const { error } = await requireTournamentOrganizer(round.tournamentId);
    if (error) return error;

    // Check if already published
    if (round.isPublished) {
      return NextResponse.json(
        { error: 'Round is already published' },
        { status: 400 }
      );
    }

    // Check if round has debates
    if (round.debates.length === 0) {
      return NextResponse.json(
        { error: 'Cannot publish round without debates' },
        { status: 400 }
      );
    }

    // Publish the round
    const updatedRound = await prisma.round.update({
      where: { id: roundId },
      data: { isPublished: true },
      include: {
        debates: {
          include: {
            propTeam: true,
            oppTeam: true,
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    imageUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json(updatedRound);
  } catch (error) {
    console.error('Error publishing round:', error);
    return NextResponse.json(
      { error: 'Failed to publish round' },
      { status: 500 }
    );
  }
}
