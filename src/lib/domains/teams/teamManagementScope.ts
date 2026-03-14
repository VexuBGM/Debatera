import { prisma } from '@/lib/prisma';
import { isTournamentAdmin } from '@/lib/tournamentRounds/authorization';

export interface TeamManagementScope {
  userId: string;
  isOrganizer: boolean;
  canCreateInstitutions: boolean;
  manageableInstitutionIds: string[];
}

export function canManageInstitution(
  scope: TeamManagementScope,
  institutionId: string,
): boolean {
  return scope.isOrganizer || scope.manageableInstitutionIds.includes(institutionId);
}

export function assertCanManageInstitution(
  scope: TeamManagementScope,
  institutionId: string,
): void {
  if (!canManageInstitution(scope, institutionId)) {
    throw new Error('Forbidden');
  }
}

export async function resolveTeamManagementScope(
  tournamentId: string,
  userId: string,
): Promise<TeamManagementScope> {
  const isOrganizer = await isTournamentAdmin(tournamentId, userId);

  if (isOrganizer) {
    const approvedInstitutions = await prisma.tournamentInstitution.findMany({
      where: { tournamentId, status: 'APPROVED' },
      select: { institutionId: true },
    });

    return {
      userId,
      isOrganizer: true,
      canCreateInstitutions: true,
      manageableInstitutionIds: approvedInstitutions.map((institution) => institution.institutionId),
    };
  }

  const adminMemberships = await prisma.institutionMember.findMany({
    where: { userId, role: 'ADMIN' },
    select: { institutionId: true },
  });

  if (adminMemberships.length === 0) {
    return {
      userId,
      isOrganizer: false,
      canCreateInstitutions: false,
      manageableInstitutionIds: [],
    };
  }

  const approvedInstitutions = await prisma.tournamentInstitution.findMany({
    where: {
      tournamentId,
      status: 'APPROVED',
      institutionId: { in: adminMemberships.map((membership) => membership.institutionId) },
    },
    select: { institutionId: true },
  });

  return {
    userId,
    isOrganizer: false,
    canCreateInstitutions: false,
    manageableInstitutionIds: approvedInstitutions.map((institution) => institution.institutionId),
  };
}
