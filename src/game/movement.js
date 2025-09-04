import {
  bezierPoint,
  bezierTangent,
  generateControlPoint,
  approximateBezierLength,
} from '../utils.js';
import { drawBeam } from '../beams.js';
import { explosion } from '../effects.js';
import { PIXEL_TO_METERS } from '../constants.js';

/**
 * Тип контексту для руху (скорочено)
 * @typedef {Object} MovementCtx
 * @property {L.Map} map — інстанс карти Leaflet
 * @property {() => boolean} getGameOver
 * @property {() => number} getGameSpeed
 * @property {() => any[]} getDrones
 * @property {() => any[]} getRockets
 * @property {() => any[]} getPvoList
 * @property {() => any[]} getDefensePoints
 * @property {() => any|null} getAirport
 * @property {(a:any)=>void} setAirport
 * @property {() => void} clearAirportProgress
 * @property {(n:number)=>void} addMoney
 * @property {() => void} incScore
 * @property {() => void} updateUI
 * @property {() => void} updatePvoPurchaseAvailability
 * @property {() => void} endGame
 * @property {(allowDefense:boolean)=>{lat:number,lng:number}|null} getRandomTarget
 */

function handleEnemyImpact(ctx, ent, idx) {
  const map = ctx.map;
  const pvoList = ctx.getPvoList();
  // Використовуємо гетери напряму, щоб уникати «застиглих» посилань

  // Влучання в одиницю ППО?
  const hitPvo = pvoList.find(
    (p) => p.latlng.lat === ent.target[0] && p.latlng.lng === ent.target[1]
  );
  if (hitPvo) {
    try {
      map.removeLayer(hitPvo.marker);
      if (hitPvo.rangeCircle) {
        map.removeLayer(hitPvo.rangeCircle);
      }
    } catch {}
    pvoList.splice(pvoList.indexOf(hitPvo), 1);
    ctx.updatePvoPurchaseAvailability();
    explosion(map, hitPvo.latlng, ctx.getGameSpeed());
    // видалити ворога
    (ent.type === 'light' || ent.type === 'heavy' ? ctx.getDrones() : ctx.getRockets()).splice(
      idx,
      1
    );
    return;
  }

  // Влучання в аеропорт?
  const airport = ctx.getAirport();
  if (airport && airport.alive && airport.lat === ent.target[0] && airport.lng === ent.target[1]) {
    airport.alive = false;
    try {
      map.removeLayer(airport.marker);
      if (airport.noBuildCircle) {
        map.removeLayer(airport.noBuildCircle);
        airport.noBuildCircle = null;
      }
    } catch {}
    ctx.setAirport(null);
    ctx.clearAirportProgress();
    (ent.type === 'light' || ent.type === 'heavy' ? ctx.getDrones() : ctx.getRockets()).splice(
      idx,
      1
    );
    ctx.updatePvoPurchaseAvailability();
    return;
  }

  // Влучання в оборонну точку?
  const hitDef = ctx
    .getDefensePoints()
    .find((d) => d.lat === ent.target[0] && d.lng === ent.target[1]);
  if (hitDef && hitDef.alive) {
    hitDef.alive = false;
    hitDef.marker.setIcon(L.divIcon({ html: '💥', className: '' }));
    if (hitDef.noBuildCircle) {
      try {
        map.removeLayer(hitDef.noBuildCircle);
      } catch {}
      hitDef.noBuildCircle = null;
    }
  }
  (ent.type === 'light' || ent.type === 'heavy' ? ctx.getDrones() : ctx.getRockets()).splice(
    idx,
    1
  );
  if (ctx.getDefensePoints().filter((d) => d.alive).length === 0) {
    ctx.endGame();
  }
}

// Токен для інвалідації старих RAF‑циклів між рестартами
let __movementToken = Symbol('movement');

// Єдиний часовий кадр для всіх підсистем руху
let __lastTs = 0;

function updateDrones(ctx, now, dtFactor) {
  const map = ctx.map;
  const drones = ctx.getDrones();
  const pvoList = ctx.getPvoList();
  const getGameSpeed = ctx.getGameSpeed;

  for (let n = drones.length - 1; n >= 0; n--) {
    const a = drones[n];
    if (a.hp <= 0) {
      explosion(map, a.position, getGameSpeed());
      drones.splice(n, 1);
      ctx.addMoney(a.type === 'heavy' ? 300 : 120);
      ctx.incScore();
    } else {
      // If current target is no longer valid (destroyed or removed) — retarget mid-flight
      const pvoListNow = ctx.getPvoList();
      const airportNow = ctx.getAirport();
      const targetAlive =
        (a.target &&
          ctx
            .getDefensePoints()
            .some((d) => d.alive && d.lat === a.target[0] && d.lng === a.target[1])) ||
        (a.target &&
          pvoListNow.some((p) => p.latlng?.lat === a.target[0] && p.latlng?.lng === a.target[1])) ||
        (a.target &&
          airportNow &&
          airportNow.alive &&
          airportNow.lat === a.target[0] &&
          airportNow.lng === a.target[1]);
      if (!targetAlive) {
        const rt = ctx.getRandomTarget(true);
        if (rt) {
          const start = [a.position[0], a.position[1]];
          const end = [rt.lat, rt.lng];
          const ctrl = generateControlPoint(start, end);
          const len = approximateBezierLength(start, ctrl, end);
          if (isFinite(len) && len >= 5) {
            a.start = start;
            a.control = ctrl;
            a.target = end;
            a.totalLength = len;
            a.t = 0;
          }
        }
      }
      // Ефект РЕБ
      let slowFactor = 1;
      pvoList.forEach((t) => {
        if (t.reb) {
          const dx = a.position[1] - t.latlng.lng;
          const dy = a.position[0] - t.latlng.lat;
          const dist2 = dx * dx + dy * dy;
          const thr2 = (t.radius / PIXEL_TO_METERS) * (t.radius / PIXEL_TO_METERS);
          // Сповільнення при знаходженні в радіусі РЕБ
          if (dist2 < thr2) {
            const sf = typeof t.slowFactor === 'number' ? t.slowFactor : 0.6;
            slowFactor = Math.min(slowFactor, sf);
            // Перевірка «зриву» не частіше 1/с (з урахуванням швидкості гри)
            if (!a.lastRebCheck || now - a.lastRebCheck >= 1000 / getGameSpeed()) {
              if (Math.random() < 0.03) {
                explosion(map, a.position, getGameSpeed());
                drones.splice(n, 1);
                ctx.addMoney(a.type === 'heavy' ? 300 : 120);
                ctx.incScore();
              } else {
                a.lastRebCheck = now;
              }
            }
          }
        }
      });
      a.speed = slowFactor < 1 ? slowFactor * a.speedOriginal : a.speedOriginal;

      // Швидкість тепер залежить від часу кадру, щоб на різних FPS рух був сталим
      const step = (a.speed * getGameSpeed() * dtFactor) / a.totalLength;
      a.t = Math.min(a.t + step, 1);
      a.position = bezierPoint(a.start, a.control, a.target, a.t);
      if (isNaN(a.position[0]) || isNaN(a.position[1])) {
        drones.splice(n, 1);
      } else {
        // Перевірка влучання: досягли цілі (кінець кривої або дуже близько) — застосувати шкоду
        const dxEnd = a.target[0] - a.position[0];
        const dyEnd = a.target[1] - a.position[1];
        const distEnd = Math.sqrt(dxEnd * dxEnd + dyEnd * dyEnd);
        if (a.t >= 0.999 || distEnd < 10) {
          handleEnemyImpact(ctx, a, n);
          continue; // сутність видалена — переходимо до наступного елемента (у зворотному порядку)
        }
        const tan = bezierTangent(a.start, a.control, a.target, a.t);
        a.angleRad = Math.atan2(tan[1], tan[0]);
        pvoList.forEach((t) => {
          const dx = a.position[1] - t.latlng.lng;
          const dy = a.position[0] - t.latlng.lat;
          const dist2m = (dx * dx + dy * dy) * (PIXEL_TO_METERS * PIXEL_TO_METERS);
          const thr2m = t.radius * t.radius;
          if (
            dist2m < thr2m &&
            now - t.lastShot >= t.cd / 2 / getGameSpeed() &&
            !t.reb &&
            t.canTarget?.drones
          ) {
            a.hp -= t.damage;
            t.lastShot = now;
            drawBeam(map, t.latlng, a.position, 'red', 200 / getGameSpeed());
          }
        });
      }
    }
  }
}

function updateRockets(ctx, now, dtFactor) {
  const map = ctx.map;
  const rockets = ctx.getRockets();
  const pvoList = ctx.getPvoList();
  const getGameSpeed = ctx.getGameSpeed;

  for (let n = rockets.length - 1; n >= 0; n--) {
    const a = rockets[n];
    if (a.hp <= 0) {
      explosion(map, a.position, getGameSpeed());
      rockets.splice(n, 1);
      ctx.addMoney(450);
      ctx.incScore();
    } else {
      const targetAlive =
        (a.target &&
          ctx
            .getDefensePoints()
            .some((d) => d.alive && d.lat === a.target[0] && d.lng === a.target[1])) ||
        (a.target &&
          pvoList.some((p) => p.latlng.lat === a.target[0] && p.latlng.lng === a.target[1])) ||
        (a.target &&
          ctx.getAirport() &&
          ctx.getAirport().alive &&
          ctx.getAirport().lat === a.target[0] &&
          ctx.getAirport().lng === a.target[1]);
      if (!a.target || isNaN(a.target[0]) || isNaN(a.target[1]) || !targetAlive) {
        const rt = ctx.getRandomTarget(false);
        if (!rt) {
          rockets.splice(n, 1);
          continue;
        }
        a.target = [rt.lat, rt.lng];
      }
      const dx = a.target[0] - a.position[0];
      const dy = a.target[1] - a.position[1];
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 10) {
        handleEnemyImpact(ctx, a, n);
        continue;
      } else {
        const ux = dx / len;
        const uy = dy / len;
        if (isNaN(ux) || isNaN(uy)) {
          rockets.splice(n, 1);
        } else {
          let slowFactor = 1;
          pvoList.forEach((e) => {
            if (e.reb) {
              const dx = a.position[1] - e.latlng.lng;
              const dy = a.position[0] - e.latlng.lat;
              const dist2 = dx * dx + dy * dy;
              const thr2 = (e.radius / PIXEL_TO_METERS) * (e.radius / PIXEL_TO_METERS);
              if (dist2 < thr2) {
                const sf = typeof e.slowFactor === 'number' ? e.slowFactor : 0.6;
                slowFactor = Math.min(slowFactor, sf);
                if (!a.lastRebCheck || now - a.lastRebCheck >= 1000 / getGameSpeed()) {
                  if (Math.random() < 0.1) {
                    explosion(map, a.position, getGameSpeed());
                    rockets.splice(n, 1);
                    ctx.addMoney(450);
                    ctx.incScore();
                  } else {
                    a.lastRebCheck = now;
                  }
                }
              }
            }
          });
          a.speed = slowFactor < 1 ? slowFactor * a.speedOriginal : a.speedOriginal;
          a.position[0] += ux * a.speed * getGameSpeed() * dtFactor;
          a.position[1] += uy * a.speed * getGameSpeed() * dtFactor;
          a.angleRad = Math.atan2(uy, ux);
          if (isNaN(a.position[0]) || isNaN(a.position[1])) {
            rockets.splice(n, 1);
          } else {
            pvoList.forEach((t) => {
              const dx = a.position[1] - t.latlng.lng;
              const dy = a.position[0] - t.latlng.lat;
              const dist2m = (dx * dx + dy * dy) * (PIXEL_TO_METERS * PIXEL_TO_METERS);
              const thr2m = t.radius * t.radius;
              if (
                dist2m < thr2m &&
                now - t.lastShot >= t.cd / 2 / getGameSpeed() &&
                !t.reb &&
                t.canTarget?.rockets
              ) {
                a.hp -= t.damage;
                t.lastShot = now;
                drawBeam(map, t.latlng, a.position, 'yellow', 200 / getGameSpeed());
              }
            });
          }
        }
      }
    }
  }
}

function updateMobilePVO(ctx) {
  const pvoList = ctx.getPvoList();
  const getGameSpeed = ctx.getGameSpeed;
  pvoList.forEach((e) => {
    if (e.mobile && e.center) {
      if (e.isMovingToTarget && e.targetPosition) {
        let dy = e.targetPosition.lat - e.latlng.lat;
        let dx = e.targetPosition.lng - e.latlng.lng;
        const dist2 = dy * dy + dx * dx;
        if (dist2 < 4) {
          e.latlng = e.targetPosition;
          e.isMovingToTarget = false;
          e.targetPosition = null;
          e.patrolAngle = 0;
          e.marker.setLatLng(e.latlng);
          if (e.rangeCircle) {
            e.rangeCircle.setLatLng(e.latlng);
          }
        } else {
          const dist = Math.sqrt(dist2) || 1;
          dy /= dist;
          dx /= dist;
          const sp = 1.4 * e.speed * getGameSpeed();
          e.latlng = L.latLng(e.latlng.lat + dy * sp, e.latlng.lng + dx * sp);
          e.marker.setLatLng(e.latlng);
          if (e.rangeCircle) {
            e.rangeCircle.setLatLng(e.latlng);
          }
          const deg = Math.atan2(dx, dy) * (180 / Math.PI) + 90;
          const img = e.imgEl || (e.imgEl = e.marker.getElement()?.querySelector('img'));
          if (img) {
            img.style.transform = `rotate(${deg}deg)`;
          }
        }
      } else {
        e.patrolAngle += 0.01 * e.speed * getGameSpeed();
        const rad = Math.min(0.5 * e.radius, 80);
        const ang = e.patrolAngle;
        const y = e.center.lat + Math.sin(ang) * rad;
        const x = e.center.lng + Math.cos(ang) * rad;
        e.latlng = L.latLng(y, x);
        e.marker.setLatLng(e.latlng);
        if (e.rangeCircle) {
          e.rangeCircle.setLatLng(e.latlng);
        }
        const deg = ang * (-180 / Math.PI) + 90;
        const img = e.imgEl || (e.imgEl = e.marker.getElement()?.querySelector('img'));
        if (img) {
          img.style.transform = `rotate(${deg}deg)`;
        }
      }
    }
  });
}

function tickLoop(ctx, token, now = 0) {
  if (token !== __movementToken || ctx.getGameOver()) {
    return;
  }
  const dt = __lastTs ? Math.max(0, now - __lastTs) : 16;
  __lastTs = now;
  const dtFactor = dt / 16; // нормалізація під 60 FPS
  updateDrones(ctx, now, dtFactor);
  updateRockets(ctx, now, dtFactor);
  updateMobilePVO(ctx);
  requestAnimationFrame((t) => tickLoop(ctx, token, t));
}

export function startMovementLoops(ctx) {
  // Invalidate any previously running loops from past sessions
  __movementToken = Symbol('movement');
  __lastTs = 0;
  const token = __movementToken;
  requestAnimationFrame((t) => tickLoop(ctx, token, t));
}
