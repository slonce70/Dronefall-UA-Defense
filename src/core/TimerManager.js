// @ts-check
export class TimerManager {
  constructor() {
    /** @type {Array<{id:number,type:'t'|'i'}>} */
    this._timers = [];
  }

  /**
   * Track a timeout
   * @param {Function} fn
   * @param {number} ms
   */
  setTimeout(fn, ms) {
    const id = setTimeout(() => {
      try {
        fn();
      } finally {
        this._forget(id, 't');
      }
    }, ms);
    this._timers.push({ id, type: 't' });
    return id;
  }

  /**
   * Track an interval
   * @param {Function} fn
   * @param {number} ms
   */
  setInterval(fn, ms) {
    const id = setInterval(fn, ms);
    this._timers.push({ id, type: 'i' });
    return id;
  }

  clearTimeout(id) {
    try {
      clearTimeout(id);
    } finally {
      this._forget(id, 't');
    }
  }

  clearInterval(id) {
    try {
      clearInterval(id);
    } finally {
      this._forget(id, 'i');
    }
  }

  clearAll() {
    for (const t of this._timers) {
      try {
        t.type === 't' ? clearTimeout(t.id) : clearInterval(t.id);
      } catch {}
    }
    this._timers = [];
  }

  _forget(id, type) {
    const i = this._timers.findIndex((t) => t.id === id && t.type === type);
    if (i !== -1) this._timers.splice(i, 1);
  }
}
