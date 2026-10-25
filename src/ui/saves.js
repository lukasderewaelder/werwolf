// Spielstände: ein Spiel pausieren, mehrere aufheben, später fortsetzen oder löschen.
import { S, ui, on, go, toast, clearUndo, render } from './core.js';
import { esc, I } from './art.js';
import { uid } from '../store.js';
import { livingIds, clockLabel } from '../engine/game.js';
import { stopMusic } from '../audio.js';

const MAX_SAVES = 12;

const when = (t) => new Date(t).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/** Laufendes Spiel in die Liste legen. Mit goHome gleich zur Startseite. */
export function pauseCurrent(goHome = true) {
  const g = S.game;
  if (!g || g.phase === 'ended') return false;
  S.saves.unshift({ id: uid('s'), at: Date.now(), game: g });
  if (S.saves.length > MAX_SAVES) { S.saves.length = MAX_SAVES; toast('Der älteste Spielstand wurde entfernt.'); }
  S.game = null; clearUndo(); stopMusic();
  if (goHome) { go('home'); toast('Spiel gespeichert. Du findest es auf der Startseite.'); }
  return true;
}

export function savesList() {
  if (!S.saves.length) return '';
  const items = S.saves.map((s) => {
    const g = s.game, n = g.cfg.players.length;
    return `<div class="save"><span class="t"><b>${esc(clockLabel(g))} · ${livingIds(g).length} von ${n} am Leben</b><small>Gespeichert ${when(s.at)} · ${esc(g.cfg.players.slice(0, 5).map((p) => p.name).join(', '))}${n > 5 ? ' …' : ''}</small></span>
      <button class="btn sm primary" data-action="save-resume" data-id="${s.id}">${I.play}<span>Weiter</span></button>
      <button class="ibtn" data-action="save-delete" data-id="${s.id}" aria-label="Löschen">${I.close}</button></div>`;
  }).join('');
  return `<div class="saves"><div class="eyebrow">Pausierte Spiele</div>${items}</div>`;
}

on('pause-game', () => { pauseCurrent(true); return false; });
on('save-resume', (el) => {
  const i = S.saves.findIndex((s) => s.id === el.dataset.id);
  if (i < 0) return;
  const [save] = S.saves.splice(i, 1);
  if (S.game && S.game.phase !== 'ended') pauseCurrent(false);   // ein laufendes Spiel geht nicht verloren
  S.game = save.game; clearUndo();
  go('game');
  return false;
});
on('save-delete', (el) => { ui.modal = { type: 'confirm', what: 'save-delete', id: el.dataset.id, title: 'Spielstand löschen?', text: 'Dieser pausierte Spielstand wird endgültig entfernt.' }; });
