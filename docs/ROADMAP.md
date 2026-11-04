# Meilensteine ab M7

Bis M6 ist alles erledigt und live (Engine, Oberfläche, PWA, Nachtmusik, Installationsknopf). Ab hier gilt der Ablauf:

1. Ich setze genau einen Meilenstein um, mit Tests (`npm test` und `npm run test:e2e` grün).
2. Ich pushe direkt auf `main`, Pages liefert nach rund einer Minute aus.
3. Ich frage dich, ob alles funktioniert, und gebe dir eine kurze Abnahmeliste. Erst nach deinem „passt“ beginnt der nächste Meilenstein. Fehler behebe ich zuerst.

Stand der Umsetzung steht hinter jeder Überschrift.

## M7 Gerätetest-Paket (abgenommen)
Ziel: Du kannst die App auf iPad, iPhone und Android prüfen und siehst bei Problemen sofort, woran es liegt.
- Diagnoseseite in den Optionen: Version, Service Worker, Offline-Bereitschaft (Dateien im Speicher), installiert ja/nein, Speicher dauerhaft, Ton und Musik, Bildschirmgröße, Testton.
- Lautstärkeregler, Töne- und Musikschalter direkt im Spiel (Menü), Musikknopf in der Kopfleiste.
- Musik und Töne pausieren, wenn die App in den Hintergrund geht. Der Timer rechnet danach richtig weiter.
- Dauerhaften Speicher anfragen, damit iOS und Android den Spielstand nicht aufräumen.
- Versionsanzeige in den Optionen.

Abnahme (du): Installieren, Flugmodus an, App starten, Diagnoseseite zeigt „bereit für Offline“, Musik in Nacht 1 hörbar, Lautstärke regelbar, Wechsel in eine andere App stoppt die Musik.

## M8 Android-Layout und Sound-Auswahl (abgenommen, mit Nachbesserungen aus M9)
Teil A: Layout auf Android (Meldung: manchmal muss man scrollen, Knöpfe unten sind abgeschnitten)
- Höhen robuster: Rückfall für ältere Browser, kompakter Modus für niedrige Fenster, Querformat am Handy mit zwei Spalten.
- Wichtige Knöpfe bleiben immer sichtbar: Hinrichten, Gleichstand, Niemand, Antworten bei Jäger, Hauptmann, Sündenbock und Magd sitzen in einer festen Fußleiste. In Dialogen klebt „Schließen“ am unteren Rand.
- Diagnoseseite zeigt Fensterhöhe, sichtbaren Bereich, Bildschirmhöhe und Sicherheitsabstände, damit ich auf einem echten Gerät sehe, woran es liegt.
- Tests mit Android-Fenstergrößen (360×640, 393×727, Querformat 727×393): alle Hauptknöpfe liegen vollständig im Fenster.

Teil B: Töne, jetzt als Auswahl
- Du hast die Vorschläge in [docs/SOUND-AUSWAHL.md](SOUND-AUSWAHL.md) bekommen (je Ereignis drei Alternativen mit Hör-Link, dazu Nacht- und Tagmusik).
- Gewählt: Wolf A, Hahn B, Gong B, Glocke A, Tod B, Sieg A, Nachtmusik A + C, Tagmusik A + C. Eingebaut mit den Freesound-Vorschauen; die Originale folgen in M16.
- (Plan war:) Dateien laden (Freesound-Stücke nur nach deiner Freigabe), zuschneiden, in MP3 umwandeln, einbauen. Neue Ereignisse: Tod eines Spielers, Spielende, optional Tagmusik.
- Quellenangaben in den Optionen und in docs/QUELLEN.md ergänzen.

Abnahme: Auf deinem Android-Handy ist in jeder Ansicht (Start, Assistent, Nacht, Tag, Dialoge) der untere Knopf ohne Scrollen sichtbar. Die gewählten Töne klingen stimmig und passen zur Lautstärke der Musik.

## M9 Abstimmung und Überblick (abgenommen)
- Stimmenzähler: Stimmen pro Person erfassen mit doppelter Stimme des Hauptmanns, +2 des Raben, Dorfdepp ohne Stimmrecht, eingeschränkte Wähler des Sündenbocks. Ergebnis und Gleichstand erkennt die App selbst.
- Dauerhafte Anzeige im Spiel: Wölfe gegen Rest, wer noch lebt.
- Hauptmannswahl ebenfalls per Stimmenzähler.

Umgesetzt: Stimmenzähler (für jede Hand im Kreis antippen, Zahl am Stein, Rangliste, „Stimme des Hauptmanns“ doppelt, Rabe +2, Dorfdepp und Sündenbock-Wähler begrenzen die Zahl der Hände), Hauptmannswahl mit demselben Zähler, Umschalter „Direkt wählen“, Zähler-Leiste (Wölfe gegen Rest, wer lebt).
Nachbesserungen aus deiner Abnahme von M8: Wolfsheulen beim Erwachen aller Wölfe (auch Urwolf, Großer böser Wolf, Weißer Werwolf), Hexe mit festen Trankknöpfen samt Opfer-Anzeige, Seherin nach den Wölfen bei „Werwolf oder nicht“ (Fuchs in Nacht 1 im Kartenmodus ebenso).

Abnahme: Eine Abstimmung mit 10 Spielern läuft ohne Kopfrechnen, der Gleichstand wird erkannt.

## M10 Regel-Randfälle (umgesetzt, wird beim Spielen geprüft)
Mit Tests je Fall, Quelle ist das Regelheft:
- Urwolf und Alter, Ergebene Magd mit Amor und Flötenspieler, Heiler gegen den Weißen Werwolf, Jäger bei Liebeskummer, Wildes Kind und Wolfshund als Hauptmann, Dieb mit zwei Wölfen in der Mitte.
- Ich nenne dir vorher jede Stelle, an der das Regelheft nicht eindeutig ist, und du entscheidest.

Umgesetzt und mit Tests belegt:
- Dieb mit zwei Werwölfen in der Mitte muss einen nehmen, Abwählen stellt die Karten wieder her.
- Ergebene Magd: im Kartenmodus bekommt sie die Rolle, sobald die Karte aufgedeckt ist. Infektion bleibt, Hauptmannsamt und Verzauberung nicht. Als Flötenspieler erfährt der Spielleiter die bisher Verzauberten.
- Jäger verliebt: stirbt der Partner, schießt der Jäger noch. Sterben dadurch alle, gewinnt niemand.
Deine Entscheidungen: Urwolf darf den Alten beim ersten Biss infizieren, danach nicht. Die Magd darf die Jägerkarte nicht übernehmen. Heiler-Schutz und Heiltrank wirken auch gegen den Weißen Werwolf. Die Seherin sieht beim Infizierten nur die Karte (bei „Werwolf oder nicht“ gilt er als Werwolf).
Festgelegt ohne Rückfrage (ändere es, wenn es dich stört): Stirbt der Alte an Liebeskummer, behält das Dorf seine Fähigkeiten, denn das Regelheft nennt nur Abstimmung, Gifttrank und Jägerschuss.

Abnahme: Du spielst die Fälle durch, die dich interessieren, und bestätigst das Verhalten.

## M11 Bedienung (umgesetzt, wartet auf deine Abnahme)
- Sitzordnung per Ziehen und Vorschau des Kreises schon beim Einrichten.
- Spielerblatt per langem Tippen auf den Stein.
- Sperrbildschirm („Display nach unten“) mit kurzem Code.
- Spiel pausieren, mehrere Spielstände, Spielstand löschen.
- Protokoll teilen oder als Datei speichern.

Umgesetzt:
- Sitzordnung: Kreis-Vorschau, Plätze per Ziehen oder durch Antippen zweier Personen tauschen (Liste mit Pfeilen bleibt).
- Spielerblatt per langem Tippen (eine halbe Sekunde) auf den Stein.
- Sperrbildschirm mit vierstelliger PIN: im Spielmenü „Bildschirm sperren“, PIN in den Optionen festlegen oder ändern. Bleibt nach dem Neuladen gesperrt, zeigt keine Namen oder Rollen. Nach fünf Fehlversuchen 30 Sekunden Pause. „PIN vergessen“ löscht sie erst nach 30 Sekunden Wartezeit. Die PIN steht nie in der Sicherungsdatei.
- Pausieren: Spielmenü „Pausieren und später weiterspielen“, bis zu 12 Spielstände auf der Startseite mit Weiter und Löschen. Läuft ein Spiel, wenn du ein neues startest, fragt die App: pausieren oder verwerfen.
- Protokoll: Teilen, als Textdatei speichern oder kopieren.
- Zusätzlich behoben: Android: Fußleiste unten abgeschnitten (App nimmt das kleinste Höhenmaß des Browsers, Optionen: einstellbarer unterer Abstand mit gelbem Streifen als Lineal).

Abnahme: Eine Partie mit 20 Personen lässt sich ohne Umwege einrichten und leiten.

## M11b Handy-Layout (abgenommen, Zyklus 1 und 2)
- Zyklus 1: Rollenreihe und Karte werden nicht mehr gequetscht (es scrollt nur der Bereich dazwischen), 5 Spieler passen am Handy in eine Reihe, Höhen richten sich nach der gemessenen App-Höhe, nutzbarer Bildschirm als zusätzliche Obergrenze, gelber Streifen und Regler „Unterer Abstand“ entfernt, Diagnose zeigt Höhen und Unterkanten der Spielansicht.
- Zyklus 2: Abstände und Größen am Handy feiner abgestimmt, Rollenbeschriftungen unter den Spielern werden gekürzt statt zu überlappen.

## M12 Neumond: Ereigniskarten (umgesetzt, wartet auf deine Abnahme)
- Entscheidung: zuerst das Gerüst (Ziehen am Morgen, Wirkdauer sofort / zeitlich begrenzt / dauerhaft, Büttel, Zigeunerin mit Spiritualismus-Karten, Karteneditor, ein paar Beispielkarten). Die 36 Originaltexte stehen nicht im Regelheft, die Karten folgen später.
- Varianten als wählbare Spielregel: Neumond (Ereigniskarten), Lykanthropische Betörung, Erntefest, Schwarzer Tod, „Er ist es ganz sicher nicht“ (Bürgen-Abstimmung), Doppel-Ich. Mondschein, Gemeinschaft der Dörfer und Sprechende Mauer nur als Hinweistext.
- Auswahl der aktiven Karten beim Einrichten, Ziehen am Morgen.

Umgesetzt (alles in Regeln und Start oder Optionen unter „Neumond und Varianten“ einzeln schaltbar):
- Ereigniskarten: ab dem zweiten Morgen zieht die App eine Karte, der zuletzt Ausgeschiedene liest sie vor. Wirkdauer sofort, zeitlich begrenzt (endet am Abend) oder dauerhaft (bis „Beenden“). Anfängermodus: jeden 2. oder 3. Morgen. Neun Beispielkarten mit eigenen Texten, eigene Karten anlegen und bearbeiten, Karten abwählen (Dialog „Karten und Büttel“). Menü im Spiel: „Ereigniskarten“ (Stapel, was wirkt, Karte außer der Reihe ziehen).
- Büttel: Karten für den Büttel (höchstens 5) liegen nicht im Stapel, der Hauptmann ernennt ihn, er verkündet am Tag eine Karte. Hauptmann und Büttel sind nie dieselbe Person, stirbt der Büttel, ist das Amt frei.
- Wahrsagerin (Zigeunerin): fünf Spiritismus-Karten mit je vier Ja/Nein-Fragen (eigene Texte). In der Nacht wählst du Karte, Frage und Medium; der Morgen nennt Medium, Frage und den zuerst Ausgeschiedenen, der antwortet. Wo möglich, errechnet die App die richtige Antwort.
- Lykanthropische Betörung: Wolfsopfer sind betört (Zeichen am Stein, Meldung nur für dich), verlieren ihre Fähigkeiten, Hinrichtung eines Betörten lässt alle Betörten ausscheiden, die Wölfe gewinnen beim vorletzten unbetörten Dorfbewohner.
- Erntefest: Wölfe reißen nur Nachbarn von Wölfen, Jäger und Heiler wirken nur auf Nachbarn, der Flötenspieler verzaubert eine Person, die Seherin sieht die Rollen ihrer Nachbarn ungeordnet. Hexe, Hauptmann, Sündenbock und Amor führst du selbst.
- „Er ist es ganz sicher nicht“: dritte Abstimmungsart „Bürgen“, die App merkt die Reihenfolge der Sitzenden und nennt das Opfer.
- Mondschein, Gemeinschaft der Dörfer, Sprechende Mauer und Schwarzer Tod nur als Hinweistexte (die App rechnet dort nichts).
Offen: Doppel-Ich (zwei Karten pro Spieler) ist noch nicht umgesetzt. Die 36 Originalkarten stehen nicht im Regelheft; du kannst sie als eigene Karten eintragen.

Abnahme: Eine Partie mit Ereigniskarten läuft durch (Karte am zweiten Morgen, Büttel, Wahrsagerin), eine kurze Partie mit Betörung und eine mit „Bürgen“ funktionieren wie im Regelheft.

## M13 Die Gemeinde (umgesetzt, wartet auf deine Abnahme)
- Gebäude und Berufe, Brandstifter, Rabe mit anonymem Brief nach Originalregel, Vogt, Wirt, Bäcker, Barbier u. a.
- Zuordnung der Gebäude beim Start, Anzeige am Spielerstein.

Umgesetzt (Regel „Die Gemeinde“ unter Neumond und Varianten, Gebäude je Art wählbar):
- Gebäude und Berufe: Bauernhof (Bauern), Kirche (Beichtvater), Bruchbude (Quacksalber), Bäckerei (Bäcker), Barbierladen (Barbier), Wirtshaus (Wirt), Herrensitz (Schlossherr), Schulhaus (Lehrerin), Haus des Vogts (Vogt). Beim Start verteilt die App die Gebäude zufällig, du änderst sie durch Antippen. Kürzel am Spielerstein, Übersicht im Menü „Die Gemeinde“. Wer kein Gebäude hat, ist Vagabund.
- Bauern: Hauptmann erst ab der zweiten Runde und nur unter Bauern, ohne Bauern kein Hauptmann mehr.
- Wirt: nicht fressbar, nicht ausscheidbar, „Stimme des Wirts“ im Abstimmungsfeld; stimmt er gegen jemanden, der ausscheidet (auch bei Begnadigung), verliert er den Schutz.
- Lehrerin schließt bis zu zwei Personen aus (keine Vagabunden), stimmt selbst nie ab. Schlossherr begnadigt einmal. Barbier schaltet einmal eine Person aus (Wolf: er überlebt, sonst scheidet er mit aus; keine Vagabunden). Beichtvater und Quacksalber als einmalige Fähigkeiten im Gemeinde-Dialog. Vogt weist freie Gebäude Vagabunden zu. Bäcker hat einen eigenen Nachtschritt nach den Wölfen.
- Brandstifter (neue Rolle, braucht die Gemeinde): einmal ein Gebäude anzünden, es brennt am Morgen nieder, der Bewohner wird Vagabund. Beim Haus des Wolfsopfers verbrennt der nächste Werwolf entgegen dem Uhrzeigersinn, es gibt kein Opfer. Rabe kann keine Vagabunden belasten.
Deine Entscheidungen: Ein neuer Bewohner darf eine schon benutzte einmalige Fähigkeit wieder nutzen; „zur Rechten“ ist entgegen dem Uhrzeigersinn.
Bekannt: Schlossherr-Knopf nur im Modus „Stimmen zählen“; Wirt-Immunität und Bürgen-Abstimmung zusammen sind nicht abgestimmt.

Abnahme: Eine Partie mit Gebäuden läuft durch (Verteilen, Wirt, Lehrerin, Barbier, Brandstifter).

## M14 Eigene Rollen mit Aktion (umgesetzt, wartet auf deine Abnahme)
Umgesetzt: Eigene Rollen haben eine frei wählbare Nachtaktion (Person markieren, töten, vor den Wölfen schützen oder erfahren, ob sie ein Werwolf ist), optional mit Selbstwahl; Aufruf jede Nacht, jede zweite, nur in der ersten oder Aktion nur einmal im Spiel; Siegbedingung (mit dem Lager, allein als Letzter, Überleben und Mitgewinn); Symbol aus 24 Emojis statt Buchstabe (kein Foto, Entscheidung). Menü „Karten in der Mitte“ zeigt Mittelkarten von Dieb und Gaukler jederzeit. Grenze: je eigene Rolle genau eine Aktion; Foto nicht umgesetzt.
- Eigene Rollen mit Zielwahl und eigener Siegbedingung, eigenes Bild (Symbol oder Foto).
- Mittelkarten von Gaukler und Dieb sichtbar, auch im Modus ohne Karten.

Abnahme: Eine selbst gebaute Rolle mit Aktion funktioniert in einer Partie.

## M14b Eigene Rollen aus Bausteinen (umgesetzt, wartet auf deine Abnahme)
Umgesetzt: Eine eigene Rolle besteht aus bis zu 8 Bausteinen, jeder ein eigener Nachtschritt mit Zielzahl 1–3, Zeitpunkt (jede Nacht, nur Nacht 1, ab Nacht 2, jede zweite), Grenze (unbegrenzt bis dreimal), Selbstwahl und „nicht zweimal dieselbe Person“. Aktionen: töten, schützen, markieren, Werwolf prüfen, echte Rolle erfahren, stumm schalten (Stimmrecht weg), Fähigkeit sperren (nächste Nacht), Rollen tauschen, verlieben, zum Werwolf machen, in feste Rolle verwandeln, Gestorbene wiederbeleben, Ziel festlegen. Passive: übersteht ersten Wolfsangriff, gilt als Werwolf für Fuchs/Bär/Prüfungen, Rache beim Tod, stirbt mit seinem Ziel; erbt eine Rolle, wenn sie stirbt. Siege: Ziel lebt am Ende, Ziel ausgeschieden, Narr (Hinrichtung), optional nur nach Einsatz der Fähigkeit. Alte Rollen mit einer Aktion laufen unverändert weiter.
Grenzen: Wiederbelebte behalten Rolle und Verliebte-Bindung; Tausch und Verwandlung brauchen bekannte Karten (im Kartenmodus erst nach Zuordnung).

Abnahme: Eine Rolle mit zwei Bausteinen und einer passiven Eigenschaft funktioniert in einer Partie.

## M14c Weitere Bausteine aus der Recherche (umgesetzt, wartet auf deine Abnahme)
Neu: Leibwächter (stirbt an Stelle des Schützlings), Erfolgschance an jedem Baustein (die App würfelt, Ergebnis nur für den Spielleiter), Siegbedingungen „stirbt“ und „von den Wölfen getötet“, Sektenführer (Anwerben, Sieg wenn alle Lebenden dazugehören), Beobachter (wer hat das Ziel besucht), Wachsam (unangreifbar, Besucher sterben), Tagesfähigkeiten Schuss, Einsperren und Hinrichten über die Karte „Fähigkeiten am Tag“.
Grenzen: Besucher zählen die Wölfe, Seherin, Heiler, Hexe, Rabe und alle eigenen Bausteine; Sektenmitglieder stehen nur im Verlauf und in den Morgenhinweisen; Brandstifter mit verzögertem Entflammen und Zylinderwolf sind nicht umgesetzt.

## M14d Einheitliches Erscheinungsbild und neue Anleitung (umgesetzt, wartet auf deine Abnahme)
Umgesetzt: Schriftskala mit sechs Stufen (am Handy kleiner), Serifenschrift nur für Titel, Namen und Ansagen, keine festen Inline-Größen mehr, einheitliche Rundungen. Am Handy kompaktere Knöpfe (44 px, Hauptknopf 48 px), Chips, Eingaben und Kacheln. Anleitung neu: acht Kapitel mit nummerierten Schritten und Hinweiskästen, bündiger Text, neues Kapitel „App installieren“ für iPhone/iPad und Android (erkanntes Gerät zuerst), derselbe Text im Installationsdialog.

Abnahme: Anleitung und die Hauptansichten wirken am Handy aus einem Guss.

## M14e Regel-System und Rollen-Werkstatt, Etappe E1 (umgesetzt, wartet auf deine Abnahme)
Umgesetzt: Fähigkeiten eigener Rollen sind Regeln mit Bedingungsbaum (Gruppen „Alle müssen gelten“ / „Eine reicht“, bis 3 Ebenen), Nebenwirkungen (Spielleiter-Hinweis, Fähigkeit ruht, stirbt selbst) und der Wirkung „Spielleiter-Hinweis“. Rollen-Werkstatt als eigene Seite: Live-Vorschau im Klartext, Reiter Grundlagen · Fähigkeiten · Eigenschaften · Sieg, Satzbaukasten mit antippbaren Lücken, Auswahlblätter ohne Listen, 10 Vorlagen. Nachts ein Schritt je Rolle mit allen Fähigkeiten untereinander; Wachsam und Hinweise per Knopf. Besuch zählt standardmäßig nur bei den Werwölfen, je Regel „zählt als Besuch“. Kein Springen mehr: gleiche Ansicht wird ohne Einblendung neu gezeichnet, Dialoge behalten die Scrollposition. Alte eigene Rollen werden automatisch umgerechnet.
E2 umgesetzt (wartet auf Abnahme): Angriffe mit Stärke (normal, durchdringend, unaufhaltbar) gegen Schutz (normal, stark; Heiler zählt als normal); Wirkungen Besuchen, Einladen, Umlenken, Platz tauschen, Lockvogel, Fluch (Angriff in der nächsten Nacht), Falle (wen, ab wann); Auslöser ohne Nachtschritt: angegriffen, Ziel angegriffen, besucht, Gastgeber stirbt, stirbt, hingerichtet, mit Wirkungen überlebt, greift an (Angreifer, Besucher, Gastgeber, Ziel, nach Wahl), wird selbst angegriffen, Schild, Hinweis; Bedingungen der Lage (unterwegs, zu Hause, Besucherzahl, Partei lebt, noch nie getötet, heute eingesetzt, Angreifer ist Wolf); Zielfilter (Partei, mit/ohne Fähigkeit, jede Person nur einmal); Vorlagen Dorfmatratze, Schattenwache, Fallensteller, Lockvogel. Grenzen: Auslöser „stirbt“ nimmt Personen direkt mit (ohne Schutzprüfung); Umlenken betrifft nur Angriffe, nicht Prüfungen.
E3 umgesetzt (wartet auf Abnahme): Auskünfte sofort im Nachtschritt (Partei, gleiche Partei, Wölfe zählen, drei Rollen, Rolle lebt, Rolle im Spiel, Rolle und Todesursache Gestorbener) und am Morgen (wen besucht, wer aktiv, wer angegriffen, geschützt, eigener Angreifer); Täuschung: dauerhaft „Erscheint als“ (Dorf, Wolf, feste oder zufällige Rolle, bei Prüfungen und/oder beim Tod), Verfälschen einer Person für 1–3 Nächte (wirkt sofort für spätere Schritte), Fähigkeit heute unbemerkt wirkungslos (eigene Rollen, Heiler, Hexe, Seherin-Hinweis); Anzeige: Ergebnis zum Ansagen groß, „Echt: …“ klein; Vorlagen Intrigant, Maskenwolf, Detektiv. Grenzen: Umlenken des Ziels einer fremden Fähigkeit ist nicht umgesetzt.
E4 umgesetzt (wartet auf Abnahme): Verflucht (Angriff macht zum Werwolf statt zu töten), Seitenwechsel (auch „jeden Morgen“ mit Bedingung, z. B. nach 3 Einsätzen), alte Fähigkeit behalten oder verlieren, Rolle einer gestorbenen Person übernehmen, Rolle dauerhaft weitergeben oder für eine Nacht ausleihen, beim Tod vererben (nach Wahl über Rückfrage oder an das festgelegte Ziel), Nachfolge beim Tod des Ziels, Freischalten mit Bedingungen „freigeschaltet/noch nicht“ und „mindestens n× eingesetzt“; neue Auslöser „Jeden Morgen“ und „Wenn ihr festgelegtes Ziel stirbt“; Vorlagen Verfluchter, Vergessliche, Lehrling, Überläufer. Grenzen: keine Zweitrolle; Wechsel gelten ab der nächsten Nacht.
E5 umgesetzt: Tagesfähigkeiten ohne Auswahlliste (Fähigkeit antippen, dann Person im Kreis); Stimmgewicht des Tages (×2, ×½, gestrichen), Strafstimmen, Freispruch (heute keine Hinrichtung), keine Abstimmung, zweite Abstimmung, Anklage, Aufdecken mit großer Karte und Abzeichen (Täuschung wirkt); dauerhaft starke Stimme (×2/×3, auf Wunsch jeden 2. Tag), geheime Zusatzstimme, entscheidet bei Gleichstand; Sonderstimmen trägt der Spielleiter einzeln in der Zählkarte ein; Vorlagen Bürgermeister, Anwalt, Herold.
E6 umgesetzt: eigene Gegenstände in der Werkstatt (Rollenwahl → Eigene → Gegenstände) mit Name, Symbol, Ladungen, verdeckt, schlecht und eigenen Regeln; Träger nutzen sie über Nachtschritt (eigener Schritt je Gegenstand), Tageskarte und Auslöser, auch Täuschung und Stimmgewicht; Wirkungen Gegenstand geben, stehlen, zerstören, reinigen, bei Ereignis erhalten, Startausstattung, Vererben mit Gegenständen; Bedingungen „trägt Gegenstand“, „mindestens n Gegenstände“; Spielerblatt: geben und wegnehmen; Abzeichen im Kreis (verdeckte nur bei eingeblendeten Rollen); Vorlagen Rüstung, Gift, Fluch-Amulett, Kristallkugel, Glocke und Rolle Schmied.
E7 umgesetzt: Geister (Nachtfähigkeiten „als Geist“, optional nur n Nächte nach dem Tod; Schritt „Geist: …“), eigene Parteien in der Werkstatt (Name, Farbe, Sieg: alle Lebenden, mindestens n Mitglieder oder alle tragen Gegenstand X; eigenständig blockiert den Dorfsieg), Mitgliedschaft über die Rolle, Anwerben in Partei und Austreiben; neue Alleinsiege: n getötet, n verwandelt oder angeworben, n Nächte überlebt, n Einsätze, Ziel selbst getötet, alle tragen Gegenstand; Vorlagen Poltergeist und Kopfgeldjäger. Die Sekte bleibt wie bisher eine Siegbedingung der Rolle.
Offen: E8 Umlenken, Zweitrolle, Mitnehmen mit Schutz.

## M15 Daten und Pflege
- Sicherungserinnerung, Gruppen per QR-Code oder Datei übertragen.
- Automatische Tests bei jedem Push (GitHub Actions).
- Bedienhilfen: VoiceOver-Beschriftungen, Kontrast, Schriftgröße.
- Migration alter Sicherungen, Lizenz für das Repo.

Abnahme: Sicherung auf ein zweites Gerät übertragen und dort laden.

## Bekannte Grenzen heute
- „Als tot markieren“ geht nur am Tag.
- iOS spielt Töne erst nach der ersten Berührung und beachtet den Stummschalter.
- Wake Lock (Bildschirm anlassen) braucht bei installierten iOS-Apps mindestens iOS 16.4.
- Wolfshund und Wildes Kind: Die Seite bleibt nach dem Tod geheim, die Rolle selbst wird beim Aufdecken genannt.

## M16 Originale einsetzen (ganz am Ende)
- Die fünf Freesound-Töne (Wolf, Hahn, Gong, Glocke, Tod) in Originalqualität: Du lädst die Originale mit deinem Konto in einen Ordner, ich schneide, wandle um und baue sie ein.
- Pegel und Länge erneut abgleichen, Quellenangaben aktualisieren.

Abnahme: Alle Töne klingen sauber, nichts knackt oder verzerrt.
