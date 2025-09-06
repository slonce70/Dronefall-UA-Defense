// Перетягування елемента за хендл — підтримує мишу і дотики (Pointer Events)
export function makeDraggable(target, handle) {
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let baseLeft = 0;
  let baseTop = 0;

  function onPointerDown(ev) {
    try {
      handle.setPointerCapture?.(ev.pointerId);
    } catch {}
    dragging = true;
    startX = ev.clientX;
    startY = ev.clientY;
    baseLeft = target.offsetLeft;
    baseTop = target.offsetTop;
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    ev.preventDefault();
  }
  function onPointerMove(ev) {
    if (!dragging) return;
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    target.style.left = baseLeft + dx + 'px';
    target.style.top = baseTop + dy + 'px';
  }
  function onPointerUp(ev) {
    dragging = false;
    try {
      handle.releasePointerCapture?.(ev.pointerId);
    } catch {}
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  }

  // touch-action налаштовано у CSS (#dragHandle)
  handle.addEventListener('pointerdown', onPointerDown);
}
