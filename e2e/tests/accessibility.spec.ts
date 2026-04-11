import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('accessibility smoke scans', () => {
  test.skip(
    !process.env.E2E_BASE_URL && process.env.E2E_START_SERVER !== '1',
    'Set E2E_BASE_URL or E2E_START_SERVER=1 to run browser accessibility scans.'
  );

  test('public landing page has no automatically detectable axe violations', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
