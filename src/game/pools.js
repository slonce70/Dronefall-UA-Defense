// @ts-check
import { SimplePool } from '../core/pool.js';

function resetDrone(o) {
  o.type = 'light';
  o.position = [0, 0];
  o.start = [0, 0];
  o.control = [0, 0];
  o.target = [0, 0];
  o.totalLength = 0;
  o.t = 0;
  o.angleRad = 0;
  o.speed = 0;
  o.speedOriginal = 0;
  o.hp = 0;
}
function resetRocket(o) {
  o.position = [0, 0];
  o.angleRad = 0;
  o.target = [0, 0];
  o.speed = 0;
  o.speedOriginal = 0;
  o.hp = 0;
}

export const dronePool = new SimplePool(() => ({}), resetDrone);
export const rocketPool = new SimplePool(() => ({}), resetRocket);
