import { test as setup } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import {
  CLERK_TEST_ACCOUNT_VERIFICATION_CODE,
  isClerkTestAccountEmail,
} from '../fixtures/test-accounts';

const email = process.env.E2E_CLERK_EMAIL;
const password = process.env.E2E_CLERK_PASSWORD;

setup.skip(!email || !password, 'Set E2E_CLERK_EMAIL and E2E_CLERK_PASSWORD to record authenticated state.');

setup('authenticated storage state', async ({ page }) => {
  await page.goto('/sign-in');
  await page.getByLabel(/email/i).fill(email!);
  await page.getByRole('button', { name: /continue|sign in/i }).click();
  await page.getByLabel(/password/i).fill(password!);
  await page.getByRole('button', { name: /continue|sign in/i }).click();

  if (isClerkTestAccountEmail(email!)) {
    const verificationCodeInput = page
      .getByLabel(/verification code|code/i)
      .or(page.getByPlaceholder(/code/i))
      .first();

    if (await verificationCodeInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await verificationCodeInput.fill(CLERK_TEST_ACCOUNT_VERIFICATION_CODE).catch(async () => {
        const codeInputs = page.locator(
          'input[autocomplete="one-time-code"], input[inputmode="numeric"]'
        );
        const inputCount = await codeInputs.count();

        for (let index = 0; index < Math.min(inputCount, CLERK_TEST_ACCOUNT_VERIFICATION_CODE.length); index += 1) {
          await codeInputs.nth(index).fill(CLERK_TEST_ACCOUNT_VERIFICATION_CODE[index]);
        }
      });
      await page.getByRole('button', { name: /continue|verify|sign in/i }).click();
    }
  }

  await page.waitForURL(/dashboard|tournaments|institutions/);
  await mkdir('e2e/.auth', { recursive: true });
  await page.context().storageState({ path: 'e2e/.auth/user.json' });
});
