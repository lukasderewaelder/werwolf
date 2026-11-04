import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, apply, nightSteps, alive, checkWinner } from '../src/engine/game.js';
import { customBlocks } from '../src/engine/roles.js';
import { CUSTOM_TEMPLATES, describeRule } from '../src/engine/rules.js';

function mk(roleList, custom, extra = {}) {
  const counts = {};
  for (const r of roleList) counts[r] = (counts[r] || 0) + 1;
  const players = roleList.map((_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
  const g = createGame({ players, counts, mode: 'digital', ...extra, custom: [{ id: 'c1', name: 'Sonder', camp: 'village', ...custom }] });
  g.roles = Object.fromEntries(players.map((p, i) => [p.id, roleList[i]])); g.middle = [];
  g.granted = {}; g.items = {}; g.party = {};
  return g;
}
const go = (g, key) => { const i = nightSteps(g).findIndex((s) => s.key === key || s.keys?.includes(key)); assert.ok(i >= 0, `Schritt ${key} fehlt`); const x = apply(g, { t: 'goto', idx: i }); return nightSteps(x)[i].keys ? apply(x, { t: 'rule-sel', key }) : x; };
const tap = (g, ...ids) => ids.reduce((x, id) => apply(x, { t: 'tap', pid: id }), g);
const finish = (g) => { let x = g; for (let i = 0; i < 60 && x.phase === 'night'; i++) x = apply(x, { t: 'next' }); return x; };
const rest = (g) => apply(apply(g, { t: 'skip-captain' }), { t: 'day-none' });
const V = (n) => Array(n).fill('villager');
const R = (k, o = {}) => ({ k, n: 1, when: 'every', limit: 0, self: false, rep: false, role: 'villager', chance: 100, ...o });

test('Geist: nach dem Tod weiter geweckt, nur Geist-Regeln, begrenzte Nächte', () => {
  let g = mk(['wolf', 'c1', ...V(4)], { rules: [R('mark'), R('peek', { ghost: true, ghostNights: 1 })] });
  assert.deepEqual(nightSteps(g).find((s) => s.role === 'c1').keys, ['c1'], 'lebend: nur normale Regel');
  g = go(g, 'wolf'); g = tap(g, 'p2'); g = finish(g);
  assert.ok(!alive(g, 'p2'));
  g = rest(g);
  const st = nightSteps(g).find((s) => s.role === 'c1');
  assert.deepEqual(st.keys, ['c1#1']); assert.match(st.label, /^Geist: Sonder/);
  g = go(g, 'c1#1'); g = tap(g, 'p1'); g = finish(g);
  assert.ok(g.log.some((l) => /prüft P1: Werwolf/.test(l.t)));
  g = rest(g);
  assert.equal(nightSteps(g).find((s) => s.role === 'c1' && s.act), undefined, 'nach einer Nacht vorbei');
});

test('Partei: Mitglied über Rolle und Anwerben, Sieg „alle Lebenden“, blockiert Dorfsieg', () => {
  const parties = [{ id: 'bund', name: 'Bund', color: '#f0f', win: { k: 'all' }, block: true }];
  let g = mk(['wolf', 'c1', ...V(3)], { party: 'bund', rules: [R('recruit', { party: 'bund' })] }, { parties });
  g = go(g, 'c1'); g = tap(g, 'p3'); g = finish(g);
  assert.deepEqual([g.party.p2, g.party.p3], ['bund', 'bund']);
  g = apply(g, { t: 'skip-captain' });
  g = apply(g, { t: 'manual-kill', pid: 'p1' });
  assert.equal(g.phase, 'day', 'Dorf gewinnt nicht, solange der Bund lebt');
  g = apply(g, { t: 'manual-kill', pid: 'p4' }); g = apply(g, { t: 'manual-kill', pid: 'p5' });
  assert.equal(g.phase, 'ended'); assert.match(g.winner, /^Partei Bund \(P2, P3\)/);
});

test('Partei: Sieg mit n Mitgliedern, Austreiben', () => {
  const parties = [{ id: 'z', name: 'Zirkel', win: { k: 'members', n: 3 }, block: false }];
  let g = mk(['wolf', 'c1', ...V(4)], { party: 'z', rules: [R('recruit', { party: 'z', n: 2 }), R('leaveParty', { when: 'later' })] }, { parties });
  g = go(g, 'c1'); g = tap(g, 'p3', 'p4'); g = finish(g);
  assert.match(g.winner ?? '', /^Partei Zirkel/);
});

test('Alleinsiege: n getötet, Ziel selbst getötet, n Nächte überlebt', () => {
  let k = mk(['wolf', 'wolf', 'c1', ...V(5)], { rules: [R('kill')], win: 'kills', winN: 2 });
  k = go(k, 'c1'); k = tap(k, 'p4'); k = finish(k); k = rest(k);
  assert.equal(k.phase, 'night');
  k = go(k, 'c1'); k = tap(k, 'p5'); k = finish(k);
  assert.match(k.winner ?? '', /^Sonder P3/);
  const t = CUSTOM_TEMPLATES.find((x) => x.key === 'hunter3');
  let b = mk(['wolf', 'wolf', 'c1', ...V(5)], { rules: t.rules, win: t.win });
  b = go(b, 'c1'); b = tap(b, 'p6'); b = finish(b); b = rest(b);
  b = go(b, 'c1#1'); b = tap(b, 'p6'); b = finish(b);
  assert.match(b.winner ?? '', /^Sonder P3/, 'Ziel selbst erwischt');
  let n = mk(['wolf', 'wolf', 'c1', ...V(5)], { rules: [], win: 'nights', winN: 2 });
  n = finish(n); assert.equal(n.phase, 'day');
  n = rest(n); n = finish(n);
  assert.match(n.winner ?? '', /^Sonder P3/);
});

test('Alleinsieg: alle anderen tragen einen Gegenstand', () => {
  const items = [{ id: 'mal', name: 'Mal', rules: [] }];
  let g = mk(['wolf', 'c1', ...V(2)], { rules: [R('giveItem', { item: 'mal', n: 3 })], win: 'allItem', winItem: 'mal' }, { items });
  g = go(g, 'c1'); g = tap(g, 'p1', 'p3', 'p4'); g = finish(g);
  assert.match(g.winner ?? '', /^Sonder P2/);
});

test('Klartext E7', () => {
  assert.equal(describeRule(customBlocks({ rules: [R('peek', { ghost: true, ghostNights: 2 })] })[0]), 'Als Geist (2 Nächte lang), jede Nacht: prüft, ob eine andere Person ein Werwolf ist.');
  assert.equal(describeRule(customBlocks({ rules: [R('recruit')] })[0]), 'Jede Nacht: nimmt eine andere Person in die Sekte auf.');
  assert.equal(checkWinner, checkWinner);
});
