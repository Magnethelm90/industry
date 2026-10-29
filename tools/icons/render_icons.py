"""Rendert alle Spiel-Icons mit Blender (Cycles) als WebP mit transparentem Hintergrund.

Aufruf (Blender als Python-Modul, pip install bpy pillow):
    python tools/icons/render_icons.py src/assets/icons            # alle Icons
    python tools/icons/render_icons.py src/assets/icons erz kohle  # nur einzelne
    python tools/icons/render_icons.py src/assets/icons --bounds   # nur bounds.json neu schreiben
oder mit installiertem Blender:
    blender --background --python tools/icons/render_icons.py -- src/assets/icons

Jedes Icon ist eine kleine Funktion, die Objekte aus einfachen Grundformen baut
(Kisten, Zylinder, Drehkörper, ausgestanzte 2D-Formen). Licht, Kamera und Schatten
sind für alle gleich, damit die Icons zusammenpassen.
"""
import bpy, bmesh, math, os, random, sys
from mathutils import Vector, Matrix

SIZE = 192
SAMPLES = 64

# ---------------------------------------------------------------- Szene

def srgb(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c) + (1.0,)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.render.engine = 'CYCLES'
    s.cycles.samples = SAMPLES
    s.cycles.use_denoising = True
    try:
        s.cycles.denoiser = 'OPENIMAGEDENOISE'
    except Exception:
        pass
    s.cycles.max_bounces = 8
    s.cycles.transmission_bounces = 8
    s.render.resolution_x = s.render.resolution_y = SIZE
    s.render.film_transparent = True
    s.render.image_settings.file_format = 'WEBP'
    s.render.image_settings.color_mode = 'RGBA'
    s.render.image_settings.quality = 90
    # Standard statt AgX: Farben kommen so kräftig wie definiert (Spiel-Look statt Fotolook)
    s.view_settings.view_transform = 'Standard'
    w = bpy.data.worlds.new('w')
    s.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes['Background']
    bg.inputs[0].default_value = srgb('#9fb3d9')
    bg.inputs[1].default_value = 0.55
    light('key', (-2.4, -3.2, 8.0), 1100, 4.0, '#fff4e6')
    # Füll- und Gegenlicht ohne Schatten, sonst fällt ein langer Schatten nach vorn ins Bild
    light('fill', (5, -3, 2.0), 260, 5.0, '#cfe0ff', shadow=False)
    light('rim', (2.5, 5, 4.5), 700, 3.0, '#bfe8ff', shadow=False)


def light(name, loc, power, size, col, shadow=True):
    d = bpy.data.lights.new(name, 'AREA')
    d.energy = power
    d.size = size
    d.color = srgb(col)[:3]
    d.use_shadow = shadow
    o = bpy.data.objects.new(name, d)
    bpy.context.collection.objects.link(o)
    o.location = loc
    look_at(o, Vector((0, 0, 0.6)))


def look_at(o, target):
    d = target - Vector(o.location)
    o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


def finish(path, elev=24, azim=32, pad=1.18):
    """Kamera auf alle Objekte ausrichten, Schattenfänger darunter, rendern."""
    s = bpy.context.scene
    bpy.context.view_layer.update()
    objs = [o for o in s.objects if o.type in ('MESH', 'CURVE', 'FONT')]
    dg = bpy.context.evaluated_depsgraph_get()
    pts = []
    for o in objs:
        oe = o.evaluated_get(dg)
        try:
            me = oe.to_mesh()
        except Exception:
            me = None
        if me:
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
    cam.location = center + direction * 20
    look_at(cam, center)
    bpy.context.view_layer.update()
    inv = cam.matrix_world.inverted()
    loc = [inv @ p for p in pts]
    xs, ys = [p.x for p in loc], [p.y for p in loc]
    w, h = max(xs) - min(xs), max(ys) - min(ys)
    cam_d.ortho_scale = max(w, h) * pad
    cam_d.shift_x = (max(xs) + min(xs)) / 2 / cam_d.ortho_scale
    cam_d.shift_y = (max(ys) + min(ys)) / 2 / cam_d.ortho_scale
    cam_d.shift_y -= 0.035  # unten Platz für den Schatten
    cam_d.clip_end = 100
    bpy.ops.mesh.primitive_plane_add(size=60, location=(center.x, center.y, zmin))
    bpy.context.object.is_shadow_catcher = True
    s.render.filepath = path
    bpy.ops.render.render(write_still=True)
    soften_shadow(path)


def soften_shadow(path, strength=0.7, border=14):
    """Schatten (fast schwarze, halbtransparente Pixel) abschwächen und zum Bildrand weich ausblenden,
    damit er nicht als harte Kante am Rand endet."""
    try:
        import numpy as np
        from PIL import Image
    except ImportError:
        print('Pillow fehlt – Schatten bleibt unbearbeitet (pip install pillow)')
        return
    im = np.array(Image.open(path).convert('RGBA')).astype(np.float32)
    h, w = im.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    edge = np.minimum.reduce([xx, yy, w - 1 - xx, h - 1 - yy]).astype(np.float32)
    fade = np.clip(edge / border, 0, 1)
    shadow = (im[..., :3].max(axis=2) < 24) & (im[..., 3] < 200)
    im[..., 3] = np.where(shadow, im[..., 3] * strength * fade, im[..., 3])
    Image.fromarray(im.clip(0, 255).astype(np.uint8), 'RGBA').save(path, 'WEBP', quality=90, method=6)

# ---------------------------------------------------------------- Materialien

_mats = {}


def mat(col, metal=0.0, rough=0.45, emit=0.0, trans=0.0, coat=0.0, sss=0.0, ior=1.45, film=0.0):
    key = (col, metal, rough, emit, trans, coat, sss, ior, film)
    if key in _mats and _mats[key].name in bpy.data.materials:
        return _mats[key]
    m = bpy.data.materials.new('m')
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    c = srgb(col)
    b.inputs['Base Color'].default_value = c
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    b.inputs['IOR'].default_value = ior
    if trans:
        b.inputs['Transmission Weight'].default_value = trans
    if coat:
        b.inputs['Coat Weight'].default_value = coat
        b.inputs['Coat Roughness'].default_value = 0.08
    if sss:
        b.inputs['Subsurface Weight'].default_value = sss
        b.inputs['Subsurface Radius'].default_value = (0.4, 0.25, 0.15)
    if emit:
        b.inputs['Emission Color'].default_value = c
        b.inputs['Emission Strength'].default_value = emit
    if film:
        b.inputs['Thin Film Thickness'].default_value = film
        b.inputs['Thin Film IOR'].default_value = 1.6
    _mats[key] = m
    return m


def grad(top, bottom, lo, hi, axis=2, metal=0.0, rough=0.4, coat=0.0):
    """Farbverlauf entlang einer Achse (Objektkoordinaten), z. B. dunkler Fischrücken."""
    m = bpy.data.materials.new('g')
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    mr = nt.nodes.new('ShaderNodeMapRange')
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    nt.links.new(tc.outputs['Object'], sep.inputs[0])
    nt.links.new(sep.outputs[axis], mr.inputs['Value'])
    mr.inputs['From Min'].default_value = lo
    mr.inputs['From Max'].default_value = hi
    nt.links.new(mr.outputs['Result'], ramp.inputs['Fac'])
    ramp.color_ramp.elements[0].color = srgb(bottom)
    ramp.color_ramp.elements[1].color = srgb(top)
    nt.links.new(ramp.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    if coat:
        b.inputs['Coat Weight'].default_value = coat
    return m

# ---------------------------------------------------------------- Formen


def _put(o, m=None, smooth=True):
    if m:
        o.data.materials.clear()
        o.data.materials.append(m)
    if smooth and o.type == 'MESH':
        for p in o.data.polygons:
            p.use_smooth = True
    return o


def bevel(o, w=0.04, seg=3):
    md = o.modifiers.new('bev', 'BEVEL')
    md.width = w
    md.segments = seg
    md.limit_method = 'ANGLE'
    try:
        o.modifiers.new('wn', 'WEIGHTED_NORMAL').keep_sharp = True
    except Exception:
        pass
    return o


def grid_box(sx, sy, sz, loc, cuts=10):
    """Fein unterteilte Kiste in echten Maßen – zum Verformen (Tüten, Säcke)."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges, cuts=cuts, use_grid_fill=True)
    for v in bm.verts:
        v.co.x *= sx
        v.co.y *= sy
        v.co.z *= sz
    me = bpy.data.meshes.new('gb')
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new('gb', me)
    bpy.context.collection.objects.link(o)
    o.location = loc
    return o


def apply_mods(o):
    bpy.context.view_layer.objects.active = o
    for md in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=md.name)
    return o


def subsurf(o, lv=2):
    md = o.modifiers.new('ss', 'SUBSURF')
    md.levels = md.render_levels = lv
    return o


def box(sx, sy, sz, loc=(0, 0, 0), m=None, b=0.05, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object
    o.scale = (sx, sy, sz)
    bpy.ops.object.transform_apply(scale=True)
    if b:
        bevel(o, b)
    return _put(o, m)


def cyl(r, h, loc=(0, 0, 0), m=None, rot=(0, 0, 0), v=48, b=0.03, r2=None):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=loc, rotation=rot, vertices=v)
    else:
        bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r2, depth=h, location=loc, rotation=rot, vertices=v)
    o = bpy.context.object
    if b:
        bevel(o, b)
    return _put(o, m)


def ball(r, loc=(0, 0, 0), m=None, sc=(1, 1, 1), seg=32, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=seg, ring_count=seg // 2, rotation=rot)
    o = bpy.context.object
    o.scale = sc
    bpy.ops.object.transform_apply(scale=True)
    return _put(o, m)


def torus(R, r, loc=(0, 0, 0), m=None, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, location=loc, rotation=rot, major_segments=64, minor_segments=20)
    return _put(bpy.context.object, m)


def rock(r, loc=(0, 0, 0), m=None, seed=1, rough=0.22, sc=(1, 1, 1), sub=2, smooth=False):
    rnd = random.Random(seed)
    bpy.ops.mesh.primitive_ico_sphere_add(radius=r, subdivisions=sub, location=loc)
    o = bpy.context.object
    for v in o.data.vertices:
        v.co *= 1 + rnd.uniform(-rough, rough)
    o.scale = sc
    o.rotation_euler = (rnd.uniform(0, 3), rnd.uniform(0, 3), rnd.uniform(0, 3))
    bpy.ops.object.transform_apply(scale=True)
    return _put(o, m, smooth=smooth)


def lathe(profile, loc=(0, 0, 0), m=None, seg=64, rot=(0, 0, 0), sc=(1, 1, 1)):
    """Drehkörper aus (Radius, Höhe)-Punkten, von unten nach oben."""
    me = bpy.data.meshes.new('lathe')
    bm = bmesh.new()
    rings = []
    for r, z in profile:
        ring = [bm.verts.new((r * math.cos(2 * math.pi * i / seg), r * math.sin(2 * math.pi * i / seg), z)) for i in range(seg)]
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for i in range(seg):
            j = (i + 1) % seg
            bm.faces.new((a[i], a[j], b[j], b[i]))
    if profile[0][0] > 0:
        bm.faces.new(list(reversed(rings[0])))
    if profile[-1][0] > 0:
        bm.faces.new(rings[-1])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new('lathe', me)
    bpy.context.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = rot
    o.scale = sc
    return _put(o, m)


def shape(pts, depth, loc=(0, 0, 0), m=None, bev=0.03, rot=(math.pi / 2, 0, 0), sc=1.0):
    """2D-Umriss (x, y) als Platte ausstanzen; steht standardmäßig aufrecht zur Kamera."""
    cu = bpy.data.curves.new('s', 'CURVE')
    cu.dimensions = '2D'
    cu.fill_mode = 'BOTH'
    sp = cu.splines.new('POLY')
    sp.points.add(len(pts) - 1)
    for p, (x, y) in zip(sp.points, pts):
        p.co = (x * sc, y * sc, 0, 1)
    sp.use_cyclic_u = True
    cu.extrude = depth / 2
    cu.bevel_depth = bev
    cu.bevel_resolution = 3
    o = bpy.data.objects.new('s', cu)
    bpy.context.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = rot
    if m:
        cu.materials.append(m)
    return o


def text(t, size, loc, m, depth=0.03, rot=(math.pi / 2, 0, 0)):
    cu = bpy.data.curves.new('t', 'FONT')
    cu.body = t
    cu.size = size
    cu.extrude = depth
    cu.align_x = 'CENTER'
    cu.align_y = 'CENTER'
    cu.bevel_depth = 0.004
    o = bpy.data.objects.new('t', cu)
    bpy.context.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = rot
    cu.materials.append(m)
    return o


def rod(a, b, r, m, v=24):
    """Zylinder zwischen zwei Punkten (Rahmen, Speichen, Arme)."""
    a, b = Vector(a), Vector(b)
    d = b - a
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=d.length, location=(a + b) / 2, vertices=v)
    o = bpy.context.object
    o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    return _put(o, m)


def gear(R, teeth, depth, m, loc=(0, 0, 0), hole=0.0, rot=(math.pi / 2, 0, 0)):
    pts = []
    for i in range(teeth * 4):
        a = 2 * math.pi * i / (teeth * 4)
        r = R if (i % 4) in (1, 2) else R * 0.82
        pts.append((r * math.cos(a), r * math.sin(a)))
    o = shape(pts, depth, loc, m, 0.02, rot)
    if hole:
        cut = cyl(hole, depth * 4, loc, None, rot=rot, b=0)
        cut.display_type = 'WIRE'
        bpy.context.view_layer.objects.active = o
        o.select_set(True)
        bpy.ops.object.convert(target='MESH')
        md = o.modifiers.new('cut', 'BOOLEAN')
        md.operation = 'DIFFERENCE'
        md.object = cut
        md.solver = 'EXACT'
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier='cut')
        bpy.data.objects.remove(cut)
    return o


def cut(o, cutter, transfer=True):
    """Boolesch abziehen; neue Flächen bekommen das Material des Schneiders."""
    md = o.modifiers.new('cut', 'BOOLEAN')
    md.operation = 'DIFFERENCE'
    md.object = cutter
    md.solver = 'EXACT'
    if transfer:
        try:
            md.material_mode = 'TRANSFER'
        except Exception:
            pass
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier='cut')
    bpy.data.objects.remove(cutter)
    return o


def star(n, R, r, rot0=math.pi / 2):
    return [((R if i % 2 == 0 else r) * math.cos(rot0 + math.pi * i / n), (R if i % 2 == 0 else r) * math.sin(rot0 + math.pi * i / n)) for i in range(2 * n)]

# ---------------------------------------------------------------- Icons

ICONS = {}


def icon(*keys, **cam):
    def deco(f):
        for k in keys:
            ICONS[k] = (f, cam)
        return f
    return deco


@icon('erz')
def _erz():
    stone = mat('#6b5a52', rough=0.85)
    rock(0.9, (0, 0, 0.75), stone, seed=3, rough=0.2, sc=(1.15, 1, 0.85))
    ore = mat('#e07a2e', metal=1, rough=0.28)
    rnd = random.Random(5)
    for i in range(7):
        a = rnd.uniform(-1.2, 2.0)
        z = rnd.uniform(0.45, 1.35)
        rock(0.2 + rnd.uniform(0, 0.1), (0.95 * math.sin(a), -0.85 * math.cos(a), z), ore, seed=i + 10, rough=0.15)


@icon('kohle')
def _kohle():
    coal = mat('#1b1c22', rough=0.25, coat=0.4)
    for i, (x, y, z, r) in enumerate([(-0.55, 0.1, 0.45, 0.55), (0.55, 0.15, 0.42, 0.5), (0, -0.35, 0.4, 0.45), (0.05, 0.25, 1.0, 0.5)]):
        rock(r, (x, y, z), coal, seed=i + 2, rough=0.25, sub=1)


@icon('lehm')
def _lehm():
    clay = mat('#b8653b', rough=0.65, sss=0.1)
    o = rock(1.0, (0, 0, 0.55), clay, seed=4, rough=0.08, sc=(1.25, 1.0, 0.6), sub=3, smooth=True)
    subsurf(o, 1)
    rock(0.38, (0.85, -0.6, 0.3), clay, seed=8, rough=0.1, sc=(1, 1, 0.7), sub=3, smooth=True)


@icon('sand')
def _sand():
    sand = mat('#e6c47e', rough=1)
    lathe([(1.5, 0), (1.3, 0.12), (0.9, 0.45), (0.45, 0.85), (0.15, 1.0), (0, 1.02)], m=sand)
    pebble = mat('#c9a35d', rough=0.9)
    for i, p in enumerate([(1.0, -0.9, 0.08), (-1.2, -0.6, 0.06), (0.4, -1.3, 0.05)]):
        rock(0.12, p, pebble, seed=i)


@icon('kupfer')
def _kupfer():
    cu = mat('#d9774a', metal=1, rough=0.3)
    rock(0.7, (0, 0, 0.6), cu, seed=7, rough=0.22, sub=2, smooth=True)
    rock(0.45, (0.85, -0.3, 0.38), cu, seed=9, rough=0.25, sub=2, smooth=True)
    rock(0.38, (-0.8, -0.4, 0.33), cu, seed=12, rough=0.25, sub=2, smooth=True)


@icon('oel')
def _oel():
    paint = mat('#5b47c9', metal=0.4, rough=0.35, coat=0.5)
    lathe([(0, 0), (0.78, 0), (0.8, 0.05), (0.8, 2.0), (0.78, 2.05), (0, 2.05)], m=paint)
    rib = mat('#3f2fa3', metal=0.4, rough=0.35)
    for z in (0.62, 1.42):
        torus(0.81, 0.05, (0, 0, z), rib)
    cyl(0.12, 0.08, (0.35, -0.2, 2.08), mat('#1b1c22', metal=0.8, rough=0.3), b=0.01)
    oil = mat('#0d0f14', rough=0.05, coat=1)
    lathe([(0, 0), (0.38, 0.05), (0.42, 0.25), (0.3, 0.55), (0.12, 0.8), (0, 0.95)], (1.05, -0.75, 0), oil)


@icon('ziegel')
def _ziegel():
    brick = mat('#c4502a', rough=0.8)
    for x in (-0.58, 0.58):
        box(1.1, 0.55, 0.42, (x, 0, 0.21), brick, 0.05)
    box(1.1, 0.55, 0.42, (0, 0.05, 0.63), brick, 0.05, rot=(0, 0, 0.12))


def ingot(loc, m, rot=0):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts:
        v.co.x *= 1.3
        v.co.y *= 0.6
        v.co.z *= 0.32
        if v.co.z > 0:
            v.co.x *= 0.8
            v.co.y *= 0.72
    me = bpy.data.meshes.new('ingot')
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new('ingot', me)
    bpy.context.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = (0, 0, rot)
    bevel(o, 0.04)
    return _put(o, m, smooth=False)


@icon('stahl')
def _stahl():
    steel = mat('#bcc8d6', metal=1, rough=0.22)
    ingot((-0.62, 0, 0.16), steel)
    ingot((0.62, 0, 0.16), steel)
    ingot((0, 0.02, 0.48), steel)


@icon('maschine')
def _maschine():
    gear(1.0, 12, 0.3, mat('#f5b82e', metal=1, rough=0.3), (0, 0, 1.05), hole=0.25)
    gear(0.6, 9, 0.32, mat('#9aa7b8', metal=1, rough=0.3), (1.15, -0.2, 0.62), hole=0.15)
    cyl(0.18, 0.5, (0, 0, 1.05), mat('#3b4252', metal=1, rough=0.3), rot=(math.pi / 2, 0, 0))


@icon('glas')
def _glas():
    g = mat('#7fe6f5', rough=0.03, trans=1, ior=1.5)
    for i, x in enumerate((-0.25, 0.25)):
        box(1.3, 0.08, 1.7, (x, i * 0.35, 0.85), g, 0.02, rot=(0, 0, -0.15))
    edge = mat('#d6fbff', rough=0.1, emit=0.6)
    box(1.3, 0.1, 0.05, (-0.25, 0, 1.72), edge, 0.01, rot=(0, 0, -0.15))


@icon('kunststoff')
def _kunststoff():
    rnd = random.Random(3)
    cols = ['#f472b6', '#f472b6', '#f9a8d4', '#ec4899']
    for layer, (R, z) in enumerate([(1.15, 0.15), (0.85, 0.38), (0.55, 0.6), (0.25, 0.8), (0.0, 0.98)]):
        n = max(1, int(2 * math.pi * R / 0.3))
        for i in range(n):
            a = 2 * math.pi * i / n + layer * 0.4
            r = R * rnd.uniform(0.85, 1.0)
            ball(0.17, (r * math.cos(a), r * math.sin(a), z + rnd.uniform(-0.03, 0.03)), mat(rnd.choice(cols), rough=0.18, coat=0.6), sc=(1, 1, 0.8), seg=16)
        if R > 0.3:
            for i in range(n // 2):
                a = 2 * math.pi * (i + 0.5) / (n // 2)
                ball(0.17, (R * 0.55 * math.cos(a), R * 0.55 * math.sin(a), z), mat(rnd.choice(cols), rough=0.18, coat=0.6), sc=(1, 1, 0.8), seg=16)


@icon('draht')
def _draht():
    wood = mat('#b98a55', rough=0.7)
    ax = (0, math.pi / 2, 0)
    for x in (-0.55, 0.55):
        cyl(0.95, 0.12, (x, 0, 0.95), wood, rot=ax, b=0.03)
    cyl(0.3, 1.1, (0, 0, 0.95), wood, rot=ax)
    cu = mat('#dd7a3c', metal=1, rough=0.25)
    for i in range(9):
        torus(0.68, 0.06, (-0.44 + i * 0.11, 0, 0.95), cu, rot=ax)
    rod((0.0, -0.68, 0.95), (0.5, -1.3, 0.1), 0.05, cu)


@icon('platine')
def _platine():
    tilt = (math.radians(58), 0, 0)
    g = Matrix.Rotation(tilt[0], 4, 'X')
    P = lambda x, y, z: tuple(g @ Vector((x, y, z)) + Vector((0, 0, 0.9)))
    o = box(2.0, 1.4, 0.08, P(0, 0, 0), mat('#178a43', rough=0.4, coat=0.3), 0.03, rot=tilt)
    chip = mat('#15171d', rough=0.35)
    gold = mat('#f2c14e', metal=1, rough=0.25)
    box(0.6, 0.6, 0.1, P(-0.3, 0.05, 0.09), chip, 0.02, rot=tilt)
    for i in range(5):
        box(0.05, 0.14, 0.02, P(-0.5 + i * 0.1, -0.33, 0.06), gold, 0, rot=tilt)
        box(0.05, 0.14, 0.02, P(-0.5 + i * 0.1, 0.43, 0.06), gold, 0, rot=tilt)
    box(0.35, 0.22, 0.08, P(0.5, 0.35, 0.08), chip, 0.02, rot=tilt)
    for i, (x, y) in enumerate([(0.45, -0.3), (0.7, -0.3), (0.65, 0.0)]):
        cyl(0.08, 0.22, P(x, y, 0.15), mat(['#2563eb', '#f59e0b', '#2563eb'][i], rough=0.3, coat=0.5), rot=tilt, b=0.01)
    for i in range(8):
        box(0.07, 0.07, 0.02, P(-0.85 + i * 0.24, -0.62, 0.05), gold, 0, rot=tilt)


@icon('akku')
def _akku():
    body = mat('#84cc16', rough=0.3, coat=0.8)
    lathe([(0, 0), (0.6, 0), (0.62, 0.04), (0.62, 1.95), (0.6, 2.0), (0, 2.0)], m=body)
    cap = mat('#2b2f38', metal=0.6, rough=0.3)
    lathe([(0, 1.6), (0.625, 1.6), (0.625, 2.0), (0.6, 2.04), (0, 2.04)], m=cap)
    cyl(0.2, 0.15, (0, 0, 2.1), mat('#c7ced8', metal=1, rough=0.2), b=0.02)
    bolt = [(0.12, 0.5), (-0.18, -0.05), (0.0, -0.05), (-0.12, -0.5), (0.2, 0.08), (0.02, 0.08)]
    shape(bolt, 0.08, (0, -0.6, 0.95), mat('#ffffff', emit=1.5), 0.01, sc=1.2)


@icon('display')
def _display():
    tilt = (math.radians(70), 0, 0)
    box(1.6, 2.2, 0.12, (0, 0, 1.1), mat('#14161c', rough=0.3, coat=0.6), 0.06, rot=tilt)
    box(1.42, 2.0, 0.02, (0, -0.07, 1.12), grad('#7c5cff', '#22d3ee', -1, 1, axis=1, rough=0.2), 0.0, rot=tilt)
    lit = bpy.data.materials.new('lit')
    lit.use_nodes = True
    b = lit.node_tree.nodes['Principled BSDF']
    b.inputs['Emission Color'].default_value = srgb('#4cc9f0')
    b.inputs['Emission Strength'].default_value = 1.2
    b.inputs['Base Color'].default_value = srgb('#4cc9f0')
    box(1.42, 2.0, 0.01, (0, -0.085, 1.12), lit, 0.0, rot=tilt).hide_render = False
    for i, (w, z) in enumerate([(0.9, 1.55), (0.6, 1.3), (1.0, 0.95), (0.7, 0.7)]):
        box(w, 0.14, 0.01, (-0.2 + w / 2 - 0.3, -0.12 + (z - 1.1) * 0.0, z), mat('#ffffff', emit=2), 0.0, rot=tilt)


@icon('gehaeuse')
def _gehaeuse():
    tilt = (math.radians(68), 0, 0)
    g = Matrix.Rotation(tilt[0], 4, 'X')
    P = lambda x, y, z: tuple(g @ Vector((x, y, z)) + Vector((0, 0, 1.15)))
    box(1.2, 2.3, 0.16, P(0, 0, 0), mat('#b57af0', rough=0.25, coat=1), 0.12, rot=tilt)
    box(0.52, 0.52, 0.08, P(-0.25, 0.75, 0.1), mat('#2a2238', rough=0.3, coat=1), 0.12, rot=tilt)
    lens = mat('#0b0d12', rough=0.05, coat=1)
    ring = mat('#d4d4d8', metal=1, rough=0.2)
    for x, y in ((-0.37, 0.87), (-0.13, 0.87), (-0.37, 0.63)):
        cyl(0.09, 0.08, P(x, y, 0.16), ring, rot=tilt, b=0.01)
        cyl(0.065, 0.1, P(x, y, 0.17), lens, rot=tilt, b=0.01)
    shape(star(6, 0.14, 0.1), 0.02, P(0, -0.3, 0.09), mat('#e9d5ff', metal=1, rough=0.2), 0.01, rot=tilt)


def phone(loc=(0, 0, 0), tilt=68):
    t = (math.radians(tilt), 0, 0)
    box(1.2, 2.3, 0.16, (loc[0], loc[1], 1.15 + loc[2]), mat('#16181f', rough=0.25, coat=1), 0.12, rot=t)
    scr = grad('#c026d3', '#2563eb', -1.0, 1.0, axis=1, rough=0.2)
    sc = box(1.05, 2.12, 0.02, (loc[0], loc[1] - 0.08, 1.15 + loc[2]), scr, 0.06, rot=t)
    for nd in scr.node_tree.nodes:
        if nd.type == 'BSDF_PRINCIPLED':
            scr.node_tree.links.new(nd.inputs['Base Color'].links[0].from_socket, nd.inputs['Emission Color'])
            nd.inputs['Emission Strength'].default_value = 0.9
    cols = ['#facc15', '#34d399', '#fb7185', '#ffffff', '#60a5fa', '#f97316']
    g = Matrix.Rotation(t[0], 4, 'X')
    for i in range(6):
        x, y = -0.25 + (i % 3) * 0.25, 0.55 - (i // 3) * 0.3
        p = g @ Vector((x, y, 0.1))
        box(0.17, 0.17, 0.02, (loc[0] + p.x, loc[1] + p.y - 0.02, 1.15 + loc[2] + p.z), mat(cols[i], emit=1.5, rough=0.3), 0.04, rot=t)
    return sc


@icon('handy')
def _handy():
    phone()


@icon('kamin')
def _kamin():
    iron = mat('#2a2d35', metal=0.7, rough=0.4)
    box(1.6, 1.2, 1.5, (0, 0, 0.95), iron, 0.08)
    box(1.0, 0.05, 0.75, (0, -0.6, 1.0), mat('#ff5a0a', emit=2.5), 0.04)
    for i, x in enumerate((-0.25, 0.05, 0.3)):
        lathe([(0, 0), (0.14, 0.05), (0.1, 0.25), (0, 0.45)], (x, -0.64, 0.68), mat('#ffd34d', emit=4), sc=(1, 0.3, 0.8 + 0.2 * i))
    box(1.2, 0.08, 0.95, (0, -0.58, 1.0), mat('#9aa3b2', metal=1, rough=0.3), 0.04).scale = (1, 1, 1)
    box(1.0, 0.1, 0.75, (0, -0.63, 1.0), mat('#ffb347', rough=0.05, trans=1), 0.02)
    for x in (-0.6, 0.6):
        cyl(0.08, 0.3, (x, -0.35, 0.1), iron, b=0.01)
        cyl(0.08, 0.3, (x, 0.35, 0.1), iron, b=0.01)
    cyl(0.22, 1.1, (0.35, 0.2, 2.2), iron)
    box(1.8, 1.35, 0.12, (0, 0, 1.72), mat('#3a3e48', metal=0.7, rough=0.35), 0.04)


@icon('dampfmaschine')
def _dampf():
    brass = mat('#c9953a', metal=1, rough=0.3)
    box(2.6, 1.0, 0.2, (0, 0, 0.1), mat('#5b3a29', rough=0.7), 0.04)
    cyl(0.55, 1.7, (-0.2, 0, 0.8), brass, rot=(0, math.pi / 2, 0))
    for x in (-0.9, 0.5):
        torus(0.56, 0.05, (x, 0, 0.8), mat('#8a5a24', metal=1, rough=0.3), rot=(0, math.pi / 2, 0))
    cyl(0.16, 1.1, (-0.7, 0, 1.6), mat('#2a2d35', metal=0.8, rough=0.35))
    red = mat('#c0392b', metal=0.3, rough=0.35)
    torus(0.62, 0.07, (1.05, -0.45, 0.85), red, rot=(math.pi / 2, 0, 0))
    for i in range(6):
        a = i * math.pi / 3
        rod((1.05, -0.45, 0.85), (1.05 + 0.6 * math.cos(a), -0.45, 0.85 + 0.6 * math.sin(a)), 0.04, red)
    cyl(0.1, 0.3, (1.05, -0.45, 0.85), brass, rot=(math.pi / 2, 0, 0))


@icon('glasfaser')
def _glasfaser():
    spool = mat('#1e3a8a', rough=0.4)
    ax = (0, math.pi / 2, 0)
    for x in (-0.5, 0.5):
        cyl(0.85, 0.1, (x, 0, 0.9), spool, rot=ax)
    cable = mat('#0f172a', rough=0.3, coat=0.5)
    for i in range(8):
        torus(0.6, 0.06, (-0.4 + i * 0.115, 0, 0.9), cable, rot=ax)
    cyl(0.25, 1.0, (0, 0, 0.9), spool, rot=ax)
    rod((0.0, -0.6, 0.9), (0.5, -1.25, 0.25), 0.06, cable)
    ball(0.12, (0.52, -1.28, 0.23), mat('#22d3ee', emit=8))


@icon('solar')
def _solar():
    tilt = (math.radians(55), 0, 0)
    g = Matrix.Rotation(tilt[0], 4, 'X')
    base = Vector((0, 0, 1.0))
    box(2.4, 1.6, 0.08, tuple(base), mat('#c0c8d4', metal=1, rough=0.3), 0.03, rot=tilt)
    cell = mat('#1e40af', metal=0.2, rough=0.5, coat=0.1)
    for i in range(4):
        for j in range(3):
            p = g @ Vector((-0.87 + i * 0.58, -0.5 + j * 0.5, 0.05)) + base
            box(0.54, 0.46, 0.03, tuple(p), cell, 0.01, rot=tilt)
    rod((0, 0.35, 0.0), (0, 0.35, 0.95), 0.07, mat('#8892a0', metal=1, rough=0.3))
    ball(0.3, (1.2, 0.6, 2.0), mat('#fbbf24', emit=4))


@icon('ebike')
def _ebike():
    tire = mat('#16181f', rough=0.6)
    frame = mat('#22c55e', metal=0.3, rough=0.25, coat=1)
    steel = mat('#c0c8d4', metal=1, rough=0.25)
    for x in (-1.0, 1.0):
        torus(0.62, 0.08, (x, 0, 0.7), tire, rot=(math.pi / 2, 0, 0))
        torus(0.5, 0.025, (x, 0, 0.7), steel, rot=(math.pi / 2, 0, 0))
        for i in range(8):
            a = i * math.pi / 4
            rod((x, 0, 0.7), (x + 0.5 * math.cos(a), 0, 0.7 + 0.5 * math.sin(a)), 0.012, steel, v=8)
    P = {'r': (-1.0, 0, 0.7), 'f': (1.0, 0, 0.7), 'c': (-0.1, 0, 0.75), 's': (-0.35, 0, 1.45), 'h': (0.75, 0, 1.55)}
    for a, b in (('r', 'c'), ('c', 's'), ('s', 'h'), ('c', 'h'), ('r', 's'), ('h', 'f')):
        rod(P[a], P[b], 0.07, frame)
    box(0.45, 0.25, 0.22, (-0.2, 0, 1.15), mat('#2a2d35', rough=0.4), 0.05, rot=(0, -1.0, 0))
    box(0.5, 0.2, 0.12, (-0.4, 0, 1.6), mat('#1b1c22', rough=0.5), 0.05)
    rod((0.6, -0.35, 1.75), (0.6, 0.35, 1.75), 0.05, mat('#2a2d35', rough=0.4))


@icon('smartwatch')
def _smartwatch():
    tilt = (math.radians(60), 0, 0)
    band = mat('#d946ef', rough=0.5)
    box(0.7, 2.6, 0.08, (0, 0.25, 1.1), band, 0.03, rot=tilt)
    box(1.1, 1.25, 0.32, (0, 0, 1.15), mat('#1f2430', metal=0.6, rough=0.2, coat=1), 0.18, rot=tilt)
    g = Matrix.Rotation(tilt[0], 4, 'X')
    p = g @ Vector((0, 0, 0.17)) + Vector((0, 0, 1.15))
    box(0.9, 1.05, 0.02, tuple(p), grad('#c026d3', '#4f46e5', -0.5, 0.5, axis=1, rough=0.2), 0.1, rot=tilt)
    p2 = g @ Vector((0, 0, 0.19)) + Vector((0, 0, 1.15))
    torus(0.28, 0.035, tuple(p2), mat('#a3e635', emit=3), rot=tilt)


@icon('drohne')
def _drohne():
    yel = mat('#facc15', rough=0.25, coat=1)
    dark = mat('#20232b', rough=0.4)
    box(0.8, 0.8, 0.3, (0, 0, 0.8), yel, 0.12)
    ball(0.16, (0, -0.42, 0.75), mat('#0b0d12', rough=0.05, coat=1))
    for sx in (-1, 1):
        for sy in (-1, 1):
            e = (0.95 * sx, 0.95 * sy, 0.9)
            rod((0, 0, 0.85), e, 0.06, dark)
            cyl(0.1, 0.18, e, dark, b=0.02)
            cyl(0.48, 0.02, (e[0], e[1], e[2] + 0.12), mat('#cbd5e1', rough=0.3, trans=0.5), b=0)
    for sx in (-0.25, 0.25):
        rod((sx, -0.2, 0.65), (sx * 1.6, -0.2, 0.2), 0.03, dark)


@icon('roboter')
def _roboter():
    white = mat('#e5e9f0', rough=0.25, coat=1)
    gray = mat('#7a8597', metal=1, rough=0.3)
    box(1.2, 0.9, 1.0, (0, 0, 0.9), white, 0.15)
    box(1.0, 0.85, 0.8, (0, 0, 1.95), white, 0.18)
    box(0.8, 0.05, 0.45, (0, -0.43, 1.97), mat('#0f172a', rough=0.1, coat=1), 0.08)
    for x in (-0.2, 0.2):
        ball(0.09, (x, -0.47, 2.0), mat('#22d3ee', emit=8))
    rod((0, 0, 2.35), (0, 0, 2.7), 0.03, gray)
    ball(0.1, (0, 0, 2.75), mat('#ef4444', emit=3))
    for x in (-0.78, 0.78):
        rod((x, 0, 1.25), (x * 1.15, -0.1, 0.55), 0.1, gray)
        ball(0.16, (x * 1.15, -0.1, 0.5), white)
    for x in (-0.3, 0.3):
        box(0.3, 0.4, 0.4, (x, 0, 0.2), gray, 0.08)
    cyl(0.12, 0.05, (0, -0.46, 1.05), mat('#38bdf8', emit=2), rot=(math.pi / 2, 0, 0))


@icon('junk')
def _junk():
    r = mat('#6b7280', rough=0.8)
    for i, (x, y, s) in enumerate([(-0.5, 0, 0.5), (0.4, 0.2, 0.45), (0, -0.4, 0.35)]):
        rock(s, (x, y, s * 0.8), r, seed=i + 30)
    rod((-0.9, -0.5, 0.3), (0.9, 0.3, 0.9), 0.07, mat('#8b5a2b', metal=1, rough=0.6))


@icon('weizen')
def _weizen():
    stalk = mat('#c9a14a', rough=0.6)
    grain = mat('#e6b43c', rough=0.45, sss=0.2)
    band = mat('#b91c1c', rough=0.5)
    rnd = random.Random(2)
    for i in range(7):
        a = (i - 3) * 0.13
        top = Vector((math.sin(a) * 1.4, rnd.uniform(-0.15, 0.15), 1.9 + math.cos(a) * 0.3))
        rod((0, 0, 0), tuple(top), 0.025, stalk, v=8)
        d = top.normalized()
        for k in range(7):
            c = top + d * (k * 0.11)
            for side in (-1, 1):
                ball(0.07, tuple(c + Vector((side * 0.05, 0, 0))), grain, sc=(0.7, 0.7, 1.4), seg=12, rot=(0, side * 0.5 + a, 0))
    torus(0.12, 0.05, (0, 0, 0.75), band)


@icon('kartoffel')
def _kartoffel():
    pot = mat('#b9874f', rough=0.75)
    for i, (x, y, z, s) in enumerate([(-0.55, 0, 0.42, 1.0), (0.6, 0.1, 0.38, 0.9), (0, -0.4, 0.95, 0.85)]):
        o = rock(0.5 * s, (x, y, z), pot, seed=i + 40, rough=0.07, sc=(1.35, 1.0, 0.85), sub=3, smooth=True)
    eye = mat('#6b4423', rough=0.9)
    for p in [(-0.6, -0.42, 0.55), (0.55, -0.35, 0.5), (0.1, -0.78, 1.05), (-0.85, -0.3, 0.35)]:
        ball(0.04, p, eye, seg=8)


@icon('trauben')
def _trauben():
    grape = mat('#7e3fbf', rough=0.25, sss=0.25, coat=0.5)
    rows = [(5, 1.7), (4, 1.42), (4, 1.15), (3, 0.9), (2, 0.65), (1, 0.42)]
    for n, z in rows:
        for i in range(n):
            for d in (0, 1):
                x = (i - (n - 1) / 2) * 0.32 + (0.16 if d else 0)
                if d and i == n - 1:
                    continue
                ball(0.19, (x, (0.12 if d else -0.12), z - (0.12 if d else 0)), grape, seg=20)
    rod((0, 0, 1.85), (0.1, 0.0, 2.3), 0.04, mat('#5b4425', rough=0.7))
    leaf = [(0, 0), (0.35, 0.15), (0.6, 0.5), (0.45, 0.6), (0.55, 0.9), (0.2, 0.8), (0, 1.0), (-0.1, 0.6)]
    shape(leaf, 0.04, (0.1, 0.05, 2.15), mat('#4d9a2a', rough=0.5), 0.01, rot=(math.radians(70), 0, -0.4), sc=0.9)


@icon('hopfen')
def _hopfen():
    green = mat('#9ccc3c', rough=0.5, sss=0.15)
    for k in range(9):
        z = 0.3 + k * 0.17
        rr = 0.5 * math.sin(math.pi * (k + 0.8) / 10.5)
        for i in range(5):
            a = i * 2 * math.pi / 5 + k * 0.6
            ball(0.24, (rr * math.cos(a), rr * math.sin(a), z), green, sc=(1, 0.5, 0.75), seg=16, rot=(0.6, 0, a))
    rod((0, 0, 1.75), (0.15, 0, 2.2), 0.04, mat('#3f6212', rough=0.6))
    leaf = [(0, 0), (0.4, 0.3), (0.55, 0.7), (0.3, 0.75), (0, 1.1), (-0.3, 0.75), (-0.55, 0.7), (-0.4, 0.3)]
    shape(leaf, 0.04, (0.2, 0.2, 2.05), mat('#4d7c0f', rough=0.5), 0.01, rot=(math.radians(60), 0, -0.6), sc=0.8)


@icon('baumwolle')
def _baumwolle():
    husk = mat('#6b4426', rough=0.8)
    shape(star(5, 0.9, 0.35), 0.1, (0, 0, 0.75), husk, 0.03, rot=(0.15, 0, 0))
    rod((0, 0, 0), (0, 0, 0.7), 0.05, husk)
    cotton = mat('#fbfbf7', rough=0.9, sss=0.3)
    rnd = random.Random(4)
    for i in range(6):
        a = i * math.pi / 3
        ball(0.42, (0.4 * math.cos(a), 0.4 * math.sin(a), 1.1 + rnd.uniform(0, 0.15)), cotton, seg=20)
    ball(0.45, (0, 0, 1.45), cotton, seg=20)


@icon('milch')
def _milch():
    milk = mat('#f8fafc', rough=0.2, sss=0.3, coat=0.6)
    lathe([(0, 0), (0.55, 0), (0.6, 0.08), (0.6, 1.4), (0.5, 1.75), (0.28, 2.05), (0.26, 2.2), (0, 2.2)], m=milk)
    cyl(0.29, 0.2, (0, 0, 2.25), mat('#2563eb', rough=0.3, coat=0.5), b=0.03)
    lathe([(0.605, 0.5), (0.605, 1.1)], m=mat('#3b82f6', rough=0.4))


@icon('eier')
def _eier():
    def egg(loc, col, rot=(0, 0, 0)):
        prof = [(math.sin(t) * 0.42 * (1 - 0.18 * math.cos(t)), (1 - math.cos(t)) * 0.55) for t in [i * math.pi / 16 for i in range(17)]]
        lathe(prof, loc, mat(col, rough=0.4, sss=0.1), rot=rot)
    egg((-0.5, 0.05, 0), '#f3e5c8')
    egg((0.48, 0.15, 0), '#c98b55')
    egg((0, -0.45, 0.02), '#fbf4e4', rot=(0.15, 0, 0))


def fish(body, belly, length=2.4, h=0.55, fin='#334155', tailc=None, eye_x=None):
    prof = [(0, 1.0), (0.12, 0.93), (0.25, 0.75), (0.32, 0.45), (0.33, 0.1), (0.28, -0.25), (0.18, -0.55), (0.09, -0.78), (0.05, -0.9)]
    prof = list(reversed([(r, z) for r, z in prof]))
    m = grad(body, belly, 0.12, -0.22, axis=0, rough=0.3, coat=0.6, metal=0.3)
    o = lathe(prof, (0, 0, h), m, rot=(0, math.pi / 2, 0), sc=(length / 2, 0.48, length / 2 * 0.9))
    tail = [(0, 0), (-0.45, 0.4), (-0.38, 0), (-0.45, -0.4)]
    shape(tail, 0.04, (-length / 2 * 0.86, 0, h), mat(tailc or fin, rough=0.4), 0.01, rot=(math.pi / 2, 0, 0), sc=length / 2.4)
    dorsal = [(-0.3, 0), (0.2, 0), (-0.15, 0.3)]
    shape(dorsal, 0.03, (0, 0, h + 0.27 * length / 2.4), mat(fin, rough=0.4), 0.01, rot=(math.pi / 2, 0, 0), sc=length / 2.4)
    ex = eye_x if eye_x is not None else length * 0.36
    ball(0.075 * length / 2.4, (ex, -0.13 * length / 2.4, h + 0.06), mat('#0b0d12', rough=0.05, coat=1), seg=16)
    ball(0.025 * length / 2.4, (ex + 0.01, -0.19 * length / 2.4, h + 0.08), mat('#ffffff', emit=2), seg=8)
    return o


@icon('hering', elev=20)
def _hering():
    fish('#3b6fb0', '#e8eef7')


@icon('lachs', elev=20)
def _lachs():
    fish('#e0606f', '#ffc2b8', fin='#c2410c', length=2.6)


@icon('thunfisch', elev=20)
def _thunfisch():
    fish('#1e3a8a', '#d6deea', fin='#1e293b', tailc='#facc15', length=2.8, h=0.7)
    for i in range(4):
        box(0.08, 0.06, 0.1, (-0.4 - i * 0.18, 0, 0.98 - i * 0.04), mat('#facc15', rough=0.3), 0.02)


@icon('hummer', elev=40)
def _hummer():
    red = mat('#d7261e', rough=0.3, coat=0.8)
    for i in range(6):
        s = 1 - i * 0.12
        ball(0.36 * s, (0, 0.55 - i * 0.32, 0.38), red, sc=(1.1, 0.75, 0.75), seg=20)
    ball(0.3, (0, 0.95, 0.42), red, sc=(0.9, 1.3, 0.8))
    shape([(0, 0), (0.35, -0.25), (0, -0.4), (-0.35, -0.25)], 0.05, (0, -1.25, 0.35), red, 0.02, rot=(0, 0, 0))
    for sx in (-1, 1):
        rod((sx * 0.2, 1.1, 0.42), (sx * 0.7, 1.5, 0.45), 0.08, red)
        ball(0.32, (sx * 0.9, 1.85, 0.45), red, sc=(0.8, 1.4, 0.6))
        ball(0.16, (sx * 1.0, 2.25, 0.45), red, sc=(0.5, 1.4, 0.5), rot=(0, 0, sx * 0.3))
        ball(0.14, (sx * 0.75, 2.22, 0.45), red, sc=(0.5, 1.3, 0.5), rot=(0, 0, -sx * 0.3))
        rod((sx * 0.1, 1.2, 0.5), (sx * 0.9, 2.6, 0.7), 0.015, red)
        for k in range(3):
            rod((sx * 0.25, 0.6 - k * 0.3, 0.3), (sx * 0.65, 0.4 - k * 0.35, 0.02), 0.03, red)
        ball(0.05, (sx * 0.15, 1.18, 0.62), mat('#0b0d12', coat=1, rough=0.05), seg=8)


@icon('mehl')
def _mehl():
    sack = mat('#efe2c4', rough=0.85)
    o = grid_box(1.4, 1.0, 1.8, (0, 0, 0.9))
    for v in o.data.vertices:
        z = v.co.z  # -0.9 … 0.9
        f = max(0.0, min(1.0, (z - 0.35) / 0.4))
        bulge = 1 + 0.08 * (1 - (z / 0.9) ** 2)
        v.co.x *= bulge * (1 - 0.72 * f)
        v.co.y *= bulge * (1 - 0.72 * f)
        if z > 0.75:
            v.co.x *= 1.6
            v.co.y *= 1.6
    subsurf(o, 2)
    _put(o, sack)
    box(0.75, 0.05, 0.5, (0, -0.54, 0.7), mat('#2563eb', rough=0.6), 0.03)
    torus(0.22, 0.06, (0, 0, 1.55), mat('#a16207', rough=0.7))
    lathe([(0.55, 0), (0.3, 0.12), (0, 0.18)], (0.95, -0.7, 0), mat('#ffffff', rough=1))
    shape(star(4, 0.18, 0.06), 0.03, (0, -0.58, 0.7), mat('#ffffff', rough=0.5), 0.01)


@icon('brot')
def _brot():
    crust = grad('#a8521f', '#e3a65a', 0.0, 0.7, axis=2, rough=0.6)
    o = box(2.0, 1.0, 0.8, (0, 0, 0.45), crust, 0)
    subsurf(o, 3)
    for v in o.data.vertices:
        if v.co.z > 0:
            v.co.z *= 1.35
    apply_mods(o)
    crumb = mat('#f3d9a4', rough=0.8)
    for i in range(3):
        cut(o, ball(0.3, (-0.55 + i * 0.55, 0.0, 0.98), crumb, sc=(0.25, 1.7, 0.4), rot=(0, 0, 0.55)))
    _put(o, None)


@icon('kaese')
def _kaese():
    yel = mat('#fbbf24', rough=0.45, sss=0.15)
    # Keil: Spitze nach links, hohe Rückseite rechts
    o = shape([(-1.2, -0.55), (1.0, -0.75), (1.0, 0.75)], 0.75, (0, 0, 0.375), yel, 0.04, rot=(0, 0, math.radians(-20)))
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.convert(target='MESH')
    holes = mat('#d99b0b', rough=0.6)
    R = Matrix.Rotation(math.radians(-20), 4, 'Z')
    for x, y, z, r in [(0.2, -0.68, 0.45, 0.17), (-0.45, -0.62, 0.28, 0.11), (0.65, -0.73, 0.2, 0.12), (0.3, -0.1, 0.75, 0.16), (0.75, 0.25, 0.75, 0.12), (1.0, 0.2, 0.42, 0.15), (1.0, -0.35, 0.25, 0.1)]:
        cut(o, ball(r, tuple(R @ Vector((x, y, z))), holes, seg=16))
    _put(o, None, smooth=False)


@icon('chips')
def _chips():
    bag = mat('#e5383b', rough=0.35, coat=0.4)
    o = grid_box(1.4, 0.7, 2.0, (0, 0, 1.0))
    for v in o.data.vertices:
        t = abs(v.co.z) / 1.0
        v.co.y *= max(0.06, 1 - t ** 3)
        v.co.x *= 1 + 0.06 * (1 - t ** 2)
    subsurf(o, 1)
    _put(o, bag)
    for z in (0.02, 1.98):
        box(1.35, 0.06, 0.1, (0, 0, z), mat('#b91c1c', rough=0.3, metal=0.3), 0.02)
    ball(0.45, (0, -0.33, 1.0), mat('#facc15', rough=0.4), sc=(1.2, 0.15, 1))
    chip = mat('#f6c453', rough=0.5)
    for i, (x, y, z) in enumerate([(0.95, -0.7, 0.15), (1.3, -0.3, 0.12), (0.7, -1.05, 0.1)]):
        ball(0.28, (x, y, z), chip, sc=(1, 1, 0.25), rot=(0.4 * i, 0.3, i))


@icon('raeucherlachs')
def _raeucher():
    box(2.3, 1.3, 0.16, (0, 0, 0.08), mat('#9a6b3f', rough=0.6), 0.04)
    fil = mat('#f27b45', rough=0.35, sss=0.3, coat=0.4)
    o = ball(0.9, (0, 0, 0.3), fil, sc=(1.1, 0.55, 0.2), seg=32)
    stripe = mat('#ffd1b3', rough=0.4)
    for i in range(5):
        x = -0.65 + i * 0.32
        box(0.04, 0.85, 0.02, (x, 0, 0.47 - abs(x) * 0.05), stripe, 0.01, rot=(0, 0, 0.5))
    rod((-0.7, -0.6, 0.25), (-0.3, -0.75, 0.6), 0.02, mat('#4d7c0f', rough=0.5))


def bottle(col, label, cap, loc=(0, 0, 0), h=1.0):
    g = mat(col, rough=0.08, coat=1, trans=0.25)
    lathe([(0, 0), (0.42, 0), (0.45, 0.06), (0.45, 1.35), (0.38, 1.6), (0.17, 1.9), (0.15, 2.5), (0.17, 2.55), (0, 2.55)], loc, g, sc=(1, 1, h))
    lathe([(0.452, 0.45), (0.452, 1.05)], loc, mat(label, rough=0.6), sc=(1, 1, h))
    lathe([(0.162, 2.2), (0.175, 2.56), (0, 2.58)], loc, mat(cap, metal=0.6, rough=0.3), sc=(1, 1, h))


@icon('wein')
def _wein():
    bottle('#1f5130', '#f1e6cf', '#7f1d1d', (-0.35, 0.1, 0))
    glass = mat('#ffffff', rough=0.02, trans=1)
    lathe([(0.3, 0), (0.05, 0.03), (0.04, 0.55), (0.3, 0.75), (0.36, 1.05), (0.34, 1.35), (0.32, 1.35), (0.34, 1.05), (0.28, 0.77), (0.0, 0.62)], (0.55, -0.4, 0), glass)
    lathe([(0, 0.66), (0.27, 0.8), (0.32, 1.0), (0, 1.0)], (0.55, -0.4, 0), mat('#7a0f2a', rough=0.05, trans=0.6))


@icon('jahrgangswein')
def _jahrgang():
    bottle('#2b0f3a', '#d4a63a', '#d4a63a', (0, 0, 0), h=1.05)
    text('1987', 0.22, (0, -0.47, 0.8), mat('#3b1d0f', rough=0.4), 0.01)
    shape(star(5, 0.3, 0.13), 0.08, (0.62, -0.4, 0.3), mat('#f5c542', metal=1, rough=0.2), 0.02)


@icon('bier')
def _bier():
    glass = mat('#ffffff', rough=0.03, trans=1)
    lathe([(0.55, 0), (0.6, 1.5), (0.55, 1.5), (0.5, 0.12), (0, 0.12)], m=glass)
    lathe([(0, 0.12), (0.5, 0.12), (0.545, 1.25), (0, 1.25)], m=mat('#f2a20c', rough=0.05, trans=0.7, sss=0.2))
    foam = mat('#fffaf0', rough=0.8, sss=0.4)
    for i in range(9):
        a = i * 2 * math.pi / 9
        ball(0.2, (0.38 * math.cos(a), 0.38 * math.sin(a), 1.4), foam, seg=16)
    ball(0.3, (0, 0, 1.5), foam, seg=16)
    torus(0.35, 0.08, (0.8, 0, 0.75), glass, rot=(math.pi / 2, 0, 0))


@icon('stoff')
def _stoff():
    fab = mat('#a78bfa', rough=0.85, sss=0.1)
    cyl(0.55, 2.2, (0, 0.3, 0.55), fab, rot=(0, math.pi / 2, 0), b=0.08)
    sheet = box(2.0, 1.3, 0.04, (0, -0.65, 0.03), fab, 0.02)
    cyl(0.12, 2.35, (0, 0.3, 0.55), mat('#8b5e34', rough=0.6), rot=(0, math.pi / 2, 0))
    for i in range(4):
        box(2.0, 0.05, 0.01, (0, -0.95 + i * 0.22, 0.06), mat('#7c5cff', rough=0.8), 0)


@icon('kleidung')
def _kleidung():
    shirt = [(-0.45, 1.0), (-0.15, 1.0), (0, 0.88), (0.15, 1.0), (0.45, 1.0), (0.95, 0.65), (0.75, 0.35), (0.5, 0.5), (0.5, -0.6), (-0.5, -0.6), (-0.5, 0.5), (-0.75, 0.35), (-0.95, 0.65)]
    shape(shirt, 0.25, (0, 0, 0.9), mat('#ec4899', rough=0.8, sss=0.1), 0.08, sc=1.15)
    shape(star(5, 0.25, 0.1), 0.06, (0, -0.2, 1.05), mat('#ffffff', rough=0.5), 0.01)


@icon('bergkaese')
def _bergkaese():
    rind = mat('#b45309', rough=0.6)
    o = cyl(1.1, 0.75, (0, 0, 0.38), rind, b=0.12, v=64)
    c = box(1.6, 1.6, 1.2, (0.75, -0.75, 0.38), mat('#fcd34d', rough=0.5, sss=0.2), 0, rot=(0, 0, math.radians(15)))
    cut(o, c)


@icon('schnaps')
def _schnaps():
    clay = mat('#efe3c8', rough=0.5, coat=0.3)
    lathe([(0, 0), (0.6, 0), (0.75, 0.3), (0.78, 0.8), (0.65, 1.2), (0.35, 1.5), (0.18, 1.6), (0.17, 1.85), (0, 1.85)], m=clay)
    lathe([(0.66, 1.18), (0.36, 1.5), (0.19, 1.6), (0.18, 1.86), (0, 1.86)], m=mat('#7c4a24', rough=0.4, coat=0.5))
    cyl(0.14, 0.25, (0, 0, 1.95), mat('#c49a6c', rough=0.8), b=0.02)
    torus(0.28, 0.06, (0.5, 0, 1.3), mat('#7c4a24', rough=0.4), rot=(math.pi / 2, 0, 0.0))
    text('XXX', 0.36, (0, -0.79, 0.65), mat('#1b1c22', rough=0.5), 0.02)


@icon('replika', elev=35)
def _replika():
    tilt = (math.radians(55), 0, 0)
    strap = mat('#6b3a1e', rough=0.6)
    box(0.6, 2.8, 0.06, (0, 0.2, 1.0), strap, 0.03, rot=tilt)
    gold = mat('#e8b43c', metal=1, rough=0.18)
    cyl(0.7, 0.22, (0, 0, 1.05), gold, rot=tilt, b=0.08)
    g = Matrix.Rotation(tilt[0], 4, 'X')
    P = lambda z: tuple(g @ Vector((0, 0, z)) + Vector((0, 0, 1.05)))
    cyl(0.58, 0.02, P(0.115), mat('#fdf8ec', rough=0.3), rot=tilt, b=0)
    for i in range(12):
        a = i * math.pi / 6
        p = g @ Vector((0.48 * math.cos(a), 0.48 * math.sin(a), 0.13)) + Vector((0, 0, 1.05))
        box(0.035, 0.08, 0.02, tuple(p), gold, 0, rot=(tilt[0], 0, a))
    hand = mat('#1b1c22', rough=0.3)
    p = g @ Vector((0.0, 0.17, 0.14)) + Vector((0, 0, 1.05))
    box(0.04, 0.34, 0.02, tuple(p), hand, 0, rot=tilt)
    p = g @ Vector((0.13, 0.0, 0.15)) + Vector((0, 0, 1.05))
    box(0.27, 0.04, 0.02, tuple(p), hand, 0, rot=tilt)
    cyl(0.1, 0.18, (0.75, -0.0, 1.05 + 0.0), gold, rot=(0, math.pi / 2, 0), b=0.02)


@icon('raubkopie', elev=45)
def _raubkopie():
    disc = mat('#d9dde3', metal=1, rough=0.12, film=420)
    o = cyl(1.2, 0.05, (0, 0, 0.3), disc, rot=(0.25, 0, 0), b=0.01, v=96)
    c = cyl(0.2, 1, (0, 0, 0.3), None, rot=(0.25, 0, 0), b=0)
    cut(o, c, transfer=False)
    case = mat('#1f2937', rough=0.4, coat=0.5)
    box(2.6, 2.6, 0.12, (0.15, 0.3, 0.06), case, 0.04)
    text('COPY', 0.3, (0.1, -0.55, 0.42), mat('#ef4444', rough=0.5), 0.02, rot=(0.25, 0, 0.15))


@icon('truck')
def _truck():
    red = mat('#e11d48', rough=0.25, coat=1)
    white = mat('#eef2f7', rough=0.35, coat=0.5)
    tire = mat('#16181f', rough=0.6)
    box(2.2, 1.2, 1.3, (-0.55, 0, 1.0), white, 0.08)
    box(1.0, 1.15, 1.05, (1.15, 0, 0.88), red, 0.12)
    box(0.06, 0.95, 0.45, (1.66, 0, 1.12), mat('#7dd3fc', rough=0.05, coat=1), 0.03)
    box(0.7, 0.04, 0.4, (1.2, -0.58, 1.12), mat('#7dd3fc', rough=0.05, coat=1), 0.03)
    box(3.3, 1.15, 0.15, (0.0, 0, 0.32), mat('#2a2d35', metal=0.6, rough=0.4), 0.03)
    for x in (-1.2, -0.3, 1.15):
        for y in (-0.55, 0.55):
            cyl(0.3, 0.22, (x, y, 0.3), tire, rot=(math.pi / 2, 0, 0), b=0.05)
            cyl(0.15, 0.24, (x, y, 0.3), mat('#c0c8d4', metal=1, rough=0.3), rot=(math.pi / 2, 0, 0), b=0.02)
    box(1.8, 0.03, 0.4, (-0.55, -0.61, 1.1), mat('#22d3ee', rough=0.4), 0.02)


@icon('hafen')
def _hafen():
    hull = grad('#1e3a8a', '#b91c1c', 0.15, 0.25, axis=2, rough=0.3, coat=0.5)
    o = box(3.4, 1.1, 0.6, (0, 0, 0.3), hull, 0.1)
    for v in o.data.vertices:
        if v.co.x > 1.0 and v.co.z > 0:
            v.co.x += 0.35
    cols = ['#ef4444', '#22c55e', '#f59e0b', '#3b82f6', '#a855f7', '#14b8a6']
    for i in range(5):
        for j in range(2):
            box(0.55, 0.9, 0.38, (-1.25 + i * 0.58, 0, 0.8 + j * 0.4), mat(cols[(i + j * 2) % 6], rough=0.5, metal=0.2), 0.02)
    box(0.5, 0.9, 0.9, (1.55, 0, 1.0), mat('#f8fafc', rough=0.3), 0.05)
    box(0.52, 0.92, 0.12, (1.55, 0, 1.3), mat('#38bdf8', rough=0.05, coat=1), 0.02)


@icon('stadt')
def _stadt():
    win = mat('#fde68a', emit=2.5)
    for i, (x, y, w, h, c) in enumerate([(-0.9, 0.2, 0.7, 1.6, '#64748b'), (-0.1, -0.1, 0.8, 2.6, '#475569'), (0.75, 0.25, 0.7, 2.0, '#334155'), (1.35, -0.35, 0.55, 1.1, '#6b7c93')]):
        box(w, w, h, (x, y, h / 2), mat(c, rough=0.4, coat=0.3), 0.04)
        rows = int(h / 0.32)
        for r in range(1, rows):
            for k in range(2):
                if (r + k + i) % 3 == 0:
                    continue
                box(w * 0.22, 0.02, 0.16, (x - w * 0.22 + k * w * 0.44, y - w / 2 - 0.005, r * 0.32), win, 0)


@icon('shop')
def _shop():
    wall = mat('#e8e2d6', rough=0.6)
    box(2.2, 1.3, 1.6, (0, 0, 0.8), wall, 0.05)
    box(1.3, 0.05, 0.8, (-0.25, -0.65, 0.75), mat('#fde68a', emit=1.5), 0.03)
    box(0.45, 0.05, 1.0, (0.7, -0.66, 0.5), mat('#7c4a24', rough=0.6), 0.03)
    for i in range(6):
        seg = shape([(0, 0), (0.37, 0), (0.37, -0.15), (0.185, -0.25), (0, -0.15)], 0.6, (-1.1 + i * 0.37, -0.75, 1.55), mat('#ef4444' if i % 2 == 0 else '#ffffff', rough=0.5), 0.01, rot=(math.radians(70), 0, 0))
    box(2.4, 1.4, 0.15, (0, 0, 1.68), mat('#334155', rough=0.4), 0.04)


@icon('plane', elev=28)
def _plane():
    white = mat('#f4f6fa', rough=0.25, coat=1)
    blue = mat('#2563eb', rough=0.3, coat=1)
    prof = [(0, -1.6), (0.12, -1.5), (0.22, -1.1), (0.28, -0.5), (0.3, 0.6), (0.27, 1.2), (0.18, 1.55), (0, 1.7)]
    lathe(prof, (0, 0, 1.0), white, rot=(0, math.pi / 2, 0))
    wing = [(-0.35, 0), (0.35, 0), (0.0, 1.6), (-0.25, 1.6)]
    for s in (-1, 1):
        shape([(x, y * s) for x, y in wing], 0.06, (0.05, 0, 0.95), white, 0.02, rot=(0, 0, 0))
        shape([(x * 0.45, y * s * 0.4) for x, y in wing], 0.04, (-1.35, 0, 1.08), white, 0.01, rot=(0, 0, 0))
        cyl(0.11, 0.4, (0.15, s * 0.65, 0.85), mat('#9aa3b2', metal=1, rough=0.3), rot=(0, math.pi / 2, 0), b=0.02)
    shape([(0, 0), (0.45, 0), (0.1, 0.65), (-0.1, 0.65)], 0.05, (-1.5, 0, 1.15), blue, 0.02)
    lathe([(0.305, -0.3), (0.305, 0.9)], (0, 0, 1.0), blue, rot=(0, math.pi / 2, 0), sc=(1, 0.2, 1))


@icon('tnt')
def _tnt():
    red = mat('#d7261e', rough=0.45)
    for i, (x, y) in enumerate([(-0.32, 0), (0.32, 0), (0, 0.45)]):
        cyl(0.3, 1.8, (x, y, 0.9), red, b=0.04)
        cyl(0.24, 0.05, (x, y, 1.82), mat('#f1e3c3', rough=0.8), b=0.01)
    for z in (0.5, 1.35):
        lathe([(0.0, z), (0.0, z)], m=red)
        box(1.3, 1.25, 0.12, (0, 0.2, z), mat('#1b1c22', rough=0.6), 0.05)
    rod((0, 0.45, 1.82), (0.4, 0.2, 2.4), 0.02, mat('#d6c7a1', rough=0.9))
    ball(0.08, (0.42, 0.18, 2.43), mat('#ffb020', emit=12))
    text('TNT', 0.3, (0, -0.31, 0.93), mat('#ffffff', rough=0.5), 0.015)


@icon('coin', elev=18)
def _coin():
    gold = mat('#f2b632', metal=1, rough=0.2)
    cyl(1.0, 0.22, (0, 0, 1.0), gold, rot=(math.radians(80), 0, math.radians(-15)), b=0.06, v=96)
    shape(star(5, 0.45, 0.2), 0.08, (0.03, -0.11, 1.0), mat('#d99a1c', metal=1, rough=0.25), 0.02, rot=(math.radians(80), 0, math.radians(-15)))
    torus(0.8, 0.04, (0.0, 0.0, 1.0), mat('#d99a1c', metal=1, rough=0.25), rot=(math.radians(80), 0, math.radians(-15)))


@icon('lvl', elev=15)
def _lvl():
    shape(star(5, 1.0, 0.45), 0.35, (0, 0, 1.0), mat('#f6c13c', metal=1, rough=0.18), 0.08)

# ---------------------------------------------------------------- Ablauf


def write_bounds(out):
    """Sichtbare Grenzen jedes Icons (oben, unten, links, rechts als Bildanteil) nach bounds.json –
    damit das Spiel Gegenstände exakt auf Flächen setzen kann."""
    import json
    import numpy as np
    from PIL import Image
    data = {}
    for f in sorted(os.listdir(out)):
        if not f.endswith('.webp'):
            continue
        a = np.array(Image.open(os.path.join(out, f)).convert('RGBA'))[..., 3] > 200
        rows, cols = np.where(a.any(axis=1))[0], np.where(a.any(axis=0))[0]
        h, w = a.shape
        data[f[:-5]] = [round(rows.min() / h, 3), round((rows.max() + 1) / h, 3), round(cols.min() / w, 3), round((cols.max() + 1) / w, 3)]
    json.dump(data, open(os.path.join(out, 'bounds.json'), 'w'), indent=0, sort_keys=True)


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    out = os.path.abspath(argv[0] if argv else 'icons')
    keys = argv[1:] or list(ICONS)
    os.makedirs(out, exist_ok=True)
    if keys == ['--bounds']:
        keys = []
    for k in keys:
        f, cam = ICONS[k]
        reset()
        _mats.clear()
        f()
        finish(os.path.join(out, k + '.webp'), **cam)
        print('ok', k, flush=True)
    write_bounds(out)


if __name__ == '__main__':
    main()
