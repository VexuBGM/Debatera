import { describe, it, expect } from 'vitest';
import { normalizeEmail, hashToken, safeEqual } from './tokenUtils';

describe('tokenUtils', () => {
  it('normalizes emails', () => {
    expect(normalizeEmail('  Test@Example.COM ')).toBe('test@example.com');
    expect(normalizeEmail('')).toBeNull();
    expect(normalizeEmail(null)).toBeNull();
  });

  it('hashes tokens deterministically', () => {
    const hash1 = hashToken('abc');
    const hash2 = hashToken('abc');
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('compares strings in constant time', () => {
    expect(safeEqual('same', 'same')).toBe(true);
    expect(safeEqual('same', 'diff')).toBe(false);
    expect(safeEqual('short', 'longer')).toBe(false);
  });
});
