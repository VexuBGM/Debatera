/**
 * Swiss Data Computation
 *
 * Queries the database to build per-team Swiss records (match points,
 * speaker points, past opponents, side counts, bye history) needed
 * by the Swiss pairing algorithm.
 *
 * This module talks to Prisma; the algorithm itself is pure.
 */

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import type { SwissTeamRecord } from './types';

// =============================================================================
// Public API
// =============================================================================

/**
 * Build Swiss records for every active team in a tournament, computed
 * from all rounds with a number strictly less than `currentRoundNumber`.
 *
 * @param tournamentId - Tournament to query.
 * @param currentRoundNumber - The round about to be paired.  Only rounds
 *   with `number < currentRoundNumber` contribute to stats.
 */
export async function computeSwissTeamRecords(
  tournamentId: string,
  currentRoundNumber: number,
): Promise<SwissTeamRecord[]> {
  // 1. Fetch all teams
  const teams = await prisma.tournamentTeam.findMany({
    where: { tournamentId },
    select: { id: true, name: true, institutionId: true },
  });

  // 2. Fetch all debates from prior rounds that have results
  const debates = await prisma.tournamentDebate.findMany({
    where: {
      round: {
        tournamentId,
        number: { lt: currentRoundNumber },
      },
    },
    select: {
      id: true,
      propTeamId: true,
      oppTeamId: true,
      isBye: true,
      result: {
        select: {
          winningSide: true,
          winningTeamId: true,
          propTotalAvg: true,
          oppTotalAvg: true,
        },
      },
    },
  });

  // 3. Build accumulators
  const records = new Map<string, SwissTeamRecord>();
  for (const team of teams) {
    records.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      institutionId: team.institutionId,
      matchPoints: 0,
      speakerPoints: 0,
      pastOpponents: new Set<string>(),
      propCount: 0,
      oppCount: 0,
      hadBye: false,
    });
  }

  // 4. Process debates
  for (const debate of debates) {
    if (debate.isBye) {
      // BYE: the team present gets a win and is marked as having had a bye
      const byeTeamId = debate.propTeamId ?? debate.oppTeamId;
      if (!byeTeamId) continue;

      const record = records.get(byeTeamId);
      if (!record) continue;

      record.hadBye = true;

      if (debate.result && debate.result.winningTeamId === byeTeamId) {
        record.matchPoints += 1;
      }

      // Track side (BYE debates are stored as prop in existing code)
      if (debate.propTeamId === byeTeamId) {
        record.propCount += 1;
      } else {
        record.oppCount += 1;
      }
      continue;
    }

    // Standard debate: track opponents and sides
    const propId = debate.propTeamId;
    const oppId = debate.oppTeamId;

    if (propId) {
      const propRecord = records.get(propId);
      if (propRecord) {
        propRecord.propCount += 1;
        if (oppId) propRecord.pastOpponents.add(oppId);
      }
    }

    if (oppId) {
      const oppRecord = records.get(oppId);
      if (oppRecord) {
        oppRecord.oppCount += 1;
        if (propId) oppRecord.pastOpponents.add(propId);
      }
    }

    // Process result for match points + speaker points
    if (!debate.result) continue;
    const result = debate.result;

    if (propId) {
      const propRecord = records.get(propId);
      if (propRecord) {
        if (result.winningSide === 'PROPOSITION') {
          propRecord.matchPoints += 1;
        }
        propRecord.speakerPoints += safeDecimalToNumber(result.propTotalAvg);
      }
    }

    if (oppId) {
      const oppRecord = records.get(oppId);
      if (oppRecord) {
        if (result.winningSide === 'OPPOSITION') {
          oppRecord.matchPoints += 1;
        }
        oppRecord.speakerPoints += safeDecimalToNumber(result.oppTotalAvg);
      }
    }
  }

  return Array.from(records.values());
}

// =============================================================================
// Helpers
// =============================================================================

/** Safely convert a Prisma Decimal to a JS number, defaulting to 0. */
function safeDecimalToNumber(
  value: Prisma.Decimal | string | number | null | undefined,
): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && 'toNumber' in value) return value.toNumber();
  const parsed = parseFloat(String(value));
  return Number.isNaN(parsed) ? 0 : parsed;
}
