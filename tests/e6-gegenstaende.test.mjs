import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, apply, nightSteps, alive, holders, looksWolf, specialVoters } from '../src/engine/game.js';
import { ITEM_TEMPLATES, CUSTOM_TEMPLATES, describeRule } from '../src/engine/rules.js';
import { customBlocks } from '../src/engine/roles.js';

const itemOf = (key, id = key) => { const t = ITEM_TEMPLATES.find((x) => x.key === key); return { id, name: t.name, icon: t.icon, charges: t.charges ?? 0, hidden: !!t.hidden, bad: !!t.bad, rules: t.rules }; };
function mk(roleList, custom, items = []) {
  const counts = {};
  for (const r of roleList) counts[r] = (counts[r] || 0) + 1;
  const players = roleList.map((_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
  const g = createGame({ players, counts, mode: 'digital', items, custom: [{ id: 'c1', name: 'Sonder', camp: 'village', ...custom }] });
  g.roles = Object.fromEntries(players.map((p, i) => [p.id, roleList[i]])); g.middle = [];
  return g;
}
const go = (g, key) => { const i = nightSteps(g).findIndex((s) => s.key === key || s.keys?.includes(key)); assert.ok(i >= 0, `Schritt ${key} fehlt`); const x = apply(g, { t: 'goto', idx: i }); return nightSteps(x)[i].keys ? apply(x, { t: 'rule-sel', key }) : x; };
const tap = (g, ...ids) => ids.reduce((x, id) => apply(x, { t: 'tap', pid: id }), g);
const finish = (g) => { let x = g; for (let i = 0; i < 60 && x.phase === 'night'; i++) x = apply(x, { t: 'next' }); return x; };
const rest = (g) => apply(apply(g, { t: 'skip-captain' }), { t: 'day-none' });
const V = (n) => Array(n).fill('villager');
const R = (k, o = {}) => ({ k, n: 1, when: 'every', limit: 0, self: false, rep: false, role: 'villager', chance: 100, ...o });

test('Schmied gibt eine Rüstung, sie hält einen Angriff und ist dann verbraucht', () => {
  let g = mk(['wolf', 'c1', ...V(4)], { rules: [R('giveItem', { item: 'armor', limit: 2 })] }, [itemOf('armor')]);
  g = go(g, 'c1'); g = tap(g, 'p4');
  g = go(g, 'wolf'); g = tap(g, 'p4');
  g = finish(g);
  assert.ok(alive(g, 'p4'), 'die Rüstung wirkt schon in derselben Nacht');
  assert.equal((g.items.p4 ?? []).length, 0, 'und ist dann verbraucht');
  let h = mk(['wolf', 'c1', ...V(4)], { rules: [R('peek')] }, [itemOf('armor')]);
  h = apply(h, { t: 'item-give', pid: 'p4', iid: 'armor' });
  h = go(h, 'wolf'); h = tap(h, 'p4'); h = finish(h);
  assert.ok(alive(h, 'p4'), 'Rüstung hält');
  assert.equal((h.items.p4 ?? []).length, 0, 'verbraucht');
  h = rest(h); h = go(h, 'wolf'); h = tap(h, 'p4'); h = finish(h);
  assert.ok(!alive(h, 'p4'));
});

test('Kristallkugel: eigener Nachtschritt für den Träger, drei Ladungen', () => {
  let g = mk(['wolf', 'c1', ...V(4)], { rules: [R('peek')] }, [itemOf('crystal')]);
  g = apply(g, { t: 'item-give', pid: 'p5', iid: 'crystal' });
  assert.deepEqual(holders(g, 'it_crystal').map((p) => p.id), ['p5']);
  const st = nightSteps(g).find((s) => s.role === 'it_crystal');
  assert.ok(st && /Kristallkugel \(P5\)/.test(st.label));
  g = go(g, 'it_crystal'); g = tap(g, 'p1'); g = finish(g);
  assert.equal(g.items.p5[0].charges, 2);
});

test('Stehlen, Zerstören, Reinigen, verdecktes Gift', () => {
  let g = mk(['wolf', 'c1', ...V(4)], { rules: [R('stealItem'), R('cleanse')] }, [itemOf('armor'), itemOf('poison')]);
  g = apply(g, { t: 'item-give', pid: 'p4', iid: 'armor' });
  g = apply(g, { t: 'item-give', pid: 'p5', iid: 'poison' });
  g = go(g, 'c1'); g = tap(g, 'p4');
  g = go(g, 'c1#1'); g = tap(g, 'p5');
  g = finish(g);
  assert.equal(g.items.p2[0].iid, 'armor', 'gestohlen');
  assert.equal(g.items.p5.length, 0, 'Gift entfernt');
});

test('Startausstattung und Bedingung „trägt Gegenstand“', () => {
  let g = mk(['wolf', 'c1', ...V(4)], { rules: [R('startItem', { on: 'always', item: 'bell' }), R('kill', { if: { all: [{ k: 'hasItem', item: 'bell' }] } })] }, [itemOf('bell')]);
  g = finish(g);
  assert.equal(g.items.p2?.[0]?.iid, 'bell', 'nach der ersten Nacht ausgeteilt');
  g = rest(g);
  assert.ok(nightSteps(g).find((s) => s.role === 'c1')?.keys.includes('c1#1'), 'Fähigkeit dank Glocke');
});

test('Gegenstand mit Täuschung und Stimme wirkt über den Träger', () => {
  const mask = { id: 'mask', name: 'Wolfsmaske', icon: '🐺', charges: 0, rules: [{ k: 'appear', on: 'always', as: 'wolf' }] };
  const seal = { id: 'seal', name: 'Siegel', icon: '⚖️', charges: 0, rules: [{ k: 'selfVote', on: 'always', mult: 3 }] };
  let g = mk(['wolf', 'c1', ...V(4)], { rules: [] }, [mask, seal]);
  g = apply(g, { t: 'item-give', pid: 'p4', iid: 'mask' });
  g = apply(g, { t: 'item-give', pid: 'p5', iid: 'seal' });
  assert.equal(looksWolf(g, 'p4'), true);
  g = apply(finish(g), { t: 'skip-captain' });
  assert.equal(specialVoters(g).find((v) => v.pid === 'p5')?.weight, 3);
});

test('Vererben mit Gegenständen, Fluch-Amulett trifft den Angreifer', () => {
  let g = mk(['wolf', 'c1', ...V(4)], { rules: [R('bequeath', { on: 'death', tgt: 'pick', items: true })] }, [itemOf('armor'), itemOf('amulet')]);
  g = apply(g, { t: 'item-give', pid: 'p2', iid: 'armor' });
  g = apply(finish(g), { t: 'skip-captain' }); g = apply(g, { t: 'manual-kill', pid: 'p2' });
  g = tap(g, 'p6');
  assert.equal(g.roles.p6, 'c1'); assert.equal(g.items.p6[0].iid, 'armor');
  let a = mk(['wolf', 'c1', ...V(4)], { rules: [] }, [itemOf('amulet')]);
  a = apply(a, { t: 'item-give', pid: 'p4', iid: 'amulet' });
  a = go(a, 'wolf'); a = tap(a, 'p4'); a = finish(a);
  assert.ok(!alive(a, 'p1'), 'Angreifer getroffen');
});

test('Vorlage Schmied verweist auf den Gegenstand, Klartext', () => {
  const t = CUSTOM_TEMPLATES.find((x) => x.key === 'smith');
  assert.deepEqual(t.needItems, ['armor']);
  const r = customBlocks({ rules: [R('giveItem', { item: 'armor', limit: 2 })] })[0];
  const g = mk(['wolf', 'c1', ...V(4)], { rules: [] }, [itemOf('armor')]);
  assert.ok(g);
  assert.equal(describeRule(r), 'Jede Nacht: gibt eine andere Person „Rüstung“ (höchstens 2×).');
});
