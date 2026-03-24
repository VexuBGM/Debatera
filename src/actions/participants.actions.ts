'use server';

import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { isTournamentAdmin } from '@/lib/tournamentRounds/authorization';
import {
  ensureInstitutionForTournament,
  ensureIndependentAdjudicatorsInstitution,
} from '@/lib/services/institutions';
import {
  addGuestParticipantSchema,
  bulkAddGuestParticipantsSchema,
  type AddGuestParticipantInput,
  type BulkAddGuestParticipantsInput,
  type ParticipantWithUser,
} from '@/lib/validations/participants';
import {
  generateGuestUserId,
  parseGuestParticipantNames,
  splitGuestDisplayName,
} from '@/lib/domains/participants/guestParticipants';
import { resolveTeamManagementScope } from '@/lib/domains/teams/teamManagementScope';
import { createTournamentParticipantForUser } from '@/lib/participants/createTournamentParticipant';

// =============================================================================
// Types
// =============================================================================

interface ActionResponse<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Resolve the institution for a guest participant.
 * - If both institutionId and institutionName are absent:
 *   - JUDGE → default to "Independent Adjudicators"
 *   - DEBATER → error (debaters should be added via a team)
 * - Otherwise delegates to ensureInstitutionForTournament.
 */
async function resolveInstitution(
  tournamentId: string,
  currentUserId: string,
  role: 'DEBATER' | 'JUDGE',
  institutionId?: string,
  institutionName?: string,
): Promise<string> {
  if (institutionId || institutionName) {
    const result = await ensureInstitutionForTournament(tournamentId, currentUserId, {
      institutionId,
      institutionName,
    });
    return result.institutionId;
  }
  // No institution specified — use role-based defaults
  if (role === 'JUDGE') {
    return ensureIndependentAdjudicatorsInstitution(tournamentId, currentUserId);
  }
  throw new Error('Institution is required for debaters. Add debaters via the Teams page.');
}

/**
 * Check if the current user can manage participants for this tournament.
 * Returns the userId or throws.
 * Tournament creator OR institution admin for an approved institution can manage.
 */
async function requireParticipantManager(
  tournamentId: string,
): Promise<{ userId: string; isCreator: boolean }> {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const isCreator = await isTournamentAdmin(tournamentId, userId);
  if (isCreator) return { userId, isCreator: true };

  // Check if user is an ADMIN of any approved institution in this tournament
  const adminMemberships = await prisma.institutionMember.findMany({
    where: { userId, role: 'ADMIN' },
    select: { institutionId: true },
  });

  if (adminMemberships.length > 0) {
    const approvedLink = await prisma.tournamentInstitution.findFirst({
      where: {
        tournamentId,
        status: 'APPROVED',
        institutionId: { in: adminMemberships.map((m) => m.institutionId) },
      },
    });
    if (approvedLink) return { userId, isCreator: false };
  }

  throw new Error('Forbidden');
}

// =============================================================================
// Actions
// =============================================================================

/**
 * Add a single guest participant (debater or judge) to a tournament.
 */
export async function addGuestParticipant(
  input: AddGuestParticipantInput,
): Promise<ActionResponse<{ participantId: string }>> {
  try {
    const parsed = addGuestParticipantSchema.parse(input);
    const { userId: currentUserId } = await requireParticipantManager(parsed.tournamentId);

    const tournament = await prisma.tournament.findUnique({
      where: { id: parsed.tournamentId },
      select: { id: true, name: true },
    });
    if (!tournament) return { success: false, error: 'Tournament not found' };

    // Determine institution via new resolver
    const institutionId = await resolveInstitution(
      parsed.tournamentId,
      currentUserId,
      parsed.role,
      parsed.institutionId,
      parsed.institutionName,
    );

    // Create guest User
    const guestUserId = generateGuestUserId();
    const { firstName, lastName } = splitGuestDisplayName(parsed.displayName);

    await prisma.user.create({
      data: {
        id: guestUserId,
        email: null,
        displayName: parsed.displayName.trim(),
        firstName,
        lastName,
      },
    });

    // Create TournamentParticipant
    const participant = await createTournamentParticipantForUser(prisma, {
      tournamentId: parsed.tournamentId,
      userId: guestUserId,
      institutionId,
      role: parsed.role,
    });

    revalidatePath(`/tournaments/${parsed.tournamentId}/participants`);
    return { success: true, data: { participantId: participant.participantId } };
  } catch (error: any) {
    if (error.message === 'Unauthorized') return { success: false, error: 'Unauthorized' };
    if (error.message === 'Forbidden') return { success: false, error: 'Forbidden' };
    console.error('addGuestParticipant error:', error);
    return { success: false, error: error.message || 'Failed to add participant' };
  }
}

/**
 * Bulk-add guest participants from a multiline string of names.
 * Returns per-line results.
 */
export async function bulkAddGuestParticipants(
  input: BulkAddGuestParticipantsInput,
): Promise<
  ActionResponse<{
    results: Array<{ line: number; name: string; success: boolean; error?: string; participantId?: string }>;
    totalCreated: number;
  }>
> {
  try {
    const parsed = bulkAddGuestParticipantsSchema.parse(input);
    const { userId: currentUserId } = await requireParticipantManager(parsed.tournamentId);

    const tournament = await prisma.tournament.findUnique({
      where: { id: parsed.tournamentId },
      select: { id: true, name: true },
    });
    if (!tournament) return { success: false, error: 'Tournament not found' };

    // Determine institution via new resolver
    const institutionId = await resolveInstitution(
      parsed.tournamentId,
      currentUserId,
      parsed.role,
      parsed.institutionId,
      parsed.institutionName,
    );

    // Parse lines
    const lines = parseGuestParticipantNames(parsed.names);

    if (lines.length === 0) {
      return { success: false, error: 'No valid names provided' };
    }

    const results: Array<{
      line: number;
      name: string;
      success: boolean;
      error?: string;
      participantId?: string;
    }> = [];

    let totalCreated = 0;

    for (let i = 0; i < lines.length; i++) {
      const { name } = lines[i];

      // Validate name length
      if (name.length > 128) {
        results.push({
          line: lines[i].line,
          name,
          success: false,
          error: 'Name too long (max 128 characters)',
        });
        continue;
      }

      try {
        const guestUserId = generateGuestUserId();
        const { firstName, lastName } = splitGuestDisplayName(name);

        await prisma.user.create({
          data: {
            id: guestUserId,
            email: null,
            displayName: name,
            firstName,
            lastName,
          },
        });

        const participant = await createTournamentParticipantForUser(prisma, {
          tournamentId: parsed.tournamentId,
          userId: guestUserId,
          institutionId,
          role: parsed.role,
        });

        results.push({
          line: lines[i].line,
          name,
          success: true,
          participantId: participant.participantId,
        });
        totalCreated++;
      } catch (error: any) {
        results.push({
          line: lines[i].line,
          name,
          success: false,
          error: error.message || 'Failed to create participant',
        });
      }
    }

    revalidatePath(`/tournaments/${parsed.tournamentId}/participants`);
    return { success: true, data: { results, totalCreated } };
  } catch (error: any) {
    if (error.message === 'Unauthorized') return { success: false, error: 'Unauthorized' };
    if (error.message === 'Forbidden') return { success: false, error: 'Forbidden' };
    console.error('bulkAddGuestParticipants error:', error);
    return { success: false, error: error.message || 'Failed to bulk add participants' };
  }
}

/**
 * Remove a guest participant from a tournament.
 */
export async function removeParticipant(
  tournamentId: string,
  participantId: string,
): Promise<ActionResponse> {
  try {
    await requireParticipantManager(tournamentId);

    const participant = await prisma.tournamentParticipant.findUnique({
      where: { id: participantId },
      select: { id: true, tournamentId: true, userId: true },
    });

    if (!participant || participant.tournamentId !== tournamentId) {
      return { success: false, error: 'Participant not found' };
    }

    // Delete participant (cascade removes team membership)
    await prisma.tournamentParticipant.delete({
      where: { id: participantId },
    });

    // If the user is a guest, clean up the User row too
    if (participant.userId.startsWith('guest_')) {
      await prisma.user.delete({
        where: { id: participant.userId },
      }).catch(() => { /* ignore if already deleted */ });
    }

    revalidatePath(`/tournaments/${tournamentId}/participants`);
    return { success: true };
  } catch (error: any) {
    if (error.message === 'Unauthorized') return { success: false, error: 'Unauthorized' };
    if (error.message === 'Forbidden') return { success: false, error: 'Forbidden' };
    console.error('removeParticipant error:', error);
    return { success: false, error: 'Failed to remove participant' };
  }
}

/**
 * Get all participants for a tournament, grouped by role.
 */
export async function getTournamentParticipants(
  tournamentId: string,
): Promise<
  ActionResponse<{
    debaters: ParticipantWithUser[];
    judges: ParticipantWithUser[];
    institutions: Array<{ id: string; name: string }>;
    tournament: { id: string; name: string; createdByUserId: string };
    isOrganizer: boolean;
    teamSizeMin: number;
    teamSizeMax: number;
  }>
> {
  try {
    const { userId } = await auth();

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { settings: true },
    });
    if (!tournament) return { success: false, error: 'Tournament not found' };

    // Unauthenticated users can view if tournament is public
    if (!userId) {
      if (!tournament.isPublic) return { success: false, error: 'Unauthorized' };

      const participants = await prisma.tournamentParticipant.findMany({
        where: { tournamentId },
        include: {
          user: { select: { id: true, displayName: true, firstName: true, lastName: true, email: true, imageUrl: true } },
          institution: { select: { id: true, name: true } },
          teamMembership: { select: { id: true, teamId: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      const settings = tournament.settings;
      return {
        success: true,
        data: {
          debaters: participants.filter((p) => p.role === 'DEBATER') as ParticipantWithUser[],
          judges: participants.filter((p) => p.role === 'JUDGE') as ParticipantWithUser[],
          institutions: [],
          tournament: { id: tournament.id, name: tournament.name, createdByUserId: tournament.createdByUserId },
          isOrganizer: false,
          teamSizeMin: settings?.teamSizeMin ?? tournament.teamMinSize,
          teamSizeMax: settings?.teamSizeMax ?? tournament.teamMaxSize,
        },
      };
    }

    // Check permissions for authenticated users
    const isCreator = tournament.createdByUserId === userId;
    let isInstAdmin = false;
    if (!isCreator) {
      const adminMemberships = await prisma.institutionMember.findMany({
        where: { userId, role: 'ADMIN' },
        select: { institutionId: true },
      });
      if (adminMemberships.length > 0) {
        const approvedLink = await prisma.tournamentInstitution.findFirst({
          where: {
            tournamentId,
            status: 'APPROVED',
            institutionId: { in: adminMemberships.map((m) => m.institutionId) },
          },
        });
        isInstAdmin = !!approvedLink;
      }
    }

    // Non-admin authenticated users (debaters, judges) can view if tournament is public
    const canView = isCreator || isInstAdmin || tournament.isPublic;
    if (!canView) return { success: false, error: 'Forbidden' };

    const scope = await resolveTeamManagementScope(tournamentId, userId);
    const canManageAll = isCreator || isInstAdmin;
    const participantWhere = canManageAll && isCreator
      ? { tournamentId }
      : canManageAll
      ? { tournamentId, institutionId: { in: scope.manageableInstitutionIds } }
      : { tournamentId };

    const participants = await prisma.tournamentParticipant.findMany({
      where: participantWhere,
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            firstName: true,
            lastName: true,
            email: true,
            imageUrl: true,
          },
        },
        institution: {
          select: { id: true, name: true },
        },
        teamMembership: {
          select: { id: true, teamId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const debaters = participants.filter((p) => p.role === 'DEBATER') as ParticipantWithUser[];
    const judges = participants.filter((p) => p.role === 'JUDGE') as ParticipantWithUser[];

    // Get approved institutions (only for managers)
    const approvedInstitutions = canManageAll ? await prisma.tournamentInstitution.findMany({
      where: isCreator
        ? { tournamentId, status: 'APPROVED' }
        : {
            tournamentId,
            status: 'APPROVED',
            institutionId: { in: scope.manageableInstitutionIds },
          },
      include: { institution: { select: { id: true, name: true } } },
    }) : [];

    const settings = tournament.settings;

    return {
      success: true,
      data: {
        debaters,
        judges,
        institutions: approvedInstitutions.map((ai) => ai.institution),
        tournament: { id: tournament.id, name: tournament.name, createdByUserId: tournament.createdByUserId },
        isOrganizer: isCreator,
        teamSizeMin: settings?.teamSizeMin ?? tournament.teamMinSize,
        teamSizeMax: settings?.teamSizeMax ?? tournament.teamMaxSize,
      },
    };
  } catch (error: any) {
    console.error('getTournamentParticipants error:', error);
    return { success: false, error: 'Internal server error' };
  }
}
