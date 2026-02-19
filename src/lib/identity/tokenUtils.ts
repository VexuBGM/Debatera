/**
 * Identity Module – Token & Email Utilities
 *
 * Provides crypto helpers for Tabbycat-style private URL tokens
 * and email normalization used throughout the Person/claim flow.
 */

import { randomBytes, createHash, timingSafeEqual } from 'crypto';

// ============================================================================
// Email normalization
// ============================================================================

/**
 * Normalize an email to a canonical lowercase, trimmed form.
 * Returns null if input is falsy or empty after trimming.
 */
export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

// ============================================================================
// Token generation & hashing
// ============================================================================

/**
 * Generate a cryptographically secure random token (32 bytes, base64url).
 * This is the RAW token that is shown to the user exactly once.
 */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Hash a raw token using SHA-256, returning a hex digest.
 * Only the hash is stored in the database; the raw token is never persisted.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * Constant-time comparison of two strings (to prevent timing attacks on token lookup).
 * Both strings are UTF-8 encoded before comparison.
 */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
