import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../../src/core/EventBus.js';

describe('EventBus', () => {
  it('emits to listeners', () => {
    const bus = new EventBus();
    const fn = vi.fn();
    bus.on('ping', fn);
    bus.emit('ping', { a: 1 });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith({ a: 1 });
  });

  it('once removes listener after first call', () => {
    const bus = new EventBus();
    const fn = vi.fn();
    bus.once('pong', fn);
    bus.emit('pong');
    bus.emit('pong');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

