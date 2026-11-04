import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, apply, nightSteps, alive } from '../src/engine/game.js';
import { customBlocks } from '../src/engine/roles.js';
import { CUSTOM_TEMPLATES, describeRule } from '../src/engine/rules.js';

function mk(roleList, custom) {
  const counts = {};
  for (const r of roleList) counts[r] = (counts[r] || 0) + 1;
  const players = roleList.map((_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
  const g = createGame({ players, counts, mode: 'digital', custom: [{ id: 'c1', name: 'Sonder', camp: 'village', ...custom }] });
  g.roles = Object.fromEntries(players.map((p, i) => [p.id, roleList[i]])); g.middle = [];
  return g;
}
const go = (g, key) => { const i = nightSteps(g).findIndex((s) => s.key === key || s.keys?.includes(key)); assert.ok(i >= 0, `Schritt ${key} fehlt`); const x = apply(g, { t: 'goto', idx: i }); return nightSteps(x)[i].keys ? apply(x, { t: 'rule-sel', key }) : x; };
const tap = (g, ...ids) => ids.reduce((x, id) => apply(x, { t: 'tap', pid: id }), g);
const finish = (g) => { let x = g; for (let i = 0; i < 60 && x.phase === 'night'; i++) x = apply(x, { t: 'next' }); return x; };
const rest = (g) => apply(apply(g, { t: 'skip-captain' }), { t: 'day-none' });
const V = (n) => Array(n).fill('villager');
const R = (k, o = {}) => ({ k, n: 1, when: 'every', limit: 0, self: false, rep: false, role: 'villager', chance: 100, ...o });
const tpl = (key) => { const t = CUSTOM_TEMPLATES.find((x) => x.key === key); return { rules: t.rules, win: t.win, passives: t.passives }; };

test('Angriffsstärke gegen Schutzstärke', () => {
  const play = (power, prot) => {
    let g = createGame({ players: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].map((id) => ({ id, name: id.toUpperCase() })), counts: { wolf: 1, c1: 1, c2: 1, villager: 3 }, mode: 'digital',
      custom: [{ id: 'c1', name: 'Jäger der Nacht', rules: [R('kill', { power })] }, { id: 'c2', name: 'Wächterin', rules: [R('protect', { power: prot })] }] });
    g.roles = { p1: 'wolf', p2: 'c1', p3: 'c2', p4: 'villager', p5: 'villager', p6: 'villager' };
    g = go(g, 'c1'); g = tap(g, 'p5'); g = go(g, 'c2'); g = tap(g, 'p5');
    return alive(finish(g), 'p5');
  };
  assert.equal(play(1, 1), true, 'normal gegen normal: geschützt');
  assert.equal(play(2, 1), false, 'durchdringend gegen normal: tot');
  assert.equal(play(2, 2), true, 'durchdringend gegen stark: geschützt');
  assert.equal(play(3, 2), false, 'unaufhaltbar: tot');
});

test('Dorfmatratze: unterwegs sicher, stirbt mit dem Gastgeber', () => {
  let g = mk(['wolf', 'c1', ...V(4)], tpl('mattress'));
  g = go(g, 'c1'); g = tap(g, 'p4');
  g = go(g, 'wolf'); g = tap(g, 'p2');
  g = finish(g);
  assert.ok(alive(g, 'p2'), 'Angriff aufs eigene Haus läuft ins Leere');
  g = rest(g);
  g = go(g, 'c1'); g = tap(g, 'p5');
  g = go(g, 'wolf'); g = tap(g, 'p5');
  g = finish(g);
  assert.ok(!alive(g, 'p5') && !alive(g, 'p2'), 'Gastgeber tot, Matratze wird mit angegriffen');
  assert.match(describeRule(customBlocks(tpl('mattress'))[1]), /^Wenn sie angegriffen wird: übersteht es, wenn sie unterwegs ist/);
});

test('Dorfmatratze: Schutz rettet sie beim Mitsterben (angegriffen, nicht sofort tot)', () => {
  let g = createGame({ players: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].map((id) => ({ id, name: id.toUpperCase() })), counts: { wolf: 1, c1: 1, guard: 1, villager: 3 }, mode: 'digital', custom: [{ id: 'c1', name: 'Dorfmatratze', ...tpl('mattress') }] });
  g.roles = { p1: 'wolf', p2: 'c1', p3: 'guard', p4: 'villager', p5: 'villager', p6: 'villager' };
  g = go(g, 'guard'); g = tap(g, 'p2');
  g = go(g, 'c1'); g = tap(g, 'p4');
  g = go(g, 'wolf'); g = tap(g, 'p4');
  g = finish(g);
  assert.ok(!alive(g, 'p4') && alive(g, 'p2'));
});

test('Umlenken, Platz tauschen, Lockvogel', () => {
  let g = mk(['wolf', 'c1', ...V(4)], { rules: [R('redirect')] });
  g = go(g, 'c1'); g = tap(g, 'p3', 'p4'); g = go(g, 'wolf'); g = tap(g, 'p3'); g = finish(g);
  assert.ok(alive(g, 'p3') && !alive(g, 'p4'), 'Umlenken');
  let s = mk(['wolf', 'c1', ...V(4)], { rules: [R('swapPlace')] });
  s = go(s, 'c1'); s = tap(s, 'p3', 'p4'); s = go(s, 'wolf'); s = tap(s, 'p4'); s = finish(s);
  assert.ok(!alive(s, 'p3') && alive(s, 'p4'), 'Platz tauschen');
  let d = mk(['wolf', 'c1', ...V(4)], tpl('decoy'));
  d = go(d, 'c1'); d = tap(d, 'p4'); d = go(d, 'wolf'); d = tap(d, 'p4'); d = finish(d);
  assert.ok(alive(d, 'p4') && alive(d, 'p2'), 'Lockvogel zieht den Angriff auf sich und übersteht den ersten');
  assert.equal(d.cuse['c1#1'], 1);
});

test('Fluch trifft erst in der nächsten Nacht', () => {
  let g = mk(['wolf', 'c1', ...V(4)], { rules: [R('delayed', { limit: 1 })] });
  g = go(g, 'c1'); g = tap(g, 'p4'); g = finish(g);
  assert.ok(alive(g, 'p4'));
  g = rest(g); g = finish(g);
  assert.ok(!alive(g, 'p4'));
});

test('Falle: ab der nächsten Nacht scharf, trifft den ersten Besucher', () => {
  let g = mk(['wolf', 'c1', ...V(4)], tpl('trapper'));
  g = go(g, 'c1'); g = tap(g, 'p4');
  g = go(g, 'wolf'); g = tap(g, 'p5');
  g = finish(g);
  assert.equal(g.traps.length, 1);
  g = rest(g);
  g = go(g, 'wolf'); g = tap(g, 'p4');
  g = finish(g);
  assert.ok(!alive(g, 'p1'), 'der Wolf geht in die Falle');
  assert.equal(g.dead.p1.cause, 'trap');
  assert.equal(g.traps.length, 0, 'Falle verbraucht');
});

test('Schattenwache: Schild, wenn das beobachtete Ziel angegriffen wird', () => {
  let g = mk(['wolf', 'c1', ...V(4)], tpl('shadow'));
  g = go(g, 'c1'); g = tap(g, 'p4'); g = go(g, 'wolf'); g = tap(g, 'p4'); g = finish(g);
  assert.equal(g.shields.p2, 1);
  g = rest(g);
  g = go(g, 'wolf'); g = tap(g, 'p2'); g = finish(g);
  assert.ok(alive(g, 'p2'), 'Schild fängt den Angriff ab');
  assert.equal(g.shields.p2, 0);
});

test('Auslöser: besucht → Besucher angreifen, nur wenn Angreifer Wolf; stirbt → Ziel mitnehmen; Hinrichtung überstehen', () => {
  let v = mk(['wolf', 'c1', ...V(4)], { rules: [R('strike', { on: 'visited', tgt: 'visitors', if: { all: [{ k: 'visitedNone' }] } }), R('survive', { on: 'attacked', if: { all: [{ k: 'attackerWolf' }] }, limit: 1 })] });
  v = go(v, 'wolf'); v = tap(v, 'p2'); v = finish(v);
  assert.ok(alive(v, 'p2') && alive(v, 'p1'), 'Bedingung „niemand besucht“ verhindert den Gegenangriff; überlebt den Wolf');
  let b = mk(['wolf', 'c1', ...V(4)], { rules: [R('bind', { when: 'first', limit: 1 }), R('strike', { on: 'death', tgt: 'bound' })] });
  b = go(b, 'c1'); b = tap(b, 'p5'); b = finish(b);
  b = apply(b, { t: 'skip-captain' }); b = apply(b, { t: 'manual-kill', pid: 'p2' });
  assert.ok(!alive(b, 'p5'), 'nimmt das festgelegte Ziel mit');
  let h = mk(['wolf', 'c1', ...V(4)], { rules: [R('survive', { on: 'voted', limit: 1 })] });
  h = apply(finish(h), { t: 'skip-captain' }); h = apply(h, { t: 'vote-mode', mode: 'direct' }); h = tap(h, 'p2'); h = apply(h, { t: 'day-execute' });
  assert.ok(alive(h, 'p2') && h.phase === 'night', 'übersteht die Hinrichtung einmal');
});

test('Zielfilter: andere Partei, jede Person nur einmal', () => {
  let g = mk(['wolf', 'c1', ...V(4)], { rules: [R('peek', { who: 'otherCamp', once: true })] });
  g = go(g, 'c1'); g = tap(g, 'p4');
  assert.deepEqual(g.draft.cust.c1 ?? [], [], 'Dorfbewohner gehört zur eigenen Partei');
  g = tap(g, 'p1'); assert.deepEqual(g.draft.cust.c1, ['p1']);
  g = finish(g); g = rest(g);
  g = go(g, 'c1'); g = tap(g, 'p1');
  assert.deepEqual(g.draft.cust.c1 ?? [], [], 'schon einmal gewählt');
});

test('Ausgelöste Regeln erzeugen keinen Nachtschritt', () => {
  const g = mk(['wolf', 'c1', ...V(4)], { rules: [R('survive', { on: 'attacked' })] });
  assert.equal(nightSteps(g).some((s) => s.role === 'c1' && s.act), false);
});
