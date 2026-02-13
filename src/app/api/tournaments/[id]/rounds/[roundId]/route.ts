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
  TournamentRoundStatusType,
} from '@/lib/tournamentRounds';
import { TournamentRoundStatus } from '@prisma/client';
import { ensureCallsForRound } from '@/lib/stream/ensure';

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
    const { userId } = await auth();
    const { id: tournamentId, roundId } = await params;

    const round = await getRoundById(roundId);

    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    // Verify round belongs to this tournament
    if (round.tournament.id !== tournamentId) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    // Check access for DRAFT rounds
    const isAdmin = userId ? await isTournamentAdmin(tournamentId, userId) : false;
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
      { error: 'Validation Error', details: validation.error.format() },
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

    const updateData: { name?: string; status?: TournamentRoundStatus } = {};

    // Handle name update
    if (validation.data.name !== undefined) {
      updateData.name = validation.data.name;
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
        const validationErrors: string[] = [];

        for (const debate of round.debates) {
          if (!debate.isBye) {
            if (!debate.propTeamId) {
              validationErrors.push(`Debate ${debate.order + 1}: Missing proposition team`);
            }
            if (!debate.oppTeamId) {
              validationErrors.push(`Debate ${debate.order + 1}: Missing opposition team`);
            }
            if (debate.judges.length === 0) {
              validationErrors.push(`Debate ${debate.order + 1}: No judges assigned`);
            }
            // Validate exactly 1 chair per debate
            const chairs = debate.judges.filter((j) => j.role === 'CHAIR');
            if (chairs.length === 0) {
              validationErrors.push(`Debate ${debate.order + 1}: No chair judge assigned`);
            } else if (chairs.length > 1) {
              validationErrors.push(`Debate ${debate.order + 1}: Multiple chair judges assigned (must be exactly 1)`);
            }
          }
        }

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
