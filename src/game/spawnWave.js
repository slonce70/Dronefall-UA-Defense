// Спавн хвиль винесено в окремий модуль

import { approximateBezierLength, generateControlPoint } from '../utils.js';
import { MAP_WIDTH, MAP_HEIGHT, OUTER_MARGIN } from '../constants.js';
import { debugSpawn, statsLogSpawn } from '../debug.js';

export function setupSpawner(ctx) {
  // Допоміжна функція: спавн з правого краю (оригінальна логіка)
  function spawnRight() {
    // Повертаємо кортеж [sx, sy], де sx=lng, sy=lat (узгодження зі start=[sy, sx])
    const sy = MAP_WIDTH * Math.random(); // lat уздовж карти
    const sx = MAP_HEIGHT + OUTER_MARGIN * Math.random(); // lng за межами праворуч
    return [sx, sy];
  }

  function spawnFromRightOnly(t, a, n = 0) {
    const defensePoints = ctx.getDefensePoints().filter((e) => e.alive);
    const pvoList = ctx.getPvoList();
    const rockets = ctx.getRockets();
    const drones = ctx.getDrones();
    const currentWave = ctx.getCurrentWave();

    console.log(
      `Wave ${currentWave + 1}: targetPoints=${defensePoints.length}, pvoList=` + pvoList.length
    );

    // легкі дрони
    let createdLight = 0;
    for (let i = 0; i < t; i++) {
      const [sx, sy] = spawnRight();
      let targetObj;
      let tx, ty;
      const r = Math.random();
      if (r < 0.1 && ctx.getAirport() && ctx.getAirport().alive) {
        targetObj = ctx.getAirport();
        tx = targetObj.lat;
        ty = targetObj.lng;
      } else if (r < 0.3 && pvoList.length > 0) {
        targetObj = pvoList[Math.floor(Math.random() * pvoList.length)];
        if (!targetObj.latlng || isNaN(targetObj.latlng.lat) || isNaN(targetObj.latlng.lng)) {
          console.warn(`Invalid PVO target for light drone spawn (wave ${currentWave + 1})`);
          targetObj = defensePoints[Math.floor(Math.random() * defensePoints.length)];
        } else {
          tx = targetObj.latlng.lat;
          ty = targetObj.latlng.lng;
        }
      } else {
        targetObj = defensePoints[Math.floor(Math.random() * defensePoints.length)];
      }
      if (targetObj && targetObj.lat && targetObj.lng) {
        tx = targetObj.lat;
        ty = targetObj.lng;
      }
      if (targetObj && tx != null && ty != null) {
        const start = [sy, sx];
        const end = [tx, ty];
        const ctrl = generateControlPoint(start, end);
        const len = approximateBezierLength(start, ctrl, end);
        if (!isFinite(len) || len < 5) {
          try {
            (window || globalThis).__stats?.errors?.push({
              t: Date.now(),
              kind: 'len-light-right',
              start,
              end,
            });
          } catch {}
          console.warn('[spawn] Skipping light drone due to invalid/short path');
          continue;
        }
        drones.push({
          type: 'light',
          position: start.slice(),
          start: start.slice(),
          control: ctrl,
          target: end.slice(),
          totalLength: len,
          t: 0,
          angleRad: 0,
          speed: 0.21 + 0.31 * Math.random() + 0.01 * currentWave,
          speedOriginal: 0.21 + 0.31 * Math.random() + 0.01 * currentWave,
          hp: 13 + 10 * currentWave,
        });
        createdLight++;
        try {
          statsLogSpawn('light', start, end, currentWave);
          debugSpawn(ctx.map, start, end, 'light', 1);
        } catch {}
      } else {
        console.warn(
          `No valid target available for light drone spawn (right, wave ${currentWave + 1})`
        );
      }
    }

    // важкі дрони
    let createdHeavy = 0;
    for (let i = 0; i < n; i++) {
      const [sx, sy] = spawnRight();
      let targetObj;
      let tx, ty;
      const r = Math.random();
      if (r < 0.1 && ctx.getAirport() && ctx.getAirport().alive) {
        targetObj = ctx.getAirport();
        tx = targetObj.lat;
        ty = targetObj.lng;
      } else if (r < 0.3 && pvoList.length > 0) {
        targetObj = pvoList[Math.floor(Math.random() * pvoList.length)];
        if (!targetObj.latlng || isNaN(targetObj.latlng.lat) || isNaN(targetObj.latlng.lng)) {
          console.warn(`Invalid PVO target for heavy drone spawn (wave ${currentWave + 1})`);
          targetObj = defensePoints[Math.floor(Math.random() * defensePoints.length)];
        } else {
          tx = targetObj.latlng.lat;
          ty = targetObj.latlng.lng;
        }
      } else {
        targetObj = defensePoints[Math.floor(Math.random() * defensePoints.length)];
      }
      if (targetObj && targetObj.lat && targetObj.lng) {
        tx = targetObj.lat;
        ty = targetObj.lng;
      }
      if (targetObj && tx != null && ty != null) {
        const start = [sy, sx];
        const end = [tx, ty];
        const ctrl = generateControlPoint(start, end);
        const len = approximateBezierLength(start, ctrl, end);
        if (!isFinite(len) || len < 5) {
          try {
            (window || globalThis).__stats?.errors?.push({
              t: Date.now(),
              kind: 'len-heavy-right',
              start,
              end,
            });
          } catch {}
          console.warn('[spawn] Skipping heavy drone due to invalid/short path');
          continue;
        }
        drones.push({
          type: 'heavy',
          position: start.slice(),
          start: start.slice(),
          control: ctrl,
          target: end.slice(),
          totalLength: len,
          t: 0,
          angleRad: 0,
          speed: 0.25 + 0.21 * Math.random() + 0.01 * currentWave,
          speedOriginal: 0.25 + 0.21 * Math.random() + 0.01 * currentWave,
          hp: 220 + 27 * currentWave,
        });
        createdHeavy++;
        try {
          statsLogSpawn('heavy', start, end, currentWave);
          debugSpawn(ctx.map, start, end, 'heavy', 1);
        } catch {}
      } else {
        console.warn(
          `No valid target available for heavy drone spawn (right, wave ${currentWave + 1})`
        );
      }
    }

    // ракети
    let createdRockets = 0;
    for (let i = 0; i < a; i++) {
      const [sx, sy] = spawnRight();
      const target = ctx.getRandomTarget(false);
      if (target) {
        rockets.push({
          position: [sy, sx],
          angleRad: 0,
          target: [target.lat, target.lng],
          speed: 1.2 + 1.6 * Math.random() + 0.01 * currentWave,
          speedOriginal: 1.2 + 1.6 * Math.random() + 0.01 * currentWave,
          hp: 20 + 15 * currentWave,
        });
        createdRockets++;
        try {
          statsLogSpawn('rocket', [sy, sx], [target.lat, target.lng], currentWave);
          debugSpawn(ctx.map, [sy, sx], [target.lat, target.lng], 'rocket', 1);
        } catch {}
      } else {
        console.warn(`No valid target available for rocket spawn (right, wave ${currentWave + 1})`);
      }
    }

    console.log(
      `[spawn] Wave ${currentWave + 1} created: light=${createdLight}, heavy=${createdHeavy}, rockets=${createdRockets}`
    );
  }

  function spawnWave(t = 3, a = 0, n = 0) {
    if (ctx.getRightOnlyMode()) {
      return spawnFromRightOnly(t, a, n);
    }

    const drones = ctx.getDrones();
    const rockets = ctx.getRockets();
    const currentWave = ctx.getCurrentWave();

    // легкі дрони
    let createdLight = 0;
    for (let i = 0; i < t; i++) {
      let sx, sy; // sx=lng, sy=lat
      const side = ['right'];
      if (currentWave >= 4) {
        side.push('bottom');
      }
      if (currentWave >= 8) {
        side.push('top');
      }
      if (currentWave >= 12) {
        side.push('left');
      }
      const chosen = side[Math.floor(Math.random() * side.length)];
      if (chosen === 'right') {
        sx = MAP_HEIGHT + OUTER_MARGIN * Math.random(); // lng за межами праворуч
        sy = MAP_WIDTH * Math.random(); // lat уздовж карти
      } else if (chosen === 'bottom') {
        sx = MAP_HEIGHT * Math.random(); // lng уздовж карти
        sy = MAP_WIDTH + OUTER_MARGIN * Math.random(); // lat за межами знизу
      } else if (chosen === 'top') {
        sx = MAP_HEIGHT * Math.random(); // lng уздовж карти
        sy = -OUTER_MARGIN; // lat за межами зверху
      } else {
        // ліворуч
        sx = -OUTER_MARGIN; // lng за межами ліворуч
        sy = MAP_WIDTH * Math.random(); // lat уздовж карти
      }
      const rt = ctx.getRandomTarget(true);
      if (rt) {
        const start = [sy, sx];
        const end = [rt.lat, rt.lng];
        const ctrl = generateControlPoint(start, end);
        const len = approximateBezierLength(start, ctrl, end);
        if (!isFinite(len) || len < 5) {
          try {
            (window || globalThis).__stats?.errors?.push({
              t: Date.now(),
              kind: 'len-light',
              start,
              end,
            });
          } catch {}
          console.warn('[spawn] Skipping light drone due to invalid/short path');
          continue;
        }
        drones.push({
          type: 'light',
          // Важливо: копіюємо стартову позицію, щоб подальші зміни не мутували оригінал
          position: start.slice(),
          start: start.slice(),
          control: ctrl,
          target: end.slice(),
          totalLength: len,
          t: 0,
          angleRad: 0,
          speed: 0.21 + 0.31 * Math.random() + 0.01 * currentWave,
          speedOriginal: 0.21 + 0.31 * Math.random() + 0.01 * currentWave,
          hp: 13 + 10 * currentWave,
        });
        createdLight++;
        try {
          statsLogSpawn('light', start, end, currentWave);
          debugSpawn(ctx.map, start, end, 'light', 1);
        } catch {}
      } else {
        console.warn(`No valid target available for light drone spawn (wave ${currentWave + 1})`);
      }
    }

    // важкі дрони
    let createdHeavy = 0;
    for (let i = 0; i < n; i++) {
      let sx, sy; // sx=lng, sy=lat
      const side = ['right'];
      if (currentWave >= 4) {
        side.push('bottom');
      }
      if (currentWave >= 8) {
        side.push('top');
      }
      if (currentWave >= 12) {
        side.push('left');
      }
      const chosen = side[Math.floor(Math.random() * side.length)];
      if (chosen === 'right') {
        sx = MAP_HEIGHT + OUTER_MARGIN * Math.random();
        sy = MAP_WIDTH * Math.random();
      } else if (chosen === 'bottom') {
        sx = MAP_HEIGHT * Math.random();
        sy = MAP_WIDTH + OUTER_MARGIN * Math.random();
      } else if (chosen === 'top') {
        sx = MAP_HEIGHT * Math.random();
        sy = -OUTER_MARGIN;
      } else {
        // ліворуч
        sx = -OUTER_MARGIN;
        sy = MAP_WIDTH * Math.random();
      }
      const rt = ctx.getRandomTarget(true);
      if (rt) {
        const start = [sy, sx];
        const end = [rt.lat, rt.lng];
        const ctrl = generateControlPoint(start, end);
        const len = approximateBezierLength(start, ctrl, end);
        if (!isFinite(len) || len < 5) {
          try {
            (window || globalThis).__stats?.errors?.push({
              t: Date.now(),
              kind: 'len-heavy',
              start,
              end,
            });
          } catch {}
          console.warn('[spawn] Skipping heavy drone due to invalid/short path');
          continue;
        }
        drones.push({
          type: 'heavy',
          position: start.slice(),
          start: start.slice(),
          control: ctrl,
          target: end.slice(),
          totalLength: len,
          t: 0,
          angleRad: 0,
          speed: 0.25 + 0.21 * Math.random() + 0.01 * currentWave,
          speedOriginal: 0.25 + 0.21 * Math.random() + 0.01 * currentWave,
          hp: 220 + 27 * currentWave,
        });
        createdHeavy++;
        try {
          statsLogSpawn('heavy', start, end, currentWave);
          debugSpawn(ctx.map, start, end, 'heavy', 1);
        } catch {}
      } else {
        console.warn(`No valid target available for heavy drone spawn (wave ${currentWave + 1})`);
      }
    }

    // ракети
    let createdRockets = 0;
    for (let i = 0; i < a; i++) {
      let sx, sy; // sx=lng, sy=lat
      const v = ['left', 'right', 'top', 'bottom'][Math.floor(4 * Math.random())];
      if (v === 'right') {
        sx = MAP_HEIGHT + OUTER_MARGIN * Math.random();
        sy = MAP_WIDTH * Math.random();
      } else if (v === 'bottom') {
        sx = MAP_HEIGHT * Math.random();
        sy = MAP_WIDTH + OUTER_MARGIN * Math.random();
      } else if (v === 'top') {
        sx = MAP_HEIGHT * Math.random();
        sy = -OUTER_MARGIN;
      } else {
        // ліворуч
        sx = -OUTER_MARGIN;
        sy = MAP_WIDTH * Math.random();
      }
      const rt = ctx.getRandomTarget(false);
      if (rt) {
        rockets.push({
          position: [sy, sx],
          angleRad: 0,
          target: [rt.lat, rt.lng],
          speed: 1.2 + 1.6 * Math.random() + 0.01 * currentWave,
          speedOriginal: 1.2 + 1.6 * Math.random() + 0.01 * currentWave,
          hp: 20 + 15 * currentWave,
        });
        createdRockets++;
        try {
          statsLogSpawn('rocket', [sy, sx], [rt.lat, rt.lng], currentWave);
          debugSpawn(ctx.map, [sy, sx], [rt.lat, rt.lng], 'rocket', 1);
        } catch {}
      } else {
        console.warn(`No valid target available for rocket spawn (wave ${currentWave + 1})`);
      }
    }

    console.log(
      `[spawn] Wave ${currentWave + 1} created: light=${createdLight}, heavy=${createdHeavy}, rockets=${createdRockets}`
    );
  }

  return { spawnWave };
}
