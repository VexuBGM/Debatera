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

export async function listInstitutions(pagination?: PaginationParams): Promise<
  PaginatedResult<{
    id: string;
    name: string;
    createdAt: Date;
    _count: { members: number };
  }>
> {
  const baseWhere = {};
  if (pagination) {
    const { skip, take } = paginationToSkipTake(pagination);
    const [items, total] = await Promise.all([
      prisma.institution.findMany({
        include: { _count: { select: { members: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.institution.count({ where: baseWhere }),
    ]);
    return { data: items, pagination: buildPaginationMeta(total, pagination) };
  }

  const items = await prisma.institution.findMany({
    include: { _count: { select: { members: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return {
    data: items,
    pagination: buildPaginationMeta(items.length, { page: 1, pageSize: items.length || 1 }),
  };
}

export async function getInstitution(institutionId: string) {
  return prisma.institution.findUnique({
    where: { id: institutionId },
    include: {
      members: {
        include: { user: true },
        orderBy: { createdAt: 'asc' },
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

export async function createTournament(name: string, userId: string, eventMode: EventMode = EventMode.IRL) {
  return prisma.tournament.create({
    data: {
      name,
      createdByUserId: userId,
      settings: {
        create: {
          eventMode,
        },
      },
    },
    include: {
      settings: true,
    },
  });
}

export async function listTournaments(pagination?: PaginationParams): Promise<
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
  }>
> {
  const baseWhere = {};
  if (pagination) {
    const { skip, take } = paginationToSkipTake(pagination);
    const [items, total] = await Promise.all([
      prisma.tournament.findMany({
        include: { createdBy: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.tournament.count({ where: baseWhere }),
    ]);
    return { data: items, pagination: buildPaginationMeta(total, pagination) };
  }

  const items = await prisma.tournament.findMany({
    include: { createdBy: true },
    orderBy: { createdAt: 'desc' },
  });
  return {
    data: items,
    pagination: buildPaginationMeta(items.length, { page: 1, pageSize: items.length || 1 }),
  };
}

export async function getTournament(tournamentId: string) {
  return prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      createdBy: true,
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
