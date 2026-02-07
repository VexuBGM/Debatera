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
});

export type UpdateRoundInput = z.infer<typeof UpdateRoundSchema>;

/**
 * Schema for a single debate in the pairings payload.
 */
export const DebatePairingSchema = z.object({
  // If updating an existing debate, include its ID
  // For new debates (from auto-generate or manual add), this can be omitted
  debateId: z.string().optional(),
  order: z.number().int().min(0),
  propTeamId: z.string().nullable(),
  oppTeamId: z.string().nullable(),
  isBye: z.boolean().default(false),
  judgeParticipantIds: z.array(z.string()),
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
 * Valid status transitions:
 * DRAFT -> PUBLISHED -> IN_PROGRESS -> COMPLETED
 *
 * No backwards transitions by default.
 */
export const VALID_STATUS_TRANSITIONS: Record<TournamentRoundStatusType, TournamentRoundStatusType[]> = {
  DRAFT: ['PUBLISHED'],
  PUBLISHED: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [], // Terminal state
};

/**
 * Check if a status transition is valid.
 */
export function isValidStatusTransition(
  currentStatus: TournamentRoundStatusType,
  newStatus: TournamentRoundStatusType
): boolean {
  if (currentStatus === newStatus) return true; // No-op is always valid
  return VALID_STATUS_TRANSITIONS[currentStatus].includes(newStatus);
}
