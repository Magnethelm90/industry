"""Baut die 3D-Modelle für den 3D-Modus in Blender und exportiert sie als GLB nach src/assets/models.

Aufruf (braucht bpy):
    python3 tools/models3d/build.py src/assets/models            # alle
    python3 tools/models3d/build.py src/assets/models mine_erz   # einzelne

Blickrichtung: „vorne“ ist in Blender −Y (wird im Spiel zu +Z). Ursprung = Mitte am Boden.
Gleiche Materialien werden zu einem Objekt vereint, damit das Spiel wenige Zeichenaufrufe braucht.
"""
import bpy, bmesh, math, os, random, sys
from mathutils import Vector

OUT = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
OUTDIR = OUT[0] if OUT else 'src/assets/models'
ONLY = OUT[1:] if len(OUT) > 1 else []

def lin(c):
    c = c.lstrip('#'); c = ''.join(ch * 2 for ch in c) if len(c) == 3 else c; r, g, b = (int(c[i:i + 2], 16) / 255 for i in (0, 2, 4))
    f = lambda v: v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4
    return (f(r), f(g), f(b), 1)

_M = {}
def mat(color, rough=.8, metal=0., emit=None, strength=2.):
    key = (color, rough, metal, emit, strength)
    if key in _M: return _M[key]
    m = bpy.data.materials.new('m_' + color.lstrip('#') + ('_e' if emit else ''))
    m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = lin(color); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = lin(emit); b.inputs['Emission Strength'].default_value = strength
    _M[key] = m
    return m

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _M.clear()
    for m in list(bpy.data.materials): bpy.data.materials.remove(m)

def _fin(o, m, name=None, smooth=False, bevel=0.):
    o.data.materials.clear(); o.data.materials.append(m)
    if name: o.name = name
    if bevel:
        bm = o.modifiers.new('b', 'BEVEL'); bm.width = bevel; bm.segments = 1; bm.limit_method = 'ANGLE'
        bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier='b')
    if smooth: bpy.ops.object.shade_smooth()
    else: bpy.ops.object.shade_flat()
    return o

def box(size, loc, m, rot=(0, 0, 0), bevel=.04, name=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object; o.scale = size; bpy.ops.object.transform_apply(scale=True)
    return _fin(o, m, name, bevel=min(bevel, min(size) * .35))

def cyl(r, h, loc, m, rot=(0, 0, 0), seg=12, r2=None, smooth=False, name=None):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=seg, radius=r, depth=h, location=loc, rotation=rot)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=seg, radius1=r, radius2=r2, depth=h, location=loc, rotation=rot)
    return _fin(bpy.context.active_object, m, name, smooth)

def ball(r, loc, m, scale=(1, 1, 1), sub=2, smooth=True, name=None, jitter=0., seed=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=r, location=loc)
    o = bpy.context.active_object; o.scale = scale; bpy.ops.object.transform_apply(scale=True)
    if jitter:
        random.seed(seed)
        for v in o.data.vertices: v.co += Vector((random.uniform(-1, 1), random.uniform(-1, 1), random.uniform(-1, 1))) * jitter
    return _fin(o, m, name, smooth)

def join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1: bpy.ops.object.join()
    o = bpy.context.active_object; o.name = name
    return o

def merge_by_material():
    """Alle Meshes mit gleichem Material zu einem Objekt vereinen (außer benannte Einzelteile mit „!“)."""
    groups = {}
    for o in [o for o in bpy.context.scene.objects if o.type == 'MESH' and not o.name.startswith('!')]:
        groups.setdefault(o.data.materials[0].name, []).append(o)
    for k, os_ in groups.items(): join(os_, 'g_' + k)

def export(name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in bpy.context.scene.objects:
        if o.type == 'MESH': o.select_set(True)
    path = os.path.join(OUTDIR, name + '.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
                              export_cameras=False, export_lights=False, export_texcoords=False, export_attributes=False, export_extras=False)
    print(name, os.path.getsize(path), 'Byte')

MODELS = {}
def model(f):
    MODELS[f.__name__] = f; return f

# ---------------------------------------------------------------- Palette
WOOD = '#8a5a2b'; WOOD2 = '#6b4423'; STONE = '#8b93a0'; STONE2 = '#6b7280'; BRICK = '#a5543a'; BRICK2 = '#8b4630'; METAL = '#64748b'; DARK = '#1b1d26'
GRASS = '#5fa84a'

# ---------------------------------------------------------------- Figur: Teile mit Drehpunkt am Gelenk
@model
def worker():
    skin = mat('#f2c9a0', .7); vest = mat('#f97316', .65); vest2 = mat('#fde047', .5, emit='#fde047', strength=.4); pants = mat('#3a6fe0', .8)
    helm = mat('#facc15', .4); boot = mat('#8a4f27', .9); belt = mat('#5b3a1f', .8); dk = mat('#222222', .5)
    body = [box((.62, .36, .72), (0, 0, 1.18), vest, bevel=.12), box((.64, .38, .1), (0, 0, 1.0), vest2), box((.64, .38, .1), (0, 0, 1.3), vest2), box((.66, .4, .12), (0, 0, .86), belt),
            ball(.27, (0, 0, 1.84), skin, scale=(1, .95, 1.05)), ball(.31, (0, 0, 1.93), helm, scale=(1.05, 1.1, .8)), box((.7, .34, .06), (0, -.2, 1.9), helm, bevel=.03),
            box((.08, .5, .08), (0, 0, 2.18), helm, bevel=.02), ball(.045, (-.1, -.25, 1.82), dk, sub=1), ball(.045, (.1, -.25, 1.82), dk, sub=1), ball(.07, (0, -.27, 1.78), skin, sub=1),
            box((.42, .22, .5), (0, .27, 1.2), mat('#6b4423', .9), bevel=.05)]
    join(body, '!body')
    for s, nm in ((-1, 'L'), (1, 'R')):
        leg = [box((.24, .26, .6), (s * .17, 0, .4), pants, bevel=.05), box((.27, .34, .2), (s * .17, -.04, .1), boot, bevel=.05)]
        join(leg, '!leg' + nm); bpy.context.scene.cursor.location = (s * .17, 0, .78); bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
        arm = [box((.18, .2, .52), (s * .44, 0, 1.28), vest, bevel=.05), ball(.1, (s * .44, 0, .98), skin, sub=1)]
        if s == 1: arm += [cyl(.025, .9, (.44, -.3, .95), mat(WOOD, .8), rot=(math.radians(90), 0, 0), seg=6), box((.5, .06, .08), (.44, -.76, .95), mat('#9aa3b2', .4, .8), bevel=.015)]
        join(arm, '!arm' + nm); bpy.context.scene.cursor.location = (s * .44, 0, 1.52); bpy.ops.object.origin_set(type='ORIGIN_CURSOR')

# ---------------------------------------------------------------- Minen
def mine_build(rock_col, ore_col, ore_emit=None):
    rock = mat(rock_col, .95); rock.name = 'rock'; rock2 = mat(STONE2, .95); wood = mat(WOOD, .85); wood2 = mat(WOOD2, .9); dark = mat('#08090d', 1)
    ore = mat(ore_col, .5, .1); ore.name = 'ore'
    # Hügel aus mehreren verformten Felsen
    ball(5.4, (0, 1.6, 1.2), rock, scale=(1.25, 1.0, .72), sub=2, jitter=.25, seed=3, smooth=False)
    ball(3.4, (-4.6, 1.5, -1.2), rock2, scale=(1, 1, .7), sub=2, jitter=.2, seed=5, smooth=False)
    ball(3.0, (4.8, .9, -.4), rock, scale=(1, 1, .7), sub=2, jitter=.2, seed=8, smooth=False)
    ball(2.2, (0, 2.2, 3.2), rock2, scale=(1, 1, .65), sub=1, jitter=.2, seed=2, smooth=False)
    # Erzadern im Fels
    for i, (x, z, r) in enumerate([(-2.8, 3.6, .5), (3.2, 3.0, .55), (-4, 1.6, .4), (1.8, 4.6, .45), (4.4, 1.4, .35)]):
        ball(r, (x, -3.6 + (i % 2) * .3, z), ore, sub=1, jitter=.08, seed=i, smooth=False)
    # Stolleneingang: Holzrahmen
    box((3.4, .5, 3.6), (0, -4.0, 1.8), dark, bevel=.05)
    for s in (-1, 1): box((.55, .65, 4.0), (s * 1.95, -4.15, 2.0), wood, bevel=.05)
    box((4.8, .75, .7), (0, -4.2, 4.0), wood, bevel=.06); box((4.2, .6, .35), (0, -4.35, 3.6), wood2, bevel=.04)
    for s in (-1, 1): box((.3, 1.1, .35), (s * 1.6, -4.15, 3.5), wood2, rot=(0, s * .8, 0), bevel=.03)
    # Laterne
    box((.05, .05, .5), (1.2, -4.5, 3.6), mat(DARK, .5), bevel=0)
    box((.3, .3, .4), (1.2, -4.5, 3.2), mat('#fde68a', .4, emit='#fbbf24', strength=2.5), bevel=.05)
    # Schienen und Schwellen aus dem Stollen
    for i in range(7): box((2.2, .28, .1), (0, -5.0 - i * .9, .06), wood2, bevel=.02)
    for s in (-1, 1): box((.1, 7, .14), (s * .75, -8.3, .17), mat('#94a3b8', .4, .9), bevel=.02)
    # Lore mit Erz
    lore = [box((1.5, 1.0, .12), (0, -8.2, .8), mat(METAL, .5, .6)), box((1.5, .08, .5), (0, -8.2 + .52, .8 + .15), mat(METAL, .5, .6)), box((1.5, .08, .5), (0, -8.2 - .52, .8 + .15), mat(METAL, .5, .6)),
            box((.08, 1.04, .5), (.78, -8.2, .95), mat(METAL, .5, .6)), box((.08, 1.04, .5), (-.78, -8.2, .95), mat(METAL, .5, .6))]
    for sx in (-.5, .5):
        for sy in (-.45, .45): cyl(.26, .12, (sx, -8.2 + sy, .4), mat('#222', .6, .5), rot=(0, math.radians(90), 0), seg=10)
    for i, (x, y) in enumerate([(-.3, -.15), (.3, .1), (0, -.3), (.35, -.35), (-.35, .25)]):
        ball(.28, (x, -8.2 + y, 1.15 + (i % 2) * .15), ore, sub=1, jitter=.06, seed=i + 20, smooth=False)
    # Kisten und Spitzhacke, Steine am Weg
    box((.9, .9, .9), (3.6, -6.6, .45), wood, rot=(0, 0, .3)); box((.8, .8, .8), (3.9, -6.3, 1.25), wood2, rot=(0, 0, -.2))
    for i, (x, y, r) in enumerate([(-2.6, -6.2, .45), (-3.4, -5.4, .3), (2.6, -9.0, .35), (-1.8, -9.6, .3)]):
        ball(r, (x, y, r * .6), rock2, sub=1, jitter=.07, seed=i + 40, smooth=False)
    # Warnschild
    box((.12, .12, 1.6), (-3.0, -7.0, .8), wood2, bevel=0); box((.9, .1, .6), (-3.0, -7.05, 1.7), mat('#facc15', .6), bevel=.03)

@model
def mine(): mine_build('#868f9e', '#c2603a')  # Gestein und Erz heißen „rock“ und „ore“; das Spiel färbt sie je Mine um

# ---------------------------------------------------------------- Schmelzofen
@model
def furnace():
    br = mat(BRICK, .9); br2 = mat(BRICK2, .9); st = mat(STONE2, .9); metal = mat('#475569', .45, .7); dark = mat('#0c0a09', 1)
    glow = mat('#fb923c', .4, emit='#f97316', strength=2.2); wood = mat(WOOD, .85)
    box((7.4, 6.2, .6), (0, 0, .3), st, bevel=.05)                      # Fundament
    box((6.4, 5.0, 4.6), (0, 0, 2.9), br, bevel=.12)                    # Hauptkörper
    for z in (1.4, 2.6, 3.8): box((6.6, 5.2, .12), (0, 0, z), br2, bevel=.02)  # Ziegelfugen-Bänder
    box((6.9, 5.5, .5), (0, 0, 5.4), st, bevel=.08)                     # Deckplatte
    for i in range(5): box((.7, .1, .7), (-2.4 + i * 1.2, -2.52, 4.4), br2, bevel=.02)
    # Ofentür mit Glut
    box((2.6, .5, 2.6), (0, -2.35, 1.9), mat('#2a1d17', .9), bevel=.1); box((2.0, .2, 2.0), (0, -2.6, 1.9), dark, bevel=.05)
    box((1.8, .1, .9), (0, -2.66, 1.35), glow, bevel=.02)
    box((2.9, .3, .3), (0, -2.55, 3.35), metal, bevel=.05)
    for s in (-1, 1): box((.3, .3, 2.7), (s * 1.4, -2.55, 1.9), metal, bevel=.05)
    # Schornstein, Rohre, Dach
    cyl(.95, 6.2, (-1.7, .8, 8.3), br, seg=10, r2=.78); cyl(1.1, .5, (-1.7, .8, 11.4), st, seg=10)
    cyl(.9, .12, (-1.7, .8, 11.67), glow, seg=10)
    cyl(.28, 4.8, (2.2, 1.6, 4.5), metal, seg=8); cyl(.36, .5, (2.2, 1.6, 5.7), metal, seg=8)
    cyl(.28, 2.6, (2.2, -.2, 5.8), metal, rot=(math.radians(90), 0, 0), seg=8)
    # Kohlehaufen und Schubkarre
    for i in range(9):
        a = i * 1.1; ball(.34, (-3.8 + math.cos(a) * .6, -2.6 + math.sin(a) * .4, .45 + (i % 3) * .2), mat('#14151b', .5, .2), sub=1, jitter=.06, seed=i + 5, smooth=False)
    box((1.2, 1.7, .12), (3.9, -3.2, .75), wood, bevel=.03); box((1.2, .1, .5), (3.9 + .6, -3.2, .95), wood, bevel=.02); box((1.2, .1, .5), (3.9 - .6, -3.2, .95), wood, bevel=.02)
    cyl(.28, .12, (3.9, -3.9, .3), mat('#222', .6), rot=(0, math.radians(90), 0), seg=10)
    # Amboss und Fass
    box((.9, .5, .5), (-3.6, -3.7, .5), mat('#2f3640', .4, .8), bevel=.05); box((.5, .3, .35), (-3.6, -3.7, .9), mat('#2f3640', .4, .8), bevel=.03)
    cyl(.5, 1.1, (3.7, 2.3, .85), wood, seg=12); cyl(.52, .1, (3.7, 2.3, .55), metal, seg=12); cyl(.52, .1, (3.7, 2.3, 1.15), metal, seg=12)


# ---------------------------------------------------------------- Ziegelei
@model
def brickworks():
    br = mat(BRICK, .9); br2 = mat('#c0694a', .9); clay = mat('#c58a5b', .95); st = mat(STONE2, .9); wood = mat(WOOD, .85); metal = mat('#475569', .45, .7)
    dark = mat('#0c0a09', 1); glow = mat('#fb923c', .4, emit='#f97316', strength=2.2)
    box((7.4, 6.0, .5), (0, 0, .25), st, bevel=.05)
    # Brennofen: Tonnengewölbe aus Halbzylinder
    cyl(2.3, 5.2, (0, 0, 2.5), br, rot=(math.radians(90), 0, 0), seg=16)
    box((5.0, 5.2, 2.6), (0, 0, 1.3), br, bevel=.1); box((4.6, 5.4, .3), (0, 0, .62), br2, bevel=.02); box((4.6, 5.4, .3), (0, 0, 1.6), br2, bevel=.02)
    box((2.0, .5, 2.0), (0, -2.55, 1.2), mat('#2a1d17', .9), bevel=.1); box((1.6, .2, 1.6), (0, -2.8, 1.2), dark, bevel=.05); box((1.4, .1, .7), (0, -2.86, .8), glow, bevel=.02)
    cyl(.7, 4.0, (1.6, .8, 5.0), br, seg=10, r2=.55); cyl(.8, .4, (1.6, .8, 7.2), st, seg=10); cyl(.62, .1, (1.6, .8, 7.42), glow, seg=10)
    # Ziegelstapel auf Paletten
    for k, (x, y) in enumerate([(-4.0, -3.4), (-2.6, -3.4), (4.0, -3.6), (2.6, -4.2)]):
        box((1.3, 1.0, .18), (x, y, .09), wood, bevel=.02)
        for r in range(4):
            for c in range(3): box((.4, .9, .22), (x - .42 + c * .42, y, .3 + r * .24), br2 if (r + c) % 2 else br, bevel=0)
    # Lehmhaufen und Schubkarre
    ball(1.8, (-4.4, 1.6, .7), clay, scale=(1.2, 1, .6), sub=2, jitter=.18, seed=6, smooth=False)
    ball(1.0, (-3.3, 2.8, .4), clay, scale=(1, 1, .6), sub=1, jitter=.1, seed=7, smooth=False)
    # Presse (Kasten mit Kolben)
    box((1.6, 1.6, 2.2), (4.2, 1.4, 1.1), metal, bevel=.08); box((.5, .5, 1.0), (4.2, 1.4, 2.7), mat('#94a3b8', .35, .8), bevel=.04); box((1.9, 1.9, .3), (4.2, 1.4, 3.3), metal, bevel=.05)
    box((1.2, .4, .15), (4.2, 0.55, .6), mat('#facc15', .6), bevel=.02)

# ---------------------------------------------------------------- Montagehalle
@model
def workshop():
    wall = mat('#cbd5e1', .85); wall2 = mat('#94a3b8', .85); roof = mat('#b4432b', .8); st = mat(STONE2, .9); metal = mat('#475569', .45, .7); yel = mat('#facc15', .55)
    dark = mat('#1e293b', .8); wood = mat(WOOD, .85); blue = mat('#3b82f6', .5, .2); spark = mat('#fde68a', .4, emit='#fbbf24', strength=3.)
    box((8.0, 6.2, .5), (0, 0, .25), st, bevel=.05)
    box((6.8, 5.0, 3.8), (0, 0, 2.4), wall, bevel=.1)
    box((6.9, 5.1, .4), (0, 0, 1.0), wall2, bevel=.02)
    # Satteldach
    for s in (-1, 1): box((3.9, 5.7, .22), (s * 1.78, 0, 5.15), roof, rot=(0, s * math.radians(-24), 0), bevel=.03)
    box((.35, 5.8, .35), (0, 0, 5.95), mat('#7a2a1a', .8), bevel=.03)
    # Rolltor und Schild mit Zahnrad
    box((3.0, .3, 2.8), (0, -2.55, 1.9), dark, bevel=.05)
    for i in range(6): box((2.8, .12, .3), (0, -2.72, .7 + i * .46), mat('#64748b', .5, .5), bevel=.01)
    box((3.6, .3, .35), (0, -2.55, 3.45), yel, bevel=.04)
    cyl(.9, .25, (0, -2.7, 4.35), metal, rot=(math.radians(90), 0, 0), seg=14); cyl(.35, .3, (0, -2.72, 4.35), wall, rot=(math.radians(90), 0, 0), seg=10)
    for i in range(8):
        a = i * math.pi / 4; box((.3, .26, .4), (math.cos(a) * .98, -2.7, 4.35 + math.sin(a) * .98), metal, rot=(0, -a, 0), bevel=.02)
    # Fenster
    for x in (-2.4, 2.4): box((1.0, .15, .9), (x, -2.55, 3.0), mat('#93c5fd', .2, emit='#60a5fa', strength=.3), bevel=.02); box((1.2, .12, 1.1), (x, -2.5, 3.0), wall2, bevel=.02)
    # Kran an der Seite
    box((.35, .35, 5.0), (3.9, -1.6, 2.5), yel, bevel=.03); box((.3, 3.6, .3), (3.9, -3.2, 5.0), yel, bevel=.03); box((.08, .08, 1.4), (3.9, -4.4, 4.2), mat(DARK, .5), bevel=0); box((.4, .3, .35), (3.9, -4.4, 3.4), metal, bevel=.03)
    # Maschinenteile draußen: Zahnrad-Kisten, Roboterarm
    for k, (x, y) in enumerate([(-4.2, -3.4), (-3.2, -3.6)]):
        box((1.0, 1.0, 1.0), (x, y, .5 + .0), wood if k == 0 else mat(WOOD2, .9), rot=(0, 0, .2 * k), bevel=.03)
    cyl(.55, .3, (-4.1, -3.4, 1.15), metal, seg=12)
    box((.9, .9, .3), (3.0, -3.7, .15), dark, bevel=.04); cyl(.25, 1.0, (3.0, -3.7, .8), blue, seg=8); cyl(.2, 1.0, (3.5, -3.7, 1.35), blue, rot=(0, math.radians(70), 0), seg=8); ball(.18, (3.95, -3.7, 1.7), spark, sub=1)
    # Schornstein mit Rohr
    cyl(.4, 2.6, (-2.4, 1.6, 5.2), metal, seg=8); cyl(.46, .2, (-2.4, 1.6, 6.55), dark, seg=8)

# ---------------------------------------------------------------- Marktstand
@model
def market():
    wood = mat(WOOD, .85); wood2 = mat(WOOD2, .9); red = mat('#e11d48', .8); white = mat('#f8fafc', .85)
    box((6.2, 2.4, .35), (0, 0, .18), mat(STONE2, .95), bevel=.04)
    box((5.6, 1.7, 1.15), (0, 0, .93), wood, bevel=.08)                               # Theke
    box((5.8, 1.9, .14), (0, 0, 1.58), wood2, bevel=.04)
    for sx in (-2.8, 2.8):
        for sy in (-.9, 1.0): box((.22, .22, 3.7), (sx, sy, 1.85), wood2, bevel=.03)
    # gestreifte Markise (Dach leicht geneigt)
    for i in range(10):
        x = -2.7 + i * .6
        box((.6, 2.9, .12), (x, .2, 3.75 - (0 if True else 0)), red if i % 2 == 0 else white, rot=(math.radians(-14), 0, 0), bevel=.02)
        box((.6, .1, .3), (x, -1.15, 3.35), red if i % 2 == 0 else white, bevel=.02)   # Volant
    # Ware: Kisten, Säcke, Waage, Fässer
    for i, c in enumerate(['#84cc16', '#f97316', '#ef4444']):
        box((1.0, .8, .45), (-2.0 + i * 1.5, 0, 1.9), wood2, bevel=.03)
        for k in range(4): ball(.2, (-2.0 + i * 1.5 + (k % 2) * .3 - .15, (k // 2) * .3 - .15, 2.25), mat(c, .6), sub=1, smooth=True)
    box((1.0, 1.0, 1.0), (-4.3, -.4, .5), wood, rot=(0, 0, .25)); box((.9, .9, .9), (-4.1, -.5, 1.4), wood2, rot=(0, 0, -.3))
    for i in range(3): ball(.5, (4.3, -.6 + i * .15, .5 + i * .5), mat('#d6b88a', .95), scale=(1, 1, .9), sub=1, jitter=.04, seed=i, smooth=True)
    cyl(.55, 1.2, (-4.5, 1.2, .6), wood2, seg=12)
    # Schild
    box((3.2, .16, .8), (0, -1.1, 4.25), wood2, bevel=.04); box((2.9, .08, .55), (0, -1.2, 4.25), mat('#fbbf24', .6, emit='#fbbf24', strength=.35), bevel=.02)
    # Laterne
    box((.3, .3, .4), (2.4, -1.15, 3.1), mat('#fde68a', .4, emit='#fbbf24', strength=2.5), bevel=.05)

# ---------------------------------------------------------------- LKW (Dekoration am Markt)
@model
def truck():
    body = mat('#2563eb', .5, .2); white = mat('#f8fafc', .6); dark = mat('#111827', .8); glass = mat('#93c5fd', .15, .1, emit='#60a5fa', strength=.15); tire = mat('#16181d', .9)
    box((2.3, 3.0, .3), (0, .6, .75), mat('#334155', .6, .4), bevel=.03)          # Rahmen
    box((2.1, 1.6, 1.6), (0, -1.7, 1.75), body, bevel=.18)                          # Fahrerhaus
    box((1.95, .08, .75), (0, -2.5, 1.85), glass, bevel=.02)                          # Scheibe vorn
    box((.08, 1.0, .65), (1.07, -1.7, 1.95), glass, bevel=.02); box((.08, 1.0, .65), (-1.07, -1.7, 1.95), glass, bevel=.02)
    box((2.3, .15, .3), (0, -2.6, .75), dark, bevel=.02)
    for s in (-1, 1): ball(.18, (s * .8, -2.62, 1.05), mat('#fff7cc', .3, emit='#fde68a', strength=2.), sub=1)
    box((2.4, 3.2, 2.0), (0, 1.6, 2.1), white, bevel=.1)                              # Kasten
    box((2.44, 3.24, .18), (0, 1.6, 2.7), body, bevel=.03)
    for s in (-1, 1):
        for y in (-1.8, 1.4, 2.5):
            cyl(.52, .42, (s * 1.12, y, .52), tire, rot=(0, math.radians(90), 0), seg=14); cyl(.28, .46, (s * 1.12, y, .52), mat('#cbd5e1', .4, .7), rot=(0, math.radians(90), 0), seg=10)

# ---------------------------------------------------------------- Umgebung
@model
def pine():
    c = mat('#2f7d46', .9); c2 = mat('#256b3a', .9); tr = mat(WOOD2, .95)
    cyl(.28, 1.6, (0, 0, .8), tr, seg=7, r2=.36)
    for i, (r, z, h) in enumerate([(1.6, 1.8, 1.8), (1.25, 2.9, 1.7), (.85, 3.9, 1.6)]):
        cyl(r, h, (0, 0, z + h / 2 - .2), c if i % 2 == 0 else c2, seg=8, r2=.04)

@model
def oak():
    leaf = mat('#5aa84a', .9); leaf2 = mat('#4a9440', .9); tr = mat(WOOD2, .95)
    cyl(.3, 2.0, (0, 0, 1.0), tr, seg=7, r2=.4)
    ball(1.5, (0, 0, 3.0), leaf, sub=2, jitter=.18, seed=2, smooth=False); ball(1.0, (.9, .3, 2.6), leaf2, sub=1, jitter=.12, seed=3, smooth=False); ball(.95, (-.9, -.3, 2.8), leaf2, sub=1, jitter=.12, seed=4, smooth=False)

@model
def rock():
    ball(1.0, (0, 0, .5), mat('#8b93a0', .95), scale=(1.2, 1, .75), sub=1, jitter=.16, seed=9, smooth=False)
    ball(.55, (.9, .5, .3), mat('#6b7280', .95), sub=1, jitter=.1, seed=11, smooth=False)

@model
def bush():
    ball(.8, (0, 0, .5), mat('#3f8f46', .9), scale=(1.2, 1, .8), sub=1, jitter=.1, seed=4, smooth=False)
    for i, c in enumerate(['#f472b6', '#fde047', '#f8fafc']):
        ball(.09, (math.cos(i * 2.1) * .7, math.sin(i * 2.1) * .6 - .25, .75), mat(c, .6), sub=1)

@model
def lamp():
    m = mat('#2a2f3a', .5, .6)
    cyl(.1, 3.4, (0, 0, 1.7), m, seg=8); box((.5, .5, .1), (0, 0, .05), m, bevel=.02)
    box((.45, .45, .5), (0, 0, 3.55), mat('#fde68a', .4, emit='#fbbf24', strength=3.), bevel=.08); cyl(.4, .25, (0, 0, 3.95), m, seg=4, r2=.05)

@model
def fence():
    w = mat(WOOD, .9)
    for i in range(5): box((.14, .1, 1.1), (-1.8 + i * .9, 0, .55), w, bevel=.015)
    box((3.8, .08, .12), (0, 0, .85), w, bevel=.01); box((3.8, .08, .12), (0, 0, .4), w, bevel=.01)

@model
def signpost():
    w = mat(WOOD, .9)
    cyl(.1, 2.2, (0, 0, 1.1), w, seg=6); box((1.5, .1, .45), (0, -.1, 1.9), w, bevel=.03); box((1.2, .1, .4), (.1, -.1, 1.3), mat(WOOD2, .9), rot=(0, 0, .08), bevel=.03)

@model
def crates():
    w = mat(WOOD, .9); w2 = mat(WOOD2, .9)
    box((1, 1, 1), (0, 0, .5), w, rot=(0, 0, .2)); box((.9, .9, .9), (.1, .05, 1.45), w2, rot=(0, 0, -.15)); box((.8, .8, .8), (1.3, .4, .4), w2, rot=(0, 0, .5))

if __name__ == '__main__':
    os.makedirs(OUTDIR, exist_ok=True)
    for name, f in MODELS.items():
        if ONLY and name not in ONLY: continue
        reset(); f()
        if name != 'worker': merge_by_material()
        export(name)
