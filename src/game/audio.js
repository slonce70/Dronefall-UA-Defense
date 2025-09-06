// Аудіо‑сигнал хвилі та короткий візуальний індикатор
export function triggerWaveAlarm(isSoundOn, alarmSound, alarmIndicator, gameSpeed) {
  if (isSoundOn) {
    try {
      alarmSound.currentTime = 0;
      alarmSound.play();
    } catch {}
  }
  if (alarmIndicator) {
    alarmIndicator.style.display = 'block';
    setTimeout(
      () => {
        alarmIndicator.style.display = 'none';
      },
      Math.max(800, 2000 / (gameSpeed || 1))
    );
  }
}
