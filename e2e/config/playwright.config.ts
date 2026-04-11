import { defineConfig, devices } from '@playwright/test';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

if (process.env.E2E_SEED === '1' && !process.env.E2E_BASE_URL && !process.env.E2E_START_SERVER) {
  process.env.E2E_START_SERVER = '1';
}

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const shouldStartServer = process.env.E2E_START_SERVER === '1';

export default defineConfig({
  testDir: '..',
  testMatch: ['tests/**/*.spec.ts', 'config/auth.setup.ts'],
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  globalSetup: './global-setup.ts',
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      testMatch: /.*\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: shouldStartServer
    ? {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
});
