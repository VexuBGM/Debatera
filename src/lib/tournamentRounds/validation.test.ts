import { describe, expect, it } from 'vitest';
import { isValidStatusTransition } from './validation';

describe('isValidStatusTransition', () => {
  it('DRAFT -> PUBLISHED is allowed', () => {
    expect(isValidStatusTransition('DRAFT', 'PUBLISHED')).toBe(true);
  });

  it('PUBLISHED -> IN_PROGRESS is allowed', () => {
    expect(isValidStatusTransition('PUBLISHED', 'IN_PROGRESS')).toBe(true);
  });

  it('PUBLISHED -> DRAFT is allowed', () => {
    expect(isValidStatusTransition('PUBLISHED', 'DRAFT')).toBe(true);
  });

  it('IN_PROGRESS -> COMPLETED is allowed', () => {
    expect(isValidStatusTransition('IN_PROGRESS', 'COMPLETED')).toBe(true);
  });

  it('IN_PROGRESS -> PUBLISHED is allowed', () => {
    expect(isValidStatusTransition('IN_PROGRESS', 'PUBLISHED')).toBe(true);
  });

  it('DRAFT -> IN_PROGRESS is blocked (skips PUBLISHED)', () => {
    expect(isValidStatusTransition('DRAFT', 'IN_PROGRESS')).toBe(false);
  });

  it('DRAFT -> COMPLETED is blocked', () => {
    expect(isValidStatusTransition('DRAFT', 'COMPLETED')).toBe(false);
  });

  it('COMPLETED -> any status is blocked (no un-completing)', () => {
    expect(isValidStatusTransition('COMPLETED', 'DRAFT')).toBe(false);
    expect(isValidStatusTransition('COMPLETED', 'PUBLISHED')).toBe(false);
    expect(isValidStatusTransition('COMPLETED', 'IN_PROGRESS')).toBe(false);
  });

  it('same-status transition (DRAFT -> DRAFT) is blocked', () => {
    expect(isValidStatusTransition('DRAFT', 'DRAFT')).toBe(false);
  });
});
