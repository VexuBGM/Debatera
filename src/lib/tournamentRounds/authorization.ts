/**
 * Tournament Round Authorization Helpers
 *
 * Centralized authorization logic for tournament round management.
 * Keep it simple: tournament admin = tournament creator (for now).
 */

import { prisma } from '@/lib/prisma';

/**
 * Check if a user is the admin (creator) of a tournament.
 *
 * Note: This is a simple implementation. Extend later to support
 * multiple admins, roles, etc.
 */
export async function isTournamentAdmin(
  tournamentId: string,
  userId: string
): Promise<boolean> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { createdByUserId: true },
  });

  return tournament?.createdByUserId === userId;
}

/**
 * Throws an error if the user is not a tournament admin.
 * Use in API routes for cleaner code flow.
 */
export async function requireTournamentAdmin(
  tournamentId: string,
  userId: string
): Promise<void> {
  const isAdmin = await isTournamentAdmin(tournamentId, userId);
  if (!isAdmin) {
    const error = new Error('Forbidden: You must be the tournament admin');
    (error as Error & { status: number }).status = 403;
    throw error;
  }
}

/**
 * Check if a tournament exists. Returns the tournament or null.
 */
export async function getTournamentOrNull(tournamentId: string) {
  return prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      createdByUserId: true,
      name: true,
    },
  });
}
