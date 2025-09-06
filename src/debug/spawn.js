// Полегшені допоміжники для візуалізації спавнів та збору рантайм‑статистики

function isDebugFlagOn(key = 'spawns') {
  try {
    const q = new URLSearchParams(location.search);
    const v = q.get('debug');
    if (!v) {
      return false;
    }
    // Увімкнути, якщо debug=1, debug=true або список містить ключ (напр., debug=spawns)
    return v === '1' || v === 'true' || v.split(',').includes(key);
  } catch {
    return false;
  }
}

export function debugSpawn(map, start, target, _type = 'light', gameSpeed = 1, ttlMs = 1500) {
  if (!map || !isDebugFlagOn('spawns')) {
    return;
  }
  try {
    const startMarker = L.circleMarker(start, {
      radius: 4,
      color: '#00ff88',
      weight: 2,
      fillOpacity: 0.7,
    });
    const endMarker = L.circleMarker(target, {
      radius: 4,
      color: '#ff0088',
      weight: 2,
      fillOpacity: 0.7,
    });
    const line = L.polyline([start, target], { color: '#00aaff', weight: 2, dashArray: '4,3' });
    startMarker.addTo(map);
    endMarker.addTo(map);
    line.addTo(map);
    setTimeout(
      () => {
        try {
          map.removeLayer(startMarker);
        } catch {}
        try {
          map.removeLayer(endMarker);
        } catch {}
        try {
          map.removeLayer(line);
        } catch {}
      },
      Math.max(300, ttlMs / (gameSpeed || 1))
    );
  } catch {}
}

export function statsLogSpawn(type, start, target, wave) {
  try {
    const w = window || globalThis;
    if (!w.__stats) {
      return;
    }
    const item = {
      t: Date.now(),
      type,
      start: Array.isArray(start) ? start.slice() : start,
      target: Array.isArray(target) ? target.slice() : target,
      wave: typeof wave === 'number' ? wave : null,
    };
    const arr = w.__stats.lastSpawns || (w.__stats.lastSpawns = []);
    arr.push(item);
    if (arr.length > 100) {
      arr.shift();
    }
  } catch {}
}
