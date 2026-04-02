/**
 * MVP Services - Clean, minimal service layer for the Debatera MVP
 * 
 * This module provides all the business logic for:
 * - Institutions (create, join, list members)
 * - Tournaments (create, list)
 */

import { prisma } from '@/lib/prisma';
import { InstitutionRole, EventMode } from '@prisma/client';
import {
  buildPaginationMeta,
  paginationToSkipTake,
  type PaginatedResult,
  type PaginationParams,
} from '@/lib/pagination';

type CreateTournamentSettingsInput = {
  isPublic?: boolean;
  registrationOpensAt?: Date | null;
  registrationClosesAt?: Date | null;
  teamSizeMin?: number;
  teamSizeMax?: number;
  showDebaterNames?: boolean;
  speakerTopN?: number | null;
  hideSpeakerPoints?: boolean;
  publicTabs?: string[];
};

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

export async function listInstitutions(
  pagination: PaginationParams,
  userId?: string,
): Promise<
  PaginatedResult<{
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    _count: { members: number };
  }>
> {
  const where = {
    OR: [
      { isPublic: true },
      ...(userId ? [{ members: { some: { userId } } }] : []),
    ],
  };
  const { skip, take } = paginationToSkipTake(pagination);

  const [items, total] = await Promise.all([
    prisma.institution.findMany({
      where,
      include: {
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.institution.count({ where }),
  ]);

  return {
    data: items.map((institution) => ({
      ...institution,
      description: null,
    })),
    pagination: buildPaginationMeta(total, pagination),
  };
}

export async function getInstitution(institutionId: string) {
  return prisma.institution.findUnique({
    where: { id: institutionId },
    select: {
      id: true,
      name: true,
      isPublic: true,
      createdAt: true,
      members: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          userId: true,
          role: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              displayName: true,
              firstName: true,
              lastName: true,
              imageUrl: true,
            },
          },
        },
      },
      tournamentInstitutions: {
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

export async function createTournament(
  name: string,
  userId: string,
  eventMode: EventMode = EventMode.IRL,
  settingsInput?: CreateTournamentSettingsInput
) {
  const teamSizeMin = settingsInput?.teamSizeMin ?? 2;
  const teamSizeMax = settingsInput?.teamSizeMax ?? 5;

  return prisma.tournament.create({
    data: {
      name,
      isPublic: settingsInput?.isPublic ?? false,
      createdByUserId: userId,
      registrationClosesAt: settingsInput?.registrationClosesAt ?? null,
      teamMinSize: teamSizeMin,
      teamMaxSize: teamSizeMax,
      settings: {
        create: {
          eventMode,
          registrationOpensAt: settingsInput?.registrationOpensAt ?? null,
          registrationClosesAt: settingsInput?.registrationClosesAt ?? null,
          teamSizeMin,
          teamSizeMax,
          showDebaterNames: settingsInput?.showDebaterNames ?? false,
          speakerTopN: settingsInput?.speakerTopN ?? null,
          hideSpeakerPoints: settingsInput?.hideSpeakerPoints ?? false,
          publicTabs: settingsInput?.publicTabs ?? ['overview', 'rounds', 'teams', 'standings'],
        },
      },
    },
    include: {
      settings: true,
    },
  });
}

export async function listTournaments(
  pagination: PaginationParams,
  userId?: string,
): Promise<
  PaginatedResult<{
    id: string;
    name: string;
    createdAt: Date;
    createdByUserId: string;
    createdBy: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
      imageUrl: string | null;
      displayName: string | null;
    };
    _count: { tournamentInstitutions: number };
  }>
> {
  const where = {
    OR: [
      { isPublic: true },
      ...(userId
        ? [
            { createdByUserId: userId },
            { tournamentParticipants: { some: { userId } } },
            { tournamentInstitutions: { some: { institution: { members: { some: { userId } } } } } },
          ]
        : []),
    ],
  };
  const { skip, take } = paginationToSkipTake(pagination);

  const [items, total] = await Promise.all([
    prisma.tournament.findMany({
      where,
      include: {
        createdBy: true,
        _count: {
          select: {
            tournamentInstitutions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.tournament.count({ where }),
  ]);

  return {
    data: items,
    pagination: buildPaginationMeta(total, pagination),
  };
}

export async function getTournament(tournamentId: string) {
  return prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      name: true,
      createdAt: true,
      createdByUserId: true,
      isPublic: true,
      registrationClosesAt: true,
      settings: { select: { eventMode: true } },
    },
  });
}

export async function publishTournament(tournamentId: string) {
  return prisma.tournament.update({
    where: { id: tournamentId },
    // Tournament.status was removed in 20260128124553_add_tournament_registration_models
    data: {},
  });
}

export async function isTournamentOwner(userId: string, tournamentId: string): Promise<boolean> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { createdByUserId: true },
  });
  return tournament?.createdByUserId === userId;
}
