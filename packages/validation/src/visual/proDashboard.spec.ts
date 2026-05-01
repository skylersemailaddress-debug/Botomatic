import { test, expect } from '@playwright/test';

test('Pro dashboard visual', async ({ page }) => {
  await page.goto('/projects/default');
  await expect(page).toHaveScreenshot('pro-dashboard.png');
});
