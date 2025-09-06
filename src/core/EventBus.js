// @ts-check
// Simple event bus for decoupled communication
// API: on(event, cb), off(event, cb), once(event, cb), emit(event, payload)
/**
 * @template T
 */
export class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._map = new Map();
  }

  /** @param {string} name @param {(data:any)=>void} cb */
  on(name, cb) {
    if (!name || typeof cb !== 'function') return () => {};
    const set = this._map.get(name) || new Set();
    set.add(cb);
    this._map.set(name, set);
    return () => this.off(name, cb);
  }

  /** @param {string} name @param {(data:any)=>void} cb */
  off(name, cb) {
    const set = this._map.get(name);
    if (!set) return;
    set.delete(cb);
    if (set.size === 0) this._map.delete(name);
  }

  /** @param {string} name @param {(data:any)=>void} cb */
  once(name, cb) {
    const off = this.on(name, (data) => {
      try {
        cb(data);
      } finally {
        off();
      }
    });
    return off;
  }

  /** @param {string} name @param {any} [data] */
  emit(name, data) {
    const set = this._map.get(name);
    if (!set || set.size === 0) return 0;
    for (const cb of Array.from(set)) {
      try {
        cb(data);
      } catch {}
    }
    return set.size;
  }
}
