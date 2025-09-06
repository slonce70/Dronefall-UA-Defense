import { describe, test, expect, vi } from 'vitest';
import { TimerManager } from '../../src/core/TimerManager.js';

describe('TimerManager', () => {
  test('clears intervals and timeouts via clearAll', () => {
    vi.useFakeTimers();
    const tm = new TimerManager();
    let c = 0;
    tm.setInterval(() => c++, 100);
    tm.setTimeout(() => { c += 10; }, 200);
    vi.advanceTimersByTime(110);
    expect(c).toBe(1);
    tm.clearAll();
    vi.advanceTimersByTime(1000);
    expect(c).toBe(1); // no more changes
    vi.useRealTimers();
  });
});

