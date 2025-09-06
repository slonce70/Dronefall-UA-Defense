// @ts-check
// Generic requestAnimationFrame-based game loop with dt and speed handling

export function startGameLoop(ctx) {
  // ctx: { getGameOver, getGameWon, getSpeed, onFrame(now, dt) }
  let last = (typeof performance !== 'undefined' && performance.now()) || Date.now();
  function step(now) {
    if (ctx.getGameOver() || ctx.getGameWon()) return;
    const dt = (now - last) / 1000;
    last = now;
    try {
      ctx.onFrame(now, dt * (ctx.getSpeed ? ctx.getSpeed() || 1 : 1));
    } catch {}
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
