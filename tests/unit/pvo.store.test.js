import { describe, it, expect } from 'vitest';
import { PvoStore } from '../../src/pvo/store.js';

describe('PvoStore', () => {
  it('buys when enough money', () => {
    let money = 1000;
    const store = new PvoStore(() => money, (v) => (money = v));
    const res = store.buy(500, 0);
    expect(res.ok).toBe(true);
    expect(money).toBeLessThan(1000);
  });

  it('prevents upgrade if not enough money', () => {
    let money = 10;
    const store = new PvoStore(() => money, (v) => (money = v));
    const unit = { price: 100, upgradeCount: 0, damage: 1, radius: 10, cd: 1 };
    const res = store.upgrade(unit);
    expect(res.ok).toBe(false);
  });

  it('sell returns refund and adds money', () => {
    let money = 0;
    const store = new PvoStore(() => money, (v) => (money = v));
    const unit = { price: 100, upgradeCount: 2 };
    const res = store.sell(unit);
    expect(res.refund).toBeGreaterThan(0);
    expect(money).toBeGreaterThan(0);
  });
});

