/**
 * Identity Module – Private Link Management
 *
 * Create, regenerate, revoke, and validate participant private links
 * (Tabbycat-style secret URLs).
 */

import { prisma } from '@/lib/prisma';
import { generateToken, hashToken, safeEqual } from './tokenUtils';

// ============================================================================
// Create / Regenerate
// ============================================================================

interface PrivateLinkResult {
  /** Raw token – only available at creation time. NEVER stored. */
  rawToken: string;
  linkId: string;
  participantId: string;
}

/**
 * Ensure a private link exists for a TournamentParticipant.
 *
 * If no link exists (or the existing one is revoked), creates a new one.
 * Returns the raw token only at creation time.
 *
 * If a valid (non-revoked) link already exists, returns null (token is gone).
 */
export async function ensureParticipantPrivateLink(
  participantId: string,
  createdByUserId?: string
): Promise<PrivateLinkResult | null> {
  const existing = await prisma.participantPrivateLink.findUnique({
    where: { tournamentParticipantId: participantId },
  });

  // Valid link already exists
  if (existing && !existing.revokedAt) {
    return null;
  }

  // If revoked, delete old and create new
  if (existing) {
    await prisma.participantPrivateLink.delete({
      where: { id: existing.id },
    });
  }

  const rawToken = generateToken();
  const tokenH = hashToken(rawToken);

  const link = await prisma.participantPrivateLink.create({
    data: {
      tournamentParticipantId: participantId,
      tokenHash: tokenH,
      createdByUserId: createdByUserId ?? null,
    },
  });

  return {
    rawToken,
    linkId: link.id,
    participantId,
  };
}

/**
 * Regenerate a private link: revokes the old one and creates a fresh token.
 * Always returns a new raw token.
 */
export async function regeneratePrivateLink(
  participantId: string,
  createdByUserId?: string
): Promise<PrivateLinkResult> {
  // Revoke + delete existing
  await prisma.participantPrivateLink.deleteMany({
    where: { tournamentParticipantId: participantId },
  });

  const rawToken = generateToken();
  const tokenH = hashToken(rawToken);

  const link = await prisma.participantPrivateLink.create({
    data: {
      tournamentParticipantId: participantId,
      tokenHash: tokenH,
      createdByUserId: createdByUserId ?? null,
    },
  });

  return {
    rawToken,
    linkId: link.id,
    participantId,
  };
}

/**
 * Revoke a private link (soft-delete by setting revokedAt).
 */
export async function revokePrivateLink(participantId: string): Promise<void> {
  await prisma.participantPrivateLink.updateMany({
    where: {
      tournamentParticipantId: participantId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate a raw token and return the associated participant + person.
 * Returns null if invalid, expired, or revoked.
 *
 * Updates `lastUsedAt` on successful validation.
 */
export async function validatePrivateToken(rawToken: string, tournamentId: string) {
  const tokenH = hashToken(rawToken);

  // Look up by tokenHash
  const link = await prisma.participantPrivateLink.findFirst({
    where: {
      tokenHash: tokenH,
    },
    include: {
      participant: {
        include: {
          person: true,
          institution: true,
          tournament: true,
        },
      },
    },
  });

  if (!link) return null;

  // Constant-time compare the hash to prevent timing attacks
  if (!safeEqual(link.tokenHash, tokenH)) return null;

  // Check revocation
  if (link.revokedAt) return null;

  // Check expiry
  if (link.expiresAt && link.expiresAt < new Date()) return null;

  // Check tournament match
  if (link.participant.tournamentId !== tournamentId) return null;

  // Update lastUsedAt (fire-and-forget)
  prisma.participantPrivateLink
    .update({
      where: { id: link.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      /* best-effort */
    });

  return {
    link,
    participant: link.participant,
    person: link.participant.person,
    institution: link.participant.institution,
    tournament: link.participant.tournament,
  };
}
