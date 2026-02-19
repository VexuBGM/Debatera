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

  // Find candidate Person rows with matching email
  const candidates = await prisma.person.findMany({
    where: {
      emailNormalized: normalizedEmail,
      OR: [{ claimedByUserId: null }, { claimedByUserId: userId }],
    },
    include: {
      _count: { select: { tournamentParticipants: true } },
    },
  });

  if (candidates.length === 0) return;

  const sortedCandidates = [...candidates].sort((a, b) => {
    const countDiff = b._count.tournamentParticipants - a._count.tournamentParticipants;
    if (countDiff !== 0) return countDiff;
    const updatedDiff = b.updatedAt.getTime() - a.updatedAt.getTime();
    if (updatedDiff !== 0) return updatedDiff;
    const createdDiff = b.createdAt.getTime() - a.createdAt.getTime();
    if (createdDiff !== 0) return createdDiff;
    return a.id.localeCompare(b.id);
  });

  const chosen = sortedCandidates[0];

  if (sortedCandidates.length > 1) {
    console.warn(
      `[claim-flow] Multiple Person rows for email`,
      {
        userId,
        emailNormalized: normalizedEmail,
        candidatePersonIds: sortedCandidates.map((p) => p.id),
        chosenPersonId: chosen.id,
      }
    );
  }

  const alreadyClaimedByUser = sortedCandidates.filter(
    (person) => person.claimedByUserId === userId
  );

  const eligiblePersonIds = Array.from(
    new Set([chosen.id, ...alreadyClaimedByUser.map((p) => p.id)])
  );

  // Use a transaction to atomically claim + backfill
  await prisma.$transaction(async (tx) => {
    // Step 1: Claim chosen person if unclaimed
    if (!chosen.claimedByUserId) {
      await tx.person.update({
        where: { id: chosen.id },
        data: {
          claimedByUserId: userId,
          claimedAt: new Date(),
        },
      });
    }

    // Step 2: Backfill TournamentParticipant.userId for eligible persons
    const participantsToBackfill = await tx.tournamentParticipant.findMany({
      where: {
        personId: { in: eligiblePersonIds },
        userId: null,
      },
      select: { id: true, tournamentId: true },
    });

    const existingUserParticipants = await tx.tournamentParticipant.findMany({
      where: { userId },
      select: { tournamentId: true },
    });
    const tournamentsWithUser = new Set(
      existingUserParticipants.map((p) => p.tournamentId)
    );

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

      tournamentsWithUser.add(participant.tournamentId);
    }
  });
}
