// Neumond: Ereigniskarten und Spiritismus-Karten. Das Regelheft beschreibt nur den Ablauf; die Texte sind eigene
// Formulierungen und lassen sich in der App ändern oder ergänzen (Originalkarten bitte selbst eintragen).
// kind: sofort = wird verlesen und gilt sofort, zeit = zeitlich begrenzt (bis zur nächsten Nacht), dauer = dauerhaft.

export const KINDS = { sofort: 'Sofort', zeit: 'Zeitlich begrenzt', dauer: 'Dauerhaft' };
export const KIND_HINT = { sofort: 'gilt jetzt, dann ist sie erledigt', zeit: 'gilt bis zur nächsten Nacht', dauer: 'gilt bis zum Spielende' };

/** Beispielkarten (eigene Texte). `auto` lässt die App einen Hinweis für den Spielleiter berechnen. */
export const SAMPLE_CARDS = [
  { id: 'ev-nebel', sample: true, kind: 'zeit', title: 'Nebel über Düsterwald', text: 'Dichter Nebel zieht auf. Bis zur Nacht wird nur geflüstert.' },
  { id: 'ev-gewitter', sample: true, kind: 'zeit', title: 'Gewitter', text: 'Ein Unwetter zieht auf: Die Diskussionszeit heute ist nur halb so lang.' },
  { id: 'ev-finsternis', sample: true, kind: 'zeit', title: 'Mondfinsternis', text: 'Es wird so dunkel, dass heute mit geschlossenen Augen abgestimmt wird: Alle schließen die Augen und heben nacheinander die Hand.' },
  { id: 'ev-schweigen', sample: true, kind: 'zeit', title: 'Gelübde des Schweigens', text: 'Der Hauptmann bestimmt eine Person, die bis zur Nacht kein Wort sagen darf.' },
  { id: 'ev-hahn', sample: true, kind: 'sofort', title: 'Der Hahn kräht zu früh', text: 'Alle zeigen gleichzeitig auf die Person, der sie heute am meisten misstrauen. Danach beginnt die Diskussion.' },
  { id: 'ev-fehde', sample: true, kind: 'sofort', title: 'Alte Fehde', text: 'Der Hauptmann bestimmt zwei Personen, die sofort die Plätze tauschen.' },
  { id: 'ev-spuren', sample: true, kind: 'sofort', title: 'Wolfsspuren im Schnee', text: 'Der Spielleiter verrät, ob die Zahl der lebenden Werwölfe gerade oder ungerade ist.', auto: 'wolfParity' },
  { id: 'ev-brunnen', sample: true, kind: 'dauer', title: 'Der verfluchte Brunnen', text: 'Ab jetzt beginnt jede Wortmeldung mit den Worten „Beim Mond, ich schwöre“. Wer es vergisst, verliert für diese Runde die Stimme.' },
  { id: 'ev-wache', sample: true, kind: 'dauer', title: 'Wachsames Dorf', text: 'Ab jetzt spricht bei jeder Diskussion zuerst die Person links vom Hauptmann.' },
];

/** Spiritismus-Karten der Zigeunerin (hier „Wahrsagerin“): vier Ja/Nein-Fragen, eigene Texte. `a` = Schlüssel für die automatische Antwort. */
export const SPIRIT_CARDS = [
  { id: 'sp1', qs: [
    { t: 'Leben noch mindestens zwei Werwölfe?', a: 'wolvesMany' },
    { t: 'Ist die zuletzt ausgeschiedene Person ein Werwolf gewesen?', a: 'lastDeadWolf' },
    { t: 'Lebt die Seherin noch?', a: 'seerAlive' },
    { t: 'Ist der Hauptmann ein Werwolf?', a: 'captainWolf' }] },
  { id: 'sp2', qs: [
    { t: 'War die zuerst ausgeschiedene Person ein Werwolf?', a: 'firstDeadWolf' },
    { t: 'Lebt die Hexe noch?', a: 'witchAlive' },
    { t: 'Lebt das Liebespaar noch beide?', a: 'loversAlive' },
    { t: 'Ist schon ein Dorfbewohner ohne Sonderfähigkeit ausgeschieden?', a: 'plainDead' }] },
  { id: 'sp3', qs: [
    { t: 'Lebt der Jäger noch?', a: 'hunterAlive' },
    { t: 'Ist wenigstens ein Drittel der Lebenden Werwolf?', a: 'wolfThird' },
    { t: 'Ist schon jemand mit Sonderfähigkeit ausgeschieden?', a: 'specialDead' },
    { t: 'Ist die zuletzt ausgeschiedene Person ein Werwolf gewesen?', a: 'lastDeadWolf' }] },
  { id: 'sp4', qs: [
    { t: 'Sitzt neben dem Hauptmann ein Werwolf?', a: 'captainNextWolf' },
    { t: 'Leben mehr als zwei Werwölfe?', a: 'wolvesThree' },
    { t: 'Wurde jemand vom Dorfgericht hingerichtet, der kein Werwolf war?', a: 'innocentExecuted' },
    { t: 'Lebt die Seherin noch?', a: 'seerAlive' }] },
  { id: 'sp5', qs: [
    { t: 'Ist der Hauptmann ein Werwolf?', a: 'captainWolf' },
    { t: 'Lebt die Hexe noch?', a: 'witchAlive' },
    { t: 'Lebt der Jäger noch?', a: 'hunterAlive' },
    { t: 'Leben noch mindestens zwei Werwölfe?', a: 'wolvesMany' }] },
];

export const MAX_BEADLE = 5;   // Regelheft: Anfängern höchstens 5 Karten für den Büttel

export const VARIANT_INFO = [
  ['Mondschein', 'Für draußen: Kerzen vor jedem Platz. Morgens erlischt die Kerze des Wolfsopfers, abends die des Hingerichteten. Die App rechnet hier nichts, sie ändert nur die Stimmung.'],
  ['Gemeinschaft der Dörfer', 'Mehrere Dörfer mit je eigenem Spielleiter, Spieler dürfen zwischen den Dörfern umziehen. Läuft parallel, am besten mit einer App pro Dorf.'],
  ['Die sprechende Mauer', 'Alle schreiben anonym einen kurzen Satz auf einen Zettel, der Spielleiter liest sie vor dem Schlafengehen vor. Kombinierbar mit anderen Varianten.'],
  ['Der schwarze Tod', 'Geheime Variante nur für den Spielleiter: Es gibt keine echten Werwölfe, jedes Opfer wird nachts von der zuvor ausgeschiedenen Person bestimmt, als wären es die Wölfe. Läuft ohne App-Unterstützung.'],
  ['Doppel-Ich', 'Jeder spielt zwei Karten (eine offene Rolle und eine geheime Gesinnung). Noch nicht in der App; Vorschlag für später.'],
];
