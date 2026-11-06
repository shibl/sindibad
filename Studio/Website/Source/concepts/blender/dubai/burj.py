# The detailed Burj Khalifa: a stylised model at true height (828 m) with the tower's three-winged plan, rounded lobes that
# each end at their own height, mechanical bands, bright fins in the valleys, a stepped spire, and a terraced podium.
#   OUT=<dir> Blender -b --factory-startup -P burj.py
# Writes OUT/burj.dat for the page (kinds: 0 glass, 1 mechanical band, 2 spire steel, 3 podium stone, 4 garden, 5 pool, 6 ledge)
# and OUT/burj.blend for looking at it in Blender.
#
# Widths and step heights above about 250 m were measured off a photograph (Wikimedia Commons, Burj_Khalifa_(16260269606).jpg),
# scaled so the tip is 828 m. Below that the photo is hidden by other buildings, so the lower steps are an estimate.
import bpy, gzip, json, math, os, struct
import numpy as np

OUT = os.environ['OUT']
U = 100.0              # 1 Blender unit = 100 m, as in the city
TOP_BODY = 600.0       # where the wings end and the spire takes over
HEIGHT = 828.0
AXES = [90 + 120 * w + 25 for w in range(3)]
PER = 26               # outline points per wing

verts, faces, S, K, NN = [], [], [], [], []
def add(vs, fs, s=None, kind=0, normals=None):
    o = len(verts)
    verts.extend(vs)
    faces.extend([[i + o for i in f] for f in fs])
    S.extend(s if s is not None else [0.0] * len(vs))
    K.extend([kind] * len(vs))
    NN.extend(normals if normals is not None else [(0.0, 0.0, 0.0)] * len(vs))

def y_plan(lengths, a, n=PER):
    """Three stadium-ended wings, 120 degrees apart around a central core. Points run counter-clockwise, n to a wing,
    and each wing starts at the valley it shares with the wing before it."""
    pts = []
    widths = a if isinstance(a, (list, tuple)) else [a, a, a]
    for w in range(3):
        L, axis, aw = lengths[w], math.radians(AXES[w]), widths[w]
        c = max(L - aw, 0.001)
        for i in range(n):
            phi = math.radians(-60 + 120 * i / n)
            sp, cp = abs(math.sin(phi)), math.cos(phi)
            side = aw / sp if sp > 1e-4 else 1e9
            r = side if side * cp <= c else c * cp + math.sqrt(max(aw * aw - (c * sp) ** 2, 0))
            th = axis + phi
            pts.append((r * math.cos(th), r * math.sin(th)))
    return pts

def offset(pts, d):
    """Pushes a closed outline outward by d metres along its normals."""
    n, out = len(pts), []
    for i, p in enumerate(pts):
        a, b = pts[i - 1], pts[(i + 1) % n]
        tx, ty = b[0] - a[0], b[1] - a[1]
        l = math.hypot(tx, ty) or 1
        out.append((p[0] + ty / l * d, p[1] - tx / l * d))
    return out

def arc(pts, s0=0.0):
    s, out = s0, [s0]
    for a, b in zip(pts, pts[1:]):
        s += math.hypot(b[0] - a[0], b[1] - a[1])
        out.append(s)
    return out

def strip_normals(pts):
    """Outward normals along an open run of a counter-clockwise outline, so a lobe shades as one smooth curve."""
    out = []
    for i in range(len(pts)):
        a, b = pts[max(i - 1, 0)], pts[min(i + 1, len(pts) - 1)]
        tx, ty = b[0] - a[0], b[1] - a[1]
        l = math.hypot(tx, ty) or 1
        out.append((ty / l, -tx / l, 0.0))
    return out

def loft(p0, p1, z0, z1, kind=0, s0=0.0):
    """A band of wall between two runs of points, with its own arc-length coordinate for the facade's bays."""
    s = arc(p0, s0)
    n0 = strip_normals(p0)
    vs = [(x / U, y / U, z0 / U) for x, y in p0] + [(x / U, y / U, z1 / U) for x, y in p1]
    m = len(p0)
    fs = [[i, i + 1, i + 1 + m, i + m] for i in range(m - 1)]
    add(vs, fs, s + s, kind, n0 + n0)
    return s[-1]

def lobes(plan, z0, z1, kind=0, top=None, per=PER):
    """A whole outline as three smooth lobes with a crease in each valley."""
    top = top or plan
    n, s = len(plan), 0.0
    for w in range(n // per):
        idx = [(w * per + i) % n for i in range(per + 1)]
        s = loft([plan[i] for i in idx], [top[i] for i in idx], z0, z1, kind, s)

def ring_wall(pts, z0, z1, kind=0, top=None):
    n = len(pts)
    s = arc(pts + [pts[0]])
    p0 = pts + [pts[0]]
    p1 = (top or pts) + [(top or pts)[0]]
    # Round things have no creases: the seam's normals are averaged so no line shows.
    nn = strip_normals([pts[-1]] + p0 + [pts[0]])[1:-1]
    vs = [(x / U, y / U, z0 / U) for x, y in p0] + [(x / U, y / U, z1 / U) for x, y in p1]
    add(vs, [[i, i + 1, i + 1 + n + 1, i + n + 1] for i in range(n)], s + s, kind, nn + nn)

def cap(pts, z, kind=1):
    """A flat top over an outline: fanned from the centre, which works because the plan is star-shaped about the core."""
    n = len(pts)
    vs = [(0.0, 0.0, z / U)] + [(x / U, y / U, z / U) for x, y in pts]
    fs = [[0, 1 + i, 1 + (i + 1) % n] for i in range(n)]
    add(vs, fs, None, kind)

def rib(p, nx, ny, z0, z1, width=1.3, depth=1.8, kind=6):
    """A slim fin standing proud of the wall."""
    tx, ty = -ny, nx
    w, d = width / 2, depth
    q = [(p[0] + tx * w, p[1] + ty * w), (p[0] + tx * w + nx * d, p[1] + ty * w + ny * d),
         (p[0] - tx * w + nx * d, p[1] - ty * w + ny * d), (p[0] - tx * w, p[1] - ty * w)]
    vs = [(x / U, y / U, z0 / U) for x, y in q] + [(x / U, y / U, z1 / U) for x, y in q]
    add(vs, [[0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [0, 4, 7, 3][::-1], [4, 5, 6, 7]], None, kind)

# ---------------------------------------------------------------- the shaft
# Each lobe runs straight up and ends with a flat top, one wing at a time, turning round the tower as it climbs. The three
# wings' reach after each step comes from the width of the tower in the photograph.
STEPS = [           # height of the step, which wing steps back, how far that wing reaches above it
    (50, 2, 52), (85, 0, 49), (120, 1, 46), (155, 2, 43), (190, 0, 42), (225, 1, 37.3), (262, 2, 34),
    (301, 0, 31.7), (347, 1, 27.3), (395, 2, 24), (440, 0, 18.4), (510, 1, 18.4), (545, 2, 14),
    (579, 0, 11), (590, 1, 11), (TOP_BODY, 2, 0),
]
MECH = [(146, 153), (267, 274), (399, 406), (500, 507)]   # the mechanical floors, a plain band around the whole tower

def half_width(z):
    return 15.5 - 8.5 * (z / TOP_BODY) ** 1.2

L = [58.0, 56.0, 62.0]
A = [half_width(0)] * 3
z = 0.0
for (z1, wing, reach) in STEPS:
    plan = y_plan(L, A)
    # The wall, broken wherever a mechanical band crosses this tier.
    cuts = [z]
    for (m0, m1) in MECH:
        for m in (m0, m1):
            if z < m < z1: cuts.append(m)
    cuts = sorted(set(cuts + [z1]))
    for a, b in zip(cuts, cuts[1:]):
        band = any(m0 <= a and b <= m1 for (m0, m1) in MECH)
        lobes(plan, a, b, 1 if band else 0)
    cap(plan, z1, 6)
    # A plain crown around the top of the lobe that ends here.
    if z1 < TOP_BODY:
        run = [plan[(wing * PER + i) % len(plan)] for i in range(PER + 1)]
        out = offset(plan, 0.25)
        run2 = [out[(wing * PER + i) % len(plan)] for i in range(PER + 1)]
        depth = 1.2 + 1.0 * (1 - z1 / TOP_BODY)
        loft(run2, run2, z1 - depth, z1 + 0.5, 6)
        m = len(run)
        vs = [(x / U, y / U, (z1 + 0.5) / U) for x, y in run] + [(x / U, y / U, (z1 + 0.5) / U) for x, y in run2]
        add(vs, [[i, i + m, i + 1 + m, i + 1] for i in range(m - 1)], None, 6)
    # A bright fin in each valley between the wings, which is what draws the white lines up the tower.
    for w in range(3):
        p = plan[w * PER]
        r = math.hypot(*p) or 1
        rib(p, p[0] / r, p[1] / r, z, z1, width=0.8, depth=0.8)
    L[wing] = reach
    A[wing] = half_width(z1)
    z = z1

# ---------------------------------------------------------------- the spire: three-lobed at first, then a telescope, then the needle
def ring(r, n=20):
    return [(r * math.cos(2 * math.pi * i / n), r * math.sin(2 * math.pi * i / n)) for i in range(n)]
for (z0, z1, l0, a0, l1, a1, kind) in [
    (TOP_BODY, 617, 10.0, 6.0, 9.6, 5.8, 0),
    (617, 660, 8.8, 5.3, 8.3, 5.0, 0),
    (660, 715, 7.2, 4.4, 6.5, 4.0, 0),
]:
    p0, p1 = y_plan([l0] * 3, a0, 12), y_plan([l1] * 3, a1, 12)
    lobes(p0, z0, z1, kind, p1, per=12)
    cap(p1, z1, 6)
for (z0, z1, r0, r1) in [(715, 752, 5.0, 4.5), (752, 781, 2.45, 2.1), (781, 828, 0.95, 0.3)]:
    p0, p1 = ring(r0), ring(r1)
    ring_wall(p0, z0, z1, 2, p1)
    cap(p1, z1, 2)

# ---------------------------------------------------------------- the podium: stepped terraces, gardens and pools at the foot
for (LL, a, z0, z1, kind, top) in [
    (108, 44, 0, 6, 3, 4),
    (97, 37, 6, 12, 3, 3),
    (84, 29, 12, 20, 3, 4),
]:
    plan = y_plan([LL, LL, LL], a, 22)
    lobes(plan, z0, z1, kind, per=22)
    cap(plan, z1, top)
# Round pavilions and pools between and beyond the wings.
def disc(cx, cy, r, z0, z1, kind, top=None, n=28):
    pts = [(cx + r * math.cos(2 * math.pi * i / n), cy + r * math.sin(2 * math.pi * i / n)) for i in range(n)]
    if z1 > z0: ring_wall(pts, z0, z1, kind)
    vs = [(cx / U, cy / U, z1 / U)] + [(x / U, y / U, z1 / U) for x, y in pts]
    add(vs, [[0, 1 + i, 1 + (i + 1) % n] for i in range(n)], None, top if top is not None else kind)
for w in range(3):
    ax = math.radians(AXES[w])
    disc(math.cos(ax) * 116, math.sin(ax) * 116, 17, 0, 11, 3, 6)            # entrance pavilion at each wing's tip
    disc(math.cos(ax) * 116, math.sin(ax) * 116, 10, 11, 14, 1, 6)
    between = ax + math.radians(60)
    disc(math.cos(between) * 72, math.sin(between) * 72, 23, 0, 2.5, 3, 5)   # a pool in each of the bays between wings
    for side in (-1, 1):
        off = ax + math.radians(side * 21)
        disc(math.cos(off) * 93, math.sin(off) * 93, 11, 6, 7.5, 3, 5)

# ---------------------------------------------------------------- write it all out
co = np.array(verts, np.float32)
tri = []
for f in faces:
    for i in range(1, len(f) - 1): tri += [f[0], f[i], f[i + 1]]
tri = np.array(tri, np.uint32)
s = np.array(S, np.float32); kinds = np.array(K, np.uint8)
print(f'BURJ {len(co):,} verts, {len(tri) // 3:,} triangles, top {co[:, 2].max() * U:.1f} m, widest {np.abs(co[:, :2]).max() * U:.0f} m', flush=True)

me = bpy.data.meshes.new('burj_detail'); me.from_pydata(verts, [], faces); me.update()
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
ob = bpy.data.objects.new('burj_detail', me)
bpy.context.collection.objects.link(ob)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'burj.blend'), compress=True)

B = 2.2; ZMAX = 8.6
q = np.empty((len(co), 2), np.uint16)
q[:, 0] = np.clip((co[:, 0] + B) / (2 * B), 0, 1) * 65535
q[:, 1] = np.clip((co[:, 1] + B) / (2 * B), 0, 1) * 65535
qz = (np.clip(co[:, 2] / ZMAX, 0, 1) * 65535).astype(np.uint16)
qs = (np.clip(s / 2000, 0, 1) * 65535).astype(np.uint16)
qn = np.round(np.array(NN, np.float32) * 127).astype(np.int8).reshape(-1)
d = np.diff(tri.astype(np.int64), prepend=0)
zig = ((d << 1) ^ (d >> 63)).astype(np.uint32)
sections, blobs, offset_ = {}, [], 0
for name, arr in (('xy', q), ('z', qz), ('s', qs), ('k', kinds), ('n', qn), ('i', zig)):
    b = arr.tobytes(); pad = (-len(b)) % 8
    sections[name] = dict(type=arr.dtype.name, count=int(arr.size), offset=offset_)
    blobs.append(b + b'\0' * pad); offset_ += len(b) + pad
head = json.dumps(dict(bounds=[-B, -B, B, B], zmax=ZMAX, sections=sections), separators=(',', ':')).encode()
pad = (-(4 + len(head))) % 8
raw = struct.pack('<I', len(head)) + head + b' ' * pad + b''.join(blobs)
path = os.path.join(OUT, 'burj.dat')
with open(path, 'wb') as f: f.write(gzip.compress(raw, 9))
print(f'BURJ wrote {path}: {os.path.getsize(path) / 1000:.0f} KB', flush=True)
