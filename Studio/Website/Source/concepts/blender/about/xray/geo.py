# Small mesh kit: everything is accumulated into numpy arrays and merged into one mesh per material. Each primitive also
# records its own clean edges, which is what the blueprint pass draws: real topology, not an edge filter.
import numpy as np
from lib import icosphere

class Geo:
    def __init__(self):
        self.v, self.f, self.s, self.c = [], [], [], []
        self.n = 0
        self.wire = []

    def add(self, verts, faces, col, wire=None):
        """faces: list of index tuples (any size), local to verts. col: rgb, or per-vertex (n,3)."""
        verts = np.asarray(verts, np.float32)
        col = np.asarray(col, np.float32)
        if col.ndim == 1:
            col = np.tile(col, (len(verts), 1))
        self.v.append(verts)
        self.c.append(col)
        if isinstance(faces, np.ndarray):
            self.f.append(faces.ravel().astype(np.int32) + self.n)
            self.s.append(np.full(len(faces), faces.shape[1], np.int32))
        else:
            self.f.append(np.array([i for f in faces for i in f], np.int32) + self.n)
            self.s.append(np.array([len(f) for f in faces], np.int32))
        self.n += len(verts)
        if wire is not None and len(wire):
            self.wire.append(np.asarray(wire, np.float32))

    def arrays(self):
        if not self.v:
            return None
        return np.concatenate(self.v), np.concatenate(self.f), np.concatenate(self.s), np.concatenate(self.c)

    def wires(self):
        return np.concatenate(self.wire, 0) if self.wire else np.zeros((0, 2, 3), np.float32)

def rz(p, a):
    c, s = np.cos(a), np.sin(a)
    p = np.asarray(p, np.float32)
    return np.stack([p[..., 0] * c - p[..., 1] * s, p[..., 0] * s + p[..., 1] * c, p[..., 2]], -1)

def box(g, center, size, rot=0.0, col=(1, 1, 1), wire=True, top_scale=1.0):
    cx, cy, cz = center
    sx, sy, sz = np.asarray(size, np.float32) / 2
    b = np.array([(-sx, -sy, -sz), (sx, -sy, -sz), (sx, sy, -sz), (-sx, sy, -sz),
                  (-sx * top_scale, -sy * top_scale, sz), (sx * top_scale, -sy * top_scale, sz), (sx * top_scale, sy * top_scale, sz), (-sx * top_scale, sy * top_scale, sz)], np.float32)
    v = rz(b, rot) + np.array([cx, cy, cz], np.float32)
    f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    w = None
    if wire:
        e = [(0, 1), (1, 2), (2, 3), (3, 0), (4, 5), (5, 6), (6, 7), (7, 4), (0, 4), (1, 5), (2, 6), (3, 7)]
        w = np.stack([np.stack([v[a], v[b_]]) for a, b_ in e])
    g.add(v, f, col, w)

def cyl(g, p0, p1, r0, r1, n=10, col=(1, 1, 1), caps=True, wire=True, wire_rings=True):
    p0, p1 = np.asarray(p0, np.float32), np.asarray(p1, np.float32)
    d = p1 - p0
    L = np.linalg.norm(d) + 1e-6
    d = d / L
    a = np.array([0, 0, 1], np.float32) if abs(d[2]) < 0.9 else np.array([1, 0, 0], np.float32)
    x = np.cross(d, a)
    x /= np.linalg.norm(x)
    y = np.cross(d, x)
    t = np.linspace(0, 2 * np.pi, n, endpoint=False)
    ring = np.cos(t)[:, None] * x + np.sin(t)[:, None] * y
    v = np.concatenate([p0 + ring * r0, p1 + ring * r1])
    f = [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    if caps:
        f.append(tuple(range(n - 1, -1, -1)))
        f.append(tuple(range(n, 2 * n)))
    w = None
    if wire:
        ws = []
        step = max(1, n // 8)
        for i in range(0, n, step):
            ws.append((v[i], v[n + i]))
        if wire_rings:
            for i in range(n):
                ws.append((v[i], v[(i + 1) % n]))
                ws.append((v[n + i], v[n + (i + 1) % n]))
        w = np.array(ws, np.float32)
    g.add(v, f, col, w)

def tube(g, pts, radii, n=6, col=(1, 1, 1), wire=False):
    """A tapered tube along a polyline, with smooth joints."""
    pts = np.asarray(pts, np.float32)
    m = len(pts)
    radii = np.broadcast_to(np.asarray(radii, np.float32), (m,))
    t = np.gradient(pts, axis=0)
    t /= np.linalg.norm(t, axis=1, keepdims=True) + 1e-6
    a = np.array([0.31, 0.2, 0.93], np.float32)
    x = np.cross(t, a)
    x /= np.linalg.norm(x, axis=1, keepdims=True) + 1e-6
    y = np.cross(t, x)
    th = np.linspace(0, 2 * np.pi, n, endpoint=False)
    v = (pts[:, None, :] + radii[:, None, None] * (np.cos(th)[None, :, None] * x[:, None, :] + np.sin(th)[None, :, None] * y[:, None, :])).reshape(-1, 3)
    f = []
    for i in range(m - 1):
        for j in range(n):
            a_, b_ = i * n + j, i * n + (j + 1) % n
            f.append((a_, b_, b_ + n, a_ + n))
    w = np.stack([pts[:-1], pts[1:]], 1) if wire else None
    g.add(v, f, col, w)

_sph = {}
def sphere(sub):
    if sub not in _sph:
        _sph[sub] = icosphere(sub)
    return _sph[sub]

def _lumps(rng, n=6):
    d = rng.normal(size=(n, 3))
    d /= np.linalg.norm(d, axis=1, keepdims=True)
    return d, rng.uniform(1.5, 3.8, n), rng.uniform(0, 6.28, n), rng.uniform(0.3, 1.0, n)

def blob(g, center, radii, rng, sub=3, col_top=(1, 1, 1), col_bot=(0.2, 0.2, 0.2), bump=0.16, rnd=None, wire_sub=None, wire=None):
    """A lumpy ball: the unit of every tree canopy and bush. Colour runs from dark underneath to light on top (a painted AO)."""
    v, f = sphere(sub)
    d, fr, ph, am = _lumps(rng)
    k = np.zeros(len(v), np.float32)
    for i in range(len(d)):
        k += am[i] * np.sin((v @ d[i]) * fr[i] * 2.2 + ph[i])
    k2 = np.zeros(len(v), np.float32)
    d2, fr2, ph2, am2 = _lumps(rng, 5)
    for i in range(len(d2)):
        k2 += am2[i] * np.sin((v @ d2[i]) * fr2[i] * 5.0 + ph2[i])
    p = v * (1 + bump * 0.32 * k + bump * 0.16 * k2)[:, None]
    world = p * np.asarray(radii, np.float32) + np.asarray(center, np.float32)
    shade = np.clip(0.5 + 0.62 * v[:, 2] + 0.08 * k2, 0, 1)
    col = np.asarray(col_bot, np.float32)[None, :] * (1 - shade[:, None]) + np.asarray(col_top, np.float32)[None, :] * shade[:, None]
    # wire: a coarse hull of this blob, real polygons
    w = None
    if wire_sub is not None:
        wv, wf = sphere(wire_sub)
        wp = wv * np.asarray(radii, np.float32) * (1.02) + np.asarray(center, np.float32)
        e = set()
        for a, b, c in wf:
            for x, y in ((a, b), (b, c), (c, a)):
                e.add((min(x, y), max(x, y)))
        e = np.array(sorted(e))
        w = np.stack([wp[e[:, 0]], wp[e[:, 1]]], 1)
    g.add(world, f, col, w)

def arch_panel(g, center, width, height, normal_rot, col, n=8, offset=0.03):
    """A flat arched shape stood on a wall: door or window. center is the base middle, on the wall's surface."""
    hw = width / 2
    rect_h = max(height - hw, 0)
    pts = [(-hw, 0.0), (hw, 0.0)]
    for i in range(n + 1):
        a = i / n * np.pi
        pts.append((hw * np.cos(a), rect_h + hw * np.sin(a)))
    pts = np.array(pts, np.float32)
    # the panel lies in local XZ, facing local -Y
    v = np.stack([pts[:, 0], np.full(len(pts), -offset, np.float32), pts[:, 1]], 1)
    v = rz(v, normal_rot) + np.asarray(center, np.float32)
    g.add(v, [tuple(range(len(pts)))], col)
