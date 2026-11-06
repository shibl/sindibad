# Everything the other landmark fly-ins need, made from the city model:
#  - coast.webp: how near each spot of water is to land, baked from the real coastline, for shallows and surf
#  - extras.dat: the detailed Museum of the Future, plus palms, umbrellas, beach huts and boats placed on the real shore
#   OUT=<dir> DATA=<osm json dir> Blender -b <dir>/city.blend -P extras.py
import bpy, gzip, json, math, os, random, struct
import numpy as np
from mathutils import Matrix

OUT, DATA = os.environ['OUT'], os.environ['DATA']
U = 100.0
random.seed(11)
LL = lambda lat, lon: ((lon - 55.27436) * math.cos(math.radians(25.19716)) * 111320 / U, (lat - 25.19716) * 110574 / U)
BX, BY, BS, N = -40.0, 30.0, 300.0, 4096     # the page's GROUND_FS uses this same square, which takes in all of The World
scene = bpy.context.scene

# ---------------------------------------------------------------- a top-down picture of land and water
def flat(name, col):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    o = nt.nodes.new('ShaderNodeOutputMaterial'); e = nt.nodes.new('ShaderNodeEmission')
    e.inputs['Color'].default_value = (col, col, col, 1); e.inputs['Strength'].default_value = 1
    nt.links.new(e.outputs[0], o.inputs['Surface'])
    return m
white, black = flat('w', 1.0), flat('b', 0.0)
for ob in scene.objects:
    if ob.type != 'MESH': continue
    if ob.name.startswith(('land', 'sand', 'green')): ob.data.materials.clear(); ob.data.materials.append(white)
    elif ob.name.startswith(('water', 'sea')): ob.data.materials.clear(); ob.data.materials.append(black)
    else: ob.hide_render = True
w = bpy.data.worlds.new('w'); scene.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0
c = scene.cycles; scene.render.engine = 'CYCLES'; c.samples = 4; c.use_denoising = False; c.max_bounces = 0
pr = bpy.context.preferences.addons['cycles'].preferences
pr.compute_device_type = 'METAL'; pr.get_devices()
for d in pr.devices: d.use = d.type == 'METAL'
c.device = 'GPU'
cd = bpy.data.cameras.new('c'); cd.type = 'ORTHO'; cd.ortho_scale = BS; cd.clip_start = 1; cd.clip_end = 1000
cam = bpy.data.objects.new('c', cd); scene.collection.objects.link(cam); scene.camera = cam
cam.matrix_world = Matrix(((1, 0, 0, BX), (0, 1, 0, BY), (0, 0, 1, 400), (0, 0, 0, 1)))
scene.render.resolution_x = scene.render.resolution_y = N
scene.render.resolution_percentage = 100
scene.view_settings.view_transform = 'Raw'
scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'BW'
mask_path = os.path.join(OUT, 'landmask.png')
scene.render.filepath = mask_path
bpy.ops.render.render(write_still=True)
im = bpy.data.images.load(mask_path); im.colorspace_settings.name = 'Non-Color'
px = np.empty(N * N * 4, np.float32); im.pixels.foreach_get(px)
land = px.reshape(N, N, 4)[::-1, :, 0].astype(np.float32)     # row 0 at the top, which is +y
print('EXTRAS land fraction', float(land.mean()), flush=True)

# Soft versions of the mask say how near land is, at two distances.
f = np.fft.rfft2(land)
fy = np.fft.fftfreq(N)[:, None]; fx = np.fft.rfftfreq(N)[None, :]
def blur(sigma):
    return np.clip(np.fft.irfft2(f * np.exp(-2 * (np.pi ** 2) * (fx ** 2 + fy ** 2) * sigma ** 2), s=(N, N)), 0, 1)
near, wide = blur(4.1), blur(19)     # about 30 m and 140 m
coast = np.clip(near * 1.25, 0, 1) * 0.55 + np.clip(wide * 1.7, 0, 1) * 0.45
out = bpy.data.images.new('coast', N, N, alpha=False); out.colorspace_settings.name = 'Non-Color'
pix = np.ones((N, N, 4), np.float32); pix[..., 0] = pix[..., 1] = pix[..., 2] = coast
out.pixels.foreach_set(pix[::-1].ravel())
scene.render.image_settings.file_format = 'WEBP'; scene.render.image_settings.quality = 80; scene.render.image_settings.color_mode = 'RGB'
out.save_render(os.path.join(OUT, 'coast.webp'), scene=scene)
print('EXTRAS coast.webp', os.path.getsize(os.path.join(OUT, 'coast.webp')) / 1000, 'KB', flush=True)

def at(arr, x, y):
    i = int((x - (BX - BS / 2)) / BS * N); j = int((1 - (y - (BY - BS / 2)) / BS) * N)
    return float(arr[j, i]) if 0 <= i < N and 0 <= j < N else 0.0

# ---------------------------------------------------------------- the Museum of the Future
FUT = LL(25.21925, 55.28173)
TURN = math.radians(35)        # the ring's long axis, from east
ex, ey = math.cos(TURN), math.sin(TURN)      # along the ring
nx, ny = -ey, ex                             # through the hole
vs, fs, ss_, tt_, kk = [], [], [], [], []
def grid(rows, kind, s=None, t=None, wrapU=True, wrapV=True):
    """Stitches a rows x cols block of points (in metres) into quads."""
    o = len(vs); nu, nv = len(rows), len(rows[0])
    for i, row in enumerate(rows):
        for j, p in enumerate(row):
            vs.append((p[0] / U, p[1] / U, p[2] / U)); ss_.append(s[i] if s is not None else 0.0)
            tt_.append(t[j] if t is not None else 0.0); kk.append(kind)
    for i in range(nu if wrapU else nu - 1):
        for j in range(nv if wrapV else nv - 1):
            a, b = o + i * nv + j, o + i * nv + (j + 1) % nv
            c_, d = o + ((i + 1) % nu) * nv + (j + 1) % nv, o + ((i + 1) % nu) * nv + j
            fs.append([a, d, c_, b])

# The ring: an elongated loop, fat and rounded, 77 m at the crown, its foot sunk in the hill. Proportions read off photographs.
NU, NV = 200, 56
A, Bz, Z0 = 53.0, 24.0, 45.0
def ring_at(u, v):
    cu, su = math.cos(u), math.sin(u)
    px_, pz = A * cu, Z0 + Bz * su
    tx, tz = -A * su, Bz * cu
    l = math.hypot(tx, tz) or 1
    rx, rz = tz / l, -tx / l        # outward from the loop's centre, in its plane
    thick = 8.0 + 3.0 * (1 - su) / 2 + 3.5 * cu * cu
    wide_ = 21.0 + 2.5 * (1 - su) / 2
    cv, sv = math.cos(v), math.sin(v)
    ec = math.copysign(abs(cv) ** 0.8, cv); es = math.copysign(abs(sv) ** 0.8, sv)
    lx = px_ + rx * ec * thick; lz = pz + rz * ec * thick; ly = es * wide_
    return (ex * lx + nx * ly, ey * lx + ny * ly, lz)
# Texture coordinates run by true length round the loop and round the section, so the script doesn't stretch.
def even(fn, n):
    """n + 1 parameter values round a closed curve, evenly spaced by arc length, and their fractions."""
    M = 2000
    pts = [fn(2 * math.pi * i / M) for i in range(M + 1)]
    cum = [0.0]
    for a_, b_ in zip(pts, pts[1:]): cum.append(cum[-1] + math.dist(a_, b_))
    out, k = [], 0
    for i in range(n + 1):
        want = cum[-1] * i / n
        while k < M and cum[k + 1] < want: k += 1
        f_ = (want - cum[k]) / max(cum[k + 1] - cum[k], 1e-9)
        out.append(2 * math.pi * (k + f_) / M)
    return out, cum[-1]
us, loop_len = even(lambda u: (A * math.cos(u), Z0 + Bz * math.sin(u)), NU)
vs_, sec_len = even(lambda v: (math.copysign(abs(math.cos(v)) ** 0.8, math.cos(v)) * 10, math.copysign(abs(math.sin(v)) ** 0.8, math.sin(v)) * 22), NV)
print(f'EXTRAS museum loop {loop_len:.0f} m, section {sec_len:.0f} m', flush=True)
rows = [[ring_at(u, v) for v in vs_] for u in us]
ring_start = len(vs)
grid(rows, 7, [i / NU * 2000 for i in range(NU + 1)], [j / NV for j in range(NV + 1)], False, False)
ring_rows = (NU + 1, NV + 1)

# The green hill it stands on, and a stone plinth at the ring's foot.
hill = []
for i in range(64):
    th = 2 * math.pi * i / 64
    row = []
    for j in range(13):
        r = j / 12
        h = 21.0 * (1 - r * r) ** 1.4
        lx, ly = math.cos(th) * 118 * r, math.sin(th) * 82 * r
        row.append((ex * lx + nx * ly, ey * lx + ny * ly, h + 0.4))
    hill.append(row)
grid(hill, 4, None, None, True, False)
pl = []
for i in range(48):
    th = 2 * math.pi * i / 48
    lx, ly = math.cos(th) * 62, math.sin(th) * 30
    pl.append([(ex * lx * k + nx * ly * k, ey * lx * k + ny * ly * k, z) for k, z in ((1.03, 13.0), (1.0, 19.0), (0.97, 23.0))])
grid(pl, 3, None, None, True, False)

co = np.array(vs, np.float32)
tri = np.array([[f_[0], f_[k], f_[k + 1]] for f_ in fs for k in range(1, 3)], np.int64).ravel()
# Smooth normals, so the ring reads as one flowing skin of steel.
nrm = np.zeros_like(co)
t = tri.reshape(-1, 3)
fn = np.cross(co[t[:, 1]] - co[t[:, 0]], co[t[:, 2]] - co[t[:, 0]])
for k in range(3): np.add.at(nrm, t[:, k], fn)
nrm /= np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-6)
# The ring's normals come straight from its surface, so the seams of the texture coordinates leave no mark on its shading.
def ring_normal(u, v):
    e_ = 1e-3
    a_, b_ = ring_at(u + e_, v), ring_at(u - e_, v)
    c_, d_ = ring_at(u, v + e_), ring_at(u, v - e_)
    du = [a_[k] - b_[k] for k in range(3)]; dv = [c_[k] - d_[k] for k in range(3)]
    n_ = [du[1] * dv[2] - du[2] * dv[1], du[2] * dv[0] - du[0] * dv[2], du[0] * dv[1] - du[1] * dv[0]]
    l_ = math.sqrt(sum(q_ * q_ for q_ in n_)) or 1
    return [q_ / l_ for q_ in n_]
for i, u in enumerate(us):
    for j, v in enumerate(vs_):
        nrm[ring_start + i * ring_rows[1] + j] = ring_normal(u, v)
kinds = np.array(kk, np.uint8)
print(f'EXTRAS museum {len(co):,} verts, {len(t):,} triangles, top {co[:, 2].max() * U:.1f} m', flush=True)

# ---------------------------------------------------------------- small things on the shore
def box(x0, x1, y0, y1, z0, z1, col):
    v = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
    return v, [[0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7], [4, 5, 6, 7]], col
def cone(r0, r1, z0, z1, col, n=8, cx=0, cy=0):
    v = [(cx + r0 * math.cos(2 * math.pi * i / n), cy + r0 * math.sin(2 * math.pi * i / n), z0) for i in range(n)]
    v += [(cx + r1 * math.cos(2 * math.pi * i / n), cy + r1 * math.sin(2 * math.pi * i / n), z1) for i in range(n)]
    return v, [[i, (i + 1) % n, (i + 1) % n + n, i + n] for i in range(n)] + ([list(range(n, 2 * n))] if r1 > 0 else []), col
TINT = 0  # takes the instance colour
def build(parts):
    V, I, C = [], [], []
    for v, f_, col in parts:
        o = len(V)
        V += v
        C += [col] * len(v)
        for q in f_:
            for k in range(1, len(q) - 1): I += [q[0] + o, q[k] + o, q[k + 1] + o]
    return np.array(V, np.float32), np.array(I, np.uint16), np.array(C, np.uint8)
TRUNK, FROND, FROND2, WHITE, WOOD, ROCK, DARK = 1, 2, 3, 4, 5, 6, 7
def frond(ang, col):
    ca, sa = math.cos(ang), math.sin(ang)
    prof = [(0.0, 12.0, 0.5), (2.6, 12.9, 1.0), (5.2, 12.2, 0.8), (7.2, 10.2, 0.05)]
    v = []
    for d, z, w in prof:
        v += [(ca * d - sa * w, sa * d + ca * w, z), (ca * d + sa * w, sa * d - ca * w, z), (ca * d, sa * d, z + w * 0.4)]
    f_ = []
    for k in range(len(prof) - 1):
        o = k * 3
        f_ += [[o, o + 2, o + 5, o + 3], [o + 2, o + 1, o + 4, o + 5]]
    return v, f_, col
palm = build([cone(0.5, 0.26, 0, 12.2, TRUNK, 6)] + [frond(2 * math.pi * i / 8, FROND if i % 2 else FROND2) for i in range(8)])
umbrella = build([cone(0.08, 0.08, 0, 2.8, WHITE, 4), cone(2.5, 0.0, 2.2, 3.3, TINT, 10)])
# La Mer's low timber buildings: a slatted brown box, a pale deck above it and a bright awning on the sea side.
hut = build([
    box(-6, 6, -3.6, 3.6, 0, 3.8, WOOD),
    box(-6.8, 6.8, -4.4, 4.4, 3.8, 4.2, WHITE),
    box(-4.5, 2, -2.5, 2.5, 4.2, 6.6, WOOD),
    box(-5, 2.5, -3, 3, 6.6, 6.9, WHITE),
    ([(-6, 3.6, 3.1), (6, 3.6, 3.1), (6, 6.6, 2.1), (-6, 6.6, 2.1)], [[0, 1, 2, 3]], TINT),
])
# A white motor yacht: a raked hull, a cabin and a dark stripe of windows. They read as boats from every side.
boat = build([
    ([(-6, -1.5, 0), (3, -1.9, 0), (8, 0, 0), (3, 1.9, 0), (-6, 1.5, 0), (-6.3, -2, 1.3), (3.4, -2.3, 1.5), (9.6, 0, 1.9), (3.4, 2.3, 1.5), (-6.3, 2, 1.3)],
     [[0, 1, 6, 5], [1, 2, 7, 6], [2, 3, 8, 7], [3, 4, 9, 8], [4, 0, 5, 9], [5, 6, 7, 8, 9]], WHITE),
    box(-3.8, 2.6, -1.45, 1.45, 1.4, 2.0, WHITE),
    box(-3.4, 1.8, -1.3, 1.3, 2.0, 2.7, DARK),
    box(-3.8, 1.2, -1.45, 1.45, 2.7, 2.95, WHITE),
    box(-6.3, -4.7, -2.02, 2.02, 1.3, 1.42, TINT),
])
# Rough boulders for the breakwaters: three squashed, knocked-about gems huddled together.
def boulder(cx, cy, r, seed):
    rr = random.Random(seed)
    t_ = 1.618
    base = [(-1, t_, 0), (1, t_, 0), (-1, -t_, 0), (1, -t_, 0), (0, -1, t_), (0, 1, t_), (0, -1, -t_), (0, 1, -t_), (t_, 0, -1), (t_, 0, 1), (-t_, 0, -1), (-t_, 0, 1)]
    v = []
    for x, y, z in base:
        k = r / 1.9 * rr.uniform(0.74, 1.2)
        v.append((cx + x * k, cy + y * k * rr.uniform(.8, 1.1), max(z * k * 0.7 + r * .32, 0)))
    f_ = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]]
    return v, f_, ROCK
rock = build([boulder(0, 0, 3.4, 1), boulder(3.4, 1.2, 2.5, 2), boulder(-2.8, 1.9, 2.1, 3), boulder(.6, -3, 2.4, 4)])

# Real beaches near La Mer, from the map.
MER = LL(25.2318, 55.2508)
def rings():
    for e in json.load(open(os.path.join(DATA, 'sand.json')))['elements']:
        if e.get('tags', {}).get('natural') != 'beach': continue
        geos = [e['geometry']] if e['type'] == 'way' else [m['geometry'] for m in e.get('members', []) if m.get('role') == 'outer']
        for g in geos:
            pts = [LL(p['lat'], p['lon']) for p in g]
            if min(math.hypot(x - MER[0], y - MER[1]) for x, y in pts) < 18: yield pts
beach = list(rings())
print('EXTRAS beaches near La Mer', len(beach), flush=True)
def inside(poly, x, y):
    c_ = False
    for (ax, ay), (bx, by) in zip(poly, poly[1:] + poly[:1]):
        if (ay > y) != (by > y) and x < (bx - ax) * (y - ay) / (by - ay) + ax: c_ = not c_
    return c_
PALETTE = 7
inst = {k: [] for k in ('palm', 'umbrella', 'hut', 'boat', 'rock')}
def put(kind, x, y, scale=1.0, tint=None):
    inst[kind].append((x, y, random.random(), scale, random.randrange(PALETTE) if tint is None else tint))
for poly in beach:
    xs, ys = [p[0] for p in poly], [p[1] for p in poly]
    area = abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(poly, poly[1:] + poly[:1]))) / 2
    tries = int(min(area * 700, 2500))
    for _ in range(tries):
        x, y = random.uniform(min(xs), max(xs)), random.uniform(min(ys), max(ys))
        if not inside(poly, x, y): continue
        n_ = at(near, x, y)
        if 0.62 < n_ < 0.93 and random.random() < 0.55: put('umbrella', x, y, 1.0 + random.random() * 0.3)
        elif n_ > 0.97 and random.random() < 0.3: put('palm', x, y, 1.1 + random.random() * 0.6)
# Palms and La Mer's low buildings on the land just behind the sand, boats lying offshore.
for _ in range(16000):
    a, r = random.uniform(0, 2 * math.pi), random.uniform(0, 12)
    x, y = MER[0] + math.cos(a) * r, MER[1] + math.sin(a) * r
    n_ = at(near, x, y)
    if at(land, x, y) > 0.5 and 0.9 < n_ < 0.995:
        p = random.random()
        if p < 0.1: put('palm', x, y, 1.1 + random.random() * 0.6)
        elif p < 0.13 and r < 8: put('hut', x, y, 0.8 + random.random() * 0.5)
# Boulders along the thin breakwaters and any shore that has no sand.
on_sand = lambda x, y: any(inside(poly, x, y) for poly in beach)
for _ in range(60000):
    a, r = random.uniform(0, 2 * math.pi), random.uniform(0, 11)
    x, y = MER[0] + math.cos(a) * r, MER[1] + math.sin(a) * r
    if at(land, x, y) > 0.5 and at(near, x, y) < 0.72 and len(inst['rock']) < 900 and not on_sand(x, y): put('rock', x, y, 0.5 + random.random() * 0.4)
for _ in range(4000):
    a, r = random.uniform(0, 2 * math.pi), random.uniform(0, 20)
    x, y = MER[0] + math.cos(a) * r, MER[1] + math.sin(a) * r
    if at(land, x, y) < 0.5 and 0.04 < at(wide, x, y) < 0.42 and random.random() < 0.016: put('boat', x, y, 0.42 + random.random() * 0.5)
# A few palms on the museum's hill, and boats among The World's islands.
for _ in range(46):
    a, r = random.uniform(0, 2 * math.pi), random.uniform(0.55, 0.95)
    lx, ly = math.cos(a) * 118 * r, math.sin(a) * 82 * r
    put('palm', FUT[0] + (ex * lx + nx * ly) / U, FUT[1] + (ey * lx + ny * ly) / U, 1.0 + random.random() * 0.5)
WORLD = LL(25.2245, 55.174)
for _ in range(9000):
    a, r = random.uniform(0, 2 * math.pi), random.uniform(0, 55)
    x, y = WORLD[0] + math.cos(a) * r, WORLD[1] + math.sin(a) * r
    if at(land, x, y) < 0.5 and 0.1 < at(wide, x, y) < 0.5 and random.random() < 0.01: put('boat', x, y, 0.8 + random.random() * 0.9)
print('EXTRAS props', {k: len(v) for k, v in inst.items()}, flush=True)

# ---------------------------------------------------------------- write it out
sections, blobs, off = {}, [], 0
def add(name, arr):
    global off
    arr = np.asarray(arr); b = arr.tobytes(); pad = (-len(b)) % 8
    sections[name] = dict(type=arr.dtype.name, count=int(arr.size), offset=off)
    blobs.append(b + b'\0' * pad); off += len(b) + pad
B, ZMAX = 2.2, 8.6
q = np.empty((len(co), 2), np.uint16)
q[:, 0] = np.clip((co[:, 0] + B) / (2 * B), 0, 1) * 65535; q[:, 1] = np.clip((co[:, 1] + B) / (2 * B), 0, 1) * 65535
add('mus_xy', q)
add('mus_z', (np.clip(co[:, 2] / ZMAX, 0, 1) * 65535).astype(np.uint16))
add('mus_s', (np.clip(np.array(ss_, np.float32) / 2000, 0, 1) * 65535).astype(np.uint16))
add('mus_t', (np.clip(np.array(tt_, np.float32), 0, 1) * 65535).astype(np.uint16))
add('mus_k', kinds)
add('mus_n', np.clip(np.round(nrm * 127), -127, 127).astype(np.int8))
d = np.diff(tri, prepend=0)
add('mus_i', ((d << 1) ^ (d >> 63)).astype(np.uint32))
for name, (v, i, c_) in (('palm', palm), ('umbrella', umbrella), ('hut', hut), ('boat', boat), ('rock', rock)):
    add(name + '_v', v); add(name + '_i', i); add(name + '_c', c_)
    rows_ = inst[name]
    a = np.array([[(x + 200) / 400 * 65535, (y + 200) / 400 * 65535] for x, y, *_ in rows_], np.uint16)
    b = np.array([[r * 255, min(s_ / 3, 1) * 255, t_, 0] for _, _, r, s_, t_ in rows_], np.uint8)
    add(name + '_xy', a); add(name + '_a', b)
head = json.dumps(dict(bounds=[-B, -B, B, B], zmax=ZMAX, sections=sections), separators=(',', ':')).encode()
pad = (-(4 + len(head))) % 8
raw = struct.pack('<I', len(head)) + head + b' ' * pad + b''.join(blobs)
path = os.path.join(OUT, 'extras.dat')
with open(path, 'wb') as fh: fh.write(gzip.compress(raw, 9))
print(f'EXTRAS wrote extras.dat: {os.path.getsize(path) / 1000:.0f} KB', flush=True)
