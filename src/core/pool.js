// @ts-check
export class SimplePool {
  /**
   * @param {() => any} factory
   * @param {(obj:any)=>void} [reset]
   */
  constructor(factory, reset) {
    this._pool = [];
    this._factory = factory;
    this._reset = reset || null;
  }
  acquire() {
    const obj = this._pool.pop() || this._factory();
    if (this._reset) this._reset(obj);
    return obj;
  }
  /** @param {any} obj */
  release(obj) {
    if (!obj) return;
    this._pool.push(obj);
  }
  size() {
    return this._pool.length;
  }
}
