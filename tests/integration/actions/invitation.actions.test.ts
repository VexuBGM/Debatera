import { describe, expect, it } from 'vitest';
import { createInstitutionInvitation } from '@/actions/invitation.actions';
import { createInstitution, createInstitutionMember } from '@tests/factories/institution.factory';
import { createUser } from '@tests/factories/user.factory';
import { mockAuthenticatedUser } from '@tests/setup/clerk-mock';
import { testPrisma } from '@tests/setup/prisma-test-client';

describe('institution invitation actions', () => {
  it('allows institution admins to invite an existing user', async () => {
    const admin = await createUser({ id: 'invite_admin', email: 'admin@example.com' });
    const target = await createUser({ id: 'invite_target', email: 'target@example.com' });
    const institution = await createInstitution({ name: 'Invitation Institution' });
    await createInstitutionMember({
      institutionId: institution.id,
      userId: admin.id,
      role: 'ADMIN',
    });
    mockAuthenticatedUser({ id: admin.id, email: admin.email! });

    const result = await createInstitutionInvitation(institution.id, target.email!, 'MEMBER');

    expect(result.success).toBe(true);
    expect(result.invitation).toMatchObject({
      institutionId: institution.id,
      invitedUserId: target.id,
      role: 'MEMBER',
      status: 'PENDING',
    });
    await expect(
      testPrisma.notification.findFirstOrThrow({
        where: { userId: target.id, entityId: result.invitation!.id },
      })
    ).resolves.toBeTruthy();
  });

  it('blocks non-admin members from inviting users', async () => {
    const member = await createUser({ id: 'invite_member', email: 'member@example.com' });
    const target = await createUser({ id: 'blocked_target', email: 'blocked-target@example.com' });
    const institution = await createInstitution({ name: 'Blocked Invitation Institution' });
    await createInstitutionMember({
      institutionId: institution.id,
      userId: member.id,
      role: 'MEMBER',
    });
    mockAuthenticatedUser({ id: member.id, email: member.email! });

    const result = await createInstitutionInvitation(institution.id, target.email!, 'MEMBER');

    expect(result).toMatchObject({
      success: false,
      error: 'Only institution admins can send invitations',
    });
  });
});
