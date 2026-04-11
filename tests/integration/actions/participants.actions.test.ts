import { describe, expect, it } from 'vitest';
import {
  addGuestParticipant,
  getTournamentParticipants,
  removeParticipant,
} from '@/actions/participants.actions';
import { createInstitution, createTournamentInstitution } from '@tests/factories/institution.factory';
import { createTournamentParticipant } from '@tests/factories/participant.factory';
import { createTournament } from '@tests/factories/tournament.factory';
import { createUser } from '@tests/factories/user.factory';
import { expectActionFailure, expectActionSuccess } from '@tests/helpers/assert-action-response';
import { mockAuthenticatedUser, mockUnauthenticatedUser } from '@tests/setup/clerk-mock';
import { testPrisma } from '@tests/setup/prisma-test-client';

describe('participant actions', () => {
  it('lets a tournament organizer add and remove a guest judge', async () => {
    const organizer = await createUser({ id: 'organizer_participants' });
    const tournament = await createTournament({ createdByUserId: organizer.id });

    mockAuthenticatedUser({ id: organizer.id, email: 'organizer@example.com' });

    const created = expectActionSuccess(
      await addGuestParticipant({
        tournamentId: tournament.id,
        role: 'JUDGE',
        displayName: 'Guest Judge',
      })
    );

    const participant = await testPrisma.tournamentParticipant.findUniqueOrThrow({
      where: { id: created.data!.participantId },
      include: { user: true, institution: true },
    });
    expect(participant.role).toBe('JUDGE');
    expect(participant.user.id).toMatch(/^guest_/);
    expect(participant.institution.name).toBe('Independent Adjudicators');

    expectActionSuccess(await removeParticipant(tournament.id, participant.id));
    await expect(
      testPrisma.tournamentParticipant.findUnique({ where: { id: participant.id } })
    ).resolves.toBeNull();
    await expect(testPrisma.user.findUnique({ where: { id: participant.userId } })).resolves.toBeNull();
  });

  it('blocks guest debaters without an institution', async () => {
    const organizer = await createUser({ id: 'organizer_debater_without_inst' });
    const tournament = await createTournament({ createdByUserId: organizer.id });

    mockAuthenticatedUser({ id: organizer.id, email: 'organizer@example.com' });

    expectActionFailure(
      await addGuestParticipant({
        tournamentId: tournament.id,
        role: 'DEBATER',
        displayName: 'Guest Debater',
      }),
      'Institution is required'
    );
  });

  it('limits institution admins to their approved institution participants', async () => {
    const organizer = await createUser({ id: 'organizer_scope' });
    const admin = await createUser({ id: 'institution_admin_scope' });
    const otherAdmin = await createUser({ id: 'other_admin_scope' });
    const tournament = await createTournament({ createdByUserId: organizer.id });
    const institution = await createInstitution({ name: 'Scope Institution' });
    const otherInstitution = await createInstitution({ name: 'Other Scope Institution' });

    await testPrisma.institutionMember.create({
      data: { institutionId: institution.id, userId: admin.id, role: 'ADMIN' },
    });
    await testPrisma.institutionMember.create({
      data: { institutionId: otherInstitution.id, userId: otherAdmin.id, role: 'ADMIN' },
    });
    await createTournamentInstitution({
      tournamentId: tournament.id,
      institutionId: institution.id,
      requestedByUserId: admin.id,
    });
    await createTournamentInstitution({
      tournamentId: tournament.id,
      institutionId: otherInstitution.id,
      requestedByUserId: otherAdmin.id,
    });

    await createTournamentParticipant({
      tournamentId: tournament.id,
      institutionId: institution.id,
      role: 'JUDGE',
    });
    await createTournamentParticipant({
      tournamentId: tournament.id,
      institutionId: otherInstitution.id,
      role: 'JUDGE',
    });

    mockAuthenticatedUser({ id: admin.id, email: 'admin@example.com' });

    const result = expectActionSuccess(await getTournamentParticipants(tournament.id));
    expect(result.data!.judges).toHaveLength(1);
    expect(result.data!.judges[0].institutionId).toBe(institution.id);
    expect(result.data!.institutions).toEqual([{ id: institution.id, name: institution.name }]);
  });

  it('allows unauthenticated reads only for public tournaments', async () => {
    const organizer = await createUser({ id: 'organizer_public_participants' });
    const publicTournament = await createTournament({
      createdByUserId: organizer.id,
      isPublic: true,
    });
    const privateTournament = await createTournament({
      createdByUserId: organizer.id,
      isPublic: false,
    });

    mockUnauthenticatedUser();

    expectActionSuccess(await getTournamentParticipants(publicTournament.id));
    expectActionFailure(await getTournamentParticipants(privateTournament.id), 'Unauthorized');
  });
});
