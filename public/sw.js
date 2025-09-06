// Сервіс‑воркер з акуратним кешуванням.
// Часткові відповіді (206) не кешуються; запити з Range пропускаються — це усуває проблеми завантаження ресурсів.

// Версія runtime‑кеша; підвищуємо суфікс при релізах
const CACHE_NAME = 'dronefall-runtime-v7';
// Від статичного PRE_CACHE відмовляємося — покладаємося на dist/precache-manifest.json
const PRE_CACHE = [];

function scopeUrl(path) {
  try {
    return new URL(path, self.registration.scope).toString();
  } catch {
    return path;
  }
}

self.addEventListener('install', (event) => {
  // Prepare pre-cache if list provided
  event.waitUntil(
    (async () => {
      const c = await caches.open(CACHE_NAME);
      // Статичний список порожній; основний pre-cache — з_manifest_а збірки
      try {
        const res = await fetch(new URL('precache-manifest.json', self.registration.scope), {
          cache: 'no-store',
        });
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length) {
            try {
              const scoped = list.map((p) => scopeUrl(p));
              await c.addAll(scoped);
            } catch {}
          }
        }
      } catch {}
    })()
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Увімкнути navigation preload для прискорення перших переходів
      try {
        if (self.registration.navigationPreload) {
          await self.registration.navigationPreload.enable();
        }
      } catch {}
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Лише GET і той самий origin
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  // Ніколи не перехоплюємо Range‑запити (можуть ламати аудіо/відео)
  if (req.headers && req.headers.has('range')) return;

  if (req.mode === 'navigate') {
    // Спочатку navigation preload або мережа, з кеш‑беком
    event.respondWith(
      (async () => {
        try {
          const preload = await event.preloadResponse;
          if (preload) {
            if (preload.ok && preload.status === 200) {
              try {
                // Клонируем preload Response ДО его использования
                const preloadClone = preload.clone();
                caches.open(CACHE_NAME).then((c) => c.put(req, preloadClone));
              } catch (e) {
                // Игнорируем ошибки клонирования - Response уже использован
                console.warn('SW: Failed to clone preload response for caching:', e.message);
              }
            }
            return preload;
          }
        } catch {}
        try {
          const res = await fetch(req);
          if (res.ok && res.status === 200) {
            try {
              // Клонируем Response ДО его использования
              const resClone = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(req, resClone));
            } catch (e) {
              // Игнорируем ошибки клонирования - Response уже использован
              console.warn('SW: Failed to clone fetch response for caching:', e.message);
            }
          }
          return res;
        } catch {
          const cacheMatch = (await caches.match(req)) || (await caches.match(new URL('index.html', self.registration.scope)));
          if (cacheMatch) return cacheMatch;
          // Offline fallback page if available
          return (
            (await caches.match(new URL('offline.html', self.registration.scope))) || new Response('<h1>Offline</h1>', { headers: { 'Content-Type': 'text/html' } })
          );
        }
      })()
    );
    return;
  }

  // Статика: Cache‑first, але не кешуємо partial (206)
  const isStatic =
    /\.(png|gif|jpg|jpeg|webp|svg|mp3|css|js|woff2?|ttf|otf)$/i.test(url.pathname) ||
    url.pathname.startsWith('/assets') ||
    url.pathname.startsWith('/_externos');
  if (!isStatic) return;

  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          const isPartial = res.status === 206 || res.headers.has('Content-Range');
          if (res.ok && res.status === 200 && !isPartial) {
            try {
              const copy = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(req, copy));
            } catch (e) {
              // Игнорируем ошибки клонирования - Response уже использован
              console.warn('SW: Failed to clone response for caching:', e.message);
            }
          }
          return res;
        })
    )
  );
});
