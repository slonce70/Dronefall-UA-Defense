// Керування швидкістю та звуком (обробники подій та UI)

/**
 * @typedef {object} ControlsCtx
 * @property {HTMLElement} soundButton
 * @property {HTMLAudioElement} alarmSound
 * @property {HTMLElement} speed1
 * @property {HTMLElement} speed2
 * @property {HTMLElement} speed3
 * @property {HTMLElement} pauseButton
 * @property {() => number} getGameSpeed
 * @property {(n:number) => void} setGameSpeed
 * @property {() => boolean} getIsSoundOn
 * @property {(v:boolean) => void} setIsSoundOn
 * @property {import('../core/EventBus.js').EventBus} [bus]
 */

/**
 * Ініціалізація обробників для кнопок швидкості/паузи та звуку.
 * Локально зберігає останню ненульову швидкість, щоб коректно знімати паузу.
 *
 * @param {ControlsCtx} ctx
 */
export function setupSpeedAndSoundControls(ctx) {
  const {
    soundButton,
    alarmSound,
    speed1,
    speed2,
    speed3,
    pauseButton,
    getGameSpeed,
    setGameSpeed,
    getIsSoundOn,
    setIsSoundOn,
    bus,
  } = ctx;

  let lastNonZeroSpeed = Math.max(1, getGameSpeed() || 1);

  function applySpeedUi(gs) {
    [speed1, speed2, speed3].forEach((el) => el.classList.remove('active'));
    // ARIA: позначити натиснуту кнопку швидкості
    [speed1, speed2, speed3].forEach((el) => el.setAttribute('aria-pressed', 'false'));
    if (gs === 0) {
      pauseButton.textContent = '▶️';
      pauseButton.setAttribute('aria-pressed', 'true');
    } else {
      pauseButton.textContent = '⏸️';
      pauseButton.setAttribute('aria-pressed', 'false');
      const btn = gs >= 3 ? speed3 : gs >= 2 ? speed2 : speed1;
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
    }
  }

  function changeSpeed(newSpeed) {
    if (newSpeed > 0) {
      lastNonZeroSpeed = newSpeed;
    }
    setGameSpeed(newSpeed);
    applySpeedUi(newSpeed);
    try {
      bus && bus.emit('speed:change', { speed: newSpeed });
    } catch {}
  }

  // Обробники кнопок швидкості
  speed1.onclick = () => changeSpeed(1);
  speed2.onclick = () => changeSpeed(2);
  speed3.onclick = () => changeSpeed(3);
  pauseButton.onclick = () => {
    const gs = getGameSpeed();
    if (gs === 0) {
      changeSpeed(lastNonZeroSpeed || 1);
    } else {
      changeSpeed(0);
    }
  };

  // Початкове застосування стану UI
  applySpeedUi(getGameSpeed() || 1);

  // Звук
  function applySoundUi(on) {
    soundButton.textContent = on ? '🔊' : '🔇';
    try {
      if (alarmSound) {
        alarmSound.muted = !on;
        alarmSound.volume = on ? 1 : 0;
        if (!on) {
          alarmSound.pause();
        }
      }
    } catch {}
    try {
      const bg = document.getElementById('bgMusic');
      if (bg) {
        bg.muted = !on;
        bg.volume = on ? 1 : 0;
        if (on && bg.paused) {
          bg.play().catch(() => {});
        } else if (!on && !bg.paused) {
          bg.pause();
        }
      }
    } catch {}
  }

  soundButton.onclick = () => {
    const next = !getIsSoundOn();
    setIsSoundOn(next);
    applySoundUi(next);
    try {
      bus && bus.emit('sound:change', { on: next });
    } catch {}
  };
  applySoundUi(getIsSoundOn());
}
