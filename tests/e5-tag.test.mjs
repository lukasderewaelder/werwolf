import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, apply, alive, tally, specialVoters, dayBlocks } from '../src/engine/game.js';
import { CUSTOM_TEMPLATES, describeRule } from '../src/engine/rules.js';
import { customBlocks } from '../src/engine/roles.js';

function mk(roleList, custom) {
  const counts = {};
  for (const r of roleList) counts[r] = (counts[r] || 0) + 1;
  const players = roleList.map((_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
  const g = createGame({ players, counts, mode: 'digital', custom: [{ id: 'c1', name: 'Sonder', camp: 'village', ...custom }] });
  g.roles = Object.fromEntries(players.map((p, i) => [p.id, roleList[i]])); g.middle = [];
  return g;
}
const finish = (g) => { let x = g; for (let i = 0; i < 60 && x.phase === 'night'; i++) x = apply(x, { t: 'next' }); return x; };
const day = (g) => apply(finish(g), { t: 'skip-captain' });
const tap = (g, ...ids) => ids.reduce((x, id) => apply(x, { t: 'tap', pid: id }), g);
const use = (g, key, pid) => { let x = apply(g, { t: 'day-arm', key }); if (pid) x = tap(x, pid); return apply(x, { t: 'day-cust', key }); };
const V = (n) => Array(n).fill('villager');
const R = (k, o = {}) => ({ k, n: 1, when: 'every', limit: 0, self: false, rep: false, role: 'villager', chance: 100, ...o });
const tpl = (key) => { const t = CUSTOM_TEMPLATES.find((x) => x.key === key); return { rules: t.rules }; };

test('Tagesfähigkeit: Fähigkeit antippen, dann Person im Kreis (statt Auswahlliste)', () => {
  let g = day(mk(['wolf', 'c1', ...V(4)], { rules: [R('votePenalty', { plus: 2 })] }));
  g = apply(g, { t: 'day-arm', key: 'c1' });
  g = tap(g, 'p4');
  assert.equal(g.draft.dayPick, 'p4');
  assert.deepEqual(g.draft.votes, {}, 'Antippen zählt keine Stimme');
  g = apply(g, { t: 'day-cust', key: 'c1' });
  assert.equal(tally(g).rows.find((r) => r.pid === 'p4').total, 2, 'Strafstimmen');
});

test('Bürgermeister: Stimme zählt doppelt, entscheidet den Gleichstand', () => {
  let g = day(mk(['wolf', 'c1', ...V(4)], tpl('mayor')));
  const sv = specialVoters(g);
  assert.equal(sv.length, 1); assert.equal(sv[0].weight, 2);
  g = apply(g, { t: 'sv-arm', key: sv[0].key }); g = tap(g, 'p4');
  g = tap(g, 'p1', 'p1');
  const t = tally(g);
  assert.ok(t.tie, 'p4 hat 2 (Bürgermeister), p1 hat 2');
  g = apply(g, { t: 'day-tie' });
  assert.deepEqual(g.draft.tieOpts.sort(), ['p1', 'p4']);
  g = tap(g, 'p5'); assert.equal(g.draft.vote, null, 'nur aus dem Gleichstand');
  g = tap(g, 'p1'); g = apply(g, { t: 'day-execute' });
  assert.ok(!alive(g, 'p1'));
});

test('Stimmgewicht des Tages: gestrichene Stimme, halbe Stimme', () => {
  let g = day(mk(['wolf', 'c1', ...V(4)], { rules: [R('voteBoost', { mult: 0 })] }));
  g = use(g, 'c1', 'p5');
  const sv = specialVoters(g).find((v) => v.pid === 'p5');
  assert.equal(sv.weight, 0);
  g = apply(g, { t: 'sv-arm', key: sv.key }); g = tap(g, 'p1');
  assert.equal(tally(g).rows.length, 0, 'zählt nicht');
});

test('Anwalt: Freispruch und geheime Zusatzstimme', () => {
  let g = day(mk(['wolf', 'c1', ...V(4)], tpl('lawyer')));
  g = use(g, 'c1', 'p4');
  const sec = specialVoters(g).find((v) => v.extra);
  assert.ok(sec, 'geheime Stimme');
  g = apply(g, { t: 'vote-mode', mode: 'direct' }); g = tap(g, 'p4'); g = apply(g, { t: 'day-execute' });
  assert.ok(alive(g, 'p4'), 'geschützt');
  assert.equal(g.phase, 'night');
  assert.ok(g.log.some((l) => /vor der Hinrichtung geschützt/.test(l.t)));
});

test('Herold: Aufdecken mit Täuschung, keine Abstimmung', () => {
  let g = createGame({ players: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].map((id) => ({ id, name: id.toUpperCase() })), counts: { wolf: 1, c1: 1, c2: 1, villager: 3 }, mode: 'digital',
    custom: [{ id: 'c1', name: 'Herold', ...tpl('herald') }, { id: 'c2', name: 'Maskenwolf', camp: 'wolf', ...tpl('maskwolf') }] });
  g.roles = { p1: 'wolf', p2: 'c1', p3: 'c2', p4: 'villager', p5: 'villager', p6: 'villager' };
  g = day(g);
  g = use(g, 'c1', 'p3');
  assert.equal(g.revealed.p3, true);
  assert.deepEqual([g.revealShow.role, g.revealShow.truth], ['villager', 'c2'], 'zeigt die Maske, Wahrheit nur für den Spielleiter');
  g = use(g, 'c1#1');
  assert.equal(g.draft.noVote, true);
  g = apply(g, { t: 'vote-mode', mode: 'direct' }); g = tap(g, 'p1'); g = apply(g, { t: 'day-execute' });
  assert.ok(alive(g, 'p1') && g.phase === 'day', 'keine Hinrichtung möglich');
  g = apply(g, { t: 'day-none' });
  assert.equal(g.phase, 'night');
});

test('Anklage und zweite Abstimmung', () => {
  let g = day(mk(['wolf', 'c1', ...V(4)], { rules: [R('accuse'), R('extraVote')] }));
  g = use(g, 'c1', 'p1');
  assert.deepEqual([g.draft.voteMode, g.draft.vote, g.draft.accused], ['direct', 'p1', 'p1']);
  g = use(g, 'c1#1');
  g = apply(g, { t: 'day-execute' });
  assert.ok(!alive(g, 'p1'));
});

test('Zweite Abstimmung nach Hinrichtung', () => {
  let g = day(mk(['wolf', 'wolf', 'c1', ...V(5)], { rules: [R('extraVote', { limit: 1 })] }));
  g = use(g, 'c1');
  g = apply(g, { t: 'vote-mode', mode: 'direct' }); g = tap(g, 'p4'); g = apply(g, { t: 'day-execute' });
  assert.equal(g.phase, 'day', 'zweite Abstimmung');
  assert.equal(g.secondVote, true);
  assert.equal(dayBlocks(g).length, 0, 'verbraucht');
});

test('Klartext E5', () => {
  assert.equal(describeRule(customBlocks(tpl('mayor'))[0]), 'Immer: hat eine starke Stimme (Stimme zählt 2×).');
});
