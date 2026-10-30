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
- `src/features/`: je ein Spielbereich (Werkstatt, Farm, Betriebe, Markt, Laden, Aufträge, Export, Untergrund …)
- `src/games/`: je ein Minispiel; `games/index.js` ist das Register
- `src/ui.js`, `src/fx.js`, `src/util.js`: Overlay, Sound/Effekte, Helfer. Alle Geräusche entstehen live per Web Audio (Töne und gefiltertes Rauschen: Metall, Stein, Wasser, Zischen, LKW-Motor), keine Audiodateien
- `src/music.js`: leise Hintergrundmusik, ebenfalls live erzeugt (8 Takte Moll, Bass, Arpeggio); startet nach der ersten Berührung, pausiert im Hintergrund, abschaltbar in der Firmen-Übersicht
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

## Minispiele

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
