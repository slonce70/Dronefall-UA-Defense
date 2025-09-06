// @ts-check
export function installDebugApi({ map, spawner }) {
  try {
    const w = window || globalThis;
    // Дозволяємо дебаг лише у dev або за явним прапорцем ?debug=1/true
    let enabled = false;
    try {
      const q = new URLSearchParams(location.search);
      const dbg = q.get('debug');
      let isDev = false;
      try {
        isDev = !!(import.meta && import.meta.env && import.meta.env.DEV);
      } catch {}
      enabled = isDev || dbg === '1' || dbg === 'true';
    } catch {}
    if (!enabled) return;
    w.__debug = {
      spawnWave: (t = 1, a = 0, n = 0) => {
        try {
          spawner && spawner.spawnWave(t, a, n);
        } catch (e) {
          console.warn('__debug.spawnWave failed', e);
        }
      },
      stats: () => w.__stats,
      panTo: (lat, lng, zoom) => {
        try {
          map && map.setView([lat, lng], typeof zoom === 'number' ? zoom : map.getZoom());
        } catch (e) {
          console.warn('__debug.panTo failed', e);
        }
      },
    };
  } catch {}
}
