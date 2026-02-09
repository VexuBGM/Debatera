'use server';

/**
 * Venue Server Actions
 *
 * CRUD operations for tournament venues and venue categories,
 * plus auto-allocation of venues to round debates.
 */

import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { isTournamentAdmin } from '@/lib/tournamentRounds/authorization';
import { autoAllocateVenues, type AutoAllocateResult } from '@/lib/venues';
import { assertIRLMode } from '@/lib/guards/tournamentSettingsGuards';

// =============================================================================
// Types
// =============================================================================

interface ActionResponse<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

/** A venue with its assigned categories. */
export type VenueWithCategories = Prisma.VenueGetPayload<{
  include: { categories: true };
}>;

/** Input for creating a venue. */
interface CreateVenueInput {
  tournamentId: string;
  name: string;
  priority?: number;
  categoryIds?: string[];
}

/** Input for updating a venue. */
interface UpdateVenueInput {
  venueId: string;
  name?: string;
  priority?: number;
  isActive?: boolean;
  categoryIds?: string[];
}

// =============================================================================
// Helpers
// =============================================================================

/** Authenticate and verify tournament admin access. */
async function authorizeAdmin(tournamentId: string): Promise<
  | { authorized: true; userId: string }
  | { authorized: false; error: string }
> {
  const { userId } = await auth();
  if (!userId) {
    return { authorized: false, error: 'Unauthorized' };
  }

  const isAdmin = await isTournamentAdmin(tournamentId, userId);
  if (!isAdmin) {
    return { authorized: false, error: 'Forbidden: You must be the tournament admin.' };
  }

  return { authorized: true, userId };
}

/**
 * Fetch tournament settings and assert that the tournament is in IRL mode.
 * Throws if settings are missing or eventMode is ONLINE.
 */
async function assertVenueIRL(tournamentId: string): Promise<void> {
  const settings = await prisma.tournamentSettings.findUnique({
    where: { tournamentId },
    select: { eventMode: true },
  });
  if (!settings) {
    throw new Error('Tournament settings not found.');
  }
  assertIRLMode(settings);
}

/** Get the tournamentId for a given venue. */
async function getTournamentIdForVenue(venueId: string): Promise<string | null> {
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    select: { tournamentId: true },
  });
  return venue?.tournamentId ?? null;
}

// =============================================================================
// CRUD Actions
// =============================================================================

/**
 * Get all venues for a tournament, including their assigned categories.
 * Sorted by priority (DESC) then name (ASC).
 */
export async function getTournamentVenues(
  tournamentId: string
): Promise<ActionResponse<VenueWithCategories[]>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const venues = await prisma.venue.findMany({
      where: { tournamentId },
      include: { categories: true },
      orderBy: [{ priority: 'desc' }, { name: 'asc' }],
    });

    return { success: true, data: venues };
  } catch (error) {
    console.error('[getTournamentVenues]', error);
    return { success: false, error: 'Failed to fetch venues.' };
  }
}

/**
 * Create a new venue in a tournament.
 * Optionally connects it to existing VenueCategory records.
 */
export async function createVenue(
  input: CreateVenueInput
): Promise<ActionResponse<VenueWithCategories>> {
  try {
    const authResult = await authorizeAdmin(input.tournamentId);
    if (!authResult.authorized) {
      return { success: false, error: authResult.error };
    }

    await assertVenueIRL(input.tournamentId);

    const venue = await prisma.venue.create({
      data: {
        tournamentId: input.tournamentId,
        name: input.name.trim(),
        priority: input.priority ?? 100,
        ...(input.categoryIds &&
          input.categoryIds.length > 0 && {
            categories: {
              connect: input.categoryIds.map((id) => ({ id })),
            },
          }),
      },
      include: { categories: true },
    });

    revalidatePath(`/tournaments/${input.tournamentId}`);
    return { success: true, data: venue };
  } catch (error) {
    console.error('[createVenue]', error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return {
        success: false,
        error: 'A venue with this name already exists in the tournament.',
      };
    }
    return { success: false, error: 'Failed to create venue.' };
  }
}

/**
 * Update an existing venue's details, active status, or categories.
 */
export async function updateVenue(
  input: UpdateVenueInput
): Promise<ActionResponse<VenueWithCategories>> {
  try {
    const tournamentId = await getTournamentIdForVenue(input.venueId);
    if (!tournamentId) {
      return { success: false, error: 'Venue not found.' };
    }

    const authResult = await authorizeAdmin(tournamentId);
    if (!authResult.authorized) {
      return { success: false, error: authResult.error };
    }

    await assertVenueIRL(tournamentId);

    const venue = await prisma.venue.update({
      where: { id: input.venueId },
      data: {
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.priority !== undefined && { priority: input.priority }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        // If categoryIds is provided, replace all category connections
        ...(input.categoryIds !== undefined && {
          categories: {
            set: input.categoryIds.map((id) => ({ id })),
          },
        }),
      },
      include: { categories: true },
    });

    revalidatePath(`/tournaments/${tournamentId}`);
    return { success: true, data: venue };
  } catch (error) {
    console.error('[updateVenue]', error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return {
        success: false,
        error: 'A venue with this name already exists in the tournament.',
      };
    }
    return { success: false, error: 'Failed to update venue.' };
  }
}

/**
 * Delete a venue. Debates previously assigned to it will have `venueId` set to null
 * (handled by the `onDelete: SetNull` in the schema).
 */
export async function deleteVenue(
  venueId: string
): Promise<ActionResponse> {
  try {
    const tournamentId = await getTournamentIdForVenue(venueId);
    if (!tournamentId) {
      return { success: false, error: 'Venue not found.' };
    }

    const authResult = await authorizeAdmin(tournamentId);
    if (!authResult.authorized) {
      return { success: false, error: authResult.error };
    }

    await assertVenueIRL(tournamentId);

    await prisma.venue.delete({ where: { id: venueId } });

    revalidatePath(`/tournaments/${tournamentId}`);
    return { success: true };
  } catch (error) {
    console.error('[deleteVenue]', error);
    return { success: false, error: 'Failed to delete venue.' };
  }
}

// =============================================================================
// Venue Category Actions
// =============================================================================

/**
 * Get all venue categories for a tournament.
 */
export async function getTournamentVenueCategories(
  tournamentId: string
): Promise<ActionResponse<{ id: string; name: string; description: string | null }[]>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const categories = await prisma.venueCategory.findMany({
      where: { tournamentId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, description: true },
    });

    return { success: true, data: categories };
  } catch (error) {
    console.error('[getTournamentVenueCategories]', error);
    return { success: false, error: 'Failed to fetch venue categories.' };
  }
}

/**
 * Create a new venue category in a tournament.
 */
export async function createVenueCategory(
  tournamentId: string,
  name: string,
  description?: string
): Promise<ActionResponse<{ id: string; name: string; description: string | null }>> {
  try {
    const authResult = await authorizeAdmin(tournamentId);
    if (!authResult.authorized) {
      return { success: false, error: authResult.error };
    }

    await assertVenueIRL(tournamentId);

    const category = await prisma.venueCategory.create({
      data: {
        tournamentId,
        name: name.trim(),
        description: description?.trim() || null,
      },
      select: { id: true, name: true, description: true },
    });

    revalidatePath(`/tournaments/${tournamentId}`);
    return { success: true, data: category };
  } catch (error) {
    console.error('[createVenueCategory]', error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return {
        success: false,
        error: 'A category with this name already exists in the tournament.',
      };
    }
    return { success: false, error: 'Failed to create venue category.' };
  }
}

/**
 * Delete a venue category. Venues linked to it will be unlinked (M2M).
 */
export async function deleteVenueCategory(
  categoryId: string
): Promise<ActionResponse> {
  try {
    const category = await prisma.venueCategory.findUnique({
      where: { id: categoryId },
      select: { tournamentId: true },
    });

    if (!category) {
      return { success: false, error: 'Category not found.' };
    }

    const authResult = await authorizeAdmin(category.tournamentId);
    if (!authResult.authorized) {
      return { success: false, error: authResult.error };
    }

    await assertVenueIRL(category.tournamentId);

    await prisma.venueCategory.delete({ where: { id: categoryId } });

    revalidatePath(`/tournaments/${category.tournamentId}`);
    return { success: true };
  } catch (error) {
    console.error('[deleteVenueCategory]', error);
    return { success: false, error: 'Failed to delete venue category.' };
  }
}

// =============================================================================
// Auto-Allocation Action
// =============================================================================

/**
 * Server action wrapper for auto-allocating venues to a round's debates.
 * Delegates to the pure logic in `lib/venues/autoAllocate.ts`.
 */
export async function autoAllocateVenuesAction(
  roundId: string
): Promise<ActionResponse<AutoAllocateResult>> {
  try {
    // Look up the round to get the tournamentId for auth
    const round = await prisma.tournamentRound.findUnique({
      where: { id: roundId },
      select: { tournamentId: true },
    });

    if (!round) {
      return { success: false, error: 'Round not found.' };
    }

    const authResult = await authorizeAdmin(round.tournamentId);
    if (!authResult.authorized) {
      return { success: false, error: authResult.error };
    }

    await assertVenueIRL(round.tournamentId);

    const result = await autoAllocateVenues(roundId);

    if (!result.success) {
      return { success: false, error: result.error, data: result };
    }

    revalidatePath(`/tournaments/${round.tournamentId}`);
    return { success: true, data: result };
  } catch (error) {
    console.error('[autoAllocateVenuesAction]', error);
    return { success: false, error: 'Failed to auto-allocate venues.' };
  }
}
