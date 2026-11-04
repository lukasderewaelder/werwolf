import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, apply, nightSteps, alive, infoNow, appearance, looksWolf, isNullified } from '../src/engine/game.js';
import { RM, customBlocks } from '../src/engine/roles.js';
import { CUSTOM_TEMPLATES, describeRule } from '../src/engine/rules.js';

function mk(roleList, ...customs) {
  const counts = {};
  for (const r of roleList) counts[r] = (counts[r] || 0) + 1;
  const players = roleList.map((_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
  const g = createGame({ players, counts, mode: 'digital', custom: customs.map((c, i) => ({ id: `c${i + 1}`, name: c.name ?? `Rolle${i + 1}`, camp: 'village', ...c })) });
  g.roles = Object.fromEntries(players.map((p, i) => [p.id, roleList[i]])); g.middle = [];
  return g;
}
const go = (g, key) => { const i = nightSteps(g).findIndex((s) => s.key === key || s.keys?.includes(key)); assert.ok(i >= 0, `Schritt ${key} fehlt`); const x = apply(g, { t: 'goto', idx: i }); return nightSteps(x)[i].keys ? apply(x, { t: 'rule-sel', key }) : x; };
const tap = (g, ...ids) => ids.reduce((x, id) => apply(x, { t: 'tap', pid: id }), g);
const finish = (g) => { let x = g; for (let i = 0; i < 60 && x.phase === 'night'; i++) x = apply(x, { t: 'next' }); return x; };
const rest = (g) => apply(apply(g, { t: 'skip-captain' }), { t: 'day-none' });
const V = (n) => Array(n).fill('villager');
const R = (k, o = {}) => ({ k, n: 1, when: 'every', limit: 0, self: false, rep: false, role: 'villager', chance: 100, ...o });

test('Auskünfte sofort: Partei, gleiche Partei, Wölfe zählen, Rolle lebt', () => {
  const g = mk(['wolf', 'c1', 'seer', ...V(3)], { rules: [R('party')] });
  const b = (k, o) => customBlocks({ rules: [R(k, o)] })[0];
  assert.equal(infoNow(g, b('party'), ['p1']).say, 'P1: Werwölfe');
  assert.match(infoNow(g, b('same'), ['p3', 'p4']).say, /^Gleiche Partei/);
  assert.equal(infoNow(g, b('count', { n: 3 }), ['p1', 'p3', 'p4']).say, '1 Werwolf');
  assert.equal(infoNow(g, b('roleAlive', { role: 'seer' }), []).say, 'Seherin lebt noch');
  assert.match(infoNow(g, b('roleIn', { role: 'witch' }), []).say, /nicht im Spiel/);
  const three = infoNow(g, b('threeRoles'), ['p3']).say;
  assert.match(three, /Seherin/); assert.equal(three.split(',').length, 3);
});

test('Maskenwolf: erscheint als Dorfbewohner, Wahrheit klein, Totenmaske', () => {
  const t = CUSTOM_TEMPLATES.find((x) => x.key === 'maskwolf');
  let g = mk(['wolf', 'c1', 'seer', ...V(3)], { name: 'Maskenwolf', camp: 'wolf', rules: t.rules });
  assert.equal(RM.c1.camp, 'wolf');
  assert.equal(looksWolf(g, 'p2'), false);
  const r = infoNow(g, customBlocks({ rules: [R('peek')] })[0], ['p2']);
  assert.match(r.say, /kein Werwolf/); assert.match(r.truth, /Werwolf \(nicken\)/);
  assert.equal(appearance(g, 'p2', { death: true }).role, 'villager');
});

test('Verfälschen wirkt sofort im selben Nachtablauf und hält die eingestellten Nächte', () => {
  let g = mk(['wolf', 'c1', 'c2', ...V(3)], { rules: [R('frame', { as: 'wolf', nights: 1 })] }, { rules: [R('peek')] });
  g = go(g, 'c1'); g = tap(g, 'p4');
  assert.equal(looksWolf(g, 'p4'), true, 'sofort');
  g = finish(g);
  assert.equal(g.frames.p4.until, 1);
  g = rest(g);
  assert.equal(looksWolf(g, 'p4'), false, 'nach einer Nacht vorbei');
});

test('Wirkungslos: Heiler schützt nicht, eigene Rolle wirkt nicht, Auskunft sagt Bescheid', () => {
  let g = mk(['wolf', 'c1', 'guard', 'c2', ...V(2)], { rules: [R('nullify')] }, { rules: [R('kill'), R('party')] });
  g = go(g, 'c1'); g = tap(g, 'p3', 'p4');
  assert.deepEqual(g.draft.cust.c1, ['p4'], 'eine Person');
  g = tap(g, 'p3');
  g = go(g, 'guard'); g = tap(g, 'p5');
  g = go(g, 'wolf'); g = tap(g, 'p5');
  g = finish(g);
  assert.ok(!alive(g, 'p5'), 'Heiler wirkungslos');
  let h = mk(['wolf', 'c1', 'c2', ...V(3)], { rules: [R('nullify')] }, { rules: [R('kill'), R('party')] });
  h = go(h, 'c1'); h = tap(h, 'p3');
  assert.equal(isNullified(h, 'p3'), true);
  assert.match(infoNow(h, RM.c2.blocks[1], ['p1'], 'p3').say, /Wirkungslos/);
  h = go(h, 'c2'); h = tap(h, 'p5');
  h = finish(h);
  assert.ok(alive(h, 'p5'), 'Angriff der wirkungslosen Rolle verpufft');
});

test('Auskünfte am Morgen: wen besucht, wer angegriffen, geschützt, eigener Angreifer', () => {
  let g = mk(['wolf', 'c1', 'guard', ...V(3)], { rules: [R('whomVisited'), R('attackedAll', { n: 0 }), R('wasProtected'), R('myAttacker')] });
  g = go(g, 'c1'); g = tap(g, 'p1');
  g = go(g, 'c1#1'); g = apply(g, { t: 'rule-self', key: 'c1#1' });
  g = go(g, 'c1#2'); g = tap(g, 'p4');
  g = go(g, 'c1#3'); g = apply(g, { t: 'rule-self', key: 'c1#3' });
  g = go(g, 'guard'); g = tap(g, 'p4');
  g = go(g, 'wolf'); g = tap(g, 'p4');
  g = finish(g);
  const m = g.morning.join(' | ');
  assert.match(m, /P1 besuchte: P4/);
  assert.match(m, /Heute angegriffen: P4/);
  assert.match(m, /P4 war geschützt/);
  assert.match(m, /Angegriffen von: niemand/);
  assert.ok(alive(g, 'p4'));
});

test('Klartext und Vorlagen E3', () => {
  for (const key of ['framer', 'maskwolf', 'detective']) {
    const t = CUSTOM_TEMPLATES.find((x) => x.key === key);
    for (const r of customBlocks({ rules: t.rules })) assert.match(describeRule(r), /^[A-ZÄÖÜ].+\.$/, key);
  }
  assert.equal(describeRule(customBlocks({ rules: [R('appear', { on: 'always', as: 'wolf', scope: 'both' })] })[0]), 'Immer: erscheint bei Prüfungen als Werwolf (auch beim Tod).');
});
