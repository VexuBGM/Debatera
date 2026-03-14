import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { isTournamentAdmin } from '@/lib/tournamentRounds';
import { parsePaginationParams, paginationToSkipTake, buildPaginationMeta } from '@/lib/pagination';

export const runtime = 'nodejs';

/**
 * GET /api/tournaments/[id]/teams
 *
 * Returns paginated teams for a tournament.
 * - Tournament admins can see all teams.
 * - Other signed-in users can only see teams for public tournaments or
 *   tournaments they participate in through their institution/membership.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const { id: tournamentId } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        isPublic: true,
        createdByUserId: true,
        tournamentParticipants: userId
          ? {
              where: { userId },
              select: { id: true },
              take: 1,
            }
          : false,
        tournamentInstitutions: userId
          ? {
              where: {
                institution: {
                  members: {
                    some: { userId },
                  },
                },
              },
              select: { institutionId: true },
              take: 1,
            }
          : false,
      },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const isAdmin = userId ? await isTournamentAdmin(tournamentId, userId) : false;
    const canView =
      tournament.isPublic ||
      isAdmin ||
      tournament.createdByUserId === userId ||
      (Array.isArray(tournament.tournamentParticipants) && tournament.tournamentParticipants.length > 0) ||
      (Array.isArray(tournament.tournamentInstitutions) && tournament.tournamentInstitutions.length > 0);

    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const pagination = parsePaginationParams(searchParams);
    const { skip, take } = paginationToSkipTake(pagination);

    const [teams, total] = await Promise.all([
      prisma.tournamentTeam.findMany({
        where: { tournamentId },
        include: {
          institution: {
            select: {
              id: true,
              name: true,
            },
          },
          members: {
            include: {
              participant: {
                include: {
                  user: {
                    select: {
                      id: true,
                      displayName: true,
                      firstName: true,
                      lastName: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: [
          { institution: { name: 'asc' } },
          { name: 'asc' },
        ],
        skip,
        take,
      }),
      prisma.tournamentTeam.count({
        where: { tournamentId },
      }),
    ]);

    return NextResponse.json(
      {
        teams,
        pagination: buildPaginationMeta(total, pagination),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error fetching tournament teams:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
