import { expect, test } from '@playwright/test';

test.describe('judge portal smoke', () => {
  test.skip(!process.env.E2E_PORTAL_URL, 'Set E2E_PORTAL_URL to a seeded judge portal link.');

  test('token link opens the judge portal context', async ({ page }) => {
    await page.goto(process.env.E2E_PORTAL_URL!);
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByText(/ballot|round|judge/i).first()).toBeVisible();
  });
});
