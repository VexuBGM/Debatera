import { describe, expect, it } from 'vitest';
import { POST as createRoundRoute } from '@/app/api/tournaments/[id]/rounds/route';
import { PATCH as updateRoundRoute } from '@/app/api/tournaments/[id]/rounds/[roundId]/route';
import { createInstitution } from '@tests/factories/institution.factory';
import { createTournamentParticipant } from '@tests/factories/participant.factory';
import { createDebate, createJudgeAssignment, createRound } from '@tests/factories/round.factory';
import { createTournamentTeam } from '@tests/factories/team.factory';
import { createTournament } from '@tests/factories/tournament.factory';
import { createUser } from '@tests/factories/user.factory';
import { createJsonRequest, responseJson } from '@tests/helpers/api-request';
import { expectJsonError } from '@tests/helpers/assert-api-response';
import { mockAuthenticatedUser } from '@tests/setup/clerk-mock';

describe('round API routes', () => {
  it('creates rounds with the next tournament round number', async () => {
    const organizer = await createUser({ id: 'round_api_organizer' });
    const tournament = await createTournament({ createdByUserId: organizer.id });
    await createRound({ tournamentId: tournament.id, number: 1, name: 'Round 1' });

    mockAuthenticatedUser({ id: organizer.id, email: 'organizer@example.com' });

    const response = await createRoundRoute(
      createJsonRequest(`http://localhost/api/tournaments/${tournament.id}/rounds`, {
        method: 'POST',
        body: { name: 'Round 2' },
      }),
      { params: Promise.resolve({ id: tournament.id }) }
    );

    expect(response.status).toBe(201);
    const body = await responseJson<{ number: number; name: string; status: string }>(response);
    expect(body).toEqual(expect.objectContaining({ number: 2, name: 'Round 2', status: 'DRAFT' }));
  });

  it('rejects publishing a round with incomplete pairings', async () => {
    const organizer = await createUser({ id: 'round_api_invalid_publish' });
    const tournament = await createTournament({ createdByUserId: organizer.id });
    const round = await createRound({ tournamentId: tournament.id, status: 'DRAFT' });
    await createDebate({ roundId: round.id, propTeamId: null, oppTeamId: null, order: 0 });

    mockAuthenticatedUser({ id: organizer.id, email: 'organizer@example.com' });

    const response = await updateRoundRoute(
      createJsonRequest(`http://localhost/api/tournaments/${tournament.id}/rounds/${round.id}`, {
        method: 'PATCH',
        body: { status: 'PUBLISHED' },
      }),
      { params: Promise.resolve({ id: tournament.id, roundId: round.id }) }
    );

    const body = await expectJsonError(response, 400, 'Cannot publish');
    expect(body.validationErrors).toEqual(
      expect.arrayContaining([
        'Debate 1: Missing proposition team',
        'Debate 1: Missing opposition team',
        'Debate 1: No judges assigned',
      ])
    );
  });

  it('updates a complete round through publish, in-progress, and completed statuses', async () => {
    const organizer = await createUser({ id: 'round_api_lifecycle' });
    const tournament = await createTournament({ createdByUserId: organizer.id });
    const institution = await createInstitution({ name: 'Round Lifecycle Institution' });
    const judgeInstitution = await createInstitution({ name: 'Round Lifecycle Judges' });
    const prop = await createTournamentTeam({
      tournamentId: tournament.id,
      institutionId: institution.id,
      createdByUserId: organizer.id,
      name: 'Lifecycle Prop',
    });
    const opp = await createTournamentTeam({
      tournamentId: tournament.id,
      institutionId: institution.id,
      createdByUserId: organizer.id,
      name: 'Lifecycle Opp',
    });
    const judge = await createTournamentParticipant({
      tournamentId: tournament.id,
      institutionId: judgeInstitution.id,
      role: 'JUDGE',
    });
    const round = await createRound({ tournamentId: tournament.id, status: 'DRAFT' });
    const debate = await createDebate({
      roundId: round.id,
      propTeamId: prop.team.id,
      oppTeamId: opp.team.id,
      order: 0,
    });
    await createJudgeAssignment({ debateId: debate.id, participantId: judge.id, role: 'CHAIR' });

    mockAuthenticatedUser({ id: organizer.id, email: 'organizer@example.com' });

    for (const status of ['PUBLISHED', 'IN_PROGRESS', 'COMPLETED'] as const) {
      const response = await updateRoundRoute(
        createJsonRequest(`http://localhost/api/tournaments/${tournament.id}/rounds/${round.id}`, {
          method: 'PATCH',
          body: { status },
        }),
        { params: Promise.resolve({ id: tournament.id, roundId: round.id }) }
      );

      expect(response.status).toBe(200);
      const body = await responseJson<{ status: string }>(response);
      expect(body.status).toBe(status);
    }
  });
});
