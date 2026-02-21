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
import { generateToken, hashToken } from '@/lib/portal';
import { displayNameFromDbUser } from '@/lib/users/displayName';
import { headers } from 'next/headers';

export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const headersList = await headers();
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = headersList.get('x-forwarded-proto') || 'http';

    const links: Array<{
      participantId: string;
      judgeName: string;
      url: string;
    }> = [];

    for (const judge of judges) {
      const token = generateToken();
      const tokenHashed = hashToken(token);

      await prisma.tournamentParticipantAccessLink.upsert({
        where: { participantId: judge.id },
        create: {
          tournamentId,
          participantId: judge.id,
          tokenHash: tokenHashed,
        },
        update: {
          tokenHash: tokenHashed,
          revokedAt: null,
          updatedAt: new Date(),
        },
      });

      links.push({
        participantId: judge.id,
        judgeName: displayNameFromDbUser(judge.user),
        url: `${protocol}://${host}/tournaments/${tournamentId}/p/${token}`,
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
