/**
 * Venue Auto-Allocator
 *
 * Assigns venues to debates for a given round based on venue priority.
 * Higher-priority venues are assigned to higher-importance debates.
 *
 * Inspired by Tabbycat's venue allocation logic.
 */

import { prisma } from '@/lib/prisma';

// =============================================================================
// Types
// =============================================================================

export interface AutoAllocateResult {
  success: boolean;
  allocatedCount: number;
  totalDebates: number;
  totalActiveVenues: number;
  warnings: string[];
  error?: string;
}

// =============================================================================
// Auto-Allocator
// =============================================================================

/**
 * Automatically allocate venues to debates in a round.
 *
 * Algorithm:
 * 1. Fetch all active venues for the tournament, sorted by priority DESC.
 * 2. Fetch all debates for the round, sorted by importance (currently `order`).
 * 3. Pair them 1:1 — highest-priority venue → most-important debate.
 * 4. Persist all assignments in a single Prisma transaction.
 *
 * If there are more debates than venues, the surplus debates get no venue.
 * If there are more venues than debates, the surplus venues are unused.
 */
export async function autoAllocateVenues(
  roundId: string
): Promise<AutoAllocateResult> {
  const warnings: string[] = [];

  // ── 1. Fetch the round to get the tournamentId ──────────────────────
  const round = await prisma.tournamentRound.findUnique({
    where: { id: roundId },
    select: { id: true, tournamentId: true, name: true },
  });

  if (!round) {
    return {
      success: false,
      allocatedCount: 0,
      totalDebates: 0,
      totalActiveVenues: 0,
      warnings: [],
      error: 'Round not found.',
    };
  }

  // ── 2. Fetch all active venues, sorted by priority DESC ─────────────
  const activeVenues = await prisma.venue.findMany({
    where: {
      tournamentId: round.tournamentId,
      isActive: true,
    },
    orderBy: { priority: 'desc' },
    select: { id: true, name: true, priority: true },
  });

  if (activeVenues.length === 0) {
    return {
      success: false,
      allocatedCount: 0,
      totalDebates: 0,
      totalActiveVenues: 0,
      warnings: [],
      error: 'No active venues found for this tournament.',
    };
  }

  // ── 3. Fetch all debates for the round ──────────────────────────────
  // TODO: Replace `order` sorting with bracket/importance logic once
  //       elimination rounds and win-tracking are implemented.
  //       For now, `order` represents debate importance within the round.
  const debates = await prisma.tournamentDebate.findMany({
    where: { roundId },
    orderBy: { order: 'asc' },
    select: { id: true, order: true, isBye: true },
  });

  // Filter out BYE debates — they don't need a physical room
  const nonByeDebates = debates.filter((d) => !d.isBye);

  if (nonByeDebates.length === 0) {
    return {
      success: true,
      allocatedCount: 0,
      totalDebates: debates.length,
      totalActiveVenues: activeVenues.length,
      warnings: ['No non-BYE debates found to allocate venues to.'],
    };
  }

  // ── 4. Check venue availability ─────────────────────────────────────
  if (activeVenues.length < nonByeDebates.length) {
    warnings.push(
      `Only ${activeVenues.length} active venue(s) available for ${nonByeDebates.length} debate(s). ` +
        `${nonByeDebates.length - activeVenues.length} debate(s) will not be assigned a venue.`
    );
  }

  // ── 5. Pair venues to debates ───────────────────────────────────────
  // Highest-priority venue → debate at position 0 (most important)
  const allocations = nonByeDebates.map((debate, index) => ({
    debateId: debate.id,
    venueId: index < activeVenues.length ? activeVenues[index].id : null,
  }));

  // Only update debates that actually get a venue
  const validAllocations = allocations.filter((a) => a.venueId !== null);

  // ── 6. Persist in a single transaction ──────────────────────────────
  await prisma.$transaction(
    validAllocations.map((allocation) =>
      prisma.tournamentDebate.update({
        where: { id: allocation.debateId },
        data: { venueId: allocation.venueId },
      })
    )
  );

  return {
    success: true,
    allocatedCount: validAllocations.length,
    totalDebates: nonByeDebates.length,
    totalActiveVenues: activeVenues.length,
    warnings,
  };
}
