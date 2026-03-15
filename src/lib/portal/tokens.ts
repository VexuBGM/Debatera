/**
 * Portal Token Utilities
 *
 * Generates and hashes access tokens for the judge portal.
 * Tokens are random 32-byte values encoded as base64url.
 * Only the SHA-256 hash is stored in the database.
 */

import { randomBytes, createHash } from 'crypto';

const DEFAULT_PORTAL_TOKEN_TTL_DAYS = 14;

function getConfiguredPortalTokenTtlDays(): number {
  const rawValue = process.env.PORTAL_TOKEN_TTL_DAYS;
  if (!rawValue) return DEFAULT_PORTAL_TOKEN_TTL_DAYS;

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_PORTAL_TOKEN_TTL_DAYS;
  }

  return parsed;
}

/**
 * Generate a new random token (32 bytes, base64url-encoded).
 * This is the plaintext value shown to the user exactly once.
 */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Hash a token using SHA-256 and return hex string.
 * This is the value stored in the database.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function getPortalTokenExpiresAt(from = new Date()): Date {
  const expiresAt = new Date(from);
  expiresAt.setDate(expiresAt.getDate() + getConfiguredPortalTokenTtlDays());
  return expiresAt;
}

export function isPortalTokenExpired(
  expiresAt: Date | null | undefined,
  now = new Date()
): boolean {
  if (!expiresAt) return true;
  return expiresAt.getTime() <= now.getTime();
}
