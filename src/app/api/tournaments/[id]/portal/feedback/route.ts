/**
 * API: Portal — Judge's Own Feedback
 *
 * GET /api/tournaments/[id]/portal/feedback
 *
 * Token-authenticated (same pattern as portal/judge). No Clerk session required.
 * Returns all feedback for this judge's assignments where the round is COMPLETED.
 * Individual submitter identity is never exposed.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractToken, validatePortalToken } from '@/lib/portal';
import { rateLimit } from '@/lib/security/rateLimit';
import { TournamentRoundStatus } from '@prisma/client';

export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const rateLimited = rateLimit(req, 'api:portal:feedback', {
      limit: 60,
      windowMs: 60_000,
    });
    if (rateLimited) return rateLimited;

    const { id: tournamentId } = await params;

    const token = extractToken(req);
    if (!token) {
      return NextResponse.json(
        { error: 'Missing authentication token' },
        { status: 401 }
      );
    }

    const portalAuth = await validatePortalToken(token, tournamentId);
    if (!portalAuth) {
      return NextResponse.json(
        { error: 'Invalid or expired token. Please contact the tournament organizer.' },
        { status: 401 }
      );
    }

    // Fetch all COMPLETED debate assignments for this judge, with their feedbacks
    const assignments = await prisma.tournamentDebateJudge.findMany({
      where: {
        participantId: portalAuth.participantId,
        debate: {
          round: {
            tournamentId,
            status: TournamentRoundStatus.COMPLETED,
          },
        },
      },
      include: {
        debate: {
          include: {
            round: { select: { id: true, name: true, number: true } },
            propTeam: { select: { name: true } },
            oppTeam: { select: { name: true } },
          },
        },
        feedbacks: {
          select: {
            clarityRating: true,
            fairnessRating: true,
            comment: true,
            submittedAt: true,
          },
          orderBy: { submittedAt: 'desc' },
        },
      },
      orderBy: [
        { debate: { round: { number: 'asc' } } },
        { debate: { order: 'asc' } },
      ],
    });

    const result = assignments.map((assignment) => {
      const { feedbacks, debate } = assignment;
      const count = feedbacks.length;
      const avgClarity =
        count > 0
          ? Math.round((feedbacks.reduce((s, f) => s + f.clarityRating, 0) / count) * 10) / 10
          : null;
      const avgFairness =
        count > 0
          ? Math.round((feedbacks.reduce((s, f) => s + f.fairnessRating, 0) / count) * 10) / 10
          : null;

      return {
        debateJudgeId: assignment.id,
        roundId: debate.round.id,
        roundName: debate.round.name,
        roundNumber: debate.round.number,
        propTeamName: debate.propTeam?.name ?? null,
        oppTeamName: debate.oppTeam?.name ?? null,
        feedbackCount: count,
        avgClarity,
        avgFairness,
        comments: feedbacks
          .filter((f) => f.comment)
          .map((f) => ({
            comment: f.comment!,
            submittedAt: f.submittedAt.toISOString(),
          })),
      };
    });

    return NextResponse.json({ feedback: result }, { status: 200 });
  } catch (err) {
    console.error('Error fetching portal feedback:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
