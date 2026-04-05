/**
 * API: Anonymous Judge Feedback Submission
 *
 * POST /api/tournaments/[id]/feedback/[roundId]
 *
 * No authentication required — submissions are fully anonymous.
 * Body: { debateJudgeId, clarityRating, fairnessRating, comment? }
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/security/rateLimit';
import { judgeFeedbackSchema } from '@/lib/validations/feedback';
import { TournamentRoundStatus } from '@prisma/client';

export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ id: string; roundId: string }> };

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const rateLimited = rateLimit(req, 'api:feedback:submit', {
      limit: 10,
      windowMs: 60_000,
    });
    if (rateLimited) return rateLimited;

    const { id: tournamentId, roundId } = await params;

    // Parse and validate body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = judgeFeedbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { debateJudgeId, clarityRating, fairnessRating, comment } = parsed.data;

    // Validate the round belongs to the tournament and is open for feedback
    const round = await prisma.tournamentRound.findUnique({
      where: { id: roundId },
      select: { tournamentId: true, status: true },
    });

    if (!round || round.tournamentId !== tournamentId) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    if (
      round.status !== TournamentRoundStatus.IN_PROGRESS &&
      round.status !== TournamentRoundStatus.COMPLETED
    ) {
      return NextResponse.json(
        { error: 'Feedback is not open for this round' },
        { status: 403 }
      );
    }

    // Validate the debateJudge belongs to a debate in this round
    const debateJudge = await prisma.tournamentDebateJudge.findUnique({
      where: { id: debateJudgeId },
      select: {
        id: true,
        debate: { select: { roundId: true } },
      },
    });

    if (!debateJudge || debateJudge.debate.roundId !== roundId) {
      return NextResponse.json(
        { error: 'Judge assignment not found' },
        { status: 404 }
      );
    }

    // Insert feedback
    await prisma.judgeFeedback.create({
      data: {
        debateJudgeId,
        clarityRating,
        fairnessRating,
        comment: comment ?? null,
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error('Error submitting judge feedback:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
