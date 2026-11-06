# Renders the Don't Press machine from concepts/blender/press.blend as separate transparent layers, so the page can move the
# dome, the cover and the sign. Two cameras: the hero's own, whose layers stack up to the hero picture, and a closer game camera.
#   OUT=<dir> [ONLY=g-base,board] [RES=1200] [SAMPLES=192] Blender -b concepts/blender/press.blend -P concepts/blender/press/layers.py
# It also writes layout.json: where the bulbs, the dome, the hinge and the sign's face land in each picture, from 0 to 1.
import json
import math
import os

import bmesh
import bpy
import numpy as np
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

OUT = os.environ['OUT']
ONLY = [n for n in os.environ.get('ONLY', '').split(',') if n]
RES = int(os.environ.get('RES', 1200))
SAMPLES = int(os.environ.get('SAMPLES', 192))

sc = bpy.context.scene
ob = bpy.data.objects
sc.cycles.samples = SAMPLES
prefs = bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type = 'METAL'
prefs.get_devices()
for d in prefs.devices:
    d.use = d.type == 'METAL'
sc.cycles.device = 'GPU'
sc.render.film_transparent = True
sc.cycles.film_transparent_glass = True
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_mode = 'RGBA'

LIGHTS = [f'Light{i}' for i in range(20)]
HOUSING = ['Base', 'Band', 'Deck', 'Bezel', 'Collar', 'Hinge', 'HingeBlock-1', 'HingeBlock1'] + LIGHTS
SIGN = ['Sign', 'Warning']
cam = sc.camera
dome = ob['Dome']
pivot = ob['Empty']
catcher = ob['ShadowCatcher']
DOME_Z, DOME_SZ = dome.location.z, dome.scale.z
HERO_LOC, HERO_ROT = cam.location.copy(), cam.rotation_euler.copy()
OPEN = pivot.rotation_euler.x
HERO_FSTOP = cam.data.dof.aperture_fstop
HERO_LENS = cam.data.lens


def lit(on):
    # The game's bulbs are drawn by the page, so that they can go out one by one. Here they are dark glass.
    if lit.dark is None:
        m = bpy.data.materials.new('BulbOff')
        m.use_nodes = True
        p = m.node_tree.nodes['Principled BSDF']
        p.inputs['Base Color'].default_value = (0.09, 0.075, 0.03, 1)
        p.inputs['Roughness'].default_value = 0.16
        lit.dark, lit.on = m, ob['Light0'].data.materials[0]
    for n in LIGHTS:
        ob[n].data.materials[0] = lit.on if on else lit.dark


lit.dark = None


def show(visible=(), holdout=(), gone=()):
    for o in ob:
        if o.type not in ('MESH', 'FONT'):
            continue
        o.hide_render = o.name in gone
        o.is_holdout = o.name in holdout
        o.visible_camera = o.name in visible or o.name in holdout


def press_dome(sink=0.0, squash=1.0):
    dome.location.z = DOME_Z - sink
    dome.scale.z = DOME_SZ * squash


def hinge(angle):
    pivot.rotation_euler.x = angle


def hero_camera():
    cam.location, cam.rotation_euler = HERO_LOC, HERO_ROT
    cam.data.lens = HERO_LENS
    cam.data.dof.aperture_fstop = HERO_FSTOP
    bpy.context.view_layer.update()


GAME_LOC, GAME_AT, GAME_LENS = Vector((0.45, -4.5, 4.75)), Vector((0.0, 0.2, 0.62)), 60


def game_camera():
    cam.location = GAME_LOC
    cam.rotation_euler = (GAME_AT - GAME_LOC).to_track_quat('-Z', 'Y').to_euler()
    cam.data.lens = GAME_LENS
    cam.data.dof.aperture_fstop = 16
    bpy.context.view_layer.update()


def fade_shadow(path, fade=0.16):
    # The same fade the hero picture got, so the shadow never ends in a hard line at the frame.
    im = bpy.data.images.load(path)
    w, h = im.size
    px = np.array(im.pixels[:], np.float32).reshape(h, w, 4)
    y, x = np.mgrid[0:h, 0:w]
    e = np.minimum.reduce([x, w - 1 - x, y, h - 1 - y]) / (fade * w)
    e = np.clip(e, 0, 1)
    px[..., 3] *= e * e * (3 - 2 * e)
    im.pixels[:] = px.ravel()
    im.save()
    bpy.data.images.remove(im)


def shot(name, res=(RES, RES), fade=False):
    if ONLY and name not in ONLY:
        return
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.filepath = os.path.join(OUT, name + '.png')
    bpy.ops.render.render(write_still=True)
    if fade:
        fade_shadow(sc.render.filepath, 0.16 if fade is True else fade)
    print('LAYER', name, flush=True)


def spot(p):
    q = world_to_camera_view(sc, cam, Vector(p))
    return [round(q.x, 4), round(1 - q.y, 4)]


def layout():
    sc.render.resolution_x = sc.render.resolution_y = RES
    bulbs = [spot(ob[n].matrix_world.translation) for n in LIGHTS]
    # A bulb the dome hides from the camera can't count down time, so the page leaves it dark.
    origin = cam.matrix_world.translation
    depsgraph = bpy.context.evaluated_depsgraph_get()
    seen = []
    for n in LIGHTS:
        p = ob[n].matrix_world.translation
        d = (p - origin)
        hit, where, _, _, o, _ = sc.ray_cast(depsgraph, origin, d.normalized(), distance=d.length - 0.05)
        seen.append(not hit or o.name in ('Cover', 'ShadowCatcher'))
    rim = [spot((0.665 * math.cos(a), 0.665 * math.sin(a), 0.43)) for a in np.linspace(0, 2 * math.pi, 48)]
    xs, ys = [p[0] for p in rim], [p[1] for p in rim]
    top = spot((0, 0, 0.726))
    return dict(
        bulbs=bulbs, seen=seen,
        dome=dict(cx=round((min(xs) + max(xs)) / 2, 4), cy=round((min(ys) + max(ys)) / 2, 4), rx=round((max(xs) - min(xs)) / 2, 4),
                  ry=round((max(ys) - min(ys)) / 2, 4), top=top),
        hinge=spot(pivot.matrix_world.translation),
        sign=[spot(p) for p in [(-1.0, -1.69, 0), (0.5, -1.69, 0), (0.5, -1.39, 0.3), (-1.0, -1.39, 0.3)]],
    )


data = {}
hinge(OPEN)
press_dome()

# ---------------------------------------------------------------- the hero's camera, whose layers stack up to the hero picture
hero_camera()
lit(True)
data['hero'] = layout()
show(HOUSING + ['ShadowCatcher'])
shot('h-base', fade=True)
show(['Dome'], HOUSING)
shot('h-dome-0')
press_dome(0.095, 0.72)
shot('h-dome-1')
press_dome()
show(['Cover'])
shot('h-cover')
show(SIGN)
shot('h-sign')
show(['Sign'], gone=['Warning'])
shot('h-sign-blank')

# ---------------------------------------------------------------- the game's camera: closer and more from the front, without the wedge
game_camera()
lit(False)
data['game'] = layout()
show(HOUSING + ['ShadowCatcher'], gone=SIGN)
shot('g-base', fade=0.11)
for i, (sink, squash) in enumerate(((0, 1), (0.03, 0.93), (0.065, 0.83), (0.095, 0.72))):
    press_dome(sink, squash)
    show(['Dome'], HOUSING, gone=SIGN)
    shot(f'g-dome-{i}')
press_dome()
for i, a in enumerate((OPEN, math.radians(-72), math.radians(-44), math.radians(-18), 0)):
    hinge(a)
    show(['Cover'], gone=SIGN)
    shot(f'g-cover-{i}')
hinge(OPEN)

# ---------------------------------------------------------------- the big flip board that hangs over the game
sign_m = bpy.data.materials['SignYellow']
ink = bpy.data.materials['Ink']
chrome = bpy.data.materials['Chrome']


def plate(name, w, h, r, y0, y1, material, bevel=0.02):
    pts = []
    for cx, cz, a0 in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)):
        for k in range(13):
            a = math.radians(a0 + 90 * k / 12)
            pts.append((cx + r * math.cos(a), cz + r * math.sin(a)))
    bm = bmesh.new()
    front = bm.faces.new([bm.verts.new((x, y0, z)) for x, z in pts])
    bmesh.ops.recalc_face_normals(bm, faces=[front])
    res = bmesh.ops.extrude_face_region(bm, geom=[front])
    moved = [v for v in res['geom'] if isinstance(v, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=(0, y1 - y0, 0), verts=moved)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = ob.new(name, me)
    sc.collection.objects.link(o)
    me.materials.append(material)
    b = o.modifiers.new('Bevel', 'BEVEL')
    b.width, b.segments, b.limit_method = bevel, 5, 'ANGLE'
    for p in me.polygons:
        p.use_smooth = True
    o.modifiers.new('Weighted', 'WEIGHTED_NORMAL') if hasattr(bpy.types, 'WeightedNormalModifier') else None
    return o


BW, BH = 3.2, 1.08
face = bpy.data.materials.new('BoardFace')
face.use_nodes = True
fp = face.node_tree.nodes['Principled BSDF']
fp.inputs['Base Color'].default_value = sign_m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value
fp.inputs['Roughness'].default_value = 0.62
parts = [plate('BoardBack', BW, BH, 0.2, 0.0, 0.16, ink, 0.035), plate('BoardFace', BW - 0.17, BH - 0.17, 0.13, -0.022, 0.02, face, 0.012)]
# Hazard tape along the top and bottom of the face, like the band around the machine.
verts, faces = [], []
for sz in (-1, 1):
    mid = sz * 0.37
    n = 34
    for i in range(n):
        x = -1.33 + 2.66 * (i + 0.5) / n
        o = len(verts)
        verts += [(x - 0.026 + 0.024, -0.0245, mid - 0.035), (x + 0.026 + 0.024, -0.0245, mid - 0.035),
                  (x + 0.026 - 0.024, -0.0245, mid + 0.035), (x - 0.026 - 0.024, -0.0245, mid + 0.035)]
        faces.append([o, o + 1, o + 2, o + 3])
tape = bpy.data.meshes.new('BoardTape')
tape.from_pydata(verts, [], faces)
tape.update()
matte = bpy.data.materials.new('TapeInk')
matte.use_nodes = True
mp = matte.node_tree.nodes['Principled BSDF']
mp.inputs['Base Color'].default_value = ink.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value
mp.inputs['Roughness'].default_value = 0.8
tape.materials.append(matte)
tp = ob.new('BoardTape', tape)
sc.collection.objects.link(tp)
parts.append(tp)
for p in parts:
    p.location.z += 1.5
    p.location.y -= 0.4
board = [p.name for p in parts]
show(board, gone=HOUSING + SIGN + ['Dome', 'Cover', 'ShadowCatcher'])
cam.data.dof.use_dof = False
cam.location = (0, -7.5, 1.5)
cam.rotation_euler = (math.radians(90), 0, 0)
cam.data.lens = 50
sc.render.resolution_x, sc.render.resolution_y = 1400, 500
bpy.context.view_layer.update()
# The camera's frame is fitted to the board, so that the picture's edges are nearly the board's.
cam.data.sensor_fit = 'HORIZONTAL'
cam.data.lens = cam.data.sensor_width * 7.5 / (BW + 0.08)
shot('board', (1400, round(1400 * (BH + 0.08) / (BW + 0.08))))

if not ONLY or 'layout' in ONLY:
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, 'layout.json'), 'w') as f:
        json.dump(data, f)
print('DONE', flush=True)
