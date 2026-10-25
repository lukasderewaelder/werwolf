// Assistent für ein neues Spiel: Spieler, Modus, Rollen, Hausregeln.
import { S, ui, views, on, go, clearUndo, toast } from './core.js';
import { esc, art, I } from './art.js';
import { topBar, rosterHtml, groupChips } from './home.js';
import { ensureGroup, presentPlayers, currentCounts } from '../store.js';
import { ROLES, RM, SETS, CAMP_LABEL, recommendCounts, requiredCards, fillVillagers } from '../engine/roles.js';
import { createGame, setupProblems, DEFAULT_RULES } from '../engine/game.js';

const STEPS = ['Wer spielt mit?', 'Wie spielt ihr?', 'Welche Rollen?', 'Regeln und Start'];

export function ruleRows() {
  return [
    ['captain', 'Hauptmann', 'Wird am ersten Tag gewählt, seine Stimme zählt doppelt, er bestimmt seinen Nachfolger.'],
    ['parityWin', 'Wölfe gewinnen bei Gleichstand', 'Sobald es genauso viele Wölfe wie andere Spieler gibt.'],
    ['callDeadRoles', 'Tote Rollen zum Schein aufrufen', 'Niemand soll am Aufruf erkennen, dass eine Rolle ausgeschieden ist.'],
    ['noVictimsNight1', 'Keine Todesopfer in der ersten Nacht', 'Wölfe und Hexe wachen auf, aber niemand stirbt.'],
    ['hideWolfdogSide', 'Seite von Wolfshund bleibt geheim', 'Auch nach dem Tod wird nicht gesagt, ob er Wolf oder Dorf war.'],
    ['brothersRewake', 'Drei Brüder erneut wecken', 'Jede zweite Nacht, damit sie sich leise absprechen können.'],
  ];
}

export function rulesHtml(rules) {
  const rows = ruleRows().map(([k, t, s]) => `<button class="opt" data-action="rule-toggle" data-key="${k}"><span class="t"><b>${t}</b><span>${s}</span></span><span class="toggle ${rules[k] ? 'on' : ''}"><i></i></span></button>`).join('');
  return `<div class="col"><div class="card flat col">
      <b>Die Seherin sieht</b>
      <div class="seg"><button class="${rules.seerSees !== 'camp' ? 'on' : ''}" data-action="rule-set" data-key="seerSees" data-v="role">Die ganze Rolle</button><button class="${rules.seerSees === 'camp' ? 'on' : ''}" data-action="rule-set" data-key="seerSees" data-v="camp">Nur Wolf oder Dorf</button></div>
    </div>${rows}</div>`;
}

on('rule-toggle', (el) => { const r = S.settings.rules; r[el.dataset.key] = !r[el.dataset.key]; });
on('rule-set', (el) => { S.settings.rules[el.dataset.key] = el.dataset.v; });

on('new-game', () => {
  ensureGroup(S);
  S.setup.step = 0; S.setup.counts = null;
  if (!S.groups.some((g) => g.members.length) || S.setup.order.length === 0) S.setup.order = ensureGroup(S).members.map((m) => m.id);
  go('setup');
  return false;
});
on('wiz-back', () => { if (S.setup.step > 0) S.setup.step--; else go('home'); });
on('wiz-next', () => {
  const st = S.setup.step, n = presentPlayers(S).length;
  if (st === 0 && n < 3) { toast('Mindestens 3 Spieler nötig.'); return; }
  if (st === 2) {
    const pr = setupProblems({ players: presentPlayers(S), counts: currentCounts(S) });
    if (pr.length) { toast(pr[0]); return; }
  }
  if (st < 3) S.setup.step = st + 1;
});
on('seat-tab', (el) => { ui.seatTab = el.dataset.v; });
on('set-mode', (el) => { S.settings.mode = el.dataset.mode; });

/* ---------- Sitzordnung ---------- */
on('seat-up', (el) => moveSeat(el.dataset.id, -1));
on('seat-down', (el) => moveSeat(el.dataset.id, 1));
function moveSeat(id, d) {
  const present = presentPlayers(S).map((p) => p.id), i = present.indexOf(id), j = i + d;
  if (i < 0 || j < 0 || j >= present.length) return;
  const o = S.setup.order, a = o.indexOf(present[i]), b = o.indexOf(present[j]);
  [o[a], o[b]] = [o[b], o[a]];
}
on('seat-shuffle', () => {
  const present = presentPlayers(S).map((p) => p.id);
  for (let i = present.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [present[i], present[j]] = [present[j], present[i]]; }
  const slots = S.setup.order.map((id, i) => (S.setup.off[id] ? [i, id] : null)).filter(Boolean);
  const out = []; let k = 0;
  for (let i = 0; i < S.setup.order.length; i++) { const off = slots.find(([x]) => x === i); out.push(off ? off[1] : present[k++]); }
  S.setup.order = out;
});
on('seat-reverse', () => { S.setup.order.reverse(); });

/* ---------- Rollenwahl ---------- */
const maxOf = (id, n) => (id === 'wolf' ? Math.max(1, n - 1) : RM[id].group ? RM[id].group : 1);
on('role-inc', (el) => setCount(el.dataset.id, +1));
on('role-dec', (el) => setCount(el.dataset.id, -1));
function setCount(id, d) {
  const n = presentPlayers(S).length, c = currentCounts(S), r = RM[id];
  const step = r.group ? r.group : 1;
  const cur = c[id] || 0;
  let v = cur + d * step;
  if (r.group) v = d > 0 ? r.group : 0;
  v = Math.max(0, Math.min(v, id === 'wolf' ? n : (r.group || 1)));
  if (v) c[id] = v; else delete c[id];
  S.setup.counts = fillVillagers(c, n);
}
on('roles-recommend', () => { S.setup.counts = recommendCounts(Math.max(3, presentPlayers(S).length)); });
on('roles-clear', () => { S.setup.counts = fillVillagers({}, presentPlayers(S).length); });
on('lib-set-setup', (el) => { ui.libSet = el.dataset.set; });

function rolesStep() {
  const n = presentPlayers(S).length, c = currentCounts(S);
  S.setup.counts = fillVillagers(c, n);
  const counts = S.setup.counts;
  const total = Object.values(counts).reduce((a, b) => a + (b || 0), 0);
  const need = requiredCards(counts, n);
  const camp = { village: 0, wolf: 0, solo: 0, twofold: 0 };
  for (const [id, k] of Object.entries(counts)) camp[RM[id].camp] += k || 0;
  const probs = setupProblems({ players: presentPlayers(S), counts });
  const sets = Object.keys(SETS);
  const cur = ui.libSet && sets.includes(ui.libSet) ? ui.libSet : 'basis';
  const tile = (r) => {
    const k = counts[r.id] || 0;
    const ctl = r.id === 'villager' ? `<span class="muted" style="font-weight:700">automatisch</span>` : r.group
      ? `<div class="stepper"><button data-action="role-dec" data-id="${r.id}" aria-label="Weniger" ${k ? '' : 'disabled'}>${I.minus}</button><span class="val">${k}</span><button data-action="role-inc" data-id="${r.id}" aria-label="Mehr" ${k ? 'disabled' : ''}>${I.plus}</button></div>`
      : `<div class="stepper"><button data-action="role-dec" data-id="${r.id}" aria-label="Weniger" ${k ? '' : 'disabled'}>${I.minus}</button><span class="val">${k}</span><button data-action="role-inc" data-id="${r.id}" aria-label="Mehr" ${k >= maxOf(r.id, n) ? 'disabled' : ''}>${I.plus}</button></div>`;
    return `<div class="rtile ${k ? 'on' : ''}">${art(r.id)}<div class="info"><b>${esc(r.name)}</b><small>${esc(r.sub)}</small>${ctl}</div></div>`;
  };
  const inSet = (s) => ROLES.filter((r) => r.set === s);
  const setBadge = (s) => inSet(s).reduce((a, r) => a + (counts[r.id] ? 1 : 0), 0);
  return `<div class="sumbar">
      <div class="s ${total === need ? 'ok' : 'bad'}"><b>${total}/${need}</b><span>Karten</span></div>
      <div class="s"><b>${camp.wolf}</b><span>Werwölfe</span></div>
      <div class="s"><b>${camp.village}</b><span>Dorf</span></div>
      <div class="s"><b>${camp.twofold + camp.solo}</b><span>Zweideutig / allein</span></div></div>
    ${probs.length ? `<div class="problems">${probs.map(esc).join(' ')}</div>` : ''}
    <div class="row wrap"><button class="btn sm" data-action="roles-recommend">${I.dice}Empfehlung für ${n} Spieler</button><button class="btn sm ghost" data-action="roles-clear">Zurücksetzen</button></div>
    <div class="chips">${sets.map((s) => `<button class="chip ${s === cur ? 'on' : ''}" data-action="lib-set-setup" data-set="${s}">${SETS[s]}${setBadge(s) ? `<em>${setBadge(s)}</em>` : ''}</button>`).join('')}</div>
    <div class="role-grid scroll" data-keep="rolegrid">${inSet(cur).map(tile).join('')}</div>`;
}

function whoStep() {
  const present = presentPlayers(S);
  const tab = ui.seatTab === 'order' ? 'order' : 'who';
  const seg = `<div class="seg"><button class="${tab === 'who' ? 'on' : ''}" data-action="seat-tab" data-v="who">Wer ist da?</button><button class="${tab === 'order' ? 'on' : ''}" data-action="seat-tab" data-v="order">Sitzordnung</button></div>`;
  if (tab === 'who') return `${groupChips()}${seg}${rosterHtml({ attendance: true })}<p class="muted" style="font-size:13px">${present.length} Spieler. Tippe das Häkchen, um jemanden aus dieser Runde zu nehmen.</p>`;
  const rows = present.map((p, i) => `<div class="member"><span class="no">${i + 1}</span><b>${esc(p.name)}</b>
      <button class="mini" data-action="seat-up" data-id="${p.id}" aria-label="Nach oben" ${i === 0 ? 'disabled' : ''}>${I.up}</button>
      <button class="mini" data-action="seat-down" data-id="${p.id}" aria-label="Nach unten" ${i === present.length - 1 ? 'disabled' : ''}>${I.down}</button></div>`).join('');
  return `${groupChips()}${seg}
    <div class="hint">${I.eye}<span>Die Reihenfolge ist die Sitzordnung im Uhrzeigersinn. Sie bestimmt Nachbarn für Fuchs, Bärenführer und Ritter.</span></div>
    <div class="row wrap"><button class="btn sm" data-action="seat-shuffle">${I.dice}Mischen</button><button class="btn sm" data-action="seat-reverse">${I.undo}Umkehren</button></div>
    <div class="member-list scroll" data-keep="roster">${rows}</div>`;
}

function modeStep() {
  const m = S.settings.mode;
  return `<div class="mode-grid">
    <button class="mode ${m === 'cards' ? 'on' : ''}" data-action="set-mode" data-mode="cards">
      <div class="ph">${art('wolf')}${art('seer')}${art('witch')}</div><h2>Mit Spielkarten</h2>
      <p>Ihr verteilt eure echten Karten. Die App führt dich durch die Nacht: Du tippst an, wer aufwacht, und sie rechnet alles Weitere.</p></button>
    <button class="mode ${m === 'digital' ? 'on' : ''}" data-action="set-mode" data-mode="digital">
      <div class="ph">${art('hunter')}${art('cupid')}${art('fox')}</div><h2>Ohne Karten</h2>
      <p>Die App lost die Rollen aus. Du hältst das Gerät und zeigst jedem heimlich seine Rolle, danach geht es mit der Nacht los.</p></button></div>`;
}

function startStep() {
  const n = presentPlayers(S).length, c = S.setup.counts, rules = S.settings.rules;
  const list = ROLES.filter((r) => c[r.id]).map((r) => `<span class="chip on" style="min-height:34px">${esc(r.short ?? r.name)}${c[r.id] > 1 ? `<em>${c[r.id]}</em>` : ''}</span>`).join('');
  return `<div class="card flat col"><div class="eyebrow">${n} Spieler · ${S.settings.mode === 'cards' ? 'mit Spielkarten' : 'ohne Karten'}</div><div class="row wrap">${list}</div></div>${rulesHtml(rules)}`;
}

views.setup = () => {
  const st = S.setup.step;
  const body = [whoStep, modeStep, rolesStep, startStep][st]();
  return `<div class="view">${topBar(STEPS[st], `Neues Spiel · Schritt ${st + 1} von 4`, { back: 'wiz-back', right: `<button class="ibtn" data-action="back-home" aria-label="Abbrechen">${I.close}</button>` })}
    <div class="steps">${STEPS.map((_, i) => `<i class="${i <= st ? 'on' : ''}"></i>`).join('')}</div>
    <div class="page" style="padding-top:12px">${body}
      <div class="foot">${st === 3 ? `<button class="btn primary" data-action="start-game">${I.moon}<span>Spiel starten</span></button>` : `<button class="btn primary" data-action="wiz-next"><span>Weiter</span>${I.right}</button>`}</div>
    </div></div>`;
};

/* ---------- Spiel starten ---------- */
on('start-game', () => {
  const players = presentPlayers(S);
  const counts = S.setup.counts;
  const pr = setupProblems({ players, counts });
  if (pr.length) { toast(pr[0]); S.setup.step = 2; return; }
  S.game = createGame({ players, counts, mode: S.settings.mode, rules: { ...DEFAULT_RULES, ...S.settings.rules } });
  clearUndo();
  ui.timer.left = S.settings.timer; ui.timer.running = false;
  go('game');
  return false;
});

export { CAMP_LABEL };
