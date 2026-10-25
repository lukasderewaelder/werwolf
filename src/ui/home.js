// Startseite und Gruppenverwaltung.
import { S, ui, views, on, go, persist, toast } from './core.js';
import { esc, I } from './art.js';
import { groupById, ensureGroup, selectGroup, addMembers, removeMember, uid, presentPlayers } from '../store.js';
import { nm, livingIds } from '../engine/game.js';
import { installButton } from './install.js';

export function emblem(cls = '') {
  return `<svg viewBox="0 0 120 120" class="${cls}" aria-hidden="true">
    <defs><radialGradient id="mglow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6d8" stop-opacity=".55"/><stop offset="1" stop-color="#fff6d8" stop-opacity="0"/></radialGradient>
    <clipPath id="eclip"><circle cx="60" cy="60" r="54"/></clipPath></defs>
    <circle cx="60" cy="60" r="57" fill="#172039" stroke="#f1b94e" stroke-width="3"/>
    <g clip-path="url(#eclip)">
      <rect width="120" height="120" fill="#0c1222"/>
      <circle cx="74" cy="42" r="40" fill="url(#mglow)"/>
      <circle cx="74" cy="42" r="20" fill="#f6ecd0"/><circle cx="82" cy="36" r="17" fill="#0c1222" opacity=".0"/>
      <circle cx="30" cy="22" r="1.4" fill="#fff"/><circle cx="48" cy="14" r="1" fill="#fff"/><circle cx="100" cy="20" r="1.2" fill="#fff"/><circle cx="18" cy="48" r="1" fill="#fff"/>
      <path d="M0 120V84l9-14 8 12 10-24 9 22 8-14 9 18 9-20 10 22 9-14 10 20 8-10 9 12v26z" fill="#050810"/>
      <path d="M44 100l6-10 3 4 7-12 7 12 3-4 6 10-8 4h-16z" fill="#0b1226" opacity="0"/>
      <ellipse cx="50" cy="96" rx="3" ry="1.8" fill="#ffb84a"/><ellipse cx="62" cy="96" rx="3" ry="1.8" fill="#ffb84a"/>
    </g></svg>`;
}

views.home = () => {
  const g = S.game;
  const running = g && g.phase !== 'ended';
  const living = running ? livingIds(g).length : 0;
  const resume = running ? `
    <button class="resume" data-action="resume">${I.play}<span><b>Spiel fortsetzen</b><span>${g.clock === 'day' ? `Tag ${g.day}` : `Nacht ${g.night}`} · ${living} von ${g.cfg.players.length} am Leben</span></span></button>` : '';
  const last = S.lastResult && !running ? `<div class="hint">${I.crown}<span>Letztes Spiel: Sieg für <b>${esc(S.lastResult.winner)}</b>.</span></div>` : '';
  return `<div class="view">
    <div class="home">
      <div class="home-hero">${emblem('logo')}<h1>Werwolf</h1><p>Der Spielleiter für deine Runde. Offline, für iPad und Handy.</p></div>
      <div class="home-actions">
        ${resume}${last}
        <button class="btn primary block" data-action="new-game">${I.moon}<span>${running ? 'Neues Spiel (ersetzt das laufende)' : 'Neues Spiel'}</span></button>
        ${installButton()}
        <div class="menu-grid">
          <button class="tile" data-action="go" data-view="groups">${I.people}<b>Gruppen</b><span>Spieler und Runden verwalten</span></button>
          <button class="tile" data-action="go" data-view="library">${I.book}<b>Rollen</b><span>Nachschlagen und Regeln</span></button>
          <button class="tile" data-action="go" data-view="guide">${I.list}<b>Anleitung</b><span>So leitest du ein Spiel</span></button>
          <button class="tile" data-action="go" data-view="settings">${I.sliders}<b>Optionen</b><span>Sound, Hausregeln, Sicherung</span></button>
        </div>
      </div>
    </div></div>`;
};

on('go', (el) => { go(el.dataset.view); return false; });
on('back-home', () => { go('home'); return false; });
on('resume', () => { go('game'); return false; });

/* ---------- Gruppenverwaltung ---------- */

export const topBar = (title, sub, { back = 'back-home', right = '' } = {}) => `
  <header class="bar"><button class="ibtn" data-action="${back}" aria-label="Zurück">${I.left}</button>
  <div class="grow"><h1>${esc(title)}</h1>${sub ? `<small>${esc(sub)}</small>` : ''}</div>${right}</header>`;

export function rosterHtml({ attendance }) {
  const grp = ensureGroup(S);
  const byId = Object.fromEntries(grp.members.map((m) => [m.id, m]));
  const order = presentPlayers(S) && S.setup.order;
  const items = order.filter((id) => byId[id]).map((id, i) => {
    const m = byId[id], off = !!S.setup.off[id];
    return `<div class="member ${off ? 'off' : ''}">
      ${attendance ? `<button class="check ${off ? '' : 'on'}" data-action="toggle-member" data-id="${id}" aria-label="Anwesend">${I.check}</button>` : `<span class="no">${i + 1}</span>`}
      <b>${esc(m.name)}</b>
      <button class="mini" data-action="member-menu" data-id="${id}" aria-label="Mehr">${I.menu}</button>
    </div>`;
  }).join('');
  return `<form id="add-form" class="row"><input class="inp" id="add-inp" placeholder="Name eingeben (mehrere mit Komma)" autocomplete="off" enterkeyhint="done"><button type="submit" class="btn primary" aria-label="Hinzufügen" style="min-height:50px;padding:0 18px">${I.plus}</button></form>
    <div class="member-list scroll" data-keep="roster">${items || '<p class="muted">Noch keine Spieler. Namen oben eintragen oder eine Liste einfügen.</p>'}</div>`;
}

on('submit:add-form', () => {
  const inp = document.getElementById('add-inp');
  const names = (inp.value || '').split(/[,;\n]+/);
  const added = addMembers(S, names);
  if (!added.length && inp.value.trim()) toast('Name schon vorhanden.');
  inp.value = '';
  setTimeout(() => document.getElementById('add-inp')?.focus(), 0);
});
on('toggle-member', (el) => { const id = el.dataset.id; if (S.setup.off[id]) delete S.setup.off[id]; else S.setup.off[id] = true; S.setup.counts = null; });
on('member-menu', (el) => { ui.modal = { type: 'member', id: el.dataset.id }; });
on('select-group', (el) => { selectGroup(S, el.dataset.id); });
on('new-group', () => { ui.modal = { type: 'group-new' }; });
on('submit:group-form', (f) => {
  const name = f.querySelector('input').value.trim().slice(0, 30);
  if (!name) return;
  const g = { id: uid('g'), name, members: [] };
  S.groups.push(g); selectGroup(S, g.id); ui.modal = null;
});
on('submit:rename-form', (f) => {
  const v = f.querySelector('input').value.trim().slice(0, 24);
  const m = ui.modal;
  const grp = groupById(S, S.setup.groupId);
  if (m?.type === 'member' && grp) { const mem = grp.members.find((x) => x.id === m.id); if (mem && v) mem.name = v; }
  if (m?.type === 'group-rename' && grp && v) grp.name = v;
  ui.modal = null;
});
on('member-delete', () => { removeMember(S, ui.modal.id); ui.modal = null; });
on('member-move', (el) => {
  const id = ui.modal.id, o = S.setup.order, i = o.indexOf(id);
  if (i < 0) return;
  o.splice(i, 1);
  if (el.dataset.to === 'top') o.unshift(id); else o.push(id);
  ui.modal = null;
});
on('group-rename', () => { ui.modal = { type: 'group-rename' }; });
on('group-delete', () => { ui.modal = { type: 'confirm', what: 'group-delete', title: 'Gruppe löschen?', text: 'Die Gruppe und ihre Namen werden entfernt.' }; });

export function groupChips() {
  return `<div class="chips" data-keep="groupchips">${S.groups.map((g) => `<button class="chip ${g.id === S.setup.groupId ? 'on' : ''}" data-action="select-group" data-id="${g.id}">${I.people}${esc(g.name)}<em>${g.members.length}</em></button>`).join('')}
    <button class="chip" data-action="new-group">${I.plus}Neue Gruppe</button></div>`;
}

views.groups = () => {
  const grp = ensureGroup(S);
  return `<div class="view">${topBar('Gruppen', 'Spieler verwalten')}
    <div class="page">${groupChips()}
      <div class="row"><span class="eyebrow">${esc(grp.name)}</span><span class="spacer"></span>
        <button class="btn sm" data-action="group-rename">Umbenennen</button><button class="btn sm danger" data-action="group-delete">Löschen</button></div>
      ${rosterHtml({ attendance: false })}
      <p class="muted" style="font-size:13px">Die Reihenfolge ist später die Sitzordnung am Tisch (im Uhrzeigersinn). Sie lässt sich beim Start eines Spiels ändern.</p>
    </div></div>`;
};

export { nm };
