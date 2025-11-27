import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import {
  isCoach,
  getUserInstitutionId,
  isUserInInstitution,
  isUserInTournament,
  canModifyRoster,
  isInstitutionRegisteredForTournament,
  isInstitutionRegistrationApproved,
} from '@/lib/tournament-validation';
import { RoleType } from '@prisma/client';

export const runtime = 'nodejs';

const RegisterUsersSchema = z.object({
  registrations: z.array(z.object({
    userId: z.string().min(1, 'User ID is required'),
    role: z.nativeEnum(RoleType),
    teamId: z.string().optional().nullable(),
  })),
});

/**
 * POST /api/tournaments/[id]/register
 * Register multiple users to a tournament (coaches only)
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
    const { id: tournamentId } = await params;
    const json = await req.json();
    const parsed = RegisterUsersSchema.parse(json);

    // Check if tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Check roster freeze
    const modifyCheck = await canModifyRoster(currentUserId, tournamentId);
    if (!modifyCheck.allowed) {
      return NextResponse.json({ error: modifyCheck.reason }, { status: 423 });
    }

    // Get current user's institution
    const institutionId = await getUserInstitutionId(currentUserId);
    if (!institutionId) {
      return NextResponse.json(
        { error: 'You must be a member of an institution' },
        { status: 400 }
      );
    }

    // Check if current user is a coach
    const isUserCoach = await isCoach(currentUserId, institutionId);
    if (!isUserCoach) {
      return NextResponse.json(
        { error: 'Only coaches can register users' },
        { status: 403 }
      );
    }

    // Check if institution is registered for the tournament
    const institutionRegistered = await isInstitutionRegisteredForTournament(
      institutionId,
      tournamentId
    );

    if (!institutionRegistered) {
      return NextResponse.json(
        { error: 'Your institution must be registered for this tournament first' },
        { status: 403 }
      );
    }

    // Check if institution registration is approved
    const institutionApproved = await isInstitutionRegistrationApproved(
      institutionId,
      tournamentId
    );

    if (!institutionApproved) {
      return NextResponse.json(
        { error: 'Your institution registration is pending approval. Please wait for tournament owner to approve.' },
        { status: 403 }
      );
    }

    // Validate all users before creating any participations
    const errors: { userId: string; error: string }[] = [];
    const validRegistrations: typeof parsed.registrations = [];

    for (const registration of parsed.registrations) {
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: registration.userId },
      });

      if (!user) {
        errors.push({ userId: registration.userId, error: 'User not found' });
        continue;
      }

      // Check if user belongs to the institution
      const userInInstitution = await isUserInInstitution(registration.userId, institutionId);
      if (!userInInstitution) {
        errors.push({
          userId: registration.userId,
          error: 'User must be a member of your institution',
        });
        continue;
      }

      // Check single appearance rule
      const alreadyInTournament = await isUserInTournament(registration.userId, tournamentId);
      if (alreadyInTournament) {
        errors.push({
          userId: registration.userId,
          error: 'User is already registered in this tournament',
        });
        continue;
      }

      // If teamId is provided, validate it
      if (registration.teamId) {
        const team = await prisma.tournamentTeam.findUnique({
          where: { id: registration.teamId },
        });

        if (!team) {
          errors.push({
            userId: registration.userId,
            error: 'Team not found',
          });
          continue;
        }

        if (team.tournamentId !== tournamentId) {
          errors.push({
            userId: registration.userId,
            error: 'Team does not belong to this tournament',
          });
          continue;
        }

        if (team.institutionId !== institutionId) {
          errors.push({
            userId: registration.userId,
            error: 'Team does not belong to your institution',
          });
          continue;
        }
      }

      validRegistrations.push(registration);
    }

    // Determine initial status based on tournament registration type
    const initialStatus = tournament.registrationType === 'OPEN' ? 'APPROVED' : 'PENDING';
    const approvalData = tournament.registrationType === 'OPEN' 
      ? { approvedAt: new Date(), approvedById: tournament.ownerId }
      : {};

    // Create all valid participations
    const created = await Promise.all(
      validRegistrations.map((registration) =>
        prisma.tournamentParticipation.create({
          data: {
            userId: registration.userId,
            tournamentId,
            teamId: registration.teamId,
            institutionId: institutionId,
            role: registration.role,
            status: initialStatus,
            ...approvalData,
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
        })
      )
    );

    return NextResponse.json(
      {
        success: created.length,
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        participations: created,
      },
      { status: created.length > 0 ? 201 : 400 }
    );
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
