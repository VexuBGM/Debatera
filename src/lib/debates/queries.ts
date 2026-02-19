/**
 * Debate Queries
 *
 * Database queries for fetching debates relevant to a debater.
 */

import { prisma } from '@/lib/prisma';
import { TournamentRoundStatus } from '@prisma/client';

/**
 * Fetch all debates a user participates in (as a debater on a team)
 * for a given tournament, ordered by round number then debate order.
 */
export async function getDebatesForDebater(
  userId: string,
  tournamentId: string
) {
  return prisma.tournamentDebate.findMany({
    where: {
      round: {
        tournamentId,
        status: {
          in: [
            TournamentRoundStatus.PUBLISHED,
            TournamentRoundStatus.IN_PROGRESS,
            TournamentRoundStatus.COMPLETED,
          ],
        },
      },
      OR: [
        { propTeam: { members: { some: { participant: { userId } } } } },
        { oppTeam: { members: { some: { participant: { userId } } } } },
      ],
    },
    include: {
      round: true,
      propTeam: {
        include: {
          institution: true,
          members: {
            include: {
              participant: {
                include: { user: true, person: true },
              },
            },
          },
        },
      },
      oppTeam: {
        include: {
          institution: true,
          members: {
            include: {
              participant: {
                include: { user: true, person: true },
              },
            },
          },
        },
      },
      venue: true,
      judges: {
        include: {
          participant: {
            include: { user: true, person: true },
          },
        },
        orderBy: { role: 'asc' }, // CHAIR first, then PANELIST
      },
      result: {
        include: { winningTeam: true },
      },
    },
    orderBy: [
      { round: { number: 'asc' } },
      { order: 'asc' },
    ],
  });
}
