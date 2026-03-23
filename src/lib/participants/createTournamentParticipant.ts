import { Prisma, TournamentParticipantRole } from '@prisma/client';

import { prisma } from '@/lib/prisma';

type DbClient = Pick<
  typeof prisma,
  'user' | 'tournamentParticipant'
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

export async function createTournamentParticipantForUser(
  db: DbClient,
  input: CreateTournamentParticipantInput
): Promise<TournamentParticipantInsertResult> {
  const user = await db.user.findUnique({
    where: { id: input.userId },
    select: { id: true },
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

  try {
    const createdParticipant = await db.tournamentParticipant.create({
      data: {
        tournamentId: input.tournamentId,
        userId: input.userId,
        institutionId: input.institutionId,
        role: input.role,
      },
      select: { id: true },
    });

    return { participantId: createdParticipant.id, created: true };
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
      throw error;
    }
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
