import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, apply, nightSteps, alive, infoNow, holders, isWolf } from '../src/engine/game.js';
import { RM } from '../src/engine/roles.js';

function mk(roleList, custom) {
  const counts = {};
  for (const r of roleList) counts[r] = (counts[r] || 0) + 1;
  const players = roleList.map((_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
  const g = createGame({ players, counts, mode: 'digital', custom: [{ id: 'c1', name: 'Sonder', camp: 'village', ...custom }] });
  g.roles = Object.fromEntries(players.map((p, i) => [p.id, roleList[i]])); g.middle = []; g.granted = {}; g.second = {};
  return g;
}
const go = (g, key) => { const i = nightSteps(g).findIndex((s) => s.key === key || s.keys?.includes(key)); assert.ok(i >= 0, `Schritt ${key} fehlt`); const x = apply(g, { t: 'goto', idx: i }); return nightSteps(x)[i].keys ? apply(x, { t: 'rule-sel', key }) : x; };
const tap = (g, ...ids) => ids.reduce((x, id) => apply(x, { t: 'tap', pid: id }), g);
const finish = (g) => { let x = g; for (let i = 0; i < 60 && x.phase === 'night'; i++) x = apply(x, { t: 'next' }); return x; };
const rest = (g) => apply(apply(g, { t: 'skip-captain' }), { t: 'day-none' });
const V = (n) => Array(n).fill('villager');
const R = (k, o = {}) => ({ k, n: 1, when: 'every', limit: 0, self: false, rep: false, role: 'villager', chance: 100, ...o });

test('Fähigkeit umlenken: Wölfe treffen eine andere Person, Heiler schützt eine andere', () => {
  let g = mk(['wolf', 'c1', 'guard', ...V(3)], { rules: [R('redirectAbility')] });
  g = go(g, 'c1'); g = tap(g, 'p1', 'p5');
  g = go(g, 'guard'); g = tap(g, 'p4');
  g = go(g, 'wolf'); g = tap(g, 'p4');
  g = finish(g);
  assert.ok(alive(g, 'p4') && !alive(g, 'p5'), 'Wolfsangriff umgelenkt auf P5');
  let h = mk(['wolf', 'c1', 'guard', ...V(3)], { rules: [R('redirectAbility')] });
  h = go(h, 'c1'); h = tap(h, 'p3', 'p6');
  h = go(h, 'guard'); h = tap(h, 'p4');
  h = go(h, 'wolf'); h = tap(h, 'p4');
  h = finish(h);
  assert.ok(!alive(h, 'p4'), 'Heiler schützt jetzt P6 statt P4');
});

test('Fähigkeit umlenken: Auskunft eigener Rolle zeigt das neue Ziel', () => {
  let g = createGame({ players: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].map((id) => ({ id, name: id.toUpperCase() })), counts: { wolf: 1, c1: 1, c2: 1, villager: 3 }, mode: 'digital',
    custom: [{ id: 'c1', name: 'Gaukler', rules: [R('redirectAbility')] }, { id: 'c2', name: 'Späher', rules: [R('party')] }] });
  g.roles = { p1: 'wolf', p2: 'c1', p3: 'c2', p4: 'villager', p5: 'villager', p6: 'villager' };
  g = go(g, 'c1'); g = tap(g, 'p3', 'p1');
  const r = infoNow(g, RM.c2.blocks[0], ['p4'], 'p3');
  assert.match(r.say, /^Umgelenkt auf P1: P1: Werwölfe/);
});

test('Zweitrolle: geweckt für beide Rollen, Sieg nach der Hauptrolle', () => {
  let g = mk(['wolf', 'c1', ...V(4)], { rules: [R('secondRole', { role: 'seer', limit: 1 })] });
  g = go(g, 'c1'); g = tap(g, 'p4'); g = finish(g);
  assert.equal(g.second.p4, 'seer');
  g = rest(g);
  assert.deepEqual(holders(g, 'seer').map((p) => p.id), ['p4']);
  assert.ok(nightSteps(g).some((s) => s.role === 'seer' && s.act === 'check'), 'Seherin-Schritt für P4');
  assert.equal(isWolf(g, 'p4'), false);
  let w = mk(['wolf', 'c1', ...V(4)], { rules: [R('secondRole', { role: 'wolf' })] });
  w = go(w, 'c1'); w = tap(w, 'p4'); w = finish(w);
  assert.equal(w.second.p4, undefined, 'keine Werwolf-Zweitrolle');
});

test('Zweitrolle zu Beginn über die Rolle', () => {
  let g = mk(['wolf', 'c1', ...V(4)], { rules: [R('startSecond', { on: 'always', role: 'witch' })] });
  g = finish(g);
  assert.equal(g.second.p2, 'witch');
});

test('Mitnehmen mit Schutz: Schild und „überlebt“ wehren ab, unaufhaltbar nicht', () => {
  const play = (power, setup) => {
    let g = mk(['wolf', 'c1', 'c1', ...V(3)], { rules: [R('bind', { when: 'first', limit: 1 }), R('strike', { on: 'death', tgt: 'bound', power })] });
    g = go(g, 'c1'); g = tap(g, 'p5'); g = finish(g);
    setup?.(g);
    g = apply(g, { t: 'skip-captain' }); g = apply(g, { t: 'manual-kill', pid: 'p2' });
    return alive(g, 'p5');
  };
  assert.equal(play(1), false, 'ohne Schutz mitgenommen');
  assert.equal(play(1, (g) => { g.shields.p5 = 1; }), true, 'Schild wehrt ab');
  assert.equal(play(3, (g) => { g.shields.p5 = 1; }), false, 'unaufhaltbar');
});
