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
  box.style.position = 'fixed';
  box.style.right = '8px';
  box.style.bottom = '8px';
  box.style.zIndex = '10001';
  box.style.padding = '8px 10px';
  box.style.background = 'rgba(0,0,0,0.7)';
  box.style.color = '#fff';
  box.style.borderRadius = '8px';
  box.style.fontSize = '12px';
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
