import { describe, it, expect } from 'vitest';
import { computeWaveComposition } from '../../src/game/waves.js';
import { FIXED_TOTAL_ENEMIES } from '../../src/constants.js';

describe('computeWaveComposition', () => {
  it('returns expected early composition (<18)', () => {
    const w0 = computeWaveComposition(0);
    expect(w0.light).toBe(5);
    expect(w0.rockets).toBe(0);
    expect(w0.heavy).toBe(0);

    const w6 = computeWaveComposition(6);
    expect(w6.heavy).toBeGreaterThan(0);
    expect(w6.light).toBeGreaterThan(0);
  });

  it('keeps fixed total after 18', () => {
    for (const wave of [18, 25, 40, 80]) {
      const c = computeWaveComposition(wave);
      const total = c.light + c.heavy + c.rockets;
      expect(total).toBe(FIXED_TOTAL_ENEMIES);
    }
  });
});
