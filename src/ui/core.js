// Kern der Oberfläche: Zustand, Rendern, Ereignisverteilung, Rückgängig.
import { load, save } from '../store.js';
import { apply, normalizeGame } from '../engine/game.js';

export const S = load();
if (S.game) normalizeGame(S.game);
export const ui = {
  view: S.game && S.game.phase !== 'ended' ? 'home' : 'home',
  modal: null,          // { type, ... }
  wizard: false,
  libSet: 'basis', query: '',
  seatSheet: null,
  timer: { left: S.settings.timer, running: false, endAt: 0, h: null },
};
export const views = {};                 // Name -> () => HTML
export const afterRender = [];           // Funktionen, die nach dem Rendern laufen
const handlers = new Map();
export const on = (name, fn) => handlers.set(name, fn);

let undoStack = [];
export const canUndo = () => undoStack.length > 0;
export const clearUndo = () => { undoStack = []; };

export function persist() { save(S); }

let toastH = 0;
export function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastH); toastH = setTimeout(() => el.classList.remove('show'), 2600);
}

export const buzz = (p = 15) => { if (S.settings.haptics && navigator.vibrate) { try { navigator.vibrate(p); } catch { /* egal */ } } };

/** Spielaktion ausführen, Zustand für Rückgängig merken, speichern, neu zeichnen. */
export function dispatch(a, { undoable = true } = {}) {
  if (!S.game) return;
  const before = JSON.stringify(S.game);
  let next;
  try { next = apply(S.game, a, toast); } catch (e) { console.error(e); toast('Aktion nicht möglich.'); return; }
  if (undoable && JSON.stringify(next) !== before) { undoStack.push(before); if (undoStack.length > 80) undoStack.shift(); }
  S.game = next;
  render();
}

export function undo() {
  if (!undoStack.length) return;
  S.game = JSON.parse(undoStack.pop());
  ui.modal = null;
  toast('Rückgängig gemacht');
  render();
}

export function go(view, extra = {}) {
  ui.view = view; ui.modal = null; Object.assign(ui, extra);
  render();
}

/* ---------- Theme: Nacht dunkel, Tag hell ---------- */

export function themeFor() {
  if (S.locked) return 'night';
  const t = S.settings.theme;
  if (t === 'night' || t === 'day') return t;
  const g = S.game;
  if (ui.view === 'game' && g && (g.phase === 'day' || (g.phase === 'interrupt' && g.clock === 'day') || g.phase === 'ended')) return 'day';
  return 'night';
}

function applyTheme() {
  const th = themeFor();
  document.body.className = `theme-${th}`;
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', th === 'day' ? '#f5ecd9' : '#0c1222');
}

/* ---------- Rendern ---------- */

let rendering = false;
export function render() {
  if (rendering) return;
  rendering = true;
  try {
    const app = document.getElementById('app');
    const locked = !!(S.locked && S.settings.lockPin);
    const fn = locked ? views.lock : (views[ui.view] ?? views.home);
    const active = document.activeElement;
    const focus = active && active.id && app.contains(active) ? { id: active.id, s: active.selectionStart, e: active.selectionEnd } : null;
    const scrolls = [...app.querySelectorAll('[data-keep]')].map((el) => [el.dataset.keep, el.scrollTop, el.scrollLeft]);
    app.innerHTML = fn() + (ui.modal && (!locked || ui.modal.type === 'pin-forgot') ? (views.modal?.() ?? '') : '');
    for (const [k, t, l] of scrolls) { const el = app.querySelector(`[data-keep="${k}"]`); if (el) { el.scrollTop = t; el.scrollLeft = l; } }
    if (focus) { const el = document.getElementById(focus.id); if (el) { el.focus(); try { el.setSelectionRange(focus.s, focus.e); } catch { /* kein Textfeld */ } } }
    applyTheme();
    for (const f of afterRender) f();
    persist();
  } finally { rendering = false; }
}

/* ---------- Ereignisse ---------- */

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const fn = handlers.get(el.dataset.action);
  if (!fn) return;
  const r = fn(el, e);
  if (r !== false) render();
});

document.addEventListener('submit', (e) => {
  e.preventDefault();
  const fn = handlers.get('submit:' + e.target.id);
  if (fn) { fn(e.target, e); render(); }
});

document.addEventListener('input', (e) => {
  const fn = handlers.get('input:' + e.target.id);
  if (fn && fn(e.target, e) !== false) render();
});
