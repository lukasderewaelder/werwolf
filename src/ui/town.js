// Die Gemeinde: Oberfläche für Gebäude und Berufe (Zuordnung beim Start, Gemeinde-Dialog, Knöpfe im Abstimmungsfeld).
import { S, ui, on, dispatch } from './core.js';
import { esc, I } from './art.js';
import { BUILDINGS, BUILDING_KEYS, DEFAULT_TOWN, buildingTotal } from '../engine/town.js';
import { nm, alive, buildingOf, isVagabond, townHolders, abilityReady, townRandomMap, tally } from '../engine/game.js';

const sheet = (inner, wide = false) => `<div class="backdrop" data-action="close-modal"><div class="modal ${wide ? 'wide' : ''}" data-stop role="dialog" aria-modal="true">${inner}</div></div>`;
const closeBtn = (label = 'Schließen') => `<div class="mfoot"><button class="btn" data-action="close-modal">${label}</button></div>`;

/* ---------- Einrichten: welche Gebäude sind dabei ---------- */

export const townSel = () => (S.settings.townSel ??= { ...DEFAULT_TOWN });

export function townSetupHtml(playerCount) {
  const sel = townSel(), total = buildingTotal(sel);
  const farm = `<div class="rtile ${sel.farm ? 'on' : ''}"><div class="info"><b>${BUILDINGS.farm.name} (${BUILDINGS.farm.job})</b><small>${esc(BUILDINGS.farm.text)}</small>
      <div class="stepper"><button data-action="town-farm" data-d="-1" aria-label="Weniger" ${sel.farm ? '' : 'disabled'}>${I.minus}</button><span class="val">${sel.farm || 0}</span><button data-action="town-farm" data-d="1" aria-label="Mehr" ${(sel.farm || 0) >= BUILDINGS.farm.max ? 'disabled' : ''}>${I.plus}</button></div></div></div>`;
  const chips = BUILDING_KEYS.filter((k) => k !== 'farm').map((k) => `<button class="chip ${sel[k] ? 'on' : ''}" data-action="town-key" data-key="${k}" title="${esc(BUILDINGS[k].text)}">${esc(BUILDINGS[k].name)}</button>`).join('');
  return `<div class="card flat col"><b>Gebäude der Gemeinde</b>
    <span class="muted" style="font-size:13px">${total} Gebäude für ${playerCount} Spieler. Wer kein Gebäude bekommt, ist Vagabund. Beim Start verteilt die App sie zufällig, du kannst sie danach ändern.</span>
    ${farm}<div class="chips" style="flex-wrap:wrap;overflow:visible">${chips}</div>
    ${total > playerCount ? `<div class="problems">Mehr Gebäude als Spieler.</div>` : ''}</div>`;
}
on('town-farm', (el) => { const s = townSel(); s.farm = Math.max(0, Math.min(BUILDINGS.farm.max, (s.farm || 0) + +el.dataset.d)); if (!s.farm) delete s.farm; });
on('town-key', (el) => { const s = townSel(), k = el.dataset.key; if (s[k]) delete s[k]; else s[k] = 1; });

/* ---------- Zuordnung ---------- */

on('town-assign-open', () => { ui.modal = { type: 'town-assign' }; });
const setMap = (map) => { dispatch({ t: 'town-map', map }, { undoable: false }); return false; };
on('town-random', () => setMap(townRandomMap(S.game)));
on('town-clear', () => setMap({}));
on('town-cycle', (el) => {
  const g = S.game, pid = el.dataset.pid, map = { ...g.town.b };
  const cur = map[pid] ?? null;
  const left = { ...g.cfg.town };
  for (const [id, k] of Object.entries(map)) if (id !== pid) left[k] = (left[k] || 0) - 1;
  const opts = [null, ...BUILDING_KEYS.filter((k) => (left[k] || 0) > 0)];
  const next = opts[(opts.indexOf(cur) + 1) % opts.length];
  if (next) map[pid] = next; else delete map[pid];
  return setMap(map);
});

export function townAssignModal(g) {
  const map = g.town.b, total = buildingTotal(g.cfg.town), given = Object.keys(map).length;
  const rows = g.cfg.players.map((p) => { const k = map[p.id]; return `<div class="member"><b>${esc(p.name)}</b><button class="btn sm ${k ? 'on' : ''}" data-action="town-cycle" data-pid="${p.id}" style="min-width:150px">${k ? esc(`${BUILDINGS[k].name} · ${BUILDINGS[k].job}`) : 'Vagabund'}</button></div>`; }).join('');
  return sheet(`<h2>Gebäude verteilen</h2><p class="muted" style="font-size:14px">Tippe eine Person an, um ihr der Reihe nach die Gebäude zu geben. Gebäude sind öffentlich. ${given} von ${total} Gebäuden vergeben, alle anderen sind Vagabunden.</p>
    <div class="row wrap"><button class="btn sm" data-action="town-random">${I.dice}Zufällig</button><button class="btn sm ghost" data-action="town-clear">Alle Vagabunden</button></div>
    <div class="deaths">${rows}</div>
    <div class="mfoot"><button class="btn primary" data-action="close-modal" ${given < Math.min(total, g.cfg.players.length) ? 'disabled' : ''}>Fertig</button></div>`);
}

/* ---------- Im Spiel ---------- */

on('town-open', () => { ui.modal = { type: 'town' }; });
on('town-use', (el) => { dispatch({ t: 'town-use', pid: el.dataset.pid, target: el.dataset.target }); return false; });
on('vogt-assign', (el) => { dispatch({ t: 'vogt-assign', pid: el.dataset.pid, key: el.dataset.key }); return false; });
on('barber-pick', (el) => { ui.modal = { type: 'town', barber: el.dataset.pid, target: el.dataset.target }; });
on('barber-do', () => { const m = ui.modal; ui.modal = null; dispatch({ t: 'barber', pid: m.barber, target: m.target }); return false; });
on('ban-arm', () => { dispatch({ t: 'ban-arm' }, { undoable: false }); return false; });
on('inn-arm', () => { dispatch({ t: 'inn-arm' }, { undoable: false }); return false; });
on('pardon', () => { dispatch({ t: 'pardon' }); return false; });

export function townModal(g) {
  const m = ui.modal, day = g.phase === 'day';
  const owners = g.cfg.players.filter((p) => buildingOf(g, p.id));
  const state = (p) => { const k = buildingOf(g, p.id), b = BUILDINGS[k]; return !alive(g, p.id) ? 'tot' : k === 'inn' && g.town.innLost ? 'Schutz verloren' : b.once ? (g.town.used[p.id] ? 'benutzt' : 'bereit') : 'dauerhaft'; };
  const list = owners.map((p) => { const k = buildingOf(g, p.id); return `<div class="evrow"><div class="evtxt"><b>${esc(p.name)} · ${esc(BUILDINGS[k].job)}</b><small>${esc(BUILDINGS[k].name)} · ${state(p)}</small></div></div>`; }).join('') || '<p class="muted">Noch keine Gebäude verteilt.</p>';
  const living = g.cfg.players.filter((p) => alive(g, p.id));
  const vag = living.filter((p) => isVagabond(g, p.id));
  const vogt = townHolders(g, 'vogt')[0];
  const free = vogt && g.town.free.length ? `<div class="eyebrow">Freie Gebäude (Vogt ${esc(vogt.name)})</div>${g.town.free.map((k, i) => `<div class="card flat col"><b>${esc(BUILDINGS[k].name)}</b><div class="chips" style="flex-wrap:wrap;overflow:visible">${vag.length ? vag.map((p) => `<button class="chip" data-action="vogt-assign" data-pid="${p.id}" data-key="${k}" ${day ? '' : 'disabled'}>${esc(p.name)} zieht ein</button>`).join('') : '<span class="muted">Kein Vagabund</span>'}</div></div>`).join('')}` : (g.town.free.length ? `<p class="muted" style="font-size:13px">${g.town.free.length} Gebäude stehen leer. Ohne Vogt wird nichts mehr zugeteilt.</p>` : '');
  const acts = [];
  for (const p of living) {
    const k = buildingOf(g, p.id);
    if (!k || !abilityReady(g, p.id)) continue;
    if (k === 'church') acts.push(`<button class="opt" data-action="town-use" data-pid="${p.id}" ${day ? '' : 'disabled'}><span class="t"><b>Beichtvater ${esc(p.name)}: Beichte abgenommen</b><span>Zeigt, dass die einmalige Fähigkeit benutzt ist.</span></span></button>`);
    if (k === 'shack') { const usedOnes = living.filter((x) => g.town.used[x.id]); acts.push(`<div class="card flat col"><b>Quacksalber ${esc(p.name)}: Fähigkeit zurückgeben</b><div class="chips" style="flex-wrap:wrap;overflow:visible">${usedOnes.length ? usedOnes.map((x) => `<button class="chip" data-action="town-use" data-pid="${p.id}" data-target="${x.id}" ${day ? '' : 'disabled'}>${esc(x.name)}</button>`).join('') : '<span class="muted">Niemand hat seine Fähigkeit benutzt.</span>'}</div></div>`); }
    if (k === 'barber') {
      const cands = living.filter((x) => x.id !== p.id && !isVagabond(g, x.id));
      acts.push(`<div class="card flat col"><b>Barbier ${esc(p.name)}: Person ausschalten</b>${m?.barber === p.id ? `<div class="task warn"><div class="prompt">${I.skull}<span>${esc(nm(g, m.target))} ausschalten? War sie kein Werwolf, scheidet auch der Barbier aus.</span></div></div><button class="btn danger" data-action="barber-do">Ausschalten</button>` : `<div class="chips" style="flex-wrap:wrap;overflow:visible">${cands.map((x) => `<button class="chip" data-action="barber-pick" data-pid="${p.id}" data-target="${x.id}" ${day ? '' : 'disabled'}>${esc(x.name)}</button>`).join('')}</div>`}</div>`);
    }
  }
  return sheet(`<h2>Die Gemeinde</h2>
    <div class="evlist">${list}</div>${free}
    ${acts.length ? `<div class="eyebrow">Einmalige Fähigkeiten</div><div class="col">${acts.join('')}</div>` : ''}
    ${day ? '' : '<p class="muted" style="font-size:13px">Die Fähigkeiten gelten nur am Tag.</p>'}
    <div class="row wrap"><button class="btn sm" data-action="town-assign-open">Gebäude neu verteilen</button></div>${closeBtn()}`);
}

/** Knöpfe im Abstimmungsfeld: Lehrerin, Wirt, Schlossherr. */
export function townVoteHtml(g) {
  if (!g.town || g.dayMode === 'captain') return '';
  const d = g.draft, out = [];
  if (townHolders(g, 'school').length) out.push(`<button class="btn sm ${d.banArm ? 'on' : ''}" data-action="ban-arm">${I.scale}<span>${d.banArm ? 'Person antippen …' : d.ban.length ? `Ausgeschlossen: ${esc(d.ban.map((x) => nm(g, x)).join(', '))}` : 'Lehrerin schließt aus'}</span></button>`);
  if (townHolders(g, 'inn').length) out.push(`<button class="btn sm ${d.innArm ? 'on' : ''}" data-action="inn-arm">${I.house}<span>${d.innArm ? 'Wirt: Ziel antippen …' : d.innVote ? `Wirt wählt ${esc(nm(g, d.innVote))}` : 'Stimme des Wirts'}</span></button>`);
  const manor = townHolders(g, 'manor')[0];
  if (manor && abilityReady(g, manor.id)) {
    const t = tally(g), has = d.vote || (t.leaders.length === 1 && (d.voteMode ?? 'count') === 'count');
    out.push(`<button class="btn sm" data-action="pardon" ${has ? '' : 'disabled'}>${I.crown}<span>Schlossherr begnadigt</span></button>`);
  }
  return out.length ? `<div class="acts">${out.join('')}</div>` : '';
}
