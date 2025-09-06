import { describe, it, expect } from 'vitest';
import { Logger } from '../../src/core/Logger.js';

describe('Logger', () => {
  it('respects log level', () => {
    const l = new Logger({ level: 'warn' });
    expect(l.levelName()).toBe('warn');
    // should not throw
    l.info('nope');
    l.warn('yep');
    l.error('err');
  });
});

