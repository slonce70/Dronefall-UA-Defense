// Оновлення UI‑поля грошей
export function updateMoney(el, money) {
  if (el) el.textContent = `💶 ${money}`;
}

export function updateUI(moneyEl, waveEl, scoreEl, money, wave, score) {
  updateMoney(moneyEl, money);
  if (waveEl) waveEl.textContent = `🌊 ${wave}`;
  if (scoreEl) scoreEl.textContent = `🎯 ${score}`;
}

export function showTargetNotification(region, gameSpeed = 1) {
  const t = document.createElement('div');
  t.style.position = 'fixed';
  t.style.top = '72%';
  t.style.left = '50%';
  t.style.transform = 'translate(-50%, -50%)';
  t.style.background = 'rgba(0, 0, 0, 0.8)';
  t.style.color = 'red';
  t.style.padding = '15px';
  t.style.borderRadius = '8px';
  t.style.fontSize = '13px';
  t.style.textAlign = 'center';
  t.style.zIndex = '10000';
  t.textContent = `Наступна ціль в ${region} області`;
  document.body.appendChild(t);
  setTimeout(
    () => {
      document.body.removeChild(t);
    },
    3000 / (gameSpeed || 1)
  );
}

export function showVictoryScreen(html) {
  // Гарантуємо, що існує лише один оверлей перемоги
  try {
    const old = document.getElementById('victoryOverlay');
    if (old) old.remove();
  } catch {}
  const t = document.createElement('div');
  t.id = 'victoryOverlay';
  t.style.position = 'fixed';
  t.style.top = '50%';
  t.style.left = '50%';
  t.style.transform = 'translate(-50%, -50%)';
  t.style.padding = '30px';
  t.style.background = '#111';
  t.style.color = '#fff';
  t.style.borderRadius = '12px';
  t.style.zIndex = '10000';
  t.style.boxShadow = '0 0 20px rgba(0,0,0,0.7)';
  t.style.fontSize = '18px';
  t.style.textAlign = 'center';
  t.innerHTML = html;
  document.body.appendChild(t);
}
