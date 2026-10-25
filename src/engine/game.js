// Spiellogik ohne Oberfläche: Zustand ist reines JSON, jede Aktion liefert einen neuen Zustand.
// Regelgrundlage: Regelheft "Die Werwölfe von Düsterwald – Der Pakt" (siehe docs/regelabgleich.md).
import { ROLES, RM, WOLF_IDS, ACTOR_POOL, roleName, requiredCards } from './roles.js';

export const DEFAULT_RULES = {
  captain: true,            // Hauptmann wird am ersten Tag gewählt, Stimme zählt doppelt
  parityWin: true,          // Wölfe gewinnen bei Gleichstand (Wölfe >= Rest)
  callDeadRoles: true,      // tote Rollen zum Schein weiter aufrufen
  seerSees: 'role',         // 'role' = volle Rolle, 'camp' = nur Wolf/Dorf
  noVictimsNight1: false,   // in der ersten Nacht stirbt niemand
  hideWolfdogSide: true,    // Seite von Wolfshund/Wildem Kind bleibt auch nach dem Tod geheim
  brothersRewake: false,    // Drei Brüder wachen jede zweite Nacht erneut auf
};

// Stille Rollen werden im Kartenmodus in der ersten Nacht kurz erfasst (vor der eigentlichen Nacht).
const SILENT_ORDER = { hunter: 60, girl: 61, elder: 62, idiot: 63, scapegoat: 64, bear: 65, knight: 66, puresoul: 67, angel: 68, maid: 69, greis: 70 };
const INPUT_ACTS = new Set(['kill', 'check', 'witch', 'lovers', 'swap', 'protect', 'infect', 'bigkill', 'whitekill', 'model', 'side', 'fox', 'mark', 'enchant', 'actor', 'seance']);
export const CAUSE = {
  wolves: 'Werwölfe', bigwolf: 'Großer böser Wolf', whitewolf: 'Weißer Werwolf', poison: 'Gifttrank der Hexe',
  hunter: 'Schuss des Jägers', vote: 'Dorfgericht', tie: 'Sündenbock (Gleichstand)', heartbreak: 'Liebeskummer',
  knight: 'Rostiges Schwert des Ritters', girl: 'Von den Wölfen beim Spionieren erwischt',
};

const clone = (o) => JSON.parse(JSON.stringify(o));
const emptyDraft = () => ({
  kill: null, girlCaught: false, check: null, heal: null, poison: null, lovers: [], protect: null, infect: false,
  bigkill: null, whitekill: null, model: null, side: null, fox: null, mark: null, enchant: [], vote: null,
  actorRole: null, thiefRole: null, seance: null,
});

/* ---------- Zustand anlegen ---------- */

export function setupProblems(cfg) {
  const p = [];
  const n = cfg.players.length;
  if (n < 3) p.push('Mindestens 3 Spieler nötig.');
  const wolves = ['wolf', 'urwolf', 'bigwolf', 'whitewolf'].reduce((s, id) => s + (cfg.counts[id] || 0), 0);
  if (wolves < 1) p.push('Mindestens 1 Werwolf nötig.');
  const total = Object.values(cfg.counts).reduce((a, b) => a + (b || 0), 0);
  const need = requiredCards(cfg.counts, n);
  if (total !== need) p.push(`Karten: ${total}, benötigt ${need}${(cfg.counts.thief || 0) > 0 ? ' (Spieler + 2 für den Dieb)' : ''}.`);
  return p;
}

/** cfg: { players:[{id,name}], counts:{roleId:n}, mode:'cards'|'digital', rules:{...} } */
export function createGame(cfg, rnd = Math.random) {
  const g = {
    v: 1,
    cfg: { players: cfg.players.map((p) => ({ id: p.id, name: p.name })), counts: { ...cfg.counts }, mode: cfg.mode ?? 'cards', rules: { ...DEFAULT_RULES, ...(cfg.rules ?? {}) } },
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
    morning: [], lastDeaths: [], log: [], dealIdx: 0, dealShown: false,
  };
  if (g.cfg.counts.actor) pickActorPool(g, rnd);
  if (g.cfg.counts.greis) suggestGroups(g);
  if (g.cfg.mode === 'digital') dealRoles(g, rnd);
  if (g.cfg.counts.angel) { g.phase = 'day'; g.clock = 'day'; g.day = 0; g.dayMode = g.cfg.rules.captain ? 'captain' : 'vote'; log(g, '— Tag 0: Abstimmung vor der ersten Nacht (Engel im Spiel) —'); }
  return g;
}

function shuffle(a, rnd) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function dealRoles(g, rnd) {
  const bag = shuffle(Object.entries(g.cfg.counts).flatMap(([id, n]) => Array(n || 0).fill(id)), rnd);
  const n = g.cfg.players.length;
  g.roles = Object.fromEntries(g.cfg.players.map((p, i) => [p.id, bag[i] || 'villager']));
  g.middle = bag.slice(n);
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
export const livingHolders = (g, r) => holders(g, r).filter((p) => alive(g, p.id));

/** Werwolf im Sinne von Seherin, Fuchs, Bär und Ritter (auch Weißer Werwolf, Infizierte, Wolfshund als Wolf). */
export function isWolf(g, id) {
  const r = g.roles[id];
  return WOLF_IDS.includes(r) || (r === 'wolfdog' && g.wolfdogWolf) || !!g.turned[id];
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
  if (r.id === 'actor' && !g.actorPool.length) return false;
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

/** Schritte der aktuellen Nacht in der Reihenfolge des Regelhefts. */
export function nightSteps(g) {
  const out = [];
  const first = g.night === 1;
  const borrowed = actorRoleNow(g);
  const digital = g.cfg.mode === 'digital';
  const wolfSide = ['wolf', 'urwolf', 'bigwolf', 'whitewolf'].some((id) => cnt(g, id) > 0) || g.cfg.players.some((p) => isWolf(g, p.id));
  const entries = ROLES.filter((r) => r.id !== 'villager').map((r) => ({ r, order: r.night?.order ?? SILENT_ORDER[r.id] ?? 999 })).sort((a, b) => a.order - b.order);
  for (const { r } of entries) {
    const inPlay = cnt(g, r.id) > 0 || r.id === borrowed || (r.id === 'wolf' && wolfSide);
    if (!inPlay) continue;
    const act = actApplies(g, r);
    const wakes = r.night && nightMatches(g, r);          // wacht in dieser Nacht (auch ohne Eingabe, z. B. Schwestern)
    if (!first && !act && !wakes) continue;
    if (digital && !act && !(wakes && r.group)) continue;  // ohne Karten: nur Rollen mit Aktion oder Treffen
    if (r.id === borrowed && !cnt(g, r.id) && !act) continue;
    const living = r.id === 'wolf' ? g.cfg.players.filter((p) => alive(g, p.id) && isWolf(g, p.id)) : livingHolders(g, r.id);
    const gone = !first && living.length === 0;
    if (gone && !g.cfg.rules.callDeadRoles) continue;
    const input = act && INPUT_ACTS.has(r.night.act) && !gone;
    out.push({ key: r.id, role: r.id, act: input ? r.night.act : null, gone, label: r.id === borrowed && !cnt(g, r.id) ? `${r.name} (Gaukler)` : r.name, say: r.say ?? '' });
    if (r.id === 'cupid' && first) out.push({ key: 'lovers', role: null, info: true, label: 'Verliebte', say: 'Ich tippe die Verliebten an. Sie öffnen die Augen, erkennen einander und schlafen wieder ein.' });
    if (r.id === 'piper' && act && !gone) out.push({ key: 'enchanted', role: null, info: true, label: 'Verzauberte', say: 'Alle Verzauberten erwachen, erkennen einander und schlafen wieder ein.' });
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
    if (rid === 'elder' && ['vote', 'poison', 'hunter'].includes(cause) && !g.powersLost) {
      g.powersLost = true;
      log(g, 'Der Alte wurde nicht von den Wölfen getötet – die Dorfbewohner verlieren ihre Sonderfähigkeiten!');
      g.morning.push('Der Alte ist tot. Die Dorfbewohner verlieren alle Sonderfähigkeiten (Zweideutige und Einzelgänger nicht).');
    }
    if (rid === 'hunter' && powerOn(g, 'hunter')) g.interrupts.push({ type: 'hunter', id: x });
    if (rid === 'scapegoat') g.interrupts.push({ type: 'scapegoat', id: x, picks: [], forDay: g.clock === 'day' ? g.day + 1 : g.night });
    if (rid === 'angel' && g.angelWindow) g.angelWin = true;
    if (g.captain === x && g.cfg.rules.captain) g.interrupts.push({ type: 'captain', id: x });
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
  const pack = liv.filter((id) => isWolf(g, id) && !isWhiteWolf(g, id));
  if (!pack.length && !ww && !piper) return 'Das Dorf';
  if (ww) return null;   // der Weiße Werwolf muss erst allein übrig bleiben oder sterben
  const others = liv.length - pack.length;
  if (others === 0 || (g.cfg.rules.parityWin && pack.length >= others)) return 'Die Werwölfe';
  return null;
}

/** Prüft nach Toden auf offene Entscheidungen, Sieg, sonst weiter mit Tag oder Nacht. */
function afterDeaths(g, resume) {
  settle(g);
  if (g.interrupts.length) { g.phase = 'interrupt'; g.resume = resume; return; }
  const w = checkWinner(g);
  if (w) { log(g, `Sieg: ${w}`); g.winner = w; g.phase = 'ended'; return; }
  if (resume === 'day') g.phase = 'day';
  else beginNight(g, g.day + 1);
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
  if (d.enchant.length) { d.enchant.forEach((id) => { g.enchanted[id] = true; }); log(g, `Verzaubert: ${d.enchant.map((i) => nm(g, i)).join(', ')}`); }
  if (d.fox) {
    const grp = [d.fox, ...seatNeighbors(g, d.fox)], hit = grp.some((id) => isWolf(g, id));
    log(g, `Fuchs prüft ${grp.map((i) => nm(g, i)).join(', ')}: ${hit ? 'Wolf dabei' : 'kein Wolf'}`);
    if (!hit) g.foxLost = true;
  }
  if (g.knightCurse) { const k = g.knightCurse; g.knightCurse = null; if (alive(g, k)) kill(g, k, 'knight'); }

  const quiet = rules.noVictimsNight1 && g.night === 1;
  if (quiet) log(g, 'Hausregel: In der ersten Nacht stirbt niemand');
  const wolfAttack = (v, cause) => {
    if (!v || !alive(g, v)) return;
    const isElder = g.roles[v] === 'elder' && powerOn(g, 'elder');
    const girlVictim = d.girlCaught && g.roles[v] === 'girl';
    const infectable = cause === 'wolves' && d.infect && !g.urwolfUsed && livingHolders(g, 'urwolf').length && !(isElder && g.elderBites >= 1);
    if (isElder) g.elderBites++;
    if (infectable) { g.turned[v] = true; g.urwolfUsed = true; log(g, `Urwolf infiziert ${nm(g, v)} – ab jetzt heimlich Werwolf`); return; }
    if (!girlVictim && v === d.protect) { log(g, `${nm(g, v)} wurde vom Heiler gerettet`); return; }
    if (d.heal === v && !g.potions.heal) { g.potions.heal = true; log(g, `Hexe heilt ${nm(g, v)}`); return; }
    if (isElder && g.elderBites === 1) { log(g, `Der Alte ${nm(g, v)} übersteht den ersten Angriff`); return; }
    kill(g, v, girlVictim ? 'girl' : cause);
    if (g.roles[v] === 'knight' && powerOn(g, 'knight')) {
      const w = nextWolf(g, v);
      if (w) { g.knightCurse = w; log(g, `Ritter: ${nm(g, w)} ist verwundet und stirbt nächste Nacht`); }
    }
  };
  if (!quiet) {
    wolfAttack(d.kill, 'wolves');
    if (d.bigkill && d.bigkill !== d.kill) wolfAttack(d.bigkill, 'bigwolf');
    if (d.whitekill && alive(g, d.whitekill)) kill(g, d.whitekill, 'whitewolf');
    if (d.poison && !g.potions.poison && alive(g, d.poison)) { g.potions.poison = true; kill(g, d.poison, 'poison'); }
  }

  const bear = livingHolders(g, 'bear')[0];
  if (bear && powerOn(g, 'bear')) {
    const growl = seatNeighbors(g, bear.id).some((id) => isWolf(g, id)) || isWolf(g, bear.id);
    g.morning.push(growl ? 'Der Bär brummt laut!' : 'Der Bär bleibt ruhig.');
  }
  if (g.ravenMark && alive(g, g.ravenMark)) g.morning.push(`Der Rabe hat ${nm(g, g.ravenMark)} belastet: zwei Stimmen mehr gegen die Person.`);
  if (d.seance) g.morning.push('Geisterbeschwörung: Eine Person stellt den Geistern eine Frage der Spiritismus-Karte, du antwortest wahrheitsgemäß mit Ja oder Nein.');
  if (g.night === 1 && Object.keys(g.groups).length && livingHolders(g, 'greis').length && !g.groupsShown) {
    g.groupsShown = true;
    g.morning.push(`Das Dorf ist zerstritten! Gruppe 1: ${groupNames(g, 'A')}. Gruppe 2: ${groupNames(g, 'B')}.`);
  }
  votersNote(g);
  g.dayMode = (rules.captain && !g.captain && !g.captainLost) ? 'captain' : 'vote';
  g.draft = emptyDraft(); g.subMode = null;
  settle(g);
  g.clock = 'day';
  if (g.night === 1) g.angelWindow = false;
  log(g, '— Das Dorf erwacht —');
  afterDeaths(g, 'day');
}

export function groupNames(g, grp) { return g.cfg.players.filter((p) => g.groups[p.id] === grp).map((p) => p.name).join(', '); }

/* ---------- Tag ---------- */

function votersNote(g) {
  if (g.voters && g.votersDay === g.day) g.morning.push(`Auf Befehl des Sündenbocks dürfen heute nur abstimmen: ${g.voters.map((i) => nm(g, i)).join(', ') || 'niemand'}.`);
}

function endDay(g) {
  g.draft.vote = null; g.collectMorning = false;
  if (g.judgeArmed && !g.judgeUsed) {
    g.judgeArmed = false; g.judgeUsed = true; g.secondVote = true;
    log(g, 'Der Stotternde Richter verlangt eine zweite Abstimmung – ohne weitere Diskussion');
    afterDeaths(g, 'day');
    return;
  }
  afterDeaths(g, 'night');
}

function executeVote(g) {
  const v = g.draft.vote;
  g.collectMorning = false;
  if (!v || !alive(g, v)) return;
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
  if (maid && maid.id !== v && !g.lovers.includes(maid.id)) {
    g.interrupts.unshift({ type: 'maid', id: maid.id, victim: v });
    g.phase = 'interrupt'; g.resume = 'night';
    return;
  }
  kill(g, v, 'vote');
  endDay(g);
}

function maidTakes(g, take) {
  const it = g.interrupts.shift();
  const v = it.victim;
  if (take) {
    const role = g.roles[v];
    if (role) {
      g.roles[it.id] = role;
      log(g, `Ergebene Magd ${nm(g, it.id)} übernimmt die Rolle ${roleName(role)} von ${nm(g, v)}`);
      if (role === 'witch') g.potions = { heal: false, poison: false };
      if (['wildchild', 'wolfdog', 'judge'].includes(role)) g.fresh[role] = true;
      if (role === 'judge') g.judgeUsed = false;
      if (g.captain === it.id) g.captain = null;
      delete g.enchanted[it.id];
      if (role === 'actor') g.actorId = it.id;
    } else log(g, `Ergebene Magd ${nm(g, it.id)} übernimmt die Karte von ${nm(g, v)} (Rolle noch unbekannt)`);
  }
  kill(g, v, 'vote');
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
      g.interrupts.shift();
      kill(g, pid, 'hunter');
    } else {
      if (!alive(g, pid)) return;
      g.interrupts.shift(); g.captain = pid; log(g, `Neuer Hauptmann: ${nm(g, pid)}`);
    }
    resumeAfter(g);
    return;
  }
  if (g.phase === 'day') {
    if (!alive(g, pid)) return;
    if (g.dayMode === 'captain') { g.captain = pid; g.dayMode = 'vote'; log(g, `Hauptmann: ${nm(g, pid)}`); return; }
    d.vote = d.vote === pid ? null : pid;
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
      tog('kill'); d.girlCaught = false;
      if (!d.kill) { d.infect = false; d.heal = null; }
      break;
    case 'check': if (holders(g, 'seer').some((x) => x.id === pid)) return; tog('check'); break;
    case 'witch':
      if (g.poisonMode) { d.poison = d.poison === pid ? null : pid; g.poisonMode = false; }
      else if ((pid === d.kill || pid === d.bigkill) && !g.potions.heal && !(g.cfg.rules.noVictimsNight1 && g.night === 1)) d.heal = d.heal === pid ? null : pid;
      else if (!g.potions.poison) d.poison = d.poison === pid ? null : pid;
      break;
    case 'lovers': {
      const i = d.lovers.indexOf(pid);
      if (i >= 0) d.lovers.splice(i, 1); else if (d.lovers.length < 2) d.lovers.push(pid); else toast?.('Schon 2 Verliebte gewählt.');
      break;
    }
    case 'protect':
      if (pid === g.lastProtect) { toast?.('Nicht zweimal hintereinander dieselbe Person.'); return; }
      tog('protect'); break;
    case 'bigkill': if (isWolf(g, pid) || pid === d.kill) return; tog('bigkill'); break;
    case 'whitekill':
      if (!isWolf(g, pid) || isWhiteWolf(g, pid)) { toast?.('Nur andere Werwölfe antippbar.'); return; }
      tog('whitekill'); break;
    case 'model': if (holders(g, 'wildchild').some((x) => x.id === pid)) return; tog('model'); break;
    case 'fox': tog('fox'); break;
    case 'mark': tog('mark'); break;
    case 'enchant': {
      if (g.roles[pid] === 'piper' || g.enchanted[pid]) { toast?.('Bereits verzaubert oder Flötenspieler.'); return; }
      const i = d.enchant.indexOf(pid);
      if (i >= 0) d.enchant.splice(i, 1); else if (d.enchant.length < 2) d.enchant.push(pid);
      break;
    }
    default: break;
  }
}

function resumeAfter(g) { afterDeaths(g, g.resume); }

export function apply(g0, a, toast) {
  const g = clone(g0);
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
      const thief = holders(g, 'thief')[0];
      d.thiefRole = d.thiefRole === a.role ? null : a.role;
      if (thief) {
        // Tausch sofort ausführen, damit der Dieb in derselben Nacht in seiner neuen Rolle aufgerufen wird
        if (d.thiefRole) { g.thiefId = thief.id; g.roles[thief.id] = d.thiefRole; if (g.cfg.mode === 'digital') { const i = g.middle.indexOf(d.thiefRole); if (i >= 0) g.middle.splice(i, 1, 'thief'); } }
        else if (g.thiefId) { g.roles[g.thiefId] = 'thief'; g.thiefId = null; }
      }
      break;
    }
    case 'actor-role': {
      d.actorRole = d.actorRole === a.role ? null : a.role;
      const actor = holders(g, 'actor')[0] ?? null;
      if (actor) { g.actorId = actor.id; g.roles[actor.id] = d.actorRole ?? 'actor'; if (!d.actorRole) { /* bleibt Gaukler */ } }
      break;
    }
    case 'wolfdog': d.side = d.side === a.side ? null : a.side; break;
    case 'seance': d.seance = a.v; break;
    case 'judge-sign': { const j = livingHolders(g, 'judge')[0]; if (j && !g.judgeUsed) g.judgeArmed = !g.judgeArmed; break; }
    case 'set-groups': g.groups = { ...a.groups }; break;
    case 'assign-direct': g.roles[a.pid] = a.role; break;
    case 'reveal': {
      const it = g.interrupts.find((i) => i.type === 'reveal');
      if (it) { g.roles[it.id] = a.role; g.interrupts.splice(g.interrupts.indexOf(it), 1); log(g, `${nm(g, it.id)} hatte die Karte: ${roleName(a.role)}`); }
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
    case 'day-execute': executeVote(g); break;
    case 'day-tie': {
      g.collectMorning = false;
      const sg = livingHolders(g, 'scapegoat')[0];
      if (sg && powerOn(g, 'scapegoat')) kill(g, sg.id, 'tie'); else log(g, 'Gleichstand – niemand wird hingerichtet');
      endDay(g); break;
    }
    case 'day-none': log(g, 'Keine Hinrichtung'); endDay(g); break;
    case 'skip-to-night': endDay(g); break;
    case 'set-captain': g.captain = a.pid; g.dayMode = 'vote'; log(g, `Hauptmann: ${nm(g, a.pid)}`); break;
    case 'skip-captain': g.dayMode = 'vote'; break;
    case 'deal-next': g.dealIdx++; g.dealShown = false; break;
    case 'deal-show': g.dealShown = !g.dealShown; break;
    default: throw new Error(`Unbekannte Aktion: ${a.t}`);
  }
  return g;
}
