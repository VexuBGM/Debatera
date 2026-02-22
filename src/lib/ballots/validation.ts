/**
 * Ballot Validation Schemas (Zod)
 *
 * Schemas for saving draft ballots and submitting final ballots.
 */

import { z } from 'zod';
import {
  CONSTRUCTIVE_ROLES,
  REPLY_ROLES,
  SCORE_RANGE_CONSTRUCTIVE,
  SCORE_RANGE_REPLY,
  WSDC_SPEECH_ORDER,
  PROP_ROLES,
  OPP_ROLES,
} from './constants';

// ============================================================================
// Shared Schemas
// ============================================================================

const SideSchema = z.enum(['PROPOSITION', 'OPPOSITION']);

const SpeechRoleSchema = z.enum([
  'PROP_1',
  'OPP_1',
  'PROP_2',
  'OPP_2',
  'PROP_3',
  'OPP_3',
  'OPP_REPLY',
  'PROP_REPLY',
]);

/**
 * Speech data for a draft save (all fields optional except role).
 */
const DraftSpeechSchema = z.object({
  role: SpeechRoleSchema,
  speakerId: z.string().nullable().optional(),
  speakerName: z.string().nullable().optional(),
  score: z.number().nullable().optional(),
  comment: z.string().nullable().optional(),
});

/**
 * Schema for saving a draft ballot.
 * All fields are optional — allows partial saves.
 */
export const SaveBallotDraftSchema = z.object({
  vote: SideSchema.nullable().optional(),
  privateNotes: z.string().nullable().optional(),
  speeches: z.array(DraftSpeechSchema).optional(),
});

export type SaveBallotDraftInput = z.infer<typeof SaveBallotDraftSchema>;

// ============================================================================
// Submit Validation
// ============================================================================

/**
 * Speech data for submission (strict validation).
 */
const SubmitSpeechSchema = z.object({
  role: SpeechRoleSchema,
  speakerId: z.string().nullable().optional(),
  speakerName: z.string().nullable().optional(),
  score: z.number(),
  comment: z.string().nullable().optional(),
});

export const SubmitBallotSchema = z.object({
  vote: SideSchema,
  privateNotes: z.string().nullable().optional(),
  speeches: z.array(SubmitSpeechSchema).length(8),
});

export type SubmitBallotInput = z.infer<typeof SubmitBallotSchema>;

// ============================================================================
// Server-side validation helpers
// ============================================================================

export interface BallotValidationError {
  field: string;
  message: string;
}

/**
 * Validate a ballot submission (beyond Zod schema checks).
 * Returns an array of errors. Empty = valid.
 */
export function validateBallotSubmission(
  data: SubmitBallotInput
): BallotValidationError[] {
  const errors: BallotValidationError[] = [];

  // Validate all 8 speech roles are present
  const presentRoles = new Set<string>(data.speeches.map((s) => s.role));
  for (const expectedRole of WSDC_SPEECH_ORDER) {
    if (!presentRoles.has(expectedRole)) {
      errors.push({
        field: `speeches.${expectedRole}`,
        message: `Missing speech: ${expectedRole}`,
      });
    }
  }

  // Validate scores within range
  for (const speech of data.speeches) {
    if (speech.score === null || speech.score === undefined) {
      errors.push({
        field: `speeches.${speech.role}.score`,
        message: `Score is required for ${speech.role}`,
      });
      continue;
    }

    // Check half-point increment
    if ((speech.score * 2) % 1 !== 0) {
      errors.push({
        field: `speeches.${speech.role}.score`,
        message: `Score must be in 0.5 increments for ${speech.role}`,
      });
    }

    if (CONSTRUCTIVE_ROLES.includes(speech.role)) {
      if (
        speech.score < SCORE_RANGE_CONSTRUCTIVE.min ||
        speech.score > SCORE_RANGE_CONSTRUCTIVE.max
      ) {
        errors.push({
          field: `speeches.${speech.role}.score`,
          message: `${speech.role} score must be between ${SCORE_RANGE_CONSTRUCTIVE.min}–${SCORE_RANGE_CONSTRUCTIVE.max}`,
        });
      }
    } else if (REPLY_ROLES.includes(speech.role)) {
      if (
        speech.score < SCORE_RANGE_REPLY.min ||
        speech.score > SCORE_RANGE_REPLY.max
      ) {
        errors.push({
          field: `speeches.${speech.role}.score`,
          message: `${speech.role} score must be between ${SCORE_RANGE_REPLY.min}–${SCORE_RANGE_REPLY.max}`,
        });
      }
    }

    // Speaker must be identified
    if (!speech.speakerId && !speech.speakerName) {
      errors.push({
        field: `speeches.${speech.role}.speaker`,
        message: `Speaker must be identified for ${speech.role}`,
      });
    }
  }

  // Reply speaker constraint
  validateReplySpeaker(data, 'PROP_REPLY', ['PROP_1', 'PROP_2'], ['PROP_1', 'PROP_2', 'PROP_3'], errors);
  validateReplySpeaker(data, 'OPP_REPLY', ['OPP_1', 'OPP_2'], ['OPP_1', 'OPP_2', 'OPP_3'], errors);

  // Compute totals and validate winner consistency
  const propTotal = computeSideTotal(data.speeches, PROP_ROLES);
  const oppTotal = computeSideTotal(data.speeches, OPP_ROLES);

  if (propTotal !== null && oppTotal !== null) {
    if (data.vote === 'PROPOSITION' && propTotal <= oppTotal) {
      errors.push({
        field: 'vote',
        message: `Voted Proposition as winner but their total (${propTotal}) is not higher than Opposition (${oppTotal})`,
      });
    }
    if (data.vote === 'OPPOSITION' && oppTotal <= propTotal) {
      errors.push({
        field: 'vote',
        message: `Voted Opposition as winner but their total (${oppTotal}) is not higher than Proposition (${propTotal})`,
      });
    }
  }

  return errors;
}

function validateReplySpeaker(
  data: SubmitBallotInput,
  replyRole: string,
  allowedRoles: string[],
  allConstructiveRoles: string[],
  errors: BallotValidationError[]
) {
  const replySpeech = data.speeches.find((s) => s.role === replyRole);
  if (!replySpeech) return;

  const replySpeakerId = replySpeech.speakerId;
  const replySpeakerName = replySpeech.speakerName;

  if (!replySpeakerId && !replySpeakerName) return; // Already caught above

  // If the team only has 2 unique speakers, any of them can give the reply
  const constructiveSpeeches = data.speeches.filter((s) =>
    allConstructiveRoles.includes(s.role)
  );
  const uniqueSpeakerIds = new Set(
    constructiveSpeeches.map((s) => s.speakerId).filter(Boolean)
  );
  if (uniqueSpeakerIds.size <= 2) return;

  const allowedSpeeches = data.speeches.filter((s) =>
    allowedRoles.includes(s.role)
  );

  // Check by speakerId if available
  if (replySpeakerId) {
    const isAllowed = allowedSpeeches.some(
      (s) => s.speakerId === replySpeakerId
    );
    if (!isAllowed) {
      errors.push({
        field: `speeches.${replyRole}.speaker`,
        message: `Reply speaker must be the same as Speaker 1 or Speaker 2 (not Speaker 3)`,
      });
    }
  }
}

function computeSideTotal(
  speeches: SubmitBallotInput['speeches'],
  roles: string[]
): number | null {
  let total = 0;
  for (const role of roles) {
    const speech = speeches.find((s) => s.role === role);
    if (!speech || speech.score === null || speech.score === undefined) {
      return null;
    }
    total += speech.score;
  }
  return total;
}
