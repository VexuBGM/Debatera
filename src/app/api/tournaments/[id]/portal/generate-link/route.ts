/**
 * API: Generate / Regenerate Judge Portal Link
 *
 * POST /api/tournaments/[id]/portal/generate-link
 *
 * Body: { participantId: string }
 * Returns: { url: string, judgeName: string }
 *
 * Authenticated: requires tournament admin (Clerk auth).
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { requireTournamentAdmin } from '@/lib/tournamentRounds/authorization';
import { generateToken, getPortalTokenExpiresAt, hashToken, encryptToken } from '@/lib/portal';
import { displayNameFromDbUser } from '@/lib/users/displayName';
import { z } from 'zod';
import { rateLimit } from '@/lib/security/rateLimit';
import { buildJudgePortalLink } from '@/lib/security/url';

export const runtime = 'nodejs';

const GenerateLinkSchema = z.object({
  participantId: z.string().min(1),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = rateLimit(
      req,
      'api:portal:generate-link',
      {
        limit: 20,
        windowMs: 60_000,
      },
      userId
    );
    if (rateLimited) return rateLimited;

    const { id: tournamentId } = await params;
    await requireTournamentAdmin(tournamentId, userId);

    const body = await req.json();
    const parsed = GenerateLinkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { participantId } = parsed.data;

    // Verify participant exists and is a JUDGE in this tournament
    const participant = await prisma.tournamentParticipant.findUnique({
      where: { id: participantId },
      include: { user: true },
    });

    if (!participant || participant.tournamentId !== tournamentId) {
      return NextResponse.json(
        { error: 'Participant not found in this tournament' },
        { status: 404 }
      );
    }

    if (participant.role !== 'JUDGE') {
      return NextResponse.json(
        { error: 'Only judges can receive portal links' },
        { status: 400 }
      );
    }

    // Generate new token
    const token = generateToken();
    const tokenHashed = hashToken(token);
    const tokenEncrypted = encryptToken(token);
    const expiresAt = getPortalTokenExpiresAt();

    // Upsert the access link (rotate token if already exists)
    await prisma.tournamentParticipantAccessLink.upsert({
      where: { participantId },
      create: {
        tournamentId,
        participantId,
        tokenHash: tokenHashed,
        encryptedToken: tokenEncrypted,
        expiresAt,
      },
      update: {
        tokenHash: tokenHashed,
        encryptedToken: tokenEncrypted,
        expiresAt,
        revokedAt: null, // Un-revoke if previously revoked
        updatedAt: new Date(),
      },
    });

    const url = buildJudgePortalLink(tournamentId, token);

    return NextResponse.json(
      {
        url,
        expiresAt,
        judgeName: displayNameFromDbUser(participant.user),
        participantId,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    if (err instanceof Error && 'status' in err && (err as Error & { status: number }).status === 403) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Error generating portal link:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
