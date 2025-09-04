import { describe, it, expect } from 'vitest';
import { createWaveScheduler } from '../../src/core/waveScheduler.js';

describe('wave scheduler', () => {
  it('starts wave when schedule time reached', () => {
    const calls = { started: 0, setWave: [], lsi: [] };
    let currentWave = 0;
    const ctx = {
      waveSchedule: [0, 10, 20],
      regionSpawnPoints: { R: [[1, 2]] },
      allDefensePoints: [],
      usedSpawnPoints: [],
      getTestMode: () => true,
      getGameOver: () => false,
      getGameWon: () => false,
      getRightOnlyMode: () => false,
      getHardcoreMode: () => false,
      getAccumulatedTime: () => 100,
      getCurrentWave: () => currentWave,
      setCurrentWave: (v) => {
        currentWave = v;
        calls.setWave.push(v);
      },
      getLastStartedWaveIndex: () => -1,
      setLastStartedWaveIndex: (v) => calls.lsi.push(v),
      addMoney: () => {},
      updateUI: () => {},
      showTargetNotification: () => {},
      getRandomSpawnPoint: () => [1, 2],
      activateDefensePoint: () => {},
      startWave: () => {
        calls.started++;
      },
      checkVictory: () => {},
      getDronesCount: () => 0,
      getRocketsCount: () => 0,
      getNextTargetRegion: () => null,
      setNextTargetRegion: () => {},
    };
    const s = createWaveScheduler(ctx);
    s.tick();
    expect(calls.started).toBe(1);
    expect(currentWave).toBe(1); // інкремент після старту
  });

  it('activates new defense point at specific waves (e.g., 2 -> index 1)', () => {
    const calls = { act: [] };
    let currentWave = 2; // на початку 3-ї хвилі scheduler активує другу ціль (index=1)
    const allDefensePoints = [[10, 10]]; // вже є 1 точка
    const usedSpawnPoints = [];
    const ctx = {
      waveSchedule: [0, 10, 20, 30],
      regionSpawnPoints: { R: [[100, 200]] },
      allDefensePoints,
      usedSpawnPoints,
      getTestMode: () => true,
      getGameOver: () => false,
      getGameWon: () => false,
      getRightOnlyMode: () => false,
      getHardcoreMode: () => false,
      getAccumulatedTime: () => 100,
      getCurrentWave: () => currentWave,
      setCurrentWave: (v) => (currentWave = v),
      getLastStartedWaveIndex: () => -1,
      setLastStartedWaveIndex: () => {},
      addMoney: () => {},
      updateUI: () => {},
      showTargetNotification: () => {},
      getRandomSpawnPoint: () => [100, 200],
      activateDefensePoint: (idx, coord) => calls.act.push([idx, coord]),
      startWave: () => {},
      checkVictory: () => {},
      getDronesCount: () => 0,
      getRocketsCount: () => 0,
      getNextTargetRegion: () => 'R',
      setNextTargetRegion: () => {},
    };
    const s = createWaveScheduler(ctx);
    s.tick();
    expect(calls.act.length).toBe(1);
    expect(calls.act[0][0]).toBe(1); // індекс другої цілі
    expect(allDefensePoints.length).toBe(2);
  });
});

