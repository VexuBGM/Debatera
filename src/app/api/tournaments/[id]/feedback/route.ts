/**
 * API: Organizer — All Feedback for Tournament
 *
 * GET /api/tournaments/[id]/feedback
 *
 * Auth: Clerk session, must be tournament creator.
 * Returns all JudgeFeedback for the tournament grouped by round → debate → judge,
 * including per-judge aggregate stats.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { ensureUserInDB } from '@/lib/ensureUser';
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

    // Fetch all feedback for this tournament, via the debate → round → tournament chain
    const feedbacks = await prisma.judgeFeedback.findMany({
      where: {
        debateJudge: {
          debate: { round: { tournamentId } },
        },
      },
      include: {
        debateJudge: {
          include: {
            participant: { include: { user: true } },
            debate: {
              include: {
                round: { select: { id: true, name: true, number: true } },
                propTeam: { select: { name: true } },
                oppTeam: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: [
        { debateJudge: { debate: { round: { number: 'asc' } } } },
        { submittedAt: 'desc' },
      ],
    });

    // Group: round → debate → judge → feedbacks
    type JudgeEntry = {
      debateJudgeId: string;
      judgeName: string;
      judgeRole: string;
      feedbackCount: number;
      avgClarity: number | null;
      avgFairness: number | null;
      comments: { comment: string; submittedAt: string }[];
    };

    type DebateEntry = {
      debateId: string;
      propTeamName: string | null;
      oppTeamName: string | null;
      judges: JudgeEntry[];
    };

    type RoundEntry = {
      roundId: string;
      roundName: string;
      roundNumber: number;
      debates: DebateEntry[];
    };

    const roundMap = new Map<string, RoundEntry>();
    const debateMap = new Map<string, DebateEntry>();
    const judgeMap = new Map<string, { entry: JudgeEntry; sums: { clarity: number; fairness: number } }>();

    for (const fb of feedbacks) {
      const { debateJudge } = fb;
      const { debate } = debateJudge;
      const { round } = debate;

      // Round
      if (!roundMap.has(round.id)) {
        roundMap.set(round.id, {
          roundId: round.id,
          roundName: round.name,
          roundNumber: round.number,
          debates: [],
        });
      }

      // Debate
      if (!debateMap.has(debate.id)) {
        const debateEntry: DebateEntry = {
          debateId: debate.id,
          propTeamName: debate.propTeam?.name ?? null,
          oppTeamName: debate.oppTeam?.name ?? null,
          judges: [],
        };
        debateMap.set(debate.id, debateEntry);
        roundMap.get(round.id)!.debates.push(debateEntry);
      }

      // Judge
      if (!judgeMap.has(debateJudge.id)) {
        const judgeEntry: JudgeEntry = {
          debateJudgeId: debateJudge.id,
          judgeName: displayNameFromDbUser(debateJudge.participant.user),
          judgeRole: debateJudge.role,
          feedbackCount: 0,
          avgClarity: null,
          avgFairness: null,
          comments: [],
        };
        judgeMap.set(debateJudge.id, { entry: judgeEntry, sums: { clarity: 0, fairness: 0 } });
        debateMap.get(debate.id)!.judges.push(judgeEntry);
      }

      const jm = judgeMap.get(debateJudge.id)!;
      jm.entry.feedbackCount += 1;
      jm.sums.clarity += fb.clarityRating;
      jm.sums.fairness += fb.fairnessRating;
      if (fb.comment) {
        jm.entry.comments.push({
          comment: fb.comment,
          submittedAt: fb.submittedAt.toISOString(),
        });
      }
    }

    // Compute averages
    for (const { entry, sums } of judgeMap.values()) {
      if (entry.feedbackCount > 0) {
        entry.avgClarity = Math.round((sums.clarity / entry.feedbackCount) * 10) / 10;
        entry.avgFairness = Math.round((sums.fairness / entry.feedbackCount) * 10) / 10;
      }
    }

    const rounds = Array.from(roundMap.values()).sort(
      (a, b) => a.roundNumber - b.roundNumber
    );

    return NextResponse.json({ rounds }, { status: 200 });
  } catch (err) {
    console.error('Error fetching tournament feedback:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
