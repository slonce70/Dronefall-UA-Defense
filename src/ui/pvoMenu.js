// Меню ППО (українською)

import { calcPurchasePrice, calcSellRefund, calcUpgradePrice } from '../pvo/math.js';

/**
 * @typedef {object} PvoMenuCtx
 * @property {L.Map} map
 * @property {HTMLElement} pvoMenu
 * @property {Array<any>} pvoTypes
 * @property {Record<string,string>} pvoColorMap
 * @property {Array<any>} pvoList
 * @property {Record<string,number>} pvoPurchaseCounts
 * @property {() => number} getMaxPvoCount
 * @property {() => number} getMoney
 * @property {(v:number)=>void} setMoney
 * @property {() => void} updateMoney
 * @property {() => void} updateUI
 * @property {() => any|null} getAirport
 * @property {(a:any)=>void} setAirport
 * @property {() => boolean} getIsAirportSpawning
 * @property {(v:boolean)=>void} setIsAirportSpawning
 * @property {() => any|null} getProgressBarMarker
 * @property {(m:any)=>void} setProgressBarMarker
 * @property {() => number} getGameSpeed
 * @property {(v:any)=>void} setSelectedPVO
 * @property {() => any|null} getSelectedPVO
 * @property {(v:boolean)=>void} setBuyingMode
 * @property {() => boolean} getBuyingMode
 * @property {(v:boolean)=>void} setMoveMode
 * @property {() => boolean} getMoveMode
 * @property {(v:any)=>void} setMovingPVO
 * @property {() => any|null} getMovingPVO
 * @property {(pos:[number,number])=>void} activateAirport
 */

/**
 * Налаштовує меню ППО та повертає API оновлень
 * ctx: залежності та стан (див. main.js під час виклику)
 */
export function setupPvoMenu(ctx) {
  const { pvoTypes, pvoMenu, pvoColorMap, map } = ctx;
  const store = ctx.store; // optional PvoStore
  const bus = ctx.bus; // optional EventBus
  // Внутрішні кнопки/елементи меню
  // (оголошуються як const у момент створення)

  // Створити картки ППО (окрім Аеропорта)
  pvoTypes.forEach((item) => {
    if (item.name === 'Аеропорт') {
      return;
    }
    const elCard = document.createElement('div');
    elCard.className = 'pvo-item';
    const _img = document.createElement('img');
    _img.src = item.img;
    const _name = document.createElement('b');
    _name.textContent = item.name;
    const _br1 = document.createElement('br');
    const _price = document.createElement('span');
    _price.textContent = `💶${item.price}`;
    const _br2 = document.createElement('br');
    const _radius = document.createElement('span');
    _radius.textContent = `📏${item.radius}`;
    elCard.append(_img, _name, _br1, _price, _br2, _radius);
    elCard.onclick = () => {
      // Вибір юніта для покупки (перевірка ціни)
      if (item.name === 'F-16' && !(ctx.getAirport() && ctx.getAirport().alive)) {
        alert('❌ Для покупки F-16 спочатку потрібно встановити аеропорт!');
        return;
      }
      const count = ctx.pvoPurchaseCounts[item.name] || 0;
      const price = calcPurchasePrice(item.price, count);
      if (ctx.getMoney() < price) {
        alert(`Недостатньо коштів, потрібно: ${Math.round(price)} карбованців.`);
        return;
      }
      ctx.setSelectedPVO(item);
      ctx.setBuyingMode(true);
      document.querySelectorAll('.pvo-item').forEach((e) => e.classList.remove('selected'));
      elCard.classList.add('selected');
      if (sellPVOButton) {
        sellPVOButton.disabled = true;
      }
      if (upgradePVOButton) {
        upgradePVOButton.disabled = true;
      }
      if (upgradeInfo) {
        upgradeInfo.textContent = '';
      }
      try {
        bus && bus.emit('pvo:select', { name: item.name, price });
      } catch {}
    };
    pvoMenu.appendChild(elCard);
  });

  // Кнопки дій
  const airportBtn = document.createElement('button');
  airportBtn.className = 'pvo-button';
  airportBtn.id = 'airportButton';
  while (airportBtn.firstChild) airportBtn.removeChild(airportBtn.firstChild);
  airportBtn.append(
    document.createTextNode('🏢'),
    document.createElement('br'),
    document.createTextNode('Аеропорт'),
    document.createElement('br'),
    document.createTextNode('💶3000')
  );
  airportBtn.classList.add('mt-10');
  pvoMenu.appendChild(airportBtn);

  const movePVOButton = document.createElement('button');
  movePVOButton.className = 'pvo-button';
  while (movePVOButton.firstChild) movePVOButton.removeChild(movePVOButton.firstChild);
  movePVOButton.append(
    document.createTextNode('✈️'),
    document.createElement('br'),
    document.createTextNode('Перемістити F-16')
  );
  movePVOButton.disabled = true;
  movePVOButton.classList.add('mt-10');
  pvoMenu.appendChild(movePVOButton);

  const sellPVOButton = document.createElement('button');
  sellPVOButton.className = 'pvo-button';
  sellPVOButton.id = 'sellPVOButton';
  while (sellPVOButton.firstChild) sellPVOButton.removeChild(sellPVOButton.firstChild);
  sellPVOButton.append(
    document.createTextNode('💲'),
    document.createElement('br'),
    document.createTextNode('Продати ППО')
  );
  sellPVOButton.disabled = true;
  sellPVOButton.classList.add('mt-10');
  pvoMenu.appendChild(sellPVOButton);

  const upgradePVOButton = document.createElement('button');
  upgradePVOButton.className = 'pvo-button';
  upgradePVOButton.id = 'upgradePVOButton';
  while (upgradePVOButton.firstChild) upgradePVOButton.removeChild(upgradePVOButton.firstChild);
  upgradePVOButton.append(
    document.createTextNode('📈'),
    document.createElement('br'),
    document.createTextNode('Покращити ППО'),
    document.createElement('br'),
    document.createTextNode('💶100')
  );
  upgradePVOButton.disabled = true;
  upgradePVOButton.classList.add('mt-10');
  pvoMenu.appendChild(upgradePVOButton);

  const upgradeInfo = document.createElement('div');
  upgradeInfo.id = 'upgradeInfo';
  upgradeInfo.classList.add('mt-10', 'text-white');
  pvoMenu.appendChild(upgradeInfo);

  // Обробники кнопок
  movePVOButton.onclick = () => {
    const sel = ctx.getSelectedPVO();
    if (sel && sel.name === 'F-16') {
      ctx.setMovingPVO(sel);
      ctx.setMoveMode(true);
    }
  };

  // Fallback‑сумісність з різними ініціалізаторами: зберігати маркер прогресу або в ctx, або на map
  const setPB =
    typeof ctx.setProgressBarMarker === 'function'
      ? ctx.setProgressBarMarker
      : (m) => {
          try {
            map.__airportProgressMarker = m;
          } catch {}
        };
  const getPB =
    typeof ctx.getProgressBarMarker === 'function'
      ? ctx.getProgressBarMarker
      : () => {
          try {
            return map.__airportProgressMarker || null;
          } catch {
            return null;
          }
        };

  airportBtn.onclick = () => {
    const airportType = pvoTypes.find((p) => p.name === 'Аеропорт');
    const count = ctx.pvoPurchaseCounts[airportType.name] || 0;
    const price = calcPurchasePrice(airportType.price, count);
    if (ctx.getMoney() < price) {
      alert(`Недостатньо коштів, потрібно: ${Math.round(price)} карбованців.`);
      return;
    }
    // Оплата через PvoStore (якщо доступний)
    if (store) {
      const res = store.buy(airportType.price, count);
      if (!res.ok) {
        alert(`Недостатньо коштів, потрібно: ${Math.round(res.price)} карбованців.`);
        return;
      }
    } else {
      ctx.setMoney(ctx.getMoney() - price);
    }
    ctx.updateMoney();
    ctx.pvoPurchaseCounts[airportType.name] = count + 1;
    updatePvoMenuPrice(airportType.name);

    // Прогрес-бар побудови аеропорту (60 сек, масштабується швидкістю гри)
    const pos = [2250, 700];
    const container = document.createElement('div');
    container.className = 'progress-bar-container';
    const bar = document.createElement('div');
    bar.className = 'progress-bar';
    container.appendChild(bar);
    const marker = L.marker(pos, {
      icon: L.divIcon({ html: container, className: '', iconSize: [60, 8], iconAnchor: [30, 4] }),
    }).addTo(map);
    setPB(marker);
    ctx.setIsAirportSpawning(true);
    updatePvoPurchaseAvailability();

    const buildMs = 60000;
    let last = performance.now();
    let acc = 0;
    function step(t) {
      const dt = (t - last) * ctx.getGameSpeed();
      acc += dt;
      last = t;
      const pct = Math.min((acc / buildMs) * 100, 100);
      bar.style.width = pct + '%';
      if (pct >= 100) {
        try {
          const cur = getPB();
          if (cur) map.removeLayer(cur);
        } catch {}
        setPB(null);
        ctx.setIsAirportSpawning(false);
        ctx.activateAirport(pos);
        updatePvoPurchaseAvailability();
      } else {
        requestAnimationFrame(step);
      }
    }
    requestAnimationFrame(step);

    document.querySelectorAll('.pvo-item').forEach((e) => e.classList.remove('selected'));
    sellPVOButton.disabled = true;
    upgradePVOButton.disabled = true;
    upgradeInfo.textContent = '';
    try {
      bus && bus.emit('airport:start', { price });
    } catch {}
  };

  sellPVOButton.onclick = () => {
    const sel = ctx.getSelectedPVO();
    if (!sel) {
      return;
    }
    const refund = store ? store.sell(sel).refund : calcSellRefund(sel.price, sel.upgradeCount);
    if (!store) ctx.setMoney(ctx.getMoney() + refund);
    ctx.updateMoney();
    try {
      map.removeLayer(sel.marker);
      if (sel.rangeCircle) {
        map.removeLayer(sel.rangeCircle);
      }
    } catch {}
    const list = ctx.pvoList; // посилання на масив
    const idx = list.indexOf(sel);
    if (idx !== -1) {
      list.splice(idx, 1);
    }
    updatePvoPurchaseAvailability();
    ctx.setSelectedPVO(null);
    // Скидаємо UI вибору після продажу — як в оригіналі
    sellPVOButton.disabled = true;
    while (sellPVOButton.firstChild) sellPVOButton.removeChild(sellPVOButton.firstChild);
    sellPVOButton.append(
      document.createTextNode('💲'),
      document.createElement('br'),
      document.createTextNode('Продати ППО')
    );
    upgradePVOButton.disabled = true;
    upgradeInfo.textContent = '';
    if (movePVOButton) {
      movePVOButton.disabled = true;
    }
    document.querySelectorAll('.pvo-item').forEach((e) => e.classList.remove('selected'));
    try {
      bus && bus.emit('pvo:sell', { name: sel.name, refund });
    } catch {}
  };

  upgradePVOButton.onclick = () => {
    const sel = ctx.getSelectedPVO();
    if (!sel) {
      return;
    }
    if (sel.noUpgrade) {
      return alert('❌ F-16 та Аеропорт не можна покращувати!');
    }
    if (sel.upgradeCount >= 10) {
      return alert('❌ Це ППО покращено вже 10 разів - більше не можна!');
    }
    // Через PvoStore (з валідацією та новими статами)
    if (store) {
      const res = store.upgrade(sel);
      if (!res.ok) {
        return alert(`Недостатньо коштів для покращення, потрібно: ${res.cost} карбованців.`);
      }
      const unit = res.unit;
      sel.damage = unit.damage;
      sel.radius = unit.radius;
      sel.cd = unit.cd;
      sel.upgradeCount = unit.upgradeCount;
    } else {
      const price = calcUpgradePrice(sel.upgradeCount);
      if (ctx.getMoney() < price) {
        return alert(`Недостатньо коштів для покращення, потрібно: ${price} карбованців.`);
      }
      ctx.setMoney(ctx.getMoney() - price);
      sel.damage = Math.min(sel.damage + 6, 3 * sel.baseDamage);
      sel.radius = Math.min(sel.radius + 8, 3 * sel.baseRadius);
      sel.cd = Math.max(sel.cd - 100, 100);
      sel.upgradeCount++;
    }
    upgradeInfo.textContent = `Покращено: ${sel.upgradeCount} / 10`;
    updateUpgradeButtonText();
    if (sel.rangeCircle) {
      const col = pvoColorMap[sel.name] || '#00FF00';
      sel.rangeCircle.setRadius(sel.radius);
      sel.rangeCircle.setStyle({
        color: col,
        fillColor: col,
        fillOpacity: 0.2,
        className: 'no-blur-circle',
      });
    }
    const refund = calcSellRefund(sel.price, sel.upgradeCount);
    // Безпечне оновлення кнопки продажу з сумою повернення
    (function setRefund(v) {
      while (sellPVOButton.firstChild) sellPVOButton.removeChild(sellPVOButton.firstChild);
      const top = document.createElement('span');
      top.textContent = '💲';
      const mid = document.createElement('span');
      mid.textContent = 'Продати ППО';
      const tail = document.createElement('span');
      tail.className = 'nowrap';
      tail.textContent = `+💶${v}`;
      sellPVOButton.append(
        top,
        document.createElement('br'),
        mid,
        document.createElement('br'),
        tail
      );
    })(refund);
    ctx.updateMoney();
    try {
      bus && bus.emit('pvo:upgrade', { name: sel.name, upgradeCount: sel.upgradeCount });
    } catch {}
  };

  // Допоміжні API
  function updatePvoMenuPrice(name) {
    const count = ctx.pvoPurchaseCounts[name] || 0;
    const type = pvoTypes.find((p) => p.name === name);
    const price = calcPurchasePrice(type.price, count);
    document.querySelectorAll('.pvo-item').forEach((e) => {
      const b = e.querySelector('b');
      if (b && b.textContent === name) {
        while (e.firstChild) e.removeChild(e.firstChild);
        const _i = document.createElement('img');
        _i.src = type.img;
        const _n = document.createElement('b');
        _n.textContent = name;
        const _brA = document.createElement('br');
        const _p = document.createElement('span');
        _p.textContent = `💶${price}`;
        const _brB = document.createElement('br');
        const _r = document.createElement('span');
        _r.textContent = `📏${type.radius}`;
        e.append(_i, _n, _brA, _p, _brB, _r);
      }
    });
    if (name === 'Аеропорт') {
      const btn = document.getElementById('airportButton');
      if (btn) {
        while (btn.firstChild) btn.removeChild(btn.firstChild);
        btn.append(
          document.createTextNode('🏢'),
          document.createElement('br'),
          document.createTextNode('Аеропорт'),
          document.createElement('br'),
          document.createTextNode('💶' + price)
        );
      }
    }
  }

  function updatePvoPurchaseAvailability() {
    const reachedLimit = ctx.pvoList.length >= ctx.getMaxPvoCount();
    const airportAlive = !!(ctx.getAirport() && ctx.getAirport().alive);
    document.querySelectorAll('.pvo-item').forEach((el) => {
      const name = el.querySelector('b')?.textContent;
      const type = pvoTypes.find((p) => p.name === name);
      if (!type) {
        return;
      }
      if (reachedLimit) {
        el.classList.add('disabled');
        el.setAttribute('aria-disabled', 'true');
        el.onclick = () =>
          alert(`❌ Досягнуто ліміт ${ctx.getMaxPvoCount()} ППО. Покращи вже створені.`);
        return;
      }
      // Карта доступна одразу після ініціалізації
      if (type.name === 'F-16' && (!airportAlive || ctx.getIsAirportSpawning())) {
        el.classList.add('disabled');
        el.setAttribute('aria-disabled', 'true');
        el.onclick = () =>
          alert(
            ctx.getIsAirportSpawning()
              ? '❌ Аеропорт ще будується! Зачекайте завершення.'
              : '❌ Для покупки F-16 спочатку потрібно збудувати Аеропорт!'
          );
        return;
      }
      el.classList.remove('disabled');
      el.setAttribute('aria-disabled', 'false');
      el.onclick = () => {
        const count = ctx.pvoPurchaseCounts[type.name] || 0;
        const price = calcPurchasePrice(type.price, count);
        if (ctx.getMoney() < price) {
          alert(`Недостатньо коштів. Потрібно ${Math.round(price)} карбованців.`);
          return;
        }
        ctx.setSelectedPVO(type);
        ctx.setBuyingMode(true);
        document.querySelectorAll('.pvo-item').forEach((e) => e.classList.remove('selected'));
        el.classList.add('selected');
        sellPVOButton.disabled = true;
        upgradePVOButton.disabled = true;
      };
    });
    const ab = document.getElementById('airportButton');
    if (ab) {
      if (airportAlive || ctx.getIsAirportSpawning()) {
        ab.disabled = true;
        ab.classList.add('disabled');
        ab.setAttribute('aria-disabled', 'true');
      } else {
        ab.disabled = false;
        ab.classList.remove('disabled');
        ab.setAttribute('aria-disabled', 'false');
      }
    }
  }

  function updateUpgradeButtonText() {
    const sel = ctx.getSelectedPVO();
    if (!sel) {
      return;
    }
    const price = calcUpgradePrice(sel.upgradeCount);
    while (upgradePVOButton.firstChild) upgradePVOButton.removeChild(upgradePVOButton.firstChild);
    upgradePVOButton.append(
      document.createTextNode('📈 Покращити ППО'),
      document.createElement('br'),
      document.createTextNode('💶' + price)
    );
  }

  // Повертаємо API для використання ззовні
  return {
    updatePvoMenuPrice,
    updatePvoPurchaseAvailability,
    updateUpgradeButtonText,
    // додатково — щоб main міг керувати станом кнопки переміщення
    setMoveButtonEnabled: (enabled) => {
      movePVOButton.disabled = !enabled;
    },
    setSellButtonEnabled: (enabled) => {
      sellPVOButton.disabled = !enabled;
    },
    setSellButtonRefund: (refund) => {
      while (sellPVOButton.firstChild) sellPVOButton.removeChild(sellPVOButton.firstChild);
      const top = document.createElement('span');
      top.textContent = '💲';
      const mid = document.createElement('span');
      mid.textContent = 'Продати ППО';
      const tail = document.createElement('span');
      tail.className = 'nowrap';
      tail.textContent = `+💶${refund}`;
      sellPVOButton.append(
        top,
        document.createElement('br'),
        mid,
        document.createElement('br'),
        tail
      );
    },
    setUpgradeButtonDisabled: (disabled) => {
      upgradePVOButton.disabled = !!disabled;
    },
    setUpgradeInfoText: (text) => {
      upgradeInfo.textContent = text || '';
    },
    resetSelectionUi: () => {
      sellPVOButton.disabled = true;
      upgradePVOButton.disabled = true;
      upgradeInfo.textContent = '';
      while (sellPVOButton.firstChild) sellPVOButton.removeChild(sellPVOButton.firstChild);
      sellPVOButton.append(
        document.createTextNode('💲'),
        document.createElement('br'),
        document.createTextNode('Продати ППО')
      );
      document.querySelectorAll('.pvo-item').forEach((e) => e.classList.remove('selected'));
    },
  };
}
