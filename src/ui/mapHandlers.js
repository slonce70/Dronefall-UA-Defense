import L from 'leaflet';

// Обробники кліків по карті: установка/вибір ППО, переміщення F‑16.
export function attachMapHandlers(ctx) {
  const {
    map,
    isPointOnMap,
    pvoColorMap,
    // гетери/сетери стану
    getMoveMode,
    setMoveMode,
    getMovingPVO,
    setMovingPVO,
    getBuyingMode,
    setBuyingMode,
    getSelectedPVO,
    setSelectedPVO,
    getPvoList,
    getDefensePoints,
    getAirport,
    getMaxPvoCount,
    getMoney,
    setMoney,
    getPvoPurchaseCounts,
    // UI/API
    updateMoney,
    pvoApi,
  } = ctx;

  map.on('click', (evt) => {
    // Режим переміщення F‑16
    if (getMoveMode() && getMovingPVO()) {
      if (isPointOnMap(evt.latlng.lat, evt.latlng.lng)) {
        for (const dp of getDefensePoints()) {
          const dx = evt.latlng.lng - dp.lng;
          const dy = evt.latlng.lat - dp.lat;
          if (dx * dx + dy * dy < 50 * 50) {
            alert('❌ Не можна переміщувати F-16 надто близько до цілі! Тримай відстань.');
            setMoveMode(false);
            setMovingPVO(null);
            return;
          }
        }
        const moving = getMovingPVO();
        moving.targetPosition = evt.latlng;
        moving.isMovingToTarget = true;
        moving.center = evt.latlng;
      } else {
        alert('❌ Не можна переміщувати F-16 поза межами карти України!');
      }
      setMoveMode(false);
      setMovingPVO(null);
      return;
    }

    // Покупка ППО
    if (getBuyingMode() && getSelectedPVO()) {
      const selectedPVO = getSelectedPVO();
      if (!isPointOnMap(evt.latlng.lat, evt.latlng.lng)) {
        alert('❌ Не можна встановлювати ППО поза межами карти України!');
        return;
      }
      const airport = getAirport();
      if (
        selectedPVO.name === 'F-16' &&
        (!airport ||
          (evt.latlng.lng - airport.lng) * (evt.latlng.lng - airport.lng) +
            (evt.latlng.lat - airport.lat) * (evt.latlng.lat - airport.lat) >
            airport.radius * airport.radius)
      ) {
        alert('❌ F-16 можна встановлювати тільки в радіусі дії аеропорту!');
        return;
      }
      for (const dp of getDefensePoints()) {
        const dx = evt.latlng.lng - dp.lng;
        const dy = evt.latlng.lat - dp.lat;
        if (dx * dx + dy * dy < 50 * 50) {
          alert('❌ Не можна ставити ППО надто близько до цілі! Тримай відстань.');
          return;
        }
      }
      const purchases = getPvoPurchaseCounts()[selectedPVO.name] || 0;
      if (getPvoList().length >= getMaxPvoCount()) {
        alert(`Максимальна кількість ППО на карті — ${getMaxPvoCount()}. Покращи існуючі!`);
        return;
      }
      const price = Math.floor(selectedPVO.price * Math.pow(1.2, purchases));
      if (getMoney() < price) {
        alert(`Недостатньо коштів, потрібно ${Math.round(price)} карбованців.`);
        return;
      }
      const icon = L.divIcon({
        className: 'rotating-icon',
        html: `<img src="${selectedPVO.img}" style="width: ${selectedPVO.iconSize[0]}px; height: ${selectedPVO.iconSize[1]}px;" />`,
        iconSize: selectedPVO.iconSize,
        iconAnchor: [selectedPVO.iconSize[0] / 2, selectedPVO.iconSize[1] / 2],
      });
      const color = pvoColorMap[selectedPVO.name] || '#00FF00';
      const rangeCircle = L.circle(evt.latlng, {
        radius: selectedPVO.radius,
        color,
        fillColor: color,
        fillOpacity: 0.2,
      }).addTo(map);
      const marker = L.marker(evt.latlng, { icon }).addTo(map);
      const unit = {
        latlng: evt.latlng,
        center: evt.latlng,
        ...selectedPVO,
        baseDamage: selectedPVO.damage,
        baseRadius: selectedPVO.radius,
        baseCd: selectedPVO.cd,
        lastShot: 0,
        marker,
        rangeCircle,
        upgradeCount: 0,
        patrolAngle: 0,
        speed: 0.8,
        isMovingToTarget: false,
        targetPosition: null,
      };
      unit.imgEl = unit.marker.getElement()?.querySelector('img');
      getPvoList().push(unit);
      setMoney(getMoney() - price);
      updateMoney();
      const counts = getPvoPurchaseCounts();
      counts[selectedPVO.name] = purchases + 1;
      pvoApi.updatePvoMenuPrice(selectedPVO.name);
      setBuyingMode(false);
      setSelectedPVO(null);
      pvoApi.updatePvoPurchaseAvailability();
      document.querySelectorAll('.pvo-item').forEach((el) => el.classList.remove('selected'));
      pvoApi.resetSelectionUi();
      return;
    }

    // Вибір ПВО (для кнопок продажу/апгрейду)
    let picked = null;
    let bestDist2 = Infinity;
    for (const unit of getPvoList()) {
      const dx = evt.latlng.lng - unit.latlng.lng;
      const dy = evt.latlng.lat - unit.latlng.lat;
      const dist2 = dx * dx + dy * dy;
      const thr2 = unit.radius * unit.radius;
      if (dist2 <= thr2 && dist2 < bestDist2) {
        picked = unit;
        bestDist2 = dist2;
      }
    }
    if (picked) {
      setSelectedPVO(picked);
      const investedUpgrades = picked.upgradeCount > 0
        ? (100 * (Math.pow(1.75, picked.upgradeCount) - 1)) / 0.75
        : 0;
      const investedTotal = picked.price + investedUpgrades;
      const refund = Math.floor(0.75 * investedTotal);
      pvoApi.setSellButtonRefund(refund);
      pvoApi.setSellButtonEnabled(true);
      pvoApi.updateUpgradeButtonText();
      pvoApi.setUpgradeButtonDisabled(!!picked.noUpgrade);
      pvoApi.setUpgradeInfoText(`Покращено: ${picked.upgradeCount} / 10`);
      pvoApi.setMoveButtonEnabled(picked.name === 'F-16');
    } else {
      setSelectedPVO(null);
      pvoApi.resetSelectionUi();
    }
  });
}

