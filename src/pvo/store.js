// @ts-check
import {
  calcPurchasePrice,
  calcUpgradePrice,
  calcSellRefund,
  canUpgrade,
  applyUpgradeStats,
} from './math.js';

export class PvoStore {
  constructor(getMoney, setMoney) {
    this.getMoney = getMoney;
    this.setMoney = setMoney;
  }

  buy(basePrice, purchaseCount) {
    const price = calcPurchasePrice(basePrice, purchaseCount);
    const money = this.getMoney();
    if (money < price) return { ok: false, price };
    this.setMoney(money - price);
    return { ok: true, price };
  }

  upgrade(unit) {
    const allowed = canUpgrade(!!unit.noUpgrade, unit.upgradeCount || 0);
    if (!allowed) return { ok: false, cost: 0 };
    const cost = calcUpgradePrice(unit.upgradeCount || 0);
    const money = this.getMoney();
    if (money < cost) return { ok: false, cost };
    this.setMoney(money - cost);
    const next = { ...unit, upgradeCount: (unit.upgradeCount || 0) + 1 };
    const applied = applyUpgradeStats(next, {
      damage: unit.baseDamage ?? unit.damage,
      radius: unit.baseRadius ?? unit.radius,
      cd: unit.baseCd ?? unit.cd,
    });
    return { ok: true, cost, unit: { ...next, ...applied } };
  }

  sell(unit) {
    const refund = calcSellRefund(unit.price, unit.upgradeCount || 0);
    this.setMoney(this.getMoney() + refund);
    return { refund };
  }
}
