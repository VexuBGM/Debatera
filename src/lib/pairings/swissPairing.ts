/**
 * Swiss Pairing Algorithm (Pure)
 *
 * A pure function that takes team records and produces pairings following
 * standard Swiss-system rules for debate tournaments:
 *
 *   1. Sort teams by (matchPoints DESC, speakerPoints DESC, seededRandom)
 *   2. Partition into match-point brackets
 *   3. Within each bracket, greedy-pair adjacent teams, avoiding:
 *      - Rematches (hard constraint)
 *      - Same-institution matchups (hard constraint when possible)
 *   4. Float odd-bracket remainders to the next lower bracket
 *   5. Assign sides (Prop/Opp) to minimise side imbalance per team
 *   6. Handle BYE for overall odd team count
 *
 * This module has ZERO side effects — no DB, no I/O.
 */

import type {
  SwissTeamRecord,
  SwissPairingInput,
  SwissPairing,
  SwissPairingResult,
} from './types';
import { createSeededRng, type SeededRng } from './seededRng';

// =============================================================================
// Constants
// =============================================================================

/** Maximum swap-repair attempts per bracket before giving up. */
const MAX_REPAIR_ATTEMPTS = 2000;

// =============================================================================
// Public API
// =============================================================================

/**
 * Generate Swiss pairings from the given team records.
 *
 * @returns Pairings and any warnings about constraint violations.
 */
export function computeSwissPairings(input: SwissPairingInput): SwissPairingResult {
  const { teams, rngSeed, isFirstRound } = input;
  const rng = createSeededRng(rngSeed);
  const warnings: string[] = [];

  if (teams.length < 2) {
    return { pairings: [], warnings: ['Not enough teams to generate pairings.'] };
  }

  // --- Step 1: Decide BYE candidate (if odd number of teams) ---
  let activeTeams: SwissTeamRecord[];
  let byeTeam: SwissTeamRecord | null = null;

  if (teams.length % 2 !== 0) {
    byeTeam = selectByeTeam(teams, rng);
    activeTeams = teams.filter((t) => t.teamId !== byeTeam!.teamId);
    warnings.push(`${byeTeam.teamName} receives a BYE this round.`);
  } else {
    activeTeams = [...teams];
  }

  // --- Step 2: Sort teams ---
  const sorted = sortTeams(activeTeams, rng);

  // --- Step 3: Pair ---
  let rawPairs: [SwissTeamRecord, SwissTeamRecord][];

  if (isFirstRound) {
    rawPairs = pairFirstRound(sorted, warnings);
  } else {
    rawPairs = pairSwissRound(sorted, warnings, rng);
  }

  // --- Step 4: Assign sides ---
  const pairings: SwissPairing[] = rawPairs.map(([teamA, teamB]) => {
    const { prop, opp } = assignSides(teamA, teamB, rng);
    const bracket = Math.min(teamA.matchPoints, teamB.matchPoints);
    return {
      propTeamId: prop.teamId,
      oppTeamId: opp.teamId,
      bracketPoints: bracket,
      isBye: false,
    };
  });

  // --- Step 5: Append BYE ---
  if (byeTeam) {
    pairings.push({
      propTeamId: byeTeam.teamId,
      oppTeamId: null,
      bracketPoints: byeTeam.matchPoints,
      isBye: true,
    });
  }

  return { pairings, warnings };
}

// =============================================================================
// BYE selection
// =============================================================================

/**
 * Select the team that should receive a BYE.
 *
 * Priority:
 *  1. Must not have had a BYE already (if possible)
 *  2. Lowest matchPoints (weakest team gets BYE)
 *  3. Lowest speakerPoints
 *  4. Random tie-break
 */
function selectByeTeam(teams: SwissTeamRecord[], rng: SeededRng): SwissTeamRecord {
  const neverHadBye = teams.filter((t) => !t.hadBye);
  const candidates = neverHadBye.length > 0 ? neverHadBye : teams;

  // Sort ascending: lowest matchPoints first, then speakerPoints, then random
  const sorted = [...candidates].sort((a, b) => {
    if (a.matchPoints !== b.matchPoints) return a.matchPoints - b.matchPoints;
    if (a.speakerPoints !== b.speakerPoints) return a.speakerPoints - b.speakerPoints;
    return rng.next() - 0.5;
  });

  return sorted[0];
}

// =============================================================================
// Sorting
// =============================================================================

/**
 * Sort teams by:
 *  1) matchPoints DESC
 *  2) speakerPoints DESC
 *  3) seeded random tie-break
 */
function sortTeams(teams: SwissTeamRecord[], rng: SeededRng): SwissTeamRecord[] {
  // Assign a stable random key to each team for tie-breaking
  const randomKeys = new Map<string, number>();
  for (const team of teams) {
    randomKeys.set(team.teamId, rng.next());
  }

  return [...teams].sort((a, b) => {
    if (b.matchPoints !== a.matchPoints) return b.matchPoints - a.matchPoints;
    if (b.speakerPoints !== a.speakerPoints) return b.speakerPoints - a.speakerPoints;
    return (randomKeys.get(a.teamId) ?? 0) - (randomKeys.get(b.teamId) ?? 0);
  });
}

// =============================================================================
// Round 1 pairing (no history)
// =============================================================================

/**
 * For Round 1: pair adjacent teams from a shuffled/sorted list.
 * Try to avoid same-institution matchups by swapping neighbours.
 */
function pairFirstRound(
  sorted: SwissTeamRecord[],
  warnings: string[],
): [SwissTeamRecord, SwissTeamRecord][] {
  const pairs: [SwissTeamRecord, SwissTeamRecord][] = [];
  const used = new Set<string>();

  for (let i = 0; i < sorted.length; i++) {
    if (used.has(sorted[i].teamId)) continue;
    const teamA = sorted[i];
    used.add(teamA.teamId);

    // Find best partner: prefer non-same-institution
    let bestIndex = -1;
    for (let j = i + 1; j < sorted.length; j++) {
      if (used.has(sorted[j].teamId)) continue;
      if (bestIndex === -1) bestIndex = j; // fallback
      if (sorted[j].institutionId !== teamA.institutionId) {
        bestIndex = j;
        break;
      }
    }

    if (bestIndex === -1) break; // should not happen with even count
    const teamB = sorted[bestIndex];
    used.add(teamB.teamId);

    if (teamA.institutionId === teamB.institutionId) {
      warnings.push(
        `Institution conflict unavoidable: ${teamA.teamName} vs ${teamB.teamName}`,
      );
    }

    pairs.push([teamA, teamB]);
  }

  return pairs;
}

// =============================================================================
// Swiss round pairing (bracket-based)
// =============================================================================

/**
 * Standard Swiss pairing for rounds 2+:
 *  1. Partition into matchPoints brackets
 *  2. Pair within bracket (greedy, conflict-aware)
 *  3. Float unmatched teams down
 */
function pairSwissRound(
  sorted: SwissTeamRecord[],
  warnings: string[],
  rng: SeededRng,
): [SwissTeamRecord, SwissTeamRecord][] {
  // Build brackets: group by matchPoints descending
  const bracketMap = new Map<number, SwissTeamRecord[]>();
  for (const team of sorted) {
    const existing = bracketMap.get(team.matchPoints) ?? [];
    existing.push(team);
    bracketMap.set(team.matchPoints, existing);
  }

  // Sort bracket keys descending
  const bracketKeys = [...bracketMap.keys()].sort((a, b) => b - a);

  const allPairs: [SwissTeamRecord, SwissTeamRecord][] = [];
  let floaters: SwissTeamRecord[] = [];

  for (const mp of bracketKeys) {
    const bracket = [...(bracketMap.get(mp) ?? []), ...floaters];
    floaters = [];

    const { pairs, unmatched } = pairWithinBracket(bracket, warnings, rng);
    allPairs.push(...pairs);

    if (unmatched.length > 0) {
      // Float unmatched to next bracket
      floaters = unmatched;
      if (mp === bracketKeys[bracketKeys.length - 1]) {
        // Last bracket — force pair remaining floaters
        const forcedPairs = forcePairRemaining(floaters, warnings, rng);
        allPairs.push(...forcedPairs);
        floaters = [];
      }
    }
  }

  // Handle any remaining floaters after all brackets
  if (floaters.length >= 2) {
    const forcedPairs = forcePairRemaining(floaters, warnings, rng);
    allPairs.push(...forcedPairs);
  }

  return allPairs;
}

// =============================================================================
// Within-bracket pairing
// =============================================================================

interface BracketPairingResult {
  pairs: [SwissTeamRecord, SwissTeamRecord][];
  unmatched: SwissTeamRecord[];
}

/**
 * Greedy pairing within a single bracket.
 * Tries to pair each team with the next valid opponent.
 * Falls back to swap-repair if greedy pass leaves conflicts.
 */
function pairWithinBracket(
  bracket: SwissTeamRecord[],
  warnings: string[],
  rng: SeededRng,
): BracketPairingResult {
  if (bracket.length < 2) {
    return { pairs: [], unmatched: bracket };
  }

  // Greedy pass
  const pairs: [SwissTeamRecord, SwissTeamRecord][] = [];
  const used = new Set<string>();

  for (let i = 0; i < bracket.length; i++) {
    if (used.has(bracket[i].teamId)) continue;
    const teamA = bracket[i];

    let bestPartner: SwissTeamRecord | null = null;
    let bestScore = -Infinity;

    for (let j = i + 1; j < bracket.length; j++) {
      if (used.has(bracket[j].teamId)) continue;
      const candidate = bracket[j];
      const score = scorePairing(teamA, candidate);
      if (score > bestScore) {
        bestScore = score;
        bestPartner = candidate;
      }
    }

    if (bestPartner) {
      used.add(teamA.teamId);
      used.add(bestPartner.teamId);
      pairs.push([teamA, bestPartner]);

      // Warn about forced constraints
      emitPairingWarnings(teamA, bestPartner, warnings);
    }
  }

  const unmatched = bracket.filter((t) => !used.has(t.teamId));

  // Attempt swap-repair if there are constraint violations
  const repairedPairs = repairPairings(pairs, unmatched, warnings, rng);

  return repairedPairs;
}

/**
 * Score a potential pairing. Higher is better.
 * Heavily penalises constraint violations.
 */
function scorePairing(teamA: SwissTeamRecord, teamB: SwissTeamRecord): number {
  let score = 0;

  // Hard: no rematch (−1000 per rematch)
  if (teamA.pastOpponents.has(teamB.teamId)) {
    score -= 1000;
  }

  // Hard: no same-institution (−500)
  if (teamA.institutionId === teamB.institutionId) {
    score -= 500;
  }

  // Soft: prefer teams closer in ranking (bracket position)
  // Teams already in same bracket, but within bracket, prefer adjacent
  const pointDiff = Math.abs(teamA.matchPoints - teamB.matchPoints);
  score -= pointDiff * 10;

  // Soft: side balance — prefer pairing teams where sides can balance
  const aImbalance = Math.abs(teamA.propCount - teamA.oppCount);
  const bImbalance = Math.abs(teamB.propCount - teamB.oppCount);
  // If both want the same side, slight penalty
  const aPrefersProp = teamA.oppCount > teamA.propCount;
  const bPrefersProp = teamB.oppCount > teamB.propCount;
  if (aPrefersProp === bPrefersProp && aImbalance > 0 && bImbalance > 0) {
    score -= 5;
  }

  return score;
}

/**
 * Emit warnings for constraint violations in a final pairing.
 */
function emitPairingWarnings(
  teamA: SwissTeamRecord,
  teamB: SwissTeamRecord,
  warnings: string[],
): void {
  if (teamA.pastOpponents.has(teamB.teamId)) {
    warnings.push(
      `Rematch forced: ${teamA.teamName} vs ${teamB.teamName} (already faced each other)`,
    );
  }
  if (teamA.institutionId === teamB.institutionId) {
    warnings.push(
      `Institution conflict unavoidable: ${teamA.teamName} vs ${teamB.teamName}`,
    );
  }
}

// =============================================================================
// Swap-repair
// =============================================================================

/**
 * Attempt to improve pairings by swapping partners between two pairs
 * to eliminate constraint violations.
 *
 * Bounded by MAX_REPAIR_ATTEMPTS.
 */
function repairPairings(
  pairs: [SwissTeamRecord, SwissTeamRecord][],
  unmatched: SwissTeamRecord[],
  warnings: string[],
  rng: SeededRng,
): BracketPairingResult {
  if (pairs.length < 2) {
    return { pairs, unmatched };
  }

  let bestPairs = [...pairs] as [SwissTeamRecord, SwissTeamRecord][];
  let bestViolations = countViolations(bestPairs);

  if (bestViolations === 0) {
    return { pairs: bestPairs, unmatched };
  }

  let attempts = 0;
  while (attempts < MAX_REPAIR_ATTEMPTS && bestViolations > 0) {
    attempts++;

    // Pick two random pair indices
    const i = rng.nextInt(0, bestPairs.length);
    let j = rng.nextInt(0, bestPairs.length);
    if (i === j) continue;

    // Ensure i < j for consistency
    const [pi, pj] = i < j ? [i, j] : [j, i];

    // Try swapping: (A1,A2), (B1,B2) → (A1,B1), (A2,B2) or (A1,B2), (A2,B1)
    const [a1, a2] = bestPairs[pi];
    const [b1, b2] = bestPairs[pj];

    // Swap variant 1: (A1,B1), (A2,B2)
    const swap1: [SwissTeamRecord, SwissTeamRecord][] = [...bestPairs];
    swap1[pi] = [a1, b1];
    swap1[pj] = [a2, b2];
    const v1 = countViolations(swap1);

    // Swap variant 2: (A1,B2), (A2,B1)
    const swap2: [SwissTeamRecord, SwissTeamRecord][] = [...bestPairs];
    swap2[pi] = [a1, b2];
    swap2[pj] = [a2, b1];
    const v2 = countViolations(swap2);

    if (v1 < bestViolations && v1 <= v2) {
      bestPairs = swap1;
      bestViolations = v1;
    } else if (v2 < bestViolations) {
      bestPairs = swap2;
      bestViolations = v2;
    }
  }

  if (bestViolations > 0 && attempts >= MAX_REPAIR_ATTEMPTS) {
    warnings.push(
      `Swap-repair exhausted (${MAX_REPAIR_ATTEMPTS} attempts); ${bestViolations} constraint violation(s) remain.`,
    );
  }

  return { pairs: bestPairs, unmatched };
}

/** Count the total number of hard-constraint violations in a set of pairs. */
function countViolations(pairs: [SwissTeamRecord, SwissTeamRecord][]): number {
  let violations = 0;
  for (const [a, b] of pairs) {
    if (a.pastOpponents.has(b.teamId)) violations++;
    if (a.institutionId === b.institutionId) violations++;
  }
  return violations;
}

// =============================================================================
// Force-pair remaining
// =============================================================================

/**
 * Force-pair any remaining unmatched teams (last resort).
 * Used for leftover floaters after all brackets are exhausted.
 */
function forcePairRemaining(
  teams: SwissTeamRecord[],
  warnings: string[],
  rng: SeededRng,
): [SwissTeamRecord, SwissTeamRecord][] {
  if (teams.length < 2) return [];

  // Sort by matchPoints DESC for best possible adjacent pairing
  const sorted = sortTeams(teams, rng);
  const pairs: [SwissTeamRecord, SwissTeamRecord][] = [];

  for (let i = 0; i + 1 < sorted.length; i += 2) {
    const teamA = sorted[i];
    const teamB = sorted[i + 1];
    pairs.push([teamA, teamB]);
    emitPairingWarnings(teamA, teamB, warnings);

    if (teamA.matchPoints !== teamB.matchPoints) {
      warnings.push(
        `Cross-bracket float: ${teamA.teamName} (${teamA.matchPoints} pts) vs ${teamB.teamName} (${teamB.matchPoints} pts)`,
      );
    }
  }

  return pairs;
}

// =============================================================================
// Side assignment
// =============================================================================

/**
 * Decide which team is Proposition and which is Opposition.
 *
 * Minimises side imbalance: if one team has done more Prop, they become Opp.
 * Ties broken by seeded random.
 */
function assignSides(
  teamA: SwissTeamRecord,
  teamB: SwissTeamRecord,
  rng: SeededRng,
): { prop: SwissTeamRecord; opp: SwissTeamRecord } {
  const aBalance = teamA.propCount - teamA.oppCount; // positive = more prop
  const bBalance = teamB.propCount - teamB.oppCount;

  // Team with higher balance (more prop) should be opp
  if (aBalance > bBalance) {
    return { prop: teamB, opp: teamA };
  }
  if (bBalance > aBalance) {
    return { prop: teamA, opp: teamB };
  }

  // Equal balance: random
  if (rng.next() < 0.5) {
    return { prop: teamA, opp: teamB };
  }
  return { prop: teamB, opp: teamA };
}
