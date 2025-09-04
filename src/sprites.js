// Рендер спрайтів дронів та ракет на Canvas
import { setImageSrcWithFallback } from './utils.js';

let mapRef = null;
let paneRef = null; // виділена панель для коректного порядку шарів
let attachToContainer = false; // фолбек дебагу: кріпити канвас до контейнера мапи
let debugMarkers = false;
let debugGroup = null;
let canvas = null;
let ctx = null;
let dpr = 1;
let debugCanvasLog = false;
let debugDrawLog = false;
let debugCross = false;
let forceFallbackDots = false;
let autoPointsUntil = 0; // короткочасно вмикати точки‑фолбек до готовності текстур
let currentOrigin = null; // точка походження для шару [0,0]
let imagesReadyFlag = false;
let rafScheduled = false;
let rafNeedRecalc = false;
let drawingSuspended = false; // під час зуму не змінюємо геометрію, але малюємо
let lastDebugMarkersRedraw = 0; // тротлінг оновлення debug-маркерів

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
  if (!mapRef || !canvas) {
    return;
  }
  try {
    // Обчислити походження шару для верхнього‑лівого контейнера
    currentOrigin = mapRef.containerPointToLayerPoint([0, 0]);
    // Якщо канвас прикріплено до панелі (а не контейнера) — вирівняти через трансляцію шару
    if (!attachToContainer) {
      L.DomUtil.setPosition(canvas, currentOrigin);
    }
  } catch {}
}

function ensureCanvas() {
  if (!mapRef || !paneRef) {
    return;
  }
  // Малюємо спрайти в окремій панелі над мапою, але під маркерами (z-index >= 601)
  const pane = paneRef;
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    // Порядок шарів: нижче маркерів (600), вище оверлею мапи
    canvas.style.zIndex = '599';
    if (pane && canvas.parentNode !== pane) {
      pane.appendChild(canvas);
    }
    ctx = canvas.getContext('2d');
  } else {
    // Якщо канвас вже існує — гарантуємо, що він у потрібному контейнері
    if (pane && canvas.parentNode !== pane) {
      try {
        pane.appendChild(canvas);
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
  updateCanvasPosition();
  if (debugCanvasLog) {
    try {
      const origin = currentOrigin || mapRef.containerPointToLayerPoint([0, 0]);
      console.log('[sprites.ensureCanvas]', { w, h, dpr, origin: { x: origin.x, y: origin.y } });
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
  // Створити або перевикористати хост для спрайтів
  try {
    // Дозволити вибір цільової панелі через query (?pane=overlay|sprites|container)
    const q = new URLSearchParams(location.search);
    const panePref = q.get('pane');
    if (panePref === 'overlay' && mapRef.getPanes?.().overlayPane) {
      paneRef = mapRef.getPanes().overlayPane;
      attachToContainer = false;
    } else if (panePref === 'sprites') {
      paneRef = mapRef.getPane('spritesPane') || mapRef.createPane('spritesPane');
      attachToContainer = false;
    } else {
      // Типово — контейнер мапи і координати containerPoint
      paneRef = mapRef.getContainer();
      attachToContainer = true;
    }
    if (!paneRef) {
      console.error('Failed to acquire host for sprites; attaching to container as fallback');
      paneRef = mapRef.getContainer();
      attachToContainer = true;
    }
    // Гарантувати створення канвасу
    ensureCanvas();
  } catch (e) {
    console.error('Error initializing sprites host:', e);
    ensureCanvas();
  }
  // Дебаг: опційний рендер маркерів‑точок (примусові видимі точки)
  try {
    const q = new URLSearchParams(location.search);
    const r = q.get('render');
    const dbg = (q.get('debug') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    debugMarkers = r === 'markers' || dbg.includes('markers');
    debugCanvasLog = dbg.includes('sprites') || dbg.includes('canvas');
    debugDrawLog = dbg.includes('draw');
    debugCross = dbg.includes('cross');
    forceFallbackDots = dbg.includes('points') || dbg.includes('dots') || dbg.includes('fallback');
    if (debugMarkers) {
      debugGroup = L.layerGroup().addTo(mapRef);
      // Опційний «smoke test»: кілька статичних точок для перевірки pane
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
    drawingSuspended = true;
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
      // Експортуємо діагностику canvas + origin для тестів/інспекції
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
  ctx.clearRect(0, 0, size.x, size.y);
  if (debugDrawLog && (drones.length || rockets.length)) {
    try {
      const origin = mapRef.containerPointToLayerPoint([0, 0]);
      console.log('[sprites.draw]', {
        drones: drones.length,
        rockets: rockets.length,
        origin: { x: origin.x, y: origin.y },
      });
    } catch {}
  }

  if (debugCross) {
    ctx.save();
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(size.x / 2 - 20, size.y / 2);
    ctx.lineTo(size.x / 2 + 20, size.y / 2);
    ctx.moveTo(size.x / 2, size.y / 2 - 20);
    ctx.lineTo(size.x / 2, size.y / 2 + 20);
    ctx.stroke();
    ctx.restore();
  }

  // хелпер: обмежити точку прямокутником вʼюпорта [0..W]x[0..H]
  function clampToViewport(pt, w, h) {
    const x = Math.max(0, Math.min(w, pt.x));
    const y = Math.max(0, Math.min(h, pt.y));
    return { x, y };
  }

  // хелпер малювання (надійний вибір найкращої екранної точки)
  function drawEntity(img, lat, lng, angleRad, size, fallbackColor) {
    const sizeCss = mapRef.getSize();
    // Обчислити обидва простори координат
    const cp = mapRef.latLngToContainerPoint([lat, lng]);
    const ptA = { x: cp.x, y: cp.y };
    // container bounds precheck (not used further; removal avoids lint warning)
    const origin = mapRef.containerPointToLayerPoint([0, 0]);
    const lp = mapRef.latLngToLayerPoint([lat, lng]);
    const ptB = { x: lp.x - origin.x, y: lp.y - origin.y };
    // Якщо канвас на контейнері — беремо координати контейнера; інакше — від origin шару
    const pt = attachToContainer ? ptA : ptB;
    if (!img || !img.complete) {
      // Намалювати просту точку‑фолбек, щоб вороги були видимі
      const r = Math.max(3, Math.min(8, Math.floor((size[0] + size[1]) / 10)));
      ctx.save();
      ctx.fillStyle = fallbackColor || '#ffffff';
      const visible = pt.x >= 0 && pt.x <= sizeCss.x && pt.y >= 0 && pt.y <= sizeCss.y;
      if (!visible) {
        const edge = clampToViewport(pt, sizeCss.x, sizeCss.y);
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(edge.x, edge.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return;
    }
    const w = size[0];
    const h = size[1];
    ctx.save();
    ctx.translate(pt.x, pt.y);
    ctx.rotate(angleRad);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  const origin = attachToContainer
    ? null
    : currentOrigin || mapRef.containerPointToLayerPoint([0, 0]);
  const size2 = mapRef.getSize();

  // Визначити, чи вмикати примусові точки‑фолбек (динамічно, на випадок гонок ініціалізації)
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
    const size = a.type === 'heavy' ? [45, 45] : [40, 40];
    const angle = typeof a.angleRad === 'number' ? a.angleRad : 0;
    const color = a.type === 'heavy' ? '#ff4444' : '#00ff88';
    if (useForceDots) {
      // Завжди малюємо видиму точку, не залежно від стану завантаження текстур
      const cp = mapRef.latLngToContainerPoint([a.position[0], a.position[1]]);
      const lp = mapRef.latLngToLayerPoint([a.position[0], a.position[1]]);
      const ptA = { x: cp.x, y: cp.y };
      const ptB = origin ? { x: lp.x - origin.x, y: lp.y - origin.y } : ptA;
      const inA =
        ptA.x >= -100 && ptA.x <= size2.x + 100 && ptA.y >= -100 && ptA.y <= size2.y + 100;
      const inB =
        ptB.x >= -100 && ptB.x <= size2.x + 100 && ptB.y >= -100 && ptB.y <= size2.y + 100;
      const pt = attachToContainer && inA ? ptA : inB ? ptB : inA ? ptA : ptB;
      ctx.save();
      ctx.fillStyle = color;
      const onScreen = pt.x >= 0 && pt.x <= size2.x && pt.y >= 0 && pt.y <= size2.y;
      if (!onScreen) {
        const edge = clampToViewport(pt, size2.x, size2.y);
        ctx.globalAlpha = 0.95;
        ctx.beginPath();
        ctx.arc(edge.x, edge.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        if (edge.x >= 0 && edge.x <= size2.x && edge.y >= 0 && edge.y <= size2.y) {
          drawnD++;
        }
      } else {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
        ctx.fill();
        drawnD++;
      }
      ctx.restore();
    } else {
      drawEntity(img, a.position[0], a.position[1], angle, size, color);
      // Оцінка видимості за центральною точкою
      const cp = mapRef.latLngToContainerPoint([a.position[0], a.position[1]]);
      const lp = mapRef.latLngToLayerPoint([a.position[0], a.position[1]]);
      const ptA = { x: cp.x, y: cp.y };
      const ptB = origin ? { x: lp.x - origin.x, y: lp.y - origin.y } : ptA;
      const inA =
        ptA.x >= -100 && ptA.x <= size2.x + 100 && ptA.y >= -100 && ptA.y <= size2.y + 100;
      const inB =
        ptB.x >= -100 && ptB.x <= size2.x + 100 && ptB.y >= -100 && ptB.y <= size2.y + 100;
      const pt = attachToContainer && inA ? ptA : inB ? ptB : inA ? ptA : ptB;
      if (pt.x >= 0 && pt.x <= size2.x && pt.y >= 0 && pt.y <= size2.y) {
        drawnD++;
      }
    }
  }

  // ракети
  let drawnR = 0;
  for (const r of rockets) {
    const angle = typeof r.angleRad === 'number' ? r.angleRad : 0;
    if (useForceDots) {
      const cp = mapRef.latLngToContainerPoint([r.position[0], r.position[1]]);
      const lp = mapRef.latLngToLayerPoint([r.position[0], r.position[1]]);
      const ptA = { x: cp.x, y: cp.y };
      const ptB = origin ? { x: lp.x - origin.x, y: lp.y - origin.y } : ptA;
      const inA =
        ptA.x >= -100 && ptA.x <= size2.x + 100 && ptA.y >= -100 && ptA.y <= size2.y + 100;
      const inB =
        ptB.x >= -100 && ptB.x <= size2.x + 100 && ptB.y >= -100 && ptB.y <= size2.y + 100;
      const pt = attachToContainer && inA ? ptA : inB ? ptB : inA ? ptA : ptB;
      ctx.save();
      ctx.fillStyle = '#ffaa00';
      const onScreen = pt.x >= 0 && pt.x <= size2.x && pt.y >= 0 && pt.y <= size2.y;
      if (!onScreen) {
        const edge = clampToViewport(pt, size2.x, size2.y);
        ctx.globalAlpha = 0.95;
        ctx.beginPath();
        ctx.arc(edge.x, edge.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        if (edge.x >= 0 && edge.x <= size2.x && edge.y >= 0 && edge.y <= size2.y) {
          drawnR++;
        }
      } else {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
        ctx.fill();
        drawnR++;
      }
      ctx.restore();
    } else {
      drawEntity(images.rocket, r.position[0], r.position[1], angle, [40, 40], '#ffaa00');
      const cp = mapRef.latLngToContainerPoint([r.position[0], r.position[1]]);
      const lp = mapRef.latLngToLayerPoint([r.position[0], r.position[1]]);
      const ptA = { x: cp.x, y: cp.y };
      const ptB = origin ? { x: lp.x - origin.x, y: lp.y - origin.y } : ptA;
      const inA =
        ptA.x >= -100 && ptA.x <= size2.x + 100 && ptA.y >= -100 && ptA.y <= size2.y + 100;
      const inB =
        ptB.x >= -100 && ptB.x <= size2.x + 100 && ptB.y >= -100 && ptB.y <= size2.y + 100;
      const pt = attachToContainer && inA ? ptA : inB ? ptB : inA ? ptA : ptB;
      if (pt.x >= 0 && pt.x <= size2.x && pt.y >= 0 && pt.y <= size2.y) {
        drawnR++;
      }
    }
  }

  // (дебаг‑маркери вже намальовані вище)
  try {
    const w = window || globalThis;
    if (w.__stats && w.__stats.sprites && w.__stats.sprites.drawn) {
      // Для debug=points гарантуємо хоча б один видимий індикатор
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
}
