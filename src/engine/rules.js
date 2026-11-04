// Regeln eigener Rollen: Bedingungen (Wenn), Nebenwirkungen (Danach), Klartext und Vorlagen.
// Die Wirkungen selbst stehen in BLOCKS (roles.js); eine Regel ist ein Baustein mit Bedingungsbaum.
import { BLOCKS, RM, roleName } from './roles.js';

/** Bedingungen. arg: 'n' (Zahl) oder 'role' (Rollenkennung). Ausgewertet in game.js (evalCond). */
export const CONDS = {
  nightGte: { name: 'Ab einer bestimmten Nacht', arg: 'n', min: 2, max: 9, def: 2, text: (c) => `es mindestens Nacht ${c.n} ist` },
  roleAlive: { name: 'Eine Rolle lebt noch', arg: 'role', text: (c) => `${roleName(c.role)} noch lebt` },
  roleDead: { name: 'Eine Rolle ist ausgeschieden', arg: 'role', text: (c) => `${roleName(c.role)} ausgeschieden ist` },
  deathLast: { name: 'In der letzten Nacht starb jemand', text: () => 'in der letzten Nacht jemand starb' },
  noDeathLast: { name: 'In der letzten Nacht starb niemand', text: () => 'in der letzten Nacht niemand starb' },
  wolvesGte: { name: 'Mindestens so viele Werwölfe leben', arg: 'n', min: 1, max: 6, def: 2, text: (c) => `mindestens ${c.n} Werwölfe leben` },
  aliveGte: { name: 'Mindestens so viele Spieler leben', arg: 'n', min: 3, max: 30, def: 6, text: (c) => `mindestens ${c.n} Spieler leben` },
  aliveLte: { name: 'Höchstens so viele Spieler leben', arg: 'n', min: 2, max: 30, def: 5, text: (c) => `höchstens ${c.n} Spieler leben` },
  boundAlive: { name: 'Das festgelegte Ziel lebt', text: () => 'das festgelegte Ziel lebt' },
  boundDead: { name: 'Das festgelegte Ziel ist tot', text: () => 'das festgelegte Ziel tot ist' },
  used: { name: 'Die Fähigkeit wurde schon eingesetzt', text: () => 'diese Fähigkeit schon eingesetzt wurde' },
  unused: { name: 'Die Fähigkeit wurde noch nie eingesetzt', text: () => 'diese Fähigkeit noch nie eingesetzt wurde' },
  // Nur bei Auslösern sinnvoll (Lage in dieser Nacht)
  away: { name: 'Sie ist heute unterwegs', ctx: true, text: () => 'sie unterwegs ist' },
  home: { name: 'Sie ist heute zu Hause', ctx: true, text: () => 'sie zu Hause ist' },
  visitedNone: { name: 'Niemand hat sie besucht', ctx: true, text: () => 'niemand sie besucht hat' },
  visitedGte2: { name: 'Mindestens zwei haben sie besucht', ctx: true, text: () => 'mindestens zwei sie besucht haben' },
  partyAlive: { name: 'Jemand aus ihrer Partei lebt noch', ctx: true, text: () => 'noch jemand aus ihrer Partei lebt' },
  neverKilled: { name: 'Sie hat noch niemanden getötet', ctx: true, text: () => 'sie noch niemanden getötet hat' },
  usedTonight: { name: 'Sie hat heute eine Fähigkeit eingesetzt', ctx: true, text: () => 'sie heute eine Fähigkeit eingesetzt hat' },
  notUsedTonight: { name: 'Sie hat heute nichts eingesetzt', ctx: true, text: () => 'sie heute nichts eingesetzt hat' },
  attackerWolf: { name: 'Der Angreifer ist ein Werwolf', ctx: true, text: () => 'der Angreifer ein Werwolf ist' },
  hasItem: { name: 'Sie trägt einen bestimmten Gegenstand', arg: 'item', text: (c) => `sie „${itemName(c.item)}“ trägt` },
  itemGte: { name: 'Sie trägt mindestens so viele Gegenstände', arg: 'n', min: 1, max: 5, def: 1, text: (c) => `sie mindestens ${c.n} Gegenst${c.n === 1 ? 'and' : 'ände'} trägt` },
  usedGte: { name: 'Fähigkeiten der Rolle mindestens so oft eingesetzt', arg: 'n', min: 1, max: 9, def: 3, text: (c) => `die Rolle ihre Fähigkeiten mindestens ${c.n}× eingesetzt hat` },
  unlocked: { name: 'Freigeschaltet', text: () => 'sie freigeschaltet ist' },
  locked: { name: 'Noch nicht freigeschaltet', text: () => 'sie noch nicht freigeschaltet ist' },
};
export const COND_GROUPS = [['In diesem Moment', ['away', 'home', 'visitedNone', 'visitedGte2', 'attackerWolf', 'usedTonight', 'notUsedTonight', 'partyAlive', 'neverKilled']], ['Zeit und Verlauf', ['nightGte', 'deathLast', 'noDeathLast', 'used', 'unused', 'usedGte', 'unlocked', 'locked']], ['Andere Rollen', ['roleAlive', 'roleDead', 'wolvesGte']], ['Gegenstände', ['hasItem', 'itemGte']], ['Spielstand', ['aliveGte', 'aliveLte', 'boundAlive', 'boundDead']]];

/** Auslöser: Die Regel wirkt automatisch, ohne Nachtschritt. */
export const TRIGGERS = {
  always: 'Immer', attacked: 'Wenn sie angegriffen wird', targetAttacked: 'Wenn ihr heutiges Ziel angegriffen wird', hostDies: 'Wenn ihr Gastgeber stirbt',
  visited: 'Wenn sie besucht wird', death: 'Wenn sie stirbt', voted: 'Wenn das Dorf sie hinrichtet', dawn: 'Jeden Morgen', boundDies: 'Wenn ihr festgelegtes Ziel stirbt',
};
export const TGT_TXT = { attacker: 'den Angreifer', visitors: 'alle Besucher', host: 'den Gastgeber', bound: 'das festgelegte Ziel', pick: 'eine Person nach Wahl', none: '', self: 'sich selbst' };
export const POWER_TXT = { 1: 'normal', 2: 'durchdringend', 3: 'unaufhaltbar' };
export const PROTECT_TXT = { 1: 'normal', 2: 'stark' };
export const MAX_DEPTH = 3;

/** Nebenwirkungen nach erfolgreichem Einsatz. */
export const THENS = {
  note: { name: 'Spielleiter-Hinweis', hint: 'Die App erinnert dich mit deinem Text.', text: (t) => `Hinweis an dich: „${t.text || '…'}“` },
  selfBlock: { name: 'Eigene Fähigkeit ruht eine Nacht', hint: 'In der nächsten Nacht wird die Rolle nicht aufgerufen.', text: () => 'in der nächsten Nacht ruht die eigene Fähigkeit' },
  noVoteToday: { name: 'Heute keine Abstimmung', hint: 'Nur bei Tagesfähigkeiten: der Tag endet ohne Abstimmung.', text: () => 'findet heute keine Abstimmung statt' },
  selfDie: { name: 'Stirbt danach selbst', hint: 'Der Einsatz kostet das eigene Leben.', text: () => 'stirbt die Rolle selbst' },
};

/** Gruppen und Erklärungen der Wirkungen für den Katalog im Editor. */
export const EFFECT_GROUPS = [
  ['Schützen', ['protect', 'guard', 'alert']],
  ['Wissen', ['peek', 'peekrole', 'party', 'same', 'count', 'threeRoles', 'roleAlive', 'roleIn', 'deadRole', 'deathCause']],
  ['Wissen am Morgen', ['watch', 'whomVisited', 'whoActive', 'attackedAll', 'wasProtected', 'myAttacker']],
  ['Täuschen', ['appear', 'frame', 'nullify']],
  ['Gegenstände', ['giveItem', 'stealItem', 'destroyItem', 'cleanse', 'gainItem', 'startItem']],
  ['Abstimmung und Tag', ['voteBoost', 'votePenalty', 'voteShield', 'noVote', 'extraVote', 'accuse', 'reveal', 'selfVote', 'secretVote', 'tieBreak']],
  ['Rolle wechseln', ['becomeWolf', 'turnSelf', 'copyDead', 'passOn', 'lend', 'bequeath', 'takeRole', 'unlock']],
  ['Angreifen', ['kill', 'delayed', 'trap', 'shoot', 'jailkill']],
  ['Besuche und Orte', ['visit', 'invite', 'decoy', 'redirect', 'swapPlace']],
  ['Bei Ereignis (automatisch)', ['survive', 'strike', 'dieSelf', 'shield']],
  ['Beeinflussen', ['silence', 'block', 'jail']],
  ['Verbinden und Verwandeln', ['love', 'swap', 'turn', 'convert', 'recruit', 'bind']],
  ['Zurückholen', ['revive']],
  ['Frei', ['note']],
];
export const EFFECT_HINT = {
  protect: 'Das Opfer der Wölfe überlebt.', guard: 'Das Opfer überlebt, der Beschützer stirbt dafür.', alert: 'Unangreifbar in dieser Nacht, jeder Besucher stirbt.',
  peek: 'Antwort: Werwolf oder nicht.', peekrole: 'Die App zeigt die echte Rolle.', watch: 'Am Morgen: wer die Person besucht hat.',
  kill: 'Die Person stirbt am Morgen.', shoot: 'Am Tag: die Person stirbt sofort.', jailkill: 'Am Tag einsperren, nachts hinrichten.',
  silence: 'Am nächsten Tag kein Reden, keine Stimme.', block: 'In der nächsten Nacht keine Fähigkeit.', jail: 'Am Tag einsperren: nachts sicher, aber gesperrt.',
  love: 'Zwei Personen werden ein Liebespaar.', swap: 'Zwei Personen tauschen ihre Rollen.', turn: 'Die Person wird heimlich Werwolf.', convert: 'Die Person bekommt eine feste Rolle.', recruit: 'Die Person gehört zur Sekte.', bind: 'Ein Schützling oder Ziel für die Siegbedingung.',
  revive: 'Eine gestorbene Person kommt zurück.', note: 'Die App rechnet nichts, sie erinnert dich mit deinem Text.',
  visit: 'Übernachtet bei der Person (zählt als Besuch, ist unterwegs).', invite: 'Die Person übernachtet bei dir.', decoy: 'Angriffe auf die Person treffen dich.',
  redirect: 'Angriffe auf die erste Person treffen die zweite.', swapPlace: 'Angriffe auf die beiden werden vertauscht.',
  delayed: 'Die Person wird erst in der nächsten Nacht angegriffen.', trap: 'Trifft Besucher der Person.',
  survive: 'Der Angriff oder die Hinrichtung geht ins Leere.',
  party: 'Dorf, Werwölfe oder eigene Partei.', same: 'Ja oder nein.', count: 'Eine Zahl, keine Namen.', threeRoles: 'Eine der drei Rollen ist die echte.', roleAlive: 'Lebt oder ausgeschieden.', roleIn: 'Ja oder nein.',
  deadRole: 'Die echte Rolle einer gestorbenen Person.', deathCause: 'Wie die Person gestorben ist.', whomVisited: 'Wen die Person heute besucht hat.', whoActive: 'Alle, die heute etwas eingesetzt haben.',
  attackedAll: 'Alle, die heute angegriffen wurden.', wasProtected: 'Ja oder nein.', myAttacker: 'Wer sie heute angegriffen hat.',
  appear: 'Dauerhaft: Prüfungen zeigen etwas Falsches.',
  becomeWolf: 'Ein Angriff macht sie zum Werwolf statt zu töten.',
  giveItem: 'Zum Beispiel eine Rüstung.', stealItem: 'Nimmt den ersten Gegenstand der Person an sich.', destroyItem: 'Alle Gegenstände der Person sind weg.', cleanse: 'Entfernt alle schlechten Gegenstände.', gainItem: 'Bei einem Ereignis bekommt sie einen Gegenstand.', startItem: 'Liegt ab Spielbeginn bereit.',
  voteBoost: 'Für heute: ×2, ×½ oder gestrichen.', votePenalty: 'Wie der Rabe: Stimmen mehr gegen die Person.', voteShield: 'Die Person scheidet heute nicht durch Abstimmung aus.',
  noVote: 'Der Tag endet ohne Abstimmung.', extraVote: 'Wie beim Stotternden Richter.', accuse: 'Ja oder Nein über die angeklagte Person.', reveal: 'Große Karte zum Zeigen, danach Abzeichen.',
  selfVote: 'Dauerhaft ×2 oder ×3, auf Wunsch nur jeden zweiten Tag.', secretVote: 'Zeigt dir ihre Wahl heimlich, du trägst sie ein.', tieBreak: 'Statt des Sündenbocks wählt sie aus dem Gleichstand.', turnSelf: 'Zum Beispiel nach drei Einsätzen jeden Morgen geprüft.', copyDead: 'Wird zur Rolle einer gestorbenen Person.',
  passOn: 'Die Person bekommt die Rolle, du wirst Dorfbewohner.', lend: 'Eine Nacht lang tauschen, danach zurück.', bequeath: 'Beim Tod bekommt jemand die Rolle.',
  takeRole: 'Lehrling: stirbt das Ziel, übernimmt sie dessen Rolle.', unlock: 'Für Fähigkeiten mit der Bedingung „Freigeschaltet“.', frame: 'Für 1 bis 3 Nächte: Prüfungen zeigen etwas Falsches.', nullify: 'Die Fähigkeit wirkt heute nicht, ohne dass es jemand merkt.', strike: 'Angriff auf Angreifer, Besucher oder eine Person nach Wahl.', dieSelf: 'Zum Beispiel, wenn der Gastgeber stirbt.', shield: 'Wehrt den nächsten normalen Angriff ab.',
};
/** Satzbaustein der Wirkung; {t} = Ziel. */
export const PHRASE = {
  kill: 'tötet {t}', protect: 'schützt {t} vor den Wölfen', mark: 'markiert {t}', peek: 'prüft, ob {t} ein Werwolf ist', peekrole: 'erfährt die Rolle von {t}',
  silence: 'schaltet {t} stumm', block: 'sperrt die Fähigkeit von {t}', swap: 'lässt {t} die Rollen tauschen', love: 'verliebt {t}', turn: 'macht {t} heimlich zum Werwolf',
  convert: 'verwandelt {t} in {r}', revive: 'belebt {t} wieder', bind: 'legt {t} als Ziel fest', guard: 'bewacht {t} und stirbt notfalls an ihrer Stelle', recruit: 'nimmt {t} in die Sekte auf',
  watch: 'beobachtet, wer {t} besucht', alert: 'ist wachsam', shoot: 'erschießt {t}', jail: 'sperrt {t} ein', jailkill: 'sperrt {t} ein und richtet sie in der Nacht hin', note: 'erinnert dich: „{x}“',
  visit: 'besucht {t} und übernachtet dort', invite: 'lädt {t} zu sich ein', decoy: 'lockt Angriffe auf {t} zu sich', redirect: 'lenkt Angriffe um: {t}', swapPlace: 'vertauscht den Platz von {t}',
  delayed: 'verflucht {t}',
  party: 'erfährt die Partei von {t}', same: 'erfährt, ob {t} zur gleichen Partei gehören', count: 'zählt die Werwölfe unter {t}', threeRoles: 'erfährt drei Rollen für {t}',
  roleAlive: 'erfährt, ob {r} noch lebt', roleIn: 'erfährt, ob {r} im Spiel ist', deadRole: 'erfährt die Rolle von {t}', deathCause: 'erfährt die Todesursache von {t}',
  whomVisited: 'erfährt am Morgen, wen {t} besucht hat', whoActive: 'erfährt am Morgen, wer aktiv war', attackedAll: 'erfährt am Morgen, wer angegriffen wurde', wasProtected: 'erfährt am Morgen, ob {t} geschützt war', myAttacker: 'erfährt am Morgen, wer sie angegriffen hat',
  appear: 'erscheint bei Prüfungen als {a}',
  becomeWolf: 'wird Werwolf statt zu sterben',
  giveItem: 'gibt {t} {i}', stealItem: 'stiehlt {t} einen Gegenstand', destroyItem: 'zerstört die Gegenstände von {t}', cleanse: 'befreit {t} von schlechten Gegenständen', gainItem: 'erhält {i}', startItem: 'beginnt mit {i}',
  voteBoost: 'ändert die Stimme von {t}', votePenalty: 'belastet {t} mit Strafstimmen', voteShield: 'bewahrt {t} heute vor der Hinrichtung', noVote: 'verhindert die heutige Abstimmung', extraVote: 'verlangt eine zweite Abstimmung',
  accuse: 'klagt {t} an', reveal: 'deckt die Rolle von {t} auf', selfVote: 'hat eine starke Stimme', secretVote: 'hat eine geheime Zusatzstimme', tieBreak: 'entscheidet bei Gleichstand', turnSelf: 'wird selbst Werwolf', copyDead: 'übernimmt die Rolle von {t}', passOn: 'gibt die eigene Rolle an {t}', lend: 'leiht die eigene Rolle für eine Nacht an {t}',
  bequeath: 'vererbt die Rolle an {t}', takeRole: 'übernimmt die Rolle des Ziels', unlock: 'schaltet die Fähigkeiten frei', frame: 'lässt {t} bei Prüfungen als {a} erscheinen', nullify: 'macht die Fähigkeit von {t} heute wirkungslos', trap: 'stellt eine Falle bei {t}', survive: 'übersteht es', strike: 'greift {t} an', dieSelf: 'wird selbst angegriffen', shield: 'bekommt einen Schild',
};
const WHEN_TXT = { night: { every: 'Jede Nacht', first: 'In der ersten Nacht', later: 'Ab der zweiten Nacht', even: 'Jede zweite Nacht' }, day: { every: 'Jeden Tag', first: 'Am ersten Tag', later: 'Ab dem zweiten Tag', even: 'Jeden zweiten Tag' } };

export function targetText(b) {
  const B = BLOCKS[b.k];
  if (b.on) return TGT_TXT[b.tgt ?? 'none'] ?? '';
  if (B.noTarget) return '';
  if (B.selfOnly || (b.k === 'note' && !b.n)) return '';
  if (B.dead) return b.n > 1 ? `bis zu ${b.n} gestorbene Personen` : 'eine gestorbene Person';
  if (B.fixed === 2) return 'zwei Personen';
  const who = b.n > 1 ? `bis zu ${b.n} Personen` : b.self ? 'eine Person (auch sich selbst)' : 'eine andere Person';
  return who;
}
export function condText(c) {
  if (!c) return '';
  if (c.all || c.any) {
    const items = (c.all ?? c.any).map((x) => ((x.all || x.any) && (x.all ?? x.any).length > 1 ? `(${condText(x)})` : condText(x))).filter(Boolean);
    return items.join(c.all ? ' und ' : ' oder ');
  }
  return CONDS[c.k]?.text(c) ?? '';
}
export const condCount = (c) => (!c ? 0 : c.all || c.any ? (c.all ?? c.any).reduce((s, x) => s + condCount(x), 0) : 1);
export const whenText = (b) => (b.on === 'always' ? 'Immer' : b.on ? TRIGGERS[b.on] : WHEN_TXT[BLOCKS[b.k].day ? 'day' : 'night'][b.when] ?? '');
export const powerText = (b) => (b.power == null ? '' : b.k === 'protect' ? PROTECT_TXT[b.power] : POWER_TXT[b.power]);
const WHO_TXT = { ownCamp: 'nur aus der eigenen Partei', otherCamp: 'nur aus der anderen Partei', withAbility: 'nur Personen mit Nachtfähigkeit', noAbility: 'nur Personen ohne Nachtfähigkeit' };
const TRAP_TXT = { first: 'trifft den ersten Besucher', all: 'trifft alle Besucher', wolves: 'trifft nur Werwölfe', nonWolves: 'trifft alle außer Werwölfen' };
/** Name eines eigenen Gegenstands (ohne Import des Speichers: über die registrierte Regelquelle). */
export const itemName = (iid) => RM[`it_${iid}`]?.name ?? 'Gegenstand';
export const asText = (b) => ({ village: 'Dorfbewohner', wolf: 'Werwolf', role: roleName(b.role), random: 'zufällige Rolle' }[b.as] ?? '');
export const effectText = (b) => PHRASE[b.k].replace('{t}', targetText(b) || (b.k === 'strike' ? 'niemanden' : 'sich')).replace('{a}', asText(b)).replace('{i}', b.item ? `„${itemName(b.item)}“` : 'einen Gegenstand').replace('{r}', roleName(b.role)).replace('{x}', b.text || '…');
export const extrasText = (b) => [b.power > 1 ? powerText(b) : '', b.k === 'trap' ? `${TRAP_TXT[b.trapWho]}, ${b.trapArm === 'now' ? 'sofort scharf' : 'ab der nächsten Nacht scharf'}` : '', b.k === 'frame' ? `${b.nights} ${b.nights === 1 ? 'Nacht' : 'Nächte'}` : '', b.keep != null ? (b.keep ? 'behält die alte Fähigkeit' : 'verliert die alte Fähigkeit') : '', b.mult != null ? (b.mult === 0 ? 'Stimme gestrichen' : b.mult === 0.5 ? 'Stimme zählt halb' : `Stimme zählt ${b.mult}×`) : '', b.even ? 'nur jeden zweiten Tag' : '', b.plus ? `${b.plus} Strafstimmen` : '', b.k === 'appear' && b.scope !== 'checks' ? (b.scope === 'death' ? 'nur beim Tod' : 'auch beim Tod') : '', WHO_TXT[b.who] ?? '', b.once ? 'jede Person nur einmal im Spiel' : '', b.limit ? `höchstens ${b.limit}×` : '', b.chance < 100 ? `gelingt zu ${b.chance} %` : '', b.rep ? 'nie zweimal hintereinander dieselbe Person' : '', b.visit && b.k !== 'visit' ? 'zählt als Besuch' : ''].filter(Boolean).join(', ');

/** Klartext einer Regel: „Ab der zweiten Nacht: tötet eine andere Person, wenn … (höchstens 2×). Danach …“ */
export function describeRule(b) {
  const c = condCount(b.if) ? `, wenn ${condText(b.if)}` : '';
  const x = extrasText(b);
  const t = (b.then ?? []).map((n) => THENS[n.k]?.text(n)).filter(Boolean);
  return `${whenText(b)}: ${effectText(b)}${c}${x ? ` (${x})` : ''}.${t.length ? ` Danach ${t.join(' und ')}.` : ''}`;
}

/* ---------- Bereinigen ---------- */
export function sanitizeCond(c, depth = 1) {
  if (!c || typeof c !== 'object') return null;
  if (c.all || c.any) {
    if (depth > MAX_DEPTH) return null;
    const list = (Array.isArray(c.all ?? c.any) ? c.all ?? c.any : []).map((x) => sanitizeCond(x, depth + 1)).filter(Boolean).slice(0, 8);
    return c.any ? { any: list } : { all: list };
  }
  const C = CONDS[c.k];
  if (!C) return null;
  const out = { k: c.k };
  if (C.arg === 'n') out.n = Math.max(C.min, Math.min(C.max, Math.round(+c.n) || C.def));
  if (C.arg === 'role') out.role = typeof c.role === 'string' && c.role ? c.role : 'seer';
  if (C.arg === 'item') out.item = typeof c.item === 'string' ? c.item : '';
  return out;
}
export const sanitizeThen = (list) => (Array.isArray(list) ? list : []).filter((t) => t && THENS[t.k]).slice(0, 3).map((t) => (t.k === 'note' ? { k: 'note', text: String(t.text ?? '').slice(0, 200) } : { k: t.k }));

/* ---------- Vorlagen ---------- */
/** Gegenstands-Vorlagen. Rollen-Vorlagen mit needItems legen den Gegenstand bei Bedarf mit an. */
export const ITEM_TEMPLATES = [
  { key: 'armor', name: 'Rüstung', icon: '🛡️', charges: 1, rules: [{ k: 'survive', on: 'attacked' }] },
  { key: 'poison', name: 'Gift', icon: '🧪', charges: 1, bad: true, hidden: true, rules: [{ k: 'dieSelf', on: 'dawn', power: 2, chance: 50 }] },
  { key: 'amulet', name: 'Fluch-Amulett', icon: '🧿', bad: true, hidden: true, rules: [{ k: 'strike', on: 'attacked', tgt: 'attacker', power: 2 }] },
  { key: 'crystal', name: 'Kristallkugel', icon: '🔮', charges: 3, rules: [{ k: 'peek', n: 1, when: 'every' }] },
  { key: 'bell', name: 'Glocke', icon: '🔔', charges: 1, rules: [{ k: 'shield', on: 'visited' }] },
];
const R = (k, o = {}) => ({ k, n: 1, when: 'every', limit: 0, self: false, rep: false, role: 'villager', chance: 100, ...o });
export const CUSTOM_TEMPLATES = [
  { key: 'smith', name: 'Schmied', sub: 'Verteilt zweimal eine Rüstung', icon: '🪓', rules: [R('giveItem', { limit: 2, item: '@armor' })], needItems: ['armor'] },
  { key: 'mayor', name: 'Bürgermeister', sub: 'Starke Stimme, entscheidet Gleichstände', icon: '⚖️', rules: [R('selfVote', { on: 'always', mult: 2 }), R('tieBreak', { on: 'always' })] },
  { key: 'lawyer', name: 'Anwalt', sub: 'Bewahrt einmal jemanden vor dem Galgen', icon: '📜', rules: [R('voteShield', { limit: 1 }), R('secretVote', { on: 'always' })] },
  { key: 'herald', name: 'Herold', sub: 'Deckt einmal eine Rolle auf, dann keine Abstimmung', icon: '🔔', rules: [R('reveal', { limit: 1 }), R('noVote', { limit: 1 })] },
  { key: 'cursed', name: 'Verfluchter', sub: 'Wird vom Wolfsbiss zum Werwolf', icon: '🌕', rules: [R('becomeWolf', { on: 'attacked', keep: false, limit: 1, if: { all: [{ k: 'attackerWolf' }] } })] },
  { key: 'amnesiac', name: 'Vergessliche', sub: 'Übernimmt einmal die Rolle eines Toten', icon: '🕯️', rules: [R('copyDead', { when: 'later', limit: 1 })] },
  { key: 'apprentice', name: 'Lehrling', sub: 'Folgt seinem Meister nach', icon: '📜', rules: [R('bind', { when: 'first', limit: 1 }), R('takeRole', { on: 'boundDies' })] },
  { key: 'turncoat', name: 'Überläufer', sub: 'Prüft und läuft nach 3 Einsätzen über', icon: '🐍', rules: [R('peek'), R('turnSelf', { on: 'dawn', limit: 1, keep: true, if: { all: [{ k: 'usedGte', n: 3 }] } })] },
  { key: 'framer', name: 'Intrigant', sub: 'Lässt Unschuldige verdächtig wirken', icon: '🎭', rules: [R('frame', { as: 'wolf', nights: 1 })] },
  { key: 'maskwolf', name: 'Maskenwolf', sub: 'Wolf, der bei Prüfungen als Dorfbewohner gilt', icon: '🐺', camp: 'wolf', rules: [R('appear', { on: 'always', as: 'village', scope: 'both' })] },
  { key: 'detective', name: 'Detektiv', sub: 'Vergleicht zwei Verdächtige', icon: '🔍', rules: [R('same'), R('whomVisited', { when: 'later' })] },
  { key: 'mattress', name: 'Dorfmatratze', sub: 'Übernachtet jede Nacht woanders', icon: '🌙', rules: [R('visit', { rep: true }), R('survive', { on: 'attacked', if: { all: [{ k: 'away' }] } }), R('dieSelf', { on: 'hostDies' })] },
  { key: 'shadow', name: 'Schattenwache', sub: 'Beobachtet und lernt daraus', icon: '🦉', rules: [R('watch'), R('shield', { on: 'targetAttacked' })] },
  { key: 'trapper', name: 'Fallensteller', sub: 'Fallen für nächtliche Besucher', icon: '🪤', rules: [R('trap', { trapWho: 'first', trapArm: 'next', rep: true })] },
  { key: 'decoy', name: 'Lockvogel', sub: 'Zieht Angriffe auf sich', icon: '🎯', rules: [R('decoy', { rep: true }), R('survive', { on: 'attacked', limit: 1 })] },
  { key: 'bodyguard', name: 'Leibwächter', sub: 'Stirbt für seinen Schützling', icon: '🛡️', rules: [R('guard', { rep: true })] },
  { key: 'veteran', name: 'Veteran', sub: 'Dreimal wachsam', icon: '🪓', rules: [R('alert', { limit: 3, self: true })] },
  { key: 'cult', name: 'Sektenführer', sub: 'Wirbt jede Nacht an', icon: '🕯️', rules: [R('recruit')], win: 'cult' },
  { key: 'jester', name: 'Narr', sub: 'Will hingerichtet werden', icon: '🎭', rules: [], win: 'executed' },
  { key: 'gunner', name: 'Schütze', sub: 'Ein Schuss am Tag', icon: '🏹', rules: [R('shoot', { limit: 1 })] },
  { key: 'jailor', name: 'Kerkermeister', sub: 'Sperrt ein, richtet einmal hin', icon: '🗝️', rules: [R('jail'), R('jailkill', { limit: 1 })] },
  { key: 'doctor', name: 'Doktor', sub: 'Holt einmal jemanden zurück', icon: '🧪', rules: [R('revive', { when: 'later', limit: 1, chance: 50 })] },
  { key: 'spy', name: 'Spion', sub: 'Sieht, wer wen besucht', icon: '👁️', rules: [R('watch')] },
  { key: 'avenger', name: 'Rächer', sub: 'Zäh und nimmt jemanden mit', icon: '🗡️', rules: [], passives: ['hardy', 'revenge'] },
  { key: 'watchman', name: 'Nachtwächter', sub: 'Schützt, ab Nacht 3 auch prüfen', icon: '🔔', rules: [R('protect', { rep: true }), R('peek', { if: { all: [{ k: 'nightGte', n: 3 }] } })] },
];
