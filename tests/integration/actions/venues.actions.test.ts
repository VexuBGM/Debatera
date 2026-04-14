import { describe, expect, it } from 'vitest';
import {
  autoAllocateVenuesAction,
  createVenue,
  updateVenue,
} from '@/actions/venues.actions';
import { createDebate, createRound } from '@tests/factories/round.factory';
import { createTournament } from '@tests/factories/tournament.factory';
import { createUser } from '@tests/factories/user.factory';
import { expectActionFailure, expectActionSuccess } from '@tests/helpers/assert-action-response';
import { mockAuthenticatedUser, mockUnauthenticatedUser } from '@tests/setup/clerk-mock';
import { testPrisma } from '@tests/setup/prisma-test-client';

describe('venue actions', () => {
  it('organizer can create a venue for their tournament', async () => {
    const organizer = await createUser({ id: 'venue_actions_organizer_create' });
    const tournament = await createTournament({ createdByUserId: organizer.id });

    mockAuthenticatedUser({ id: organizer.id, email: organizer.email! });

    const result = expectActionSuccess(
      await createVenue({
        tournamentId: tournament.id,
        name: 'Main Hall',
      })
    );

    expect(result.data).toMatchObject({
      tournamentId: tournament.id,
      name: 'Main Hall',
    });
  });

  it('created venue is persisted with correct defaults (isActive: true, priority: 100)', async () => {
    const organizer = await createUser({ id: 'venue_actions_organizer_defaults' });
    const tournament = await createTournament({ createdByUserId: organizer.id });

    mockAuthenticatedUser({ id: organizer.id, email: organizer.email! });

    const created = expectActionSuccess(
      await createVenue({
        tournamentId: tournament.id,
        name: 'Default Room',
      })
    ).data!;

    const venue = await testPrisma.venue.findUniqueOrThrow({
      where: { id: created.id },
    });

    expect(venue.isActive).toBe(true);
    expect(venue.priority).toBe(100);
  });

  it('organizer can update venue name and priority', async () => {
    const organizer = await createUser({ id: 'venue_actions_organizer_update' });
    const tournament = await createTournament({ createdByUserId: organizer.id });

    mockAuthenticatedUser({ id: organizer.id, email: organizer.email! });

    const venue = expectActionSuccess(
      await createVenue({
        tournamentId: tournament.id,
        name: 'Old Room',
      })
    ).data!;

    const updated = expectActionSuccess(
      await updateVenue({
        venueId: venue.id,
        name: 'New Room',
        priority: 250,
      })
    );

    expect(updated.data).toMatchObject({
      id: venue.id,
      name: 'New Room',
      priority: 250,
    });
  });

  it('organizer can deactivate a venue (isActive: false)', async () => {
    const organizer = await createUser({ id: 'venue_actions_organizer_deactivate' });
    const tournament = await createTournament({ createdByUserId: organizer.id });

    mockAuthenticatedUser({ id: organizer.id, email: organizer.email! });

    const venue = expectActionSuccess(
      await createVenue({
        tournamentId: tournament.id,
        name: 'Deactivate Room',
      })
    ).data!;

    expectActionSuccess(
      await updateVenue({
        venueId: venue.id,
        isActive: false,
      })
    );

    await expect(testPrisma.venue.findUniqueOrThrow({ where: { id: venue.id } })).resolves.toEqual(
      expect.objectContaining({ isActive: false })
    );
  });

  it('non-organizer cannot create a venue (returns { success: false })', async () => {
    const organizer = await createUser({ id: 'venue_actions_organizer_forbidden' });
    const outsider = await createUser({ id: 'venue_actions_outsider_forbidden' });
    const tournament = await createTournament({ createdByUserId: organizer.id });

    mockAuthenticatedUser({ id: outsider.id, email: outsider.email! });

    expectActionFailure(
      await createVenue({
        tournamentId: tournament.id,
        name: 'Forbidden Room',
      }),
      'Forbidden'
    );
  });

  it('unauthenticated call is rejected', async () => {
    const organizer = await createUser({ id: 'venue_actions_organizer_unauth' });
    const tournament = await createTournament({ createdByUserId: organizer.id });

    mockUnauthenticatedUser();

    expectActionFailure(
      await createVenue({
        tournamentId: tournament.id,
        name: 'Anonymous Room',
      }),
      'Unauthorized'
    );
  });

  it('returns an error when the tournament is in ONLINE mode', async () => {
    const organizer = await createUser({ id: 'venue_actions_organizer_online' });
    const tournament = await createTournament({
      createdByUserId: organizer.id,
      settings: { eventMode: 'ONLINE' },
    });

    mockAuthenticatedUser({ id: organizer.id, email: organizer.email! });

    expectActionFailure(
      await createVenue({
        tournamentId: tournament.id,
        name: 'Online Room',
      }),
      'Failed to create venue'
    );
  });
});

describe('auto-allocate venues', () => {
  it('assigns highest-priority venues to debates in order', async () => {
    const organizer = await createUser({ id: 'venue_actions_auto_organizer_order' });
    const tournament = await createTournament({ createdByUserId: organizer.id });
    const round = await createRound({ tournamentId: tournament.id });
    const debateOne = await createDebate({ roundId: round.id, order: 0 });
    const debateTwo = await createDebate({ roundId: round.id, order: 1 });

    const low = await testPrisma.venue.create({
      data: { tournamentId: tournament.id, name: 'Low Priority', priority: 10 },
    });
    const high = await testPrisma.venue.create({
      data: { tournamentId: tournament.id, name: 'High Priority', priority: 100 },
    });

    mockAuthenticatedUser({ id: organizer.id, email: organizer.email! });

    const result = expectActionSuccess(await autoAllocateVenuesAction(round.id));
    expect(result.data).toMatchObject({
      success: true,
      allocatedCount: 2,
      totalDebates: 2,
    });

    const debates = await testPrisma.tournamentDebate.findMany({
      where: { roundId: round.id },
      orderBy: { order: 'asc' },
      select: { id: true, venueId: true },
    });

    expect(debates).toEqual([
      { id: debateOne.id, venueId: high.id },
      { id: debateTwo.id, venueId: low.id },
    ]);
  });

  it('when there are more venues than debates, surplus venues are unused', async () => {
    const organizer = await createUser({ id: 'venue_actions_auto_organizer_surplus' });
    const tournament = await createTournament({ createdByUserId: organizer.id });
    const round = await createRound({ tournamentId: tournament.id });
    await createDebate({ roundId: round.id, order: 0 });

    await testPrisma.venue.createMany({
      data: [
        { tournamentId: tournament.id, name: 'Room A', priority: 100 },
        { tournamentId: tournament.id, name: 'Room B', priority: 90 },
        { tournamentId: tournament.id, name: 'Room C', priority: 80 },
      ],
    });

    mockAuthenticatedUser({ id: organizer.id, email: organizer.email! });

    const result = expectActionSuccess(await autoAllocateVenuesAction(round.id));

    expect(result.data).toMatchObject({
      success: true,
      allocatedCount: 1,
      totalDebates: 1,
      totalActiveVenues: 3,
      warnings: [],
    });
  });

  it('when there are fewer venues than debates, returns a warning and partially allocates', async () => {
    const organizer = await createUser({ id: 'venue_actions_auto_organizer_partial' });
    const tournament = await createTournament({ createdByUserId: organizer.id });
    const round = await createRound({ tournamentId: tournament.id });
    await createDebate({ roundId: round.id, order: 0 });
    const unassignedDebate = await createDebate({ roundId: round.id, order: 1 });

    const venue = await testPrisma.venue.create({
      data: { tournamentId: tournament.id, name: 'Only Room', priority: 100 },
    });

    mockAuthenticatedUser({ id: organizer.id, email: organizer.email! });

    const result = expectActionSuccess(await autoAllocateVenuesAction(round.id));

    expect(result.data).toMatchObject({
      success: true,
      allocatedCount: 1,
      totalDebates: 2,
    });
    expect(result.data!.warnings[0]).toContain('will not be assigned a venue');

    await expect(
      testPrisma.tournamentDebate.findUniqueOrThrow({
        where: { id: unassignedDebate.id },
        select: { venueId: true },
      })
    ).resolves.toEqual({ venueId: null });
    expect(venue.id).toBeTruthy();
  });

  it('BYE debates are skipped during allocation (do not consume a venue)', async () => {
    const organizer = await createUser({ id: 'venue_actions_auto_organizer_bye' });
    const tournament = await createTournament({ createdByUserId: organizer.id });
    const round = await createRound({ tournamentId: tournament.id });
    const standardDebate = await createDebate({ roundId: round.id, order: 0, isBye: false });
    const byeDebate = await createDebate({ roundId: round.id, order: 1, isBye: true });

    const venue = await testPrisma.venue.create({
      data: { tournamentId: tournament.id, name: 'Used Room', priority: 100 },
    });

    mockAuthenticatedUser({ id: organizer.id, email: organizer.email! });

    const result = expectActionSuccess(await autoAllocateVenuesAction(round.id));

    expect(result.data).toMatchObject({
      allocatedCount: 1,
      totalDebates: 1,
    });

    await expect(
      testPrisma.tournamentDebate.findUniqueOrThrow({
        where: { id: standardDebate.id },
        select: { venueId: true },
      })
    ).resolves.toEqual({ venueId: venue.id });
    await expect(
      testPrisma.tournamentDebate.findUniqueOrThrow({
        where: { id: byeDebate.id },
        select: { venueId: true },
      })
    ).resolves.toEqual({ venueId: null });
  });

  it('non-organizer cannot trigger auto-allocation', async () => {
    const organizer = await createUser({ id: 'venue_actions_auto_organizer_forbidden' });
    const outsider = await createUser({ id: 'venue_actions_auto_outsider_forbidden' });
    const tournament = await createTournament({ createdByUserId: organizer.id });
    const round = await createRound({ tournamentId: tournament.id });

    mockAuthenticatedUser({ id: outsider.id, email: outsider.email! });

    expectActionFailure(await autoAllocateVenuesAction(round.id), 'Forbidden');
  });
});
