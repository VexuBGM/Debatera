/**
 * BP Ballot Constants
 *
 * Speech order, positions, score ranges, labels, and ranking point
 * mapping for British Parliamentary format.
 */

import { SpeechRole, DebateTeamPosition } from '@prisma/client';

// ============================================================================
// BP Positions
// ============================================================================

export const BP_POSITIONS: DebateTeamPosition[] = [
  'BP_OG',
  'BP_OO',
  'BP_CG',
  'BP_CO',
];

export const BP_POSITION_LABELS: Record<string, string> = {
  BP_OG: 'Opening Government',
  BP_OO: 'Opening Opposition',
  BP_CG: 'Closing Government',
  BP_CO: 'Closing Opposition',
};

export const BP_POSITION_SHORT_LABELS: Record<string, string> = {
  BP_OG: 'OG',
  BP_OO: 'OO',
  BP_CG: 'CG',
  BP_CO: 'CO',
};

// ============================================================================
// BP Speech Order (canonical ordering for ballot entry)
// ============================================================================

export const BP_SPEECH_ORDER: SpeechRole[] = [
  'BP_PM',   // Prime Minister (OG)
  'BP_LO',   // Leader of Opposition (OO)
  'BP_DPM',  // Deputy Prime Minister (OG)
  'BP_DLO',  // Deputy Leader of Opposition (OO)
  'BP_MG',   // Member of Government (CG)
  'BP_MO',   // Member of Opposition (CO)
  'BP_GW',   // Government Whip (CG)
  'BP_OW',   // Opposition Whip (CO)
];

// ============================================================================
// Speech role to position mapping
// ============================================================================

export const BP_SPEECH_ROLE_POSITION: Record<string, DebateTeamPosition> = {
  BP_PM: 'BP_OG',
  BP_LO: 'BP_OO',
  BP_DPM: 'BP_OG',
  BP_DLO: 'BP_OO',
  BP_MG: 'BP_CG',
  BP_MO: 'BP_CO',
  BP_GW: 'BP_CG',
  BP_OW: 'BP_CO',
};

// ============================================================================
// Human-readable labels
// ============================================================================

export const BP_SPEECH_ROLE_LABELS: Record<string, string> = {
  BP_PM: 'Prime Minister',
  BP_LO: 'Leader of Opposition',
  BP_DPM: 'Deputy Prime Minister',
  BP_DLO: 'Deputy Leader of Opposition',
  BP_MG: 'Member of Government',
  BP_MO: 'Member of Opposition',
  BP_GW: 'Government Whip',
  BP_OW: 'Opposition Whip',
};

// ============================================================================
// Score Ranges (default, configurable via TournamentSettings)
// ============================================================================

export const BP_DEFAULT_SPEAKER_SCALE = { min: 65, max: 85 } as const;

// ============================================================================
// Rank → Team Points mapping (default 3/2/1/0)
// ============================================================================

export const BP_DEFAULT_RANK_POINTS = [0, 3, 2, 1, 0] as const; // index 0 unused; index 1 = 1st → 3pts

export function rankToTeamPoints(
  rank: number,
  mapping?: { first: number; second: number; third: number; fourth: number }
): number {
  const m = mapping ?? { first: 3, second: 2, third: 1, fourth: 0 };
  switch (rank) {
    case 1: return m.first;
    case 2: return m.second;
    case 3: return m.third;
    case 4: return m.fourth;
    default: return 0;
  }
}

// ============================================================================
// Positions grouped by side (Gov / Opp) and bench (Opening / Closing)
// ============================================================================

export const BP_GOV_POSITIONS: DebateTeamPosition[] = ['BP_OG', 'BP_CG'];
export const BP_OPP_POSITIONS: DebateTeamPosition[] = ['BP_OO', 'BP_CO'];
export const BP_OPENING_POSITIONS: DebateTeamPosition[] = ['BP_OG', 'BP_OO'];
export const BP_CLOSING_POSITIONS: DebateTeamPosition[] = ['BP_CG', 'BP_CO'];

// Group speech roles by position for aggregation
export const BP_POSITION_SPEECH_ROLES: Record<string, SpeechRole[]> = {
  BP_OG: ['BP_PM', 'BP_DPM'],
  BP_OO: ['BP_LO', 'BP_DLO'],
  BP_CG: ['BP_MG', 'BP_GW'],
  BP_CO: ['BP_MO', 'BP_OW'],
};
