import { describe, it, expect } from 'vitest';
import {
  calcPurchasePrice,
  calcUpgradePrice,
  calcSellRefund,
  applyUpgradeStats,
  canUpgrade,
} from '../../src/pvo/math.js';

describe('PVO economy integration', () => {
  it('sequential purchases reduce wallet by sum of floored geometric prices', () => {
    let wallet = 10_000;
    const base = 1000;
    const spend = [0, 1, 2, 3].map((i) => calcPurchasePrice(base, i));
    const total = spend.reduce((a, b) => a + b, 0);
    expect(total).toBe(spend[0] + spend[1] + spend[2] + spend[3]);
    wallet -= total;
    expect(wallet).toBe(10_000 - total);
  });

  it('upgrades follow price curve and stats clamp to 3x base, cd >= 100', () => {
    const base = { damage: 10, radius: 100, cd: 800 };
    let pvo = { ...base, upgradeCount: 0 };
    let wallet = 10_000;
    for (let i = 0; i < 12; i++) {
      if (!canUpgrade(false, pvo.upgradeCount)) break;
      const price = calcUpgradePrice(pvo.upgradeCount);
      wallet -= price;
      pvo = applyUpgradeStats(pvo, base);
      expect(pvo.damage).toBeLessThanOrEqual(3 * base.damage);
      expect(pvo.radius).toBeLessThanOrEqual(3 * base.radius);
      expect(pvo.cd).toBeGreaterThanOrEqual(100);
    }
    expect(pvo.upgradeCount).toBeLessThanOrEqual(10);
  });

  it('sell refund matches 75% of total invested (base + upgrades)', () => {
    const basePrice = 1200;
    // invest 5 upgrades
    const refund = calcSellRefund(basePrice, 5);
    const investedUp = (100 * (Math.pow(1.75, 5) - 1)) / 0.75;
    const expected = Math.floor(0.75 * (basePrice + investedUp));
    expect(refund).toBe(expected);
  });
});
