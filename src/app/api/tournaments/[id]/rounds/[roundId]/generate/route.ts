/**
 * API: Auto-Generate Pairings
 *
 * POST /api/tournaments/[id]/rounds/[roundId]/generate
 *
 * Generates pairings for a round using the tournament's configured
 * pairing system and debate format.
 * Admin only, DRAFT rounds only.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ensureUserInDB } from '@/lib/ensureUser';
import { isTournamentAdmin, generatePairings, getRoundById } from '@/lib/tournamentRounds';
import { generateSwissPairings } from '@/lib/pairings';
import { generateBpPairings } from '@/lib/pairings/bp';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ id: string; roundId: string }> };

/**
 * POST /api/tournaments/[id]/rounds/[roundId]/generate
 *
 * Auto-generates pairings based on the tournament's pairing system and format.
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

    // Determine debate format and pairing system from tournament settings
    const settings = await prisma.tournamentSettings.findUnique({
      where: { tournamentId },
      select: { pairingSystem: true, debateFormat: true },
    });

    const pairingSystem = settings?.pairingSystem ?? 'SWISS';
    const debateFormat = settings?.debateFormat ?? 'WSDC';

    // BP format uses its own pairing generator
    if (debateFormat === 'BP') {
      const result = await generateBpPairings({ tournamentId, roundId });
      return NextResponse.json(
        {
          success: true,
          debatesCreated: result.debatesCreated,
          warnings: result.warnings,
        },
        { status: 200 },
      );
    }

    // WSDC format
    if (pairingSystem === 'SWISS') {
      // Swiss-system pairings
      const result = await generateSwissPairings({ tournamentId, roundId });
      return NextResponse.json(
        {
          success: true,
          debatesCreated: result.debatesCreated,
          warnings: result.warnings,
        },
        { status: 200 },
      );
    }

    // Fallback: RANDOM pairing (original algorithm)
    const result = await generatePairings(roundId, tournamentId);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Failed to generate pairings',
          warnings: result.warnings,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        debatesCreated: result.debatesCreated,
        warnings: result.warnings,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('Error generating pairings:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
