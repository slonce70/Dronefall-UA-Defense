// Оновлення UI‑поля грошей
export function updateMoney(el, money) {
  if (el) {
    el.textContent = `💶 ${money}`;
  }
}

export function updateUI(moneyEl, waveEl, scoreEl, money, wave, score) {
  updateMoney(moneyEl, money);
  if (waveEl) {
    waveEl.textContent = `🌊 ${wave}`;
  }
  if (scoreEl) {
    scoreEl.textContent = `🎯 ${score}`;
  }
}

export function showTargetNotification(region, gameSpeed = 1) {
  const t = document.createElement('div');
  t.className = 'toast-notification';
  t.role = 'status';
  t.textContent = `Наступна ціль в ${region} області`;
  document.body.appendChild(t);
  const ttl = Math.max(1000, 3000 / (gameSpeed || 1));
  setTimeout(() => {
    try {
      document.body.removeChild(t);
    } catch {}
  }, ttl);
}

import { createOverlay, el, setText, append } from './utils/DOMSecurity.js';

/**
 * Показати оверлей перемоги без використання innerHTML.
 * Сумісність: якщо передано рядок, він буде показаний як plain‑text.
 * Рекомендовано: викликати з об'єктом { message, buttons }.
 * @param {string|{ message: string, buttons?: Array<{ label: string, onClick: () => void, variant?: 'primary'|'secondary'}> }} content
 */
export function showVictoryScreen(content) {
  // Гарантуємо, що існує лише один оверлей перемоги
  try {
    const old = document.getElementById('victoryOverlay');
    if (old) old.remove();
  } catch {}

  const { wrap, box } = createOverlay({ id: 'victoryOverlay' });

  if (typeof content === 'string') {
    // Back‑compat: показати як текст (без HTML)
    const p = el('div');
    setText(p, content);
    append(box, p);
  } else if (content && typeof content === 'object') {
    const msg = el('div');
    setText(msg, content.message || '');
    append(box, msg);
    if (Array.isArray(content.buttons)) {
      const row = el('div', { className: 'overlay-actions' });
      for (const b of content.buttons) {
        const btn = el('button', {
          className: b.variant === 'secondary' ? 'btn-secondary' : 'btn-primary',
        });
        setText(btn, b.label);
        try {
          btn.addEventListener('click', () => b.onClick && b.onClick());
        } catch {}
        row.appendChild(btn);
      }
      append(box, row);
    }
  }

  document.body.appendChild(wrap);
}

// Експортуємо safeOpen для випадків, коли його треба викликати з інших модулів UI
export { safeOpen } from './utils/DOMSecurity.js';
