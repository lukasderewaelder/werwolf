// Diagnoseseite: zeigt, ob Offlinebetrieb, Speicher und Ton auf diesem Gerät bereit sind.
import { S, ui, views, on, go, toast, render } from './core.js';
import { esc, I } from './art.js';
import { topBar } from './home.js';
import { isStandalone, isIOS, isAndroid } from './install.js';
import { musicState, playTest } from '../audio.js';

export async function swStatus() {
  if (!('serviceWorker' in navigator)) return { supported: false };
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg?.active) return { supported: true, registered: false };
  const ch = new MessageChannel();
  const answer = new Promise((res) => { ch.port1.onmessage = (e) => res(e.data); setTimeout(() => res(null), 2000); });
  reg.active.postMessage('STATUS', [ch.port2]);
  const st = await answer;
  return { supported: true, registered: true, controlled: !!navigator.serviceWorker.controller, ...(st ?? {}) };
}

async function collect() {
  const d = { at: new Date() };
  d.sw = await swStatus();
  try { d.persisted = await navigator.storage?.persisted?.(); } catch { d.persisted = null; }
  try { d.estimate = await navigator.storage?.estimate?.(); } catch { d.estimate = null; }
  try { localStorage.setItem('werwolf-diag', '1'); d.local = localStorage.getItem('werwolf-diag') === '1'; localStorage.removeItem('werwolf-diag'); } catch { d.local = false; }
  return d;
}

export async function runDiagnose() {
  ui.diag = null; render();
  ui.diag = await collect();
  render();
}

const mb = (n) => (n / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';
const row = (state, label, value, hint = '') => `<div class="diag ${state}"><span class="dot" aria-hidden="true"></span><div class="t"><b>${esc(label)}</b><span>${esc(value)}</span>${hint ? `<small>${esc(hint)}</small>` : ''}</div></div>`;

views.diagnose = () => {
  const d = ui.diag;
  const rows = [];
  if (!d) rows.push(row('info', 'Prüfe …', 'Einen Moment.'));
  else {
    const sw = d.sw, local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
    if (!sw.supported) rows.push(row('bad', 'Offlinebetrieb', 'Dieser Browser kennt keine Service Worker.', 'Ohne sie geht die App nur mit Netz.'));
    else if (local && !sw.registered) rows.push(row('info', 'Offlinebetrieb', 'Entwicklungsmodus: Service Worker ist lokal aus.', '?sw=1 an die Adresse hängen, um ihn zu testen.'));
    else if (!sw.registered) rows.push(row('warn', 'Offlinebetrieb', 'Noch nicht eingerichtet.', 'Seite einmal mit Netz öffnen und kurz warten, dann neu laden.'));
    else {
      const ready = sw.cached != null && sw.expected != null && sw.cached >= sw.expected;
      rows.push(row(ready ? 'ok' : 'warn', 'Offlinebetrieb', ready ? `Bereit: ${sw.cached} von ${sw.expected} Dateien im Speicher.` : `Lädt noch: ${sw.cached ?? '?'} von ${sw.expected ?? '?'} Dateien.`, ready ? 'Die App startet auch im Flugmodus.' : 'Kurz mit Netz warten und „Neu prüfen“ tippen.'));
      rows.push(row(sw.controlled ? 'ok' : 'warn', 'Seite vom Speicher ausgeliefert', sw.controlled ? 'Ja' : 'Noch nicht', sw.controlled ? '' : 'Nach dem ersten Besuch einmal neu laden.'));
      rows.push(row('info', 'Version', sw.version ?? 'unbekannt'));
    }
    rows.push(row(isStandalone() ? 'ok' : 'info', 'Installiert', isStandalone() ? 'Ja, läuft als App.' : 'Nein, läuft im Browser.', isStandalone() ? '' : 'Mit „Zum Home-Bildschirm“ (iPad, iPhone) oder „App installieren“ (Android).'));
    rows.push(row(d.local ? 'ok' : 'bad', 'Speichern', d.local ? 'Spielstand und Gruppen können gespeichert werden.' : 'Speichern ist gesperrt (privater Modus?).'));
    rows.push(row(d.persisted ? 'ok' : 'info', 'Dauerhafter Speicher', d.persisted === true ? 'Ja' : d.persisted === false ? 'Nein' : 'Nicht verfügbar', d.persisted ? '' : 'Das Gerät darf Daten bei Platzmangel löschen. Sicherung speichern hilft.'));
    if (d.estimate?.quota) rows.push(row('info', 'Platz', `${mb(d.estimate.usage ?? 0)} belegt von ${mb(d.estimate.quota)}`));
    const m = musicState();
    rows.push(row(S.settings.sound ? 'ok' : 'info', 'Töne', S.settings.sound ? 'An' : 'Aus', `Audio: ${m.context ?? 'noch nicht gestartet'}. Auf iOS spielt nichts, bevor du einmal getippt hast, und der Stummschalter zählt.`));
    rows.push(row(S.settings.music ? 'ok' : 'info', 'Musik', `${S.settings.music ? 'An' : 'Aus'}${m.playing ? ', spielt gerade' : ''}`));
    rows.push(row('wakeLock' in navigator ? 'ok' : 'warn', 'Bildschirm anlassen', 'wakeLock' in navigator ? 'Wird unterstützt.' : 'Wird nicht unterstützt.', 'wakeLock' in navigator ? '' : 'Auf iOS ab 16.4 bei installierter App.'));
    rows.push(row('info', 'Anzeige', `${innerWidth} × ${innerHeight} Punkte, ${innerWidth > innerHeight ? 'quer' : 'hoch'}, Faktor ${devicePixelRatio}`));
    rows.push(row('info', 'Gerät', `${isIOS() ? 'iPad/iPhone' : isAndroid() ? 'Android' : 'Computer'} · ${navigator.onLine ? 'online' : 'offline'}`, (navigator.userAgent || '').slice(0, 120)));
  }
  return `<div class="view">${topBar('Diagnose', 'Ist das Gerät bereit?', { back: 'go-settings' })}
    <div class="page"><div class="col scroll" style="flex:1;min-height:0" data-keep="diag">${rows.join('')}</div>
      <div class="foot"><button class="btn" data-action="diag-tone">${I.note}<span>Testton</span></button><button class="btn" data-action="diag-persist">Speicher sichern</button><button class="btn primary" data-action="diag-run">${I.reset}<span>Neu prüfen</span></button></div></div></div>`;
};

on('go-settings', () => { go('settings'); return false; });
on('open-diagnose', () => { ui.view = 'diagnose'; runDiagnose(); return false; });
on('diag-run', () => { runDiagnose(); return false; });
on('diag-tone', () => { playTest(); });
on('diag-persist', async () => {
  try { const ok = await navigator.storage?.persist?.(); toast(ok ? 'Dauerhafter Speicher gewährt.' : 'Das Gerät hat es abgelehnt.'); } catch { toast('Nicht verfügbar.'); }
  runDiagnose();
  return false;
});
