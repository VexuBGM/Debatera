import { describe, expect, it, vi } from 'vitest';
import { createInstitution } from '@tests/factories/institution.factory';
import { createTournamentParticipant } from '@tests/factories/participant.factory';
import { createDebate, createJudgeAssignment, createRound } from '@tests/factories/round.factory';
import { createTournamentTeam } from '@tests/factories/team.factory';
import { createTournament } from '@tests/factories/tournament.factory';
import { createUser } from '@tests/factories/user.factory';
import { createJsonRequest, responseJson } from '@tests/helpers/api-request';
import { expectJsonError } from '@tests/helpers/assert-api-response';
import { mockAuthenticatedUser } from '@tests/setup/clerk-mock';

const { generateUserToken } = vi.hoisted(() => ({
  generateUserToken: vi.fn(() => 'stream-test-token'),
}));

vi.mock('@/lib/stream/server', () => ({
  streamServerClient: {
    generateUserToken,
  },
}));

import { POST } from '@/app/api/stream/token/route';

describe('stream token API route', () => {
  it('issues a Stream token to an eligible online debate judge', async () => {
    const organizer = await createUser({ id: 'stream_organizer' });
    const judgeUser = await createUser({ id: 'stream_judge_user' });
    const tournament = await createTournament({
      createdByUserId: organizer.id,
      settings: { eventMode: 'ONLINE' },
    });
    const teamInstitution = await createInstitution({ name: 'Stream Teams' });
    const judgeInstitution = await createInstitution({ name: 'Stream Judges' });
    const prop = await createTournamentTeam({
      tournamentId: tournament.id,
      institutionId: teamInstitution.id,
      createdByUserId: organizer.id,
      name: 'Stream Prop',
    });
    const opp = await createTournamentTeam({
      tournamentId: tournament.id,
      institutionId: teamInstitution.id,
      createdByUserId: organizer.id,
      name: 'Stream Opp',
    });
    const judge = await createTournamentParticipant({
      tournamentId: tournament.id,
      institutionId: judgeInstitution.id,
      userId: judgeUser.id,
      role: 'JUDGE',
    });
    const round = await createRound({ tournamentId: tournament.id, status: 'PUBLISHED' });
    const debate = await createDebate({
      roundId: round.id,
      propTeamId: prop.team.id,
      oppTeamId: opp.team.id,
      order: 0,
    });
    await createJudgeAssignment({ debateId: debate.id, participantId: judge.id, role: 'CHAIR' });

    mockAuthenticatedUser({ id: judgeUser.id, email: 'judge@example.com' });

    const response = await POST(
      createJsonRequest('http://localhost/api/stream/token', {
        method: 'POST',
        body: { kind: 'debate', debateId: debate.id },
      })
    );

    expect(response.status).toBe(200);
    await expect(responseJson(response)).resolves.toEqual({
      token: 'stream-test-token',
      role: 'judge',
    });
    expect(generateUserToken).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: judgeUser.id, validity_in_seconds: 60 * 60 })
    );
  });

  it('rejects users who are not assigned to the debate call', async () => {
    const organizer = await createUser({ id: 'stream_forbidden_organizer' });
    const stranger = await createUser({ id: 'stream_stranger' });
    const tournament = await createTournament({
      createdByUserId: organizer.id,
      settings: { eventMode: 'ONLINE' },
    });
    const institution = await createInstitution({ name: 'Stream Forbidden Teams' });
    const prop = await createTournamentTeam({
      tournamentId: tournament.id,
      institutionId: institution.id,
      createdByUserId: organizer.id,
      name: 'Forbidden Prop',
    });
    const opp = await createTournamentTeam({
      tournamentId: tournament.id,
      institutionId: institution.id,
      createdByUserId: organizer.id,
      name: 'Forbidden Opp',
    });
    const round = await createRound({ tournamentId: tournament.id, status: 'PUBLISHED' });
    const debate = await createDebate({
      roundId: round.id,
      propTeamId: prop.team.id,
      oppTeamId: opp.team.id,
      order: 0,
    });

    mockAuthenticatedUser({ id: stranger.id, email: 'stranger@example.com' });

    const response = await POST(
      createJsonRequest('http://localhost/api/stream/token', {
        method: 'POST',
        body: { kind: 'debate', debateId: debate.id },
      })
    );

    await expectJsonError(response, 403, 'not eligible');
  });
});
