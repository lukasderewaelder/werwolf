// Startpunkt: Oberfläche zusammensetzen, Service Worker einrichten, erste Ansicht zeichnen.
import { S, ui, render, toast, dispatch } from './ui/core.js';
import './ui/home.js';
import './ui/setup.js';
import './ui/pages.js';
import './ui/game.js';
import './ui/modals.js';
import { bind } from './store-ref.js';
import { startMusic, stopMusic } from './audio.js';
import { buildScene } from './ui/scene.js';

bind(() => S);

function setupServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // Lokal entwickeln ohne Cache-Überraschungen; zum Testen des Offline-Betriebs ?sw=1 anhängen.
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  if (local && !location.search.includes('sw=1')) return;
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  const offerUpdate = (worker) => {
    const el = document.getElementById('update');
    if (!el) return;
    el.hidden = false;
    document.getElementById('btn-update').onclick = () => worker.postMessage('SKIP_WAITING');
  };
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    location.reload();
  });
  navigator.serviceWorker.register('sw.js').then((reg) => {
    if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(w); });
    });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch((err) => console.warn('Service Worker nicht registriert:', err));
}

/* Nachtmusik: läuft in der Nachtphase eines Spiels, sonst Stille. Start erst nach der ersten Berührung (iOS). */
let touched = false;
function syncMusic() {
  const g = S.game;
  const night = ui.view === 'game' && g && g.phase === 'night' && !(g.cfg.mode === 'digital' && g.dealIdx < g.cfg.players.length);
  if (night && touched) startMusic(); else stopMusic();
}
document.addEventListener('pointerdown', () => { if (!touched) { touched = true; syncMusic(); } }, { once: false });
import('./ui/core.js').then((m) => m.afterRender.push(syncMusic));

buildScene();
setupServiceWorker();
render();
window.__werwolf = { S, ui, render, dispatch };   // für Tests und Fehlersuche
export { toast };
