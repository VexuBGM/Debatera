import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import {
  isCoach,
  getUserInstitutionId,
  canModifyRoster,
  isInstitutionRegisteredForTournament,
} from '@/lib/tournament-validation';

export const runtime = 'nodejs';

/**
 * POST /api/tournaments/[id]/register-institution
 * Register an institution for a tournament (coaches only)
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

    // Check if tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Check roster freeze - block registration if frozen
    const modifyCheck = await canModifyRoster(currentUserId, tournamentId);
    if (!modifyCheck.allowed) {
      return NextResponse.json(
        { error: 'Registration is closed. Tournament roster is frozen.' },
        { status: 423 }
      );
    }

    // Get current user's institution
    const institutionId = await getUserInstitutionId(currentUserId);
    if (!institutionId) {
      return NextResponse.json(
        { error: 'You must be a member of an institution to register' },
        { status: 400 }
      );
    }

    // Check if current user is a coach
    const isUserCoach = await isCoach(currentUserId, institutionId);
    if (!isUserCoach) {
      return NextResponse.json(
        { error: 'Only coaches can register institutions for tournaments' },
        { status: 403 }
      );
    }

    // Check if institution is already registered
    const alreadyRegistered = await isInstitutionRegisteredForTournament(
      institutionId,
      tournamentId
    );

    if (alreadyRegistered) {
      return NextResponse.json(
        { error: 'Institution is already registered for this tournament' },
        { status: 409 }
      );
    }

    // Determine initial status based on tournament registration type
    const initialStatus = tournament.registrationType === 'OPEN' ? 'APPROVED' : 'PENDING';
    const approvalData = tournament.registrationType === 'OPEN' 
      ? { approvedAt: new Date(), approvedById: tournament.ownerId }
      : {};

    // Create the registration
    const registration = await prisma.tournamentInstitutionRegistration.create({
      data: {
        tournamentId,
        institutionId,
        registeredById: currentUserId,
        status: initialStatus,
        ...approvalData,
      },
      include: {
        institution: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        tournament: {
          select: {
            id: true,
            name: true,
            registrationType: true,
          },
        },
      },
    });

    return NextResponse.json({
      ...registration,
      message: tournament.registrationType === 'OPEN' 
        ? 'Institution registered successfully'
        : 'Registration submitted for approval. You will be notified once it is approved.',
    }, { status: 201 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * DELETE /api/tournaments/[id]/register-institution
 * Unregister an institution from a tournament (coaches only)
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: currentUserId } = await auth();
  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: tournamentId } = await params;

    // Check if tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Check roster freeze - block unregistration if frozen
    const modifyCheck = await canModifyRoster(currentUserId, tournamentId);
    if (!modifyCheck.allowed) {
      return NextResponse.json(
        { error: 'Cannot unregister. Tournament roster is frozen.' },
        { status: 423 }
      );
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
        { error: 'Only coaches can unregister institutions from tournaments' },
        { status: 403 }
      );
    }

    // Check if institution is registered
    const registration = await prisma.tournamentInstitutionRegistration.findUnique({
      where: {
        tournamentId_institutionId: {
          tournamentId,
          institutionId,
        },
      },
    });

    if (!registration) {
      return NextResponse.json(
        { error: 'Institution is not registered for this tournament' },
        { status: 404 }
      );
    }

    // Get counts for response
    const teamsCount = await prisma.tournamentTeam.count({
      where: {
        tournamentId,
        institutionId,
      },
    });

    // Get user IDs from institution members to delete their participations
    const institutionMembers = await prisma.institutionMember.findMany({
      where: {
        institutionId,
      },
      select: {
        userId: true,
      },
    });

    const userIds = institutionMembers.map((member) => member.userId);

    // Count participations that will be deleted
    const participationsCount = await prisma.tournamentParticipation.count({
      where: {
        tournamentId,
        userId: {
          in: userIds,
        },
      },
    });

    // Perform cascading deletion in a transaction
    await prisma.$transaction([
      // 1. Delete all tournament teams from this institution
      prisma.tournamentTeam.deleteMany({
        where: {
          tournamentId,
          institutionId,
        },
      }),
      // 2. Delete all participations from institution members
      // Note: Team participations are automatically nullified due to onDelete: SetNull
      prisma.tournamentParticipation.deleteMany({
        where: {
          tournamentId,
          userId: {
            in: userIds,
          },
        },
      }),
      // 3. Delete the institution registration
      prisma.tournamentInstitutionRegistration.delete({
        where: {
          id: registration.id,
        },
      }),
    ]);

    return NextResponse.json(
      {
        message: 'Institution successfully unregistered from tournament',
        deleted: {
          teams: teamsCount,
          participations: participationsCount,
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
