import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { isCoach, canModifyRoster } from '@/lib/tournament-validation';

export const runtime = 'nodejs';

/**
 * DELETE /api/tournament-teams/[id]
 * Delete a team and recalibrate team numbers
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: teamId } = await params;

    // Get the team to delete
    const team = await prisma.tournamentTeam.findUnique({
      where: { id: teamId },
      include: {
        institution: true,
        tournament: true,
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if user is a coach of the institution
    const isUserCoach = await isCoach(userId, team.institutionId);
    if (!isUserCoach) {
      return NextResponse.json(
        { error: 'Only coaches can delete teams for their institution' },
        { status: 403 }
      );
    }

    // Check roster freeze
    const modifyCheck = await canModifyRoster(userId, team.tournamentId);
    if (!modifyCheck.allowed) {
      return NextResponse.json({ error: modifyCheck.reason }, { status: 423 });
    }

    // Delete the team (this will cascade delete participations due to onDelete: Cascade)
    await prisma.tournamentTeam.delete({
      where: { id: teamId },
    });

    // Recalibrate team numbers for remaining teams of the same institution
    const remainingTeams = await prisma.tournamentTeam.findMany({
      where: {
        tournamentId: team.tournamentId,
        institutionId: team.institutionId,
      },
      orderBy: {
        teamNumber: 'asc',
      },
    });

    // Update team numbers and names sequentially
    for (let i = 0; i < remainingTeams.length; i++) {
      const expectedNumber = i + 1;
      if (remainingTeams[i].teamNumber !== expectedNumber) {
        await prisma.tournamentTeam.update({
          where: { id: remainingTeams[i].id },
          data: {
            teamNumber: expectedNumber,
            name: `${team.institution.name} ${expectedNumber}`,
          },
        });
      }
    }

    return NextResponse.json(
      { message: 'Team deleted successfully' },
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
