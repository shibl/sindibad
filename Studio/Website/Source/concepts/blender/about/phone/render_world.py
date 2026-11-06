# Renders the storybook assets: the islands and the dhow as cards with alpha for the live sea, and the little archipelago seen from
# above that runs on the phone's screen.
#   WORK=<dir> DST=<dir> WHAT=cards,world SCALE=1 SPP=128 Blender -b --factory-startup -P render_world.py
import bpy, json, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from mathutils import Vector, Euler
from common import *
import props as P

DST = os.environ.get('DST', os.path.join(WORK, 'world'))
os.makedirs(DST, exist_ok=True)
SPP = int(os.environ.get('SPP', 96))
SCALE = float(os.environ.get('SCALE', 1.0))
WHAT = os.environ.get('WHAT', 'cards,world').split(',')
SUN_END = Vector((0.2, 1.0, 0.135)).normalized()      # keep in step with SUN in src/about/phone/sea.ts


def clear():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o)
    for m in list(bpy.data.meshes):
        bpy.data.meshes.remove(m)
    for c in list(bpy.data.collections):
        bpy.data.collections.remove(c)


def world_sky(strength=1.0):
    scene = bpy.context.scene
    w = bpy.data.worlds.get('Sky') or bpy.data.worlds.new('Sky')
    scene.world = w
    n = N(w)
    tc = n('TexCoord')
    sep = n('SeparateXYZ')
    n.link(tc.outputs['Generated'], sep.inputs[0])
    sky = n.ramp(sep.outputs['Z'], [(0.0, '#ffd8a6'), (0.05, '#ffe6c8'), (0.2, '#cfe8ec'), (0.6, '#8fc9da'), (1.0, '#69b3cb')])
    floor = n.ramp(n.math('MULTIPLY', sep.outputs['Z'], -1.0), [(0.0, '#6bb7bd'), (0.3, '#17606c')])
    is_up = n.math('GREATER_THAN', sep.outputs['Z'], 0.0)
    bg = n('Background', inputs={'Strength': strength})
    n.link(n.mix(is_up, floor, sky), bg.inputs['Color'])
    out = n('OutputWorld')
    n.link(bg.outputs[0], out.inputs[0])


def add_sun(direction, energy=4.5, color='#ffd9a6', angle=2.0):
    sun = bpy.data.lights.new('SunW', 'SUN')
    sun.energy = energy
    sun.color = hx(color)[:3]
    sun.angle = math.radians(angle)
    o = bpy.data.objects.new('SunW', sun)
    bpy.context.scene.collection.objects.link(o)
    o.rotation_euler = direction.to_track_quat('Z', 'Y').to_euler()
    return o


def camera_for(bounds, w_px, side=True, pad=1.06):
    """An orthographic camera square onto the card plane, framed on the object's bounds. Returns pixel size in world units."""
    cam = bpy.data.cameras.new('C')
    cam.type = 'ORTHO'
    ob = bpy.data.objects.new('C', cam)
    bpy.context.scene.collection.objects.link(ob)
    bpy.context.scene.camera = ob
    return ob


def bounds_of(objs):
    lo = Vector((1e9, 1e9, 1e9))
    hi = -lo
    for o in objs:
        if o.type != 'MESH' or not o.data.vertices:
            continue
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            lo = Vector(min(a, b) for a, b in zip(lo, w))
            hi = Vector(max(a, b) for a, b in zip(hi, w))
    return lo, hi


def save_card(name, build, px_w, zmin=-0.06, sun_dir=None, sky=1.0, sun_e=4.0):
    """Render one thing seen from the south, side on, cut at the waterline with alpha."""
    clear()
    col = collection(name)
    root = build(col)
    bpy.context.view_layer.update()
    lo, hi = bounds_of(list(col.objects))
    margin = 0.05 * (hi.x - lo.x)
    x0, x1, z0, z1 = lo.x - margin, hi.x + margin, zmin * (hi.z - lo.z), hi.z + margin
    world_w, world_h = x1 - x0, z1 - z0
    px_h = int(round(px_w * world_h / world_w))
    setup_cycles(px_w, px_h, SPP, threshold=0.012, bounces=(6, 3, 3, 4, 0))
    scene = bpy.context.scene
    scene.render.film_transparent = True
    scene.view_settings.look = 'AgX - Medium High Contrast'
    world_sky(sky)
    add_sun(sun_dir or SUN_END, sun_e)
    add_sun(Vector((-0.45, -0.75, 0.48)).normalized(), float(os.environ.get('FILL', 1.5)), '#fff1dc', 24.0)
    cam = camera_for(None, px_w)
    cam.data.ortho_scale = max(world_w, world_h)
    cam.location = ((x0 + x1) / 2, lo.y - 60, (z0 + z1) / 2)
    cam.rotation_euler = (math.radians(90), 0, 0)
    cam.data.clip_start = 0.1
    cam.data.clip_end = 1000
    # Hide anything below the water so nothing wet shows when the card rises.
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.filepath = os.path.join(DST, f'{name}.png')
    bpy.ops.render.render(write_still=True)
    meta = dict(w=world_w, h=world_h, x0=x0, x1=x1, z0=z0, z1=z1, px=[px_w, px_h])
    print('card', name, meta, flush=True)
    return meta


meta = {}
if 'cards' in WHAT:
    names = os.environ.get('CARDS', 'volcano,light,fort,palms,dhow').split(',')
    if 'volcano' in names: meta['volcano'] = save_card('volcano', P.island_volcano, int(1024 * SCALE))
    if 'light' in names: meta['light'] = save_card('light', P.island_lighthouse, int(860 * SCALE))
    if 'fort' in names: meta['fort'] = save_card('fort', P.island_fort, int(960 * SCALE))
    if 'palms' in names: meta['palms'] = save_card('palms', P.island_palms, int(760 * SCALE))
    if 'dhow' in names: meta['dhow'] = save_card('dhow', P.dhow, int(1100 * SCALE), zmin=-0.03, sky=1.0, sun_e=5.0)
    with open(os.path.join(DST, 'cards.json'), 'w') as f:
        json.dump(meta, f, indent=1)

if 'world' in WHAT:
    # The archipelago seen from above and a little from the south, for the game on the phone's screen. Alpha where there's sea.
    clear()
    col = collection('World')
    def place(build, x, y, s, rot=0.0):
        before = set(bpy.data.objects)
        build(col)
        new = [o for o in bpy.data.objects if o not in before]
        root = bpy.data.objects.new('R', None)
        col.objects.link(root)
        for o in new:
            o.parent = root
        root.location = (x, y, 0)
        root.scale = (s, s, s)
        root.rotation_euler = (0, 0, rot)
    place(P.island_palms, -9.0, 39.0, 0.75, 0.6)
    place(P.island_volcano, 11.0, 25.0, 0.82, 0.2)
    place(P.island_lighthouse, -11.0, 5.0, 0.8, -0.3)
    place(P.island_fort, 8.5, -19.0, 0.85, 0.15)
    place(P.island_palms, -11.0, -37.0, 0.62, 2.0)
    W_, H_ = int(os.environ.get('SW', 540)), int(os.environ.get('SH', 1088))
    setup_cycles(W_, H_, SPP, threshold=0.012, bounces=(6, 3, 3, 4, 0))
    scene = bpy.context.scene
    scene.render.film_transparent = True
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'None'
    scene.view_settings.exposure = -0.55
    world_sky(1.1)
    add_sun(Vector((-0.5, -0.45, 0.72)).normalized(), 4.8, '#fff0d6', 3.0)
    cam = camera_for(None, W_)
    cam.data.ortho_scale = 104.0
    cam.location = (0, -30, 100)
    cam.rotation_euler = (math.radians(14), 0, 0)
    cam.data.clip_end = 800
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.filepath = os.path.join(DST, 'world.png')
    bpy.ops.render.render(write_still=True)
    print('world done', flush=True)
