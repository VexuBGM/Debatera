/**
 * Seeded Random Number Generator
 *
 * Deterministic RNG based on mulberry32 algorithm.
 * Used in Swiss pairings for reproducible tie-breaking and shuffling.
 */

// =============================================================================
// Seed hashing
// =============================================================================

/**
 * Simple string-to-32-bit-integer hash (djb2 variant).
 * Produces a consistent seed from a string like "tourn_abc123:round_xyz".
 */
function hashString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  return hash >>> 0; // ensure unsigned
}

// =============================================================================
// Mulberry32 PRNG
// =============================================================================

/**
 * Creates a seeded random number generator using mulberry32.
 *
 * @param seed - A string that is hashed to produce the numeric seed.
 *               Typically `${tournamentId}:${roundId}`.
 * @returns An object with methods for random number generation.
 */
export function createSeededRng(seed: string) {
  let state = hashString(seed);

  /** Returns a float in [0, 1). */
  function next(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns a random integer in [min, max) (exclusive upper bound). */
  function nextInt(min: number, max: number): number {
    return min + Math.floor(next() * (max - min));
  }

  /**
   * Fisher-Yates shuffle using the seeded RNG.
   * Returns a new shuffled array (does NOT mutate the input).
   */
  function shuffle<T>(array: readonly T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = nextInt(0, i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  return { next, nextInt, shuffle };
}

export type SeededRng = ReturnType<typeof createSeededRng>;
