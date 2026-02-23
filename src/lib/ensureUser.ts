import { auth, clerkClient } from '@clerk/nextjs/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

export async function ensureUserInDB() {
  const { userId } = await auth();
  if (!userId) return;

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const email =
    user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ?? null;

  const data = {
    email: email ?? undefined,
    firstName: user.firstName ?? undefined,
    lastName: user.lastName ?? undefined,
    imageUrl: user.imageUrl ?? undefined,
  };

  try {
    await prisma.$transaction(async tx => {
      const byId = await tx.user.findUnique({ where: { id: userId } });
      if (byId) {
        await tx.user.update({
          where: { id: userId },
          data,
        });
        return;
      }

      if (email) {
        const byEmail = await tx.user.findUnique({ where: { email } });
        if (byEmail) {
          await tx.user.update({
            where: { email },
            data: { id: userId, ...data },
          });
          return;
        }
      }

      await tx.user.create({
        data: { id: userId, ...data },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      console.error('[ensureUser] P2002 conflict', { userId, email });
      return;
    }

    throw error;
  }
}