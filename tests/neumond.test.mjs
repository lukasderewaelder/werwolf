import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, apply, nightSteps, checkWinner, alive, spiritAnswer, voucherVictim } from '../src/engine/game.js';
import { SPIRIT_CARDS } from '../src/engine/events.js';

const CARDS = [
  { id: 'a', kind: 'sofort', title: 'Sofort-Karte', text: 'Text A' },
  { id: 'b', kind: 'zeit', title: 'Zeit-Karte', text: 'Text B' },
  { id: 'c', kind: 'dauer', title: 'Dauer-Karte', text: 'Text C' },
  { id: 'd', kind: 'sofort', title: 'Vierte Karte', text: 'Text D' },
  { id: 'e', kind: 'sofort', title: 'Fünfte Karte', text: 'Text E' },
];

/** Digitalspiel mit festen Rollen; deck = Reihenfolge der Ereigniskarten (ohne Mischen). */
function mk(roleList, rules = {}, { deck = null, beadleIds = [] } = {}) {
  const counts = {};
  for (const r of roleList) counts[r] = (counts[r] || 0) + 1;
  const players = roleList.map((_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
  const g = createGame({ players, counts, mode: 'digital', rules, eventCards: CARDS, beadleIds });
  g.roles = Object.fromEntries(players.map((p, i) => [p.id, roleList[i]])); g.middle = [];
  if (deck && g.ev) g.ev.deck = deck.map((id) => ({ ...CARDS.find((c) => c.id === id) }));
  return g;
}
const goKey = (g, key) => { const i = nightSteps(g).findIndex((s) => s.key === key); assert.ok(i >= 0, `Schritt ${key} fehlt`); return apply(g, { t: 'goto', idx: i }); };
const tap = (g, ...ids) => ids.reduce((x, id) => apply(x, { t: 'tap', pid: id }), g);
const finishNight = (g) => { let x = g; for (let i = 0; i < 60 && x.phase === 'night'; i++) x = apply(x, { t: 'next' }); return x; };
/** Tag ohne Hinrichtung beenden, danach beginnt die nächste Nacht. */
const passDay = (g) => apply(g.dayMode === 'captain' ? apply(g, { t: 'skip-captain' }) : g, { t: 'day-none' });
const ROLES8 = ['wolf', 'seer', 'villager', 'villager', 'villager', 'villager', 'villager', 'villager'];

test('Ereigniskarten: erste Nacht ohne Karte, ab Nacht 2 zieht der Morgen eine, Vorleser ist der zuletzt Ausgeschiedene', () => {
  let g = mk(ROLES8, { events: true }, { deck: ['a', 'b', 'c'] });
  assert.equal(g.ev.deck.length, 3);
  g = finishNight(g);
  assert.equal(g.ev.shown.length, 0, 'Morgen 1: keine Karte');
  g = passDay(g);
  g = goKey(g, 'wolf'); g = tap(g, 'p5');
  g = finishNight(g);
  assert.equal(g.ev.shown.length, 1);
  assert.equal(g.ev.shown[0].id, 'a');
  assert.match(g.ev.shown[0].by, /P5/);
  assert.equal(g.ev.deck.length, 2);
  assert.equal(g.ev.active.length, 0, 'Sofort-Karten bleiben nicht aktiv');
});

test('Ereigniskarten: Wirkdauer – zeitlich begrenzte Karten enden am Abend, dauerhafte bleiben', () => {
  let g = mk(ROLES8, { events: true }, { deck: ['b', 'c', 'a'] });
  g = passDay(finishNight(g));
  g = finishNight(g);
  assert.equal(g.ev.active.map((c) => c.id).join(), 'b');
  g = passDay(g);
  assert.equal(g.ev.active.length, 0, 'Zeit-Karte endet mit dem Tag');
  g = finishNight(g);
  assert.equal(g.ev.active.map((c) => c.id).join(), 'c');
  g = passDay(g);
  assert.equal(g.ev.active.map((c) => c.id).join(), 'c', 'Dauer-Karte bleibt');
  g = apply(g, { t: 'ev-end', id: 'c' });
  assert.equal(g.ev.active.length, 0);
});

test('Ereigniskarten: Anfängermodus zieht nur jeden zweiten Morgen', () => {
  let g = mk(ROLES8, { events: true, eventEvery: 2 }, { deck: ['a', 'd', 'e'] });
  const drawn = [];
  for (let n = 1; n <= 4; n++) { g = finishNight(g); drawn.push(g.ev.shown.length); g = passDay(g); }
  assert.deepEqual(drawn, [0, 1, 0, 1], 'Morgen 2 und 4');
});

test('Ereigniskarten: aus, wenn die Regel nicht an ist; Stapel leer geht ohne Fehler', () => {
  let g = mk(ROLES8, {}, { deck: [] });
  assert.equal(g.ev, null);
  g = finishNight(g); g = passDay(g); g = finishNight(g);
  assert.equal(g.phase, 'day');
  let h = mk(ROLES8, { events: true }, { deck: [] });
  h = passDay(finishNight(h)); h = finishNight(h);
  assert.equal(h.ev.shown.length, 0);
});

test('Büttel: Karten des Büttels liegen nicht im Stapel, Verkündung zeigt sie, Hauptmann kann nicht Büttel sein', () => {
  let g = mk(ROLES8, { events: true }, { beadleIds: ['c', 'd'] });
  assert.equal(g.ev.hand.length, 2);
  assert.ok(!g.ev.deck.some((c) => ['c', 'd'].includes(c.id)));
  g = finishNight(g);
  g = apply(g, { t: 'set-captain', pid: 'p3' });
  g = apply(g, { t: 'beadle-set', pid: 'p3' });
  assert.equal(g.ev.beadle, null, 'Hauptmann darf nicht Büttel werden');
  g = apply(g, { t: 'beadle-set', pid: 'p4' });
  assert.equal(g.ev.beadle, 'p4');
  g = apply(g, { t: 'beadle-announce', id: 'c' });
  assert.equal(g.ev.shown[0].id, 'c');
  assert.equal(g.ev.hand.length, 1);
  assert.equal(g.ev.active[0].id, 'c', 'Dauerkarte wirkt jetzt');
  g = apply(g, { t: 'set-captain', pid: 'p4' });
  assert.equal(g.ev.beadle, null, 'Wird der Büttel Hauptmann, gibt er das Amt ab');
});

test('Büttel: stirbt er, ist das Amt frei', () => {
  let g = mk(ROLES8, { events: true });
  g = finishNight(g);
  g = apply(g, { t: 'beadle-set', pid: 'p4' });
  g = apply(g, { t: 'manual-kill', pid: 'p4' });
  assert.equal(g.ev.beadle, null);
  assert.ok(g.morning.some((m) => /Büttel/.test(m)));
});

test('Wahrsagerin: Spiritismus-Karte, Frage und Medium landen im Morgen, die Karte ist danach verbraucht', () => {
  let g = mk(['wolf', 'seer', 'medium', 'villager', 'villager', 'villager', 'villager'], {});
  assert.equal(g.ev.spirit.length, SPIRIT_CARDS.length);
  g = passDay(finishNight(g));
  g = goKey(g, 'wolf'); g = tap(g, 'p6');                 // erstes Opfer, damit jemand antworten kann
  g = goKey(g, 'medium');
  g = apply(g, { t: 'seance', v: true });
  g = apply(g, { t: 'seance-card', id: 'sp1' });
  g = apply(g, { t: 'seance-q', i: 0 });
  g = tap(g, 'p4');
  assert.equal(g.draft.medium, 'p4');
  g = finishNight(g);
  const note = g.morning.find((m) => /Spiritismus-Sitzung/.test(m));
  assert.ok(note, 'Notiz fehlt');
  assert.match(note, /P4 ist das Medium/);
  assert.match(note, /Leben noch mindestens zwei Werwölfe/);
  assert.match(note, /P6 \(zuerst ausgeschieden\)/);
  assert.match(note, /NEIN/);                              // nur ein Wolf lebt
  assert.ok(!g.ev.spirit.includes('sp1'));
});

test('Wahrsagerin: ohne Karte oder bei „Nein“ bleibt es beim einfachen Hinweis', () => {
  let g = mk(['wolf', 'seer', 'medium', 'villager', 'villager', 'villager', 'villager'], {});
  g = passDay(finishNight(g));
  g = goKey(g, 'medium'); g = apply(g, { t: 'seance', v: true });
  g = finishNight(g);
  assert.ok(g.morning.some((m) => /Geisterbeschwörung/.test(m)));
  assert.equal(g.ev.spirit.length, SPIRIT_CARDS.length);
});

test('Spiritismus-Antworten werden aus dem Spielstand berechnet', () => {
  const g = mk(['wolf', 'wolf', 'seer', 'witch', 'hunter', 'villager', 'villager', 'villager'], {});
  assert.equal(spiritAnswer(g, 'wolvesMany'), true);
  assert.equal(spiritAnswer(g, 'seerAlive'), true);
  assert.equal(spiritAnswer(g, 'lastDeadWolf'), null, 'noch niemand ausgeschieden');
  assert.equal(spiritAnswer(g, 'unbekannt'), null);
});

test('Betörung: Wolfsopfer stirbt nicht, ist betört, verliert Fähigkeiten und wird dem Spielleiter gemeldet', () => {
  let g = mk(['wolf', 'seer', 'villager', 'villager', 'villager', 'villager', 'villager'], { charm: true });
  g = goKey(g, 'wolf'); g = tap(g, 'p2');
  g = finishNight(g);
  assert.deepEqual(g.lastDeaths, []);
  assert.equal(g.charmed.p2, true);
  assert.ok(alive(g, 'p2'));
  assert.ok(g.morning.some((m) => /Berühre unauffällig am Kopf: P2/.test(m)));
  g = passDay(g);
  const seer = nightSteps(g).find((s) => s.key === 'seer');
  assert.equal(seer.act, null, 'Betörte Seherin hat keine Aktion mehr');
  g = goKey(g, 'wolf'); g = tap(g, 'p2');
  assert.equal(g.draft.kill, null, 'Schon Betörte sind kein Ziel');
});

test('Betörung: Hinrichtung eines Betörten lässt alle Betörten ausscheiden, Wölfe gewinnen beim vorletzten betörten Dorfbewohner', () => {
  let g = mk(['wolf', 'seer', 'villager', 'villager', 'villager', 'villager', 'villager'], { charm: true });
  g = goKey(g, 'wolf'); g = tap(g, 'p3'); g = finishNight(g);
  g = passDay(g);
  g = goKey(g, 'wolf'); g = tap(g, 'p4'); g = finishNight(g);
  assert.ok(g.charmed.p3 && g.charmed.p4);
  g = apply(g, { t: 'skip-captain' });
  g = apply(apply(g, { t: 'tap', pid: 'p3' }), { t: 'day-execute' });
  assert.ok(!alive(g, 'p3') && !alive(g, 'p4'), 'alle Betörten tot');
  assert.equal(g.dead.p4.cause, 'charm');

  let h = mk(['wolf', 'villager', 'villager', 'villager'], { charm: true });
  h = goKey(h, 'wolf'); h = tap(h, 'p2'); h = finishNight(h);
  assert.equal(h.phase, 'day', 'noch zwei unbetörte Dorfbewohner');
  h = passDay(h);
  h = goKey(h, 'wolf'); h = tap(h, 'p3'); h = finishNight(h);
  assert.equal(h.winner, 'Die Werwölfe', 'nur noch ein unbetörter Dorfbewohner');
});

test('Betörung: Heilung und Schutz verhindern sie wie einen Tod', () => {
  let g = mk(['wolf', 'witch', 'villager', 'villager', 'villager', 'villager'], { charm: true });
  g = goKey(g, 'wolf'); g = tap(g, 'p3');
  g = goKey(g, 'witch'); g = tap(g, 'p3');
  g = finishNight(g);
  assert.deepEqual(g.charmed, {});
});

test('Erntefest: Wölfe reißen nur Nachbarn von Wölfen', () => {
  let g = mk(['wolf', 'villager', 'villager', 'villager', 'villager', 'villager'], { harvest: true });
  g = goKey(g, 'wolf'); g = tap(g, 'p4');
  assert.equal(g.draft.kill, null, 'P4 sitzt nicht neben dem Wolf');
  g = tap(g, 'p2');
  assert.equal(g.draft.kill, 'p2');
});

test('Erntefest: Flötenspieler verzaubert nur eine Person, Jäger schießt nur auf Nachbarn', () => {
  let g = mk(['wolf', 'piper', 'villager', 'villager', 'villager', 'villager'], { harvest: true });
  g = goKey(g, 'piper'); g = tap(g, 'p3', 'p4');
  assert.deepEqual(g.draft.enchant, ['p3']);
  let h = mk(['wolf', 'hunter', 'villager', 'villager', 'villager', 'villager'], { harvest: true });
  h = apply(finishNight(h), { t: 'manual-kill', pid: 'p2' });
  assert.equal(h.phase, 'interrupt');
  h = tap(h, 'p5');
  assert.equal(h.phase, 'interrupt', 'P5 sitzt nicht neben dem Jäger');
  h = tap(h, 'p3');
  assert.ok(!alive(h, 'p3'));
});

test('Bürgen-Abstimmung: der Einzige, der noch steht, ist das Opfer', () => {
  let g = mk(['wolf', 'villager', 'villager', 'villager', 'villager'], { voucher: true });
  g = finishNight(g); g = apply(g, { t: 'skip-captain' });
  g = apply(g, { t: 'vote-mode', mode: 'voucher' });
  g = tap(g, 'p2', 'p3', 'p4');
  assert.equal(voucherVictim(g), null, 'noch zwei stehen');
  g = tap(g, 'p5');
  assert.equal(voucherVictim(g), 'p1');
  assert.equal(g.draft.vote, 'p1');
  g = apply(g, { t: 'day-execute' });
  assert.ok(!alive(g, 'p1'));
  assert.equal(g.winner, 'Das Dorf');
});

test('Bürgen: Antippen einer sitzenden Person nimmt sie zurück', () => {
  let g = mk(['wolf', 'villager', 'villager', 'villager'], { voucher: true });
  g = finishNight(g); g = apply(g, { t: 'skip-captain' });
  g = apply(g, { t: 'vote-mode', mode: 'voucher' });
  g = tap(g, 'p2', 'p3', 'p2');
  assert.deepEqual(g.draft.sit, ['p3']);
});

test('Standardregeln bleiben unverändert: ohne Varianten keine Betörung, keine Ereignisse', () => {
  let g = mk(['wolf', 'seer', 'villager', 'villager', 'villager'], {});
  g = goKey(g, 'wolf'); g = tap(g, 'p2'); g = finishNight(g);
  assert.deepEqual(g.lastDeaths, ['p2']);
  assert.equal(g.ev, null);
  assert.equal(checkWinner(g), null);
});
