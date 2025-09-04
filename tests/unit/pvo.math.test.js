import { describe, it, expect } from 'vitest';
import { calcPurchasePrice, calcUpgradePrice, calcSellRefund } from '../../src/pvo/math.js';

describe('PVO economy math', () => {
  it('calcPurchasePrice grows at 1.2^n and floors', () => {
    expect(calcPurchasePrice(1000, 0)).toBe(1000);
    expect(calcPurchasePrice(1000, 1)).toBe(Math.floor(1200));
    expect(calcPurchasePrice(1000, 2)).toBe(Math.floor(1440));
  });

  it('calcUpgradePrice grows at 1.75^n and rounds', () => {
    expect(calcUpgradePrice(0)).toBe(100);
    expect(calcUpgradePrice(1)).toBe(Math.round(175));
    expect(calcUpgradePrice(2)).toBe(Math.round(306.25));
  });

  it('calcSellRefund equals 75% of total invested (base + upgrades)', () => {
    // no upgrades: 75% of base
    expect(calcSellRefund(1000, 0)).toBe(Math.floor(0.75 * 1000));
    // with upgrades: use geometric sum formula the code relies on
    const n = 3;
    const upgradesInvested = (100 * (Math.pow(1.75, n) - 1)) / 0.75;
    const total = 1200 + upgradesInvested;
    expect(calcSellRefund(1200, n)).toBe(Math.floor(0.75 * total));
  });
});
