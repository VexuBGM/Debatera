import { expect } from 'vitest';

export function expectActionSuccess<T extends { success: boolean }>(result: T) {
  expect(result.success).toBe(true);
  return result;
}

export function expectActionFailure<T extends { success: boolean; error?: string }>(
  result: T,
  error?: string
) {
  expect(result.success).toBe(false);
  if (error) expect(result.error).toContain(error);
  return result;
}
