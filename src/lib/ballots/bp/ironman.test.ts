/**
 * BP Ironman Test Scenarios
 *
 * Verifies that:
 * 1. Standard BP (teamSize = 2) still works
 * 2. BP Ironman works with teamSize = 1 and teamSize = 2
 * 3. WSDC remains unchanged
 * 4. Validation rules for Ironman are enforced
 * 5. Pairings work with Ironman teams
 * 6. Ballot validation allows same speaker for multiple speeches (Ironman)
 * 7. Ballot validation enforces distinct speakers per team (non-Ironman)
 */

import { describe, it, expect } from 'vitest';
import { TournamentSettingsInputSchema } from '@/lib/validations/tournamentSettings';
import { computeBpPairings } from '@/lib/pairings/bp/bpPairing';
import { validateBpBallotSubmission } from '@/lib/ballots/bp/validation';
import type { BpTeamRecord } from '@/lib/pairings/bp/types';
import type { SubmitBpBallotInput } from '@/lib/ballots/bp/validation';

// ============================================================================
// Helpers
// ============================================================================

function makeTeam(id: string, name: string, points = 0): BpTeamRecord {
  return {
    teamId: id,
    teamName: name,
    institutionId: `inst_${id}`,
    teamPoints: points,
    speakerPoints: 0,
    pastRoommates: new Set(),
    positionCounts: { BP_OG: 0, BP_OO: 0, BP_CG: 0, BP_CO: 0 },
    hadBye: false,
  };
}

// ============================================================================
// 1) Zod Validation Tests
// ============================================================================

describe('TournamentSettingsInputSchema – Ironman validation', () => {
  it('accepts standard BP with teamSize 2', () => {
    const result = TournamentSettingsInputSchema.safeParse({
      debateFormat: 'BP',
      teamSizeMin: 2,
      teamSizeMax: 2,
    });
    expect(result.success).toBe(true);
  });

  it('accepts BP Ironman with teamSize 1', () => {
    const result = TournamentSettingsInputSchema.safeParse({
      debateFormat: 'BP',
      isIronman: true,
      teamSizeMin: 1,
      teamSizeMax: 1,
    });
    expect(result.success).toBe(true);
  });

  it('accepts BP Ironman with teamSize 2', () => {
    const result = TournamentSettingsInputSchema.safeParse({
      debateFormat: 'BP',
      isIronman: true,
      teamSizeMin: 2,
      teamSizeMax: 2,
    });
    expect(result.success).toBe(true);
  });

  it('accepts BP Ironman with teamSize range 1–2', () => {
    const result = TournamentSettingsInputSchema.safeParse({
      debateFormat: 'BP',
      isIronman: true,
      teamSizeMin: 1,
      teamSizeMax: 2,
    });
    expect(result.success).toBe(true);
  });

  it('rejects BP Ironman with teamSize > 2', () => {
    const result = TournamentSettingsInputSchema.safeParse({
      debateFormat: 'BP',
      isIronman: true,
      teamSizeMin: 1,
      teamSizeMax: 3,
    });
    expect(result.success).toBe(false);
  });

  it('rejects Ironman for WSDC format', () => {
    const result = TournamentSettingsInputSchema.safeParse({
      debateFormat: 'WSDC',
      isIronman: true,
      teamSizeMin: 1,
      teamSizeMax: 1,
    });
    expect(result.success).toBe(false);
  });

  it('accepts WSDC without isIronman', () => {
    const result = TournamentSettingsInputSchema.safeParse({
      debateFormat: 'WSDC',
      teamSizeMin: 3,
      teamSizeMax: 5,
    });
    expect(result.success).toBe(true);
  });

  it('rejects BP with teamSize 1 when isIronman is false', () => {
    const result = TournamentSettingsInputSchema.safeParse({
      debateFormat: 'BP',
      isIronman: false,
      teamSizeMin: 1,
      teamSizeMax: 1,
    });
    expect(result.success).toBe(false);
  });

  it('defaults isIronman to undefined (treated as false)', () => {
    const result = TournamentSettingsInputSchema.safeParse({
      debateFormat: 'BP',
      teamSizeMin: 2,
      teamSizeMax: 2,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// 2) BP Pairing Tests (Ironman teams are just regular teams in pairing)
// ============================================================================

describe('BP Pairings – work for Ironman (1-member teams)', () => {
  it('generates rooms of 4 teams for Ironman', () => {
    const teams = Array.from({ length: 8 }, (_, i) =>
      makeTeam(`t${i + 1}`, `Team ${i + 1}`)
    );

    const result = computeBpPairings({
      teams,
      rngSeed: 'ironman-test-1',
      isFirstRound: true,
    });

    expect(result.rooms.length).toBe(2);
    expect(result.byes.length).toBe(0);

    // Each room should have 4 positions filled
    for (const room of result.rooms) {
      expect(Object.keys(room.slots)).toHaveLength(4);
      expect(room.slots['BP_OG']).toBeDefined();
      expect(room.slots['BP_OO']).toBeDefined();
      expect(room.slots['BP_CG']).toBeDefined();
      expect(room.slots['BP_CO']).toBeDefined();
    }
  });

  it('handles bye for odd count (5 Ironman teams)', () => {
    const teams = Array.from({ length: 5 }, (_, i) =>
      makeTeam(`t${i + 1}`, `Team ${i + 1}`)
    );

    const result = computeBpPairings({
      teams,
      rngSeed: 'ironman-test-2',
      isFirstRound: true,
    });

    expect(result.rooms.length).toBe(1);
    expect(result.byes.length).toBe(1);
  });
});

// ============================================================================
// 3) Ballot Validation – Ironman (same speaker gives multiple speeches)
// ============================================================================

describe('BP Ballot Validation – Ironman same-speaker submissions', () => {
  it('accepts same speakerId for both speeches of a team (Ironman, teamSize=1)', () => {
    const data: SubmitBpBallotInput = {
      privateNotes: null,
      teamRankings: [
        { position: 'BP_OG', rank: 1 },
        { position: 'BP_OO', rank: 2 },
        { position: 'BP_CG', rank: 3 },
        { position: 'BP_CO', rank: 4 },
      ],
      speeches: [
        { role: 'BP_PM', speakerId: 'speaker_og', speakerName: 'Alice', score: 75, comment: null },
        { role: 'BP_DPM', speakerId: 'speaker_og', speakerName: 'Alice', score: 76, comment: null },
        { role: 'BP_LO', speakerId: 'speaker_oo', speakerName: 'Bob', score: 74, comment: null },
        { role: 'BP_DLO', speakerId: 'speaker_oo', speakerName: 'Bob', score: 73, comment: null },
        { role: 'BP_MG', speakerId: 'speaker_cg', speakerName: 'Charlie', score: 72, comment: null },
        { role: 'BP_GW', speakerId: 'speaker_cg', speakerName: 'Charlie', score: 71, comment: null },
        { role: 'BP_MO', speakerId: 'speaker_co', speakerName: 'Diana', score: 70, comment: null },
        { role: 'BP_OW', speakerId: 'speaker_co', speakerName: 'Diana', score: 69, comment: null },
      ],
    };

    const errors = validateBpBallotSubmission(data, { min: 65, max: 85 }, { isIronman: true });
    expect(errors).toHaveLength(0);
  });

  it('accepts same speakerId for both speeches of a team (Ironman, teamSize=2)', () => {
    const data: SubmitBpBallotInput = {
      privateNotes: null,
      teamRankings: [
        { position: 'BP_OG', rank: 1 },
        { position: 'BP_OO', rank: 2 },
        { position: 'BP_CG', rank: 3 },
        { position: 'BP_CO', rank: 4 },
      ],
      speeches: [
        { role: 'BP_PM', speakerId: 'speaker_og_1', speakerName: 'Alice', score: 75, comment: null },
        { role: 'BP_DPM', speakerId: 'speaker_og_1', speakerName: 'Alice', score: 76, comment: null },  // Same speaker reused
        { role: 'BP_LO', speakerId: 'speaker_oo_1', speakerName: 'Bob', score: 74, comment: null },
        { role: 'BP_DLO', speakerId: 'speaker_oo_2', speakerName: 'Eve', score: 73, comment: null },     // Different speaker
        { role: 'BP_MG', speakerId: 'speaker_cg_1', speakerName: 'Charlie', score: 72, comment: null },
        { role: 'BP_GW', speakerId: 'speaker_cg_2', speakerName: 'Grace', score: 71, comment: null },    // Different speaker
        { role: 'BP_MO', speakerId: 'speaker_co_1', speakerName: 'Diana', score: 70, comment: null },
        { role: 'BP_OW', speakerId: 'speaker_co_1', speakerName: 'Diana', score: 69, comment: null },    // Same speaker reused
      ],
    };

    const errors = validateBpBallotSubmission(data, { min: 65, max: 85 }, { isIronman: true });
    expect(errors).toHaveLength(0);
  });

  it('still validates score ranges for Ironman speeches', () => {
    const data: SubmitBpBallotInput = {
      privateNotes: null,
      teamRankings: [
        { position: 'BP_OG', rank: 1 },
        { position: 'BP_OO', rank: 2 },
        { position: 'BP_CG', rank: 3 },
        { position: 'BP_CO', rank: 4 },
      ],
      speeches: [
        { role: 'BP_PM', speakerId: 'speaker_og', speakerName: 'Alice', score: 90, comment: null },   // Out of range
        { role: 'BP_DPM', speakerId: 'speaker_og', speakerName: 'Alice', score: 76, comment: null },
        { role: 'BP_LO', speakerId: 'speaker_oo', speakerName: 'Bob', score: 74, comment: null },
        { role: 'BP_DLO', speakerId: 'speaker_oo', speakerName: 'Bob', score: 73, comment: null },
        { role: 'BP_MG', speakerId: 'speaker_cg', speakerName: 'Charlie', score: 72, comment: null },
        { role: 'BP_GW', speakerId: 'speaker_cg', speakerName: 'Charlie', score: 71, comment: null },
        { role: 'BP_MO', speakerId: 'speaker_co', speakerName: 'Diana', score: 70, comment: null },
        { role: 'BP_OW', speakerId: 'speaker_co', speakerName: 'Diana', score: 69, comment: null },
      ],
    };

    const errors = validateBpBallotSubmission(data, { min: 65, max: 85 }, { isIronman: true });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('BP_PM');
  });

  it('accepts standard BP with different speakers per team', () => {
    const data: SubmitBpBallotInput = {
      privateNotes: null,
      teamRankings: [
        { position: 'BP_OG', rank: 1 },
        { position: 'BP_OO', rank: 2 },
        { position: 'BP_CG', rank: 3 },
        { position: 'BP_CO', rank: 4 },
      ],
      speeches: [
        { role: 'BP_PM', speakerId: 'speaker_1', speakerName: 'Alice', score: 75, comment: null },
        { role: 'BP_DPM', speakerId: 'speaker_2', speakerName: 'Eve', score: 76, comment: null },
        { role: 'BP_LO', speakerId: 'speaker_3', speakerName: 'Bob', score: 74, comment: null },
        { role: 'BP_DLO', speakerId: 'speaker_4', speakerName: 'Frank', score: 73, comment: null },
        { role: 'BP_MG', speakerId: 'speaker_5', speakerName: 'Charlie', score: 72, comment: null },
        { role: 'BP_GW', speakerId: 'speaker_6', speakerName: 'Grace', score: 71, comment: null },
        { role: 'BP_MO', speakerId: 'speaker_7', speakerName: 'Diana', score: 70, comment: null },
        { role: 'BP_OW', speakerId: 'speaker_8', speakerName: 'Henry', score: 69, comment: null },
      ],
    };

    const errors = validateBpBallotSubmission(data, { min: 65, max: 85 });
    expect(errors).toHaveLength(0);
  });
});

// ============================================================================
// 4) Ballot Validation – Non-Ironman (distinct speakers per team)
// ============================================================================

describe('BP Ballot Validation – Non-Ironman speaker distinctness', () => {
  it('rejects same speakerId for both speeches of a team (non-Ironman)', () => {
    const data: SubmitBpBallotInput = {
      privateNotes: null,
      teamRankings: [
        { position: 'BP_OG', rank: 1 },
        { position: 'BP_OO', rank: 2 },
        { position: 'BP_CG', rank: 3 },
        { position: 'BP_CO', rank: 4 },
      ],
      speeches: [
        { role: 'BP_PM', speakerId: 'speaker_og', speakerName: 'Alice', score: 75, comment: null },
        { role: 'BP_DPM', speakerId: 'speaker_og', speakerName: 'Alice', score: 76, comment: null },   // Same speaker — invalid
        { role: 'BP_LO', speakerId: 'speaker_3', speakerName: 'Bob', score: 74, comment: null },
        { role: 'BP_DLO', speakerId: 'speaker_4', speakerName: 'Frank', score: 73, comment: null },
        { role: 'BP_MG', speakerId: 'speaker_5', speakerName: 'Charlie', score: 72, comment: null },
        { role: 'BP_GW', speakerId: 'speaker_6', speakerName: 'Grace', score: 71, comment: null },
        { role: 'BP_MO', speakerId: 'speaker_7', speakerName: 'Diana', score: 70, comment: null },
        { role: 'BP_OW', speakerId: 'speaker_8', speakerName: 'Henry', score: 69, comment: null },
      ],
    };

    // Without isIronman (defaults to false)
    const errors = validateBpBallotSubmission(data, { min: 65, max: 85 });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.message.includes('BP_OG'))).toBe(true);
    expect(errors.some((e) => e.message.includes('different speaker'))).toBe(true);
  });

  it('rejects same speakerId with explicit isIronman=false', () => {
    const data: SubmitBpBallotInput = {
      privateNotes: null,
      teamRankings: [
        { position: 'BP_OG', rank: 1 },
        { position: 'BP_OO', rank: 2 },
        { position: 'BP_CG', rank: 3 },
        { position: 'BP_CO', rank: 4 },
      ],
      speeches: [
        { role: 'BP_PM', speakerId: 'speaker_1', speakerName: 'Alice', score: 75, comment: null },
        { role: 'BP_DPM', speakerId: 'speaker_2', speakerName: 'Eve', score: 76, comment: null },
        { role: 'BP_LO', speakerId: 'speaker_3', speakerName: 'Bob', score: 74, comment: null },
        { role: 'BP_DLO', speakerId: 'speaker_3', speakerName: 'Bob', score: 73, comment: null },  // Same speaker — invalid
        { role: 'BP_MG', speakerId: 'speaker_5', speakerName: 'Charlie', score: 72, comment: null },
        { role: 'BP_GW', speakerId: 'speaker_6', speakerName: 'Grace', score: 71, comment: null },
        { role: 'BP_MO', speakerId: 'speaker_7', speakerName: 'Diana', score: 70, comment: null },
        { role: 'BP_OW', speakerId: 'speaker_8', speakerName: 'Henry', score: 69, comment: null },
      ],
    };

    const errors = validateBpBallotSubmission(data, { min: 65, max: 85 }, { isIronman: false });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.message.includes('BP_OO'))).toBe(true);
  });

  it('detects multiple teams with duplicate speakers (non-Ironman)', () => {
    const data: SubmitBpBallotInput = {
      privateNotes: null,
      teamRankings: [
        { position: 'BP_OG', rank: 1 },
        { position: 'BP_OO', rank: 2 },
        { position: 'BP_CG', rank: 3 },
        { position: 'BP_CO', rank: 4 },
      ],
      speeches: [
        { role: 'BP_PM', speakerId: 'speaker_1', speakerName: 'Alice', score: 75, comment: null },
        { role: 'BP_DPM', speakerId: 'speaker_1', speakerName: 'Alice', score: 76, comment: null },  // Dupe in OG
        { role: 'BP_LO', speakerId: 'speaker_3', speakerName: 'Bob', score: 74, comment: null },
        { role: 'BP_DLO', speakerId: 'speaker_3', speakerName: 'Bob', score: 73, comment: null },    // Dupe in OO
        { role: 'BP_MG', speakerId: 'speaker_5', speakerName: 'Charlie', score: 72, comment: null },
        { role: 'BP_GW', speakerId: 'speaker_6', speakerName: 'Grace', score: 71, comment: null },
        { role: 'BP_MO', speakerId: 'speaker_7', speakerName: 'Diana', score: 70, comment: null },
        { role: 'BP_OW', speakerId: 'speaker_8', speakerName: 'Henry', score: 69, comment: null },
      ],
    };

    const errors = validateBpBallotSubmission(data, { min: 65, max: 85 }, { isIronman: false });
    expect(errors.length).toBe(2); // OG and OO both have dupes
  });
});

// ============================================================================
// 5) WSDC unaffected — Ironman flag is BP-only
// ============================================================================

describe('WSDC – unaffected by Ironman', () => {
  it('rejects Ironman for WSDC in settings', () => {
    const result = TournamentSettingsInputSchema.safeParse({
      debateFormat: 'WSDC',
      isIronman: true,
      teamSizeMin: 3,
      teamSizeMax: 5,
    });
    expect(result.success).toBe(false);
  });

  it('accepts WSDC with standard team sizes', () => {
    const result = TournamentSettingsInputSchema.safeParse({
      debateFormat: 'WSDC',
      teamSizeMin: 3,
      teamSizeMax: 5,
    });
    expect(result.success).toBe(true);
  });
});
