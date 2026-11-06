# The dhow and the hoopoe. Metres, Z up, the bow pointing along +Y, the waterline at Z = 0.
import math
import numpy as np
from lib import *

L = 22.0
TEAK = hx('#7a5230')
TEAK_D = hx('#4f3119')
TEAK_L = hx('#a4733f')
PAINT = hx('#0c6f73')
CREAM = hx('#f3e5c8')
GOLD = hx('#e9a93a')
PINK = hx('#fa2a6f')
ROPE = hx('#c8a878')
IRON = hx('#2c2a2a')

STN = [0, 0.05, 0.14, 0.3, 0.5, 0.72, 0.88, 0.96, 1.0]
BEAM = [1.45, 1.85, 2.3, 2.85, 3.0, 2.55, 1.45, 0.62, 0.06]
SHEER = [5.5, 5.15, 4.45, 3.2, 2.5, 2.7, 3.45, 4.2, 5.0]
KEEL = [-0.15, -0.55, -1.1, -1.5, -1.55, -1.4, -0.75, 0.15, 1.2]
RAKE = [-0.26, -0.22, -0.14, -0.04, 0.0, 0.05, 0.2, 0.42, 0.62]


def station(s):
    return (spline(STN, BEAM, s), spline(STN, SHEER, s), spline(STN, KEEL, s), spline(STN, RAKE, s))


def hull_point(s, t, side=1.0, inset=0.0):
    """A point on the skin: s runs stern to bow, t from the keel to the sheer."""
    b, top, keel, rake = station(s)
    fullness = 0.5 + 0.5 * sstep(0.95, 0.5, s) * sstep(0.0, 0.2, s) + 0.15 * sstep(0.2, 0.0, s)
    x = (b - inset) * np.sin(np.pi / 2 * t ** (0.75 / (0.6 + 0.8 * fullness))) ** (0.75 / (0.45 + 0.75 * fullness))
    x = x * (1 - 0.05 * t ** 8)                                 # a little tumblehome near the rail
    z = keel + (top - keel) * t ** 1.08
    y = -L / 2 + L * s + rake * z
    return np.array([x * side, y, z])


def build_hull():
    hull, inner, trim = Geo(), Geo(), Geo()
    ss = np.concatenate([np.linspace(0, 0.9, 42), np.linspace(0.905, 1.0, 16)])
    ts = np.array([0, 0.1, 0.22, 0.34, 0.44, 0.54, 0.62, 0.68, 0.685, 0.71, 0.715, 0.82, 0.825, 0.86, 0.865, 0.94, 0.945, 1.0])

    def band(t, s):
        # From the waterline up: bare teak, then paint, a gold line, paint and a rail of darker wood.
        if t < 0.685: return TEAK * (0.9 + 0.1 * np.sin(s * 40))
        if t < 0.712: return CREAM
        if t < 0.822: return PAINT
        if t < 0.862: return GOLD
        if t < 0.942: return PAINT * 0.86
        return TEAK_D

    for side in (1, -1):
        rings, cols, uvs = [], [], []
        for s in ss:
            rings.append([hull_point(s, t, side) for t in ts])
            cols.append([band(t, s) for t in ts])
            uvs.append([(s * 22, t * 5.2) for t in ts])
        hull.add(np.array(rings).reshape(-1, 3), grid_faces(len(ss), len(ts), False, flip=side > 0), np.array(cols).reshape(-1, 4), np.array(uvs).reshape(-1, 2))

    # The transom, flat and painted, with a carved panel of little arches.
    tt = np.linspace(0.05, 1, 12)
    a = [hull_point(0, t, 1) for t in tt]
    b = [hull_point(0, t, -1) for t in tt]
    r = np.array([a, b]).transpose(1, 0, 2)
    cols = [PAINT * 0.9 if t > 0.62 else TEAK_D for t in tt]
    loft(hull, r, np.array([[c, c] for c in cols]).reshape(-1, 4), closed=False, flip=True)

    # Inner face of the bulwarks and the deck, which follows the sheer a little below the rail.
    rings_l, rings_r, deck = [], [], []
    for s in ss[:-3]:
        b_, top, _, rake = station(s)
        dz = 0.72 + 0.25 * sstep(0.4, 0.0, s)
        y = -L / 2 + L * s
        for side, rr in ((1, rings_l), (-1, rings_r)):
            p_top = hull_point(s, 1.0, side)
            p_mid = p_top + np.array([-0.16 * side, 0, -dz * 0.5])
            p_low = p_top + np.array([-0.2 * side, 0, -dz])
            rr.append([p_top, p_mid, p_low])
    cols_in = np.array([[TEAK_L * 0.8, TEAK * 0.9, TEAK_D]] * len(rings_l)).reshape(-1, 4)
    inner.add(np.array(rings_l).reshape(-1, 3), grid_faces(len(rings_l), 3, False, flip=True), cols_in)
    inner.add(np.array(rings_r).reshape(-1, 3), grid_faces(len(rings_r), 3, False), cols_in)

    d_rings = []
    for a_, b_ in zip(rings_l, rings_r):
        p0, p1 = a_[2], b_[2]
        r = []
        for u in np.linspace(0, 1, 7):
            p = p0 + (p1 - p0) * u
            p = p + np.array([0, 0, 0.12 * math.sin(math.pi * u)])       # camber
            r.append(p)
        d_rings.append(r)
    d_rings = np.array(d_rings)
    cols = np.array([[mix(TEAK_L, hx('#c99455'), 0.5 + 0.5 * math.sin(i * 0.9 + j * 2.1)) for j in range(7)] for i in range(len(d_rings))]).reshape(-1, 4)
    uvs = np.array([[(j * 1.5, i * 0.42) for j in range(7)] for i in range(len(d_rings))]).reshape(-1, 2)
    inner.add(d_rings.reshape(-1, 3), grid_faces(len(d_rings), 7, False, flip=True), cols, uvs)

    # Rails, with a thick sweep along the sheer.
    for side in (1, -1):
        path = np.array([hull_point(s, 1.0, side) + np.array([0, 0, 0.04]) for s in np.linspace(0, 0.97, 40)])
        tube(trim, path, 0.1, TEAK_D, sides=5, flat=0.75)
        # A small wave of pink along the top strake, the one note of the studio's colour on the boat.
        path = np.array([hull_point(s, 0.84, side) + np.array([0.035 * side, 0, 0]) for s in np.linspace(0.68, 0.965, 16)])
        tube(trim, path, 0.05, PINK, sides=4, flat=0.5)

    # Stem post and its scroll, the shape that says "dhow" from a long way off.
    path = [hull_point(s, 1.0, 0) for s in np.linspace(0.97, 1.0, 3)]
    a0 = np.array(path[-1])
    stem = [hull_point(1.0, t, 0) for t in np.linspace(0.05, 1, 10)]
    curl = []
    for i, u in enumerate(np.linspace(0, 1, 12)):
        ang = -0.35 + u * 2.6
        curl.append(a0 + np.array([0, 0.9 * math.sin(ang) + 0.3 * u, 1.05 * u + 0.5 * math.cos(ang) - 0.46]))
    tube(trim, np.array(stem + curl[1:]), np.concatenate([np.full(10, 0.15), np.linspace(0.15, 0.09, 11)]), TEAK_D, sides=6)
    ball(trim, curl[-1], 0.17, GOLD, 2)

    # Stern post and the raised stern gallery, a low carved rail around the poop deck.
    for side in (1, -1):
        for s in (0.015, 0.05, 0.09, 0.13, 0.17, 0.21):
            p = hull_point(s, 1.0, side) + np.array([-0.05 * side, 0, 0])
            tube(trim, np.array([p, p + np.array([0, 0, 0.55])]), 0.045, TEAK_L, sides=5)
        path = np.array([hull_point(s, 1.0, side) + np.array([-0.05 * side, 0, 0.56]) for s in np.linspace(0.015, 0.21, 8)])
        tube(trim, path, 0.055, GOLD * 0.9, sides=5)
    p0, p1 = hull_point(0.015, 1.0, 1) + np.array([-0.05, 0, 0.56]), hull_point(0.015, 1.0, -1) + np.array([0.05, 0, 0.56])
    tube(trim, line(p0, p1, 3), 0.055, GOLD * 0.9, sides=5)
    # Carved panel across the transom.
    z = hull_point(0, 0.86, 1)[2]
    for i in np.linspace(-1.05, 1.05, 7):
        tube(trim, [(i, -L / 2 + spline(STN, RAKE, 0.0) * z - 0.03, z + d) for d in (-0.34, 0.34)], 0.055, GOLD, sides=4)
    return hull, inner, trim


# Where the yard meets the mast, the point the whole sail swings around.
MAST_FOOT = np.array([0, 2.1, 2.0])
MAST_TOP = np.array([0, 3.15, 16.8])
PIVOT = MAST_FOOT + (MAST_TOP - MAST_FOOT) * 0.74
TACK = np.array([0, 10.6, 3.6]) - PIVOT
PEAK = np.array([0, -11.0, 21.0]) - PIVOT
CLEW = np.array([0, -8.5, 4.05]) - PIVOT


def yard_curve(u):
    """The long spar, whose upper half bends back under the load."""
    p = TACK + (PEAK - TACK) * u
    return p + np.array([0, 0, 0.5 * math.sin(math.pi * u) ** 1.2 + 0.25 * sstep(0.45, 1, u)])


def build_rig():
    mast, yard = Geo(), Geo()
    path = line(MAST_FOOT, MAST_TOP, 8)
    tube(mast, path, np.linspace(0.3, 0.13, 8), TEAK, sides=10)
    # Bands on the mast and a little fighting top.
    for u in (0.2, 0.48, 0.7, 0.78):
        p = MAST_FOOT + (MAST_TOP - MAST_FOOT) * u
        r = 0.3 + (0.13 - 0.3) * u + 0.035
        tube(mast, line(p - np.array([0, 0.02, 0.08]), p + np.array([0, 0.02, 0.08]), 2), r, IRON if u < 0.7 else TEAK_D, sides=10)
    ball(mast, MAST_TOP + np.array([0, 0.02, 0.1]), 0.2, GOLD, 2)

    pts = np.array([yard_curve(u) for u in np.linspace(0, 1, 26)])
    rad = 0.1 + 0.11 * np.sin(np.pi * np.linspace(0, 1, 26)) ** 0.7
    tube(yard, pts, rad, TEAK_L, sides=7)
    # Lashings where the spar is fished together.
    for u in (0.32, 0.38, 0.44, 0.5, 0.56):
        p = yard_curve(u)
        d = yard_curve(u + 0.01) - p
        d /= np.linalg.norm(d)
        tube(yard, [p - d * 0.09, p + d * 0.09], 0.235, ROPE, sides=7)
    return mast, yard


def sail_point(s, t):
    """s runs along the yard from tack to peak, t from the yard down to the foot. All of s = 0 is the tack, and s = 1 is the leech."""
    top = yard_curve(s)
    foot = TACK + (CLEW - TACK) * s + np.array([0, 0, 0.5 * math.sin(math.pi * s)])       # the foot arches up
    return top + (foot - top) * t


def build_sail():
    g = Geo()
    ns, nt = 30, 18
    rings, uvs = [], []
    for i in range(ns + 1):
        s = i / ns
        r, u = [], []
        for j in range(nt + 1):
            t = j / nt
            r.append(sail_point(s, t))
            u.append((s, t))
        rings.append(r)
        uvs.append(u)
    g.add(np.array(rings).reshape(-1, 3), grid_faces(ns + 1, nt + 1), hx('#f6ecd6'), np.array(uvs).reshape(-1, 2))
    return g


def build_pennant():
    g = Geo()
    n = 14
    rings, uvs = [], []
    for i in range(n + 1):
        u = i / n
        h = 0.36 * (1 - u) + 0.03
        rings.append([(0, -3.0 * u, h), (0, -3.0 * u, -h)])
        uvs.append([(u, 1), (u, 0)])
    g.add(np.array(rings).reshape(-1, 3), grid_faces(n + 1, 2), PINK, np.array(uvs).reshape(-1, 2))
    return g


def build_rudder():
    """Rudder and tiller, turning around a post at the stern."""
    g = Geo()
    z0, z1 = -1.0, 3.6
    prof = [(-0.1, z0), (-0.85, z0 + 0.3), (-0.9, 0.5), (-0.3, 1.6), (-0.1, z1)]
    rings = []
    for y, z in prof:
        rings.append([(0.08, y, z), (-0.08, y, z)])
    rings2 = [[(0.08, 0.12, z), (-0.08, 0.12, z)] for _, z in prof]
    r = np.array(rings)
    verts = np.concatenate([r.reshape(-1, 3), np.array(rings2).reshape(-1, 3)])
    n = len(prof)
    faces = []
    for i in range(n - 1):
        a, b = i * 2, (i + 1) * 2
        A, B = a + n * 2, b + n * 2
        faces += [(a + 1, b + 1, B + 1, A + 1), (a, A, B, b), (a, b, b + 1, a + 1)]
    g.add(verts, faces, TEAK_D)
    # The tiller reaches forward over the poop deck.
    tube(g, [(0, 0, z1), (0, 1.0, z1 + 0.5), (0, 2.8, z1 + 0.82), (0, 3.5, z1 + 0.86)], 0.07, TEAK_L, sides=6)
    ball(g, (0, 3.55, z1 + 0.87), 0.1, GOLD, 1)
    return g


def build_cargo():
    g = Geo()
    def on_deck(s, x):
        b, top, _, _ = station(s)
        return (x, -L / 2 + L * s, top - (0.72 + 0.25 * float(sstep(0.4, 0.0, s))) + 0.11 * (1 - (x / max(b, 0.1)) ** 2))

    def barrel(p, r=0.34, h=0.85, c=TEAK):
        prof = [(r * 0.78, 0), (r * 0.82, 0.01), (r * 0.95, h * 0.25), (r, h * 0.5), (r * 0.95, h * 0.75), (r * 0.82, h * 0.99), (r * 0.78, h), (0.001, h - 0.03)]
        def col(i, j):
            if i in (1, 5): return IRON
            return c * (0.85 + 0.25 * math.sin(j * 2.6))
        lathe(g, prof, col, sides=12, m=TRS(p))

    def crate(p, s, rot=0, c=TEAK_L):
        box(g, s, TRS((p[0], p[1], p[2] + s[2] / 2), (0, 0, rot)), c, chamfer=0.03)

    def sack(p, r, c):
        ball(g, (p[0], p[1], p[2] + r * 0.62), r, c, 2, squash=(1, 1.2, 0.72), lump=0.07, seed=p[0] * 3)

    def coil(p, r=0.42):
        for i in range(3):
            a = np.linspace(0, 2 * math.pi, 15)
            ring = np.stack([p[0] + np.cos(a) * (r - i * 0.05), p[1] + np.sin(a) * (r - i * 0.05), np.full(15, p[2] + 0.05 + i * 0.09)], 1)
            tube(g, ring, 0.05, ROPE, sides=5, caps=(False, False))

    # Forward of the mast, a stack of the kind of cargo a Gulf trader carried.
    crate(on_deck(0.62, 1.3), (1.3, 1.1, 0.8), 8)
    crate(on_deck(0.635, 1.25) + np.array([0.05, 0, 0.8]), (0.9, 0.8, 0.55), -12, TEAK)
    crate(on_deck(0.68, -1.2), (1.1, 1.1, 0.9), -10, hx('#a86f39'))
    barrel(on_deck(0.56, -1.6))
    barrel(on_deck(0.53, -1.05), 0.3, 0.72, hx('#7a4a24'))
    sack(on_deck(0.71, 0.4), 0.55, hx('#e8d3a8'))
    sack(on_deck(0.735, -0.3), 0.5, hx('#d2b98c'))
    sack(on_deck(0.765, 0.2), 0.46, hx('#c9593f'))
    sack(on_deck(0.69, 0.75) + np.array([0, 0, 0.45]), 0.42, hx('#2a8f8a'))
    coil(on_deck(0.46, 1.25))
    coil(on_deck(0.82, -0.2), 0.34)

    # Midships: a low awning shelter, sun-faded stripes on four posts.
    z = on_deck(0.33, 0)[2]
    y0, y1 = -L / 2 + L * 0.27, -L / 2 + L * 0.40
    for x in (-1.8, 1.8):
        for y in (y0, y1):
            tube(g, [(x, y, z - 0.1), (x, y, z + 1.9)], 0.05, TEAK_D, sides=5)
    rings, cols = [], []
    cross = np.linspace(-2.05, 2.05, 13)
    for k, y in enumerate(np.linspace(y0 - 0.3, y1 + 0.3, 7)):
        r, c = [], []
        for j, x in enumerate(cross):
            sag = 0.12 * math.sin(k * 0.9 + j * 0.7)
            r.append((x, y, z + 1.92 + 0.42 * (1 - (x / 2.05) ** 2) + sag * 0.3))
            c.append(hx('#f2e4c6') if j % 2 == 0 else hx('#c9593f'))
        rings.append(r)
        cols.append(c)
    g.add(np.array(rings).reshape(-1, 3), grid_faces(7, 13), np.array(cols).reshape(-1, 4))
    # Duplicate so the awning has an underside.
    g.add(np.array(rings).reshape(-1, 3) - np.array([0, 0, 0.02]), grid_faces(7, 13, flip=True), np.array(cols).reshape(-1, 4))

    # A pair of cleats and a pump, little things that catch the eye up close.
    crate(on_deck(0.44, -0.7), (0.5, 0.5, 0.42), 20, TEAK_D)
    barrel(on_deck(0.235, 1.4), 0.3, 0.7)
    sack(on_deck(0.22, -1.45), 0.42, hx('#e8d3a8'))
    return g


def build_lamps():
    """Lanterns: the alpha channel tells the shader these glow, and the glow grows as the sun goes down."""
    g = Geo()
    def lamp(p, r=0.13):
        ball(g, p, r, np.array([1.0, 0.62, 0.2, 1.0], np.float32), 2, squash=(1, 1, 1.3))
    lamp(hull_point(0.0, 1.0, 0) + np.array([0, -0.05, 1.1]), 0.2)
    lamp(np.array([0, 2.5, 7.0]), 0.16)
    return g


def build_lantern_frames():
    g = Geo()
    a = hull_point(0.0, 1.0, 0) + np.array([0, -0.05, 0.0])
    tube(g, [a, a + np.array([0, 0, 0.88])], 0.05, TEAK_D, sides=5)
    b = a + np.array([0, -0.05, 0.86])
    lathe(g, [(0.001, 0.56), (0.26, 0.45), (0.27, 0.42), (0.04, 0.32)], IRON, sides=8, m=TRS(b))
    lathe(g, [(0.2, -0.18), (0.2, -0.13), (0.03, -0.1)], IRON, sides=8, m=TRS(b))
    return g


def build_figure():
    """The steersperson: a small figure at the tiller, wrapped against the wind, whose head turns with the boat."""
    g = Geo()
    fx, fy = 0.0, -L / 2 + L * 0.2
    z = station(0.2)[1] - 0.72 - 0.25 * float(sstep(0.4, 0.0, 0.2)) + 0.1
    SKIN = hx('#b9774a')
    DRESS = hx('#14807d')
    SCARF = hx('#f25a86')
    # A long robe with a bit of movement in its hem.
    prof = [(0.26, 0.0), (0.27, 0.15), (0.22, 0.55), (0.18, 0.86), (0.2, 1.02), (0.17, 1.14), (0.06, 1.2)]
    lathe(g, prof, lambda i, j: DRESS * (0.82 if i < 2 else 1.0), sides=10, m=TRS((fx, fy, z), (0, 0, 0), (1, 0.8, 1)), caps=(True, False))
    # A sash at the waist.
    lathe(g, [(0.205, 0.68), (0.2, 0.76), (0.2, 0.8)], GOLD, sides=10, m=TRS((fx, fy, z), (0, 0, 0), (1, 0.82, 1)))
    # Head and scarf.
    ball(g, (fx, fy + 0.02, z + 1.33), 0.135, SKIN, 2, squash=(0.95, 1, 1.08))
    ball(g, (fx, fy - 0.025, z + 1.35), 0.16, SCARF, 2, squash=(1, 1, 1.08))
    # The scarf's tail streams out behind, as the wind has it.
    tube(g, [(fx, fy - 0.1, z + 1.26), (fx + 0.08, fy - 0.33, z + 1.22), (fx + 0.2, fy - 0.62, z + 1.28), (fx + 0.22, fy - 0.88, z + 1.2)], [0.08, 0.075, 0.06, 0.02], SCARF, sides=5, flat=0.3)
    # Arm reaching out to the tiller.
    tube(g, [(fx + 0.17, fy + 0.02, z + 1.06), (fx + 0.2, fy + 0.2, z + 0.88), (fx + 0.06, fy + 0.42, z + 0.88)], [0.06, 0.055, 0.04], DRESS, sides=5)
    ball(g, (fx + 0.04, fy + 0.44, z + 0.88), 0.05, SKIN, 1)
    tube(g, [(fx - 0.17, fy + 0.02, z + 1.06), (fx - 0.2, fy + 0.2, z + 0.88), (fx - 0.06, fy + 0.42, z + 0.88)], [0.06, 0.055, 0.04], DRESS, sides=5)
    ball(g, (fx - 0.04, fy + 0.44, z + 0.88), 0.05, SKIN, 1)
    return g


def build_rigging():
    """Standing rigging, thin enough to read as lines. The sheet is a separate rope the game stretches every frame."""
    g = Geo()
    top = MAST_FOOT + (MAST_TOP - MAST_FOOT) * 0.86
    for side in (1, -1):
        for s in (0.34, 0.47, 0.58):
            tube(g, line(top, hull_point(s, 1.0, side), 3), 0.022, TEAK_D, sides=3, caps=(False, False))
        # Ratlines would be too fine at this scale, so a few rungs suggest them.
    tube(g, line(MAST_TOP - np.array([0, 0, 0.3]), hull_point(0.975, 1.0, 0), 3), 0.024, TEAK_D, sides=3, caps=(False, False))
    tube(g, line(MAST_TOP - np.array([0, 0, 0.3]), hull_point(0.12, 1.0, 0), 3), 0.024, TEAK_D, sides=3, caps=(False, False))
    return g


# ------------------------------------------------------------------------------------------- the hoopoe
CIN = hx('#e6904a')
CIN_L = hx('#f5bc7c')
BLACK = hx('#17161a')
WHITE = hx('#fbf4e6')


def build_bird():
    """Body at the origin, bill along +Y. Wings, tail and crest are separate so they can flap, fan and rise."""
    body, wl, wr, tail, crest = Geo(), Geo(), Geo(), Geo(), Geo()

    # Body as a loft along its length.
    stations = [(-0.62, 0.05, 0.0), (-0.5, 0.15, 0.0), (-0.26, 0.26, -0.015), (0.0, 0.3, -0.02), (0.26, 0.25, 0.0), (0.42, 0.17, 0.055), (0.5, 0.15, 0.1)]
    sec = np.linspace(0, 2 * math.pi, 14, endpoint=False)
    rings = []
    for y, r, z in stations:
        rings.append(np.stack([np.cos(sec) * r, np.full(14, y), z + np.sin(sec) * r * 0.92], 1))
    def bcol(i, j):
        under = math.sin(sec[j]) < -0.25
        c = mix(CIN, CIN_L, 0.65) if under else CIN
        if i == 0: c = BLACK
        return c
    loft(body, rings, bcol, True, (True, False))

    # Head and bill: the long thin down-curved bill is the bird's signature.
    ball(body, (0, 0.62, 0.17), 0.17, CIN, 2, squash=(0.92, 1.1, 1.0))
    bill = []
    for u in np.linspace(0, 1, 9):
        bill.append((0, 0.74 + 0.68 * u, 0.15 - 0.2 * u * u))
    tube(body, bill, np.linspace(0.042, 0.009, 9), lambda u, j: mix(BLACK, BLACK, u) if u > 0.3 else hx('#3a2a22'), sides=6)
    # Eye.
    for sx in (1, -1):
        ball(body, (0.135 * sx, 0.68, 0.205), 0.034, BLACK, 1)
        ball(body, (0.158 * sx, 0.69, 0.212), 0.012, WHITE, 1)

    # Crest, a fan of cinnamon feathers tipped white and black, pivoting at the crown.
    n = 8
    for i in range(n):
        a = 0.1 + 2.0 * i / (n - 1)            # 0 is forward, then back over the head
        d = np.array([0, math.cos(a), math.sin(a) + 0.2])
        length = 0.27 + 0.1 * math.sin(i / (n - 1) * math.pi)
        w = 0.042
        cols, pts = [], []
        for u, half in ((0, 0.25), (0.45, 0.8), (0.76, 1), (0.8, 1), (0.88, 1), (0.92, 1), (1.0, 0.4)):
            base = d * length * u
            pts.append([(-w * half * 0.5, base[1], base[2]), (w * half, base[1], base[2]), (-w * half, base[1], base[2]), (w * half * 0.5, base[1], base[2] - 0.01)])
            c = CIN_L if u < 0.78 else (WHITE if u < 0.9 else BLACK)
            cols.append([c, c, c, c])
        p = np.array(pts)
        crest.add(p.reshape(-1, 3), grid_faces(p.shape[0], 4, True), np.array(cols).reshape(-1, 4))

    # A wing is a fan of long feathers, barred black and white, which is what you recognise a hoopoe by in flight.
    def wing(g, side):
        feathers = 11
        for i in range(feathers):
            u = i / (feathers - 1)
            root = np.array([0.0, 0.2 - 0.46 * u, 0.0])
            span = 0.82 + 0.5 * math.sin(min(u * 1.1, 1) * math.pi * 0.72)
            sweep = 0.38 - 1.05 * u
            tip = root + np.array([span, sweep * span * 0.7, 0.05])
            w = 0.095 + 0.03 * u
            rows = []
            cols = []
            bars = 7
            for k in range(bars * 2 + 1):
                t = k / (bars * 2)
                c = root + (tip - root) * t
                c[2] += 0.1 * math.sin(math.pi * t)
                perp = np.array([-(tip - root)[1], (tip - root)[0], 0])
                perp /= np.linalg.norm(perp)
                wid = w * (0.5 + 0.5 * math.sin(math.pi * min(t * 1.2 + 0.08, 1)) ** 0.5)
                rows.append([c - perp * wid, c + perp * wid, c - perp * wid * 0.92 + np.array([0, 0, -0.012]), c + perp * wid * 0.92 + np.array([0, 0, -0.012])])
                inner = t < 0.2
                stripe = (k // 2) % 2 == 0
                col = CIN if inner and u < 0.5 else (WHITE if stripe else BLACK)
                cols.append([col] * 4)
            rows = np.array(rows)
            # Top and underside of the feather.
            top = rows[:, :2]
            under = rows[:, 2:]
            g.add(top.reshape(-1, 3) * np.array([side, 1, 1]), grid_faces(len(rows), 2, flip=side > 0), np.array(cols)[:, :2].reshape(-1, 4))
            g.add(under.reshape(-1, 3) * np.array([side, 1, 1]), grid_faces(len(rows), 2, flip=side < 0), np.array(cols)[:, 2:].reshape(-1, 4))
    wing(wr, 1)
    wing(wl, -1)

    # Tail: a broad black fan with one white band.
    for i in range(7):
        a = (i - 3) / 3 * 0.34
        length = 0.82
        pts, cols = [], []
        for t in np.linspace(0, 1, 7):
            c = np.array([math.sin(a) * length * t, -math.cos(a) * length * t, -0.03 * t])
            perp = np.array([math.cos(a), math.sin(a), 0])
            w = 0.06 + 0.04 * t
            pts.append([c - perp * w, c + perp * w, c + perp * w * 0.9 + np.array([0, 0, -0.01]), c - perp * w * 0.9 + np.array([0, 0, -0.01])])
            col = WHITE if 0.44 < t < 0.7 else BLACK
            cols.append([col] * 4)
        p = np.array(pts)
        tail.add(p.reshape(-1, 3), grid_faces(p.shape[0], 4, True), np.array(cols).reshape(-1, 4))
    return body, wl, wr, tail, crest


def build_fish():
    """A leaping fish for the play island, nose along +Y, about two metres long."""
    g = Geo()
    st = [(-0.95, 0.02), (-0.7, 0.1), (-0.3, 0.26), (0.05, 0.32), (0.45, 0.27), (0.8, 0.16), (1.0, 0.03)]
    sec = np.linspace(0, 2 * math.pi, 10, endpoint=False)
    rings = []
    for y, r in st:
        rings.append(np.stack([np.cos(sec) * r * 0.7, np.full(10, y), np.sin(sec) * r], 1))
    def col(i, j):
        up = math.sin(sec[j])
        return mix(hx('#fbf6e8'), mix(hx('#21a6a6'), hx('#0b6a78'), 0.5), sstep(-0.3, 0.45, up))
    loft(g, rings, col, True, (True, True))
    # Tail and fins.
    tail = [(-0.9, 0), (-1.45, 0.55), (-1.26, 0), (-1.45, -0.55)]
    v = np.array([(0, y, z) for y, z in tail], float)
    pink = hx('#fa5a8f')
    g.add(v, [(0, 1, 2), (0, 2, 3), (2, 1, 0), (3, 2, 0)], pink)
    dorsal = [(0.35, 0.28), (-0.35, 0.22), (-0.15, 0.62)]
    v = np.array([(0, y, z) for y, z in dorsal], float)
    g.add(v, [(0, 1, 2), (2, 1, 0)], pink)
    for s in (1, -1):
        fin = [(s * 0.18, 0.3, -0.08), (s * 0.18, -0.05, -0.1), (s * 0.68, -0.15, -0.3)]
        g.add(np.array(fin), [(0, 1, 2), (2, 1, 0)], pink)
        ball(g, (s * 0.2, 0.68, 0.06), 0.052, hx('#17161a'), 1)
    return g


def build_gull():
    """A seabird for the distance: a body and two long wings in one mesh. Alpha is how far each point moves when it flaps."""
    g = Geo()
    w = hx('#fbf6ea', 0.0)
    ball(g, (0, 0, 0), 0.5, w, 1, squash=(0.42, 1.4, 0.42))
    span = 2.6
    for s in (1, -1):
        v = np.array([(s * 0.1, 0.34, 0), (s * 0.1, -0.34, 0), (s * span * 0.55, -0.16, 0.06), (s * span * 0.55, 0.4, 0.06), (s * span, -0.3, -0.05), (s * span * 1.02, -0.5, -0.07)], float)
        c = np.array([hx('#fbf6ea', 0.0), hx('#fbf6ea', 0.0), hx('#fbf6ea', 0.45), hx('#fbf6ea', 0.45), hx('#3a3a44', 1.0), hx('#3a3a44', 1.0)], np.float32)
        f = [(0, 3, 2), (0, 2, 1), (3, 5, 4), (3, 4, 2), (2, 3, 0), (1, 2, 0), (4, 5, 3), (2, 4, 3)]
        g.add(v, f, c)
    return g
