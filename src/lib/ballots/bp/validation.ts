/**
 * BP Ballot Validation Schemas (Zod)
 *
 * Schemas for saving draft BP ballots and submitting final BP ballots.
 */

import { z } from 'zod';
import {
  BP_SPEECH_ORDER,
  BP_POSITIONS,
  BP_DEFAULT_SPEAKER_SCALE,
} from './constants';

// ============================================================================
// Shared Schemas
// ============================================================================

const BpPositionSchema = z.enum(['BP_OG', 'BP_OO', 'BP_CG', 'BP_CO']);

const BpSpeechRoleSchema = z.enum([
  'BP_PM', 'BP_LO', 'BP_DPM', 'BP_DLO',
  'BP_MG', 'BP_MO', 'BP_GW', 'BP_OW',
]);

// ============================================================================
// Team Ranking Schema
// ============================================================================

const DraftTeamRankingSchema = z.object({
  position: BpPositionSchema,
  rank: z.number().int().min(1).max(4).nullable().optional(),
});

const SubmitTeamRankingSchema = z.object({
  position: BpPositionSchema,
  rank: z.number().int().min(1).max(4),
});

// ============================================================================
// Speech Schemas
// ============================================================================

const DraftBpSpeechSchema = z.object({
  role: BpSpeechRoleSchema,
  speakerId: z.string().nullable().optional(),
  speakerName: z.string().nullable().optional(),
  score: z.number().nullable().optional(),
  comment: z.string().nullable().optional(),
});

const SubmitBpSpeechSchema = z.object({
  role: BpSpeechRoleSchema,
  speakerId: z.string().nullable().optional(),
  speakerName: z.string().nullable().optional(),
  score: z.number(),
  comment: z.string().nullable().optional(),
});

// ============================================================================
// Draft Schema
// ============================================================================

export const SaveBpBallotDraftSchema = z.object({
  privateNotes: z.string().nullable().optional(),
  teamRankings: z.array(DraftTeamRankingSchema).optional(),
  speeches: z.array(DraftBpSpeechSchema).optional(),
});

export type SaveBpBallotDraftInput = z.infer<typeof SaveBpBallotDraftSchema>;

// ============================================================================
// Submit Schema
// ============================================================================

export const SubmitBpBallotSchema = z.object({
  privateNotes: z.string().nullable().optional(),
  teamRankings: z.array(SubmitTeamRankingSchema).length(4),
  speeches: z.array(SubmitBpSpeechSchema).length(8),
});

export type SubmitBpBallotInput = z.infer<typeof SubmitBpBallotSchema>;

// ============================================================================
// Server-side validation helpers
// ============================================================================

export interface BpBallotValidationError {
  field: string;
  message: string;
}

/**
 * Validate a BP ballot submission (beyond Zod schema checks).
 * Returns an array of errors. Empty = valid.
 */
export function validateBpBallotSubmission(
  data: SubmitBpBallotInput,
  speakerScale?: { min: number; max: number }
): BpBallotValidationError[] {
  const errors: BpBallotValidationError[] = [];
  const scale = speakerScale ?? BP_DEFAULT_SPEAKER_SCALE;

  // --- Validate team rankings ---

  // All 4 positions must be present
  const positionsPresent = new Set<string>(data.teamRankings.map((r) => r.position));
  for (const pos of BP_POSITIONS) {
    if (!positionsPresent.has(pos)) {
      errors.push({
        field: `teamRankings.${pos}`,
        message: `Missing ranking for position: ${pos}`,
      });
    }
  }

  // Ranks must be unique (1,2,3,4)
  const ranks = data.teamRankings.map((r) => r.rank);
  const uniqueRanks = new Set(ranks);
  if (uniqueRanks.size !== 4) {
    errors.push({
      field: 'teamRankings',
      message: 'Each team must have a unique rank (1–4)',
    });
  }
  for (const rank of ranks) {
    if (rank < 1 || rank > 4) {
      errors.push({
        field: 'teamRankings',
        message: `Rank must be between 1 and 4, got: ${rank}`,
      });
    }
  }

  // --- Validate speeches ---

  // All 8 roles must be present
  const presentRoles = new Set<string>(data.speeches.map((s) => s.role));
  for (const expectedRole of BP_SPEECH_ORDER) {
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

    if (speech.score < scale.min || speech.score > scale.max) {
      errors.push({
        field: `speeches.${speech.role}.score`,
        message: `${speech.role} score must be between ${scale.min}–${scale.max}`,
      });
    }

    // Speaker must be identified
    if (!speech.speakerId && !speech.speakerName) {
      errors.push({
        field: `speeches.${speech.role}.speaker`,
        message: `Speaker must be identified for ${speech.role}`,
      });
    }
  }

  return errors;
}
