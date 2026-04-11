import { describe, expect, it } from 'vitest';
import { POST as submitBallot } from '@/app/api/ballots/[ballotId]/submit/route';
import { GET as getBallot } from '@/app/api/ballots/[ballotId]/route';
import { POST as createTournament } from '@/app/api/tournaments/route';
import { POST as createRound } from '@/app/api/tournaments/[id]/rounds/route';
import { PATCH as updateSettings } from '@/app/api/tournaments/[id]/settings/route';
import { POST as addParticipant } from '@/app/api/tournaments/[id]/participants/route';
import { buildValidBallotSubmission } from '@tests/factories/ballot.factory';
import { createJsonRequest } from '@tests/helpers/api-request';

describe('protected API route auth guards', () => {
  it.each([
    {
      name: 'ballot detail',
      run: () =>
        getBallot(createJsonRequest('http://localhost/api/ballots/ballot_1'), {
          params: Promise.resolve({ ballotId: 'ballot_1' }),
        }),
    },
    {
      name: 'ballot submit',
      run: () =>
        submitBallot(
          createJsonRequest('http://localhost/api/ballots/ballot_1/submit', {
            method: 'POST',
            body: buildValidBallotSubmission(),
          }),
          { params: Promise.resolve({ ballotId: 'ballot_1' }) }
        ),
    },
    {
      name: 'tournament create',
      run: () =>
        createTournament(
          createJsonRequest('http://localhost/api/tournaments', {
            method: 'POST',
            body: { name: 'Unauthorized Tournament' },
          })
        ),
    },
    {
      name: 'round create',
      run: () =>
        createRound(
          createJsonRequest('http://localhost/api/tournaments/tournament_1/rounds', {
            method: 'POST',
            body: { name: 'Round 1' },
          }),
          { params: Promise.resolve({ id: 'tournament_1' }) }
        ),
    },
    {
      name: 'settings update',
      run: () =>
        updateSettings(
          createJsonRequest('http://localhost/api/tournaments/tournament_1/settings', {
            method: 'PATCH',
            body: { teamSizeMin: 2, teamSizeMax: 3, debateFormat: 'WSDC' },
          }),
          { params: Promise.resolve({ id: 'tournament_1' }) }
        ),
    },
    {
      name: 'participant add',
      run: () =>
        addParticipant(
          createJsonRequest('http://localhost/api/tournaments/tournament_1/participants', {
            method: 'POST',
            body: { userId: 'user_1', institutionId: 'institution_1', role: 'DEBATER' },
          }),
          { params: Promise.resolve({ id: 'tournament_1' }) }
        ),
    },
  ])('returns 401 before mutation work for $name', async ({ run }) => {
    const response = await run();

    expect(response.status).toBe(401);
  });
});
