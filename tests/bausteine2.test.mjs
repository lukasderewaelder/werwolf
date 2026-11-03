import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, apply, nightSteps, alive, dayBlocks, setRandom } from '../src/engine/game.js';
import { RM, customBlocks } from '../src/engine/roles.js';

function mk(roleList, custom) {
  const counts = {};
  for (const r of roleList) counts[r] = (counts[r] || 0) + 1;
  const players = roleList.map((_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
  const g = createGame({ players, counts, mode: 'digital', custom: [{ id: 'c1', name: 'Sonder', camp: 'village', ...custom }] });
  g.roles = Object.fromEntries(players.map((p, i) => [p.id, roleList[i]])); g.middle = [];
  return g;
}
const goKey = (g, key) => { const i = nightSteps(g).findIndex((s) => s.key === key); assert.ok(i >= 0, `Schritt ${key} fehlt`); return apply(g, { t: 'goto', idx: i }); };
const tap = (g, ...ids) => ids.reduce((x, id) => apply(x, { t: 'tap', pid: id }), g);
const finishNight = (g) => { let x = g; for (let i = 0; i < 60 && x.phase === 'night'; i++) x = apply(x, { t: 'next' }); return x; };
const rest = (g) => apply(apply(g, { t: 'skip-captain' }), { t: 'day-none' });
const V = (n) => Array(n).fill('villager');
const blk = (k, o = {}) => ({ k, n: 1, when: 'every', limit: 0, self: false, rep: false, role: 'villager', chance: 100, ...o });

test('Leibwächter: stirbt anstelle des Schützlings', () => {
  let g = mk(['wolf', 'c1', ...V(4)], { blocks: [blk('guard')] });
  g = goKey(g, 'c1'); g = tap(g, 'p3');
  g = goKey(g, 'wolf'); g = tap(g, 'p3');
  g = finishNight(g);
  assert.ok(alive(g, 'p3'), 'Schützling lebt');
  assert.ok(!alive(g, 'p2'), 'Leibwächter stirbt');
  assert.equal(g.dead.p2.cause, 'guard');
});

test('Sieg bei Tod: jederzeit und nur durch die Wölfe', () => {
  let g = mk(['wolf', 'c1', ...V(3)], { win: 'dies' });
  g = apply(finishNight(g), { t: 'skip-captain' }); g = apply(g, { t: 'manual-kill', pid: 'p2' });
  assert.equal(g.phase, 'ended'); assert.match(g.winner, /^Sonder P2$/);
  let k = mk(['wolf', 'c1', ...V(3)], { win: 'killed' });
  k = apply(finishNight(k), { t: 'skip-captain' }); k = apply(k, { t: 'manual-kill', pid: 'p2' });
  assert.notEqual(k.phase, 'ended', 'Spielleiter-Entfernung zählt nicht');
  let w = mk(['wolf', 'c1', ...V(3)], { win: 'killed' });
  w = goKey(w, 'wolf'); w = tap(w, 'p2'); w = finishNight(w);
  assert.equal(w.phase, 'ended'); assert.match(w.winner, /^Sonder P2$/);
});

test('Chance: die App würfelt, Fehlschlag verbraucht die Fähigkeit', () => {
  const play = (roll) => {
    setRandom(() => roll);
    let g = mk(['wolf', 'c1', ...V(4)], { blocks: [blk('kill', { chance: 50, limit: 1 })] });
    g = goKey(g, 'c1'); g = tap(g, 'p3'); g = finishNight(g);
    setRandom();
    return g;
  };
  const miss = play(0.9), hit = play(0.1);
  assert.ok(alive(miss, 'p3')); assert.ok(miss.morning.some((t) => /nicht gewirkt/.test(t)));
  assert.equal(miss.cuse.c1, 1);
  assert.ok(!alive(hit, 'p3'));
});

test('Sekte: Anwerben und Sieg, wenn alle Lebenden dazugehören', () => {
  let g = mk(['wolf', 'c1', ...V(3)], { win: 'cult', blocks: [blk('recruit')] });
  assert.equal(RM.c1.camp, 'village');
  g = goKey(g, 'c1'); g = tap(g, 'p3'); g = finishNight(g);
  assert.equal(g.cult.p3, 'c1');
  g = apply(g, { t: 'skip-captain' });
  g = apply(g, { t: 'manual-kill', pid: 'p1' });
  assert.equal(g.phase, 'day', 'p4 und p5 gehören noch nicht dazu');
  g = apply(g, { t: 'manual-kill', pid: 'p4' });
  g = apply(g, { t: 'manual-kill', pid: 'p5' });
  assert.equal(g.phase, 'ended'); assert.match(g.winner, /Sonder P2 mit der Sekte/);
});

test('Beobachter meldet die Besucher, Veteran tötet sie', () => {
  let g = mk(['wolf', 'c1', 'seer', ...V(3)], { blocks: [blk('watch')] });
  g = goKey(g, 'c1'); g = tap(g, 'p3');
  g = goKey(g, 'seer'); g = tap(g, 'p3');
  g = finishNight(g);
  assert.ok(g.morning.some((t) => /P3 wurde besucht von: P1/.test(t) === false && /P3 wurde besucht von/.test(t)), 'Seherin ist der Besucher');
  const v = g.morning.find((t) => /wurde besucht von/.test(t));
  assert.match(v, /P3\b/);
  let a = mk(['wolf', 'c1', 'seer', ...V(3)], { blocks: [blk('alert', { limit: 3 })] });
  assert.equal(RM.c1.blocks[0].self, true);
  a = goKey(a, 'c1'); a = tap(a, 'p4');
  assert.deepEqual(a.draft.cust.c1 ?? [], [], 'nur die eigene Person');
  a = tap(a, 'p2');
  a = goKey(a, 'seer'); a = tap(a, 'p2');
  a = goKey(a, 'wolf'); a = tap(a, 'p2');
  a = finishNight(a);
  assert.ok(alive(a, 'p2'), 'wachsam: unangreifbar');
  assert.ok(!alive(a, 'p1') && !alive(a, 'p3'), 'Wolf und Seherin als Besucher sterben');
});

test('Tagfähigkeiten: Schuss, Einsperren und Hinrichten', () => {
  let g = mk(['wolf', 'c1', ...V(4)], { blocks: [blk('shoot', { limit: 1 })] });
  assert.deepEqual(nightSteps(g).filter((s) => s.role === 'c1'), [], 'kein Nachtschritt');
  g = apply(finishNight(g), { t: 'skip-captain' });
  assert.equal(dayBlocks(g).length, 1);
  g = apply(g, { t: 'day-cust', key: 'c1', pid: 'p2' });
  assert.ok(alive(g, 'p2'), 'sich selbst nicht');
  g = apply(g, { t: 'day-cust', key: 'c1', pid: 'p1' });
  assert.ok(!alive(g, 'p1')); assert.equal(g.phase, 'ended', 'letzter Wolf erschossen');
  assert.equal(dayBlocks(g).length, 0);

  let j = mk(['wolf', 'c1', 'seer', ...V(3)], { blocks: [blk('jail')] });
  j = apply(finishNight(j), { t: 'skip-captain' });
  j = apply(j, { t: 'day-cust', key: 'c1', pid: 'p3' });
  j = apply(j, { t: 'day-none' });
  assert.ok(!nightSteps(j).some((s) => s.role === 'seer' && s.act), 'Eingesperrte handelt nicht');
  j = goKey(j, 'wolf'); j = tap(j, 'p3'); j = finishNight(j);
  assert.ok(alive(j, 'p3'), 'geschützt im Kerker');

  let k = mk(['wolf', 'c1', ...V(4)], { blocks: [blk('jailkill')] });
  k = apply(finishNight(k), { t: 'skip-captain' });
  k = apply(k, { t: 'day-cust', key: 'c1', pid: 'p4' });
  k = apply(k, { t: 'day-none' });
  k = finishNight(k);
  assert.ok(!alive(k, 'p4'), 'hingerichtet');
});

test('Bausteine: neue Felder werden bereinigt', () => {
  const b = customBlocks({ blocks: [{ k: 'alert', chance: 33 }, { k: 'kill', chance: 50 }, { k: 'shoot' }] });
  assert.deepEqual(b.map((x) => [x.k, x.chance, x.self]), [['alert', 100, true], ['kill', 50, false], ['shoot', 100, false]]);
});
