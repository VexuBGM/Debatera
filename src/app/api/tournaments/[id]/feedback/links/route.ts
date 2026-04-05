/**
 * API: Organizer — Shareable Feedback Links
 *
 * GET /api/tournaments/[id]/feedback/links
 *
 * Auth: Clerk session, must be tournament creator.
 * Returns one shareable feedback URL per round, plus per-judge feedback counts
 * so the organizer can see which judges have received feedback.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { ensureUserInDB } from '@/lib/ensureUser';
import { buildRoundFeedbackLink } from '@/lib/security/url';
import { displayNameFromDbUser } from '@/lib/users/displayName';

export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureUserInDB();

    const { id: tournamentId } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { createdByUserId: true },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    if (tournament.createdByUserId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rounds = await prisma.tournamentRound.findMany({
      where: { tournamentId },
      orderBy: { number: 'asc' },
      select: {
        id: true,
        name: true,
        number: true,
        status: true,
        debates: {
          where: { isBye: false },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            propTeam: { select: { name: true } },
            oppTeam: { select: { name: true } },
            judges: {
              select: {
                id: true,
                role: true,
                participant: { include: { user: true } },
                _count: { select: { feedbacks: true } },
              },
            },
          },
        },
      },
    });

    const result = rounds.map((round) => ({
      roundId: round.id,
      roundName: round.name,
      roundNumber: round.number,
      roundStatus: round.status,
      url: buildRoundFeedbackLink(tournamentId, round.id),
      debates: round.debates.map((debate) => ({
        debateId: debate.id,
        propTeamName: debate.propTeam?.name ?? null,
        oppTeamName: debate.oppTeam?.name ?? null,
        judges: debate.judges.map((j) => ({
          debateJudgeId: j.id,
          judgeName: displayNameFromDbUser(j.participant.user),
          judgeRole: j.role,
          feedbackCount: j._count.feedbacks,
        })),
      })),
    }));

    return NextResponse.json({ rounds: result }, { status: 200 });
  } catch (err) {
    console.error('Error fetching feedback links:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
