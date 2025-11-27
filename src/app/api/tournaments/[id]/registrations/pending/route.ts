import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

/**
 * GET /api/tournaments/[id]/registrations/pending
 * Get all pending registrations (institution and participant) for a tournament
 * Only tournament owner can access this
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: currentUserId } = await auth();
  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: tournamentId } = await params;

    // Check if tournament exists and user is the owner
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    if (tournament.ownerId !== currentUserId) {
      return NextResponse.json(
        { error: 'Only tournament owner can view pending registrations' },
        { status: 403 }
      );
    }

    // Get pending institution registrations
    const pendingInstitutions = await prisma.tournamentInstitutionRegistration.findMany({
      where: {
        tournamentId,
        status: 'PENDING',
      },
      include: {
        institution: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: {
        registeredAt: 'asc',
      },
    });

    // Get pending participant registrations
    const pendingParticipants = await prisma.tournamentParticipation.findMany({
      where: {
        tournamentId,
        status: 'PENDING',
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
        institution: {
          select: {
            id: true,
            name: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json({
      institutions: pendingInstitutions,
      participants: pendingParticipants,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
