import type { Ballot, PrismaClient, Side, SpeechRole } from '@prisma/client';
import { testPrisma } from '@tests/setup/prisma-test-client';
import { SPEECH_ROLE_SIDE, WSDC_SPEECH_ORDER } from '@/lib/ballots/constants';
import type { SubmitBallotInput } from '@/lib/ballots/validation';

const propositionScores: Record<SpeechRole, number> = {
  PROP_1: 76,
  PROP_2: 76,
  PROP_3: 76,
  PROP_REPLY: 38,
  OPP_1: 74,
  OPP_2: 74,
  OPP_3: 74,
  OPP_REPLY: 36,
};

const oppositionScores: Record<SpeechRole, number> = {
  PROP_1: 73,
  PROP_2: 73,
  PROP_3: 73,
  PROP_REPLY: 36,
  OPP_1: 76,
  OPP_2: 76,
  OPP_3: 76,
  OPP_REPLY: 38,
};

export function buildValidBallotSubmission(
  winningSide: Side = 'PROPOSITION',
  speakerIds: Partial<Record<SpeechRole, string>> = {}
): SubmitBallotInput {
  const scores = winningSide === 'PROPOSITION' ? propositionScores : oppositionScores;

  return {
    vote: winningSide,
    privateNotes: 'Clear decision.',
    speeches: WSDC_SPEECH_ORDER.map((role) => ({
      role,
      speakerId: speakerIds[role] ?? `speaker_${role.toLowerCase()}`,
      speakerName: null,
      score: scores[role],
      comment: `${role} comment`,
    })),
  };
}

export async function createBallot(
  overrides: Partial<Ballot> & {
    debateId: string;
    adjudicatorId: string;
  },
  prisma: PrismaClient = testPrisma
) {
  return prisma.ballot.create({
    data: {
      debateId: overrides.debateId,
      adjudicatorId: overrides.adjudicatorId,
      status: overrides.status ?? 'DRAFT',
      vote: overrides.vote ?? null,
      propTotal: overrides.propTotal ?? null,
      oppTotal: overrides.oppTotal ?? null,
      privateNotes: overrides.privateNotes ?? null,
      submittedAt: overrides.submittedAt ?? null,
      reopenedAt: overrides.reopenedAt ?? null,
      reopenedByUserId: overrides.reopenedByUserId ?? null,
      speeches: {
        create: WSDC_SPEECH_ORDER.map((role) => ({
          role,
          side: SPEECH_ROLE_SIDE[role],
        })),
      },
    },
    include: { speeches: true },
  });
}
