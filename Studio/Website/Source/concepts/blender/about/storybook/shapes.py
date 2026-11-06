# Small 2D drawing kit for the storybook's paper pieces. Pure Python, so art.py can be run and checked without Blender.
# Coordinates are thousandths of a page width (u), y up, with a piece's origin on its hinge.
import math, random, re

TAU = math.tau


def lerp(a, b, t):
    return a + (b - a) * t


def smooth(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a) if b != a else 0.0))
    return t * t * (3 - 2 * t)


def circle(cx, cy, r, n=48):
    return [(cx + r * math.cos(TAU * i / n), cy + r * math.sin(TAU * i / n)) for i in range(n)]


def ell(cx, cy, rx, ry, rot=0.0, n=40):
    c, s = math.cos(rot), math.sin(rot)
    out = []
    for i in range(n):
        a = TAU * i / n
        x, y = rx * math.cos(a), ry * math.sin(a)
        out.append((cx + x * c - y * s, cy + x * s + y * c))
    return out


def rect(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


def rrect(x0, y0, x1, y1, r, n=6):
    r = min(r, (x1 - x0) / 2, (y1 - y0) / 2)
    pts = []
    for cx, cy, a0 in ((x1 - r, y0 + r, -90), (x1 - r, y1 - r, 0), (x0 + r, y1 - r, 90), (x0 + r, y0 + r, 180)):
        for i in range(n + 1):
            a = math.radians(a0 + 90 * i / n)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def cr(pts, closed=False, n=10, tension=0.5):
    """A Catmull-Rom spline through the points."""
    P = list(pts)
    m = len(P)
    out = []
    span = m if closed else m - 1
    for i in range(span):
        if closed:
            p0, p1, p2, p3 = P[(i - 1) % m], P[i], P[(i + 1) % m], P[(i + 2) % m]
        else:
            p0, p1, p2, p3 = P[max(i - 1, 0)], P[i], P[i + 1], P[min(i + 2, m - 1)]
        for k in range(n):
            t = k / n
            t2, t3 = t * t, t * t * t
            def f(a, b, c, d):
                m1 = tension * (c - a)
                m2 = tension * (d - b)
                return (2 * t3 - 3 * t2 + 1) * b + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * c + (t3 - t2) * m2
            out.append((f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])))
    if not closed:
        out.append(P[-1])
    return out


def bez(p0, p1, p2, p3, n=16, first=True):
    out = []
    for k in range(0 if first else 1, n + 1):
        t = k / n
        u = 1 - t
        out.append((u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
                    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]))
    return out


TOK = re.compile(r'([MLHVCSQZmlhvcsqz])|(-?\d*\.?\d+(?:e-?\d+)?)')


def svg(d, seg=14):
    """Parses an SVG-style path (M L H V C S Q Z, absolute or relative) into a closed polyline. y stays up."""
    toks = TOK.findall(d)
    i = 0
    cmd = None
    x = y = 0.0
    sx = sy = 0.0
    last_c = None
    out = []
    def num():
        nonlocal i
        v = float(toks[i][1])
        i += 1
        return v
    while i < len(toks):
        if toks[i][0]:
            cmd = toks[i][0]
            i += 1
            if cmd in 'Zz':
                continue
        rel = cmd.islower()
        c = cmd.upper()
        ox, oy = (x, y) if rel else (0.0, 0.0)
        if c == 'M':
            x, y = ox + num(), oy + num()
            sx, sy = x, y
            out.append((x, y))
            cmd = 'l' if rel else 'L'
            last_c = None
        elif c == 'L':
            x, y = ox + num(), oy + num()
            out.append((x, y))
            last_c = None
        elif c == 'H':
            x = ox + num()
            out.append((x, y))
            last_c = None
        elif c == 'V':
            y = oy + num()
            out.append((x, y))
            last_c = None
        elif c in 'CS':
            if c == 'C':
                a = (ox + num(), oy + num())
            else:
                a = (2 * x - last_c[0], 2 * y - last_c[1]) if last_c else (x, y)
            b = (ox + num(), oy + num())
            e = (ox + num(), oy + num())
            out += bez((x, y), a, b, e, seg, first=False)
            last_c = b
            x, y = e
        elif c == 'Q':
            q = (ox + num(), oy + num())
            e = (ox + num(), oy + num())
            a = (x + 2 / 3 * (q[0] - x), y + 2 / 3 * (q[1] - y))
            b = (e[0] + 2 / 3 * (q[0] - e[0]), e[1] + 2 / 3 * (q[1] - e[1]))
            out += bez((x, y), a, b, e, seg, first=False)
            x, y = e
            last_c = None
    if len(out) > 1 and abs(out[0][0] - out[-1][0]) < 1e-6 and abs(out[0][1] - out[-1][1]) < 1e-6:
        out.pop()
    return out


def ribbon(pts, w0, w1=None, cap=False):
    """A polygon following an open polyline, its width running from w0 to w1 along its length."""
    w1 = w0 if w1 is None else w1
    n = len(pts)
    left, right = [], []
    for i, (x, y) in enumerate(pts):
        a = pts[max(i - 1, 0)]
        b = pts[min(i + 1, n - 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        l = math.hypot(dx, dy) or 1
        nx, ny = -dy / l, dx / l
        if callable(w0):
            w = w0(i / (n - 1))
        else:
            w = lerp(w0, w1, i / (n - 1))
        left.append((x + nx * w / 2, y + ny * w / 2))
        right.append((x - nx * w / 2, y - ny * w / 2))
    return left + right[::-1]


def arcs(anchors, bulge=0.5, n=10):
    """Joins the anchors with circular-looking arcs bulging to the left of the direction of travel."""
    out = []
    for (a, b) in zip(anchors, anchors[1:]):
        h = bulge if not isinstance(a, (tuple, list)) or len(a) < 3 else a[2]
        ax, ay, bx, by = a[0], a[1], b[0], b[1]
        mx, my = (ax + bx) / 2, (ay + by) / 2
        dx, dy = bx - ax, by - ay
        nx, ny = -dy, dx
        for k in range(n):
            t = k / n
            s = math.sin(t * math.pi) * h
            out.append((lerp(ax, bx, t) + nx * s, lerp(ay, by, t) + ny * s))
    last = anchors[-1]
    out.append((last[0], last[1]))
    return out


def wobble(pts, amp, wl=60.0, seed=1):
    """Moves a closed outline in and out by a little, the way scissors wander."""
    rng = random.Random(seed)
    ph = [rng.random() * TAU for _ in range(3)]
    n = len(pts)
    out = []
    s = 0.0
    for i, (x, y) in enumerate(pts):
        a = pts[(i - 1) % n]
        b = pts[(i + 1) % n]
        dx, dy = b[0] - a[0], b[1] - a[1]
        l = math.hypot(dx, dy) or 1
        s += math.hypot(x - a[0], y - a[1])
        d = amp * (0.6 * math.sin(s / wl * TAU + ph[0]) + 0.3 * math.sin(s / wl * 2.3 * TAU + ph[1]) + 0.2 * math.sin(s / wl * 5.1 * TAU + ph[2]))
        out.append((x - dy / l * d, y + dx / l * d))
    return out


def xform(pts, x=0.0, y=0.0, s=1.0, rot=0.0, sx=None):
    c, n = math.cos(rot), math.sin(rot)
    sx = s if sx is None else sx
    return [(x + px * sx * c - py * s * n, y + px * sx * n + py * s * c) for px, py in pts]


def flip(pts):
    return [(-x, y) for x, y in pts][::-1]


def star(cx, cy, r0, r1, n, rot=0.0):
    out = []
    for i in range(2 * n):
        a = rot + math.pi * i / n
        r = r0 if i % 2 == 0 else r1
        out.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return out


def crest(w, amp, wl, seed, curl=0.14, n=14, base=0.0, jitter=0.2):
    """A top edge of scalloped waves with cusps that lean over a little, running left to right across width w."""
    rng = random.Random(seed)
    x = -w / 2 - wl * rng.random()
    out = []
    while x < w / 2 + wl:
        l = wl * rng.uniform(1 - jitter, 1 + jitter * 1.3)
        a = amp * rng.uniform(1 - jitter * 1.1, 1 + jitter)
        for k in range(n):
            t = k / n
            # A round trough rising to a sharp crest.
            u = 2 * t - 1
            y = a * (1 - math.sqrt(max(0.0, 1 - u * u)) ** 1.15)
            lean = curl * l * (y / max(a, 1e-3)) ** 3
            out.append((x + t * l + lean, base + y))
        x += l
    # Trim to the width, keeping the ends exactly on it.
    kept = []
    for i, p in enumerate(out):
        if p[0] < -w / 2 or p[0] > w / 2:
            if kept and kept[-1][0] < w / 2 and p[0] > w / 2:
                q = kept[-1]
                t = (w / 2 - q[0]) / (p[0] - q[0])
                kept.append((w / 2, lerp(q[1], p[1], t)))
                break
            if p[0] < -w / 2 and i + 1 < len(out) and out[i + 1][0] >= -w / 2:
                q = out[i + 1]
                t = (-w / 2 - p[0]) / (q[0] - p[0])
                kept.append((-w / 2, lerp(p[1], q[1], t)))
            continue
        kept.append(p)
    return kept


def crest_fill(top, bottom):
    """Closes a left-to-right top edge down to a flat bottom."""
    return [(top[0][0], bottom)] + top + [(top[-1][0], bottom)]


def band(top, d):
    """A band hanging d below a left-to-right top edge. d may be a function of the point's position along the edge."""
    n = len(top)
    low = []
    for i, (x, y) in enumerate(top):
        dd = d(i / (n - 1)) if callable(d) else d
        low.append((x, y - dd))
    return top + low[::-1]


def frond(cx, cy, ang, length, width, droop, teeth=11, seed=1):
    """A palm frond: a curved spine with a smooth upper edge and a toothed lower edge."""
    rng = random.Random(seed)
    n = teeth * 4
    spine = []
    x, y = cx, cy
    a = ang
    side = 1 if math.cos(ang) >= 0 else -1
    for i in range(n + 1):
        t = i / n
        spine.append((x, y, a))
        step = length / n
        x += math.cos(a) * step
        y += math.sin(a) * step
        a -= side * droop * step / length * (0.4 + 1.4 * t)
    up, low = [], []
    for i, (x, y, a) in enumerate(spine):
        t = i / n
        nx, ny = -math.sin(a) * side, math.cos(a) * side
        env = math.sin(math.pi * min(1, t * 1.02)) ** 0.62
        up.append((x + nx * width * 0.34 * env, y + ny * width * 0.34 * env))
        saw = ((i % 4) / 3)
        depth = width * env * (0.45 + 0.75 * saw)
        low.append((x - nx * depth, y - ny * depth))
    return up + low[::-1], [(p[0], p[1]) for p in spine]


class Piece:
    """A paper piece: a stack of cut layers, rendered once as a low relief into the atlas."""

    def __init__(self, name, back='#f2ead8', edge='#fbf6ea', density=1.0, grid=0.0):
        self.name = name
        self.back = back
        self.edge = edge
        self.density = density
        self.grid = grid
        self.layers = []
        self.z = 0
        self.anchors = {}

    def add(self, polys, col, b=None, g=None, r=None, z=None, tex=1.0, lift=1.0, wob=0.0, seed=1, bump=1.0):
        """polys: one outline or a list of outlines (overlapping outlines cut holes, so keep them apart).
        col: colour; b with g=(x0,y0,x1,y1) is a linear wash from col to b, b with r=(cx,cy,radius) a radial one."""
        if polys and isinstance(polys[0][0], (int, float)):
            polys = [polys]
        if wob:
            polys = [wobble(p, wob, seed=seed + i) for i, p in enumerate(polys)]
        if z is None:
            z = self.z
            self.z += 1
        else:
            self.z = max(self.z, z + 1)
        self.layers.append(dict(polys=polys, a=col, b=b, g=g, r=r, z=z, tex=tex, lift=lift, bump=bump))
        return self

    def bounds(self):
        xs, ys = [], []
        for l in self.layers:
            for p in l['polys']:
                xs += [q[0] for q in p]
                ys += [q[1] for q in p]
        return min(xs), min(ys), max(xs), max(ys)
