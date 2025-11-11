import { prisma } from './prisma';
import { RoleType } from '@prisma/client';

/**
 * Check if a user is a coach of an institution
 */
export async function isCoach(userId: string, institutionId: string): Promise<boolean> {
  const membership = await prisma.institutionMember.findFirst({
    where: {
      userId,
      institutionId,
      isCoach: true,
    },
  });
  return !!membership;
}

/**
 * Check if a user is a tournament admin/owner
 */
export async function isTournamentAdmin(userId: string, tournamentId: string): Promise<boolean> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { ownerId: true },
  });
  return tournament?.ownerId === userId;
}

/**
 * Check if the tournament roster is frozen
 */
export async function isRosterFrozen(tournamentId: string): Promise<boolean> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { rosterFreezeAt: true },
  });
  
  if (!tournament?.rosterFreezeAt) {
    return false;
  }
  
  return new Date() >= tournament.rosterFreezeAt;
}

/**
 * Check if a team has reached the minimum size (3 debaters)
 */
export async function hasMinimumTeamSize(teamId: string): Promise<boolean> {
  const count = await prisma.tournamentParticipation.count({
    where: {
      teamId,
      role: RoleType.DEBATER,
    },
  });
  return count >= 3;
}

/**
 * Check if a team has reached the maximum size (5 debaters)
 */
export async function hasMaximumTeamSize(teamId: string): Promise<boolean> {
  const count = await prisma.tournamentParticipation.count({
    where: {
      teamId,
      role: RoleType.DEBATER,
    },
  });
  return count >= 5;
}

/**
 * Get the count of debaters in a team
 */
export async function getTeamDebaterCount(teamId: string): Promise<number> {
  return await prisma.tournamentParticipation.count({
    where: {
      teamId,
      role: RoleType.DEBATER,
    },
  });
}

/**
 * Check if a user is already registered in a tournament (single appearance rule)
 */
export async function isUserInTournament(userId: string, tournamentId: string): Promise<boolean> {
  const participation = await prisma.tournamentParticipation.findUnique({
    where: {
      userId_tournamentId: {
        userId,
        tournamentId,
      },
    },
  });
  return !!participation;
}

/**
 * Check if a user belongs to an institution
 */
export async function isUserInInstitution(userId: string, institutionId: string): Promise<boolean> {
  const membership = await prisma.institutionMember.findFirst({
    where: {
      userId,
      institutionId,
    },
  });
  return !!membership;
}

/**
 * Get the institution ID of a user (returns null if not in any institution)
 */
export async function getUserInstitutionId(userId: string): Promise<string | null> {
  const membership = await prisma.institutionMember.findUnique({
    where: { userId },
    select: { institutionId: true },
  });
  return membership?.institutionId || null;
}

/**
 * Check if an institution is registered for a tournament
 */
export async function isInstitutionRegisteredForTournament(
  institutionId: string,
  tournamentId: string
): Promise<boolean> {
  const registration = await prisma.tournamentInstitutionRegistration.findUnique({
    where: {
      tournamentId_institutionId: {
        tournamentId,
        institutionId,
      },
    },
  });
  return !!registration;
}

/**
 * Validate that modifications can be made (roster not frozen or user is admin)
 */
export async function canModifyRoster(
  userId: string,
  tournamentId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const frozen = await isRosterFrozen(tournamentId);
  
  if (!frozen) {
    return { allowed: true };
  }
  
  const isAdmin = await isTournamentAdmin(userId, tournamentId);
  
  if (isAdmin) {
    return { allowed: true };
  }
  
  return {
    allowed: false,
    reason: 'Tournament roster is frozen. Only admins can make changes.',
  };
}
