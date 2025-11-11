import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { canModifyRoster } from '@/lib/tournament-validation';

export const runtime = 'nodejs';

const TeamAssignmentSchema = z.object({
  assignments: z.array(
    z.object({
      participationId: z.string(),
      teamId: z.string().nullable(),
    })
  ),
});

/**
 * PUT /api/tournaments/[id]/team-assignments
 * Update team assignments for multiple debaters at once
 */
export async function PUT(
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
    const parsed = TeamAssignmentSchema.parse(json);

    // Check if tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Check roster freeze - only tournament owner can modify after freeze
    const modifyCheck = await canModifyRoster(userId, tournamentId);
    if (!modifyCheck.allowed) {
      return NextResponse.json({ error: modifyCheck.reason }, { status: 423 });
    }

    // Validate that all participations exist and belong to this tournament
    const participationIds = parsed.assignments.map((a) => a.participationId);
    const participations = await prisma.tournamentParticipation.findMany({
      where: {
        id: { in: participationIds },
        tournamentId,
        role: 'DEBATER', // Only debaters can be assigned to teams
      },
      include: {
        team: true,
      },
    });

    if (participations.length !== participationIds.length) {
      return NextResponse.json(
        { error: 'Some participations are invalid or not debaters' },
        { status: 400 }
      );
    }

    // Validate that all team IDs exist and belong to this tournament
    const teamIds = parsed.assignments
      .map((a) => a.teamId)
      .filter((id): id is string => id !== null);

    if (teamIds.length > 0) {
      const teams = await prisma.tournamentTeam.findMany({
        where: {
          id: { in: teamIds },
          tournamentId,
        },
      });

      if (teams.length !== new Set(teamIds).size) {
        return NextResponse.json(
          { error: 'Some teams are invalid' },
          { status: 400 }
        );
      }
    }

    // Update all assignments in a transaction
    await prisma.$transaction(
      parsed.assignments.map((assignment) =>
        prisma.tournamentParticipation.update({
          where: { id: assignment.participationId },
          data: { teamId: assignment.teamId },
        })
      )
    );

    // Fetch updated participations to validate team sizes
    const updatedParticipations = await prisma.tournamentParticipation.groupBy({
      by: ['teamId'],
      where: {
        tournamentId,
        teamId: { not: null },
        role: 'DEBATER',
      },
      _count: true,
    });

    // Check if any team has invalid size (must be 2-5 debaters)
    const invalidTeams = updatedParticipations.filter(
      (group) => group._count < 2 || group._count > 5
    );

    if (invalidTeams.length > 0) {
      // Get team names for error message
      const invalidTeamIds = invalidTeams.map((t) => t.teamId).filter((id): id is string => id !== null);
      const teams = await prisma.tournamentTeam.findMany({
        where: { id: { in: invalidTeamIds } },
        select: { id: true, name: true },
      });

      const teamInfo = invalidTeams.map((group) => {
        const team = teams.find((t) => t.id === group.teamId);
        return `${team?.name || 'Unknown'} (${group._count} debaters)`;
      });

      return NextResponse.json(
        {
          warning: 'Some teams have invalid sizes. Teams must have 2-5 debaters.',
          invalidTeams: teamInfo,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { message: 'Team assignments updated successfully' },
      { status: 200 }
    );
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
