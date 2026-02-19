/**
 * Display helpers for Person records.
 *
 * Parallel to `src/lib/users/displayName.ts` but for the Person model.
 */

export interface PersonLike {
  firstName?: string | null;
  lastName?: string | null;
  emailNormalized?: string | null;
}

/**
 * Build a display name from a Person record.
 *
 * Priority:
 *  1. "FirstName LastName" (both present)
 *  2. whichever of firstName / lastName exists
 *  3. email (before the @)
 *  4. "Unknown Participant"
 */
export function displayNameForPerson(person: PersonLike | null | undefined): string {
  if (!person) return 'Unknown Participant';

  const first = person.firstName?.trim();
  const last = person.lastName?.trim();

  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (last) return last;

  if (person.emailNormalized) {
    return person.emailNormalized.split('@')[0];
  }

  return 'Unknown Participant';
}
