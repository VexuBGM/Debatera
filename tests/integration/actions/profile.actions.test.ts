import { describe, expect, it } from 'vitest';
import { updateProfileAction } from '@/actions/profile.actions';
import { createUser } from '@tests/factories/user.factory';
import { expectActionFailure, expectActionSuccess } from '@tests/helpers/assert-action-response';
import { mockAuthenticatedUser, mockUnauthenticatedUser } from '@tests/setup/clerk-mock';
import { testPrisma } from '@tests/setup/prisma-test-client';

describe('profile actions', () => {
  it('authenticated user can update their display name', async () => {
    const user = await createUser({ id: 'profile_actions_user_update', displayName: 'Old Name' });

    mockAuthenticatedUser({ id: user.id, email: user.email! });

    const result = await updateProfileAction({ displayName: 'New Name' });

    expectActionSuccess(result);
  });

  it('display name update is persisted in the database', async () => {
    const user = await createUser({ id: 'profile_actions_user_persist', displayName: 'Old Persisted Name' });

    mockAuthenticatedUser({ id: user.id, email: user.email! });

    expectActionSuccess(await updateProfileAction({ displayName: 'Persisted Name' }));

    await expect(
      testPrisma.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { displayName: true },
      })
    ).resolves.toEqual({ displayName: 'Persisted Name' });
  });

  it('rejects a display name that exceeds the schema maximum length', async () => {
    const user = await createUser({ id: 'profile_actions_user_length' });

    mockAuthenticatedUser({ id: user.id, email: user.email! });

    expectActionFailure(
      await updateProfileAction({ displayName: 'x'.repeat(129) }),
      'Display name must be at most 128 characters'
    );
  });

  it('unauthenticated call returns { success: false }', async () => {
    mockUnauthenticatedUser();

    expectActionFailure(await updateProfileAction({ displayName: 'Anonymous Name' }), 'Not authenticated');
  });

  it('trims leading/trailing whitespace from display name', async () => {
    const user = await createUser({ id: 'profile_actions_user_trim', displayName: 'Trim Before' });

    mockAuthenticatedUser({ id: user.id, email: user.email! });

    expectActionSuccess(await updateProfileAction({ displayName: '  Trimmed Name  ' }));

    await expect(
      testPrisma.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { displayName: true },
      })
    ).resolves.toEqual({ displayName: 'Trimmed Name' });
  });
});
