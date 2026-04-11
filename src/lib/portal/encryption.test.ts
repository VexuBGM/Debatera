import { afterEach, describe, expect, it } from 'vitest';
import { decryptToken, encryptToken } from './encryption';

const originalSecret = process.env.CLERK_SECRET_KEY;

afterEach(() => {
  process.env.CLERK_SECRET_KEY = originalSecret;
});

describe('portal token encryption', () => {
  it('round trips token plaintext with AES-GCM', () => {
    process.env.CLERK_SECRET_KEY = 'test-secret';
    const encrypted = encryptToken('portal-token');

    expect(encrypted).not.toContain('portal-token');
    expect(decryptToken(encrypted)).toBe('portal-token');
  });

  it('fails closed for malformed ciphertext or wrong key', () => {
    process.env.CLERK_SECRET_KEY = 'test-secret';
    const encrypted = encryptToken('portal-token');

    expect(decryptToken('not.valid')).toBeNull();

    process.env.CLERK_SECRET_KEY = 'other-secret';
    expect(decryptToken(encrypted)).toBeNull();
  });

  it('requires a Clerk secret for encryption', () => {
    delete process.env.CLERK_SECRET_KEY;

    expect(() => encryptToken('portal-token')).toThrow('CLERK_SECRET_KEY');
  });
});
