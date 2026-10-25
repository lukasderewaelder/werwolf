import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, apply, nightSteps, setupProblems, checkWinner, alive, isWolf, livingIds, tally, eligibleVoters } from '../src/engine/game.js';

/** Digitalspiel mit fest vorgegebenen Rollen; Spieler heißen p1..pn in Sitzreihenfolge. */
function mk(roleList, rules = {}, mode = 'digital') {
  const counts = {};
  for (const r of roleList) counts[r] = (counts[r] || 0) + 1;
  const players = roleList.map((_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
  const g = createGame({ players, counts, mode, rules });
  if (mode === 'digital') { g.roles = Object.fromEntries(players.map((p, i) => [p.id, roleList[i]])); g.middle = []; }
  return g;
}
const goKey = (g, key) => { const i = nightSteps(g).findIndex((s) => s.key === key); assert.ok(i >= 0, `Schritt ${key} fehlt`); return apply(g, { t: 'goto', idx: i }); };
const tap = (g, ...ids) => ids.reduce((x, id) => apply(x, { t: 'tap', pid: id }), g);
/** Nacht beenden: alle Schritte durchklicken. */
const finishNight = (g) => { let x = g; for (let i = 0; i < 60 && x.phase === 'night'; i++) x = apply(x, { t: 'next' }); return x; };
/** Tag: Person hinrichten. */
const vote = (g, id) => apply(apply(g, { t: 'tap', pid: id }), { t: 'day-execute' });
const skipCaptain = (g) => (g.dayMode === 'captain' ? apply(g, { t: 'skip-captain' }) : g);

test('Spielvorbereitung: Kartenzahl und Wölfe werden geprüft', () => {
  const players = [1, 2, 3, 4].map((i) => ({ id: `p${i}`, name: `P${i}` }));
  assert.deepEqual(setupProblems({ players, counts: { wolf: 1, villager: 3 } }), []);
  assert.match(setupProblems({ players, counts: { villager: 4 } })[0], /Werwolf/);
  assert.match(setupProblems({ players, counts: { wolf: 1, villager: 4 } })[0], /benötigt 4/);
  assert.match(setupProblems({ players, counts: { wolf: 1, thief: 1, villager: 2 } })[0], /benötigt 6/);
});

test('Ohne Karten: Rollen werden ausgelost, Dieb legt zwei Karten in die Mitte', () => {
  const players = Array.from({ length: 6 }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
  const g = createGame({ players, counts: { wolf: 1, thief: 1, seer: 1, villager: 5 }, mode: 'digital' }, () => 0.3);
  assert.equal(Object.keys(g.roles).length, 6);
  assert.equal(g.middle.length, 2);
});

test('Nachtreihenfolge nach Regelheft: Seherin und Heiler vor den Wölfen, Hexe danach', () => {
  const g = mk(['wolf', 'wolf', 'seer', 'witch', 'guard', 'villager', 'villager', 'villager']);
  assert.deepEqual(nightSteps(g).map((s) => s.key), ['seer', 'guard', 'wolf', 'witch']);
});

test('Nachtreihenfolge: Dieb, Amor, Verliebte zuerst, dann Seherin, Heiler, Wölfe, Weißer Werwolf, Urwolf, Hexe', () => {
  const g = mk(['thief', 'cupid', 'seer', 'guard', 'wolf', 'whitewolf', 'urwolf', 'witch', 'villager', 'villager', 'villager']);
  assert.deepEqual(nightSteps(g).map((s) => s.key), ['thief', 'cupid', 'lovers', 'seer', 'guard', 'wolf', 'urwolf', 'witch']);
  const g2 = { ...g, night: 2 };
  assert.deepEqual(nightSteps(g2).map((s) => s.key), ['seer', 'guard', 'wolf', 'whitewolf', 'urwolf', 'witch']);
});

test('Wolfsopfer stirbt, Hexe heilt ihn: niemand tot, Trank verbraucht', () => {
  let g = mk(['wolf', 'witch', 'seer', 'villager', 'villager']);
  g = goKey(g, 'wolf'); g = tap(g, 'p4');
  g = goKey(g, 'witch'); g = tap(g, 'p4');
  assert.equal(g.draft.heal, 'p4');
  g = finishNight(g);
  assert.equal(g.phase, 'day');
  assert.deepEqual(g.lastDeaths, []);
  assert.equal(g.potions.heal, true);
});

test('Werwölfe fressen keine Werwölfe', () => {
  let g = mk(['wolf', 'wolf', 'seer', 'villager', 'villager']);
  g = goKey(g, 'wolf'); g = tap(g, 'p2');
  assert.equal(g.draft.kill, null);
});

test('Hexe darf beide Tränke in derselben Nacht einsetzen', () => {
  let g = mk(['wolf', 'witch', 'villager', 'villager', 'villager', 'villager']);
  g = goKey(g, 'wolf'); g = tap(g, 'p3');
  g = goKey(g, 'witch'); g = tap(g, 'p3');
  g = apply(g, { t: 'witch-poison' }); g = tap(g, 'p4');
  g = finishNight(g);
  assert.deepEqual(g.lastDeaths, ['p4']);
  assert.equal(alive(g, 'p3'), true);
});

test('Alter überlebt den ersten Angriff und stirbt beim zweiten', () => {
  let g = mk(['wolf', 'elder', 'villager', 'villager', 'villager', 'villager']);
  g = goKey(g, 'wolf'); g = tap(g, 'p2'); g = finishNight(g);
  assert.equal(alive(g, 'p2'), true);
  g = skipCaptain(g); g = apply(g, { t: 'day-none' });
  assert.equal(g.phase, 'night');
  g = goKey(g, 'wolf'); g = tap(g, 'p2'); g = finishNight(g);
  assert.equal(alive(g, 'p2'), false);
});

test('Alter: Heilung schützt nur vor einem Angriff, der Angriff zählt trotzdem', () => {
  let g = mk(['wolf', 'elder', 'witch', 'villager', 'villager', 'villager']);
  g = goKey(g, 'wolf'); g = tap(g, 'p2');
  g = goKey(g, 'witch'); g = tap(g, 'p2'); g = finishNight(g);
  assert.equal(alive(g, 'p2'), true);
  assert.equal(g.elderBites, 1);
  g = skipCaptain(g); g = apply(g, { t: 'day-none' });
  g = goKey(g, 'wolf'); g = tap(g, 'p2'); g = finishNight(g);
  assert.equal(alive(g, 'p2'), false, 'zweiter Angriff tötet');
});

test('Alter durch Abstimmung getötet: Dorfbewohner verlieren Fähigkeiten, Zweideutige nicht', () => {
  let g = mk(['wolf', 'elder', 'seer', 'wildchild', 'villager', 'villager', 'villager']);
  g = finishNight(g); g = skipCaptain(g);
  g = vote(g, 'p2');
  assert.equal(g.powersLost, true);
  assert.equal(g.phase, 'night');
  assert.ok(!nightSteps(g).some((s) => s.key === 'seer' && s.act), 'Seherin hat keine Aktion mehr');
  assert.ok(nightSteps(g).some((s) => s.key === 'wolf'));
});

test('Jäger schießt nach seinem Tod, Verliebte sterben zusammen', () => {
  let g = mk(['wolf', 'hunter', 'villager', 'villager', 'villager', 'villager', 'cupid']);
  g = goKey(g, 'cupid'); g = tap(g, 'p2', 'p3');
  g = goKey(g, 'wolf'); g = tap(g, 'p2');
  g = finishNight(g);
  assert.equal(g.phase, 'interrupt');
  assert.equal(g.interrupts[0].type, 'hunter');
  assert.equal(alive(g, 'p3'), false, 'Verliebte stirbt aus Kummer');
  g = tap(g, 'p4');
  assert.equal(alive(g, 'p4'), false);
  assert.equal(g.phase, 'day');
  assert.deepEqual([...g.lastDeaths].sort(), ['p2', 'p3', 'p4']);
});

test('Sündenbock: Gleichstand tötet ihn, danach bestimmt er die Wähler', () => {
  let g = mk(['wolf', 'scapegoat', 'villager', 'villager', 'villager', 'villager']);
  g = finishNight(g); g = skipCaptain(g);
  g = apply(g, { t: 'day-tie' });
  assert.equal(alive(g, 'p2'), false);
  assert.equal(g.interrupts[0].type, 'scapegoat');
  g = tap(g, 'p3', 'p4');
  g = apply(g, { t: 'scapegoat-done' });
  assert.equal(g.phase, 'night');
  assert.deepEqual(g.voters, ['p3', 'p4']);
  assert.equal(g.votersDay, 2);
});

test('Sündenbock stirbt nachts: Wähler gelten schon für den kommenden Tag', () => {
  let g = mk(['wolf', 'scapegoat', 'villager', 'villager', 'villager', 'villager']);
  g = goKey(g, 'wolf'); g = tap(g, 'p2'); g = finishNight(g);
  assert.equal(g.phase, 'interrupt');
  g = tap(g, 'p5'); g = apply(g, { t: 'scapegoat-done' });
  assert.equal(g.phase, 'day');
  assert.deepEqual(g.voters, ['p5']);
  assert.equal(g.votersDay, 1);
  assert.ok(g.morning.some((m) => /dürfen heute nur abstimmen/.test(m)));
});

test('Dorfdepp: überlebt die Abstimmung, verliert Hauptmannsamt für immer', () => {
  let g = mk(['wolf', 'idiot', 'villager', 'villager', 'villager', 'villager']);
  g = finishNight(g);
  g = apply(g, { t: 'set-captain', pid: 'p2' });
  g = vote(g, 'p2');
  assert.equal(alive(g, 'p2'), true);
  assert.equal(g.captain, null);
  assert.equal(g.captainLost, true);
  assert.equal(g.phase, 'night');
  g = finishNight(g);
  assert.equal(g.dayMode, 'vote', 'keine neue Hauptmannswahl');
});

test('Hauptmann stirbt: Nachfolger wird bestimmt', () => {
  let g = mk(['wolf', 'villager', 'villager', 'villager', 'villager']);
  g = finishNight(g);
  g = apply(g, { t: 'set-captain', pid: 'p2' });
  g = vote(g, 'p2');
  assert.equal(g.phase, 'interrupt');
  g = tap(g, 'p3');
  assert.equal(g.captain, 'p3');
  assert.equal(g.phase, 'night');
});

test('Engel: Spiel beginnt mit Abstimmung vor der ersten Nacht, Hinrichtung gewinnt', () => {
  let g = mk(['wolf', 'angel', 'villager', 'villager', 'villager']);
  assert.equal(g.phase, 'day');
  assert.equal(g.day, 0);
  g = skipCaptain(g);
  g = vote(g, 'p2');
  assert.equal(g.phase, 'ended');
  assert.equal(g.winner, 'Der Engel');
});

test('Engel: ohne Treffer am Tag 0 beginnt Nacht 1, Tod in Nacht 1 gewinnt', () => {
  let g = mk(['wolf', 'angel', 'villager', 'villager', 'villager']);
  g = skipCaptain(g); g = apply(g, { t: 'day-none' });
  assert.equal(g.phase, 'night');
  assert.equal(g.night, 1);
  g = goKey(g, 'wolf'); g = tap(g, 'p2'); g = finishNight(g);
  assert.equal(g.winner, 'Der Engel');
});

test('Engel: nach Nacht 1 ist er normaler Dorfbewohner', () => {
  let g = mk(['wolf', 'angel', 'villager', 'villager', 'villager', 'villager']);
  g = skipCaptain(g); g = apply(g, { t: 'day-none' });
  g = finishNight(g); g = skipCaptain(g);
  g = vote(g, 'p2');
  assert.notEqual(g.winner, 'Der Engel');
});

test('Siegprüfung: Dorf, Werwölfe bei Gleichstand, Weißer Werwolf', () => {
  let g = mk(['wolf', 'villager', 'villager']);
  g.dead = { p1: { cause: 'vote' } };
  assert.equal(checkWinner(g), 'Das Dorf');
  g = mk(['wolf', 'villager', 'villager']); g.dead = { p3: { cause: 'wolves' } };
  assert.equal(checkWinner(g), 'Die Werwölfe');
  g = mk(['wolf', 'villager', 'villager'], { parityWin: false }); g.dead = { p3: { cause: 'wolves' } };
  assert.equal(checkWinner(g), null);
  g = mk(['whitewolf', 'wolf', 'villager']); g.dead = { p3: { cause: 'wolves' } };
  assert.equal(checkWinner(g), null, 'Weißer Werwolf muss erst allein übrig bleiben');
  g.dead.p2 = { cause: 'whitewolf' };
  assert.equal(checkWinner(g), 'Der Weiße Werwolf');
  g = mk(['whitewolf', 'wolf', 'villager']); g.dead = { p1: { cause: 'vote' }, p3: { cause: 'wolves' } };
  assert.equal(checkWinner(g), 'Die Werwölfe');
});

test('Weißer Werwolf: nur in geraden Nächten, nur Wölfe als Ziel', () => {
  let g = mk(['wolf', 'whitewolf', 'villager', 'villager', 'villager', 'villager']);
  assert.ok(!nightSteps(g).some((s) => s.key === 'whitewolf' && s.act));
  g = { ...g, night: 2 };
  g = goKey(g, 'whitewolf'); g = tap(g, 'p3');
  assert.equal(g.draft.whitekill, null, 'Dorfbewohner nicht antippbar');
  g = tap(g, 'p1');
  assert.equal(g.draft.whitekill, 'p1');
});

test('Heiler: Schutz, nicht zweimal dieselbe Person, wirkt nicht beim Kleinen Mädchen', () => {
  let g = mk(['wolf', 'guard', 'girl', 'villager', 'villager', 'villager']);
  g = goKey(g, 'guard'); g = tap(g, 'p4');
  g = goKey(g, 'wolf'); g = tap(g, 'p4');
  g = finishNight(g);
  assert.deepEqual(g.lastDeaths, []);
  g = skipCaptain(g); g = apply(g, { t: 'day-none' });
  g = goKey(g, 'guard'); g = tap(g, 'p4');
  assert.equal(g.draft.protect, null, 'Sperre für dieselbe Person');
  g = tap(g, 'p3');
  g = goKey(g, 'wolf'); g = tap(g, 'p4'); g = apply(g, { t: 'girl-caught' });
  assert.equal(g.draft.kill, 'p3');
  g = finishNight(g);
  assert.deepEqual(g.lastDeaths, ['p3'], 'Mädchen stirbt trotz Schutz');
});

test('Urwolf infiziert das Opfer, Heiler schützt nicht davor', () => {
  let g = mk(['urwolf', 'wolf', 'guard', 'villager', 'villager', 'villager', 'villager']);
  g = goKey(g, 'guard'); g = tap(g, 'p4');
  g = goKey(g, 'wolf'); g = tap(g, 'p4');
  g = goKey(g, 'urwolf'); g = apply(g, { t: 'infect' });
  g = finishNight(g);
  assert.equal(alive(g, 'p4'), true);
  assert.equal(isWolf(g, 'p4'), true);
  assert.equal(g.urwolfUsed, true);
});

test('Ritter: Wolf links vom Ritter stirbt in der folgenden Nacht', () => {
  let g = mk(['villager', 'knight', 'villager', 'wolf', 'wolf', 'villager', 'villager']);
  g = goKey(g, 'wolf'); g = tap(g, 'p2'); g = finishNight(g);
  assert.equal(g.knightCurse, 'p4');
  g = skipCaptain(g); g = apply(g, { t: 'day-none' });
  g = goKey(g, 'wolf'); g = tap(g, 'p6');
  g = finishNight(g);
  assert.ok(g.lastDeaths.includes('p4'));
});

test('Wildes Kind wird zum Wolf, wenn das Vorbild stirbt', () => {
  let g = mk(['wolf', 'wildchild', 'villager', 'villager', 'villager', 'villager']);
  g = goKey(g, 'wildchild'); g = tap(g, 'p3');
  g = goKey(g, 'wolf'); g = tap(g, 'p3');
  g = finishNight(g);
  assert.equal(isWolf(g, 'p2'), true);
});

test('Hausregel: keine Opfer in der ersten Nacht', () => {
  let g = mk(['wolf', 'witch', 'villager', 'villager', 'villager'], { noVictimsNight1: true });
  g = goKey(g, 'wolf'); g = tap(g, 'p3');
  g = goKey(g, 'witch'); g = apply(g, { t: 'witch-poison' }); g = tap(g, 'p4');
  g = finishNight(g);
  assert.deepEqual(g.lastDeaths, []);
  assert.equal(g.potions.poison, false);
});

test('Ergebene Magd übernimmt die Rolle des Hingerichteten', () => {
  let g = mk(['wolf', 'maid', 'seer', 'villager', 'villager', 'villager']);
  g = finishNight(g); g = skipCaptain(g);
  g = apply(g, { t: 'tap', pid: 'p3' }); g = apply(g, { t: 'day-execute' });
  assert.equal(g.phase, 'interrupt');
  assert.equal(g.interrupts[0].type, 'maid');
  g = apply(g, { t: 'maid-take' });
  assert.equal(g.roles.p2, 'seer');
  assert.equal(alive(g, 'p3'), false);
  assert.equal(g.phase, 'night');
});

test('Bär brummt, wenn er selbst infiziert ist', () => {
  let g = mk(['wolf', 'villager', 'bear', 'villager', 'villager', 'villager']);
  g.turned.p3 = true;
  g = finishNight(g);
  assert.ok(g.morning.includes('Der Bär brummt laut!'));
});

test('Kartenmodus: Rollen werden in Nacht 1 zugeordnet, Rest wird Dorfbewohner', () => {
  const players = Array.from({ length: 5 }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
  let g = createGame({ players, counts: { wolf: 1, seer: 1, villager: 3 }, mode: 'cards' });
  g = goKey(g, 'seer'); g = tap(g, 'p2');
  g = goKey(g, 'wolf'); g = tap(g, 'p4');
  assert.equal(g.roles.p2, 'seer');
  assert.equal(g.roles.p4, 'wolf');
  assert.equal(g.roles.p1, 'villager', 'übrige Karten werden automatisch Dorfbewohner');
  g = apply(g, { t: 'assign-mode', mode: 'action' });
  g = tap(g, 'p1');
  assert.equal(g.draft.kill, 'p1');
});

test('Kartenmodus: unbekannte Rolle eines Toten wird abgefragt', () => {
  const players = Array.from({ length: 5 }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
  let g = createGame({ players, counts: { wolf: 1, hunter: 1, villager: 3 }, mode: 'cards' });
  g = { ...g, phase: 'day', day: 1, dayMode: 'vote' };
  g = vote(g, 'p3');
  assert.equal(g.phase, 'interrupt');
  assert.equal(g.interrupts[0].type, 'reveal');
  g = apply(g, { t: 'reveal', role: 'hunter' });
  assert.equal(g.interrupts[0].type, 'hunter');
  g = tap(g, 'p1');
  assert.equal(alive(g, 'p1'), false);
});

test('Stotternder Richter: zweite Abstimmung am selben Tag', () => {
  let g = mk(['wolf', 'judge', 'villager', 'villager', 'villager', 'villager']);
  g = finishNight(g); g = skipCaptain(g);
  g = apply(g, { t: 'judge-sign' });
  g = vote(g, 'p3');
  assert.equal(g.phase, 'day');
  assert.equal(g.secondVote, true);
  g = vote(g, 'p4');
  assert.equal(g.phase, 'night');
  assert.deepEqual(livingIds(g).sort(), ['p1', 'p2', 'p5', 'p6']);
});

test('Flötenspieler gewinnt, wenn alle anderen verzaubert sind', () => {
  let g = mk(['piper', 'wolf', 'villager', 'villager']);
  g = goKey(g, 'piper'); g = tap(g, 'p2', 'p3'); g = finishNight(g);
  g = skipCaptain(g); g = apply(g, { t: 'day-none' });
  g = goKey(g, 'piper'); g = tap(g, 'p4');
  g = finishNight(g);
  assert.equal(g.winner, 'Der Flötenspieler');
});

test('Gaukler: gewählte Rolle wird für die Nacht gespielt und aus der Auslage entfernt', () => {
  let g = mk(['actor', 'wolf', 'villager', 'villager', 'villager']);
  const first = g.actorPool[0];
  g = goKey(g, 'actor'); g = apply(g, { t: 'actor-role', role: first });
  assert.equal(g.roles.p1, first);
  g = finishNight(g);
  assert.ok(!g.actorPool.includes(first));
});

test('Eigene Rollen: Wolfslager zählt als Werwolf, Aufruf mit Position vor den Wölfen', () => {
  const custom = [
    { id: 'c1', name: 'Schattenwolf', camp: 'wolf', wake: 'none' },
    { id: 'c2', name: 'Nachtwächter', camp: 'village', wake: 'every', after: false, say: 'Der Nachtwächter erwacht.' },
  ];
  const players = Array.from({ length: 5 }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
  const counts = { c1: 1, c2: 1, villager: 3 };
  assert.deepEqual(setupProblems({ players, counts, custom }), []);
  const g = createGame({ players, counts, custom, mode: 'digital' }, () => 0.5);
  g.roles = { p1: 'c1', p2: 'c2', p3: 'villager', p4: 'villager', p5: 'villager' };
  assert.equal(isWolf(g, 'p1'), true);
  assert.equal(isWolf(g, 'p2'), false);
  assert.deepEqual(nightSteps(g).map((s) => s.key), ['c2', 'wolf']);
  assert.equal(checkWinner({ ...g, dead: { p3: { cause: 'wolves' }, p4: { cause: 'wolves' }, p5: { cause: 'wolves' } } }), 'Die Werwölfe');
});

test('Seherin sieht nur Werwolf oder nicht: sie kommt nach allen Wölfen dran, sonst davor', () => {
  const roles = ['wolf', 'urwolf', 'bigwolf', 'seer', 'witch', 'villager', 'villager', 'villager'];
  assert.deepEqual(nightSteps(mk(roles, { seerSees: 'role' })).map((s) => s.key), ['seer', 'wolf', 'urwolf', 'bigwolf', 'witch']);
  assert.deepEqual(nightSteps(mk(roles, { seerSees: 'camp' })).map((s) => s.key), ['wolf', 'urwolf', 'bigwolf', 'seer', 'witch']);
});

test('Kartenmodus Nacht 1: Fuchs kommt nach den Wölfen, ab Nacht 2 an der Regelheft-Stelle', () => {
  const players = Array.from({ length: 6 }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
  const g = createGame({ players, counts: { wolf: 1, fox: 1, seer: 1, villager: 3 }, mode: 'cards' });
  const keys = (x) => nightSteps(x).map((s) => s.key).filter((k) => ['seer', 'fox', 'wolf'].includes(k));
  assert.deepEqual(keys(g), ['seer', 'wolf', 'fox']);
  assert.deepEqual(keys({ ...g, night: 2 }), ['seer', 'fox', 'wolf']);
});

const dayGame = (extra = {}, roles = ['wolf', 'villager', 'villager', 'villager', 'villager', 'villager']) => {
  let g = mk(roles, extra);
  g = finishNight(g);
  return skipCaptain(g);
};
const taps = (g, ...ids) => ids.reduce((x, id) => apply(x, { t: 'tap', pid: id }), g);

test('Stimmenzähler: Mehrheit wird erkannt und hingerichtet', () => {
  let g = dayGame();
  g = taps(g, 'p3', 'p3', 'p3', 'p4', 'p4');
  const t = tally(g);
  assert.deepEqual(t.leaders, ['p3']);
  assert.equal(t.cast, 5);
  assert.equal(t.rows[0].total, 3);
  g = apply(g, { t: 'day-execute' });
  assert.equal(alive(g, 'p3'), false);
  assert.equal(g.phase, 'night');
  assert.deepEqual(g.draft.votes, {});
});

test('Stimmenzähler: Gleichstand wird erkannt, Hinrichten tut dann nichts, Letzte zurück löst ihn auf', () => {
  let g = dayGame();
  g = taps(g, 'p3', 'p3', 'p4', 'p4');
  assert.equal(tally(g).tie, true);
  assert.deepEqual(tally(g).leaders.sort(), ['p3', 'p4']);
  const same = apply(g, { t: 'day-execute' });
  assert.equal(same.phase, 'day');
  g = apply(taps(g, 'p4'), { t: 'day-execute' });
  assert.equal(alive(g, 'p4'), false);
  let h = taps(dayGame(), 'p3', 'p4');
  h = apply(taps(h, 'p3'), { t: 'vote-undo' });
  assert.equal(tally(h).tie, true);
});

test('Stimmenzähler: Hauptmann zählt doppelt, Rabe gibt zwei Stimmen dazu', () => {
  let g = dayGame({ captain: true });
  g = apply(g, { t: 'set-captain', pid: 'p2' });
  g = apply(g, { t: 'vote-cap-arm' });
  g = taps(g, 'p4');                       // Hauptmann wählt p4: 2 Stimmen
  g = taps(g, 'p3', 'p3');                 // zwei Hände für p3
  let t = tally(g);
  assert.equal(t.tie, true, 'zwei zu zwei');
  g.ravenMark = 'p3';
  t = tally(g);
  assert.deepEqual(t.leaders, ['p3']);
  assert.equal(t.rows.find((r) => r.pid === 'p3').total, 4);
  assert.equal(t.cast, 3);
  g = apply(g, { t: 'vote-undo' });        // nimmt die letzte Hand von p3 zurück
  assert.equal(tally(g).rows.find((r) => r.pid === 'p3').hands, 1);
  assert.equal(g.draft.capVote, 'p4');
});

test('Stimmenzähler: Dorfdepp ohne Stimmrecht, nur so viele Hände wie Wahlberechtigte', () => {
  let g = dayGame({}, ['wolf', 'idiot', 'villager', 'villager']);
  g.idiotRevealed = true;
  assert.deepEqual(eligibleVoters(g), ['p1', 'p3', 'p4']);
  g = taps(g, 'p3', 'p3', 'p3', 'p3');
  assert.equal(tally(g).cast, 3, 'vierte Hand wird abgelehnt');
  g.voters = ['p3']; g.votersDay = g.day;
  assert.deepEqual(eligibleVoters(g), ['p3'], 'Sündenbock beschränkt die Wähler');
});

test('Hauptmannswahl per Zähler, direkt wählen und Gleichstand', () => {
  const start = () => finishNight(mk(['wolf', 'villager', 'villager', 'villager', 'villager', 'villager']));
  let g = start();
  assert.equal(g.dayMode, 'captain');
  g = taps(g, 'p3', 'p3', 'p4');
  g = apply(g, { t: 'captain-confirm' });
  assert.equal(g.captain, 'p3');
  assert.equal(g.dayMode, 'vote');
  let h = apply(start(), { t: 'vote-mode', mode: 'direct' });
  h = taps(h, 'p5');
  h = apply(h, { t: 'captain-confirm' });
  assert.equal(h.captain, 'p5');
  let k = taps(start(), 'p3', 'p4');
  k = apply(k, { t: 'captain-confirm' });
  assert.equal(k.captain, null, 'bei Gleichstand wird niemand ernannt');
});

test('Ältere Spielstände ohne Zähler laufen weiter', () => {
  let g = dayGame();
  delete g.draft.votes; delete g.draft.voteLog; delete g.draft.voteMode; delete g.draft.capVote;
  g = taps(g, 'p3');
  assert.deepEqual(tally(g).leaders, ['p3']);
});

test('Jäger ist verliebt: stirbt der Partner, schießt er noch; sterben dadurch alle, gewinnt niemand', () => {
  let g = mk(['wolf', 'hunter', 'villager']);
  g.lovers = ['p2', 'p3'];
  g = goKey(g, 'wolf'); g = tap(g, 'p3');
  g = finishNight(g);
  assert.equal(alive(g, 'p2'), false, 'Jäger stirbt aus Kummer');
  assert.equal(g.phase, 'interrupt');
  assert.equal(g.interrupts[0].type, 'hunter');
  g = tap(g, 'p1');
  assert.equal(g.phase, 'ended');
  assert.match(g.winner, /alle sind tot/);
});

test('Dieb: liegen zwei Werwölfe in der Mitte, muss er einen nehmen; Abwählen stellt die Karten wieder her', () => {
  const players = Array.from({ length: 4 }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
  let g = createGame({ players, counts: { thief: 1, wolf: 2, seer: 1, villager: 2 }, mode: 'digital' });
  g.roles = { p1: 'thief', p2: 'seer', p3: 'villager', p4: 'villager' }; g.middle = ['wolf', 'wolf']; g.middle0 = ['wolf', 'wolf'];
  g = goKey(g, 'thief');
  g = apply(g, { t: 'thief-role', role: 'seer' });
  assert.equal(g.roles.p1, 'thief', 'Seherin darf er nicht wählen');
  g = apply(g, { t: 'thief-role', role: 'wolf' });
  assert.equal(g.roles.p1, 'wolf');
  assert.deepEqual([...g.middle].sort(), ['thief', 'wolf']);
  g = apply(g, { t: 'thief-role', role: 'wolf' });
  assert.equal(g.roles.p1, 'thief');
  assert.deepEqual(g.middle, ['wolf', 'wolf']);
});

test('Dieb: liegen keine zwei Werwölfe in der Mitte, darf er frei wählen oder behalten', () => {
  const players = Array.from({ length: 4 }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
  let g = createGame({ players, counts: { thief: 1, wolf: 1, seer: 1, villager: 3 }, mode: 'digital' });
  g.roles = { p1: 'thief', p2: 'wolf', p3: 'villager', p4: 'villager' }; g.middle = ['seer', 'villager']; g.middle0 = ['seer', 'villager'];
  g = goKey(g, 'thief');
  g = apply(g, { t: 'thief-role', role: 'seer' });
  assert.equal(g.roles.p1, 'seer');
  assert.ok(nightSteps(g).some((s) => s.key === 'seer'), 'er wird in derselben Nacht als Seherin aufgerufen');
});

test('Ergebene Magd im Kartenmodus: unbekannte Karte, die Rolle kommt beim Aufdecken', () => {
  const players = Array.from({ length: 6 }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
  let g = createGame({ players, counts: { wolf: 1, maid: 1, seer: 1, villager: 3 }, mode: 'cards' });
  g.roles = { p1: 'wolf', p2: 'maid' };
  g = { ...g, phase: 'day', clock: 'day', day: 1, dayMode: 'vote' };
  g = apply(taps(g, 'p3'), { t: 'day-execute' });
  assert.equal(g.interrupts[0].type, 'maid');
  g = apply(g, { t: 'maid-take' });
  assert.equal(g.interrupts[0].type, 'reveal');
  g = apply(g, { t: 'reveal', role: 'seer' });
  assert.equal(g.roles.p2, 'seer', 'die Magd spielt jetzt die Seherin');
  assert.equal(g.roles.p3, 'seer');
  assert.equal(alive(g, 'p3'), false);
  assert.equal(g.phase, 'night');
  assert.equal(g.pendingMaid, null);
});

test('Ergebene Magd wird Flötenspieler: bisherige Verzauberte bleiben, sie selbst ist nicht mehr verzaubert', () => {
  let g = dayGame({}, ['wolf', 'maid', 'piper', 'villager', 'villager', 'villager']);
  g.enchanted = { p4: true, p2: true };
  g = apply(taps(g, 'p3'), { t: 'day-execute' });
  g = apply(g, { t: 'maid-take' });
  assert.equal(g.roles.p2, 'piper');
  assert.equal(g.enchanted.p2, undefined);
  assert.equal(g.enchanted.p4, true);
  assert.ok(g.log.some((l) => /Neuer Flötenspieler: bisher verzaubert sind P4/.test(l.t)));
});

test('Ergebene Magd bleibt infiziert und verliert Hauptmannsamt und Verzauberung', () => {
  let g = dayGame({}, ['wolf', 'maid', 'seer', 'villager', 'villager', 'villager']);
  g.turned.p2 = true; g.captain = 'p2'; g.enchanted.p2 = true;
  g = apply(taps(g, 'p3'), { t: 'day-execute' });
  g = apply(g, { t: 'maid-take' });
  assert.equal(g.turned.p2, true);
  assert.equal(g.captain, null);
  assert.equal(g.enchanted.p2, undefined);
});

test('Urwolf darf den Alten beim ersten Biss infizieren, nach dem ersten Biss nicht mehr', () => {
  let g = mk(['urwolf', 'wolf', 'elder', 'villager', 'villager', 'villager']);
  g = goKey(g, 'wolf'); g = tap(g, 'p3');
  g = goKey(g, 'urwolf'); g = apply(g, { t: 'infect' });
  g = finishNight(g);
  assert.equal(alive(g, 'p3'), true);
  assert.equal(isWolf(g, 'p3'), true, 'beim ersten Biss infiziert');
  let h = mk(['urwolf', 'wolf', 'elder', 'villager', 'villager', 'villager']);
  h = goKey(h, 'wolf'); h = tap(h, 'p3'); h = finishNight(h);
  assert.equal(alive(h, 'p3'), true);
  h = skipCaptain(h); h = apply(h, { t: 'day-none' });
  h = goKey(h, 'wolf'); h = tap(h, 'p3');
  h = goKey(h, 'urwolf'); h = apply(h, { t: 'infect' });
  assert.equal(h.draft.infect, false, 'nach dem ersten Biss nicht infizierbar');
  h = finishNight(h);
  assert.equal(alive(h, 'p3'), false);
  assert.equal(h.urwolfUsed, false);
});

test('Ergebene Magd darf die Jägerkarte nicht übernehmen: keine Abfrage, der Jäger schießt', () => {
  let g = dayGame({}, ['wolf', 'maid', 'hunter', 'villager', 'villager', 'villager']);
  g = apply(taps(g, 'p3'), { t: 'day-execute' });
  assert.equal(g.interrupts[0].type, 'hunter');
  assert.equal(g.roles.p2, 'maid');
});

test('Ergebene Magd im Kartenmodus: stellt sich der unbekannte Hingerichtete als Jäger heraus, bleibt sie Magd', () => {
  const players = Array.from({ length: 6 }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
  let g = createGame({ players, counts: { wolf: 1, maid: 1, hunter: 1, villager: 3 }, mode: 'cards' });
  g.roles = { p1: 'wolf', p2: 'maid' };
  g = { ...g, phase: 'day', clock: 'day', day: 1, dayMode: 'vote' };
  g = apply(taps(g, 'p3'), { t: 'day-execute' });
  g = apply(g, { t: 'maid-take' });
  g = apply(g, { t: 'reveal', role: 'hunter' });
  assert.equal(g.roles.p2, 'maid');
  assert.equal(g.interrupts[0].type, 'hunter', 'der Jäger schießt trotzdem');
});

test('Weißer Werwolf: Heiler schützt sein Opfer, die Hexe kann es heilen', () => {
  const start = (extra) => {
    let g = mk(['wolf', 'whitewolf', 'guard', 'witch', 'villager', 'villager', 'villager', 'villager']);
    g = { ...g, night: 2 };
    return extra(g);
  };
  const protectedG = finishNight(start((g) => { g = goKey(g, 'guard'); g = tap(g, 'p1'); g = goKey(g, 'whitewolf'); return tap(g, 'p1'); }));
  assert.equal(alive(protectedG, 'p1'), true, 'vom Heiler gerettet');
  const healedG = finishNight(start((g) => { g = goKey(g, 'whitewolf'); g = tap(g, 'p1'); g = goKey(g, 'witch'); return tap(g, 'p1'); }));
  assert.equal(alive(healedG, 'p1'), true, 'von der Hexe geheilt');
  assert.equal(healedG.potions.heal, true);
  const plain = finishNight(start((g) => { g = goKey(g, 'whitewolf'); return tap(g, 'p1'); }));
  assert.equal(alive(plain, 'p1'), false);
});
