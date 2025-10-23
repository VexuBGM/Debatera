import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// Create motion for tournament
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const { id: tournamentId } = await params;
    const body = await req.json();
    const { text, infoSlide, roundId } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Motion text is required' },
        { status: 400 }
      );
    }

    // Check tournament exists and user has permission
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Only tournament creator or admin can add motions
    if (tournament.createdById !== user!.id && user!.appRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // If roundId provided, verify it belongs to this tournament
    if (roundId) {
      const round = await prisma.round.findFirst({
        where: {
          id: roundId,
          tournamentId,
        },
      });

      if (!round) {
        return NextResponse.json(
          { error: 'Round not found in this tournament' },
          { status: 404 }
        );
      }
    }

    const motion = await prisma.motion.create({
      data: {
        tournamentId,
        text,
        infoSlide: infoSlide || null,
        roundId: roundId || null,
      },
    });

    return NextResponse.json(motion, { status: 201 });
  } catch (error) {
    console.error('Error creating motion:', error);
    return NextResponse.json(
      { error: 'Failed to create motion' },
      { status: 500 }
    );
  }
}

// List motions for tournament
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;
    const { searchParams } = new URL(req.url);
    const roundId = searchParams.get('roundId');

    const where: any = { tournamentId };
    if (roundId) {
      where.roundId = roundId;
    }

    const motions = await prisma.motion.findMany({
      where,
      include: {
        round: true,
      },
      orderBy: {
        seq: 'asc',
      },
    });

    return NextResponse.json(motions);
  } catch (error) {
    console.error('Error fetching motions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch motions' },
      { status: 500 }
    );
  }
}
