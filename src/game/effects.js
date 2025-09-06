// Візуальні ефекти (вибухи, анімації)

const explosionPool = [];
const MAX_POOL_SIZE = 20;

function getExplosionMarker(map, size) {
  let marker = explosionPool.pop();
  if (!marker) {
    marker = L.marker([0, 0], {
      icon: L.icon({
        iconUrl: 'assets/explosion.gif',
        iconSize: size,
        iconAnchor: [size[0] / 2, size[1] / 2],
      }),
    });
  } else {
    // Оновити розмір іконки, якщо потрібно
    const currentSize = marker.getIcon().options.iconSize;
    if (currentSize[0] !== size[0] || currentSize[1] !== size[1]) {
      marker.setIcon(
        L.icon({
          iconUrl: 'assets/explosion.gif',
          iconSize: size,
          iconAnchor: [size[0] / 2, size[1] / 2],
        })
      );
    }
  }
  return marker;
}

export function explosion(map, position, gameSpeed = 1, size = [40, 40], ttl = 600) {
  try {
    const entry = getExplosionMarker(map, size);
    entry.setLatLng(position);
    entry.addTo(map);
    setTimeout(
      () => {
        try {
          map.removeLayer(entry);
          if (explosionPool.length < MAX_POOL_SIZE) {
            explosionPool.push(entry);
          }
        } catch {}
      },
      Math.max(200, ttl / (gameSpeed || 1))
    );
  } catch {}
}
