/**
 * MVP Services - Clean, minimal service layer for the Debatera MVP
 * 
 * This module provides all the business logic for:
 * - Institutions (create, join, list members)
 * - Tournaments (create, register, list)
 * - Rounds/Matches (generate pairings, create rooms)
 */

import { prisma } from '@/lib/prisma';
import { InstitutionRole, TournamentStatus, RegistrationStatus } from '@prisma/client';

// ============================================================================
// INSTITUTION SERVICES
// ============================================================================

export async function createInstitution(name: string, userId: string) {
  // Create institution and make the user an ADMIN
  const institution = await prisma.institution.create({
    data: {
      name,
      members: {
        create: {
          userId,
          role: InstitutionRole.ADMIN,
        },
      },
    },
    include: {
      members: {
        include: { user: true },
      },
    },
  });
  return institution;
}

export async function listInstitutions() {
  return prisma.institution.findMany({
    include: {
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getInstitution(institutionId: string) {
  return prisma.institution.findUnique({
    where: { id: institutionId },
    include: {
      members: {
        include: { user: true },
        orderBy: { createdAt: 'asc' },
      },
      registrations: {
        select: { id: true },
      },
    },
  });
}

export async function addMemberToInstitution(
  institutionId: string,
  userId: string,
  role: InstitutionRole = InstitutionRole.MEMBER
) {
  return prisma.institutionMember.create({
    data: {
      institutionId,
      userId,
      role,
    },
    include: { user: true, institution: true },
  });
}

export async function getUserInstitutions(userId: string) {
  return prisma.institutionMember.findMany({
    where: { userId },
    include: {
      institution: {
        include: { _count: { select: { members: true } } },
      },
    },
  });
}

export async function isInstitutionAdmin(userId: string, institutionId: string): Promise<boolean> {
  const member = await prisma.institutionMember.findUnique({
    where: {
      institutionId_userId: { institutionId, userId },
    },
  });
  return member?.role === InstitutionRole.ADMIN;
}

// ============================================================================
// TOURNAMENT SERVICES
// ============================================================================

export async function createTournament(name: string, userId: string) {
  return prisma.tournament.create({
    data: {
      name,
      status: TournamentStatus.DRAFT,
      createdByUserId: userId,
    },
  });
}

export async function listTournaments() {
  return prisma.tournament.findMany({
    include: {
      createdBy: true,
      _count: { select: { registrations: true, rounds: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getTournament(tournamentId: string) {
  return prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      createdBy: true,
      registrations: {
        include: { institution: true },
        orderBy: { createdAt: 'asc' },
      },
      rounds: {
        include: {
          matches: {
            include: {
              affRegistration: { include: { institution: true } },
              negRegistration: { include: { institution: true } },
              room: true,
            },
          },
        },
        orderBy: { number: 'asc' },
      },
    },
  });
}

export async function publishTournament(tournamentId: string) {
  return prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: TournamentStatus.PUBLISHED },
  });
}

export async function isTournamentOwner(userId: string, tournamentId: string): Promise<boolean> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { createdByUserId: true },
  });
  return tournament?.createdByUserId === userId;
}

// ============================================================================
// REGISTRATION SERVICES
// ============================================================================

export async function registerInstitution(tournamentId: string, institutionId: string) {
  // Auto-approve for MVP
  return prisma.tournamentRegistration.create({
    data: {
      tournamentId,
      institutionId,
      status: RegistrationStatus.APPROVED,
    },
    include: { institution: true, tournament: true },
  });
}

export async function unregisterInstitution(tournamentId: string, institutionId: string) {
  return prisma.tournamentRegistration.delete({
    where: {
      tournamentId_institutionId: { tournamentId, institutionId },
    },
  });
}

export async function getRegistration(tournamentId: string, institutionId: string) {
  return prisma.tournamentRegistration.findUnique({
    where: {
      tournamentId_institutionId: { tournamentId, institutionId },
    },
    include: { institution: true },
  });
}

export async function getTournamentRegistrations(tournamentId: string) {
  return prisma.tournamentRegistration.findMany({
    where: { tournamentId, status: RegistrationStatus.APPROVED },
    include: { institution: true },
    orderBy: { createdAt: 'asc' },
  });
}

// ============================================================================
// ROUND & PAIRING SERVICES
// ============================================================================

/**
 * Generate Round 1 pairings using a simple random algorithm.
 * - Shuffle all approved registrations
 * - Pair sequentially (1 vs 2, 3 vs 4, etc.)
 * - If odd number, the last one gets a BYE (negRegistration = null)
 * - Create a Room for each match
 */
export async function generateRound(tournamentId: string, roundNumber: number = 1) {
  // Check if round already exists
  const existingRound = await prisma.round.findUnique({
    where: { tournamentId_number: { tournamentId, number: roundNumber } },
  });
  if (existingRound) {
    throw new Error(`Round ${roundNumber} already exists`);
  }

  // Get all approved registrations
  const registrations = await prisma.tournamentRegistration.findMany({
    where: { tournamentId, status: RegistrationStatus.APPROVED },
  });

  if (registrations.length < 2) {
    throw new Error('Need at least 2 registered institutions to generate pairings');
  }

  // Shuffle registrations (Fisher-Yates)
  const shuffled = [...registrations];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Create the round
  const round = await prisma.round.create({
    data: {
      tournamentId,
      number: roundNumber,
    },
  });

  // Create matches
  const matches = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    const affReg = shuffled[i];
    const negReg = shuffled[i + 1] || null; // BYE if odd

    const match = await prisma.match.create({
      data: {
        roundId: round.id,
        affRegistrationId: affReg.id,
        negRegistrationId: negReg?.id || null,
      },
    });

    // Create room for this match (generate a unique streamCallId)
    const streamCallId = `debate-${match.id}-${Date.now()}`;
    await prisma.room.create({
      data: {
        matchId: match.id,
        streamCallId,
      },
    });

    matches.push(match);
  }

  // Return the round with all matches
  return prisma.round.findUnique({
    where: { id: round.id },
    include: {
      matches: {
        include: {
          affRegistration: { include: { institution: true } },
          negRegistration: { include: { institution: true } },
          room: true,
        },
      },
    },
  });
}

export async function getRound(tournamentId: string, roundNumber: number) {
  return prisma.round.findUnique({
    where: { tournamentId_number: { tournamentId, number: roundNumber } },
    include: {
      tournament: true,
      matches: {
        include: {
          affRegistration: { include: { institution: true } },
          negRegistration: { include: { institution: true } },
          room: true,
        },
      },
    },
  });
}

export async function getMatch(matchId: string) {
  return prisma.match.findUnique({
    where: { id: matchId },
    include: {
      round: { include: { tournament: true } },
      affRegistration: { include: { institution: true } },
      negRegistration: { include: { institution: true } },
      room: true,
    },
  });
}

// ============================================================================
// ROOM SERVICES
// ============================================================================

export async function getRoom(roomId: string) {
  return prisma.room.findUnique({
    where: { id: roomId },
    include: {
      match: {
        include: {
          round: { include: { tournament: true } },
          affRegistration: { include: { institution: true } },
          negRegistration: { include: { institution: true } },
        },
      },
    },
  });
}

export async function getRoomByMatchId(matchId: string) {
  return prisma.room.findUnique({
    where: { matchId },
    include: {
      match: {
        include: {
          round: { include: { tournament: true } },
          affRegistration: { include: { institution: true } },
          negRegistration: { include: { institution: true } },
        },
      },
    },
  });
}

// ============================================================================
// ACCESS CONTROL HELPERS
// ============================================================================

/**
 * Check if a user can access a match (as a participant)
 */
export async function canUserAccessMatch(userId: string, matchId: string): Promise<boolean> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      affRegistration: {
        include: {
          institution: {
            include: { members: true },
          },
        },
      },
      negRegistration: {
        include: {
          institution: {
            include: { members: true },
          },
        },
      },
    },
  });

  if (!match) return false;

  // Check if user is in AFF institution
  const affMembers = match.affRegistration?.institution?.members || [];
  if (affMembers.some((m) => m.userId === userId)) return true;

  // Check if user is in NEG institution (if not BYE)
  const negMembers = match.negRegistration?.institution?.members || [];
  if (negMembers.some((m) => m.userId === userId)) return true;

  return false;
}
