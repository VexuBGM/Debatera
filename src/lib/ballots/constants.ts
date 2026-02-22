/**
 * WSDC Ballot Constants
 *
 * Speech order, score ranges, and validation rules for WSDC format.
 */

import { SpeechRole, Side } from '@prisma/client';

/** WSDC-only speech roles (subset of the full SpeechRole enum). */
type WsdcSpeechRole =
  | 'PROP_1' | 'OPP_1'
  | 'PROP_2' | 'OPP_2'
  | 'PROP_3' | 'OPP_3'
  | 'OPP_REPLY' | 'PROP_REPLY';

// ============================================================================
// WSDC Speech Order (canonical ordering for ballot entry)
// ============================================================================

export const WSDC_SPEECH_ORDER: SpeechRole[] = [
  'PROP_1',
  'OPP_1',
  'PROP_2',
  'OPP_2',
  'PROP_3',
  'OPP_3',
  'OPP_REPLY',
  'PROP_REPLY',
];

// ============================================================================
// Side mapping for each speech role
// ============================================================================

export const SPEECH_ROLE_SIDE: Record<WsdcSpeechRole, Side> = {
  PROP_1: 'PROPOSITION',
  PROP_2: 'PROPOSITION',
  PROP_3: 'PROPOSITION',
  PROP_REPLY: 'PROPOSITION',
  OPP_1: 'OPPOSITION',
  OPP_2: 'OPPOSITION',
  OPP_3: 'OPPOSITION',
  OPP_REPLY: 'OPPOSITION',
};

// ============================================================================
// Score Ranges
// ============================================================================

export const CONSTRUCTIVE_ROLES: SpeechRole[] = [
  'PROP_1',
  'OPP_1',
  'PROP_2',
  'OPP_2',
  'PROP_3',
  'OPP_3',
];

export const REPLY_ROLES: SpeechRole[] = ['OPP_REPLY', 'PROP_REPLY'];

export const SCORE_RANGE_CONSTRUCTIVE = { min: 60, max: 80 } as const;
export const SCORE_RANGE_REPLY = { min: 30, max: 40 } as const;

export function getScoreRange(role: SpeechRole) {
  return REPLY_ROLES.includes(role)
    ? SCORE_RANGE_REPLY
    : SCORE_RANGE_CONSTRUCTIVE;
}

// ============================================================================
// Human-readable labels
// ============================================================================

export const SPEECH_ROLE_LABELS: Record<WsdcSpeechRole, string> = {
  PROP_1: '1st Proposition',
  OPP_1: '1st Opposition',
  PROP_2: '2nd Proposition',
  OPP_2: '2nd Opposition',
  PROP_3: '3rd Proposition',
  OPP_3: '3rd Opposition',
  OPP_REPLY: 'Opposition Reply',
  PROP_REPLY: 'Proposition Reply',
};

export const PROP_ROLES: SpeechRole[] = [
  'PROP_1',
  'PROP_2',
  'PROP_3',
  'PROP_REPLY',
];

export const OPP_ROLES: SpeechRole[] = [
  'OPP_1',
  'OPP_2',
  'OPP_3',
  'OPP_REPLY',
];
