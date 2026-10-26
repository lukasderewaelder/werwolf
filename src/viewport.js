// Sichtbare Höhe der App. Auf manchen Android-Geräten (installierte App mit Statusleiste) meldet 100dvh mehr Höhe,
// als wirklich sichtbar ist, und die untere Fußleiste ragt aus dem Bildschirm. Darum nehmen wir das kleinste aller
// Höhenmaße des Browsers.
const root = document.documentElement;

export function measureHeight() {
  const cands = [window.innerHeight, window.visualViewport?.height, root.clientHeight];
  // Am Handy hochkant ist der nutzbare Bildschirm eine zusätzliche Obergrenze, falls der Browser zu viel Höhe meldet.
  if (window.innerWidth < 700 && window.innerHeight > window.innerWidth) cands.push(window.screen?.availHeight);
  const ok = cands.filter((h) => Number.isFinite(h) && h > 100);
  return ok.length ? Math.floor(Math.min(...ok)) : null;
}

export function fitViewport() {
  const h = measureHeight();
  if (h) root.style.setProperty('--app-h', `${h}px`);
}

/** Bei jeder Größenänderung neu messen, auch kurz nach dem Start (Android meldet die endgültige Höhe oft verspätet). */
export function watchViewport() {
  const run = () => fitViewport();
  run();
  window.addEventListener('resize', run);
  window.visualViewport?.addEventListener('resize', run);
  window.addEventListener('orientationchange', () => { run(); setTimeout(run, 300); });
  window.addEventListener('pageshow', run);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') run(); });
  for (const ms of [100, 500, 1500, 3000]) setTimeout(run, ms);
}
