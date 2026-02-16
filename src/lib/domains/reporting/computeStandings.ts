/**
 * Standings Computation (Pure Helper)
 *
 * A pure function that takes pre-fetched teams and debates-with-results,
 * computes wins / losses / points, sorts deterministically, and assigns ranks.
 *
 * Zero side-effects – easy to unit-test.
 */

import type {
  TeamInput,
  DebateWithResultInput,
  StandingsRow,
} from './types';

// ============================================================================
// Internal accumulator
// ============================================================================

interface TeamAccumulator {
  teamId: string;
  teamName: string;
  institutionName: string;
  wins: number;
  losses: number;
  debatesCounted: number;
  totalPoints: number;
  notes: string[];
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Compute standings rows from raw inputs.
 *
 * Tie-break order (deterministic):
 *  1) wins DESC
 *  2) totalPoints DESC
 *  3) teamName ASC (final alphabetical tie-breaker)
 */
export function computeStandings(input: {
  teams: TeamInput[];
  debatesWithResults: DebateWithResultInput[];
}): StandingsRow[] {
  const { teams, debatesWithResults } = input;

  // Initialise accumulators for every team (so teams with 0 debates still appear)
  const accumulatorMap = new Map<string, TeamAccumulator>();

  for (const team of teams) {
    accumulatorMap.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      institutionName: team.institutionName,
      wins: 0,
      losses: 0,
      debatesCounted: 0,
      totalPoints: 0,
      notes: [],
    });
  }

  // Process each debate with an official result
  for (const debate of debatesWithResults) {
    const { result } = debate;

    if (debate.isBye) {
      // BYE: only one team present; if they are the winner, count as a win
      const byeTeamId = debate.propTeamId ?? debate.oppTeamId;
      if (!byeTeamId) continue; // Defensive: malformed bye with no team

      const accumulator = accumulatorMap.get(byeTeamId);
      if (!accumulator) continue; // Team not in this tournament's roster

      accumulator.debatesCounted += 1;

      if (result.winningTeamId === byeTeamId) {
        accumulator.wins += 1;
        accumulator.notes.push('bye counted');
      } else {
        // Unusual: bye exists but team didn't win – count as loss
        accumulator.losses += 1;
      }
      // BYE points = 0 (by spec)
      continue;
    }

    // Standard debate: attribute to prop team and opp team
    const propAcc = debate.propTeamId ? accumulatorMap.get(debate.propTeamId) : undefined;
    const oppAcc = debate.oppTeamId ? accumulatorMap.get(debate.oppTeamId) : undefined;

    // --- Proposition team ---
    if (propAcc) {
      propAcc.debatesCounted += 1;
      if (result.winningSide === 'PROPOSITION') {
        propAcc.wins += 1;
      } else {
        propAcc.losses += 1;
      }
      propAcc.totalPoints += result.propTotalAvg ?? 0;
    }

    // --- Opposition team ---
    if (oppAcc) {
      oppAcc.debatesCounted += 1;
      if (result.winningSide === 'OPPOSITION') {
        oppAcc.wins += 1;
      } else {
        oppAcc.losses += 1;
      }
      oppAcc.totalPoints += result.oppTotalAvg ?? 0;
    }
  }

  // Sort deterministically
  const sorted = Array.from(accumulatorMap.values()).sort((a, b) => {
    // 1) wins DESC
    if (b.wins !== a.wins) return b.wins - a.wins;
    // 2) totalPoints DESC
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    // 3) teamName ASC (alphabetical)
    return a.teamName.localeCompare(b.teamName);
  });

  // Assign 1-based ranks
  return sorted.map((acc, index) => ({
    rank: index + 1,
    teamId: acc.teamId,
    teamName: acc.teamName,
    institutionName: acc.institutionName,
    wins: acc.wins,
    losses: acc.losses,
    debatesCounted: acc.debatesCounted,
    totalPoints: roundToOneDecimal(acc.totalPoints),
    notes: deduplicateNotes(acc.notes),
  }));
}

// ============================================================================
// Helpers
// ============================================================================

/** Round to 1 decimal place to avoid floating-point display noise. */
function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Remove duplicate note strings while preserving order. */
function deduplicateNotes(notes: string[]): string[] {
  return [...new Set(notes)];
}
