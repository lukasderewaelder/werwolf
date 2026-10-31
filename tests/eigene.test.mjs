import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, apply, nightSteps, alive, checkWinner } from '../src/engine/game.js';

/** Digitalspiel mit festen Rollen und einer eigenen Rolle `c1`. */
function mk(roleList, custom, rules = {}) {
  const counts = {};
  for (const r of roleList) counts[r] = (counts[r] || 0) + 1;
  const players = roleList.map((_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
  const g = createGame({ players, counts, mode: 'digital', rules, custom: [{ id: 'c1', name: 'Nachtwächter', camp: 'village', ...custom }] });
  g.roles = Object.fromEntries(players.map((p, i) => [p.id, roleList[i]])); g.middle = [];
  return g;
}
const goKey = (g, key) => { const i = nightSteps(g).findIndex((s) => s.key === key); assert.ok(i >= 0, `Schritt ${key} fehlt`); return apply(g, { t: 'goto', idx: i }); };
const tap = (g, ...ids) => ids.reduce((x, id) => apply(x, { t: 'tap', pid: id }), g);
const finishNight = (g) => { let x = g; for (let i = 0; i < 60 && x.phase === 'night'; i++) x = apply(x, { t: 'next' }); return x; };
const V = (n) => Array(n).fill('villager');

test('Eigene Rolle: Töten wirkt am Morgen, Selbstwahl ist gesperrt', () => {
  let g = mk(['wolf', 'c1', ...V(4)], { cact: 'kill', wake: 'every' });
  g = goKey(g, 'c1'); g = tap(g, 'p2');
  assert.equal(g.draft.cust.c1 ?? null, null, 'nicht selbst');
  g = tap(g, 'p4');
  assert.equal(g.draft.cust.c1, 'p4');
  g = finishNight(g);
  assert.ok(!alive(g, 'p4'));
  assert.equal(g.dead.p4.cause, 'custom');
});

test('Eigene Rolle: Schutz hält den Wolfsbiss ab', () => {
  let g = mk(['wolf', 'c1', ...V(4)], { cact: 'protect', wake: 'every', cself: true });
  g = goKey(g, 'c1'); g = tap(g, 'p2');
  assert.equal(g.draft.cust.c1, 'p2', 'Selbstwahl erlaubt');
  g = goKey(g, 'wolf'); g = tap(g, 'p2');
  g = finishNight(g);
  assert.ok(alive(g, 'p2'));
});

test('Eigene Rolle: Prüfen und Markieren ändern nichts, nur einmal im Spiel', () => {
  let g = mk(['wolf', 'c1', ...V(4)], { cact: 'peek', wake: 'once' });
  g = goKey(g, 'c1'); g = tap(g, 'p1');
  g = goKey(g, 'wolf'); g = tap(g, 'p5');
  g = finishNight(g);
  assert.ok(g.log.some((l) => /prüft P1: Werwolf/.test(l.t)));
  assert.equal(g.customUsed.c1, true);
  g = apply(g, { t: 'skip-captain' }); g = apply(g, { t: 'day-none' });
  assert.ok(!nightSteps(g).some((s) => s.key === 'c1' && s.act), 'zweite Nacht: Fähigkeit verbraucht');
  let m = mk(['wolf', 'c1', ...V(4)], { cact: 'mark', wake: 'every' });
  m = goKey(m, 'c1'); m = tap(m, 'p3'); m = finishNight(m);
  assert.ok(m.morning.some((t) => /P3 ist markiert/.test(t)));
});

test('Eigene Rolle: einmal wird nur beim Einsatz verbraucht', () => {
  let g = mk(['wolf', 'c1', ...V(4)], { cact: 'kill', wake: 'once' });
  g = finishNight(g);
  assert.notEqual(g.customUsed.c1, true);
  assert.ok(nightSteps(apply(apply(g, { t: 'skip-captain' }), { t: 'day-none' })).some((s) => s.key === 'c1' && s.act));
});

test('Eigene Rolle: Siegbedingung allein als Letzter', () => {
  const g = mk(['wolf', 'c1', 'villager'], { win: 'solo' });
  assert.equal(g.cfg.players.length, 3);
  g.dead = { p1: { cause: 'vote' } };
  assert.equal(checkWinner(g), null, 'Dorf gewinnt nicht, solange der Einzelgänger lebt');
  g.dead.p3 = { cause: 'vote' };
  assert.equal(checkWinner(g), 'Nachtwächter');
});

test('Eigene Rolle: Überlebender gewinnt mit dem Sieger', () => {
  let g = mk(['wolf', 'c1', ...V(3)], { win: 'survive' });
  g = finishNight(g);
  g = apply(g, { t: 'skip-captain' }); g = apply(g, { t: 'manual-kill', pid: 'p1' });
  assert.equal(g.phase, 'ended');
  assert.match(g.winner, /Das Dorf und Nachtwächter P2/);
});
