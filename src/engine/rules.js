// Regeln eigener Rollen: Bedingungen (Wenn), Nebenwirkungen (Danach), Klartext und Vorlagen.
// Die Wirkungen selbst stehen in BLOCKS (roles.js); eine Regel ist ein Baustein mit Bedingungsbaum.
import { BLOCKS, roleName } from './roles.js';

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
};
export const COND_GROUPS = [['Zeit und Verlauf', ['nightGte', 'deathLast', 'noDeathLast', 'used', 'unused']], ['Andere Rollen', ['roleAlive', 'roleDead', 'wolvesGte']], ['Spielstand', ['aliveGte', 'aliveLte', 'boundAlive', 'boundDead']]];
export const MAX_DEPTH = 3;

/** Nebenwirkungen nach erfolgreichem Einsatz. */
export const THENS = {
  note: { name: 'Spielleiter-Hinweis', hint: 'Die App erinnert dich mit deinem Text.', text: (t) => `Hinweis an dich: „${t.text || '…'}“` },
  selfBlock: { name: 'Eigene Fähigkeit ruht eine Nacht', hint: 'In der nächsten Nacht wird die Rolle nicht aufgerufen.', text: () => 'in der nächsten Nacht ruht die eigene Fähigkeit' },
  selfDie: { name: 'Stirbt danach selbst', hint: 'Der Einsatz kostet das eigene Leben.', text: () => 'stirbt die Rolle selbst' },
};

/** Gruppen und Erklärungen der Wirkungen für den Katalog im Editor. */
export const EFFECT_GROUPS = [
  ['Schützen', ['protect', 'guard', 'alert']],
  ['Wissen', ['peek', 'peekrole', 'watch']],
  ['Angreifen', ['kill', 'shoot', 'jailkill']],
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
};
/** Satzbaustein der Wirkung; {t} = Ziel. */
export const PHRASE = {
  kill: 'tötet {t}', protect: 'schützt {t} vor den Wölfen', mark: 'markiert {t}', peek: 'prüft, ob {t} ein Werwolf ist', peekrole: 'erfährt die Rolle von {t}',
  silence: 'schaltet {t} stumm', block: 'sperrt die Fähigkeit von {t}', swap: 'lässt {t} die Rollen tauschen', love: 'verliebt {t}', turn: 'macht {t} heimlich zum Werwolf',
  convert: 'verwandelt {t} in {r}', revive: 'belebt {t} wieder', bind: 'legt {t} als Ziel fest', guard: 'bewacht {t} und stirbt notfalls an ihrer Stelle', recruit: 'nimmt {t} in die Sekte auf',
  watch: 'beobachtet, wer {t} besucht', alert: 'ist wachsam', shoot: 'erschießt {t}', jail: 'sperrt {t} ein', jailkill: 'sperrt {t} ein und richtet sie in der Nacht hin', note: 'erinnert dich: „{x}“',
};
const WHEN_TXT = { night: { every: 'Jede Nacht', first: 'In der ersten Nacht', later: 'Ab der zweiten Nacht', even: 'Jede zweite Nacht' }, day: { every: 'Jeden Tag', first: 'Am ersten Tag', later: 'Ab dem zweiten Tag', even: 'Jeden zweiten Tag' } };

export function targetText(b) {
  const B = BLOCKS[b.k];
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
export const whenText = (b) => WHEN_TXT[BLOCKS[b.k].day ? 'day' : 'night'][b.when] ?? '';
export const effectText = (b) => PHRASE[b.k].replace('{t}', targetText(b) || 'sich').replace('{r}', roleName(b.role)).replace('{x}', b.text || '…');
export const extrasText = (b) => [b.limit ? `höchstens ${b.limit}×` : '', b.chance < 100 ? `gelingt zu ${b.chance} %` : '', b.rep ? 'nie zweimal hintereinander dieselbe Person' : '', b.visit ? 'zählt als Besuch' : ''].filter(Boolean).join(', ');

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
  return out;
}
export const sanitizeThen = (list) => (Array.isArray(list) ? list : []).filter((t) => t && THENS[t.k]).slice(0, 3).map((t) => (t.k === 'note' ? { k: 'note', text: String(t.text ?? '').slice(0, 200) } : { k: t.k }));

/* ---------- Vorlagen ---------- */
const R = (k, o = {}) => ({ k, n: 1, when: 'every', limit: 0, self: false, rep: false, role: 'villager', chance: 100, ...o });
export const CUSTOM_TEMPLATES = [
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
