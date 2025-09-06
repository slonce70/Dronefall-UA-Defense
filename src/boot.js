// Ранній бут‑модуль: звук, SW, гарячі клавіші, доступність

import { installErrorHandlers } from './core/errorHandler.js';

// 0) Глобальні обробники помилок
try {
  installErrorHandlers({ toast: false });
} catch {}

// 1) Ранній стан звуку з localStorage
try {
  const bg = document.getElementById('bgMusic');
  const alarm = document.getElementById('alarmSound');
  let on = true;
  try {
    const ss = localStorage.getItem('isSoundOn');
    if (ss !== null) on = JSON.parse(ss);
  } catch {}
  if (bg) bg.muted = !on;
  if (alarm) alarm.muted = !on;
} catch {}

// Клавіатурні скорочення: Пробіл — пауза; 1/2/3 — швидкість; M — звук
document.addEventListener('keydown', (e) => {
  const pause = document.getElementById('pauseButton');
  const s1 = document.getElementById('speed1x');
  const s2 = document.getElementById('speed2x');
  const s3 = document.getElementById('speed3x');
  const snd = document.getElementById('soundButton');
  if (!pause || !s1 || !s2 || !s3 || !snd) return;
  if (e.key === ' ') {
    e.preventDefault();
    pause.click();
  }
  if (e.key === '1') s1.click();
  if (e.key === '2') s2.click();
  if (e.key === '3') s3.click();
  if (e.key.toLowerCase() === 'm') snd.click();
});

// Service Worker: лише у продакшені; у dev — розреєструвати
(() => {
  if (!('serviceWorker' in navigator)) return;
  const isLocal =
    /^(localhost|127\.0\.0\.1)(:\\d+)?$/.test(location.host) ||
    location.hostname.endsWith('.local');
  if (isLocal) {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => regs.forEach((r) => r.unregister()))
      .catch(() => {});
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
})();

// Пауза при приховуванні вкладки (крім автоматизованих тестів)
if (!('webdriver' in navigator) || !navigator.webdriver) {
  document.addEventListener('visibilitychange', () => {
    const pause = document.getElementById('pauseButton');
    if (document.hidden && pause && pause.textContent !== '▶️') {
      pause.click();
    }
  });
}

// Донат‑кнопки без inline‑обробників (CSP‑готово)
function safeOpen(url) {
  try {
    const w = window.open(url, '_blank');
    if (w) w.opener = null;
  } catch {}
}
try {
  const dz = document.getElementById('donateZSU');
  if (dz) dz.addEventListener('click', () => safeOpen('https://send.monobank.ua/jar/2JbpBYkhMv'));
} catch {}
try {
  const dp = document.getElementById('donateProject');
  if (dp) dp.addEventListener('click', () => safeOpen('https://send.monobank.ua/jar/z1H8hEA96'));
} catch {}

// Доступність: фокус‑trap у стартовому діалозі
function trapFocus(modal) {
  const FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input[type="text"]:not([disabled])',
    'input[type="radio"]:not([disabled])',
    'input[type="checkbox"]:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ];
  function getEls() {
    return Array.from(modal.querySelectorAll(FOCUSABLE.join(',')));
  }
  function onKey(e) {
    if (e.key !== 'Tab') return;
    const els = getEls();
    if (els.length === 0) return;
    const first = els[0];
    const last = els[els.length - 1];
    const active = document.activeElement;
    if (e.shiftKey) {
      if (active === first || !modal.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
  modal.addEventListener('keydown', onKey);
  return () => modal.removeEventListener('keydown', onKey);
}

try {
  const preMenu = document.getElementById('preMenu');
  const startBtn = document.getElementById('startBtn');
  if (preMenu) {
    // Початковий фокус на старт
    setTimeout(() => startBtn?.focus(), 0);
    // Trap фокусу поки діалог відкритий
    const detach = trapFocus(preMenu);
    const mo = new MutationObserver(() => {
      if (preMenu.classList.contains('hidden') || preMenu.style.display === 'none') {
        detach();
        mo.disconnect();
      }
    });
    mo.observe(preMenu, { attributes: true, attributeFilter: ['style'] });
  }
} catch {}
