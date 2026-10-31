import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, apply, nightSteps, alive, setupProblems, townRandomMap, isVagabond, captainPool, eligibleVoters } from '../src/engine/game.js';

/** Digitalspiel mit festen Rollen und Gebäuden: town = { pid: Gebäude }. */
function mk(roleList, town, { rules = {}, extra = {} } = {}) {
  const counts = {};
  for (const r of roleList) counts[r] = (counts[r] || 0) + 1;
  const players = roleList.map((_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
  const sel = {};
  for (const k of Object.values(town)) sel[k] = (sel[k] || 0) + 1;
  const g = createGame({ players, counts, mode: 'digital', rules: { town: true, ...rules }, town: sel });
  g.roles = Object.fromEntries(players.map((p, i) => [p.id, roleList[i]])); g.middle = [];
  g.town.b = { ...town };
  Object.assign(g, extra);
  return g;
}
const goKey = (g, key) => { const i = nightSteps(g).findIndex((s) => s.key === key); assert.ok(i >= 0, `Schritt ${key} fehlt`); return apply(g, { t: 'goto', idx: i }); };
const tap = (g, ...ids) => ids.reduce((x, id) => apply(x, { t: 'tap', pid: id }), g);
const finishNight = (g) => { let x = g; for (let i = 0; i < 60 && x.phase === 'night'; i++) x = apply(x, { t: 'next' }); return x; };
const passDay = (g) => apply(g.dayMode === 'captain' ? apply(g, { t: 'skip-captain' }) : g, { t: 'day-none' });
const V = (n) => Array(n).fill('villager');

test('Gemeinde: Gebäude werden zufällig verteilt, der Rest sind Vagabunden', () => {
  const g = mk(['wolf', ...V(5)], { p2: 'inn', p3: 'school' });
  const map = townRandomMap(g, () => 0.3);
  assert.equal(Object.keys(map).length, 2);
  assert.deepEqual(Object.values(map).sort(), ['inn', 'school']);
  g.town.b = map;
  assert.equal(g.cfg.players.filter((p) => isVagabond(g, p.id)).length, 4);
});

test('Gemeinde: zu viele Gebäude und Brandstifter ohne Gebäude werden gemeldet', () => {
  const players = [1, 2, 3].map((i) => ({ id: `p${i}`, name: `P${i}` }));
  assert.match(setupProblems({ players, counts: { wolf: 1, villager: 2 }, rules: { town: true }, town: { farm: 4 } })[0], /Mehr Gebäude/);
  assert.match(setupProblems({ players, counts: { wolf: 1, arsonist: 1, villager: 1 }, rules: { town: false } })[0], /Brandstifter/);
});

test('Wirt: Werwölfe fressen ihn nicht, das Dorf kann ihn nicht ausscheiden', () => {
  let g = mk(['wolf', 'villager', 'villager', 'villager', 'villager', 'villager'], { p2: 'inn' });
  g = goKey(g, 'wolf'); g = tap(g, 'p2');
  assert.equal(g.draft.kill, null, 'Wirt ist kein Ziel');
  g = tap(g, 'p3'); g = finishNight(g);
  g = apply(g, { t: 'skip-captain' });
  g = tap(g, 'p2');
  assert.equal(g.draft.votes.p2, undefined, 'Wirt ist kein Wahlziel');
});

test('Wirt: Stimmt er gegen jemanden, der ausscheidet, verliert er den Schutz', () => {
  let g = mk(['wolf', 'villager', 'villager', 'villager', 'villager', 'villager'], { p2: 'inn' });
  g = finishNight(g); g = apply(g, { t: 'skip-captain' });
  g = apply(g, { t: 'inn-arm' }); g = tap(g, 'p4');
  assert.equal(g.draft.innVote, 'p4');
  g = tap(g, 'p4');
  g = apply(g, { t: 'day-execute' });
  assert.ok(!alive(g, 'p4'));
  assert.equal(g.town.innLost, true);
  g = finishNight(g);
  assert.equal(g.town.innLost, true);
});

test('Lehrerin: schließt bis zu zwei Personen aus, stimmt selbst nie ab, keine Vagabunden', () => {
  let g = mk(['wolf', 'villager', 'villager', 'villager', 'villager', 'villager'], { p2: 'school', p3: 'farm', p4: 'farm' });
  g = finishNight(g); g = apply(g, { t: 'skip-captain' });
  assert.ok(!eligibleVoters(g).includes('p2'), 'Lehrerin stimmt nie ab');
  g = apply(g, { t: 'ban-arm' }); g = tap(g, 'p5');
  assert.deepEqual(g.draft.ban, [], 'P5 ist Vagabund');
  g = apply(g, { t: 'ban-arm' }); g = tap(g, 'p3');
  g = apply(g, { t: 'ban-arm' }); g = tap(g, 'p4');
  assert.deepEqual(g.draft.ban, ['p3', 'p4']);
  assert.ok(!eligibleVoters(g).includes('p3') && !eligibleVoters(g).includes('p4'));
});

test('Barbier: erwischt er einen Wolf, überlebt er, sonst scheidet auch er aus', () => {
  let g = mk(['wolf', 'villager', 'villager', 'villager', 'villager'], { p1: 'farm', p2: 'barber', p3: 'farm' });
  g = finishNight(g); g = apply(g, { t: 'skip-captain' });
  let h = apply(g, { t: 'barber', pid: 'p2', target: 'p1' });
  assert.ok(!alive(h, 'p1') && alive(h, 'p2'), 'Wolf erwischt');
  assert.equal(h.town.used.p2, true);
  let k = apply(g, { t: 'barber', pid: 'p2', target: 'p3' });
  assert.ok(!alive(k, 'p3') && !alive(k, 'p2'), 'Dorfbewohner erwischt: Barbier scheidet aus');
  let v = apply(g, { t: 'barber', pid: 'p2', target: 'p5' });
  assert.ok(alive(v, 'p5'), 'Vagabunden kann der Barbier nicht ausschalten');
});

test('Schlossherr: begnadigt einmal, die Person scheidet nicht aus', () => {
  let g = mk(['wolf', 'villager', 'villager', 'villager', 'villager', 'villager'], { p2: 'manor' });
  g = finishNight(g); g = apply(g, { t: 'skip-captain' });
  g = tap(g, 'p4', 'p5', 'p4');
  g = apply(g, { t: 'pardon' });
  assert.ok(alive(g, 'p4'));
  assert.equal(g.town.used.p2, true);
  assert.equal(g.phase, 'night', 'der Tag ist zu Ende');
  g = finishNight(g); g = apply(g, { t: 'skip-captain' });
  g = tap(g, 'p4'); g = apply(g, { t: 'pardon' });
  assert.equal(g.phase, 'day', 'zweite Begnadigung geht nicht');
});

test('Vogt: weist ein frei gewordenes Gebäude einem Vagabunden zu, ohne Vogt nicht', () => {
  let g = mk(['wolf', 'villager', 'villager', 'villager', 'villager', 'villager'], { p2: 'vogt', p3: 'church', p4: 'bakery' });
  g = goKey(g, 'wolf'); g = tap(g, 'p3'); g = finishNight(g);
  assert.deepEqual(g.town.free, ['church']);
  g = apply(g, { t: 'vogt-assign', pid: 'p5', key: 'church' });
  assert.equal(g.town.b.p5, 'church');
  assert.deepEqual(g.town.free, []);
  let h = mk(['wolf', 'villager', 'villager', 'villager', 'villager', 'villager'], { p2: 'vogt', p3: 'church' });
  h = apply(finishNight(h), { t: 'manual-kill', pid: 'p2' });
  assert.deepEqual(h.town.free, [], 'Haus des Vogts bleibt leer');
  h = apply(h, { t: 'manual-kill', pid: 'p3' });
  h = apply(h, { t: 'vogt-assign', pid: 'p5', key: 'church' });
  assert.equal(h.town.b.p5, undefined, 'ohne Vogt keine Zuteilung');
});

test('Bauern: Hauptmann erst ab Nacht 2 und nur unter Bauern', () => {
  let g = mk(['wolf', ...V(5)], { p2: 'farm', p3: 'farm' });
  g = finishNight(g);
  assert.equal(g.dayMode, 'vote', 'Tag 1: noch kein Hauptmann');
  g = passDay(g); g = finishNight(g);
  assert.equal(g.dayMode, 'captain');
  assert.deepEqual(captainPool(g).sort(), ['p2', 'p3']);
  g = tap(g, 'p5'); g = apply(g, { t: 'captain-confirm' });
  assert.equal(g.captain, null, 'Vagabund kann nicht Hauptmann werden');
  g = apply(g, { t: 'vote-reset' }); g = tap(g, 'p2'); g = apply(g, { t: 'captain-confirm' });
  assert.equal(g.captain, 'p2');
});

test('Bauern: stirbt der letzte Bauer, gibt es keinen Hauptmann mehr', () => {
  let g = mk(['wolf', ...V(5)], { p2: 'farm' }, { extra: { captain: 'p2' } });
  g = finishNight(g);
  g = apply(g, { t: 'manual-kill', pid: 'p2' });
  assert.equal(g.captain, null);
  assert.equal(g.captainLost, true);
  assert.equal(g.phase, 'day');
});

test('Bäcker: eigener Nachtschritt nach den Wölfen', () => {
  const g = mk(['wolf', 'witch', ...V(4)], { p3: 'bakery' });
  const keys = nightSteps(g).map((s) => s.key);
  assert.deepEqual(keys, ['wolf', 'baker', 'witch']);
});

test('Brandstifter: Gebäude brennt nieder, Bewohner wird Vagabund', () => {
  let g = mk(['wolf', 'arsonist', ...V(4)], { p3: 'church', p4: 'inn' });
  g = goKey(g, 'arsonist'); g = tap(g, 'p5');
  assert.equal(g.draft.fire, null, 'nur bewohnte Gebäude');
  g = tap(g, 'p3');
  g = goKey(g, 'wolf'); g = tap(g, 'p6');
  g = finishNight(g);
  assert.equal(g.town.b.p3, undefined);
  assert.ok(g.town.gone.includes('church'));
  assert.ok(alive(g, 'p3') && isVagabond(g, 'p3'));
  assert.equal(g.town.fireUsed, true);
  assert.ok(!nightSteps(passDay(g)).some((s) => s.key === 'arsonist' && s.act), 'nur einmal im Spiel');
});

test('Brandstifter: Haus des Wolfsopfers – kein Opfer, der Wolf rechts davon verbrennt', () => {
  let g = mk(['villager', 'wolf', 'villager', 'villager', 'arsonist', 'villager', 'wolf'], { p4: 'church' });
  g = goKey(g, 'arsonist'); g = tap(g, 'p4');
  g = goKey(g, 'wolf'); g = tap(g, 'p4');
  g = finishNight(g);
  assert.ok(alive(g, 'p4'), 'Opfer überlebt');
  assert.ok(!alive(g, 'p2'), 'nächster Wolf entgegen dem Uhrzeigersinn (P2) verbrennt');
  assert.ok(alive(g, 'p7'));
});

test('Rabe: kann Vagabunden nicht belasten', () => {
  let g = mk(['wolf', 'raven', ...V(4)], { p3: 'inn' });
  g = goKey(g, 'raven'); g = tap(g, 'p4');
  assert.equal(g.draft.mark, null);
  g = tap(g, 'p3');
  assert.equal(g.draft.mark, 'p3');
});

test('Beichtvater und Quacksalber: einmalige Fähigkeit, Quacksalber gibt sie zurück', () => {
  let g = mk(['wolf', ...V(5)], { p2: 'church', p3: 'shack' });
  g = finishNight(g);
  g = apply(g, { t: 'town-use', pid: 'p2' });
  assert.equal(g.town.used.p2, true);
  g = apply(g, { t: 'town-use', pid: 'p3', target: 'p2' });
  assert.equal(g.town.used.p2, undefined);
  assert.equal(g.town.used.p3, true);
});
