/**
 * Tournament Standings Types
 *
 * Domain types for computing and displaying tournament standings.
 */

// ============================================================================
// Standings Row & Table
// ============================================================================

export interface StandingsRow {
  /** 1-based rank after sorting */
  rank: number;
  teamId: string;
  teamName: string;
  institutionName: string;
  wins: number;
  losses: number;
  /** Number of debates counted (with an official DebateResult) */
  debatesCounted: number;
  /** Cumulative speaker-point average for the team across all counted debates */
  totalPoints: number;
  /** Optional annotations, e.g. "bye counted" */
  notes: string[];
}

export interface StandingsTable {
  tournamentId: string;
  generatedAt: Date;
  rows: StandingsRow[];
}

// ============================================================================
// Internal computation inputs (pure function layer)
// ============================================================================

export interface TeamInput {
  id: string;
  name: string;
  institutionName: string;
}

export interface DebateWithResultInput {
  debateId: string;
  propTeamId: string | null;
  oppTeamId: string | null;
  isBye: boolean;
  result: {
    winningSide: 'PROPOSITION' | 'OPPOSITION';
    winningTeamId: string | null;
    propTotalAvg: number | null;
    oppTotalAvg: number | null;
  };
}
