import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTournamentOrganizer } from '@/lib/auth';
import { autoAllocateJudges } from '@/services/judgeAllocationService';

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

    // Don't allow reallocation for published rounds
    if (round.isPublished) {
      return NextResponse.json(
        { error: 'Cannot reallocate judges for published round' },
        { status: 400 }
      );
    }

    // Get options from request body
    const body = await req.json().catch(() => ({}));
    const options = {
      importanceWeight: body.importanceWeight,
      conflictPenalty: body.conflictPenalty,
      strengthMismatchPenalty: body.strengthMismatchPenalty,
    };

    // Auto-allocate judges
    await autoAllocateJudges(roundId, options);

    // Fetch and return the debates with allocated judges
    const debates = await prisma.debate.findMany({
      where: { roundId },
      include: {
        propTeam: true,
        oppTeam: true,
        participants: {
          where: { role: 'JUDGE' },
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
    });

    return NextResponse.json({ debates });
  } catch (error) {
    console.error('Error allocating judges:', error);
    return NextResponse.json(
      { error: 'Failed to allocate judges', details: (error as Error).message },
      { status: 500 }
    );
  }
}
