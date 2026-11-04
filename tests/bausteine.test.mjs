import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, apply, nightSteps, alive, openDecision, eligibleVoters, looksWolf, isWolf } from '../src/engine/game.js';
import { RM } from '../src/engine/roles.js';

/** Digitalspiel mit festen Rollen und einer eigenen Rolle `c1` aus Bausteinen. */
function mk(roleList, custom) {
  const counts = {};
  for (const r of roleList) counts[r] = (counts[r] || 0) + 1;
  const players = roleList.map((_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
  const g = createGame({ players, counts, mode: 'digital', custom: [{ id: 'c1', name: 'Nachtwächter', camp: 'village', ...custom }] });
  g.roles = Object.fromEntries(players.map((p, i) => [p.id, roleList[i]])); g.middle = [];
  return g;
}
const goKey = (g, key) => { const i = nightSteps(g).findIndex((s) => s.key === key || s.keys?.includes(key)); assert.ok(i >= 0, `Schritt ${key} fehlt`); const x = apply(g, { t: 'goto', idx: i }); return nightSteps(x)[i].keys ? apply(x, { t: 'rule-sel', key }) : x; };
const tap = (g, ...ids) => ids.reduce((x, id) => apply(x, { t: 'tap', pid: id }), g);
const finishNight = (g) => { let x = g; for (let i = 0; i < 60 && x.phase === 'night'; i++) x = apply(x, { t: 'next' }); return x; };
const rest = (g) => apply(apply(g, { t: 'skip-captain' }), { t: 'day-none' });
const V = (n) => Array(n).fill('villager');
const blk = (k, o = {}) => ({ k, n: 1, when: 'every', limit: 0, self: false, rep: false, role: 'villager', ...o });
const keysOf = (g) => nightSteps(g).filter((s) => s.role === 'c1').flatMap((s) => s.keys ?? [s.key]);

test('Bausteine: mehrere Aktionen einer Rolle werden eigene Schritte', () => {
  let g = mk(['wolf', 'c1', ...V(4)], { blocks: [blk('protect', { self: true }), blk('peek')] });
  assert.deepEqual(keysOf(g), ['c1', 'c1#1']);
  g = goKey(g, 'c1'); g = tap(g, 'p2');
  g = goKey(g, 'c1#1'); g = tap(g, 'p1');
  g = goKey(g, 'wolf'); g = tap(g, 'p2');
  g = finishNight(g);
  assert.ok(alive(g, 'p2'), 'Schutz wirkt');
  assert.ok(g.log.some((l) => /prüft P1: Werwolf/.test(l.t)), 'Prüfung wirkt in derselben Nacht');
});

test('Bausteine: mehrere Ziele, Selbstwahl und Wiederholungsverbot', () => {
  let g = mk(['wolf', 'c1', ...V(5)], { blocks: [blk('kill', { n: 2, rep: true })] });
  g = goKey(g, 'c1'); g = tap(g, 'p2', 'p3', 'p4', 'p5');
  assert.deepEqual(g.draft.cust.c1, ['p3', 'p4'], 'bis zu zwei, nicht selbst');
  g = finishNight(g);
  assert.ok(!alive(g, 'p3') && !alive(g, 'p4'));
  g = rest(g);
  g = goKey(g, 'c1'); g = tap(g, 'p5', 'p6');
  assert.deepEqual(g.draft.cust.c1, ['p5', 'p6']);
});

test('Bausteine: Wiederholungsverbot gilt für die Vornacht', () => {
  let g = mk(['wolf', 'c1', ...V(5)], { blocks: [blk('mark', { rep: true })] });
  g = goKey(g, 'c1'); g = tap(g, 'p3'); g = finishNight(g);
  g = rest(g);
  g = goKey(g, 'c1'); g = tap(g, 'p3');
  assert.deepEqual(g.draft.cust.c1 ?? [], [], 'dieselbe Person nicht noch einmal');
  g = tap(g, 'p4');
  assert.deepEqual(g.draft.cust.c1, ['p4']);
});

test('Bausteine: Grenzen – nur einmal, nur Nacht 1, ab Nacht 2', () => {
  let g = mk(['wolf', 'c1', ...V(5)], { blocks: [blk('mark', { limit: 1 }), blk('peek', { when: 'first' }), blk('kill', { when: 'later' })] });
  assert.deepEqual(keysOf(g), ['c1', 'c1#1']);
  g = goKey(g, 'c1'); g = tap(g, 'p3'); g = finishNight(g);
  g = rest(g);
  assert.deepEqual(keysOf(g), ['c1#2'], 'Markieren verbraucht, Prüfen nur Nacht 1');
});

test('Bausteine: Stumm schalten nimmt das Stimmrecht und meldet es morgens', () => {
  let g = mk(['wolf', 'c1', ...V(4)], { blocks: [blk('silence')] });
  g = goKey(g, 'c1'); g = tap(g, 'p4'); g = finishNight(g);
  assert.ok(g.morning.some((t) => /P4: darf heute nicht sprechen/.test(t)));
  assert.ok(!eligibleVoters(g).includes('p4'));
});

test('Bausteine: Sperren blockiert die Fähigkeit in der nächsten Nacht', () => {
  let g = mk(['wolf', 'c1', 'seer', ...V(3)], { blocks: [blk('block')] });
  g = goKey(g, 'c1'); g = tap(g, 'p3'); g = finishNight(g);
  g = rest(g);
  assert.ok(!nightSteps(g).some((s) => s.role === 'seer' && s.act), 'Seherin gesperrt');
  g = finishNight(g); g = rest(g);
  assert.ok(nightSteps(g).some((s) => s.role === 'seer' && s.act), 'danach wieder frei');
});

test('Bausteine: Tauschen, Verlieben, Verwandeln, Zum Wolf machen', () => {
  let g = mk(['wolf', 'c1', 'seer', 'villager', 'villager', 'villager'], { blocks: [blk('swap'), blk('love'), blk('convert', { role: 'hunter' }), blk('turn')] });
  g = goKey(g, 'c1'); g = tap(g, 'p3', 'p4');
  g = goKey(g, 'c1#1'); g = tap(g, 'p5', 'p6');
  g = goKey(g, 'c1#2'); g = tap(g, 'p5');
  g = goKey(g, 'c1#3'); g = tap(g, 'p6');
  g = finishNight(g);
  assert.equal(g.roles.p3, 'villager'); assert.equal(g.roles.p4, 'seer', 'getauscht');
  assert.deepEqual(g.lovers, ['p5', 'p6']);
  assert.equal(g.roles.p5, 'hunter');
  assert.equal(g.turned.p6, true);
});

test('Bausteine: Wiederbeleben wählt Gestorbene und holt sie zurück', () => {
  let g = mk(['wolf', 'c1', ...V(4)], { blocks: [blk('revive', { when: 'later' })] });
  g = goKey(g, 'wolf'); g = tap(g, 'p4'); g = finishNight(g);
  assert.ok(!alive(g, 'p4'));
  g = rest(g);
  g = goKey(g, 'c1'); g = tap(g, 'p5');
  assert.deepEqual(g.draft.cust.c1 ?? [], [], 'Lebende sind kein Ziel');
  g = tap(g, 'p4'); g = finishNight(g);
  assert.ok(alive(g, 'p4'));
  assert.ok(g.morning.some((t) => /P4 ist wieder da/.test(t)));
});

test('Bausteine: halbfertige Zweier-Auswahl wird gemeldet', () => {
  let g = mk(['wolf', 'c1', ...V(4)], { blocks: [blk('swap')] });
  g = goKey(g, 'c1');
  assert.equal(openDecision(g), null, 'ganz ohne Wahl ist es optional');
  g = tap(g, 'p3');
  assert.match(openDecision(g), /erst 1 von 2/);
});

test('Passive: übersteht den ersten Wolfsangriff, Rache, Werwolf-Anzeige', () => {
  let g = mk(['wolf', 'c1', ...V(4)], { passives: ['hardy', 'revenge', 'looksWolf'] });
  g = goKey(g, 'wolf'); g = tap(g, 'p2'); g = finishNight(g);
  assert.ok(alive(g, 'p2'), 'erster Angriff überstanden');
  assert.equal(looksWolf(g, 'p2'), true);
  assert.equal(isWolf(g, 'p2'), false, 'zählt nicht als echter Wolf');
  g = rest(g);
  g = goKey(g, 'wolf'); g = tap(g, 'p2'); g = finishNight(g);
  assert.ok(!alive(g, 'p2'), 'zweiter Angriff tötet');
  assert.equal(g.interrupts[0]?.type, 'hunter', 'Rache ist offen');
  assert.equal(g.interrupts[0].name, 'Nachtwächter');
});

test('Passive: Erbe und Bindung an das Ziel', () => {
  let g = mk(['wolf', 'c1', 'seer', ...V(3)], { heir: 'seer' });
  g = finishNight(g); g = apply(g, { t: 'skip-captain' }); g = apply(g, { t: 'manual-kill', pid: 'p3' });
  assert.equal(g.roles.p2, 'seer', 'erbt die Seherin');
  let b = mk(['wolf', 'c1', ...V(4)], { blocks: [blk('bind', { when: 'first' })], passives: ['bondDeath'] });
  b = goKey(b, 'c1'); b = tap(b, 'p4'); b = finishNight(b);
  assert.equal(b.bound.c1, 'p4');
  b = apply(b, { t: 'skip-captain' }); b = apply(b, { t: 'manual-kill', pid: 'p4' });
  assert.ok(!alive(b, 'p2'), 'stirbt mit seinem Ziel');
});

test('Sieg: Ziel lebt oder ist tot, Narr, nur nach Einsatz', () => {
  const play = (win, extra, killId) => {
    let g = mk(['wolf', 'c1', ...V(4)], { win, ...extra });
    g = goKey(g, 'c1'); g = tap(g, 'p4'); g = finishNight(g);
    g = apply(g, { t: 'skip-captain' });
    return apply(g, { t: 'manual-kill', pid: killId });
  };
  assert.match(play('bound', {}, 'p1').winner, /Das Dorf und Nachtwächter P2/);
  assert.ok(RM.c1.blocks.some((b) => b.k === 'bind'), 'Ziel-Baustein wird ergänzt');
  assert.equal(play('bound', {}, 'p4').phase, 'day', 'Ziel tot: noch kein Ende');
  assert.match(play('hunt', {}, 'p1').winner, /^Das Dorf$/, 'Ziel lebt: kein Mitsieg');
  let h = mk(['wolf', 'c1', ...V(4)], { win: 'hunt' });
  h = goKey(h, 'c1'); h = tap(h, 'p4'); h = finishNight(h);
  h = apply(h, { t: 'skip-captain' }); h = apply(h, { t: 'manual-kill', pid: 'p4' }); h = apply(h, { t: 'manual-kill', pid: 'p1' });
  assert.match(h.winner, /Das Dorf und Nachtwächter P2/, 'Ziel ausgeschieden: Mitsieg');
  let n = mk(['wolf', 'c1', ...V(3)], { win: 'executed' });
  n = finishNight(n);
  n = apply(n, { t: 'skip-captain' }); n = apply(n, { t: 'vote-mode', mode: 'direct' }); n = tap(n, 'p2'); n = apply(n, { t: 'day-execute' });
  assert.equal(n.phase, 'ended');
  assert.match(n.winner, /^Nachtwächter P2$/);
  const u = mk(['wolf', 'c1', ...V(3)], { win: 'survive', needUse: true, blocks: [blk('mark')] });
  let w = finishNight(u);
  w = apply(w, { t: 'skip-captain' }); w = apply(w, { t: 'manual-kill', pid: 'p1' });
  assert.equal(w.winner, 'Das Dorf', 'ohne Einsatz kein Mitsieg');
});

test('Bausteine: alte gespeicherte Rollen mit nur einer Aktion bleiben gültig', () => {
  const g = mk(['wolf', 'c1', ...V(3)], { cact: 'kill', wake: 'once', cself: true });
  assert.deepEqual(RM.c1.blocks.map((b) => [b.k, b.limit, b.self]), [['kill', 1, true]]);
  assert.deepEqual(keysOf(g), ['c1']);
});
