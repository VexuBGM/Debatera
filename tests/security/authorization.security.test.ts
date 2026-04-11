import { describe, expect, it } from 'vitest';
import { POST as submitBallot } from '@/app/api/ballots/[ballotId]/submit/route';
import { PATCH as updateSettings } from '@/app/api/tournaments/[id]/settings/route';
import { buildValidBallotSubmission } from '@tests/factories/ballot.factory';
import { createSingleDebateScenario } from '@tests/fixtures/tournament-scenarios';
import { createJsonRequest } from '@tests/helpers/api-request';
import { createUser } from '@tests/factories/user.factory';
import { mockAuthenticatedUser } from '@tests/setup/clerk-mock';

describe('role-based authorization security', () => {
  it('blocks a judge from submitting another judge user ballot', async () => {
    const scenario = await createSingleDebateScenario('IN_PROGRESS');
    const otherJudge = await createUser({ id: 'other_judge_security', email: 'other-judge@example.com' });
    mockAuthenticatedUser({ id: otherJudge.id, email: otherJudge.email! });

    const response = await submitBallot(
      createJsonRequest(`http://localhost/api/ballots/${scenario.ballot.id}/submit`, {
        method: 'POST',
        body: buildValidBallotSubmission(),
      }),
      { params: Promise.resolve({ ballotId: scenario.ballot.id }) }
    );

    expect(response.status).toBe(403);
  });

  it('blocks non-organizers from updating tournament settings', async () => {
    const scenario = await createSingleDebateScenario('IN_PROGRESS');
    const outsider = await createUser({ id: 'settings_outsider', email: 'settings-outsider@example.com' });
    mockAuthenticatedUser({ id: outsider.id, email: outsider.email! });

    const response = await updateSettings(
      createJsonRequest(`http://localhost/api/tournaments/${scenario.tournament.id}/settings`, {
        method: 'PATCH',
        body: { teamSizeMin: 2, teamSizeMax: 3, debateFormat: 'WSDC' },
      }),
      { params: Promise.resolve({ id: scenario.tournament.id }) }
    );

    expect(response.status).toBe(403);
  });
});
