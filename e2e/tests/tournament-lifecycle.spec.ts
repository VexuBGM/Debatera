import { expect, test } from '@playwright/test';

test.describe('authenticated tournament lifecycle smoke', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });
  test.skip(
    !process.env.E2E_CLERK_EMAIL || !process.env.E2E_CLERK_PASSWORD,
    'Set Clerk E2E credentials and run the auth setup to enable this smoke test.'
  );

  test('authenticated user can reach the tournament workspace', async ({ page }) => {
    await page.goto('/tournaments');
    await expect(page.getByRole('main')).toBeVisible();
  });
});
