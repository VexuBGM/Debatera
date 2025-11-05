import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { isCoach, getUserInstitutionId, canModifyRoster } from '@/lib/tournament-validation';

export const runtime = 'nodejs';

const CreateTeamSchema = z.object({
  institutionId: z.string().min(1, 'Institution ID is required'),
});

/**
 * POST /api/tournaments/[id]/teams
 * Create a new team for an institution within a tournament
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: tournamentId } = await params;
    const json = await req.json();
    const parsed = CreateTeamSchema.parse(json);

    // Check if tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Check roster freeze
    const modifyCheck = await canModifyRoster(userId, tournamentId);
    if (!modifyCheck.allowed) {
      return NextResponse.json({ error: modifyCheck.reason }, { status: 423 });
    }

    // Check if user is a coach of the institution
    const isUserCoach = await isCoach(userId, parsed.institutionId);
    if (!isUserCoach) {
      return NextResponse.json(
        { error: 'Only coaches can create teams for their institution' },
        { status: 403 }
      );
    }

    // Get the next team number for this institution in this tournament
    const existingTeams = await prisma.tournamentTeam.findMany({
      where: {
        tournamentId,
        institutionId: parsed.institutionId,
      },
      orderBy: {
        teamNumber: 'desc',
      },
      take: 1,
    });

    const nextTeamNumber = existingTeams.length > 0 ? existingTeams[0].teamNumber + 1 : 1;

    // Get institution name for team name
    const institution = await prisma.institution.findUnique({
      where: { id: parsed.institutionId },
      select: { name: true },
    });

    if (!institution) {
      return NextResponse.json({ error: 'Institution not found' }, { status: 404 });
    }

    const teamName = `${institution.name} ${nextTeamNumber}`;

    // Create team
    const team = await prisma.tournamentTeam.create({
      data: {
        name: teamName,
        tournamentId,
        institutionId: parsed.institutionId,
        teamNumber: nextTeamNumber,
      },
      include: {
        institution: {
          select: {
            id: true,
            name: true,
          },
        },
        tournament: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(team, { status: 201 });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * GET /api/tournaments/[id]/teams
 * List all teams in a tournament (optionally filter by institution)
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;
    const { searchParams } = new URL(req.url);
    const institutionId = searchParams.get('institutionId');

    const where: any = { tournamentId };
    if (institutionId) {
      where.institutionId = institutionId;
    }

    const teams = await prisma.tournamentTeam.findMany({
      where,
      include: {
        institution: {
          select: {
            id: true,
            name: true,
          },
        },
        participations: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                imageUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            participations: true,
          },
        },
      },
      orderBy: [
        { institutionId: 'asc' },
        { teamNumber: 'asc' },
      ],
    });

    return NextResponse.json(teams, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
