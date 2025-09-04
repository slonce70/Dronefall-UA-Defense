// Простий пул для ліній «лазерів/променів» (перевикористовується між пострілами)

const pool = [];

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
    if (map && pl && map.hasLayer(pl)) map.removeLayer(pl);
  } catch {}
  pool.push(pl);
}

export function drawBeam(map, fromLatLng, toLatLng, color = 'red', ttlMs = 200) {
  const pl = getBeam(map, color);
  pl.setLatLngs([fromLatLng, toLatLng]);
  pl.addTo(map);
  setTimeout(() => releaseBeam(map, pl), ttlMs);
}
