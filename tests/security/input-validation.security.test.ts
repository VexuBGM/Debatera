import { describe, expect, it } from 'vitest';
import { POST as submitBallot } from '@/app/api/ballots/[ballotId]/submit/route';
import { buildValidBallotSubmission } from '@tests/factories/ballot.factory';
import { createSingleDebateScenario } from '@tests/fixtures/tournament-scenarios';
import { createJsonRequest, responseJson } from '@tests/helpers/api-request';
import { mockAuthenticatedUser } from '@tests/setup/clerk-mock';

describe('input validation security', () => {
  it('rejects malformed ballot submissions without writing scores', async () => {
    const scenario = await createSingleDebateScenario('IN_PROGRESS');
    mockAuthenticatedUser({ id: scenario.judgeUser.id, email: scenario.judgeUser.email! });
    const body = buildValidBallotSubmission();
    body.speeches[0].score = 9999;

    const response = await submitBallot(
      createJsonRequest(`http://localhost/api/ballots/${scenario.ballot.id}/submit`, {
        method: 'POST',
        body,
      }),
      { params: Promise.resolve({ ballotId: scenario.ballot.id }) }
    );
    const json = await responseJson<{ error: string }>(response);

    expect(response.status).toBe(422);
    expect(json.error).toBe('Validation failed');
  });
});
