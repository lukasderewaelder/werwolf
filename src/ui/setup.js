// Assistent für ein neues Spiel: Spieler, Modus, Rollen, Hausregeln.
import { S, ui, views, on, go, clearUndo, toast, render } from './core.js';
import { esc, art, I, circlePos, tokenSize } from './art.js';
import { topBar, rosterHtml, groupChips } from './home.js';
import { ensureGroup, presentPlayers, currentCounts } from '../store.js';
import { ROLES, RM, SETS, CAMP_LABEL, recommendCounts, requiredCards, fillVillagers, registerRoles } from '../engine/roles.js';
import { uid } from '../store.js';
import { createGame, setupProblems, DEFAULT_RULES, townRandomMap } from '../engine/game.js';
import { activeCards } from './cards.js';
import { townSetupHtml, townSel } from './town.js';

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

/** Neumond und Varianten (jede einzeln schaltbar). */
export function variantRows() {
  return [
    ['events', 'Ereigniskarten (Neumond)', 'Ab dem zweiten Morgen liest der zuletzt Ausgeschiedene eine Karte vor. Dazu Büttel und Wahrsagerin mit Spiritismus-Fragen.'],
    ['charm', 'Lykanthropische Betörung', 'Wolfsopfer sterben nicht, sondern verlieren heimlich alle Fähigkeiten. Wird ein Betörter hingerichtet, scheiden alle Betörten aus. Die Wölfe gewinnen mit dem vorletzten betörten Dorfbewohner.'],
    ['harvest', 'Erntefest in Düsterwald', 'Fähigkeiten sind gestört: Wölfe reißen nur Nachbarn von Wölfen, Jäger und Heiler wirken nur auf Nachbarn, der Flötenspieler verzaubert nur eine Person, die Seherin sieht die Rollen ihrer Nachbarn mit. Hexe, Hauptmann, Sündenbock und Amor führst du nach dem Regelheft selbst.'],
    ['town', 'Die Gemeinde (Gebäude und Berufe)', 'Öffentliche Gebäude mit Berufen: Bauern, Wirt, Lehrerin, Barbier, Schlossherr, Vogt u. a. Vagabunden ohne Gebäude ziehen später ein. Dazu Rabe und Brandstifter.'],
    ['voucher', '„Er ist es ganz sicher nicht“', 'Neue Art der Abstimmung: Reihum bürgt jeder für eine Person, die sich setzt. Wer als Einziger steht, ist das Opfer.'],
  ];
}

export function rulesHtml(rules) {
  const row = ([k, t, s]) => `<button class="opt" data-action="rule-toggle" data-key="${k}"><span class="t"><b>${t}</b><span>${s}</span></span><span class="toggle ${rules[k] ? 'on' : ''}"><i></i></span></button>`;
  const cards = rules.events ? `<div class="card flat col"><b>Ereigniskarten</b>
      <div class="seg">${[1, 2, 3].map((n) => `<button class="${(+rules.eventEvery || 1) === n ? 'on' : ''}" data-action="rule-set" data-key="eventEvery" data-v="${n}">${n === 1 ? 'Jeden Morgen' : `Jeden ${n}. Morgen`}</button>`).join('')}</div>
      <span class="muted" style="font-size:13px">Für Runden, die Neumond noch nicht kennen: lieber seltener ziehen. ${activeCards().length} Karten im Stapel.</span>
      <div class="row wrap"><button class="btn sm" data-action="cards-open">${I.list}Karten und Büttel</button></div></div>` : '';
  return `<div class="col"><div class="card flat col">
      <b>Die Seherin sieht</b>
      <div class="seg"><button class="${rules.seerSees !== 'camp' ? 'on' : ''}" data-action="rule-set" data-key="seerSees" data-v="role">Die ganze Rolle</button><button class="${rules.seerSees === 'camp' ? 'on' : ''}" data-action="rule-set" data-key="seerSees" data-v="camp">Nur: Werwolf oder nicht</button></div>
    </div>${ruleRows().map(row).join('')}
    <div class="eyebrow" style="margin-top:6px">Neumond und Varianten</div>${variantRows().map(row).join('')}${cards}
    ${rules.town ? townSetupHtml(presentPlayers(S).length) : ''}
    <button class="btn sm" data-action="variants-open" style="align-self:flex-start">Weitere Varianten zum Nachlesen</button></div>`;
}

on('rule-toggle', (el) => { const r = S.settings.rules; r[el.dataset.key] = !r[el.dataset.key]; });
on('rule-set', (el) => { S.settings.rules[el.dataset.key] = el.dataset.key === 'eventEvery' ? +el.dataset.v : el.dataset.v; });

function startWizard() {
  ensureGroup(S);
  S.setup.step = 0; S.setup.counts = null;
  if (!S.groups.some((g) => g.members.length) || S.setup.order.length === 0) S.setup.order = ensureGroup(S).members.map((m) => m.id);
  go('setup');
}
on('new-game', () => {
  if (S.game && S.game.phase !== 'ended') { ui.modal = { type: 'new-over' }; return; }
  startWizard();
  return false;
});
on('new-replace', () => { S.game = null; clearUndo(); startWizard(); return false; });
on('new-pause', async () => { const { pauseCurrent } = await import('./saves.js'); pauseCurrent(false); startWizard(); const { render: r } = await import('./core.js'); r(); return false; });
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
function seatPreview(present) {
  const n = present.length;
  if (n < 2) return '';
  const { tw, nf } = tokenSize(n);
  const toks = present.map((p, i) => { const { x, y } = circlePos(i, n); return `<button class="st ${ui.seatSel === p.id ? 'sel' : ''}" data-seat="${p.id}" style="left:${x}%;top:${y}%;--tw:${tw + 2};--nf:${nf + 1}px" aria-label="Platz ${i + 1}: ${esc(p.name)}"><span class="no">${i + 1}</span><span class="nm">${esc(p.name)}</span></button>`; }).join('');
  return `<div class="seatprev" data-keep="seat"><div class="ring"></div><div class="mid">Tisch<br>Uhrzeigersinn</div>${toks}</div>`;
}

function swapSeats(a, b) {
  const o = S.setup.order, i = o.indexOf(a), j = o.indexOf(b);
  if (i < 0 || j < 0) return;
  [o[i], o[j]] = [o[j], o[i]];
}

// Ziehen und Tippen auf den Plätzen (Zeiger-Ereignisse: Maus, Finger und Stift)
let drag = null;
document.addEventListener('pointerdown', (e) => {
  const t = e.target.closest?.('.st[data-seat]');
  if (!t) return;
  drag = { id: t.dataset.seat, el: t, x: e.clientX, y: e.clientY, moved: false, ghost: null, pid: e.pointerId };
  try { t.setPointerCapture(e.pointerId); } catch { /* egal */ }
});
document.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.pid) return;
  if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8) {
    drag.moved = true;
    drag.ghost = drag.el.cloneNode(true); drag.ghost.classList.add('ghost'); drag.ghost.style.cssText += `;width:${drag.el.getBoundingClientRect().width}px`;
    document.body.appendChild(drag.ghost); drag.el.classList.add('drag-src');
  }
  if (!drag.moved) return;
  drag.ghost.style.left = `${e.clientX}px`; drag.ghost.style.top = `${e.clientY}px`;
  document.querySelectorAll('.st.over').forEach((x) => x.classList.remove('over'));
  const over = document.elementFromPoint(e.clientX, e.clientY)?.closest('.st[data-seat]');
  if (over && over !== drag.el) over.classList.add('over');
});
const endDrag = (e) => {
  if (!drag || (e.pointerId !== undefined && e.pointerId !== drag.pid)) return;
  const d = drag; drag = null;
  d.ghost?.remove();
  document.querySelectorAll('.st.over').forEach((x) => x.classList.remove('over'));
  if (e.type === 'pointercancel') { d.el.classList.remove('drag-src'); return; }
  if (d.moved) {
    const over = document.elementFromPoint(e.clientX, e.clientY)?.closest('.st[data-seat]');
    if (over && over.dataset.seat !== d.id) swapSeats(d.id, over.dataset.seat);
    ui.seatSel = null;
  } else if (ui.seatSel && ui.seatSel !== d.id) { swapSeats(ui.seatSel, d.id); ui.seatSel = null; }
  else ui.seatSel = ui.seatSel === d.id ? null : d.id;
  render();
};
document.addEventListener('pointerup', endDrag);
document.addEventListener('pointercancel', endDrag);
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
const maxOf = (id, n) => (id === 'wolf' || RM[id].custom ? Math.max(1, n - 1) : RM[id].group ? RM[id].group : 1);
on('role-inc', (el) => setCount(el.dataset.id, +1));
on('role-dec', (el) => setCount(el.dataset.id, -1));
function setCount(id, d) {
  const n = presentPlayers(S).length, c = currentCounts(S), r = RM[id];
  const step = r.group ? r.group : 1;
  const cur = c[id] || 0;
  let v = cur + d * step;
  if (r.group) v = d > 0 ? r.group : 0;
  v = Math.max(0, Math.min(v, id === 'wolf' || r.custom ? n : (r.group || 1)));
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
    const edit = r.custom ? `<button data-action="custom-edit" data-id="${r.id}" aria-label="Bearbeiten" style="width:36px;height:36px;border-radius:10px;background:var(--surface2);border:1px solid var(--line);display:grid;place-items:center">${I.menu}</button>` : '';
    return `<div class="rtile ${k ? 'on' : ''}">${art(r.id)}<div class="info"><b>${esc(r.name)}</b><small>${esc(r.sub)}</small>${ctl}</div>${edit}</div>`;
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
    <div class="role-grid scroll" data-keep="rolegrid">${inSet(cur).map(tile).join('')}${cur === 'eigene' ? `<button class="rtile" data-action="custom-new" style="justify-content:center;font-weight:700">${I.plus} Eigene Rolle anlegen</button>` : ''}</div>`;
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
    <div class="hint">${I.eye}<span>Die Reihenfolge ist die Sitzordnung im Uhrzeigersinn. Sie bestimmt Nachbarn für Fuchs, Bärenführer und Ritter. Ziehe eine Person auf eine andere, um beide zu tauschen, oder tippe nacheinander zwei Personen an.</span></div>
    ${seatPreview(present)}
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
    <div class="page" style="padding-top:12px"><div class="col scroll" data-keep="wizard" style="flex:1;min-height:0;padding:2px">${body}</div>
      <div class="foot">${st === 3 ? `<button class="btn primary" data-action="start-game">${I.moon}<span>Spiel starten</span></button>` : `<button class="btn primary" data-action="wiz-next"><span>Weiter</span>${I.right}</button>`}</div>
    </div></div>`;
};

/* ---------- Spiel starten ---------- */
on('start-game', () => {
  const players = presentPlayers(S);
  const counts = S.setup.counts;
  const pr = setupProblems({ players, counts, rules: S.settings.rules, town: townSel() });
  if (pr.length) { toast(pr[0]); S.setup.step = 2; return; }
  const custom = S.customRoles.filter((r) => counts[r.id]);
  const rules = { ...DEFAULT_RULES, ...S.settings.rules };
  const eventCards = rules.events ? activeCards() : [];
  if (rules.events && !eventCards.length) { toast('Keine Ereigniskarten ausgewählt: Karten und Büttel öffnen.'); return; }
  const beadleIds = (S.settings.beadleIds ?? []).filter((id) => eventCards.some((c) => c.id === id));
  S.game = createGame({ players, counts, custom, mode: S.settings.mode, rules, eventCards, beadleIds, town: rules.town ? { ...townSel() } : null });
  if (rules.town) S.game.town.b = townRandomMap(S.game);
  clearUndo();
  ui.timer.left = S.settings.timer; ui.timer.running = false;
  go('game');
  if (rules.town) { ui.modal = { type: 'town-assign' }; render(); }
  else if (counts.greis && S.settings.mode === 'cards') { ui.modal = { type: 'greis' }; render(); }
  return false;
});

export { CAMP_LABEL };

/* ---------- Eigene Rollen ---------- */
const blankCustom = () => ({ name: '', camp: 'village', sub: '', desc: '', say: '', wake: 'none', after: false, icon: '', cact: 'none', cself: false, win: 'camp' });
on('custom-new', () => { ui.modal = { type: 'custom', id: null, draft: blankCustom() }; });
on('custom-edit', (el) => { const r = S.customRoles.find((x) => x.id === el.dataset.id); if (r) ui.modal = { type: 'custom', id: r.id, draft: { ...blankCustom(), ...r } }; });
on('submit:custom-form', (f) => {
  const d = Object.fromEntries(new FormData(f).entries());
  const name = (d.name || '').trim().slice(0, 28);
  if (!name) { toast('Bitte einen Namen eingeben.'); return; }
  const role = { id: ui.modal.id ?? uid('c'), name, camp: d.camp === 'wolf' ? 'wolf' : 'village', sub: (d.sub || '').trim().slice(0, 60), desc: (d.desc || '').trim().slice(0, 600), say: (d.say || '').trim().slice(0, 300), wake: d.wake || 'none', after: d.after === 'after', icon: (d.icon || '').slice(0, 8), cact: d.cact || 'none', cself: d.cself === 'on', win: d.win || 'camp' };
  const i = S.customRoles.findIndex((x) => x.id === role.id);
  if (i >= 0) S.customRoles[i] = role; else S.customRoles.push(role);
  registerRoles([role]);
  ui.libSet = 'eigene';
  ui.modal = null;
});
on('custom-delete', () => {
  const id = ui.modal.id;
  S.customRoles = S.customRoles.filter((x) => x.id !== id);
  const i = ROLES.findIndex((x) => x.id === id); if (i >= 0) ROLES.splice(i, 1);
  delete RM[id];
  if (S.setup.counts) { delete S.setup.counts[id]; S.setup.counts = fillVillagers(S.setup.counts, presentPlayers(S).length); }
  ui.modal = null;
});
