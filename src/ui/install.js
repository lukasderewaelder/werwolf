// „App installieren“: Chrome/Android über das Installationsfenster, iPad/iPhone mit Anleitung (Safari kennt keinen Knopf dafür).
import { ui, on, render, toast } from './core.js';
import { I } from './art.js';

let deferred = null;

export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const ua = () => navigator.userAgent || '';
// iPad-Safari meldet sich als Mac; echte Macs haben keinen Touchscreen.
export const isIOS = () => /iPhone|iPad|iPod/.test(ua()) || (/Macintosh/.test(ua()) && navigator.maxTouchPoints > 1);
export const isAndroid = () => /Android/.test(ua());

window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; render(); });
window.addEventListener('appinstalled', () => { deferred = null; toast('App installiert. Du findest sie auf dem Startbildschirm.'); render(); });

export const canOfferInstall = () => !isStandalone() && (deferred || isIOS() || isAndroid());

/** Knopf für Startseite und Optionen; leer, wenn die App schon installiert läuft oder das Gerät nichts anbietet. */
export function installButton({ primary = false } = {}) {
  if (!canOfferInstall()) return '';
  const label = isIOS() ? 'Zum Home-Bildschirm hinzufügen' : 'App installieren';
  return `<button class="btn ${primary ? 'primary' : ''} block" data-action="install">${I.download}<span>${label}</span></button>`;
}

on('install', async () => {
  if (deferred) {
    const ev = deferred; deferred = null;
    try { await ev.prompt(); await ev.userChoice; } catch { /* abgebrochen */ }
    render();
    return false;
  }
  ui.modal = { type: 'install-help' };
});
