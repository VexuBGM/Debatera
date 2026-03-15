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
import { prisma } from '@/lib/prisma';
import { extractToken, validatePortalBallotAccess } from '@/lib/portal';
import {
  SubmitBallotSchema,
  validateBallotSubmission,
  PROP_ROLES,
  OPP_ROLES,
  computeDebateResult,
} from '@/lib/ballots';
import { SpeechRole, BallotStatus, TournamentRoundStatus } from '@prisma/client';
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

    // Already submitted
    if (portalAuth.ballot.status === BallotStatus.SUBMITTED) {
      return NextResponse.json(
        { error: 'Ballot has already been submitted and cannot be edited' },
        { status: 403 }
      );
    }

    // Round must be IN_PROGRESS
    if (portalAuth.roundStatus !== TournamentRoundStatus.IN_PROGRESS) {
      return NextResponse.json(
        { error: 'Cannot submit ballot — round is not in progress' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = SubmitBallotSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const data = parsed.data;

    // Deep validation
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

    // Try to compute debate result
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
