import { test, expect } from '@playwright/test';

test('first wave spawns visible enemies (__stats)', async ({ page }) => {
  await page.goto('/?test=1');
  await page.locator('#startBtn').click();
  await page.waitForSelector('#controlPanel', { state: 'visible' });
  // Wait until __stats exists
  await page.waitForFunction(
    () => (window as any).__stats && typeof (window as any).__stats.drones === 'number'
  );
  // Now wait for at least 1 drone to be present after wave start (wave starts at ~10s)
  await page.waitForFunction(() => ((window as any).__stats?.drones || 0) > 0, null, {
    timeout: 15000,
  });
  const drones = await page.evaluate(() => (window as any).__stats.drones);
  expect(drones).toBeGreaterThan(0);
});
