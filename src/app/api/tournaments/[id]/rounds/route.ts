import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// Create a new round
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const { id: tournamentId } = await params;
    const body = await req.json();
    const { name, stage = 'PRELIMINARY', startsAt } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Round name is required' },
        { status: 400 }
      );
    }

    // Check tournament exists and user has permission
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        rounds: {
          orderBy: { seq: 'desc' },
          take: 1,
        },
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Only tournament creator or admin can create rounds
    if (tournament.createdById !== user!.id && user!.appRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get next sequence number
    const nextSeq = tournament.rounds.length > 0 ? tournament.rounds[0].seq + 1 : 1;

    const round = await prisma.round.create({
      data: {
        tournamentId,
        name,
        seq: nextSeq,
        stage,
        startsAt: startsAt ? new Date(startsAt) : null,
      },
    });

    return NextResponse.json(round, { status: 201 });
  } catch (error) {
    console.error('Error creating round:', error);
    return NextResponse.json(
      { error: 'Failed to create round' },
      { status: 500 }
    );
  }
}

// List all rounds for tournament
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;

    const rounds = await prisma.round.findMany({
      where: { tournamentId },
      include: {
        debates: {
          include: {
            propTeam: true,
            oppTeam: true,
            venue: true,
          },
        },
        motions: true,
      },
      orderBy: {
        seq: 'asc',
      },
    });

    return NextResponse.json(rounds);
  } catch (error) {
    console.error('Error fetching rounds:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rounds' },
      { status: 500 }
    );
  }
}
