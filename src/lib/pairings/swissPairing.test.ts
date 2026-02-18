/**
 * Unit Tests: Swiss Pairing Algorithm
 *
 * Tests the pure computeSwissPairings function with small fixtures.
 * No DB, no side effects.
 */

import { describe, it, expect } from 'vitest';
import { computeSwissPairings } from './swissPairing';
import type { SwissTeamRecord, SwissPairingInput } from './types';

// =============================================================================
// Helpers
// =============================================================================

function makeTeam(
  id: string,
  overrides: Partial<SwissTeamRecord> = {},
): SwissTeamRecord {
  return {
    teamId: id,
    teamName: `Team ${id}`,
    institutionId: `inst_${id}`,
    matchPoints: 0,
    speakerPoints: 0,
    pastOpponents: new Set<string>(),
    propCount: 0,
    oppCount: 0,
    hadBye: false,
    ...overrides,
  };
}

function teamIds(pairings: { propTeamId: string; oppTeamId: string | null }[]): string[] {
  const ids = new Set<string>();
  for (const p of pairings) {
    ids.add(p.propTeamId);
    if (p.oppTeamId) ids.add(p.oppTeamId);
  }
  return [...ids].sort();
}

// =============================================================================
// Round 1 (no history)
// =============================================================================

describe('computeSwissPairings – Round 1', () => {
  it('pairs 8 teams with no conflicts when all have different institutions', () => {
    const teams = Array.from({ length: 8 }, (_, i) => makeTeam(`t${i + 1}`));
    const input: SwissPairingInput = {
      teams,
      rngSeed: 'test-tournament:round-1',
      isFirstRound: true,
    };

    const result = computeSwissPairings(input);

    expect(result.pairings).toHaveLength(4);
    expect(result.pairings.every((p) => !p.isBye)).toBe(true);
    // All 8 teams appear exactly once
    expect(teamIds(result.pairings).length).toBe(8);
    // No institution conflict warnings
    expect(
      result.warnings.filter((w) => w.includes('Institution conflict')),
    ).toHaveLength(0);
  });

  it('avoids same-institution matchups when possible', () => {
    // 4 teams, 2 institutions (A pair and B pair)
    const teams = [
      makeTeam('a1', { institutionId: 'instA' }),
      makeTeam('a2', { institutionId: 'instA' }),
      makeTeam('b1', { institutionId: 'instB' }),
      makeTeam('b2', { institutionId: 'instB' }),
    ];

    const result = computeSwissPairings({
      teams,
      rngSeed: 'test:r1-inst',
      isFirstRound: true,
    });

    expect(result.pairings).toHaveLength(2);
    // No pairing should have same institution
    for (const p of result.pairings) {
      const propTeam = teams.find((t) => t.teamId === p.propTeamId)!;
      const oppTeam = teams.find((t) => t.teamId === p.oppTeamId!)!;
      expect(propTeam.institutionId).not.toBe(oppTeam.institutionId);
    }
    expect(
      result.warnings.filter((w) => w.includes('Institution conflict')),
    ).toHaveLength(0);
  });

  it('warns when institution conflict is unavoidable (all same institution)', () => {
    const teams = [
      makeTeam('x1', { institutionId: 'same' }),
      makeTeam('x2', { institutionId: 'same' }),
    ];

    const result = computeSwissPairings({
      teams,
      rngSeed: 'test:r1-same-inst',
      isFirstRound: true,
    });

    expect(result.pairings).toHaveLength(1);
    expect(
      result.warnings.some((w) => w.includes('Institution conflict')),
    ).toBe(true);
  });
});

// =============================================================================
// Odd teams / BYE
// =============================================================================

describe('computeSwissPairings – BYE handling', () => {
  it('assigns BYE when odd number of teams', () => {
    const teams = Array.from({ length: 5 }, (_, i) => makeTeam(`t${i + 1}`));

    const result = computeSwissPairings({
      teams,
      rngSeed: 'test:bye',
      isFirstRound: true,
    });

    expect(result.pairings).toHaveLength(3); // 2 debates + 1 BYE
    const byes = result.pairings.filter((p) => p.isBye);
    expect(byes).toHaveLength(1);
    expect(byes[0].oppTeamId).toBeNull();
    expect(result.warnings.some((w) => w.includes('BYE'))).toBe(true);
  });

  it('avoids giving BYE to a team that already had one', () => {
    // 3 teams, one already had a BYE
    const teams = [
      makeTeam('a', { matchPoints: 0, hadBye: true }),
      makeTeam('b', { matchPoints: 0 }),
      makeTeam('c', { matchPoints: 0 }),
    ];

    const result = computeSwissPairings({
      teams,
      rngSeed: 'test:bye-repeat',
      isFirstRound: false,
    });

    const byePairing = result.pairings.find((p) => p.isBye);
    expect(byePairing).toBeDefined();
    // The bye team should NOT be 'a' (who already had a bye)
    expect(byePairing!.propTeamId).not.toBe('a');
  });

  it('gives BYE to lowest-ranked team when no previous byes', () => {
    const teams = [
      makeTeam('winner', { matchPoints: 2, speakerPoints: 200 }),
      makeTeam('mid', { matchPoints: 1, speakerPoints: 150 }),
      makeTeam('loser', { matchPoints: 0, speakerPoints: 100 }),
    ];

    const result = computeSwissPairings({
      teams,
      rngSeed: 'test:bye-lowest',
      isFirstRound: false,
    });

    const byePairing = result.pairings.find((p) => p.isBye);
    expect(byePairing).toBeDefined();
    expect(byePairing!.propTeamId).toBe('loser');
  });
});

// =============================================================================
// Round 2+ Swiss logic
// =============================================================================

describe('computeSwissPairings – Swiss round (round 2+)', () => {
  it('pairs within same bracket by matchPoints', () => {
    // 4 teams: 2 winners (1 pt), 2 losers (0 pt)
    const teams = [
      makeTeam('w1', { matchPoints: 1, speakerPoints: 200, pastOpponents: new Set(['l1']) }),
      makeTeam('w2', { matchPoints: 1, speakerPoints: 180, pastOpponents: new Set(['l2']) }),
      makeTeam('l1', { matchPoints: 0, speakerPoints: 160, pastOpponents: new Set(['w1']) }),
      makeTeam('l2', { matchPoints: 0, speakerPoints: 140, pastOpponents: new Set(['w2']) }),
    ];

    const result = computeSwissPairings({
      teams,
      rngSeed: 'test:r2-brackets',
      isFirstRound: false,
    });

    expect(result.pairings).toHaveLength(2);

    // Winners should face each other, losers should face each other
    const pair1Teams = [result.pairings[0].propTeamId, result.pairings[0].oppTeamId].sort();
    const pair2Teams = [result.pairings[1].propTeamId, result.pairings[1].oppTeamId].sort();

    const winnerPair = [pair1Teams, pair2Teams].find(
      (p) => p.includes('w1') && p.includes('w2'),
    );
    const loserPair = [pair1Teams, pair2Teams].find(
      (p) => p.includes('l1') && p.includes('l2'),
    );

    expect(winnerPair).toBeDefined();
    expect(loserPair).toBeDefined();
  });

  it('avoids rematches', () => {
    // 4 teams: all same bracket, but w1 already faced w2
    const teams = [
      makeTeam('w1', { matchPoints: 1, pastOpponents: new Set(['w2']), institutionId: 'a' }),
      makeTeam('w2', { matchPoints: 1, pastOpponents: new Set(['w1']), institutionId: 'b' }),
      makeTeam('w3', { matchPoints: 1, pastOpponents: new Set(['w4']), institutionId: 'c' }),
      makeTeam('w4', { matchPoints: 1, pastOpponents: new Set(['w3']), institutionId: 'd' }),
    ];

    const result = computeSwissPairings({
      teams,
      rngSeed: 'test:r2-no-rematch',
      isFirstRound: false,
    });

    expect(result.pairings).toHaveLength(2);

    // w1 should NOT face w2 again, w3 should NOT face w4 again
    for (const p of result.pairings) {
      const propTeam = teams.find((t) => t.teamId === p.propTeamId)!;
      expect(propTeam.pastOpponents.has(p.oppTeamId!)).toBe(false);
    }

    expect(
      result.warnings.filter((w) => w.includes('Rematch')),
    ).toHaveLength(0);
  });

  it('handles cross-bracket float when bracket has odd team', () => {
    // 3 teams with 1 pt, 1 team with 0 pt → top bracket has odd count
    const teams = [
      makeTeam('w1', { matchPoints: 1, pastOpponents: new Set(['l1']), institutionId: 'a' }),
      makeTeam('w2', { matchPoints: 1, pastOpponents: new Set(['l2']), institutionId: 'b' }),
      makeTeam('w3', { matchPoints: 1, pastOpponents: new Set(['l3']), institutionId: 'c' }),
      makeTeam('l1', { matchPoints: 0, pastOpponents: new Set(['w1']), institutionId: 'd' }),
      makeTeam('l2', { matchPoints: 0, pastOpponents: new Set(['w2']), institutionId: 'e' }),
      makeTeam('l3', { matchPoints: 0, pastOpponents: new Set(['w3']), institutionId: 'f' }),
    ];

    const result = computeSwissPairings({
      teams,
      rngSeed: 'test:r2-float',
      isFirstRound: false,
    });

    expect(result.pairings).toHaveLength(3); // 3 debates
    expect(teamIds(result.pairings).length).toBe(6); // all teams paired
  });
});

// =============================================================================
// Side assignment
// =============================================================================

describe('computeSwissPairings – side assignment', () => {
  it('balances sides across rounds', () => {
    // teamA has been Prop 2 times, never Opp → should be assigned Opp
    // teamB has been Opp 2 times, never Prop → should be assigned Prop
    const teams = [
      makeTeam('biased_prop', { propCount: 2, oppCount: 0, institutionId: 'x' }),
      makeTeam('biased_opp', { propCount: 0, oppCount: 2, institutionId: 'y' }),
    ];

    const result = computeSwissPairings({
      teams,
      rngSeed: 'test:sides',
      isFirstRound: false,
    });

    expect(result.pairings).toHaveLength(1);
    const p = result.pairings[0];

    // biased_opp should be Prop, biased_prop should be Opp
    expect(p.propTeamId).toBe('biased_opp');
    expect(p.oppTeamId).toBe('biased_prop');
  });
});

// =============================================================================
// Determinism
// =============================================================================

describe('computeSwissPairings – determinism', () => {
  it('produces identical pairings for the same seed', () => {
    const teams = Array.from({ length: 8 }, (_, i) =>
      makeTeam(`t${i + 1}`, { institutionId: `inst${i + 1}` }),
    );

    const input: SwissPairingInput = {
      teams,
      rngSeed: 'determinism-test:round-1',
      isFirstRound: true,
    };

    const result1 = computeSwissPairings(input);
    const result2 = computeSwissPairings(input);

    expect(result1.pairings).toEqual(result2.pairings);
  });

  it('produces different pairings for different seeds', () => {
    const teams = Array.from({ length: 8 }, (_, i) =>
      makeTeam(`t${i + 1}`, { institutionId: `inst${i + 1}` }),
    );

    const result1 = computeSwissPairings({
      teams,
      rngSeed: 'seed-A:round-1',
      isFirstRound: true,
    });
    const result2 = computeSwissPairings({
      teams,
      rngSeed: 'seed-B:round-1',
      isFirstRound: true,
    });

    // At least one pairing should differ (extremely high probability)
    const same = result1.pairings.every(
      (p, i) =>
        p.propTeamId === result2.pairings[i].propTeamId &&
        p.oppTeamId === result2.pairings[i].oppTeamId,
    );
    expect(same).toBe(false);
  });
});

// =============================================================================
// Edge cases
// =============================================================================

describe('computeSwissPairings – edge cases', () => {
  it('returns empty pairings for < 2 teams', () => {
    const result = computeSwissPairings({
      teams: [makeTeam('solo')],
      rngSeed: 'test:single',
      isFirstRound: true,
    });

    expect(result.pairings).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('handles exactly 2 teams', () => {
    const teams = [
      makeTeam('a', { institutionId: 'x' }),
      makeTeam('b', { institutionId: 'y' }),
    ];

    const result = computeSwissPairings({
      teams,
      rngSeed: 'test:two',
      isFirstRound: true,
    });

    expect(result.pairings).toHaveLength(1);
    expect(result.pairings[0].isBye).toBe(false);
    expect(teamIds(result.pairings)).toEqual(['a', 'b']);
  });

  it('handles impossible institution constraint and still pairs everyone', () => {
    // All 4 teams from the same institution
    const teams = Array.from({ length: 4 }, (_, i) =>
      makeTeam(`s${i + 1}`, { institutionId: 'same_inst' }),
    );

    const result = computeSwissPairings({
      teams,
      rngSeed: 'test:impossible-inst',
      isFirstRound: true,
    });

    // All teams should still be paired
    expect(result.pairings).toHaveLength(2);
    expect(teamIds(result.pairings).length).toBe(4);
    // Should warn about institution conflicts
    expect(
      result.warnings.filter((w) => w.includes('Institution conflict')).length,
    ).toBeGreaterThan(0);
  });
});

// =============================================================================
// Seeded RNG
// =============================================================================

describe('createSeededRng', () => {
  it('produces deterministic output', async () => {
    const { createSeededRng } = await import('./seededRng');
    const rng1 = createSeededRng('test-seed');
    const rng2 = createSeededRng('test-seed');

    const values1 = Array.from({ length: 10 }, () => rng1.next());
    const values2 = Array.from({ length: 10 }, () => rng2.next());

    expect(values1).toEqual(values2);
  });

  it('shuffle produces same order for same seed', async () => {
    const { createSeededRng } = await import('./seededRng');
    const items = [1, 2, 3, 4, 5, 6, 7, 8];

    const rng1 = createSeededRng('shuffle-test');
    const rng2 = createSeededRng('shuffle-test');

    expect(rng1.shuffle(items)).toEqual(rng2.shuffle(items));
  });

  it('values are in [0, 1) range', async () => {
    const { createSeededRng } = await import('./seededRng');
    const rng = createSeededRng('range-test');

    for (let i = 0; i < 1000; i++) {
      const val = rng.next();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });
});
