import { test, expect } from '@playwright/test';

test('render v2 maintains steady frame updates', async ({ page }) => {
  await page.goto('/?test=1&render=v2');
  await page.locator('#startBtn').click();
  await page.waitForSelector('#controlPanel', { state: 'visible' });

  // Sample frame counter over ~2s window
  const f1 = await page.evaluate(() => (window as any).__stats?.drawFrames || 0);
  await page.waitForTimeout(1800);
  const f2 = await page.evaluate(() => (window as any).__stats?.drawFrames || 0);
  // Expect at least ~30 frames advanced under CI headless load
  expect(f2 - f1).toBeGreaterThanOrEqual(30);
});

