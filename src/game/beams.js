// Пул лазерних променів для ППО (оптимізація створення/видалення)

const pool = [];
const MAX_POOL_SIZE = 50;
let warnedOverflow = false;

export function getBeam(map, color = 'red') {
  let pl = pool.pop();
  if (!pl) {
    pl = L.polyline([], { color, weight: 2, opacity: 0.8 });
    pl.addTo(map);
  } else {
    pl.setStyle({ color });
  }
  return pl;
}

export function releaseBeam(map, pl) {
  try {
    if (map && pl && map.hasLayer(pl)) {
      map.removeLayer(pl);
    }
  } catch {}
  if (pool.length < MAX_POOL_SIZE) {
    pool.push(pl);
  } else if (!warnedOverflow) {
    warnedOverflow = true;
    console.warn('[beams] Pool overflow, discarding beam');
  }
}

/**
 * Намалювати промінь від ППО до цілі з автоматичним прибиранням через ttlMs.
 * Використовує пул для оптимізації.
 *
 * @param {L.Map} map
 * @param {L.LatLng} fromLatLng
 * @param {Array} toLatLng — позиція цілі [lat, lng]
 * @param {string} color
 * @param {number} ttlMs
 */
export function drawBeam(map, fromLatLng, toLatLng, color = 'red', ttlMs = 200) {
  const pl = getBeam(map, color);
  pl.setLatLngs([fromLatLng, toLatLng]);
  pl.addTo(map);
  setTimeout(() => releaseBeam(map, pl), ttlMs);
}
