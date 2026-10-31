// Spiellogik ohne Oberfläche: Zustand ist reines JSON, jede Aktion liefert einen neuen Zustand.
// Regelgrundlage: Regelheft "Die Werwölfe von Düsterwald – Der Pakt" (siehe docs/regelabgleich.md).
import { ROLES, RM, ACTOR_POOL, roleName, requiredCards, registerRoles, isWolfRole } from './roles.js';
import { SPIRIT_CARDS, KINDS, MAX_BEADLE } from './events.js';
import { BUILDINGS, DEFAULT_TOWN } from './town.js';

export const DEFAULT_RULES = {
  captain: true,            // Hauptmann wird am ersten Tag gewählt, Stimme zählt doppelt
  parityWin: true,          // Wölfe gewinnen bei Gleichstand (Wölfe >= Rest)
  callDeadRoles: true,      // tote Rollen zum Schein weiter aufrufen
  seerSees: 'role',         // 'role' = volle Rolle, 'camp' = nur Wolf/Dorf
  noVictimsNight1: false,   // in der ersten Nacht stirbt niemand
  hideWolfdogSide: true,    // Seite von Wolfshund/Wildem Kind bleibt auch nach dem Tod geheim
  brothersRewake: false,    // Drei Brüder wachen jede zweite Nacht erneut auf
  events: false,            // Neumond: Ereigniskarten werden ab dem zweiten Morgen gezogen
  eventEvery: 1,            // jeden 1., 2. oder 3. Morgen eine Karte (für Anfänger seltener)
  charm: false,             // Lykanthropische Betörung: Wolfsopfer werden betört statt getötet
  harvest: false,           // Erntefest in Düsterwald: Fähigkeiten sind gestört
  voucher: false,           // „Er ist es ganz sicher nicht“: Abstimmung durch Bürgen
  town: false,              // Die Gemeinde: Gebäude und Berufe
};

// Stille Rollen werden im Kartenmodus in der ersten Nacht kurz erfasst (vor der eigentlichen Nacht).
const SILENT_ORDER = { hunter: 60, girl: 61, elder: 62, idiot: 63, scapegoat: 64, bear: 65, knight: 66, puresoul: 67, angel: 68, maid: 69, greis: 70 };
const INPUT_ACTS = new Set(['fire', 'kill', 'check', 'witch', 'lovers', 'swap', 'protect', 'infect', 'bigkill', 'whitekill', 'model', 'side', 'fox', 'mark', 'enchant', 'actor', 'seance', 'cust']);
export const CAUSE = {
  wolves: 'Werwölfe', bigwolf: 'Großer böser Wolf', whitewolf: 'Weißer Werwolf', poison: 'Gifttrank der Hexe',
  hunter: 'Schuss des Jägers', barber: 'Barbier', barberOut: 'Aus dem Dorf gejagt (Barbier)', fire: 'Verbrannt im Haus', charm: 'Betörung durch die Werwölfe', vote: 'Dorfgericht', tie: 'Sündenbock (Gleichstand)', heartbreak: 'Liebeskummer',
  custom: 'Fähigkeit einer eigenen Rolle', knight: 'Rostiges Schwert des Ritters', manual: 'Vom Spielleiter entfernt', girl: 'Von den Wölfen beim Spionieren erwischt',
};

const clone = (o) => JSON.parse(JSON.stringify(o));
const emptyDraft = () => ({
  kill: null, girlCaught: false, check: null, heal: null, poison: null, lovers: [], protect: null, infect: false,
  bigkill: null, whitekill: null, model: null, side: null, fox: null, mark: null, enchant: [], vote: null,
  actorRole: null, thiefRole: null, seance: null, spCard: null, spQ: null, medium: null, sit: [],
  cust: {}, fire: null, ban: [], banArm: false, innVote: null, innArm: false,
  votes: {}, capVote: null, capArm: false, voteLog: [], voteMode: 'count',   // Stimmenzähler
});

/** Ältere Spielstände ohne Stimmenzähler ergänzen. */
export function normalizeGame(g) { if (g) { g.draft = { ...emptyDraft(), ...g.draft }; g.charmed ??= {}; g.customUsed ??= {}; g.ev ??= null; g.town ??= null; } return g; }

/* ---------- Zustand anlegen ---------- */

export function setupProblems(cfg) {
  const p = [];
  const n = cfg.players.length;
  if (n < 3) p.push('Mindestens 3 Spieler nötig.');
  registerRoles(cfg.custom);
  const wolves = Object.entries(cfg.counts).reduce((s, [id, k]) => s + (isWolfRole(id) ? k || 0 : 0), 0);
  if (wolves < 1) p.push('Mindestens 1 Werwolf nötig.');
  const total = Object.values(cfg.counts).reduce((a, b) => a + (b || 0), 0);
  const need = requiredCards(cfg.counts, n);
  if (total !== need) p.push(`Karten: ${total}, benötigt ${need}${(cfg.counts.thief || 0) > 0 ? ' (Spieler + 2 für den Dieb)' : ''}.`);
  if ((cfg.counts.arsonist || 0) > 0 && cfg.rules && !cfg.rules.town) p.push('Der Brandstifter braucht „Die Gemeinde“ (Gebäude): in den Regeln einschalten.');
  if (cfg.rules?.town && cfg.town && Object.values(cfg.town).reduce((x, y) => x + (y || 0), 0) > n) p.push(`Mehr Gebäude (${Object.values(cfg.town).reduce((x, y) => x + (y || 0), 0)}) als Spieler (${n}).`);
  return p;
}

/** cfg: { players:[{id,name}], counts:{roleId:n}, mode:'cards'|'digital', rules:{...} } */
export function createGame(cfg, rnd = Math.random) {
  registerRoles(cfg.custom);
  const g = {
    v: 1,
    cfg: { players: cfg.players.map((p) => ({ id: p.id, name: p.name })), custom: cfg.custom ?? [], counts: { ...cfg.counts }, mode: cfg.mode ?? 'cards', rules: { ...DEFAULT_RULES, ...(cfg.rules ?? {}) } },
    phase: 'night', clock: 'night', night: 1, day: 0, stepIdx: 0, subMode: null,
    roles: {}, auto: {}, dead: {}, lovers: [], captain: null, captainLost: false,
    potions: { heal: false, poison: false },        // true = Trank verbraucht
    turned: {}, model: null, wolfdogWolf: false, enchanted: {}, groups: {},
    actorId: null, actorPool: [], thiefId: null, middle: [], fresh: {},
    elderBites: 0, powersLost: false, idiotRevealed: false, urwolfUsed: false, foxLost: false,
    knightCurse: null, ravenMark: null, lastProtect: null,
    judgeUsed: false, judgeArmed: false, secondVote: false, voters: null, votersDay: -1,
    angelWin: false, angelWindow: true, winner: null, collectMorning: false,
    queue: [], interrupts: [], resume: null, dayMode: 'vote', draft: emptyDraft(),
    morning: [], lastDeaths: [], log: [], dealIdx: 0, dealShown: false, charmed: {}, customUsed: {}, ev: null, town: null, pendingBarber: null,
  };
  g.ev = initEvents(g, cfg, rnd);
  if (g.cfg.rules.town) { g.cfg.town = { ...(cfg.town ?? DEFAULT_TOWN) }; g.town = { b: {}, used: {}, free: [], gone: [], fireUsed: false, innLost: false }; if (cfg.townMap) g.town.b = { ...cfg.townMap }; }
  if (g.cfg.counts.actor) pickActorPool(g, rnd);
  if (g.cfg.counts.greis) suggestGroups(g);
  if (g.cfg.mode === 'digital') dealRoles(g, rnd);
  if (g.cfg.counts.angel) { g.phase = 'day'; g.clock = 'day'; g.day = 0; g.dayMode = g.cfg.rules.captain ? 'captain' : 'vote'; log(g, '— Tag 0: Abstimmung vor der ersten Nacht (Engel im Spiel) —'); }
  return g;
}

/* ---------- Die Gemeinde: Gebäude ---------- */

export const buildingOf = (g, id) => g.town?.b[id] ?? null;
export const jobName = (g, id) => (buildingOf(g, id) ? BUILDINGS[buildingOf(g, id)].job : null);
export const isVagabond = (g, id) => !!g.town && alive(g, id) && !g.town.b[id];
/** Lebende Besitzer eines Gebäudes (z. B. 'inn'). */
export const townHolders = (g, key) => (g.town ? g.cfg.players.filter((p) => g.town.b[p.id] === key && alive(g, p.id)) : []);
export const innImmune = (g, id) => !!g.town && g.town.b[id] === 'inn' && !g.town.innLost && alive(g, id);
/** Einmalige Fähigkeit steht noch zur Verfügung. */
export const abilityReady = (g, id) => { const k = buildingOf(g, id); return !!k && alive(g, id) && !g.town.used[id] && !(k === 'inn' && g.town.innLost); };
export const farmsInPlay = (g) => !!g.town && (g.cfg.town?.farm || 0) > 0;
/** Wer Hauptmann werden darf: mit Bauernhöfen nur Bauern, sonst alle (null). */
export function captainPool(g) { return farmsInPlay(g) ? townHolders(g, 'farm').map((p) => p.id) : null; }

/** Ein Spieler scheidet aus (oder wird Vagabund): sein Gebäude wird frei. */
function freeBuilding(g, id) {
  const k = g.town?.b[id];
  if (!k) return;
  delete g.town.b[id]; delete g.town.used[id];
  if (k !== 'vogt') g.town.free.push(k);   // das Haus des Vogts bleibt leer
}

/** Spielstart: Gebäude gleichmäßig zufällig an alle verteilen (restliche Spieler sind Vagabunden). */
export function townRandomMap(g, rnd = Math.random) {
  const keys = Object.entries(g.cfg.town ?? {}).flatMap(([k, n]) => Array(n || 0).fill(k));
  const ids = shuffle(g.cfg.players.map((p) => p.id), rnd), map = {};
  keys.slice(0, ids.length).forEach((k, i) => { map[ids[i]] = k; });
  return map;
}

/** Neumond: Zugstapel (ohne die Karten des Büttels), Hand des Büttels, Spiritismus-Karten der Wahrsagerin. */
function initEvents(g, cfg, rnd) {
  const useCards = !!g.cfg.rules.events, spirit = !!g.cfg.counts.medium;
  if (!useCards && !spirit) return null;
  const all = useCards ? (cfg.eventCards ?? []).map((c) => ({ id: c.id, kind: c.kind, title: c.title, text: c.text, auto: c.auto ?? null })) : [];
  const hand = all.filter((c) => (cfg.beadleIds ?? []).includes(c.id)).slice(0, MAX_BEADLE);
  const deck = shuffle(all.filter((c) => !hand.some((h) => h.id === c.id)), rnd);
  return { deck, hand, active: [], shown: [], beadle: null, drawn: 0, spirit: spirit ? shuffle(SPIRIT_CARDS.map((c) => c.id), rnd) : [] };
}

function shuffle(a, rnd) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function dealRoles(g, rnd) {
  const bag = shuffle(Object.entries(g.cfg.counts).flatMap(([id, n]) => Array(n || 0).fill(id)), rnd);
  const n = g.cfg.players.length;
  g.roles = Object.fromEntries(g.cfg.players.map((p, i) => [p.id, bag[i] || 'villager']));
  g.middle = bag.slice(n); g.middle0 = [...g.middle];
  log(g, 'Rollen ausgelost' + (g.middle.length ? ` (Mitte: ${g.middle.map(roleName).join(', ')})` : ''));
}

function pickActorPool(g, rnd) {
  g.actorPool = shuffle(ACTOR_POOL.filter((r) => !g.cfg.counts[r]), rnd).slice(0, 3);
}

/** Vorschlag für die zwei Gruppen des Verbitterten Greises: erste Hälfte A, zweite Hälfte B. */
export function suggestGroups(g) {
  const n = g.cfg.players.length, half = Math.ceil(n / 2);
  g.groups = Object.fromEntries(g.cfg.players.map((p, i) => [p.id, i < half ? 'A' : 'B']));
}

/* ---------- Abfragen ---------- */

export const players = (g) => g.cfg.players;
export const nm = (g, id) => g.cfg.players.find((p) => p.id === id)?.name ?? '?';
export const alive = (g, id) => !g.dead[id];
export const livingIds = (g) => g.cfg.players.filter((p) => alive(g, p.id)).map((p) => p.id);
const cnt = (g, id) => g.cfg.counts[id] || 0;

export function holders(g, r) {
  return g.cfg.players.filter((p) => g.roles[p.id] === r || (r === 'thief' && p.id === g.thiefId) || (r === 'actor' && p.id === g.actorId));
}
export const livingHolders = (g, r) => holders(g, r).filter((p) => alive(g, p.id) && !g.charmed?.[p.id]);   // Betörte haben keine Fähigkeiten mehr

/** Werwolf im Sinne von Seherin, Fuchs, Bär und Ritter (auch Weißer Werwolf, Infizierte, Wolfshund als Wolf). */
export function isWolf(g, id) {
  const r = g.roles[id];
  return isWolfRole(r) || (r === 'wolfdog' && g.wolfdogWolf) || !!g.turned[id];
}
export const isWhiteWolf = (g, id) => g.roles[id] === 'whitewolf';
export const powerOn = (g, roleId) => !(g.powersLost && RM[roleId]?.camp === 'village');

export function roleLabel(g, id) {
  const r = RM[g.roles[id]];
  let s = r ? r.name : 'Unbekannt';
  if (id === g.actorId && g.roles[id] !== 'actor') s += ' (Gaukler)';
  if (g.turned[id]) s += ' (jetzt Wolf)';
  if (id === g.thiefId) s += ' (ehem. Dieb)';
  return s;
}

/** Lebende Nachbarn am Tisch (Reihenfolge der Spielerliste = Sitzordnung im Uhrzeigersinn). */
export function seatNeighbors(g, id) {
  const liv = g.cfg.players.filter((p) => alive(g, p.id) || p.id === id);
  const i = liv.findIndex((p) => p.id === id);
  if (i < 0 || liv.length < 2) return [];
  const a = liv[(i - 1 + liv.length) % liv.length].id, b = liv[(i + 1) % liv.length].id;
  return [...new Set([a, b])].filter((x) => x !== id);
}

function nextWolf(g, id) {
  const ps = g.cfg.players, n = ps.length, i = ps.findIndex((p) => p.id === id);
  for (let k = 1; k < n; k++) { const p = ps[(i + k) % n]; if (alive(g, p.id) && isWolf(g, p.id)) return p.id; }
  return null;
}

export const clockLabel = (g) => (g.clock === 'day' ? `Tag ${g.day}` : `Nacht ${g.night}`);
export function log(g, t) { g.log.push({ p: clockLabel(g), t }); }

/* ---------- Nachtablauf ---------- */

function actApplies(g, r) {
  const n = r.night;
  if (!n?.act) return false;
  if (!powerOn(g, r.id)) return false;
  if (!nightMatches(g, r)) return false;
  if (r.id === 'urwolf' && g.urwolfUsed) return false;
  if (r.id === 'bigwolf' && Object.keys(g.dead).some((id) => isWolf(g, id))) return false;
  if (r.id === 'fox' && g.foxLost) return false;
  if (r.id === 'arsonist' && (!g.town || g.town.fireUsed)) return false;
  if (r.id === 'actor' && !g.actorPool.length) return false;
  if (n.once && g.customUsed?.[r.id]) return false;
  return true;
}

function nightMatches(g, r) {
  const when = r.night?.when;
  if (when === 'first') return g.night === 1 || !!g.fresh[r.id] || (r.id === 'brothers' && g.cfg.rules.brothersRewake && g.night % 2 === 1);
  if (when === 'even') return g.night % 2 === 0;
  return true;
}

export function actorRoleNow(g) {
  return g.actorId && alive(g, g.actorId) && g.roles[g.actorId] !== 'actor' ? g.roles[g.actorId] : null;
}

/** Aufrufreihenfolge nach dem Regelheft. Ausnahme: Kann die Seherin nur „Werwolf oder nicht“ erfahren (und der Fuchs in Nacht 1 im Kartenmodus),
 *  kommt sie nach allen Wölfen dran, weil der Spielleiter die Wölfe erst dort erfasst. */
function orderOf(g, r) {
  if (r.id === 'seer' && g.cfg.rules.seerSees === 'camp') return 255;
  if (r.id === 'fox' && g.cfg.mode === 'cards' && g.night === 1) return 256;
  return r.night?.order ?? SILENT_ORDER[r.id] ?? 999;
}

/** Schritte der aktuellen Nacht in der Reihenfolge des Regelhefts. */
export function nightSteps(g) {
  const out = [];
  const first = g.night === 1;
  const borrowed = actorRoleNow(g);
  const digital = g.cfg.mode === 'digital';
  const wolfSide = Object.keys(g.cfg.counts).some((id) => isWolfRole(id) && cnt(g, id) > 0) || g.cfg.players.some((p) => isWolf(g, p.id));
  const entries = ROLES.filter((r) => r.id !== 'villager').map((r) => ({ r, order: orderOf(g, r) })).sort((a, b) => a.order - b.order);
  for (const { r } of entries) {
    const inPlay = cnt(g, r.id) > 0 || r.id === borrowed || (r.id === 'wolf' && wolfSide);
    if (!inPlay) continue;
    const act = actApplies(g, r);
    const wakes = r.night && nightMatches(g, r);          // wacht in dieser Nacht (auch ohne Eingabe, z. B. Schwestern)
    if (!first && !act && !wakes) continue;
    if (digital && !act && !(wakes && (r.group || r.custom))) continue;  // ohne Karten: nur Rollen mit Aktion, Treffen oder eigenem Aufruf
    if (r.id === borrowed && !cnt(g, r.id) && !act) continue;
    const living = r.id === 'wolf' ? g.cfg.players.filter((p) => alive(g, p.id) && isWolf(g, p.id)) : livingHolders(g, r.id);
    const gone = !first && living.length === 0;
    if (gone && !g.cfg.rules.callDeadRoles) continue;
    const input = act && INPUT_ACTS.has(r.night.act) && !gone;
    out.push({ key: r.id, role: r.id, act: input ? r.night.act : null, gone, label: r.id === borrowed && !cnt(g, r.id) ? `${r.name} (Gaukler)` : r.name, say: r.say ?? '' });
    if (r.id === 'cupid' && first) out.push({ key: 'lovers', role: null, info: true, label: 'Verliebte', say: 'Ich tippe die Verliebten an. Sie öffnen die Augen, erkennen einander und schlafen wieder ein.' });
    if (r.id === 'piper' && act && !gone) out.push({ key: 'enchanted', role: null, info: true, label: 'Verzauberte', say: 'Alle Verzauberten erwachen, erkennen einander und schlafen wieder ein.' });
  }
  if (g.town && townHolders(g, 'bakery').length) {
    let at = -1;
    out.forEach((s, i) => { if (s.role && RM[s.role]?.camp === 'wolf') at = i; });
    if (at < 0) at = out.findIndex((s) => s.role === 'witch') - 1;
    out.splice(at + 1, 0, { key: 'baker', role: null, info: true, label: 'Bäcker', say: 'Die Werwölfe schlafen ein. Der Bäcker öffnet kurz die Augen und schläft gleich wieder ein.' });
  }
  return out;
}

/** Kontext des aktuellen Nachtschritts: Modus 'assign' (Wer ist es?), 'action' oder 'info'. */
export function stepContext(g) {
  const steps = nightSteps(g);
  if (!steps.length) return null;
  const idx = Math.max(0, Math.min(g.stepIdx, steps.length - 1));
  const step = steps[idx];
  const r = step.role ? RM[step.role] : null;
  const have = r ? holders(g, r.id).length : 0;
  const need = r ? Math.max(cnt(g, r.id), have) : 0;
  const complete = have >= need;
  let mode = 'info';
  if (r && g.cfg.mode === 'digital') mode = step.act ? 'action' : 'info';
  else if (r) {
    if (g.night === 1 && (!step.act || have === 0 || g.subMode === 'assign' || (!complete && g.subMode !== 'action'))) mode = 'assign';
    else mode = step.act ? 'action' : 'info';
  }
  return { steps, idx, step, r, need, have, complete, mode };
}

/** Im Kartenmodus: übrige Karten nach der letzten Zuordnung als Dorfbewohner eintragen. */
function reconcileAuto(g) {
  for (const pid of Object.keys(g.auto)) { if (g.roles[pid] === 'villager') delete g.roles[pid]; delete g.auto[pid]; }
  if (cnt(g, 'thief')) return;   // mit Dieb liegen Karten in der Mitte
  const unassigned = g.cfg.players.filter((p) => !g.roles[p.id]);
  if (!unassigned.length) return;
  const missing = ROLES.filter((r) => r.id !== 'villager').reduce((a, r) => a + Math.max(0, cnt(g, r.id) - holders(g, r.id).length), 0);
  if (missing === 0) for (const p of unassigned) { g.roles[p.id] = 'villager'; g.auto[p.id] = true; }
}

/* ---------- Tod und Folgen ---------- */

/** Markiert Tote und stellt die Folgen in die Warteschlange; settle() arbeitet sie ab. */
export function kill(g, id, cause) {
  if (!id || g.dead[id]) return;
  g.dead[id] = { cause, at: clockLabel(g) };
  if (g.collectMorning) g.lastDeaths.push(id);
  g.queue.push(id);
}

/** Wertet die Folgen aller Toten aus (Verliebte, Jäger, Hauptmann ...). Unbekannte Rollen werden vorher abgefragt. */
export function settle(g) {
  while (g.queue.length) {
    const x = g.queue[0];
    if (!g.roles[x]) {
      if (!g.interrupts.some((i) => i.type === 'reveal' && i.id === x)) g.interrupts.unshift({ type: 'reveal', id: x });
      return;
    }
    g.queue.shift();
    const cause = g.dead[x].cause;
    log(g, `† ${nm(g, x)} (${roleLabel(g, x)}) – ${CAUSE[cause] ?? cause}`);
    const rid = g.roles[x];
    freeBuilding(g, x);
    if (rid === 'elder' && ['vote', 'poison', 'hunter'].includes(cause) && !g.powersLost) {
      g.powersLost = true;
      log(g, 'Der Alte wurde nicht von den Wölfen getötet – die Dorfbewohner verlieren ihre Sonderfähigkeiten!');
      g.morning.push('Der Alte ist tot. Die Dorfbewohner verlieren alle Sonderfähigkeiten (Zweideutige und Einzelgänger nicht).');
    }
    if (rid === 'hunter' && powerOn(g, 'hunter') && !g.charmed?.[x]) g.interrupts.push({ type: 'hunter', id: x });
    if (g.ev?.beadle === x) { g.ev.beadle = null; log(g, `Der Büttel ${nm(g, x)} ist tot`); g.morning.push('Der Büttel ist tot. Der Hauptmann darf einen neuen ernennen.'); }
    if (rid === 'scapegoat') g.interrupts.push({ type: 'scapegoat', id: x, picks: [], forDay: g.clock === 'day' ? g.day + 1 : g.night });
    if (rid === 'angel' && g.angelWindow) g.angelWin = true;
    if (g.captain === x && g.cfg.rules.captain) { if (farmsInPlay(g) && !captainPool(g).length) { g.captain = null; g.captainLost = true; log(g, 'Kein Bauer mehr: Es gibt keinen Hauptmann mehr'); } else g.interrupts.push({ type: 'captain', id: x }); }
    if (g.lovers.includes(x)) { const pt = g.lovers.find((y) => y !== x); if (pt && !g.dead[pt]) kill(g, pt, 'heartbreak'); }
    if (g.model === x) {
      const wc = livingHolders(g, 'wildchild')[0];
      if (wc && !g.turned[wc.id]) { g.turned[wc.id] = true; log(g, `Wildes Kind ${wc.name} wird zum Werwolf`); }
    }
  }
}

/** Rollen, die laut Kartenzahl noch niemandem zugeordnet sind (für die Abfrage beim Tod unbekannter Karten). */
export function unknownPool(g) {
  const out = [];
  for (const [id, n] of Object.entries(g.cfg.counts)) {
    const left = (n || 0) - holders(g, id).length;
    if (left > 0 && RM[id]) out.push(id);
  }
  return out;
}

/** Wer am Tag mitstimmen darf: Lebende ohne den aufgedeckten Dorfdepp, bei Sündenbock-Anordnung nur die Genannten. */
export function eligibleVoters(g) {
  let ids = livingIds(g).filter((id) => !(g.roles[id] === 'idiot' && g.idiotRevealed));
  if (g.town && g.dayMode !== 'captain') ids = ids.filter((id) => g.town.b[id] !== 'school' && !(g.draft.ban ?? []).includes(id));   // Lehrerin stimmt nie ab, ausgeschlossene auch nicht
  if (g.dayMode !== 'captain' && g.voters && g.votersDay === g.day) ids = ids.filter((id) => g.voters.includes(id));
  return ids;
}

/** Auszählung: gezählte Hände, doppelte Stimme des Hauptmanns, +2 durch den Raben (nur bei der Hinrichtung). Führende und Gleichstand. */
export function tally(g) {
  const d = g.draft, exec = g.dayMode !== 'captain';
  const map = {};
  const row = (pid) => (map[pid] ??= { pid, hands: 0, bonus: 0, cap: false });
  for (const [pid, n] of Object.entries(d.votes ?? {})) if (n > 0 && alive(g, pid)) row(pid).hands += n;
  if (exec && d.capVote && alive(g, d.capVote)) { const r = row(d.capVote); r.hands += 2; r.cap = true; }
  if (exec && g.ravenMark && alive(g, g.ravenMark)) row(g.ravenMark).bonus += 2;
  const rows = Object.values(map).map((r) => ({ ...r, total: r.hands + r.bonus })).filter((r) => r.total > 0).sort((a, b) => b.total - a.total);
  const max = rows[0]?.total ?? 0;
  const leaders = rows.filter((r) => r.total === max).map((r) => r.pid);
  const cast = Object.values(d.votes ?? {}).reduce((x, y) => x + y, 0) + (d.capVote ? 1 : 0);
  return { rows, leaders, tie: leaders.length > 1, cast, eligible: eligibleVoters(g).length, max };
}

/** „Er ist es ganz sicher nicht“: Wer als Einziger noch steht, ist das Opfer. */
export function voucherVictim(g) {
  const el = eligibleVoters(g), sit = g.draft.sit ?? [];
  return el.length > 1 && sit.length === el.length - 1 ? el.find((id) => !sit.includes(id)) ?? null : null;
}

/** Beginn der Bürgen-Kette: linker Nachbar des zuletzt Ausgeschiedenen (nächste lebende Person im Uhrzeigersinn). */
export function voucherStart(g) {
  const ps = g.cfg.players, last = Object.keys(g.dead).pop();
  if (!last) return null;
  const i = ps.findIndex((p) => p.id === last);
  for (let k = 1; k <= ps.length; k++) { const p = ps[(i + k) % ps.length]; if (alive(g, p.id)) return p.id; }
  return null;
}

const resetVote = (g) => { const d = g.draft; d.vote = null; d.votes = {}; d.capVote = null; d.capArm = false; d.voteLog = []; d.sit = []; d.innVote = null; d.innArm = false; d.banArm = false; };

export function checkWinner(g) {
  if (g.interrupts.length || g.queue.length) return null;
  if (g.angelWin) return 'Der Engel';
  const liv = livingIds(g);
  if (!liv.length) return 'Niemand – alle sind tot';
  const greis = liv.find((id) => g.roles[id] === 'greis');
  if (greis && g.groups[greis]) {
    const other = g.cfg.players.filter((p) => g.groups[p.id] && g.groups[p.id] !== g.groups[greis]);
    if (other.length && other.every((p) => !alive(g, p.id))) return 'Der Verbitterte Greis';
  }
  if (liv.length === 2 && g.lovers.length === 2 && g.lovers.every((id) => liv.includes(id)) && isWolf(g, g.lovers[0]) !== isWolf(g, g.lovers[1])) return 'Das Liebespaar';
  const piper = liv.find((id) => g.roles[id] === 'piper');
  if (piper && liv.length > 1 && liv.every((id) => id === piper || g.enchanted[id])) return 'Der Flötenspieler';
  const ww = liv.find((id) => isWhiteWolf(g, id));
  if (ww && liv.length === 1) return 'Der Weiße Werwolf';
  const loner = liv.find((id) => RM[g.roles[id]]?.win === 'solo');
  if (loner && liv.length === 1) return RM[g.roles[loner]].name;
  const pack = liv.filter((id) => isWolf(g, id) && !isWhiteWolf(g, id));
  if (!pack.length && !ww && !piper && !loner) return 'Das Dorf';
  if (ww) return null;   // der Weiße Werwolf muss erst allein übrig bleiben oder sterben
  const others = liv.length - pack.length;
  if (g.cfg.rules.charm && pack.length && others - liv.filter((id) => g.charmed?.[id]).length <= 1) return 'Die Werwölfe';   // vorletzter Dorfbewohner betört
  if (others === 0 || (g.cfg.rules.parityWin && pack.length >= others)) return 'Die Werwölfe';
  return null;
}

/** Prüft nach Toden auf offene Entscheidungen, Sieg, sonst weiter mit Tag oder Nacht. */
function afterDeaths(g, resume) {
  settle(g);
  if (g.pendingBarber && g.roles[g.pendingBarber.t]) {   // Ausgang erst, wenn die Karte der ausgeschalteten Person bekannt ist
    const { b, t } = g.pendingBarber; g.pendingBarber = null;
    if (isWolf(g, t)) log(g, `Der Barbier ${nm(g, b)} hat einen Werwolf erwischt: Das Dorf gratuliert, er überlebt`);
    else { log(g, `${nm(g, t)} war kein Werwolf: Der Barbier ${nm(g, b)} wird aus dem Dorf gejagt`); if (alive(g, b)) kill(g, b, 'barberOut'); }
    settle(g);
  }
  if (g.interrupts.length) { g.phase = 'interrupt'; g.resume = resume; return; }
  const w = checkWinner(g);
  if (w) {
    const co = (w === 'Das Dorf' || w === 'Die Werwölfe') ? livingIds(g).filter((id) => RM[g.roles[id]]?.win === 'survive') : [];
    const text = co.length ? `${w} und ${co.map((id) => `${RM[g.roles[id]].name} ${nm(g, id)}`).join(', ')}` : w;
    log(g, `Sieg: ${text}`); g.winner = text; g.phase = 'ended'; return; }
  if (resume === 'day') g.phase = 'day';
  else beginNight(g, g.day + 1);
}

/* ---------- Neumond: Ereigniskarten ---------- */

/** Zeigt eine Karte (gezogen oder vom Büttel verkündet); nicht sofortige Karten bleiben aktiv. */
function showCard(g, card, by) {
  const ev = g.ev, entry = { ...card, by, day: g.day };
  ev.shown.push(entry);
  if (card.kind !== 'sofort') ev.active.push({ ...entry });
  log(g, `Ereigniskarte „${card.title}“ (${KINDS[card.kind]})${by ? ` – ${by}` : ''}`);
}

function drawEvent(g) {
  const ev = g.ev;
  if (!ev || !ev.deck.length) return null;
  const card = ev.deck.shift(); ev.drawn++;
  const last = Object.keys(g.dead).pop();
  showCard(g, card, last ? `gelesen von ${nm(g, last)} (zuletzt ausgeschieden)` : null);
  return card;
}

/** Zeitlich begrenzte Karten enden mit dem Tag. */
function expireEvents(g) { if (g.ev) g.ev.active = g.ev.active.filter((c) => c.kind === 'dauer'); }

/** Hinweis für den Spielleiter zu Karten mit automatischer Auswertung. */
export function eventHint(g, card) {
  if (card?.auto === 'wolfParity') { const n = g.cfg.players.filter((p) => alive(g, p.id) && isWolf(g, p.id)).length; return `Lebende Werwölfe: ${n} (${n % 2 ? 'ungerade' : 'gerade'}).`; }
  return null;
}

/** Antwort auf eine Spiritismus-Frage; null = die App weiß es nicht (Spielleiter entscheidet). */
export function spiritAnswer(g, key) {
  const liv = livingIds(g), wolvesAlive = liv.filter((id) => isWolf(g, id)).length;
  const deadIds = Object.keys(g.dead);
  const wolfOf = (id) => (id && g.roles[id] ? isWolf(g, id) : null);
  switch (key) {
    case 'wolvesMany': return wolvesAlive >= 2;
    case 'wolvesThree': return wolvesAlive > 2;
    case 'wolfThird': return wolvesAlive * 3 >= liv.length;
    case 'lastDeadWolf': return wolfOf(deadIds[deadIds.length - 1]);
    case 'firstDeadWolf': return wolfOf(deadIds[0]);
    case 'captainWolf': return g.captain && alive(g, g.captain) ? wolfOf(g.captain) : null;
    case 'captainNextWolf': return g.captain && alive(g, g.captain) ? seatNeighbors(g, g.captain).some((id) => isWolf(g, id)) : null;
    case 'seerAlive': return holders(g, 'seer').length ? livingHolders(g, 'seer').length > 0 : null;
    case 'witchAlive': return holders(g, 'witch').length ? livingHolders(g, 'witch').length > 0 : null;
    case 'hunterAlive': return holders(g, 'hunter').length ? livingHolders(g, 'hunter').length > 0 : null;
    case 'loversAlive': return g.lovers.length === 2 ? g.lovers.every((id) => alive(g, id)) : null;
    case 'plainDead': return deadIds.some((id) => g.roles[id] === 'villager');
    case 'specialDead': return deadIds.some((id) => g.roles[id] && g.roles[id] !== 'villager');
    case 'innocentExecuted': return deadIds.some((id) => g.dead[id].cause === 'vote' && g.roles[id] && !isWolf(g, id));
    default: return null;
  }
}

function seanceNote(g, d) {
  const card = d.spCard && SPIRIT_CARDS.find((c) => c.id === d.spCard), q = card?.qs[d.spQ];
  if (!q) return 'Geisterbeschwörung: Eine Person stellt den Geistern eine Frage, du antwortest wahrheitsgemäß mit Ja oder Nein.';
  if (g.ev) g.ev.spirit = g.ev.spirit.filter((x) => x !== card.id);
  const first = Object.keys(g.dead)[0];
  const who = d.medium && alive(g, d.medium) ? nm(g, d.medium) : 'Die benannte Person';
  const ans = spiritAnswer(g, q.a);
  const tail = first ? `${nm(g, first)} (zuerst ausgeschieden) antwortet düster mit JAAAA oder NEEEIN${ans == null ? '' : ` – richtig wäre: ${ans ? 'JA' : 'NEIN'}`}.` : `Noch ist niemand ausgeschieden, die Antwort gibst du${ans == null ? '' : ` (richtig: ${ans ? 'JA' : 'NEIN'})`}.`;
  log(g, `Spiritismus: Frage „${q.t}“`);
  return `Spiritismus-Sitzung: ${who} ist das Medium und liest vor: „${q.t}“ ${tail}`;
}

function beginNight(g, n) {
  g.night = n; g.day = Math.max(g.day, n - 1); g.phase = 'night'; g.clock = 'night'; g.stepIdx = 0; g.subMode = null; g.draft = emptyDraft(); g.secondVote = false;
  if (g.actorId && alive(g, g.actorId)) g.roles[g.actorId] = 'actor';
  log(g, '— Nacht beginnt —');
}

/* ---------- Nacht abschließen ---------- */

function finishNight(g) {
  const d = g.draft, rules = g.cfg.rules;
  for (const p of g.cfg.players) if (!g.roles[p.id]) { g.roles[p.id] = 'villager'; }
  g.auto = {};
  g.morning = []; g.lastDeaths = []; g.collectMorning = true;
  if (g.ev) g.ev.shown = [];
  g.day = g.night;
  if (g.night === 1) {
    if (d.lovers.length === 2) { g.lovers = [...d.lovers]; log(g, `Amor verliebt ${nm(g, d.lovers[0])} & ${nm(g, d.lovers[1])}`); }
    if (d.model) { g.model = d.model; log(g, `Vorbild des Wilden Kindes: ${nm(g, d.model)}`); }
    if (d.side) { g.wolfdogWolf = d.side === 'wolf'; log(g, `Wolfshund wählt: ${d.side === 'wolf' ? 'Werwölfe' : 'Dorf'}`); }
  } else {
    if (d.model && g.fresh.wildchild) { g.model = d.model; log(g, `Neues Vorbild des Wilden Kindes: ${nm(g, d.model)}`); }
    if (d.side && g.fresh.wolfdog) { g.wolfdogWolf = d.side === 'wolf'; log(g, `Wolfshund wählt: ${d.side === 'wolf' ? 'Werwölfe' : 'Dorf'}`); }
  }
  g.fresh = {};
  if (d.actorRole && g.actorId) { g.actorPool = g.actorPool.filter((x) => x !== d.actorRole); log(g, `Gaukler ${nm(g, g.actorId)} spielt heute: ${roleName(d.actorRole)}`); }
  if (d.check) log(g, `Seherin prüft ${nm(g, d.check)}: ${roleLabel(g, d.check)}`);
  g.ravenMark = d.mark || null;
  if (d.mark) log(g, `Rabe markiert ${nm(g, d.mark)}`);
  g.lastProtect = d.protect || null;
  if (d.protect) log(g, `Heiler schützt ${nm(g, d.protect)}`);
  const cprot = [], ckill = [];
  for (const [rid, pid] of Object.entries(d.cust ?? {})) {
    const rr = RM[rid];
    if (!pid || !rr?.custom || !alive(g, pid) || !livingHolders(g, rid).length) continue;
    g.customUsed[rid] = true;
    const by = `${rr.name} ${nm(g, livingHolders(g, rid)[0].id)}`;
    if (rr.cact === 'mark') { log(g, `${by} markiert ${nm(g, pid)}`); g.morning.push(`${rr.name}: ${nm(g, pid)} ist markiert.`); }
    else if (rr.cact === 'protect') { cprot.push(pid); log(g, `${by} schützt ${nm(g, pid)}`); }
    else if (rr.cact === 'peek') log(g, `${by} prüft ${nm(g, pid)}: ${isWolf(g, pid) ? 'Werwolf' : 'kein Werwolf'}`);
    else if (rr.cact === 'kill') { ckill.push(pid); log(g, `${by} tötet ${nm(g, pid)}`); }
  }
  if (d.enchant.length) { d.enchant.forEach((id) => { g.enchanted[id] = true; }); log(g, `Verzaubert: ${d.enchant.map((i) => nm(g, i)).join(', ')}`); }
  if (d.fox) {
    const grp = [d.fox, ...seatNeighbors(g, d.fox)], hit = grp.some((id) => isWolf(g, id));
    log(g, `Fuchs prüft ${grp.map((i) => nm(g, i)).join(', ')}: ${hit ? 'Wolf dabei' : 'kein Wolf'}`);
    if (!hit) g.foxLost = true;
  }
  if (g.knightCurse) { const k = g.knightCurse; g.knightCurse = null; if (alive(g, k)) kill(g, k, 'knight'); }

  const quiet = rules.noVictimsNight1 && g.night === 1;
  if (quiet) log(g, 'Hausregel: In der ersten Nacht stirbt niemand');
  const charmedNow = [];
  const wolfAttack = (v, cause) => {
    if (!v || !alive(g, v)) return;
    if (innImmune(g, v)) { log(g, `Die Werwölfe finden im Wirtshaus nichts: Wirt ${nm(g, v)} bleibt unbehelligt`); return; }
    if (d.fire && d.fire === v && cause === 'wolves') {
      const ps = g.cfg.players, i = ps.findIndex((p) => p.id === v);
      let w = null;
      for (let k = 1; k < ps.length && !w; k++) { const p = ps[(i - k + ps.length) % ps.length]; if (alive(g, p.id) && isWolf(g, p.id)) w = p.id; }
      log(g, `Das Haus von ${nm(g, v)} brennt: Die Werwölfe fliehen, es gibt kein Opfer`);
      if (w) { kill(g, w, 'fire'); g.morning.push(`Im brennenden Haus ist ein Werwolf umgekommen: ${nm(g, w)}.`); }
      return;
    }
    const isElder = g.roles[v] === 'elder' && powerOn(g, 'elder');
    const girlVictim = d.girlCaught && g.roles[v] === 'girl';
    const infectable = cause === 'wolves' && d.infect && !g.urwolfUsed && livingHolders(g, 'urwolf').length && !(isElder && g.elderBites >= 1);
    if (isElder) g.elderBites++;
    if (infectable) { g.turned[v] = true; g.urwolfUsed = true; log(g, `Urwolf infiziert ${nm(g, v)} – ab jetzt heimlich Werwolf`); return; }
    if (!girlVictim && (v === d.protect || cprot.includes(v))) { log(g, `${nm(g, v)} wurde vom Heiler gerettet`); return; }
    if (d.heal === v && !g.potions.heal) { g.potions.heal = true; log(g, `Hexe heilt ${nm(g, v)}`); return; }
    if (isElder && g.elderBites === 1) { log(g, `Der Alte ${nm(g, v)} übersteht den ersten Angriff`); return; }
    if (rules.charm && (cause === 'wolves' || cause === 'bigwolf') && !isWolf(g, v) && !g.charmed[v]) {
      g.charmed[v] = true; charmedNow.push(v);
      log(g, `Betörung: ${nm(g, v)} ist betört und verliert alle Fähigkeiten`);
      return;
    }
    kill(g, v, girlVictim ? 'girl' : cause);
    if (g.roles[v] === 'knight' && powerOn(g, 'knight')) {
      const w = nextWolf(g, v);
      if (w) { g.knightCurse = w; log(g, `Ritter: ${nm(g, w)} ist verwundet und stirbt nächste Nacht`); }
    }
  };
  if (!quiet) {
    wolfAttack(d.kill, 'wolves');
    if (d.bigkill && d.bigkill !== d.kill) wolfAttack(d.bigkill, 'bigwolf');
    if (d.whitekill && alive(g, d.whitekill)) wolfAttack(d.whitekill, 'whitewolf');
    if (d.poison && !g.potions.poison && alive(g, d.poison)) { g.potions.poison = true; kill(g, d.poison, 'poison'); }
    for (const v of ckill) if (alive(g, v)) kill(g, v, 'custom');
  }

  if (d.fire && g.town && g.town.b[d.fire]) {
    const fk = g.town.b[d.fire];
    g.town.fireUsed = true; g.town.gone.push(fk); delete g.town.b[d.fire]; delete g.town.used[d.fire];
    log(g, `Brandstifter: ${BUILDINGS[fk].name} von ${nm(g, d.fire)} brennt nieder`);
    g.morning.push(`Das Gebäude „${BUILDINGS[fk].name}“ ist niedergebrannt. ${nm(g, d.fire)} ist ab jetzt Vagabund.`);
  }
  if (charmedNow.length) g.morning.push(`Nur für den Spielleiter: Berühre unauffällig am Kopf: ${charmedNow.map((i) => nm(g, i)).join(', ')}. Nichts ansagen, niemand scheidet aus.`);
  const bear = livingHolders(g, 'bear')[0];
  if (bear && powerOn(g, 'bear')) {
    const growl = seatNeighbors(g, bear.id).some((id) => isWolf(g, id)) || isWolf(g, bear.id);
    g.morning.push(growl ? 'Der Bär brummt laut!' : 'Der Bär bleibt ruhig.');
  }
  if (g.ravenMark && alive(g, g.ravenMark)) g.morning.push(`Der Rabe hat ${nm(g, g.ravenMark)} belastet: zwei Stimmen mehr gegen die Person.`);
  if (d.seance) g.morning.push(seanceNote(g, d));
  if (g.night === 1 && Object.keys(g.groups).length && livingHolders(g, 'greis').length && !g.groupsShown) {
    g.groupsShown = true;
    g.morning.push(`Das Dorf ist zerstritten! Gruppe 1: ${groupNames(g, 'A')}. Gruppe 2: ${groupNames(g, 'B')}.`);
  }
  votersNote(g);
  if (farmsInPlay(g) && !g.captain && !g.captainLost && g.night >= 2 && !captainPool(g).length) { g.captainLost = true; log(g, 'Kein Bauer mehr: Es gibt keinen Hauptmann'); }
  g.dayMode = (rules.captain && !g.captain && !g.captainLost && !(farmsInPlay(g) && g.night < 2)) ? 'captain' : 'vote';
  g.draft = emptyDraft(); g.subMode = null;
  settle(g);
  g.clock = 'day';
  if (g.night === 1) g.angelWindow = false;
  log(g, '— Das Dorf erwacht —');
  if (g.ev && rules.events && g.night >= 2 && (g.night - 2) % Math.max(1, +rules.eventEvery || 1) === 0) drawEvent(g);
  afterDeaths(g, 'day');
}

export function groupNames(g, grp) { return g.cfg.players.filter((p) => g.groups[p.id] === grp).map((p) => p.name).join(', '); }

/* ---------- Tag ---------- */

function votersNote(g) {
  if (g.voters && g.votersDay === g.day) g.morning.push(`Auf Befehl des Sündenbocks dürfen heute nur abstimmen: ${g.voters.map((i) => nm(g, i)).join(', ') || 'niemand'}.`);
}

function endDay(g) {
  resetVote(g); g.ravenMark = null; g.collectMorning = false;
  if (g.judgeArmed && !g.judgeUsed) {
    g.judgeArmed = false; g.judgeUsed = true; g.secondVote = true;
    log(g, 'Der Stotternde Richter verlangt eine zweite Abstimmung – ohne weitere Diskussion');
    afterDeaths(g, 'day');
    return;
  }
  expireEvents(g);
  afterDeaths(g, 'night');
}

/** Der Wirt verliert Schutz und Plättchen, wenn er gegen eine Person gestimmt hat, die jetzt ausscheidet (auch bei Begnadigung). */
function innCheck(g, victim) {
  const inn = g.town && g.cfg.players.find((p) => g.town.b[p.id] === 'inn' && alive(g, p.id));
  if (inn && !g.town.innLost && g.draft.innVote && g.draft.innVote === victim) { g.town.innLost = true; log(g, `Wirt ${nm(g, inn.id)} hat gegen ${nm(g, victim)} gestimmt und verliert seinen Schutz`); }
}

/** Hinrichtung: Wird ein Betörter hingerichtet, scheiden alle Betörten sofort aus. */
function killByVote(g, v) {
  const was = !!g.charmed?.[v];
  kill(g, v, 'vote');
  if (!was) return;
  for (const id of Object.keys(g.charmed)) if (alive(g, id)) kill(g, id, 'charm');
  log(g, 'Ein Betörter wurde hingerichtet: Alle Betörten scheiden aus');
}

function executeVote(g) {
  const v = g.draft.vote;
  g.collectMorning = false;
  if (!v || !alive(g, v)) return;
  if (innImmune(g, v)) return;
  innCheck(g, v);
  const rid = g.roles[v];
  if (rid === 'idiot' && !g.idiotRevealed && powerOn(g, 'idiot')) {
    g.idiotRevealed = true;
    log(g, `Dorfdepp ${nm(g, v)} entlarvt – überlebt ohne Stimmrecht`);
    if (g.captain === v) { g.captain = null; g.captainLost = true; log(g, 'Der Dorfdepp war Hauptmann – das Amt ist endgültig verloren'); }
    g.secondVote = false; g.judgeArmed = false;   // keine neue Abstimmung an diesem Tag
    endDay(g);
    return;
  }
  const maid = livingHolders(g, 'maid')[0];
  if (maid && maid.id !== v && !g.lovers.includes(maid.id) && g.roles[v] !== 'hunter') {
    g.interrupts.unshift({ type: 'maid', id: maid.id, victim: v });
    g.phase = 'interrupt'; g.resume = 'night';
    return;
  }
  killByVote(g, v);
  endDay(g);
}

/** Die Magd spielt ab jetzt die Rolle des Hingerichteten, als wäre es die erste Nacht. Verliebt, Hauptmann, Verzauberung bleiben nicht erhalten, eine Infektion schon. */
function applyMaidRole(g, maidId, victimId, role) {
  if (role === 'hunter') { log(g, `Ergebene Magd ${nm(g, maidId)} darf die Jägerkarte nicht übernehmen und bleibt Magd`); return; }
  g.roles[maidId] = role;
  log(g, `Ergebene Magd ${nm(g, maidId)} übernimmt die Rolle ${roleName(role)} von ${nm(g, victimId)}`);
  if (role === 'witch') g.potions = { heal: false, poison: false };
  if (['wildchild', 'wolfdog', 'judge'].includes(role)) g.fresh[role] = true;
  if (role === 'judge') g.judgeUsed = false;
  if (g.captain === maidId) { g.captain = null; log(g, 'Die Magd war Hauptmann: das Amt ist frei'); }
  delete g.enchanted[maidId];
  if (role === 'actor') g.actorId = maidId;
  if (role === 'piper') {
    const names = Object.keys(g.enchanted).filter((id) => id !== maidId).map((id) => nm(g, id));
    log(g, `Neuer Flötenspieler: bisher verzaubert sind ${names.join(', ') || 'noch niemand'}`);
  }
}

function maidTakes(g, take) {
  const it = g.interrupts.shift();
  const v = it.victim;
  if (take) {
    const role = g.roles[v];
    if (role) applyMaidRole(g, it.id, v, role);
    else { g.pendingMaid = { id: it.id, victim: v }; log(g, `Ergebene Magd ${nm(g, it.id)} übernimmt die Karte von ${nm(g, v)} (Rolle wird gleich aufgedeckt)`); }
  }
  killByVote(g, v);
  endDay(g);
}

/* ---------- Eingaben ---------- */

/** Antippen einer Person; je nach Phase Auswahl, Hauptmann, Schuss usw. */
function tap(g, pid, toast) {
  const d = g.draft;
  if (g.phase === 'ended') return;
  if (g.phase === 'interrupt') {
    const it = g.interrupts[0];
    if (!it || it.type === 'maid' || it.type === 'reveal') return;
    if (it.type === 'scapegoat') {
      if (!alive(g, pid)) return;
      const i = it.picks.indexOf(pid);
      if (i >= 0) it.picks.splice(i, 1); else it.picks.push(pid);
      return;
    }
    if (it.type === 'hunter') {
      if (pid === it.id || !alive(g, pid)) return;
      if (g.cfg.rules.harvest && !seatNeighbors(g, it.id).includes(pid)) { toast?.('Erntefest: Der Jäger darf nur eine Person neben sich wählen.'); return; }
      g.interrupts.shift();
      kill(g, pid, 'hunter');
    } else {
      if (!alive(g, pid)) return;
      const pool = captainPool(g);
      if (pool && !pool.includes(pid)) { toast?.('Nur ein Bauer darf Hauptmann werden.'); return; }
      g.interrupts.shift(); g.captain = pid; log(g, `Neuer Hauptmann: ${nm(g, pid)}`); fixBeadle(g);
    }
    resumeAfter(g);
    return;
  }
  if (g.phase === 'day') {
    if (!alive(g, pid)) return;
    if (d.banArm) {
      d.banArm = false;
      const i = d.ban.indexOf(pid);
      if (i >= 0) { d.ban.splice(i, 1); return; }
      if (isVagabond(g, pid)) { toast?.('Vagabunden kann die Lehrerin nicht ausschließen.'); return; }
      if (g.town?.b[pid] === 'school') { toast?.('Die Lehrerin stimmt ohnehin nie ab.'); return; }
      if (d.ban.length >= 2) { toast?.('Höchstens zwei Personen.'); return; }
      d.ban.push(pid); return;
    }
    if (d.innArm) {
      d.innArm = false; d.innVote = d.innVote === pid ? null : pid;
      if (d.innVote && (d.voteMode ?? 'count') === 'count') { d.votes[pid] = (d.votes[pid] ?? 0) + 1; d.voteLog.push({ k: 'i', pid }); }
      return;
    }
    if (innImmune(g, pid) && g.dayMode !== 'captain') { toast?.('Der Wirt kann nicht ausscheiden.'); return; }
    if (d.voteMode === 'direct') { d.vote = d.vote === pid ? null : pid; return; }
    if (d.voteMode === 'voucher') {
      const el = eligibleVoters(g), i = d.sit.indexOf(pid);
      if (!el.includes(pid)) return;
      if (i >= 0) d.sit.splice(i, 1); else if (d.sit.length < el.length - 1) d.sit.push(pid); else toast?.('Es steht nur noch eine Person.');
      d.vote = voucherVictim(g);
      return;
    }
    const t = tally(g);
    if (d.capArm && g.dayMode === 'vote') {
      if (d.capVote) { toast?.('Der Hauptmann hat schon gewählt: erst „Letzte Stimme zurück“.'); d.capArm = false; return; }
      d.capVote = pid; d.capArm = false; d.voteLog.push({ k: 'c', pid }); return;
    }
    if (t.cast >= t.eligible) { toast?.('Alle Stimmen sind schon gezählt.'); return; }
    d.votes[pid] = (d.votes[pid] ?? 0) + 1; d.voteLog.push({ k: 'v', pid });
    return;
  }
  const c = stepContext(g);
  if (!c || c.step.info || c.step.gone) return;
  const { step, r, mode, need } = c;
  if (mode === 'assign') {
    if (!r) return;
    if (g.roles[pid] === r.id && pid !== g.thiefId) { delete g.roles[pid]; }
    else if (pid === g.thiefId && r.id === 'thief') { toast?.('Der Dieb hat schon getauscht.'); return; }
    else {
      const ex = holders(g, r.id);
      if (ex.length >= need) {
        if (need === 1 && ex[0].id !== g.thiefId) delete g.roles[ex[0].id];
        else { toast?.(`Schon ${need} zugeordnet – erst jemanden abwählen.`); return; }
      }
      delete g.auto[pid];
      g.roles[pid] = r.id;
    }
    reconcileAuto(g);
    if (holders(g, r.id).length >= need && step.act) g.subMode = 'action';
    return;
  }
  if (mode !== 'action' || !alive(g, pid)) return;
  const tog = (k) => { d[k] = d[k] === pid ? null : pid; };
  switch (step.act) {
    case 'kill':
      if (isWolf(g, pid)) { toast?.('Werwölfe fressen keine Werwölfe.'); return; }
      if (g.charmed[pid]) { toast?.('Diese Person ist schon betört.'); return; }
      if (innImmune(g, pid)) { toast?.('Den Wirt fressen die Werwölfe nicht.'); return; }
      if (g.cfg.rules.harvest && !seatNeighbors(g, pid).some((x) => isWolf(g, x))) { toast?.('Erntefest: Die Werwölfe können nur jemanden neben einem Werwolf reißen.'); return; }
      tog('kill'); d.girlCaught = false;
      if (!d.kill) { d.infect = false; d.heal = null; }
      break;
    case 'check': if (holders(g, 'seer').some((x) => x.id === pid)) return; tog('check'); break;
    case 'witch':
      if (g.poisonMode) { d.poison = d.poison === pid ? null : pid; g.poisonMode = false; }
      else if ((pid === d.kill || pid === d.bigkill || pid === d.whitekill) && !g.potions.heal && !(g.cfg.rules.noVictimsNight1 && g.night === 1)) d.heal = d.heal === pid ? null : pid;
      else if (!g.potions.poison) d.poison = d.poison === pid ? null : pid;
      break;
    case 'lovers': {
      const i = d.lovers.indexOf(pid);
      if (i >= 0) d.lovers.splice(i, 1); else if (d.lovers.length < 2) d.lovers.push(pid); else toast?.('Schon 2 Verliebte gewählt.');
      break;
    }
    case 'protect':
      if (pid === g.lastProtect) { toast?.('Nicht zweimal hintereinander dieselbe Person.'); return; }
      if (g.cfg.rules.harvest) { const gd = livingHolders(g, 'guard')[0]; if (gd && pid !== gd.id && !seatNeighbors(g, gd.id).includes(pid)) { toast?.('Erntefest: Der Heiler schützt nur sich und seine Nachbarn.'); return; } }
      tog('protect'); break;
    case 'bigkill': if (isWolf(g, pid) || pid === d.kill) return; tog('bigkill'); break;
    case 'whitekill':
      if (!isWolf(g, pid) || isWhiteWolf(g, pid)) { toast?.('Nur andere Werwölfe antippbar.'); return; }
      tog('whitekill'); break;
    case 'model': if (holders(g, 'wildchild').some((x) => x.id === pid)) return; tog('model'); break;
    case 'fox': tog('fox'); break;
    case 'mark':
      if (isVagabond(g, pid)) { toast?.('Vagabunden kann der Rabe nicht anschuldigen.'); return; }
      tog('mark'); break;
    case 'fire':
      if (!g.town?.b[pid]) { toast?.('Nur ein bewohntes Gebäude kann brennen.'); return; }
      tog('fire'); break;
    case 'enchant': {
      if (g.roles[pid] === 'piper' || g.enchanted[pid]) { toast?.('Bereits verzaubert oder Flötenspieler.'); return; }
      const i = d.enchant.indexOf(pid);
      if (i >= 0) d.enchant.splice(i, 1); else if (d.enchant.length < (g.cfg.rules.harvest ? 1 : 2)) d.enchant.push(pid);
      break;
    }
    case 'seance': if (d.seance && d.spQ != null) d.medium = d.medium === pid ? null : pid; break;
    case 'cust': {
      const rr = RM[step.role];
      if (!rr?.cself && holders(g, rr.id).some((x) => x.id === pid)) { toast?.(`${rr.name} kann sich nicht selbst wählen.`); return; }
      d.cust[rr.id] = d.cust[rr.id] === pid ? null : pid;
      break;
    }
    default: break;
  }
}

function resumeAfter(g) { afterDeaths(g, g.resume); }

/** Hauptmann und Büttel dürfen nicht dieselbe Person sein: wird der Büttel Hauptmann, gibt er das Amt ab. */
function fixBeadle(g) {
  if (g.ev?.beadle && g.ev.beadle === g.captain) { log(g, `${nm(g, g.captain)} wird Hauptmann und gibt das Amt des Büttels ab`); g.ev.beadle = null; }
}

export function apply(g0, a, toast) {
  const g = clone(g0);
  normalizeGame(g);
  const d = g.draft;
  switch (a.t) {
    case 'tap': tap(g, a.pid, toast); break;
    case 'assign-mode': g.subMode = a.mode; break;
    case 'next': {
      const c = stepContext(g);
      if (!c) { finishNight(g); break; }
      if (c.idx >= c.steps.length - 1) {
        for (const p of g.cfg.players) if (!g.roles[p.id] && g.night === 1 && !cnt(g, 'thief')) g.roles[p.id] = 'villager';
        finishNight(g);
      } else { g.stepIdx = c.idx + 1; g.subMode = null; g.poisonMode = false; }
      break;
    }
    case 'prev': g.stepIdx = Math.max(0, g.stepIdx - 1); g.subMode = null; g.poisonMode = false; break;
    case 'goto': g.stepIdx = a.idx; g.subMode = null; g.poisonMode = false; break;
    case 'girl-caught': {
      const girl = livingHolders(g, 'girl')[0];
      if (girl) { d.girlCaught = d.kill !== girl.id; d.kill = d.kill === girl.id ? null : girl.id; d.infect = false; d.heal = null; }
      break;
    }
    case 'witch-heal': { const v = a.pid ?? d.kill; if (v && !g.potions.heal && !(g.cfg.rules.noVictimsNight1 && g.night === 1)) d.heal = d.heal === v ? null : v; break; }
    case 'infect': {
      const v = d.kill;
      if (v && livingHolders(g, 'urwolf').length && !d.girlCaught && !g.urwolfUsed && !(g.roles[v] === 'elder' && g.elderBites >= 1)) d.infect = !d.infect;
      break;
    }
    case 'witch-poison': g.poisonMode = !g.poisonMode; if (g.poisonMode) d.poison = null; break;
    case 'thief-role': {
      const thiefId = g.thiefId ?? holders(g, 'thief')[0]?.id;
      if (!thiefId) break;
      const digital = g.cfg.mode === 'digital';
      const mid0 = g.middle0 ?? g.middle;
      const restore = () => { if (g.thiefId) { g.roles[g.thiefId] = 'thief'; g.thiefId = null; } if (digital) g.middle = [...mid0]; };
      if (d.thiefRole === a.role) { restore(); d.thiefRole = null; break; }
      if (digital && mid0.length === 2 && mid0.every(isWolfRole) && !isWolfRole(a.role)) { toast?.('Beide Karten in der Mitte sind Werwölfe: Der Dieb muss einen nehmen.'); break; }
      restore();
      d.thiefRole = a.role;
      // Tausch sofort ausführen, damit der Dieb in derselben Nacht in seiner neuen Rolle aufgerufen wird
      g.thiefId = thiefId; g.roles[thiefId] = a.role;
      if (digital) { const i = g.middle.indexOf(a.role); if (i >= 0) g.middle.splice(i, 1, 'thief'); }
      break;
    }
    case 'actor-role': {
      d.actorRole = d.actorRole === a.role ? null : a.role;
      const actor = holders(g, 'actor')[0] ?? null;
      if (actor) { g.actorId = actor.id; g.roles[actor.id] = d.actorRole ?? 'actor'; if (!d.actorRole) { /* bleibt Gaukler */ } }
      break;
    }
    case 'wolfdog': d.side = d.side === a.side ? null : a.side; break;
    case 'seance': d.seance = a.v; if (!a.v) { d.spCard = null; d.spQ = null; d.medium = null; } break;
    case 'seance-card': d.spCard = d.spCard === a.id ? null : a.id; d.spQ = null; d.medium = null; break;
    case 'seance-q': d.spQ = d.spQ === a.i ? null : a.i; if (d.spQ == null) d.medium = null; break;
    case 'ev-draw': if (g.ev && g.phase === 'day' && g.ev.deck.length) drawEvent(g); break;
    case 'ev-end': if (g.ev) g.ev.active = g.ev.active.filter((c) => c.id !== a.id); break;
    case 'town-map': if (g.town) { g.town.b = { ...a.map }; log(g, 'Gebäude verteilt'); } break;
    case 'ban-arm': if (g.town && townHolders(g, 'school').length && g.dayMode !== 'captain') { d.banArm = !d.banArm; d.innArm = false; d.capArm = false; } break;
    case 'inn-arm': if (townHolders(g, 'inn').length && g.dayMode !== 'captain') { d.innArm = !d.innArm; d.banArm = false; d.capArm = false; } break;
    case 'town-use': {
      const id = a.pid, k = buildingOf(g, id);
      if (g.phase === 'day' && k && ['church', 'shack', 'manor'].includes(k) && abilityReady(g, id)) {
        if (k === 'shack') { const tg = a.target; if (tg && g.town.used[tg] && alive(g, tg)) { delete g.town.used[tg]; log(g, `Quacksalber ${nm(g, id)} gibt ${nm(g, tg)} die Berufsfähigkeit zurück`); g.town.used[id] = true; } }
        else { g.town.used[id] = true; log(g, `${BUILDINGS[k].job} ${nm(g, id)} nutzt die Fähigkeit`); }
      }
      break;
    }
    case 'barber': {
      const b = a.pid, tg = a.target;
      if (g.phase === 'day' && buildingOf(g, b) === 'barber' && abilityReady(g, b) && tg !== b && alive(g, tg) && !isVagabond(g, tg)) {
        g.town.used[b] = true;
        log(g, `Barbier ${nm(g, b)} schaltet ${nm(g, tg)} aus`);
        g.pendingBarber = { b, t: tg };
        kill(g, tg, 'barber');
        afterDeaths(g, 'day');
      }
      break;
    }
    case 'pardon': {
      const m = townHolders(g, 'manor')[0];
      if (g.phase === 'day' && g.dayMode === 'vote' && m && abilityReady(g, m.id)) {
        let v = d.vote;
        if (!v && (d.voteMode ?? 'count') === 'count') { const tl = tally(g); if (tl.leaders.length === 1) v = tl.leaders[0]; }
        if (v && alive(g, v)) {
          d.vote = v; g.town.used[m.id] = true;
          innCheck(g, v);
          log(g, `Schlossherr ${nm(g, m.id)} begnadigt ${nm(g, v)}: Niemand scheidet aus`);
          g.collectMorning = false;
          endDay(g);
        }
      }
      break;
    }
    case 'vogt-assign': {
      const v = townHolders(g, 'vogt')[0], i = g.town?.free.indexOf(a.key) ?? -1;
      if (g.phase === 'day' && v && i >= 0 && isVagabond(g, a.pid)) { g.town.free.splice(i, 1); g.town.b[a.pid] = a.key; log(g, `Vogt ${nm(g, v.id)}: ${nm(g, a.pid)} zieht in ${BUILDINGS[a.key].name}`); }
      break;
    }
    case 'beadle-set':
      if (g.ev && alive(g, a.pid) && a.pid !== g.captain) { g.ev.beadle = a.pid; log(g, `Büttel: ${nm(g, a.pid)}`); }
      break;
    case 'beadle-clear': if (g.ev?.beadle) { log(g, `Büttel ${nm(g, g.ev.beadle)} abgesetzt`); g.ev.beadle = null; } break;
    case 'beadle-announce': {
      const ev = g.ev, i = ev ? ev.hand.findIndex((c) => c.id === a.id) : -1;
      if (ev && g.phase === 'day' && ev.beadle && alive(g, ev.beadle) && i >= 0) { const [card] = ev.hand.splice(i, 1); showCard(g, card, `vom Büttel ${nm(g, ev.beadle)} verkündet`); }
      break;
    }
    case 'judge-sign': { const j = livingHolders(g, 'judge')[0]; if (j && !g.judgeUsed) g.judgeArmed = !g.judgeArmed; break; }
    case 'set-groups': g.groups = { ...a.groups }; break;
    case 'assign-direct': g.roles[a.pid] = a.role; break;
    case 'reveal': {
      const it = g.interrupts.find((i) => i.type === 'reveal');
      if (it) {
        g.roles[it.id] = a.role; g.interrupts.splice(g.interrupts.indexOf(it), 1); log(g, `${nm(g, it.id)} hatte die Karte: ${roleName(a.role)}`);
        if (g.pendingMaid?.victim === it.id) { applyMaidRole(g, g.pendingMaid.id, it.id, a.role); g.pendingMaid = null; }
      }
      resumeAfter(g);
      break;
    }
    case 'interrupt-skip': {
      const it = g.interrupts.shift();
      if (it?.type === 'captain') g.captain = null;
      if (it?.type === 'maid') { g.interrupts.unshift(it); maidTakes(g, false); break; }
      resumeAfter(g);
      break;
    }
    case 'scapegoat-done': {
      const it = g.interrupts.shift();
      if (it?.type === 'scapegoat') { g.voters = [...it.picks]; g.votersDay = it.forDay; log(g, `Sündenbock bestimmt die Wähler für Tag ${it.forDay}: ${g.voters.map((i) => nm(g, i)).join(', ') || 'niemand'}`); if (g.resume === 'day' && it.forDay === g.day) votersNote(g); }
      resumeAfter(g);
      break;
    }
    case 'maid-take': maidTakes(g, true); break;
    case 'vote-mode': d.voteMode = ['direct', 'voucher'].includes(a.mode) ? a.mode : 'count'; d.vote = null; d.capArm = false; d.sit = []; break;
    case 'vote-cap-arm': if (g.captain && alive(g, g.captain) && g.dayMode === 'vote') d.capArm = !d.capArm; break;
    case 'vote-undo': {
      const e = d.voteLog.pop();
      if (e?.k === 'i') { d.votes[e.pid] = Math.max(0, (d.votes[e.pid] ?? 1) - 1); if (!d.votes[e.pid]) delete d.votes[e.pid]; d.innVote = null; }
      if (e?.k === 'v') { d.votes[e.pid] = Math.max(0, (d.votes[e.pid] ?? 1) - 1); if (!d.votes[e.pid]) delete d.votes[e.pid]; }
      if (e?.k === 'c') d.capVote = null;
      d.capArm = false; d.innArm = false; d.banArm = false;
      break;
    }
    case 'vote-reset': resetVote(g); break;
    case 'day-execute': {
      if (!d.vote && d.voteMode === 'count') { const t = tally(g); if (t.leaders.length === 1) d.vote = t.leaders[0]; }
      if (d.vote) executeVote(g);
      break;
    }
    case 'captain-confirm': {
      if (!d.vote && d.voteMode === 'count') { const t = tally(g); if (t.leaders.length === 1) d.vote = t.leaders[0]; }
      const pool = captainPool(g);
      if (d.vote && pool && !pool.includes(d.vote)) { d.vote = null; toast?.('Nur ein Bauer darf Hauptmann werden.'); break; }
      if (d.vote && alive(g, d.vote)) { g.captain = d.vote; g.dayMode = 'vote'; log(g, `Hauptmann: ${nm(g, d.vote)}`); fixBeadle(g); resetVote(g); }
      break;
    }
    case 'day-tie': {
      g.collectMorning = false;
      const sg = livingHolders(g, 'scapegoat')[0];
      if (sg && powerOn(g, 'scapegoat')) kill(g, sg.id, 'tie'); else log(g, 'Gleichstand – niemand wird hingerichtet');
      endDay(g); break;
    }
    case 'day-none': log(g, 'Keine Hinrichtung'); endDay(g); break;
    case 'skip-to-night': endDay(g); break;
    case 'set-captain': g.captain = a.pid; g.dayMode = 'vote'; resetVote(g); log(g, `Hauptmann: ${nm(g, a.pid)}`); fixBeadle(g); break;
    case 'skip-captain': g.dayMode = 'vote'; resetVote(g); break;
    case 'manual-kill': if (g.phase === 'day' && alive(g, a.pid)) { kill(g, a.pid, 'manual'); afterDeaths(g, 'day'); } break;
    case 'rename': { const p = g.cfg.players.find((x) => x.id === a.pid); if (p && a.name) p.name = a.name; break; }
    case 'deal-next': g.dealIdx++; g.dealShown = false; break;
    case 'deal-show': g.dealShown = !g.dealShown; break;
    default: throw new Error(`Unbekannte Aktion: ${a.t}`);
  }
  return g;
}
