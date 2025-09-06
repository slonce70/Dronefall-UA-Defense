import { test, expect } from '@playwright/test';

test('render v2 maintains steady frame updates', async ({ page, browserName }) => {
  await page.goto('/?test=1&render=v2');
  await page.locator('#startBtn').click();
  await page.waitForSelector('#controlPanel', { state: 'visible' });

  // In CI, WebKit/mobile can throttle rAF more aggressively.
  // Use longer window and adaptive threshold.
  const isWebKit = browserName === 'webkit';
  const windowMs = isWebKit ? 4000 : 2000;
  const minDelta = isWebKit ? 5 : 30;

  const f1 = await page.evaluate(() => (window as any).__stats?.drawFrames || 0);
  await page.waitForTimeout(windowMs);
  const f2 = await page.evaluate(() => (window as any).__stats?.drawFrames || 0);
  expect(f2 - f1).toBeGreaterThanOrEqual(minDelta);
});
