import { test, expect } from '@playwright/test';

test('fallback dots render on first wave with debug=points', async ({ page }) => {
  await page.goto('/?debug=points&test=1');
  await page.locator('#startBtn').click();
  await page.waitForSelector('#controlPanel', { state: 'visible' });
  await page.waitForFunction(() => (window as any).__stats && (window as any).__stats.sprites);
  // wait up to ~15s for first drones to be drawn inside viewport (wave starts at 10s)
  await page.waitForFunction(
    () => {
      const s = (window as any).__stats?.sprites;
      return s && s.drawn && (s.drawn.drones > 0 || s.drawn.rockets > 0);
    },
    null,
    { timeout: 15000 }
  );
  const drawn = await page.evaluate(() => (window as any).__stats.sprites.drawn);
  expect(drawn.drones + drawn.rockets).toBeGreaterThan(0);
});

test('container-attach fallback also renders', async ({ page }) => {
  await page.goto('/?pane=container&debug=points&test=1');
  await page.locator('#startBtn').click();
  await page.waitForSelector('#controlPanel', { state: 'visible' });
  await page.waitForFunction(() => (window as any).__stats && (window as any).__stats.sprites);
  await page.waitForFunction(
    () => {
      const s = (window as any).__stats?.sprites;
      return s && s.drawn && (s.drawn.drones > 0 || s.drawn.rockets > 0);
    },
    null,
    { timeout: 15000 }
  );
  const drawn = await page.evaluate(() => (window as any).__stats.sprites.drawn);
  expect(drawn.drones + drawn.rockets).toBeGreaterThan(0);
});
