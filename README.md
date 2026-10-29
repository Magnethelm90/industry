# Industry Action

Mobiles Wirtschaftsspiel: Waren in Minispielen herstellen, Betriebe aufbauen, handeln, exportieren.

## Entwickeln

```bash
npm install
npm run dev      # Entwicklungsserver mit Live-Neuladen
npm run build    # baut dist/index.html (eine einzige Datei)
npm run lint     # prüft den Code
npm test         # baut und startet die Browser-Tests in tests/ (braucht Playwright)
npm run balance  # Tabelle: Credits und XP pro Minute je Station, Betrieb und Verkaufsweg
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
- `src/icons.svg`: Icon-Sprite

## Freischaltungen

Neue Spieler folgen 13 Zielen (`src/features/goals.js`). Bereiche öffnen sich nach Level (`UNL` in `src/data.js`): Betriebe und Aufträge ab 2, Farm, Laden und Labor ab 3, Untergrund und Elektronik ab 4, Flughafen ab 5. Was schon benutzt wird, bleibt immer offen.
