# Rollenbilder für die Werwolf-App – Anleitung für die Bild-KI (Version 2)

Ziel: **32 Rollenbilder** im selben Stil, jedes **quadratisch**, **ohne Rahmen, ohne Text, ohne Titelbalken**. Die App legt Name, Rahmen und Lagerfarbe selbst darüber.

## 0. Was sich gegenüber Version 1 geändert hat (und warum)

| Problem bei Version 1 | Lösung jetzt |
|---|---|
| Ein Bild mit 40 Karten war zu viel, die KI hat ab Karte 22 eigene Motive erfunden | **8 Bilder mit je 4 Rollen** (2 × 2). Kleine Aufträge werden genau befolgt |
| Karten hatten Rahmen, Rundungen und dunkles Textband, die App musste sie abschneiden | **Nur Illustration**, randlos, kein Rahmen, kein Band |
| Hochformat 2:3, passte nicht zu den quadratischen Kacheln der App | **Quadrat 1:1** |
| Sheet war nur 2000 px breit und wirkte verwaschen | Ausgabe in der **größten Auflösung**, die ChatGPT anbietet; auf Wunsch **eine Rolle pro Bild** (doppelt so scharf, siehe Abschnitt 6) |
| Rückseite, Vorlagen und Reserve-Felder waren im Sheet, werden aber nicht verwendet | **Nur die 32 Rollen**, die in der App vorkommen |
| Gouache-Beschreibung, die die KI ignoriert hat | Stil so beschrieben, wie die KI ihn tatsächlich gut liefert: **flache Vektor-Optik** |

## 1. Vorgaben für jedes Bild

| Eigenschaft | Wert |
|---|---|
| Bildformat | **Quadrat 1:1**, so groß wie möglich (mindestens 1024 × 1024) |
| Aufbau eines Sheets | **2 × 2**: vier gleich große quadratische Bilder |
| Trennlinien | **16 px reinweiß (`#FFFFFF`)** zwischen den Bildern, **kein Außenrand** |
| Reihenfolge | links oben, rechts oben, links unten, rechts unten (so wie die Rollen unten aufgelistet sind) |
| Text im Bild | **Nirgends** Text, Buchstaben, Zahlen, Schilder mit Schrift, Wasserzeichen |
| Rahmen, Ecken | **Keine** Rahmen, keine abgerundeten Ecken, kein Textband unten. Das Motiv füllt das Quadrat bis an den Rand |
| Figur | Brustbild oder Halbfigur, mittig, Kopf im oberen Drittel, Motiv füllt rund 85 % der Höhe |
| Blickrichtung | Seitlich bis halb zum Betrachter, nie frontal-starr |
| Hintergrund | Ruhig, dunkel (Nachtblau, Schwarz oder Dunkelbordeaux), nur ein weicher Lichtkreis oder Mond hinter der Figur |
| Anzahl Figuren | Genau die Anzahl, die bei der Rolle steht (Schwestern 2, Brüder 3, sonst 1) |
| Nicht verwenden | Fantasy-Figuren, die keine Rolle sind (kein Vampir, Teufel, König, Katze usw.), Blut, Gewalt |

## 2. Stil (steht in jedem Prompt gleich)

> Flache Vektor-Illustration im Papierschnitt-Stil: klare geometrische Formen, **keine Konturlinien**, weiche Verläufe nur zur Betonung, gedeckte Farben, dunkler Hintergrund, ein Akzentlicht in der angegebenen Farbe. Dezente Papierkörnung, sonst keine Textur. Erwachsene Figuren, stimmungsvoll und unheimlich-märchenhaft, nicht blutig. Gleiche Lichtführung bei allen Bildern: kaltes Mondlicht von oben links, warmer Gegenlichtakzent in der Akzentfarbe. Kein Text, keine Schrift, keine Rahmen.

## 3. Ablauf in ChatGPT

1. Neuer Chat. **Sheet 1** erzeugen (Prompt aus Abschnitt 4 komplett kopieren).
2. Ergebnis prüfen (Abschnitt 5). Gefällt der Stil, dieses Bild als **Stilvorlage** behalten.
3. Für Sheet 2 bis 8 jeweils im selben Chat oder mit angehängtem Sheet 1 beginnen: „Im exakt gleichen Stil wie das angehängte Bild, aber mit diesen vier neuen Motiven:“ und den Prompt einfügen.
4. Immer als **PNG in der größten verfügbaren Größe** herunterladen (nicht den Vorschau-Screenshot).
5. Dateinamen: `sheet1.png` bis `sheet8.png`.
6. **Vektorgrafik:** ChatGPT erzeugt Bilder als Pixelgrafik. Eine echte SVG-Datei (als Programmcode) wäre bei diesen Motiven sehr einfach und uneinheitlich und deshalb keine Verbesserung. Die flache Optik bleibt auch bei scharfer Pixelgrafik klar. Ich kann PNG und WebP verarbeiten und die Trennlinien automatisch finden.

## 4. Die acht Aufträge

Jedem Auftrag wird dieser **Kopf** vorangestellt (immer gleich):

> Erstelle **ein einziges quadratisches Bild** in der größtmöglichen Auflösung, das aus **vier gleich großen quadratischen Illustrationen in einem 2×2-Raster** besteht. Zwischen den vier Bildern verläuft jeweils eine **reinweiße Trennlinie von 16 Pixeln**, rundherum **kein Rand**. Jede Illustration füllt ihr Feld bis an den Rand, **ohne Rahmen, ohne abgerundete Ecken, ohne Textband**. **Nirgends Text, Zahlen, Buchstaben oder Schilder mit Schrift.** Die Motive stehen in der Reihenfolge: links oben, rechts oben, links unten, rechts unten. Stil: *[Stil aus Abschnitt 2 einfügen]*. Bei jedem Motiv gibt es nur **die angegebene Anzahl Figuren** und nichts, was nicht beschrieben ist.

### Sheet 1 – Basisspiel (1)

1. **Dorfbewohner** – Brustbild eines einfachen Dorfbewohners, Weste und Hemd, hält eine Mistgabel, Blick seitlich, leicht besorgt. Akzent Senfgelb `#b98a2c`. Eine Figur.
2. **Werwolf** – schwarzer Wolfskopf im Profil mit gefletschten Zähnen und glühend roten Augen, vor riesigem rotem Vollmond. Akzent Blutrot `#b3261e`. Ein Tier.
3. **Seherin** – Frau mit violetter Kapuze, geschlossene Augen, beide Hände über einer leuchtenden Kristallkugel. Akzent Violett `#7a3fa6`. Eine Figur.
4. **Hexe** – Hexe mit spitzem türkisem Hut, Blick gesenkt, hält in einer Hand ein grünes, in der anderen ein dunkelviolettes Fläschchen, dahinter ein brodelnder Kessel. Akzent Türkis `#2a9a8a`. Eine Figur.

### Sheet 2 – Basisspiel (2)

1. **Jäger** – bärtiger Jäger mit grünem Federhut und Armbrust im Anschlag, Köcher auf dem Rücken. Akzent Olivgrün `#5f7a2b`. Eine Figur.
2. **Amor** – junger Liebesgott mit kleinen Flügeln, spannt einen Bogen, Pfeil mit Herzspitze. Akzent Himmelblau `#3b77c4`, rosa Herz. Eine Figur.
3. **Dieb** – maskierter Dieb mit Kapuze, hält eine verdeckte Karte schräg in der Hand, zweite Karte liegt vor ihm. Akzent Steingrau `#6b6b75`. Eine Figur.
4. **Kleines Mädchen** – Mädchen im Nachthemd mit Zöpfen, blinzelt durch die Finger vor dem Gesicht, im Fenster dahinter zwei leuchtend gelbe Wolfsaugen. Akzent Rosa `#d0658e`. Eine Figur.

### Sheet 3 – Neumond (1)

1. **Heiler** – Heiler mit Kräutertasche, streckt die Hand aus, aus der ein sanfter grüner Lichtschild entsteht. Akzent Grün `#3a9a5a`. Eine Figur.
2. **Alter** – sehr alter Mann mit langem weißem Bart, Mantel und Stock, die Hand an einer Narbe am Arm, zäher Blick. Akzent Braun `#8a6a4a`. Eine Figur.
3. **Dorfdepp** – Narr mit bunter Schellenmütze, breites ahnungsloses Lächeln, hält ein Rüben-Zepter hoch. Akzent Orange `#d08a2a`. Eine Figur.
4. **Sündenbock** – Ziege mit großen gebogenen Hörnern, Seil um den Hals, trauriger geduldiger Blick, Schatten der Dorfmenge dahinter. Akzent Braun `#8d5a3a`. Ein Tier.

### Sheet 4 – Neumond (2) und Charaktere (1)

1. **Flötenspieler** – Mann im bunten Mantel mit Federhut, spielt eine lange Holzflöte, aus der leuchtende Notenspiralen aufsteigen. Akzent Violettblau `#6a4fc0`. Eine Figur.
2. **Gaukler** – Schauspieler im Harlekin-Kostüm, hält eine lachende Maske, zwei weitere Masken hängen hinter ihm. Akzent Purpur `#7b3a8f`. Eine Figur.
3. **Wahrsagerin** – Frau mit Kopftuch voller Münzen, vor ihr Tarotkarten und eine Kerze, aus deren Rauch ein schwacher Geist aufsteigt. Akzent Weinrot `#8a2f5a`. Eine Figur.
4. **Urwolf** – uralter, riesiger Wolf mit Narben, Frost im Fell und glühenden roten Augen, ein Mondzeichen auf der Stirn. Akzent Dunkelrot `#7a0f0f`. Ein Tier.

### Sheet 5 – Charaktere (2)

1. **Großer böser Wolf** – monumentaler schwarzer Wolf mit sehr breitem Kopf, zeigt Zähne, riesige Pfote im Vordergrund, dichter Nebel zwischen Tannen. Akzent Bordeaux `#4a0d0d`. Ein Tier.
2. **Weißer Werwolf** – schneeweißer Wolf allein auf einem Hügel, stahlgrauer Blick, ein Hauch Rot in den Augen, vor blauem Mond. Akzent Silbergrau `#3a3a46`. Ein Tier.
3. **Wildes Kind** – verwildertes Kind mit zerzaustem grünem Haar und Blätterkleid, hockt auf einem Baumstamm, hält ein Amulett. Akzent Waldgrün `#4c8a3a`. Eine Figur.
4. **Wolfshund** – Hund, halb Wolf, Kopf im Profil: eine Gesichtshälfte hell und treu, die andere dunkel und wild, Halsband halb abgestreift. Akzent Braun `#8a5a2a`. Ein Tier.

### Sheet 6 – Charaktere (3)

1. **Zwei Schwestern** – **zwei** Schwestern Rücken an Rücken oder Schulter an Schulter, eine blond, eine dunkelhaarig, gleiche Hauben, Laterne zwischen ihnen. Akzent Rosa `#c05a8a`. **Genau zwei** Figuren.
2. **Drei Brüder** – **drei** Brüder Schulter an Schulter in blauen Hemden, unterschiedlich groß, entschlossener Blick. Akzent Stahlblau `#4a6a9a`. **Genau drei** Figuren.
3. **Reine Seele** – Gestalt in einfachem weißem Gewand, Hände offen vor der Brust, weiches goldenes Licht um den Kopf, Blumen am Saum, wirkt heller als die anderen Bilder. Akzent Hellgold `#d7a64a`. Eine Figur.
4. **Fuchs** – roter Fuchs im Halbprofil, Nase in die Luft gereckt und schnuppernd, über dem Kopf drei kleine Silhouetten in einer Wolke. Akzent Fuchsrot `#d2691e`. Ein Tier.

### Sheet 7 – Charaktere (4)

1. **Bärenführer** – Mann mit Fellmütze und Kette, daneben ein großer brauner Bär auf den Hinterbeinen, der witternd die Schnauze hebt. Akzent Braun `#6b4a2b`, rote Kleidungsakzente. Zwei Figuren (Mann, Bär).
2. **Ritter der rostigen Klinge** – Ritter in abgenutzter Rüstung mit Rostflecken, hält ein rostrotes Schwert vor sich, Helm unter dem Arm, müder stolzer Blick. Akzent Stahlgrau `#7c8a99`. Eine Figur.
3. **Engel** – Engel mit weißen Flügeln und offenen Armen, Blick zum Mond, Federn fallen, heller als die anderen Bilder. Akzent Hellgold `#efe2b0`. Eine Figur.
4. **Ergebene Magd** – Magd mit Haube und Schürze, hält eine halb verdeckte Maske, hinter ihr der Schatten einer anderen Gestalt. Akzent Altrosa `#9a6a8a`. Eine Figur und ein Schatten.

### Sheet 8 – Charaktere (5)

1. **Stotternder Richter** – Richter mit gepuderter Perücke und schwarzer Robe, Hammer in einer Hand, die andere zeigt eine geheime Geste mit zwei Fingern, Schweißtropfen auf der Stirn. Akzent Dunkelviolett `#5a4a7a`. Eine Figur.
2. **Verbitterter Greis** – grimmiger alter Mann mit zusammengezogenen Brauen, zeigt mit dem Stock auf die andere Seite, der Hintergrund ist in Licht und Schatten geteilt. Akzent Graubraun `#6b5a4a`. Eine Figur.
3. **Rabe** – großer schwarzer Rabe auf einem Zaunpfahl, Kopf geneigt, rotes Auge, ein Papierfetzen im Schnabel, dahinter die Silhouette eines Dorfes. Akzent Anthrazit `#3a3a48`. Ein Tier.
4. **Brandstifter** – Gestalt mit Kapuze, hält eine brennende Fackel, flackerndes Orange im Gesicht, im Hintergrund ein Haus, auf dessen Dach kleine Flammen beginnen. Akzent Orange `#c2561e`. Eine Figur.

## 5. Prüfliste je Sheet

1. Genau **vier** Bilder, quadratisch, mit weißen 16-px-Linien dazwischen.
2. **Keine Rahmen**, keine Rundungen, kein dunkler Balken unten, kein Text.
3. Richtige Anzahl Figuren (Schwestern 2, Brüder 3).
4. Reihenfolge wie im Auftrag.
5. Gleicher Stil und gleiche Lichtführung wie Sheet 1.
6. Keine Fantasy-Figuren, die nicht zu den 32 Rollen gehören.

Weicht ein Bild ab, in ChatGPT nur das betroffene Feld nachbessern lassen („Ändere nur das dritte Bild: …“), nicht das ganze Sheet neu erstellen.

## 6. Mehr Schärfe: eine Rolle pro Bild

Wenn 2 × 2 zu weich wirkt: jede Rolle einzeln erzeugen (32 Bilder). Dann entfallen Kopf und Trennlinien, und der Prompt lautet nur:

> Erstelle **ein quadratisches Bild** in größtmöglicher Auflösung. Stil: *[Stil aus Abschnitt 2]*. Motiv: *[Zeile der Rolle aus Abschnitt 4]*. Ohne Rahmen, ohne Text, Motiv füllt das Bild bis an den Rand.

Dateiname dann `<id>.png`, mit der id aus der Tabelle unten.

## 7. Zuordnung für die App

| Sheet | Links oben | Rechts oben | Links unten | Rechts unten |
|---|---|---|---|---|
| 1 | `villager` | `wolf` | `seer` | `witch` |
| 2 | `hunter` | `cupid` | `thief` | `girl` |
| 3 | `guard` | `elder` | `idiot` | `scapegoat` |
| 4 | `piper` | `actor` | `medium` | `urwolf` |
| 5 | `bigwolf` | `whitewolf` | `wildchild` | `wolfdog` |
| 6 | `sisters` | `brothers` | `puresoul` | `fox` |
| 7 | `bear` | `knight` | `angel` | `maid` |
| 8 | `judge` | `greis` | `raven` | `arsonist` |

Die App zeigt die Bilder quadratisch (Ausschnitt mittig). Ich schneide die Felder anhand der weißen Trennlinien aus, speichere sie als `assets/portraits/<id>.webp` und aktualisiere den Offline-Speicher.
