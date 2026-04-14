try {
  await import('@testing-library/jest-dom/vitest');
} catch {
  // The current unit suite is node-only; keep setup resilient if DOM matchers
  // are not installed in the local workspace.
}

export {};
