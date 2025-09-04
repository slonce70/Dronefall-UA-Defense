import { describe, it, expect } from 'vitest';
import { getRandomTarget } from '../../src/spawn.js';

describe('target selection fallback', () => {
  it('prefers defense point when allowed and alive exists', () => {
    const def = [{ lat: 1, lng: 2, alive: true }];
    const t = getRandomTarget(true, def, [], null);
    expect(t).toBeTruthy();
    expect([1, 2]).toContain(t.lat);
  });

  it('falls back to PVO when no alive defense (deterministic rand)', () => {
    const orig = Math.random;
    Math.random = () => 0.1; // ensure PVO branch
    const pvoList = [{ latlng: { lat: 5, lng: 6 } }];
    const t = getRandomTarget(false, [], pvoList, null);
    Math.random = orig;
    expect(t).toEqual({ lat: 5, lng: 6 });
  });

  it('falls back to airport when PVO invalid and rand < 0.1', () => {
    const orig = Math.random;
    Math.random = () => 0.05; // ensure airport branch
    const airport = { lat: 9, lng: 10, alive: true };
    const t = getRandomTarget(false, [], [{ latlng: { lat: NaN, lng: NaN } }], airport);
    Math.random = orig;
    expect(t).toEqual({ lat: 9, lng: 10 });
  });

  it('returns null when nothing is targetable', () => {
    const t = getRandomTarget(false, [], [], null);
    expect(t).toBeNull();
  });
});
