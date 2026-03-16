import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { extractToken, validatePortalBallotAccess } from '@/lib/portal';
import { displayNameFromDbUser } from '@/lib/users/displayName';
import {
  BallotModificationRequestCreateSchema,
  canRequestBallotModification,
  serializeBallotModificationRequest,
} from '@/lib/ballots';
import { rateLimit } from '@/lib/security/rateLimit';

export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ id: string; ballotId: string }> };

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const rateLimited = rateLimit(req, 'api:portal:ballot:request-modification', {
      limit: 20,
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

    const body = await req.json();
    const parsed = BallotModificationRequestCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const ballot = await prisma.ballot.findUnique({
      where: { id: ballotId },
      include: {
        adjudicator: {
          include: {
            participant: {
              include: { user: true },
            },
            debate: {
              include: {
                round: {
                  include: {
                    tournament: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!ballot) {
      return NextResponse.json({ error: 'Ballot not found' }, { status: 404 });
    }

    const hasPendingRequest =
      (await prisma.ballotModificationRequest.count({
        where: {
          ballotId,
          status: 'PENDING',
        },
      })) > 0;

    if (
      !canRequestBallotModification({
        ballotStatus: ballot.status,
        roundStatus: ballot.adjudicator.debate.round.status,
        hasPendingRequest,
      })
    ) {
      return NextResponse.json(
        { error: 'Ballot cannot be reopened in its current state' },
        { status: 409 }
      );
    }

    const reason = parsed.data.reason?.trim() || null;
    const judgeName = displayNameFromDbUser(ballot.adjudicator.participant.user);
    const requestRecord = await prisma.$transaction(async (tx) => {
      const pendingRequest = await tx.ballotModificationRequest.findFirst({
        where: {
          ballotId,
          status: 'PENDING',
        },
      });

      if (pendingRequest) {
        throw new Error('A modification request is already pending for this ballot');
      }

      const createdRequest = await tx.ballotModificationRequest.create({
        data: {
          ballotId,
          requestedByParticipantId: portalAuth.participantId,
          reason,
        },
        select: {
          id: true,
          status: true,
          reason: true,
          resolutionNote: true,
          createdAt: true,
          resolvedAt: true,
        },
      });

      await tx.notification.create({
        data: {
          userId: ballot.adjudicator.debate.round.tournament.createdByUserId,
          type: 'GENERAL',
          title: 'Ballot modification requested',
          message: `${judgeName} requested to modify a submitted ballot in ${ballot.adjudicator.debate.round.name}.`,
          entityType: 'BallotModificationRequest',
          entityId: createdRequest.id,
        },
      });

      return createdRequest;
    });

    return NextResponse.json(
      {
        success: true,
        request: serializeBallotModificationRequest(requestRecord),
      },
      { status: 201 }
    );
  } catch (err) {
    if (
      err instanceof Error &&
      err.message === 'A modification request is already pending for this ballot'
    ) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }

    console.error('Error creating portal ballot modification request:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
