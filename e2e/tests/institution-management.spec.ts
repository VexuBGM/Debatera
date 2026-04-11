import { expect, test } from '@playwright/test';

test.describe('institution management smoke', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });
  test.skip(
    !process.env.E2E_CLERK_EMAIL || !process.env.E2E_CLERK_PASSWORD,
    'Set Clerk E2E credentials and run the auth setup to enable this smoke test.'
  );

  test('authenticated user can reach institutions', async ({ page }) => {
    await page.goto('/institutions');
    await expect(page.getByRole('main')).toBeVisible();
  });
});
