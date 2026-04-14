import { describe, expect, it } from 'vitest';
import { GET as getBallot, PUT as saveBallotDraft } from '@/app/api/ballots/[ballotId]/route';
import { POST as submitBallot } from '@/app/api/ballots/[ballotId]/submit/route';
import { GET as getStandings } from '@/app/api/tournaments/[id]/standings/route';
import { GET as getPortalBallot } from '@/app/api/tournaments/[id]/portal/ballots/[ballotId]/route';
import { buildValidBallotSubmission, createBallot } from '@tests/factories/ballot.factory';
import { createInstitution } from '@tests/factories/institution.factory';
import { createPortalAccessLink } from '@tests/factories/portal.factory';
import { createTournamentParticipant } from '@tests/factories/participant.factory';
import { createDebate, createJudgeAssignment, createRound } from '@tests/factories/round.factory';
import { createTournamentTeam } from '@tests/factories/team.factory';
import { createTournament } from '@tests/factories/tournament.factory';
import { createUser } from '@tests/factories/user.factory';
import { createSingleDebateScenario } from '@tests/fixtures/tournament-scenarios';
import { createBearerRequest, createJsonRequest } from '@tests/helpers/api-request';
import { mockAuthenticatedUser } from '@tests/setup/clerk-mock';

async function createUniqueDebateScenario(prefix: string, status: 'IN_PROGRESS' | 'COMPLETED') {
  const organizer = await createUser({ id: `${prefix}_organizer`, email: `${prefix}_organizer@example.com` });
  const judgeUser = await createUser({ id: `${prefix}_judge_user`, email: `${prefix}_judge@example.com` });
  const institution = await createInstitution({ id: `${prefix}_institution`, name: `${prefix} Institution` });
  const tournament = await createTournament({ id: `${prefix}_tournament`, createdByUserId: organizer.id });
  const prop = await createTournamentTeam({
    tournamentId: tournament.id,
    institutionId: institution.id,
    createdByUserId: organizer.id,
    name: `${prefix} Prop`,
  });
  const opp = await createTournamentTeam({
    tournamentId: tournament.id,
    institutionId: institution.id,
    createdByUserId: organizer.id,
    name: `${prefix} Opp`,
  });
  const judgeParticipant = await createTournamentParticipant({
    tournamentId: tournament.id,
    institutionId: institution.id,
    userId: judgeUser.id,
    role: 'JUDGE',
  });
  const round = await createRound({
    id: `${prefix}_round`,
    tournamentId: tournament.id,
    status,
  });
  const debate = await createDebate({
    roundId: round.id,
    propTeamId: prop.team.id,
    oppTeamId: opp.team.id,
    order: 0,
  });
  const judgeAssignment = await createJudgeAssignment({
    debateId: debate.id,
    participantId: judgeParticipant.id,
    role: 'CHAIR',
  });
  const ballot = await createBallot({
    debateId: debate.id,
    adjudicatorId: judgeAssignment.id,
  });

  return {
    organizer,
    judgeUser,
    institution,
    tournament,
    prop,
    opp,
    judgeParticipant,
    round,
    debate,
    judgeAssignment,
    ballot,
  };
}

describe('IDOR: ballot access', () => {
  it("Judge A cannot GET Judge B's ballot details (403)", async () => {
    const scenario = await createSingleDebateScenario('IN_PROGRESS');
    const otherJudgeUser = await createUser({ id: 'idor_get_other_judge_user', email: 'idor-get-other-judge@example.com' });
    const otherJudgeParticipant = await createTournamentParticipant({
      tournamentId: scenario.tournament.id,
      institutionId: scenario.institution.id,
      userId: otherJudgeUser.id,
      role: 'JUDGE',
    });
    const otherAssignment = await createJudgeAssignment({
      debateId: scenario.debate.id,
      participantId: otherJudgeParticipant.id,
      role: 'PANELIST',
    });
    const otherBallot = await createBallot({
      debateId: scenario.debate.id,
      adjudicatorId: otherAssignment.id,
    });

    mockAuthenticatedUser({ id: scenario.judgeUser.id, email: scenario.judgeUser.email! });

    const response = await getBallot(
      createJsonRequest(`http://localhost/api/ballots/${otherBallot.id}`),
      { params: Promise.resolve({ ballotId: otherBallot.id }) }
    );

    expect(response.status).toBe(403);
  });

  it("Judge A cannot POST to submit Judge B's ballot (403)", async () => {
    const scenario = await createSingleDebateScenario('IN_PROGRESS');
    const otherJudgeUser = await createUser({ id: 'idor_submit_other_judge_user', email: 'idor-submit-other-judge@example.com' });
    const otherJudgeParticipant = await createTournamentParticipant({
      tournamentId: scenario.tournament.id,
      institutionId: scenario.institution.id,
      userId: otherJudgeUser.id,
      role: 'JUDGE',
    });
    const otherAssignment = await createJudgeAssignment({
      debateId: scenario.debate.id,
      participantId: otherJudgeParticipant.id,
      role: 'PANELIST',
    });
    const otherBallot = await createBallot({
      debateId: scenario.debate.id,
      adjudicatorId: otherAssignment.id,
    });

    mockAuthenticatedUser({ id: scenario.judgeUser.id, email: scenario.judgeUser.email! });

    const response = await submitBallot(
      createJsonRequest(`http://localhost/api/ballots/${otherBallot.id}/submit`, {
        method: 'POST',
        body: buildValidBallotSubmission(),
      }),
      { params: Promise.resolve({ ballotId: otherBallot.id }) }
    );

    expect(response.status).toBe(403);
  });

  it('Judge cannot save a ballot draft that belongs to a different judge (403)', async () => {
    const scenario = await createSingleDebateScenario('IN_PROGRESS');
    const otherJudgeUser = await createUser({ id: 'idor_save_other_judge_user', email: 'idor-save-other-judge@example.com' });
    const otherJudgeParticipant = await createTournamentParticipant({
      tournamentId: scenario.tournament.id,
      institutionId: scenario.institution.id,
      userId: otherJudgeUser.id,
      role: 'JUDGE',
    });
    const otherAssignment = await createJudgeAssignment({
      debateId: scenario.debate.id,
      participantId: otherJudgeParticipant.id,
      role: 'PANELIST',
    });
    const otherBallot = await createBallot({
      debateId: scenario.debate.id,
      adjudicatorId: otherAssignment.id,
    });

    mockAuthenticatedUser({ id: scenario.judgeUser.id, email: scenario.judgeUser.email! });

    const response = await saveBallotDraft(
      createJsonRequest(`http://localhost/api/ballots/${otherBallot.id}`, {
        method: 'PUT',
        body: {
          vote: 'PROPOSITION',
          speeches: [{ role: 'PROP_1', speakerId: scenario.prop.members[0].id, score: 76 }],
        },
      }),
      { params: Promise.resolve({ ballotId: otherBallot.id }) }
    );

    expect(response.status).toBe(403);
  });
});

describe('IDOR: cross-tournament isolation', () => {
  it("user from tournament A cannot read standings of tournament B (if tournament B is not public)", async () => {
    const tournamentA = await createSingleDebateScenario('IN_PROGRESS');
    const tournamentB = await createUniqueDebateScenario('idor_standings_b', 'IN_PROGRESS');

    mockAuthenticatedUser({ id: tournamentA.judgeUser.id, email: tournamentA.judgeUser.email! });

    const response = await getStandings(
      createJsonRequest(`http://localhost/api/tournaments/${tournamentB.tournament.id}/standings`),
      { params: Promise.resolve({ id: tournamentB.tournament.id }) }
    );

    expect(response.status).toBe(404);
  });

  it('judge from tournament A cannot access a ballot from tournament B via portal API (401/403)', async () => {
    const tournamentA = await createSingleDebateScenario('IN_PROGRESS');
    const tournamentB = await createUniqueDebateScenario('idor_portal_b', 'IN_PROGRESS');
    const { token } = await createPortalAccessLink({
      tournamentId: tournamentA.tournament.id,
      participantId: tournamentA.judgeParticipant.id,
    });

    const response = await getPortalBallot(
      createBearerRequest(
        `http://localhost/api/tournaments/${tournamentB.tournament.id}/portal/ballots/${tournamentB.ballot.id}`,
        token
      ),
      { params: Promise.resolve({ id: tournamentB.tournament.id, ballotId: tournamentB.ballot.id }) }
    );

    expect([401, 403]).toContain(response.status);
  });
});
