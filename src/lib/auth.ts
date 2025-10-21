import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { AppRole } from '@prisma/client';
import { NextResponse } from 'next/server';

export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  return user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      user: null,
    };
  }
  return { user, error: null };
}

export async function requireAdmin() {
  const { user, error } = await requireAuth();
  if (error) {
    return { error, user: null };
  }

  if (user!.appRole !== AppRole.ADMIN) {
    return {
      error: NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 }),
      user: null,
    };
  }

  return { user, error: null };
}

/**
 * Check if a user is an organizer or owner of a tournament
 */
export async function isTournamentOrganizer(
  userId: string,
  tournamentId: string
): Promise<boolean> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      organizers: {
        where: { userId },
      },
    },
  });

  if (!tournament) {
    return false;
  }

  // Creator is always an organizer
  if (tournament.createdById === userId) {
    return true;
  }

  // Check if user is in organizers list
  return tournament.organizers.length > 0;
}

/**
 * Require user to be an organizer or admin for a tournament
 */
export async function requireTournamentOrganizer(tournamentId: string) {
  const { user, error } = await requireAuth();
  if (error) {
    return { error, user: null };
  }

  // Admins bypass organizer check
  if (user!.appRole === AppRole.ADMIN) {
    return { user, error: null };
  }

  const isOrganizer = await isTournamentOrganizer(user!.id, tournamentId);
  if (!isOrganizer) {
    return {
      error: NextResponse.json(
        { error: 'Forbidden: Tournament organizer access required' },
        { status: 403 }
      ),
      user: null,
    };
  }

  return { user, error: null };
}

