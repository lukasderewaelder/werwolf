# Werwolf-Spielleiter: Plan und Entscheidungen

Neubau der Spielleiter-App als offlinefähige WebApp (PWA) für iPad (quer), iPhone und Android-Handy.
Vorlagen: `docs/original/werwolf_spielleiter-3.html` (alt) und `docs/original/apk-v4-index.html` (aus der APK, neuer).

## Entscheidungen (Rückfragen vom 2026-10-25)

| Thema | Entscheidung |
| --- | --- |
| Verteilung | GitHub Pages, einmal öffnen und „Zum Home-Bildschirm“, danach offline. Android reicht als WebApp. |
| Geräte | iPad quer (Hauptgerät, zwei Spalten), iPhone, Android-Handy |
| Umfang | Komplett neu gestaltet; Rollenporträts (29 WebP aus der APK) bleiben |
| Look | Neuer Stil. Nacht dunkel, Tag hell, Wechsel automatisch je Spielphase |
| Nutzung | Nur der Spielleiter sieht das Gerät. Im Modus „ohne Karten“ zeigt er den Spielern ihre Rolle am Gerät in seiner Hand |
| Modi | Mit Spielkarten, ohne Karten, eigene Rollen und Hausregeln |
| Regeln | Abgleich aller Rollen mit den offiziellen Anleitungen (Pegasus/Asmodee: Düsterwald, Neumond, Charaktere). Abweichungen werden dem Nutzer vor der Umsetzung gelistet |
| Hausregeln (Schalter) | Seherin sieht Rolle oder nur Wolf/Dorf; keine Todesopfer in der ersten Nacht (dazu die vorhandenen: Hauptmann, Wolfssieg bei Gleichstand, tote Rollen aufrufen) |
| Gruppengröße | 5 bis 30 Spieler |
| Spielergruppen | Mehrere benannte Gruppen, pro Spiel Anwesende abhaken |
| Sound | Nachtmusik-Schleife, Wolfsgeheul, Hahnenschrei, Gong/Glocke/Todesschlag/Sieg-Fanfare. Nur CC0-Quellen; Liste mit Lizenz und Größe wird vor dem Download vorgelegt |
| Git | Commit und Push auf `main` nach Meilensteinen erlaubt. Repo ist öffentlich: nie echte Namen oder Sicherungen einchecken |

## Technik

Statisch, ohne Build (wie `starteraufgaben`): `index.html`, ES-Module in `src/`, `assets/`, `sw.js` mit Precache (`node tools/precache.mjs`), `manifest.webmanifest`.
Spiel-Engine als reine Module ohne DOM (testbar mit `node --test`), Oberfläche getrennt davon.
Schriften lokal (kein Google Fonts). Spielstand in `localStorage`/IndexedDB mit Sicherung als JSON-Datei.

## Meilensteine

1. **M0** Gerüst, Plan, Porträts, Tools
2. **M1** Regelabgleich: Tabelle Rolle, App-Verhalten, offizielle Regel, Abweichung (zur Bestätigung)
3. **M2** Engine: Rollen, Nachtablauf, Tod und Ketten, Siegprüfung, Hausregeln, Undo; Unit-Tests
4. **M3** Oberfläche: Start, Gruppen, Einrichtung, Rollenwahl (iPad quer und Handy)
5. **M4** Spielansicht: Nacht, Tag, Abstimmung, Timer, Protokoll
6. **M5** Sound und Musik
7. **M6** PWA, Offline, Sicherung, Härtung, README, iPad-Checkliste
