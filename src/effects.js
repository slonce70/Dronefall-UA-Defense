// Проста оптимізація: пул маркерів вибухів, щоб не створювати/видаляти їх кожного разу
const EXPLOSION_POOL = [];
const MAX_POOL = 16;

function getExplosionMarker(map, size) {
  const free = EXPLOSION_POOL.find((m) => !m.active);
  if (free) {
    free.active = true;
    free.marker.setOpacity(1);
    return free;
  }
  if (EXPLOSION_POOL.length < MAX_POOL) {
    const icon = L.divIcon({
      html: `<img src="assets/explosion.gif" style="width:${size[0]}px;height:${size[1]}px;"/>`,
      className: '',
      iconSize: size,
      iconAnchor: [size[0] / 2, size[1] / 2],
    });
    const marker = L.marker([0, 0], { icon }).addTo(map);
    const entry = { marker, active: true };
    EXPLOSION_POOL.push(entry);
    return entry;
  }
  // якщо пул заповнено — перевикористаємо перший
  const entry = EXPLOSION_POOL[0];
  entry.active = true;
  entry.marker.setOpacity(1);
  return entry;
}

export function explosion(map, position, gameSpeed = 1, size = [40, 40], ttl = 600) {
  try {
    const entry = getExplosionMarker(map, size);
    // перезавантажити GIF: оновити HTML з cache-bust
    const el = entry.marker.getElement();
    if (el) {
      el.innerHTML = `<img src="assets/explosion.gif?ts=${Date.now()}" style="width:${size[0]}px;height:${size[1]}px;"/>`;
    } else {
      entry.marker.setIcon(
        L.divIcon({
          html: `<img src="assets/explosion.gif?ts=${Date.now()}" style="width:${size[0]}px;height:${size[1]}px;"/>`,
          className: '',
          iconSize: size,
          iconAnchor: [size[0] / 2, size[1] / 2],
        })
      );
    }
    entry.marker.setLatLng(position);
    entry.marker.setOpacity(1);
    setTimeout(
      () => {
        try {
          entry.marker.setOpacity(0);
          entry.active = false;
        } catch {}
      },
      ttl / (gameSpeed || 1)
    );
  } catch {}
}
