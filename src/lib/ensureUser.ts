import { auth, clerkClient } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export async function ensureUserInDB() {
  const { userId } = await auth();
  if (!userId) return;

  const existing = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (existing) return;

  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  await prisma.user.upsert({
    where: { clerkId: user.id },
    update: {
      username: user.username ?? user.id,
      imageUrl: user.imageUrl ?? undefined,
    },
    create: {
      clerkId: user.id,
      username: user.username ?? user.id,
      imageUrl: user.imageUrl ?? undefined,
    },
  });
}
