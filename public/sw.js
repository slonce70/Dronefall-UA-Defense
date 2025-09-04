// Сервіс‑воркер з акуратним кешуванням.
// Часткові відповіді (206) не кешуються; запити з Range пропускаються — це усуває проблеми завантаження ресурсів.

// Versioned runtime cache; bump suffix on releases
const CACHE_NAME = 'dronefall-runtime-v5';
// Pre-cache manifest (relative paths; resolved against SW scope at install)
const PRE_CACHE = [
  // map and core sprites (both webp and png for safety)
  'assets/map.webp',
  'assets/map.png',
  'assets/drone.webp',
  'assets/drone.png',
  'assets/heavy-drone.webp',
  'assets/heavy-drone.png',
  'assets/rocket1.webp',
  'assets/rocket1.png',
  'assets/explosion.gif',
  'assets/telegram-icon.png',
  'assets/tiktok-logo.png',
];

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
      if (Array.isArray(PRE_CACHE) && PRE_CACHE.length) {
        try {
          const list = PRE_CACHE.map((p) => scopeUrl(p));
          await c.addAll(list);
        } catch {}
      }
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
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
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
    // Спочатку мережа для навігації (Network‑first)
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches
            .match(req)
            .then((r) => r || caches.match(new URL('index.html', self.registration.scope)))
        )
      );
      return;
    }

  // Статика: Cache‑first, але не кешуємо partial (206)
  const isStatic =
    /\.(png|gif|jpg|jpeg|webp|mp3|css|js)$/i.test(url.pathname) ||
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
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          }
          return res;
        })
    )
  );
});
