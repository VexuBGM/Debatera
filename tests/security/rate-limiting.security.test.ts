import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST as createModificationRequest } from '@/app/api/tournaments/[id]/portal/ballots/[ballotId]/modification-request/route';
import { createBallot } from '@tests/factories/ballot.factory';
import { createInstitution } from '@tests/factories/institution.factory';
import { createPortalAccessLink } from '@tests/factories/portal.factory';
import { createTournamentParticipant } from '@tests/factories/participant.factory';
import { createDebate, createJudgeAssignment, createRound } from '@tests/factories/round.factory';
import { createTournamentTeam } from '@tests/factories/team.factory';
import { createTournament } from '@tests/factories/tournament.factory';
import { createUser } from '@tests/factories/user.factory';
import { createJsonRequest } from '@tests/helpers/api-request';
import { testPrisma } from '@tests/setup/prisma-test-client';

function createPortalModificationRequest(
  tournamentId: string,
  ballotId: string,
  token: string,
  ip: string,
) {
  return createModificationRequest(
    createJsonRequest(`http://localhost/api/tournaments/${tournamentId}/portal/ballots/${ballotId}/modification-request`, {
      method: 'POST',
      body: { reason: 'Please reopen the ballot.' },
      headers: {
        authorization: `Bearer ${token}`,
        'x-forwarded-for': ip,
      },
    }),
    { params: Promise.resolve({ id: tournamentId, ballotId }) }
  );
}

async function createSubmittedBallotScenario(prefix: string) {
  const organizer = await createUser({ id: `${prefix}_organizer`, email: `${prefix}_organizer@example.com` });
  const judgeUser = await createUser({ id: `${prefix}_judge_user`, email: `${prefix}_judge@example.com` });
  const institution = await createInstitution({ id: `${prefix}_institution`, name: `${prefix} Institution` });
  const tournament = await createTournament({ id: `${prefix}_tournament`, createdByUserId: organizer.id });
  const prop = await createTournamentTeam({
    tournamentId: tournament.id,
    institutionId: institution.id,
    createdByUserId: organizer.id,
    name: `${prefix} Prop`,
  });
  const opp = await createTournamentTeam({
    tournamentId: tournament.id,
    institutionId: institution.id,
    createdByUserId: organizer.id,
    name: `${prefix} Opp`,
  });
  const judgeParticipant = await createTournamentParticipant({
    tournamentId: tournament.id,
    institutionId: institution.id,
    userId: judgeUser.id,
    role: 'JUDGE',
  });
  const round = await createRound({
    id: `${prefix}_round`,
    tournamentId: tournament.id,
    status: 'COMPLETED',
  });
  const debate = await createDebate({
    roundId: round.id,
    propTeamId: prop.team.id,
    oppTeamId: opp.team.id,
    order: 0,
  });
  const assignment = await createJudgeAssignment({
    debateId: debate.id,
    participantId: judgeParticipant.id,
    role: 'CHAIR',
  });
  const ballot = await createBallot({
    debateId: debate.id,
    adjudicatorId: assignment.id,
  });

  await testPrisma.ballot.update({
    where: { id: ballot.id },
    data: {
      status: 'SUBMITTED',
      vote: 'PROPOSITION',
      propTotal: 266,
      oppTotal: 258,
      submittedAt: new Date(),
    },
  });
  const { token } = await createPortalAccessLink({
    tournamentId: tournament.id,
    participantId: judgeParticipant.id,
    token: `${prefix}_token_value`,
  });

  return {
    scenario: {
      tournament,
      ballot,
    },
    token,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('rate limiting on portal ballot API', () => {
  it('portal ballot route allows N requests per window (confirm the limit constant)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-14T10:00:00.000Z'));

    const { scenario, token } = await createSubmittedBallotScenario('rate_limit_allow');

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const response = await createPortalModificationRequest(
        scenario.tournament.id,
        scenario.ballot.id,
        token,
        '198.51.100.10'
      );

      expect(response.status).not.toBe(429);
    }
  });

  it('portal ballot route returns 429 with Retry-After header after exceeding limit', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-14T10:05:00.000Z'));

    const { scenario, token } = await createSubmittedBallotScenario('rate_limit_block');

    for (let attempt = 0; attempt < 20; attempt += 1) {
      await createPortalModificationRequest(
        scenario.tournament.id,
        scenario.ballot.id,
        token,
        '198.51.100.20'
      );
    }

    const response = await createPortalModificationRequest(
      scenario.tournament.id,
      scenario.ballot.id,
      token,
      '198.51.100.20'
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('60');
  });

  it('two different subjects (different IPs / tokens) have independent buckets', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-14T10:10:00.000Z'));

    const first = await createSubmittedBallotScenario('rate_limit_independent_one');
    const second = await createSubmittedBallotScenario('rate_limit_independent_two');

    for (let attempt = 0; attempt < 20; attempt += 1) {
      await createPortalModificationRequest(
        first.scenario.tournament.id,
        first.scenario.ballot.id,
        first.token,
        '198.51.100.30'
      );
    }

    const limitedResponse = await createPortalModificationRequest(
      first.scenario.tournament.id,
      first.scenario.ballot.id,
      first.token,
      '198.51.100.30'
    );
    const independentResponse = await createPortalModificationRequest(
      second.scenario.tournament.id,
      second.scenario.ballot.id,
      second.token,
      '198.51.100.31'
    );

    expect(limitedResponse.status).toBe(429);
    expect(independentResponse.status).not.toBe(429);
  });
});

describe('rate limiting headers', () => {
  it('successful responses do not include a Retry-After header', async () => {
    // rateLimit() only sets Retry-After on 429 responses — successful requests
    // carry no rate-limit headers. This verifies that normal traffic is clean.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-14T10:15:00.000Z'));

    const { scenario, token } = await createSubmittedBallotScenario('rate_limit_headers');

    const response = await createPortalModificationRequest(
      scenario.tournament.id,
      scenario.ballot.id,
      token,
      '198.51.100.40'
    );

    expect(response.status).not.toBe(429);
    expect(response.headers.get('Retry-After')).toBeNull();
  });
});
