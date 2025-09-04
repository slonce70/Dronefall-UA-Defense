// Допоміжні функції економіки ППО (чисті, зручні для тестів)

/**
 * Обчислити ціну покупки з урахуванням кількості вже придбаних
 * Формула: floor(base * 1.2^count)
 */
export function calcPurchasePrice(basePrice, purchaseCount) {
  return Math.floor(basePrice * Math.pow(1.2, purchaseCount));
}

/**
 * Обчислити вартість наступного покращення
 * Формула: round(100 * 1.75^upgradeCount)
 */
export function calcUpgradePrice(upgradeCount) {
  return Math.round(100 * Math.pow(1.75, upgradeCount));
}

/**
 * Повернення при продажі: 75% від сумарних інвестицій
 * Сумарні інвестиції = базова ціна + всі апгрейди,
 * де сума апгрейдів дорівнює: 100 * (1.75^n - 1) / 0.75
 */
export function calcSellRefund(basePrice, upgradeCount) {
  const upgradesInvested = upgradeCount > 0 ? (100 * (Math.pow(1.75, upgradeCount) - 1)) / 0.75 : 0;
  const totalInvested = basePrice + upgradesInvested;
  return Math.floor(0.75 * totalInvested);
}

/**
 * Застосувати один апгрейд до ППО (чисто, без побічних ефектів)
 * Обмеження: damage/radius не більше 3× від базових, cd не менше 100
 */
export function applyUpgradeStats(current, base) {
  const next = { ...current };
  next.damage = Math.min(current.damage + 6, 3 * base.damage);
  next.radius = Math.min(current.radius + 8, 3 * base.radius);
  next.cd = Math.max(current.cd - 100, 100);
  next.upgradeCount = (current.upgradeCount || 0) + 1;
  return next;
}

/** Чи дозволений апгрейд: не для noUpgrade і не більше 10 разів */
export function canUpgrade(noUpgrade, upgradeCount) {
  if (noUpgrade) {
    return false;
  }
  return (upgradeCount || 0) < 10;
}
