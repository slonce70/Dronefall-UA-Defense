// @ts-check
// Centralized reactive state with optional persistence
/** @typedef {(key:string, value:any, prev:any)=>void} StateListener */

function createSafeStorage() {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {}
  // Fallback in non-browser envs (tests)
  const map = new Map();
  return {
    getItem(k) {
      return map.has(k) ? String(map.get(k)) : null;
    },
    setItem(k, v) {
      map.set(k, String(v));
    },
    removeItem(k) {
      map.delete(k);
    },
  };
}

export class GameState {
  constructor(initial = {}) {
    /** @type {Record<string, any>} */
    this._state = { ...initial };
    /** @type {Map<string, Set<StateListener>>} */
    this._listeners = new Map();
    /** @type {Set<StateListener>} */
    this._any = new Set();
    this._storage = createSafeStorage();
    /** @type {Set<string>} */
    this._persistKeys = new Set();
  }

  /** @template T @param {string} key @param {T} value */
  set(key, value) {
    const prev = this._state[key];
    if (prev === value) return;
    this._state[key] = value;
    if (this._persistKeys.has(key)) {
      try {
        this._storage.setItem(`game:${key}`, JSON.stringify(value));
      } catch {}
    }
    const ls = this._listeners.get(key);
    if (ls) {
      for (const cb of Array.from(ls)) {
        try {
          cb(key, value, prev);
        } catch {}
      }
    }
    for (const cb of Array.from(this._any)) {
      try {
        cb(key, value, prev);
      } catch {}
    }
  }

  /** @param {Partial<Record<string, any>>} patch */
  patch(patch) {
    for (const [k, v] of Object.entries(patch)) {
      this.set(k, v);
    }
  }

  /** @template T @param {string} key @param {(cur:T)=>T} fn */
  update(key, fn) {
    const next = fn(this._state[key]);
    this.set(key, next);
  }

  /** @returns {Record<string, any>} */
  snapshot() {
    return { ...this._state };
  }

  /** @template T @param {string} key @returns {T} */
  get(key) {
    return this._state[key];
  }

  /** @param {string} key @param {StateListener} cb */
  subscribe(key, cb) {
    if (key === '*') {
      this._any.add(cb);
      return () => this._any.delete(cb);
    }
    const set = this._listeners.get(key) || new Set();
    set.add(cb);
    this._listeners.set(key, set);
    return () => {
      const s = this._listeners.get(key);
      if (!s) return;
      s.delete(cb);
      if (s.size === 0) this._listeners.delete(key);
    };
  }

  /** @param {string[]} keys */
  enablePersistence(keys) {
    for (const k of keys) {
      this._persistKeys.add(k);
    }
    // seed from storage
    for (const k of keys) {
      try {
        const raw = this._storage.getItem(`game:${k}`);
        if (raw != null) {
          this._state[k] = JSON.parse(raw);
        }
      } catch {}
    }
  }
}
