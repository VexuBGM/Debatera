import type { PrismaClient, User } from '@prisma/client';
import { testPrisma } from '@tests/setup/prisma-test-client';

let userCounter = 0;

export async function createUser(
  overrides: Partial<User> = {},
  prisma: PrismaClient = testPrisma
) {
  userCounter += 1;
  const id = overrides.id ?? `user_test_${userCounter}`;
  const email = overrides.email ?? `${id}@example.com`;

  return prisma.user.create({
    data: {
      id,
      email,
      firstName: overrides.firstName ?? 'Test',
      lastName: overrides.lastName ?? `User ${userCounter}`,
      imageUrl: overrides.imageUrl ?? null,
      username: overrides.username ?? null,
      bio: overrides.bio ?? null,
      pronouns: overrides.pronouns ?? null,
      displayName: overrides.displayName ?? null,
      publicEmail: overrides.publicEmail ?? false,
      updatedProfileAt: overrides.updatedProfileAt ?? null,
      seenTutorials: overrides.seenTutorials ?? [],
      createdAt: overrides.createdAt,
      updatedAt: overrides.updatedAt,
    },
  });
}
