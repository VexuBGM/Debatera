import { auth, clerkClient } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { ensureClaimsForCurrentUser } from '@/lib/identity/claimFlow';

export async function ensureUserInDB() {
  const { userId } = await auth();
  if (!userId) return;

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (existing) {
    // User already in DB – run claim flow in case they have unclaimed Person rows
    await ensureClaimsForCurrentUser().catch((err) => {
      console.error('[ensureUser] Claim flow error (non-fatal):', err);
    });
    return;
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const email =
    user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ?? null;

  await prisma.user.upsert({
    where: { id: user.id },
    update: {
      email: email ?? undefined,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      imageUrl: user.imageUrl ?? undefined,
    },
    create: {
      id: user.id,
      email: email ?? undefined,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      imageUrl: user.imageUrl ?? undefined,
    },
  });

  // Run claim flow for newly created user
  await ensureClaimsForCurrentUser().catch((err) => {
    console.error('[ensureUser] Claim flow error (non-fatal):', err);
  });
}