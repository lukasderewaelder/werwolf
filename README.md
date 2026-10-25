# Werwolf Spielleiter

Offlinefähige WebApp, die dich als Spielleiter durch eine Runde „Die Werwölfe von Düsterwald“ führt. Gebaut für das iPad quer, läuft auch auf iPhone und Android-Handy. Nacht dunkel, Tag hell, ohne Konto und ohne Server.

Live-Adresse (GitHub Pages): `https://lukasderewaelder.github.io/werwolf/`

## Installieren (einmalig, danach offline)

| Gerät | Schritte |
| --- | --- |
| iPad, iPhone | In **Safari** die Adresse öffnen, Teilen-Knopf, **Zum Home-Bildschirm**. Danach die App vom Home-Bildschirm starten. |
| Android | In **Chrome** die Adresse öffnen, Menü, **App installieren** (oder Zum Startbildschirm). |

Auf Android erscheint auf der Startseite und in den Optionen ein Knopf **App installieren**, auf iPad und iPhone **Zum Home-Bildschirm hinzufügen** mit Anleitung. Läuft die App schon installiert, verschwindet der Knopf.

Nach dem ersten Öffnen mit Netz ist alles auf dem Gerät gespeichert. Danach funktioniert die App im Flugmodus. Gibt es eine neue Version, erscheint oben der Hinweis „Neue Version bereit“.

**Wichtig für iOS:** Die installierte App hat einen eigenen Speicher, getrennt von Safari. Gruppen und Einstellungen überträgst du über *Optionen, Sicherung speichern* und *Sicherung laden*.

## Bedienung in Kürze

1. **Neues Spiel**: Gruppe wählen, anwesende Spieler abhaken, Sitzordnung prüfen (sie bestimmt die Nachbarn von Fuchs, Bärenführer und Ritter).
2. **Modus**: *Mit Spielkarten* (echte Karten, die App führt durch die Nacht) oder *Ohne Karten* (die App lost und zeigt jedem heimlich seine Rolle).
3. **Rollen**: Empfehlung nutzen oder selbst wählen, eigene Rollen anlegen. Die Kartenzahl muss stimmen.
4. **Hausregeln**: Seherin sieht Rolle oder nur Seite, keine Opfer in Nacht 1, Hauptmann, Wolfssieg bei Gleichstand u. a.
5. **Nacht**: Ansage vorlesen, Personen im Kreis antippen, *Weiter*. **Tag**: Tote und Morgenmeldungen, Timer, Hauptmann wählen, Hinrichtung antippen.

Das Auge-Symbol blendet Rollen auf den Spielersteinen aus, der Pfeil macht die letzte Aktion rückgängig. Im Menü (drei Punkte) stehen Protokoll, „Wer ist wer“ mit Korrekturen und der Rollen-Spickzettel.

## Regeln

Maßgeblich ist das Regelheft „Die Werwölfe von Düsterwald – Der Pakt“ (Asmodee 2014). Der Abgleich mit der früheren App und alle Entscheidungen stehen in [docs/regelabgleich.md](docs/regelabgleich.md). Nicht umgesetzt sind die Ereigniskarten von Neumond (außer der Geisterbeschwörung als Hinweis) und die Gebäude und Berufe aus „Die Gemeinde“.

## Entwicklung

```bash
npm install            # nur für die Browser-Tests (Playwright)
npm run serve          # Server auf http://localhost:4173/
npm test               # Spiel-Engine und Precache (node --test)
npm run test:e2e       # Browser-Tests mit Edge/Chrome (PW_CHANNEL=chrome für Chrome)
node tools/precache.mjs   # nach jeder Dateiänderung in src/ oder assets/ ausführen
node tools/icons.mjs      # PNG-Icons aus assets/icons/icon.svg neu erzeugen
```

Musik: Zwei CC0-Stücke für die Nacht (Quellen in [docs/QUELLEN.md](docs/QUELLEN.md)). Weitere Pläne in [docs/ROADMAP.md](docs/ROADMAP.md).

Aufbau: `index.html`, `src/engine/` (Spiellogik ohne Oberfläche, vollständig getestet), `src/ui/` (Ansichten), `src/store.js` (Speicher), `src/audio.js` (Töne), `sw.js` (Service Worker mit Precache), `assets/` (CSS, Rollenporträts, Icons), `docs/` (Plan, Regelabgleich, Originale der alten App).

Auf localhost ist der Service Worker aus; `?sw=1` an die Adresse hängen, um den Offlinebetrieb zu testen.

## Prüfliste fürs iPad (WebKit lässt sich auf dem PC nicht testen)

- [ ] Safari: Zum Home-Bildschirm hinzufügen, App starten, Flugmodus an, App neu starten: lädt alles, auch Rollenbilder
- [ ] Quer und hoch: Sitzkreis, Rechtsspalte, „Weiter“-Knopf sind vollständig sichtbar, nichts wird abgeschnitten
- [ ] Neues Spiel mit 12 Spielern im Modus „Ohne Karten“: Rollen zeigen, Nacht 1, Morgen, Abstimmung
- [ ] Kartenmodus: Rolle zuordnen, Seherin prüfen, Hexe heilt, Jäger schießt
- [ ] Tag/Nacht-Wechsel färbt die App um, Timer läuft, Bildschirm bleibt an
- [ ] Töne: nach der ersten Berührung hörbar (iOS spielt vorher nichts ab), Stummschalter beachten
- [ ] Sicherung speichern und laden (Teilen-Menü erscheint)
- [ ] Neue Version: nach einer Änderung erscheint „Neue Version bereit“, Aktualisieren lädt neu

## Lizenzen und Quellen

Nachtmusik von congusbongus und SkyleTheFrench (CC0, OpenGameArt). Die Rollenporträts stammen aus der bisherigen App. Rollenbeschreibungen sind eigene Zusammenfassungen. „Die Werwölfe von Düsterwald“ ist ein Spiel von Philippe des Pallières und Hervé Marly; diese App ist ein privates Hilfsmittel und steht in keiner Verbindung zu den Verlagen.
