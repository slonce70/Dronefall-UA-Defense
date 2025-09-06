// @ts-check
export class DOMCache {
  constructor() {
    /** @type {Map<string, HTMLElement|null>} */
    this._byId = new Map();
  }

  /** Get element by id with memoization. */
  byId(id) {
    if (this._byId.has(id)) return this._byId.get(id) || null;
    const el = /** @type {HTMLElement|null} */ (document.getElementById(id));
    this._byId.set(id, el);
    return el;
  }

  /** Clear all cached references. */
  clear() {
    this._byId.clear();
  }
}
