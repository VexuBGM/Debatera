import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// Check-in team or adjudicator for a round
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const { id: tournamentId } = await params;
    const body = await req.json();
    const { roundSeq, teamId, adjudicatorId, status = 'AVAILABLE' } = body;

    if (!roundSeq || typeof roundSeq !== 'number') {
      return NextResponse.json(
        { error: 'Round sequence number is required' },
        { status: 400 }
      );
    }

    if (!teamId && !adjudicatorId) {
      return NextResponse.json(
        { error: 'Either teamId or adjudicatorId is required' },
        { status: 400 }
      );
    }

    // Check tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    let result;

    if (teamId) {
      // Team check-in
      const team = await prisma.team.findFirst({
        where: {
          id: teamId,
          tournamentId,
        },
        include: {
          members: true,
        },
      });

      if (!team) {
        return NextResponse.json(
          { error: 'Team not found in this tournament' },
          { status: 404 }
        );
      }

      // Check if user is a team member or admin
      const isMember = team.members.some(m => m.userId === user!.id);
      if (!isMember && user!.appRole !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }

      result = await prisma.teamCheckIn.upsert({
        where: {
          tournamentId_teamId_roundSeq: {
            tournamentId,
            teamId,
            roundSeq,
          },
        },
        update: {
          status,
          checkedInBy: user!.id,
          checkedInAt: new Date(),
        },
        create: {
          tournamentId,
          teamId,
          roundSeq,
          status,
          checkedInBy: user!.id,
        },
        include: {
          team: true,
        },
      });
    } else if (adjudicatorId) {
      // Adjudicator check-in
      const adjudicator = await prisma.adjudicator.findFirst({
        where: {
          id: adjudicatorId,
          tournamentId,
        },
      });

      if (!adjudicator) {
        return NextResponse.json(
          { error: 'Adjudicator not found in this tournament' },
          { status: 404 }
        );
      }

      // Check if user is the adjudicator or admin
      if (adjudicator.userId !== user!.id && user!.appRole !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }

      result = await prisma.adjudicatorCheckIn.upsert({
        where: {
          tournamentId_adjudicatorId_roundSeq: {
            tournamentId,
            adjudicatorId,
            roundSeq,
          },
        },
        update: {
          status,
          checkedInBy: user!.id,
          checkedInAt: new Date(),
        },
        create: {
          tournamentId,
          adjudicatorId,
          roundSeq,
          status,
          checkedInBy: user!.id,
        },
        include: {
          adjudicator: {
            include: {
              user: true,
            },
          },
        },
      });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error processing check-in:', error);
    return NextResponse.json(
      { error: 'Failed to process check-in' },
      { status: 500 }
    );
  }
}

// Get check-in status for a round
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;
    const { searchParams } = new URL(req.url);
    const roundSeq = searchParams.get('roundSeq');

    if (!roundSeq) {
      return NextResponse.json(
        { error: 'Round sequence number is required' },
        { status: 400 }
      );
    }

    const [teamCheckIns, adjudicatorCheckIns] = await Promise.all([
      prisma.teamCheckIn.findMany({
        where: {
          tournamentId,
          roundSeq: parseInt(roundSeq),
        },
        include: {
          team: true,
        },
      }),
      prisma.adjudicatorCheckIn.findMany({
        where: {
          tournamentId,
          roundSeq: parseInt(roundSeq),
        },
        include: {
          adjudicator: {
            include: {
              user: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      teams: teamCheckIns,
      adjudicators: adjudicatorCheckIns,
    });
  } catch (error) {
    console.error('Error fetching check-ins:', error);
    return NextResponse.json(
      { error: 'Failed to fetch check-ins' },
      { status: 500 }
    );
  }
}
