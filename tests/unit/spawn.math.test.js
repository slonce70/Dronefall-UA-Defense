import { describe, it, expect } from 'vitest';
import { regionSpawnPoints } from '../../src/constants.js';

describe('regionSpawnPoints', () => {
  it('contains non-empty coordinate arrays for regions', () => {
    const regions = Object.keys(regionSpawnPoints);
    expect(regions.length).toBeGreaterThan(5);
    const first = regionSpawnPoints[regions[0]];
    expect(Array.isArray(first)).toBe(true);
    const [x, y] = first[0];
    expect(typeof x).toBe('number');
    expect(typeof y).toBe('number');
  });
});
