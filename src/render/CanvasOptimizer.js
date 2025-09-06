// @ts-check

/**
 * Simple union-rect optimizer for canvas clearing and partial blit.
 * Works in CSS pixel coordinates (before DPR transform).
 */
export class CanvasOptimizer {
  constructor() {
    this.reset();
  }

  reset() {
    /** @type {{x:number,y:number,w:number,h:number}|null} */
    this.union = null;
  }

  addRect(x, y, w, h) {
    const r = { x, y, w, h };
    if (!this.union) {
      this.union = { ...r };
      return;
    }
    const u = this.union;
    const x1 = Math.min(u.x, r.x);
    const y1 = Math.min(u.y, r.y);
    const x2 = Math.max(u.x + u.w, r.x + r.w);
    const y2 = Math.max(u.y + u.h, r.y + r.h);
    this.union = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  }

  /**
   * Clear region on the given 2D context in CSS coordinates.
   * When dpr>1 and using offscreen, clearRect still respects transform.
   */
  clearRegion(ctx, viewportW, viewportH, coverageThreshold = 0.7) {
    const u = this.union;
    if (!u) {
      // nothing to draw
      ctx.clearRect(0, 0, viewportW, viewportH);
      return { clearedFull: true, rect: { x: 0, y: 0, w: viewportW, h: viewportH } };
    }
    const cover = (u.w * u.h) / (viewportW * viewportH);
    if (cover >= coverageThreshold) {
      ctx.clearRect(0, 0, viewportW, viewportH);
      return { clearedFull: true, rect: { x: 0, y: 0, w: viewportW, h: viewportH } };
    }
    ctx.clearRect(u.x - 2, u.y - 2, u.w + 4, u.h + 4);
    return {
      clearedFull: false,
      rect: { x: Math.max(0, u.x - 2), y: Math.max(0, u.y - 2), w: u.w + 4, h: u.h + 4 },
    };
  }
}
