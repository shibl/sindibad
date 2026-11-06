# Renders the storybook's paper pieces with Cycles into one atlas and exports their outlines for WebGL.
#   ROOT=<repo> SCRATCH=<dir> [SPP=96] [ATLAS=3072] [D=1200] Blender -b --factory-startup -P build.py
# For a quick draft: SPP=16 ATLAS=2048 D=800.
# Writes public/about/storybook/atlas.webp and pieces.bin. See src/about/storybook/assets.ts for the file's layout.
import bpy, json, math, os, struct, sys, time
import numpy as np
from mathutils import geometry, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import art

ROOT = os.environ['ROOT']
SCRATCH = os.environ.get('SCRATCH', '/tmp')
PUB = os.path.join(ROOT, 'public/about/storybook')
SPP = int(os.environ.get('SPP', 96))
ATLAS = int(os.environ.get('ATLAS', 3072))
SS = int(os.environ.get('SS', 1))  # Rendered this much larger, then filtered down.
QUALITY = int(os.environ.get('QUALITY', 88))
RENDER = ATLAS * SS
D = float(os.environ.get('D', 1200))  # Atlas pixels per page width, at a piece's density of 1.
PAD = 12  # Atlas pixels around each piece, so mips don't bleed.
ZGAP = 2.6  # u between layers
THICK = 1.0  # u thickness of a layer
T0 = time.time()


def log(*a):
    print(f'[{time.time() - T0:6.1f}s]', *a, flush=True)


def lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hx(s):
    s = s.lstrip('#')
    return tuple(lin(int(s[i:i + 2], 16) / 255) for i in (0, 2, 4))


def hx8(s):
    s = s.lstrip('#')
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


# ------------------------------------------------------------------------------------------------------------------ packing
pieces = art.PIECES
cells = []
for p in pieces:
    b = p.bounds()
    sc = D * p.density / 1000
    w = int(math.ceil((b[2] - b[0]) * sc)) + 2 * PAD
    h = int(math.ceil((b[3] - b[1]) * sc)) + 2 * PAD
    cells.append((p, b, sc, w, h))
order = sorted(cells, key=lambda c: -c[4])
x = y = 0
row = 0
place = {}
SWATCH_ROW = 24
for c in order:
    p, b, sc, w, h = c
    if x + w > ATLAS:
        x = 0
        y += row
        row = 0
    place[p.name] = (x, y)
    x += w
    row = max(row, h)
used = y + row
log(f'packed {len(pieces)} pieces into {ATLAS}x{used} (limit {ATLAS - SWATCH_ROW})')
if used > ATLAS - SWATCH_ROW:
    raise SystemExit(f'atlas overflow: {used}')

# ---------------------------------------------------------------------------------------------------------------- the scene
scene = bpy.context.scene
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)

pr = bpy.context.preferences.addons['cycles'].preferences
pr.compute_device_type = 'METAL'
pr.get_devices()
for d in pr.devices:
    d.use = d.type == 'METAL'
scene.render.engine = 'CYCLES'
c = scene.cycles
c.device = 'GPU'
c.samples = SPP
c.use_adaptive_sampling = True
c.adaptive_threshold = 0.02
c.use_denoising = True
c.denoiser = 'OPENIMAGEDENOISE'
c.denoising_input_passes = 'RGB_ALBEDO_NORMAL'
c.max_bounces, c.diffuse_bounces, c.glossy_bounces, c.transmission_bounces, c.volume_bounces = 3, 2, 0, 0, 0
scene.render.film_transparent = True
scene.render.filter_size = 1.2
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
scene.render.resolution_x = RENDER
scene.render.resolution_y = RENDER
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.image_settings.color_depth = '8'

# 1 Blender unit = 1000 atlas pixels.
BU = ATLAS / 1000
cam = bpy.data.cameras.new('cam')
cam.type = 'ORTHO'
cam.ortho_scale = BU
cam.clip_start = 0.001
cam.clip_end = 10
co = bpy.data.objects.new('cam', cam)
scene.collection.objects.link(co)
co.location = (BU / 2, -BU / 2, 2)
scene.camera = co

# A soft key from the top left, so every layer drops a small shadow on the one below, and enough sky that a flat
# surface comes out at its own colour: sky 0.45 + sun 0.55.
world = bpy.data.worlds.new('w')
scene.world = world
try:
    world.use_nodes = True
except Exception:
    pass
bg = world.node_tree.nodes['Background']
bg.inputs[0].default_value = (1, 1, 1, 1)
bg.inputs[1].default_value = 0.46
sun = bpy.data.lights.new('sun', 'SUN')
sun.angle = math.radians(26)
d = Vector((-0.55, 0.62, 0.62)).normalized()
sun.energy = 0.54 * math.pi / d.z
so = bpy.data.objects.new('sun', sun)
scene.collection.objects.link(so)
so.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()

# One material; every layer's colours and wash come from its object's custom properties.
mat = bpy.data.materials.new('paper')
try:
    mat.use_nodes = True
except Exception:
    pass
nt = mat.node_tree
for n in list(nt.nodes):
    nt.nodes.remove(n)
N = nt.nodes.new
L = nt.links.new


def attr(name):
    a = N('ShaderNodeAttribute')
    a.attribute_type = 'OBJECT'
    a.attribute_name = name
    return a


def math_node(op, a=None, b=None):
    m = N('ShaderNodeMath')
    m.operation = op
    for i, v in enumerate((a, b)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            m.inputs[i].default_value = v
        else:
            L(v, m.inputs[i])
    return m.outputs[0]


tc = N('ShaderNodeTexCoord')
pos = tc.outputs['Object']
ca, cb = attr('col_a'), attr('col_b')
ka = attr('g_k')  # the wash: t = k.x*x + k.y*y + k.z, or a radial one when g_r > 0
ra = attr('g_r')  # r.x cx, r.y cy, r.z 1/radius
tex = attr('tex')
bmp = attr('bump')
vm = N('ShaderNodeVectorMath')
vm.operation = 'DOT_PRODUCT'
L(pos, vm.inputs[0])
sp = N('ShaderNodeSeparateXYZ')
L(ka.outputs['Vector'], sp.inputs[0])
com = N('ShaderNodeCombineXYZ')
L(sp.outputs[0], com.inputs[0])
L(sp.outputs[1], com.inputs[1])
L(com.outputs[0], vm.inputs[1])
linear = math_node('ADD', vm.outputs['Value'], sp.outputs[2])
srad = N('ShaderNodeSeparateXYZ')
L(ra.outputs['Vector'], srad.inputs[0])
cc = N('ShaderNodeCombineXYZ')
L(srad.outputs[0], cc.inputs[0])
L(srad.outputs[1], cc.inputs[1])
pp = N('ShaderNodeVectorMath')
pp.operation = 'SUBTRACT'
L(pos, pp.inputs[0])
L(cc.outputs[0], pp.inputs[1])
sp2 = N('ShaderNodeSeparateXYZ')
L(pp.outputs[0], sp2.inputs[0])
cc2 = N('ShaderNodeCombineXYZ')
L(sp2.outputs[0], cc2.inputs[0])
L(sp2.outputs[1], cc2.inputs[1])
ln = N('ShaderNodeVectorMath')
ln.operation = 'LENGTH'
L(cc2.outputs[0], ln.inputs[0])
radial = math_node('MULTIPLY', ln.outputs['Value'], srad.outputs[2])
israd = math_node('GREATER_THAN', srad.outputs[2], 0.0)
tm = N('ShaderNodeMix')
tm.data_type = 'FLOAT'
L(israd, tm.inputs[0])
L(linear, tm.inputs[2])
L(radial, tm.inputs[3])
tcl = math_node('MINIMUM', math_node('MAXIMUM', tm.outputs[0], 0.0), 1.0)
mix = N('ShaderNodeMix')
mix.data_type = 'RGBA'
L(tcl, mix.inputs[0])
L(ca.outputs['Color'], mix.inputs['A'])
L(cb.outputs['Color'], mix.inputs['B'])
# Gouache: slow blotches, brush strokes across the layer, and grain.
tx = N('ShaderNodeSeparateXYZ')
L(pos, tx.inputs[0])
nb = N('ShaderNodeTexNoise')
L(pos, nb.inputs['Vector'])
nb.inputs['Scale'].default_value = 0.022
nb.inputs['Detail'].default_value = 4
nb.inputs['Roughness'].default_value = 0.6
map1 = N('ShaderNodeMapping')
L(pos, map1.inputs[0])
map1.inputs['Scale'].default_value = (0.012, 0.11, 1)
map1.inputs['Rotation'].default_value = (0, 0, 0.12)
ns = N('ShaderNodeTexNoise')
L(map1.outputs[0], ns.inputs['Vector'])
ns.inputs['Scale'].default_value = 1.0
ns.inputs['Detail'].default_value = 5
ns.inputs['Roughness'].default_value = 0.62
ng = N('ShaderNodeTexNoise')
L(pos, ng.inputs['Vector'])
ng.inputs['Scale'].default_value = 0.55
ng.inputs['Detail'].default_value = 2
s1 = math_node('MULTIPLY', math_node('SUBTRACT', nb.outputs[0], 0.5), 0.20)
s2 = math_node('MULTIPLY', math_node('SUBTRACT', ns.outputs[0], 0.5), 0.34)
s3 = math_node('MULTIPLY', math_node('SUBTRACT', ng.outputs[0], 0.5), 0.10)
paint = math_node('ADD', 1.0, math_node('MULTIPLY', math_node('ADD', math_node('ADD', s1, s2), s3), tex.outputs['Fac']))
cm = N('ShaderNodeVectorMath')
cm.operation = 'SCALE'
L(mix.outputs['Result'], cm.inputs[0])
L(paint, cm.inputs['Scale'])
bm = N('ShaderNodeBump')
bm.inputs['Strength'].default_value = 0.45
bm.inputs['Distance'].default_value = 1.2
nf = N('ShaderNodeTexNoise')
L(pos, nf.inputs['Vector'])
nf.inputs['Scale'].default_value = 0.9
nf.inputs['Detail'].default_value = 3
L(math_node('MULTIPLY', nf.outputs[0], bmp.outputs['Fac']), bm.inputs['Height'])
df = N('ShaderNodeBsdfDiffuse')
L(cm.outputs[0], df.inputs['Color'])
L(bm.outputs[0], df.inputs['Normal'])
out = N('ShaderNodeOutputMaterial')
L(df.outputs[0], out.inputs[0])

# Build the layers
count = 0
for pc, b, sc, w, h in cells:
    cx, cy = place[pc.name]
    # Atlas pixel of the piece's (0, 0), measured from the atlas' top left.
    ox = cx + PAD - b[0] * sc
    oy = cy + PAD + b[3] * sc
    pc.origin = (ox, oy, sc)
    s = sc / 1000  # Blender units per u
    z = 0.0
    for lay in pc.layers:
        cu = bpy.data.curves.new(f'{pc.name}', 'CURVE')
        cu.dimensions = '2D'
        cu.fill_mode = 'BOTH'
        cu.extrude = THICK * 0.5
        cu.resolution_u = 1
        for poly in lay['polys']:
            sp_ = cu.splines.new('POLY')
            sp_.points.add(len(poly) - 1)
            for i, (px, py) in enumerate(poly):
                sp_.points[i].co = (px, py, 0, 1)
            sp_.use_cyclic_u = True
        ob = bpy.data.objects.new(f'{pc.name}', cu)
        scene.collection.objects.link(ob)
        z += ZGAP * lay['lift']
        ob.location = (ox / 1000, -oy / 1000, z * s)
        ob.scale = (s, s, s)
        cu.materials.append(mat)
        a = hx(lay['a'])
        bb = hx(lay['b']) if lay['b'] else a
        ob['col_a'] = a
        ob['col_b'] = bb
        k = (0.0, 0.0, 0.0)
        r = (0.0, 0.0, 0.0)
        if lay['g']:
            x0, y0, x1, y1 = lay['g']
            dx, dy = x1 - x0, y1 - y0
            l2 = dx * dx + dy * dy or 1
            k = (dx / l2, dy / l2, -(x0 * dx + y0 * dy) / l2)
        if lay['r']:
            r = (lay['r'][0], lay['r'][1], 1 / lay['r'][2])
        ob['g_k'] = k
        ob['g_r'] = r
        ob['tex'] = float(lay['tex'])
        ob['bump'] = float(lay['bump'])
        count += 1
log(f'{count} layers')

path = os.path.join(SCRATCH, 'atlas-render.png')
if not os.environ.get('REUSE'):
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    log('rendered')

# -------------------------------------------------------------------------------------------------------------- post: outlines
img = bpy.data.images.load(path)
img.colorspace_settings.name = 'Non-Color'
img.alpha_mode = 'STRAIGHT'
W, H = img.size
px = np.empty(W * H * 4, np.float32)
img.pixels.foreach_get(px)
px = px.reshape(H, W, 4)[::-1].copy()  # top row first
alpha = px[:, :, 3]
log('read', W, H)


def trace(mask):
    """Chains the pixel edges of a boolean mask into closed loops. Returns them longest first, as arrays of (x, y)."""
    H, W = mask.shape
    m = np.zeros((H + 2, W + 2), bool)
    m[1:-1, 1:-1] = mask
    nxt = {}
    def add(a, b):
        nxt.setdefault(a, []).append(b)
    ys, xs = np.nonzero(m[1:-1, 1:-1] & ~m[:-2, 1:-1])  # top edges, travelling right
    for y, x in zip(ys.tolist(), xs.tolist()):
        add((x, y), (x + 1, y))
    ys, xs = np.nonzero(m[1:-1, 1:-1] & ~m[1:-1, 2:])  # right edges, travelling down
    for y, x in zip(ys.tolist(), xs.tolist()):
        add((x + 1, y), (x + 1, y + 1))
    ys, xs = np.nonzero(m[1:-1, 1:-1] & ~m[2:, 1:-1])  # bottom edges, travelling left
    for y, x in zip(ys.tolist(), xs.tolist()):
        add((x + 1, y + 1), (x, y + 1))
    ys, xs = np.nonzero(m[1:-1, 1:-1] & ~m[1:-1, :-2])  # left edges, travelling up
    for y, x in zip(ys.tolist(), xs.tolist()):
        add((x, y + 1), (x, y))
    loops = []
    while nxt:
        start = next(iter(nxt))
        cur = start
        loop = [cur]
        prev_dir = None
        while True:
            opts = nxt[cur]
            if len(opts) == 1:
                b = opts.pop()
            else:
                # At a pixel-corner touch, keep to the right so the shape stays separate.
                dx, dy = prev_dir or (1, 0)
                rx, ry = -dy, dx
                b = None
                for o in opts:
                    if (o[0] - cur[0], o[1] - cur[1]) == (rx, ry):
                        b = o
                if b is None:
                    b = opts[0]
                opts.remove(b)
            if not opts:
                del nxt[cur]
            prev_dir = (b[0] - cur[0], b[1] - cur[1])
            cur = b
            if cur == start:
                break
            loop.append(cur)
        loops.append(np.array(loop, np.float64))
    loops.sort(key=lambda a: -len(a))
    return loops


def rdp_closed(P, tol):
    """Douglas-Peucker on a closed loop."""
    n = len(P)
    # Split at the two farthest points
    i0 = 0
    i1 = int(np.argmax(((P - P[0]) ** 2).sum(1)))
    keep = np.zeros(n, bool)
    keep[i0] = keep[i1] = True
    stack = [(i0, i1), (i1, n)]
    Q = np.vstack([P, P[:1]])
    while stack:
        a, b = stack.pop()
        if b - a < 2:
            continue
        A, B = Q[a], Q[b]
        d = B - A
        l = np.hypot(*d) or 1
        seg = Q[a + 1:b]
        dist = np.abs((seg[:, 0] - A[0]) * d[1] - (seg[:, 1] - A[1]) * d[0]) / l
        j = int(np.argmax(dist))
        if dist[j] > tol:
            k = a + 1 + j
            keep[k % n] = True
            stack += [(a, k), (k, b)]
    return P[keep]


def in_poly(P, pts):
    """Point in polygon for many points."""
    x, y = pts[:, 0], pts[:, 1]
    inside = np.zeros(len(pts), bool)
    Q = np.roll(P, -1, axis=0)
    for (ax, ay), (bx, by) in zip(P, Q):
        cond = (ay > y) != (by > y)
        with np.errstate(divide='ignore', invalid='ignore'):
            xi = (bx - ax) * (y - ay) / (by - ay + 1e-12) + ax
        inside ^= cond & (x < xi)
    return inside


export = []
all_mask = np.zeros((H, W), bool)
for pc, b, sc, w, h in cells:
    cx, cy = place[pc.name]
    x0, y0 = cx * SS, cy * SS
    x1, y1 = (cx + w) * SS, (cy + h) * SS
    a = alpha[y0:y1, x0:x1] > 0.5
    all_mask[y0:y1, x0:x1] |= a
    loops = trace(a)
    area = lambda L: 0.5 * abs(np.dot(L[:, 0], np.roll(L[:, 1], -1)) - np.dot(L[:, 1], np.roll(L[:, 0], -1)))
    # Keep the outline, real holes and any separate islands; drop specks.
    ox, oy, s_ = pc.origin
    kept = []
    for L_ in loops:
        if area(L_) < 16 * SS * SS and len(kept):
            continue
        # The pixel edge is a staircase: relax it a little so a long shallow slope comes out as one clean cut.
        if len(L_) > 12:
            k5 = np.ones(5) / 5
            L_ = np.stack([np.convolve(np.r_[L_[-4:, i], L_[:, i], L_[:4, i]], k5, mode='same')[4:-4] for i in (0, 1)], 1)
        simp = rdp_closed(L_, 0.7 * SS)
        if len(simp) < 3:
            continue
        lx = ((simp[:, 0] / SS + cx) - ox) / (s_ * 1000)
        ly = (oy - (simp[:, 1] / SS + cy)) / (s_ * 1000)
        kept.append(np.stack([lx, ly], 1))
    stray = [] if len(kept) == 1 else [len(k_) for k_ in kept[1:]]
    poly = kept[0]
    # Optional crease: split the boundary where it crosses a vertical line, so a V-fold has vertices on it.
    crease = getattr(pc, 'crease', None)
    if crease is not None:
        cq = crease / 1000
        out_ = []
        for i in range(len(poly)):
            A, B_ = poly[i], poly[(i + 1) % len(poly)]
            out_.append(A)
            if (A[0] - cq) * (B_[0] - cq) < 0:
                t = (cq - A[0]) / (B_[0] - A[0])
                out_.append(A + (B_ - A) * t)
        poly = np.array(out_)
    kept[0] = poly
    allb = np.vstack(kept)
    sizes = [len(k_) for k_ in kept]
    # Interior vertices let the piece bend.
    extra = np.zeros((0, 2))
    if pc.grid:
        g = pc.grid / 1000
        bx0, by0 = poly.min(0)
        bx1, by1 = poly.max(0)
        xs = np.arange(bx0 + g * 0.5, bx1, g)
        ys = np.arange(by0 + g * 0.5, by1, g)
        if crease is not None:
            xs = np.array(sorted(set(xs.tolist() + [crease / 1000])))
        gx, gy = np.meshgrid(xs, ys)
        cand = np.stack([gx.ravel(), gy.ravel()], 1)
        ins = np.zeros(len(cand), bool)
        for k_ in kept:
            ins ^= in_poly(k_, cand)
        cand = cand[ins]
        # Keep clear of the boundary so no sliver triangles form.
        if len(cand):
            A = poly
            B_ = np.roll(poly, -1, axis=0)
            AB = B_ - A
            for k_ in kept[1:]:
                A = np.vstack([A, k_])
                AB = np.vstack([AB, np.roll(k_, -1, axis=0) - k_])
            keep = []
            for q in cand:
                t = np.clip(((q - A) * AB).sum(1) / np.maximum((AB * AB).sum(1), 1e-9), 0, 1)
                dist = np.hypot(*(A + AB * t[:, None] - q).T).min()
                keep.append(dist > g * 0.3)
            cand = cand[np.array(keep)]
        extra = cand
    verts = [Vector((float(x), float(y))) for x, y in allb] + [Vector((float(x), float(y))) for x, y in extra]
    nb_ = len(allb)
    edges = []
    at_ = 0
    for n_ in sizes:
        edges += [(at_ + i, at_ + (i + 1) % n_) for i in range(n_)]
        at_ += n_
    res = geometry.delaunay_2d_cdt(verts, edges, [], 0, 1e-7)
    cdt_v, cdt_f, orig = res[0], res[2], res[3]
    # Map output verts back to ours
    remap = {}
    for new_i, origs in enumerate(orig):
        if origs:
            remap[new_i] = origs[0]
    V = np.array([[v.x, v.y] for v in cdt_v])
    tris = []
    extra_v = []
    for f in cdt_f:
        if len(f) != 3:
            continue
        ctr = V[list(f)].mean(0, keepdims=True)
        ins = False
        for k_ in kept:
            ins ^= bool(in_poly(k_, ctr)[0])
        if not ins:
            continue
        tris.append(f)
    # CDT can add vertices at crossings; keep whatever it returned, boundary first.
    used_new = sorted(set(i for f in tris for i in f))
    order_new = {}
    out_v = [None] * nb_
    for ni in used_new:
        oi = remap.get(ni)
        if oi is not None and oi < nb_:
            order_new[ni] = oi
            out_v[oi] = V[ni]
    missing = [i for i, v in enumerate(out_v) if v is None]
    if missing:
        log(f'!! {pc.name}: {len(missing)} boundary vertices unused')
        for i in missing:
            out_v[i] = allb[i]
    nxt_i = nb_
    for ni in used_new:
        if ni not in order_new:
            order_new[ni] = nxt_i
            out_v.append(V[ni])
            nxt_i += 1
    tri_idx = np.array([[order_new[i] for i in f] for f in tris], np.uint16)
    # Make every triangle counter-clockwise.
    VV = np.array(out_v)
    A, B_, C = VV[tri_idx[:, 0]], VV[tri_idx[:, 1]], VV[tri_idx[:, 2]]
    flip = ((B_[:, 0] - A[:, 0]) * (C[:, 1] - A[:, 1]) - (B_[:, 1] - A[:, 1]) * (C[:, 0] - A[:, 0])) < 0
    tri_idx[flip] = tri_idx[flip][:, ::-1]
    export.append(dict(p=pc, verts=VV, loops=sizes, tris=tri_idx))
    log(f'{pc.name:14s} {nb_:4d} boundary, {len(VV):4d} verts, {len(tri_idx):4d} tris' + (f'  extra loops {stray}' if stray else ''))

# --------------------------------------------------------------------------------------------------------- post: colour
rgb = px[:, :, :3]
known = alpha > 0.5
prev = np.ones((H, W, 4), np.float32)
prev[:, :, :3] = rgb * alpha[:, :, None] + 0.82 * (1 - alpha[:, :, None])
pi_ = bpy.data.images.new('prev', W, H, alpha=False, float_buffer=False)
pi_.colorspace_settings.name = 'Non-Color'
pi_.pixels.foreach_set(prev[::-1].ravel())
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'
pi_.save_render(os.path.join(SCRATCH, 'atlas-preview.png'), scene=scene)
log('dilating')
out_rgb = rgb.copy()
out_rgb[~known] = 0
k = known.astype(np.float32)
c_ = out_rgb * k[:, :, None]
for it in range(int(20 * SS)):
    # One step of nearest-colour growth.
    nk = k.copy()
    acc = c_.copy()
    w_ = k.copy()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        acc += np.roll(np.roll(c_, dy, 0), dx, 1)
        w_ += np.roll(np.roll(k, dy, 0), dx, 1)
    grow = (k == 0) & (w_ > 0)
    if not grow.any():
        break
    c_[grow] = acc[grow] / w_[grow, None]
    k[grow] = 1
filled = c_
filled[k == 0] = 0.75
log('filtering down')
if SS > 1:
    f = filled.reshape(ATLAS, SS, ATLAS, SS, 3).mean(axis=(1, 3))
else:
    f = filled

# Swatches: solid colours for the backs and edges of pieces, and for the wires.
EXTRA = {'wire': '#5e6f70'}
sw = {}
sx = 0
sy = ATLAS - SWATCH_ROW
def swatch(hexcol):
    global sx, sy
    if hexcol in sw:
        return sw[hexcol]
    if sx + 16 > ATLAS:
        raise SystemExit('too many swatches')
    col = np.array(hx8(hexcol), np.float32) / 255
    f[sy:sy + 16, sx:sx + 16] = col
    sw[hexcol] = ((sx + 8) / ATLAS, (sy + 8) / ATLAS)
    sx += 16
    return sw[hexcol]

records = []
for e in export:
    pc = e['p']
    ox, oy, s_ = pc.origin
    back = swatch(pc.back)
    edge = swatch(pc.edge)
    records.append((pc, back, edge))
extra_sw = {k: swatch(v) for k, v in EXTRA.items()}

out_img = bpy.data.images.new('atlas', ATLAS, ATLAS, alpha=False, float_buffer=False)
out_img.colorspace_settings.name = 'Non-Color'
flat = np.ones((ATLAS, ATLAS, 4), np.float32)
flat[:, :, :3] = np.clip(f, 0, 1)
out_img.pixels.foreach_set(flat[::-1].ravel())
scene.render.image_settings.file_format = 'WEBP'
scene.render.image_settings.color_mode = 'RGB'
scene.render.image_settings.quality = QUALITY
atlas_path = os.path.join(PUB, 'atlas.webp')
out_img.save_render(atlas_path, scene=scene)
scene.render.image_settings.file_format = 'PNG'
out_img.save_render(os.path.join(SCRATCH, 'atlas.png'), scene=scene)
log(f'atlas {os.path.getsize(atlas_path) / 1024:.0f} KB')

# ------------------------------------------------------------------------------------------------------------- pieces.bin
b = bytearray()
b += struct.pack('<4sII', b'SBK1', len(export), len(EXTRA))
for k_, (u, v) in extra_sw.items():
    b += struct.pack('<12sff', k_.encode()[:12], u, v)
for e, (pc, back, edge) in zip(export, records):
    ox, oy, s_ = pc.origin
    sc = s_ * 1000  # atlas pixels per page width
    V = e['verts']
    T = e['tris']
    q = np.clip(np.round(V * 8192), -32767, 32767).astype(np.int16)
    crease = getattr(pc, 'crease', None)
    b += struct.pack('<16s', pc.name.encode()[:16])
    # uv = (u0 + x * ku, v0 - y * kv)
    b += struct.pack('<4f', ox / ATLAS, oy / ATLAS, sc / ATLAS, sc / ATLAS)
    b += struct.pack('<4f', back[0], back[1], edge[0], edge[1])
    b += struct.pack('<f', (crease / 1000) if crease is not None else 0.0)
    b += struct.pack('<HHH', len(V), len(e['loops']), len(T))
    b += struct.pack('<H', 0)
    b += struct.pack(f'<{len(e["loops"])}H', *e['loops'])
    if len(b) % 4:
        b += b'\0' * (4 - len(b) % 4)
    b += q.tobytes()
    b += T.astype(np.uint16).tobytes()
    if len(b) % 4:
        b += b'\0' * (4 - len(b) % 4)
bin_path = os.path.join(PUB, 'pieces.bin')
with open(bin_path, 'wb') as fh:
    fh.write(bytes(b))
log(f'pieces.bin {len(b) / 1024:.0f} KB')
log('done')
