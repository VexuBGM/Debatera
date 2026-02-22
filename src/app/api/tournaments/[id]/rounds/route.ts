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
  getTeamsForTournament,
} from '@/lib/tournamentRounds';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/**
 * GET /api/tournaments/[id]/rounds
 *
 * Returns all rounds for a tournament.
 * - Admins see all rounds including DRAFT
 * - Non-admins only see PUBLISHED, IN_PROGRESS, COMPLETED
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

    const rounds = await getRoundsForTournament(tournamentId, {
      includeDebates: false,
      isAdmin,
    });

    return NextResponse.json({ rounds }, { status: 200 });
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

    // Determine how many empty debates to create based on team count and debate format
    const [teams, settings] = await Promise.all([
      getTeamsForTournament(tournamentId),
      prisma.tournamentSettings.findUnique({
        where: { tournamentId },
        select: { debateFormat: true },
      }),
    ]);

    const teamCount = teams.length;
    const debateFormat = settings?.debateFormat ?? 'WSDC';

    // WSDC: 2 teams per debate, BP: 4 teams per debate
    const teamsPerDebate = debateFormat === 'BP' ? 4 : 2;
    const emptyDebateCount = teamCount >= teamsPerDebate
      ? Math.floor(teamCount / teamsPerDebate)
      : 0;

    // Create the round with empty debate slots
    const round = await createRound(tournamentId, nextNumber, validation.data.name, emptyDebateCount);

    return NextResponse.json(round, { status: 201 });
  } catch (err) {
    console.error('Error creating round:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
