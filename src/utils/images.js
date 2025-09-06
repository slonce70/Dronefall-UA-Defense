// Утиліти для роботи з зображеннями

let __supportsWebP = null;
export function supportsWebP() {
  if (__supportsWebP != null) {
    return __supportsWebP;
  }
  try {
    const c = document.createElement('canvas');
    if (!c.getContext) {
      return (__supportsWebP = false);
    }
    __supportsWebP = c.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  } catch {
    __supportsWebP = false;
  }
  return __supportsWebP;
}

function toWebpCandidate(src) {
  if (/\.(png|jpg|jpeg)$/i.test(src)) {
    return src.replace(/\.(png|jpg|jpeg)$/i, '.webp');
  }
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
      // м'який збій — продовжуємо
    }
    onProgress(Math.floor((loaded / total) * 100));
    if (loaded === total) {
      onDone();
    }
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
          if (!res.ok) {
            throw new Error('load-failed');
          }
          const blob = await res.blob();
          await createImageBitmap(blob); // попереднє декодування
          tick(true);
          return;
        } catch {
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
