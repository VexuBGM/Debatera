import { describe, expect, it } from 'vitest';
import { GET, PUT } from '@/app/api/tournaments/[id]/portal/ballots/[ballotId]/route';
import { POST as submitPortalBallot } from '@/app/api/tournaments/[id]/portal/ballots/[ballotId]/submit/route';
import type { SpeechRole } from '@prisma/client';
import { buildValidBallotSubmission } from '@tests/factories/ballot.factory';
import { createPortalAccessLink } from '@tests/factories/portal.factory';
import { createTournament } from '@tests/factories/tournament.factory';
import { createSingleDebateScenario } from '@tests/fixtures/tournament-scenarios';
import { createBearerRequest, responseJson } from '@tests/helpers/api-request';
import { expectJsonError } from '@tests/helpers/assert-api-response';
import { testPrisma } from '@tests/setup/prisma-test-client';

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

describe('portal ballot API routes', () => {
  it('returns ballot context for a valid judge portal token', async () => {
    const scenario = await createSingleDebateScenario('IN_PROGRESS');
    const { token } = await createPortalAccessLink({
      tournamentId: scenario.tournament.id,
      participantId: scenario.judgeParticipant.id,
    });

    const response = await GET(
      createBearerRequest(
        `http://localhost/api/tournaments/${scenario.tournament.id}/portal/ballots/${scenario.ballot.id}`,
        token
      ),
      { params: Promise.resolve({ id: scenario.tournament.id, ballotId: scenario.ballot.id }) }
    );

    expect(response.status).toBe(200);
    const body = await responseJson<{ id: string; round: { status: string }; speeches: unknown[] }>(response);
    expect(body.id).toBe(scenario.ballot.id);
    expect(body.round.status).toBe('IN_PROGRESS');
    expect(body.speeches).toHaveLength(8);
  });

  it('saves portal ballot drafts without submitting the ballot', async () => {
    const scenario = await createSingleDebateScenario('IN_PROGRESS');
    const { token } = await createPortalAccessLink({
      tournamentId: scenario.tournament.id,
      participantId: scenario.judgeParticipant.id,
    });

    const response = await PUT(
      createBearerRequest(
        `http://localhost/api/tournaments/${scenario.tournament.id}/portal/ballots/${scenario.ballot.id}`,
        token,
        {
          method: 'PUT',
          body: {
            vote: 'PROPOSITION',
            privateNotes: 'Draft portal note',
            speeches: [
              {
                role: 'PROP_1',
                speakerId: scenario.prop.members[0].id,
                score: 76,
                comment: 'Draft comment',
              },
            ],
          },
        }
      ),
      { params: Promise.resolve({ id: scenario.tournament.id, ballotId: scenario.ballot.id }) }
    );

    expect(response.status).toBe(200);
    await expect(responseJson(response)).resolves.toEqual({ success: true });
    const ballot = await testPrisma.ballot.findUniqueOrThrow({
      where: { id: scenario.ballot.id },
      include: { speeches: true },
    });
    expect(ballot.status).toBe('DRAFT');
    expect(ballot.privateNotes).toBe('Draft portal note');
    expect(Number(ballot.propTotal)).toBe(76);
    expect(Number(ballot.oppTotal)).toBe(0);
  });

  it('submits portal ballots and rejects wrong-tournament token use', async () => {
    const scenario = await createSingleDebateScenario('IN_PROGRESS');
    const otherTournament = await createTournament({ createdByUserId: scenario.organizer.id });
    const { token } = await createPortalAccessLink({
      tournamentId: scenario.tournament.id,
      participantId: scenario.judgeParticipant.id,
    });

    const wrongTournamentResponse = await submitPortalBallot(
      createBearerRequest(
        `http://localhost/api/tournaments/${otherTournament.id}/portal/ballots/${scenario.ballot.id}/submit`,
        token,
        { method: 'POST', body: buildValidBallotSubmission('PROPOSITION', scenarioSpeakerMap(scenario)) }
      ),
      { params: Promise.resolve({ id: otherTournament.id, ballotId: scenario.ballot.id }) }
    );
    await expectJsonError(wrongTournamentResponse, 403, 'does not belong');

    const response = await submitPortalBallot(
      createBearerRequest(
        `http://localhost/api/tournaments/${scenario.tournament.id}/portal/ballots/${scenario.ballot.id}/submit`,
        token,
        { method: 'POST', body: buildValidBallotSubmission('PROPOSITION', scenarioSpeakerMap(scenario)) }
      ),
      { params: Promise.resolve({ id: scenario.tournament.id, ballotId: scenario.ballot.id }) }
    );

    expect(response.status).toBe(200);
    await expect(responseJson(response)).resolves.toEqual(
      expect.objectContaining({
        success: true,
        debateResultComputed: true,
        winningSide: 'PROPOSITION',
      })
    );
  });
});
