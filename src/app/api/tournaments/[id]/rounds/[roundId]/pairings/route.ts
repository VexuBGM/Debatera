/**
 * API: Round Pairings
 *
 * GET /api/tournaments/[id]/rounds/[roundId]/pairings - Get pairings for a round
 * PUT /api/tournaments/[id]/rounds/[roundId]/pairings - Save manual pairings edits
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ensureUserInDB } from '@/lib/ensureUser';
import {
  isTournamentAdmin,
  getPairingsForRound,
  savePairings,
  SavePairingsSchema,
  getTeamsForTournament,
  getJudgesForTournament,
} from '@/lib/tournamentRounds';
import { TournamentRoundStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getDebateRoleForUser, type DebateStreamRole } from '@/lib/stream/eligibility';

export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ id: string; roundId: string }> };

/**
 * GET /api/tournaments/[id]/rounds/[roundId]/pairings
 *
 * Returns full pairings data for the round editor.
 * - Admins can see all rounds
 * - Non-admins can only see non-DRAFT rounds
 *
 * Also includes unassigned teams and judges for the editor.
 */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    const { id: tournamentId, roundId } = await params;

    const round = await getPairingsForRound(roundId);

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

    // For the editor, also load all teams, judges, and venues
    const [allTeams, allJudges, allVenues] = await Promise.all([
      getTeamsForTournament(tournamentId),
      getJudgesForTournament(tournamentId),
      (await import('@/lib/prisma')).prisma.venue.findMany({
        where: { tournamentId, isActive: true },
        orderBy: { priority: 'desc' },
        select: { id: true, name: true, priority: true },
      }),
    ]);

    // Calculate which teams and judges are assigned
    const assignedTeamIds = new Set<string>();
    const assignedJudgeIds = new Set<string>();

    for (const debate of round.debates) {
      if (debate.propTeamId) assignedTeamIds.add(debate.propTeamId);
      if (debate.oppTeamId) assignedTeamIds.add(debate.oppTeamId);
      for (const judge of debate.judges) {
        assignedJudgeIds.add(judge.participantId);
      }
    }

    const unassignedTeams = allTeams.filter((t) => !assignedTeamIds.has(t.id));
    const unassignedJudges = allJudges.filter((j) => !assignedJudgeIds.has(j.id));

    // Fetch event mode for the tournament (for "Join Call" button)
    const settings = await prisma.tournamentSettings.findUnique({
      where: { tournamentId },
      select: { eventMode: true },
    });
    const eventMode = settings?.eventMode ?? 'IRL';

    // Build per-debate call eligibility for the current user
    let userCallEligibility: Record<string, DebateStreamRole> = {};
    if (userId && eventMode === 'ONLINE' && round.status !== TournamentRoundStatus.DRAFT) {
      const entries = await Promise.all(
        round.debates
          .filter((d) => !d.isBye)
          .map(async (d) => {
            const role = await getDebateRoleForUser({ debateId: d.id, userId });
            return [d.id, role] as const;
          })
      );
      userCallEligibility = Object.fromEntries(
        entries.filter((e): e is [string, DebateStreamRole] => e[1] !== null)
      );
    }

    return NextResponse.json(
      {
        round,
        allTeams,
        allJudges,
        allVenues,
        unassignedTeams,
        unassignedJudges,
        isAdmin,
        eventMode,
        userCallEligibility,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Error fetching pairings:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PUT /api/tournaments/[id]/rounds/[roundId]/pairings
 *
 * Saves manual pairings edits. Admin only, DRAFT rounds only.
 */
export async function PUT(req: Request, { params }: RouteParams) {
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

  const validation = SavePairingsSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation Error', details: validation.error.format() },
      { status: 400 }
    );
  }

  try {
    const result = await savePairings(roundId, tournamentId, validation.data.debates);

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Failed to save pairings',
          validationErrors: result.errors,
          warnings: result.warnings,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        debatesSaved: result.debatesSaved,
        warnings: result.warnings,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Error saving pairings:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
