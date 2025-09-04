import { test, expect } from '@playwright/test';

test('Leaflet is available and map boots', async ({ page }) => {
  await page.goto('/');
  // L should be defined by the bundle
  await page.waitForFunction(() => typeof (window as any).L !== 'undefined');
  // Start game
  await page.locator('#startBtn').click();
  // Control panel visible means init passed
  await expect(page.locator('#controlPanel')).toBeVisible();
});

