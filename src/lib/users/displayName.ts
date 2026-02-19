/**
 * Canonical display-name helpers.
 *
 * Every piece of UI and server code that needs to show a human-readable user
 * name should call one of these functions so the format is consistent and easy
 * to change later.
 */

// ---------------------------------------------------------------------------
// Types accepted by each helper
// ---------------------------------------------------------------------------

/** Minimal shape coming from a Prisma `User` (or a select that includes these fields). */
export interface DbUserLike {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

/** Minimal shape coming from the Clerk SDK `User` object. */
export interface ClerkUserLike {
  firstName?: string | null;
  lastName?: string | null;
  emailAddresses?: { emailAddress: string }[];
  primaryEmailAddressId?: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a display name from a DB user record.
 *
 * Priority:
 *  1. "FirstName LastName" (both present)
 *  2. whichever of firstName / lastName exists
 *  3. email (before the @)
 *  4. "Unknown User"
 */
export function displayNameFromDbUser(user: DbUserLike | null | undefined): string {
  if (!user) return 'Unknown User';

  const first = user.firstName?.trim();
  const last = user.lastName?.trim();

  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (last) return last;

  if (user.email) return user.email.split('@')[0];

  return 'Unknown User';
}

/**
 * Build a display name from a Clerk user object.
 *
 * Same priority order as `displayNameFromDbUser` but reads from the Clerk SDK
 * shape.
 */
export function displayNameFromClerkUser(user: ClerkUserLike | null | undefined): string {
  if (!user) return 'Unknown User';

  const first = user.firstName?.trim();
  const last = user.lastName?.trim();

  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (last) return last;

  const primaryEmail = user.emailAddresses?.find(
    (e) => e.emailAddress
  )?.emailAddress;
  if (primaryEmail) return primaryEmail.split('@')[0];

  return 'Unknown User';
}

/**
 * Return the first character(s) suitable for an avatar fallback.
 */
export function initialsFromDbUser(user: DbUserLike | null | undefined): string {
  if (!user) return '?';

  const first = user.firstName?.trim();
  const last = user.lastName?.trim();

  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  if (first) return first.slice(0, 2).toUpperCase();
  if (last) return last.slice(0, 2).toUpperCase();

  if (user.email) return user.email[0].toUpperCase();

  return '?';
}

// ---------------------------------------------------------------------------
// Person-aware helpers (for participants who may not have a User account)
// ---------------------------------------------------------------------------

/** Minimal shape from Prisma Person model */
export interface PersonLike {
  firstName?: string | null;
  lastName?: string | null;
  emailNormalized?: string | null;
}

/**
 * Build a display name from a participant that has both Person and optional User.
 *
 * Prefers Person data (always present), falls back to User if available.
 */
export function displayNameFromParticipant(
  person: PersonLike | null | undefined,
  user?: DbUserLike | null
): string {
  // Try Person first
  if (person) {
    const first = person.firstName?.trim();
    const last = person.lastName?.trim();
    if (first && last) return `${first} ${last}`;
    if (first) return first;
    if (last) return last;
    if (person.emailNormalized) return person.emailNormalized.split('@')[0];
  }

  // Fallback to User
  if (user) return displayNameFromDbUser(user);

  return 'Unknown Participant';
}

/**
 * Return initials from a participant (Person + optional User).
 */
export function initialsFromParticipant(
  person: PersonLike | null | undefined,
  user?: DbUserLike | null
): string {
  if (person) {
    const first = person.firstName?.trim();
    const last = person.lastName?.trim();
    if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
    if (first) return first.slice(0, 2).toUpperCase();
    if (last) return last.slice(0, 2).toUpperCase();
    if (person.emailNormalized) return person.emailNormalized[0].toUpperCase();
  }
  if (user) return initialsFromDbUser(user);
  return '?';
}
