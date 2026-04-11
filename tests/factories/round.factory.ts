import type { JudgeRole, PrismaClient, TournamentRound, TournamentRoundStatus } from '@prisma/client';
import { testPrisma } from '@tests/setup/prisma-test-client';
import { createTournamentParticipant } from './participant.factory';
import { createTournament } from './tournament.factory';

let roundCounter = 0;
let debateCounter = 0;

export async function createRound(
  overrides: Partial<TournamentRound> & {
    tournamentId?: string;
    status?: TournamentRoundStatus;
  } = {},
  prisma: PrismaClient = testPrisma
) {
  roundCounter += 1;
  const tournamentId = overrides.tournamentId ?? (await createTournament({}, prisma)).id;

  return prisma.tournamentRound.create({
    data: {
      id: overrides.id,
      tournamentId,
      number: overrides.number ?? roundCounter,
      name: overrides.name ?? `Round ${roundCounter}`,
      motion: overrides.motion ?? 'This House would test the motion.',
      infoSlide: overrides.infoSlide ?? null,
      status: overrides.status ?? 'DRAFT',
      createdAt: overrides.createdAt,
      updatedAt: overrides.updatedAt,
    },
  });
}

export async function createDebate(
  overrides: {
    roundId?: string;
    propTeamId?: string | null;
    oppTeamId?: string | null;
    isBye?: boolean;
    order?: number;
  } = {},
  prisma: PrismaClient = testPrisma
) {
  debateCounter += 1;
  const roundId = overrides.roundId ?? (await createRound({}, prisma)).id;

  return prisma.tournamentDebate.create({
    data: {
      roundId,
      order: overrides.order ?? debateCounter,
      propTeamId: overrides.propTeamId ?? null,
      oppTeamId: overrides.oppTeamId ?? null,
      isBye: overrides.isBye ?? false,
    },
  });
}

export async function createJudgeAssignment(
  overrides: {
    debateId: string;
    participantId?: string;
    tournamentId?: string;
    institutionId?: string;
    role?: JudgeRole;
  },
  prisma: PrismaClient = testPrisma
) {
  const participantId =
    overrides.participantId ??
    (
      await createTournamentParticipant(
        {
          tournamentId: overrides.tournamentId,
          institutionId: overrides.institutionId,
          role: 'JUDGE',
        },
        prisma
      )
    ).id;

  return prisma.tournamentDebateJudge.create({
    data: {
      debateId: overrides.debateId,
      participantId,
      role: overrides.role ?? 'PANELIST',
    },
    include: { participant: { include: { user: true } } },
  });
}
