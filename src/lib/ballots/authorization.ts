/**
 * Ballot Authorization & Visibility Helpers
 *
 * Controls who can view/edit ballots based on their role.
 */

import { prisma } from '@/lib/prisma';
import { TournamentParticipantRole, BallotStatus, TournamentRoundStatus } from '@prisma/client';
import { canJudgeEditBallotState } from './modificationRequests';

// ============================================================================
// Viewer Roles
// ============================================================================

export type ViewerRole = 'organizer' | 'adjudicator' | 'public';

/**
 * Determine a user's role relative to a tournament.
 */
export async function getViewerRole(
  userId: string | null,
  tournamentId: string
): Promise<ViewerRole> {
  if (!userId) return 'public';

  // Check if tournament creator (organizer)
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { createdByUserId: true },
  });

  if (tournament?.createdByUserId === userId) return 'organizer';

  // Check if registered as a judge in this tournament
  const judgeParticipant = await prisma.tournamentParticipant.findUnique({
    where: {
      tournamentId_userId: { tournamentId, userId },
    },
    select: { role: true },
  });

  if (judgeParticipant?.role === TournamentParticipantRole.JUDGE) {
    return 'adjudicator';
  }

  return 'public';
}

// ============================================================================
// Ballot Access Checks
// ============================================================================

interface BallotAccessContext {
  ballotStatus: BallotStatus;
  ballotAdjudicatorParticipantUserId: string;
  roundStatus: TournamentRoundStatus;
  tournamentCreatorUserId: string;
  ballotReopenedAt: Date | null;
}

/**
 * Check whether a user can edit (save draft) a ballot.
 * - Only the owning adjudicator can edit.
 * - Ballot must be DRAFT.
 * - Round must be IN_PROGRESS.
 */
export function canEditBallot(
  userId: string,
  context: BallotAccessContext
): boolean {
  if (
    !canJudgeEditBallotState({
      ballotStatus: context.ballotStatus,
      roundStatus: context.roundStatus,
      reopenedAt: context.ballotReopenedAt,
    })
  ) {
    return false;
  }

  return context.ballotAdjudicatorParticipantUserId === userId;
}

/**
 * Check whether a user can view a ballot's details (scores, votes).
 * - Organizers can see any ballot any time.
 * - Owning adjudicator can see their own ballot only when round is IN_PROGRESS or COMPLETED.
 * - Public/teams can see details only after tournament is COMPLETED (handled at page level).
 */
export function canViewBallotDetails(
  userId: string,
  context: BallotAccessContext
): boolean {
  // Organizer can always view
  if (context.tournamentCreatorUserId === userId) return true;

  // Ballot is only visible once the round is IN_PROGRESS or later
  if (
    context.roundStatus !== TournamentRoundStatus.IN_PROGRESS &&
    context.roundStatus !== TournamentRoundStatus.COMPLETED
  ) {
    return false;
  }

  // Owning adjudicator can view their own ballot
  if (context.ballotAdjudicatorParticipantUserId === userId) return true;

  return false;
}

/**
 * Load full ballot access context from a ballot ID.
 * Returns null if ballot not found.
 */
export async function loadBallotAccessContext(ballotId: string) {
  const ballot = await prisma.ballot.findUnique({
    where: { id: ballotId },
    include: {
      adjudicator: {
        include: {
          participant: {
            include: { user: true },
          },
          debate: {
            include: {
              round: {
                include: { tournament: true },
              },
            },
          },
        },
      },
    },
  });

  if (!ballot) return null;

  const debate = ballot.adjudicator.debate;
  const round = debate.round;
  const tournament = round.tournament;

  return {
    ballot,
    debate,
    round,
    tournament,
    context: {
      ballotStatus: ballot.status,
      ballotAdjudicatorParticipantUserId: ballot.adjudicator.participant.userId,
      roundStatus: round.status,
      tournamentCreatorUserId: tournament.createdByUserId,
      ballotReopenedAt: ballot.reopenedAt,
    } satisfies BallotAccessContext,
  };
}
