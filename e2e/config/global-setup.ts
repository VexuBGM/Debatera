import { createBallotForJudge } from '../../src/lib/ballots/createBallots';
import { prisma } from '../../src/lib/prisma';
import {
  generateToken,
  getPortalTokenExpiresAt,
  hashToken,
} from '../../src/lib/portal/tokens';

const SEED_IDS = {
  organizerUser: 'e2e_user_organizer',
  judgeUser: 'e2e_user_judge',
  propUserOne: 'e2e_user_prop_1',
  propUserTwo: 'e2e_user_prop_2',
  oppUserOne: 'e2e_user_opp_1',
  oppUserTwo: 'e2e_user_opp_2',
  judgeInstitution: 'e2e_inst_judges',
  propInstitution: 'e2e_inst_prop',
  oppInstitution: 'e2e_inst_opp',
  tournament: 'e2e_tournament_portal',
  judgeParticipant: 'e2e_participant_judge',
  propParticipantOne: 'e2e_participant_prop_1',
  propParticipantTwo: 'e2e_participant_prop_2',
  oppParticipantOne: 'e2e_participant_opp_1',
  oppParticipantTwo: 'e2e_participant_opp_2',
  propTeam: 'e2e_team_prop',
  oppTeam: 'e2e_team_opp',
  round: 'e2e_round_1',
  debate: 'e2e_debate_1',
  judgeAssignment: 'e2e_judge_assignment_1',
  accessLink: 'e2e_access_link_judge',
};

function getE2eBaseUrl(): string {
  return (process.env.E2E_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

function buildPortalUrl(tournamentId: string, token: string): string {
  return `${getE2eBaseUrl()}/tournaments/${encodeURIComponent(tournamentId)}/p#token=${encodeURIComponent(token)}`;
}

function buildBallotUrl(tournamentId: string, ballotId: string, token: string): string {
  return `${getE2eBaseUrl()}/tournaments/${encodeURIComponent(
    tournamentId
  )}/p/ballots/${encodeURIComponent(ballotId)}#token=${encodeURIComponent(token)}`;
}

async function seedPortalFixtures() {
  const token = generateToken();

  await prisma.$transaction(async (tx) => {
    await tx.tournament.deleteMany({ where: { id: SEED_IDS.tournament } });

    await tx.user.upsert({
      where: { id: SEED_IDS.organizerUser },
      update: {
        email: 'e2e.organizer@example.com',
        firstName: 'E2E',
        lastName: 'Organizer',
      },
      create: {
        id: SEED_IDS.organizerUser,
        email: 'e2e.organizer@example.com',
        firstName: 'E2E',
        lastName: 'Organizer',
      },
    });

    await tx.user.upsert({
      where: { id: SEED_IDS.judgeUser },
      update: {
        email: 'e2e.judge@example.com',
        firstName: 'E2E',
        lastName: 'Judge',
      },
      create: {
        id: SEED_IDS.judgeUser,
        email: 'e2e.judge@example.com',
        firstName: 'E2E',
        lastName: 'Judge',
      },
    });

    const debaterUsers = [
      [SEED_IDS.propUserOne, 'e2e.prop.one@example.com', 'Prop', 'One'],
      [SEED_IDS.propUserTwo, 'e2e.prop.two@example.com', 'Prop', 'Two'],
      [SEED_IDS.oppUserOne, 'e2e.opp.one@example.com', 'Opp', 'One'],
      [SEED_IDS.oppUserTwo, 'e2e.opp.two@example.com', 'Opp', 'Two'],
    ] as const;

    for (const [id, email, firstName, lastName] of debaterUsers) {
      await tx.user.upsert({
        where: { id },
        update: { email, firstName, lastName },
        create: { id, email, firstName, lastName },
      });
    }

    const institutions = [
      [SEED_IDS.judgeInstitution, 'E2E Judges Union'],
      [SEED_IDS.propInstitution, 'E2E Proposition Academy'],
      [SEED_IDS.oppInstitution, 'E2E Opposition College'],
    ] as const;

    for (const [id, name] of institutions) {
      await tx.institution.upsert({
        where: { id },
        update: { name, isPublic: true },
        create: { id, name, isPublic: true },
      });
    }

    await tx.tournament.create({
      data: {
        id: SEED_IDS.tournament,
        name: 'E2E Seed Tournament',
        createdByUserId: SEED_IDS.organizerUser,
        isPublic: true,
        settings: {
          create: {
            eventMode: 'IRL',
            pairingSystem: 'MANUAL',
          },
        },
      },
    });

    const tournamentInstitutions = [
      SEED_IDS.judgeInstitution,
      SEED_IDS.propInstitution,
      SEED_IDS.oppInstitution,
    ];

    for (const institutionId of tournamentInstitutions) {
      await tx.tournamentInstitution.create({
        data: {
          tournamentId: SEED_IDS.tournament,
          institutionId,
          status: 'APPROVED',
          requestedByUserId: SEED_IDS.organizerUser,
        },
      });
    }

    await tx.tournamentParticipant.create({
      data: {
        id: SEED_IDS.judgeParticipant,
        tournamentId: SEED_IDS.tournament,
        userId: SEED_IDS.judgeUser,
        institutionId: SEED_IDS.judgeInstitution,
        role: 'JUDGE',
      },
    });

    const debaterParticipants = [
      [SEED_IDS.propParticipantOne, SEED_IDS.propUserOne, SEED_IDS.propInstitution],
      [SEED_IDS.propParticipantTwo, SEED_IDS.propUserTwo, SEED_IDS.propInstitution],
      [SEED_IDS.oppParticipantOne, SEED_IDS.oppUserOne, SEED_IDS.oppInstitution],
      [SEED_IDS.oppParticipantTwo, SEED_IDS.oppUserTwo, SEED_IDS.oppInstitution],
    ] as const;

    for (const [id, userId, institutionId] of debaterParticipants) {
      await tx.tournamentParticipant.create({
        data: {
          id,
          tournamentId: SEED_IDS.tournament,
          userId,
          institutionId,
          role: 'DEBATER',
        },
      });
    }

    await tx.tournamentTeam.create({
      data: {
        id: SEED_IDS.propTeam,
        tournamentId: SEED_IDS.tournament,
        institutionId: SEED_IDS.propInstitution,
        name: 'E2E Proposition 1',
        feedbackCode: 'E2EP01',
        createdByUserId: SEED_IDS.organizerUser,
        members: {
          create: [
            { participantId: SEED_IDS.propParticipantOne },
            { participantId: SEED_IDS.propParticipantTwo },
          ],
        },
      },
    });

    await tx.tournamentTeam.create({
      data: {
        id: SEED_IDS.oppTeam,
        tournamentId: SEED_IDS.tournament,
        institutionId: SEED_IDS.oppInstitution,
        name: 'E2E Opposition 1',
        feedbackCode: 'E2EO01',
        createdByUserId: SEED_IDS.organizerUser,
        members: {
          create: [
            { participantId: SEED_IDS.oppParticipantOne },
            { participantId: SEED_IDS.oppParticipantTwo },
          ],
        },
      },
    });

    await tx.tournamentRound.create({
      data: {
        id: SEED_IDS.round,
        tournamentId: SEED_IDS.tournament,
        number: 1,
        name: 'Round 1',
        motion: 'This House would run browser smoke tests.',
        status: 'IN_PROGRESS',
      },
    });

    await tx.tournamentDebate.create({
      data: {
        id: SEED_IDS.debate,
        roundId: SEED_IDS.round,
        order: 1,
        propTeamId: SEED_IDS.propTeam,
        oppTeamId: SEED_IDS.oppTeam,
        judges: {
          create: {
            id: SEED_IDS.judgeAssignment,
            participantId: SEED_IDS.judgeParticipant,
            role: 'CHAIR',
          },
        },
      },
    });

    await createBallotForJudge(tx, SEED_IDS.debate, SEED_IDS.judgeAssignment);

    await tx.tournamentParticipantAccessLink.create({
      data: {
        id: SEED_IDS.accessLink,
        tournamentId: SEED_IDS.tournament,
        participantId: SEED_IDS.judgeParticipant,
        tokenHash: hashToken(token),
        expiresAt: getPortalTokenExpiresAt(),
      },
    });
  });

  const ballot = await prisma.ballot.findUniqueOrThrow({
    where: { adjudicatorId: SEED_IDS.judgeAssignment },
    select: { id: true },
  });

  process.env.E2E_PORTAL_URL ??= buildPortalUrl(SEED_IDS.tournament, token);
  process.env.E2E_BALLOT_URL ??= buildBallotUrl(
    SEED_IDS.tournament,
    ballot.id,
    token
  );
}

export default async function globalSetup() {
  if (process.env.E2E_SEED !== '1') return;

  await seedPortalFixtures();
}
