// @ts-check
// High-level initializer composing existing modules
import { initLeafletWithPixelCanvas } from '../map/init.js';
import { initSprites } from '../sprites.js';
import { setupPvoMenu } from '../ui/pvoMenu.js';
import { setupSpeedAndSoundControls } from '../ui/controls.js';
import { attachMapHandlers } from '../ui/mapHandlers.js';
import { PvoStore } from '../pvo/store.js';

/**
 * Minimal scaffold for refactor step. Not yet wired into main.js.
 */
export class GameInitializer {
  /**
   * @param {import('../core/GameState.js').GameState} gameState
   * @param {import('../core/EventBus.js').EventBus} eventBus
   * @param {import('../core/Logger.js').Logger} logger
   */
  constructor(gameState, eventBus, logger) {
    this.gs = gameState;
    this.bus = eventBus;
    this.log = logger.child('init');
  }

  // Map-only init (non-breaking). UI and handlers remain in main.js for now.
  initializeMap(containerId = 'map') {
    this.log.info('initializeMap start');
    const { map, pixelCanvas } = initLeafletWithPixelCanvas(containerId);
    this.log.info('initializeMap done');
    return { map, pixelCanvas };
  }

  /**
   * Sets up UI controls, PVO menu, map handlers, sprites and background audio.
   * Expects a context compatible with existing setup functions in main.js.
   * Returns { pvoApi }.
   */
  setupUi(ctx) {
    const {
      map,
      controlPanelEl,
      pvoMenuEl,
      soundButtonContainerEl,
      speedButtonsEl,
      soundButtonEl,
      alarmSoundEl,
      speed1El,
      speed2El,
      speed3El,
      pauseButtonEl,
      // state bridges
      getGameSpeed,
      setGameSpeed,
      getIsSoundOn,
      setIsSoundOn,
      // dependencies for pvoMenu/mapHandlers are passed via rest
      pvoCtx,
      mapHandlersCtx,
    } = ctx;

    // Show core UI blocks
    try {
      if (controlPanelEl) controlPanelEl.classList.add('block');
      if (pvoMenuEl) pvoMenuEl.classList.add('flex');
      if (soundButtonContainerEl) soundButtonContainerEl.classList.add('flex');
      if (speedButtonsEl) speedButtonsEl.classList.add('flex');
    } catch {}

    // Preferences via GameState (with graceful fallback to getters/setters)
    try {
      this.gs.enablePersistence(['isSoundOn', 'gameSpeed']);
    } catch {}
    try {
      const persistedSound = this.gs.get('isSoundOn');
      const curSound = typeof persistedSound === 'boolean' ? persistedSound : getIsSoundOn();
      setIsSoundOn(curSound);
      this.gs.set('isSoundOn', curSound);
    } catch {}
    try {
      const persistedSpeed = this.gs.get('gameSpeed');
      const val = typeof persistedSpeed === 'number' ? persistedSpeed : getGameSpeed();
      setGameSpeed(val >= 1 && val <= 3 ? val : 1);
      this.gs.set('gameSpeed', getGameSpeed());
    } catch {}

    // Sync sound icon and alarm mute
    try {
      if (soundButtonEl) soundButtonEl.textContent = getIsSoundOn() ? '🔊' : '🔇';
      if (alarmSoundEl) alarmSoundEl.muted = !getIsSoundOn();
    } catch {}

    // Toggle sound via button
    try {
      if (soundButtonEl) {
        soundButtonEl.onclick = () => {
          const next = !getIsSoundOn();
          setIsSoundOn(next);
          try {
            this.gs.set('isSoundOn', next);
          } catch {}
          try {
            soundButtonEl.textContent = next ? '🔊' : '🔇';
          } catch {}
          try {
            if (alarmSoundEl) alarmSoundEl.muted = !next;
          } catch {}
          const bg = document.getElementById('bgMusic');
          if (bg) {
            try {
              bg.muted = !next;
            } catch {}
          }
        };
      }
    } catch {}

    // Sprites renderer
    try {
      initSprites(map);
    } catch {}

    // Speed/sound controls
    setupSpeedAndSoundControls({
      soundButton: soundButtonEl,
      alarmSound: alarmSoundEl,
      speed1: speed1El,
      speed2: speed2El,
      speed3: speed3El,
      pauseButton: pauseButtonEl,
      getGameSpeed,
      setGameSpeed: (v) => {
        setGameSpeed(v);
        try {
          this.gs.set('gameSpeed', v);
        } catch {}
      },
      getIsSoundOn,
      setIsSoundOn: (v) => {
        setIsSoundOn(v);
        try {
          this.gs.set('isSoundOn', v);
        } catch {}
      },
    });

    // PVO menu and map handlers need rich context
    // Create PVO store and pass to UI modules
    const store = new PvoStore(pvoCtx.getMoney, pvoCtx.setMoney);
    const pvoApi = setupPvoMenu({ map, ...pvoCtx, store, bus: this.bus });
    attachMapHandlers({ map, ...mapHandlersCtx, pvoApi, store, bus: this.bus });

    // Background music
    try {
      const bgEl = document.getElementById('bgMusic');
      if (bgEl) {
        bgEl.muted = !getIsSoundOn();
        if (getIsSoundOn()) bgEl.play();
        else bgEl.pause();
      }
    } catch {}

    return { pvoApi };
  }
}
