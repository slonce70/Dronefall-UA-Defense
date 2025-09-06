// @ts-check
// Minimal logger with levels and env-aware defaults
const LEVELS = /** @type {const} */ ({
  silent: 0,
  error: 10,
  warn: 20,
  info: 30,
  debug: 40,
  trace: 50,
});

function detectDev() {
  let dev = false;
  try {
    // Vite style
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta && import.meta.env)
      dev = !!import.meta.env.DEV;
  } catch {}
  try {
    if (!dev && typeof process !== 'undefined' && process.env)
      dev = process.env.NODE_ENV !== 'production';
  } catch {}
  try {
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search);
      const dbg = q.get('debug');
      if (dbg === '1' || dbg === 'true') dev = true;
    }
  } catch {}
  return dev;
}

export class Logger {
  /**
   * @param {{ level?: keyof typeof LEVELS, scope?: string }} [opts]
   */
  constructor(opts) {
    const isDev = detectDev();
    const levelName = (opts && opts.level) || (isDev ? 'debug' : 'info');
    this.level = LEVELS[levelName] ?? LEVELS.info;
    this.scope = (opts && opts.scope) || '';
  }

  child(scope) {
    return new Logger({
      level: this.levelName(),
      scope: this.scope ? `${this.scope}:${scope}` : scope,
    });
  }

  levelName() {
    const entries = Object.entries(LEVELS);
    for (const [k, v] of entries)
      if (v === this.level) return /** @type {keyof typeof LEVELS} */ (k);
    return 'info';
  }

  setLevel(name) {
    if (name in LEVELS) this.level = LEVELS[name];
  }

  _fmt(msg, args) {
    return this.scope ? [`[${this.scope}] ${msg}`, ...args] : [msg, ...args];
  }

  trace(msg, ...args) {
    if (this.level >= LEVELS.trace) console.debug(...this._fmt(msg, args));
  }
  debug(msg, ...args) {
    if (this.level >= LEVELS.debug) console.debug(...this._fmt(msg, args));
  }
  info(msg, ...args) {
    if (this.level >= LEVELS.info) console.info(...this._fmt(msg, args));
  }
  warn(msg, ...args) {
    if (this.level >= LEVELS.warn) console.warn(...this._fmt(msg, args));
  }
  error(msg, ...args) {
    if (this.level >= LEVELS.error) console.error(...this._fmt(msg, args));
  }
}
