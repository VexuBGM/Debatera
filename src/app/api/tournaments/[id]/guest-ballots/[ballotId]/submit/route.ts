/**
 * Guest Ballot Submit API
 *
 * POST /api/tournaments/[id]/guest-ballots/[ballotId]/submit
 *
 * Validates, computes totals, locks ballot as SUBMITTED.
 * Then attempts to compute the debate result if all ballots are in.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getIpFromRequest } from '@/lib/identity/rateLimit';
import { validateGuestSessionCookie } from '@/lib/identity/guestSession';
import { validateGuestCsrf } from '@/lib/identity/guestCsrf';
import { isSameOrigin } from '@/lib/identity/requestOrigin';
import {
  SubmitBallotSchema,
  validateBallotSubmission,
  PROP_ROLES,
  OPP_ROLES,
  computeDebateResult,
} from '@/lib/ballots';
import { BallotStatus, TournamentRoundStatus, SpeechRole } from '@prisma/client';

export const runtime = 'nodejs';

type RouteParams = {
  params: Promise<{ id: string; ballotId: string }>;
};

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }

    if (!validateGuestCsrf(req)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    const ip = getIpFromRequest(req);
    if (!checkRateLimit(`guest-ballot-submit:${ip}`, { maxAttempts: 10, windowMs: 60_000 })) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { id: tournamentId, ballotId } = await params;
    const validated = await validateGuestSessionCookie(req, tournamentId);
    if (!validated) {
      return NextResponse.json({ error: 'Missing or invalid guest session' }, { status: 401 });
    }

    const { participant } = validated;

    // Load ballot and verify ownership
    const ballot = await prisma.ballot.findUnique({
      where: { id: ballotId },
      include: {
        adjudicator: {
          include: {
            debate: { include: { round: true } },
          },
        },
      },
    });

    if (!ballot) {
      return NextResponse.json({ error: 'Ballot not found' }, { status: 404 });
    }

    if (ballot.adjudicator.participantId !== participant.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (ballot.status === BallotStatus.SUBMITTED) {
      return NextResponse.json(
        { error: 'Ballot has already been submitted and cannot be edited' },
        { status: 403 }
      );
    }

    if (ballot.adjudicator.debate.round.status !== TournamentRoundStatus.IN_PROGRESS) {
      return NextResponse.json({ error: 'Round is not in progress' }, { status: 403 });
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
    const debateResult = await computeDebateResult(ballot.adjudicator.debate.id);

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
    console.error('Error submitting guest ballot:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
