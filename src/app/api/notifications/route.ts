import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { ensureUserInDB } from '@/lib/ensureUser';

export const runtime = 'nodejs';

/**
 * GET /api/notifications
 * Fetch notifications for the current user.
 * Query params:
 * - unreadOnly: 'true' to only fetch unread notifications
 */
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureUserInDB();

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get('unreadOnly') === 'true';

  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: [
        { isRead: 'asc' }, // Unread first
        { createdAt: 'desc' },
      ],
      take: 50,
    });

    // For institution invite notifications, fetch additional data
    const enrichedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        if (notification.type === 'INSTITUTION_INVITE' && notification.entityId) {
          const invitation = await prisma.institutionInvitation.findUnique({
            where: { id: notification.entityId },
            include: {
              institution: {
                select: { id: true, name: true },
              },
              createdBy: {
                select: { id: true, firstName: true, lastName: true, email: true, imageUrl: true },
              },
            },
          });

          return {
            ...notification,
            href: null,
            invitation: invitation
              ? {
                  id: invitation.id,
                  role: invitation.role,
                  status: invitation.status,
                  institution: invitation.institution,
                  createdBy: invitation.createdBy,
                }
              : null,
          };
        }

        if (
          notification.entityType === 'BallotModificationRequest' &&
          notification.entityId
        ) {
          const request = await prisma.ballotModificationRequest.findUnique({
            where: { id: notification.entityId },
            select: {
              ballot: {
                select: {
                  debate: {
                    select: {
                      roundId: true,
                      round: {
                        select: {
                          tournamentId: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          });

          return {
            ...notification,
            href: request
              ? `/tournaments/${request.ballot.debate.round.tournamentId}/rounds/${request.ballot.debate.roundId}#ballot-modification-requests`
              : null,
          };
        }

        return {
          ...notification,
          href: null,
        };
      })
    );

    // Get unread count
    const unreadCount = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return NextResponse.json({
      notifications: enrichedNotifications,
      unreadCount,
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PATCH /api/notifications
 * Mark notifications as read.
 * Body: { notificationIds?: string[], markAllRead?: boolean }
 */
export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { notificationIds, markAllRead } = await req.json();

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: { userId },
        data: { isRead: true },
      });
    } else if (notificationIds && Array.isArray(notificationIds)) {
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId, // Ensure user owns these notifications
        },
        data: { isRead: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error updating notifications:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
