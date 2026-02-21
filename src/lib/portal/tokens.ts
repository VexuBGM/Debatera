/**
 * Portal Token Utilities
 *
 * Generates and hashes access tokens for the judge portal.
 * Tokens are random 32-byte values encoded as base64url.
 * Only the SHA-256 hash is stored in the database.
 */

import { randomBytes, createHash } from 'crypto';

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
