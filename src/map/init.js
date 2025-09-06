// Ініціалізація карти Leaflet + піксельного Canvas для хіт‑тесту

import { MAP_WIDTH, MAP_HEIGHT } from '../constants.js';
import { withCacheBust } from '../utils/images.js';

export function initLeafletWithPixelCanvas(containerId = 'map') {
  const map = L.map(containerId, {
    crs: L.CRS.Simple,
    minZoom: -3,
    maxZoom: 4,
    preferCanvas: true,
  });

  const bounds = [
    [0, 0],
    [MAP_WIDTH, MAP_HEIGHT],
  ];
  // Використовуємо PNG як гарантований формат (узгоджений альфа‑канал)
  L.imageOverlay(withCacheBust('assets/map.png'), bounds).addTo(map);
  map.fitBounds(bounds);
  map.setView([1414.5, 2000], -2);

  // Піксельний Canvas для перевірки по альфа‑каналу базового зображення (надійний метод)
  const img = new Image();
  img.crossOrigin = 'anonymous';
  const pixelCanvas = document.createElement('canvas');
  const ctx = pixelCanvas.getContext('2d');
  img.onload = () => {
    pixelCanvas.width = img.width;
    pixelCanvas.height = img.height;
    if (ctx) {
      ctx.drawImage(img, 0, 0);
    }
    // Готово: відтепер можна виконувати хіт‑тест по пікселю (див. src/map.js)
  };
  // ВАЖЛИВО: для хіт‑тесту використовуємо PNG, щоб альфа‑канал відповідав оверлею без артефактів.
  img.src = withCacheBust('assets/map.png');

  // Розширені межі навігації карти (щоб не «втрачати» полотно під час пану/зуму)
  const maxBounds = [
    [-1000, -1500],
    [3829, 5500],
  ];
  map.setMaxBounds(maxBounds);

  return { map, pixelCanvas };
}
