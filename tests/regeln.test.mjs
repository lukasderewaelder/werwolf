import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, apply, nightSteps, alive, evalCond, openDecision } from '../src/engine/game.js';
import { RM, customBlocks } from '../src/engine/roles.js';
import { describeRule, condText, sanitizeCond, CUSTOM_TEMPLATES } from '../src/engine/rules.js';

function mk(roleList, custom) {
  const counts = {};
  for (const r of roleList) counts[r] = (counts[r] || 0) + 1;
  const players = roleList.map((_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
  const g = createGame({ players, counts, mode: 'digital', custom: [{ id: 'c1', name: 'Wächter', camp: 'village', ...custom }] });
  g.roles = Object.fromEntries(players.map((p, i) => [p.id, roleList[i]])); g.middle = [];
  return g;
}
const step = (g) => nightSteps(g).find((s) => s.role === 'c1');
const go = (g, key) => { const i = nightSteps(g).findIndex((s) => s.key === key || s.keys?.includes(key)); const x = apply(g, { t: 'goto', idx: i }); return nightSteps(x)[i].keys ? apply(x, { t: 'rule-sel', key }) : x; };
const tap = (g, ...ids) => ids.reduce((x, id) => apply(x, { t: 'tap', pid: id }), g);
const finish = (g) => { let x = g; for (let i = 0; i < 60 && x.phase === 'night'; i++) x = apply(x, { t: 'next' }); return x; };
const rest = (g) => apply(apply(g, { t: 'skip-captain' }), { t: 'day-none' });
const V = (n) => Array(n).fill('villager');
const R = (k, o = {}) => ({ k, n: 1, when: 'every', limit: 0, self: false, rep: false, role: 'villager', chance: 100, ...o });

test('Bedingungen: alle/eine, verschachtelt, leere Gruppen gelten', () => {
  const g = mk(['wolf', 'c1', 'seer', ...V(3)], { rules: [R('mark')] });
  assert.equal(evalCond(g, 'c1', { all: [] }), true);
  assert.equal(evalCond(g, 'c1', { any: [{ k: 'nightGte', n: 2 }, { k: 'roleAlive', role: 'seer' }] }), true);
  assert.equal(evalCond(g, 'c1', { all: [{ k: 'nightGte', n: 2 }, { k: 'roleAlive', role: 'seer' }] }), false);
  assert.equal(evalCond(g, 'c1', { all: [{ k: 'aliveGte', n: 6 }, { any: [{ k: 'roleDead', role: 'seer' }, { k: 'wolvesGte', n: 1 }] }] }), true);
  assert.equal(evalCond(g, 'c1', { k: 'unused' }, 'c1'), true);
});

test('Bedingungen: steuern, ob die Fähigkeit nachts angeboten wird', () => {
  let g = mk(['wolf', 'c1', 'seer', ...V(3)], { rules: [R('mark'), R('kill', { if: { any: [{ k: 'nightGte', n: 3 }, { k: 'roleDead', role: 'seer' }] } })] });
  assert.deepEqual(step(g).keys, ['c1']);
  g = finish(g); g = apply(g, { t: 'skip-captain' }); g = apply(g, { t: 'manual-kill', pid: 'p3' }); g = apply(g, { t: 'day-none' });
  assert.deepEqual(step(g).keys, ['c1', 'c1#1'], 'Seherin tot: Töten kommt dazu');
});

test('Ein Schritt je Rolle: Auswahl der Fähigkeit, offene Zweier-Wahl wird gemeldet', () => {
  let g = mk(['wolf', 'c1', ...V(4)], { rules: [R('mark'), R('swap')] });
  assert.equal(nightSteps(g).filter((s) => s.role === 'c1').length, 1);
  g = go(g, 'c1#1');
  assert.equal(step(g).blk, 1);
  g = tap(g, 'p3');
  assert.match(openDecision(g), /Tauschen.*erst 1 von 2/);
  g = apply(g, { t: 'rule-sel', key: 'c1' }); g = tap(g, 'p4');
  assert.deepEqual([g.draft.cust.c1, g.draft.cust['c1#1']], [['p4'], ['p3']], 'Ziele je Fähigkeit getrennt');
});

test('Spielleiter-Hinweis ohne Ziel und Nebenwirkungen', () => {
  let g = mk(['wolf', 'c1', ...V(4)], { rules: [R('note', { n: 0, text: 'Darf eine Ja-Nein-Frage stellen', limit: 1 }), R('kill', { then: [{ k: 'selfDie' }, { k: 'note', text: 'Rolle aufdecken' }] })] });
  g = go(g, 'c1'); g = apply(g, { t: 'rule-self', key: 'c1' });
  g = go(g, 'c1#1'); g = tap(g, 'p4');
  g = finish(g);
  assert.ok(g.morning.some((t) => /Ja-Nein-Frage/.test(t)), 'Hinweis am Morgen');
  assert.ok(g.morning.some((t) => /Rolle aufdecken/.test(t)), 'Nebenwirkung Hinweis');
  assert.ok(!alive(g, 'p4') && !alive(g, 'p2'), 'Ziel und die Rolle selbst sterben');
  assert.equal(g.cuse.c1, 1);
});

test('Nebenwirkung: Fähigkeit ruht in der nächsten Nacht', () => {
  let g = mk(['wolf', 'c1', ...V(4)], { rules: [R('mark', { then: [{ k: 'selfBlock' }] })] });
  g = go(g, 'c1'); g = tap(g, 'p4'); g = finish(g); g = rest(g);
  assert.equal(step(g)?.act ?? null, null, 'gesperrt: nur zum Schein aufrufen');
  g = finish(g); g = rest(g);
  assert.equal(step(g)?.act, 'cust', 'danach wieder mit Aktion');
});

test('Klartext und Umrechnung', () => {
  const [b] = customBlocks({ rules: [R('kill', { when: 'later', limit: 2, chance: 50, if: { all: [{ k: 'roleAlive', role: 'seer' }, { any: [{ k: 'deathLast' }, { k: 'aliveLte', n: 6 }] }] } })] });
  assert.equal(describeRule(b), 'Ab der zweiten Nacht: tötet eine andere Person, wenn Seherin noch lebt und (in der letzten Nacht jemand starb oder höchstens 6 Spieler leben) (höchstens 2×, gelingt zu 50 %).');
  assert.equal(condText({ any: [] }), '');
  assert.equal(sanitizeCond({ all: [{ all: [{ all: [{ all: [{ k: 'deathLast' }] }] }] }] }).all[0].all[0].all.length, 0, 'höchstens 3 Ebenen');
  const legacy = mk(['wolf', 'c1', ...V(3)], { cact: 'protect', wake: 'once' });
  assert.deepEqual(RM.c1.rules.map((x) => [x.k, x.limit, x.if, x.visit]), [['protect', 1, null, false]]);
  assert.ok(step(legacy));
});

test('Vorlagen ergeben gültige Regeln mit lesbarem Text', () => {
  for (const t of CUSTOM_TEMPLATES) {
    const rules = customBlocks({ rules: t.rules, win: t.win });
    assert.equal(rules.length, t.rules.length, t.name);
    for (const r of rules) assert.match(describeRule(r), /^[A-ZÄÖÜ].+\.$/, t.name);
  }
});
