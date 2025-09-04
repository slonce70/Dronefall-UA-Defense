// Допоміжні функції карти
import { MAP_WIDTH, MAP_HEIGHT } from './constants.js';

/**
 * Проста і надійна перевірка точки по альфа‑каналу базового зображення карти (як в оригіналі).
 * Працює у CRS.Simple: lat ∈ [0..MAP_WIDTH], lng ∈ [0..MAP_HEIGHT].
 *
 * Алгоритм:
 *  - Перетворити lat/lng у піксельні координати з інверсією Y (Canvas має вісь Y вниз)
 *  - Якщо поза межами — false
 *  - Інакше прочитати один піксель і повернути true, якщо альфа > 0
 *  - Якщо canvas/контекст ще не готові — повернути true (не заважати установці)
 */
export function isPointOnMap(canvas, lat, lng) {
  // Тимчасова перевірка по bbox, поки pixel‑canvas не готовий
  const insideBbox =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= 0 &&
    lat <= MAP_WIDTH &&
    lng >= 0 &&
    lng <= MAP_HEIGHT;
  try {
    const w = canvas?.width | 0;
    const h = canvas?.height | 0;
    // Якщо canvas ще порожній — дозволяємо лише в межах bbox
    if (!w || !h) {
      return insideBbox;
    }

    const minLat = 0;
    const minLng = 0;
    const maxLat = MAP_WIDTH;
    const maxLng = MAP_HEIGHT;
    const x = Math.floor(((lng - minLng) / (maxLng - minLng)) * w);
    const y = Math.floor(((maxLat - lat) / (maxLat - minLat)) * h);
    if (x < 0 || x >= w || y < 0 || y >= h) {
      return false;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    // Якщо контекст недоступний — покладаємось на bbox
    if (!ctx) {
      return insideBbox;
    }
    const a = ctx.getImageData(x, y, 1, 1).data[3] | 0;
    return a > 0;
  } catch {
    // У разі помилки — консервативний фолбек: лише в межах bbox
    return insideBbox;
  }
}
