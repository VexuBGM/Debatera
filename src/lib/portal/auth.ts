/**
 * Portal Authentication
 *
 * Validates portal access tokens and returns the associated
 * participant context. Used by all portal API endpoints.
 */

import { prisma } from '@/lib/prisma';
import { hashToken, isPortalTokenExpired } from './tokens';

export interface PortalAuthResult {
  participantId: string;
  tournamentId: string;
  userId: string;
  accessLinkId: string;
}

/**
 * Extract the bearer token from the Authorization header.
 */
export function extractToken(req: Request): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return null;
}

/**
 * Validate a portal token for a specific tournament.
 * Returns the authenticated participant context or null if invalid.
 *
 * Side effect: updates lastUsedAt on the access link.
 */
export async function validatePortalToken(
  token: string,
  tournamentId: string
): Promise<PortalAuthResult | null> {
  const tokenHashed = hashToken(token);

  const link = await prisma.tournamentParticipantAccessLink.findUnique({
    where: { tokenHash: tokenHashed },
    include: {
      participant: {
        select: {
          id: true,
          userId: true,
          tournamentId: true,
          role: true,
        },
      },
    },
  });

  if (!link) return null;

  // Must match the requested tournament
  if (link.tournamentId !== tournamentId) return null;

  // Must not be revoked
  if (link.revokedAt) return null;

  // Must not be expired
  if (isPortalTokenExpired(link.expiresAt)) return null;

  // Must be a JUDGE participant
  if (link.participant.role !== 'JUDGE') return null;

  // Update lastUsedAt (fire-and-forget, don't block the response)
  prisma.tournamentParticipantAccessLink
    .update({
      where: { id: link.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      /* ignore update errors */
    });

  return {
    participantId: link.participant.id,
    tournamentId: link.tournamentId,
    userId: link.participant.userId,
    accessLinkId: link.id,
  };
}

/**
 * Validate a portal token for ballot access.
 * Ensures the ballot belongs to the authenticated judge.
 * Returns null if token is invalid or ballot doesn't belong to this judge.
 */
export async function validatePortalBallotAccess(
  token: string,
  ballotId: string
): Promise<
  | (PortalAuthResult & {
      ballot: {
        id: string;
        status: string;
        debateId: string;
        adjudicatorId: string;
      };
      roundStatus: string;
    })
  | null
> {
  const tokenHashed = hashToken(token);

  const link = await prisma.tournamentParticipantAccessLink.findUnique({
    where: { tokenHash: tokenHashed },
    include: {
      participant: {
        select: {
          id: true,
          userId: true,
          tournamentId: true,
          role: true,
        },
      },
    },
  });

  if (!link) return null;
  if (link.revokedAt) return null;
  if (isPortalTokenExpired(link.expiresAt)) return null;
  if (link.participant.role !== 'JUDGE') return null;

  // Load the ballot and verify ownership
  const ballot = await prisma.ballot.findUnique({
    where: { id: ballotId },
    include: {
      adjudicator: {
        include: {
          debate: {
            include: {
              round: true,
            },
          },
        },
      },
    },
  });

  if (!ballot) return null;

  // Verify that this ballot belongs to this judge participant
  if (ballot.adjudicator.participantId !== link.participant.id) return null;

  // Verify tournament matches
  if (ballot.adjudicator.debate.round.tournamentId !== link.tournamentId)
    return null;

  // Update lastUsedAt
  prisma.tournamentParticipantAccessLink
    .update({
      where: { id: link.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  return {
    participantId: link.participant.id,
    tournamentId: link.tournamentId,
    userId: link.participant.userId,
    accessLinkId: link.id,
    ballot: {
      id: ballot.id,
      status: ballot.status,
      debateId: ballot.debateId,
      adjudicatorId: ballot.adjudicatorId,
    },
    roundStatus: ballot.adjudicator.debate.round.status,
  };
}
