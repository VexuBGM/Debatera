/**
 * API: Single Tournament Round
 *
 * GET   /api/tournaments/[id]/rounds/[roundId] - Get round details
 * PATCH /api/tournaments/[id]/rounds/[roundId] - Update round (name/status)
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ensureUserInDB } from '@/lib/ensureUser';
import {
  isTournamentAdmin,
  getRoundById,
  updateRound,
  deleteRound,
  UpdateRoundSchema,
  isValidStatusTransition,
  getRoundPublicationValidationErrors,
  TournamentRoundStatusType,
} from '@/lib/tournamentRounds';
import { TournamentRoundStatus } from '@prisma/client';
import { ensureCallsForRound } from '@/lib/stream/ensure';
import { getTournamentViewAccess } from '@/lib/security/access';
import { rateLimit } from '@/lib/security/rateLimit';
import { computeDebateResult } from '@/lib/ballots';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ id: string; roundId: string }> };

/**
 * GET /api/tournaments/[id]/rounds/[roundId]
 *
 * Returns round details with debates and judges.
 * - Admins can see all rounds
 * - Non-admins can only see non-DRAFT rounds
 */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const rateLimited = rateLimit(req, 'api:tournament-round:get', {
      limit: 120,
      windowMs: 60_000,
    });
    if (rateLimited) return rateLimited;

    const { userId } = await auth();
    const { id: tournamentId, roundId } = await params;
    const access = await getTournamentViewAccess(tournamentId, userId);

    if (!access.exists || !access.canView) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    const round = await getRoundById(roundId);

    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    // Verify round belongs to this tournament
    if (round.tournament.id !== tournamentId) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    // Check access for DRAFT rounds
    const isAdmin = access.isAdmin;
    if (round.status === TournamentRoundStatus.DRAFT && !isAdmin) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    return NextResponse.json(round, { status: 200 });
  } catch (err) {
    console.error('Error fetching round:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PATCH /api/tournaments/[id]/rounds/[roundId]
 *
 * Update round name or status.
 * Admin only.
 */
export async function PATCH(req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureUserInDB();
  const { id: tournamentId, roundId } = await params;

  // Check admin permission
  const isAdmin = await isTournamentAdmin(tournamentId, userId);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validation = UpdateRoundSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  try {
    // Get current round
    const round = await getRoundById(roundId);

    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    if (round.tournament.id !== tournamentId) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    const updateData: { name?: string; status?: TournamentRoundStatus; motion?: string | null; infoSlide?: string | null } = {};

    // Handle name update
    if (validation.data.name !== undefined) {
      updateData.name = validation.data.name;
    }

    // Handle motion update
    if (validation.data.motion !== undefined) {
      updateData.motion = validation.data.motion;
    }

    // Handle infoSlide update
    if (validation.data.infoSlide !== undefined) {
      updateData.infoSlide = validation.data.infoSlide;
    }

    // Handle status transition
    if (validation.data.status !== undefined) {
      const currentStatus = round.status as TournamentRoundStatusType;
      const newStatus = validation.data.status;

      if (!isValidStatusTransition(currentStatus, newStatus)) {
        return NextResponse.json(
          { error: `Invalid status transition from ${currentStatus} to ${newStatus}` },
          { status: 400 }
        );
      }

      // Validate before publishing: all non-bye debates need teams + judges
      if (newStatus === 'PUBLISHED') {
        const validationErrors = await getRoundPublicationValidationErrors(roundId);

        if (validationErrors.length > 0) {
          return NextResponse.json(
            {
              error: 'Cannot publish: Invalid pairings',
              validationErrors,
            },
            { status: 400 }
          );
        }
      }

      updateData.status = newStatus as TournamentRoundStatus;
    }

    // Only update if there's something to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(round, { status: 200 });
    }

    const updatedRound = await updateRound(roundId, updateData);

    // When a round is published, create Stream video calls for ONLINE tournaments
    if (updateData.status === TournamentRoundStatus.PUBLISHED) {
      // Best-effort: don't block response if call creation fails
      ensureCallsForRound(roundId, userId).catch((err) =>
        console.error('[stream] Failed to ensure calls for round:', err)
      );
    }

    if (updateData.status === TournamentRoundStatus.COMPLETED) {
      const debates = await prisma.tournamentDebate.findMany({
        where: { roundId },
        select: { id: true },
      });

      await Promise.all(
        debates.map(async (debate) => {
          await computeDebateResult(debate.id);
        })
      );
    }

    return NextResponse.json(updatedRound, { status: 200 });
  } catch (err) {
    console.error('Error updating round:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * DELETE /api/tournaments/[id]/rounds/[roundId]
 *
 * Delete a round and all its associated data.
 * Admin only. Only DRAFT rounds can be deleted.
 */
export async function DELETE(req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureUserInDB();
  const { id: tournamentId, roundId } = await params;

  const isAdmin = await isTournamentAdmin(tournamentId, userId);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const round = await getRoundById(roundId);

    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    if (round.tournament.id !== tournamentId) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    if (round.status !== TournamentRoundStatus.DRAFT) {
      return NextResponse.json(
        { error: 'Only draft rounds can be deleted' },
        { status: 400 }
      );
    }

    await deleteRound(roundId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('Error deleting round:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
