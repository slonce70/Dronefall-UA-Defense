// Модуль UI магазину ППО
// Коментарі українською мовою, як просили

import { calcPurchasePrice, calcSellRefund, calcUpgradePrice } from '../pvo/math.js';

/**
 * @typedef {Object} PvoMenuCtx
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
  // Внутрішні кнопки/елементи меню
  // (оголошуються як const у момент створення)

  // Створити картки ППО (окрім Аеропорта)
  pvoTypes.forEach((item) => {
    if (item.name === 'Аеропорт') {
      return;
    }
    const el = document.createElement('div');
    el.className = 'pvo-item';
    el.innerHTML = `
      <img src="${item.img}" />
      <b>${item.name}</b><br/>
      💶${item.price}<br/>
      📏${item.radius}
    `;
    el.onclick = () => {
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
      el.classList.add('selected');
      if (sellPVOButton) {
        sellPVOButton.disabled = true;
      }
      if (upgradePVOButton) {
        upgradePVOButton.disabled = true;
      }
      if (upgradeInfo) {
        upgradeInfo.textContent = '';
      }
    };
    pvoMenu.appendChild(el);
  });

  // Кнопки дій
  const airportBtn = document.createElement('button');
  airportBtn.className = 'pvo-button';
  airportBtn.id = 'airportButton';
  airportBtn.innerHTML = '🏢<br>Аеропорт<br>💶3000';
  airportBtn.style.marginTop = '10px';
  pvoMenu.appendChild(airportBtn);

  const movePVOButton = document.createElement('button');
  movePVOButton.className = 'pvo-button';
  movePVOButton.innerHTML = '✈️<br>Перемістити F-16';
  movePVOButton.disabled = true;
  movePVOButton.style.marginTop = '10px';
  pvoMenu.appendChild(movePVOButton);

  const sellPVOButton = document.createElement('button');
  sellPVOButton.className = 'pvo-button';
  sellPVOButton.id = 'sellPVOButton';
  sellPVOButton.innerHTML = '💲<br>Продати ППО';
  sellPVOButton.disabled = true;
  sellPVOButton.style.marginTop = '10px';
  pvoMenu.appendChild(sellPVOButton);

  const upgradePVOButton = document.createElement('button');
  upgradePVOButton.className = 'pvo-button';
  upgradePVOButton.id = 'upgradePVOButton';
  upgradePVOButton.innerHTML = '📈<br>Покращити ППО<br>💶100';
  upgradePVOButton.disabled = true;
  upgradePVOButton.style.marginTop = '10px';
  pvoMenu.appendChild(upgradePVOButton);

  const upgradeInfo = document.createElement('div');
  upgradeInfo.id = 'upgradeInfo';
  upgradeInfo.style.marginTop = '10px';
  upgradeInfo.style.color = 'white';
  pvoMenu.appendChild(upgradeInfo);

  // Обробники кнопок
  movePVOButton.onclick = () => {
    const sel = ctx.getSelectedPVO();
    if (sel && sel.name === 'F-16') {
      ctx.setMovingPVO(sel);
      ctx.setMoveMode(true);
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
    // Оплата
    ctx.setMoney(ctx.getMoney() - price);
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
    ctx.setProgressBarMarker(marker);
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
          map.removeLayer(ctx.getProgressBarMarker());
        } catch {}
        ctx.setProgressBarMarker(null);
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
  };

  sellPVOButton.onclick = () => {
    const sel = ctx.getSelectedPVO();
    if (!sel) {
      return;
    }
    const refund = calcSellRefund(sel.price, sel.upgradeCount);
    ctx.setMoney(ctx.getMoney() + refund);
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
    sellPVOButton.innerHTML = '💲 Продати ППО';
    upgradePVOButton.disabled = true;
    upgradeInfo.textContent = '';
    if (movePVOButton) {
      movePVOButton.disabled = true;
    }
    document.querySelectorAll('.pvo-item').forEach((e) => e.classList.remove('selected'));
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
    const price = calcUpgradePrice(sel.upgradeCount);
    if (ctx.getMoney() < price) {
      return alert(`Недостатньо коштів для покращення, потрібно: ${price} карбованців.`);
    }
    ctx.setMoney(ctx.getMoney() - price);
    // Баланс: приріст у межах (до *3 від базового)
    sel.damage = Math.min(sel.damage + 6, 3 * sel.baseDamage);
    sel.radius = Math.min(sel.radius + 8, 3 * sel.baseRadius);
    sel.cd = Math.max(sel.cd - 100, 100);
    sel.upgradeCount++;
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
    sellPVOButton.innerHTML = `💲<br>Продати ППО<br><span style="white-space: nowrap;">+💶${refund}</span>`;
    ctx.updateMoney();
  };

  // Допоміжні API
  function updatePvoMenuPrice(name) {
    const count = ctx.pvoPurchaseCounts[name] || 0;
    const type = pvoTypes.find((p) => p.name === name);
    const price = calcPurchasePrice(type.price, count);
    document.querySelectorAll('.pvo-item').forEach((e) => {
      const b = e.querySelector('b');
      if (b && b.textContent === name) {
        e.innerHTML = `
          <img src="${type.img}" />
          <b>${name}</b><br/>
          💶${price}<br/>
          📏${type.radius}
        `;
      }
    });
    if (name === 'Аеропорт') {
      const btn = document.getElementById('airportButton');
      if (btn) {
        btn.innerHTML = '🏢<br>Аеропорт<br>💶' + price;
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
        el.onclick = () =>
          alert(`❌ Досягнуто ліміт ${ctx.getMaxPvoCount()} ППО. Покращи вже створені.`);
        return;
      }
      // Карта доступна одразу після ініціалізації
      if (type.name === 'F-16' && (!airportAlive || ctx.getIsAirportSpawning())) {
        el.classList.add('disabled');
        el.onclick = () =>
          alert(
            ctx.getIsAirportSpawning()
              ? '❌ Аеропорт ще будується! Зачекайте завершення.'
              : '❌ Для покупки F-16 спочатку потрібно збудувати Аеропорт!'
          );
        return;
      }
      el.classList.remove('disabled');
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
      } else {
        ab.disabled = false;
        ab.classList.remove('disabled');
      }
    }
  }

  function updateUpgradeButtonText() {
    const sel = ctx.getSelectedPVO();
    if (!sel) {
      return;
    }
    const price = calcUpgradePrice(sel.upgradeCount);
    upgradePVOButton.innerHTML = '📈 Покращити ППО<br>💶' + price;
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
      sellPVOButton.innerHTML = `💲<br>Продати ППО<br><span style="white-space: nowrap;">+💶${refund}</span>`;
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
      sellPVOButton.innerHTML = '💲 Продати ППО';
      document.querySelectorAll('.pvo-item').forEach((e) => e.classList.remove('selected'));
    },
  };
}
