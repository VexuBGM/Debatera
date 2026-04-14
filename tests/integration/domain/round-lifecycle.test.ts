import { describe, expect, it } from 'vitest';
import { PATCH as updateRoundRoute } from '@/app/api/tournaments/[id]/rounds/[roundId]/route';
import { getRoundPublicationValidationErrors } from '@/lib/tournamentRounds';
import { createBallot } from '@tests/factories/ballot.factory';
import { createInstitution } from '@tests/factories/institution.factory';
import { createTournamentParticipant } from '@tests/factories/participant.factory';
import { createDebate, createJudgeAssignment, createRound } from '@tests/factories/round.factory';
import { createTournamentTeam } from '@tests/factories/team.factory';
import { createTournament } from '@tests/factories/tournament.factory';
import { createUser } from '@tests/factories/user.factory';
import { createJsonRequest } from '@tests/helpers/api-request';
import { mockAuthenticatedUser } from '@tests/setup/clerk-mock';
import { testPrisma } from '@tests/setup/prisma-test-client';

async function markBallotSubmitted(ballotId: string, vote: 'PROPOSITION' | 'OPPOSITION') {
  await testPrisma.ballot.update({
    where: { id: ballotId },
    data: {
      status: 'SUBMITTED',
      vote,
      propTotal: vote === 'PROPOSITION' ? 266 : 258,
      oppTotal: vote === 'PROPOSITION' ? 258 : 266,
      submittedAt: new Date(),
    },
  });
}

describe('round lifecycle', () => {
  it('a round cannot be published when any debate is missing its prop team', async () => {
    const organizer = await createUser({ id: 'round_lifecycle_missing_prop_organizer' });
    const tournament = await createTournament({ createdByUserId: organizer.id });
    const round = await createRound({ tournamentId: tournament.id });
    await createDebate({ roundId: round.id, propTeamId: null, oppTeamId: null, order: 0 });

    await expect(getRoundPublicationValidationErrors(round.id)).resolves.toContain(
      'Debate 1: Missing proposition team'
    );
  });

  it('a round cannot be published when any debate is missing its opp team', async () => {
    const organizer = await createUser({ id: 'round_lifecycle_missing_opp_organizer' });
    const tournament = await createTournament({ createdByUserId: organizer.id });
    const institution = await createInstitution({ id: 'round_lifecycle_missing_opp_inst', name: 'Round Lifecycle Missing Opp Inst' });
    const prop = await createTournamentTeam({
      tournamentId: tournament.id,
      institutionId: institution.id,
      createdByUserId: organizer.id,
      name: 'Round Lifecycle Prop Team',
    });
    const round = await createRound({ tournamentId: tournament.id });
    await createDebate({ roundId: round.id, propTeamId: prop.team.id, oppTeamId: null, order: 0 });

    await expect(getRoundPublicationValidationErrors(round.id)).resolves.toContain(
      'Debate 1: Missing opposition team'
    );
  });

  it('a round cannot be published when any debate has no judges assigned', async () => {
    const organizer = await createUser({ id: 'round_lifecycle_no_judges_organizer' });
    const tournament = await createTournament({ createdByUserId: organizer.id });
    const institution = await createInstitution({ id: 'round_lifecycle_no_judges_inst', name: 'Round Lifecycle No Judges Inst' });
    const prop = await createTournamentTeam({
      tournamentId: tournament.id,
      institutionId: institution.id,
      createdByUserId: organizer.id,
      name: 'Round Lifecycle No Judges Prop',
    });
    const opp = await createTournamentTeam({
      tournamentId: tournament.id,
      institutionId: institution.id,
      createdByUserId: organizer.id,
      name: 'Round Lifecycle No Judges Opp',
    });
    const round = await createRound({ tournamentId: tournament.id });
    await createDebate({
      roundId: round.id,
      propTeamId: prop.team.id,
      oppTeamId: opp.team.id,
      order: 0,
    });

    await expect(getRoundPublicationValidationErrors(round.id)).resolves.toContain(
      'Debate 1: No judges assigned'
    );
  });

  it('a BYE debate does not require a judge to be assigned for publication', async () => {
    const organizer = await createUser({ id: 'round_lifecycle_bye_organizer' });
    const tournament = await createTournament({ createdByUserId: organizer.id });
    const institution = await createInstitution({ id: 'round_lifecycle_bye_inst', name: 'Round Lifecycle Bye Inst' });
    const prop = await createTournamentTeam({
      tournamentId: tournament.id,
      institutionId: institution.id,
      createdByUserId: organizer.id,
      name: 'Round Lifecycle Bye Team',
    });
    const round = await createRound({ tournamentId: tournament.id });
    await createDebate({
      roundId: round.id,
      propTeamId: prop.team.id,
      oppTeamId: null,
      isBye: true,
      order: 0,
    });

    await expect(getRoundPublicationValidationErrors(round.id)).resolves.toEqual([]);
  });

  it('a fully configured round transitions to PUBLISHED correctly', async () => {
    const organizer = await createUser({ id: 'round_lifecycle_publish_organizer' });
    const tournament = await createTournament({ createdByUserId: organizer.id });
    const institution = await createInstitution({ id: 'round_lifecycle_publish_inst', name: 'Round Lifecycle Publish Inst' });
    const judgeInstitution = await createInstitution({ id: 'round_lifecycle_publish_judge_inst', name: 'Round Lifecycle Publish Judge Inst' });
    const prop = await createTournamentTeam({
      tournamentId: tournament.id,
      institutionId: institution.id,
      createdByUserId: organizer.id,
      name: 'Round Lifecycle Publish Prop',
    });
    const opp = await createTournamentTeam({
      tournamentId: tournament.id,
      institutionId: institution.id,
      createdByUserId: organizer.id,
      name: 'Round Lifecycle Publish Opp',
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

    mockAuthenticatedUser({ id: organizer.id, email: organizer.email! });

    const response = await updateRoundRoute(
      createJsonRequest(`http://localhost/api/tournaments/${tournament.id}/rounds/${round.id}`, {
        method: 'PATCH',
        body: { status: 'PUBLISHED' },
      }),
      { params: Promise.resolve({ id: tournament.id, roundId: round.id }) }
    );

    expect(response.status).toBe(200);
    await expect(
      testPrisma.tournamentRound.findUniqueOrThrow({
        where: { id: round.id },
        select: { status: true },
      })
    ).resolves.toEqual({ status: 'PUBLISHED' });
  });

  it('completing a round with all ballots submitted sets status to COMPLETED', async () => {
    const organizer = await createUser({ id: 'round_lifecycle_complete_organizer' });
    const tournament = await createTournament({ createdByUserId: organizer.id });
    const institution = await createInstitution({ id: 'round_lifecycle_complete_inst', name: 'Round Lifecycle Complete Inst' });
    const judgeInstitution = await createInstitution({ id: 'round_lifecycle_complete_judge_inst', name: 'Round Lifecycle Complete Judge Inst' });
    const prop = await createTournamentTeam({
      tournamentId: tournament.id,
      institutionId: institution.id,
      createdByUserId: organizer.id,
      name: 'Round Lifecycle Complete Prop',
    });
    const opp = await createTournamentTeam({
      tournamentId: tournament.id,
      institutionId: institution.id,
      createdByUserId: organizer.id,
      name: 'Round Lifecycle Complete Opp',
    });
    const judge = await createTournamentParticipant({
      tournamentId: tournament.id,
      institutionId: judgeInstitution.id,
      role: 'JUDGE',
    });
    const round = await createRound({ tournamentId: tournament.id, status: 'IN_PROGRESS' });
    const debate = await createDebate({
      roundId: round.id,
      propTeamId: prop.team.id,
      oppTeamId: opp.team.id,
      order: 0,
    });
    const assignment = await createJudgeAssignment({
      debateId: debate.id,
      participantId: judge.id,
      role: 'CHAIR',
    });
    const ballot = await createBallot({ debateId: debate.id, adjudicatorId: assignment.id });
    await markBallotSubmitted(ballot.id, 'PROPOSITION');

    mockAuthenticatedUser({ id: organizer.id, email: organizer.email! });

    const response = await updateRoundRoute(
      createJsonRequest(`http://localhost/api/tournaments/${tournament.id}/rounds/${round.id}`, {
        method: 'PATCH',
        body: { status: 'COMPLETED' },
      }),
      { params: Promise.resolve({ id: tournament.id, roundId: round.id }) }
    );

    expect(response.status).toBe(200);
    await expect(
      testPrisma.tournamentRound.findUniqueOrThrow({
        where: { id: round.id },
        select: { status: true },
      })
    ).resolves.toEqual({ status: 'COMPLETED' });
  });

  it('completing a round with unsubmitted ballots: the 2-judge chair fallback is triggered if round is COMPLETED and only chair submitted', async () => {
    const organizer = await createUser({ id: 'round_lifecycle_chair_fallback_organizer' });
    const tournament = await createTournament({ createdByUserId: organizer.id });
    const institution = await createInstitution({ id: 'round_lifecycle_chair_fallback_inst', name: 'Round Lifecycle Chair Fallback Inst' });
    const judgeInstitution = await createInstitution({ id: 'round_lifecycle_chair_fallback_judge_inst', name: 'Round Lifecycle Chair Fallback Judge Inst' });
    const prop = await createTournamentTeam({
      tournamentId: tournament.id,
      institutionId: institution.id,
      createdByUserId: organizer.id,
      name: 'Round Lifecycle Chair Prop',
    });
    const opp = await createTournamentTeam({
      tournamentId: tournament.id,
      institutionId: institution.id,
      createdByUserId: organizer.id,
      name: 'Round Lifecycle Chair Opp',
    });
    const chair = await createTournamentParticipant({
      tournamentId: tournament.id,
      institutionId: judgeInstitution.id,
      userId: (await createUser({ id: 'round_lifecycle_chair_fallback_chair_user' })).id,
      role: 'JUDGE',
    });
    const panelist = await createTournamentParticipant({
      tournamentId: tournament.id,
      institutionId: judgeInstitution.id,
      userId: (await createUser({ id: 'round_lifecycle_chair_fallback_panel_user' })).id,
      role: 'JUDGE',
    });
    const round = await createRound({ tournamentId: tournament.id, status: 'IN_PROGRESS' });
    const debate = await createDebate({
      roundId: round.id,
      propTeamId: prop.team.id,
      oppTeamId: opp.team.id,
      order: 0,
    });
    const chairAssignment = await createJudgeAssignment({
      debateId: debate.id,
      participantId: chair.id,
      role: 'CHAIR',
    });
    const panelAssignment = await createJudgeAssignment({
      debateId: debate.id,
      participantId: panelist.id,
      role: 'PANELIST',
    });
    const chairBallot = await createBallot({ debateId: debate.id, adjudicatorId: chairAssignment.id });
    await createBallot({ debateId: debate.id, adjudicatorId: panelAssignment.id });
    await markBallotSubmitted(chairBallot.id, 'PROPOSITION');

    mockAuthenticatedUser({ id: organizer.id, email: organizer.email! });

    const response = await updateRoundRoute(
      createJsonRequest(`http://localhost/api/tournaments/${tournament.id}/rounds/${round.id}`, {
        method: 'PATCH',
        body: { status: 'COMPLETED' },
      }),
      { params: Promise.resolve({ id: tournament.id, roundId: round.id }) }
    );

    expect(response.status).toBe(200);
    await expect(
      testPrisma.debateResult.findUniqueOrThrow({
        where: { debateId: debate.id },
        select: { winningSide: true, voteProp: true, voteOpp: true },
      })
    ).resolves.toEqual({
      winningSide: 'PROPOSITION',
      voteProp: 1,
      voteOpp: 0,
    });
  });

  it('completing a round with unsubmitted ballots (3-judge panel, 1 missing): result is NOT computed', async () => {
    const organizer = await createUser({ id: 'round_lifecycle_missing_panel_organizer' });
    const tournament = await createTournament({ createdByUserId: organizer.id });
    const institution = await createInstitution({ id: 'round_lifecycle_missing_panel_inst', name: 'Round Lifecycle Missing Panel Inst' });
    const judgeInstitution = await createInstitution({ id: 'round_lifecycle_missing_panel_judge_inst', name: 'Round Lifecycle Missing Panel Judge Inst' });
    const prop = await createTournamentTeam({
      tournamentId: tournament.id,
      institutionId: institution.id,
      createdByUserId: organizer.id,
      name: 'Round Lifecycle Missing Panel Prop',
    });
    const opp = await createTournamentTeam({
      tournamentId: tournament.id,
      institutionId: institution.id,
      createdByUserId: organizer.id,
      name: 'Round Lifecycle Missing Panel Opp',
    });
    const round = await createRound({ tournamentId: tournament.id, status: 'IN_PROGRESS' });
    const debate = await createDebate({
      roundId: round.id,
      propTeamId: prop.team.id,
      oppTeamId: opp.team.id,
      order: 0,
    });

    const assignments = [];
    for (let index = 0; index < 3; index += 1) {
      const judge = await createTournamentParticipant({
        tournamentId: tournament.id,
        institutionId: judgeInstitution.id,
        userId: (await createUser({ id: `round_lifecycle_missing_panel_judge_user_${index}` })).id,
        role: 'JUDGE',
      });
      assignments.push(
        await createJudgeAssignment({
          debateId: debate.id,
          participantId: judge.id,
          role: index === 0 ? 'CHAIR' : 'PANELIST',
        })
      );
    }

    const ballots = [];
    for (const assignment of assignments) {
      ballots.push(await createBallot({ debateId: debate.id, adjudicatorId: assignment.id }));
    }

    await markBallotSubmitted(ballots[0].id, 'PROPOSITION');
    await markBallotSubmitted(ballots[1].id, 'PROPOSITION');

    mockAuthenticatedUser({ id: organizer.id, email: organizer.email! });

    const response = await updateRoundRoute(
      createJsonRequest(`http://localhost/api/tournaments/${tournament.id}/rounds/${round.id}`, {
        method: 'PATCH',
        body: { status: 'COMPLETED' },
      }),
      { params: Promise.resolve({ id: tournament.id, roundId: round.id }) }
    );

    expect(response.status).toBe(200);
    await expect(
      testPrisma.debateResult.findUnique({ where: { debateId: debate.id } })
    ).resolves.toBeNull();
  });
});
