# The things on the land: Gulf village, fort tower, lighthouse, dhow, pier, bridge, goal flag, and all the planting.
# Every function appends to Geo objects (geo.py), one per material, so the world stays a handful of merged meshes.
import numpy as np
from lib import *
from geo import *

# plaster and friends, linear
PLASTER = [hx('#fff6e6'), hx('#fdeed8'), hx('#fbe6cf'), hx('#f6dcc0'), hx('#fff9f0')]
SAND = hx('#e7c79a')
WOOD = hx('#8a5a3c')
WOOD_D = hx('#5c3a2a')
SHADE = hx('#0d4a4a')       # door and window recesses: the brand's ink, not black
TEAL = hx('#0f7f7a')
TEAL_D = hx('#075a58')
PINK = hx('#fa2a6f')
CREAM = hx('#fff4df')
STONE = hx('#cdb79c')
LAMP = hx('#ffd27a')

def house(g, x, y, z, w, d, h, rot, rng, wind=False, dome=False, storey=False, awn=False, palette=PLASTER):
    """One Gulf house: thick plaster walls, a stepped parapet, arched openings, roof beams poking through."""
    col = palette[rng.integers(len(palette))] * (0.97 + 0.05 * rng.random())
    c = np.array([x, y, z], np.float32)
    def P(lx, ly, lz):
        return rz(np.array([lx, ly, lz], np.float32), rot) + c
    plinth = 0.5
    box(g['plaster'], P(0, 0, plinth / 2 - 0.15), (w + 0.5, d + 0.5, plinth + 0.3), rot, SAND * 0.95, wire=False)
    box(g['plaster'], P(0, 0, h / 2), (w, d, h), rot, col, top_scale=0.985)
    # flat roof and parapet
    pa = 0.75
    t = 0.32
    box(g['plaster'], P(0, 0, h + 0.03), (w - 0.2, d - 0.2, 0.12), rot, SAND * 1.02, wire=False)
    for sx, sy, lw, ld in ((0, -(d - t) / 2, w, t), (0, (d - t) / 2, w, t), (-(w - t) / 2, 0, t, d), ((w - t) / 2, 0, t, d)):
        box(g['plaster'], P(sx, sy, h + pa / 2), (lw, ld, pa), rot, col, wire=False)
    # stepped merlons along the front and sides
    n = max(3, int(w / 1.05))
    for i in range(n):
        lx = (i + 0.5) / n * w - w / 2
        box(g['plaster'], P(lx, -(d - t) / 2, h + pa + 0.2), (0.42, t, 0.42), rot, col, wire=False, top_scale=0.72)
        box(g['plaster'], P(lx, (d - t) / 2, h + pa + 0.2), (0.42, t, 0.42), rot, col, wire=False, top_scale=0.72)
    # beams (danjal) just under the roof
    for i in range(max(3, int(w / 1.25))):
        lx = (i + 0.5) / max(3, int(w / 1.25)) * w - w / 2
        box(g['wood'], P(lx, -d / 2 - 0.22, h - 0.5), (0.17, 0.5, 0.17), rot, WOOD_D, wire=False)
    # door and windows, on the front face (local -Y) and one side
    door_x = rng.uniform(-0.2, 0.2) * w
    box(g['plaster'], P(door_x, -d / 2 - 0.05, 1.2), (1.75, 0.14, 2.5), rot, col * 0.96, wire=False)
    arch_panel(g['dark'], P(door_x, -d / 2 - 0.12, 0.05), 1.15, 2.2, rot, SHADE)
    for i in range(int(rng.integers(1, 3))):
        lx = (-0.3 + 0.6 * (i / max(1, 1))) * w
        if abs(lx - door_x) < 1.5:
            continue
        lit = rng.random() < 0.3
        arch_panel(g['lit' if lit else 'dark'], P(lx, -d / 2, h * 0.52), 0.7, 1.35, rot, LAMP if lit else SHADE)
    arch_panel(g['dark'], P(w / 2, 0, h * 0.5), 0.7, 1.35, rot + np.pi / 2, SHADE)
    arch_panel(g['dark'], P(-w / 2, 0, h * 0.5), 0.7, 1.35, rot - np.pi / 2, SHADE)
    top = h
    if storey:
        w2, d2, h2 = w * 0.56, d * 0.6, h * 0.62
        ox, oy = rng.uniform(-0.12, 0.12) * w, rng.uniform(0, 0.14) * d
        box(g['plaster'], P(ox, oy, h + h2 / 2), (w2, d2, h2), rot, col * 1.01, top_scale=0.985)
        arch_panel(g['dark'], P(ox, oy - d2 / 2, h + 0.5), 0.8, 1.4, rot, SHADE)
        for sx in (-1, 1):
            box(g['plaster'], P(ox + sx * (w2 - 0.2) / 2, oy, h + h2 + 0.25), (0.2, d2, 0.5), rot, col, wire=False)
        for sy in (-1, 1):
            box(g['plaster'], P(ox, oy + sy * (d2 - 0.2) / 2, h + h2 + 0.25), (w2, 0.2, 0.5), rot, col, wire=False)
    if wind:
        tw = min(w, d) * 0.36
        th = h * 0.86 + 1.6
        ox, oy = -w * 0.26, d * 0.2
        base = h
        box(g['plaster'], P(ox, oy, base + th / 2), (tw, tw, th), rot, col, top_scale=1.04)
        for k in range(4):
            a = rot + k * np.pi / 2
            for s in (-0.28, 0.0, 0.28):
                lx, ly = rz(np.array([s * tw, -tw / 2 - 0.02, 0], np.float32), k * np.pi / 2)[:2]
                arch_panel(g['dark'], P(ox + lx, oy + ly, base + th * 0.55), tw * 0.17, th * 0.4, a, SHADE, n=4, offset=0.02)
        box(g['plaster'], P(ox, oy, base + th + 0.1), (tw + 0.3, tw + 0.3, 0.22), rot, col, wire=False)
        for sx in (-1, 1):
            for sy in (-1, 1):
                box(g['plaster'], P(ox + sx * tw * 0.42, oy + sy * tw * 0.42, base + th + 0.45), (0.3, 0.3, 0.55), rot, col, wire=False, top_scale=0.6)
    if dome:
        r = min(w, d) * 0.36
        ox, oy = w * 0.08, -d * 0.04
        cyl(g['plaster'], P(ox, oy, h), P(ox, oy, h + 0.8), r + 0.1, r + 0.1, 20, col, wire=False)
        v, f = sphere(3)
        sc = np.array([r, r, r * 1.08], np.float32)
        keep = v[:, 2] > -0.02
        vv = v * sc + P(ox, oy, h + 0.8)
        fk = f[keep[f].all(1)]
        idx = -np.ones(len(v), np.int32)
        idx[keep] = np.arange(keep.sum())
        tile = TEAL * (0.9 + 0.2 * rng.random())
        cols = np.tile(tile, (keep.sum(), 1))
        ring = []
        t = np.linspace(0, 2 * np.pi, 13)
        for z_ in (0.25, 0.55, 0.8):
            rr = np.sqrt(1 - z_ * z_)
            pts = np.stack([np.cos(t) * r * rr, np.sin(t) * r * rr, np.full(13, r * 1.08 * z_)], 1) + P(ox, oy, h + 0.8)
            ring += [(pts[i], pts[i + 1]) for i in range(12)]
        g['tile'].add(vv[keep], idx[fk], cols, np.array(ring, np.float32))
    if awn:
        ac = PINK if rng.random() < 0.34 else (hx('#2bb5a8') if rng.random() < 0.5 else CREAM)
        av = rz(np.array([(-1.5, 0, 2.7), (1.5, 0, 2.7), (1.5, -1.5, 2.15), (-1.5, -1.5, 2.15)], np.float32), rot) + P(door_x, -d / 2, 0)
        g['cloth'].add(av, [(0, 1, 2, 3)], ac, np.array([(av[0], av[1]), (av[1], av[2]), (av[2], av[3]), (av[3], av[0])], np.float32))
    return top

def round_tower(g, x, y, z, r, h, rng, col=PLASTER[1], cap=None):
    c = np.array([x, y, z], np.float32)
    cyl(g['plaster'], c + (0, 0, -1), c + (0, 0, h), r * 1.12, r, 28, col)
    cyl(g['plaster'], c + (0, 0, h - 0.5), c + (0, 0, h + 0.7), r * 1.1, r * 1.14, 28, col, wire=False)
    n = 18
    for i in range(n):
        a = i / n * 2 * np.pi
        box(g['plaster'], c + (np.cos(a) * r * 1.05, np.sin(a) * r * 1.05, h + 1.15), (0.85, 0.5, 0.95), a + np.pi / 2, col, wire=False, top_scale=0.75)
    cyl(g['plaster'], c + (0, 0, h + 0.1), c + (0, 0, h + 0.75), r * 0.86, r * 0.86, 22, SAND, wire=False)
    for a in (-1.9, -0.9, 0.4):
        px, py = np.cos(a) * r * 1.03, np.sin(a) * r * 1.03
        arch_panel(g['dark'], c + (px, py, h * 0.66), 0.75, 1.4, a + np.pi / 2, SHADE)
    arch_panel(g['dark'], c + (0, -r * 1.1, 0.0), 1.5, 2.8, 0, SHADE)

def lighthouse(g, x, y, z, s=1.0):
    c = np.array([x, y, z], np.float32)
    H = 26 * s
    R0, R1 = 4.0 * s, 2.3 * s
    bands = 6
    for i in range(bands):
        a, b = i / bands, (i + 1) / bands
        col = CREAM if i % 2 == 0 else hx('#12877f')
        cyl(g['plaster'], c + (0, 0, H * a), c + (0, 0, H * b), lerp(R0, R1, a), lerp(R0, R1, b), 24, col, caps=False)
    cyl(g['plaster'], c + (0, 0, H - 0.1), c + (0, 0, H + 0.6 * s), R1 + 1.0 * s, R1 + 1.0 * s, 24, CREAM)
    cyl(g['lit'], c + (0, 0, H + 0.6 * s), c + (0, 0, H + 3.6 * s), R1 * 0.62, R1 * 0.62, 16, LAMP)
    cyl(g['tile'], c + (0, 0, H + 3.6 * s), c + (0, 0, H + 6.0 * s), R1 * 0.9, 0.2 * s, 16, TEAL_D)
    box(g['plaster'], c + (0, 0, 0), (12 * s, 9 * s, 0.6), 0.2, STONE, wire=False)

def pier(g, a, b, z, width=3.2):
    a, b = np.asarray(a, np.float32), np.asarray(b, np.float32)
    d = b - a
    L = np.linalg.norm(d)
    ang = np.arctan2(d[1], d[0])
    n = int(L / 0.72)
    r = np.random.default_rng(5)
    for i in range(n):
        p = a + d * ((i + 0.5) / n)
        box(g['wood'], (p[0], p[1], z + r.uniform(-0.03, 0.03)), (0.62, width + r.uniform(-0.15, 0.2), 0.18), ang, WOOD * r.uniform(0.85, 1.25), wire=i % 3 == 0)
    m = int(L / 5)
    for i in range(m + 1):
        p = a + d * (i / max(1, m))
        for s in (-1, 1):
            q = p + rz(np.array([0, s * width * 0.52, 0], np.float32), ang)[:2]
            cyl(g['wood'], (q[0], q[1], z - 6), (q[0], q[1], z + 1.8), 0.24, 0.2, 8, WOOD_D)

def dhow(g, x, y, z, rot, s=1.0, sail_col=None):
    """Sindibad's boat: a lofted hull with a raked stern, a long curved prow and a big lateen sail."""
    c = np.array([x, y, z], np.float32)
    def W(p):
        return rz(np.asarray(p, np.float32) * s, rot) + c
    L, B, D = 19.0, 3.0, 3.1
    nu, nv = 42, 11
    verts, cols = [], []
    for i in range(nu):
        u = i / (nu - 1)
        # beam: full aft, fine forward; sheer: rises strongly to the prow and a little to the stern
        beam = B * np.sin(np.pi * (0.04 + 0.92 * u ** 0.85)) ** 0.62
        sheer = 0.55 + 2.6 * max(0, u - 0.68) ** 1.4 * 3.0 + 1.0 * max(0, 0.16 - u) ** 1.2 * 8
        keel = -D * (0.25 + 0.75 * np.sin(np.pi * (0.05 + 0.9 * u)) ** 0.6) + sheer * 0.1
        for j in range(nv):
            v = j / (nv - 1)
            a = (v - 0.5) * np.pi
            yy = np.sin(a) * beam
            zz = lerp(keel, sheer, np.abs(np.cos(a)) ** 0 * (1 - np.cos(a) ** 1.4))
            verts.append((u * L - L / 2, yy, zz))
            h = 1 - np.cos(a) ** 1.4
            col = hx('#a4623a') if h < 0.72 else (hx('#fff1da') if h < 0.84 else hx('#0f7f7a'))
            if h < 0.28:
                col = hx('#f4eadb')
            cols.append(col * (0.95 + 0.1 * ((i // 2) % 2)))
    verts = W(np.array(verts, np.float32))
    f = []
    for i in range(nu - 1):
        for j in range(nv - 1):
            f.append((i * nv + j + 1, i * nv + j, (i + 1) * nv + j, (i + 1) * nv + j + 1))
    wv = verts.reshape(nu, nv, 3)
    w = []
    for i in range(0, nu - 1, 3):
        for j in range(nv - 1):
            w.append((wv[i, j], wv[i, j + 1]))
    for j in range(0, nv, 2):
        for i in range(nu - 1):
            w.append((wv[i, j], wv[i + 1, j]))
    g['hull'].add(verts, f, np.array(cols, np.float32), np.array(w, np.float32))
    # the deck
    box(g['wood'], W((-0.5, 0, 0.1)), (L * 0.84 * s, B * 1.4 * s, 0.14 * s), rot, hx('#b98a5c'), wire=False)
    # stern castle
    box(g['wood'], W((-6.5, 0, 1.0)), (4.4 * s, 3.9 * s, 1.7 * s), rot, hx('#c9976a'))
    box(g['plaster'], W((-6.5, 0, 1.95)), (4.7 * s, 4.2 * s, 0.22 * s), rot, CREAM, wire=False)
    # mast, raked forward
    m0, m1 = W((0.8, 0, 0)), W((3.0, 0, 17.0))
    cyl(g['wood'], m0, m1, 0.3 * s, 0.13 * s, 8, WOOD_D)
    # the yard, long and slanting, heel down at the bow
    y0, y1 = W((12.0, 0.4, 2.8)), W((-8.5, 0.4, 19.5))
    tube(g['wood'], [y0, (y0 + y1) / 2 + (rz(np.array([0, 0, 0.5 * s], np.float32), rot)), y1], [0.09 * s, 0.17 * s, 0.07 * s], 6, WOOD_D)
    # the sail, billowing out to one side
    nu2, nv2 = 26, 16
    sv, sc = [], []
    clew = W((-7.2, 0.5, 3.0))
    for i in range(nu2):
        u = i / (nu2 - 1)
        top = (y0 * (1 - u) + y1 * u)
        for j in range(nv2):
            v = j / (nv2 - 1)
            p = top * (1 - v) + clew * v
            belly = np.sin(np.pi * v * 0.96 + 0.05) * np.sin(np.pi * u) ** 0.8
            p = p + rz(np.array([0, 2.7 * s * belly, 0], np.float32), rot)
            sv.append(p)
            stripe = sail_col if sail_col is not None and (0.72 < v < 0.84) else None
            base = CREAM * (0.98 + 0.02 * (j % 2))
            if stripe is not None:
                base = stripe
            if 0.03 < u % (1 / 6) < 0.05:
                base = base * 0.86     # seams
            sc.append(base)
    sf = []
    for i in range(nu2 - 1):
        for j in range(nv2 - 1):
            sf.append((i * nv2 + j, i * nv2 + j + 1, (i + 1) * nv2 + j + 1, (i + 1) * nv2 + j))
    sv = np.array(sv, np.float32)
    grid = sv.reshape(nu2, nv2, 3)
    sw = []
    for i in range(0, nu2 - 1, 4):
        for j in range(0, nv2 - 1):
            sw.append((grid[i, j], grid[i, j + 1]))
    for j in range(0, nv2, 3):
        for i in range(nu2 - 1):
            sw.append((grid[i, j], grid[i + 1, j]))
    g['sail'].add(sv, sf, np.array(sc, np.float32), np.array(sw, np.float32))
    # ropes
    for a, b in (((12.0, 0.4, 2.8), (9.5, 0, 0.8)), ((-7.2, 0.5, 3.0), (-8, 1.2, 1.5)), ((3.0, 0, 16.5), (-8.0, 1.0, 2.3)), ((3.0, 0, 16.5), (9.0, 0.6, 1.0))):
        tube(g['wood'], [W(a), W(b)], 0.035 * s, 4, WOOD_D, wire=True)
    # pennant at the masthead
    pa = W((-8.5, 0.4, 19.5))
    n = 9
    pv, pc = [], []
    for i in range(n):
        t = i / (n - 1)
        off = rz(np.array([-3.6 * s * t, 0.28 * s * np.sin(t * 7), 0], np.float32), rot)
        pv.append(pa + off + np.array([0, 0, 0.42 * s * (1 - t)], np.float32))
        pv.append(pa + off - np.array([0, 0, 0.42 * s * (1 - t)], np.float32))
        pc += [PINK, PINK]
    g['cloth'].add(np.array(pv, np.float32), [(2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2) for i in range(n - 1)], np.array(pc, np.float32))

def goal_flag(g, x, y, z, h=15.0):
    c = np.array([x, y, z], np.float32)
    # a low stone ring, then the pole and a big pink pennant, the destination of every simulated player
    for i in range(14):
        a = i / 14 * 2 * np.pi
        box(g['stone'], c + (np.cos(a) * 3.2, np.sin(a) * 3.2, 0.15), (1.25, 0.9, 0.72), a + np.pi / 2, STONE * (0.9 + 0.2 * ((i * 7) % 3) / 3), wire=True, top_scale=0.84)
    cyl(g['stone'], c + (0, 0, -0.2), c + (0, 0, 0.8), 1.3, 0.95, 12, STONE)
    cyl(g['plaster'], c + (0, 0, 0.5), c + (0, 0, h), 0.2, 0.13, 10, CREAM)
    # finial
    v, f = sphere(2)
    g['tile'].add(v * 0.42 + (c + (0, 0, h + 0.2)), f, hx('#ffc65c'))
    n = 18
    pv, pc = [], []
    L, H = 8.5, 5.2
    for i in range(n):
        t = i / (n - 1)
        wave = 0.5 * np.sin(t * 6.2 + 0.5) * t ** 0.6
        for k, sign in ((0, 1), (1, -1)):
            pv.append(c + (L * t, wave, h - H / 2 + sign * (H / 2) * (1 - t) ** 0.85))
            pc.append(PINK * (1.0 + 0.12 * np.sin(t * 6.2 + 1.5)))
    fv = [(2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1) for i in range(n - 1)]
    pv = np.array(pv, np.float32)
    g['cloth'].add(pv, fv, np.array(pc, np.float32), np.array([(pv[0], pv[1]), (pv[1], pv[-1]), (pv[-1], pv[0])], np.float32))

def ghaf(g, x, y, z, s, rng, pal, sub=3):
    """A flat-crowned Gulf ghaf tree: a forked trunk under a wide umbrella of lumps."""
    c = np.array([x, y, z], np.float32)
    h = 6.4 * s * rng.uniform(0.85, 1.15)
    lean = rng.normal(0, 0.09, 2)
    top = c + (lean[0] * h, lean[1] * h, h)
    tube(g['wood'], [c + (0, 0, -0.5), c + (lean[0] * h * 0.5, lean[1] * h * 0.5, h * 0.5), top], [0.46 * s, 0.32 * s, 0.2 * s], 7, hx('#6f4e3c'))
    n = int(rng.integers(5, 9))
    R = 4.2 * s
    wired = False
    for i in range(n):
        a = i / n * 2 * np.pi + rng.uniform(-0.4, 0.4)
        rr = R * rng.uniform(0.42, 0.85) if i else 0.0
        p = top + (np.cos(a) * rr, np.sin(a) * rr, rng.uniform(-0.2, 0.9) * s)
        br = s * rng.uniform(1.9, 2.8)
        tube(g['wood'], [top - (0, 0, h * 0.2), p], [0.16 * s, 0.07 * s], 5, hx('#6f4e3c'))
        hi, lo = pal
        blob(g['leaf'], p, (br * 1.2, br * 1.2, br * 0.72), rng, sub, hi * rng.uniform(0.9, 1.12), lo, bump=0.2, wire_sub=1)
    return top

def cypress(g, x, y, z, s, rng, pal):
    c = np.array([x, y, z], np.float32)
    h = 11 * s * rng.uniform(0.85, 1.2)
    tube(g['wood'], [c + (0, 0, -0.4), c + (0, 0, h * 0.2)], [0.24 * s, 0.18 * s], 6, hx('#5a4032'))
    hi, lo = pal
    v, f = sphere(3)
    prof = np.clip(1 - np.abs(v[:, 2]) ** 1.6, 0, 1)
    r = 1.9 * s * rng.uniform(0.85, 1.1)
    k = np.sin(v[:, 2] * 8 + rng.uniform(0, 6)) * 0.08 + np.sin((v[:, 0] + v[:, 1]) * 9 + rng.uniform(0, 6)) * 0.06
    p = np.stack([v[:, 0] * r * (1 + k), v[:, 1] * r * (1 + k), (v[:, 2] * 0.5 + 0.5) ** 1.2 * h * 0.95 + h * 0.08], 1) + c
    shade = np.clip(0.25 + 0.75 * (v[:, 2] * 0.5 + 0.5), 0, 1)[:, None]
    g['leaf'].add(p, f, lo * (1 - shade) + hi * shade)
    wv, wf = sphere(1)
    wp = np.stack([wv[:, 0] * r, wv[:, 1] * r, (wv[:, 2] * 0.5 + 0.5) ** 1.2 * h * 0.95 + h * 0.08], 1) + c
    e = set()
    for a, b, c_ in wf:
        for x_, y_ in ((a, b), (b, c_), (c_, a)):
            e.add((min(x_, y_), max(x_, y_)))
    e = np.array(sorted(e))
    g['leaf'].wire.append(np.stack([wp[e[:, 0]], wp[e[:, 1]]], 1).astype(np.float32))

def palm(g, x, y, z, s, rng, pal):
    """A date palm: a curved ringed trunk and arching, serrated fronds."""
    c = np.array([x, y, z], np.float32)
    h = 9.5 * s * rng.uniform(0.85, 1.25)
    a = rng.uniform(0, 2 * np.pi)
    bend = rng.uniform(0.04, 0.2) * h
    d = np.array([np.cos(a), np.sin(a), 0], np.float32)
    pts = [c + d * bend * (t ** 2) + (0, 0, h * t - 0.3) for t in np.linspace(0, 1, 9)]
    rad = [0.5 * s * (1.12 - 0.5 * t) * (1 + 0.1 * np.sin(t * 40)) for t in np.linspace(0, 1, 9)]
    tube(g['wood'], pts, rad, 7, hx('#8f6c4e'), wire=True)
    top = pts[-1]
    hi, lo = pal
    n = int(rng.integers(13, 18))
    wire = []
    for i in range(n):
        az = i / n * 2 * np.pi * 2.4 + rng.uniform(-0.25, 0.25)
        el = rng.uniform(0.15, 1.05)
        L = 5.4 * s * rng.uniform(0.85, 1.15)
        seg = 13
        dirv = np.array([np.cos(az), np.sin(az), 0], np.float32)
        side = np.array([-np.sin(az), np.cos(az), 0], np.float32)
        spine = []
        for k in range(seg + 1):
            t = k / seg
            spine.append(top + dirv * L * np.sin(t * 1.4) * np.cos(el * 0.6) + np.array([0, 0, L * (np.sin(el) * t - 0.95 * t * t)], np.float32))
        spine = np.array(spine)
        verts, cols, faces = [], [], []
        for k in range(seg + 1):
            t = k / seg
            w = 0.95 * s * np.sin(np.pi * min(1, t * 1.03) ** 0.55) * (1 if k % 2 else 0.62)
            droop = np.array([0, 0, -w * 0.5], np.float32)
            verts += [spine[k] + side * w + droop, spine[k], spine[k] - side * w + droop]
            sh = lo * (1 - t * 0.6) + hi * (0.4 + t * 0.6)
            cols += [sh * 1.08, sh * 0.9, sh * 1.08]
        for k in range(seg):
            for q in range(2):
                faces.append((k * 3 + q, k * 3 + q + 1, (k + 1) * 3 + q + 1, (k + 1) * 3 + q))
        wire += [(spine[k], spine[k + 1]) for k in range(seg)]
        g['frond'].add(np.array(verts, np.float32), faces, np.array(cols, np.float32))
    g['frond'].wire.append(np.array(wire, np.float32))
    return top

def bush(g, x, y, z, s, rng, pal):
    n = int(rng.integers(2, 4))
    hi, lo = pal
    for i in range(n):
        a = rng.uniform(0, 6.28)
        p = (x + np.cos(a) * s * 0.7 * (i > 0), y + np.sin(a) * s * 0.7 * (i > 0), z + s * 0.45)
        r = s * rng.uniform(0.7, 1.05)
        blob(g['leaf'], p, (r, r, r * 0.8), rng, 2, hi * rng.uniform(0.9, 1.15), lo, bump=0.22)

def boulder(g, x, y, z, s, rng, col):
    v, f = sphere(1)
    k = 1 + 0.32 * rng.normal(size=len(v))
    p = v * k[:, None] * np.array([s, s * rng.uniform(0.75, 1.1), s * rng.uniform(0.55, 0.85)], np.float32)
    p = rz(p, rng.uniform(0, 6.28)) + (x, y, z + s * 0.2)
    shade = np.clip(0.45 + 0.55 * v[:, 2], 0, 1)[:, None]
    fn = f
    e = set()
    for a, b, c in f:
        for x_, y_ in ((a, b), (b, c), (c, a)):
            e.add((min(x_, y_), max(x_, y_)))
    e = np.array(sorted(e))
    g['boulder'].add(p, fn, col * (0.6 + 0.5 * shade), np.stack([p[e[:, 0]], p[e[:, 1]]], 1))

def tuft(g, x, y, z, s, rng, col):
    n = int(rng.integers(3, 6))
    verts, faces, cols = [], [], []
    for i in range(n):
        a = rng.uniform(0, 6.28)
        l = rng.uniform(0.6, 1.0) * s
        w = 0.1 * s
        d = np.array([np.cos(a), np.sin(a), 0], np.float32)
        side = np.array([-d[1], d[0], 0], np.float32)
        base = np.array([x, y, z], np.float32) + d * rng.uniform(0, 0.3) * s
        tip = base + d * l * 0.5 + np.array([0, 0, l], np.float32)
        k = len(verts)
        verts += [base - side * w, base + side * w, tip]
        c = col * rng.uniform(0.85, 1.2)
        cols += [c * 0.72, c * 0.72, c * 1.12]
        faces.append((k, k + 1, k + 2))
    g['tuft'].add(np.array(verts, np.float32), faces, np.array(cols, np.float32))

def flower(g, x, y, z, s, col):
    v, f = sphere(0)
    g['tuft'].add(v * s * np.array([1, 1, 0.55], np.float32) + (x, y, z + s), f, col)
