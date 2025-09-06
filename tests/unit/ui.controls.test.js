// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { setupSpeedAndSoundControls } from '../../src/ui/controls.js';

function btn(id) {
  const b = document.createElement('button');
  b.id = id;
  document.body.appendChild(b);
  return b;
}

describe('UI Controls', () => {
  it('toggles speed and pause', () => {
    const soundButton = btn('soundButton');
    const alarmSound = document.createElement('audio');
    const speed1 = btn('speed1x');
    const speed2 = btn('speed2x');
    const speed3 = btn('speed3x');
    const pauseButton = btn('pauseButton');
    let speed = 1;
    let soundOn = true;
    setupSpeedAndSoundControls({
      soundButton,
      alarmSound,
      speed1,
      speed2,
      speed3,
      pauseButton,
      getGameSpeed: () => speed,
      setGameSpeed: (v) => (speed = v),
      getIsSoundOn: () => soundOn,
      setIsSoundOn: (v) => (soundOn = v),
    });
    speed2.click();
    expect(speed).toBe(2);
    pauseButton.click();
    expect(speed).toBe(0);
    pauseButton.click();
    expect(speed).toBeGreaterThan(0);
    soundButton.click();
    expect(soundOn).toBe(false);
  });
});

