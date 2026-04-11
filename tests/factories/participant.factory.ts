import type { PrismaClient, TournamentParticipant, TournamentParticipantRole } from '@prisma/client';
import { testPrisma } from '@tests/setup/prisma-test-client';
import { createInstitution } from './institution.factory';
import { createTournament } from './tournament.factory';
import { createUser } from './user.factory';

let participantCounter = 0;

export async function createTournamentParticipant(
  overrides: Partial<TournamentParticipant> & {
    tournamentId?: string;
    institutionId?: string;
    userId?: string;
    role?: TournamentParticipantRole;
  } = {},
  prisma: PrismaClient = testPrisma
) {
  participantCounter += 1;
  const tournamentId = overrides.tournamentId ?? (await createTournament({}, prisma)).id;
  const institutionId = overrides.institutionId ?? (await createInstitution({}, prisma)).id;
  const userId = overrides.userId ?? (await createUser({ id: `participant_user_${participantCounter}` }, prisma)).id;

  return prisma.tournamentParticipant.create({
    data: {
      id: overrides.id,
      tournamentId,
      institutionId,
      userId,
      role: overrides.role ?? 'DEBATER',
      createdAt: overrides.createdAt,
    },
  });
}
