// Аудіо‑сигнал хвилі та короткий візуальний індикатор
export function triggerWaveAlarm(isSoundOn, alarmSound, alarmIndicator, gameSpeed) {
  if (isSoundOn) {
    try {
      alarmSound.currentTime = 0;
      alarmSound.play();
    } catch {}
  }
  alarmIndicator.style.display = 'block';
  alarmIndicator.classList.add('blinking');
  setTimeout(
    () => {
      alarmIndicator.style.display = 'none';
      alarmIndicator.classList.remove('blinking');
    },
    6000 / (gameSpeed || 1)
  );
}
