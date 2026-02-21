/**
 * Claim Flow – Auto-link Person ↔ User
 *
 * When a Clerk user signs in, check if any unclaimed Person rows share
 * the same normalized email. If so, claim them and backfill
 * TournamentParticipant.userId.
 */

import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { normalizeEmail } from '@/lib/identity/tokenUtils';

/**
 * Attempt to claim Person rows matching the current Clerk user's email.
 *
 * Safe to call multiple times (idempotent). Should be called after login
 * in the root layout or ensureUserInDB flow.
 */
export async function ensureClaimsForCurrentUser(): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;

  // Get the user's verified email from Clerk
  const client = await clerkClient();
  const clerkUser = await client.users.getUser(userId);

  const primaryEmail =
    clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
      ?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    null;

  const normalizedEmail = normalizeEmail(primaryEmail);
  if (!normalizedEmail) return;

  // Find unclaimed Person rows with matching email
  const matchingPersons = await prisma.person.findMany({
    where: {
      emailNormalized: normalizedEmail,
      OR: [
        { claimedByUserId: null },
        { claimedByUserId: userId }, // already claimed by this user
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  if (matchingPersons.length === 0) return;

  // Claim unclaimed persons
  const unclaimedPersons = matchingPersons.filter((p) => !p.claimedByUserId);

  if (unclaimedPersons.length > 1) {
    console.warn(
      `[claim-flow] Multiple unclaimed Person rows for email=${normalizedEmail}, userId=${userId}. ` +
        `Claiming all. IDs: ${unclaimedPersons.map((p) => p.id).join(', ')}`
    );
  }

  // Use a transaction to atomically claim + backfill
  await prisma.$transaction(async (tx) => {
    // Step 1: Claim all unclaimed persons with matching email
    for (const person of unclaimedPersons) {
      await tx.person.update({
        where: { id: person.id },
        data: {
          claimedByUserId: userId,
          claimedAt: new Date(),
        },
      });
    }

    // Step 2: Backfill TournamentParticipant.userId for all this user's claimed persons
    const allClaimedPersonIds = matchingPersons.map((p) => p.id);

    // Find participants without userId that belong to claimed persons
    const participantsToBackfill = await tx.tournamentParticipant.findMany({
      where: {
        personId: { in: allClaimedPersonIds },
        userId: null,
      },
      select: { id: true, tournamentId: true },
    });

    // Find existing participants that already have this userId (to avoid unique violations)
    const existingUserParticipants = await tx.tournamentParticipant.findMany({
      where: { userId },
      select: { tournamentId: true },
    });
    const tournamentsWithUser = new Set(
      existingUserParticipants.map((p) => p.tournamentId)
    );

    // Backfill only where there's no unique constraint violation
    for (const participant of participantsToBackfill) {
      if (tournamentsWithUser.has(participant.tournamentId)) {
        console.warn(
          `[claim-flow] Skipping backfill for participant ${participant.id} ` +
            `in tournament ${participant.tournamentId}: userId=${userId} already has a participant row.`
        );
        continue;
      }

      await tx.tournamentParticipant.update({
        where: { id: participant.id },
        data: { userId },
      });

      // Track so subsequent iterations won't duplicate
      tournamentsWithUser.add(participant.tournamentId);
    }
  });
}
