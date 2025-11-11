import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import {
  isCoach,
  isUserInInstitution,
  isUserInTournament,
  getTeamDebaterCount,
  canModifyRoster,
} from '@/lib/tournament-validation';
import { RoleType } from '@prisma/client';

export const runtime = 'nodejs';

const AddMemberSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.nativeEnum(RoleType),
});

/**
 * POST /api/tournament-teams/[id]/members
 * Add a member to a tournament team
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
    const parsed = AddMemberSchema.parse(json);

    // Check if team exists
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

    // Check roster freeze
    const modifyCheck = await canModifyRoster(currentUserId, team.tournamentId);
    if (!modifyCheck.allowed) {
      return NextResponse.json({ error: modifyCheck.reason }, { status: 423 });
    }

    // Check if current user is a coach of the institution
    const isUserCoach = await isCoach(currentUserId, team.institutionId);
    if (!isUserCoach) {
      return NextResponse.json(
        { error: 'Only coaches can add members to teams' },
        { status: 403 }
      );
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: parsed.userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user belongs to the institution
    const userInInstitution = await isUserInInstitution(parsed.userId, team.institutionId);
    if (!userInInstitution) {
      return NextResponse.json(
        { error: 'User must be a member of the institution' },
        { status: 400 }
      );
    }

    // Check single appearance rule
    const alreadyInTournament = await isUserInTournament(parsed.userId, team.tournamentId);
    if (alreadyInTournament) {
      return NextResponse.json(
        { error: 'User is already participating in this tournament' },
        { status: 409 }
      );
    }

    // Add member to team
    const participation = await prisma.tournamentParticipation.create({
      data: {
        userId: parsed.userId,
        tournamentId: team.tournamentId,
        teamId: teamId,
        institutionId: team.institutionId,
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

    return NextResponse.json(participation, { status: 201 });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    if (err.code === 'P2002') {
      return NextResponse.json(
        { error: 'User is already in this tournament' },
        { status: 409 }
      );
    }
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * GET /api/tournament-teams/[id]/members
 * List all members of a tournament team
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params;

    const members = await prisma.tournamentParticipation.findMany({
      where: { teamId },
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
      orderBy: [
        { role: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    return NextResponse.json(members, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
