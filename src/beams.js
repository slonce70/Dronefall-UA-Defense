// Простий пул для ліній «лазерів/променів» (перевикористовується між пострілами)

const pool = [];
const MAX_POOL = 64;
let warnedOverflow = false;

export function getBeam(map, color = 'red') {
  let pl = pool.pop();
  if (!pl) {
    pl = L.polyline([], { color, weight: 2, dashArray: '4, 6' });
  }
  // гарантуємо встановлення кольору для поточного використання
  pl.setStyle({ color });
  return pl;
}

export function releaseBeam(map, pl) {
  try {
    if (map && pl && map.hasLayer(pl)) {
      map.removeLayer(pl);
    }
  } catch {}
  pool.push(pl);
  // Обмежуємо пул, щоби уникати безконтрольного росту
  if (pool.length > MAX_POOL) {
    // Видаляємо найстаріший елемент; попереджаємо лише один раз у консолі
    try {
      const old = pool.shift();
      if (old && map && map.hasLayer(old)) {
        map.removeLayer(old);
      }
    } catch {}
    if (!warnedOverflow) {
      warnedOverflow = true;
      try {
        console.warn(`[beams] Beam pool exceeded ${MAX_POOL}; trimming to cap.`);
      } catch {}
    }
  }
}

export function drawBeam(map, fromLatLng, toLatLng, color = 'red', ttlMs = 200) {
  const pl = getBeam(map, color);
  pl.setLatLngs([fromLatLng, toLatLng]);
  pl.addTo(map);
  setTimeout(() => releaseBeam(map, pl), ttlMs);
}
