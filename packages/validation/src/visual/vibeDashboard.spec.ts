import { test, expect } from '@playwright/test';

test('Vibe dashboard visual', async ({ page }) => {
  await page.goto('/projects/default/vibe');
  await expect(page).toHaveScreenshot('vibe-dashboard.png');
});
