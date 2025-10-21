import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTournamentOrganizer } from '@/lib/auth';
import { RoundStage } from '@prisma/client';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tournamentId } = await params;

  const { error } = await requireTournamentOrganizer(tournamentId);
  if (error) return error;

  try {
    const body = await req.json();
    const { stage } = body;

    // Validate tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Get the next round number
    const lastRound = await prisma.round.findFirst({
      where: { tournamentId },
      orderBy: { number: 'desc' },
    });

    const nextNumber = lastRound ? lastRound.number + 1 : 1;

    // Create the round
    const round = await prisma.round.create({
      data: {
        tournamentId,
        number: nextNumber,
        stage: stage || RoundStage.PRELIM,
        isPublished: false,
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tournamentId } = await params;

  try {
    const rounds = await prisma.round.findMany({
      where: { tournamentId },
      orderBy: { number: 'asc' },
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

    return NextResponse.json(rounds);
  } catch (error) {
    console.error('Error fetching rounds:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rounds' },
      { status: 500 }
    );
  }
}
