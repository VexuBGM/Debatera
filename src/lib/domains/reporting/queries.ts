/**
 * Tournament Standings Queries
 *
 * Prisma queries for fetching data needed to compute tournament standings.
 * Hard rule: only this file talks to Prisma within the reporting domain.
 */

import { prisma } from '@/lib/prisma';

// ============================================================================
// Fetch tournament teams
// ============================================================================

/**
 * Fetch every team registered in the tournament, with institution name and members.
 */
export async function fetchTournamentTeams(tournamentId: string) {
  return prisma.tournamentTeam.findMany({
    where: { tournamentId },
    select: {
      id: true,
      name: true,
      institution: {
        select: { name: true },
      },
      members: {
        select: {
          participant: {
            select: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  displayName: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  });
}

// ============================================================================
// Fetch debates with official results
// ============================================================================

/**
 * Fetch all debates in the tournament that have an official DebateResult.
 * Includes the result row and side team IDs so the computation layer
 * can attribute wins/points without extra queries.
 */
export async function fetchDebatesWithResults(tournamentId: string) {
  return prisma.tournamentDebate.findMany({
    where: {
      round: { tournamentId },
      result: { isNot: null },
    },
    select: {
      id: true,
      propTeamId: true,
      oppTeamId: true,
      isBye: true,
      result: {
        select: {
          winningSide: true,
          winningTeamId: true,
          propTotalAvg: true,
          oppTotalAvg: true,
        },
      },
    },
  });
}

// ============================================================================
// Auth-related lookups (used by policy)
// ============================================================================

/** Check if userid is the tournament creator */
export async function isTournamentCreator(
  userId: string,
  tournamentId: string
): Promise<boolean> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { createdByUserId: true },
  });
  return tournament?.createdByUserId === userId;
}

/** Check if user is a participant (debater or judge) in the tournament */
export async function isTournamentParticipant(
  userId: string,
  tournamentId: string
): Promise<boolean> {
  const participant = await prisma.tournamentParticipant.findUnique({
    where: { tournamentId_userId: { tournamentId, userId } },
    select: { id: true },
  });
  return participant !== null;
}

/** Check if user belongs to an institution that is approved in the tournament */
export async function isApprovedInstitutionMember(
  userId: string,
  tournamentId: string
): Promise<boolean> {
  const membership = await prisma.institutionMember.findFirst({
    where: {
      userId,
      institution: {
        tournamentInstitutions: {
          some: {
            tournamentId,
            status: 'APPROVED',
          },
        },
      },
    },
    select: { id: true },
  });
  return membership !== null;
}
