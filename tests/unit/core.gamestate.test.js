import { describe, it, expect } from 'vitest';
import { GameState } from '../../src/core/GameState.js';

describe('GameState', () => {
  it('sets and gets values', () => {
    const gs = new GameState({ a: 1 });
    expect(gs.get('a')).toBe(1);
    gs.set('a', 2);
    expect(gs.get('a')).toBe(2);
  });

  it('notifies subscribers', () => {
    const gs = new GameState({ money: 10 });
    let called = 0;
    gs.subscribe('money', () => called++);
    gs.set('money', 20);
    expect(called).toBe(1);
  });
});

