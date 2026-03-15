/**
 * API: Portal Links
 *
 * GET /api/tournaments/[id]/portal/links
 *
 * Returns existing portal link status for all judges in the tournament.
 * Decrypts and returns the URL for valid (non-expired, non-revoked) links.
 *
 * Authenticated: requires tournament admin (Clerk auth).
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { requireTournamentAdmin } from '@/lib/tournamentRounds/authorization';
import { decryptToken, isPortalTokenExpired } from '@/lib/portal';
import { buildJudgePortalLink } from '@/lib/security/url';
import { rateLimit } from '@/lib/security/rateLimit';

export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = rateLimit(req, 'api:portal:links', { limit: 30, windowMs: 60_000 }, userId);
    if (rateLimited) return rateLimited;

    const { id: tournamentId } = await params;
    await requireTournamentAdmin(tournamentId, userId);

    const links = await prisma.tournamentParticipantAccessLink.findMany({
      where: { tournamentId },
      select: {
        participantId: true,
        encryptedToken: true,
        expiresAt: true,
        lastUsedAt: true,
        revokedAt: true,
        createdAt: true,
      },
    });

    const result = links.map((link) => {
      const isExpired = isPortalTokenExpired(link.expiresAt);
      const isRevoked = !!link.revokedAt;
      const isValid = !isExpired && !isRevoked;

      let url: string | null = null;
      if (isValid && link.encryptedToken) {
        const plaintext = decryptToken(link.encryptedToken);
        if (plaintext) {
          url = buildJudgePortalLink(tournamentId, plaintext);
        }
      }

      return {
        participantId: link.participantId,
        status: isRevoked ? 'revoked' : isExpired ? 'expired' : 'active',
        url,
        expiresAt: link.expiresAt,
        lastUsedAt: link.lastUsedAt,
        createdAt: link.createdAt,
      };
    });

    return NextResponse.json({ links: result }, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof Error && 'status' in err && (err as Error & { status: number }).status === 403) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Error fetching portal links:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
