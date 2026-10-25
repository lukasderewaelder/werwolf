# Nächste Runden

Stand 2026-10-25: Die App ist live, mit Nachtmusik (zwei CC0-Stücke) und Installationsknopf. Reihenfolge nach Nutzen, die erste Runde zuerst. Gebucht ist noch nichts davon, außer der iPad-Prüfung.

## Runde 1: Echtes Gerät prüfen und nachbessern
- iPad und iPhone durch die Prüfliste in der README, danach alles korrigieren, was Safari anders macht (Ränder, Sicherung, Wake Lock, Ton).
- Android-Handy: „App installieren“ in Chrome, Offlinebetrieb im Flugmodus.
- Probepartie mit 20 bis 30 Spielern: Lesbarkeit des Kreises, Tempo der Bedienung.
- Lautstärkeregler und Musikknopf direkt im Spiel (der Wert `volume` ist schon gespeichert, es fehlt nur die Bedienung).

## Runde 2: Töne und Musik
- Weitere CC0-Töne von OpenGameArt: Glocke (z. B. „Pleasing Bell Sound Effect“), ein Wolfsklang („Wolf Monster Sound“ oder das Heulen aus „80 CC0 creature SFX“). Gong und Hahnenschrei gibt es dort nicht als CC0, sie bleiben synthetisch, oder du nimmst eigene Aufnahmen.
- Eigene Musik für den Tag (kurz, hell) und ein Stück für das Spielende.
- Musik pausieren, wenn die App im Hintergrund ist.

## Runde 3: Regeln vollständiger
- Neumond-Ereigniskarten (36 Karten, 9 Varianten) mit Zigeunerin und Büttel.
- „Die Gemeinde“: Gebäude, Berufe, Brandstifter, Rabe mit anonymem Brief nach Originalregel.
- Randfälle aus dem Regelheft prüfen und mit Tests absichern: Urwolf und Alter, Ergebene Magd mit Amor oder Flötenspieler, Heiler gegen den Weißen Werwolf, Jäger bei Liebeskummer.
- Abstimmungshilfe: Stimmen zählen mit doppelter Stimme des Hauptmanns, +2 des Raben und Dorfdepp ohne Stimmrecht.

## Runde 4: Bedienung
- Sitzordnung per Ziehen statt Pfeiltasten, Vorschau des Kreises schon beim Einrichten.
- Während des Spiels sichtbar: Zähler Wölfe gegen Rest, wer noch dabei ist.
- Spielerblatt per langem Tippen auf den Stein.
- Gerät sperren („Display nach unten“): Sperre mit Code, wenn jemand mitschauen könnte.
- Spiel pausieren und später fortsetzen, mehrere Spielstände.

## Runde 5: Eigene Rollen und Varianten
- Eigene Rollen mit Aktion (Person antippen) und eigener Siegbedingung statt nur Aufruf.
- Eigenes Bild für eigene Rollen (Foto oder Symbol).
- Gaukler: die drei Rollen in der Mitte für den Spielleiter sichtbar. Dieb: die Mittelkarten im Modus ohne Karten anzeigen.
- Hauptmannswahl per Stimmenzählung statt Antippen.

## Runde 6: Daten
- Sicherung automatisch erinnern („Letzte Sicherung vor 30 Tagen“).
- Gruppen per QR-Code oder Datei auf ein anderes Gerät übertragen.
- Protokoll als Datei exportieren oder teilen.
- Statistik (Siegerteams, Rollen) war ausdrücklich nicht gewünscht und bleibt draußen.

## Runde 7: Technik und Pflege
- Automatische Tests bei jedem Push (GitHub Actions) mit Prüfung, dass `sw.js` aktuell ist.
- Bedienhilfen: VoiceOver-Beschriftungen, Kontrast, Schriftgröße nach Systemeinstellung.
- Versionsnummer in den Optionen, Migration alter Sicherungen bei Formatänderungen.
- Lizenz für das Repo festlegen (derzeit ohne Lizenzdatei, alles öffentlich einsehbar).
- Android-APK (z. B. über PWABuilder) nur, wenn die WebApp dir nicht reicht. Bisher ist sie nicht nötig.

## Bekannte Grenzen heute
- „Als tot markieren“ geht nur am Tag.
- Der Timer läuft nicht weiter, wenn die App im Hintergrund pausiert wird.
- iOS spielt Töne erst nach der ersten Berührung und beachtet den Stummschalter.
- Wake Lock (Bildschirm anlassen) braucht bei installierten iOS-Apps mindestens iOS 16.4.
- Wolfshund und Wildes Kind: Die Seite bleibt nach dem Tod geheim, die Rolle selbst wird beim Aufdecken genannt.
