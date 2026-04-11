import { vi } from 'vitest';

export function createMockStreamCall() {
  return {
    sendCustomEvent: vi.fn(async () => undefined),
    on: vi.fn(() => () => undefined),
  };
}
