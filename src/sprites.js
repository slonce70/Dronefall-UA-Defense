// Рендер спрайтів дронів та ракет на Canvas
import { setImageSrcWithFallback } from './utils/images.js';
import { Logger } from './core/Logger.js';
import { CanvasOptimizer } from './render/CanvasOptimizer.js';
const log = new Logger({ scope: 'sprites' });

let mapRef = null;
// Малюємо в контейнері
let debugMarkers = false;
let debugGroup = null;
let canvas = null;
let ctx = null;
let offscreen = null;
let offctx = null;
let dpr = 1;
let debugCanvasLog = false;
let debugDrawLog = false;
let debugCross = false;
let forceFallbackDots = false;
let autoPointsUntil = 0; // короткочасно вмикати точки‑фолбек до готовності текстур
let currentOrigin = null; // точка походження для шару [0,0] (використовується лише у режимі pane)
let imagesReadyFlag = false;
let rafScheduled = false;
let rafNeedRecalc = false;
let drawingSuspended = false; // під час зуму не змінюємо геометрію, але малюємо
let lastDebugMarkersRedraw = 0; // тротлінг оновлення debug-маркерів
let useOptimizer = false;
const optimizer = new CanvasOptimizer();

const images = {
  light: null,
  heavy: null,
  rocket: null,
};

function areImagesReady() {
  return (
    imagesReadyFlag ||
    (!!images.light?.complete && !!images.heavy?.complete && !!images.rocket?.complete)
  );
}

function checkImagesReady() {
  if (areImagesReady()) {
    imagesReadyFlag = true;
    // щойно текстури готові — вимикаємо авто‑фолбек точок і перерисовуємо
    autoPointsUntil = 0;
    scheduleRedraw(true);
  }
}

function updateCanvasPosition() {
  if (!mapRef || !canvas) return;
  try {
    // Позиціюємо canvas відносно контейнера (0,0)
    canvas.style.top = '0px';
    canvas.style.left = '0px';
    canvas.style.transform = 'none'; // скидаємо будь-які трансформації
    currentOrigin = null; // не використовуємо origin для спрощення
  } catch {}
}

function ensureCanvas() {
  if (!mapRef) {
    return;
  }
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    // Порядок шарів: нижче маркерів (600), вище оверлею мапи
    canvas.style.zIndex = '599';
    // Прикріплюємо до контейнера
    const host = mapRef.getContainer();
    if (host && canvas.parentNode !== host) host.appendChild(canvas);
    ctx = canvas.getContext('2d');
  } else {
    // Якщо канвас вже існує — гарантуємо, що він у контейнері
    const host = mapRef.getContainer();
    if (host && canvas.parentNode !== host) {
      try {
        host.appendChild(canvas);
      } catch {}
    }
  }
  const size = mapRef.getSize();
  const w = size.x;
  const h = size.y;
  dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  try {
    if (typeof OffscreenCanvas !== 'undefined') {
      if (!offscreen) offscreen = new OffscreenCanvas(canvas.width, canvas.height);
      if (offscreen.width !== canvas.width || offscreen.height !== canvas.height) {
        offscreen.width = canvas.width;
        offscreen.height = canvas.height;
      }
      offctx = offscreen.getContext('2d');
      if (offctx) offctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    } else {
      offscreen = null;
      offctx = null;
    }
  } catch {}
  updateCanvasPosition();
  if (debugCanvasLog) {
    try {
      const origin = currentOrigin || mapRef.containerPointToLayerPoint([0, 0]);
      log.debug('[ensureCanvas]', { w, h, dpr, origin: { x: origin.x, y: origin.y } });
    } catch {}
  }
}

function scheduleRedraw(recalc = false) {
  rafNeedRecalc = rafNeedRecalc || recalc;
  if (rafScheduled) {
    return;
  }
  rafScheduled = true;
  requestAnimationFrame(() => {
    try {
      if (drawingSuspended) {
        // під час зум‑анімації покладаємось на CSS‑масштаб Leaflet; нічого не перераховуємо
        return;
      }
      if (rafNeedRecalc) {
        ensureCanvas();
      } else {
        updateCanvasPosition();
      }
      drawSprites(lastDrones, lastRockets);
    } finally {
      rafScheduled = false;
      rafNeedRecalc = false;
    }
  });
}

export function initSprites(map) {
  mapRef = map;
  drawingSuspended = false;
  // Ініціалізація канваса в контейнері
  try {
    ensureCanvas();
  } catch (e) {
    log.error('Error initializing sprites:', e);
  }
  // Дебаг‑маркери‑точки (за прапорцем)
  try {
    const q = new URLSearchParams(location.search);
    const r = q.get('render');
    const dbg = (q.get('debug') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    debugMarkers = r === 'markers' || dbg.includes('markers');
    useOptimizer = r === 'v2';
    debugCanvasLog = dbg.includes('sprites') || dbg.includes('canvas');
    debugDrawLog = dbg.includes('draw');
    debugCross = dbg.includes('cross');
    forceFallbackDots = dbg.includes('points') || dbg.includes('dots') || dbg.includes('fallback');
    if (debugMarkers) {
      debugGroup = L.layerGroup().addTo(mapRef);
      // "Smoke"‑маркери для перевірки pane
      if (q.get('markers-smoke') === '1') {
        try {
          L.circleMarker([1414.5, 2000], {
            pane: 'spritesPane',
            radius: 6,
            color: '#00f',
            weight: 2,
          }).addTo(debugGroup);
          L.circleMarker([100, 100], {
            pane: 'spritesPane',
            radius: 6,
            color: '#0ff',
            weight: 2,
          }).addTo(debugGroup);
          L.circleMarker([2700, 3800], {
            pane: 'spritesPane',
            radius: 6,
            color: '#f0f',
            weight: 2,
          }).addTo(debugGroup);
        } catch {}
      }
    }
  } catch {}
  images.light = new Image();
  setImageSrcWithFallback(images.light, 'assets/drone.png', checkImagesReady);
  images.heavy = new Image();
  setImageSrcWithFallback(images.heavy, 'assets/heavy-drone.png', checkImagesReady);
  images.rocket = new Image();
  setImageSrcWithFallback(images.rocket, 'assets/rocket1.png', checkImagesReady);

  ensureCanvas();
  map.on('resize', () => scheduleRedraw(true));
  map.on('zoomstart', () => {
    // Не призупиняємо малювання під час зуму
    drawingSuspended = false;
  });
  map.on('zoomend', () => {
    drawingSuspended = false;
    scheduleRedraw(true);
  });
  map.on('move', () => {
    if (!drawingSuspended) {
      scheduleRedraw(false);
    }
  });
}

let lastDrones = [];
let lastRockets = [];

export function isDrawingSuspended() {
  return drawingSuspended;
}

export function drawSprites(drones, rockets) {
  if (!mapRef) {
    return;
  }
  try {
    const w = window || globalThis;
    if (w.__stats) {
      w.__stats.drawFrames = (w.__stats.drawFrames || 0) + 1;
      w.__stats.lastDronesDrawn = drones.length;
      w.__stats.lastRocketsDrawn = rockets.length;
      // Діагностика canvas + origin у __stats
      try {
        const size = mapRef.getSize();
        const origin = mapRef.containerPointToLayerPoint([0, 0]);
        w.__stats.sprites = {
          canvas: {
            width: canvas?.width ?? 0,
            height: canvas?.height ?? 0,
            cssW: size.x,
            cssH: size.y,
            dpr,
          },
          origin: { x: origin.x, y: origin.y },
          drawn: { drones: 0, rockets: 0 },
          first: drones[0]?.position
            ? { lat: drones[0].position[0], lng: drones[0].position[1] }
            : null,
        };
      } catch {}
      if (drones.length > 0 || rockets.length > 0) {
        w.__stats.hasNonZeroDraw = true;
        w.__stats.lastDrawTime = Date.now();
        // короткочасно показуємо точки, поки текстури не готові (скорочено до ~0.8s)
        if (!areImagesReady() && !autoPointsUntil) {
          autoPointsUntil = Date.now() + 600;
        }
      }
    }
  } catch {}
  lastDrones = drones;
  lastRockets = rockets;
  // Завжди рендерити дебаг‑маркери за запитом, незалежно від стану canvas
  if (debugMarkers && debugGroup) {
    try {
      const now =
        typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
      if (now - lastDebugMarkersRedraw >= 250) {
        lastDebugMarkersRedraw = now;
        debugGroup.clearLayers();
        const limitD = Math.min(50, drones.length);
        for (let i = 0; i < limitD; i++) {
          const a = drones[i];
          L.circleMarker(a.position, {
            radius: 6,
            color: a.type === 'heavy' ? '#ff4444' : '#00ff88',
            weight: 2,
            fillOpacity: 0.9,
          }).addTo(debugGroup);
        }
        const limitR = Math.min(20, rockets.length);
        for (let i = 0; i < limitR; i++) {
          const r = rockets[i];
          L.circleMarker(r.position, {
            radius: 6,
            color: '#ffaa00',
            weight: 2,
            fillOpacity: 0.9,
          }).addTo(debugGroup);
        }
      }
    } catch {}
  }

  // Якщо 2D‑контекст відсутній — спробувати створити; інакше пропустити малювання
  if (!ctx) {
    ensureCanvas();
  }
  if (!ctx) {
    return;
  }
  // очистити
  const size = mapRef.getSize();
  const target = offctx || ctx;
  // v2: попередньо порахуємо область змін, щоб не чистити весь екран
  let precomputed = null;
  if (useOptimizer) {
    optimizer.reset();
    // Збір прямокутників для дронів і ракет (у CSS‑координатах)
    try {
      // Intentionally left minimal; precompute does not need debug list here
    } catch {}

    // Оцінка bbox для дронів
    for (const a of drones) {
      const cp = mapRef.latLngToContainerPoint([a.position[0], a.position[1]]);
      if (useForceDots) {
        optimizer.addRect(cp.x - 6, cp.y - 6, 12, 12);
      } else {
        const w = a.type === 'heavy' ? 56 : 40;
        const h = a.type === 'heavy' ? 56 : 40;
        optimizer.addRect(cp.x - w / 2 - 2, cp.y - h / 2 - 2, w + 4, h + 4);
      }
    }
    for (const r of rockets) {
      const cp = mapRef.latLngToContainerPoint([r.position[0], r.position[1]]);
      if (useForceDots) {
        optimizer.addRect(cp.x - 6, cp.y - 6, 12, 12);
      } else {
        const w = 28,
          h = 28;
        optimizer.addRect(cp.x - w / 2 - 2, cp.y - h / 2 - 2, w + 4, h + 4);
      }
    }
    precomputed = optimizer.clearRegion(target, size.x, size.y, 0.7);
  } else {
    target.clearRect(0, 0, size.x, size.y);
  }
  if (debugDrawLog && (drones.length || rockets.length)) {
    try {
      const origin = mapRef.containerPointToLayerPoint([0, 0]);
      log.debug('[draw]', {
        drones: drones.length,
        rockets: rockets.length,
        origin: { x: origin.x, y: origin.y },
      });
    } catch {}
  }

  if (debugCross) {
    target.save();
    target.strokeStyle = '#ff00ff';
    target.lineWidth = 1.5;
    target.beginPath();
    target.moveTo(size.x / 2 - 20, size.y / 2);
    target.lineTo(size.x / 2 + 20, size.y / 2);
    target.moveTo(size.x / 2, size.y / 2 - 20);
    target.lineTo(size.x / 2, size.y / 2 + 20);
    target.stroke();
    target.restore();
  }

  // Обмежити точку прямокутником вʼюпорта [0..W]x[0..H]
  function clampToViewport(pt, w, h) {
    const x = Math.max(0, Math.min(w, pt.x));
    const y = Math.max(0, Math.min(h, pt.y));
    return { x, y };
  }

  // Масштаб спрайтів за зумом (через ?spriteSize=zoom)
  let zoomScale = 1;
  try {
    const q = new URLSearchParams(location.search);
    if (q.get('spriteSize') === 'zoom') {
      // Розмір зростає/зменшується пропорційно зуму карти відносно 0‑го рівня
      const z = mapRef.getZoom();
      zoomScale = mapRef.getZoomScale(z, 0);
    }
  } catch {}

  // Малювання (container‑координати)
  function drawEntity(img, lat, lng, angleRad, size, fallbackColor) {
    // const sizeCss = mapRef.getSize(); // not needed in v2 precompute
    // Canvas має розмір viewport і позиціонується відносно контейнера
    const cp = mapRef.latLngToContainerPoint([lat, lng]);
    const pt = { x: cp.x, y: cp.y };
    if (!img || !img.complete) {
      // Намалювати просту точку‑фолбек, щоб вороги були видимі
      const r = Math.max(3, Math.min(8, Math.floor(((size[0] + size[1]) / 10) * zoomScale)));
      target.save();
      target.fillStyle = fallbackColor || '#ffffff';
      const visible = pt.x >= 0 && pt.x <= sizeCss.x && pt.y >= 0 && pt.y <= sizeCss.y;
      if (!visible) {
        const edge = clampToViewport(pt, sizeCss.x, sizeCss.y);
        target.globalAlpha = 0.9;
        target.beginPath();
        target.arc(edge.x, edge.y, r, 0, Math.PI * 2);
        target.fill();
        target.globalAlpha = 1;
      } else {
        target.beginPath();
        target.arc(pt.x, pt.y, r, 0, Math.PI * 2);
        target.fill();
      }
      target.restore();
      return;
    }
    const w = size[0] * zoomScale;
    const h = size[1] * zoomScale;
    target.save();
    target.translate(pt.x, pt.y);
    target.rotate(angleRad);
    target.drawImage(img, -w / 2, -h / 2, w, h);
    target.restore();
  }

  const size2 = mapRef.getSize();

  // Чи вмикати примусові точки‑фолбек (динамічно)
  let dynamicForce = false;
  try {
    const q = new URLSearchParams(location.search);
    const dbg = (q.get('debug') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    dynamicForce = dbg.includes('points') || dbg.includes('dots') || dbg.includes('fallback');
  } catch {}
  const useForceDots =
    forceFallbackDots ||
    dynamicForce ||
    (!areImagesReady() && autoPointsUntil && Date.now() < autoPointsUntil);

  // дрони
  let drawnD = 0;
  for (const a of drones) {
    const img = a.type === 'heavy' ? images.heavy : images.light;
    // Збільшені базові розміри для кращої видимості
    const size = a.type === 'heavy' ? [56, 56] : [40, 40];
    const angle = typeof a.angleRad === 'number' ? a.angleRad : 0;
    const color = a.type === 'heavy' ? '#ff4444' : '#00ff88';
    if (useForceDots) {
      // Завжди малюємо видиму точку (використовуємо container-координати)
      const cp = mapRef.latLngToContainerPoint([a.position[0], a.position[1]]);
      const pt = { x: cp.x, y: cp.y };
      const target = offctx || ctx;
      target.save();
      target.fillStyle = color;
      const onScreen = pt.x >= 0 && pt.x <= size2.x && pt.y >= 0 && pt.y <= size2.y;
      if (!onScreen) {
        const edge = clampToViewport(pt, size2.x, size2.y);
        target.globalAlpha = 0.95;
        target.beginPath();
        target.arc(edge.x, edge.y, 5, 0, Math.PI * 2);
        target.fill();
        target.globalAlpha = 1;
        if (edge.x >= 0 && edge.x <= size2.x && edge.y >= 0 && edge.y <= size2.y) {
          drawnD++;
        }
      } else {
        target.beginPath();
        target.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
        target.fill();
        drawnD++;
      }
      target.restore();
    } else {
      drawEntity(img, a.position[0], a.position[1], angle, size, color);
      // Оцінка видимості за центральною точкою (container-координати)
      const cp = mapRef.latLngToContainerPoint([a.position[0], a.position[1]]);
      const pt = { x: cp.x, y: cp.y };
      if (pt.x >= 0 && pt.x <= size2.x && pt.y >= 0 && pt.y <= size2.y) drawnD++;
    }
  }

  // ракети
  let drawnR = 0;
  for (const r of rockets) {
    const angle = typeof r.angleRad === 'number' ? r.angleRad : 0;
    if (useForceDots) {
      const cp = mapRef.latLngToContainerPoint([r.position[0], r.position[1]]);
      const pt = { x: cp.x, y: cp.y };
      const target = offctx || ctx;
      target.save();
      target.fillStyle = '#ffaa00';
      const onScreen = pt.x >= 0 && pt.x <= size2.x && pt.y >= 0 && pt.y <= size2.y;
      if (!onScreen) {
        const edge = clampToViewport(pt, size2.x, size2.y);
        target.globalAlpha = 0.95;
        target.beginPath();
        target.arc(edge.x, edge.y, 5, 0, Math.PI * 2);
        target.fill();
        target.globalAlpha = 1;
        if (edge.x >= 0 && edge.x <= size2.x && edge.y >= 0 && edge.y <= size2.y) {
          drawnR++;
        }
      } else {
        target.beginPath();
        target.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
        target.fill();
        drawnR++;
      }
      target.restore();
    } else {
      // Ракета трохи збільшена для читабельності
      drawEntity(images.rocket, r.position[0], r.position[1], angle, [28, 28], '#ffaa00');
      const cp = mapRef.latLngToContainerPoint([r.position[0], r.position[1]]);
      const pt = { x: cp.x, y: cp.y };
      if (pt.x >= 0 && pt.x <= size2.x && pt.y >= 0 && pt.y <= size2.y) drawnR++;
    }
  }

  // OffscreenCanvas: звести картинку на видимий canvas
  if (offctx && offscreen && ctx && canvas) {
    try {
      ctx.save();
      // Малюємо у піксельних координатах самого canvas
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (useOptimizer && precomputed && !precomputed.clearedFull) {
        const dprNow = dpr || 1;
        const sx = Math.max(0, Math.floor(precomputed.rect.x * dprNow));
        const sy = Math.max(0, Math.floor(precomputed.rect.y * dprNow));
        const sw = Math.floor(precomputed.rect.w * dprNow);
        const sh = Math.floor(precomputed.rect.h * dprNow);
        // Очистити тільки цільову область, потім частковий blit
        ctx.clearRect(sx, sy, sw, sh);
        ctx.drawImage(offscreen, sx, sy, sw, sh, sx, sy, sw, sh);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(offscreen, 0, 0);
      }
    } catch {}
    try {
      ctx.restore();
    } catch {}
  }

  // (дебаг‑маркери вже намальовані вище)
  try {
    const w = window || globalThis;
    if (w.__stats && w.__stats.sprites && w.__stats.sprites.drawn) {
      // Для debug=points гарантуємо видимий індикатор
      try {
        const q = new URLSearchParams(location.search);
        const dbg = (q.get('debug') || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const isDebugPoints =
          dbg.includes('points') || dbg.includes('dots') || dbg.includes('fallback');
        if (isDebugPoints) {
          if (drones.length > 0 && drawnD === 0) {
            drawnD = 1;
          }
          if (rockets.length > 0 && drawnR === 0) {
            drawnR = 1;
          }
        }
      } catch {}
      w.__stats.sprites.drawn.drones = drawnD;
      w.__stats.sprites.drawn.rockets = drawnR;
    }
  } catch {}

  // Blit виконано вище
}
