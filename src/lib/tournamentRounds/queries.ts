/**
 * Tournament Round Database Queries
 *
 * Centralized data access for tournament rounds, debates, and judges.
 */

import { prisma } from '@/lib/prisma';
import { TournamentRoundStatus, TournamentParticipantRole } from '@prisma/client';

// =============================================================================
// Round Queries
// =============================================================================

/**
 * Get all rounds for a tournament.
 * If isAdmin is false, only returns non-draft rounds.
 */
export async function getRoundsForTournament(
  tournamentId: string,
  options: { includeDebates?: boolean; isAdmin?: boolean } = {}
) {
  const { includeDebates = false, isAdmin = false } = options;

  const statusFilter = isAdmin
    ? undefined // Admin sees all
    : { not: TournamentRoundStatus.DRAFT }; // Non-admin only sees published+

  return prisma.tournamentRound.findMany({
    where: {
      tournamentId,
      ...(statusFilter && { status: statusFilter }),
    },
    include: includeDebates
      ? {
          debates: {
            orderBy: { order: 'asc' },
            include: {
              propTeam: { include: { institution: true } },
              oppTeam: { include: { institution: true } },
              judges: {
                include: {
                  participant: {
                    include: { user: true, institution: true },
                  },
                },
                orderBy: { role: 'asc' }, // CHAIR first, then PANELIST
              },
            },
          },
        }
      : undefined,
    orderBy: { number: 'asc' },
  });
}

/**
 * Get a single round by ID with full debate/judge details.
 */
export async function getRoundById(roundId: string) {
  return prisma.tournamentRound.findUnique({
    where: { id: roundId },
    include: {
      tournament: {
        select: { id: true, name: true, createdByUserId: true },
      },
      debates: {
        orderBy: { order: 'asc' },
        include: {
          propTeam: { include: { institution: true } },
          oppTeam: { include: { institution: true } },
          venue: { select: { id: true, name: true, priority: true } },
          judges: {
            include: {
              participant: {
                include: { user: true, institution: true },
              },
            },
            orderBy: { role: 'asc' }, // CHAIR first, then PANELIST
          },
        },
      },
    },
  });
}

/**
 * Get the next round number for a tournament.
 */
export async function getNextRoundNumber(tournamentId: string): Promise<number> {
  const lastRound = await prisma.tournamentRound.findFirst({
    where: { tournamentId },
    orderBy: { number: 'desc' },
    select: { number: true },
  });

  return (lastRound?.number ?? 0) + 1;
}

/**
 * Create a new round for a tournament.
 * Optionally creates empty debate slots based on the number provided.
 */
export async function createRound(
  tournamentId: string,
  number: number,
  name?: string,
  emptyDebateCount?: number
) {
  const roundName = name || `Round ${number}`;

  return prisma.$transaction(async (tx) => {
    const round = await tx.tournamentRound.create({
      data: {
        tournamentId,
        number,
        name: roundName,
        status: TournamentRoundStatus.DRAFT,
      },
    });

    // Create empty debate slots if requested
    if (emptyDebateCount && emptyDebateCount > 0) {
      const debateData = Array.from({ length: emptyDebateCount }, (_, i) => ({
        roundId: round.id,
        order: i,
        propTeamId: null,
        oppTeamId: null,
        isBye: false,
      }));

      await tx.tournamentDebate.createMany({ data: debateData });
    }

    return round;
  });
}

/**
 * Update a round's name and/or status.
 */
export async function updateRound(
  roundId: string,
  data: { name?: string; status?: TournamentRoundStatus }
) {
  return prisma.tournamentRound.update({
    where: { id: roundId },
    data,
  });
}

/**
 * Delete a round and all associated debates, judges, and ballots.
 * Only DRAFT rounds can be deleted.
 */
export async function deleteRound(roundId: string) {
  return prisma.$transaction(async (tx) => {
    // Get debates for this round to cascade delete related records
    const debates = await tx.tournamentDebate.findMany({
      where: { roundId },
      select: { id: true },
    });

    const debateIds = debates.map((d) => d.id);

    if (debateIds.length > 0) {
      // Delete ballots for all debates in this round
      await tx.ballot.deleteMany({
        where: { debateId: { in: debateIds } },
      });

      // Delete debate results
      await tx.debateResult.deleteMany({
        where: { debateId: { in: debateIds } },
      });

      // Delete judge assignments
      await tx.tournamentDebateJudge.deleteMany({
        where: { debateId: { in: debateIds } },
      });

      // Delete debates
      await tx.tournamentDebate.deleteMany({
        where: { roundId },
      });
    }

    // Delete the round itself
    return tx.tournamentRound.delete({
      where: { id: roundId },
    });
  });
}

// =============================================================================
// Team & Judge Queries
// =============================================================================

/**
 * Get all registered teams for a tournament.
 */
export async function getTeamsForTournament(tournamentId: string) {
  return prisma.tournamentTeam.findMany({
    where: { tournamentId },
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
    orderBy: { name: 'asc' },
  });
}

/**
 * Get all judges (participants with JUDGE role) for a tournament.
 */
export async function getJudgesForTournament(tournamentId: string) {
  return prisma.tournamentParticipant.findMany({
    where: {
      tournamentId,
      role: TournamentParticipantRole.JUDGE,
    },
    include: {
      user: true,
      institution: true,
    },
    orderBy: [
      { institution: { name: 'asc' } },
      { user: { firstName: 'asc' } },
    ],
  });
}

// =============================================================================
// Pairings Queries
// =============================================================================

/**
 * Get pairings for a specific round (full details for the editor).
 */
export async function getPairingsForRound(roundId: string) {
  const round = await prisma.tournamentRound.findUnique({
    where: { id: roundId },
    include: {
      tournament: {
        select: { id: true, name: true, createdByUserId: true },
      },
      debates: {
        orderBy: { order: 'asc' },
        include: {
          propTeam: { include: { institution: true } },
          oppTeam: { include: { institution: true } },
          venue: { select: { id: true, name: true, priority: true } },
          teamSlots: {
            include: {
              team: { include: { institution: true } },
            },
          },
          judges: {
            include: {
              participant: {
                include: { user: true, institution: true },
              },
            },
            orderBy: { role: 'asc' }, // CHAIR first, then PANELIST
          },
        },
      },
    },
  });

  return round;
}

/**
 * Get judge assignments for a round (to check for conflicts).
 */
export async function getJudgeAssignmentsForRound(roundId: string) {
  return prisma.tournamentDebateJudge.findMany({
    where: {
      debate: { roundId },
    },
    select: {
      participantId: true,
      debateId: true,
      role: true,
    },
  });
}
