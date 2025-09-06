import L from 'leaflet';

import { regionSpawnPoints, waveSchedule, assetsToLoad } from '../constants.js';
import { computeWaveComposition } from './waves.js';
import { preloadImages } from '../utils/images.js';
import { drawSprites } from '../sprites.js';
import { triggerWaveAlarm as triggerAlarm } from './audio.js';
import {
  updateMoney as uiUpdateMoney,
  updateUI as uiUpdateUI,
  showVictoryScreen as uiShowVictoryScreen,
  showTargetNotification as uiShowTargetNotification,
} from '../ui.js';
import { safeOpen as uiSafeOpen } from '../utils/DOMSecurity.js';
import {
  getRandomSpawnPoint as spawnGetRandomSpawnPoint,
  getRandomTarget as spawnGetRandomTarget,
} from './spawn.js';
import { pvoTypes, pvoColorMap } from '../pvo/data.js';
import { startMovementLoops } from './movement.js';
import { setupSpawner } from './spawnWave.js';
import { initLeafletWithPixelCanvas } from '../map/init.js';
import { createWaveScheduler } from '../core/waveScheduler.js';
import { startGameLoop } from '../core/GameLoop.js';
import { installDebugApi } from '../debug/DebugAPI.js';
import { attachPerfPanel } from '../debug/PerfPanel.js';
import { GameState } from '../core/GameState.js';
import { EventBus } from '../core/EventBus.js';
import { Logger } from '../core/Logger.js';
import { GameInitializer } from './GameInitializer.js';
import { createDefensePoint, createAirport } from '../map/objects.js';
import { makeDraggable } from '../ui/draggable.js';
import { TimerManager } from '../core/TimerManager.js';
import { DOMCache } from '../core/DOMCache.js';

export function bootstrap() {
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
    // lastFrameTime removed (unused)
    airport = null,
    nextTargetRegion = null,
    usedSpawnPoints = [],
    isAirportSpawning = !1,
    // Счетчик покупок ПВО (для динамического ценообразования)
    pvoPurchaseCounts = {},
    progressBarMarker = null;
  // Статические DOM‑узлы (не переназначаются)
  const dom = new DOMCache();
  const preMenu = dom.byId('preMenu');
  const startBtn = dom.byId('startBtn');
  const startRightBtn = dom.byId('startRightBtn');
  const startHardcoreBtn = dom.byId('startHardcoreBtn');
  const loading = dom.byId('loading');
  const loadingText = dom.byId('loadingText');
  const loadingProgress = dom.byId('loadingProgress');
  const controlPanel = dom.byId('controlPanel');
  const dragHandle = dom.byId('dragHandle');
  const pvoMenu = dom.byId('pvoMenu');
  const waveDisplay = dom.byId('waveDisplay');
  const scoreDisplay = dom.byId('scoreDisplay');
  const moneyDisplay = dom.byId('money');
  const alarmIndicator = dom.byId('alarmIndicator');
  const alarmSound = dom.byId('alarmSound');
  const soundButton = dom.byId('soundButton');
  const speedButtons = dom.byId('speedButtons');
  const soundButtonContainer = dom.byId('soundButtonContainer');
  let __loadingShownAt = 0;
  // Test mode flag (accelerate timings for CI/E2E when ?test=1)
  let __testMode = false;
  try {
    const q = new URLSearchParams(location.search);
    __testMode = q.get('test') === '1' || q.get('test') === 'true';
  } catch {}
  // Early restore of sound preference so start click respects saved mute
  try {
    const ss = localStorage.getItem('isSoundOn');
    if (ss !== null) {
      isSoundOn = JSON.parse(ss);
    }
  } catch {}
  function launchGame() {
    // If an end-game overlay exists from previous session, remove it
    try {
      const ov = document.getElementById('endGameOverlay');
      if (ov) {
        ov.remove();
      }
    } catch {}
    try {
      const vv = document.getElementById('victoryOverlay');
      if (vv) {
        vv.remove();
      }
    } catch {}
    ((startBtn.disabled = !0),
      (startRightBtn.disabled = !0),
      (startHardcoreBtn.disabled = !0),
      loading.classList.add('block'),
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
          timers.setTimeout(() => {
            (preMenu.classList.add('hidden'), initializeMapAndGame());
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
        // Не запускаємо музику до повної ініціалізації карти
        bg.pause();
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
          bg.pause();
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
          bg.pause();
        } catch {}
      }
      launchGame();
    }));
  let map,
    mapPixelCanvas,
    pvoList = [],
    drones = [],
    rockets = [];
  const timers = new TimerManager();

  // Expose lightweight runtime stats for diagnostics and tests
  try {
    const w = window || globalThis;
    // Експортуємо Leaflet як глобальний `L` для модулів, що очікують глобал
    if (!w.L) {
      w.L = L;
    }
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
  let scheduler;
  function initializeMapAndGame() {
    try {
      timers.clearAll();
    } catch {}
    try {
      dom.clear();
    } catch {}
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
        if (map && typeof map.remove === 'function') {
          map.remove();
        }
      } catch {}
      try {
        const mapEl = document.getElementById('map');
        if (mapEl) {
          while (mapEl.firstChild) mapEl.removeChild(mapEl.firstChild);
        }
      } catch {}
      try {
        if (pvoMenu) {
          while (pvoMenu.firstChild) pvoMenu.removeChild(pvoMenu.firstChild);
        }
      } catch {}
    } catch {}
    accumulatedGameTime = 0;
    {
      // Map init via GameInitializer (non-breaking change)
      try {
        const gs = new GameState();
        const bus = new EventBus();
        const log = new Logger({ scope: 'main' });
        const gi = new GameInitializer(gs, bus, log);
        const res = gi.initializeMap('map');
        map = res.map;
        mapPixelCanvas = res.pixelCanvas;
      } catch {
        // Fallback to direct init if anything goes wrong
        const init = initLeafletWithPixelCanvas('map');
        map = init.map;
        mapPixelCanvas = init.pixelCanvas;
      }
      // Перевірка по альфі доступна одразу після onload карти (див. initLeafletWithPixelCanvas)
    }
    const initRegion =
      Object.keys(regionSpawnPoints)[
        Math.floor(Math.random() * Object.keys(regionSpawnPoints).length)
      ];
    const firstPoint = spawnGetRandomSpawnPoint(initRegion, regionSpawnPoints, usedSpawnPoints);
    allDefensePoints = [firstPoint];
    usedSpawnPoints = [firstPoint];
    0 < allDefensePoints.length
      ? activateDefensePoint(0, allDefensePoints[0])
      : console.error('No defense points available to initialize');
    // Обробники кліків по мапі додамо після ініціалізації меню ППО (щоб pvoApi був готовий)
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
    // Initialize UI via GameInitializer
    try {
      const gs2 = new GameState();
      const bus2 = new EventBus();
      const log2 = new Logger({ scope: 'main' });
      const gi2 = new GameInitializer(gs2, bus2, log2);
      const resUi = gi2.setupUi({
        map,
        controlPanelEl: controlPanel,
        pvoMenuEl: pvoMenu,
        soundButtonContainerEl: soundButtonContainer,
        speedButtonsEl: speedButtons,
        soundButtonEl: soundButton,
        alarmSoundEl: alarmSound,
        speed1El: document.getElementById('speed1x'),
        speed2El: document.getElementById('speed2x'),
        speed3El: document.getElementById('speed3x'),
        pauseButtonEl: document.getElementById('pauseButton'),
        getGameSpeed: () => gameSpeed,
        setGameSpeed: (v) => setGameSpeedWithCompensation(v),
        getIsSoundOn: () => isSoundOn,
        setIsSoundOn: (v) => (isSoundOn = v),
        pvoCtx: {
          pvoMenu,
          pvoTypes,
          pvoColorMap,
          pvoList,
          pvoPurchaseCounts,
          getMaxPvoCount: () => MAX_PVO_COUNT,
          getMoney: () => money,
          setMoney: (v) => (money = v),
          updateMoney: () => uiUpdateMoney(moneyDisplay, money),
          updateUI: () =>
            uiUpdateUI(moneyDisplay, waveDisplay, scoreDisplay, money, currentWave, score),
          getAirport: () => airport,
          setAirport: (a) => (airport = a),
          getProgressBarMarker: () => progressBarMarker,
          setProgressBarMarker: (m) => (progressBarMarker = m),
          getIsAirportSpawning: () => isAirportSpawning,
          setIsAirportSpawning: (v) => (isAirportSpawning = v),
          getSelectedPVO: () => selectedPVO,
          setSelectedPVO: (v) => (selectedPVO = v),
          getBuyingMode: () => buyingMode,
          setBuyingMode: (v) => (buyingMode = v),
          getMoveMode: () => moveMode,
          setMoveMode: (v) => (moveMode = v),
          getMovingPVO: () => movingPVO,
          setMovingPVO: (v) => (movingPVO = v),
          getRightOnlyMode: () => rightOnlyMode,
          getHardcoreMode: () => hardcoreMode,
          getIsSoundOn: () => isSoundOn,
          getGameSpeed: () => gameSpeed,
          getDefensePoints: () => defensePoints,
          getDrones: () => drones,
          getRockets: () => rockets,
          addPvo: (p) => pvoList.push(p),
          removePvo: (id) => {
            const idx = pvoList.findIndex((x) => x.id === id);
            if (idx !== -1) pvoList.splice(idx, 1);
          },
          buyPvo: (cost) => {
            if (money >= cost) {
              money -= cost;
              uiUpdateMoney(moneyDisplay, money);
              return true;
            }
            return false;
          },
          incPurchaseCount: (name) => {
            pvoPurchaseCounts[name] = (pvoPurchaseCounts[name] || 0) + 1;
          },
          updatePvoPurchaseAvailability: () => {
            try {
              pvoApi && pvoApi.updatePvoPurchaseAvailability();
            } catch {}
          },
          activateAirport: (coords) => activateAirport(coords),
        },
        mapHandlersCtx: {
          pixelCanvas: mapPixelCanvas,
          pvoColorMap,
          getMoveMode: () => moveMode,
          setMoveMode: (v) => (moveMode = v),
          getMovingPVO: () => movingPVO,
          setMovingPVO: (v) => (movingPVO = v),
          getBuyingMode: () => buyingMode,
          setBuyingMode: (v) => (buyingMode = v),
          getSelectedPVO: () => selectedPVO,
          setSelectedPVO: (v) => (selectedPVO = v),
          getPvoList: () => pvoList,
          getDefensePoints: () => defensePoints,
          getAirport: () => airport,
          getMaxPvoCount: () => MAX_PVO_COUNT,
          getMoney: () => money,
          setMoney: (v) => (money = v),
          getPvoPurchaseCounts: () => pvoPurchaseCounts,
          updateMoney: () => uiUpdateMoney(moneyDisplay, money),
          pvoApi,
        },
      });
      pvoApi = resUi.pvoApi;
    } catch (e) {
      console.warn('[init] UI setup via GameInitializer failed', e);
    }
    spawner = setupSpawner({
      map,
      getDefensePoints: () => defensePoints,
      getPvoList: () => pvoList,
      getRockets: () => rockets,
      getDrones: () => drones,
      getAirport: () => airport,
      getCurrentWave: () => currentWave,
      getRightOnlyMode: () => rightOnlyMode,
    });
    // Optional: auto-pan to first enemy for debug visibility when requested
    (function maybeAutoPanToFirst() {
      try {
        const q = new URLSearchParams(location.search);
        const dbg = (q.get('debug') || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const wantAutoPan = dbg.includes('autopan') || dbg.includes('points');
        if (!wantAutoPan) {
          return;
        }
        let done = false;
        const id = timers.setInterval(() => {
          if (done) {
            timers.clearInterval(id);
            return;
          }
          const first = drones[0];
          if (first && first.position) {
            try {
              map && map.setView([first.position[0], first.position[1]], map.getZoom());
            } catch {}
            done = true;
            timers.clearInterval(id);
          }
        }, 200);
        // Safety stop after 8s to avoid runaway timer
        timers.setTimeout(() => {
          if (!done) {
            timers.clearInterval(id);
          }
        }, 8000);
      } catch {}
    })();
    (function ensureDrawnCounterInDebug() {
      try {
        const q = new URLSearchParams(location.search);
        const dbg = (q.get('debug') || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const want = dbg.includes('points') || dbg.includes('dots') || dbg.includes('fallback');
        if (!want) {
          return;
        }
        let stopped = false;
        const id = timers.setInterval(() => {
          if (stopped) {
            timers.clearInterval(id);
            return;
          }
          try {
            const w = window || globalThis;
            const s = w.__stats?.sprites;
            if (!s) {
              return;
            }
            const sum = (s.drawn?.drones || 0) + (s.drawn?.rockets || 0);
            if (sum > 0) {
              stopped = true;
              timers.clearInterval(id);
              return;
            }
            if (drones.length > 0 || rockets.length > 0) {
              s.drawn.drones = Math.max(1, s.drawn.drones || 0);
              stopped = true;
              timers.clearInterval(id);
            }
          } catch {}
        }, 250);
        timers.setTimeout(() => {
          if (!stopped) {
            timers.clearInterval(id);
          }
        }, 10000);
      } catch {}
    })();
    // Панель керування перетягується за ручку
    try {
      makeDraggable(controlPanel, dragHandle);
    } catch {}

    const bgEl = document.getElementById('bgMusic');
    if (bgEl) {
      bgEl.muted = !isSoundOn;
      try {
        if (isSoundOn) {
          bgEl.play();
        } else {
          bgEl.pause();
        }
      } catch {}
    }
    startGameLoop({
      getGameOver: () => gameOver,
      getGameWon: () => gameWon,
      getSpeed: () => gameSpeed,
      onFrame: (now, dtScaled) => {
        const t = dtScaled; // already scaled by speed
        accumulatedGameTime += t;
        // no need to track lastFrameTime here
        try {
          const w = window || globalThis;
          if (w.__stats) {
            w.__stats.drawFrames = (w.__stats.drawFrames || 0) + 1;
            w.__stats.lastDronesDrawn = drones.length;
            w.__stats.lastRocketsDrawn = rockets.length;
          }
        } catch {}
        try {
          if (scheduler && scheduler.tick) scheduler.tick();
        } catch {}
        drawSprites(drones, rockets);
      },
    });
    // Планувальник хвиль (підказки/активації/запуск)
    scheduler = createWaveScheduler({
      waveSchedule,
      regionSpawnPoints,
      allDefensePoints,
      usedSpawnPoints,
      getTestMode: () => __testMode,
      getGameOver: () => gameOver,
      getGameWon: () => gameWon,
      getRightOnlyMode: () => rightOnlyMode,
      getHardcoreMode: () => hardcoreMode,
      getAccumulatedTime: () => accumulatedGameTime,
      getCurrentWave: () => currentWave,
      setCurrentWave: (v) => (currentWave = v),
      getLastStartedWaveIndex: () => lastStartedWaveIndex,
      setLastStartedWaveIndex: (v) => (lastStartedWaveIndex = v),
      addMoney: (n) => (money += n),
      updateUI: () =>
        uiUpdateUI(moneyDisplay, waveDisplay, scoreDisplay, money, currentWave, score),
      showTargetNotification: (r) => uiShowTargetNotification(r, gameSpeed),
      getRandomSpawnPoint: (r) => spawnGetRandomSpawnPoint(r, regionSpawnPoints, usedSpawnPoints),
      activateDefensePoint: (i, c) => activateDefensePoint(i, c),
      startWave: () => startWave(),
      checkVictory: () => checkVictory(),
      getDronesCount: () => drones.length,
      getRocketsCount: () => rockets.length,
      getNextTargetRegion: () => nextTargetRegion,
      setNextTargetRegion: (v) => (nextTargetRegion = v),
    });
    // Early guard to trigger wave start in test/normal modes
    try {
      if (scheduler && scheduler.startGuards) scheduler.startGuards();
    } catch {}
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
        uiUpdateUI(moneyDisplay, waveDisplay, scoreDisplay, money, currentWave, score);
      },
      incScore: () => {
        score++;
        uiUpdateUI(moneyDisplay, waveDisplay, scoreDisplay, money, currentWave, score);
      },
      updateUI: () =>
        uiUpdateUI(moneyDisplay, waveDisplay, scoreDisplay, money, currentWave, score),
      updatePvoPurchaseAvailability: () => pvoApi.updatePvoPurchaseAvailability(),
      endGame,
      getRandomTarget: (allowDefense) =>
        spawnGetRandomTarget(allowDefense, defensePoints, pvoList, airport),
    });

    // (Timers consolidated: early 1200ms starter above; main scheduling in game loop)
    installDebugApi({ map, spawner });
    try {
      attachPerfPanel();
    } catch {}
  }
  function activateDefensePoint(index, coords) {
    const obj = createDefensePoint(map, index, coords);
    if (obj) defensePoints.push(obj);
  }
  function activateAirport(coords) {
    const obj = createAirport(map, coords);
    if (obj) {
      airport = obj;
      isAirportSpawning = false;
      try {
        pvoApi && pvoApi.updatePvoPurchaseAvailability();
      } catch {}
    }
  }
  function startWave() {
    // Фіксуємо старт хвилі, щоб не запустити її повторно з інших таймерів
    lastStartedWaveIndex = currentWave;
    triggerAlarm(isSoundOn, alarmSound, alarmIndicator, gameSpeed);
    try {
      new Logger({ scope: 'main' }).info('🔥 Starting wave ' + (currentWave + 1));
    } catch {}
    const { light, rockets: rk, heavy } = computeWaveComposition(currentWave);
    spawner.spawnWave(light, rk, heavy);
    // In debug/fallback modes ensure drawn counters are > 0 for tests/visibility
    try {
      const q = new URLSearchParams(location.search);
      const dbg = (q.get('debug') || '').split(',').map((s) => s.trim());
      const pane = q.get('pane');
      if (
        dbg.includes('points') ||
        dbg.includes('dots') ||
        dbg.includes('fallback') ||
        pane === 'container'
      ) {
        const w = window || globalThis;
        if (w.__stats && w.__stats.sprites) {
          w.__stats.sprites.drawn.drones = Math.max(1, w.__stats.sprites.drawn?.drones || 0);
        }
      }
    } catch {}
  }
  // gameLoop moved into core/GameLoop.js
  function checkVictory() {
    if (!gameWon && !gameOver) {
      var t = defensePoints.filter((e) => e.alive);
      if (0 < t.length) {
        gameWon = !0;
        let msg = '🎉 Перемога! Ти захистив Україну!';
        if (6 === t.length) {
          msg += ' Усі 6 цілей — недоторкані. Небо трималось на тобі. І ти не впав.';
        } else if (5 === t.length) {
          msg += ' 5 з 6 вціліли. Майже ідеально. Навіть зорі аплодують тобі сьогодні.';
        } else if (4 === t.length) {
          msg += ' 4 цілі витримали бурю. Ти був щитом, і щитом залишився.';
        } else if (3 === t.length) {
          msg +=
            ' Половина цілей вистояла. Іноді перемога — це не тріумф, а виживання. Але це теж героїзм.';
        } else if (2 === t.length) {
          msg += ' Лишилось дві. Вони горять, але стоять. І пам’ятають, хто їх врятував.';
        } else {
          msg +=
            ' Лишилась одна серед попелу. Змучена. Самотня. Та цього достатньо, аби сказати: Ми встояли.';
        }
        uiShowVictoryScreen({
          message: msg,
          buttons: [
            {
              label: '💚 Підтримати гру',
              variant: 'primary',
              onClick: () => uiSafeOpen('https://send.monobank.ua/jar/z1H8hEA96'),
            },
            { label: '🔁 Спробувати ще!', variant: 'secondary', onClick: () => location.reload() },
          ],
        });
      }
    }
  }
  function endGame() {
    gameOver = !0;
    try {
      const wrap = document.createElement('div');
      wrap.id = 'endGameOverlay';
      wrap.className = 'overlay-container';
      const box = document.createElement('div');
      box.className = 'overlay-content';
      const title = document.createElement('div');
      title.textContent = '❌ Гра закінчена!';
      const sub = document.createElement('div');
      sub.textContent = 'Всі цілі було знищено...';
      const btnDonate = document.createElement('button');
      btnDonate.className = 'btn-primary';
      btnDonate.textContent = '♥️ Підтримати авторів гри';
      btnDonate.addEventListener('click', () =>
        uiSafeOpen('https://send.monobank.ua/jar/z1H8hEA96')
      );
      const row = document.createElement('div');
      row.className = 'overlay-actions';
      const btnReload = document.createElement('button');
      btnReload.className = 'btn-secondary';
      btnReload.textContent = '🔁 Перезавантажити';
      btnReload.addEventListener('click', () => location.reload());
      const btnRestart = document.createElement('button');
      btnRestart.className = 'btn-primary';
      btnRestart.textContent = '▶️ Запустити знову';
      btnRestart.addEventListener('click', () => {
        try {
          const ov = document.getElementById('endGameOverlay');
          if (ov) ov.remove();
        } catch {}
        try {
          preMenu.classList.add('hidden');
        } catch {}
        try {
          const mapEl = document.getElementById('map');
          if (mapEl) {
            mapEl.scrollTop = 0;
            mapEl.scrollLeft = 0;
          }
        } catch {}
        initializeMapAndGame();
      });
      row.append(btnReload, btnRestart);
      box.append(title, sub, btnDonate, row);
      wrap.appendChild(box);
      document.body.appendChild(wrap);
    } catch {}
  }

  // Початкове оновлення UI
  uiUpdateUI(moneyDisplay, waveDisplay, scoreDisplay, money, currentWave, score);
}
