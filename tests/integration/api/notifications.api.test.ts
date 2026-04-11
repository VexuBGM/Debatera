import { describe, expect, it } from 'vitest';
import { GET, PATCH } from '@/app/api/notifications/route';
import { createUser } from '@tests/factories/user.factory';
import { createJsonRequest, responseJson } from '@tests/helpers/api-request';
import { mockAuthenticatedUser } from '@tests/setup/clerk-mock';
import { testPrisma } from '@tests/setup/prisma-test-client';

describe('notification API routes', () => {
  it('returns unread notifications and unread count for the current user only', async () => {
    const user = await createUser({ id: 'notifications_user' });
    const otherUser = await createUser({ id: 'notifications_other_user' });
    await testPrisma.notification.createMany({
      data: [
        {
          userId: user.id,
          type: 'GENERAL',
          title: 'Unread notification',
          message: 'Read me',
          isRead: false,
        },
        {
          userId: user.id,
          type: 'GENERAL',
          title: 'Read notification',
          isRead: true,
        },
        {
          userId: otherUser.id,
          type: 'GENERAL',
          title: 'Other notification',
          isRead: false,
        },
      ],
    });

    mockAuthenticatedUser({ id: user.id, email: 'notifications@example.com' });

    const response = await GET(
      createJsonRequest('http://localhost/api/notifications?unreadOnly=true')
    );

    expect(response.status).toBe(200);
    const body = await responseJson<{
      notifications: Array<{ title: string; href: string | null }>;
      unreadCount: number;
    }>(response);
    expect(body.unreadCount).toBe(1);
    expect(body.notifications).toEqual([
      expect.objectContaining({ title: 'Unread notification', href: null }),
    ]);
  });

  it('marks only the current user notifications as read', async () => {
    const user = await createUser({ id: 'notifications_patch_user' });
    const otherUser = await createUser({ id: 'notifications_patch_other_user' });
    const ownNotification = await testPrisma.notification.create({
      data: { userId: user.id, title: 'Own notification', type: 'GENERAL' },
    });
    const otherNotification = await testPrisma.notification.create({
      data: { userId: otherUser.id, title: 'Other notification', type: 'GENERAL' },
    });

    mockAuthenticatedUser({ id: user.id, email: 'notifications@example.com' });

    const response = await PATCH(
      createJsonRequest('http://localhost/api/notifications', {
        method: 'PATCH',
        body: { notificationIds: [ownNotification.id, otherNotification.id] },
      })
    );

    expect(response.status).toBe(200);
    await expect(responseJson(response)).resolves.toEqual({ success: true });
    await expect(
      testPrisma.notification.findUniqueOrThrow({ where: { id: ownNotification.id } })
    ).resolves.toEqual(expect.objectContaining({ isRead: true }));
    await expect(
      testPrisma.notification.findUniqueOrThrow({ where: { id: otherNotification.id } })
    ).resolves.toEqual(expect.objectContaining({ isRead: false }));
  });
});
