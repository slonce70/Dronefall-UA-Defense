import { describe, it, expect } from 'vitest';
import { waveSchedule } from '../../src/constants.js';

describe('waveSchedule', () => {
  it('starts with expected early intervals and then grows', () => {
    expect(waveSchedule[0]).toBe(10);
    expect(waveSchedule[1]).toBe(10);
    expect(waveSchedule[2]).toBe(30);
    expect(waveSchedule[3]).toBe(50);
    expect(waveSchedule[4]).toBe(70);
    // later entries increase in a consistent way
    expect(waveSchedule[5]).toBeGreaterThan(waveSchedule[4]);
  });
});
