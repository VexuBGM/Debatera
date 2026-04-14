import { describe, expect, it } from 'vitest';
import { PATCH as updateRoundRoute } from '@/app/api/tournaments/[id]/rounds/[roundId]/route';
import { assignDebaterToTeam } from '@/actions/teams.actions';
import { createInstitution } from '@tests/factories/institution.factory';
import { createTournamentParticipant } from '@tests/factories/participant.factory';
import { createDebate, createJudgeAssignment, createRound } from '@tests/factories/round.factory';
import { createTournamentTeam } from '@tests/factories/team.factory';
import { createTournament } from '@tests/factories/tournament.factory';
import { createUser } from '@tests/factories/user.factory';
import { createJsonRequest } from '@tests/helpers/api-request';
import { expectActionFailure, expectActionSuccess } from '@tests/helpers/assert-action-response';
import { expectJsonError } from '@tests/helpers/assert-api-response';
import { mockAuthenticatedUser } from '@tests/setup/clerk-mock';
import { testPrisma } from '@tests/setup/prisma-test-client';

describe('team size constraints', () => {
  it('cannot add more members than teamSizeMax (default 5)', async () => {
    const organizer = await createUser({ id: 'team_constraints_max_organizer' });
    const tournament = await createTournament({ createdByUserId: organizer.id });
    const institution = await createInstitution({ id: 'team_constraints_max_inst', name: 'Team Constraints Max Institution' });
    const team = await createTournamentTeam({
      tournamentId: tournament.id,
      institutionId: institution.id,
      createdByUserId: organizer.id,
      name: 'Team Constraints Max Team',
      memberCount: 5,
    });
    const extraDebater = await createTournamentParticipant({
      tournamentId: tournament.id,
      institutionId: institution.id,
      role: 'DEBATER',
    });

    mockAuthenticatedUser({ id: organizer.id, email: organizer.email! });

    expectActionFailure(
      await assignDebaterToTeam({
        tournamentId: tournament.id,
        participantId: extraDebater.id,
        teamId: team.team.id,
      }),
      'Team is full (max 5)'
    );
  });

  it('adding the exact maximum number of debaters succeeds', async () => {
    const organizer = await createUser({ id: 'team_constraints_exact_organizer' });
    const tournament = await createTournament({ createdByUserId: organizer.id });
    const institution = await createInstitution({ id: 'team_constraints_exact_inst', name: 'Team Constraints Exact Institution' });
    const team = await createTournamentTeam({
      tournamentId: tournament.id,
      institutionId: institution.id,
      createdByUserId: organizer.id,
      name: 'Team Constraints Exact Team',
      memberCount: 4,
    });
    const extraDebater = await createTournamentParticipant({
      tournamentId: tournament.id,
      institutionId: institution.id,
      role: 'DEBATER',
    });

    mockAuthenticatedUser({ id: organizer.id, email: organizer.email! });

    expectActionSuccess(
      await assignDebaterToTeam({
        tournamentId: tournament.id,
        participantId: extraDebater.id,
        teamId: team.team.id,
      })
    );

    await expect(
      testPrisma.tournamentTeamMember.count({ where: { teamId: team.team.id } })
    ).resolves.toBe(5);
  });

  it('adding a debater who is already on the team is rejected', async () => {
    const organizer = await createUser({ id: 'team_constraints_duplicate_organizer' });
    const tournament = await createTournament({ createdByUserId: organizer.id });
    const institution = await createInstitution({ id: 'team_constraints_duplicate_inst', name: 'Team Constraints Duplicate Institution' });
    const team = await createTournamentTeam({
      tournamentId: tournament.id,
      institutionId: institution.id,
      createdByUserId: organizer.id,
      name: 'Team Constraints Duplicate Team',
      memberCount: 4,
    });
    const extraDebater = await createTournamentParticipant({
      tournamentId: tournament.id,
      institutionId: institution.id,
      role: 'DEBATER',
    });

    mockAuthenticatedUser({ id: organizer.id, email: organizer.email! });

    expectActionSuccess(
      await assignDebaterToTeam({
        tournamentId: tournament.id,
        participantId: extraDebater.id,
        teamId: team.team.id,
      })
    );

    expectActionFailure(
      await assignDebaterToTeam({
        tournamentId: tournament.id,
        participantId: extraDebater.id,
        teamId: team.team.id,
      }),
      'already assigned to this team'
    );
  });

  it('assigning a debater to a new team moves them from their previous team', async () => {
    // The system allows reassignment — the debater's membership is moved (upserted),
    // not blocked. A debater is always on at most one team at a time.
    const organizer = await createUser({ id: 'team_constraints_single_membership_organizer' });
    const tournament = await createTournament({ createdByUserId: organizer.id });
    const institution = await createInstitution({ id: 'team_constraints_single_membership_inst', name: 'Team Constraints Single Membership Institution' });
    const teamOne = await createTournamentTeam({
      tournamentId: tournament.id,
      institutionId: institution.id,
      createdByUserId: organizer.id,
      name: 'Team Constraints Team One',
      memberCount: 3,
    });
    const teamTwo = await createTournamentTeam({
      tournamentId: tournament.id,
      institutionId: institution.id,
      createdByUserId: organizer.id,
      name: 'Team Constraints Team Two',
      memberCount: 3,
    });
    const extraDebater = await createTournamentParticipant({
      tournamentId: tournament.id,
      institutionId: institution.id,
      role: 'DEBATER',
    });

    mockAuthenticatedUser({ id: organizer.id, email: organizer.email! });

    // First assignment — debater joins teamOne
    expectActionSuccess(
      await assignDebaterToTeam({
        tournamentId: tournament.id,
        participantId: extraDebater.id,
        teamId: teamOne.team.id,
      })
    );

    // Second assignment to a different team — debater is moved, not blocked
    expectActionSuccess(
      await assignDebaterToTeam({
        tournamentId: tournament.id,
        participantId: extraDebater.id,
        teamId: teamTwo.team.id,
      })
    );

    // Debater is now only on teamTwo; teamOne membership was removed
    await expect(
      testPrisma.tournamentTeamMember.findMany({
        where: { participantId: extraDebater.id },
        select: { teamId: true },
      })
    ).resolves.toEqual([{ teamId: teamTwo.team.id }]);
  });

  it('tournament settings teamSizeMin is enforced when submitting pairings (team with too few members cannot be paired)', async () => {
    const organizer = await createUser({ id: 'team_constraints_publish_organizer' });
    const tournament = await createTournament({
      createdByUserId: organizer.id,
      settings: { teamSizeMin: 3, teamSizeMax: 5 },
    });
    const institution = await createInstitution({ id: 'team_constraints_publish_inst', name: 'Team Constraints Publish Institution' });
    const judgeInstitution = await createInstitution({ id: 'team_constraints_publish_judge_inst', name: 'Team Constraints Publish Judge Institution' });
    const shortTeam = await createTournamentTeam({
      tournamentId: tournament.id,
      institutionId: institution.id,
      createdByUserId: organizer.id,
      name: 'Short Team',
      memberCount: 2,
    });
    const fullTeam = await createTournamentTeam({
      tournamentId: tournament.id,
      institutionId: institution.id,
      createdByUserId: organizer.id,
      name: 'Full Team',
      memberCount: 3,
    });
    const judge = await createTournamentParticipant({
      tournamentId: tournament.id,
      institutionId: judgeInstitution.id,
      role: 'JUDGE',
    });
    const round = await createRound({ tournamentId: tournament.id, status: 'DRAFT' });
    const debate = await createDebate({
      roundId: round.id,
      propTeamId: shortTeam.team.id,
      oppTeamId: fullTeam.team.id,
      order: 0,
    });
    await createJudgeAssignment({
      debateId: debate.id,
      participantId: judge.id,
      role: 'CHAIR',
    });

    mockAuthenticatedUser({ id: organizer.id, email: organizer.email! });

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
        'Debate 1: Proposition team has fewer than 3 debaters',
      ])
    );
  });
});
