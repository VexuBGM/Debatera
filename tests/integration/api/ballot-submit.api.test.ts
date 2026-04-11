import { describe, expect, it } from 'vitest';
import { POST } from '@/app/api/ballots/[ballotId]/submit/route';
import { mockAuthenticatedUser } from '@tests/setup/clerk-mock';
import { testPrisma } from '@tests/setup/prisma-test-client';
import { buildValidBallotSubmission } from '@tests/factories/ballot.factory';
import { createSingleDebateScenario } from '@tests/fixtures/tournament-scenarios';
import { createJsonRequest, responseJson } from '@tests/helpers/api-request';
import type { SpeechRole } from '@prisma/client';

function scenarioSpeakerMap(scenario: Awaited<ReturnType<typeof createSingleDebateScenario>>) {
  return {
    PROP_1: scenario.prop.members[0].id,
    PROP_2: scenario.prop.members[1].id,
    PROP_3: scenario.prop.members[2].id,
    PROP_REPLY: scenario.prop.members[0].id,
    OPP_1: scenario.opp.members[0].id,
    OPP_2: scenario.opp.members[1].id,
    OPP_3: scenario.opp.members[2].id,
    OPP_REPLY: scenario.opp.members[0].id,
  } satisfies Record<SpeechRole, string>;
}

describe('POST /api/ballots/[ballotId]/submit', () => {
  it('submits the owning judge ballot and computes the result when all ballots are in', async () => {
    const scenario = await createSingleDebateScenario('IN_PROGRESS');
    mockAuthenticatedUser({
      id: scenario.judgeUser.id,
      email: scenario.judgeUser.email!,
    });

    const submission = buildValidBallotSubmission('PROPOSITION', scenarioSpeakerMap(scenario));
    const response = await POST(
      createJsonRequest(`http://localhost/api/ballots/${scenario.ballot.id}/submit`, {
        method: 'POST',
        body: submission,
      }),
      { params: Promise.resolve({ ballotId: scenario.ballot.id }) }
    );
    const body = await responseJson<{ success: boolean; debateResultComputed: boolean; winningSide: string }>(response);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      debateResultComputed: true,
      winningSide: 'PROPOSITION',
    });

    const ballot = await testPrisma.ballot.findUniqueOrThrow({
      where: { id: scenario.ballot.id },
      include: { speeches: true },
    });
    expect(ballot.status).toBe('SUBMITTED');
    expect(Number(ballot.propTotal)).toBe(266);
    expect(Number(ballot.oppTotal)).toBe(258);
    expect(ballot.speeches.every((speech) => speech.score !== null)).toBe(true);

    const result = await testPrisma.debateResult.findUniqueOrThrow({
      where: { debateId: scenario.debate.id },
    });
    expect(result.winningTeamId).toBe(scenario.prop.team.id);
  });

  it('rejects unauthenticated submissions before touching the ballot', async () => {
    const scenario = await createSingleDebateScenario('IN_PROGRESS');

    const response = await POST(
      createJsonRequest(`http://localhost/api/ballots/${scenario.ballot.id}/submit`, {
        method: 'POST',
        body: buildValidBallotSubmission(),
      }),
      { params: Promise.resolve({ ballotId: scenario.ballot.id }) }
    );

    expect(response.status).toBe(401);
  });

  it('rejects a ballot owned by a different judge', async () => {
    const scenario = await createSingleDebateScenario('IN_PROGRESS');
    mockAuthenticatedUser({
      id: 'other_judge',
      email: 'other@example.com',
    });

    const response = await POST(
      createJsonRequest(`http://localhost/api/ballots/${scenario.ballot.id}/submit`, {
        method: 'POST',
        body: buildValidBallotSubmission(),
      }),
      { params: Promise.resolve({ ballotId: scenario.ballot.id }) }
    );

    expect(response.status).toBe(403);
  });
});
