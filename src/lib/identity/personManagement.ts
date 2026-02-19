/**
 * Identity Module – Person Management
 *
 * Helpers for creating/finding Person records and managing
 * institution roster entries.
 */

import { prisma } from '@/lib/prisma';
import { normalizeEmail } from './tokenUtils';

// ============================================================================
// Get or create Person
// ============================================================================

interface GetOrCreatePersonInput {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

/**
 * Find an existing unclaimed Person by normalized email, or create a new one.
 *
 * If email is provided and a Person with that normalized email already exists,
 * returns the existing Person. Otherwise creates a new one.
 */
export async function getOrCreatePerson(input: GetOrCreatePersonInput) {
  const emailNorm = normalizeEmail(input.email);

  // If we have an email, try to find existing person
  if (emailNorm) {
    const existing = await prisma.person.findUnique({
      where: { emailNormalized: emailNorm },
    });
    if (existing) return existing;
  }

  return prisma.person.create({
    data: {
      emailNormalized: emailNorm,
      firstName: (input.firstName ?? '').trim(),
      lastName: (input.lastName ?? '').trim(),
    },
  });
}

/**
 * Add a Person to an institution's roster (idempotent).
 */
export async function addPersonToInstitutionRoster(
  institutionId: string,
  personId: string,
  createdByUserId?: string
) {
  return prisma.institutionRosterEntry.upsert({
    where: {
      institutionId_personId: { institutionId, personId },
    },
    update: {},
    create: {
      institutionId,
      personId,
      createdByUserId: createdByUserId ?? null,
    },
  });
}
