// @ts-check
export function installErrorHandlers({ toast = false } = {}) {
  try {
    const w = window || globalThis;
    w.__stats = w.__stats || { errors: [] };
    window.addEventListener('error', (e) => {
      try {
        w.__stats.errors.push({
          t: Date.now(),
          kind: 'error',
          message: e.message,
          src: String(e.filename || ''),
          line: e.lineno,
        });
      } catch {}
      if (toast) showToast('Сталася помилка у застосунку');
    });
    window.addEventListener('unhandledrejection', (e) => {
      try {
        w.__stats.errors.push({
          t: Date.now(),
          kind: 'unhandledrejection',
          reason: String(e.reason),
        });
      } catch {}
      if (toast) showToast('Необроблена помилка');
    });
  } catch {}
}

function showToast(text) {
  try {
    const el = document.createElement('div');
    el.className = 'toast-notification';
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => {
      try {
        el.remove();
      } catch {}
    }, 3000);
  } catch {}
}
