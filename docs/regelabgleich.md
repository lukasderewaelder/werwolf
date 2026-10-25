# Regelabgleich (Meilenstein 1)

Maßgeblich: Regelheft „Die Werwölfe von Düsterwald – Der Pakt“ (Asmodee/Lui-Même, 2014). Es fasst Grundspiel, Neumond, Die Gemeinde und Charaktere zusammen und enthält die offizielle Aufrufreihenfolge (S. 24). Verglichen wurde mit der Logik der APK-Version (`docs/original/apk-v4-index.html`).

Legende: **Fehler** = App weicht von der Regel ab und wird korrigiert. **Lücke** = Regel fehlt in der App. **Frage** = Regeltext ist mehrdeutig, Entscheidung nötig.

## Abweichungen

| # | Thema | Regelheft | APK-Version | Einstufung |
| --- | --- | --- | --- | --- |
| 1 | Engel | Ist der Engel im Spiel, beginnt die Partie mit einem Tag und einer Abstimmung, noch vor der ersten Nacht. Der Engel gewinnt, wenn er dort oder in der ersten Nacht ausscheidet. Sonst wird er Dorfbewohner. | Abstimmung erst nach der ersten Nacht | Fehler |
| 2 | Aufrufreihenfolge | Nacht: Gaukler, Seherin, Fuchs, Rabe, Heiler, Werwölfe (Wolfshund, Wildes Kind, Infizierte), Kleines Mädchen, Weißer Werwolf, Urwolf, Großer böser Wolf, Hexe, Flötenspieler, Verzauberte. Erste Nacht davor: Dieb, Gaukler, Amor, Seherin, Fuchs, Liebespaar, Richter (Zeichen), Schwestern, Brüder, Wildes Kind, Wolfshund. | Seherin und Fuchs nach den Wölfen, Rabe nach der Hexe, Weißer Werwolf nach Urwolf | Fehler |
| 3 | Rollennamen | Der Alte, Das Kleine Mädchen, Das Wilde Kind, Der Ritter der rostigen Klinge, Der Große, böse Wolf, Der Weiße Werwolf, Die Zigeunerin | Dorfältester, Blinzelmädchen, Wildes Kind, Ritter, Großer böser Wolf, Weißer Werwolf | Anpassen (alte Namen bleiben als Suchbegriff) |
| 4 | Kleines Mädchen | Wird sie bei der Spionage von den Wölfen erwischt, wird sie statt des Opfers gefressen. Der Schutz des Heilers wirkt bei ihr nicht. | Knopf „erwischt“ vorhanden, Hexen-Heilung wird dabei verworfen; der Heiler-Schutz würde das Mädchen aber noch retten | Fehler (nur Heiler-Schutz) |
| 5 | Heiler | Schützt auch sich selbst, nie dieselbe Person zwei Nächte hintereinander. Kein Schutz vor Flötenspieler und Urwolf-Infektion, nicht beim Kleinen Mädchen. | Infektion korrekt; Mädchen-Ausnahme fehlt, Folgenacht-Sperre per `lastProtect` vorhanden | Prüfen und ergänzen |
| 6 | Alter | Überlebt den ersten Wolfsbiss. Dorfabstimmung, Gifttrank und Jäger töten ihn sofort, dann verlieren die Dorfbewohner ihre Fähigkeiten. Heilt die Hexe ihn, gewinnt er nur ein Leben. Der Urwolf kann ihn nach dem ersten Biss nicht infizieren. | Fähigkeitsverlust trifft alle „Team Dorf“-Rollen, auch die Zweideutigen | Fehler (Details unter Frage A) |
| 7 | Sündenbock | Bei Gleichstand stirbt er an Stelle der beiden. Scheidet er aus, bestimmt er, wer am nächsten Tag abstimmen darf. | Die Wählerauswahl gibt es nur bei Gleichstand, nicht bei Tod durch Wölfe, Gift oder Jäger | Fehler (Frage B) |
| 8 | Dorfdepp | Bei Verurteilung deckt er auf und überlebt ohne Stimmrecht. Keine neue Abstimmung an diesem Tag. Als Hauptmann verliert er das Amt endgültig. Wölfe und Jäger töten ihn normal. | Zu prüfen | Prüfen |
| 9 | Bärenführer | Brummt jeden Morgen, wenn ein lebender direkter Nachbar ein Werwolf ist. Ist der Bärenführer selbst infiziert, brummt es jeden Morgen bis zu seinem Tod. | Infizierter Bärenführer fehlt | Lücke |
| 10 | Ritter | Der erste Werwolf links vom Ritter (im Uhrzeigersinn) stirbt in der folgenden Nacht, nachdem er einen Tag überlebt hat. Bekanntgabe am Morgen. | Entspricht | in Ordnung |
| 11 | Verbitterter Greis | Der Spielleiter teilt das Dorf nach sichtbaren Merkmalen (Brille, Größe, Bart …) in zwei Gruppen und gibt es laut bekannt. Gruppen müssen nicht gleich groß sein. | Sitzkreis wird starr in zwei Hälften geteilt | Fehler (Gruppen frei zuweisbar) |
| 12 | Weißer Werwolf | Wacht jede zweite Nacht allein auf, darf einen Werwolf (keinen Dorfbewohner) töten. Gewinnt nur als einziger Überlebender. | Siegprüfung vermischt Weißen Werwolf mit dem Wolfsrudel | Fehler (Frage C) |
| 13 | Ergebene Magd | Vor dem Aufdecken des vom Dorf Verurteilten darf sie dessen Karte übernehmen. Sie spielt die Rolle wie in der ersten Nacht, Verliebt, Infiziert (bleibt), Verzaubert, Hauptmann, Büttel werden nicht mitgenommen. Nicht möglich, wenn sie verliebt ist. | Teilweise | Prüfen und ergänzen |
| 14 | Wolfshund und Wildes Kind | Entsprechen der Regel. Auch nach dem Tod bleibt die Seite geheim (Spannung). | Entspricht, Option „Seite bleibt geheim“ fehlt | Verbesserung |
| 15 | Flötenspieler | Gewinnt, sobald alle anderen Lebenden verzaubert sind, auch durch Abstimmung oder Wölfe. Kann sich nicht selbst verzaubern. Heiler und Hexe helfen nicht, Verzauberung geht nicht über Verliebte. | Entspricht weitgehend | Prüfen |
| 16 | Hauptmann | Wird durch relative Mehrheit gewählt, Wahl nicht ablehnbar, Stimme zählt doppelt, Nachfolger wird im letzten Atemzug bestimmt. | Entspricht | in Ordnung |
| 17 | Amor und Liebespaar | Amor darf sich selbst wählen. Ein Verliebter darf nie gegen den anderen stimmen. Stirbt einer, stirbt der andere. Wolf plus Dorf im Paar gewinnen nur zu zweit. Ist der Jäger verliebt, schießt er vor seinem Tod noch. | Entspricht | in Ordnung |
| 18 | Drei Brüder | Erfahrene Runden dürfen sie ab und zu erneut wecken (jede zweite Runde o. ä.). | Nur Nacht 1 | Verbesserung (optional) |
| 19 | Neumond-Ereigniskarten, Zigeunerin, Büttel, Gemeinde (Gebäude, Berufe, Brandstifter) | Eigene Spielvarianten | Nur eine Notiz zur Spiritismus-Sitzung | nicht Teil dieses Umbaus (Vorschlag: später) |

## Abweichung von der Aufrufreihenfolge (auf Wunsch)

Das Regelheft ruft die Seherin vor den Werwölfen auf. Ist in den Hausregeln „Die Seherin sieht nur: Werwolf oder nicht“ gewählt, kommt sie nach allen Wolfsschritten dran, damit der Spielleiter die Wölfe schon kennt. Im Kartenmodus gilt das in Nacht 1 ebenso für den Fuchs.

## Offene Fragen an den Nutzer

* **A** Der Alte und die Hexe: Das Heft sagt nur „gewinnt nur ein einziges Leben“. Vorschlag: Der Wolfsangriff verbraucht das Extraleben des Alten auch dann, wenn die Hexe heilt (kein doppelter Schutz). Die Zweideutigen (Dieb, Magd, Gaukler, Wildes Kind, Wolfshund) verlieren ihre Fähigkeiten nicht, nur das Lager Dorfbewohner.
* **B** Sündenbock: Wörtlich „wenn er ausscheidet“, also bei jedem Tod. Vorschlag: Wählerauswahl bei jedem Ausscheiden.
* **C** Weißer Werwolf: Sind alle Dorfbewohner tot, aber Wolfsrudel und Weißer Werwolf leben noch, geht das Spiel weiter, bis der Weiße Werwolf allein übrig ist oder stirbt (dann gewinnen die Wölfe).

## Entscheidungen zu Randfällen (M10)

| Fall | Entscheidung |
| --- | --- |
| Urwolf infiziert den Alten | beim ersten Biss möglich, nach dem ersten Biss nicht mehr (Regelheft S. 10) |
| Ergebene Magd und Jäger | darf die Jägerkarte nicht übernehmen, der Jäger schießt, die Magd bleibt Magd |
| Heiler und Heiltrank gegen den Weißen Werwolf | wirken, er gilt als Werwolf |
| Seherin und Infizierte | sieht nur die Karte, bei „Werwolf oder nicht“ gilt der Infizierte als Werwolf |
| Alter stirbt an Liebeskummer | keine Folgen für die Fähigkeiten des Dorfes (Regelheft nennt nur Abstimmung, Gift, Jäger) |
| Dieb mit zwei Werwölfen in der Mitte | muss einen nehmen |
| Jäger verliebt | schießt, wenn der Partner stirbt; sterben alle, gewinnt niemand |
| Ergebene Magd wird Flötenspieler | erfährt die bisher Verzauberten, ist selbst nicht mehr verzaubert |
