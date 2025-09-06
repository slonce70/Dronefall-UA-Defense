// @ts-check
// Small helpers to construct DOM safely without using innerHTML.

/**
 * Create an element with optional attributes and safe text.
 * @param {string} tag
 * @param {{ id?: string, className?: string, attrs?: Record<string,string> }} [opts]
 * @param {string} [text]
 */
export function el(tag, opts = {}, text) {
  const node = document.createElement(tag);
  if (opts.id) node.id = opts.id;
  if (opts.className) node.className = opts.className;
  if (opts.attrs) {
    for (const [k, v] of Object.entries(opts.attrs)) {
      try {
        node.setAttribute(k, String(v));
      } catch {}
    }
  }
  if (typeof text === 'string') setText(node, text);
  return node;
}

/** Set safe textContent, never HTML. */
export function setText(node, text) {
  try {
    node.textContent = String(text);
  } catch {}
}

/** Append multiple children, skipping null/undefined. */
export function append(parent, ...children) {
  for (const c of children) if (c) parent.appendChild(c);
}

/** Remove all children from a node. */
export function clear(node) {
  try {
    while (node.firstChild) node.removeChild(node.firstChild);
  } catch {}
}

/**
 * Create a standard full‑screen overlay container with content box.
 * @param {{ id?: string, containerClass?: string, boxClass?: string }} [opts]
 */
export function createOverlay(opts = {}) {
  const wrap = el('div', {
    id: opts.id || '',
    className: opts.containerClass || 'overlay-container',
  });
  const box = el('div', { className: opts.boxClass || 'overlay-content' });
  append(wrap, box);
  return { wrap, box };
}

/**
 * Open URL safely in a new tab without giving it access to the opener.
 * @param {string} url
 */
export function safeOpen(url) {
  try {
    const w = window.open(url, '_blank');
    if (w) w.opener = null;
  } catch {}
}
