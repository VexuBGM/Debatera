/**
 * Tournament Standings Service
 *
 * Orchestrates data fetching, authorization, and computation to produce
 * the standings table for a tournament.
 *
 * This is the single public entry-point the UI layer should call.
 */

import { Prisma } from '@prisma/client';
import type { StandingsTable, TeamInput, DebateWithResultInput } from './types';
import { fetchTournamentTeams, fetchDebatesWithResults } from './queries';
import { canViewTournamentStandings } from './policy';
import { computeStandings } from './computeStandings';

// ============================================================================
// Error types
// ============================================================================

export class StandingsForbiddenError extends Error {
  constructor() {
    super('You do not have permission to view standings for this tournament.');
    this.name = 'StandingsForbiddenError';
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Build the full standings table for a tournament.
 *
 * @throws {StandingsForbiddenError} if the viewer lacks access.
 */
export async function getTournamentStandings(
  viewerUserId: string,
  tournamentId: string
): Promise<StandingsTable> {
  // 1. Authorize
  const allowed = await canViewTournamentStandings(viewerUserId, tournamentId);
  if (!allowed) throw new StandingsForbiddenError();

  // 2. Fetch data (parallel – independent queries)
  const [rawTeams, rawDebates] = await Promise.all([
    fetchTournamentTeams(tournamentId),
    fetchDebatesWithResults(tournamentId),
  ]);

  // 3. Map to pure-computation inputs (convert Decimal → number safely)
  const teams: TeamInput[] = rawTeams.map((t) => ({
    id: t.id,
    name: t.name,
    institutionName: t.institution.name,
  }));

  const debatesWithResults: DebateWithResultInput[] = rawDebates
    .filter((d) => d.result !== null)
    .map((d) => ({
      debateId: d.id,
      propTeamId: d.propTeamId,
      oppTeamId: d.oppTeamId,
      isBye: d.isBye,
      result: {
        winningSide: d.result!.winningSide as 'PROPOSITION' | 'OPPOSITION',
        winningTeamId: d.result!.winningTeamId,
        propTotalAvg: safeDecimalToNumber(d.result!.propTotalAvg),
        oppTotalAvg: safeDecimalToNumber(d.result!.oppTotalAvg),
      },
    }));

  // 4. Compute standings (pure function)
  const rows = computeStandings({ teams, debatesWithResults });

  return {
    tournamentId,
    generatedAt: new Date(),
    rows,
  };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Safely convert a Prisma Decimal (or null) to a plain number.
 * Handles Decimal objects, strings, numbers, and null.
 */
function safeDecimalToNumber(value: Prisma.Decimal | string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && 'toNumber' in value) return value.toNumber();
  // Fallback: parse as float
  const parsed = parseFloat(String(value));
  return Number.isNaN(parsed) ? null : parsed;
}
