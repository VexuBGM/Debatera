import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

// POST /api/tournaments/[id]/rounds/[roundId]/pairings - Create pairing or generate auto-pairings
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
    const body = await request.json();
    const { propTeamId, oppTeamId, autoGenerate } = body;

    // Verify user is tournament owner
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    if (tournament.ownerId !== userId) {
      return NextResponse.json(
        { error: 'Only tournament owner can create pairings' },
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

    // If auto-generate is true, create pairings for all teams
    if (autoGenerate) {
      // Get all teams in the tournament
      const teams = await prisma.tournamentTeam.findMany({
        where: { tournamentId },
        orderBy: { createdAt: 'asc' },
      });

      // Delete existing pairings for this round
      await prisma.roundPairing.deleteMany({
        where: { roundId },
      });

      // Create pairings (simple sequential pairing for now)
      const pairings = [];
      for (let i = 0; i < teams.length; i += 2) {
        const propTeam = teams[i];
        const oppTeam = teams[i + 1] || null;

        const pairing = await prisma.roundPairing.create({
          data: {
            roundId,
            propTeamId: propTeam.id,
            oppTeamId: oppTeam?.id || null,
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
        pairings.push(pairing);
      }

      return NextResponse.json({ pairings }, { status: 201 });
    }

    // Create single pairing
    const pairing = await prisma.roundPairing.create({
      data: {
        roundId,
        propTeamId: propTeamId || null,
        oppTeamId: oppTeamId || null,
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

    return NextResponse.json(pairing, { status: 201 });
  } catch (error) {
    console.error('Error creating pairing:', error);
    return NextResponse.json(
      { error: 'Failed to create pairing' },
      { status: 500 }
    );
  }
}
