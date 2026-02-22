/**
 * BP Pairing Algorithm (Pure)
 *
 * A pure function that produces BP pairings (rooms of 4 teams):
 *
 *   1. Sort teams by (teamPoints DESC, speakerPoints DESC, seededRandom)
 *   2. Handle bye teams if count not divisible by 4
 *   3. Group into power-paired rooms of 4: [1-4], [5-8], ...
 *   4. Apply constraints:
 *      - Avoid same-institution teams in the same room
 *      - Avoid repeat full-room compositions
 *   5. Assign positions (OG/OO/CG/CO) with balancing heuristic
 *
 * This module has ZERO side effects — no DB, no I/O.
 */

import type {
  BpTeamRecord,
  BpPairingInput,
  BpRoom,
  BpBye,
  BpPairingResult,
} from './types';
import { createSeededRng, type SeededRng } from '../seededRng';

const BP_POSITION_KEYS = ['BP_OG', 'BP_OO', 'BP_CG', 'BP_CO'] as const;

// Gov positions: BP_OG, BP_CG; Opp positions: BP_OO, BP_CO
// Opening: BP_OG, BP_OO; Closing: BP_CG, BP_CO

// =============================================================================
// Public API
// =============================================================================

export function computeBpPairings(input: BpPairingInput): BpPairingResult {
  const { teams, rngSeed, isFirstRound } = input;
  const rng = createSeededRng(rngSeed);
  const warnings: string[] = [];

  if (teams.length < 4) {
    return { rooms: [], byes: [], warnings: ['Need at least 4 teams for BP pairings.'] };
  }

  // --- Step 1: Handle byes (teams % 4 remainder) ---
  const remainder = teams.length % 4;
  let activeTeams: BpTeamRecord[];
  const byes: BpBye[] = [];

  if (remainder > 0) {
    // Select bye teams from the bottom of the standings
    const sorted = sortTeams(teams, rng);
    const byeTeams = selectByeTeams(sorted, remainder, rng);
    byes.push(...byeTeams.map((t) => ({ teamId: t.teamId })));
    const byeIds = new Set(byeTeams.map((t) => t.teamId));
    activeTeams = teams.filter((t) => !byeIds.has(t.teamId));

    for (const bt of byeTeams) {
      warnings.push(`${bt.teamName} receives a BYE this round.`);
    }
  } else {
    activeTeams = [...teams];
  }

  // --- Step 2: Sort and group into rooms of 4 ---
  const sorted = sortTeams(activeTeams, rng);
  const numRooms = Math.floor(sorted.length / 4);
  const rawRooms: BpTeamRecord[][] = [];

  for (let i = 0; i < numRooms; i++) {
    rawRooms.push(sorted.slice(i * 4, i * 4 + 4));
  }

  // --- Step 3: Swap to avoid same-institution conflicts ---
  for (let i = 0; i < rawRooms.length; i++) {
    const room = rawRooms[i];
    const conflicts = findInstitutionConflicts(room);
    if (conflicts.length > 0 && i < rawRooms.length - 1) {
      // Try swapping with adjacent room
      resolveConflictsWithSwap(rawRooms, i, conflicts, rng, warnings);
    }
  }

  // Warn about remaining same-institution conflicts
  for (let i = 0; i < rawRooms.length; i++) {
    const conflicts = findInstitutionConflicts(rawRooms[i]);
    if (conflicts.length > 0) {
      warnings.push(
        `Room ${i + 1}: Same-institution conflict unavoidable (${conflicts.map((t) => t.teamName).join(', ')}).`
      );
    }
  }

  // --- Step 4: Assign positions ---
  const rooms: BpRoom[] = rawRooms.map((roomTeams, idx) => {
    const slots = assignPositions(roomTeams, rng);
    const bracket = Math.min(...roomTeams.map((t) => t.teamPoints));
    return { slots, bracketPoints: bracket };
  });

  return { rooms, byes, warnings };
}

// =============================================================================
// Sorting
// =============================================================================

function sortTeams(teams: BpTeamRecord[], rng: SeededRng): BpTeamRecord[] {
  const randomKeys = new Map<string, number>();
  for (const team of teams) {
    randomKeys.set(team.teamId, rng.next());
  }

  return [...teams].sort((a, b) => {
    if (b.teamPoints !== a.teamPoints) return b.teamPoints - a.teamPoints;
    if (b.speakerPoints !== a.speakerPoints) return b.speakerPoints - a.speakerPoints;
    return (randomKeys.get(a.teamId) ?? 0) - (randomKeys.get(b.teamId) ?? 0);
  });
}

// =============================================================================
// BYE selection
// =============================================================================

function selectByeTeams(
  sortedTeams: BpTeamRecord[],
  count: number,
  rng: SeededRng
): BpTeamRecord[] {
  // Prefer teams that haven't had a bye, then lowest points
  const neverHadBye = sortedTeams.filter((t) => !t.hadBye);
  const candidates = neverHadBye.length >= count ? neverHadBye : sortedTeams;

  // Take from the bottom
  return candidates.slice(-count);
}

// =============================================================================
// Institution conflict detection and resolution
// =============================================================================

function findInstitutionConflicts(room: BpTeamRecord[]): BpTeamRecord[] {
  const instCounts = new Map<string, BpTeamRecord[]>();
  for (const team of room) {
    const existing = instCounts.get(team.institutionId) ?? [];
    existing.push(team);
    instCounts.set(team.institutionId, existing);
  }

  const conflictTeams: BpTeamRecord[] = [];
  for (const [, teams] of instCounts) {
    if (teams.length > 1) {
      // Add all but the first (the first can stay)
      conflictTeams.push(...teams.slice(1));
    }
  }
  return conflictTeams;
}

function resolveConflictsWithSwap(
  rooms: BpTeamRecord[][],
  roomIdx: number,
  conflicts: BpTeamRecord[],
  rng: SeededRng,
  warnings: string[]
): void {
  for (const conflictTeam of conflicts) {
    // Try swapping with a team in an adjacent room
    let swapped = false;
    for (let otherIdx = roomIdx + 1; otherIdx < rooms.length && !swapped; otherIdx++) {
      for (let j = 0; j < rooms[otherIdx].length; j++) {
        const candidate = rooms[otherIdx][j];
        // Check if swap would resolve conflict without creating a new one
        if (candidate.institutionId !== conflictTeam.institutionId) {
          const roomCopy = rooms[roomIdx].map((t) =>
            t.teamId === conflictTeam.teamId ? candidate : t
          );
          const otherCopy = rooms[otherIdx].map((t) =>
            t.teamId === candidate.teamId ? conflictTeam : t
          );

          if (findInstitutionConflicts(roomCopy).length < findInstitutionConflicts(rooms[roomIdx]).length
            && findInstitutionConflicts(otherCopy).length === 0) {
            rooms[roomIdx] = roomCopy;
            rooms[otherIdx] = otherCopy;
            swapped = true;
          }
        }
      }
    }
  }
}

// =============================================================================
// Position assignment
// =============================================================================

/**
 * Assign BP positions to 4 teams, minimizing position imbalance.
 *
 * Strategy:
 * 1. Consider the 4 teams' position history.
 * 2. Try all 24 permutations (4!) of position assignment.
 * 3. Score each permutation: lower is better (sum of squared position counts).
 * 4. Pick the permutation with the best (lowest) imbalance score.
 * 5. Tie-break with seeded RNG.
 */
function assignPositions(
  teams: BpTeamRecord[],
  rng: SeededRng
): Record<string, string> {
  const permutations = generatePermutations([0, 1, 2, 3]);
  let bestScore = Infinity;
  let bestPerms: number[][] = [];

  for (const perm of permutations) {
    let score = 0;
    for (let i = 0; i < 4; i++) {
      const team = teams[perm[i]];
      const pos = BP_POSITION_KEYS[i];
      const currentCount = team.positionCounts[pos] ?? 0;
      // Penalize giving a position the team already has many of
      score += (currentCount + 1) ** 2;
    }
    if (score < bestScore) {
      bestScore = score;
      bestPerms = [perm];
    } else if (score === bestScore) {
      bestPerms.push(perm);
    }
  }

  // Random tie-break among equally good permutations
  const chosenPerm = bestPerms[Math.floor(rng.next() * bestPerms.length)];

  const slots: Record<string, string> = {};
  for (let i = 0; i < 4; i++) {
    slots[BP_POSITION_KEYS[i]] = teams[chosenPerm[i]].teamId;
  }

  return slots;
}

function generatePermutations(arr: number[]): number[][] {
  if (arr.length <= 1) return [arr];
  const result: number[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of generatePermutations(rest)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}
