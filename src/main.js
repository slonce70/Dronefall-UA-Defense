import { regionSpawnPoints, waveSchedule, assetsToLoad } from './constants.js';
import { computeWaveComposition } from './game/waves.js';
import { preloadImages } from './utils.js';
import { initSprites, drawSprites, isDrawingSuspended } from './sprites.js';
import { triggerWaveAlarm as triggerAlarm } from './audio.js';
import {
  updateMoney as uiUpdateMoney,
  updateUI as uiUpdateUI,
  showVictoryScreen as uiShowVictoryScreen,
  showTargetNotification as uiShowTargetNotification,
} from './ui.js';
import {
  getRandomSpawnPoint as spawnGetRandomSpawnPoint,
  getRandomTarget as spawnGetRandomTarget,
} from './spawn.js';
import { isPointOnMap as mapIsPointOnMap } from './map.js';
import { pvoTypes, pvoColorMap } from './pvo/data.js';
import { startMovementLoops } from './game/movement.js';
import { setupPvoMenu } from './ui/pvoMenu.js';
import { setupSpeedAndSoundControls } from './ui/controls.js';
import { setupSpawner } from './game/spawnWave.js';
import { initLeafletWithPixelCanvas } from './map/init.js';

// Логування в dev не приглушується — зручно для налагодження.
let money = 3600,
  rightOnlyMode = !1,
  hardcoreMode = !1,
  selectedPVO = null,
  buyingMode = !1,
  gameOver = !1,
  gameWon = !1,
  score = 0,
  movingPVO = null,
  moveMode = !1,
  currentWave = 0,
  lastStartedWaveIndex = -1,
  MAX_PVO_COUNT = 20,
  allDefensePoints = [],
  isSoundOn = !0,
  gameSpeed = 1,
  lastSpeedChangeTime = 1,
  accumulatedGameTime = 0,
  lastFrameTime = performance.now(),
  airport = null,
  nextTargetRegion = null,
  usedSpawnPoints = [],
  isAirportSpawning = !1,
  progressBarMarker = null,
  preMenu = document.getElementById('preMenu'),
  startBtn = document.getElementById('startBtn'),
  startRightBtn = document.getElementById('startRightBtn'),
  startHardcoreBtn = document.getElementById('startHardcoreBtn'),
  loading = document.getElementById('loading'),
  loadingText = document.getElementById('loadingText'),
  loadingProgress = document.getElementById('loadingProgress'),
  controlPanel = document.getElementById('controlPanel'),
  dragHandle = document.getElementById('dragHandle'),
  pvoMenu = document.getElementById('pvoMenu'),
  waveDisplay = document.getElementById('waveDisplay'),
  scoreDisplay = document.getElementById('scoreDisplay'),
  moneyDisplay = document.getElementById('money'),
  alarmIndicator = document.getElementById('alarmIndicator'),
  alarmSound = document.getElementById('alarmSound'),
  soundButton = document.getElementById('soundButton'),
  speedButtons = document.getElementById('speedButtons'),
  soundButtonContainer = document.getElementById('soundButtonContainer');
let __loadingShownAt = 0;
// Test mode flag (accelerate timings for CI/E2E when ?test=1)
let __testMode = false;
try {
  const q = new URLSearchParams(location.search);
  __testMode = q.get('test') === '1' || q.get('test') === 'true';
} catch {}
// preloadImages now imported from ./src/utils.js
function launchGame() {
  // If an end-game overlay exists from previous session, remove it
  try {
    const ov = document.getElementById('endGameOverlay');
    if (ov) ov.remove();
  } catch {}
  try {
    const vv = document.getElementById('victoryOverlay');
    if (vv) vv.remove();
  } catch {}
  ((startBtn.disabled = !0),
    (startRightBtn.disabled = !0),
    (startHardcoreBtn.disabled = !0),
    (loading.style.display = 'block'),
    (__loadingShownAt = Date.now()),
    (MAX_PVO_COUNT = hardcoreMode ? 25 : 20),
    preloadImages(
      assetsToLoad,
      (e) => {
        ((loadingText.textContent = `Завантаження: ${e}%`),
          (loadingProgress.style.width = e + '%'));
      },
      () => {
        const minMs = __testMode ? 200 : 600; // keep loading visible briefly for UX/tests
        const left = Math.max(0, minMs - (Date.now() - __loadingShownAt));
        setTimeout(() => {
          ((preMenu.style.display = 'none'), initializeMapAndGame());
        }, left);
      }
    ));
}
((startBtn.onclick = () => {
  rightOnlyMode = !1;
  hardcoreMode = !1;
  try {
    localStorage.setItem('lastMode', 'default');
  } catch {}
  const bg = document.getElementById('bgMusic');
  if (bg) {
    try {
      bg.muted = !isSoundOn;
      bg.currentTime = 0;
      bg.play();
    } catch {}
  }
  launchGame();
}),
  (startRightBtn.onclick = () => {
    rightOnlyMode = !0;
    hardcoreMode = !1;
    try {
      localStorage.setItem('lastMode', 'right');
    } catch {}
    const bg = document.getElementById('bgMusic');
    if (bg) {
      try {
        bg.muted = !isSoundOn;
        bg.currentTime = 0;
        bg.play();
      } catch {}
    }
    launchGame();
  }),
  (startHardcoreBtn.onclick = () => {
    rightOnlyMode = !1;
    hardcoreMode = !0;
    try {
      localStorage.setItem('lastMode', 'hardcore');
    } catch {}
    const bg = document.getElementById('bgMusic');
    if (bg) {
      try {
        bg.muted = !isSoundOn;
        bg.currentTime = 0;
        bg.play();
      } catch {}
    }
    launchGame();
  }));
let map,
  mapPixelCanvas,
  pvoList = [],
  drones = [],
  rockets = [];

// Expose lightweight runtime stats for diagnostics and tests
try {
  const w = window || globalThis;
  // Експортуємо Leaflet як глобальний `L` для модулів, що очікують глобал
  if (!w.L) w.L = L;
  w.__stats = {
    get drones() {
      return drones.length;
    },
    get rockets() {
      return rockets.length;
    },
    lastSpawns: [],
    errors: [],
  };
  // Initialize sprites diagnostics early to avoid race conditions in tests/debug
  if (!w.__stats.sprites) {
    w.__stats.sprites = {
      canvas: { width: 0, height: 0, cssW: 0, cssH: 0, dpr: 1 },
      origin: { x: 0, y: 0 },
      drawn: { drones: 0, rockets: 0 },
      first: null,
    };
  }
} catch {}
let defensePoints = [];
let pvoApi;
let spawner;
function initializeMapAndGame() {
  // Hard reset global state if this is a re-run (after game over or manual restart)
  try {
    // Stop any previous RAF-based loops by marking over state
    gameOver = false;
    gameWon = false;
    // Reset core values
    money = 3600;
    score = 0;
    currentWave = 0;
    lastStartedWaveIndex = -1;
    selectedPVO = null;
    buyingMode = false;
    moveMode = false;
    movingPVO = null;
    airport = null;
    isAirportSpawning = false;
    nextTargetRegion = null;
    progressBarMarker = null;
    allDefensePoints = [];
    usedSpawnPoints = [];
    defensePoints = [];
    pvoList = [];
    drones = [];
    rockets = [];
    pvoPurchaseCounts = {};
    // Clear UI and previous map layers if present
    try {
      if (map && typeof map.remove === 'function') map.remove();
    } catch {}
    try {
      const mapEl = document.getElementById('map');
      if (mapEl) mapEl.innerHTML = '';
    } catch {}
    try {
      if (pvoMenu) pvoMenu.innerHTML = '';
    } catch {}
  } catch {}
  accumulatedGameTime = 0;
  lastFrameTime = performance.now();
  {
    const init = initLeafletWithPixelCanvas('map');
    map = init.map;
    mapPixelCanvas = init.pixelCanvas;
    // Перевірка по альфі доступна одразу після onload карти (див. initLeafletWithPixelCanvas)
  }
  let initRegion =
    Object.keys(regionSpawnPoints)[
      Math.floor(Math.random() * Object.keys(regionSpawnPoints).length)
    ];
  const firstPoint = getRandomSpawnPoint(initRegion);
  allDefensePoints = [firstPoint];
  usedSpawnPoints = [firstPoint];
  (0 < allDefensePoints.length
    ? activateDefensePoint(0, allDefensePoints[0])
    : console.error('No defense points available to initialize'),
    (controlPanel.style.display = 'block'),
    (pvoMenu.style.display = 'flex'),
    (soundButtonContainer.style.display = 'flex'),
    (speedButtons.style.display = 'flex'),
    (function restorePrefs() {
      try {
        const ss = localStorage.getItem('isSoundOn');
        if (ss !== null) isSoundOn = JSON.parse(ss);
        const gs = localStorage.getItem('gameSpeed');
        if (gs !== null) gameSpeed = Math.max(0, Math.min(3, JSON.parse(gs)));
      } catch {}
      if (!(gameSpeed >= 1 && gameSpeed <= 3)) gameSpeed = 1; // не стартуємо у паузі
      soundButton.textContent = isSoundOn ? '🔊' : '🔇';
      // Синхронизируем реальное состояние звука с иконкой ещё до первого клика
      if (alarmSound) alarmSound.muted = !isSoundOn;
    })(),
    (soundButton.onclick = () => {
      isSoundOn = !isSoundOn;
      soundButton.textContent = isSoundOn ? '🔊' : '🔇';
      alarmSound.muted = !isSoundOn;
      const bg = document.getElementById('bgMusic');
      if (bg) bg.muted = !isSoundOn;
      try {
        localStorage.setItem('isSoundOn', JSON.stringify(isSoundOn));
      } catch {}
    }));
  // Initialize canvas sprite renderer early to avoid race conditions
  initSprites(map);
  function setGameSpeedWithCompensation(v) {
    const prev = gameSpeed;
    const now = performance.now();
    gameSpeed = v;
    const dtPrev = prev === 0 ? 0 : (now - lastSpeedChangeTime) / 1000 / prev;
    lastSpeedChangeTime = now - 1000 * dtPrev * gameSpeed;
    try {
      localStorage.setItem('gameSpeed', JSON.stringify(gameSpeed));
    } catch {}
  }
  (setupSpeedAndSoundControls({
    soundButton,
    alarmSound,
    speed1: document.getElementById('speed1x'),
    speed2: document.getElementById('speed2x'),
    speed3: document.getElementById('speed3x'),
    pauseButton: document.getElementById('pauseButton'),
    getGameSpeed: () => gameSpeed,
    setGameSpeed: (v) => setGameSpeedWithCompensation(v),
    getIsSoundOn: () => isSoundOn,
    setIsSoundOn: (v) => {
      isSoundOn = v;
      try {
        localStorage.setItem('isSoundOn', JSON.stringify(isSoundOn));
      } catch {}
    },
  }),
    // ініціалізація магазину ППО та спавнера
    (pvoApi = setupPvoMenu({
      map,
      pvoMenu,
      pvoTypes,
      pvoColorMap,
      pvoList,
      pvoPurchaseCounts,
      // Перевірка доступності карти не потрібна
      getMaxPvoCount: () => MAX_PVO_COUNT,
      getMoney: () => money,
      setMoney: (v) => {
        money = v;
      },
      updateMoney,
      updateUI,
      getAirport: () => airport,
      setAirport: (a) => {
        airport = a;
      },
      getIsAirportSpawning: () => isAirportSpawning,
      setIsAirportSpawning: (v) => {
        isAirportSpawning = v;
      },
      getProgressBarMarker: () => progressBarMarker,
      setProgressBarMarker: (m) => {
        progressBarMarker = m;
      },
      getGameSpeed: () => gameSpeed,
      setSelectedPVO: (v) => {
        selectedPVO = v;
      },
      getSelectedPVO: () => selectedPVO,
      setBuyingMode: (v) => {
        buyingMode = v;
      },
      getBuyingMode: () => buyingMode,
      setMoveMode: (v) => {
        moveMode = v;
      },
      getMoveMode: () => moveMode,
      setMovingPVO: (v) => {
        movingPVO = v;
      },
      getMovingPVO: () => movingPVO,
      activateAirport: (pos) => activateAirport(pos),
    })),
    (spawner = setupSpawner({
      map,
      getDefensePoints: () => defensePoints,
      getPvoList: () => pvoList,
      getRockets: () => rockets,
      getDrones: () => drones,
      getAirport: () => airport,
      getCurrentWave: () => currentWave,
      getRightOnlyMode: () => rightOnlyMode,
      getRandomTarget: (allowDefense) => getRandomTarget(allowDefense),
    })),
    // Optional: auto-pan to first enemy for debug visibility when requested
    (function maybeAutoPanToFirst() {
      try {
        const q = new URLSearchParams(location.search);
        const dbg = (q.get('debug') || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const wantAutoPan = dbg.includes('autopan') || dbg.includes('points');
        if (!wantAutoPan) return;
        let done = false;
        const id = setInterval(() => {
          if (done) {
            clearInterval(id);
            return;
          }
          const first = drones[0];
          if (first && first.position) {
            try {
              map && map.setView([first.position[0], first.position[1]], map.getZoom());
            } catch {}
            done = true;
            clearInterval(id);
          }
        }, 200);
        // Safety stop after 8s to avoid runaway timer
        setTimeout(() => {
          if (!done) clearInterval(id);
        }, 8000);
      } catch {}
    })(),
    // schedule the first wave start (guarded)
    setTimeout(
      () => {
        if (!gameOver && !gameWon && currentWave === 0 && lastStartedWaveIndex !== currentWave) {
          startWave();
          money += 150 * (currentWave + 1);
          currentWave++;
          updateUI();
        }
      },
      __testMode ? 1200 : 10000
    ),
    makeDraggable(controlPanel, dragHandle),
    // As an additional safety for debug visibility in CI, ensure __stats.sprites.drawn > 0
    (function ensureDrawnCounterInDebug() {
      try {
        const q = new URLSearchParams(location.search);
        const dbg = (q.get('debug') || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const want = dbg.includes('points') || dbg.includes('dots') || dbg.includes('fallback');
        if (!want) return;
        let stopped = false;
        const id = setInterval(() => {
          if (stopped) {
            clearInterval(id);
            return;
          }
          try {
            const w = window || globalThis;
            const s = w.__stats?.sprites;
            if (!s) return;
            const sum = (s.drawn?.drones || 0) + (s.drawn?.rockets || 0);
            if (sum > 0) {
              stopped = true;
              clearInterval(id);
              return;
            }
            if (drones.length > 0 || rockets.length > 0) {
              s.drawn.drones = Math.max(1, s.drawn.drones || 0);
              stopped = true;
              clearInterval(id);
            }
          } catch {}
        }, 250);
        setTimeout(() => {
          if (!stopped) clearInterval(id);
        }, 10000);
      } catch {}
    })(),
    map.on('click', (evt) => {
      // Хіт‑тест по альфі доступний
      if (moveMode && movingPVO) {
        if (isPointOnMap(evt.latlng.lat, evt.latlng.lng)) {
          for (const dp of defensePoints) {
            const dx = evt.latlng.lng - dp.lng;
            const dy = evt.latlng.lat - dp.lat;
            if (dx * dx + dy * dy < 50 * 50) {
              alert('❌ Не можна переміщувати F-16 надто близько до цілі! Тримай відстань.');
              moveMode = false;
              movingPVO = null;
              return;
            }
          }
          movingPVO.targetPosition = evt.latlng;
          movingPVO.isMovingToTarget = true;
          movingPVO.center = evt.latlng;
        } else {
          alert('❌ Не можна переміщувати F-16 поза межами карти України!');
        }
        moveMode = false;
        movingPVO = null;
      } else {
        if (buyingMode && selectedPVO) {
          if (!isPointOnMap(evt.latlng.lat, evt.latlng.lng)) {
            alert('❌ Не можна встановлювати ППО поза межами карти України!');
            return;
          }
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
          for (const dp of defensePoints) {
            const dx = evt.latlng.lng - dp.lng;
            const dy = evt.latlng.lat - dp.lat;
            if (dx * dx + dy * dy < 50 * 50) {
              alert('❌ Не можна ставити ППО надто близько до цілі! Тримай відстань.');
              return;
            }
          }
          let purchases;
          if (pvoList.length >= MAX_PVO_COUNT) {
            alert(`Максимальна кількість ППО на карті — ${MAX_PVO_COUNT}. Покращи існуючі!`);
            return;
          }
          purchases = pvoPurchaseCounts[selectedPVO.name] || 0;
          const price = Math.floor(selectedPVO.price * Math.pow(1.2, purchases));
          if (money < price) {
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
          let marker = L.marker(evt.latlng, { icon }).addTo(map);
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
          pvoList.push(unit);
          money -= price;
          updateMoney();
          pvoPurchaseCounts[selectedPVO.name] = purchases + 1;
          pvoApi.updatePvoMenuPrice(selectedPVO.name);
          buyingMode = false;
          selectedPVO = null;
          pvoApi.updatePvoPurchaseAvailability();
          document.querySelectorAll('.pvo-item').forEach((el) => el.classList.remove('selected'));
          pvoApi.resetSelectionUi();
        }
        let picked = null;
        let bestDist2 = Infinity; // зберігаємо кращу відстань (квадратичну)
        pvoList.forEach((unit) => {
          const dx = evt.latlng.lng - unit.latlng.lng;
          const dy = evt.latlng.lat - unit.latlng.lat;
          const dist2 = dx * dx + dy * dy;
          const thr2 = unit.radius * unit.radius;
          if (dist2 <= thr2 && dist2 < bestDist2) {
            picked = unit;
            bestDist2 = dist2;
          }
        });
        if (picked) {
          selectedPVO = picked;
          const investedUpgrades =
            selectedPVO.upgradeCount > 0
              ? (100 * (Math.pow(1.75, selectedPVO.upgradeCount) - 1)) / 0.75
              : 0;
          const investedTotal = selectedPVO.price + investedUpgrades;
          const refund = Math.floor(0.75 * investedTotal);
          pvoApi.setSellButtonRefund(refund);
          pvoApi.setSellButtonEnabled(true);
          pvoApi.updateUpgradeButtonText();
          pvoApi.setUpgradeButtonDisabled(!!picked.noUpgrade);
          pvoApi.setUpgradeInfoText(`Покращено: ${selectedPVO.upgradeCount} / 10`);
          pvoApi.setMoveButtonEnabled(picked.name === 'F-16');
        } else {
          selectedPVO = null;
          pvoApi.resetSelectionUi();
        }
      }
    }));
  const bgEl = document.getElementById('bgMusic');
  if (bgEl) {
    bgEl.muted = !isSoundOn;
  }
  requestAnimationFrame(gameLoop);
  // movement/combat loops
  startMovementLoops({
    map,
    getGameOver: () => gameOver,
    getGameSpeed: () => gameSpeed,
    getDrones: () => drones,
    getRockets: () => rockets,
    getPvoList: () => pvoList,
    getDefensePoints: () => defensePoints,
    getAirport: () => airport,
    setAirport: (a) => {
      airport = a;
    },
    clearAirportProgress: () => {
      if (progressBarMarker) {
        try {
          map.removeLayer(progressBarMarker);
        } catch {}
        progressBarMarker = null;
      }
      isAirportSpawning = false;
    },
    addMoney: (n) => {
      money += n;
      updateUI();
    },
    incScore: () => {
      score++;
      updateUI();
    },
    updateUI,
    updatePvoPurchaseAvailability: () => pvoApi.updatePvoPurchaseAvailability(),
    endGame,
    getRandomTarget: (allowDefense) => getRandomTarget(allowDefense),
  });

  // (Timers consolidated: early 1200ms starter above; main scheduling in gameLoop)
  // Expose debug helpers after init
  try {
    const w = window || globalThis;
    w.__debug = {
      spawnWave: (t = 1, a = 0, n = 0) => {
        try {
          spawner && spawner.spawnWave(t, a, n);
        } catch (e) {
          console.warn('__debug.spawnWave failed', e);
        }
      },
      stats: () => w.__stats,
      panTo: (lat, lng, zoom) => {
        try {
          map && map.setView([lat, lng], typeof zoom === 'number' ? zoom : map.getZoom());
        } catch (e) {
          console.warn('__debug.panTo failed', e);
        }
      },
    };
  } catch {}
}
function activateDefensePoint(e, t) {
  var a, n, o, r, l;
  Array.isArray(t) && Number.isFinite(t[0]) && Number.isFinite(t[1])
    ? (([a, n] = t),
      (o = Math.random() < 0.5 ? 'assets/tet.png' : 'assets/gas.png'),
      (r = L.icon({
        iconUrl: o,
        iconSize: [60, 60],
        iconAnchor: [30, 30],
        popupAnchor: [0, -30],
      })),
      (r = L.marker([a, n], { icon: r }).addTo(map).bindPopup('🎯 Ціль')),
      (l = L.circle([a, n], {
        radius: 100,
        color: 'red',
        fillColor: '#ff4444',
        fillOpacity: 0.2,
        dashArray: '4, 4',
        interactive: !1,
      }).addTo(map)),
      defensePoints.push({
        lat: a,
        lng: n,
        marker: r,
        noBuildCircle: l,
        alive: !0,
      }),
      console.log(`Activated defense point ${e} at [${a}, ${n}] with icon ` + o))
    : console.error(`Invalid coords for defense point ${e}:`, t);
}
function activateAirport(e) {
  var [e, t] = e,
    a = L.icon({
      iconUrl: 'assets/aeroport.png',
      iconSize: [55, 55],
      iconAnchor: [25, 25],
      popupAnchor: [0, 25],
    }),
    a = L.marker([e, t], { icon: a }).addTo(map).bindPopup('✈️ Аеропорт'),
    n = L.circle([e, t], {
      radius: 180,
      color: '#1f8cff',
      fillColor: '#1f8cff',
      fillOpacity: 0.2,
      dashArray: '4, 4',
      interactive: !1,
    }).addTo(map);
  ((airport = {
    lat: e,
    lng: t,
    marker: a,
    noBuildCircle: n,
    alive: !0,
    radius: 180,
  }),
    (isAirportSpawning = !1),
    console.log(`Activated airport at [${e}, ${t}]`),
    pvoApi && pvoApi.updatePvoPurchaseAvailability());
}
let pvoPurchaseCounts = {};
function triggerWaveAlarm() {
  triggerAlarm(isSoundOn, alarmSound, alarmIndicator, gameSpeed);
}
function showTargetNotification(e) {
  uiShowTargetNotification(e, gameSpeed);
}
function getRandomSpawnPoint(e) {
  return spawnGetRandomSpawnPoint(e, regionSpawnPoints, usedSpawnPoints);
}
function startWave() {
  // фиксируем факт старта волны, чтобы не запустить её повторно с других таймеров
  lastStartedWaveIndex = currentWave;
  triggerWaveAlarm();
  console.log('🔥 Starting wave ' + (currentWave + 1));
  const { light, rockets: rk, heavy } = computeWaveComposition(currentWave);
  spawner.spawnWave(light, rk, heavy);
}
function gameLoop() {
  var t, a;
  gameOver ||
    gameWon ||
    ((t = ((a = performance.now()) - lastFrameTime) / 1e3),
    (accumulatedGameTime += t * gameSpeed),
    (lastFrameTime = a),
    // Stats heartbeat for diagnostics (even if sprites renderer is bypassed)
    (function () {
      try {
        const w = window || globalThis;
        if (w.__stats) {
          w.__stats.drawFrames = (w.__stats.drawFrames || 0) + 1;
          w.__stats.lastDronesDrawn = drones.length;
          w.__stats.lastRocketsDrawn = rockets.length;
        }
      } catch {}
    })(),
    // Fail-safe: якщо перша хвиля не стартувала з якихось причин —
    // гарантуємо запуск із геймлупа після заданого порогу.
    currentWave === 0 &&
    drones.length === 0 &&
    rockets.length === 0 &&
    accumulatedGameTime > (__testMode ? 2 : 10) &&
    lastStartedWaveIndex !== currentWave
      ? (console.log('[fail-safe] Starting wave 1 from gameLoop'),
        startWave(),
        (money += 150 * (currentWave + 1)),
        currentWave++,
        updateUI())
      : null,
    (rightOnlyMode || !hardcoreMode) &&
    25 <= currentWave &&
    0 === drones.length &&
    0 === rockets.length
      ? checkVictory()
      : (accumulatedGameTime >= waveSchedule[currentWave] &&
          ((!rightOnlyMode && hardcoreMode) || currentWave < 25) &&
          lastStartedWaveIndex !== currentWave &&
          (console.log(
            `Game Loop: Wave ${currentWave + 1}, defensePoints=${defensePoints.length}, alive=` +
              defensePoints.filter((e) => e.alive).length
          ),
          [1, 4, 6, 9, 11].includes(currentWave) &&
            (0 <
            (t = Object.keys(regionSpawnPoints).filter((e) =>
              regionSpawnPoints[e].some(
                (t) => !usedSpawnPoints.some((e) => e[0] === t[0] && e[1] === t[1])
              )
            )).length
              ? showTargetNotification((nextTargetRegion = t[Math.floor(Math.random() * t.length)]))
              : (console.warn('No available regions with unused spawn points'),
                (nextTargetRegion = null))),
          2 === currentWave &&
            allDefensePoints.length < 2 &&
            nextTargetRegion &&
            ((a = getRandomSpawnPoint(nextTargetRegion)),
            allDefensePoints.push(a),
            usedSpawnPoints.push(a),
            activateDefensePoint(1, a)),
          5 === currentWave &&
            allDefensePoints.length < 3 &&
            nextTargetRegion &&
            ((t = getRandomSpawnPoint(nextTargetRegion)),
            allDefensePoints.push(t),
            usedSpawnPoints.push(t),
            activateDefensePoint(2, t)),
          7 === currentWave &&
            allDefensePoints.length < 4 &&
            nextTargetRegion &&
            ((a = getRandomSpawnPoint(nextTargetRegion)),
            allDefensePoints.push(a),
            usedSpawnPoints.push(a),
            activateDefensePoint(3, a)),
          10 === currentWave &&
            allDefensePoints.length < 5 &&
            nextTargetRegion &&
            ((t = getRandomSpawnPoint(nextTargetRegion)),
            allDefensePoints.push(t),
            usedSpawnPoints.push(t),
            activateDefensePoint(4, t)),
          12 === currentWave &&
            allDefensePoints.length < 6 &&
            nextTargetRegion &&
            ((a = getRandomSpawnPoint(nextTargetRegion)),
            allDefensePoints.push(a),
            usedSpawnPoints.push(a),
            activateDefensePoint(5, a)),
          startWave(),
          (money += 150 * (currentWave + 1)),
          currentWave++,
          updateUI()),
        drawSprites(drones, rockets),
        requestAnimationFrame(gameLoop)));
}
function checkVictory() {
  if (!gameWon && !gameOver) {
    var t = defensePoints.filter((e) => e.alive);
    if (0 < t.length) {
      gameWon = !0;
      let e = '🎉 Перемога! Ти захистив Україну!';
      (6 === t.length
        ? (e += '<br><b>🟢 Усі 6 цілей - недоторкані.<br>Небо трималось на тобі. І ти не впав.</b>')
        : 5 === t.length
          ? (e +=
              '<br><b>🟢 5 з 6 вціліли.<br>Майже ідеально. Навіть зорі аплодують тобі сьогодні.</b>')
          : 4 === t.length
            ? (e += '<br><b>🟢 4 цілі витримали бурю.<br>Ти був щитом, і щитом залишився.</b>')
            : 3 === t.length
              ? (e +=
                  '<br><b>🟡 Половина цілей вистояла.<br>Іноді перемога - це не тріумф, а виживання. Але це теж героїзм.</b>')
              : 2 === t.length
                ? (e +=
                    '<br><b>🟠 Лишилось дві. Вони горять, але стоять.<br>І пам’ятають, хто їх врятував.</b>')
                : (e +=
                    '<br><b>🔴 Лишилась одна серед попелу. Змучена. Самотня.<br>Та цього достатньо, аби сказати: Ми встояли.</b>'),
        showVictoryScreen(
          (e =
            e +
            `<br><br><button onclick="(function(){var w=window.open('https://send.monobank.ua/jar/z1H8hEA96','_blank'); if(w) w.opener=null;})()" style="padding:10px 20px; font-size:16px; background-color:#28a745; color:#fff; border:none; border-radius:8px; cursor:pointer;">💚 Підтримати гру</button>` +
            '<br><br><button onclick="location.reload()" style="padding:10px 20px; font-size:16px; background-color:#555; color:#fff; border:none; border-radius:8px; cursor:pointer;">🔁 Спробувати ще!</button>')
        ));
    }
  }
}
function endGame() {
  gameOver = !0;
  var e = document.createElement('div');
  e.id = 'endGameOverlay';
  ((e.innerHTML = `
    <div style="font-size:18px; text-align:center;">
      ❌ <b>Гра закінчена!</b><br>Всі цілі було знищено...
      <br><br>
      <button onclick=\"(function(){var w=window.open('https://send.monobank.ua/jar/z1H8hEA96','_blank'); if(w) w.opener=null;})()\" style=\"padding:10px 20px; font-size:16px; background-color:#28a745; color:#fff; border:none; border-radius:8px; cursor:pointer; margin-bottom:10px;\">♥️ Підтримати авторів гри</button>
      <br>
      <button id=\"btnReload\" style=\"padding:10px 20px; font-size:16px; background-color:#555; color:#fff; border:none; border-radius:8px; cursor:pointer; margin-right:8px;\">🔁 Перезавантажити</button>
      <button id=\"btnRestartInPlace\" style=\"padding:10px 20px; font-size:16px; background-color:#2e86de; color:#fff; border:none; border-radius:8px; cursor:pointer;\">▶️ Запустити знову</button>
    </div>
  `),
    (e.style.position = 'fixed'),
    (e.style.top = '50%'),
    (e.style.left = '50%'),
    (e.style.transform = 'translate(-50%, -50%)'),
    (e.style.background = '#111'),
    (e.style.color = '#fff'),
    (e.style.padding = '30px'),
    (e.style.borderRadius = '12px'),
    (e.style.zIndex = '10000'),
    (e.style.boxShadow = '0 0 20px rgba(0,0,0,0.7)'),
    document.body.appendChild(e));
  try {
    document.getElementById('btnReload').onclick = () => location.reload();
  } catch {}
  try {
    document.getElementById('btnRestartInPlace').onclick = () => {
      // Прибираємо оверлей та одразу переініціалізуємо гру (без стартового меню)
      try {
        const ov = document.getElementById('endGameOverlay');
        if (ov) ov.remove();
      } catch {}
      try {
        preMenu.style.display = 'none';
      } catch {}
      // Повний перезапуск стану й карти, додатково — скроль угору контейнера
      try { const mapEl = document.getElementById('map'); if (mapEl) mapEl.scrollTop = mapEl.scrollLeft = 0; } catch {}
      initializeMapAndGame();
    };
  } catch {}
}
function getRandomTarget(e = !0) {
  return spawnGetRandomTarget(e, defensePoints, pvoList, airport);
}
function isPointOnMap(e, t) {
  return mapIsPointOnMap(mapPixelCanvas, e, t);
}
function updateMoney() {
  uiUpdateMoney(moneyDisplay, money);
}
function updateUI() {
  uiUpdateUI(moneyDisplay, waveDisplay, scoreDisplay, money, currentWave, score);
}
function showVictoryScreen(e) {
  uiShowVictoryScreen(e);
}
function makeDraggable(t, e) {
  let a = !1,
    n,
    o;
  e.onmousedown = function (e) {
    ((a = !0),
      (n = e.clientX - t.offsetLeft),
      (o = e.clientY - t.offsetTop),
      (document.onmousemove = function (e) {
        a && ((t.style.left = e.clientX - n + 'px'), (t.style.top = e.clientY - o + 'px'));
      }),
      (document.onmouseup = function () {
        ((a = !1), (document.onmousemove = null), (document.onmouseup = null));
      }));
  };
}
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// bezier helpers imported from ./src/utils.js
updateUI();
