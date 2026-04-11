import { describe, expect, it } from 'vitest';
import { GET, PATCH } from '@/app/api/tournaments/[id]/settings/route';
import { createTournament } from '@tests/factories/tournament.factory';
import { createUser } from '@tests/factories/user.factory';
import { createJsonRequest, responseJson } from '@tests/helpers/api-request';
import { expectJsonError } from '@tests/helpers/assert-api-response';
import { mockAuthenticatedUser } from '@tests/setup/clerk-mock';
import { testPrisma } from '@tests/setup/prisma-test-client';

describe('tournament settings API routes', () => {
  it('returns existing tournament settings', async () => {
    const organizer = await createUser({ id: 'settings_api_owner' });
    const tournament = await createTournament({
      createdByUserId: organizer.id,
      settings: { teamSizeMin: 3, teamSizeMax: 5, showDebaterNames: true },
    });

    mockAuthenticatedUser({ id: organizer.id, email: 'organizer@example.com' });

    const response = await GET(
      createJsonRequest(`http://localhost/api/tournaments/${tournament.id}/settings`),
      { params: Promise.resolve({ id: tournament.id }) }
    );

    expect(response.status).toBe(200);
    await expect(responseJson(response)).resolves.toEqual(
      expect.objectContaining({
        tournamentId: tournament.id,
        teamSizeMin: 3,
        teamSizeMax: 5,
        showDebaterNames: true,
      })
    );
  });

  it('updates settings only for the tournament creator', async () => {
    const organizer = await createUser({ id: 'settings_api_patch_owner' });
    const stranger = await createUser({ id: 'settings_api_patch_stranger' });
    const tournament = await createTournament({ createdByUserId: organizer.id });
    const body = {
      teamSizeMin: 2,
      teamSizeMax: 4,
      debateFormat: 'WSDC',
      showDebaterNames: true,
      speakerTopN: 10,
      hideSpeakerPoints: false,
      publicTabs: ['overview', 'standings'],
    };

    mockAuthenticatedUser({ id: stranger.id, email: 'stranger@example.com' });
    const forbiddenResponse = await PATCH(
      createJsonRequest(`http://localhost/api/tournaments/${tournament.id}/settings`, {
        method: 'PATCH',
        body,
      }),
      { params: Promise.resolve({ id: tournament.id }) }
    );
    await expectJsonError(forbiddenResponse, 403, 'Forbidden');

    mockAuthenticatedUser({ id: organizer.id, email: 'organizer@example.com' });
    const response = await PATCH(
      createJsonRequest(`http://localhost/api/tournaments/${tournament.id}/settings`, {
        method: 'PATCH',
        body,
      }),
      { params: Promise.resolve({ id: tournament.id }) }
    );

    expect(response.status).toBe(200);
    await expect(
      testPrisma.tournamentSettings.findUniqueOrThrow({ where: { tournamentId: tournament.id } })
    ).resolves.toEqual(expect.objectContaining({ teamSizeMax: 4, speakerTopN: 10 }));
  });

  it('rejects invalid settings payloads', async () => {
    const organizer = await createUser({ id: 'settings_api_invalid_owner' });
    const tournament = await createTournament({ createdByUserId: organizer.id });

    mockAuthenticatedUser({ id: organizer.id, email: 'organizer@example.com' });

    const response = await PATCH(
      createJsonRequest(`http://localhost/api/tournaments/${tournament.id}/settings`, {
        method: 'PATCH',
        body: { teamSizeMin: 5, teamSizeMax: 2, debateFormat: 'WSDC' },
      }),
      { params: Promise.resolve({ id: tournament.id }) }
    );

    await expectJsonError(response, 400, 'Validation Error');
  });
});
