# The break, rendered: the phone on the table, the sea leaving its screen, the flood, the raft surfacing, ending on the camera the
# live WebGL sea takes over from. Writes frames with alpha over the sky, a manifest with each frame's camera and screen corners, and
# the raft as a card for the live scene.
#   WORK=<dir> TAG=<hydro tag> ASPECT=land|port W= H= SPP= DST=<dir> [FRAMES=20,60,100] [RAFT=1] Blender -b --factory-startup -P render_seq.py
import bpy, json, math, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from mathutils import Vector, Matrix, Euler, Quaternion
from bpy_extras.object_utils import world_to_camera_view
from common import *
import geometry as G
import scene as S
import surface as Sf
import path as P

ASPECT = os.environ.get('ASPECT', 'land')
portrait = ASPECT == 'port'
W_, H_ = int(os.environ.get('W', 1280 if not portrait else 540)), int(os.environ.get('H', 800 if not portrait else 1170))
TAG = os.environ.get('TAG', 'h9')
DST = os.environ.get('DST', os.path.join(WORK, 'seq', ASPECT))
os.makedirs(DST, exist_ok=True)
FMT = os.environ.get('FMT', 'WEBP')
Q = int(os.environ.get('Q', 62))
setup_cycles(W_, H_, int(os.environ.get('SPP', 96)), threshold=float(os.environ.get('THRESH', 0.02)), bounces=(8, 3, 4, 8, 0))
scene = bpy.context.scene
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'WEBP' if FMT == 'WEBP' else 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.image_settings.quality = Q

set_ = S.build_scene()
root = S.align_to_phone(set_)
cam = set_['cam']
col = collection('Water')
hydro_dir = os.path.join(WORK, 'hydro', TAG)
sheet = Sf.Surface(hydro_dir, col, int(os.environ.get('STRIDE', 1)))
sun_ob = bpy.data.objects['Sun']
SUN0 = (root.matrix_world.to_3x3() @ S.SUN_DIR).normalized()
SUN1 = Vector(P.SUN_END).normalized()
gobo_nodes = bpy.data.materials['Gobo'].node_tree.nodes
world_nodes = scene.world.node_tree.nodes

# ------------------------------------------------------------------------------------------------------------- the raft
# A section of the tabletop, two planks wide, that comes up with the phone and the tea glass on it.
table = bpy.data.objects['Table']
wood_raft = bpy.data.materials['Teak']
def build_raft():
    verts = []
    faces = []
    # In table-local coordinates so the grain matches where it was cut from.
    rx0, rx1, ry0, ry1 = -15.0, 15.0, -17.0, 23.0
    n = 24
    r = np.random.default_rng(12)
    def edge_y(base, s):
        return base + s * (r.normal(0, 0.3))
    bot, top = [], []
    outline = []
    for i in range(n + 1):
        outline.append((rx0 + (rx1 - rx0) * i / n, edge_y(ry0, 1)))
    outline.append((rx1, ry1 * 0.5 + ry0 * 0.5))
    for i in range(n + 1):
        outline.append((rx1 - (rx1 - rx0) * i / n, edge_y(ry1, 1)))
    outline.append((rx0, ry1 * 0.5 + ry0 * 0.5))
    m = len(outline)
    for x, y in outline:
        verts.append((x, y, 0.0))
    for x, y in outline:
        verts.append((x, y, -2.0))
    faces.append(tuple(range(m)))
    faces.append(tuple(range(2 * m - 1, m - 1, -1)))
    for i in range(m):
        j = (i + 1) % m
        faces.append((i, m + i, m + j, j))
    ob = make_object('Raft', verts, faces, col, [wood_raft], False)
    return ob

raft = build_raft()
# A short broken length of plank lying across the raft: the phone has lodged against it.
def build_wedge():
    v = [(-6.4, 6.2, 0.0), (6.4, 6.2, 0.0), (6.4, 9.0, 0.0), (-6.4, 9.0, 0.0), (-6.4, 6.2, 2.5), (6.4, 6.2, 3.4), (6.4, 9.0, 3.2), (-6.4, 9.0, 2.3)]
    f = [(3, 2, 1, 0), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    return make_object('RaftWedge', v, f, col, [wood_raft], False)
wedge = build_wedge()
wedge.hide_render = True
raft_root = bpy.data.objects.new('RaftRoot', None)
col.objects.link(raft_root)
raft_root.matrix_world = root.matrix_world.copy()
raft.parent = raft_root
raft.matrix_parent_inverse = Matrix.Identity(4)
raft.hide_render = True
phone_ob = bpy.data.objects['Phone']
tea_ob = bpy.data.objects['Tea']
phone_ob.parent = raft_root
tea_ob.parent = raft_root
# The wedge is in phone space: same turn as the phone on the raft.
wedge.parent = raft_root
wedge.rotation_euler = (0, 0, S.PHONE_YAW)
PHONE_M0 = phone_ob.matrix_local.copy()
# A tail of cable over the raft's edge, once it's up. (Under water the original cable stays with the table.)
cable = bpy.data.objects['Cable']
bpy.context.view_layer.update()
R0 = root.matrix_world.copy()


def raft_pose(f):
    """World matrix of the raft group at a given sim frame."""
    t = P.smoothstep(P.RAFT_F0, P.RAFT_F1, f)
    z = P.SEA_LEVEL * t + P.RAFT_LIFT * t
    settle = P.smoothstep(P.RAFT_F0, P.RAFT_F1 + 8, f)
    yaw = settle * math.radians(P.RAFT_YAW)
    pitch = settle * math.radians(P.RAFT_PITCH)
    roll = settle * math.radians(P.RAFT_ROLL)
    bob = math.sin(f * 0.21) * 0.25 * t * (1 - settle)
    x = P.RAFT_XY[0] * settle
    y = P.RAFT_XY[1] * settle
    return Matrix.Translation((x, y, z + bob)) @ Matrix.Rotation(yaw, 4, 'Z') @ Matrix.Rotation(pitch, 4, 'X') @ Matrix.Rotation(roll, 4, 'Y') @ R0


# ------------------------------------------------------------------------------------------------------------- the open sea
# Beyond the sim's box: a large sheet at the flood's level, with its leading edge running away over the table toward the horizon.
level_cache = {}
def flood_level(f):
    if f in level_cache:
        return level_cache[f]
    path = os.path.join(hydro_dir, f'h{max(1, min(f, P.SIM_FRAMES)):04d}.npz')
    d = np.load(path)
    h = d['h'].astype(np.float32)
    e = 6
    edge = np.concatenate([h[e, ::6], h[-e, ::6], h[::6, e], h[::6, -e]])
    level_cache[f] = float(np.median(edge))
    return level_cache[f]


grid_n = 320
gx = np.sign(np.linspace(-1, 1, grid_n)) * np.abs(np.linspace(-1, 1, grid_n)) ** 3.0 * 5200 + 0.0
gy = np.linspace(0, 1, grid_n) ** 3.0 * 7200 - 300
OX, OY = np.meshgrid(gx.astype(np.float32), gy.astype(np.float32))
outer_me = bpy.data.meshes.new('Outer')
outer = bpy.data.objects.new('OuterSea', outer_me)
col.objects.link(outer)
inside = (OX > sheet.x0 + 1) & (OX < sheet.x1 - 1) & (OY > sheet.y0 + 1) & (OY < sheet.y1 - 1)
vi = np.arange(grid_n * grid_n, dtype=np.int32).reshape(grid_n, grid_n)
q = np.stack([vi[:-1, :-1].ravel(), vi[:-1, 1:].ravel(), vi[1:, 1:].ravel(), vi[1:, :-1].ravel()], 1)
qin = inside[:-1, :-1] & inside[:-1, 1:] & inside[1:, 1:] & inside[1:, :-1]
q = q[~qin.ravel()]
outer_me.vertices.add(grid_n * grid_n)
outer_me.loops.add(len(q) * 4)
outer_me.polygons.add(len(q))
outer_me.vertices.foreach_set('co', np.stack([OX.ravel(), OY.ravel(), np.zeros(grid_n * grid_n)], 1).astype(np.float32).ravel())
outer_me.loops.foreach_set('vertex_index', q.astype(np.int32).ravel())
outer_me.polygons.foreach_set('loop_start', np.arange(len(q), dtype=np.int32) * 4)
outer_me.update(calc_edges=True)
outer_me.shade_smooth()
outer_mat = sheet.mat.copy()
outer_mat.name = 'SeaOuter'
_nt = outer_mat.node_tree
_dv = _nt.nodes.new('ShaderNodeValue')
_dv.name = 'OuterDepth'
for _node in list(_nt.nodes):
    if _node.bl_idname == 'ShaderNodeAttribute' and _node.attribute_name == 'depth':
        for _l in list(_node.outputs['Fac'].links):
            _nt.links.new(_dv.outputs[0], _l.to_socket)
outer_me.materials.append(outer_mat)
for nm in ('depth', 'foam', 'glow', 'far', 'w1'):
    outer_me.attributes.new(nm, 'FLOAT', 'POINT')
lv = q.ravel()
for name, off in (('adv0', (0, 0)), ('adv1', (11.3, 5.7))):
    layer = outer_me.uv_layers.new(name=name)
    uv = np.stack([(OX.ravel()[lv] + off[0]) / sheet.lace_world, (OY.ravel()[lv] + off[1]) / sheet.lace_world], 1).astype(np.float32)
    layer.uv.foreach_set('vector', uv.ravel())
outer_me.attributes['w1'].data.foreach_set('value', np.ones(grid_n * grid_n, np.float32))


def set_outer(f, swell):
    level = flood_level(f)
    t = f / 24.0
    # The front leaves the box and accelerates away, hidden by distance: by the time the sky is in frame it's over the horizon.
    r_front = 40.0 + max(0.0, f - P.FLOOD_F) ** 2.0 * 1.6
    dd = np.maximum(np.maximum(np.abs(OX) - 50.0, OY - 28.0), -72.0 - OY)
    z = level - np.maximum(0.0, dd - r_front) * 0.08
    if swell:
        z = z + swell(OX, OY)
    outer_me.vertices.foreach_set('co', np.stack([OX.ravel(), OY.ravel(), z.ravel()], 1).astype(np.float32).ravel())
    outer_me.attributes['depth'].data.foreach_set('value', np.maximum(np.full(OX.shape, level, np.float32).ravel(), 0.0))
    outer_me.update()
    outer.hide_render = level < 0.03
    _dv.outputs[0].default_value = max(level, 0.0)
    outer_mat.node_tree.nodes['SeaLift'].outputs[0].default_value = sheet.mat.node_tree.nodes['SeaLift'].outputs[0].default_value
    outer_mat.node_tree.nodes['Time'].outputs[0].default_value = f * 0.035


# ------------------------------------------------------------------------------------------------------------- the swell
wave_table = P.wave_table()
def make_swell(f):
    a = P.swell_amount(f)
    if a <= 0:
        return None
    tw = P.world_time(f)
    def fn(x, y):
        out = np.zeros_like(x)
        for dx_, dy_, k_, w_, amp, q_ in wave_table:
            out += amp * np.sin(k_ * (dx_ * x + dy_ * y) - w_ * tw)
        # Long-range fade, as in the live shader.
        return out * a
    return fn


def apply_frame(f):
    P.apply_camera(cam, f, portrait)
    # Sun: from behind the room's lattice toward the final low sun.
    k = P.smoothstep(P.SUN_F0, P.SUN_F1, f)
    d = SUN0.slerp(SUN1, k) if hasattr(SUN0, 'slerp') else (SUN0.lerp(SUN1, k)).normalized()
    sun_ob.matrix_world = Matrix.Translation(sun_ob.matrix_world.translation) @ d.to_track_quat('Z', 'Y').to_matrix().to_4x4()
    sun_ob.data.energy = 6.5 + (2.8 - 6.5) * k
    sun_ob.data.color = tuple(a + (b - a) * k for a, b in zip(hx('#ffc78a')[:3], hx('#ffd29e')[:3]))
    sun_ob.data.angle = math.radians(0.55 + 0.35 * k)
    # The lattice opens as the room goes.
    gobo_nodes['GoboOpen'].inputs[1].default_value = P.smoothstep(P.GOBO_F0, P.GOBO_F1, f)
    # The room's dim light gives way to the sky.
    world_nodes['RoomLight'].inputs['Strength'].default_value = 0.3 + 0.75 * P.smoothstep(P.SUN_F0, P.SUN_F1, f)
    # Water.
    sheet.mat.node_tree.nodes['SeaLift'].outputs[0].default_value = float(os.environ.get('LIFT', 0.3)) * P.smoothstep(P.SUN_F0 + 14, P.SUN_F1 + 10, f)
    swell = make_swell(f)
    sim_f = min(f, P.SIM_FRAMES)
    sheet.set_frame(max(1, sim_f), f * 0.035, spray=f < P.RAFT_F0, swell=swell, eye=tuple(cam.location), level=flood_level(f) if f > P.FLOOD_F else None)
    set_outer(f, swell)
    # The raft.
    raft_root.matrix_world = raft_pose(f)
    raft.hide_render = f < P.RAFT_F0 - 2
    wedge.hide_render = raft.hide_render
    prop = math.radians(P.PHONE_PROP) * P.smoothstep(P.RAFT_F0 - 6, P.RAFT_F0 + 10, f)
    # Tilt about the phone's chin edge, so the chin stays on the raft and the top comes up.
    pivot = Matrix.Translation((0, -G.H / 2, 0))
    phone_ob.matrix_local = PHONE_M0 @ pivot @ Matrix.Rotation(prop, 4, 'X') @ pivot.inverted()
    bpy.context.view_layer.update()


def screen_corners():
    """Where the display's corners land in this frame, in frame coordinates, y down."""
    m = phone_ob.matrix_world
    z = G.T * 0.913 / 0.98 + 0.005
    out = []
    for x, y in ((G.SCREEN_X0, G.SCREEN_Y1), (G.SCREEN_X1, G.SCREEN_Y1), (G.SCREEN_X1, G.SCREEN_Y0), (G.SCREEN_X0, G.SCREEN_Y0)):
        co = world_to_camera_view(scene, cam, m @ Vector((x, y, z)))
        out += [round(co.x, 5), round(1 - co.y, 5)]
    return out


def sky_image(eye, at, lens, W, H):
    """The live sky's gradient, without its clouds, for this camera, in display colours. Mirrors skyBase in src/about/phone/sea.ts."""
    eye = np.array(eye, np.float64)
    at = np.array(at, np.float64)
    f = at - eye
    f /= np.linalg.norm(f)
    r_ = np.cross(f, (0, 0, 1))
    r_ /= np.linalg.norm(r_)
    u = np.cross(r_, f)
    asp = W / H
    hw = 18.0 / lens if asp >= 1 else 18.0 / lens * asp
    hh = hw / asp
    xs = ((np.arange(W) + 0.5) / W * 2 - 1) * hw
    ys = (1 - (np.arange(H) + 0.5) / H * 2) * hh
    X, Y = np.meshgrid(xs, ys)
    d = f[None, None] + r_[None, None] * X[:, :, None] + u[None, None] * Y[:, :, None]
    d /= np.linalg.norm(d, axis=2, keepdims=True)
    e = np.maximum(d[:, :, 2], 0.0)
    def st(a, b, x):
        t = np.clip((x - a) / (b - a), 0, 1)
        return t * t * (3 - 2 * t)
    def mx(a, b, k):
        return a * (1 - k[:, :, None]) + b * k[:, :, None]
    Z, M, L, Ho = np.array((0.565, 0.8, 0.86)), np.array((0.8, 0.91, 0.92)), np.array((0.985, 0.915, 0.8)), np.array((1.0, 0.835, 0.64))
    c = mx(np.broadcast_to(Ho, d.shape), np.broadcast_to(L, d.shape), st(0.0, 0.055, e))
    c = mx(c, np.broadcast_to(M, d.shape), st(0.03, 0.26, e))
    c = mx(c, np.broadcast_to(Z, d.shape), st(0.2, 0.75, e))
    sun = np.array(P.SUN_END, np.float64)
    sun /= np.linalg.norm(sun)
    s = np.maximum((d * sun).sum(2), 0.0)
    c = mx(c, np.broadcast_to(np.array((1.0, 0.925, 0.76)), d.shape), s ** 12 * 0.55)
    c = mx(c, np.broadcast_to(np.array((1.0, 0.86, 0.62)), d.shape), s ** 90 * 0.5)
    return c.astype(np.float32)


def finish_frame(png, out):
    im = bpy.data.images.load(png)
    im.colorspace_settings.name = 'Non-Color'
    w, h = im.size
    a = np.empty(w * h * 4, np.float32)
    im.pixels.foreach_get(a)
    bpy.data.images.remove(im)
    a = a.reshape(h, w, 4)[::-1]
    sky = sky_image(cam.location, P.camera_target(F_NOW, portrait), cam.data.lens, w, h)
    al = a[:, :, 3:4]
    rgb = a[:, :, :3] * al + sky * (1 - al)
    # A trace of noise: holds the sky's long gradient together through compression.
    rgb += (RNG.random((h, w, 1)) - 0.5) / 255.0
    o = np.dstack([np.clip(rgb, 0, 1), np.ones((h, w), np.float32)])
    oi = bpy.data.images.new('frame_out', w, h, alpha=True, float_buffer=False)
    oi.colorspace_settings.name = 'Non-Color'
    oi.pixels.foreach_set(o[::-1].astype(np.float32).ravel())
    s_ = scene.render.image_settings
    # Keep a lossless copy outside the repo, so a weight change only needs a re-encode (pack.py WHAT=encode).
    raw_dir = os.path.join(WORK, 'seq', f'raw_{ASPECT}_{W_}')
    os.makedirs(raw_dir, exist_ok=True)
    s_.file_format = 'PNG'
    s_.color_mode = 'RGB'
    oi.save_render(os.path.join(raw_dir, os.path.basename(out).replace('.webp', '.png')))
    s_.file_format = 'WEBP'
    s_.color_mode = 'RGB'
    s_.quality = Q
    oi.save_render(out)
    bpy.data.images.remove(oi)
    s_.file_format = 'PNG'
    s_.color_mode = 'RGBA'


RNG = np.random.default_rng(3)
scene.render.image_settings.file_format = 'PNG'
frames = P.frame_list()
only = os.environ.get('FRAMES')
if only:
    frames = [int(v) for v in only.split(',')]
T0 = time.time()
manifest = []
for i, f in enumerate(P.frame_list()):
    pass
for i, f in enumerate(frames):
    apply_frame(f)
    name = f'f{P.frame_list().index(f) if f in P.frame_list() else f:03d}'
    path = os.path.join(DST, name + ('.webp' if FMT == 'WEBP' else '.png'))
    if os.path.exists(path) and os.environ.get('RESUME') == '1':
        continue
    F_NOW = f
    tmp = os.path.join(WORK, 'seq', f'_tmp_{ASPECT}.png')
    scene.render.filepath = tmp
    bpy.ops.render.render(write_still=True)
    finish_frame(tmp, path)
    print(f'frame {f} ({i + 1}/{len(frames)}) at {time.time() - T0:.0f}s', flush=True)

# The manifest needs no rendering: camera and corners at every frame.
if os.environ.get('MANIFEST', '1') == '1':
    for f in P.frame_list():
        P.apply_camera(cam, f, portrait)
        raft_root.matrix_world = raft_pose(f)
        prop = math.radians(P.PHONE_PROP) * P.smoothstep(P.RAFT_F0 - 6, P.RAFT_F0 + 10, f)
        pivot = Matrix.Translation((0, -G.H / 2, 0))
        phone_ob.matrix_local = PHONE_M0 @ pivot @ Matrix.Rotation(prop, 4, 'X') @ pivot.inverted()
        bpy.context.view_layer.update()
        manifest.append(dict(f=f, eye=[round(v, 3) for v in cam.location], at=[round(v, 3) for v in P.camera_target(f, portrait)], lens=round(cam.data.lens, 3), corners=screen_corners()))
    with open(os.path.join(DST, 'manifest.json'), 'w') as fo:
        json.dump(dict(w=W_, h=H_, sea=P.SEA_LEVEL, frames=manifest, sun=list(P.SUN_END)), fo)

# The raft alone, as a card for the live scene: rendered with the final camera, cropped to what's there, placed on a plane through it.
if os.environ.get('RAFT') == '1':
    f = P.frame_list()[-1]
    P.apply_camera(cam, f, portrait)
    raft_root.matrix_world = raft_pose(P.FINAL_F)
    pivot = Matrix.Translation((0, -G.H / 2, 0))
    phone_ob.matrix_local = PHONE_M0 @ pivot @ Matrix.Rotation(math.radians(P.PHONE_PROP), 4, 'X') @ pivot.inverted()
    bpy.context.view_layer.update()
    # What's under the water must not be in the card: a holdout at sea level cuts it, leaving the true waterline in the alpha.
    hold_m = material('Holdout')
    hn = N(hold_m)
    h_s = hn('Holdout')
    hn.link(h_s.outputs[0], hn('OutputMaterial').inputs[0])
    hv = [(-900, -900, P.SEA_LEVEL), (900, -900, P.SEA_LEVEL), (900, 900, P.SEA_LEVEL), (-900, 900, P.SEA_LEVEL)]
    hold = make_object('WaterHold', hv, [(0, 1, 2, 3)], col, [hold_m], False)
    for o in bpy.data.objects:
        if o.type != 'MESH' and o.type != 'CURVE':
            continue
        keep = o.name in ('Raft', 'WaterHold', 'RaftWedge') or (o.parent is not None and (o.parent.name in ('Phone', 'Tea', 'RaftRoot'))) or o.name.startswith('Tea') or o.name in ('PhoneBody', 'PhoneGlass', 'Saucer', 'SaucerRim')
        if not keep:
            o.hide_render = True
    bpy.data.objects['SeaSheet'].hide_render = True
    bpy.data.objects['Spray'].hide_render = True
    bpy.data.objects['OuterSea'].hide_render = True
    bpy.data.objects['RaftWedge'].hide_render = False
    raft.hide_render = False
    cam.data.dof.use_dof = False
    scale = float(os.environ.get('RAFT_SCALE', 2.0))
    scene.render.resolution_x, scene.render.resolution_y = int(W_ * scale), int(H_ * scale)
    scene.render.image_settings.file_format = 'PNG'
    scene.render.filepath = os.path.join(DST, 'raft_full.png')
    bpy.ops.render.render(write_still=True)
    # The corners of the screen in the full frame, for the card.
    scene.render.resolution_x, scene.render.resolution_y = W_, H_
    rc = screen_corners()
    with open(os.path.join(DST, 'raft.json'), 'w') as fo:
        json.dump(dict(corners=rc, eye=list(cam.location), at=list(P.camera_target(f, portrait)), lens=cam.data.lens, pivot=list(raft_root.matrix_world.translation), scale=scale), fo)
print('all done', time.time() - T0, flush=True)
