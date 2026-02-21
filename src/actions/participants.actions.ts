'use server';

import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { isTournamentAdmin } from '@/lib/tournamentRounds/authorization';

// =============================================================================
// Types
// =============================================================================

interface ActionResponse<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ParticipantWithUser {
  id: string;
  role: 'DEBATER' | 'JUDGE';
  institutionId: string;
  createdAt: Date;
  user: {
    id: string;
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    imageUrl: string | null;
  };
  institution: {
    id: string;
    name: string;
  };
  teamMembership: { id: string; teamId: string } | null;
}

// =============================================================================
// Zod Schemas
// =============================================================================

export const addGuestParticipantSchema = z.object({
  tournamentId: z.string().min(1),
  role: z.enum(['DEBATER', 'JUDGE']),
  displayName: z.string().min(1, 'Name is required').max(128),
  institutionId: z.string().optional(),
});

export const bulkAddGuestParticipantsSchema = z.object({
  tournamentId: z.string().min(1),
  role: z.enum(['DEBATER', 'JUDGE']),
  names: z.string().min(1, 'At least one name is required'),
  institutionId: z.string().optional(),
});

// =============================================================================
// Helpers
// =============================================================================

function generateGuestUserId(): string {
  return `guest_${crypto.randomUUID()}`;
}

function splitName(displayName: string): { firstName: string; lastName: string | null } {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: null };
  }
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName };
}

/**
 * Ensure a "Guests" institution exists for a tournament.
 * If the tournament has no APPROVED TournamentInstitution entries,
 * auto-create one.
 */
async function ensureGuestsInstitution(
  tournamentId: string,
  tournamentName: string,
  currentUserId: string,
): Promise<string> {
  // Check if there's already an approved tournament institution we can use
  const approvedInstitutions = await prisma.tournamentInstitution.findMany({
    where: { tournamentId, status: 'APPROVED' },
    include: { institution: true },
  });

  // Look for an existing "Guests" institution for this tournament
  const guestsInst = approvedInstitutions.find(
    (ti) => ti.institution.name === `${tournamentName} Guests`,
  );
  if (guestsInst) return guestsInst.institutionId;

  // If there are no approved institutions at all, create one
  // Also create if a specific guests institution is needed
  const guestsInstitutionName = `${tournamentName} Guests`;

  // Upsert the institution (name is unique)
  const institution = await prisma.institution.upsert({
    where: { name: guestsInstitutionName },
    update: {},
    create: { name: guestsInstitutionName },
  });

  // Create the TournamentInstitution link with APPROVED status
  await prisma.tournamentInstitution.upsert({
    where: {
      tournamentId_institutionId: {
        tournamentId,
        institutionId: institution.id,
      },
    },
    update: { status: 'APPROVED' },
    create: {
      tournamentId,
      institutionId: institution.id,
      status: 'APPROVED',
      requestedByUserId: currentUserId,
    },
  });

  return institution.id;
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
  input: z.infer<typeof addGuestParticipantSchema>,
): Promise<ActionResponse<{ participantId: string }>> {
  try {
    const parsed = addGuestParticipantSchema.parse(input);
    const { userId: currentUserId } = await requireParticipantManager(parsed.tournamentId);

    const tournament = await prisma.tournament.findUnique({
      where: { id: parsed.tournamentId },
      select: { id: true, name: true },
    });
    if (!tournament) return { success: false, error: 'Tournament not found' };

    // Determine institution
    let institutionId = parsed.institutionId;
    if (!institutionId) {
      institutionId = await ensureGuestsInstitution(
        parsed.tournamentId,
        tournament.name,
        currentUserId,
      );
    }

    // Create guest User
    const guestUserId = generateGuestUserId();
    const { firstName, lastName } = splitName(parsed.displayName);

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
    const participant = await prisma.tournamentParticipant.create({
      data: {
        tournamentId: parsed.tournamentId,
        userId: guestUserId,
        institutionId,
        role: parsed.role,
      },
    });

    revalidatePath(`/tournaments/${parsed.tournamentId}/participants`);
    return { success: true, data: { participantId: participant.id } };
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
  input: z.infer<typeof bulkAddGuestParticipantsSchema>,
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

    // Determine institution
    let institutionId = parsed.institutionId;
    if (!institutionId) {
      institutionId = await ensureGuestsInstitution(
        parsed.tournamentId,
        tournament.name,
        currentUserId,
      );
    }

    // Parse lines
    const lines = parsed.names
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

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
      const name = lines[i];

      // Validate name length
      if (name.length > 128) {
        results.push({
          line: i + 1,
          name,
          success: false,
          error: 'Name too long (max 128 characters)',
        });
        continue;
      }

      try {
        const guestUserId = generateGuestUserId();
        const { firstName, lastName } = splitName(name);

        await prisma.user.create({
          data: {
            id: guestUserId,
            email: null,
            displayName: name,
            firstName,
            lastName,
          },
        });

        const participant = await prisma.tournamentParticipant.create({
          data: {
            tournamentId: parsed.tournamentId,
            userId: guestUserId,
            institutionId: institutionId!,
            role: parsed.role,
          },
        });

        results.push({
          line: i + 1,
          name,
          success: true,
          participantId: participant.id,
        });
        totalCreated++;
      } catch (error: any) {
        results.push({
          line: i + 1,
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
    if (!userId) return { success: false, error: 'Unauthorized' };

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { settings: true },
    });
    if (!tournament) return { success: false, error: 'Tournament not found' };

    // Check permissions
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

    if (!isCreator && !isInstAdmin) {
      return { success: false, error: 'Forbidden' };
    }

    const participants = await prisma.tournamentParticipant.findMany({
      where: { tournamentId },
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

    // Get approved institutions for this tournament
    const approvedInstitutions = await prisma.tournamentInstitution.findMany({
      where: { tournamentId, status: 'APPROVED' },
      include: { institution: { select: { id: true, name: true } } },
    });

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
