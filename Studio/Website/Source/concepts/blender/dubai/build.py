# Builds real Dubai from OpenStreetMap data (c) OpenStreetMap contributors, ODbL.
#   DATA=<dir of osm json> OUT=<dir> Blender -b --factory-startup -P build.py
# Writes OUT/city.blend and OUT/rise.npz (what render.py needs to raise the towers), OUT/routes.json (roads for traffic).
# Materials here are empty placeholders: render.py owns the look, so it can change without rebuilding.
import bpy, json, math, os, glob, random, time
import numpy as np
from mathutils import Vector, geometry

DATA, OUT = os.environ['DATA'], os.environ['OUT']
for ob in list(bpy.data.objects): bpy.data.objects.remove(ob, do_unlink=True)   # Blender's default cube, lamp and camera
os.makedirs(OUT, exist_ok=True)
random.seed(7)
T0 = time.time()
def log(*a): print(f'[{time.time() - T0:6.1f}s]', *a, flush=True)

# Local map: origin at Burj Khalifa, x east, y north, 1 Blender unit = 100 m.
LAT0, LON0, U = 25.19716, 55.27436, 100.0
KX, KY = math.cos(math.radians(LAT0)) * 111320, 110574
S, W, N, E = 25.06, 55.10, 25.30, 55.36
def xy(p): return ((p['lon'] - LON0) * KX / U, (p['lat'] - LAT0) * KY / U)
def load(name):
    path = os.path.join(DATA, name + '.json')
    return json.load(open(path))['elements'] if os.path.exists(path) else []

# ---------------------------------------------------------------- geometry helpers
def area(pts):
    return 0.5 * sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(pts, pts[1:] + pts[:1]))
def centroid(pts):
    return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))
def clean(pts):
    out = []
    for p in pts:
        if not out or abs(p[0] - out[-1][0]) + abs(p[1] - out[-1][1]) > 1e-5: out.append(p)
    if len(out) > 1 and abs(out[0][0] - out[-1][0]) + abs(out[0][1] - out[-1][1]) < 1e-5: out.pop()
    return out
def stitch(ways):
    """Joins way pieces that share end points into rings or open chains."""
    ways = [list(w) for w in ways if len(w) > 1]
    out = []
    while ways:
        cur = ways.pop()
        grew = True
        while grew and cur[0] != cur[-1]:
            grew = False
            for i, w in enumerate(ways):
                if w[0] == cur[-1]: cur += w[1:]
                elif w[-1] == cur[-1]: cur += w[::-1][1:]
                elif w[-1] == cur[0]: cur = w[:-1] + cur
                elif w[0] == cur[0]: cur = w[::-1][:-1] + cur
                else: continue
                ways.pop(i); grew = True
                break
        out.append(cur)
    return out
def outers(el):
    """The outer rings of a way or multipolygon, as lists of (x, y)."""
    if el['type'] == 'way':
        return [clean([xy(p) for p in el.get('geometry', [])])]
    if el['type'] != 'relation': return []
    parts = [[(p['lon'], p['lat']) for p in m.get('geometry', [])] for m in el.get('members', [])
             if m.get('type') == 'way' and m.get('role') in ('outer', '') and m.get('geometry')]
    rings = []
    for r in stitch(parts):
        if r[0] == r[-1]: rings.append(clean([xy({'lon': a, 'lat': b}) for a, b in r]))
    return rings

class Bag:
    """Collects vertices and faces, then makes one mesh object."""
    def __init__(self): self.v, self.f, self.attr = [], [], {}
    def add(self, verts, faces, **attrs):
        o = len(self.v)
        self.v += verts
        self.f += [[i + o for i in fc] for fc in faces]
        for k, val in attrs.items(): self.attr.setdefault(k, []).extend([val] * len(verts))
    def obj(self, name, smooth=False):
        me = bpy.data.meshes.new(name)
        me.from_pydata(self.v, [], self.f)
        me.update()
        for k, vals in self.attr.items():
            a = me.attributes.new(k, 'FLOAT', 'POINT')
            a.data.foreach_set('value', np.array(vals, dtype=np.float32))
        if smooth: me.polygons.foreach_set('use_smooth', np.ones(len(me.polygons), dtype=bool))
        ob = bpy.data.objects.new(name, me)
        bpy.context.collection.objects.link(ob)
        ma = bpy.data.materials.get('m_' + name.split('.')[0]) or bpy.data.materials.new('m_' + name.split('.')[0])
        me.materials.append(ma)
        log(f'{name}: {len(self.v):,} verts, {len(self.f):,} faces')
        return ob

def flat(name, polys, z):
    bag = Bag()
    for pts in polys:
        pts = clean(pts)
        if len(pts) < 3: continue
        try:
            tris = geometry.tessellate_polygon([[Vector((x, y, 0)) for x, y in pts]])
        except Exception:
            continue
        bag.add([(x, y, z) for x, y in pts], [list(t) for t in tris])
    return bag.obj(name)

# ---------------------------------------------------------------- sea and land
def clip_chains(chain, r):
    """Clips a polyline to the rectangle r=(x0,y0,x1,y1); returns the pieces inside."""
    x0, y0, x1, y1 = r
    out, cur = [], []
    for a, b in zip(chain, chain[1:]):
        t0, t1, dx, dy, ok = 0.0, 1.0, b[0] - a[0], b[1] - a[1], True
        for p, q in ((-dx, a[0] - x0), (dx, x1 - a[0]), (-dy, a[1] - y0), (dy, y1 - a[1])):
            if p == 0:
                if q < 0: ok = False
            else:
                t = q / p
                if p < 0: t0 = max(t0, t)
                else: t1 = min(t1, t)
        if not ok or t0 > t1:
            if cur: out.append(cur); cur = []
            continue
        pa = (a[0] + dx * t0, a[1] + dy * t0)
        pb = (a[0] + dx * t1, a[1] + dy * t1)
        if t0 > 0 or not cur:
            if cur: out.append(cur)
            cur = [pa]
        cur.append(pb)
        if t1 < 1:
            out.append(cur); cur = []
    if cur: out.append(cur)
    return out

def land_polys():
    """OSM coastlines keep land on their left, so a chain's exit links counter-clockwise round the frame to the next entry."""
    ways = [[(p['lon'], p['lat']) for p in e.get('geometry', [])] for e in load('coast')]
    x0, y0 = xy({'lon': W, 'lat': S}); x1, y1 = xy({'lon': E, 'lat': N})
    rect = (x0, y0, x1, y1)
    polys, pieces = [], []
    for ring in stitch(ways):
        pts = [xy({'lon': a, 'lat': b}) for a, b in ring]
        inside = all(x0 <= p[0] <= x1 and y0 <= p[1] <= y1 for p in pts)
        if ring[0] == ring[-1] and inside:
            polys.append(pts)
            continue
        if ring[0] == ring[-1]:   # a ring crossing the frame: start it outside
            k = next(i for i, p in enumerate(pts) if not (x0 <= p[0] <= x1 and y0 <= p[1] <= y1))
            pts = pts[k:-1] + pts[:k + 1]
        pieces += [c for c in clip_chains(pts, rect) if len(c) > 1]
    log(f'coast: {len(polys)} closed islands, {len(pieces)} open pieces')
    w, h = x1 - x0, y1 - y0
    def perim(p):   # distance counter-clockwise from the bottom-left corner
        if abs(p[1] - y0) < 1e-6: return p[0] - x0
        if abs(p[0] - x1) < 1e-6: return w + p[1] - y0
        if abs(p[1] - y1) < 1e-6: return w + h + x1 - p[0]
        if abs(p[0] - x0) < 1e-6: return 2 * w + h + y1 - p[1]
        return None
    # Chains that don't reach the frame are ignored: their ends can't be linked.
    pieces = [c for c in pieces if perim(c[0]) is not None and perim(c[-1]) is not None]
    corners = [(w, (x1, y0)), (w + h, (x1, y1)), (2 * w + h, (x0, y1)), (2 * (w + h), (x0, y0))]
    L = 2 * (w + h)
    used = set()
    for i in range(len(pieces)):
        if i in used: continue
        poly, j = [], i
        while j not in used:
            used.add(j)
            poly += pieces[j]
            here = perim(pieces[j][-1])
            nxt = min(range(len(pieces)), key=lambda k: (perim(pieces[k][0]) - here) % L)
            gap = (perim(pieces[nxt][0]) - here) % L
            for c, pt in sorted(corners, key=lambda c: (c[0] - here) % L):
                if (c - here) % L < gap: poly.append(pt)
            j = nxt
        polys.append(poly)
    return polys, (x0, y0, x1, y1)

polys, frame = land_polys()
flat('land', polys, 0.0)

# Land beyond the data's edge, so nothing ends abruptly in the haze (east and south are all land here).
fx0, fy0, fx1, fy1 = frame
far = Bag()
far.add([(fx1, fy0 - 2000, 0), (fx1 + 2000, fy0 - 2000, 0), (fx1 + 2000, fy1 + 40, 0), (fx1, fy1 + 40, 0)], [[0, 1, 2, 3]])
far.add([(fx0 - 2000, fy0 - 2000, 0), (fx1, fy0 - 2000, 0), (fx1, fy0, 0), (fx0 - 2000, fy0, 0)], [[0, 1, 2, 3]])
far.obj('land.far')
sea = Bag()
sea.add([(-4000, -4000, -0.02), (4000, -4000, -0.02), (4000, 4000, -0.02), (-4000, 4000, -0.02)], [[0, 1, 2, 3]])
sea.obj('sea')

def polys_of(name, test=None):
    out = []
    for e in load(name):
        if test and not test(e.get('tags', {})): continue
        for r in outers(e):
            if len(r) >= 3: out.append(r)
    return out

flat('sand', polys_of('sand'), 0.002)
green = polys_of('green', lambda t: t.get('leisure') != 'pitch' or True)
flat('green', green, 0.004)
water_polys = polys_of('water', lambda t: t.get('waterway') is None)
flat('water', water_polys, 0.006)

# ---------------------------------------------------------------- roads
ROAD = {'motorway': 38, 'trunk': 32, 'primary': 24, 'secondary': 18, 'tertiary': 13, 'motorway_link': 10, 'trunk_link': 10,
        'primary_link': 9, 'secondary_link': 8, 'tertiary_link': 7, 'pedestrian': 6, 'residential': 7, 'unclassified': 7, 'living_street': 6}
BIG = ('motorway', 'trunk', 'primary')
def ribbon(bag, pts, hw, z):
    n = len(pts)
    if n < 2: return
    verts = []
    for i, p in enumerate(pts):
        a = pts[max(i - 1, 0)]; b = pts[min(i + 1, n - 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        d = math.hypot(dx, dy) or 1
        nx, ny = -dy / d, dx / d
        m = hw
        if 0 < i < n - 1:     # keep the width through a bend, within reason
            ax, ay = p[0] - a[0], p[1] - a[1]; al = math.hypot(ax, ay) or 1
            cos_half = abs(nx * (-ay / al) + ny * (ax / al))
            m = hw / max(cos_half, 0.5)
        verts += [(p[0] + nx * m, p[1] + ny * m, z), (p[0] - nx * m, p[1] - ny * m, z)]
    bag.add(verts, [[2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2] for i in range(n - 1)])

fill, casing, big_fill, big_casing = Bag(), Bag(), Bag(), Bag()
routes, avenues = [], []
for e in load('roads'):
    t = e.get('tags', {}); h = t.get('highway')
    if h not in ROAD or t.get('tunnel') == 'yes': continue
    pts = clean([xy(p) for p in e.get('geometry', [])])
    if len(pts) < 2: continue
    d = min(math.hypot(*p) for p in pts)
    if h in ('residential', 'unclassified', 'living_street', 'pedestrian') and d > 120: continue
    w = ROAD[h] * 1.15 / U / 2
    major = h in BIG
    ribbon(big_fill if major else fill, pts, w, 0.012 if major else 0.009)
    ribbon(big_casing if major else casing, pts, w + 3.0 / U, 0.011 if major else 0.008)
    if h in ('primary', 'secondary', 'tertiary') and d < 40:
        avenues.append((pts, w))
    if h in ('motorway', 'trunk', 'primary') and d < 80:
        routes.append({'k': h, 'one': t.get('oneway') == 'yes' or h in ('motorway', 'motorway_link'), 'name': t.get('name:en') or t.get('name') or '', 'p': [[round(a, 3), round(b, 3)] for a, b in pts]})
fill.obj('road'); casing.obj('road_edge'); big_fill.obj('road_big'); big_casing.obj('road_big_edge')
json.dump(routes, open(os.path.join(OUT, 'routes.json'), 'w'))

rail = Bag()
for e in load('rail'):
    pts = clean([xy(p) for p in e.get('geometry', [])])
    if e.get('tags', {}).get('tunnel') != 'yes': ribbon(rail, pts, 7.0 / U, 0.014)
if rail.v: rail.obj('rail')

# ---------------------------------------------------------------- buildings
MARKS = {  # hand-built landmarks: (lat, lon, clearing radius in m). OSM footprints inside the radius are dropped.
    'burj_khalifa': (25.19716, 55.27436, 120),
    'future': (25.21925, 55.28173, 70),
    'frame': (25.23553, 55.30036, 70),
    'burj_al_arab': (25.14127, 55.18531, 90),
    'ain_dubai': (25.07997, 55.12079, 140),
}
mark_xy = {k: xy({'lat': v[0], 'lon': v[1]}) for k, v in MARKS.items()}
def num(v):
    try: return float(str(v).lower().replace('m', '').replace(',', '.').split()[0])
    except Exception: return None
def height_of(t, a):
    """Real height in metres when mapped, else a plausible one for the footprint."""
    h = num(t.get('height')) or num(t.get('building:height'))
    if h: return min(h, 700)
    lv = num(t.get('building:levels'))
    if lv: return min(lv * 3.6, 700)
    r = random.random()
    if a < 450: return 6 + r * 3        # villas
    if a < 1500: return 10 + r * 12
    return 14 + r * 24

def prism(bag, pts, z0, z1, **attrs):
    """Walls from z0 to z1 with a roof. pts must be counter-clockwise."""
    n = len(pts)
    verts = [(x, y, z0) for x, y in pts] + [(x, y, z1) for x, y in pts]
    faces = [[i, (i + 1) % n, (i + 1) % n + n, i + n] for i in range(n)] + [list(range(n, 2 * n))]
    bag.add(verts, faces, **attrs)
def shrink(pts, k):
    cx, cy = centroid(pts)
    return [(cx + (x - cx) * k, cy + (y - cy) * k) for x, y in pts]

R_NEAR = 62.0   # towers within this radius rise; further ones are out of shot until they stand
R_KEEP = 120.0  # beyond this only tall buildings stay
near, far_b = Bag(), Bag()
near_rise = []  # per-vertex: delay fraction
files = sorted(glob.glob(os.path.join(DATA, 'bld-*.json')))
seen, stats = set(), {'all': 0, 'mapped': 0, 'tall': 0}
for f in files:
    for e in json.load(open(f))['elements']:
        k = (e['type'], e['id'])
        if k in seen: continue
        seen.add(k)
        t = e.get('tags', {})
        for pts in outers(e):
            if len(pts) < 3: continue
            a = area(pts)
            am = abs(a) * U * U
            if am < 12: continue
            if a < 0: pts = pts[::-1]
            cx, cy = centroid(pts)
            if any(math.hypot(cx - mx, cy - my) * U < MARKS[m][2] for m, (mx, my) in mark_xy.items()): continue
            d = math.hypot(cx, cy)
            h = height_of(t, am)
            if d > R_KEEP and h < 30: continue
            stats['all'] += 1
            stats['mapped'] += 1 if (t.get('height') or t.get('building:levels')) else 0
            stats['tall'] += 1 if h >= 80 else 0
            hu = (h * (1.25 if h < 40 else 1.0)) / U
            bag = near if d <= R_NEAR else far_b
            attrs = {'bh': h, 'rnd': random.random()}
            before = len(bag.v)
            if h >= 80:     # a stepped crown gives towers a silhouette
                prism(bag, pts, 0, hu * 0.88, **attrs)
                prism(bag, shrink(pts, 0.8), hu * 0.88, hu * 0.95, **attrs)
                prism(bag, shrink(pts, 0.48), hu * 0.95, hu, **attrs)
            elif h >= 20 and am > 500:   # plant on the roof
                prism(bag, pts, 0, hu * 0.96, **attrs)
                prism(bag, shrink(pts, 0.42), hu * 0.96, hu, **attrs)
            else:
                prism(bag, pts, 0, hu, **attrs)
            if bag is near:
                near_rise += [d / R_NEAR] * (len(bag.v) - before)
log('buildings', stats)
near_ob = near.obj('city_near')
far_b.obj('city_far')

# ---------------------------------------------------------------- landmarks
def lofted(name, rings, cap_every=True, top=True, **attrs):
    """Stacks closed rings of equal length (lists of (x, y, z)) into a shell with ledges."""
    bag = Bag(); n = len(rings[0])
    verts = [p for r in rings for p in r]
    faces = []
    for k in range(len(rings) - 1):
        o = k * n
        faces += [[o + i, o + (i + 1) % n, o + n + (i + 1) % n, o + n + i] for i in range(n)]
    if top: faces.append(list(range((len(rings) - 1) * n, len(rings) * n)))
    bag.add(verts, faces, **attrs)
    return bag.obj(name)

def y_plan(lengths, a, n=30):
    """Burj Khalifa's three-winged plan: stadium wings 120 degrees apart, each with its own length."""
    pts = []
    for w in range(3):
        L, axis = lengths[w], math.radians(90 + 120 * w + 25)
        c = max(L - a, 0.001)
        for i in range(n):
            phi = math.radians(-60 + 120 * i / n)
            sp, cp = abs(math.sin(phi)), math.cos(phi)
            side = a / sp if sp > 1e-4 else 1e9
            if side * cp <= c: r = side
            else: r = c * cp + math.sqrt(max(a * a - (c * sp) ** 2, 0))
            th = axis + phi
            pts.append((r * math.cos(th), r * math.sin(th)))
    return pts

def burj_khalifa():
    """828 m. Setbacks spiral up the three wings; the top 240 m is the spire."""
    bag = Bag(); z = 0.0
    L = [92.0, 92.0, 92.0]; a0 = 24.0
    tiers = 27; top_body = 590.0
    for k in range(tiers):
        fr = k / (tiers - 1)
        z1 = top_body * (k + 1) / tiers
        a = a0 * (1 - 0.48 * fr)
        L[k % 3] = max(a + 2, 92 * (1 - fr) ** 0.85 + a * 0.9)  # one wing steps in at each tier, turning as it climbs
        plan = y_plan(L, a)
        ring0 = [(x / U, y / U) for x, y in plan]
        prism(bag, ring0, z / U, z1 / U, bh=828.0, rnd=fr)
        z = z1
    ob = bag.obj('burj_khalifa')
    spire = Bag(); n = 12; zs = [(590, 17.0), (640, 13.0), (700, 8.5), (760, 4.5), (828, 0.5)]
    rings = [[(r / U * math.cos(2 * math.pi * i / n), r / U * math.sin(2 * math.pi * i / n), zz / U) for i in range(n)] for zz, r in zs]
    verts = [p for r in rings for p in r]
    faces = [[k * n + i, k * n + (i + 1) % n, (k + 1) * n + (i + 1) % n, (k + 1) * n + i] for k in range(len(rings) - 1) for i in range(n)]
    faces.append(list(range((len(rings) - 1) * n, len(rings) * n)))
    spire.add(verts, faces, bh=828.0, rnd=1.0)
    sp = spire.obj('burj_khalifa.spire')
    sp.parent = ob
    return ob
bk = burj_khalifa()

def torus_ring(name, center, R, r, squash=(1, 1, 1), axis_turn=0.0, nu=64, nv=20):
    bag = Bag(); verts = []
    for i in range(nu):
        u = 2 * math.pi * i / nu
        for j in range(nv):
            v = 2 * math.pi * j / nv
            x = (R + r * math.cos(v)) * math.cos(u) * squash[0]
            z = (R + r * math.cos(v)) * math.sin(u) * squash[2]
            y = r * math.sin(v) * squash[1]
            xr = x * math.cos(axis_turn) - y * math.sin(axis_turn)
            yr = x * math.sin(axis_turn) + y * math.cos(axis_turn)
            verts.append(((center[0] + xr / U), (center[1] + yr / U), (center[2] + z) / U))
    faces = [[i * nv + j, i * nv + (j + 1) % nv, ((i + 1) % nu) * nv + (j + 1) % nv, ((i + 1) % nu) * nv + j] for i in range(nu) for j in range(nv)]
    bag.add(verts, faces, bh=80.0, rnd=0.5)
    return bag.obj(name, smooth=True)

mx, my = mark_xy['future']
fut = torus_ring('future', (mx, my, 40), 36, 13, squash=(1.55, 1.25, 0.95), axis_turn=math.radians(35))
mound = Bag()
mound.add([(mx + 0.9 * math.cos(2 * math.pi * i / 40), my + 0.65 * math.sin(2 * math.pi * i / 40), 0.03) for i in range(40)], [list(range(40))])
mound.obj('green.mound')

fx, fy = mark_xy['frame']
fr = Bag()
turn = math.radians(20)
def fr_box(x0, x1, z0, z1, d=9):
    pts = [(x0, -d), (x1, -d), (x1, d), (x0, d)]
    pts = [((px * math.cos(turn) - py * math.sin(turn)) / U + fx, (px * math.sin(turn) + py * math.cos(turn)) / U + fy) for px, py in pts]
    prism(fr, pts, z0 / U, z1 / U, bh=150.0, rnd=0.5)
fr_box(-58, -38, 0, 150); fr_box(38, 58, 0, 150); fr_box(-58, 58, 132, 150); fr_box(-58, 58, 0, 14)
frame_ob = fr.obj('frame')

ax, ay = mark_xy['burj_al_arab']
rings = []
for k in range(26):
    q = k / 25
    z = 321 * q
    depth = 150 * (1 - q) ** 0.75 + 4     # the sail bellies out to the sea
    width = 56 * (1 - q * 0.82) + 3
    ring = []
    for i in range(36):
        th = 2 * math.pi * i / 36
        px = math.cos(th) * width
        py = (math.sin(th) * 0.5 + 0.5) * depth * (1 - 0.35 * abs(math.cos(th)))
        ring.append((ax + (px * 0.77 - py * 0.64) / U, ay + (px * 0.64 + py * 0.77) / U, z / U))
    rings.append(ring)
lofted('burj_al_arab', rings, bh=321.0, rnd=0.8)

wx, wy = mark_xy['ain_dubai']
torus_ring('ain_dubai', (wx, wy, 130), 122, 5.5, squash=(1, 1, 1), axis_turn=math.radians(-40), nu=72, nv=8)

# Dubai Fountain: white jets on an arc across the real Burj Khalifa Lake, south of the tower.
jets = Bag()
for i in range(30):
    q = i / 29
    jx, jy = -0.55 + 2.9 * q, -3.0 + 0.45 * math.sin(q * math.pi) - 0.3 * q
    hj = (34 + 46 * abs(math.sin(q * 11))) / U
    n = 6; rj = 0.035
    verts = [(jx + rj * math.cos(2 * math.pi * k / n), jy + rj * math.sin(2 * math.pi * k / n), 0.01) for k in range(n)] + [(jx, jy, hj)]
    jets.add(verts, [[k, (k + 1) % n, n] for k in range(n)])
jets.obj('jets')

# ---------------------------------------------------------------- trees
def scatter(poly, per_km2):
    pts = clean(poly)
    if len(pts) < 3: return []
    try: tris = geometry.tessellate_polygon([[Vector((x, y, 0)) for x, y in pts]])
    except Exception: return []
    out = []
    for t in tris:
        a, b, c = (pts[i] for i in t)
        ar = abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2
        n = ar * 0.01 * per_km2  # 1 unit^2 = 0.01 km^2
        n = int(n) + (1 if random.random() < n - int(n) else 0)
        for _ in range(n):
            u, v = random.random(), random.random()
            if u + v > 1: u, v = 1 - u, 1 - v
            out.append((a[0] + u * (b[0] - a[0]) + v * (c[0] - a[0]), a[1] + u * (b[1] - a[1]) + v * (c[1] - a[1])))
    return out

ico_v = [(-1, 1.618, 0), (1, 1.618, 0), (-1, -1.618, 0), (1, -1.618, 0), (0, -1, 1.618), (0, 1, 1.618), (0, -1, -1.618), (0, 1, -1.618),
         (1.618, 0, -1), (1.618, 0, 1), (-1.618, 0, -1), (-1.618, 0, 1)]
ico_v = [tuple(c / math.sqrt(1 + 1.618 ** 2) for c in v) for v in ico_v]
ico_f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
         [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]]
trees, tree_rise = Bag(), []
count = 0
def add_tree(x, y, size=1.0):
    global count
    s = (6 + random.random() * 6) / U * size   # a little larger than life, so they read from the air
    k = 1.2 + random.random() * 0.5
    trees.add([(x + vx * s, y + vy * s, s * k + vz * s * k) for vx, vy, vz in ico_v], ico_f, rnd=random.random())
    tree_rise.extend([math.hypot(x, y) / R_NEAR] * 12)
    count += 1
for poly in green:
    c = centroid(poly)
    d = math.hypot(*c)
    if d > 75 or len(poly) > 2000: continue
    dens = 3000 if d < 30 else 1400 if d < 55 else 600
    for x, y in scatter(poly, dens):
        add_tree(x, y)
# Street trees line the avenues around Downtown.
for pts, w in avenues:
    for a, b_ in zip(pts, pts[1:]):
        ln = math.hypot(b_[0] - a[0], b_[1] - a[1])
        nx, ny = -(b_[1] - a[1]) / (ln or 1), (b_[0] - a[0]) / (ln or 1)
        for k in range(int(ln / 0.42)):
            q = (k + random.random()) * 0.42 / ln
            off = w + 0.09
            add_tree(a[0] + (b_[0] - a[0]) * q + nx * off, a[1] + (b_[1] - a[1]) * q + ny * off, 0.72)
            add_tree(a[0] + (b_[0] - a[0]) * q - nx * off, a[1] + (b_[1] - a[1]) * q - ny * off, 0.72)
log('trees', count)
tree_ob = trees.obj('trees', smooth=True)

np.savez(os.path.join(OUT, 'rise.npz'),
         near_delay=np.array(near_rise, dtype=np.float32), tree_delay=np.array(tree_rise, dtype=np.float32))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'city.blend'), compress=False)
log('saved', os.path.join(OUT, 'city.blend'))
