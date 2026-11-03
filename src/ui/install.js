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

/** Installationsschritte für Anleitung und Hilfedialog (eine Quelle, feste Texte mit Hervorhebung). */
export const INSTALL = {
  ios: {
    title: 'iPhone und iPad',
    steps: ['Öffne die Seite in <b>Safari</b>.', 'Tippe auf <b>Teilen</b> (Quadrat mit Pfeil nach oben).', 'Wähle <b>Zum Home-Bildschirm</b>. Fehlt der Eintrag, scrolle in der Liste nach unten.', 'Tippe auf <b>Hinzufügen</b>.'],
    tip: 'Ab iOS 16.4 geht das auch in Chrome und Edge über deren Teilen-Menü.',
  },
  android: {
    title: 'Android',
    steps: ['Öffne die Seite in <b>Chrome</b>.', 'Tippe oben rechts auf das Menü <b>⋮</b>.', 'Wähle <b>App installieren</b> oder <b>Zum Startbildschirm hinzufügen</b>.', 'Bestätige mit <b>Installieren</b>.'],
    tip: 'Bietet Chrome die Installation an, erscheint auf der Startseite der Knopf „App installieren“. Fehlt der Menüeintrag, ist die App vielleicht schon installiert.',
  },
  after: ['Die App startet vom Startbildschirm im Vollbild.', 'Sie läuft danach auch ohne Internet.', 'Neue Versionen lädt sie beim nächsten Start mit Internet von selbst.'],
};

export const canOfferInstall =() => !isStandalone() && (deferred || isIOS() || isAndroid());

/** Knopf für Startseite und Optionen; leer, wenn die App schon installiert läuft oder das Gerät nichts anbietet. */
export function installButton({ primary = false } = {}) {
  if (!canOfferInstall()) return '';
  const label = isIOS() ? 'Zum Home-Bildschirm hinzufügen' : 'App installieren';
  return `<button class="btn ${primary ? 'primary' : 'ghost'} block" data-action="install">${I.download}<span>${label}</span></button>`;
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
