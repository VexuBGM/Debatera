/**
 * API: Portal Ballot Submit
 *
 * POST /api/tournaments/[id]/portal/ballots/[ballotId]/submit
 *
 * Token-authenticated ballot submission.
 * Validates, computes totals, locks ballot as SUBMITTED.
 * Attempts to compute debate result when all ballots are in.
 */

import { NextResponse } from 'next/server';
import { SpeechRole } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { extractToken, validatePortalBallotAccess } from '@/lib/portal';
import {
  SubmitBallotSchema,
  validateBallotSubmission,
  PROP_ROLES,
  OPP_ROLES,
  computeDebateResult,
  canJudgeEditBallotState,
} from '@/lib/ballots';
import { rateLimit } from '@/lib/security/rateLimit';

export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ id: string; ballotId: string }> };

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const rateLimited = rateLimit(req, 'api:portal:ballot:submit', {
      limit: 30,
      windowMs: 60_000,
    });
    if (rateLimited) return rateLimited;

    const { id: tournamentId, ballotId } = await params;

    const token = extractToken(req);
    if (!token) {
      return NextResponse.json(
        { error: 'Missing authentication token' },
        { status: 401 }
      );
    }

    const portalAuth = await validatePortalBallotAccess(token, ballotId);
    if (!portalAuth) {
      return NextResponse.json(
        { error: 'Invalid token or ballot access denied' },
        { status: 401 }
      );
    }

    if (portalAuth.tournamentId !== tournamentId) {
      return NextResponse.json(
        { error: 'Ballot does not belong to this tournament' },
        { status: 403 }
      );
    }

    if (
      !canJudgeEditBallotState({
        ballotStatus: portalAuth.ballot.status,
        roundStatus: portalAuth.roundStatus,
        reopenedAt: portalAuth.ballot.reopenedAt,
      })
    ) {
      return NextResponse.json(
        { error: 'Cannot submit ballot in its current state' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = SubmitBallotSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const data = parsed.data;

    const validationErrors = validateBallotSubmission(data);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', validationErrors },
        { status: 422 }
      );
    }

    let propTotal = 0;
    let oppTotal = 0;

    for (const speech of data.speeches) {
      if (PROP_ROLES.includes(speech.role as SpeechRole)) {
        propTotal += speech.score;
      } else if (OPP_ROLES.includes(speech.role as SpeechRole)) {
        oppTotal += speech.score;
      }
    }

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

    const debateResult = await computeDebateResult(portalAuth.ballot.debateId);

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
    console.error('Error submitting portal ballot:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
