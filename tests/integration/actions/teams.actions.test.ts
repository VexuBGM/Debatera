import { describe, expect, it } from 'vitest';
import {
  assignDebaterToTeam,
  bulkAddDebatersToTeam,
  createTeam,
  getInstitutionTeamState,
} from '@/actions/teams.actions';
import {
  createInstitution,
  createInstitutionMember,
  createTournamentInstitution,
} from '@tests/factories/institution.factory';
import { createTournamentParticipant } from '@tests/factories/participant.factory';
import { createTournament } from '@tests/factories/tournament.factory';
import { createUser } from '@tests/factories/user.factory';
import { expectActionFailure, expectActionSuccess } from '@tests/helpers/assert-action-response';
import { mockAuthenticatedUser } from '@tests/setup/clerk-mock';
import { testPrisma } from '@tests/setup/prisma-test-client';

describe('team actions', () => {
  it('lets an approved institution admin create a team and assign a debater', async () => {
    const organizer = await createUser({ id: 'organizer_team_actions' });
    const admin = await createUser({ id: 'team_actions_admin' });
    const tournament = await createTournament({ createdByUserId: organizer.id });
    const institution = await createInstitution({ name: 'Team Action Institution' });
    await createInstitutionMember({ institutionId: institution.id, userId: admin.id, role: 'ADMIN' });
    await createTournamentInstitution({
      tournamentId: tournament.id,
      institutionId: institution.id,
      requestedByUserId: admin.id,
    });
    const debater = await createTournamentParticipant({
      tournamentId: tournament.id,
      institutionId: institution.id,
      role: 'DEBATER',
    });

    mockAuthenticatedUser({ id: admin.id, email: 'admin@example.com' });

    const createdTeam = expectActionSuccess(
      await createTeam({ tournamentId: tournament.id, institutionId: institution.id })
    );

    expect(createdTeam.data!.team.name).toBe(`${institution.name} 1`);
    expectActionSuccess(
      await assignDebaterToTeam({
        tournamentId: tournament.id,
        participantId: debater.id,
        teamId: createdTeam.data!.team.id,
      })
    );

    const state = expectActionSuccess(await getInstitutionTeamState(tournament.id, institution.id));
    expect(state.data!.teams).toHaveLength(1);
    expect(state.data!.teams[0].members).toHaveLength(1);
    expect(state.data!.teams[0].members[0].participantId).toBe(debater.id);
  });

  it('blocks institution admins whose tournament registration is not approved', async () => {
    const organizer = await createUser({ id: 'organizer_unapproved_team' });
    const admin = await createUser({ id: 'unapproved_team_admin' });
    const tournament = await createTournament({ createdByUserId: organizer.id });
    const institution = await createInstitution({ name: 'Unapproved Team Institution' });
    await createInstitutionMember({ institutionId: institution.id, userId: admin.id, role: 'ADMIN' });

    mockAuthenticatedUser({ id: admin.id, email: 'admin@example.com' });

    expectActionFailure(
      await createTeam({ tournamentId: tournament.id, institutionId: institution.id }),
      'Forbidden'
    );
  });

  it('enforces team size when bulk-adding guest debaters to a team', async () => {
    const organizer = await createUser({ id: 'organizer_bulk_team' });
    const tournament = await createTournament({
      createdByUserId: organizer.id,
      settings: { teamSizeMin: 1, teamSizeMax: 1 },
    });
    const institution = await createInstitution({ name: 'Bulk Team Institution' });
    await createTournamentInstitution({
      tournamentId: tournament.id,
      institutionId: institution.id,
      requestedByUserId: organizer.id,
    });

    mockAuthenticatedUser({ id: organizer.id, email: 'organizer@example.com' });

    const team = expectActionSuccess(
      await createTeam({ tournamentId: tournament.id, institutionId: institution.id })
    ).data!.team;
    const result = expectActionSuccess(
      await bulkAddDebatersToTeam({
        tournamentId: tournament.id,
        teamId: team.id,
        names: 'First Guest\nSecond Guest',
      })
    );

    expect(result.data!.totalCreated).toBe(1);
    expect(result.data!.results).toEqual([
      expect.objectContaining({ name: 'First Guest', success: true }),
      expect.objectContaining({ name: 'Second Guest', success: false, error: 'Team full (max 1)' }),
    ]);
    await expect(
      testPrisma.tournamentTeamMember.count({ where: { teamId: team.id } })
    ).resolves.toBe(1);
  });
});
