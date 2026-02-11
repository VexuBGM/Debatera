/**
 * Ballot Queries
 *
 * Database queries for fetching ballots and related data.
 */

import { prisma } from '@/lib/prisma';

/**
 * Fetch all ballots assigned to a user (as adjudicator) for a tournament.
 */
export async function getBallotsForAdjudicator(
  userId: string,
  tournamentId: string
) {
  return prisma.ballot.findMany({
    where: {
      adjudicator: {
        participant: {
          userId,
          tournamentId,
        },
      },
    },
    include: {
      adjudicator: {
        include: {
          participant: {
            include: { user: true },
          },
          debate: {
            include: {
              round: true,
              propTeam: { include: { institution: true } },
              oppTeam: { include: { institution: true } },
              venue: true,
            },
          },
        },
      },
    },
    orderBy: [
      { debate: { round: { number: 'asc' } } },
      { debate: { order: 'asc' } },
    ],
  });
}

/**
 * Fetch a single ballot with full context for the entry page.
 */
export async function getBallotWithContext(ballotId: string) {
  return prisma.ballot.findUnique({
    where: { id: ballotId },
    include: {
      speeches: {
        orderBy: { role: 'asc' },
        include: {
          speaker: {
            include: {
              participant: {
                include: { user: true },
              },
            },
          },
        },
      },
      adjudicator: {
        include: {
          participant: {
            include: { user: true },
          },
          debate: {
            include: {
              round: {
                include: { tournament: true },
              },
              propTeam: {
                include: {
                  institution: true,
                  members: {
                    include: {
                      participant: {
                        include: { user: true },
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
                        include: { user: true },
                      },
                    },
                  },
                },
              },
              venue: true,
              judges: {
                include: {
                  participant: {
                    include: { user: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
}

/**
 * Fetch all ballots for a debate (for result computation).
 */
export async function getBallotsForDebate(debateId: string) {
  return prisma.ballot.findMany({
    where: { debateId },
    include: {
      speeches: true,
      adjudicator: {
        include: {
          participant: {
            include: { user: true },
          },
        },
      },
    },
  });
}
