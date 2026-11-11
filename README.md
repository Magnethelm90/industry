# Industry Action

Mobiles Wirtschaftsspiel: Waren in Minispielen herstellen, Betriebe aufbauen, handeln, exportieren.

## Online spielen

Nach jedem Push baut `.github/workflows/pages.yml` das Spiel und veröffentlicht es auf GitHub Pages: https://magnethelm90.github.io/industry/ – dort lässt es sich auch als App installieren (Teilen → „Zum Home-Bildschirm“ bzw. Browser-Menü → „App installieren“). Voraussetzung: öffentliches Repo (oder ein bezahlter GitHub-Plan) und unter Settings → Pages die Quelle „GitHub Actions“.

## Entwickeln

```bash
npm install
npm run dev      # Entwicklungsserver mit Live-Neuladen
npm run build    # baut dist/index.html (eine einzige Datei) plus Manifest, App-Icons und Service Worker aus public/
npm run lint     # prüft den Code
npm test         # baut und startet die Browser-Tests in tests/ (braucht Playwright)
ONLY=fish REP=5 node tests/minigames.cjs   # ein Minispiel mehrfach vom Bot spielen lassen (nach npm run build)
npm run balance  # Tabelle: Credits und XP pro Minute je Station, Betrieb und Verkaufsweg
node tools/pace.mjs  # Simulation: Spielminuten bis zu jedem Level
node tools/pace.mjs --days=30  # spätes Spiel: täglich 1 h aktiv + 8 h offline, mit Export, Übernahmen, Großprojekten
```

## Aufbau

- `index.html`: Grundgerüst (Kopfzeile, Bildschirme, Navigation)
- `src/main.js`: Start, Hintergrund-Takt (1 s), Speichern
- `src/app.js`: Navigation und Bildschirmaufbau
- `src/data.js`: alle Spieldaten (Waren, Stationen, Betriebe, Länder …)
- `src/state.js`: Spielstand und abgeleitete Werte (Level, Lager, Preise)
- Marktpreise (Schleife in `src/main.js`): langsamer Trend um den Grundpreis (etwa ±3–4 %, 0,2 % pro Sekunde). Alle 2,5–4 Minuten kommt für eine Ware ein Boom (×2,2) oder Crash (×0,45), der 1 Minute dauert und in einigen Sekunden ein- und ausgleitet. Der Preisverlauf zeigt die letzten 5 Minuten.
- `src/features/`: je ein Spielbereich (Werkstatt, Farm, Betriebe, Markt, Laden, Aufträge, Export, Untergrund …)
- `src/games/`: je ein Minispiel; `games/index.js` ist das Register
- `src/ui.js`, `src/fx.js`, `src/util.js`: Overlay, Sound/Effekte, Helfer. Die Effekte sind echte CC0-Aufnahmen (Kenney, rubberduck u. a., Liste in `src/assets/sfx/QUELLEN.md`), als kleine MP3s in die Spieldatei eingebettet (zusammen etwa 190 KB). Der LKW-Motor ist eine nahtlose WAV-Schleife, deren Drehzahl über die Abspielgeschwindigkeit folgt. Bis eine Aufnahme dekodiert ist oder falls der Browser sie nicht lesen kann, erzeugt Web Audio einen Ersatzton. Löten und Kurzschluss bleiben erzeugt.
- `src/music.js`: Hintergrundmusik „Hot Spring Town“ von Kistol (CC0) als `public/music.mp3` (1,3 MB). Sie wird erst nach der ersten Berührung nachgeladen, danach kommt sie offline aus dem Cache des Service Workers. Bis dahin, und wenn die Datei fehlt, läuft eine leise erzeugte Schleife. Die Musik pausiert im Hintergrund und ist in der Firmen-Übersicht abschaltbar.
- `tools/sounds/build.py`: baut die Sounddateien aus den heruntergeladenen Paketen (Zuordnung, Pegel, Motor-Schleife); Aufruf siehe Kopf der Datei
- `src/assets/icons/`: in Blender gerenderte Icons (WebP, 192 px)
- `src/icons.svg`: nur noch Farbverläufe für das Smartphone-Minispiel
- `public/`: App-Manifest, App-Icons und Service Worker (`sw.js`) – damit lässt sich das Spiel auf dem Handy wie eine App installieren und offline spielen. Das gilt nur für die gehostete Version (https), nicht für die Einzeldatei-Vorschau.

## Freischaltungen

Neue Spieler folgen 23 Zielen (`src/features/goals.js`). Bereiche öffnen sich nach Level (`UNL` in `src/data.js`): Betriebe und Aufträge ab 2, Farm, Laden mit Filialen und Labor ab 3, Untergrund und Elektronik ab 4, Flughafen ab 5, Übernahmen ab 6, Großprojekte ab 7. Was schon benutzt wird, bleibt immer offen. Betriebe (außer Läden) verlieren 1 % Zustand pro 15 Minuten (`WEAR` in `src/data.js`) und fallen bei 0 % aus; unter 50 % sinkt ihre Leistung linear bis auf 50 %. Ab unter 85 % kann man warten. Die XP-Schwellen stehen in `LV_XP` (`src/data.js`); laut `tools/pace.mjs` braucht ein pausenlos spielender Spieler etwa 12 / 35 / 66 Minuten bis Level 3 / 4 / 5.

**Spätes Spiel:** Die Konkurrenz wächst logistisch bis zu einer Obergrenze (`RIVALS[].cap`). Ab Level 6 kann man sie für das 1,5-Fache ihres Werts übernehmen; Tochterfirmen zahlen 2 % des Kaufpreises pro Stunde (`TAKE_PREM`, `TAKE_DIV`). Ab Level 7 gibt es Großprojekte (`PROJECTS`): Waren nach und nach anliefern, fertig gibt es Credits und einen dauerhaften Bonus. Laut `tools/pace.mjs --days=30` (1 h Spielzeit pro Tag) erreicht die Konkurrenz nach 3–4 Tagen ihre Obergrenze; Krupp ist ab etwa Tag 7 bezahlbar, NovaTech ab Tag 16, Ivanov ab Tag 30, und den Firmenwert von Global Industries überholt man um Tag 19.

**Spielstand sichern:** In der Firmen-Übersicht (Tippen aufs Level) erzeugt man einen Sicherungscode (komprimiertes JSON, Base64) und lädt ihn auf einem anderen Gerät wieder.

## Welt und Live-Daten

`src/world.js` liest die echte Uhrzeit des Geräts:
- **Tageszeit:** Szenen werden abends und nachts dunkler, nachts beißen seltene Fische öfter, bei der LKW-Fahrt leuchten die Scheinwerfer.
- **Jahreszeit:** Felder wachsen im Frühling 10 % und im Sommer 25 % schneller, im Herbst gibt es 20 % mehr Ernte, im Winter wachsen sie nur mit 60 % Tempo.
- **Wochenende:** Lebensmittel, Agrarwaren und Fisch sind 15 % mehr wert, Aufträge zahlen 20 % mehr.

**Live-Daten** sind aus, bis man sie in der Firmen-Übersicht einschaltet. Dann holt das Spiel einmal am Tag die EZB-Wechselkurse (api.frankfurter.app, Ersatz api.frankfurter.dev). Exporterlöse ändern sich mit dem Kurs heute gegenüber vor einem Jahr, höchstens um ±15 %. Für Dubai zählt der Dollar, weil der Dirham daran gekoppelt ist. Wer eine Stadt wählt, bekommt alle 30 Minuten das Wetter von Open-Meteo (nicht-kommerziell kostenlos, CC BY 4.0): Regen gießt die Felder, Sonne beschleunigt das Wachstum, Schnee bremst es, und bei Sturm beißen seltene Fische öfter, auf der Straße liegt mehr im Weg. Ausschalten löscht den Zwischenspeicher. Fallen die Dienste aus oder antworten unsinnig, läuft das Spiel ohne diese Effekte weiter. Über den Claude-Link gibt es keine Live-Daten, weil die Plattform fremde Server sperrt. `tests/world.cjs` prüft das alles mit festen Uhrzeiten und nachgestellten Antworten.

## Barrierefreiheit

- Ist im System „Bewegung reduzieren“ eingestellt, entfallen Wackeln und Dauer-Pulsieren, und es gibt weniger Partikel (`calm()` in `src/util.js`, Media-Query am Ende von `src/style.css`). Spielwichtige Signale bleiben als feste Markierung.
- Im Kabel-Minispiel trägt jede Farbe zusätzlich ein Zeichen (Kreis, Dreieck, Quadrat, Raute, Stern) – lösbar auch bei Rot-Grün-Schwäche.

## Sicherheit

- Das Spiel lädt nichts von fremden Servern und sendet nichts dorthin. In der gehosteten Version erzwingt das eine Content-Security-Policy (`index.html`).
- Sicherungscodes sind die einzige Eingabe von außen. `readCode` (`src/features/backup.js`) lehnt Codes ab, die HTML- oder Skript-Zeichen enthalten, zu lang sind oder beim Entpacken zu groß würden (Zip-Bombe). Tests dafür stehen in `tests/systems.cjs`.
- Der Workflow nutzt auf Commits gepinnte Actions und pro Job nur die nötigen Rechte.

## Aussehen

Die Minispiele sind hell und freundlich: Das Fenster bekommt beim Start die Klasse `game` (`src/games/gate.js`, `ui.js`) und wechselt auf einen hellen Verlauf mit dunkler Schrift; die Bühnen und Canvas-Spiele haben helle Hintergründe (Block „Helles, freundliches Aussehen“ am Ende von `src/style.css`). Die 3D-Welt nutzt kräftige Farben (Neutral-Tonemapping), Hügel am Horizont, einen Teich, eine höhere Kamera und Beschriftungen in fester Bildschirmgröße.

## Übersicht

Die Werkstatt zeigt oben drei kleine Kacheln (Aufgaben, Labor, Erfolge) statt großer Karten. Darunter filtern Chips nach „Bereit“ (nur Stationen, die gerade laufen können) oder nach Gruppe, und jede Gruppe lässt sich einklappen (gemerkt im Browser unter `ia_fold`). Der Markt zeigt eine Zeile pro Ware. Das Ziel oben erscheint außerhalb der Werkstatt ohne Beschreibung. Der Systemtest prüft Kacheln, Filter und Einklappen.

## 3D-Modus (neu, Stufe 1)

Der Knopf 🧊 in der Kopfzeile (oder `?3d` in der Adresse) öffnet eine begehbare 3D-Welt (`src/world3d/index.js`, Three.js, wird erst beim Öffnen geladen). Du steuerst einen Arbeiter von hinten: Daumenstick links (oder WASD / Pfeile), Kamera durch Wischen rechts. An vier Stationen leuchtet ein Ring: Eisenerz- und Kohlemine, Schmelzofen und Markt. Dort erscheint ein Knopf. Er öffnet das normale Minispiel (Spielstand, Lager, Level und XP sind dieselben wie im 2D-Spiel) oder verkauft alles auf dem Markt. Das 2D-Spiel bleibt unverändert; „Zurück“ führt dorthin.

Die Modelle stammen aus Blender: `python3 tools/models3d/build.py src/assets/models` baut Figur, Minen, Schmelzofen, Marktstand, LKW, Bäume, Felsen, Laternen und Zaun und exportiert sie als GLB (`src/assets/models`, eingebettet; `src/world3d/models.js` lädt sie). Die Minen sind ein Modell, das Spiel färbt Gestein und Erz je Mine um. Dazu kommen Schatten, Himmel, Wolken, Rauch am Schornstein, flackerndes Ofenlicht, Staub beim Laufen und Tag/Nacht je nach Uhrzeit. Gebäude zwischen Kamera und Figur werden durchsichtig. Auf langsamen Geräten senkt das Spiel selbst die Auflösung. Der Test `tests/world3d.cjs` läuft mit Software-WebGL (SwiftShader). Das Bündel wächst dadurch auf etwa 2,4 MB (1 MB gepackt). Stufe 2: Lehmgrube, Ziegelei und Montagehalle (mit eigenen Blender-Modellen) und ein LKW, der auf der Straße hin und her fährt und wendet; der Markt verkauft jetzt alle sechs Waren. Geplant für spätere Stufen: Farm, Laden, Tiere, mehr Rezept-Stationen.

### 3D-Minispiele und Start in 3D

Das Spiel beginnt in der 3D-Welt (Ausnahmen: `?2d` in der Adresse und automatische Tests). Der Knopf „📋 Firma“ führt zur 2D-Verwaltung (Betriebe, Farm, Laden, Aufträge, Labor), 🧊 zurück in die Welt. Oben in der 3D-Anzeige steht das aktuelle Einstiegsziel; ist es geschafft, lässt sich die Belohnung dort abholen.

An den sechs Stationen laufen eigene 3D-Spiele direkt in der Welt (`src/world3d/games3d.js`), jeweils mit Startkarte, „Los!“ und 3-2-1:

- **Erzrausch** (Erz, Kohle, Lehm): Adern leuchten im Fels auf, antippen, bevor sie verschwinden. Gold zählt dreifach, Dynamit kostet Punkte, Serien geben Bonus.
- **Abstich** (Schmelzofen): Formen fahren unter der Gießpfanne durch; halten = gießen, bis zur grünen Marke füllen, nichts verschütten.
- **Ziegelkran** (Ziegelei): Die Ziegellage pendelt am Kran, tippen legt sie ab; was übersteht, bricht ab.
- **Fließband** (Montage): Tippe immer das Teil an, das der Bauplan gerade verlangt.

Die Kamera fährt dafür vor die Station und rückt im Hochformat so weit zurück, dass das Spielfeld ins Bild passt. Ertrag, Combo, XP, Tagesaufgaben und Erfolge laufen über dieselbe Abrechnung wie die 2D-Spiele (`applyResult` in `src/features/workshop.js`). `tests/world3d.cjs` spielt alle vier mit Bots.

### Alles in der Welt

Auch die Verwaltung hat Orte in der 3D-Welt: Auftragstafel, Bauamt (Betriebe), Labor, Laden, Logistikhof, Scheune (Farm und Reifekeller), Angelsteg und Hinterhof. Wer davor steht, öffnet die jeweilige Ansicht als Blatt über der Welt (`sheet()` in `src/world3d/index.js`, Klasse `w3sheet`), Labor und Angeln als Fenster. Orte unter dem nötigen Level zeigen ein Schloss. Die Felder der Farm sind begehbare Beete: säen, gießen, Schädlinge vertreiben und ernten direkt am Beet, die Pflanzen wachsen sichtbar. Modelle: `shop`, `lab`, `office`, `board`, `depot`, `barn`, `jetty`, `shack` in `tools/models3d/build.py`.

### Lieferfahrt in 3D

Wer in der Welt am Logistikhof eine Lieferung startet, fährt die Strecke selbst in 3D (`src/world3d/drive3d.js`): eigene Szene mit Landstraße, Landschaft, Münzen, Hütchen, Sperren, Felsen, langsamen Autos und dem Stadttor am Ziel. Gelenkt wird durch Ziehen, Tippen links/rechts oder Pfeiltasten. In jeder Hindernisreihe bleibt eine Spur frei. Regeln und Abrechnung sind die der 2D-Fahrt (`startDrive` in `src/features/transport.js` wählt 3D, solange die Welt offen ist); Abbrechen auf der Startkarte lässt die Ladung auf dem LKW. Im Test fährt ein Bot und muss mit mindestens 85 % Ladung ankommen.

### Angeln und alle Stationen in 3D

- **Angeln am Steg** (`gFish3` in `src/world3d/games3d.js`): Schwimmer, Biss mit Ring-Welle, Einholen durch Halten, Spannungsbalken und Fortschritt in der Kopfleiste. Fische, Chancen, Nacht- und Sturmbonus und Rute sind die des 2D-Angelns (`FISH`), 3 Würfe, Abrechnung wie vorher.
- **Ofen-Spiel** (`gBake`): Drei Öfen garen gleichzeitig, ein Tipp im grünen Bereich holt das Stück heraus. Gilt für Backstube, Fritteuse, Räucherofen und Glühofen.
- **Themen:** Alle 3D-Spiele (Erzrausch, Abstich, Kran, Fließband, Ofen) lassen sich per Thema umbenennen und einfärben (`SET` in `games3d.js`): Wein ist lila, Glas hellblau, Öl schwarz, die Endmontage nennt Kamera, Akku, Display. So hat jede der 37 Stationen ein eigenes 3D-Spiel.
- **Neue Orte:** Sandgrube, Kupfermine und Ölfeld mit Bohrturm; die Manufaktur (9 Stationen: Mühle, Bäckerei, Käserei, Chips, Räucherei, Kelterei, Brauerei, Weberei, Schneiderei) und das Elektronikwerk (8 Stationen: Glas bis Smartphone) mit je einem Ring pro Station vor dem Gebäude; die drei Untergrund-Werkstätten am Hinterhof; die geheimen Rezepte als Ringe vor dem Labor (erst sichtbar, wenn das Rezept entdeckt ist). Stationen unter ihrem Level zeigen ein Schloss. Neue Modelle: `hall`, `factory`, `derrick`.

### Karte, Ziel, Kurven und Wetter
- **Karte:** Oben rechts zeigt eine Minikarte die ganze Welt (grün = bereit, gelb = es fehlt etwas, grau = gesperrt) und deine Figur. Tippen öffnet die Liste aller Orte, nach Entfernung sortiert. Das gewählte Ziel erscheint als Pfeil mit Meterangabe unter der Karte, als gestrichelte Linie auf der Karte und als Leuchtstrahl in der Welt. Es verschwindet, wenn du ankommst.
- **Lieferfahrt:** Die Straße hat Kurven (die Hafenstrecke mehr), die Kollision bleibt spurbasiert. Die Hafenstrecke hat Container am Rand und das Meer links. Wetter (nur mit „Live-Daten“ an): Bei Regen und Schnee fallen Tropfen oder Flocken, der Himmel wird grau und der LKW lenkt träger, bei Nebel ist die Sicht kürzer.

## Labor

Ab Level 3, in der Werkstatt. Zwei Reiter:

- **Experiment:** drei Zutaten wählen (nach Kategorie gefiltert, standardmäßig nur Waren auf Lager), dann das Mischspiel mit genau diesen Zutaten als Flaschen. Stimmt das Rezept, gibt es 1 Stück, +1 bei sauberer Mischung (ab 70 %) und +1 mit dem Katalysator. Bei einem Fehlversuch bekommt jeder Kolben ✓ (gehört in das am besten passende unbekannte Rezept) oder ✗. Nur ✗-Zutaten werden verbraucht, mit dem Reinraum gar keine. Abbrechen kostet nichts.
- **Forschung** (`RES` in `src/data.js`, Logik in `src/features/lab.js`): kostet Credits und echte Zeit, immer eine gleichzeitig, läuft auch bei geschlossener App. Spektralanalyse (wiederholbar, verrät eine Zutat eines unbekannten Rezepts, Kosten ×1,6 je Durchgang), Katalysator, Materialkunde (+50 Lager), Prozessoptimierung I/II (je +5 % Werkstatt), Marktforschung (Verkauf 20 % statt 25 % unter Marktpreis), Reinraum. Die Boni stecken in `cap()`, `mult()` und `sellP()` in `src/state.js`.

## Minispiele


**Passend zur Station:** Jedes Spiel hat ein festes Bild (Fels, Schmelzofen, Gießpfanne, Presse, Flaschen …). Deshalb bekommt eine Station nur Spiele, deren Bild passt (`games` in `ST`, `src/data.js`: Mühle mahlt und reinigt Korn, Kelterei presst Trauben und setzt Wein an, die Wartung zieht Schrauben fest oder prüft Kabel). Titel, Anleitung, Zutaten der Mischflaschen und die Bezeichnung auf der Stationskarte stehen pro Station und Spiel in `src/games/theme.js` (`TH`); was dort fehlt, behält den Standardtext. Der Systemtest öffnet jede Kombination und prüft, dass der Titel der Station erscheint und kein Minenspiel an einer Fabrik läuft.

- **Neue Spiele mit eigener Mechanik:** Teig kneten (`knead.js`, Rhythmus beim Hin-und-her-Wischen, Bäckerei), Weben (`weave.js`, die Spur mit der Lücke antippen, Weberei), Zuschneiden (`cut.js`, gestrichelter Linie mit der Schere folgen, Schneiderei) und Rühren (`stir.js`, im Kreis wischen und die Geschwindigkeit im grünen Bereich halten, Brauerei, Käserei, Brennerei, Kunststoff). Der Test `tests/minigames.cjs` spielt jedes mit echten Gesten.
- **Rückmeldung** (`src/features/celebrate.js`): Nach jeder Runde zeigt eine Karte 1–3 Sterne (ab 30 / 70 / 97 %), die Ware und die Combo; beim Levelaufstieg erscheint ein Vollbild mit den neuen Freischaltungen.
- **Antrieb** (`src/features/daily.js`): Jeden Tag drei Aufgaben (herstellen, saubere Runden, dazu eine weitere je nach Level), bezahlt beim Erreichen. Sind alle drei geschafft, gibt es die Tageskiste; die Serie wächst pro Tag, ein verpasster Tag setzt sie zurück. Dazu 19 Erfolge (Herstellen, Verkaufen, Liefern, Level, Geld, Rezepte, Serie) mit automatischer Belohnung, zu sehen über „Erfolge ansehen“. Zähler stehen in `S.st`, der Stand in `S.daily` und `S.ach` und wird beim Laden bereinigt.
- **Startbildschirm:** Jedes Minispiel zeigt zuerst seine Anleitung und den Knopf „Los!“, danach zählt es 3-2-1 herunter (`src/games/gate.js`). Erst dann läuft die Zeit: Alle Spiele messen Zeit mit `gnow()` aus `src/games/clock.js`, und diese Uhr steht still, solange der Startbildschirm offen ist.
- **LKW-Fahrt** (`src/games/drive.js`): Straße in Perspektive mit Horizont, sanften Kurven, Tag/Nacht und Wetter. Gelenkt wird durch Ziehen mit dem Finger, kurzes Tippen links oder rechts wechselt die Spur, dazu Knöpfe und Pfeiltasten. Kurven drücken leicht nach außen. Hindernisse kommen in Reihen, in denen immer eine Spur frei bleibt, mit genug Abstand zum Ausweichen; langsame Autos werden überholt, solange kommen daneben nur Münzen. Der Test-Bot in `tests/minigames.cjs` muss mit mindestens 85 % Zustand ankommen.
- **Flöz:** Statt Grubengas gibt es eine Presslufthammer-Kachel (⚡): Für 4 Sekunden bricht jede Ader mit einem Schlag.

## Icons neu rendern

Die Icons entstehen per Skript in Blender (Cycles, transparenter Hintergrund, gleiches Licht für alle):

```bash
pip install bpy pillow                                   # Blender als Python-Modul (Python 3.13)
python tools/icons/render_icons.py src/assets/icons      # alle 59 Icons, ca. 3 Minuten auf 4 Kernen
python tools/icons/render_icons.py src/assets/icons erz  # nur einzelne
python tools/icons/render_props.py src/assets/props      # Requisiten der Minispiel-Szenen (getestet mit bpy 5.2.3)
python tools/icons/render_appicon.py public              # App-Icon (192 und 512 px)
```

Für die Szenen der Minispiele (Amboss, Ofen, Presse, Gießpfanne, Becherglas …) rendert `tools/icons/render_props.py` die Requisiten in Frontansicht nach `src/assets/props/` und schreibt in `anchors.json`, wo z. B. die Ofentür oder der Ausguss im Bild liegt. `src/games/scene.js` setzt die Requisiten danach auf die Bühne. Alle Minispiele spielen so in einer gerenderten Szene (Schaltkasten, Förderband, Grubenlore, Stollen, Kranhaken, Steg mit Angelrute, LKW auf der Straße …). Für die LKW-Fahrt sind LKW, Autos, Hütchen, Baken, Felsen, Bäume und Laternen flach von hinten gerendert (Verfolgerperspektive). Wo ein Test-Bot den Spielzustand nicht sicher aus dem Bild lesen kann, gibt das Spiel ihn über eine kleine Test-Schnittstelle heraus (`__state` an der Bühne bzw. am Canvas, `__cells` beim Rohrspiel).

Jedes Icon ist eine kleine Funktion in `tools/icons/render_icons.py`. Ein neues Icon braucht dort eine Funktion mit `@icon('schluessel')`; das Spiel findet die Datei dann automatisch. Gespeichert wird als WebP mit Qualität 78 – sichtbar gleich, aber deutlich kleiner, weil alle Bilder in die eine HTML-Datei eingebettet werden.
