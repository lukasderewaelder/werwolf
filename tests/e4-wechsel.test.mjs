import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, apply, nightSteps, alive, isWolf } from '../src/engine/game.js';
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

test('Verfluchter: Wolfsbiss macht ihn zum Werwolf statt zu töten', () => {
  let g = mk(['wolf', 'c1', ...V(4)], tpl('cursed'));
  g = go(g, 'wolf'); g = tap(g, 'p2'); g = finish(g);
  assert.ok(alive(g, 'p2'));
  assert.equal(g.roles.p2, 'wolf');
  assert.ok(isWolf(g, 'p2'));
  assert.ok(g.morning.some((t) => /P2 ist jetzt Werwolf/.test(t)));
});

test('Vergessliche übernimmt die Rolle einer gestorbenen Person', () => {
  let g = mk(['wolf', 'c1', 'seer', ...V(3)], tpl('amnesiac'));
  g = go(g, 'wolf'); g = tap(g, 'p3'); g = finish(g); g = rest(g);
  g = go(g, 'c1'); g = tap(g, 'p3'); g = finish(g);
  assert.equal(g.roles.p2, 'seer');
});

test('Lehrling folgt dem Meister nach', () => {
  let g = mk(['wolf', 'c1', 'seer', ...V(3)], tpl('apprentice'));
  g = go(g, 'c1'); g = tap(g, 'p3'); g = finish(g);
  g = apply(g, { t: 'skip-captain' }); g = apply(g, { t: 'manual-kill', pid: 'p3' });
  assert.equal(g.roles.p2, 'seer');
});

test('Weitergeben dauerhaft, Ausleihen für eine Nacht', () => {
  let g = mk(['wolf', 'c1', ...V(4)], { rules: [R('passOn', { limit: 1 })] });
  g = go(g, 'c1'); g = tap(g, 'p4'); g = finish(g);
  assert.deepEqual([g.roles.p2, g.roles.p4], ['villager', 'c1']);
  let l = mk(['wolf', 'c1', 'seer', ...V(3)], { rules: [R('lend')] });
  l = go(l, 'c1'); l = tap(l, 'p3'); l = finish(l);
  assert.deepEqual([l.roles.p2, l.roles.p3], ['seer', 'c1'], 'getauscht für die nächste Nacht');
  l = rest(l); l = finish(l);
  assert.deepEqual([l.roles.p2, l.roles.p3], ['c1', 'seer'], 'danach zurück');
});

test('Vererben beim Tod an eine Person nach Wahl', () => {
  let g = mk(['wolf', 'c1', ...V(4)], { rules: [R('peek'), R('bequeath', { on: 'death', tgt: 'pick' })] });
  g = finish(g); g = apply(g, { t: 'skip-captain' }); g = apply(g, { t: 'manual-kill', pid: 'p2' });
  assert.equal(g.phase, 'interrupt'); assert.equal(g.interrupts[0].type, 'heir');
  g = tap(g, 'p5');
  assert.equal(g.roles.p5, 'c1');
  assert.equal(g.phase, 'day');
});

test('Überläufer: nach drei Einsätzen jeden Morgen geprüft, wird Werwolf mit alter Fähigkeit', () => {
  let g = mk(['wolf', 'c1', ...V(4)], tpl('turncoat'));
  for (let n = 0; n < 3; n++) { g = go(g, 'c1'); g = tap(g, n === 0 ? 'p4' : n === 1 ? 'p5' : 'p6'); g = finish(g); if (n < 2) { assert.ok(!isWolf(g, 'p2')); g = rest(g); } }
  assert.ok(isWolf(g, 'p2'), 'nach dem dritten Einsatz Werwolf');
  assert.equal(g.roles.p2, 'c1', 'behält die Rolle');
});

test('Freischalten: Fähigkeit erst nach Auslöser', () => {
  let g = mk(['wolf', 'c1', ...V(4)], { rules: [R('unlock', { on: 'attacked', limit: 1 }), R('kill', { if: { all: [{ k: 'unlocked' }] } })] });
  assert.equal(nightSteps(g).some((s) => s.role === 'c1' && s.act), false, 'noch gesperrt');
  g = go(g, 'wolf'); g = tap(g, 'p2'); g = finish(g);
  assert.ok(!alive(g, 'p2'), 'freigeschaltet, aber trotzdem vom Wolf getötet');
  assert.equal(g.unlocked.c1, true);
});

test('Klartext E4', () => {
  assert.equal(describeRule(customBlocks(tpl('cursed'))[0]), 'Wenn sie angegriffen wird: wird Werwolf statt zu sterben, wenn der Angreifer ein Werwolf ist (verliert die alte Fähigkeit, höchstens 1×).');
  for (const key of ['amnesiac', 'apprentice', 'turncoat']) for (const r of customBlocks(tpl(key))) assert.match(describeRule(r), /^[A-ZÄÖÜ].+\.$/, key);
});
