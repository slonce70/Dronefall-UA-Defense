// Утиліти для роботи з кривими Безьє

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
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const midX = start[0] + dx / 2;
  const midY = start[1] + dy / 2;
  const nx = -dy / dist;
  const ny = dx / dist;
  const offset = (0.7 * Math.random() + 0.1) * dist;
  const sign = Math.random() < 0.5 ? 1 : -1;
  return [midX + nx * offset * sign, midY + ny * offset * sign];
}
