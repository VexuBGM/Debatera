import { describe, expect, it } from 'vitest';
import { POST as generatePairingsRoute } from '@/app/api/tournaments/[id]/rounds/[roundId]/generate/route';
import { GET as getPairingsRoute, PUT as savePairingsRoute } from '@/app/api/tournaments/[id]/rounds/[roundId]/pairings/route';
import { createInstitution } from '@tests/factories/institution.factory';
import { createTournamentParticipant } from '@tests/factories/participant.factory';
import { createRound } from '@tests/factories/round.factory';
import { createTournamentTeam } from '@tests/factories/team.factory';
import { createTournament } from '@tests/factories/tournament.factory';
import { createUser } from '@tests/factories/user.factory';
import { createJsonRequest, responseJson } from '@tests/helpers/api-request';
import { expectJsonError } from '@tests/helpers/assert-api-response';
import { mockAuthenticatedUser } from '@tests/setup/clerk-mock';
import { testPrisma } from '@tests/setup/prisma-test-client';

async function createPairingFixture(options: { pairingSystem?: 'RANDOM' | 'SWISS' } = {}) {
  const organizer = await createUser({ id: `pairing_organizer_${options.pairingSystem ?? 'manual'}` });
  const tournament = await createTournament({
    createdByUserId: organizer.id,
    settings: { pairingSystem: options.pairingSystem ?? 'RANDOM' },
  });
  const propInstitution = await createInstitution({ name: `Pairing Prop ${options.pairingSystem ?? 'Manual'}` });
  const oppInstitution = await createInstitution({ name: `Pairing Opp ${options.pairingSystem ?? 'Manual'}` });
  const judgeInstitution = await createInstitution({ name: `Pairing Judges ${options.pairingSystem ?? 'Manual'}` });
  const prop = await createTournamentTeam({
    tournamentId: tournament.id,
    institutionId: propInstitution.id,
    createdByUserId: organizer.id,
    name: 'Pairing Prop',
  });
  const opp = await createTournamentTeam({
    tournamentId: tournament.id,
    institutionId: oppInstitution.id,
    createdByUserId: organizer.id,
    name: 'Pairing Opp',
  });
  const judge = await createTournamentParticipant({
    tournamentId: tournament.id,
    institutionId: judgeInstitution.id,
    role: 'JUDGE',
  });
  const round = await createRound({ tournamentId: tournament.id, status: 'DRAFT' });

  return { organizer, tournament, prop, opp, judge, round, propInstitution, oppInstitution, judgeInstitution };
}

describe('pairings API routes', () => {
  it('saves manual pairings with chair ballots for draft rounds', async () => {
    const { organizer, tournament, prop, opp, judge, round } = await createPairingFixture();

    mockAuthenticatedUser({ id: organizer.id, email: 'organizer@example.com' });

    const response = await savePairingsRoute(
      createJsonRequest(
        `http://localhost/api/tournaments/${tournament.id}/rounds/${round.id}/pairings`,
        {
          method: 'PUT',
          body: {
            debates: [
              {
                order: 0,
                propTeamId: prop.team.id,
                oppTeamId: opp.team.id,
                isBye: false,
                chairJudgeParticipantId: judge.id,
                panelistJudgeParticipantIds: [],
              },
            ],
          },
        }
      ),
      { params: Promise.resolve({ id: tournament.id, roundId: round.id }) }
    );

    expect(response.status).toBe(200);
    await expect(responseJson(response)).resolves.toEqual(
      expect.objectContaining({ success: true, debatesSaved: 1 })
    );
    await expect(testPrisma.tournamentDebate.count({ where: { roundId: round.id } })).resolves.toBe(1);
    await expect(testPrisma.tournamentDebateJudge.count()).resolves.toBe(1);
    await expect(testPrisma.ballot.count()).resolves.toBe(1);
    await expect(testPrisma.ballotSpeech.count()).resolves.toBe(8);
  });

  it('hides draft pairings from non-admin tournament participants', async () => {
    const { tournament, prop, opp, judge, round } = await createPairingFixture();

    await testPrisma.tournamentDebate.create({
      data: {
        roundId: round.id,
        order: 0,
        propTeamId: prop.team.id,
        oppTeamId: opp.team.id,
        judges: { create: { participantId: judge.id, role: 'CHAIR' } },
      },
    });

    const participantUserId = prop.members[0].participant.userId;
    mockAuthenticatedUser({ id: participantUserId, email: `${participantUserId}@example.com` });

    const response = await getPairingsRoute(
      createJsonRequest(`http://localhost/api/tournaments/${tournament.id}/rounds/${round.id}/pairings`),
      { params: Promise.resolve({ id: tournament.id, roundId: round.id }) }
    );

    await expectJsonError(response, 404, 'Round not found');
  });

  it('auto-generates random pairings and draft ballots', async () => {
    const { organizer, tournament, round, propInstitution, oppInstitution, judgeInstitution } =
      await createPairingFixture({ pairingSystem: 'RANDOM' });
    await createTournamentTeam({
      tournamentId: tournament.id,
      institutionId: propInstitution.id,
      createdByUserId: organizer.id,
      name: 'Pairing Prop 2',
    });
    await createTournamentTeam({
      tournamentId: tournament.id,
      institutionId: oppInstitution.id,
      createdByUserId: organizer.id,
      name: 'Pairing Opp 2',
    });
    await createTournamentParticipant({
      tournamentId: tournament.id,
      institutionId: judgeInstitution.id,
      role: 'JUDGE',
    });

    mockAuthenticatedUser({ id: organizer.id, email: 'organizer@example.com' });

    const response = await generatePairingsRoute(
      createJsonRequest(
        `http://localhost/api/tournaments/${tournament.id}/rounds/${round.id}/generate`,
        { method: 'POST' }
      ),
      { params: Promise.resolve({ id: tournament.id, roundId: round.id }) }
    );

    expect(response.status).toBe(200);
    const body = await responseJson<{ success: boolean; debatesCreated: number }>(response);
    expect(body).toEqual(expect.objectContaining({ success: true, debatesCreated: 2 }));
    await expect(testPrisma.tournamentDebate.count({ where: { roundId: round.id } })).resolves.toBe(2);
    await expect(testPrisma.ballot.count()).resolves.toBeGreaterThanOrEqual(2);
  });
});
