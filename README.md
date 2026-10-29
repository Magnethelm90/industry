# Industry Action

Mobiles Wirtschaftsspiel: Waren in Minispielen herstellen, Betriebe aufbauen, handeln, exportieren.

## Entwickeln

```bash
npm install
npm run dev      # Entwicklungsserver mit Live-Neuladen
npm run build    # baut dist/index.html (eine einzige Datei)
npm run lint     # prüft den Code
npm test         # baut und startet die Browser-Tests in tests/ (braucht Playwright)
ONLY=fish REP=5 node tests/minigames.cjs   # ein Minispiel mehrfach vom Bot spielen lassen (nach npm run build)
npm run balance  # Tabelle: Credits und XP pro Minute je Station, Betrieb und Verkaufsweg
node tools/pace.mjs  # Simulation: Spielminuten bis zu jedem Level
```

## Aufbau

- `index.html`: Grundgerüst (Kopfzeile, Bildschirme, Navigation)
- `src/main.js`: Start, Hintergrund-Takt (1 s), Speichern
- `src/app.js`: Navigation und Bildschirmaufbau
- `src/data.js`: alle Spieldaten (Waren, Stationen, Betriebe, Länder …)
- `src/state.js`: Spielstand und abgeleitete Werte (Level, Lager, Preise)
- `src/features/`: je ein Spielbereich (Werkstatt, Farm, Betriebe, Markt, Laden, Aufträge, Export, Untergrund …)
- `src/games/`: je ein Minispiel; `games/index.js` ist das Register
- `src/ui.js`, `src/fx.js`, `src/util.js`: Overlay, Sound/Effekte, Helfer
- `src/assets/icons/`: in Blender gerenderte Icons (WebP, 192 px)
- `src/icons.svg`: nur noch Farbverläufe für das Smartphone-Minispiel

## Freischaltungen

Neue Spieler folgen 21 Zielen (`src/features/goals.js`). Bereiche öffnen sich nach Level (`UNL` in `src/data.js`): Betriebe und Aufträge ab 2, Farm, Laden mit Filialen und Labor ab 3, Untergrund und Elektronik ab 4, Flughafen ab 5. Was schon benutzt wird, bleibt immer offen. Betriebe (außer Läden) verlieren 1 % Zustand pro 15 Minuten (`WEAR` in `src/data.js`) und fallen bei 0 % aus; ab unter 85 % kann man warten. Die XP-Schwellen stehen in `LV_XP` (`src/data.js`); laut `tools/pace.mjs` braucht ein pausenlos spielender Spieler etwa 12 / 35 / 66 Minuten bis Level 3 / 4 / 5.

## Icons neu rendern

Die Icons entstehen per Skript in Blender (Cycles, transparenter Hintergrund, gleiches Licht für alle):

```bash
pip install bpy pillow                                   # Blender als Python-Modul (Python 3.13)
python tools/icons/render_icons.py src/assets/icons      # alle 59 Icons, ca. 3 Minuten auf 4 Kernen
python tools/icons/render_icons.py src/assets/icons erz  # nur einzelne
python tools/icons/render_props.py src/assets/props      # Requisiten der Minispiel-Szenen
```

Für die Szenen der Minispiele (Amboss, Ofen, Presse, Gießpfanne, Becherglas …) rendert `tools/icons/render_props.py` die Requisiten in Frontansicht nach `src/assets/props/` und schreibt in `anchors.json`, wo z. B. die Ofentür oder der Ausguss im Bild liegt. `src/games/scene.js` setzt die Requisiten danach auf die Bühne. Alle Minispiele spielen so in einer gerenderten Szene (Schaltkasten, Förderband, Grubenlore, Stollen, Kranhaken, Steg mit Angelrute …). Wo ein Test-Bot den Spielzustand nicht sicher aus dem Bild lesen kann, gibt das Spiel ihn über eine kleine Test-Schnittstelle heraus (`__state` an der Bühne bzw. am Canvas, `__cells` beim Rohrspiel).

Jedes Icon ist eine kleine Funktion in `tools/icons/render_icons.py`. Ein neues Icon braucht dort eine Funktion mit `@icon('schluessel')`; das Spiel findet die Datei dann automatisch.
