// Допоміжні утиліти

let __supportsWebP = null;
export function supportsWebP() {
  if (__supportsWebP != null) return __supportsWebP;
  try {
    const c = document.createElement('canvas');
    if (!c.getContext) return (__supportsWebP = false);
    __supportsWebP = c.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  } catch {
    __supportsWebP = false;
  }
  return __supportsWebP;
}

function toWebpCandidate(src) {
  if (/\.(png|jpg|jpeg)$/i.test(src)) return src.replace(/\.(png|jpg|jpeg)$/i, '.webp');
  return null;
}

export function bestImageSrc(src) {
  const cand = toWebpCandidate(src);
  return cand && supportsWebP() ? cand : src;
}

// Додає cache‑bust у dev, щоб уникати застарілого кешу/проксі
export function withCacheBust(src) {
  try {
    // Vite підставляє значення import.meta.env.DEV під час збірки
    const isDev =
      typeof import.meta !== 'undefined' && import.meta && import.meta.env && import.meta.env.DEV;
    if (isDev) {
      const q = `v=${Date.now().toString(36)}`;
      return src.includes('?') ? `${src}&${q}` : `${src}?${q}`;
    }
  } catch {}
  return src;
}

// Встановити src для Image з пріоритетом WebP та автоматичним запасним PNG/JPEG
export function setImageSrcWithFallback(img, originalSrc, onLoad) {
  const primary = bestImageSrc(originalSrc);
  img.onload = onLoad || null;
  img.onerror = () => {
    try {
      if (primary !== originalSrc) {
        img.onerror = null;
        img.src = withCacheBust(originalSrc);
      }
    } catch {}
  };
  img.src = withCacheBust(primary);
}

export function preloadImages(assets, onProgress, onDone) {
  let loaded = 0;
  const total = assets.length;

  function tick(ok) {
    loaded++;
    if (!ok) {
      // м’який збій — продовжуємо
    }
    onProgress(Math.floor((loaded / total) * 100));
    if (loaded === total) onDone();
  }

  const canBitmap = typeof createImageBitmap === 'function';
  let isDev = false;
  try {
    isDev = typeof import.meta !== 'undefined' && import.meta?.env?.DEV;
  } catch {}
  const cacheMode = isDev ? 'no-store' : 'default';
  assets.forEach(async (_src0) => {
    const primary = bestImageSrc(_src0);
    const src = withCacheBust(primary);
    try {
      if (canBitmap && /\.(png|gif|jpg|jpeg|webp)$/i.test(src)) {
        try {
          const res = await fetch(src, { cache: cacheMode });
          if (!res.ok) throw new Error('load-failed');
          const blob = await res.blob();
          await createImageBitmap(blob); // попереднє декодування
          tick(true);
          return;
        } catch (e) {
          // запасний шлях: оригінальне розширення
          const orig = withCacheBust(_src0);
          const res2 = await fetch(orig, { cache: cacheMode });
          const blob2 = await res2.blob();
          await createImageBitmap(blob2);
          tick(true);
          return;
        }
      }
    } catch {
      console.warn('Bitmap preload failed, falling back:', src);
    }
    const img = new Image();
    img.onload = () => tick(true);
    img.onerror = () => {
      // запасний шлях: оригінал
      img.onerror = () => tick(false);
      img.src = withCacheBust(_src0);
    };
    img.src = src;
  });
}

export function bezierPoint(p0, p1, p2, t) {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  return [uu * p0[0] + 2 * u * t * p1[0] + tt * p2[0], uu * p0[1] + 2 * u * t * p1[1] + tt * p2[1]];
}

export function bezierTangent(p0, p1, p2, t) {
  const u = 1 - t;
  return [
    2 * u * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]),
    2 * u * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]),
  ];
}

export function approximateBezierLength(p0, p1, p2, segments = 10) {
  let len = 0;
  let prev = bezierPoint(p0, p1, p2, 0);
  for (let i = 1; i <= segments; i++) {
    const pt = bezierPoint(p0, p1, p2, i / segments);
    const dx = pt[0] - prev[0];
    const dy = pt[1] - prev[1];
    len += Math.sqrt(dx * dx + dy * dy);
    prev = pt;
  }
  return len;
}

export function generateControlPoint(start, end) {
  let dx = end[0] - start[0];
  let dy = end[1] - start[1];
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const midX = start[0] + dx / 2;
  const midY = start[1] + dy / 2;
  const nx = -dy / dist;
  const ny = dx / dist;
  const offset = (0.7 * Math.random() + 0.1) * dist;
  const sign = Math.random() < 0.5 ? 1 : -1;
  return [midX + nx * offset * sign, midY + ny * offset * sign];
}
