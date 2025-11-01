import { auth, clerkClient } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function ensureUserInDB() {
  const { userId } = await auth();
  if (!userId) return;

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (existing) return;

  // clerkClient in this project is an async function that returns a client
  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  const email =
    user.emailAddresses.find((e: any) => e.id === user.primaryEmailAddressId)?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ?? null;

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || undefined;
  const usernameFallback = fullName ?? (email ? email.split('@')[0] : undefined);
  const username = user.username ?? usernameFallback;

  try {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: email ?? undefined,
        username: username ?? undefined,
        imageUrl: user.imageUrl ?? undefined,
      },
      create: {
        id: user.id,
        email: email ?? undefined,
        username: username ?? undefined,
        imageUrl: user.imageUrl ?? undefined,
      },
    });
  } catch (err: any) {
    // If another row already uses this email, upsert create will fail with P2002.
    // Handle that gracefully by updating the existing user record with that email.
    const target = err?.meta?.target;
    const targetHasEmail = Array.isArray(target) ? target.includes('email') : String(target).includes('email');

    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002' &&
      targetHasEmail
    ) {
      if (!email) throw err;

      const existingByEmail = await prisma.user.findUnique({ where: { email } });
      if (existingByEmail) {
        // Update the existing user (by email) with the fetched Clerk data.
        // Note: we intentionally do not attempt to change primary keys or reassign relations here.
        await prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            username: username ?? undefined,
            imageUrl: user.imageUrl ?? undefined,
          },
        });
        console.warn(
          `ensureUserInDB: email ${email} already exists for user ${existingByEmail.id}; updated that record instead of creating ${user.id}`
        );
        return;
      }
    }

    throw err;
  }
}
