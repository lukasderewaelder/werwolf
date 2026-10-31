# Rollenkarten als Spritesheet – Beschreibung für die KI-Bildgenerierung

Zweck: Alle Rollenkarten der Werwolf-App sollen als **ein Spritesheet** (ein PNG, Raster aus gleich großen Karten) entstehen. Dieses Dokument ist so gebaut, dass eine Bild-KI (oder ein Mensch) es Abschnitt für Abschnitt abarbeiten kann: erst die **Rahmenvorgaben**, dann der **Stil**, dann das **Raster**, dann **eine Beschreibung je Karte**.

---

## 1. Rahmenvorgaben (gelten für das ganze Sheet)

| Eigenschaft | Wert |
|---|---|
| Format der einzelnen Karte | Hochformat 2:3, **512 × 768 px** |
| Raster | **8 Spalten × 5 Reihen = 40 Zellen** |
| Gesamtgröße | **4096 × 3840 px** |
| Abstand zwischen Karten | 0 px (Zellen stoßen aneinander, jede Zelle ist exakt 512 × 768) |
| Hintergrund des Sheets | Transparent (PNG mit Alpha). Die Kartenecken sind abgerundet (Radius 36 px), außerhalb der Rundung transparent |
| Lesereihenfolge | Zeile für Zeile von links oben nach rechts unten (Index 0 bis 39) |
| Text auf den Karten | **Kein Text, keine Buchstaben, keine Zahlen** im Bild. Namen und Beschreibung setzt die App als Text darüber. Die Bilder dürfen deshalb keinen Titelbalken enthalten |
| Sicherer Bereich | Wichtige Bildteile liegen innerhalb von 40 px Abstand zum Rand. Unten 150 px Höhe (y 618–768) bleiben bildlich ruhig und dunkler, dort legt die App den Rollennamen auf |
| Ausrichtung der Figur | Zentriert, Oberkörper oder Halbfigur, Blick leicht zum Betrachter, Kopf im oberen Drittel |

## 2. Gemeinsamer Stil (in jeden Karten-Prompt voranstellen)

> Illustrierte Spielkarte im Stil eines düsteren Märchenbuchs: handgemalte Gouache- und Tuschelinien, leicht raue Papiertextur, kräftige aber gedeckte Farben, weiche Vignette zu den Rändern hin. Mittelalterliches Dorf Düsterwald im Mondlicht, Fachwerk, Tannenwald, Nebel. Eine einzelne Hauptfigur oder ein einzelnes Symbol im Mittelpunkt, ruhiger Hintergrund. Alle Figuren erwachsen und nicht blutig oder grausam dargestellt, eher unheimlich-märchenhaft als Horror. Immer dieselbe Lichtführung: kaltes Mondlicht von oben links, warmer Gegenlicht-Akzent in der jeweiligen Akzentfarbe. Kein Text, keine Schrift, kein Wasserzeichen.

**Rahmen jeder Karte (immer gleich aufgebaut):**
- Äußerer Rand 14 px in dunklem Holzbraun `#2a1f16`, darin ein feiner Zierstrich 3 px in der **Rahmenfarbe des Lagers** (siehe Tabelle).
- In den vier Ecken kleine Ornamente (Eichenblatt oder Mondsichel) in der Rahmenfarbe.
- Am unteren Rand ein schwarzer, nach oben auslaufender Verlauf (von 0 % auf 70 % Deckkraft über 150 px) für die Namenszeile.

**Rahmenfarbe nach Lager:**

| Lager | Bedeutung | Rahmenfarbe | Zusätzliches Merkmal im Rahmen |
|---|---|---|---|
| `village` | Dorfbewohner | Gold `#c9a24a` | Eichenblätter in den Ecken |
| `wolf` | Werwölfe | Blutrot `#8e1b17` | Krallenspuren in den Ecken |
| `twofold` | Zweideutige | zweigeteilt: oben Gold `#c9a24a`, unten Rot `#8e1b17`, weicher Übergang in der Mitte | Mondsichel in den Ecken, eine Hälfte hell, eine dunkel |
| `solo` | Einzelgänger | Silber `#b8bcc6` | Fünfzackiger Stern in den Ecken |
| eigene Rolle | Selbst angelegt | Kupfer `#b0703a` | Leere Ecken mit einfachem Rautenmuster |

## 3. Raster: Welche Zelle ist welche Karte

`id` ist die interne Kennung der App. Die Zelle ergibt sich aus `Spalte = Index mod 8`, `Reihe = Index div 8` (beide ab 0). Pixelposition links oben: `x = Spalte × 512`, `y = Reihe × 768`.

| Index | Spalte, Reihe | id | Name | Lager | Akzentfarbe |
|---|---|---|---|---|---|
| 0 | 0, 0 | `villager` | Dorfbewohner | village | `#b98a2c` |
| 1 | 1, 0 | `wolf` | Werwolf | wolf | `#b3261e` |
| 2 | 2, 0 | `seer` | Seherin | village | `#7a3fa6` |
| 3 | 3, 0 | `witch` | Hexe | village | `#2a9a8a` |
| 4 | 4, 0 | `hunter` | Jäger | village | `#5f7a2b` |
| 5 | 5, 0 | `cupid` | Amor | village | `#3b77c4` |
| 6 | 6, 0 | `thief` | Dieb | twofold | `#6b6b75` |
| 7 | 7, 0 | `girl` | Kleines Mädchen | village | `#d0658e` |
| 8 | 0, 1 | `guard` | Heiler | village | `#3a9a5a` |
| 9 | 1, 1 | `elder` | Alter | village | `#8a6a4a` |
| 10 | 2, 1 | `idiot` | Dorfdepp | village | `#d08a2a` |
| 11 | 3, 1 | `scapegoat` | Sündenbock | village | `#8d5a3a` |
| 12 | 4, 1 | `piper` | Flötenspieler | solo | `#6a4fc0` |
| 13 | 5, 1 | `actor` | Gaukler | twofold | `#7b3a8f` |
| 14 | 6, 1 | `medium` | Wahrsagerin | village | `#8a2f5a` |
| 15 | 7, 1 | `urwolf` | Urwolf | wolf | `#7a0f0f` |
| 16 | 0, 2 | `bigwolf` | Großer böser Wolf | wolf | `#4a0d0d` |
| 17 | 1, 2 | `whitewolf` | Weißer Werwolf | solo | `#3a3a46` |
| 18 | 2, 2 | `wildchild` | Wildes Kind | twofold | `#4c8a3a` |
| 19 | 3, 2 | `wolfdog` | Wolfshund | twofold | `#8a5a2a` |
| 20 | 4, 2 | `sisters` | Zwei Schwestern | village | `#c05a8a` |
| 21 | 5, 2 | `brothers` | Drei Brüder | village | `#4a6a9a` |
| 22 | 6, 2 | `puresoul` | Reine Seele | village | `#d7a64a` |
| 23 | 7, 2 | `fox` | Fuchs | village | `#d2691e` |
| 24 | 0, 3 | `bear` | Bärenführer | village | `#6b4a2b` |
| 25 | 1, 3 | `knight` | Ritter der rostigen Klinge | village | `#7c8a99` |
| 26 | 2, 3 | `angel` | Engel | solo | `#efe2b0` |
| 27 | 3, 3 | `maid` | Ergebene Magd | twofold | `#9a6a8a` |
| 28 | 4, 3 | `judge` | Stotternder Richter | village | `#5a4a7a` |
| 29 | 5, 3 | `greis` | Verbitterter Greis | solo | `#6b5a4a` |
| 30 | 6, 3 | `raven` | Rabe | village | `#3a3a48` |
| 31 | 7, 3 | `arsonist` | Brandstifter | village | `#c2561e` |
| 32 | 0, 4 | `back` | Kartenrückseite | – | `#2a1f16` |
| 33 | 1, 4 | `custom-village` | Eigene Rolle (Dorf), Vorlage | eigene | `#4a5f8f` |
| 34 | 2, 4 | `custom-wolf` | Eigene Rolle (Wolf), Vorlage | eigene | `#8a2a2a` |
| 35–39 | 3–7, 4 | – | frei, vollständig transparent lassen (Reserve für spätere Rollen) | – | – |

Hinweis: Die Rollenreihenfolge entspricht der Reihenfolge in `src/engine/roles.js`. Kommen neue Rollen dazu, werden sie ab Index 35 angehängt, damit bestehende Indizes stabil bleiben.

## 4. Beschreibung je Karte

Format je Eintrag: **Motiv** (was ist zu sehen), **Details** (Figur, Haltung, Kleidung, Symbole), **Farben und Stimmung**. Die Akzentfarbe aus Abschnitt 3 setzt das Gegenlicht und die wichtigsten Kleidungs- oder Symbolfarben.

### Basisspiel

**0 – Dorfbewohner (`villager`)**
Motiv: ein einfacher Dorfbewohner vor seinem Fachwerkhaus. Details: Mann oder Frau mittleren Alters, derbe Leinen- und Wollkleidung, Mistgabel oder Laterne in der Hand, neugieriger, leicht besorgter Blick, im Hintergrund ein Dorfplatz mit Brunnen. Farben: warme Erdtöne, Senfgelb. Stimmung: bodenständig, freundlich, ein wenig unsicher.

**1 – Werwolf (`wolf`)**
Motiv: ein großer grauer Wolf mit leuchtenden Augen vor dem Vollmond. Details: Halbfigur, das Maul geschlossen oder leicht geöffnet, der Blick direkt auf den Betrachter, Fell struktur sichtbar, gebogene Fangzähne, hinter ihm ein riesiger heller Vollmond und dunkle Tannen. Kein Blut. Farben: Schwarzgrau, kaltes Blau, Augen und Gegenlicht in Blutrot `#b3261e`. Stimmung: bedrohlich, ruhig, lauernd.

**2 – Seherin (`seer`)**
Motiv: eine Frau mit Kristallkugel. Details: Kapuzenumhang in Violett, die Hände über einer leuchtenden Kugel, in der schemenhaft ein Gesicht oder ein Auge erscheint, Sterne und Kerzen. Farben: Violett `#7a3fa6`, Nachtblau, goldene Sternpunkte. Stimmung: weise, geheimnisvoll.

**3 – Hexe (`witch`)**
Motiv: eine Hexe mit zwei Fläschchen. Details: spitzer Hut, leicht schiefes Lächeln, in der linken Hand ein grünes Fläschchen (Heiltrank), in der rechten ein dunkelviolettes mit Totenkopf-Etikett (Gifttrank, nur als Symbol, kein Text). Kessel mit Dampf im Hintergrund. Farben: Türkis `#2a9a8a`, Moosgrün, Dunkelviolett. Stimmung: schelmisch, doppeldeutig.

**4 – Jäger (`hunter`)**
Motiv: ein Jäger mit Armbrust im Wald. Details: kräftiger Mann, Lederwams, Federhut, Armbrust im Anschlag, zeigt auf einen Punkt außerhalb des Bildes, im Hintergrund Tannen. Farben: Olivgrün `#5f7a2b`, Lederbraun. Stimmung: entschlossen, wachsam.

**5 – Amor (`cupid`)**
Motiv: ein junger Mann oder eine Gestalt mit Bogen und herzförmiger Pfeilspitze. Details: kleine Flügel, Köcher, ein Pfeil zielt nach oben, zwei verschränkte Herzen schweben im Mondlicht, Rosenranken am Rand. Farben: Himmelblau `#3b77c4`, Rosa-Akzent bei den Herzen. Stimmung: verspielt, romantisch, mit leichtem Schatten.

**6 – Dieb (`thief`)**
Motiv: ein Dieb vor zwei verdeckten Karten. Details: Maske über den Augen, Kapuze, hält eine von zwei Karten schräg verdeckt in der Hand, die andere liegt auf einem Tisch, Messer am Gürtel (stecken lassen). Rahmen zweigeteilt (twofold). Farben: Steingrau `#6b6b75`, Schwarz, ein Hauch Gold. Stimmung: schlau, flink.

**7 – Kleines Mädchen (`girl`)**
Motiv: ein Mädchen, das heimlich durch die Finger blinzelt. Details: Nachthemd, Zöpfe, eine Hand vors Gesicht gehoben mit einem Spalt zwischen den Fingern, ein Auge sichtbar, im Hintergrund durchs Fenster zwei leuchtende Wolfsaugen. Farben: Rosa `#d0658e`, Cremeweiß, Nachtblau. Stimmung: neugierig, ängstlich.

### Erweiterung Neumond

**8 – Heiler (`guard`)**
Motiv: ein Heiler, der schützend die Hand über jemanden hält. Details: Kräuterbeutel, Tuch um die Schultern, die ausgestreckte Hand erzeugt einen sanften grünen Lichtschild, kleine Heilkräuter im Vordergrund. Farben: Grün `#3a9a5a`, Weiß, Holz. Stimmung: fürsorglich, ruhig.

**9 – Alter (`elder`)**
Motiv: ein sehr alter Mann mit Stock. Details: langer weißer Bart, tiefe Falten, wettergegerbtes Gesicht, dicker Mantel, die freie Hand an einer Narbe oder einem Biss am Arm, der Blick zäh und unbeugsam. Farben: Braun `#8a6a4a`, Grau. Stimmung: standhaft, würdevoll.

**10 – Dorfdepp (`idiot`)**
Motiv: der Dorfnarr mit Schellenmütze. Details: bunte Narrenkappe mit Glöckchen, breites ahnungsloses Lächeln, schief sitzende Kleidung, ein Rüben-Zepter oder Luftballon aus Schweinsblase, Hände in die Höhe. Farben: Orange `#d08a2a`, Gelb, Rot-Akzente. Stimmung: komisch, harmlos.

**11 – Sündenbock (`scapegoat`)**
Motiv: eine Ziege mit Schild um den Hals oder ein Mann mit Ziegenhörnern. Details: eine kräftige Ziege mit großen gebogenen Hörnern, ein Seil um den Hals, ein einfaches Holzschild ohne Text, trauriger geduldiger Blick, Dorfmenge als Schatten im Hintergrund. Farben: Braun `#8d5a3a`, Beige. Stimmung: duldend, ein bisschen tragisch.

**12 – Flötenspieler (`piper`)**
Motiv: ein Flötenspieler, dem Mäuse und Dorfbewohner im Tanz folgen. Details: bunter Mantel, Federhut, eine lange hölzerne Flöte, aus der leuchtende Notenspiralen aufsteigen, hinter ihm kleine verzauberte Silhouetten. Rahmen silber (solo). Farben: Violett-Blau `#6a4fc0`, Silber, Gold. Stimmung: hypnotisch, verführerisch.

**13 – Gaukler (`actor`)**
Motiv: ein Schauspieler mit mehreren Masken. Details: Harlekin-Kostüm, in einer Hand eine Maske, zwei weitere Masken hängen im Hintergrund an Haken, Bühnenvorhang, Kerzenlicht von unten. Rahmen zweigeteilt (twofold). Farben: Purpur `#7b3a8f`, Gold, Schwarz. Stimmung: theatralisch, wandelbar.

**14 – Wahrsagerin (`medium`)**
Motiv: eine Wahrsagerin an einem Tisch mit Geisterkerze. Details: Kopftuch mit Münzen, Ringe, Tarotkarten und eine Kerze, aus deren Rauch ein schwacher Geist aufsteigt, Wandbehang mit Mondphasen. Farben: Weinrot `#8a2f5a`, Gold, Rauchgrau. Stimmung: mystisch, vertraut.

### Erweiterung Charaktere

**15 – Urwolf (`urwolf`)**
Motiv: ein riesiger, uralter Wolf mit Narben und Moos im Fell. Details: größer und wilder als der Werwolf, weißer Reif auf dem Fell, leuchtende Rune oder Mondzeichen an der Stirn, die Augen glühen tiefrot, Wurzeln und Felsen im Hintergrund. Farben: Dunkelrot `#7a0f0f`, Schwarz, Eisgrau. Stimmung: archaisch, mächtig.

**16 – Großer böser Wolf (`bigwolf`)**
Motiv: ein monumentaler schwarzer Wolf, der zwischen Tannen hervorragt. Details: sehr breiter Kopf, riesige Pfote im Vordergrund, zweiter Schatten hinter ihm als Hinweis auf zweites Opfer, das Maul zeigt Zähne, dichter Nebel. Farben: Sehr dunkles Bordeaux `#4a0d0d`, Schwarz. Stimmung: gierig, erdrückend.

**17 – Weißer Werwolf (`whitewolf`)**
Motiv: ein weißer Wolf, allein auf einem Hügel. Details: schneeweißes Fell, stahlgrauer Blick, hinter ihm liegen Schatten anderer Wölfe, die er abwendet (nur als Silhouetten). Rahmen silber (solo). Farben: Weiß, Silbergrau `#3a3a46`, ein Hauch Rot in den Augen. Stimmung: einsam, kalt, gefährlich.

**18 – Wildes Kind (`wildchild`)**
Motiv: ein verwildertes Kind im Wald. Details: Zerzauste Haare, Fellumhang und Blätter am Kleid, barfuß, hockt auf einem Baumstamm, hält ein gebasteltes Amulett, das Auge huscht zur Seite, als folge es einem Vorbild. Rahmen zweigeteilt (twofold). Farben: Waldgrün `#4c8a3a`, Braun. Stimmung: scheu, wild, unberechenbar.

**19 – Wolfshund (`wolfdog`)**
Motiv: ein Hund, der halb Wolf ist, an einer Weggabelung. Details: Kopf von der Seite, ein Ohr aufrecht, eines hängend, Halsband (halb abgestreift), eine Gesichtshälfte hell und treu, die andere dunkel und wild, zwei Pfade im Hintergrund (Dorf links, Wald rechts). Rahmen zweigeteilt (twofold). Farben: Braun `#8a5a2a`, Grau. Stimmung: zerrissen, unentschlossen.

**20 – Zwei Schwestern (`sisters`)**
Motiv: zwei Schwestern Arm in Arm. Details: ähnliche Gesichter, eine blond, eine dunkel, gleiche Haube, eine Laterne zwischen ihnen, Blick zueinander. **Zwei Figuren** (die Karte steht für zwei Personen). Farben: Rosa `#c05a8a`, Creme. Stimmung: vertraut, warm.

**21 – Drei Brüder (`brothers`)**
Motiv: drei Brüder Schulter an Schulter. Details: unterschiedlich groß (groß, mittel, klein), gleiche Grundzüge, Arme verschränkt oder auf Schultern, Werkzeuge (Axt, Seil, Laterne), stolz und entschlossen. **Drei Figuren**. Farben: Stahlblau `#4a6a9a`, Braun. Stimmung: kameradschaftlich, standhaft.

**22 – Reine Seele (`puresoul`)**
Motiv: eine leuchtende, offen lächelnde Gestalt. Details: einfache weiße Kleidung, Hände offen vor der Brust, ein schwacher goldener Schein hinter dem Kopf (kein Heiligenschein-Klischee, eher weiches Licht), Blumen am Saum. Die Karte wirkt heller als alle anderen, geringer Verlauf. Farben: Hellgold `#d7a64a`, Weiß. Stimmung: unschuldig, ehrlich.

**23 – Fuchs (`fox`)**
Motiv: ein Fuchs oder Mensch mit Fuchsmerkmalen, der schnuppert. Details: roter Fuchs im Halbprofil, Nase in die Luft gereckt, drei kleine Silhouetten (eine Person und ihre beiden Nachbarn) in Wolkenform über seinem Kopf als Hinweis auf die Witterung, Nebel zwischen Bäumen. Farben: Fuchsrot `#d2691e`, Weiß, Nachtblau. Stimmung: listig, aufmerksam.

**24 – Bärenführer (`bear`)**
Motiv: ein Bärenführer mit seinem Tanzbär. Details: Mann mit Fellmütze und Kette in der Hand, daneben ein großer brauner Bär auf den Hinterbeinen, der Bär reckt die Schnauze, als wittere er etwas, Jahrmarktwagen im Hintergrund. Farben: Braun `#6b4a2b`, Rot-Akzent bei der Kleidung. Stimmung: kauzig, wachsam.

**25 – Ritter der rostigen Klinge (`knight`)**
Motiv: ein Ritter mit verrostetem Schwert. Details: abgenutzte Rüstung mit Flecken, Schwert in beiden Händen, die Klinge matt und rostrot, Helm unter dem Arm, müder aber stolzer Blick, Reiter-Banner im Hintergrund (ohne Text oder Wappen). Farben: Stahlgrau `#7c8a99`, Rostbraun. Stimmung: edel, abgekämpft.

**26 – Engel (`angel`)**
Motiv: ein Engel, der sich nach dem Ende sehnt. Details: weiße Flügel, offene Arme, Blick hoch zum Mond, eine Treppe aus Licht, Federn fallen. Rahmen silber (solo). Die Karte ist heller als die anderen. Farben: Hellgold `#efe2b0`, Weiß, Himmelblau. Stimmung: friedlich, sehnsüchtig.

**27 – Ergebene Magd (`maid`)**
Motiv: eine Magd, die eine fremde Karte betrachtet. Details: Schürze und Haube, in der Hand eine halb verdeckte Karte oder Maske, Schatten hinter ihr in Form einer anderen Gestalt, hingebungsvolle Haltung. Rahmen zweigeteilt (twofold). Farben: Altrosa `#9a6a8a`, Grau, Creme. Stimmung: dienend, wandelbar.

**28 – Stotternder Richter (`judge`)**
Motiv: ein Richter mit Perücke und Hammer, der ein Zeichen gibt. Details: gepuderte Perücke, schwarze Robe, Holzhammer in der einen Hand, die andere Hand macht eine kleine, geheime Geste (zwei Finger), Schweißtropfen an der Stirn. Farben: Dunkelviolett `#5a4a7a`, Schwarz, Papierweiß. Stimmung: nervös, würdevoll.

**29 – Verbitterter Greis (`greis`)**
Motiv: ein grimmiger alter Mann am Fenster. Details: Falten, zusammengezogene Brauen, deutet mit dem Stock auf die andere Seite des Platzes, Dorfplatz geteilt in zwei Hälften durch eine unsichtbare Linie (z. B. Schatten und Licht). Rahmen silber (solo). Farben: Graubraun `#6b5a4a`, Gelbstich. Stimmung: griesgrämig, rachsüchtig.

**30 – Rabe (`raven`)**
Motiv: ein Rabe auf einem Zaunpfahl. Details: großer schwarzer Rabe, Kopf zur Seite geneigt, ein Auge im Blick, ein Fetzen Papier oder Beerenzweig im Schnabel, im Hintergrund zeigt eine Hand auf eine Dorfsilhouette. Farben: Anthrazit `#3a3a48`, Nachtblau, ein roter Akzent im Auge. Stimmung: verräterisch, klug.

**31 – Brandstifter (`arsonist`)**
Motiv: eine Gestalt mit Fackel vor einem Dorfhaus. Details: Kapuze, Fackel in der Hand, flackerndes Orange auf dem Gesicht, ein Haus im Hintergrund, aus dessen Dach kleine Flammen züngeln (nicht zerstört, nur Anfang des Brandes), Funken im Nachthimmel. Farben: Orange `#c2561e`, Schwarz, Glut-Rot. Stimmung: gefährlich, zielstrebig.

### Sonderkarten

**32 – Kartenrückseite (`back`)**
Motiv: einheitliche Rückseite für alle Karten. Details: Dunkles Holzbraun `#2a1f16` mit goldenem Muster: zentrale Mondsichel mit einem darin sitzenden Wolfskopf (Silhouette), rundum Eichenlaub und kleine Sterne, symmetrisch, kein Text. Der Rahmen ist neutral Gold `#c9a24a`. Stimmung: edel, geheimnisvoll.

**33 – Vorlage: Eigene Rolle, Dorf (`custom-village`)**
Motiv: leere Vorlage für selbst angelegte Dorf-Rollen. Details: zentrale Silhouette einer neutralen Person als Platzhalter-Umriss (keine Gesichtszüge), darunter ruhiger Verlauf, Rahmen Kupfer `#b0703a`. Farben: Blau `#4a5f8f` im Gegenlicht.

**34 – Vorlage: Eigene Rolle, Wolf (`custom-wolf`)**
Motiv: leere Vorlage für selbst angelegte Wolfs-Rollen. Details: zentrale Silhouette eines Wolfskopfes als Platzhalter-Umriss, Rahmen Kupfer `#b0703a`. Farben: Rot `#8a2a2a` im Gegenlicht.

**35–39 – Reserve**
Vollständig transparent lassen.

## 5. Prüfliste für die fertige Datei

1. Datei ist **4096 × 3840 px**, PNG mit Alpha, jede Karte exakt 512 × 768 px in der Zelle laut Abschnitt 3.
2. Auf keiner Karte ist Text, Schrift oder Zahl zu sehen.
3. Unterer Streifen (150 px) jeder Karte ist ruhig und dunkel genug, damit weißer Text lesbar bleibt.
4. Der Rahmen passt zum Lager der Rolle (Abschnitt 2).
5. Zwei Schwestern zeigen zwei, Drei Brüder drei Figuren.
6. Alle Karten haben dieselbe Lichtführung und denselben Malstil.
7. Zellen 35–39 sind transparent.
8. Zusätzlich liefern: `rollenkarten.json` mit `{ "cell": [512, 768], "grid": [8, 5], "frames": { "<id>": [x, y] } }`, damit die App die Karten ausschneiden kann.
