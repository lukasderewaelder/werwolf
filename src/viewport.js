// Sichtbare Höhe der App. Auf manchen Android-Geräten (installierte App mit Statusleiste) meldet 100dvh mehr Höhe,
// als wirklich sichtbar ist, und die untere Fußleiste ragt aus dem Bildschirm. Darum nehmen wir das kleinste aller
// Höhenmaße des Browsers und lassen zusätzlich einen einstellbaren unteren Abstand zu (Optionen).
const root = document.documentElement;

export function measureHeight() {
  const cands = [window.innerHeight, window.visualViewport?.height, root.clientHeight].filter((h) => Number.isFinite(h) && h > 100);
  return cands.length ? Math.floor(Math.min(...cands)) : null;
}

export function fitViewport(extra = 0) {
  const h = measureHeight();
  if (h) root.style.setProperty('--app-h', `${h}px`);
  root.style.setProperty('--extra-b', `${Math.max(0, Math.min(160, Number(extra) || 0))}px`);
}

/** Bei jeder Größenänderung neu messen, auch kurz nach dem Start (Android meldet die endgültige Höhe oft verspätet). */
export function watchViewport(getExtra) {
  const run = () => fitViewport(getExtra());
  run();
  window.addEventListener('resize', run);
  window.visualViewport?.addEventListener('resize', run);
  window.addEventListener('orientationchange', () => { run(); setTimeout(run, 300); });
  window.addEventListener('pageshow', run);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') run(); });
  for (const ms of [100, 500, 1500, 3000]) setTimeout(run, ms);
}
