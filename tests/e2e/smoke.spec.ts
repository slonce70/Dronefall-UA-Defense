import { test, expect } from '@playwright/test';

test('loads and shows preMenu, starts game, shows HUD', async ({ page }) => {
  await page.goto('/?test=1');
  // preMenu present
  await expect(page.locator('#preMenu')).toBeVisible();
  // Start the default mode
  await page.locator('#startBtn').click();
  // Loading bar appears then disappears
  await expect(page.locator('#loading')).toBeVisible();
  await page.waitForTimeout(1500); // allow some preload progress
  // HUD elements
  await expect(page.locator('#controlPanel')).toBeVisible();
  await expect(page.locator('#money')).toBeVisible();
  await expect(page.locator('#waveDisplay')).toBeVisible();
});
