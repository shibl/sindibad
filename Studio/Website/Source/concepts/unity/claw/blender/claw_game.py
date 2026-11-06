# Builds every mesh of the claw game and exports it for Unity. Metres, Z up, the machine's front faces -Y.
#   OUT=<Assets/Art> Blender -b --factory-startup -P claw_game.py
# Object names are Group__material. The Unity scene builder reads them to give each part its material and its place.
import bmesh, bpy, math, os, random
from mathutils import Matrix, Vector

OUT = os.environ['OUT']
random.seed(11)
bpy.ops.wm.read_factory_settings(use_empty=True)
FONT = '/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf'

W, D, BH, GH, HH = 1.06, 0.98, 0.86, 1.0, 0.30
POST = 0.055
IW, ID = W - 2 * POST, D - 2 * POST
TOP = BH + GH
CW, CH = 0.32, 0.30                                   # the prize chute, in the front-left corner of the pit
CX, CY = -IW / 2 + CW / 2, -ID / 2 + CW / 2
FX, FZ = 0.0, 0.0

scene = bpy.context.scene
col = scene.collection
made = []

def mesh_obj(name, bm):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    col.objects.link(o)
    made.append(o)
    return o

def finish(o, smooth=True, angle=38):
    me = o.data
    if smooth:
        me.shade_smooth()
        me.set_sharp_from_angle(angle=math.radians(angle))
    return o

def add_bevel(o, width, segs=3, limit=38):
    m = o.modifiers.new('bevel', 'BEVEL')
    m.width = width
    m.segments = segs
    m.limit_method = 'ANGLE'
    m.angle_limit = math.radians(limit)
    m.harden_normals = False
    m.miter_outer = 'MITER_ARC'
    w = o.modifiers.new('wn', 'WEIGHTED_NORMAL')
    w.weight = 100
    w.mode = 'FACE_AREA'
    w.keep_sharp = True
    return o

def apply_all(o):
    bpy.context.view_layer.objects.active = o
    for s in bpy.context.selected_objects:
        s.select_set(False)
    o.select_set(True)
    for m in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)

def box(name, size, loc, bevel=0.0, segs=3, rot=None):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    o = mesh_obj(name, bm)
    o.location = loc
    if rot:
        o.rotation_euler = rot
    finish(o)
    if bevel:
        add_bevel(o, bevel, segs)
    return o

def cyl(name, r, h, loc, bevel=0.0, verts=48, rot=None, segs=3, r2=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=r, radius2=r2 if r2 is not None else r, depth=h)
    o = mesh_obj(name, bm)
    o.location = loc
    if rot:
        o.rotation_euler = rot
    finish(o)
    if bevel:
        add_bevel(o, bevel, segs)
    return o

def sphere(name, r, loc, segs=32, rings=20, scale=None):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=r)
    o = mesh_obj(name, bm)
    o.location = loc
    if scale:
        o.scale = scale
    o.data.shade_smooth()
    return o

def lathe(name, profile, loc=(0, 0, 0), verts=64, sharp=None):
    """A surface of revolution around Z from (radius, height) pairs, bottom to top."""
    bm = bmesh.new()
    rings = []
    for r, z in profile:
        if r < 1e-5:
            rings.append([bm.verts.new((0, 0, z))])
        else:
            rings.append([bm.verts.new((r * math.cos(2 * math.pi * i / verts), r * math.sin(2 * math.pi * i / verts), z)) for i in range(verts)])
    for a, b in zip(rings, rings[1:]):
        if len(a) == 1:
            for i in range(verts):
                bm.faces.new((a[0], b[i], b[(i + 1) % verts]))
        elif len(b) == 1:
            for i in range(verts):
                bm.faces.new((a[i], a[(i + 1) % verts], b[0]))
        else:
            for i in range(verts):
                bm.faces.new((a[i], a[(i + 1) % verts], b[(i + 1) % verts], b[i]))
    o = mesh_obj(name, bm)
    o.location = loc
    o.data.shade_smooth()
    if sharp:
        o.data.set_sharp_from_angle(angle=math.radians(sharp))
    return o

def tube(name, pts, r0, r1=None, res=12, smooth=6):
    """A round bar swept along a Catmull-Rom path, with its radius tapering from r0 to r1."""
    r1 = r0 if r1 is None else r1
    P = [Vector(p) for p in pts]
    path = []
    for i in range(len(P) - 1):
        p0, p1, p2, p3 = P[max(i - 1, 0)], P[i], P[i + 1], P[min(i + 2, len(P) - 1)]
        for k in range(smooth):
            t = k / smooth
            path.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    path.append(P[-1])
    bm = bmesh.new()
    rings = []
    up = Vector((0.0, 1.0, 0.0))
    n = len(path)
    for i, p in enumerate(path):
        tan = (path[min(i + 1, n - 1)] - path[max(i - 1, 0)]).normalized()
        side = tan.cross(up)
        if side.length < 1e-4:
            side = tan.cross(Vector((1, 0, 0)))
        side.normalize()
        nor = side.cross(tan).normalized()
        rr = r0 + (r1 - r0) * i / (n - 1)
        rings.append([bm.verts.new(p + side * rr * math.cos(2 * math.pi * j / res) + nor * rr * math.sin(2 * math.pi * j / res)) for j in range(res)])
    for a, b in zip(rings, rings[1:]):
        for j in range(res):
            bm.faces.new((a[j], a[(j + 1) % res], b[(j + 1) % res], b[j]))
    for ring in (rings[0], rings[-1]):
        bm.faces.new(ring)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = mesh_obj(name, bm)
    o.data.shade_smooth()
    return o

def prism(name, outline, depth, loc, bevel=0.0, rot=None, segs=3):
    bm = bmesh.new()
    vs = [bm.verts.new((x, y, -depth / 2)) for x, y in outline]
    vt = [bm.verts.new((x, y, depth / 2)) for x, y in outline]
    n = len(outline)
    bm.faces.new(vs[::-1])
    bm.faces.new(vt)
    for i in range(n):
        bm.faces.new((vs[i], vs[(i + 1) % n], vt[(i + 1) % n], vt[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = mesh_obj(name, bm)
    o.location = loc
    if rot:
        o.rotation_euler = rot
    finish(o)
    if bevel:
        add_bevel(o, bevel, segs)
    return o

def star(R, r, n=5):
    return [((R if i % 2 == 0 else r) * math.sin(math.pi * i / n), (R if i % 2 == 0 else r) * math.cos(math.pi * i / n)) for i in range(2 * n)]

def rrect(w, h, r, n=8):
    pts = []
    for cx, cy, a0 in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)):
        for i in range(n + 1):
            a = math.radians(a0 + 90 * i / n)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts

def text(name, s, size, loc, extrude=0.004, rot=(math.radians(90), 0, 0), bevel=0.0012, font=FONT):
    cu = bpy.data.curves.new(name, 'FONT')
    cu.body = s
    cu.font = bpy.data.fonts.load(font)
    cu.size = size
    cu.align_x = 'CENTER'
    cu.align_y = 'CENTER'
    cu.extrude = extrude
    cu.bevel_depth = bevel
    cu.bevel_resolution = 2
    cu.resolution_u = 8
    o = bpy.data.objects.new(name, cu)
    col.objects.link(o)
    o.location = loc
    o.rotation_euler = rot
    bpy.context.view_layer.update()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    mw = o.matrix_world.copy()
    bpy.data.objects.remove(o)
    m = bpy.data.objects.new(name, me)
    col.objects.link(m)
    m.matrix_world = mw
    made.append(m)
    return m

def cut(target, cutter):
    m = target.modifiers.new('cut', 'BOOLEAN')
    m.object = cutter
    m.operation = 'DIFFERENCE'
    m.solver = 'EXACT'
    bpy.context.view_layer.update()
    return m

def join_static():
    """Merges all the fixed parts by material, so the cabinet is a handful of draw calls."""
    groups = {}
    for o in list(col.objects):
        if o.type != 'MESH' or o.name.startswith('_'):
            continue
        if not o.name.startswith(('Cab', 'Bulb', 'SlotLight')):
            continue
        groups.setdefault(o.name.split('__')[1].split('.')[0], []).append(o)
    for mat, objs in groups.items():
        for o in objs:
            apply_all(o)
        for s in bpy.context.selected_objects:
            s.select_set(False)
        for o in objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        bpy.ops.object.join()
        pre = 'Bulb' if mat.startswith('bulb') else 'SlotLight' if mat == 'slotlight' else 'Cab'
        objs[0].name = f'{pre}__{mat}'
        objs[0].data.name = objs[0].name

def box_uv(o, scale=1.0):
    """World-scale box projection, so tiling surface textures come out the same size everywhere."""
    me = o.data
    uv = me.uv_layers.new(name='UVMap') if not me.uv_layers else me.uv_layers[0]
    mw = o.matrix_world
    for poly in me.polygons:
        n = poly.normal
        ax = max(range(3), key=lambda k: abs(n[k]))
        for li in poly.loop_indices:
            co = mw @ me.vertices[me.loops[li].vertex_index].co
            u, v = [(co.y, co.z), (co.x, co.z), (co.x, co.y)][ax]
            uv.data[li].uv = (u * scale, v * scale)

def plane_uv(o, x0, x1, z0, z1):
    """Maps a face-on panel to the whole of its texture, seen from the front."""
    me = o.data
    uv = me.uv_layers.new(name='UVMap') if not me.uv_layers else me.uv_layers[0]
    mw = o.matrix_world
    for l in me.loops:
        co = mw @ me.vertices[l.vertex_index].co
        uv.data[l.index].uv = ((co.x - x0) / (x1 - x0), (co.z - z0) / (z1 - z0))

# ------------------------------------------------------------------------------------------------- the base
base = box('Cab_base__paint', (W, D, BH), (0, 0, BH / 2))
door = box('_door', (0.36, 0.40, 0.30), (-0.29, -D / 2 + 0.17, 0.39))
shaft = box('_shaft', (CW - 0.01, CW - 0.01, BH), (CX, CY, BH * 0.5 + 0.30))
slot = box('_slot', (0.018, 0.10, 0.082), (0.30, -D / 2 + 0.02, 0.60))
slotb = box('_slotb', (0.07, 0.10, 0.13), (0.30, -D / 2 + 0.02, 0.60))
cut(base, door); cut(base, shaft); cut(base, slotb)
apply_all(base)
add_bevel(base, 0.018, 4, 40)
for o in (door, shaft, slotb):
    bpy.data.objects.remove(o)
    made.remove(o)

box('Cab_plinth__ink', (W + 0.03, D + 0.03, 0.07), (0, 0, 0.035), bevel=0.016)
box('Cab_bumper__white', (W + 0.022, D + 0.022, 0.05), (0, 0, 0.19), bevel=0.02, segs=4)
# Thin chrome trim where the base meets the deck.
box('Cab_trim__chrome', (W + 0.008, D + 0.008, 0.014), (0, 0, BH - 0.006), bevel=0.004)

# The prize door: a chrome frame, a dark bay with a sloped tray, and a smoked flap that hangs from its top edge.
FRAME = 0.018
dx0, dx1, dz0, dz1 = -0.47, -0.11, 0.24, 0.54
yf = -D / 2 - 0.004
for nm, s, l in (('t', (dx1 - dx0 + 2 * FRAME, 0.012, FRAME), ((dx0 + dx1) / 2, yf, dz1 + FRAME / 2)),
                 ('b', (dx1 - dx0 + 2 * FRAME, 0.012, FRAME), ((dx0 + dx1) / 2, yf, dz0 - FRAME / 2)),
                 ('l', (FRAME, 0.012, dz1 - dz0), (dx0 - FRAME / 2, yf, (dz0 + dz1) / 2)),
                 ('r', (FRAME, 0.012, dz1 - dz0), (dx1 + FRAME / 2, yf, (dz0 + dz1) / 2))):
    box(f'Cab_doorframe{nm}__chrome', s, l, bevel=0.003)
def liner(nm, s, l):
    box(f'Cab_liner{nm}__black', s, l)
# The dark lining of the prize bay and the chute above it, a hair inside the walls cut out of the base.
liner('back', (0.37, 0.006, 0.63), (-0.29, -0.124, 0.56))
liner('left', (0.006, 0.415, 0.63), (dx0 + 0.003, -0.28, 0.56))
liner('right', (0.006, 0.415, 0.30), (dx1 - 0.003, -0.28, 0.39))
liner('top', (0.37, 0.058, 0.006), (-0.29, -0.459, dz1 - 0.003))
liner('topr', (0.052, 0.37, 0.006), (-0.135, -0.305, dz1 - 0.003))
liner('bottom', (0.37, 0.415, 0.006), (-0.29, -0.28, dz0 + 0.003))
liner('shaftr', (0.006, 0.31, 0.33), (-0.163, -0.275, 0.705))
liner('shaftf', (0.31, 0.006, 0.33), (-0.315, -0.427, 0.705))
tray = box('Cab_tray__rubber', (0.36, 0.44, 0.012), (-0.29, -0.27, 0.335), rot=(math.radians(16), 0, 0))
box('Flap__smoke', (0.35, 0.006, 0.30), (-0.29, -D / 2 + 0.012, 0.39))
box('Cab_flapbar__chrome', (0.32, 0.012, 0.012), (-0.29, -D / 2 + 0.002, dz1 - 0.012), bevel=0.003)
prism('Cab_arrow__yellow', [(-0.032, 0.012), (0.032, 0.012), (0.032, 0.0), (0.0, -0.03), (-0.032, 0.0)], 0.008,
      (-0.29, yf - 0.003, dz1 + 0.05), rot=(math.radians(90), 0, 0), bevel=0.002)
text('Cab_prizetext__white', 'PRIZE', 0.038, (-0.29, yf - 0.002, dz1 + 0.098), extrude=0.0012, bevel=0.0004)

# The coin mechanism: a brushed plate with a lit slot and a reject button, set proud of the paint.
PX, PZ = 0.30, 0.585
plate = prism('Cab_plate__steel', rrect(0.17, 0.27, 0.018), 0.012, (PX, -D / 2 - 0.004, PZ), rot=(math.radians(90), 0, 0))
cut(plate, slot)
apply_all(plate)
add_bevel(plate, 0.0025, 2)
bpy.data.objects.remove(slot)
made.remove(slot)
sz = 0.60
# The lit surround of the slot, a ring of four bars around the opening.
for nm, s, l in (('t', (0.038, 0.006, 0.010), (PX, -D / 2 - 0.0115, sz + 0.046)), ('b', (0.038, 0.006, 0.010), (PX, -D / 2 - 0.0115, sz - 0.046)),
                 ('l', (0.010, 0.006, 0.082), (PX - 0.014, -D / 2 - 0.0115, sz)), ('r', (0.010, 0.006, 0.082), (PX + 0.014, -D / 2 - 0.0115, sz))):
    box(f'SlotLight{nm}__slotlight', s, l, bevel=0.0015, segs=2)
box('Cab_slotback__black', (0.03, 0.004, 0.09), (PX, -D / 2 + 0.064, sz))
# The throat of the slot is dark metal, so a coin disappears into blackness rather than into the paint.
for nm, s_, l_ in (('l', (0.001, 0.07, 0.082), (PX - 0.0082, -D / 2 + 0.025, sz)), ('r', (0.001, 0.07, 0.082), (PX + 0.0082, -D / 2 + 0.025, sz)),
                   ('t', (0.018, 0.07, 0.001), (PX, -D / 2 + 0.025, sz + 0.0402)), ('b', (0.018, 0.07, 0.001), (PX, -D / 2 + 0.025, sz - 0.0402))):
    box(f'Cab_slotthroat{nm}__black', s_, l_)
cyl('Cab_reject__chrome', 0.017, 0.012, (PX, -D / 2 - 0.012, PZ - 0.085), bevel=0.003, rot=(math.radians(90), 0, 0))
cyl('Cab_rejectcap__ink', 0.011, 0.016, (PX, -D / 2 - 0.013, PZ - 0.085), bevel=0.002, rot=(math.radians(90), 0, 0))
for sx in (-1, 1):
    for sz2 in (-1, 1):
        cyl(f'Cab_screw{sx}{sz2}__chrome', 0.0055, 0.004, (PX + sx * 0.068, -D / 2 - 0.0115, PZ + sz2 * 0.118), verts=16, rot=(math.radians(90), 0, 0))
text('Cab_cointext__white', 'INSERT COIN', 0.0165, (PX, -D / 2 - 0.0115, sz + 0.075), extrude=0.0006, bevel=0.0002)

# The side badge and studs, as in the hero picture.
cyl('Cab_badge__white', 0.17, 0.018, (W / 2 + 0.006, 0, 0.5), bevel=0.006, rot=(0, math.radians(90), 0))
prism('Cab_badgestar__paint', star(0.115, 0.05), 0.024, (W / 2 + 0.02, 0, 0.5), bevel=0.005, rot=(math.radians(90), 0, math.radians(90)))
for s in (-1, 1):
    for i in range(7):
        sphere(f'Cab_dot{s}{i}__white', 0.016, (s * (W / 2 + 0.002), -D / 2 + 0.13 + i * 0.12, 0.78), segs=16, rings=10)

# ------------------------------------------------------------------------------------------------- the control deck
LD = 0.26
LY = -D / 2 - LD / 2 + 0.02
deck = box('Cab_deck__ink', (W - 0.01, LD + 0.04, 0.09), (0, LY, BH - 0.03), bevel=0.022, segs=4)
box('Cab_decklip__chrome', (W + 0.002, 0.012, 0.016), (0, LY - LD / 2 - 0.022, BH - 0.045), bevel=0.004)
STX, BTX = -0.26, 0.17
cyl('Cab_stickbase__chrome', 0.054, 0.012, (STX, LY, BH + 0.02), bevel=0.004)
cyl('Cab_stickboot__rubber', 0.028, 0.016, (STX, LY, BH + 0.03), bevel=0.005)
# Moving parts carry their pivot in their origin.
stick = cyl('Stick__chrome', 0.0085, 0.12, (0, 0, 0.06), verts=20)
apply_all(stick)
stick.data.transform(Matrix.Translation((0, 0, 0.06))); stick.location = (STX, LY, BH + 0.03)
knob = lathe('Knob__knob', [(0.0, -0.040), (0.018, -0.038), (0.032, -0.026), (0.040, -0.010), (0.043, 0.006), (0.040, 0.024), (0.030, 0.040), (0.016, 0.049), (0.0, 0.052)], verts=32)
knob.location = (STX, LY, BH + 0.03)
knob.data.transform(Matrix.Translation((0, 0, 0.158)))
cyl('Cab_btnring__chrome', 0.063, 0.012, (BTX, LY, BH + 0.02), bevel=0.004)
box_b = lathe('BtnDrop__btnyellow', [(0.0, -0.012), (0.046, -0.012), (0.046, 0.012), (0.044, 0.018), (0.034, 0.022), (0.0, 0.019)], verts=48, sharp=30)
box_b.location = (BTX, LY, BH + 0.03)
cyl('BtnLed__led', 0.052, 0.006, (BTX, LY, BH + 0.024), verts=48)
cyl('Cab_btn2ring__chrome', 0.040, 0.010, (BTX + 0.17, LY, BH + 0.02), bevel=0.003)
b2 = lathe('Cab_btn2__btnblue', [(0.0, -0.01), (0.03, -0.01), (0.03, 0.008), (0.028, 0.013), (0.02, 0.016), (0.0, 0.014)], verts=32, sharp=30)
b2.location = (BTX + 0.17, LY, BH + 0.03)
text('Cab_droptext__white', 'DROP', 0.026, (BTX, LY - 0.094, BH + 0.018), extrude=0.0006, bevel=0.0002, rot=(0, 0, 0))

# ------------------------------------------------------------------------------------------------- the glass box
ZC = BH + GH / 2
for sx in (-1, 1):
    for sy in (-1, 1):
        box(f'Cab_post{sx}{sy}__white', (POST, POST, GH), (sx * (W / 2 - POST / 2), sy * (D / 2 - POST / 2), ZC), bevel=0.012, segs=4)
T = 0.008
pf = box('PaneF__glass', (W - 2 * POST + 0.004, T, GH), (0, -D / 2 + POST / 2, ZC))
# The camera goes inside this pane. Its inner face, seen edge-on from there, would mirror the bright ceiling into the pit,
# so only the outer face is kept.
bm_ = bmesh.new()
bm_.from_mesh(pf.data)
bmesh.ops.delete(bm_, geom=[f for f in bm_.faces if f.normal.y > -0.5], context='FACES_ONLY')
bm_.to_mesh(pf.data)
bm_.free()
pb = box('PaneB__glass', (W - 2 * POST + 0.004, T, GH), (0, D / 2 - POST / 2, ZC))
pl = box('PaneL__glass', (T, D - 2 * POST + 0.004, GH), (-W / 2 + POST / 2, 0, ZC))
pr = box('PaneR__glass', (T, D - 2 * POST + 0.004, GH), (W / 2 - POST / 2, 0, ZC))
for nm, x in (('l', -W / 2 + POST / 2 + 0.16), ('r', W / 2 - POST / 2 - 0.16)):
    pass
# The floor of the pit, with a hole above the chute, in four boxes.
fy = BH + 0.012
box('Cab_floor1__felt', (IW - CW, ID, 0.024), (CX + CW / 2 + (IW - CW) / 2, 0, fy))
box('Cab_floor2__felt', (CW, ID - CW, 0.024), (CX, CY + CW / 2 + (ID - CW) / 2, fy))
# The acrylic chute walls and their yellow rim.
ax, ay = -IW / 2 + CW, -ID / 2 + CW
box('ChuteX__acrylic', (CW, 0.012, CH), (-IW / 2 + CW / 2, ay, BH + CH / 2 + 0.02))
box('ChuteY__acrylic', (0.012, CW, CH), (ax, -ID / 2 + CW / 2, BH + CH / 2 + 0.02))
RZ, RH = BH + CH + 0.02, 0.036
def rim(nm, x0, x1, y0, y1):
    box(f'Cab_chuterim{nm}__yellow', (x1 - x0, y1 - y0, RH), ((x0 + x1) / 2, (y0 + y1) / 2, RZ), bevel=0.008, segs=3)
XL, XR, YF, YB = -IW / 2, ax, -ID / 2, ay
rim('b', XL, XR + 0.045, YB - 0.01, YB + 0.04)      # the two wide sides, facing the pile
rim('r', XR - 0.01, XR + 0.04, YF, YB + 0.04)
rim('f', XL, XR - 0.01, YF, YF + 0.025)             # the two slim sides, against the glass
rim('l', XL, XL + 0.025, YF, YB - 0.01)
text('Cab_chutetext__ink', 'PRIZE', 0.03, ((XL + XR) / 2 + 0.01, YB + 0.015, RZ + RH / 2 + 0.0002), extrude=0.0007, bevel=0.0002, rot=(0, 0, 0))
# A printed board fills the back of the box.
bw = box('Back__backdrop', (IW, 0.012, GH), (0, D / 2 - POST - 0.002, ZC))

# ------------------------------------------------------------------------------------------------- the header
HZ = TOP + HH / 2
box('Cab_header__ink', (W + 0.05, D + 0.05, HH), (0, 0, HZ), bevel=0.03, segs=4)
sp = prism('Sign__sign', rrect(W - 0.16, HH - 0.11, 0.015), 0.014, (0, -D / 2 - 0.032, HZ), rot=(math.radians(90), 0, 0))
apply_all(sp)
box('Cab_signframe__chrome', (W - 0.135, 0.008, HH - 0.085), (0, -D / 2 - 0.027, HZ), bevel=0.003)
text('PlayText__signtext', 'PLAY', 0.15, (0, -D / 2 - 0.04, HZ - 0.008), extrude=0.008, bevel=0.002)
BN = 16
for i in range(BN):
    x = -W / 2 + 0.07 + i * (W - 0.14) / (BN - 1)
    for k, z in enumerate((HZ + HH / 2 - 0.028, HZ - HH / 2 + 0.028)):
        sphere(f'Bulb{"ABC"[i % 3]}_{i}_{k}__bulb{"ABC"[i % 3]}', 0.0145, (x, -D / 2 - 0.028, z), segs=14, rings=8)
# The crest, a half disc with a star and its own ring of bulbs.
cr = cyl('Cab_crest__paint', 0.26, 0.09, (0, -D / 2 + 0.11, TOP + HH), bevel=0.02, rot=(math.radians(90), 0, 0), verts=96)
cc = box('_cc', (0.7, 0.3, 0.4), (0, -D / 2 + 0.11, TOP + HH - 0.2))
cut(cr, cc)
apply_all(cr)
bpy.data.objects.remove(cc)
made.remove(cc)
add_bevel(cr, 0.016, 3, 40)
for i in range(11):
    a = math.radians(9 + i * 16.2)
    sphere(f'Bulb{"ABC"[i % 3]}_c{i}__bulb{"ABC"[i % 3]}', 0.0135, (0.222 * math.cos(a), -D / 2 + 0.058, TOP + HH + 0.222 * math.sin(a)), segs=14, rings=8)
prism('Star__star', star(0.115, 0.05), 0.035, (0, -D / 2 + 0.05, TOP + HH + 0.085), bevel=0.008, rot=(math.radians(90), 0, 0))

# ------------------------------------------------------------------------------------------------- inside the top of the box
GZ = TOP - 0.075
# Lit strips run around the ceiling of the box.
box('Ceil__ceil', (IW, ID, 0.012), (0, 0, TOP - 0.006))
for nm, s, l in (('f', (IW - 0.06, 0.016, 0.006), (0, -ID / 2 + 0.03, TOP - 0.016)), ('b', (IW - 0.06, 0.016, 0.006), (0, ID / 2 - 0.03, TOP - 0.016)),
                 ('l', (0.016, ID - 0.06, 0.006), (-IW / 2 + 0.03, 0, TOP - 0.016)), ('r', (0.016, ID - 0.06, 0.006), (IW / 2 - 0.03, 0, TOP - 0.016))):
    box(f'Cab_strip{nm}__led', s, l)
for sx in (-1, 1):
    box(f'Cab_rail{sx}__steel', (0.022, ID - 0.04, 0.03), (sx * (IW / 2 - 0.035), 0, GZ), bevel=0.004)
    box(f'Cab_railcarrier{sx}__black', (0.03, ID - 0.04, 0.01), (sx * (IW / 2 - 0.035), 0, GZ + 0.025))
# The bridge rides the rails and the carriage rides the bridge. Both have their origin at the centre of their travel.
bridge = box('Bridge__steel', (IW - 0.05, 0.03, 0.022), (0, 0, 0), bevel=0.004)
bridge2 = box('Bridge2__steel', (IW - 0.05, 0.03, 0.022), (0, 0.05, 0), bevel=0.004)
for sx in (-1, 1):
    box(f'BridgeBlock{sx}__black', (0.05, 0.11, 0.04), (sx * (IW / 2 - 0.035), 0.025, 0.002), bevel=0.006)
cyl('BridgeMotor__steel', 0.022, 0.05, (IW / 2 - 0.11, 0.025, 0.03), bevel=0.003, verts=24)
for o in [x for x in made if x.name.startswith(('Bridge'))]:
    apply_all(o)
    o.data.transform(Matrix.Translation(o.location))
    o.location = (0, 0, 0)
bpy.context.view_layer.update()
car = box('Carriage__ink', (0.10, 0.12, 0.05), (0, 0.025, -0.02), bevel=0.008)
carm = cyl('CarriageMotor__steel', 0.022, 0.05, (0.03, 0.025, 0.028), bevel=0.003, verts=24)
carp = cyl('CarriagePulley__black', 0.026, 0.012, (-0.024, 0.025, -0.05), bevel=0.003, verts=24, rot=(0, math.radians(90), 0))
for o in (car, carm, carp):
    apply_all(o)
    o.data.transform(Matrix.Translation(o.location) @ o.rotation_euler.to_matrix().to_4x4())
    o.location = (0, 0, 0)
    o.rotation_euler = (0, 0, 0)

# A steel cable and, around it, the coiled wire that feeds the claw. Both are one unit tall and get stretched.
cyl('Wire__steel', 0.0028, 1.0, (0, 0, 0), verts=10)
c0 = bpy.data.objects['Wire__steel']; apply_all(c0)
c0.data.transform(Matrix.Translation((0, 0, -0.5)))
hp = []
TURNS = 16
for i in range(TURNS * 14 + 1):
    t = i / (TURNS * 14)
    a = t * TURNS * 2 * math.pi
    hp.append((0.017 * math.cos(a), 0.017 * math.sin(a), -t))
coil = tube('Coil__coil', hp, 0.0028, res=6, smooth=1)

# ------------------------------------------------------------------------------------------------- the claw
# The head, a chrome housing with a pink collar. Its origin is the hinge plane, where the three prongs pivot.
hub = lathe('Hub__chrome', [(0.0, -0.032), (0.022, -0.032), (0.030, -0.028), (0.044, -0.012), (0.047, 0.006), (0.047, 0.040), (0.042, 0.052), (0.030, 0.062), (0.016, 0.070), (0.012, 0.086), (0.0, 0.090)], verts=48, sharp=35)
collar = lathe('HubCollar__paint', [(0.047, 0.012), (0.052, 0.014), (0.054, 0.021), (0.052, 0.028), (0.047, 0.030)], verts=48)
cap_b = lathe('HubBolt__black', [(0.0, -0.040), (0.010, -0.040), (0.016, -0.033), (0.016, -0.028), (0.0, -0.028)], verts=24, sharp=35)
for k in range(3):
    a = math.radians(60 + 120 * k)
    box(f'HubLug{k}__black', (0.016, 0.018, 0.024), (0.036 * math.cos(a), 0.036 * math.sin(a), -0.002), rot=(0, 0, a), bevel=0.003)
# One prong, drawn in its closed pose with the hinge at the origin, leaning out along +X. Unity places three of them.
PATH = [(0.0, 0, 0.0), (0.045, 0, -0.04), (0.078, 0, -0.112), (0.072, 0, -0.195), (0.036, 0, -0.256), (-0.002, 0, -0.282)]
pr = tube('Prong__chrome', PATH, 0.0088, 0.0065, res=14, smooth=8)
tip = lathe('ProngTip__rubber', [(0.0, -0.022), (0.006, -0.021), (0.0098, -0.016), (0.0105, -0.006), (0.0098, 0.006), (0.0078, 0.014), (0.0078, 0.024), (0.0, 0.024)], verts=20)
tip.location = (-0.002, 0, -0.282)
tip.rotation_euler = (0, math.radians(-30), 0)
apply_all(tip)
tip.data.transform(Matrix.Translation(tip.location) @ tip.rotation_euler.to_matrix().to_4x4())
tip.location = (0, 0, 0); tip.rotation_euler = (0, 0, 0)
pin = cyl('ProngPin__black', 0.009, 0.022, (0, 0, 0), verts=16, rot=(math.radians(90), 0, 0))
apply_all(pin)
pin.data.transform(pin.rotation_euler.to_matrix().to_4x4())
pin.rotation_euler = (0, 0, 0)

# ------------------------------------------------------------------------------------------------- prizes
def cap_profile(r):
    """A gacha capsule: two shells meeting at a small lip, with a dimple at each pole."""
    prof = [(0.0, -r)]
    N = 18
    for i in range(1, N + 1):
        a = -math.pi / 2 + (math.pi / 2) * i / (N + 1)
        prof.append((r * math.cos(a), r * math.sin(a)))
    prof += [(r * 1.0, -r * 0.05), (r * 1.022, -r * 0.045), (r * 1.022, r * 0.045), (r * 1.0, r * 0.05)]
    for i in range(1, N + 1):
        a = (math.pi / 2) * i / (N + 1)
        prof.append((r * math.cos(a), r * math.sin(a)))
    prof.append((0.0, r))
    return prof

def cap_mesh(name, r, verts=36):
    o = lathe(name, cap_profile(r), verts=verts)
    me = o.data
    uv = me.uv_layers.new(name='UVMap')
    for l in me.loops:
        z = me.vertices[l.vertex_index].co.z
        uv.data[l.index].uv = (0.0625, 0.5 + 0.5 * z / r)
    return o

cap_mesh('Cap__cap', 0.08)

def blob_mesh(name, balls, extra=(), voxel=0.0042, tris=3200):
    """A soft toy's body: ellipsoids merged by a voxel remesh, then relaxed and thinned. extra adds crisp beads such as eyes."""
    bm = bmesh.new()
    for (co, rad) in balls:
        m = Matrix.Translation(co) @ Matrix.Diagonal((rad[0], rad[1], rad[2], 1))
        bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=20, radius=1.0, matrix=m)
    o = mesh_obj(name, bm)
    r = o.modifiers.new('rm', 'REMESH')
    r.mode = 'VOXEL'
    r.voxel_size = voxel
    apply_all(o)
    m = o.modifiers.new('smooth', 'SMOOTH'); m.iterations = 18; m.factor = 0.75
    apply_all(o)
    n = sum(len(p.vertices) - 2 for p in o.data.polygons)
    d = o.modifiers.new('dec', 'DECIMATE'); d.ratio = min(1.0, tris / max(n, 1))
    apply_all(o)
    o['nbody'] = len(o.data.vertices)
    if extra:
        bm = bmesh.new()
        bm.from_mesh(o.data)
        for (co, rad) in extra:
            mt = Matrix.Translation(co) @ Matrix.Diagonal((rad[0], rad[1], rad[2], 1))
            bmesh.ops.create_uvsphere(bm, u_segments=14, v_segments=10, radius=1.0, matrix=mt)
        bm.to_mesh(o.data)
        bm.free()
    o.data.shade_smooth()
    return o

def paint(o, fn):
    me = o.data
    ca = me.color_attributes.new(name='Col', type='BYTE_COLOR', domain='CORNER')
    nb = o.get('nbody', 10 ** 9)
    for l in me.loops:
        v = me.vertices[l.vertex_index].co
        c = fn(v, l.vertex_index >= nb)
        ca.data[l.index].color = (c[0], c[1], c[2], 1.0)
    uv = me.uv_layers.new(name='UVMap')
    for l in me.loops:
        v = me.vertices[l.vertex_index]
        n, co = v.normal, v.co
        ax = max(range(3), key=lambda k: abs(n[k]))
        u, w = [(co.y, co.z), (co.x, co.z), (co.x, co.y)][ax]
        uv.data[l.index].uv = (u * 6, w * 6)

def near(v, p, r):
    return (v - Vector(p)).length < r

BEAD = (0.012, 0.01, 0.01)

def bear():
    k = 0.86
    def K(p):
        return tuple(c * k for c in p)
    ball = [((0, 0, 0), (0.072, 0.062, 0.078)), ((0, 0, 0.098), (0.066, 0.058, 0.056)),
            ((-0.050, 0, 0.148), (0.024, 0.014, 0.024)), ((0.050, 0, 0.148), (0.024, 0.014, 0.024)),
            ((0, -0.050, 0.085), (0.030, 0.024, 0.024)),
            ((-0.070, -0.012, 0.014), (0.024, 0.024, 0.042)), ((0.070, -0.012, 0.014), (0.024, 0.024, 0.042)),
            ((-0.042, -0.030, -0.058), (0.028, 0.042, 0.026)), ((0.042, -0.030, -0.058), (0.028, 0.042, 0.026))]
    eyes = [((-0.026, -0.0505, 0.116), (0.0095, 0.0065, 0.0095)), ((0.026, -0.0505, 0.116), (0.0095, 0.0065, 0.0095)), ((0, -0.0735, 0.094), (0.0125, 0.0075, 0.0095))]
    o = blob_mesh('Bear__plush', [(K(c), K(r)) for c, r in ball], [(K(c), K(r)) for c, r in eyes])
    def col_fn(v, bead):
        if bead:
            return BEAD
        v = v / k
        if near(v, (0, -0.058, 0.082), 0.032) or near(v, (0, -0.052, -0.004), 0.043):
            return (1.0, 0.94, 0.84)
        if near(v, (-0.050, -0.012, 0.148), 0.016) or near(v, (0.050, -0.012, 0.148), 0.016):
            return (1.0, 0.82, 0.82)
        return (1, 1, 1)
    paint(o, col_fn)
    return o

def chick():
    ball = [((0, 0, 0), (0.084, 0.078, 0.080)), ((0, 0.004, 0.084), (0.012, 0.018, 0.024)), ((-0.022, 0.0, 0.080), (0.010, 0.014, 0.018)),
            ((-0.080, 0.002, -0.006), (0.020, 0.040, 0.034)), ((0.080, 0.002, -0.006), (0.020, 0.040, 0.034))]
    eyes = [((-0.030, -0.0705, 0.024), (0.0105, 0.0065, 0.0105)), ((0.030, -0.0705, 0.024), (0.0105, 0.0065, 0.0105))]
    beak = ((0, -0.082, 0.004), (0.017, 0.0105, 0.0095))
    o = blob_mesh('Chick__plush', ball, eyes + [beak])
    nb = o['nbody']
    def col_fn(v, bead):
        if bead:
            return (1.0, 0.42, 0.08) if near(v, beak[0], 0.019) else BEAD
        if near(v, (0.054, -0.054, -0.002), 0.017) or near(v, (-0.054, -0.054, -0.002), 0.017):
            return (1.0, 0.72, 0.72)
        return (1, 1, 1)
    paint(o, col_fn)
    return o

def plush_star():
    ball = [((0, 0, 0), (0.058, 0.036, 0.058))]
    for i in range(5):
        a = math.radians(90 + 72 * i)
        for f, r in ((0.048, 0.042), (0.074, 0.031), (0.098, 0.019)):
            ball.append(((f * math.cos(a), 0, f * math.sin(a)), (r, r * 0.72, r)))
    eyes = [((-0.021, -0.0335, 0.010), (0.0082, 0.0055, 0.0082)), ((0.021, -0.0335, 0.010), (0.0082, 0.0055, 0.0082))]
    o = blob_mesh('StarPlush__plush', ball, eyes)
    paint(o, lambda v, bead: BEAD if bead else (1, 1, 1))
    return o

bear(); chick(); plush_star()

# The bed of capsules under the pile. It never moves, and it fills the bottom of the box when seen through the glass.
bed = []
tries = 0
RB = 0.074
while len(bed) < 64 and tries < 40000:
    tries += 1
    x = random.uniform(-IW / 2 + RB * 0.8, IW / 2 - RB * 0.8)
    y = random.uniform(-ID / 2 + RB * 0.8, ID / 2 - RB * 0.8)
    z = random.uniform(BH + 0.024 + RB * 0.7, BH + 0.024 + RB * 0.7 + 0.075)
    if x < -IW / 2 + CW + RB and y < -ID / 2 + CW + RB:
        continue
    if all((Vector((x, y, z)) - b).length > 0.098 for b in bed):
        bed.append(Vector((x, y, z)))
print('BED', len(bed))
low = cap_mesh('_caplow', 0.08, verts=28)
bm = bmesh.new()
tmp = bmesh.new()
src = low.data
uvl = bm.loops.layers.uv.new('UVMap')
for k, b in enumerate(bed):
    colw = random.randrange(8)
    q = Matrix.Rotation(random.uniform(0, 6.28), 4, 'X') @ Matrix.Rotation(random.uniform(0, 6.28), 4, 'Y')
    m = Matrix.Translation(b) @ q @ Matrix.Scale(0.92, 4)
    tmp.clear()
    tmp.from_mesh(src)
    bmesh.ops.transform(tmp, matrix=m, verts=tmp.verts)
    ul = tmp.loops.layers.uv[0]
    mp = {}
    for v in tmp.verts:
        mp[v] = bm.verts.new(v.co)
    for f in tmp.faces:
        nf = bm.faces.new([mp[v] for v in f.verts])
        nf.smooth = True
        for l0, l1 in zip(f.loops, nf.loops):
            u = l0[ul].uv
            l1[uvl].uv = ((colw + 0.5) / 8, u[1])
tmp.free()
mesh_obj('Bed__cap', bm)
bpy.data.objects.remove(low)
made.remove(low)

# ------------------------------------------------------------------------------------------------- the coin
R, TH = 0.03, 0.0052
PROF = [(0.0, -TH / 2 + 0.0008), (R * 0.86, -TH / 2 + 0.0008), (R * 0.885, -TH / 2), (R * 0.985, -TH / 2), (R, -TH / 2 + 0.0008),
        (R, TH / 2 - 0.0008), (R * 0.985, TH / 2), (R * 0.885, TH / 2), (R * 0.86, TH / 2 - 0.0008), (0.0, TH / 2 - 0.0008)]
coin = lathe('Coin__coin', PROF, verts=96, sharp=35)
me = coin.data
uv = me.uv_layers.new(name='UVMap')
for l in me.loops:
    v = me.vertices[l.vertex_index].co
    uv.data[l.index].uv = (0.5 + 0.5 * v.x / R, 0.5 + 0.5 * v.y / R)

# ------------------------------------------------------------------------------------------------- tidy up and export
join_static()
for o in col.objects:
    if o.type != 'MESH':
        continue
    nm = o.name.split('__')[0]
    for m in list(o.modifiers):
        apply_all(o)
        break
    bpy.context.view_layer.update()
    if nm == 'Sign':
        plane_uv(o, -(W - 0.16) / 2, (W - 0.16) / 2, HZ - (HH - 0.11) / 2, HZ + (HH - 0.11) / 2)
    elif nm == 'Back':
        plane_uv(o, -IW / 2, IW / 2, BH, TOP)
    elif not o.data.uv_layers:
        box_uv(o, 1.0)

# Bake every rotation into the vertices: the Unity side places parts by their position alone.
for o in bpy.data.objects:
    if o.type != 'MESH':
        continue
    for s_ in bpy.context.selected_objects:
        s_.select_set(False)
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

for o in bpy.data.objects:
    print('OBJ', o.name, len(o.data.polygons) if o.type == 'MESH' else 0)
print('TRIS', sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.data.objects if o.type == 'MESH'))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'claw_game.blend'), compress=True)
bpy.ops.export_scene.fbx(filepath=os.path.join(OUT, 'claw_game.fbx'), use_selection=False, object_types={'MESH'}, apply_unit_scale=True,
                         apply_scale_options='FBX_SCALE_ALL', axis_forward='-Z', axis_up='Y', bake_space_transform=True,
                         mesh_smooth_type='FACE', use_mesh_modifiers=True, add_leaf_bones=False, bake_anim=False, colors_type='SRGB')
print('EXPORTED', flush=True)
