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

const ALLOWED_STATUS_TRANSITIONS: Record<
  TournamentRoundStatusType,
  TournamentRoundStatusType[]
> = {
  DRAFT: ['PUBLISHED'],
  PUBLISHED: ['DRAFT', 'IN_PROGRESS'],
  IN_PROGRESS: ['PUBLISHED', 'COMPLETED'],
  COMPLETED: [],
};

/**
 * Check if a status transition is valid.
 */
export function isValidStatusTransition(
  currentStatus: TournamentRoundStatusType,
  newStatus: TournamentRoundStatusType
): boolean {
  return ALLOWED_STATUS_TRANSITIONS[currentStatus].includes(newStatus);
}

export async function getRoundPublicationValidationErrors(roundId: string) {
  const { prisma } = await import('@/lib/prisma');
  const round = await prisma.tournamentRound.findUnique({
    where: { id: roundId },
    include: {
      tournament: {
        select: {
          settings: {
            select: {
              teamSizeMin: true,
            },
          },
          teamMinSize: true,
        },
      },
      debates: {
        orderBy: { order: 'asc' },
        include: {
          judges: {
            select: { role: true },
          },
          propTeam: {
            select: {
              id: true,
              members: { select: { id: true } },
            },
          },
          oppTeam: {
            select: {
              id: true,
              members: { select: { id: true } },
            },
          },
        },
      },
    },
  });

  if (!round) {
    return ['Round not found'];
  }

  const validationErrors: string[] = [];
  const teamSizeMin = round.tournament.settings?.teamSizeMin ?? round.tournament.teamMinSize;

  for (const debate of round.debates) {
    if (debate.isBye) {
      continue;
    }

    const debateNumber = debate.order + 1;

    if (!debate.propTeamId) {
      validationErrors.push(`Debate ${debateNumber}: Missing proposition team`);
    }

    if (!debate.oppTeamId) {
      validationErrors.push(`Debate ${debateNumber}: Missing opposition team`);
    }

    if (debate.judges.length === 0) {
      validationErrors.push(`Debate ${debateNumber}: No judges assigned`);
    }

    const chairs = debate.judges.filter((judge) => judge.role === 'CHAIR');
    if (chairs.length === 0) {
      validationErrors.push(`Debate ${debateNumber}: No chair judge assigned`);
    } else if (chairs.length > 1) {
      validationErrors.push(
        `Debate ${debateNumber}: Multiple chair judges assigned (must be exactly 1)`
      );
    }

    if (debate.propTeam && debate.propTeam.members.length < teamSizeMin) {
      validationErrors.push(
        `Debate ${debateNumber}: Proposition team has fewer than ${teamSizeMin} debaters`
      );
    }

    if (debate.oppTeam && debate.oppTeam.members.length < teamSizeMin) {
      validationErrors.push(
        `Debate ${debateNumber}: Opposition team has fewer than ${teamSizeMin} debaters`
      );
    }
  }

  return validationErrors;
}
