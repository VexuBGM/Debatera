import { test as setup } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const email = process.env.E2E_CLERK_EMAIL;
const password = process.env.E2E_CLERK_PASSWORD;

setup.skip(!email || !password, 'Set E2E_CLERK_EMAIL and E2E_CLERK_PASSWORD to record authenticated state.');

setup('authenticated storage state', async ({ page }) => {
  await page.goto('/sign-in');
  await page.getByLabel(/email/i).fill(email!);
  await page.getByRole('button', { name: /continue|sign in/i }).click();
  await page.getByLabel(/password/i).fill(password!);
  await page.getByRole('button', { name: /continue|sign in/i }).click();
  await page.waitForURL(/dashboard|tournaments|institutions/);
  await mkdir('e2e/.auth', { recursive: true });
  await page.context().storageState({ path: 'e2e/.auth/user.json' });
});
