// Dialoge: Menü, Protokoll, Rollen, Spielerblatt, Bestätigungen.
import { S, ui, views, on, go, dispatch, persist, toast, clearUndo } from './core.js';
import { esc, art, I, initials } from './art.js';
import { roleDetailHtml, soundCard } from './pages.js';
import { RM, ROLES, roleName, SETS } from '../engine/roles.js';
import { nm, alive, roleLabel, CAUSE } from '../engine/game.js';
import { groupById, defaultSettings, defaultSetup } from '../store.js';
import { stopMusic } from '../audio.js';
import { keypad, forgotWait } from './lock.js';
import { isIOS, isAndroid } from './install.js';

const sheet = (inner, { wide = false } = {}) => `<div class="backdrop" data-action="close-modal"><div class="modal ${wide ? 'wide' : ''}" data-stop role="dialog" aria-modal="true">${inner}</div></div>`;
const closeBtn = (label = 'Schließen') => `<div class="mfoot"><button class="btn" data-action="close-modal">${label}</button></div>`;

on('close-modal', (el, e) => {
  if (Date.now() - (ui.longPress ?? 0) < 700) return false;   // loslassen nach langem Tippen schließt das Spielerblatt nicht
  if (e.target.closest('[data-stop]') && !el.classList.contains('btn')) return false;
  ui.modal = null;
});
on('modal-back', () => { ui.modal = ui.modal?.from ?? null; });
on('show-who', () => { ui.modal = { type: 'who' }; });
on('show-roles', () => { ui.modal = { type: 'roles' }; });
on('show-log-menu', () => { ui.modal = { type: 'log' }; });
on('player-open', (el) => { ui.modal = { type: 'player', id: el.dataset.id }; });
on('end-game', () => { ui.modal = { type: 'confirm', what: 'end-game', title: 'Spiel beenden?', text: 'Das laufende Spiel wird abgebrochen.' }; });

on('confirm-yes', () => {
  const what = ui.modal?.what, id = ui.modal?.id;
  ui.modal = null;
  if (what === 'save-delete') { S.saves = S.saves.filter((x) => x.id !== id); toast('Spielstand gelöscht.'); }
  if (what === 'end-game') { S.game = null; clearUndo(); stopMusic(); go('home'); }
  if (what === 'group-delete') { S.groups = S.groups.filter((g) => g.id !== S.setup.groupId); S.setup.groupId = null; }
  if (what === 'reset-all') { S.groups = []; S.settings = defaultSettings(); S.setup = defaultSetup(); S.game = null; S.lastResult = null; clearUndo(); }
});

on('greis-open', () => { ui.modal = { type: 'greis' }; });
const setGroups = (f) => { const ps = S.game.cfg.players; dispatch({ t: 'set-groups', groups: f(ps) }, { undoable: false }); return false; };
on('greis-set', (el) => setGroups(() => ({ ...S.game.groups, [el.dataset.id]: el.dataset.v })));
on('greis-halves', () => setGroups((ps) => Object.fromEntries(ps.map((p, i) => [p.id, i < Math.ceil(ps.length / 2) ? 'A' : 'B']))));
on('greis-alt', () => setGroups((ps) => Object.fromEntries(ps.map((p, i) => [p.id, i % 2 ? 'B' : 'A']))));
on('greis-random', () => setGroups((ps) => { const ids = ps.map((p) => p.id).sort(() => Math.random() - 0.5); return Object.fromEntries(ids.map((id, i) => [id, i < Math.ceil(ids.length / 2) ? 'A' : 'B'])); }));
on('player-role', (el) => { dispatch({ t: 'assign-direct', pid: ui.modal.id, role: el.dataset.role }); return false; });
on('player-kill', () => { const id = ui.modal.id; ui.modal = null; dispatch({ t: 'manual-kill', pid: id }); return false; });
on('player-captain', () => { const id = ui.modal.id; ui.modal = null; dispatch({ t: 'set-captain', pid: id }); return false; });
on('submit:player-rename', (f) => { const v = f.querySelector('input').value.trim().slice(0, 24); if (v) dispatch({ t: 'rename', pid: ui.modal.id, name: v }); ui.modal = { type: 'player', id: ui.modal.id }; });

views.modal = () => {
  const m = ui.modal, g = S.game;
  switch (m.type) {
    case 'menu': return sheet(`<h2>Menü</h2>
      ${soundCard()}
      <div class="col">
        <button class="opt" data-action="pause-game"><span class="t"><b>Pausieren und später weiterspielen</b><span>Speichert das Spiel und geht zur Startseite</span></span>${I.pause}</button>
        <button class="opt" data-action="lock-now"><span class="t"><b>Bildschirm sperren</b><span>Mit PIN, falls das Gerät offen liegt</span></span>${I.lock}</button>
        <button class="opt" data-action="show-who"><span class="t"><b>Wer ist wer</b><span>Rollen, Status und Korrekturen pro Spieler</span></span>${I.right}</button>
        <button class="opt" data-action="show-roles"><span class="t"><b>Rollen im Spiel</b><span>Spickzettel mit allen Karten dieser Runde</span></span>${I.right}</button>
        <button class="opt" data-action="show-log-menu"><span class="t"><b>Protokoll</b><span>Was bisher passiert ist</span></span>${I.right}</button>
        ${g?.cfg.counts.greis ? `<button class="opt" data-action="greis-open"><span class="t"><b>Gruppen des Greises</b><span>Dorf in zwei Gruppen teilen</span></span>${I.right}</button>` : ''}
        <button class="opt" data-action="end-game"><span class="t"><b style="color:var(--danger)">Spiel beenden</b><span>Abbrechen und zur Startseite</span></span></button>
      </div>${closeBtn()}`);
    case 'log': return sheet(`<h2>Protokoll</h2><div class="row wrap"><button class="btn sm" data-action="log-share">${I.share}Teilen</button><button class="btn sm" data-action="log-file">${I.download}Als Datei</button><button class="btn sm" data-action="log-copy">Kopieren</button></div><div class="log">${(g?.log ?? []).slice().reverse().map((l) => `<div><b>${esc(l.p)}</b>${esc(l.t)}</div>`).join('') || '<p class="muted">Noch nichts.</p>'}</div>${closeBtn()}`);
    case 'pin': return sheet(`${keypad(ui.pin?.mode === 'set2' ? 'PIN wiederholen' : 'PIN festlegen', ui.pin?.mode === 'set2' ? 'Noch einmal dieselbe PIN' : 'Vier Ziffern')}${closeBtn('Abbrechen')}`);
    case 'pin-forgot': { const w = forgotWait(m); return sheet(`<h2>PIN vergessen</h2><p>Die PIN lässt sich löschen. Damit nicht jemand anderes die App einfach entsperrt, gibt es eine Wartezeit.</p><div class="mfoot"><button class="btn danger" data-action="pin-forgot-do" ${w ? 'disabled' : ''}>${w ? `PIN löschen in ${w} s` : 'PIN löschen und entsperren'}</button><button class="btn" data-action="close-modal">Zurück</button></div>`); }
    case 'new-over': return sheet(`<h2>Es läuft noch ein Spiel</h2><p>Was soll damit geschehen?</p><div class="mfoot"><button class="btn primary" data-action="new-pause">${I.pause}<span>Pausieren und neues Spiel</span></button><button class="btn danger" data-action="new-replace">Verwerfen und neues Spiel</button><button class="btn" data-action="close-modal">Abbrechen</button></div>`);
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
    case 'custom': {
      const d = m.draft;
      return sheet(`<h2>${m.id ? 'Eigene Rolle bearbeiten' : 'Eigene Rolle anlegen'}</h2>
        <form id="custom-form" class="col">
          <label class="col" style="gap:4px"><span class="eyebrow">Name</span><input class="inp" name="name" value="${esc(d.name)}" maxlength="28" placeholder="z. B. Nachtwächter" required></label>
          <label class="col" style="gap:4px"><span class="eyebrow">Lager</span><select class="inp" name="camp"><option value="village" ${d.camp !== 'wolf' ? 'selected' : ''}>Dorfbewohner</option><option value="wolf" ${d.camp === 'wolf' ? 'selected' : ''}>Werwölfe (zählt als Wolf)</option></select></label>
          <label class="col" style="gap:4px"><span class="eyebrow">Kurzbeschreibung</span><input class="inp" name="sub" value="${esc(d.sub)}" maxlength="60" placeholder="z. B. Sieht, wer nachts wach ist"></label>
          <label class="col" style="gap:4px"><span class="eyebrow">Beschreibung</span><textarea class="inp" name="desc" maxlength="600" placeholder="Was kann die Rolle? Die Regeln führst du selbst durch.">${esc(d.desc)}</textarea></label>
          <label class="col" style="gap:4px"><span class="eyebrow">Wann wird sie nachts aufgerufen?</span><select class="inp" name="wake"><option value="none" ${d.wake === 'none' ? 'selected' : ''}>Gar nicht</option><option value="first" ${d.wake === 'first' ? 'selected' : ''}>Nur in der ersten Nacht</option><option value="every" ${d.wake === 'every' ? 'selected' : ''}>Jede Nacht</option></select></label>
          <label class="col" style="gap:4px"><span class="eyebrow">Reihenfolge</span><select class="inp" name="after"><option value="before" ${!d.after ? 'selected' : ''}>Vor den Werwölfen</option><option value="after" ${d.after ? 'selected' : ''}>Nach den Werwölfen, vor der Hexe</option></select></label>
          <label class="col" style="gap:4px"><span class="eyebrow">Ansage zum Vorlesen</span><input class="inp" name="say" value="${esc(d.say)}" maxlength="300" placeholder="Der Nachtwächter erwacht."></label>
          <button class="btn primary" type="submit">Speichern</button>
        </form>
        ${m.id ? `<button class="btn danger" data-action="custom-delete">${I.close}Rolle löschen</button>` : ''}${closeBtn('Abbrechen')}`);
    }
    case 'greis': {
      const rows = g.cfg.players.map((p) => `<div class="member"><b>${esc(p.name)}</b><div class="seg" style="min-width:130px"><button class="${g.groups[p.id] === 'A' ? 'on' : ''}" data-action="greis-set" data-id="${p.id}" data-v="A">1</button><button class="${g.groups[p.id] === 'B' ? 'on' : ''}" data-action="greis-set" data-id="${p.id}" data-v="B">2</button></div></div>`).join('');
      return sheet(`<h2>Gruppen des Verbitterten Greises</h2><p class="muted">Teile das Dorf nach einem sichtbaren Merkmal (Brille, Größe, Haarfarbe …) und sage es laut an. Hier ordnest du jede Person der Gruppe 1 oder 2 zu.</p>
        <div class="row wrap"><button class="btn sm" data-action="greis-halves">Hälften</button><button class="btn sm" data-action="greis-alt">Abwechselnd</button><button class="btn sm" data-action="greis-random">Zufällig</button></div>
        <div class="deaths">${rows}</div><div class="mfoot"><button class="btn primary" data-action="close-modal">Fertig</button></div>`);
    }
    case 'install-help': {
      const steps = isIOS()
        ? ['Öffne diese Seite in <b>Safari</b> (nicht in einer anderen App).', 'Tippe unten oder oben auf <b>Teilen</b> (Quadrat mit Pfeil).', 'Wähle <b>Zum Home-Bildschirm</b> und dann <b>Hinzufügen</b>.', 'Starte die App künftig vom Home-Bildschirm. Sie läuft dann auch ohne Netz.']
        : ['Öffne diese Seite in <b>Chrome</b>.', 'Tippe oben rechts auf das Menü <b>⋮</b>.', 'Wähle <b>App installieren</b> (oder <b>Zum Startbildschirm hinzufügen</b>).', 'Starte die App künftig vom Startbildschirm. Sie läuft dann auch ohne Netz.'];
      return sheet(`<h2>App installieren</h2><ol class="col" style="padding-left:20px;margin:0">${steps.map((t) => `<li>${t}</li>`).join('')}</ol>${isAndroid() ? '<p class="muted" style="font-size:13px">Tipp: Erscheint „App installieren“ nicht, ist sie vielleicht schon installiert, oder du bist in einem anderen Browser als Chrome.</p>' : ''}${closeBtn()}`);
    }
    case 'confirm': return sheet(`<h2>${esc(m.title)}</h2><p>${esc(m.text)}</p><div class="mfoot"><div class="row"><button class="btn" data-action="close-modal" style="flex:1">Abbrechen</button><button class="btn danger" data-action="confirm-yes" style="flex:1">Ja</button></div></div>`);
    default: return '';
  }
};
