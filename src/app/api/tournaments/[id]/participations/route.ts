import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

/**
 * GET /api/tournaments/[id]/participations
 * List all participants (debaters and judges) in a tournament
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role'); // Optional filter by role

    const where: any = { tournamentId };
    if (role && (role === 'DEBATER' || role === 'JUDGE')) {
      where.role = role;
    }

    const participations = await prisma.tournamentParticipation.findMany({
      where,
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
            institutionId: true,
            institution: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        institution: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    // Group by role for easier consumption
    const grouped = {
      debaters: participations.filter((p) => p.role === 'DEBATER'),
      judges: participations.filter((p) => p.role === 'JUDGE'),
      total: participations.length,
    };

    return NextResponse.json(grouped, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * DELETE /api/tournaments/[id]/participations
 * Unregister users from a tournament (coaches only)
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
    const { userIds } = await req.json();

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'userIds must be a non-empty array' }, { status: 400 });
    }

    // Check if tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Check roster freeze
    const now = new Date();
    const canModify = !tournament.rosterFreezeAt || new Date(tournament.rosterFreezeAt) > now;
    
    if (!canModify) {
      return NextResponse.json(
        { error: 'Tournament roster is frozen' },
        { status: 423 }
      );
    }

    // Get current user's institution
    const userMembership = await prisma.institutionMember.findFirst({
      where: { userId: currentUserId },
      select: { institutionId: true, isCoach: true },
    });

    if (!userMembership) {
      return NextResponse.json(
        { error: 'You must be a member of an institution' },
        { status: 400 }
      );
    }

    if (!userMembership.isCoach) {
      return NextResponse.json(
        { error: 'Only coaches can unregister users' },
        { status: 403 }
      );
    }

    // Verify all users belong to the coach's institution
    const usersToUnregister = await prisma.institutionMember.findMany({
      where: {
        userId: { in: userIds },
        institutionId: userMembership.institutionId,
      },
      select: { userId: true },
    });

    const validUserIds = usersToUnregister.map(u => u.userId);
    const invalidUserIds = userIds.filter(id => !validUserIds.includes(id));

    if (invalidUserIds.length > 0) {
      return NextResponse.json(
        { error: 'Some users do not belong to your institution' },
        { status: 403 }
      );
    }

    // Delete participations
    const result = await prisma.tournamentParticipation.deleteMany({
      where: {
        tournamentId,
        userId: { in: validUserIds },
      },
    });

    return NextResponse.json(
      {
        success: result.count,
        message: `Successfully unregistered ${result.count} user(s)`,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
