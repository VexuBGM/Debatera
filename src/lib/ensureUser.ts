import { auth, clerkClient } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export async function ensureUserInDB() {
  const { userId } = await auth();
  if (!userId) return;

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (existing) return;

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const email =
    user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ?? null;

  await prisma.user.upsert({
    where: { id: user.id },
    update: {
      email: email ?? undefined,
      username: user.username ?? undefined,
      imageUrl: user.imageUrl ?? undefined,
    },
    create: {
      id: user.id,
      email: email ?? undefined,
      username: user.username ?? undefined,
      imageUrl: user.imageUrl ?? undefined,
    },
  });
}