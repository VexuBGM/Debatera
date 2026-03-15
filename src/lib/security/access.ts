import { InstitutionRole } from '@prisma/client';

import { prisma } from '@/lib/prisma';

export interface InstitutionViewAccess {
  exists: boolean;
  canView: boolean;
  isPublic: boolean;
  isMember: boolean;
  isAdmin: boolean;
}

export interface TournamentViewAccess {
  exists: boolean;
  canView: boolean;
  isPublic: boolean;
  isAdmin: boolean;
  isParticipant: boolean;
  isInstitutionMember: boolean;
}

export async function getInstitutionViewAccess(
  institutionId: string,
  userId?: string | null
): Promise<InstitutionViewAccess> {
  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
    select: {
      isPublic: true,
      members: userId
        ? {
            where: { userId },
            select: { role: true },
            take: 1,
          }
        : false,
    },
  });

  if (!institution) {
    return {
      exists: false,
      canView: false,
      isPublic: false,
      isMember: false,
      isAdmin: false,
    };
  }

  const membership = userId ? institution.members[0] : undefined;
  const isMember = Boolean(membership);
  const isAdmin = membership?.role === InstitutionRole.ADMIN;
  const canView = institution.isPublic || isMember;

  return {
    exists: true,
    canView,
    isPublic: institution.isPublic,
    isMember,
    isAdmin,
  };
}

export async function getTournamentViewAccess(
  tournamentId: string,
  userId?: string | null
): Promise<TournamentViewAccess> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
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
            select: { id: true },
            take: 1,
          }
        : false,
    },
  });

  if (!tournament) {
    return {
      exists: false,
      canView: false,
      isPublic: false,
      isAdmin: false,
      isParticipant: false,
      isInstitutionMember: false,
    };
  }

  const isAdmin = tournament.createdByUserId === userId;
  const isParticipant = userId ? tournament.tournamentParticipants.length > 0 : false;
  const isInstitutionMember = userId
    ? tournament.tournamentInstitutions.length > 0
    : false;
  const canView =
    tournament.isPublic || isAdmin || isParticipant || isInstitutionMember;

  return {
    exists: true,
    canView,
    isPublic: tournament.isPublic,
    isAdmin,
    isParticipant,
    isInstitutionMember,
  };
}
