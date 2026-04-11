import { afterEach, describe, expect, it } from 'vitest';
import {
  generateToken,
  getPortalTokenExpiresAt,
  hashToken,
  isPortalTokenExpired,
} from './tokens';

const originalTtl = process.env.PORTAL_TOKEN_TTL_DAYS;

afterEach(() => {
  process.env.PORTAL_TOKEN_TTL_DAYS = originalTtl;
});

describe('portal token utilities', () => {
  it('generates 32-byte base64url tokens', () => {
    const token = generateToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(Buffer.from(token, 'base64url')).toHaveLength(32);
  });

  it('hashes tokens deterministically without storing plaintext', () => {
    const token = 'portal-token';
    const hash = hashToken(token);

    expect(hash).toHaveLength(64);
    expect(hash).toBe(hashToken(token));
    expect(hash).not.toContain(token);
  });

  it('uses the configured TTL when valid and falls back when invalid', () => {
    const from = new Date('2026-04-11T00:00:00Z');
    process.env.PORTAL_TOKEN_TTL_DAYS = '3';
    expect(getPortalTokenExpiresAt(from).toISOString()).toBe('2026-04-14T00:00:00.000Z');

    process.env.PORTAL_TOKEN_TTL_DAYS = '-1';
    expect(getPortalTokenExpiresAt(from).toISOString()).toBe('2026-04-25T00:00:00.000Z');
  });

  it('treats missing or past expiry as expired', () => {
    const now = new Date('2026-04-11T00:00:00Z');

    expect(isPortalTokenExpired(null, now)).toBe(true);
    expect(isPortalTokenExpired(new Date('2026-04-10T23:59:59Z'), now)).toBe(true);
    expect(isPortalTokenExpired(new Date('2026-04-11T00:00:01Z'), now)).toBe(false);
  });
});
