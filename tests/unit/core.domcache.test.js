import { describe, test, expect } from 'vitest';
import { DOMCache } from '../../src/core/DOMCache.js';

describe('DOMCache', () => {
  test('byId caches elements', () => {
    const el = document.createElement('div');
    el.id = 'x1';
    document.body.appendChild(el);
    const dc = new DOMCache();
    const a = dc.byId('x1');
    const b = dc.byId('x1');
    expect(a).toBe(el);
    expect(b).toBe(el);
    dc.clear();
    const c = dc.byId('x1');
    expect(c).toBe(el);
  });
});
/* @vitest-environment jsdom */
