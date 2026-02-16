/**
 * Unit Tests: computeStandings
 *
 * Tests the pure standings computation helper in isolation.
 */

import { describe, it, expect } from 'vitest';
import { computeStandings } from './computeStandings';
import type { TeamInput, DebateWithResultInput } from './types';

// ============================================================================
// Helpers to build test data
// ============================================================================

function makeTeam(id: string, name: string, institutionName = 'TestInst'): TeamInput {
  return { id, name, institutionName };
}

function makeDebate(overrides: Partial<DebateWithResultInput> & {
  debateId: string;
  propTeamId: string | null;
  oppTeamId: string | null;
  result: DebateWithResultInput['result'];
}): DebateWithResultInput {
  return {
    isBye: false,
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('computeStandings', () => {
  it('returns all teams with zeros when there are no debates', () => {
    const teams = [makeTeam('t1', 'Alpha'), makeTeam('t2', 'Beta')];
    const rows = computeStandings({ teams, debatesWithResults: [] });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ wins: 0, losses: 0, debatesCounted: 0, totalPoints: 0 });
    expect(rows[1]).toMatchObject({ wins: 0, losses: 0, debatesCounted: 0, totalPoints: 0 });
  });

  it('counts wins and losses correctly', () => {
    const teams = [makeTeam('t1', 'Alpha'), makeTeam('t2', 'Beta')];
    const debates: DebateWithResultInput[] = [
      makeDebate({
        debateId: 'd1',
        propTeamId: 't1',
        oppTeamId: 't2',
        result: { winningSide: 'PROPOSITION', winningTeamId: 't1', propTotalAvg: 250, oppTotalAvg: 240 },
      }),
    ];

    const rows = computeStandings({ teams, debatesWithResults: debates });
    const alpha = rows.find((r) => r.teamId === 't1')!;
    const beta = rows.find((r) => r.teamId === 't2')!;

    expect(alpha.wins).toBe(1);
    expect(alpha.losses).toBe(0);
    expect(beta.wins).toBe(0);
    expect(beta.losses).toBe(1);
  });

  it('adds points based on the side the team debated on', () => {
    const teams = [makeTeam('t1', 'Alpha'), makeTeam('t2', 'Beta')];
    const debates: DebateWithResultInput[] = [
      makeDebate({
        debateId: 'd1',
        propTeamId: 't1',
        oppTeamId: 't2',
        result: { winningSide: 'PROPOSITION', winningTeamId: 't1', propTotalAvg: 250.5, oppTotalAvg: 240.3 },
      }),
    ];

    const rows = computeStandings({ teams, debatesWithResults: debates });
    const alpha = rows.find((r) => r.teamId === 't1')!;
    const beta = rows.find((r) => r.teamId === 't2')!;

    expect(alpha.totalPoints).toBe(250.5);
    expect(beta.totalPoints).toBe(240.3);
  });

  it('treats null point averages as 0', () => {
    const teams = [makeTeam('t1', 'Alpha'), makeTeam('t2', 'Beta')];
    const debates: DebateWithResultInput[] = [
      makeDebate({
        debateId: 'd1',
        propTeamId: 't1',
        oppTeamId: 't2',
        result: { winningSide: 'PROPOSITION', winningTeamId: 't1', propTotalAvg: null, oppTotalAvg: null },
      }),
    ];

    const rows = computeStandings({ teams, debatesWithResults: debates });
    const alpha = rows.find((r) => r.teamId === 't1')!;
    const beta = rows.find((r) => r.teamId === 't2')!;

    expect(alpha.totalPoints).toBe(0);
    expect(beta.totalPoints).toBe(0);
    expect(alpha.wins).toBe(1);
    expect(beta.losses).toBe(1);
  });

  it('sorts by wins DESC, then totalPoints DESC, then teamName ASC', () => {
    const teams = [
      makeTeam('t1', 'Charlie'),
      makeTeam('t2', 'Alpha'),
      makeTeam('t3', 'Beta'),
    ];
    // After 2 rounds:
    // t1 (Charlie): 1 win, 260 pts
    // t2 (Alpha):   1 win, 260 pts  (same wins & pts → name sorts first)
    // t3 (Beta):    0 wins,  0 pts
    const debates: DebateWithResultInput[] = [
      makeDebate({
        debateId: 'd1',
        propTeamId: 't1',
        oppTeamId: 't3',
        result: { winningSide: 'PROPOSITION', winningTeamId: 't1', propTotalAvg: 260, oppTotalAvg: 240 },
      }),
      makeDebate({
        debateId: 'd2',
        propTeamId: 't2',
        oppTeamId: 't3',
        result: { winningSide: 'PROPOSITION', winningTeamId: 't2', propTotalAvg: 260, oppTotalAvg: 230 },
      }),
    ];

    const rows = computeStandings({ teams, debatesWithResults: debates });

    // Rank 1: Alpha (1 win, 260 pts, name="Alpha")
    // Rank 2: Charlie (1 win, 260 pts, name="Charlie")
    // Rank 3: Beta (0 wins, 470 pts from being opp twice – but 0 wins puts it last)
    expect(rows[0].teamName).toBe('Alpha');
    expect(rows[0].rank).toBe(1);
    expect(rows[1].teamName).toBe('Charlie');
    expect(rows[1].rank).toBe(2);
    expect(rows[2].teamName).toBe('Beta');
    expect(rows[2].rank).toBe(3);
  });

  it('handles tie on wins but different points', () => {
    const teams = [makeTeam('t1', 'Alpha'), makeTeam('t2', 'Beta')];
    const debates: DebateWithResultInput[] = [
      makeDebate({
        debateId: 'd1',
        propTeamId: 't1',
        oppTeamId: 't2',
        result: { winningSide: 'PROPOSITION', winningTeamId: 't1', propTotalAvg: 270, oppTotalAvg: 250 },
      }),
      makeDebate({
        debateId: 'd2',
        propTeamId: 't2',
        oppTeamId: 't1',
        result: { winningSide: 'PROPOSITION', winningTeamId: 't2', propTotalAvg: 260, oppTotalAvg: 255 },
      }),
    ];

    const rows = computeStandings({ teams, debatesWithResults: debates });
    // t1: 1 win, 270 (as prop d1) + 255 (as opp d2) = 525
    // t2: 1 win, 250 (as opp d1) + 260 (as prop d2) = 510
    expect(rows[0].teamId).toBe('t1');
    expect(rows[0].totalPoints).toBe(525);
    expect(rows[1].teamId).toBe('t2');
    expect(rows[1].totalPoints).toBe(510);
  });

  it('handles BYE debates – counts win for the bye team', () => {
    const teams = [makeTeam('t1', 'Alpha'), makeTeam('t2', 'Beta')];
    const debates: DebateWithResultInput[] = [
      makeDebate({
        debateId: 'd1',
        propTeamId: 't1',
        oppTeamId: null,
        isBye: true,
        result: { winningSide: 'PROPOSITION', winningTeamId: 't1', propTotalAvg: null, oppTotalAvg: null },
      }),
    ];

    const rows = computeStandings({ teams, debatesWithResults: debates });
    const alpha = rows.find((r) => r.teamId === 't1')!;
    const beta = rows.find((r) => r.teamId === 't2')!;

    expect(alpha.wins).toBe(1);
    expect(alpha.losses).toBe(0);
    expect(alpha.debatesCounted).toBe(1);
    expect(alpha.totalPoints).toBe(0); // BYE = 0 points
    expect(alpha.notes).toContain('bye counted');

    expect(beta.wins).toBe(0);
    expect(beta.debatesCounted).toBe(0);
  });

  it('assigns correct ranks (1-based, sequential)', () => {
    const teams = [
      makeTeam('t1', 'Alpha'),
      makeTeam('t2', 'Beta'),
      makeTeam('t3', 'Gamma'),
    ];
    const debates: DebateWithResultInput[] = [
      makeDebate({
        debateId: 'd1',
        propTeamId: 't1',
        oppTeamId: 't2',
        result: { winningSide: 'PROPOSITION', winningTeamId: 't1', propTotalAvg: 260, oppTotalAvg: 250 },
      }),
      makeDebate({
        debateId: 'd2',
        propTeamId: 't1',
        oppTeamId: 't3',
        result: { winningSide: 'PROPOSITION', winningTeamId: 't1', propTotalAvg: 270, oppTotalAvg: 245 },
      }),
    ];

    const rows = computeStandings({ teams, debatesWithResults: debates });

    expect(rows[0].rank).toBe(1);
    expect(rows[1].rank).toBe(2);
    expect(rows[2].rank).toBe(3);
    expect(rows[0].teamId).toBe('t1'); // 2 wins
  });

  it('includes teams with no debates at rank bottom', () => {
    const teams = [
      makeTeam('t1', 'Alpha'),
      makeTeam('t2', 'Beta'),
      makeTeam('t3', 'Gamma'),
    ];
    const debates: DebateWithResultInput[] = [
      makeDebate({
        debateId: 'd1',
        propTeamId: 't1',
        oppTeamId: 't2',
        result: { winningSide: 'PROPOSITION', winningTeamId: 't1', propTotalAvg: 260, oppTotalAvg: 250 },
      }),
    ];

    const rows = computeStandings({ teams, debatesWithResults: debates });
    const gamma = rows.find((r) => r.teamId === 't3')!;

    expect(gamma.wins).toBe(0);
    expect(gamma.losses).toBe(0);
    expect(gamma.debatesCounted).toBe(0);
    expect(gamma.totalPoints).toBe(0);
    // Gamma should be last
    expect(rows[rows.length - 1].teamId).toBe('t3');
  });

  it('accumulates points across multiple rounds', () => {
    const teams = [makeTeam('t1', 'Alpha'), makeTeam('t2', 'Beta')];
    const debates: DebateWithResultInput[] = [
      makeDebate({
        debateId: 'd1',
        propTeamId: 't1',
        oppTeamId: 't2',
        result: { winningSide: 'PROPOSITION', winningTeamId: 't1', propTotalAvg: 260, oppTotalAvg: 250 },
      }),
      makeDebate({
        debateId: 'd2',
        propTeamId: 't2',
        oppTeamId: 't1',
        result: { winningSide: 'OPPOSITION', winningTeamId: 't1', propTotalAvg: 240, oppTotalAvg: 265 },
      }),
    ];

    const rows = computeStandings({ teams, debatesWithResults: debates });
    const alpha = rows.find((r) => r.teamId === 't1')!;

    // t1: prop in d1 (260) + opp in d2 (265) = 525
    expect(alpha.wins).toBe(2);
    expect(alpha.totalPoints).toBe(525);
    expect(alpha.debatesCounted).toBe(2);
  });
});
