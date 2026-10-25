// Dialoge: Menü, Protokoll, Rollen, Spielerblatt, Bestätigungen.
import { S, ui, views, on, go, dispatch, persist, toast, clearUndo } from './core.js';
import { esc, art, I, initials } from './art.js';
import { roleDetailHtml } from './pages.js';
import { RM, ROLES, roleName, SETS } from '../engine/roles.js';
import { nm, alive, roleLabel, CAUSE } from '../engine/game.js';
import { groupById, defaultSettings, defaultSetup } from '../store.js';
import { stopMusic } from '../audio.js';

const sheet = (inner, { wide = false } = {}) => `<div class="backdrop" data-action="close-modal"><div class="modal ${wide ? 'wide' : ''}" data-stop role="dialog" aria-modal="true">${inner}</div></div>`;
const closeBtn = (label = 'Schließen') => `<button class="btn" data-action="close-modal">${label}</button>`;

on('close-modal', (el, e) => { if (e.target.closest('[data-stop]') && !el.classList.contains('btn')) return false; ui.modal = null; });
on('modal-back', () => { ui.modal = ui.modal?.from ?? null; });
on('show-who', () => { ui.modal = { type: 'who' }; });
on('show-roles', () => { ui.modal = { type: 'roles' }; });
on('show-log-menu', () => { ui.modal = { type: 'log' }; });
on('player-open', (el) => { ui.modal = { type: 'player', id: el.dataset.id }; });
on('end-game', () => { ui.modal = { type: 'confirm', what: 'end-game', title: 'Spiel beenden?', text: 'Das laufende Spiel wird abgebrochen.' }; });

on('confirm-yes', () => {
  const what = ui.modal?.what;
  ui.modal = null;
  if (what === 'end-game') { S.game = null; clearUndo(); stopMusic(); go('home'); }
  if (what === 'group-delete') { S.groups = S.groups.filter((g) => g.id !== S.setup.groupId); S.setup.groupId = null; }
  if (what === 'reset-all') { S.groups = []; S.settings = defaultSettings(); S.setup = defaultSetup(); S.game = null; S.lastResult = null; clearUndo(); }
});

on('player-role', (el) => { dispatch({ t: 'assign-direct', pid: ui.modal.id, role: el.dataset.role }); return false; });
on('player-kill', () => { const id = ui.modal.id; ui.modal = null; dispatch({ t: 'manual-kill', pid: id }); return false; });
on('player-captain', () => { const id = ui.modal.id; ui.modal = null; dispatch({ t: 'set-captain', pid: id }); return false; });
on('submit:player-rename', (f) => { const v = f.querySelector('input').value.trim().slice(0, 24); if (v) dispatch({ t: 'rename', pid: ui.modal.id, name: v }); ui.modal = { type: 'player', id: ui.modal.id }; });

views.modal = () => {
  const m = ui.modal, g = S.game;
  switch (m.type) {
    case 'menu': return sheet(`<h2>Menü</h2>
      <div class="col">
        <button class="opt" data-action="show-who"><span class="t"><b>Wer ist wer</b><span>Rollen, Status und Korrekturen pro Spieler</span></span>${I.right}</button>
        <button class="opt" data-action="show-roles"><span class="t"><b>Rollen im Spiel</b><span>Spickzettel mit allen Karten dieser Runde</span></span>${I.right}</button>
        <button class="opt" data-action="show-log-menu"><span class="t"><b>Protokoll</b><span>Was bisher passiert ist</span></span>${I.right}</button>
        <button class="opt" data-action="end-game"><span class="t"><b style="color:var(--danger)">Spiel beenden</b><span>Abbrechen und zur Startseite</span></span></button>
      </div>${closeBtn()}`);
    case 'log': return sheet(`<h2>Protokoll</h2><div class="log">${(g?.log ?? []).slice().reverse().map((l) => `<div><b>${esc(l.p)}</b>${esc(l.t)}</div>`).join('') || '<p class="muted">Noch nichts.</p>'}</div>${closeBtn()}`);
    case 'role': return sheet(`${roleDetailHtml(m.id)}${m.from ? `<button class="btn" data-action="modal-back">Zurück</button>` : closeBtn()}`);
    case 'roles': {
      const items = ROLES.filter((r) => g.cfg.counts[r.id]).map((r) => `<button class="ov" data-action="role-info" data-role="${r.id}">${art(r.id)}<b>${esc(r.name)}${g.cfg.counts[r.id] > 1 ? ` × ${g.cfg.counts[r.id]}` : ''}</b><small>${esc(r.sub)}</small></button>`).join('');
      return sheet(`<h2>Rollen im Spiel</h2><div class="ov-grid">${items}</div>${closeBtn()}`, { wide: true });
    }
    case 'who': {
      const rows = g.cfg.players.map((p) => `<button class="death" data-action="player-open" data-id="${p.id}" style="text-align:left;width:100%">${art(g.roles[p.id])}<div><b>${esc(p.name)}${g.captain === p.id ? ' · Hauptmann' : ''}</b><small>${esc(g.roles[p.id] ? roleLabel(g, p.id) : 'Rolle noch nicht erfasst')} · ${alive(g, p.id) ? 'lebt' : `† ${esc(CAUSE[g.dead[p.id].cause] ?? g.dead[p.id].cause)}`}</small></div></button>`).join('');
      return sheet(`<h2>Wer ist wer</h2><div class="deaths">${rows}</div>${closeBtn()}`);
    }
    case 'player': {
      const p = g.cfg.players.find((x) => x.id === m.id);
      const roles = ROLES.filter((r) => g.cfg.counts[r.id]);
      return sheet(`<h2>${esc(p.name)}</h2>
        <form id="player-rename" class="row"><input class="inp" value="${esc(p.name)}" maxlength="24" aria-label="Name"><button class="btn" type="submit">Umbenennen</button></form>
        <div class="eyebrow">Rolle festlegen (falls falsch erfasst)</div>
        <div class="chips" style="flex-wrap:wrap;overflow:visible">${roles.map((r) => `<button class="chip ${g.roles[p.id] === r.id ? 'on' : ''}" data-action="player-role" data-role="${r.id}">${esc(r.short ?? r.name)}</button>`).join('')}</div>
        <div class="row wrap"><button class="btn" data-action="player-captain" ${alive(g, p.id) ? '' : 'disabled'}>${I.crown}Zum Hauptmann machen</button>
        <button class="btn danger" data-action="player-kill" ${alive(g, p.id) && g.phase === 'day' ? '' : 'disabled'}>${I.skull}Als tot markieren</button></div>
        ${g.phase !== 'day' ? '<span class="muted" style="font-size:13px">„Als tot markieren“ geht nur am Tag.</span>' : ''}
        <button class="btn" data-action="show-who">Zurück</button>`);
    }
    case 'member': {
      const grp = groupById(S, S.setup.groupId); const mem = grp?.members.find((x) => x.id === m.id);
      if (!mem) return '';
      return sheet(`<h2>${esc(mem.name)}</h2>
        <form id="rename-form" class="row"><input class="inp" value="${esc(mem.name)}" maxlength="24" aria-label="Name"><button class="btn" type="submit">Umbenennen</button></form>
        <div class="row wrap"><button class="btn" data-action="member-move" data-to="top">${I.up}Nach oben</button><button class="btn" data-action="member-move" data-to="bottom">${I.down}Nach unten</button></div>
        <button class="btn danger" data-action="member-delete">${I.close}Aus der Gruppe löschen</button>${closeBtn()}`);
    }
    case 'group-new': return sheet(`<h2>Neue Gruppe</h2><form id="group-form" class="col"><input class="inp" placeholder="Name der Gruppe, z. B. Klasse 7a" maxlength="30" autofocus aria-label="Gruppenname"><button class="btn primary" type="submit">Anlegen</button></form>${closeBtn('Abbrechen')}`);
    case 'group-rename': { const grp = groupById(S, S.setup.groupId); return sheet(`<h2>Gruppe umbenennen</h2><form id="rename-form" class="col"><input class="inp" value="${esc(grp?.name ?? '')}" maxlength="30" aria-label="Gruppenname"><button class="btn primary" type="submit">Speichern</button></form>${closeBtn('Abbrechen')}`); }
    case 'confirm': return sheet(`<h2>${esc(m.title)}</h2><p>${esc(m.text)}</p><div class="row"><button class="btn" data-action="close-modal" style="flex:1">Abbrechen</button><button class="btn danger" data-action="confirm-yes" style="flex:1">Ja</button></div>`);
    default: return '';
  }
};
