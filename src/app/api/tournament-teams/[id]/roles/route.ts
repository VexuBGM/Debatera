import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import {
  isCoach,
  getTeamDebaterCount,
  canModifyRoster,
} from '@/lib/tournament-validation';
import { RoleType } from '@prisma/client';

export const runtime = 'nodejs';

const UpdateRoleSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.nativeEnum(RoleType),
});

/**
 * POST /api/tournament-teams/[id]/roles
 * Change a user's role in a tournament team
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: currentUserId } = await auth();
  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: teamId } = await params;
    const json = await req.json();
    const parsed = UpdateRoleSchema.parse(json);

    // Check if team exists
    const team = await prisma.tournamentTeam.findUnique({
      where: { id: teamId },
      include: {
        institution: true,
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check roster freeze
    const modifyCheck = await canModifyRoster(currentUserId, team.tournamentId);
    if (!modifyCheck.allowed) {
      return NextResponse.json({ error: modifyCheck.reason }, { status: 423 });
    }

    // Check if current user is a coach of the institution
    const isUserCoach = await isCoach(currentUserId, team.institutionId);
    if (!isUserCoach) {
      return NextResponse.json(
        { error: 'Only coaches can change roles' },
        { status: 403 }
      );
    }

    // Check if user is in this team
    const participation = await prisma.tournamentParticipation.findUnique({
      where: {
        userId_tournamentId: {
          userId: parsed.userId,
          tournamentId: team.tournamentId,
        },
      },
    });

    if (!participation) {
      return NextResponse.json(
        { error: 'User is not in this tournament' },
        { status: 404 }
      );
    }

    if (participation.teamId !== teamId) {
      return NextResponse.json(
        { error: 'User is not in this team' },
        { status: 400 }
      );
    }

    // If changing to DEBATER, check team size limit
    if (parsed.role === RoleType.DEBATER && participation.role !== RoleType.DEBATER) {
      const debaterCount = await getTeamDebaterCount(teamId);
      if (debaterCount >= 5) {
        return NextResponse.json(
          { error: 'Team has reached maximum size (5 debaters)' },
          { status: 400 }
        );
      }
    }

    // If changing from DEBATER to JUDGE, check minimum team size
    if (parsed.role === RoleType.JUDGE && participation.role === RoleType.DEBATER) {
      const debaterCount = await getTeamDebaterCount(teamId);
      if (debaterCount <= 3) {
        return NextResponse.json(
          { error: 'Team must have at least 3 debaters' },
          { status: 400 }
        );
      }
    }

    // Update role
    const updated = await prisma.tournamentParticipation.update({
      where: {
        userId_tournamentId: {
          userId: parsed.userId,
          tournamentId: team.tournamentId,
        },
      },
      data: {
        role: parsed.role,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            imageUrl: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
