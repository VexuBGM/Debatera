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
 */
export async function createRound(
  tournamentId: string,
  number: number,
  name?: string
) {
  const roundName = name || `Round ${number}`;

  return prisma.tournamentRound.create({
    data: {
      tournamentId,
      number,
      name: roundName,
      status: TournamentRoundStatus.DRAFT,
    },
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
      { user: { username: 'asc' } },
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
          judges: {
            include: {
              participant: {
                include: { user: true, institution: true },
              },
            },
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
    },
  });
}
