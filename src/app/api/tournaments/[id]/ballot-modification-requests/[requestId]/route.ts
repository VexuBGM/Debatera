import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { ensureUserInDB } from '@/lib/ensureUser';
import { prisma } from '@/lib/prisma';
import {
  ResolveBallotModificationRequestSchema,
  invalidateDebateResult,
  serializeBallotModificationRequest,
} from '@/lib/ballots';
import { isTournamentAdmin } from '@/lib/tournamentRounds/authorization';

export const runtime = 'nodejs';

type RouteParams = {
  params: Promise<{ id: string; requestId: string }>;
};

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureUserInDB();

    const { id: tournamentId, requestId } = await params;
    const isAdmin = await isTournamentAdmin(tournamentId, userId);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = ResolveBallotModificationRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const modificationRequest = await prisma.ballotModificationRequest.findUnique({
      where: { id: requestId },
      include: {
        ballot: {
          include: {
            adjudicator: {
              include: {
                debate: {
                  include: {
                    round: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!modificationRequest) {
      return NextResponse.json(
        { error: 'Modification request not found' },
        { status: 404 }
      );
    }

    if (modificationRequest.ballot.adjudicator.debate.round.tournamentId !== tournamentId) {
      return NextResponse.json(
        { error: 'Modification request not found' },
        { status: 404 }
      );
    }

    if (modificationRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Only pending requests can be resolved' },
        { status: 409 }
      );
    }

    const resolutionNote = parsed.data.resolutionNote?.trim() || null;

    const resolvedRequest = await prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.ballotModificationRequest.update({
        where: { id: requestId },
        data: {
          status: parsed.data.status,
          resolutionNote,
          resolvedByUserId: userId,
          resolvedAt: new Date(),
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

      if (parsed.data.status === 'APPROVED') {
        await tx.ballot.update({
          where: { id: modificationRequest.ballotId },
          data: {
            status: 'DRAFT',
            submittedAt: null,
            reopenedAt: new Date(),
            reopenedByUserId: userId,
          },
        });

        await invalidateDebateResult(modificationRequest.ballot.debateId, tx);
      }

      return updatedRequest;
    });

    return NextResponse.json(
      {
        success: true,
        request: serializeBallotModificationRequest(resolvedRequest),
        ballotReopened: parsed.data.status === 'APPROVED',
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Error resolving ballot modification request:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
