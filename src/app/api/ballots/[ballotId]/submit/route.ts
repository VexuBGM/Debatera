/**
 * API: Submit Ballot
 *
 * POST /api/ballots/[ballotId]/submit
 * Validates, computes totals, locks ballot as SUBMITTED.
 * Then attempts to compute the debate result if all ballots are in.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import {
  loadBallotAccessContext,
  canEditBallot,
  SubmitBallotSchema,
  validateBallotSubmission,
  PROP_ROLES,
  OPP_ROLES,
  computeDebateResult,
} from '@/lib/ballots';
import { SpeechRole, BallotStatus } from '@prisma/client';

export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ ballotId: string }> };

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ballotId } = await params;
    const loaded = await loadBallotAccessContext(ballotId);

    if (!loaded) {
      return NextResponse.json({ error: 'Ballot not found' }, { status: 404 });
    }

    // Already submitted
    if (loaded.ballot.status === BallotStatus.SUBMITTED) {
      return NextResponse.json(
        { error: 'Ballot has already been submitted and cannot be edited' },
        { status: 403 }
      );
    }

    if (!canEditBallot(userId, loaded.context)) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot submit this ballot' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = SubmitBallotSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Run deeper validation
    const validationErrors = validateBallotSubmission(data);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', validationErrors },
        { status: 422 }
      );
    }

    // Compute totals
    let propTotal = 0;
    let oppTotal = 0;

    for (const speech of data.speeches) {
      if (PROP_ROLES.includes(speech.role as SpeechRole)) {
        propTotal += speech.score;
      } else if (OPP_ROLES.includes(speech.role as SpeechRole)) {
        oppTotal += speech.score;
      }
    }

    // Submit in transaction
    await prisma.$transaction(async (tx) => {
      await tx.ballot.update({
        where: { id: ballotId },
        data: {
          status: 'SUBMITTED',
          vote: data.vote,
          propTotal,
          oppTotal,
          privateNotes: data.privateNotes ?? null,
          submittedAt: new Date(),
          reopenedAt: null,
          reopenedByUserId: null,
        },
      });

      for (const speech of data.speeches) {
        await tx.ballotSpeech.updateMany({
          where: {
            ballotId,
            role: speech.role as SpeechRole,
          },
          data: {
            speakerId: speech.speakerId ?? null,
            speakerName: speech.speakerName ?? null,
            score: speech.score,
            comment: speech.comment ?? null,
          },
        });
      }
    });

    // Try to compute debate result (only succeeds if all ballots submitted)
    const debateResult = await computeDebateResult(loaded.debate.id);

    return NextResponse.json(
      {
        success: true,
        debateResultComputed: debateResult !== null,
        ...(debateResult && {
          winningSide: debateResult.winningSide,
          decidedByChair: debateResult.decidedByChair,
        }),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Error submitting ballot:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
