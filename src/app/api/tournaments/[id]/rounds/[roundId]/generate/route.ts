/**
 * API: Auto-Generate Pairings
 *
 * POST /api/tournaments/[id]/rounds/[roundId]/generate
 *
 * Generates random pairings for a round.
 * Admin only, DRAFT rounds only.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ensureUserInDB } from '@/lib/ensureUser';
import { isTournamentAdmin, generatePairings, getRoundById } from '@/lib/tournamentRounds';

export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ id: string; roundId: string }> };

/**
 * POST /api/tournaments/[id]/rounds/[roundId]/generate
 *
 * Auto-generates pairings using random shuffle.
 * Replaces all existing debates and judge assignments.
 */
export async function POST(req: Request, { params }: RouteParams) {
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

  try {
    // Verify round belongs to this tournament
    const round = await getRoundById(roundId);
    if (!round || round.tournament.id !== tournamentId) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    // Generate pairings
    const result = await generatePairings(roundId, tournamentId);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Failed to generate pairings',
          warnings: result.warnings,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        debatesCreated: result.debatesCreated,
        warnings: result.warnings,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Error generating pairings:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
