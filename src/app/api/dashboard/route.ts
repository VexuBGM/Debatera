import { NextResponse } from 'next/server';
import { Prisma, TournamentParticipantRole, TournamentRoundStatus, TournamentInstitutionStatus } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';
import { ensureUserInDB } from '@/lib/ensureUser';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type DashboardTournamentRole = 'ORGANIZER' | TournamentParticipantRole | 'INSTITUTION';

function getTournamentRole(
  tournament: {
    createdByUserId: string;
    tournamentParticipants: Array<{ role: TournamentParticipantRole }>;
  },
  userId: string,
): DashboardTournamentRole {
  if (tournament.createdByUserId === userId) {
    return 'ORGANIZER';
  }

  return tournament.tournamentParticipants[0]?.role ?? 'INSTITUTION';
}

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureUserInDB();

  const now = new Date();
  const nextThirtyDays = new Date(now);
  nextThirtyDays.setDate(nextThirtyDays.getDate() + 30);

  const accessibleTournamentWhere: Prisma.TournamentWhereInput = {
    OR: [
      { createdByUserId: userId },
      { tournamentParticipants: { some: { userId } } },
      { tournamentInstitutions: { some: { institution: { members: { some: { userId } } } } } },
    ],
  };

  try {
    const [
      tournamentCount,
      institutionsCount,
      liveRoundsCount,
      pendingApprovalsCount,
      upcomingTournamentsRaw,
      recentTournamentsRaw,
      recentInstitutionsRaw,
    ] = await Promise.all([
      prisma.tournament.count({
        where: accessibleTournamentWhere,
      }),
      prisma.institutionMember.count({
        where: { userId },
      }),
      prisma.tournamentRound.count({
        where: {
          tournament: accessibleTournamentWhere,
          status: {
            in: [TournamentRoundStatus.PUBLISHED, TournamentRoundStatus.IN_PROGRESS],
          },
        },
      }),
      prisma.tournamentInstitution.count({
        where: {
          status: TournamentInstitutionStatus.PENDING,
          tournament: {
            createdByUserId: userId,
          },
        },
      }),
      prisma.tournament.findMany({
        where: {
          AND: [
            accessibleTournamentWhere,
            {
              OR: [
                {
                  settings: {
                    is: {
                      registrationClosesAt: {
                        gte: now,
                        lte: nextThirtyDays,
                      },
                    },
                  },
                },
                {
                  settings: { is: null },
                  registrationClosesAt: {
                    gte: now,
                    lte: nextThirtyDays,
                  },
                },
              ],
            },
          ],
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
          createdByUserId: true,
          registrationClosesAt: true,
          settings: {
            select: {
              registrationClosesAt: true,
            },
          },
          tournamentParticipants: {
            where: {
              userId,
            },
            select: {
              role: true,
            },
            take: 1,
          },
          _count: {
            select: {
              tournamentParticipants: true,
              tournamentInstitutions: true,
              rounds: true,
            },
          },
        },
      }),
      prisma.tournament.findMany({
        where: accessibleTournamentWhere,
        orderBy: {
          createdAt: 'desc',
        },
        take: 3,
        select: {
          id: true,
          name: true,
          createdAt: true,
          createdByUserId: true,
          registrationClosesAt: true,
          settings: {
            select: {
              registrationClosesAt: true,
            },
          },
          tournamentParticipants: {
            where: {
              userId,
            },
            select: {
              role: true,
            },
            take: 1,
          },
          tournamentInstitutions: {
            where: {
              status: TournamentInstitutionStatus.PENDING,
            },
            select: {
              id: true,
            },
          },
          rounds: {
            orderBy: {
              updatedAt: 'desc',
            },
            take: 1,
            select: {
              id: true,
              name: true,
              status: true,
              updatedAt: true,
            },
          },
          _count: {
            select: {
              tournamentParticipants: true,
              tournamentInstitutions: true,
              rounds: true,
            },
          },
        },
      }),
      prisma.institutionMember.findMany({
        where: {
          userId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 3,
        select: {
          createdAt: true,
          role: true,
          institution: {
            select: {
              id: true,
              name: true,
              createdAt: true,
              _count: {
                select: {
                  members: true,
                  tournamentInstitutions: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const upcomingTournaments = upcomingTournamentsRaw
      .map((tournament) => {
        const closesAt = tournament.settings?.registrationClosesAt ?? tournament.registrationClosesAt;

        return {
          id: tournament.id,
          name: tournament.name,
          createdAt: tournament.createdAt.toISOString(),
          registrationClosesAt: closesAt?.toISOString() ?? null,
          role: getTournamentRole(tournament, userId),
          participantsCount: tournament._count.tournamentParticipants,
          institutionsCount: tournament._count.tournamentInstitutions,
          roundsCount: tournament._count.rounds,
        };
      })
      .sort((a, b) => {
        if (!a.registrationClosesAt) return 1;
        if (!b.registrationClosesAt) return -1;
        return new Date(a.registrationClosesAt).getTime() - new Date(b.registrationClosesAt).getTime();
      })
      .slice(0, 3);

    const recentTournaments = recentTournamentsRaw.map((tournament) => {
      const closesAt = tournament.settings?.registrationClosesAt ?? tournament.registrationClosesAt;
      const latestRound = tournament.rounds[0] ?? null;

      return {
        id: tournament.id,
        name: tournament.name,
        createdAt: tournament.createdAt.toISOString(),
        registrationClosesAt: closesAt?.toISOString() ?? null,
        role: getTournamentRole(tournament, userId),
        participantsCount: tournament._count.tournamentParticipants,
        institutionsCount: tournament._count.tournamentInstitutions,
        roundsCount: tournament._count.rounds,
        pendingRegistrationsCount: tournament.tournamentInstitutions.length,
        latestRound: latestRound
          ? {
              id: latestRound.id,
              name: latestRound.name,
              status: latestRound.status,
              updatedAt: latestRound.updatedAt.toISOString(),
            }
          : null,
      };
    });

    const recentInstitutions = recentInstitutionsRaw.map((membership) => ({
      id: membership.institution.id,
      name: membership.institution.name,
      createdAt: membership.institution.createdAt.toISOString(),
      joinedAt: membership.createdAt.toISOString(),
      role: membership.role,
      membersCount: membership.institution._count.members,
      tournamentRegistrationsCount: membership.institution._count.tournamentInstitutions,
    }));

    return NextResponse.json({
      stats: {
        tournamentsCount: tournamentCount,
        institutionsCount,
        upcomingTournamentsCount: upcomingTournamentsRaw.length,
      },
      summary: {
        closingSoonCount: upcomingTournamentsRaw.length,
        pendingApprovalsCount,
        liveRoundsCount,
      },
      upcomingTournaments,
      recentTournaments,
      recentInstitutions,
    });
  } catch (error) {
    console.error('Failed to load dashboard:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
