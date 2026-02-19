/**
 * Organizer: Private Link Management
 *
 * POST /api/tournaments/[id]/manage-participants/[participantId]/private-link
 *   Body: { action: 'regenerate' | 'revoke' }
 *
 * Only the tournament organizer can manage private links.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import {
  regeneratePrivateLink,
  revokePrivateLink,
  ensureParticipantPrivateLink,
} from '@/lib/identity';

export const runtime = 'nodejs';

type RouteParams = {
  params: Promise<{ id: string; participantId: string }>;
};

const ActionSchema = z.object({
  action: z.enum(['regenerate', 'revoke', 'create']),
});

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tournamentId, participantId } = await params;

    // Must be tournament organizer
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { createdByUserId: true },
    });

    if (!tournament || tournament.createdByUserId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify participant belongs to this tournament
    const participant = await prisma.tournamentParticipant.findFirst({
      where: { id: participantId, tournamentId },
    });

    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    const body = await req.json();
    const parsed = ActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid action', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { action } = parsed.data;

    if (action === 'revoke') {
      await revokePrivateLink(participantId);
      return NextResponse.json({ success: true, action: 'revoked' });
    }

    if (action === 'regenerate') {
      const result = await regeneratePrivateLink(participantId, userId);
      return NextResponse.json({
        success: true,
        action: 'regenerated',
        rawToken: result.rawToken,
        url: `/tournaments/${tournamentId}/p/${result.rawToken}`,
      });
    }

    if (action === 'create') {
      const result = await ensureParticipantPrivateLink(participantId, userId);
      if (!result) {
        return NextResponse.json(
          { error: 'Active link already exists. Use "regenerate" to create a new one.' },
          { status: 409 }
        );
      }
      return NextResponse.json({
        success: true,
        action: 'created',
        rawToken: result.rawToken,
        url: `/tournaments/${tournamentId}/p/${result.rawToken}`,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('Error managing private link:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
