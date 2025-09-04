import { describe, it, expect } from 'vitest';
import { isPointOnMap } from '../../src/map.js';
import { MAP_WIDTH, MAP_HEIGHT } from '../../src/constants.js';

describe('isPointOnMap (bbox fallback)', () => {
  it('returns true for points inside bbox when canvas is not ready', () => {
    const canvas = { width: 0, height: 0 };
    expect(isPointOnMap(canvas, 10, 10)).toBe(true);
    expect(isPointOnMap(canvas, MAP_WIDTH - 1, MAP_HEIGHT - 1)).toBe(true);
  });

  it('returns false for points outside bbox when canvas is not ready', () => {
    const canvas = { width: 0, height: 0 };
    expect(isPointOnMap(canvas, -1, 10)).toBe(false);
    expect(isPointOnMap(canvas, 10, -1)).toBe(false);
    expect(isPointOnMap(canvas, MAP_WIDTH + 1, 10)).toBe(false);
    expect(isPointOnMap(canvas, 10, MAP_HEIGHT + 1)).toBe(false);
  });

  it('uses bbox when getContext is unavailable', () => {
    const canvas = { width: 100, height: 100, getContext: () => null };
    expect(isPointOnMap(canvas, 50, 50)).toBe(true);
    expect(isPointOnMap(canvas, MAP_WIDTH + 100, MAP_HEIGHT + 100)).toBe(false);
  });
});

