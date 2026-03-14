/**
 * API: Generate Portal Links for All Judges
 *
 * POST /api/tournaments/[id]/portal/generate-all-links
 *
 * Returns: { links: Array<{ participantId, judgeName, url }> }
 *
 * Authenticated: requires tournament admin (Clerk auth).
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { requireTournamentAdmin } from '@/lib/tournamentRounds/authorization';
import { generateToken, getPortalTokenExpiresAt, hashToken } from '@/lib/portal';
import { displayNameFromDbUser } from '@/lib/users/displayName';
import { rateLimit } from '@/lib/security/rateLimit';
import { buildJudgePortalLink } from '@/lib/security/url';

export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = rateLimit(
      req,
      'api:portal:generate-all-links',
      {
        limit: 5,
        windowMs: 60_000,
      },
      userId
    );
    if (rateLimited) return rateLimited;

    const { id: tournamentId } = await params;
    await requireTournamentAdmin(tournamentId, userId);

    // Get all JUDGE participants for this tournament
    const judges = await prisma.tournamentParticipant.findMany({
      where: {
        tournamentId,
        role: 'JUDGE',
      },
      include: { user: true },
    });

    if (judges.length === 0) {
      return NextResponse.json(
        { error: 'No judges found in this tournament' },
        { status: 404 }
      );
    }

    const links: Array<{
      participantId: string;
      judgeName: string;
      url: string;
      expiresAt: Date;
    }> = [];

    for (const judge of judges) {
      const token = generateToken();
      const tokenHashed = hashToken(token);
      const expiresAt = getPortalTokenExpiresAt();

      await prisma.tournamentParticipantAccessLink.upsert({
        where: { participantId: judge.id },
        create: {
          tournamentId,
          participantId: judge.id,
          tokenHash: tokenHashed,
          expiresAt,
        },
        update: {
          tokenHash: tokenHashed,
          expiresAt,
          revokedAt: null,
          updatedAt: new Date(),
        },
      });

      links.push({
        participantId: judge.id,
        judgeName: displayNameFromDbUser(judge.user),
        url: buildJudgePortalLink(tournamentId, token),
        expiresAt,
      });
    }

    return NextResponse.json({ links }, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof Error && 'status' in err && (err as Error & { status: number }).status === 403) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Error generating all portal links:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
