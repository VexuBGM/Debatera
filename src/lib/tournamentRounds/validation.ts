/**
 * Tournament Round Validation Schemas
 *
 * Zod schemas for validating API request bodies related to rounds and pairings.
 */

import { z } from 'zod';

// Valid round status values for transitions
export const TournamentRoundStatusSchema = z.enum([
  'DRAFT',
  'PUBLISHED',
  'IN_PROGRESS',
  'COMPLETED',
]);

export type TournamentRoundStatusType = z.infer<typeof TournamentRoundStatusSchema>;

/**
 * Schema for creating a new round.
 * Name is optional - defaults to "Round {number}" on the server.
 */
export const CreateRoundSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

export type CreateRoundInput = z.infer<typeof CreateRoundSchema>;

/**
 * Schema for updating a round (rename or status transition).
 */
export const UpdateRoundSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  status: TournamentRoundStatusSchema.optional(),
  motion: z.string().max(1000).nullable().optional(),
  infoSlide: z.string().max(5000).nullable().optional(),
});

export type UpdateRoundInput = z.infer<typeof UpdateRoundSchema>;

/**
 * Schema for a single debate in the pairings payload.
 * Judges are split into a single chair and zero-or-more panelists.
 */
/** Valid BP positions that can appear as bpSlots keys */
export const BpPositionEnum = z.enum(['BP_OG', 'BP_OO', 'BP_CG', 'BP_CO']);

export const DebatePairingSchema = z.object({
  // If updating an existing debate, include its ID
  // For new debates (from auto-generate or manual add), this can be omitted
  debateId: z.string().optional(),
  order: z.number().int().min(0),
  propTeamId: z.string().nullable(),
  oppTeamId: z.string().nullable(),
  isBye: z.boolean().default(false),
  venueId: z.string().nullable().optional(),
  chairJudgeParticipantId: z.string().nullable(),
  panelistJudgeParticipantIds: z.array(z.string()),
  // BP team slots (optional — only present when debateFormat === 'BP')
  bpSlots: z.record(BpPositionEnum, z.string().nullable()).optional(),
});

export type DebatePairingInput = z.infer<typeof DebatePairingSchema>;

/**
 * Schema for saving the full pairings for a round.
 */
export const SavePairingsSchema = z.object({
  debates: z.array(DebatePairingSchema),
});

export type SavePairingsInput = z.infer<typeof SavePairingsSchema>;

// =============================================================================
// Validation Rules
// =============================================================================

/**
 * All possible round statuses in their natural order.
 */
export const ALL_ROUND_STATUSES: TournamentRoundStatusType[] = [
  'DRAFT',
  'PUBLISHED',
  'IN_PROGRESS',
  'COMPLETED',
];

/**
 * Check if a status transition is valid.
 * Organizers can freely change round status to any value.
 */
export function isValidStatusTransition(
  _currentStatus: TournamentRoundStatusType,
  _newStatus: TournamentRoundStatusType
): boolean {
  return true;
}
