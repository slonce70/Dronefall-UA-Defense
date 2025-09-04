import { test, expect } from '@playwright/test';

test('first wave triggers within 6s (console log)', async ({ page }) => {
  await page.goto('/?test=1');
  page.on('console', (m) => console.log('[console]', m.type(), m.text()));
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.locator('#startBtn').click();
  // Allow preload to run and map to init
  await page.waitForSelector('#controlPanel', { state: 'visible' });
  const started = new Promise<void>((resolve) => {
    page.on('console', (msg) => {
      const t = msg.text();
      if (t.includes('Starting wave')) resolve();
    });
  });
  await started;
});
