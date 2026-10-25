// Sperrbildschirm mit vierstelliger PIN („Display nach unten“). Die PIN schützt vor neugierigen Blicken, nicht vor Absicht:
// Wer sie vergisst, kann sie nach 30 Sekunden Wartezeit löschen. Sie liegt nur auf diesem Gerät und nie in der Sicherungsdatei.
import { S, ui, views, on, render, toast, persist } from './core.js';
import { I } from './art.js';

const WAIT_FORGOT = 30000;
const MAX_TRIES = 5;

export function keypad(title, hint) {
  const p = ui.pin ?? { buf: '' };
  const wait = p.until && Date.now() < p.until ? Math.ceil((p.until - Date.now()) / 1000) : 0;
  const msg = wait ? `Zu viele Versuche. Bitte ${wait} Sekunden warten.` : p.err ?? hint ?? '';
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<button data-action="pin-digit" data-d="${d}" aria-label="${d}">${d}</button>`).join('');
  return `<div class="pin">
    <h2>${title}</h2>
    <div class="pin-dots" role="img" aria-label="${p.buf.length} von 4 Ziffern">${[0, 1, 2, 3].map((i) => `<i class="${i < p.buf.length ? 'on' : ''}"></i>`).join('')}</div>
    <div class="pin-msg ${p.err || wait ? 'bad' : ''}" aria-live="polite">${msg}</div>
    <div class="pin-pad">${digits}<span></span><button data-action="pin-digit" data-d="0" aria-label="0">0</button><button data-action="pin-del" aria-label="Löschen">${I.left}</button></div></div>`;
}

views.lock = () => `<div class="view lock"><div class="lock-box">
  <div class="lock-icon">${I.lock}</div>
  ${keypad('Gesperrt', 'PIN eingeben')}
  <button class="btn ghost sm" data-action="pin-forgot">PIN vergessen?</button></div></div>`;

/** Sperren: ohne PIN erst eine festlegen. */
export function startLock() {
  if (!S.settings.lockPin) { ui.pin = { mode: 'set1', buf: '', first: '', after: 'lock' }; ui.modal = { type: 'pin' }; return; }
  S.locked = true; ui.modal = null; ui.pin = { mode: 'unlock', buf: '', tries: 0 };
}

on('lock-now', () => { startLock(); });
on('pin-set', () => { ui.pin = { mode: 'set1', buf: '', first: '', after: null }; ui.modal = { type: 'pin' }; });
on('pin-remove', () => { S.settings.lockPin = null; S.locked = false; toast('PIN entfernt.'); });
// Nach dem Neuladen ist die App noch gesperrt, aber die Eingabe muss neu beginnen
const ensurePin = () => { if (!ui.pin && S.locked) ui.pin = { mode: 'unlock', buf: '', tries: 0 }; return ui.pin; };
on('pin-del', () => { if (ensurePin()) { ui.pin.buf = ui.pin.buf.slice(0, -1); ui.pin.err = null; } });
on('pin-digit', (el) => {
  const p = ensurePin(); if (!p) return;
  if (p.until && Date.now() < p.until) return;
  p.err = null;
  if (p.buf.length >= 4) return;
  p.buf += el.dataset.d;
  if (p.buf.length < 4) return;
  if (p.mode === 'unlock') {
    if (p.buf === S.settings.lockPin) { S.locked = false; ui.pin = null; return; }
    p.tries = (p.tries ?? 0) + 1; p.buf = ''; p.err = 'Falsche PIN.';
    if (p.tries >= MAX_TRIES) { p.until = Date.now() + 30000; p.tries = 0; setTimeout(render, 30200); }
    return;
  }
  if (p.mode === 'set1') { p.first = p.buf; p.buf = ''; p.mode = 'set2'; return; }
  if (p.mode === 'set2') {
    if (p.buf !== p.first) { p.buf = ''; p.first = ''; p.mode = 'set1'; p.err = 'Die zwei Eingaben passen nicht. Noch einmal von vorn.'; return; }
    S.settings.lockPin = p.buf;
    const lockNow = p.after === 'lock';
    ui.modal = null; ui.pin = null;
    if (lockNow) startLock(); else toast('PIN gespeichert.');
  }
});

/* PIN vergessen: erst nach der Wartezeit löschbar */
let forgotTimer = 0;
on('pin-forgot', () => {
  ui.modal = { type: 'pin-forgot', at: Date.now() };
  clearInterval(forgotTimer);
  forgotTimer = setInterval(() => {
    if (ui.modal?.type !== 'pin-forgot') { clearInterval(forgotTimer); return; }
    render();
    if (Date.now() - ui.modal.at >= WAIT_FORGOT) clearInterval(forgotTimer);
  }, 1000);
});
on('pin-forgot-do', () => {
  if (ui.modal?.type !== 'pin-forgot' || Date.now() - ui.modal.at < WAIT_FORGOT) return;
  S.settings.lockPin = null; S.locked = false; ui.modal = null; ui.pin = null; toast('PIN gelöscht, die App ist entsperrt.');
});
export const forgotWait = (m) => Math.max(0, Math.ceil((WAIT_FORGOT - (Date.now() - m.at)) / 1000));

/** Karte für die Optionen. */
export function lockCard() {
  const has = !!S.settings.lockPin;
  return `<div class="card flat col"><b>Sperre</b>
    <span class="muted" style="font-size:13px">Sperrt den Bildschirm mit einer PIN, wenn das Gerät offen liegt. Sie ist nur ein Sichtschutz und liegt nur auf diesem Gerät.</span>
    <div class="row wrap"><button class="btn sm" data-action="lock-now">${I.lock}Jetzt sperren</button><button class="btn sm" data-action="pin-set">${has ? 'PIN ändern' : 'PIN festlegen'}</button>${has ? '<button class="btn sm danger" data-action="pin-remove">PIN entfernen</button>' : ''}</div></div>`;
}
