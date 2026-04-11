import { describe, expect, it } from 'vitest';
import { GET as listTournaments, POST as createTournamentRoute } from '@/app/api/tournaments/route';
import { GET as getTournament, PATCH as updateTournament } from '@/app/api/tournaments/[id]/route';
import { createInstitutionMember, createTournamentInstitution } from '@tests/factories/institution.factory';
import { createTournament } from '@tests/factories/tournament.factory';
import { createUser } from '@tests/factories/user.factory';
import { createJsonRequest, responseJson } from '@tests/helpers/api-request';
import { expectJsonError } from '@tests/helpers/assert-api-response';
import { mockAuthenticatedUser, mockUnauthenticatedUser } from '@tests/setup/clerk-mock';
import { testPrisma } from '@tests/setup/prisma-test-client';

describe('tournament API routes', () => {
  it('creates a tournament with settings from the request body', async () => {
    const user = await createUser({ id: 'tournament_api_creator' });
    mockAuthenticatedUser({ id: user.id, email: 'creator@example.com' });

    const response = await createTournamentRoute(
      createJsonRequest('http://localhost/api/tournaments', {
        method: 'POST',
        body: {
          name: 'API Tournament',
          eventMode: 'ONLINE',
          isPublic: true,
          teamSizeMin: 3,
          teamSizeMax: 4,
          publicTabs: ['overview', 'rounds'],
        },
      })
    );

    expect(response.status).toBe(201);
    const body = await responseJson<{ id: string; settings: { eventMode: string; teamSizeMin: number } }>(response);
    expect(body.settings).toEqual(expect.objectContaining({ eventMode: 'ONLINE', teamSizeMin: 3 }));
  });

  it('lists public tournaments and current-user private tournaments only', async () => {
    const owner = await createUser({ id: 'tournament_api_owner' });
    const viewer = await createUser({ id: 'tournament_api_viewer' });
    const publicTournament = await createTournament({
      createdByUserId: owner.id,
      name: 'Public API Tournament',
      isPublic: true,
    });
    const privateTournament = await createTournament({
      createdByUserId: owner.id,
      name: 'Private API Tournament',
      isPublic: false,
    });

    mockUnauthenticatedUser();
    const anonymousResponse = await listTournaments(createJsonRequest('http://localhost/api/tournaments'));
    const anonymousBody = await responseJson<{ data: Array<{ id: string }> }>(anonymousResponse);
    expect(anonymousBody.data.map((tournament) => tournament.id)).toContain(publicTournament.id);
    expect(anonymousBody.data.map((tournament) => tournament.id)).not.toContain(privateTournament.id);

    await createInstitutionMember({ userId: viewer.id });
    const viewerMembership = await testPrisma.institutionMember.findFirstOrThrow({
      where: { userId: viewer.id },
    });
    await createTournamentInstitution({
      tournamentId: privateTournament.id,
      institutionId: viewerMembership.institutionId,
      requestedByUserId: viewer.id,
    });

    mockAuthenticatedUser({ id: viewer.id, email: 'viewer@example.com' });
    const viewerResponse = await listTournaments(createJsonRequest('http://localhost/api/tournaments'));
    const viewerBody = await responseJson<{ data: Array<{ id: string }> }>(viewerResponse);
    expect(viewerBody.data.map((tournament) => tournament.id)).toEqual(
      expect.arrayContaining([publicTournament.id, privateTournament.id])
    );
  });

  it('updates tournament visibility only for the creator', async () => {
    const owner = await createUser({ id: 'tournament_api_patch_owner' });
    const stranger = await createUser({ id: 'tournament_api_patch_stranger' });
    const tournament = await createTournament({ createdByUserId: owner.id, isPublic: false });

    mockAuthenticatedUser({ id: stranger.id, email: 'stranger@example.com' });
    const forbiddenResponse = await updateTournament(
      createJsonRequest(`http://localhost/api/tournaments/${tournament.id}`, {
        method: 'PATCH',
        body: { isPublic: true },
      }),
      { params: Promise.resolve({ id: tournament.id }) }
    );
    await expectJsonError(forbiddenResponse, 403, 'creator');

    mockAuthenticatedUser({ id: owner.id, email: 'owner@example.com' });
    const response = await updateTournament(
      createJsonRequest(`http://localhost/api/tournaments/${tournament.id}`, {
        method: 'PATCH',
        body: { isPublic: true },
      }),
      { params: Promise.resolve({ id: tournament.id }) }
    );

    expect(response.status).toBe(200);
    await expect(responseJson(response)).resolves.toEqual(expect.objectContaining({ isPublic: true }));
  });

  it('returns 404 for private tournament details when the viewer has no access', async () => {
    const owner = await createUser({ id: 'tournament_api_private_owner' });
    const stranger = await createUser({ id: 'tournament_api_private_stranger' });
    const tournament = await createTournament({ createdByUserId: owner.id, isPublic: false });

    mockAuthenticatedUser({ id: stranger.id, email: 'stranger@example.com' });

    const response = await getTournament(
      createJsonRequest(`http://localhost/api/tournaments/${tournament.id}`),
      { params: Promise.resolve({ id: tournament.id }) }
    );

    await expectJsonError(response, 404, 'Tournament not found');
  });
});
