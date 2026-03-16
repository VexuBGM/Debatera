import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { prisma } from '@/lib/prisma';
import { displayNameFromDbUser } from '@/lib/users/displayName';
import {
  BallotModificationRequestCreateSchema,
  loadBallotAccessContext,
  canRequestBallotModification,
  serializeBallotModificationRequest,
} from '@/lib/ballots';

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

    if (loaded.context.ballotAdjudicatorParticipantUserId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot request changes for this ballot' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = BallotModificationRequestCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
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
        ballotStatus: loaded.ballot.status,
        roundStatus: loaded.round.status,
        hasPendingRequest,
      })
    ) {
      return NextResponse.json(
        { error: 'Ballot cannot be reopened in its current state' },
        { status: 409 }
      );
    }

    const reason = parsed.data.reason?.trim() || null;
    const judgeName = displayNameFromDbUser(loaded.ballot.adjudicator.participant.user);

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
          requestedByParticipantId: loaded.ballot.adjudicator.participantId,
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
          userId: loaded.tournament.createdByUserId,
          type: 'GENERAL',
          title: 'Ballot modification requested',
          message: `${judgeName} requested to modify a submitted ballot in ${loaded.round.name}.`,
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

    console.error('Error creating ballot modification request:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
