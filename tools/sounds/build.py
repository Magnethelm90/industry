#!/usr/bin/env python3
"""Baut die Spielsounds aus den heruntergeladenen CC0-Paketen (siehe QUELLEN.md).

Aufruf: python3 -I tools/sounds/build.py <Ordner mit den entpackten Paketen>
Ergebnis: src/assets/sfx/*.mp3 (kurze Effekte, werden in die Spieldatei eingebettet),
          src/assets/sfx/engine.wav (LKW-Motor als nahtlose Schleife, deshalb unkomprimiert),
          public/music.mp3 (Hintergrundmusik, wird erst bei Bedarf nachgeladen).
Braucht ffmpeg und numpy."""
import json, subprocess, sys, wave
from pathlib import Path
import numpy as np

SRC = Path(sys.argv[1]).resolve()
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'src/assets/sfx'
OUT.mkdir(parents=True, exist_ok=True)

# Name im Spiel -> Datei im Paket (Pfad relativ zu SRC). Mehrere Dateien = zufällige Abwechslung.
SFX = {
    'tick':    ['x/kenney_interfaceSounds/Audio/tick_004.ogg'],
    'good':    ['x/kenney_interfaceSounds/Audio/confirmation_001.ogg'],
    'perfect': ['x/kenney_interfaceSounds/Audio/confirmation_003.ogg'],
    'miss':    ['x/kenney_interfaceSounds/Audio/error_004.ogg'],
    'err':     ['x/kenney_interfaceSounds/Audio/error_006.ogg'],
    'coin':    ['x/RPGsounds_Kenney/OGG/handleCoins2.ogg'],
    'buy':     ['x/kenney_casino-audio/Audio/chips-stack-1.ogg'],
    'win':     ['x/jingleSounds_Kenney/OGG/jingles_PIZZA/jingles_PIZZA02.ogg'],
    'crash':   ['qubodup-crash.ogg'],
    'clank':   ['x/100-CC0-wood-metal-SFX/metal_hit_01.ogg', 'x/100-CC0-wood-metal-SFX/hammer_02.ogg'],
    'thud':    ['x/sfx_breaking_and_falling/bfh1_rock_hit_01.ogg', 'rock_break_0.ogg'],
    'ratchet': ['x/100-CC0-wood-metal-SFX/tools_02.ogg'],
    'splash':  ['x/water-splash-slime-sfx/splash_02.ogg'],
    'whoosh':  ['x/swishes/swishes/swish-3.wav'],
    'water':   ['x/water-splash-slime-sfx/loop_water_01.ogg'],
}
MAXLEN = {'water': 1.6}  # Sekunden, längere Dateien werden gekürzt und ausgeblendet

def ff(*a):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *a], check=True)

def peak_db(f):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(f), '-af', 'volumedetect', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
    return float(r.split('max_volume:')[1].split('dB')[0])

def clean(f):
    for p in OUT.glob('*.mp3'): p.unlink()

clean(OUT)
manifest = {}
for name, files in SFX.items():
    manifest[name] = []
    for i, rel in enumerate(files):
        src = SRC / rel
        dst = OUT / f'{name}{i}.mp3'
        gain = -1.0 - peak_db(src)  # alle auf -1 dB Spitze, die Lautstärke im Spiel regelt fx.js
        af = [f'volume={gain:.1f}dB', 'silenceremove=start_periods=1:start_threshold=-50dB']
        if name in MAXLEN:
            m = MAXLEN[name]; af += [f'atrim=0:{m}', f'afade=t=out:st={m-.4:.2f}:d=0.4']
        ff('-i', str(src), '-map_metadata', '-1', '-af', ','.join(af), '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '64k', str(dst))
        manifest[name].append(dst.name)

# LKW-Motor: 1,6 s aus der Mitte, Ende weich in den Anfang überblendet -> klickfreie Schleife
RATE, LEN, XF = 22050, 1.6, .2
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(SRC / 'x/car_sound_effects_pack/Car_Engine_Loop.ogg'),
                      '-ac', '1', '-ar', str(RATE), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
a = np.frombuffer(raw, dtype=np.float32)
n, x = int(LEN * RATE), int(XF * RATE)
s0 = (len(a) - n - x) // 2
seg = a[s0:s0 + n].copy()
tail = a[s0 + n:s0 + n + x]
w = np.linspace(0, 1, x, dtype=np.float32)
seg[:x] = seg[:x] * np.sqrt(w) + tail * np.sqrt(1 - w)
seg *= .89 / max(1e-6, np.abs(seg).max())
with wave.open(str(OUT / 'engine.wav'), 'wb') as wv:
    wv.setnchannels(1); wv.setsampwidth(2); wv.setframerate(RATE)
    wv.writeframes((seg * 32767).astype('<i2').tobytes())

# Hintergrundmusik: Mono genügt am Handy, -16 LUFS damit sie leise unter den Effekten liegt
ff('-i', str(SRC / 'hot_spring_town.ogg'), '-map_metadata', '-1', '-af', 'loudnorm=I=-16:TP=-1.5', '-ac', '1', '-ar', '44100',
   '-c:a', 'libmp3lame', '-b:a', '64k', str(ROOT / 'public/music.mp3'))

(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=1) + '\n')
print(json.dumps(manifest))
