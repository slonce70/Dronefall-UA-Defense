import {
  FIXED_TOTAL_ENEMIES,
  INITIAL_LIGHT_DRONES,
  INITIAL_HEAVY_DRONES,
  INITIAL_ROCKETS,
  LIGHT_DRONE_DECREMENT,
  HEAVY_DRONE_INCREMENT,
  ROCKET_INCREMENT,
  HEAVY_DRONE_DECREMENT,
  ROCKET_INCREMENT_NO_LIGHT,
} from '../constants.js';

export function computeWaveComposition(currentWave) {
  if (currentWave < 18) {
    const light = 5 + 4 * currentWave;
    const rockets = currentWave >= 3 ? currentWave - 1 : 0;
    const heavy = currentWave >= 6 ? Math.floor(currentWave / 2) : 0;
    return { light, rockets, heavy };
  }

  const extra = currentWave - 18;
  let light = Math.max(0, INITIAL_LIGHT_DRONES - extra * LIGHT_DRONE_DECREMENT);
  let heavy;
  let rockets;
  if (light > 0) {
    heavy = INITIAL_HEAVY_DRONES + extra * HEAVY_DRONE_INCREMENT;
    rockets = INITIAL_ROCKETS + extra * ROCKET_INCREMENT;
  } else {
    const k = Math.floor(
      (INITIAL_LIGHT_DRONES + LIGHT_DRONE_DECREMENT - 1) / LIGHT_DRONE_DECREMENT
    );
    const i = extra - k;
    heavy = Math.max(
      0,
      INITIAL_HEAVY_DRONES + k * HEAVY_DRONE_INCREMENT - i * HEAVY_DRONE_DECREMENT
    );
    rockets = INITIAL_ROCKETS + k * ROCKET_INCREMENT + i * ROCKET_INCREMENT_NO_LIGHT;
  }
  // Normalize to fixed total
  const total = light + heavy + rockets;
  if (total !== FIXED_TOTAL_ENEMIES) {
    const delta = FIXED_TOTAL_ENEMIES - total;
    if (light > 0) {
      light = Math.max(0, light + delta);
    } else if (heavy > 0) {
      heavy = Math.max(0, heavy + delta);
    } else {
      rockets += delta;
    }
  }
  return { light, rockets, heavy };
}
