import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

/**
 * GET /api/tournaments/[id]/institutions
 * Get all institutions registered for a tournament
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

    // Check if tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Get all registered institutions
    const registrations = await prisma.tournamentInstitutionRegistration.findMany({
      where: {
        tournamentId,
      },
      include: {
        institution: {
          select: {
            id: true,
            name: true,
            description: true,
            _count: {
              select: {
                members: true,
                teams: {
                  where: {
                    tournamentId,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        registeredAt: 'asc',
      },
    });

    return NextResponse.json(registrations, { status: 200 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
