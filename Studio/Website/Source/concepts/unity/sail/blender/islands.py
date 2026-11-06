# The three islands, the small islets between them and the far silhouettes on the horizon. Metres, Z up, X east, Y north.
import math
import numpy as np
from lib import *

SAND = hx('#f4d9a2')
SAND_W = hx('#c9a878')
GRASS = hx('#7fa84a')
GRASS_D = hx('#3f8050')
GRASS_L = hx('#b7c257')
ROCK = hx('#c0907a')
ROCK_D = hx('#7c5a58')
ROCK_L = hx('#e3bb96')
WHITE = hx('#f6efe0')
WOOD = hx('#8a5428')
WOOD_D = hx('#5c3418')
TEAL = hx('#0c7f80')
PINK = hx('#fa2a6f')
GOLD = hx('#f0b13c')
RED = hx('#d9543c')
BLUE = hx('#2b8fc4')
YELLOW = hx('#ffcf4a')

# Each island's place in the world. The sea shader's depth map and the game's collisions are made from these same shapes.
ISLES = {}


def terrain(g, cx, cy, R, n, h, paint):
    """A height function over a square grid, keeping only what stands above the seabed near the waterline."""
    xs = np.linspace(-R, R, n)
    X, Y = np.meshgrid(xs, xs, indexing='ij')
    H = h(X, Y)
    C = paint(X, Y, H, slope(X, Y, H, xs[1] - xs[0]))
    idx = -np.ones((n, n), np.int64)
    keep = H > -2.2
    keep = keep | np.roll(keep, 1, 0) | np.roll(keep, -1, 0) | np.roll(keep, 1, 1) | np.roll(keep, -1, 1)
    idx[keep] = np.arange(keep.sum())
    v = np.stack([X[keep] + cx, Y[keep] + cy, H[keep]], 1)
    faces = []
    for i in range(n - 1):
        for j in range(n - 1):
            a, b, c, d = idx[i, j], idx[i + 1, j], idx[i + 1, j + 1], idx[i, j + 1]
            if min(a, b, c, d) < 0:
                continue
            # Split the quad along the shorter diagonal so ridges stay crisp.
            if abs(H[i, j] - H[i + 1, j + 1]) < abs(H[i + 1, j] - H[i, j + 1]):
                faces += [(a, b, c), (a, c, d)]
            else:
                faces += [(a, b, d), (b, c, d)]
    g.add(v, faces, C[keep])
    return X, Y, H


def slope(X, Y, H, dx):
    gx, gy = np.gradient(H, dx)
    return np.sqrt(gx * gx + gy * gy)


def strata(H, X, Y, seed=0):
    """Rock in painted horizontal bands, warped so they don't look ruled."""
    w = H + 3.0 * fbm(X * 0.02, Y * 0.02, 3, seed)
    return 0.5 + 0.5 * np.sin(w * 1.4 + 2.0 * np.sin(w * 0.37))


def base_paint(X, Y, H, S, seed=0, grass=GRASS, grass_d=GRASS_D, rock=ROCK, rock_d=ROCK_D):
    n = fbm(X * 0.035, Y * 0.035, 4, seed)
    n2 = fbm(X * 0.14, Y * 0.14, 3, seed + 3)
    col = np.zeros(H.shape + (4,), np.float32)
    col[..., 3] = 1
    # Sand, wet at the water's edge.
    sand = mix(SAND, SAND * np.array([1.03, 0.96, 0.82, 1]), (n2 * 1.4 - 0.2).clip(0, 1)[..., None])
    wet = sstep(1.2, -0.2, H)[..., None]
    sand = mix(sand, SAND_W, wet)
    # Grass runs from sun-bleached to deep green.
    gr = mix(grass, grass_d, sstep(0.38, 0.68, n)[..., None])
    gr = mix(gr, GRASS_L, (sstep(0.5, 0.72, n2) * 0.7)[..., None])
    # Rock in bands.
    st = strata(H, X, Y, seed)[..., None]
    rk = mix(rock_d, rock, st)
    rk = mix(rk, ROCK_L, (st ** 4 * 0.75))
    edge = 2.6 + 2.2 * (n2 - 0.5)
    t = sstep(edge, edge + 1.0, H)[..., None]
    col = mix(sand, gr, t)
    r = sstep(0.62 + 0.25 * (n - 0.5), 1.0 + 0.25 * (n - 0.5), S)[..., None]
    col = mix(col, rk, r * sstep(0.8, 3.0, H)[..., None])
    col[..., 3] = 1
    return col


def palm(g, x, y, z, h=None, rng=None, lean=None, leaf=None):
    """Curved trunk and arching fronds. The fronds go into `leaf`, so they can stir in the wind."""
    rng = rng or np.random.default_rng(1)
    h = h or rng.uniform(9, 15)
    lean = lean if lean is not None else rng.uniform(0, 2 * math.pi)
    amount = rng.uniform(0.12, 0.36) * h
    us = np.linspace(0, 1, 7)
    path = np.array([(x + math.cos(lean) * amount * u ** 2, y + math.sin(lean) * amount * u ** 2, z - 0.4 + h * u) for u in us])
    def tcol(u, j):
        return mix(hx('#7a5a40'), hx('#b08a62'), u) * (0.92 + 0.14 * math.sin(u * 28))
    tube(g, path, np.linspace(0.42, 0.2, 7) * h / 12, tcol, sides=6, caps=(False, True))
    top = path[-1]
    leaf = leaf if leaf is not None else g
    nf = 9
    base = rng.uniform(0, 6.28)
    for i in range(nf):
        a = base + i / nf * 2 * math.pi + rng.uniform(-0.2, 0.2)
        tilt = rng.uniform(-0.05, 0.75)
        length = rng.uniform(4.2, 6.2) * h / 12
        c1 = mix(hx('#3f8a4a'), hx('#8cb04a'), rng.uniform(0, 1))
        rings = []
        cols = []
        for t in np.linspace(0, 1, 5):
            r = length * t
            zz = top[2] + r * (tilt) - (r / length) ** 2 * length * (0.55 + tilt * 0.8)
            px = top[0] + math.cos(a) * r
            py = top[1] + math.sin(a) * r
            w = length * 0.2 * math.sin(math.pi * (0.1 + 0.85 * t)) ** 0.8
            perp = np.array([-math.sin(a), math.cos(a), 0])
            droop = 0.18 * w
            ridge = np.array([px, py, zz])
            rings.append([ridge - perp * w + np.array([0, 0, -droop]), ridge + np.array([0, 0, 0.03]), ridge + perp * w + np.array([0, 0, -droop])])
            cc = c1 * (1.0 + 0.3 * t)
            cc = np.array([cc[0], cc[1], cc[2], float(t)], np.float32)     # alpha is how far the leaf stirs
            cols.append([cc, cc, cc])
        leaf.add(np.array(rings).reshape(-1, 3), grid_faces(5, 3, True, flip=True), np.array(cols).reshape(-1, 4))
    return top


def puff_tree(g, x, y, z, r=4.0, rng=None, cols=None, leaf=None, trunk=True, fine=False):
    """A painterly round tree from a few soft balls, lighter on top."""
    rng = rng or np.random.default_rng(2)
    cols = cols or (hx('#2c6e50'), hx('#6f9c48'))
    leaf = leaf if leaf is not None else g
    h = r * 1.12
    if trunk:
        tube(g, [(x, y, z - 0.5), (x + 0.2, y, z + h * 0.5), (x + 0.3, y + 0.1, z + h)], [0.34 * r / 4, 0.26 * r / 4, 0.18 * r / 4], hx('#6e4e3a'), sides=5)
    n = rng.integers(3, 5)
    for i in range(n):
        a = rng.uniform(0, 6.28)
        d = 0 if i == 0 else rng.uniform(0.45, 0.8) * r
        cx, cy = x + math.cos(a) * d, y + math.sin(a) * d
        cz = z + h + (r * 0.5 if i == 0 else rng.uniform(-0.2, 0.3) * r)
        rr = r * (1.0 if i == 0 else rng.uniform(0.6, 0.82))
        k = rng.uniform(0, 1)
        lo = cols[0] * (0.85 + 0.3 * k)
        hi = cols[1] * (0.85 + 0.3 * k)
        def shade(v, lo=lo, hi=hi):
            t = np.clip(v[:, 2] * 0.5 + 0.5, 0, 1)[:, None] ** 1.3
            c = lo + (hi - lo) * t
            c = c.copy()
            c[:, 3] = 0.25
            return c
        ball(leaf, (cx, cy, cz), rr, None, 2 if fine or (i == 0 and r >= 3.0) else 1, squash=(1, 1, 0.88), lump=0.09, seed=float(rng.uniform(0, 9)), shade=shade)


def rock(g, x, y, z, r, rng, c=None):
    c = c if c is not None else mix(ROCK, ROCK_D, rng.uniform(0, 0.7))
    def shade(v, c=c):
        out = np.tile(c, (len(v), 1))
        out[:, :3] *= (0.75 + 0.5 * np.clip(v[:, 2:3] * 0.5 + 0.5, 0, 1))
        return out
    ball(g, (x, y, z), r, None, 2, squash=(1, rng.uniform(0.75, 1.2), rng.uniform(0.6, 1.0)), lump=0.16, seed=float(rng.uniform(0, 9)), shade=shade)


def scatter(fn, X, Y, H, S, n, rng, hmin, hmax, smax, seed=0, cluster=0.0):
    """Picks points on the terrain at the right height and slope, optionally gathering them into groves."""
    pts = []
    tries = 0
    size = X.shape[0]
    field = fbm(X * 0.03, Y * 0.03, 3, seed)
    while len(pts) < n and tries < n * 80:
        tries += 1
        i, j = rng.integers(0, size), rng.integers(0, size)
        if hmin < H[i, j] < hmax and S[i, j] < smax and (cluster == 0 or field[i, j] > cluster):
            pts.append((float(X[i, j]), float(Y[i, j]), float(H[i, j])))
    return pts


# --------------------------------------------------------------------------------- beautiful
def isle_beautiful():
    """A tiered green mountain whose waterfalls run down through terraces to a beach, crowned by one immense tree."""
    cx, cy, R = -330.0, 640.0, 210.0
    ground, leaf, trunk, blossom, falls, flowers = Geo(), Geo(), Geo(), Geo(), Geo(), Geo()
    rng = np.random.default_rng(11)
    n = 170

    def h(X, Y):
        wx = X + 14 * (fbm(X * 0.012, Y * 0.012, 3, 21) - 0.5)
        wy = Y + 14 * (fbm(X * 0.012, Y * 0.012, 3, 22) - 0.5)
        d = np.sqrt(wx * wx + (wy * 1.05) ** 2) / R
        # Shoreline at about d = 0.62, seabed beyond it.
        sea = -24 * sstep(0.62, 1.02, d)
        beach = 3.4 * sstep(0.645, 0.52, d)
        # Terraces climbing to a plateau.
        t = np.clip((0.54 - d) / 0.46, 0, 1)
        tiers = 4
        ramp = t * tiers
        fl = np.floor(ramp)
        fr = ramp - fl
        terr = (fl + sstep(0.58, 0.82, fr)) / tiers
        H = beach + 44 * terr ** 0.9 * sstep(0.0, 0.08, t) + 8 * sstep(0.5, 1.0, t) ** 2
        H += 5.5 * (fbm(X * 0.03, Y * 0.03, 4, 25) - 0.5) * sstep(0.02, 0.2, t)
        return H + sea

    def paint(X, Y, H, S):
        c = base_paint(X, Y, H, S, 3, GRASS, GRASS_D, hx('#c79a7c'), hx('#8a6a5e'))
        return c

    X, Y, H = terrain(ground, cx, cy, R, n, h, paint)
    S = slope(X, Y, H, X[1, 0] - X[0, 0])
    at = lambda x, y: float(h(np.array([[x]], np.float32), np.array([[y]], np.float32))[0, 0])

    for p in scatter(None, X, Y, H, S, 42, rng, 0.9, 4.5, 0.6, 5):
        palm(trunk, p[0] + cx, p[1] + cy, p[2], rng=rng, leaf=leaf)
    for p in scatter(None, X, Y, H, S, 130, rng, 4.5, 60, 0.7, 6, 0.4):
        cols = (hx('#2c6e50'), hx('#7ba04a')) if rng.random() < 0.82 else (hx('#7a5f2c'), hx('#d29c42'))
        puff_tree(trunk, p[0] + cx, p[1] + cy, p[2], rng.uniform(2.6, 5.4), rng, cols, leaf, fine=True)
    for p in scatter(None, X, Y, H, S, 26, rng, 3, 60, 3.0, 7):
        rock(ground, p[0] + cx, p[1] + cy, p[2], rng.uniform(1.2, 3.8), rng)

    # The great tree on the summit: a thick twisting trunk and a crown of many soft masses.
    tx, ty = cx + 4, cy - 4
    tz = at(4, -4)
    tp = np.array([(tx + 3.5 * math.sin(u * 2.4), ty + 2.5 * math.cos(u * 2.0) - 2.5, tz - 1.5 + 26 * u) for u in np.linspace(0, 1, 9)])
    tube(trunk, tp, np.linspace(5.0, 2.1, 9), lambda u, j: mix(hx('#6e4a36'), hx('#a07a56'), u) * (0.86 + 0.2 * math.sin(j * 2.2)), sides=12)
    masses = []
    limbs = 7
    for i in range(limbs):
        a = i / limbs * 2 * math.pi + 0.4
        reach = rng.uniform(12, 21)
        endp = np.array([tx + math.cos(a) * reach, ty + math.sin(a) * reach, tz + 30 + rng.uniform(-3, 9)])
        start = tp[int(rng.integers(5, 8))]
        mid = (start + endp) / 2 + np.array([0, 0, 4])
        pts = np.array([start + (mid - start) * u for u in np.linspace(0, 1, 4)] + [mid + (endp - mid) * u for u in np.linspace(0.25, 1, 3)])
        tube(trunk, pts, np.linspace(1.5, 0.5, len(pts)), hx('#8a6444'), sides=6)
        masses.append((endp, rng.uniform(9, 13)))
    masses.append((np.array([tx, ty, tz + 42]), 15.0))
    for _ in range(12):
        a = rng.uniform(0, 6.28)
        d = rng.uniform(6, 26)
        masses.append((np.array([tx + math.cos(a) * d, ty + math.sin(a) * d, tz + 30 + rng.uniform(0, 14)]), rng.uniform(6, 9.5)))
    for c, r in masses:
        def shade(v, lo=hx('#2f7050'), hi=hx('#b6c25e')):
            t = np.clip(v[:, 2] * 0.55 + 0.45, 0, 1)[:, None] ** 1.2
            o = lo + (hi - lo) * t
            o = o.copy()
            o[:, 3] = 0.18
            return o
        ball(leaf, c, r, None, 3 if r >= 9 else 2, squash=(1, 1, 0.82), lump=0.07, seed=float(rng.uniform(0, 9)), shade=shade)

    # The blossom sits just outside the crown and swells open when you arrive. Each puff stores its radius in UV so the
    # shader can pull it back to its own centre: closed is a point, open is a full ball of flowers.
    for c, r in masses:
        k = int(15 + r * 1.3)
        for _ in range(k):
            d = rng.normal(size=3)
            d /= np.linalg.norm(d)
            d[2] = abs(d[2]) * 0.9 + 0.05
            d /= np.linalg.norm(d)
            q = c + d * r * np.array([1, 1, 0.82]) * 0.82
            rr = rng.uniform(2.2, 4.0) * (0.65 + r / 26)
            base = mix(hx('#fa4f8c'), hx('#ffb6c9'), rng.uniform(0, 1))
            def shade(v, base=base):
                t = np.clip(v[:, 2] * 0.5 + 0.5, 0, 1)[:, None]
                o = base * (0.72 + 0.42 * t)
                o = o.copy()
                o[:, 3] = 0.2
                return o
            nv = len(ico_data(2)[0])
            ball(blossom, q, rr, None, 2, lump=0.1, seed=float(rng.uniform(0, 9)), shade=shade, uv=np.tile((rr * 1.25 / 8.0, 0.5), (nv, 1)))

    # Flower beds on the lower terraces, which open at the same moment.
    for p in scatter(None, X, Y, H, S, 220, rng, 4, 54, 0.9, 8):
        base = [hx('#ff6b9d'), hx('#ffc35a'), hx('#fff2d8'), hx('#ff8a5c')][int(rng.integers(0, 4))]
        rr = rng.uniform(0.7, 1.5)
        def shade(v, base=base):
            o = np.tile(base * 1.0, (len(v), 1))
            o[:, 3] = 0.1
            return o
        nv = len(ico_data(1)[0])
        ball(flowers, (p[0] + cx, p[1] + cy, p[2] + rr * 0.4), rr, None, 1, squash=(1, 1, 0.7), shade=shade, uv=np.tile((rr * 1.25 / 8.0, 0.5), (nv, 1)))

    # Waterfalls run from the plateau down over each terrace, on the two sides you approach from.
    for az, wid in ((-98, 4.6), (-132, 3.2), (-64, 2.6)):
        pts = []
        a = math.radians(az)
        for rr in np.linspace(R * 0.08, R * 0.63, 60):
            xw = math.cos(a) * rr + 6 * math.sin(rr * 0.05)
            yw = math.sin(a) * rr
            pts.append((xw, yw))
        rings, uvs, cols = [], [], []
        total = 0.0
        last = None
        for i, (xw, yw) in enumerate(pts):
            zz = at(xw, yw) + 0.35
            if last is not None:
                zz = min(zz, last[2])
            p = np.array([xw + cx, yw + cy, zz])
            if last is not None:
                total += np.linalg.norm(p - last)
            last = p
            perp = np.array([-math.sin(a), math.cos(a), 0])
            w = wid * (0.55 + 0.45 * (i / 60)) * (1 - 0.72 * float(sstep(0.74, 1.0, i / 59)))
            rows = [p - perp * w, p - perp * w * 0.35 + np.array([0, 0, 0.1]), p + perp * w * 0.35 + np.array([0, 0, 0.1]), p + perp * w]
            rings.append(rows)
            uvs.append([(0, total / 26.0), (0.35, total / 26.0), (0.65, total / 26.0), (1, total / 26.0)])
            cols.append([hx('#ffffff', 0.5)] * 4)
        falls.add(np.array(rings).reshape(-1, 3), grid_faces(len(rings), 4, flip=True), np.array(cols).reshape(-1, 4), np.array(uvs).reshape(-1, 2))

    ISLES['beautiful'] = (cx, cy, R, h)
    return dict(Beautiful_ground__world=ground, Beautiful_leaf__leaf=leaf, Beautiful_trunk__world=trunk, Blossom__blossom=blossom, Flowers__blossom=flowers, Falls__falls=falls)


# --------------------------------------------------------------------------------- research
def stripes(i, j, a, b, n=2):
    return a if (i // n) % 2 == 0 else b


def isle_research():
    """A crag with an observatory on the summit and a lighthouse on a lower shoulder: the island of people who want to know."""
    cx, cy, R = 520.0, 880.0, 190.0
    ground, leaf, trunk, build = Geo(), Geo(), Geo(), Geo()
    rng = np.random.default_rng(21)
    n = 160
    top_h = 58.0
    light_at = (-58.0, -72.0, 24.0)    # x, y, height of the lighthouse's shelf

    def h(X, Y):
        wx = X + 18 * (fbm(X * 0.015, Y * 0.015, 3, 41) - 0.5)
        wy = Y + 18 * (fbm(X * 0.015, Y * 0.015, 3, 42) - 0.5)
        d = np.sqrt(wx * wx + wy * wy) / R
        sea = -26 * sstep(0.58, 1.0, d)
        beach = 2.6 * sstep(0.62, 0.5, d)
        ridged = 1 - np.abs(2 * fbm(X * 0.026, Y * 0.026, 4, 43) - 1)
        peak = 66 * np.exp(-(d / 0.36) ** 2.2) * (0.72 + 0.42 * ridged)
        H = beach + peak * sstep(0.56, 0.42, d)
        # The shelves the buildings stand on.
        r0 = np.sqrt(X * X + Y * Y)
        flat = sstep(25, 15, r0)
        H = H * (1 - flat) + top_h * flat
        r1 = np.sqrt((X - light_at[0]) ** 2 + (Y - light_at[1]) ** 2)
        flat = sstep(46, 10, r1)
        H = H * (1 - flat) + light_at[2] * flat
        return H + sea

    def paint(X, Y, H, S):
        c = base_paint(X, Y, H, S, 13, hx('#8aa84e'), hx('#4a8a5c'), hx('#d6a483'), hx('#7f5f62'))
        return c

    X, Y, H = terrain(ground, cx, cy, R, n, h, paint)
    S = slope(X, Y, H, X[1, 0] - X[0, 0])
    at = lambda x, y: float(h(np.array([[x]], np.float32), np.array([[y]], np.float32))[0, 0])
    for p in scatter(None, X, Y, H, S, 18, rng, 0.9, 3.5, 0.5, 15):
        palm(trunk, p[0] + cx, p[1] + cy, p[2], rng=rng, leaf=leaf)
    for p in scatter(None, X, Y, H, S, 78, rng, 3, 46, 0.9, 16, 0.38):
        puff_tree(trunk, p[0] + cx, p[1] + cy, p[2], rng.uniform(2.2, 4.2), rng, (hx('#2c6656'), hx('#6f9a4e')), leaf)
    for p in scatter(None, X, Y, H, S, 34, rng, 0.2, 40, 3.0, 17):
        rock(ground, p[0] + cx, p[1] + cy, p[2], rng.uniform(1.4, 4.2), rng, mix(hx('#b98a78'), hx('#6f5560'), rng.uniform(0, 1)))

    # Observatory: a pale stone drum with a band of arched niches.
    base = np.array([cx, cy, top_h])
    stone = hx('#f2e5cf')
    lathe(build, [(15.0, -1.0), (15.0, 0.6), (14.2, 0.9), (13.2, 1.0), (12.4, 1.0), (12.4, 8.0), (13.0, 8.3), (13.0, 9.2), (12.2, 9.4), (0.2, 9.5)],
          lambda i, j: stone * (0.92 if j % 2 else 1.0), sides=40, m=TRS(base))
    for i in range(16):
        a = i / 16 * 2 * math.pi
        p = base + np.array([math.cos(a) * 12.42, math.sin(a) * 12.42, 3.6])
        box(build, (0.3, 1.6, 3.4), TRS(p, (0, 0, math.degrees(a))), hx('#0d6f74'), 0.04)
        ball(build, p + np.array([0, 0, 1.7]), 0.82, hx('#0d6f74'), 1, squash=(0.18, 1, 1))
    # A short flight of steps to the door side.
    for k in range(6):
        box(build, (6 - k * 0.2, 1.1, 0.34), TRS(base + np.array([0, -15.2 - k * 0.9, 0.5 - k * 0.34])), stone * 0.9, 0.03)
    # An armillary sphere on a plinth: research as a beautiful object.
    arm = base + np.array([-19.0, -1.0, 0.0])
    lathe(build, [(1.5, -0.8), (1.5, 0.4), (1.1, 0.6), (0.5, 0.8), (0.4, 2.0)], stone * 0.92, sides=12, m=TRS(arm))
    for rot in ((0, 0, 0), (90, 0, 0), (0, 90, 0), (55, 25, 0)):
        a = np.linspace(0, 2 * math.pi, 26)
        ring = np.stack([np.cos(a) * 2.2, np.sin(a) * 2.2, np.zeros(26)], 1)
        ring = xf(ring, TRS(arm + np.array([0, 0, 4.2]), rot))
        tube(build, ring, 0.09, GOLD, sides=5, caps=(False, False))

    # Dome: two shutters that part, and a telescope that lifts between them. Pivots at the dome's base.
    dome_c = base + np.array([0, 0, 9.4])
    domeL, domeR, tele = Geo(), Geo(), Geo()
    ph = np.linspace(0, math.pi / 2, 12)
    for side, dg in ((1, domeR), (-1, domeL)):
        th = np.linspace(0, math.pi, 22) if side > 0 else np.linspace(math.pi, 2 * math.pi, 22)
        rings = []
        for p in ph:
            rings.append(np.stack([np.cos(th + math.pi / 2) * math.cos(p) * 11.8, np.sin(th + math.pi / 2) * math.cos(p) * 11.8, np.full(22, math.sin(p) * 11.8)], 1))
        rings = np.array(rings)
        def domecol(i, j, side=side):
            return mix(hx('#d7893f'), hx('#f0b65c'), i / 11) * (0.94 if j % 2 else 1.0)
        loft(dg, rings, domecol, closed=False)
    lathe(tele, [(0.9, 0.0), (1.05, 0.2), (1.05, 2.6), (1.3, 2.7), (1.3, 3.2), (1.5, 3.3), (1.5, 11.0), (1.72, 11.1), (1.72, 12.4), (1.45, 12.5), (0.2, 12.4)],
          lambda i, j: hx('#23565c') if i < 4 else (GOLD if i in (7, 8) else hx('#2c6f73')), sides=18, m=TRS((0, 0, 0), (0, 0, 0)))
    lathe(tele, [(2.6, -6.0), (2.7, -3.0), (0.9, -0.6), (0.6, 0)], stone * 0.8, sides=14, m=TRS((0, 0, 0)))

    # Lighthouse: white with teal bands, on its own shelf facing the open water.
    lx, ly, lz = cx + light_at[0], cy + light_at[1], light_at[2]
    tower = [(5.2, -1.5), (5.2, 1.2), (4.6, 1.6), (4.4, 6), (3.9, 13), (3.4, 20), (3.05, 27), (3.0, 29), (4.0, 29.8), (4.05, 30.4), (3.0, 30.6)]
    sub = []
    for (a, b), (c, d) in zip(tower, tower[1:]):
        sub += [(a + (c - a) * t, b + (d - b) * t) for t in np.linspace(0, 1, 5)[:-1]]
    sub.append(tower[-1])
    def tcol(i, j):
        z = sub[i][1]
        band = int((z + 1.5) / 6.2) % 2
        return hx('#f4eee1') if band == 0 else hx('#0d7a80')
    lathe(build, sub, tcol, sides=20, m=TRS((lx, ly, lz)))
    lathe(build, [(5.4, 2.0), (5.6, 2.3)], stone, sides=20, m=TRS((lx, ly, lz)))
    for i in range(20):                                 # the gallery rail
        a = i / 20 * 2 * math.pi
        p = np.array([lx + math.cos(a) * 3.9, ly + math.sin(a) * 3.9, lz + 30.4])
        tube(build, [p, p + np.array([0, 0, 1.1])], 0.05, hx('#20383c'), sides=4)
    a = np.linspace(0, 2 * math.pi, 28)
    tube(build, np.stack([lx + np.cos(a) * 3.9, ly + np.sin(a) * 3.9, np.full(28, lz + 31.5)], 1), 0.06, hx('#20383c'), sides=4, caps=(False, False))
    # Lantern room and cap.
    lathe(build, [(2.2, 30.6), (2.25, 30.9), (2.25, 31.0)], hx('#20383c'), sides=16, m=TRS((lx, ly, lz)))
    for i in range(8):
        b = i / 8 * 2 * math.pi
        p = np.array([lx + math.cos(b) * 2.2, ly + math.sin(b) * 2.2, lz + 30.9])
        tube(build, [p, p + np.array([0, 0, 3.4])], 0.09, hx('#20383c'), sides=4)
    lathe(build, [(2.6, 34.3), (2.62, 34.5), (1.5, 35.6), (0.3, 36.4), (0.1, 37.4)], hx('#d7893f'), sides=16, m=TRS((lx, ly, lz)))
    lamp = Geo()
    ball(lamp, (lx, ly, lz + 32.6), 1.55, np.array([1, 0.84, 0.5, 1], np.float32), 2, squash=(1, 1, 1.25))
    # A small keeper's house at its foot.
    hx0 = lx + 7.6
    hy0 = ly - 1.5
    box(build, (7.0, 5.0, 4.0), TRS((hx0, hy0, lz + 2.0), (0, 0, 16)), stone, 0.08)
    rf = [(-3.9, -2.9, 0), (3.9, -2.9, 0), (3.9, 2.9, 0), (-3.9, 2.9, 0), (0, -2.9, 2.2), (0, 2.9, 2.2)]
    build.add(xf(rf, TRS((hx0, hy0, lz + 4.0), (0, 0, 16))), [(0, 1, 4), (3, 5, 2), (1, 2, 5, 4), (0, 4, 5, 3)], hx('#c9593f'))

    ISLES['research'] = (cx, cy, R, h)
    return dict(Research_ground__world=ground, Research_leaf__leaf=leaf, Research_trunk__world=trunk, Research_build__world=build, Research_lamp__lamp=lamp,
                DomeL__world=(domeL, tuple(dome_c)), DomeR__world=(domeR, tuple(dome_c)), Telescope__world=(tele, tuple(dome_c + np.array([0, 0, 1.0])))), (lx, ly, lz + 32.6)


# --------------------------------------------------------------------------------- play
def isle_play():
    """A low sandy island with a fairground on it: a wooden wheel, pinwheels, striped tents, kites and a big bell on a jetty."""
    cx, cy, R = 40.0, 1320.0, 190.0
    ground, leaf, trunk, build, wheel = Geo(), Geo(), Geo(), Geo(), Geo()
    rng = np.random.default_rng(31)
    n = 130

    def h(X, Y):
        wx = X + 22 * (fbm(X * 0.012, Y * 0.012, 3, 61) - 0.5)
        wy = Y + 22 * (fbm(X * 0.012, Y * 0.012, 3, 62) - 0.5)
        d = np.sqrt(wx * wx + wy * wy) / R
        sea = -20 * sstep(0.56, 0.98, d)
        beach = 3.0 * sstep(0.62, 0.42, d)
        dune = 13 * np.exp(-(d / 0.36) ** 2) * (0.8 + 0.4 * fbm(X * 0.03, Y * 0.03, 3, 63))
        H = beach + dune * sstep(0.5, 0.34, d)
        return H + sea

    def paint(X, Y, H, S):
        return base_paint(X, Y, H, S, 23, hx('#9dba4e'), hx('#5c9a58'), ROCK, ROCK_D)

    X, Y, H = terrain(ground, cx, cy, R, n, h, paint)
    S = slope(X, Y, H, X[1, 0] - X[0, 0])
    at = lambda x, y: float(h(np.array([[x]], np.float32), np.array([[y]], np.float32))[0, 0])
    for p in scatter(None, X, Y, H, S, 60, rng, 1.2, 9, 0.5, 25):
        if p[0] ** 2 + (p[1] + 8) ** 2 < 28 ** 2:
            continue
        palm(trunk, p[0] + cx, p[1] + cy, p[2], rng=rng, leaf=leaf)
    for p in scatter(None, X, Y, H, S, 28, rng, 4, 16, 0.7, 26, 0.4):
        if p[0] ** 2 + (p[1] + 8) ** 2 < 34 ** 2:
            continue
        puff_tree(trunk, p[0] + cx, p[1] + cy, p[2], rng.uniform(2.0, 3.2), rng, (hx('#37794e'), hx('#8cab4c')), leaf)

    # Ferris wheel on a pair of A-frames, its axle at wc.
    wc = np.array([cx - 6, cy - 12, at(-6, -12) + 25.0])
    rw = 18.5
    for sx in (-1, 1):
        y = wc[1] + sx * 3.2
        for sy in (-1, 1):
            tube(build, [(wc[0], y, wc[2]), (wc[0] + sy * 12.0, y, at(wc[0] - cx + sy * 12.0, y - cy) - 1.0)], 0.5, WOOD, sides=6)
        tube(build, [(wc[0] - 7.4, y, wc[2] - 12), (wc[0] + 7.4, y, wc[2] - 12)], 0.26, WOOD_D, sides=5)
    # The wheel's parts sit around its own origin. It turns about the world's Y axis.
    ang = np.linspace(0, 2 * math.pi, 49)
    for yy in (-1.6, 1.6):
        tube(wheel, np.stack([np.cos(ang) * rw, np.full(49, yy), np.sin(ang) * rw], 1), 0.34, WOOD, sides=6, caps=(False, False))
        tube(wheel, np.stack([np.cos(ang) * rw * 0.55, np.full(49, yy), np.sin(ang) * rw * 0.55], 1), 0.16, WOOD_D, sides=5, caps=(False, False))
    tube(wheel, [(0, -3.6, 0), (0, 3.6, 0)], 0.7, WOOD_D, sides=10)
    cc = [PINK, YELLOW, TEAL, RED, BLUE, hx('#f6efe0'), hx('#ff8a3c'), hx('#7cc24a')]
    SP = 16
    for i in range(SP):
        a = i / SP * 2 * math.pi
        for yy in (-1.6, 1.6):
            tube(wheel, [(0, yy * 0.4, 0), (math.cos(a) * rw, yy, math.sin(a) * rw)], 0.13, WOOD_D, sides=4)
        tube(wheel, [(math.cos(a) * rw, -1.6, math.sin(a) * rw), (math.cos(a) * rw, 1.6, math.sin(a) * rw)], 0.14, WOOD, sides=4)
        # Bulbs around the rim.
        for yy in (-1.6, 1.6):
            ball(wheel, (math.cos(a + 0.2) * rw * 1.02, yy, math.sin(a + 0.2) * rw * 1.02), 0.28, np.array([1, 0.84, 0.5, 1], np.float32), 1)
    # Gondolas hang from the rim on their own, and the game keeps them upright.
    gond = []
    for i in range(8):
        a = i / 8 * 2 * math.pi
        gg = Geo()
        c = cc[i]
        lathe(gg, [(0.01, -3.1), (1.2, -3.0), (1.55, -2.5), (1.6, -1.6), (1.65, -1.5), (1.65, -1.3)], c, sides=12, caps=(False, False))
        tube(gg, [(1.0, 0, -1.5), (0.6, 0, 0.0), (-0.6, 0, 0.0), (-1.0, 0, -1.5)], 0.05, WOOD_D, sides=4)
        tube(gg, [(0, 1.0, -1.5), (0, 0.6, 0.0), (0, -0.6, 0.0), (0, -1.0, -1.5)], 0.05, WOOD_D, sides=4)
        gond.append(gg)

    # Pinwheels, big toys you could see from the water, on poles around the fairground.
    pins = []
    PINS = [(-34, -36), (22, -40), (36, -14), (-40, -6)]
    for k, (px, py) in enumerate(PINS):
        z0 = at(px, py)
        hh = 12 + (k % 2) * 3
        top = np.array([cx + px, cy + py, z0 + hh])
        tube(build, [(top[0], top[1], z0 - 0.5), tuple(top)], 0.2, hx('#f6efe0'), sides=6)
        pg = Geo()
        r = 5.0
        for b in range(4):
            a = b / 4 * 2 * math.pi
            c = (PINK, YELLOW, TEAL, RED)[(b + k) % 4]
            # Each vane is a curled triangle.
            q = [(0, 0.0, 0), (math.cos(a) * r, 0.0, math.sin(a) * r), (math.cos(a + 0.95) * r * 0.82, 0.8, math.sin(a + 0.95) * r * 0.82), (math.cos(a + 0.5) * r * 0.42, 0.55, math.sin(a + 0.5) * r * 0.42)]
            pg.add(np.array(q), [(0, 1, 3), (1, 2, 3), (3, 1, 0), (3, 2, 1)], c)
        ball(pg, (0, 0.2, 0), 0.5, GOLD, 1)
        pins.append((pg, tuple(top + np.array([0, -0.4, 0]))))

    # Striped tents.
    for k, (px, py, r, a0, a1) in enumerate(((-28, 12, 7.5, PINK, WHITE), (6, 22, 9, TEAL, WHITE), (32, 10, 7, RED, YELLOW), (-8, 40, 6, BLUE, WHITE))):
        z0 = at(px, py) - 0.5
        prof = [(r, 0), (r, 3.4), (r * 1.08, 3.6), (r * 0.5, 6.4), (0.1, 8.8)]
        fine = []
        for (a, b), (c, d) in zip(prof, prof[1:]):
            fine += [(a + (c - a) * t, b + (d - b) * t) for t in np.linspace(0, 1, 3)[:-1]]
        fine.append(prof[-1])
        lathe(build, fine, lambda i, j, a0=a0, a1=a1: a0 if j // 2 % 2 == 0 else a1, sides=24, m=TRS((cx + px, cy + py, z0)))
        tube(build, [(cx + px, cy + py, z0 + 8.6), (cx + px, cy + py, z0 + 10.6)], 0.07, WOOD_D, sides=4)
        tri = np.array([(0, 0, 0), (0, -1.4, -0.32), (0, 0, -0.64)]) + np.array([cx + px, cy + py, z0 + 10.5])
        build.add(tri, [(0, 1, 2), (2, 1, 0)], a0)

    # The jetty and its big bell, reaching towards where you sail in.
    jx0, jy0 = 58.0, -92.0
    z = 2.2
    jdir = np.array([0.55, -0.83])
    plank = hx('#a87a4c')
    for k in range(38):
        p = np.array([jx0 + cx, jy0 + cy]) + jdir * (k * 1.05 - 18)
        box(build, (4.2, 0.92, 0.2), TRS((p[0], p[1], z + 0.4 * math.sin(k)), (0, 0, math.degrees(math.atan2(jdir[1], jdir[0])) - 90)), plank * (0.9 + 0.2 * rng.random()), 0.02)
        if k % 5 == 0:
            perp = np.array([-jdir[1], jdir[0]])
            for s in (-2.1, 2.1):
                q = p + perp * s
                tube(build, [(q[0], q[1], -3), (q[0], q[1], z + 1.2)], 0.2, WOOD_D, sides=6)
    end = np.array([jx0 + cx, jy0 + cy]) + jdir * 22
    # Bell frame at the end of the jetty, big enough to read from the helm.
    perp = np.array([-jdir[1], jdir[0]])
    for s in (-2.2, 2.2):
        q = end + perp * s
        tube(build, [(q[0], q[1], z), (q[0], q[1], z + 8.4)], 0.26, WOOD, sides=6)
    a = end + perp * 2.6
    b = end - perp * 2.6
    tube(build, [(a[0], a[1], z + 8.4), (b[0], b[1], z + 8.4)], 0.3, WOOD_D, sides=6)
    bell = Geo()
    lathe(bell, [(0.15, -0.6), (0.5, -0.7), (0.75, -1.2), (0.86, -2.2), (1.0, -3.2), (1.45, -4.0), (1.5, -4.15), (0.05, -3.9)], hx('#e0a83c'), sides=20)
    tube(bell, [(0, 0, -0.6), (0, 0, 0)], 0.1, WOOD_D, sides=5)
    ball(bell, (0, 0, -4.1), 0.26, hx('#7a5a30'), 1)

    # Kites on long strings, each its own object so it can fly.
    kites = []
    KITES = [(-30, -26, 64, PINK, YELLOW), (24, -34, 70, TEAL, WHITE), (-6, 30, 80, YELLOW, RED)]
    for k, (px, py, zz, a0, a1) in enumerate(KITES):
        kg = Geo()
        s = 3.6
        d = np.array([(0, 0, s * 1.3), (s, 0, s * 0.2), (0, 0, -s * 1.4), (-s, 0, s * 0.2), (0, -0.25, 0)])
        kg.add(d, [(0, 4, 1), (1, 4, 2), (2, 4, 3), (3, 4, 0), (1, 4, 0), (2, 4, 1), (3, 4, 2), (0, 4, 3)], np.array([a0, a1, a0, a1, a0], np.float32))
        # Tail of little bows.
        for i in range(6):
            q = np.array([0.5 * math.sin(i * 0.9), 0, -s * 1.4 - 1.2 * i])
            kg.add(q + np.array([(-0.5, 0, 0.2), (0.5, 0, -0.2), (0.5, 0, 0.2), (-0.5, 0, -0.2)]), [(0, 1, 2), (2, 1, 0), (0, 1, 3), (3, 1, 0)], (a0 if i % 2 else a1))
        anchor = np.array([cx + px, cy + py, at(px, py)])
        kites.append((kg, tuple(anchor + np.array([px * 0.6, py * 0.6, zz])), tuple(anchor)))

    ISLES['play'] = (cx, cy, R, h)
    out = dict(Play_ground__world=ground, Play_leaf__leaf=leaf, Play_trunk__world=trunk, Play_build__world=build, Wheel__world=(wheel, tuple(wc)), Bell__world=(bell, (end[0], end[1], z + 8.4)))
    for i, gg in enumerate(gond):
        a = i / 8 * 2 * math.pi
        out[f'Gondola{i}__world'] = (gg, (wc[0] + math.cos(a) * rw, wc[1], wc[2] + math.sin(a) * rw))
    for i, (pg, pos) in enumerate(pins):
        out[f'Pin{i}__world'] = (pg, pos)
    for i, (kg, pos, anchor) in enumerate(kites):
        out[f'Kite{i}__flag'] = (kg, pos)
    return out, [k[2] for k in kites], (end[0], end[1], z + 8.4)


# --------------------------------------------------------------------------------- the rest of the sea
def islets():
    """Small rocks and sand bars along the way, which give the sea scale and speed."""
    g, lf, tr = Geo(), Geo(), Geo()
    rng = np.random.default_rng(41)
    spots = [(-40, 330, 22), (210, 420, 28), (-170, 280, 16), (150, 640, 20), (-90, 900, 24), (270, 1120, 26), (-340, 1040, 22), (640, 620, 30), (-560, 420, 28), (-30, 620, 14),
             (360, 240, 18), (480, 1240, 22), (-250, 1400, 26)]
    for k, (x, y, r) in enumerate(spots):
        def h(X, Y, r=r, k=k):
            d = np.sqrt(X * X + Y * Y) / r
            n = fbm(X * 0.06, Y * 0.06, 3, 70 + k)
            return (5.5 + r * 0.32 * n * n * (1 + (k % 3))) * np.exp(-(d * (0.75 + 0.5 * n)) ** 2.4) - 4.5 - 10 * sstep(0.9, 2.2, d)

        def paint(X, Y, H, S, k=k):
            return base_paint(X, Y, H, S, 80 + k, hx('#9dba4e'), hx('#5c9a58'), hx('#c79a7c'), hx('#7c5a58'))

        n = 34
        Xs, Ys, Hs = terrain(g, x, y, r * 2.3, n, h, paint)
        Sl = slope(Xs, Ys, Hs, Xs[1, 0] - Xs[0, 0])
        for p in scatter(None, Xs, Ys, Hs, Sl, 2 + k % 4, rng, 0.8, 4, 0.8, 90 + k):
            palm(tr, p[0] + x, p[1] + y, p[2], rng.uniform(7, 11), rng, leaf=lf)
        for p in scatter(None, Xs, Ys, Hs, Sl, 3, rng, -0.5, 6, 3, 95 + k):
            rock(g, p[0] + x, p[1] + y, p[2], rng.uniform(0.8, 2.6), rng)
        ISLES[f'islet{k}'] = (x, y, r * 2.3, h)
    return dict(Islets_ground__world=g, Islets_leaf__leaf=lf, Islets_trunk__world=tr)


def far_isles():
    """Silhouettes a long way off. They only need a shape and a colour, because the haze does the rest."""
    g = Geo()
    rng = np.random.default_rng(51)
    world_c = np.array([60.0, 800.0])
    for k in range(26):
        a = k / 26 * 2 * math.pi + rng.uniform(-0.1, 0.1)
        dist = rng.uniform(1900, 3900)
        x, y = world_c + dist * np.array([math.cos(a), math.sin(a)])
        r = rng.uniform(300, 720)
        hh = rng.uniform(30, 92)
        n = 17
        ring = []
        seed = float(k)
        def shape(X, Y):
            d = np.sqrt(X * X + Y * Y) / r
            nz = fbm(X / r * 3, Y / r * 3, 4, 100 + k)
            nz2 = 1 - np.abs(2 * fbm(X / r * 5, Y / r * 5, 3, 130 + k) - 1)
            return (hh * (0.5 + 0.8 * nz2 * nz) * np.exp(-(d * 1.4) ** 2.2)) - 3
        def paint(X, Y, H, S):
            c = np.zeros(H.shape + (4,), np.float32)
            c[..., :] = hx('#46705e')
            c = mix(c, hx('#8a7f6a'), np.clip(H / max(hh, 1), 0, 1)[..., None] * 0.5)
            c[..., 3] = 1
            return c
        terrain(g, x, y, r * 1.2, n, shape, paint)
    return dict(FarIsles__far=g)


def shore_map(path, W=2800.0, N=1024, cx=60.0, cy=800.0):
    """Top-down depth of the sea as a greyscale PNG: 0 is ashore and 1 is open water. Returns the array for the game's collisions."""
    xs = cx - W / 2 + (np.arange(N) + 0.5) / N * W
    ys = cy - W / 2 + (np.arange(N) + 0.5) / N * W
    X, Y = np.meshgrid(xs, ys, indexing='ij')
    H = np.full((N, N), -30.0, np.float32)
    for name, (ix, iy, R, h) in ISLES.items():
        lx, ly = X - ix, Y - iy
        m = (np.abs(lx) < R) & (np.abs(ly) < R)
        if not m.any():
            continue
        v = h(lx[m], ly[m])
        H[m] = np.maximum(H[m], v)
    depth = np.clip(-H / 30.0, 0, 1)
    # A value of about 0.5 is the waterline, so land and sea stay distinct even after filtering.
    land = np.clip(H / 8.0, 0, 1)
    out = np.clip(depth * 0.75 + 0.25 - land * 0.25, 0, 1)
    img = bpy.data.images.new('shore', N, N, alpha=False, float_buffer=False)
    img.colorspace_settings.name = 'Non-Color'
    px = np.ones((N, N, 4), np.float32)
    # Image rows run from the bottom, X along the row. Index [y, x].
    px[:, :, 0] = out.T
    px[:, :, 1] = out.T
    px[:, :, 2] = out.T
    img.pixels.foreach_set(px.ravel())
    img.filepath_raw = path
    img.file_format = 'PNG'
    img.save()
    return H.T
