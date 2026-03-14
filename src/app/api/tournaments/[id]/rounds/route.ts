/**
 * API: Tournament Rounds Collection
 *
 * GET  /api/tournaments/[id]/rounds - List rounds
 * POST /api/tournaments/[id]/rounds - Create a new round (admin only)
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ensureUserInDB } from '@/lib/ensureUser';
import {
  isTournamentAdmin,
  getRoundsForTournament,
  getNextRoundNumber,
  createRound,
  CreateRoundSchema,
} from '@/lib/tournamentRounds';
import { parsePaginationParams, paginationToSkipTake, buildPaginationMeta } from '@/lib/pagination';
import { prisma } from '@/lib/prisma';
import { TournamentRoundStatus } from '@prisma/client';

export const runtime = 'nodejs';

/**
 * GET /api/tournaments/[id]/rounds
 *
 * Returns paginated rounds for a tournament.
 * - Admins see all rounds including DRAFT
 * - Non-admins only see PUBLISHED, IN_PROGRESS, COMPLETED
 * Supports ?page=1&pageSize=20 query params.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const { id: tournamentId } = await params;

    // Check if user is admin (for filtering)
    const isAdmin = userId ? await isTournamentAdmin(tournamentId, userId) : false;

    const statusFilter = isAdmin
      ? undefined
      : { not: TournamentRoundStatus.DRAFT };
    const where = {
      tournamentId,
      ...(statusFilter && { status: statusFilter }),
    };

    const { searchParams } = new URL(req.url);
    const pagination = parsePaginationParams(searchParams);
    const { skip, take } = paginationToSkipTake(pagination);

    const [rounds, total] = await Promise.all([
      prisma.tournamentRound.findMany({
        where,
        orderBy: { number: 'asc' },
        skip,
        take,
      }),
      prisma.tournamentRound.count({ where }),
    ]);

    return NextResponse.json(
      { rounds, pagination: buildPaginationMeta(total, pagination) },
      { status: 200 },
    );
  } catch (err) {
    console.error('Error fetching rounds:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/tournaments/[id]/rounds
 *
 * Creates a new round for the tournament.
 * Admin only.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureUserInDB();
  const { id: tournamentId } = await params;

  // Check admin permission
  const isAdmin = await isTournamentAdmin(tournamentId, userId);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    body = {};
  }

  const validation = CreateRoundSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation Error', details: validation.error.format() },
      { status: 400 }
    );
  }

  try {
    // Get next round number
    const nextNumber = await getNextRoundNumber(tournamentId);

    // Create the round
    const round = await createRound(tournamentId, nextNumber, validation.data.name);

    return NextResponse.json(round, { status: 201 });
  } catch (err) {
    console.error('Error creating round:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
