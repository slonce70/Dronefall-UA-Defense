// @ts-check
export class AssetValidator {
  constructor(root = '/') {
    this.root = root;
  }

  static findRefs(text) {
    const refs = new Set();
    const re1 = /['"`]\/assets\/[A-Za-z0-9_\-./]+['"`]/g;
    const re2 = /url\((?:\s*)['"]?\/assets\/[A-Za-z0-9_\-./]+['"]?(?:\s*)\)/g;
    for (const m of text.matchAll(re1)) refs.add(m[0].slice(1, -1));
    for (const m of text.matchAll(re2)) {
      const s = m[0]
        .replace(/^url\(/, '')
        .replace(/\)$/, '')
        .trim()
        .replace(/['"]/g, '');
      refs.add(s);
    }
    return Array.from(refs);
  }
}
