import { ensureUserInDB } from '@/lib/ensureUser';
import prisma from '@/lib/prisma';

/**
 * Fields included in the public profile query.
 * Contains user info + institution memberships + tournament participations.
 */
const publicProfileInclude = {
  institutionMemberships: {
    include: { institution: true },
    orderBy: { createdAt: 'desc' as const },
  },
  tournamentParticipants: {
    include: {
      tournament: true,
      institution: true,
      teamMembership: {
        include: { team: true },
      },
    },
    orderBy: { createdAt: 'desc' as const },
  },
  teamsCreated: {
    include: {
      tournament: true,
      institution: true,
    },
    orderBy: { createdAt: 'desc' as const },
  },
} as const;

/**
 * Public profile fields selected from the User model.
 * Private fields (e.g. email when publicEmail is false) are filtered at the application layer.
 */
const publicProfileSelect = {
  id: true,
  firstName: true,
  lastName: true,
  imageUrl: true,
  displayName: true,
  pronouns: true,
  bio: true,
  publicEmail: true,
  email: true, // We fetch it but filter in getPublicProfile()
  createdAt: true,
  institutionMemberships: publicProfileInclude.institutionMemberships,
  tournamentParticipants: publicProfileInclude.tournamentParticipants,
  teamsCreated: publicProfileInclude.teamsCreated,
} as const;

export type PublicProfileData = NonNullable<Awaited<ReturnType<typeof getPublicProfile>>>;

/**
 * Fetch a user's public profile by their Clerk userId.
 * Returns null if the user does not exist.
 * Email is only included when `publicEmail` is true.
 */
export async function getPublicProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: publicProfileSelect,
  });

  if (!user) return null;

  return {
    ...user,
    // Only expose email if the user opted in
    email: user.publicEmail ? user.email : null,
  };
}

export type MyProfileData = NonNullable<Awaited<ReturnType<typeof getMyProfile>>>;

/**
 * Fetch the full profile for the currently-authenticated user.
 * Includes all public data plus private-only sections.
 */
export async function getMyProfile(userId: string) {
  // Refresh the local user snapshot from Clerk so avatar/name changes
  // made outside this form are reflected immediately on /me.
  await ensureUserInDB();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...publicProfileSelect,
      email: true, // always visible to the owner
      updatedProfileAt: true,
    },
  });

  return user;
}

/**
 * Update the authenticated user's profile fields.
 * Only profile-specific fields can be changed; returns the updated user.
 */
export async function updateMyProfile(
  userId: string,
  data: {
    displayName?: string | null;
    pronouns?: string | null;
    bio?: string | null;
    publicEmail?: boolean;
  },
) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      ...data,
      updatedProfileAt: new Date(),
    },
    select: publicProfileSelect,
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute a display-friendly name for any user record. */
export function computeDisplayName(user: {
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}): string {
  if (user.displayName) return user.displayName;
  const parts = [user.firstName, user.lastName].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  return user.email ?? 'Unnamed user';
}

/** Get initials for avatar fallback. */
export function computeInitials(user: {
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }
  if (user.displayName) {
    return user.displayName
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
  return '?';
}
