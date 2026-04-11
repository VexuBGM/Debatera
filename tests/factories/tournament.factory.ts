import type { EventMode, PairingSystem, PrismaClient, Tournament } from '@prisma/client';
import { testPrisma } from '@tests/setup/prisma-test-client';
import { createUser } from './user.factory';

let tournamentCounter = 0;

export async function createTournament(
  overrides: Partial<Tournament> & {
    settings?: {
      teamSizeMin?: number;
      teamSizeMax?: number;
      eventMode?: EventMode;
      pairingSystem?: PairingSystem;
      showDebaterNames?: boolean;
      speakerTopN?: number | null;
      hideSpeakerPoints?: boolean;
    };
  } = {},
  prisma: PrismaClient = testPrisma
) {
  tournamentCounter += 1;
  const createdByUserId =
    overrides.createdByUserId ?? (await createUser({ id: `organizer_${tournamentCounter}` }, prisma)).id;

  return prisma.tournament.create({
    data: {
      id: overrides.id,
      name: overrides.name ?? `Tournament ${tournamentCounter}`,
      createdByUserId,
      isPublic: overrides.isPublic ?? false,
      registrationClosesAt: overrides.registrationClosesAt ?? null,
      teamMinSize: overrides.teamMinSize ?? 2,
      teamMaxSize: overrides.teamMaxSize ?? 5,
      createdAt: overrides.createdAt,
      settings: {
        create: {
          teamSizeMin: overrides.settings?.teamSizeMin ?? 2,
          teamSizeMax: overrides.settings?.teamSizeMax ?? 5,
          eventMode: overrides.settings?.eventMode ?? 'IRL',
          pairingSystem: overrides.settings?.pairingSystem ?? 'SWISS',
          showDebaterNames: overrides.settings?.showDebaterNames ?? false,
          speakerTopN: overrides.settings?.speakerTopN,
          hideSpeakerPoints: overrides.settings?.hideSpeakerPoints ?? false,
        },
      },
    },
    include: { settings: true },
  });
}
