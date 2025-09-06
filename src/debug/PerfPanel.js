// @ts-check
export function attachPerfPanel() {
  try {
    const q = new URLSearchParams(location.search);
    const dbg = (q.get('debug') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!dbg.includes('perf')) return;
  } catch {
    return;
  }
  const box = document.createElement('div');
  box.className = 'perf-panel';
  document.body.appendChild(box);
  function tick() {
    try {
      const w = window || globalThis;
      const s = w.__stats || {};
      const drawn = s.sprites?.drawn || { drones: 0, rockets: 0 };
      box.textContent = `frames:${s.drawFrames || 0} drones:${drawn.drones} rockets:${drawn.rockets}`;
    } catch {}
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
