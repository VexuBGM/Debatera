import { Prisma, TournamentParticipantRole } from '@prisma/client';

import { prisma } from '@/lib/prisma';

type DbClient = Pick<
  typeof prisma,
  'user' | 'tournamentParticipant' | '$queryRaw' | '$executeRaw' | '$transaction'
>;

interface CreateTournamentParticipantInput {
  tournamentId: string;
  userId: string;
  institutionId: string;
  role: TournamentParticipantRole;
}

interface TournamentParticipantInsertResult {
  participantId: string;
  created: boolean;
}

function generateTextId() {
  return `c${Date.now().toString(36)}${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
}

function normalizeEmail(email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase();
  return normalized && normalized.length > 0 ? normalized : null;
}

function deriveNames(user: {
  firstName: string | null;
  lastName: string | null;
  displayName?: string | null;
  email: string | null;
}) {
  const firstName =
    user.firstName?.trim() ||
    user.displayName?.trim() ||
    user.email?.split('@')[0]?.trim() ||
    'Guest';
  const lastName = user.lastName?.trim() || '';

  return { firstName, lastName };
}

async function findOrCreatePersonId(
  db: DbClient,
  userId: string,
  user: {
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    displayName?: string | null;
  }
) {
  const emailNormalized = normalizeEmail(user.email);

  const existingByUser = await db.$queryRaw<
    Array<{ id: string; claimedByUserId: string | null }>
  >(Prisma.sql`
    SELECT id, "claimedByUserId"
    FROM "Person"
    WHERE "claimedByUserId" = ${userId}
    LIMIT 1
  `);

  if (existingByUser[0]) {
    if (!existingByUser[0].claimedByUserId) {
      await db.$executeRaw(Prisma.sql`
        UPDATE "Person"
        SET "claimedByUserId" = ${userId},
            "claimedAt" = NOW(),
            "updatedAt" = NOW()
        WHERE id = ${existingByUser[0].id}
      `);
    }

    return existingByUser[0].id;
  }

  if (emailNormalized) {
    const existingByEmail = await db.$queryRaw<
      Array<{ id: string; claimedByUserId: string | null }>
    >(Prisma.sql`
      SELECT id, "claimedByUserId"
      FROM "Person"
      WHERE "emailNormalized" = ${emailNormalized}
      LIMIT 1
    `);

    if (existingByEmail[0]) {
      if (!existingByEmail[0].claimedByUserId) {
        await db.$executeRaw(Prisma.sql`
          UPDATE "Person"
          SET "claimedByUserId" = ${userId},
              "claimedAt" = NOW(),
              "updatedAt" = NOW()
          WHERE id = ${existingByEmail[0].id}
        `);
      }

      return existingByEmail[0].id;
    }
  }

  const personId = generateTextId();
  const { firstName, lastName } = deriveNames(user);

  await db.$executeRaw(Prisma.sql`
    INSERT INTO "Person" (
      id,
      "emailNormalized",
      "firstName",
      "lastName",
      "claimedByUserId",
      "claimedAt",
      "createdAt",
      "updatedAt"
    ) VALUES (
      ${personId},
      ${emailNormalized},
      ${firstName},
      ${lastName},
      ${userId},
      NOW(),
      NOW(),
      NOW()
    )
  `);

  return personId;
}

export async function createTournamentParticipantForUser(
  db: DbClient,
  input: CreateTournamentParticipantInput
): Promise<TournamentParticipantInsertResult> {
  const user = await db.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      displayName: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const existingParticipant = await db.tournamentParticipant.findUnique({
    where: {
      tournamentId_userId: {
        tournamentId: input.tournamentId,
        userId: input.userId,
      },
    },
    select: { id: true },
  });

  if (existingParticipant) {
    return { participantId: existingParticipant.id, created: false };
  }

  const personId = await findOrCreatePersonId(db, input.userId, user);
  const participantId = generateTextId();

  const inserted = await db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    INSERT INTO "TournamentParticipant" (
      id,
      "tournamentId",
      "userId",
      "institutionId",
      role,
      "createdAt",
      "personId"
    )
    VALUES (
      ${participantId},
      ${input.tournamentId},
      ${input.userId},
      ${input.institutionId},
      ${input.role}::"TournamentParticipantRole",
      NOW(),
      ${personId}
    )
    ON CONFLICT ("tournamentId", "userId") DO NOTHING
    RETURNING id
  `);

  if (inserted[0]?.id) {
    return { participantId: inserted[0].id, created: true };
  }

  const currentParticipant = await db.tournamentParticipant.findUnique({
    where: {
      tournamentId_userId: {
        tournamentId: input.tournamentId,
        userId: input.userId,
      },
    },
    select: { id: true },
  });

  if (!currentParticipant) {
    throw new Error('Failed to create tournament participant');
  }

  return { participantId: currentParticipant.id, created: false };
}
