import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTournamentOrganizer } from '@/lib/auth';
import { generatePrelimDraw, createDebatesForRound } from '@/services/pairingService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roundId: string }> }
) {
  const { roundId } = await params;

  try {
    // Get round and check permissions
    const round = await prisma.round.findUnique({
      where: { id: roundId },
      include: { tournament: true },
    });

    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    const { error } = await requireTournamentOrganizer(round.tournamentId);
    if (error) return error;

    // Don't allow regeneration for published rounds
    if (round.isPublished) {
      return NextResponse.json(
        { error: 'Cannot regenerate draw for published round' },
        { status: 400 }
      );
    }

    // Delete existing debates
    await prisma.debate.deleteMany({
      where: { roundId },
    });

    // Generate new pairings
    const pairings = await generatePrelimDraw(
      round.tournamentId,
      round.number
    );

    // Create debates
    await createDebatesForRound(roundId, pairings);

    // Fetch and return the created debates
    const debates = await prisma.debate.findMany({
      where: { roundId },
      include: {
        propTeam: true,
        oppTeam: true,
      },
    });

    return NextResponse.json({ debates, pairings: pairings.length });
  } catch (error) {
    console.error('Error generating draw:', error);
    return NextResponse.json(
      { error: 'Failed to generate draw', details: (error as Error).message },
      { status: 500 }
    );
  }
}
