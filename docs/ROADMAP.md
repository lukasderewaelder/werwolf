# Meilensteine ab M7

Bis M6 ist alles erledigt und live (Engine, Oberfläche, PWA, Nachtmusik, Installationsknopf). Ab hier gilt der Ablauf:

1. Ich setze genau einen Meilenstein um, mit Tests (`npm test` und `npm run test:e2e` grün).
2. Ich pushe direkt auf `main`, Pages liefert nach rund einer Minute aus.
3. Ich frage dich, ob alles funktioniert, und gebe dir eine kurze Abnahmeliste. Erst nach deinem „passt“ beginnt der nächste Meilenstein. Fehler behebe ich zuerst.

Stand der Umsetzung steht hinter jeder Überschrift.

## M7 Gerätetest-Paket (umgesetzt, wartet auf deine Abnahme)
Ziel: Du kannst die App auf iPad, iPhone und Android prüfen und siehst bei Problemen sofort, woran es liegt.
- Diagnoseseite in den Optionen: Version, Service Worker, Offline-Bereitschaft (Dateien im Speicher), installiert ja/nein, Speicher dauerhaft, Ton und Musik, Bildschirmgröße, Testton.
- Lautstärkeregler, Töne- und Musikschalter direkt im Spiel (Menü), Musikknopf in der Kopfleiste.
- Musik und Töne pausieren, wenn die App in den Hintergrund geht. Der Timer rechnet danach richtig weiter.
- Dauerhaften Speicher anfragen, damit iOS und Android den Spielstand nicht aufräumen.
- Versionsanzeige in den Optionen.

Abnahme (du): Installieren, Flugmodus an, App starten, Diagnoseseite zeigt „bereit für Offline“, Musik in Nacht 1 hörbar, Lautstärke regelbar, Wechsel in eine andere App stoppt die Musik.

## M8 Töne
Vorher frage ich dich um Erlaubnis für jeden Download.
- CC0-Glocke (Timer-Ende) und Wolfsklang, falls die Dateien brauchbar sind. Gong und Hahn bleiben synthetisch oder du lieferst eigene Aufnahmen.
- Tag-Musik (kurz, hell) und ein Stück zum Spielende, wenn passende CC0-Dateien existieren.
- Quellenangaben ergänzen.

Abnahme: Wolfsphase, Morgen, Timer-Ende und Spielende klingen stimmig, Lautstärke passt zur Musik.

## M9 Abstimmung und Überblick
- Stimmenzähler: Stimmen pro Person erfassen mit doppelter Stimme des Hauptmanns, +2 des Raben, Dorfdepp ohne Stimmrecht, eingeschränkte Wähler des Sündenbocks. Ergebnis und Gleichstand erkennt die App selbst.
- Dauerhafte Anzeige im Spiel: Wölfe gegen Rest, wer noch lebt.
- Hauptmannswahl ebenfalls per Stimmenzähler.

Abnahme: Eine Abstimmung mit 10 Spielern läuft ohne Kopfrechnen, der Gleichstand wird erkannt.

## M10 Regel-Randfälle
Mit Tests je Fall, Quelle ist das Regelheft:
- Urwolf und Alter, Ergebene Magd mit Amor und Flötenspieler, Heiler gegen den Weißen Werwolf, Jäger bei Liebeskummer, Wildes Kind und Wolfshund als Hauptmann, Dieb mit zwei Wölfen in der Mitte.
- Ich nenne dir vorher jede Stelle, an der das Regelheft nicht eindeutig ist, und du entscheidest.

Abnahme: Du spielst die Fälle durch, die dich interessieren, und bestätigst das Verhalten.

## M11 Bedienung
- Sitzordnung per Ziehen und Vorschau des Kreises schon beim Einrichten.
- Spielerblatt per langem Tippen auf den Stein.
- Sperrbildschirm („Display nach unten“) mit kurzem Code.
- Spiel pausieren, mehrere Spielstände, Spielstand löschen.
- Protokoll teilen oder als Datei speichern.

Abnahme: Eine Partie mit 20 Personen lässt sich ohne Umwege einrichten und leiten.

## M12 Neumond: Ereigniskarten
- 36 Ereigniskarten mit Zigeunerin, Büttel und den neun Varianten. Die Kartentexte formuliere ich selbst nach dem Regelheft.
- Auswahl der aktiven Karten beim Einrichten, Ziehen am Morgen.

Abnahme: Eine Partie mit Ereigniskarten läuft durch, die Karten wirken wie im Regelheft.

## M13 Die Gemeinde
- Gebäude und Berufe, Brandstifter, Rabe mit anonymem Brief nach Originalregel, Vogt, Wirt, Bäcker, Barbier u. a.
- Zuordnung der Gebäude beim Start, Anzeige am Spielerstein.

Abnahme: Eine Partie mit Gebäuden läuft durch.

## M14 Eigene Rollen mit Aktion
- Eigene Rollen mit Zielwahl und eigener Siegbedingung, eigenes Bild (Symbol oder Foto).
- Mittelkarten von Gaukler und Dieb sichtbar, auch im Modus ohne Karten.

Abnahme: Eine selbst gebaute Rolle mit Aktion funktioniert in einer Partie.

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
- Ereigniskarten (Neumond) und Gemeinde-Gebäude fehlen bis M12 und M13.
