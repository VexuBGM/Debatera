import type {
  Institution,
  InstitutionMember,
  InstitutionRole,
  PrismaClient,
  TournamentInstitution,
  TournamentInstitutionStatus,
} from '@prisma/client';
import { testPrisma } from '@tests/setup/prisma-test-client';
import { createUser } from './user.factory';
import { createTournament } from './tournament.factory';

let institutionCounter = 0;

export async function createInstitution(
  overrides: Partial<Institution> = {},
  prisma: PrismaClient = testPrisma
) {
  institutionCounter += 1;

  return prisma.institution.create({
    data: {
      id: overrides.id,
      name: overrides.name ?? `Institution ${institutionCounter}`,
      isPublic: overrides.isPublic ?? false,
      createdAt: overrides.createdAt,
    },
  });
}

export async function createInstitutionMember(
  overrides: Partial<InstitutionMember> & {
    institutionId?: string;
    userId?: string;
    role?: InstitutionRole;
  } = {},
  prisma: PrismaClient = testPrisma
) {
  const institutionId = overrides.institutionId ?? (await createInstitution({}, prisma)).id;
  const userId = overrides.userId ?? (await createUser({}, prisma)).id;

  return prisma.institutionMember.create({
    data: {
      id: overrides.id,
      institutionId,
      userId,
      role: overrides.role ?? 'MEMBER',
      createdAt: overrides.createdAt,
    },
  });
}

export async function createTournamentInstitution(
  overrides: Partial<TournamentInstitution> & {
    tournamentId?: string;
    institutionId?: string;
    requestedByUserId?: string;
    status?: TournamentInstitutionStatus;
  } = {},
  prisma: PrismaClient = testPrisma
) {
  const tournamentId = overrides.tournamentId ?? (await createTournament({}, prisma)).id;
  const institutionId = overrides.institutionId ?? (await createInstitution({}, prisma)).id;
  const requestedByUserId = overrides.requestedByUserId ?? (await createUser({}, prisma)).id;

  return prisma.tournamentInstitution.create({
    data: {
      id: overrides.id,
      tournamentId,
      institutionId,
      requestedByUserId,
      status: overrides.status ?? 'APPROVED',
      createdAt: overrides.createdAt,
    },
  });
}
