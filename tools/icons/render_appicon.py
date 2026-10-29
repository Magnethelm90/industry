"""Rendert das App-Icon (für den Startbildschirm) in public/.

Aufruf (braucht bpy und pillow):
    python tools/icons/render_appicon.py public

Nimmt das Maschinen-Icon in 512 px und legt es auf den Hintergrund des Spiels.
Der Inhalt bleibt in der inneren 70-%-Zone, damit runde oder abgerundete Masken (maskable) nichts abschneiden.
"""
import os, sys
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import render_icons as R


def background(n):
    # Wie der Spielhintergrund: dunkles Blau mit violettem und blauem Schein
    im = Image.new('RGB', (n, n), (7, 11, 22))
    glow = Image.new('RGB', (n, n), (0, 0, 0))
    d = ImageDraw.Draw(glow)
    d.ellipse((-n * .3, -n * .45, n * .9, n * .55), fill=(27, 42, 102))
    d.ellipse((n * .35, -n * .1, n * 1.3, n * .8), fill=(59, 29, 110))
    glow = glow.filter(ImageFilter.GaussianBlur(n * .12))
    return Image.blend(im, glow, 0.9)


def main():
    out = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'public')
    os.makedirs(out, exist_ok=True)
    R.SIZE = 512
    f, cam = R.ICONS['maschine']
    R.reset()
    R._mats.clear()
    f()
    tmp = os.path.join(out, '_appicon.webp')
    R.finish(tmp, **cam)
    ic = Image.open(tmp).convert('RGBA')
    os.remove(tmp)
    for n in (512, 192):
        bg = background(n).convert('RGBA')
        s = int(n * .7)
        bg.alpha_composite(ic.resize((s, s), Image.LANCZOS), ((n - s) // 2, (n - s) // 2))
        bg.convert('RGB').save(os.path.join(out, f'icon-{n}.png'), optimize=True)
        print('ok', n, flush=True)


if __name__ == '__main__':
    main()
