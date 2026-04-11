import { expect, test } from '@playwright/test';

test.describe('ballot workflow smoke', () => {
  test.skip(!process.env.E2E_BALLOT_URL, 'Set E2E_BALLOT_URL to a seeded ballot URL.');

  test('seeded ballot page renders the ballot surface', async ({ page }) => {
    await page.goto(process.env.E2E_BALLOT_URL!, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByText(/ballot|speech|score/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
