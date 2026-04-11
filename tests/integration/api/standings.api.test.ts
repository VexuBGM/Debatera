import { describe, expect, it } from 'vitest';
import { GET } from '@/app/api/tournaments/[id]/standings/route';
import { POST as submitBallot } from '@/app/api/ballots/[ballotId]/submit/route';
import { buildValidBallotSubmission } from '@tests/factories/ballot.factory';
import { createSingleDebateScenario } from '@tests/fixtures/tournament-scenarios';
import { createJsonRequest, responseJson } from '@tests/helpers/api-request';
import { mockAuthenticatedUser } from '@tests/setup/clerk-mock';
import { testPrisma } from '@tests/setup/prisma-test-client';
import type { SpeechRole } from '@prisma/client';

describe('GET /api/tournaments/[id]/standings', () => {
  it('returns safe team and speaker standings from completed rounds', async () => {
    const scenario = await createSingleDebateScenario('IN_PROGRESS');
    mockAuthenticatedUser({ id: scenario.judgeUser.id, email: scenario.judgeUser.email! });

    const speakerIds = {
      PROP_1: scenario.prop.members[0].id,
      PROP_2: scenario.prop.members[1].id,
      PROP_3: scenario.prop.members[2].id,
      PROP_REPLY: scenario.prop.members[0].id,
      OPP_1: scenario.opp.members[0].id,
      OPP_2: scenario.opp.members[1].id,
      OPP_3: scenario.opp.members[2].id,
      OPP_REPLY: scenario.opp.members[0].id,
    } satisfies Record<SpeechRole, string>;

    await submitBallot(
      createJsonRequest(`http://localhost/api/ballots/${scenario.ballot.id}/submit`, {
        method: 'POST',
        body: buildValidBallotSubmission('PROPOSITION', speakerIds),
      }),
      { params: Promise.resolve({ ballotId: scenario.ballot.id }) }
    );
    await testPrisma.tournamentRound.update({
      where: { id: scenario.round.id },
      data: { status: 'COMPLETED' },
    });

    const response = await GET(
      createJsonRequest(`http://localhost/api/tournaments/${scenario.tournament.id}/standings`),
      { params: Promise.resolve({ id: scenario.tournament.id }) }
    );
    const body = await responseJson<{
      tournamentId: string;
      teamStandings: Array<{ teamId: string; wins: number; losses: number; speakerPoints: number }>;
      speakerStandings: Array<{ speakerName: string; totalPoints: number; speechesCount: number }>;
    }>(response);

    expect(response.status).toBe(200);
    expect(body.tournamentId).toBe(scenario.tournament.id);
    expect(body.teamStandings[0]).toMatchObject({
      teamId: scenario.prop.team.id,
      wins: 1,
      losses: 0,
      speakerPoints: 266,
    });
    expect(body.teamStandings[1]).toMatchObject({
      teamId: scenario.opp.team.id,
      wins: 0,
      losses: 1,
      speakerPoints: 258,
    });
    expect(body.speakerStandings.length).toBeGreaterThan(0);
    expect(body.speakerStandings[0]).not.toHaveProperty('privateNotes');
  });
});
