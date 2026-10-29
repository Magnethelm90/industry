"""Rendert die Requisiten der Minispiel-Szenen (Frontansicht) und ihre Ankerpunkte.

Aufruf (wie render_icons.py, braucht bpy und pillow):
    python tools/icons/render_props.py src/assets/props            # alle
    python tools/icons/render_props.py src/assets/props anvil      # einzelne

Neben den Bildern entsteht src/assets/props/anchors.json: für jedes Requisit die Lage
wichtiger Punkte in Bildanteilen (0..1, oben links = 0,0) – z. B. wo die Ofentür sitzt
oder wo die Pfanne ausgießt. Das Spiel legt Feuer, Flüssigkeit und Bewegungen genau darauf.
"""
import bpy, json, math, os, sys
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import render_icons as R
from render_icons import mat, box, cyl, ball, torus, rock, lathe, shape, rod, grad, srgb

PROPS = {}


def prop(key, size=320, elev=10, azim=0, shadow=True, pad=1.06, glass=False):
    def deco(f):
        PROPS[key] = (f, dict(size=size, elev=elev, azim=azim, shadow=shadow, pad=pad, glass=glass))
        return f
    return deco


def render_prop(path, anchors3d, size, elev, azim, shadow, pad, glass):
    """Wie render_icons.finish, aber eigenes Format und Rückgabe der Ankerpunkte."""
    s = bpy.context.scene
    s.render.resolution_x = s.render.resolution_y = size
    # Glas durchsichtig speichern (Alpha), damit z. B. Flüssigkeit dahinter sichtbar ist
    s.cycles.film_transparent_glass = glass
    bpy.context.view_layer.update()
    objs = [o for o in s.objects if o.type in ('MESH', 'CURVE', 'FONT')]
    dg = bpy.context.evaluated_depsgraph_get()
    pts = []
    for o in objs:
        oe = o.evaluated_get(dg)
        me = oe.to_mesh()
        pts += [oe.matrix_world @ v.co for v in me.vertices]
        oe.to_mesh_clear()
    zmin = min(p.z for p in pts)
    cam_d = bpy.data.cameras.new('cam')
    cam_d.type = 'ORTHO'
    cam = bpy.data.objects.new('cam', cam_d)
    s.collection.objects.link(cam)
    s.camera = cam
    e, a = math.radians(elev), math.radians(azim)
    direction = Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))
    center = sum(pts, Vector()) / len(pts)
    cam.location = center + direction * 30
    R.look_at(cam, center)
    bpy.context.view_layer.update()
    inv = cam.matrix_world.inverted()
    loc = [inv @ p for p in pts]
    xs, ys = [p.x for p in loc], [p.y for p in loc]
    w, h = max(xs) - min(xs), max(ys) - min(ys)
    cam_d.ortho_scale = max(w, h) * pad
    cam_d.shift_x = (max(xs) + min(xs)) / 2 / cam_d.ortho_scale
    cam_d.shift_y = (max(ys) + min(ys)) / 2 / cam_d.ortho_scale - (0.02 if shadow else 0)
    cam_d.clip_end = 200
    if shadow:
        bpy.ops.mesh.primitive_plane_add(size=80, location=(center.x, center.y, zmin))
        bpy.context.object.is_shadow_catcher = True
    bpy.context.view_layer.update()
    out = {}
    for k, v in anchors3d.items():
        c = world_to_camera_view(s, cam, Vector(v))
        out[k] = [round(c.x, 4), round(1 - c.y, 4)]
    s.render.filepath = path
    bpy.ops.render.render(write_still=True)
    if shadow:
        R.soften_shadow(path, strength=0.6, border=10)
    return out

# ---------------------------------------------------------------- Requisiten
# Jede Funktion baut das Modell und gibt Ankerpunkte (Weltkoordinaten) zurück.
# Kamera schaut entlang +Y (Frontansicht), x = rechts, z = oben.


@prop('rock', size=320)
def _rock():
    stone = mat('#6b6a72', rough=0.85)
    rock(1.6, (0, 0, 0.95), stone, seed=21, rough=0.12, sc=(1.35, 0.9, 0.7), sub=3)
    rock(0.7, (1.5, 0.2, 0.45), stone, seed=22, rough=0.15, sc=(1, 0.9, 0.7), sub=2)
    rock(0.55, (-1.6, 0.1, 0.35), stone, seed=23, rough=0.15, sub=2)
    dark = mat('#3f3e46', rough=0.9)
    for i, (x, z, r) in enumerate([(-0.6, 1.3, 0.22), (0.5, 1.05, 0.18), (0.05, 0.6, 0.2)]):
        ball(r, (x, -1.15, z), dark, sc=(1, 0.3, 0.7), seg=12)
    return {'hit': (0.0, -0.9, 1.75), 'center': (0, -1, 0.95)}


def _tool_handle(length, m):
    rod((0, 0, 0), (length, 0, 0), 0.07, m)
    return length


@prop('pickaxe', size=256, shadow=False)
def _pickaxe():
    wood = mat('#9a6a3c', rough=0.6)
    L = _tool_handle(2.4, wood)
    steel = mat('#aab4c2', metal=1, rough=0.25)
    # gebogener Kopf in der x-z-Ebene: Mittellinie biegt sich zum Stiel zurück, Spitzen laufen dünn aus
    right, left = [], []
    for i in range(21):
        t = -1 + i / 10
        cx, cz = -0.38 * t * t, 1.15 * t
        w = 0.15 * (1 - abs(t) ** 1.6) + 0.015
        right.append((cx + w, cz))
        left.append((cx - w, cz))
    shape(right + left[::-1], 0.2, (L, 0, 0), steel, 0.025, rot=(math.pi / 2, 0, 0))
    box(0.3, 0.26, 0.34, (L - 0.05, 0, 0), mat('#5b4a3a', metal=0.5, rough=0.4), 0.04)
    for x in (0.2, 0.45):
        torus(0.085, 0.02, (x, 0, 0), mat('#3b2f25', rough=0.7), rot=(0, math.pi / 2, 0))
    return {'pivot': (0.05, 0, 0), 'tip': (L - 0.38, 0, -1.15)}


@prop('hammer', size=256, shadow=False)
def _hammer():
    wood = mat('#9a6a3c', rough=0.6)
    L = _tool_handle(2.0, wood)
    head = mat('#7c8796', metal=1, rough=0.3)
    cyl(0.32, 1.1, (L, 0, -0.1), head, b=0.06)
    cyl(0.33, 0.12, (L, 0, -0.62), mat('#b9c3cf', metal=1, rough=0.2), b=0.03)
    for x in (0.2, 0.45):
        torus(0.085, 0.02, (x, 0, 0), mat('#3b2f25', rough=0.7), rot=(0, math.pi / 2, 0))
    return {'pivot': (0.05, 0, 0), 'face': (L, 0, -0.68)}


@prop('furnace', size=360, elev=8)
def _furnace():
    brick = mat('#9c4a2c', rough=0.85)
    mortar = mat('#c9b8a3', rough=0.9)
    box(2.6, 1.8, 2.4, (0, 0, 1.2), mortar, 0.06)
    for row in range(8):
        z = 0.15 + row * 0.3
        off = 0.32 if row % 2 else 0
        for col in range(5):
            x = -1.3 + off + col * 0.64
            if -1.32 < x < 1.32:
                w = min(0.58, 1.32 - x + 0.29) if x > 1.0 else 0.58
                box(w, 0.06, 0.25, (x, -0.92, z), brick, 0.02)
    # Öffnung (dunkel) mit Bogen
    arch = [(-0.62, 0)] + [(0.62 * math.cos(math.pi - math.pi * i / 16), 0.75 + 0.55 * math.sin(math.pi * i / 16)) for i in range(17)] + [(0.62, 0)]
    shape(arch, 0.05, (0, -0.98, 0.35), mat('#14090a', rough=1), 0.0)
    shape([(x * 1.18, y * 1.1 - 0.05) for x, y in arch], 0.06, (0, -0.95, 0.35), mat('#5b3426', rough=0.8), 0.02)
    box(2.9, 2.0, 0.22, (0, 0, 2.5), mat('#6b6460', rough=0.7), 0.05)
    cyl(0.3, 1.2, (0.7, 0.2, 3.2), mat('#3a3a40', metal=0.6, rough=0.4))
    box(2.8, 1.9, 0.2, (0, 0, 0.1), mat('#57504c', rough=0.8), 0.04)
    return {'door_l': (-0.62, -1.0, 0.35), 'door_r': (0.62, -1.0, 0.35), 'door_t': (0, -1.0, 1.65), 'chimney': (0.7, 0.2, 3.85)}


@prop('bellows', size=220, elev=6)
def _bellows():
    wood = mat('#8b5a2b', rough=0.6)
    leather = mat('#5a3826', rough=0.85)
    # Seitenansicht: zwei tropfenförmige Bretter, dazwischen gefaltetes Leder
    def drop(z0, dz):
        pts = [(-0.75 + 1.75 * t / 20, z0 + dz * math.sin(math.pi * min(1, t / 14)) * (1 if t < 18 else 0.6)) for t in range(21)]
        return pts
    shape([(-0.8, 0.0), (0.9, -0.1), (1.0, 0.0), (0.9, 0.1)], 0.9, (0, 0, 0.35), wood, 0.03, rot=(math.pi / 2, 0, 0))
    shape([(-0.8, 0.0), (0.9, -0.1), (1.0, 0.0), (0.9, 0.1)], 0.9, (0, 0, 1.05), wood, 0.03, rot=(math.pi / 2, 0, -0.0))
    shape([(-0.75, 0.38), (0.9, 0.3), (0.9, 1.1), (-0.75, 1.02)], 0.75, (0, 0, 0), leather, 0.06, rot=(math.pi / 2, 0, 0))
    for k in range(3):
        rod((-0.4 + k * 0.45, -0.42, 0.42), (-0.4 + k * 0.45, -0.42, 0.98), 0.025, mat('#3b2418', rough=0.9))
    cyl(0.12, 0.7, (-1.1, 0, 0.7), mat('#a8a29e', metal=1, rough=0.3), rot=(0, math.pi / 2, 0), r2=0.05)
    for z in (0.35, 1.05):
        rod((0.95, 0, z), (1.6, 0, z + (0.12 if z > 1 else -0.12)), 0.06, wood)
    return {'nozzle': (-1.45, 0, 0.7), 'top': (0, 0, 1.12), 'bottom': (0, 0, 0.3)}


@prop('press', size=360, elev=6)
def _press():
    steel = mat('#4b5563', metal=0.8, rough=0.35)
    yel = mat('#f5b82e', rough=0.35, coat=0.6)
    box(3.0, 1.4, 0.35, (0, 0, 0.18), steel, 0.05)
    box(2.0, 1.0, 0.12, (0, 0, 0.42), mat('#9aa3b2', metal=1, rough=0.3), 0.03)
    for x in (-1.25, 1.25):
        cyl(0.17, 3.4, (x, 0, 2.0), mat('#c0c8d4', metal=1, rough=0.2))
    box(3.0, 1.2, 0.6, (0, 0, 3.75), yel, 0.08)
    for i in range(6):
        shape([(0, 0), (0.25, 0), (0.45, 0.3), (0.2, 0.3)], 0.02, (-1.3 + i * 0.5, -0.62, 3.6), mat('#1b1c22', rough=0.5), 0.0, sc=1)
    cyl(0.45, 0.5, (0, 0, 3.25), steel)
    return {'bed': (0, -0.5, 0.48), 'beam': (0, -0.5, 3.0), 'bed_l': (-1.0, -0.5, 0.48), 'bed_r': (1.0, -0.5, 0.48)}


@prop('piston', size=220, elev=6, shadow=False)
def _piston():
    cyl(0.22, 2.4, (0, 0, 1.2), mat('#d9dee6', metal=1, rough=0.12))
    box(1.6, 0.9, 0.3, (0, 0, -0.1), mat('#6b7280', metal=0.9, rough=0.3), 0.05)
    return {'top': (0, 0, 2.4), 'bottom': (0, -0.45, -0.25)}


@prop('anvil', size=320, elev=8)
def _anvil():
    iron = mat('#3b4250', metal=0.8, rough=0.35)
    top = [(-1.9, 0.0), (-1.2, 0.18), (-0.9, 0.35), (1.3, 0.35), (1.3, -0.05), (-0.5, -0.05)]
    shape(top, 0.9, (0, 0, 1.6), iron, 0.04, rot=(math.pi / 2, 0, 0))
    box(1.0, 0.75, 0.9, (0.3, 0, 1.1), iron, 0.06)
    box(1.8, 1.0, 0.35, (0.3, 0, 0.5), iron, 0.06)
    box(2.4, 1.3, 0.35, (0.3, 0, 0.18), mat('#6b4426', rough=0.7), 0.05)
    box(2.2, 0.92, 0.03, (0.2, 0, 1.96), mat('#9aa3b2', metal=1, rough=0.25), 0.01)
    return {'face': (0.2, -0.46, 1.97), 'face_l': (-0.8, -0.46, 1.97), 'face_r': (1.25, -0.46, 1.97)}


@prop('ladle', size=280, elev=10, shadow=False)
def _ladle():
    pot = mat('#3a3f4a', metal=0.7, rough=0.4)
    lathe([(0, 0), (0.55, 0.02), (0.75, 0.4), (0.82, 0.95), (0.86, 1.0), (0.78, 1.0), (0.72, 0.42), (0.5, 0.1), (0, 0.1)], (0, 0, 0), pot)
    lathe([(0, 0.75), (0.76, 0.75), (0, 0.76)], (0, 0, 0), mat('#ff7a1a', emit=4))
    shape([(0, 0), (0.35, 0.12), (0.35, -0.04)], 0.25, (0.8, 0, 0.92), pot, 0.02, rot=(math.pi / 2, 0, 0))
    rod((-0.8, 0, 0.8), (-2.4, 0, 1.2), 0.07, mat('#6b4426', rough=0.6))
    return {'lip': (1.15, 0, 1.0), 'pivot': (0, 0, 0.5)}


@prop('mold', size=300, elev=4)
def _mold():
    sand = mat('#8f7356', rough=0.95)
    steel = mat('#4b5563', metal=0.8, rough=0.35)
    box(2.6, 1.2, 0.3, (0, 0, 0.15), steel, 0.04)
    for x in (-1.15, 1.15):
        box(0.3, 1.2, 2.0, (x, 0, 1.2), steel, 0.04)
    box(2.0, 0.2, 1.85, (0, 0.5, 1.22), sand, 0.02)
    for x in (-1.15, 1.15):
        for z in (0.6, 1.8):
            cyl(0.07, 0.06, (x, -0.62, z), mat('#c0c8d4', metal=1, rough=0.2), rot=(math.pi / 2, 0, 0), b=0.01)
    return {'in_l': (-1.0, -0.6, 0.3), 'in_r': (1.0, -0.6, 0.3), 'in_t': (0, -0.6, 2.2)}


@prop('beaker', size=300, elev=6, glass=True)
def _beaker():
    glass = mat('#e8f6ff', rough=0.03, trans=1, ior=1.3)
    lathe([(0.9, 0), (0.95, 0.03), (0.95, 2.2), (1.02, 2.3), (0.95, 2.32), (0.9, 2.2), (0.9, 0.08), (0, 0.08), (0, 0)], m=glass)
    tick = mat('#ffffff', rough=0.5, emit=0.5)
    for i in range(1, 5):
        box(0.2 if i % 2 else 0.32, 0.02, 0.025, (-0.55, -0.93, i * 0.42), tick, 0)
    box(2.4, 1.6, 0.12, (0, 0, -0.06), mat('#2a2f3a', rough=0.5), 0.03)
    return {'in_l': (-0.88, -0.9, 0.09), 'in_r': (0.88, -0.9, 0.09), 'in_t': (0, -0.9, 2.2)}


def _bottle(col):
    g = mat(col, rough=0.1, coat=1, trans=0.15)
    lathe([(0, 0), (0.45, 0), (0.48, 0.06), (0.48, 1.0), (0.3, 1.25), (0.16, 1.4), (0.16, 1.65), (0, 1.65)], m=g)
    lathe([(0.485, 0.3), (0.485, 0.75)], m=mat('#f8fafc', rough=0.6))
    return {'mouth': (0, 0, 1.65), 'base': (0, 0, 0)}


@prop('bottle_a', size=180, shadow=False)
def _ba():
    return _bottle('#8b5cf6')


@prop('bottle_b', size=180, shadow=False)
def _bb():
    return _bottle('#06b6d4')


@prop('bottle_c', size=180, shadow=False)
def _bc():
    return _bottle('#ec4899')


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    out = os.path.abspath(argv[0] if argv else 'props')
    keys = argv[1:] or list(PROPS)
    os.makedirs(out, exist_ok=True)
    jpath = os.path.join(out, 'anchors.json')
    data = json.load(open(jpath)) if os.path.exists(jpath) else {}
    for k in keys:
        f, opt = PROPS[k]
        R.reset()
        R._mats.clear()
        anchors = f() or {}
        data[k] = render_prop(os.path.join(out, k + '.webp'), anchors, **opt)
        print('ok', k, data[k], flush=True)
    json.dump(data, open(jpath, 'w'), indent=1, sort_keys=True)


if __name__ == '__main__':
    main()
