// Планувальник хвиль: відповідає за показ підказок регіонів, активацію нових цілей
// та запуск хвиль згідно з розкладом. Не містить DOM‑маніпуляцій; усе — через колбеки ctx.

/**
 * @param {object} ctx
 * @returns {{ startGuards: () => void, tick: () => void }}
 */
import { Logger } from './Logger.js';

export function createWaveScheduler(ctx) {
  const log = new Logger({ scope: 'scheduler' });
  const {
    // стан і параметри
    waveSchedule,
    regionSpawnPoints,
    allDefensePoints,
    usedSpawnPoints,
    // гетери/сетери/колбеки
    getTestMode,
    getGameOver,
    getGameWon,
    getRightOnlyMode,
    getHardcoreMode,
    getAccumulatedTime,
    getCurrentWave,
    setCurrentWave,
    getLastStartedWaveIndex,
    setLastStartedWaveIndex,
    addMoney,
    updateUI,
    showTargetNotification,
    getRandomSpawnPoint,
    activateDefensePoint,
    startWave,
    checkVictory,
    getDronesCount,
    getRocketsCount,
    // next target region керується main.js
    getNextTargetRegion,
    setNextTargetRegion,
  } = ctx;

  function chooseNextRegionWithUnusedPoints() {
    const regions = Object.keys(regionSpawnPoints).filter((name) =>
      regionSpawnPoints[name].some(
        (pt) => !usedSpawnPoints.some((u) => u[0] === pt[0] && u[1] === pt[1])
      )
    );
    if (regions.length > 0) {
      const pick = regions[Math.floor(Math.random() * regions.length)];
      setNextTargetRegion(pick);
      return pick;
    }
    log.warn('No available regions with unused spawn points');
    setNextTargetRegion(null);
    return null;
  }

  function maybeNotifyTargetRegionForWave(waveIndex) {
    // В оригіналі підказки на індексах: 1,4,6,9,11
    if ([1, 4, 6, 9, 11].includes(waveIndex)) {
      const region = chooseNextRegionWithUnusedPoints();
      if (region) {
        showTargetNotification(region);
      }
    }
  }

  function maybeActivateNewDefensePointForWave(waveIndex) {
    const region = getNextTargetRegion();
    // В оригіналі активації на індексах: 2,5,7,10,12 з індексами 1..5
    const mapping = {
      2: 1,
      5: 2,
      7: 3,
      10: 4,
      12: 5,
    };
    if (mapping[waveIndex] != null && region) {
      const neededCount = mapping[waveIndex] + 1; // враховуючи початкову точку (0)
      if (allDefensePoints.length < neededCount) {
        const pt = getRandomSpawnPoint(region);
        allDefensePoints.push(pt);
        usedSpawnPoints.push(pt);
        activateDefensePoint(mapping[waveIndex], pt);
      }
    }
  }

  function tryStartWave(waveIndex) {
    setLastStartedWaveIndex(waveIndex);
    startWave();
    addMoney(150 * (waveIndex + 1));
    setCurrentWave(waveIndex + 1);
    updateUI();
  }

  function startGuards() {
    // Ранній запуск хвилі 1 (1200мс у тестовому режимі; 10с у звичайному)
    setTimeout(
      () => {
        if (getGameOver() || getGameWon()) return;
        const w = getCurrentWave();
        if (w === 0 && getLastStartedWaveIndex() !== w) {
          tryStartWave(w);
        }
      },
      getTestMode() ? 1200 : 10000
    );
  }

  function tick() {
    if (getGameOver() || getGameWon()) return;
    // Перемога після 25‑ї хвилі (умова з main.js)
    if ((getRightOnlyMode() || !getHardcoreMode()) && getCurrentWave() >= 25) {
      if (getDronesCount() === 0 && getRocketsCount() === 0) {
        checkVictory();
        return;
      }
    }
    const w = getCurrentWave();
    const lsi = getLastStartedWaveIndex();
    const allowStart = (!getRightOnlyMode() && getHardcoreMode()) || w < 25;
    const t = getAccumulatedTime();
    if (allowStart && lsi !== w && t >= (waveSchedule[w] ?? Infinity)) {
      log.info(
        `Wave ${w + 1}, defensePoints=${allDefensePoints.length}, alive=${allDefensePoints.filter((d) => d.alive).length}`
      );
      maybeNotifyTargetRegionForWave(w);
      maybeActivateNewDefensePointForWave(w);
      tryStartWave(w);
    }
  }

  return { startGuards, tick };
}
