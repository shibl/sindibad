# Models and rigs the hoopoe, bakes its occlusion, paints its feather atlas and writes the runtime files.
#   nice -n 10 Blender -b --factory-startup -P concepts/blender/about/hoopoe/build.py
# Env: OUT=<dir for hoopoe-mesh.bin and hoopoe-atlas.webp> BLEND=<dir for hoopoe.blend> AO=0 skips the bake while drafting.
import json
import math
import os
import random
import struct
import sys
import time

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Quaternion, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import rig
from rig import (ANKLE, BALL, BILL_B, CREST_N, ELBOW, EYE_AXIS, EYE_C, EYE_R, EYE_S, EYE_U, HAND, HEAD_C, HIP, KNEE,
                 SHOULDER, TAIL_DIR, TAIL_ROOT, WRIST, crest_frame, wing_dir)

REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
OUT = os.environ.get('OUT', os.path.join(REPO, 'public', 'about', 'hoopoe'))
BLEND = os.environ.get('BLEND', HERE)
DO_AO = os.environ.get('AO', '1') == '1'
T0 = time.time()
random.seed(7)
RNG = np.random.default_rng(7)


def log(*a):
    print(f'[{time.time() - T0:6.1f}s]', *a, flush=True)


def hx(s):
    s = s.lstrip('#')
    return np.array([int(s[i:i + 2], 16) / 255 for i in (0, 2, 4)], np.float32)


def sstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


# ------------------------------------------------------------------------------------------------- the body as a signed distance
def rot_x(deg):
    a = math.radians(deg)
    c, s = math.cos(a), math.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]], np.float32)


def ell(p, c, r, R=None):
    q = p - np.asarray(c, np.float32)
    if R is not None:
        q = q @ R
    r = np.asarray(r, np.float32)
    k0 = np.linalg.norm(q / r, axis=-1)
    k1 = np.linalg.norm(q / (r * r), axis=-1)
    return k0 * (k0 - 1) / np.maximum(k1, 1e-6)


def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b * (1 - h) + a * h - k * h * (1 - h)


def smax(a, b, k):
    return -smin(-a, -b, k)


def cone(p, a, b, ra, rb):
    a = np.asarray(a, np.float32)
    b = np.asarray(b, np.float32)
    ba = b - a
    t = np.clip(((p - a) @ ba) / (ba @ ba), 0, 1)
    return np.linalg.norm(p - a - t[..., None] * ba, axis=-1) - (ra + (rb - ra) * t)


R_BODY = rot_x(-34)
SOCKET_R = EYE_R * 1.01


def sdf(p):
    ax = np.abs(p[..., 0])
    m = np.stack([ax, p[..., 1], p[..., 2]], -1)  # mirrored, so everything is symmetric
    d = ell(m, (0, 0.10, 0.83), (0.325, 0.60, 0.415), R_BODY)
    d = smin(d, ell(m, (0, -0.15, 0.95), (0.295, 0.31, 0.34)), 0.12)    # breast
    d = smin(d, ell(m, (0, 0.05, 0.67), (0.27, 0.37, 0.235)), 0.12)     # belly
    d = smin(d, ell(m, (0, 0.50, 0.68), (0.15, 0.30, 0.11), rot_x(22)), 0.12)  # rump into the tail
    d = smin(d, cone(m, (0, -0.12, 1.06), (0, -0.30, 1.40), 0.215, 0.185), 0.10)  # neck
    h = ell(m, HEAD_C, (0.292, 0.345, 0.298))
    h = smin(h, ell(m, (0.145, -0.47, 1.43), (0.145, 0.19, 0.135)), 0.07)   # cheeks
    h = smin(h, ell(m, (0.125, -0.53, 1.655), (0.12, 0.13, 0.07)), 0.055)   # brows
    h = smin(h, ell(m, (0, -0.60, 1.475), (0.098, 0.15, 0.098)), 0.07)      # bill base
    d = smin(d, h, 0.06)
    d = smin(d, ell(m, (0.155, 0.02, 0.52), (0.115, 0.135, 0.15)), 0.09)    # feathered thighs
    # The eye sockets.
    s = np.linalg.norm(m - np.asarray(EYE_C, np.float32), axis=-1) - SOCKET_R
    d = smax(d, -s, 0.022)
    return d


def sdf_grad(p, h=0.004):
    n = np.stack([
        sdf(p + np.array([h, 0, 0], np.float32)) - sdf(p - np.array([h, 0, 0], np.float32)),
        sdf(p + np.array([0, h, 0], np.float32)) - sdf(p - np.array([0, h, 0], np.float32)),
        sdf(p + np.array([0, 0, h], np.float32)) - sdf(p - np.array([0, 0, h], np.float32)),
    ], -1)
    return n / np.maximum(np.linalg.norm(n, axis=-1, keepdims=True), 1e-6)


def project(p, it=4):
    p = np.asarray(p, np.float32)
    for _ in range(it):
        p = p - sdf(p)[..., None] * sdf_grad(p)
    return p


def surface_nets(lo, hi, dx):
    n = [int(math.ceil((hi[i] - lo[i]) / dx)) + 1 for i in range(3)]
    ax = [lo[i] + dx * np.arange(n[i], dtype=np.float32) for i in range(3)]
    G = np.stack(np.meshgrid(*ax, indexing='ij'), -1)
    V = sdf(G)
    s = V < 0
    any_ = np.zeros([k - 1 for k in n], bool)
    all_ = np.ones([k - 1 for k in n], bool)
    for a in (0, 1):
        for b in (0, 1):
            for c in (0, 1):
                q = s[a:n[0] - 1 + a, b:n[1] - 1 + b, c:n[2] - 1 + c]
                any_ |= q
                all_ &= q
    active = any_ & ~all_
    ids = np.argwhere(active)
    idx = -np.ones(active.shape, np.int64)
    idx[active] = np.arange(len(ids))
    total = np.zeros((len(ids), 3), np.float32)
    count = np.zeros(len(ids), np.float32)
    cube = [(0, 0, 0), (1, 0, 0), (0, 1, 0), (1, 1, 0), (0, 0, 1), (1, 0, 1), (0, 1, 1), (1, 1, 1)]
    edges = [(0, 1), (2, 3), (4, 5), (6, 7), (0, 2), (1, 3), (4, 6), (5, 7), (0, 4), (1, 5), (2, 6), (3, 7)]
    for e0, e1 in edges:
        a = np.array(cube[e0])
        b = np.array(cube[e1])
        ia = ids + a
        ib = ids + b
        va = V[ia[:, 0], ia[:, 1], ia[:, 2]]
        vb = V[ib[:, 0], ib[:, 1], ib[:, 2]]
        x = (va < 0) != (vb < 0)
        t = va[x] / (va[x] - vb[x])
        total[x] += ia[x] + t[:, None] * (b - a)
        count[x] += 1
    verts = np.asarray(lo, np.float32) + total / count[:, None] * dx
    quads = []
    for axis in range(3):
        o1, o2 = [(1, 2), (2, 0), (0, 1)][axis]
        sl = [slice(None)] * 3
        sl[axis] = slice(0, -1)
        sh = [slice(None)] * 3
        sh[axis] = slice(1, None)
        cross = s[tuple(sl)] != s[tuple(sh)]
        w = np.argwhere(cross)
        w = w[(w[:, o1] > 0) & (w[:, o2] > 0) & (w[:, o1] < n[o1] - 1) & (w[:, o2] < n[o2] - 1)]
        for gi in w:
            c = []
            for d1, d2 in ((0, 0), (1, 0), (1, 1), (0, 1)):
                q = gi.copy()
                q[o1] += d1 - 1
                q[o2] += d2 - 1
                c.append(idx[tuple(q)])
            if min(c) < 0:
                continue
            inside = s[tuple(gi)]
            quads.append(c if inside else c[::-1])
    return verts, np.array(quads, np.int64)


def decimated_body(target):
    v, q = surface_nets((-0.62, -0.92, 0.26), (0.62, 1.05, 1.92), 0.0125)
    log(f'surface nets {len(v):,} verts {len(q):,} quads')
    samples = project(v[::1], 2)
    me = bpy.data.meshes.new('sdfbody')
    me.from_pydata(samples.tolist(), [], q.tolist())
    me.update()
    ob = bpy.data.objects.new('sdfbody', me)
    bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    # Keep more triangles in the face than in the belly.
    vg = ob.vertex_groups.new(name='detail')
    fv = np.linalg.norm(samples * np.array([1, 1, 1]) - np.array([0, -0.5, 1.5]), axis=-1)
    w = 1 - sstep(0.15, 0.48, fv)
    for i, wi in enumerate(w.tolist()):
        vg.add([i], 0.15 + 0.85 * (1 - wi), 'REPLACE')
    dm = ob.modifiers.new('dec', 'DECIMATE')
    dm.decimate_type = 'COLLAPSE'
    dm.ratio = target / (2 * len(q))
    dm.use_symmetry = True
    dm.symmetry_axis = 'X'
    dm.vertex_group = 'detail'
    dm.vertex_group_factor = 1.0
    bpy.ops.object.modifier_apply(modifier='dec')
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    P = np.array([list(x.co) for x in bm.verts], np.float32)
    F = np.array([[x.index for x in f.verts] for f in bm.faces], np.int64)
    bm.free()
    bpy.data.objects.remove(ob, do_unlink=True)
    bpy.data.meshes.remove(me)
    P = project(P, 4)
    log(f'body decimated to {len(P):,} verts {len(F):,} tris')
    return P, F, samples


# -------------------------------------------------------------------------------------------------- the painted feather atlas
ATLAS_W, ATLAS_H = 1024, 1024
CELL_W, CELL_H = 128, 512
CELLS = {
    'pri_out': 0, 'pri_in': 1, 'sec': 2, 'ter': 3, 'cov_g': 4, 'cov_m': 5, 'cov_l': 6, 'tail': 7,
    'crest': 8, 'crest_side': 9, 'body': 10, 'fluff': 11, 'plain': 12, 'iris': 13, 'back_bar': 14, 'scap': 15,
}
RUST = hx('#dc6a2c')
RUST_D = hx('#b84a1c')
RUST_L = hx('#ee8c4c')
PEACH = hx('#f4b078')
CREAM = hx('#fbe9d0')
BLACK = hx('#17181f')
WHITE = hx('#f7f3e8')
PINK = hx('#fa2a6f')


def noise2(h, w, sx, sy, seed):
    """Smooth value noise, stretched by (sx, sy) cells."""
    rng = np.random.default_rng(seed)
    g = rng.random((sy + 2, sx + 2)).astype(np.float32)
    yy = np.linspace(0, sy, h, endpoint=False)
    xx = np.linspace(0, sx, w, endpoint=False)
    y0 = yy.astype(int)
    x0 = xx.astype(int)
    fy = (yy - y0)[:, None]
    fx = (xx - x0)[None, :]
    fy = fy * fy * (3 - 2 * fy)
    fx = fx * fx * (3 - 2 * fx)
    a = g[np.ix_(y0, x0)]
    b = g[np.ix_(y0, x0 + 1)]
    c = g[np.ix_(y0 + 1, x0)]
    d = g[np.ix_(y0 + 1, x0 + 1)]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def paint_feather(bands, seed, skew=0.14, rachis=None, rachis_amt=0.55, streak=0.07, edge=0.2, soft=0.012, base_dark=0.3):
    """bands: list of (v, colour) from the root (v = 0) to the tip (v = 1). Colours hold from their v to the next band's."""
    h, w = CELL_H, CELL_W
    V = (np.arange(h, dtype=np.float32) + 0.5)[:, None] / h
    U = (np.arange(w, dtype=np.float32) + 0.5)[None, :] / w * 2 - 1
    V = np.broadcast_to(V, (h, w))
    U = np.broadcast_to(U, (h, w))
    wob = (noise2(h, w, 6, 18, seed) - 0.5) * 0.018
    Vs = V - skew * np.abs(U) + wob
    col = np.broadcast_to(np.asarray(bands[0][1], np.float32), (h, w, 3)).copy()
    for vb, c in bands[1:]:
        t = sstep(vb - soft, vb + soft, Vs)[..., None]
        col = col * (1 - t) + np.asarray(c, np.float32) * t
    # Barbs: fine streaks running out from the shaft toward the tip.
    bar = noise2(h, w, 5, 90, seed + 1) * 0.6 + noise2(h, w, 9, 170, seed + 2) * 0.4
    col *= (1 + streak * (bar - 0.5) * 2)[..., None]
    col *= (1 - edge * sstep(0.55, 1.0, np.abs(U)))[..., None]
    col *= (1 - base_dark * (1 - sstep(0.0, 0.3, V)))[..., None]
    if rachis is not None:
        r = np.exp(-(U / (0.05 * (1.15 - V))) ** 2) * (1 - 0.65 * sstep(0.6, 1.0, V))
        col = col * (1 - rachis_amt * r[..., None]) + np.asarray(rachis, np.float32) * (rachis_amt * r[..., None])
    return np.clip(col, 0, 1)


def paint_iris():
    h, w = CELL_H, CELL_W
    col = np.zeros((h, w, 3), np.float32)
    y = ((np.arange(w) + 0.5) / w * 2 - 1)[:, None]
    x = ((np.arange(w) + 0.5) / w * 2 - 1)[None, :]
    r = np.sqrt(x * x + y * y).astype(np.float32)
    ang = np.arctan2(y, x)
    rays = 0.5 + 0.5 * np.sin(ang * 34 + 2 * np.sin(ang * 5))
    sclera = hx('#f8f1e4')
    limbal = hx('#1c1210')
    amber = hx('#f9a93a')
    deep = hx('#a24c12')
    c = np.broadcast_to(sclera, (w, w, 3)).copy()
    # The sclera shades toward the socket.
    c *= (1 - 0.3 * sstep(0.5, 0.9, r))[..., None]
    IR, PU = 0.5, 0.262
    t = sstep(PU, IR, r)[..., None]
    iris = deep * (1 - t) + amber * t
    iris = iris * (0.86 + 0.28 * rays[..., None])
    m = (1 - sstep(IR - 0.012, IR + 0.012, r))[..., None]
    c = c * (1 - m) + iris * m
    lim = np.exp(-((r - IR) / 0.022) ** 2)[..., None]
    c = c * (1 - 0.9 * lim) + limbal * (0.9 * lim)
    pu = (1 - sstep(PU - 0.012, PU + 0.012, r))[..., None]
    c = c * (1 - pu) + hx('#07070a') * pu
    col[:] = c[0, 0]  # fill the rest of the cell
    col[:w, :] = c
    return np.clip(col, 0, 1)


# The folded wing's axis runs from about -0.5 at the wrist to 0.8 past the primaries' tips. V = (a + 0.5) / 1.3.
BARS = [(-0.5, 'k'), (-0.07, 'w'), (0.035, 'k'), (0.135, 'w'), (0.24, 'k'), (0.335, 'w'), (0.44, 'k'), (0.535, 'w'), (0.625, 'k')]
AXIS_F = Vector((0, 0.93, -0.35)).normalized()


def bar_bands():
    return [((a + 0.5) / 1.3, BLACK if c == 'k' else WHITE) for a, c in BARS]


def bar_vr(root_folded, L):
    a = root_folded.dot(AXIS_F)
    return ((a + 0.5) / 1.3, (a + L + 0.5) / 1.3)


def paint_atlas():
    A = np.zeros((ATLAS_H, ATLAS_W, 3), np.float32)
    W2 = WHITE
    D = BLACK
    cells = {
        # Primaries: black with one broad white band, the hoopoe's signature.
        # The hoopoe's signature: broad bars, painted against a single axis along the folded wing, so they line up across
        # the stacked feathers. See BAR_V for how feathers sample this.
        'pri_out': paint_feather(bar_bands(), 1, skew=0.018, rachis=(0.5, 0.5, 0.5), rachis_amt=0.26, soft=0.0045, base_dark=0, edge=0.26),
        'pri_in': paint_feather(bar_bands(), 2, skew=0.018, rachis=(0.5, 0.5, 0.5), rachis_amt=0.26, soft=0.0045, base_dark=0, edge=0.26),
        'sec': paint_feather(bar_bands(), 3, skew=0.018, rachis=(0.45, 0.45, 0.45), rachis_amt=0.26, soft=0.0045, base_dark=0, edge=0.26),
        'ter': paint_feather([(0, D), (0.2, CREAM), (0.36, D), (0.52, CREAM), (0.68, D), (0.84, hx('#f7e4c6'))], 4, skew=0.02, rachis=(0.5, 0.45, 0.4), rachis_amt=0.3, base_dark=0),
        'cov_g': paint_feather([(0, D), (0.68, W2)], 5, skew=0.06, rachis=(0.5, 0.5, 0.5), rachis_amt=0.25, base_dark=0),
        'cov_m': paint_feather([(0, RUST_D), (0.38, D), (0.82, hx('#f5e6cf'))], 6, skew=0.05, base_dark=0),
        'cov_l': paint_feather([(0, RUST_D), (0.35, RUST), (0.8, RUST_L)], 7, skew=0.08, streak=0.05),
        # The tail: black, with a white crescent across it.
        'tail': paint_feather([(0, D), (0.585, W2), (0.745, D)], 8, skew=-0.1, rachis=(0.5, 0.5, 0.5), rachis_amt=0.3, soft=0.008),
        # Crest: rust, a sliver of the brand's pink, white, a black tip.
        'crest': paint_feather([(0, RUST_D), (0.2, RUST), (0.5, RUST_L), (0.735, PINK), (0.78, W2), (0.835, D)], 9, skew=0.1, soft=0.006, rachis=RUST_D, rachis_amt=0.4, edge=0.14, base_dark=0.15),
        'crest_side': paint_feather([(0, RUST_D), (0.2, RUST), (0.5, RUST_L), (0.76, W2), (0.835, D)], 10, skew=0.1, soft=0.006, rachis=RUST_D, rachis_amt=0.4, edge=0.14, base_dark=0.15),
        # Body feathers are near white, because vertex colours tint them.
        'body': paint_feather([(0, (0.93, 0.93, 0.93)), (0.5, (1, 1, 1)), (0.86, (1.04, 1.04, 1.04))], 11, skew=0.2, streak=0.07, edge=0.05, rachis=(0.88, 0.88, 0.88), rachis_amt=0.2, base_dark=0.1, soft=0.2),
        'fluff': paint_feather([(0, (0.9, 0.9, 0.9)), (0.6, (1, 1, 1))], 12, skew=0.3, streak=0.09, edge=0.1, base_dark=0.2, soft=0.2),
        'plain': np.ones((CELL_H, CELL_W, 3), np.float32),
        'iris': paint_iris(),
        'back_bar': paint_feather([(0, D), (0.42, W2), (0.74, D)], 13, skew=0.12, rachis=(0.5, 0.5, 0.5), rachis_amt=0.2),
        'scap': paint_feather([(0, RUST_D), (0.45, RUST), (0.72, D), (0.9, CREAM)], 14, skew=0.1),
    }
    for name, img in cells.items():
        i = CELLS[name]
        col = i % 8
        row = i // 8
        A[row * CELL_H:(row + 1) * CELL_H, col * CELL_W:(col + 1) * CELL_W] = img
    return A


def cell_uv(name, u, v):
    """u is across (-1 to 1), v along (0 to 1), in the named cell."""
    i = CELLS[name]
    cu = ((i % 8) + 0.5 + 0.5 * 0.94 * u) * CELL_W / ATLAS_W
    cv = ((i // 8) + 0.012 + 0.976 * v) * CELL_H / ATLAS_H
    return cu, cv


def iris_uv(px, py):
    """px, py in -1 to 1 across the eye's texture square."""
    i = CELLS['iris']
    cu = ((i % 8) + 0.5 + 0.5 * px) * CELL_W / ATLAS_W
    cv = ((i // 8) * CELL_H + CELL_W * (0.5 + 0.5 * py)) / ATLAS_H
    return cu, cv


# --------------------------------------------------------------------------------------------------------- the vertex soup
K_BODY, K_FEATHER, K_BILL, K_EYE, K_LEG, K_LID, K_MOUTH = 0, 1, 2, 3, 4, 5, 6
BONE_NAMES = list(rig.BONES.keys())
BONE_IX = {n: i for i, n in enumerate(BONE_NAMES)}


class Soup:
    def __init__(self):
        self.P, self.N, self.UV, self.C, self.K, self.W = [], [], [], [], [], []
        self.F = []

    def vert(self, p, n, uv, c, k, w):
        self.P.append(tuple(p))
        self.N.append(tuple(n))
        self.UV.append(tuple(uv))
        self.C.append(tuple(c))
        self.K.append(k)
        self.W.append(w)
        return len(self.P) - 1

    def tri(self, a, b, c):
        self.F.append((a, b, c))

    def quad(self, a, b, c, d):
        self.F.append((a, b, c))
        self.F.append((a, c, d))


S = Soup()


def body_weights(p):
    """Skin weights for a point on the body: inverse distance to the bones of the trunk."""
    names = ['hips', 'spine', 'chest', 'neck1', 'neck2', 'head', 'tail_base', 'thigh.L', 'thigh.R', 'shin.L', 'shin.R']
    p = np.asarray(p, np.float32)
    w = []
    for nm in names:
        b = rig.BONES[nm]
        a = np.array(b['head'], np.float32)
        ba = np.array(b['tail'], np.float32) - a
        t = np.clip(((p - a) @ ba) / (ba @ ba), 0, 1)
        d = np.linalg.norm(p - a - t[..., None] * ba, axis=-1)
        scale = {'head': 0.8, 'tail_base': 1.0, 'thigh.L': 1.8, 'thigh.R': 1.8, 'shin.L': 1.8, 'shin.R': 1.8}.get(nm, 1.0)
        w.append(1 / (np.maximum(d * scale, 0.02) ** 4))
    w = np.stack(w, -1)
    out = []
    for row in np.atleast_2d(w):
        top = np.argsort(row)[-4:]
        vals = row[top]
        vals = vals / vals.sum()
        out.append({names[i]: float(x) for i, x in zip(top, vals) if x > 0.01})
    return out


def spine_param(p):
    """How far along the bird a point is (0 at the bill base, 1 at the tail) and the spine's tangent there."""
    pts = np.array([(0, -0.60, 1.48), (0, -0.36, 1.53), (0, -0.20, 1.34), (0, -0.09, 1.08), (0, 0.10, 0.83), (0, 0.45, 0.66), (0, 0.95, 0.44)], np.float32)
    seg = pts[1:] - pts[:-1]
    ls = np.linalg.norm(seg, axis=1)
    cum = np.concatenate([[0], np.cumsum(ls)])
    p = np.atleast_2d(np.asarray(p, np.float32))
    best = np.full(len(p), 1e9)
    sv = np.zeros(len(p))
    tv = np.zeros((len(p), 3))
    for i in range(len(seg)):
        t = np.clip(((p - pts[i]) @ seg[i]) / (ls[i] ** 2), 0, 1)
        q = pts[i] + t[:, None] * seg[i]
        d = np.linalg.norm(p - q, axis=1)
        m = d < best
        best[m] = d[m]
        sv[m] = ((cum[i] + t * ls[i]) / cum[-1])[m]
        tv[m] = seg[i] / ls[i]
    return sv, tv


def paint_body(p):
    """The bird's coat as a function of position. sRGB, 0 to 1."""
    p = np.atleast_2d(np.asarray(p, np.float32))
    s, t = spine_param(p)
    x = p[:, 0]
    # Dorsal direction: perpendicular to the spine, in the bird's midplane, toward the back and up.
    dors = np.stack([np.zeros(len(p)), -t[:, 2], t[:, 1]], 1)
    dors = dors * np.sign(np.maximum(dors[:, 2:3], -1e9) + 1e-3)
    pts = np.stack([np.zeros(len(p)), np.zeros(len(p)), np.zeros(len(p))], 1)
    # Height over the belly, from how far a point sits along the dorsal direction relative to the trunk's axis.
    axis = np.array([(0, -0.09, 1.0)], np.float32)
    # Ventral amount: lower front of the body.
    under = sstep(0.82, 0.48, p[:, 2] + 0.25 * p[:, 1])
    throat = sstep(1.32, 1.12, p[:, 2]) * sstep(-0.05, -0.3, p[:, 1]) * sstep(1.0, 1.15, p[:, 2])
    c = np.broadcast_to(RUST, (len(p), 3)).copy()
    # Crown and back a touch deeper.
    top = sstep(0.0, 0.25, p[:, 1] - 0.5 * (p[:, 2] - 1.0))
    c = c * (1 - 0.0 * top)[:, None]
    crown = sstep(1.62, 1.8, p[:, 2])
    c = c * (1 - 0.55 * crown[:, None]) + RUST_D * (0.55 * crown[:, None])
    # Lighter throat and breast, then cream under the belly.
    mid = sstep(1.08, 0.8, p[:, 2] + 0.35 * p[:, 1])
    c = c * (1 - 0.65 * mid[:, None]) + PEACH * (0.65 * mid[:, None])
    c = c * (1 - under[:, None]) + CREAM * under[:, None]
    c = c * (1 - 0.3 * throat[:, None]) + hx('#f2a266') * (0.3 * throat[:, None])
    # Pale around the eye, so the eye reads from across a room.
    de = np.linalg.norm(np.stack([np.abs(x), p[:, 1], p[:, 2]], 1) - np.asarray(EYE_C, np.float32), axis=1)
    ring = 1 - sstep(EYE_R * 1.1, EYE_R * 1.7, de)
    c = c * (1 - 0.6 * ring[:, None]) + hx('#fbc48e') * (0.6 * ring[:, None])
    # A dark line from the bill base through the eye gives the face its structure.
    # The cheek keeps a warm blush.
    blush = np.exp(-(((np.abs(x) - 0.17) / 0.1) ** 2 + ((p[:, 1] + 0.42) / 0.12) ** 2 + ((p[:, 2] - 1.38) / 0.08) ** 2))
    c = c * (1 - 0.3 * blush[:, None]) + hx('#e8703a') * (0.3 * blush[:, None])
    # The back turns to barred black and white behind the shoulders; the rump is white.
    back = sstep(0.60, 0.80, s) * sstep(0.25, 0.42, p[:, 2] - 0.55 * 0 - (0.42 - 0.15 * p[:, 1]))
    rump = sstep(0.73, 0.82, s)
    c = c * (1 - 0.7 * rump[:, None]) + WHITE * (0.7 * rump[:, None])
    return np.clip(c, 0, 1)


def add_body():
    P, F, dense = decimated_body(int(os.environ.get('BODY_TRIS', 3000)))
    N = sdf_grad(P)
    C = paint_body(P)
    W = body_weights(P)
    uv = cell_uv('plain', 0, 0.5)
    base = len(S.P)
    for i in range(len(P)):
        S.vert(P[i], N[i], uv, tuple(C[i]) + (0.0,), K_BODY, W[i])
    for a, b, c in F:
        S.tri(base + a, base + b, base + c)
    return dense


# ------------------------------------------------------------------------------------------------------------ feather cards
def wing_profile(u):
    # Narrow at the quill, widest past the middle, a rounded tip.
    pts = [(0, 0.30), (0.12, 0.62), (0.35, 0.92), (0.6, 1.0), (0.8, 0.96), (0.9, 0.82), (0.965, 0.52), (1.0, 0.0)]
    return np.interp(u, [a for a, _ in pts], [b for _, b in pts])


def paddle_profile(u):
    pts = [(0, 0.5), (0.3, 0.68), (0.55, 0.86), (0.74, 1.0), (0.86, 0.98), (0.94, 0.8), (0.985, 0.46), (1.0, 0.0)]
    return np.interp(u, [a for a, _ in pts], [b for _, b in pts])


def leaf_profile(u):
    pts = [(0, 0.5), (0.4, 1.0), (0.75, 0.88), (0.93, 0.5), (1.0, 0.0)]
    return np.interp(u, [a for a, _ in pts], [b for _, b in pts])


def feather(root, d, n, L, W, cell, weight_fn, sx=1, us=(0, 0.12, 0.3, 0.5, 0.7, 0.85, 0.95, 1.0), profile=wing_profile,
            bend=0.05, sweep=0.0, roll=0.0, vfold=0.018, asym=1.0, tint=(1, 1, 1), kind=K_FEATHER, vr=(0.0, 1.0)):
    """Adds one feather as three columns of vertices. root in world, d along it, n its upper face. weight_fn(u) -> skin weights."""
    d = Vector(d).normalized()
    n = (Vector(n) - d * d.dot(Vector(n))).normalized()
    if roll:
        n = (Quaternion(d, math.radians(roll)) @ n).normalized()
    side_ = d.cross(n).normalized()
    root = Vector(root)
    rows = []
    for u in us:
        w = float(profile(u)) * W * 0.5
        c = root + d * (u * L) - n * (bend * L * u * u) + side_ * (sweep * L * u * u)
        tangent = (d - n * (2 * bend * u) + side_ * (2 * sweep * u)).normalized()
        nn = (n + d * (2 * bend * u)).normalized()
        wv = weight_fn(u)
        tv = vr[0] + (vr[1] - vr[0]) * u
        if w < 1e-5:
            uv = cell_uv(cell, 0, tv)
            rows.append([S.vert(c, nn, uv, tuple(tint) + (0,), kind, wv)])
            continue
        lift = vfold * L * (1 - u * 0.3) * (float(profile(u)))
        left = c + side_ * (-w * asym)
        right = c + side_ * w
        mid = c + nn * lift
        nl = (nn - side_ * 0.32).normalized()
        nr = (nn + side_ * 0.32).normalized()
        norm_w = float(profile(u))
        a = S.vert(left, nl, cell_uv(cell, -norm_w, tv), tuple(tint) + (0,), kind, wv)
        b = S.vert(mid, nn, cell_uv(cell, 0, tv), tuple(tint) + (0,), kind, wv)
        e = S.vert(right, nr, cell_uv(cell, norm_w, tv), tuple(tint) + (0,), kind, wv)
        rows.append([a, b, e])
    flip = sx < 0
    for r0, r1 in zip(rows, rows[1:]):
        if len(r1) == 1:
            if not flip:
                S.tri(r0[0], r0[1], r1[0])
                S.tri(r0[1], r0[2], r1[0])
            else:
                S.tri(r0[1], r0[0], r1[0])
                S.tri(r0[2], r0[1], r1[0])
        else:
            for k in (0, 1):
                if not flip:
                    S.quad(r0[k], r0[k + 1], r1[k + 1], r1[k])
                else:
                    S.quad(r0[k + 1], r0[k], r1[k], r1[k + 1])


def mx(v_, sx):
    return Vector((v_[0] * sx, v_[1], v_[2]))


def blend_w(pairs):
    """pairs: (bone, weight) with duplicates allowed."""
    w = {}
    for b, x in pairs:
        if x > 0:
            w[b] = w.get(b, 0) + x
    t = sum(w.values())
    return {k: v_ / t for k, v_ in w.items()}


def add_wing(sx):
    s = 'L' if sx > 0 else 'R'
    up, fo, ha = f'wing_up.{s}', f'wing_fo.{s}', f'wing_ha.{s}'

    def fan_weight(arm_bone, fans, at):
        """Skin along a feather: the root stays on the arm, the rest follows the fan bones."""
        def fn(u):
            k = rig_smooth(0.02, 0.34, u)
            pairs = [(arm_bone, 1 - k)]
            for f, x in fans(at):
                pairs.append((f, k * x))
            return blend_w(pairs)
        return fn

    def rig_smooth(a, b, x):
        t = max(0.0, min(1.0, (x - a) / (b - a)))
        return t * t * (3 - 2 * t)

    def sec_fans(t):
        if t < 0.5:
            k = t / 0.5
            return [(f'sec_a.{s}', 1 - k), (f'sec_b.{s}', k)]
        k = (t - 0.5) / 0.5
        return [(f'sec_b.{s}', 1 - k), (f'sec_c.{s}', k)]

    def pri_fans(t):
        stops = [(0.0, 'pri_a'), (0.34, 'pri_b'), (0.67, 'pri_c'), (1.0, 'pri_d')]
        for (t0, a), (t1, b) in zip(stops, stops[1:]):
            if t <= t1:
                k = (t - t0) / (t1 - t0)
                return [(f'{a}.{s}', 1 - k), (f'{b}.{s}', k)]
        return [(f'pri_d.{s}', 1.0)]

    Z = Vector((0, 0, 1))
    # Primaries, tip first so inner feathers lie over outer ones.
    N_P = 9
    for i in range(N_P):
        t = i / (N_P - 1)  # 0 at the wrist, 1 at the hand's tip
        root = rig.lerp3(WRIST, HAND, t) + Vector((0, 0.0, -0.022 - 0.004 * i))
        alpha = 26 + t * 54
        L = 0.84 + 0.17 * math.sin(math.pi * min(1, t * 1.2)) - 0.1 * t * t
        d = wing_dir(alpha)
        cell = 'pri_out' if i >= 4 else 'pri_in'
        vr = bar_vr(rig.F_W.lerp(rig.F_H, t), L)
        feather(mx(root, sx), mx(d, sx), Z, L, 0.205 - 0.03 * t, cell, fan_weight(ha, pri_fans, t), sx=sx, roll=-sx * 7, bend=0.05,
                asym=0.72, vr=vr)
    # Secondaries.
    N_S = 8
    for i in range(N_S):
        t = 1 - i / (N_S - 1)  # 1 at the wrist, 0 at the elbow
        root = rig.lerp3(ELBOW, WRIST, t) + Vector((0, 0.0, -0.012 + 0.003 * i))
        alpha = t * 21
        d = wing_dir(alpha)
        L = 0.78 - 0.02 * (1 - t)
        vr = bar_vr(rig.F_E.lerp(rig.F_W, t), L)
        feather(mx(root, sx), mx(d, sx), Z, L, 0.2, 'sec', fan_weight(fo, sec_fans, t), sx=sx, roll=-sx * 7, bend=0.045, asym=0.82, vr=vr)
    # Tertials, nearest the body.
    for i in range(3):
        t = 0.45 + 0.27 * i
        root = rig.lerp3(SHOULDER, ELBOW, t) + Vector((0, 0, 0.006 + 0.006 * (3 - i)))
        d = wing_dir(-10 + 3 * i)
        feather(mx(root, sx), mx(d, sx), Z, 0.70 - 0.05 * (2 - i), 0.22, 'ter', lambda u, s=s: blend_w([(up, 1 - rig_smooth(0.02, 0.3, u)), (f'ter.{s}', rig_smooth(0.02, 0.3, u))]), sx=sx, roll=-sx * 5, bend=0.04, asym=0.9)
    # Greater coverts over the secondaries.
    for i in range(8):
        t = 1 - i / 7
        root = rig.lerp3(ELBOW, WRIST, t) + Vector((0, -0.03, 0.022))
        d = wing_dir(t * 21)
        feather(mx(root, sx), mx(d, sx), Z, 0.34, 0.165, 'cov_g', fan_weight(fo, sec_fans, t), sx=sx, roll=-sx * 5, bend=0.03, us=(0, 0.3, 0.6, 0.85, 0.95, 1.0), vfold=0.02)
    # Primary coverts.
    for i in range(6):
        t = i / 5
        root = rig.lerp3(WRIST, HAND, t * 0.92) + Vector((0, -0.02, 0.012))
        d = wing_dir(26 + t * 52)
        feather(mx(root, sx), mx(d, sx), Z, 0.31 - 0.05 * t, 0.13, 'cov_g', fan_weight(ha, pri_fans, t), sx=sx, roll=-sx * 5, bend=0.03, us=(0, 0.3, 0.6, 0.85, 0.95, 1.0), vfold=0.02, vr=(0.02, 0.6))
    # Median coverts: rust and black.
    for i in range(8):
        t = 1 - i / 7
        root = rig.lerp3(ELBOW, WRIST, t) + Vector((0, -0.07, 0.038))
        d = wing_dir(t * 18)
        feather(mx(root, sx), mx(d, sx), Z, 0.23, 0.14, 'cov_m', fan_weight(fo, sec_fans, t), sx=sx, roll=-sx * 4, bend=0.02, us=(0, 0.35, 0.7, 0.92, 1.0), vfold=0.02)
    # Lesser coverts along the arm's leading edge, in rust.
    for row, (off, n_, L_) in enumerate(((0.012, 12, 0.17), (-0.052, 10, 0.13))):
        for i in range(n_):
            t = i / (n_ - 1)
            if t < 0.62:
                a = t / 0.62
                root = rig.lerp3(SHOULDER, ELBOW, a * 0.999) if a < 0.45 else rig.lerp3(ELBOW, WRIST, (a - 0.45) / 0.55)
                bone = up if a < 0.45 else fo
                alpha = -4 + a * 12
            else:
                a = (t - 0.62) / 0.38
                root = rig.lerp3(WRIST, HAND, a * 0.55)
                bone = ha
                alpha = 22 + a * 30
            root = root + Vector((0, off - 0.05, 0.05 + 0.01 * row))
            cell = 'cov_g' if bone == ha else 'cov_l'
            feather(mx(root, sx), mx(wing_dir(alpha), sx), Z, L_, 0.115, cell, lambda u, b=bone: {b: 1.0}, sx=sx, roll=-sx * 3, bend=0.02, us=(0, 0.4, 0.75, 0.93, 1.0), profile=leaf_profile, vfold=0.03,
                    tint=(1 + 0.05 * random.random(), 1, 1), vr=(0.02, 0.6) if cell == 'cov_g' else (0.0, 1.0))
    # Alula at the wrist.
    for i in range(3):
        root = WRIST + Vector((0.01 * i, -0.06, 0.03))
        feather(mx(root, sx), mx(wing_dir(44 + i * 12), sx), Z, 0.22 - 0.03 * i, 0.075, 'cov_g', lambda u, b=ha: {b: 1.0}, sx=sx, roll=-sx * 3, bend=0.03, us=(0, 0.4, 0.75, 0.93, 1.0), vfold=0.02, vr=(0.02, 0.6))
    # A soft arm under the coverts, so an open wing has no gaps.
    tube(sx, [SHOULDER + Vector((-0.04, -0.02, 0.0)), ELBOW, WRIST, HAND], [0.085, 0.07, 0.055, 0.022], [up, fo, ha, ha], s)


def tube(sx, pts, radii, bones, s):
    rings = []
    samples = []
    for i in range(len(pts) - 1):
        for k in range(3):
            samples.append((pts[i].lerp(pts[i + 1], k / 3), radii[i] + (radii[i + 1] - radii[i]) * k / 3, bones[i], bones[i + 1], k / 3))
    samples.append((pts[-1], radii[-1], bones[-1], bones[-1], 0))
    col = tuple(RUST) + (0,)
    uv = cell_uv('plain', 0, 0.5)
    for i, (p, r, b0, b1, k) in enumerate(samples):
        nxt = samples[min(i + 1, len(samples) - 1)][0]
        prv = samples[max(i - 1, 0)][0]
        d = (nxt - prv).normalized()
        a = d.cross(Vector((0, 0, 1))).normalized()
        c = a.cross(d).normalized()
        ring = []
        for j in range(6):
            ang = j / 6 * math.tau
            nv = a * math.cos(ang) + c * math.sin(ang)
            pt = p + nv * r
            w = blend_w([(b0, 1 - k * k), (b1, k * k)]) if b0 != b1 else {b0: 1.0}
            ring.append(S.vert(mx(pt, sx), mx(nv, sx), uv, col, K_BODY, w))
        rings.append(ring)
    for r0, r1 in zip(rings, rings[1:]):
        for j in range(6):
            a, b, c, d_ = r0[j], r0[(j + 1) % 6], r1[(j + 1) % 6], r1[j]
            if sx > 0:
                S.quad(a, b, c, d_)
            else:
                S.quad(b, a, d_, c)


def add_tail():
    n = 5
    for sx, s in ((1, 'L'), (-1, 'R')):
        for i in range(n):
            t = (n - 1 - i) / (n - 1)  # outer first, so the centre lies on top
            a = 2.5 + t * 17
            d = (Quaternion((0, 0, 1), math.radians(-sx * a)) @ TAIL_DIR).normalized()
            root = TAIL_ROOT + Vector((sx * (0.012 + 0.05 * t), 0, 0.012 - 0.05 * t))
            L = 1.06 - 0.08 * t

            def fn(u, t=t, s=s, other=('R' if s == 'L' else 'L')):
                k0 = max(0.0, min(1.0, u / 0.22))
                k1 = max(0.0, min(1.0, (u - 0.22) / 0.33))
                center = 0.5 * (1 - t)  # the centre feather shares both fan bones
                return blend_w([('tail_base', 1 - k0), ('tail_mid', k0 * (1 - k1)), (f'tail.{s}', k0 * k1 * (1 - center)), (f'tail.{other}', k0 * k1 * center)])

            phi = math.radians(10 + 44 * t)
            n_ = Vector((sx * math.sin(phi), 0.2, math.cos(phi))).normalized()
            feather(root, d, n_, L, 0.215, 'tail', fn, sx=1, roll=sx * 5, bend=0.03, asym=0.9, us=(0, 0.1, 0.25, 0.42, 0.58, 0.72, 0.84, 0.93, 0.98, 1.0),
                    profile=lambda u: float(np.interp(u, [0, 0.12, 0.4, 0.8, 0.92, 0.98, 1.0], [0.4, 0.68, 0.92, 1.0, 0.92, 0.55, 0.0])))
    # Covert feathers over the base of the tail, in white then black.
    for i in range(6):
        sxx = -1 if i % 2 else 1
        t = (i // 2) / 2
        root = TAIL_ROOT + Vector((sxx * (0.03 + 0.05 * t), -0.12, 0.05))
        d = (Quaternion((0, 0, 1), math.radians(-sxx * (3 + 12 * t))) @ TAIL_DIR).normalized()
        feather(root, d, Vector((0, 0.2, 1)), 0.36, 0.17, 'fluff', lambda u: blend_w([('tail_base', 1 - 0.4 * u), ('hips', 0.0 + 0.4 * (1 - u))]), sx=1, bend=0.03, tint=tuple(WHITE), us=(0, 0.35, 0.7, 0.92, 1.0), profile=leaf_profile)


def add_crest():
    lengths = [0.32, 0.44, 0.54, 0.60, 0.63, 0.61, 0.56, 0.49, 0.40]
    widths = [0.15, 0.17, 0.185, 0.195, 0.2, 0.195, 0.185, 0.17, 0.15]
    order = sorted(range(CREST_N), key=lambda i: -abs(i - 4))
    for i in order:
        root, d = crest_frame(i)
        x = 0.016 * (1 if i % 2 else -1)
        root = root + Vector((x, 0, 0))
        n_ = Vector((1 if i % 2 else -1, 0, 0))
        side_n = Vector((1, 0, 0))
        cell = 'crest' if 2 <= i <= 6 else 'crest_side'
        for sgn in (1,):
            feather(root - d * 0.05, d, side_n, lengths[i] + 0.05, widths[i], cell, lambda u, i=i: {f'crest_{i}': 1.0}, sx=1, profile=paddle_profile, bend=0.04 * (1 if i < 4 else -1) * 0, sweep=0.05 * (i - 4) / 4,
                    us=(0, 0.2, 0.4, 0.58, 0.72, 0.82, 0.88, 0.925, 0.955, 0.977, 0.992, 1.0), vfold=0.014)


def add_eye(sx):
    s = 'L' if sx > 0 else 'R'
    a = mx(EYE_AXIS, sx)
    sd = mx(EYE_S, sx)
    u_ = mx(EYE_U, sx)
    c0 = mx(EYE_C, sx)
    NR, NS = 9, 18
    TH = math.radians(112)
    rings = []
    center = S.vert(c0 + a * EYE_R, a, iris_uv(0, 0), (1, 1, 1, 0), K_EYE, {f'eye.{s}': 1.0})
    for i in range(1, NR + 1):
        th = TH * i / NR
        ring = []
        for j in range(NS):
            ph = j / NS * math.tau
            nv = a * math.cos(th) + (sd * math.cos(ph) + u_ * math.sin(ph)) * math.sin(th)
            rho = th / TH
            ring.append(S.vert(c0 + nv * EYE_R, nv, iris_uv(rho * math.cos(ph), rho * math.sin(ph)), (1, 1, 1, 0), K_EYE, {f'eye.{s}': 1.0}))
        rings.append(ring)
    flip = sx < 0
    for j in range(NS):
        p, q = rings[0][j], rings[0][(j + 1) % NS]
        S.tri(center, p, q) if not flip else S.tri(center, q, p)
    for r0, r1 in zip(rings, rings[1:]):
        for j in range(NS):
            A, B, C, D = r0[j], r0[(j + 1) % NS], r1[(j + 1) % NS], r1[j]
            S.quad(A, D, C, B) if flip else S.quad(A, B, C, D)
    # Lids: spherical shells that hinge across the eye. gamma 0 is the gaze axis, positive is upward.
    R_L = EYE_R * 1.045
    lid_col = paint_body(np.array([[EYE_C.x, EYE_C.y - 0.01, EYE_C.z + 0.09]], np.float32))[0]
    lid_dark = np.clip(lid_col * 0.33, 0, 1)

    def shell(bone, g0, g1, up_side):
        NG, NP = 9, 14
        rows = []
        for i in range(NG + 1):
            g = math.radians(g0 + (g1 - g0) * i / NG)
            row = []
            k = i / NG
            col = lid_col * (1 - 0) if k > 0.12 else lid_dark
            if 0.06 < k <= 0.2:
                col = lid_dark * 0.4 + lid_col * 0.6
            for j in range(NP + 1):
                psi = math.radians(-82 + 164 * j / NP)
                nv = (a * math.cos(g) + u_ * math.sin(g)) * math.cos(psi) + sd * math.sin(psi)
                row.append(S.vert(c0 + nv * R_L, nv, cell_uv('plain', 0, 0.5), tuple(col) + (0,), K_LID, {bone: 1.0}))
            rows.append(row)
        for r0, r1 in zip(rows, rows[1:]):
            for j in range(NP):
                A, B, C, D = r0[j], r0[j + 1], r1[j + 1], r1[j]
                f = up_side
                if flip:
                    f = not f
                S.quad(A, B, C, D) if f else S.quad(B, A, D, C)

    shell(f'lid_u.{s}', 25, 128, True)
    shell(f'lid_l.{s}', -33, -118, False)
    # The brow: one soft tapered stroke hugging the head, which can lift, tilt and frown.
    col = hx('#92361a')
    rows = []
    N = 8
    for i in range(N + 1):
        t = i / N
        at = EYE_C + EYE_U * (EYE_R * 1.30 + 0.022 * (1 - (2 * t - 1) ** 2)) + EYE_S * ((t - 0.5) * EYE_R * 2.35) + EYE_AXIS * (-0.012)
        at = Vector(project(np.array(at, np.float32)[None], 3)[0])
        n = Vector(sdf_grad(np.array(at, np.float32)[None])[0])
        w = 0.03 * math.sin(min(1, t * 1.05 + 0.03) * math.pi) ** 0.8 + 0.001
        along = (EYE_S).normalized()
        across = n.cross(along).normalized()
        a = mx(at + n * 0.006 + across * w, sx)
        b = mx(at + n * 0.009, sx)
        c_ = mx(at + n * 0.006 - across * w, sx)
        nn = mx(n, sx)
        uv = cell_uv('plain', 0, 0.5)
        wt = {f'brow.{s}': 1.0}
        rows.append((S.vert(a, nn, uv, tuple(col) + (0,), K_LID, wt), S.vert(b, nn, uv, tuple(col) + (0,), K_LID, wt), S.vert(c_, nn, uv, tuple(col) + (0,), K_LID, wt)))
    for r0, r1 in zip(rows, rows[1:]):
        for k in (0, 1):
            if flip:
                S.quad(r0[k], r1[k], r1[k + 1], r0[k + 1])
            else:
                S.quad(r0[k + 1], r1[k + 1], r1[k], r0[k])


def bill_center(t):
    y = BILL_B.y + 0.03 - 0.82 * t
    z = BILL_B.z + 0.015 - 0.07 * t - 0.25 * t * t
    return Vector((0, y, z))


def add_bill():
    # Upper bill: a dome over a flat underside, tapering to a slightly hooked tip. Lower bill: a shallower dome under it.
    NL, NS = 16, 8
    def col_at(t):
        base = hx('#e9a06a')
        mid = hx('#6a4a44')
        tip = hx('#1c1c22')
        c = base * (1 - sstep(0.02, 0.42, t)) + mid * sstep(0.02, 0.42, t)
        return c * (1 - sstep(0.4, 0.8, t)) + tip * sstep(0.4, 0.8, t)

    def rad(t):
        # Width and height taper fast at first, then long and slim.
        r = 0.098 * (1 - t) ** 0.72 + 0.008
        return r

    def build(upper):
        rows = []
        bone = 'bill' if upper else 'jaw'
        length_t = 1.0 if upper else 0.975
        for i in range(NL + 1):
            t = i / NL
            tt = t * length_t
            c = bill_center(tt)
            nxt = bill_center(min(1, tt + 0.02))
            tang = (nxt - c).normalized()
            up = Vector((1, 0, 0)).cross(tang).normalized()
            if up.z < 0:
                up = -up
            r = rad(tt)
            h = r * (0.86 if upper else 0.62)
            row = []
            col = col_at(tt)
            for j in range(NS + 1):
                ang = math.pi * j / NS  # 0 at +x side, pi at -x, over the top
                x = r * 0.92 * math.cos(ang)
                yy = h * math.sin(ang) * (1 if upper else -1)
                sign = 1 if upper else -1
                pos = c + Vector((x, 0, 0)) + up * yy + up * (0.004 * sign)
                nn = (Vector((math.cos(ang) / (r * 0.92 + 1e-4), 0, 0)) + up * (math.sin(ang) * sign / (h + 1e-4))).normalized()
                row.append(S.vert(pos, nn, cell_uv('plain', 0, 0.5), tuple(col) + (0,), K_BILL, {bone: 1.0}))
            rows.append(row)
        for r0, r1 in zip(rows, rows[1:]):
            for j in range(NS):
                A, B, C, D = r0[j], r0[j + 1], r1[j + 1], r1[j]
                # Winding: outward normals.
                if upper:
                    S.quad(A, B, C, D)
                else:
                    S.quad(B, A, D, C)
        # The mouth: a flat plate along the opening, in warm pink.
        mouth = hx('#8e3a4c')
        plate = []
        for i in range(0, NL + 1, 2):
            t = i / NL * length_t
            c = bill_center(t)
            r = rad(t) * 0.88
            nxt = bill_center(min(1, t + 0.02))
            tang = (nxt - c).normalized()
            up = Vector((1, 0, 0)).cross(tang).normalized()
            if up.z < 0:
                up = -up
            sign = 1 if upper else -1
            nn = up * (-sign)
            pos_c = c + up * (0.004 * sign) + up * (0.003 * sign)
            mc = mouth * (1 - sstep(0.5, 0.9, t)) + hx('#2a2226') * sstep(0.5, 0.9, t)
            a = S.vert(pos_c + Vector((r, 0, 0)), nn, cell_uv('plain', 0, 0.5), tuple(mc) + (0,), K_MOUTH, {bone: 1.0})
            b = S.vert(pos_c + Vector((-r, 0, 0)), nn, cell_uv('plain', 0, 0.5), tuple(mc) + (0,), K_MOUTH, {bone: 1.0})
            plate.append((a, b))
        for (a0, b0), (a1, b1) in zip(plate, plate[1:]):
            if upper:
                S.quad(b0, a0, a1, b1)
            else:
                S.quad(a0, b0, b1, a1)
    build(True)
    build(False)
    # A tongue, the brand's pink, seen only when the bill opens.
    pts = []
    tongue = PINK * 0.9
    NT = 6
    rows = []
    for i in range(NT + 1):
        t = 0.02 + 0.36 * i / NT
        c = bill_center(t)
        up = Vector((1, 0, 0)).cross((bill_center(t + 0.02) - c).normalized()).normalized()
        if up.z < 0:
            up = -up
        w = 0.03 * (1 - (i / NT) ** 2) + 0.004
        c = c - up * 0.004
        rows.append((S.vert(c + Vector((w, 0, 0)), up, cell_uv('plain', 0, 0.5), tuple(tongue) + (0,), K_MOUTH, {'jaw': 1.0}),
                     S.vert(c + up * 0.006, up, cell_uv('plain', 0, 0.5), tuple(tongue) + (0,), K_MOUTH, {'jaw': 1.0}),
                     S.vert(c - Vector((w, 0, 0)), up, cell_uv('plain', 0, 0.5), tuple(tongue) + (0,), K_MOUTH, {'jaw': 1.0})))
    for r0, r1 in zip(rows, rows[1:]):
        for k in (0, 1):
            S.quad(r0[k + 1], r0[k], r1[k], r1[k + 1])


def loft(points, radii, cols, weights, k, sides=6, oval=1.0):
    """A tapered tube along points."""
    rings = []
    n = len(points)
    for i in range(n):
        p = Vector(points[i])
        d = (Vector(points[min(i + 1, n - 1)]) - Vector(points[max(i - 1, 0)])).normalized()
        a = d.cross(Vector((0.13, 0.31, 0.94))).normalized()
        b = a.cross(d).normalized()
        ring = []
        for j in range(sides):
            ang = j / sides * math.tau
            nv = a * math.cos(ang) + b * math.sin(ang)
            ring.append(S.vert(p + (a * math.cos(ang) * oval + b * math.sin(ang)) * radii[i], nv, cell_uv('plain', 0, 0.5), tuple(cols[i]) + (0,), k, weights[i]))
        rings.append(ring)
    for r0, r1 in zip(rings, rings[1:]):
        for j in range(sides):
            S.quad(r0[j], r1[j], r1[(j + 1) % sides], r0[(j + 1) % sides])
    # Cap the tip.
    tip = Vector(points[-1]) + (Vector(points[-1]) - Vector(points[-2])).normalized() * radii[-1]
    t = S.vert(tip, (Vector(points[-1]) - Vector(points[-2])).normalized(), cell_uv('plain', 0, 0.5), tuple(cols[-1]) + (0,), k, weights[-1])
    for j in range(sides):
        S.tri(rings[-1][j], t, rings[-1][(j + 1) % sides])


def add_leg(sx):
    s = 'L' if sx > 0 else 'R'
    LEG = hx('#7f5a52')
    CLAW = hx('#3a2a2c')
    # Tarsus from the ankle to the ball of the foot.
    pts, rad, cols, w = [], [], [], []
    N = 5
    for i in range(N + 1):
        t = i / N
        pts.append(mx(ANKLE.lerp(BALL, t), sx))
        rad.append(0.031 - 0.006 * math.sin(t * math.pi) + 0.005 * t)
        cols.append(LEG)
        w.append(blend_w([(f'shin.{s}', max(0, 0.5 - t * 3)), (f'tarsus.{s}', 1 - max(0, 0.5 - t * 3)), (f'foot.{s}', max(0, t - 0.9) * 8)]))
    loft(pts, rad, cols, w, K_LEG)
    # Feathered shin, tapering into the bare leg. (The thigh's fluff covers its top.)
    pts, rad, cols, w = [], [], [], []
    for i in range(5):
        t = i / 4
        pts.append(mx(KNEE.lerp(ANKLE, 0.15 + 0.82 * t), sx))
        rad.append(0.07 - 0.04 * t)
        cols.append(tuple(np.clip(hx('#f6d5ad') * (1 - t * 0.2), 0, 1)))
        w.append({f'shin.{s}': 1.0})
    loft(pts, rad, cols, w, K_BODY)
    # A skirt of soft feathers where the shin leaves the body.
    for i in range(7):
        a = i / 7 * math.tau
        o = Vector((math.cos(a) * 0.06, math.sin(a) * 0.06, 0))
        root = KNEE.lerp(ANKLE, 0.12) + o
        d = (ANKLE - KNEE).normalized() + o * 2.2
        feather(mx(root, sx), mx(d, sx), mx(Vector((math.cos(a), math.sin(a), 0.1)), sx), 0.15 + 0.03 * ((i * 3) % 2), 0.085, 'fluff', lambda u, s=s: {f'shin.{s}': 1.0}, sx=sx, profile=leaf_profile,
                us=(0, 0.45, 0.8, 1.0), vfold=0.02, tint=tuple(hx('#f8dcb8')))
    # Toes: three forward, one back.
    for ang, L, r in ((-20, 0.2, 0.021), (0, 0.235, 0.024), (20, 0.2, 0.021), (180, 0.15, 0.022)):
        bone = f'toe_b.{s}' if ang == 180 else f'toe_f.{s}'
        q = Quaternion((0, 0, 1), math.radians(-ang * sx if ang != 180 else 180))
        d = q @ Vector((0, -1, 0))
        start = BALL + Vector((0, 0, -0.027))
        if ang != 180:
            pts_ = [start + d * (L * k) + Vector((0, 0, 0.012 * math.sin(k * math.pi) - 0.002)) for k in (0.0, 0.25, 0.5, 0.75, 1.0)]
        else:
            pts_ = [start + d * (L * k) + Vector((0, 0, 0.01 * math.sin(k * math.pi))) for k in (0.0, 0.33, 0.66, 1.0)]
        cl = [LEG] * (len(pts_) - 1) + [CLAW]
        rs = [r * (1 - 0.3 * k / (len(pts_) - 1)) for k in range(len(pts_))]
        # The claw: a thin dark hook off the toe's end.
        e = pts_[-1]
        pts_ = pts_ + [e + d * 0.028 - Vector((0, 0, 0.004)), e + d * 0.052 - Vector((0, 0, 0.016))]
        rs = rs + [r * 0.42, r * 0.1]
        cl = cl[:-1] + [LEG, CLAW, CLAW]
        pts2 = [mx(p, sx) for p in pts_]
        ww = [blend_w([(f'foot.{s}', max(0, 1 - i * 1.2)), (bone, min(1, i * 1.2))]) for i in range(len(pts2))]
        loft(pts2, rs, cl, ww, K_LEG, sides=5)


# ---------------------------------------------------------------------------------------------------- the plumage on the body
def plumage(dense):
    """Scatters soft feathers over the body with blue-noise spacing. They hug the surface, and only their tips lift off it."""
    pts = dense.copy()
    pts = pts[pts[:, 0] >= -1]  # all of it; mirrored below
    keep = pts[:, 0] > 0.012
    pts = pts[keep]
    RNG.shuffle(pts)
    s, tang = spine_param(pts)
    nrm = sdf_grad(pts)
    # Where feathers go and how big they are.
    def spacing(p, s_):
        sp = np.full(len(p), 0.105, np.float32)
        head = sstep(0.72 * 1.0, 0.0, 0) * 0
        return sp

    placed = []
    grid = {}
    cell = 0.2

    def size_at(p, s0):
        # Small on the face and neck, large on the breast and back.
        return float(np.interp(s0, [0.0, 0.12, 0.2, 0.3, 0.45, 0.7, 0.85], [0.044, 0.048, 0.057, 0.078, 0.104, 0.108, 0.098])) * (0.88 + 0.32 * random.random())

    count = 0
    for i in range(len(pts)):
        p = pts[i]
        sp = size_at(p, s[i])
        # A clean face: no feathers in front of or just around the eye, on the bill base or on the forehead.
        de = np.linalg.norm(p - np.asarray(EYE_C, np.float32))
        if de < EYE_R * 1.9:
            continue
        if p[1] < -0.56 and p[2] > 1.25:
            continue
        # The forehead stays clean, so the face reads.
        if p[2] > 1.42 and p[1] < -0.40 and p[0] < 0.2:
            continue
        key = (int(p[0] / cell), int(p[1] / cell), int(p[2] / cell))
        ok = True
        for a in (-1, 0, 1):
            for b in (-1, 0, 1):
                for c in (-1, 0, 1):
                    for q, qs in grid.get((key[0] + a, key[1] + b, key[2] + c), ()):
                        if np.sum((p - q) ** 2) < (min(sp, qs) * 0.98) ** 2:
                            ok = False
                            break
                    if not ok:
                        break
                if not ok:
                    break
            if not ok:
                break
        if not ok:
            continue
        grid.setdefault(key, []).append((p, sp))
        placed.append((p, nrm[i], tang[i], s[i], sp))
    log(f'plumage: {len(placed)} per side')
    # Sort from tail to head, so feathers nearer the head draw over those behind them where they meet. (Depth decides, this only keeps it tidy.)
    placed.sort(key=lambda r: -r[3])
    uses = (0, 0.42, 0.72, 0.91, 1.0)
    for p, n, t, s0, sp in placed:
        for sx in (1, -1):
            pos = np.array([p[0] * sx, p[1], p[2]], np.float32)
            nn = np.array([n[0] * sx, n[1], n[2]], np.float32)
            tt = np.array([t[0] * sx, t[1], t[2]], np.float32)
            # The flow runs along the body, and fans out a little to the side toward the belly.
            ang = RNG.normal(0, 0.1)
            flow = tt - nn * (tt @ nn)
            flow /= max(np.linalg.norm(flow), 1e-5)
            side = np.cross(nn, flow)
            flow = flow * math.cos(ang) + side * math.sin(ang)
            side = np.cross(nn, flow)
            L = sp * 2.0
            W = sp * 1.32
            root_w = body_weights(pos)[0]
            base = paint_body(pos)[0]
            jitter = 1 + RNG.normal(0, 0.022)
            lift = 0.012 + 0.018 * (1.0 if s0 > 0.3 else 0.3) + RNG.random() * 0.012
            tip_col = np.clip(base * 1.03, 0, 1)
            cell_name = 'body'
            # The barred lower back: it shows when the wings open.
            if 0.585 < s0 < 0.70 and pos[2] > 0.60 + (0.5 - pos[1]) * 0.25:
                base = BLACK if (s0 < 0.615 or 0.655 < s0 < 0.70) else WHITE
                tip_col = base
            rows = []
            prof = leaf_profile
            for u in uses:
                w = float(prof(u)) * W * 0.5
                cols = [(-1, -w), (0, 0), (1, w)] if w > 1e-5 else [(0, 0)]
                row = []
                for cu, off in cols:
                    q = pos + flow * (u * L - 0.02) + side * off * (1 if sx > 0 else -1)
                    q = project(q[None], 2)[0]
                    nq = sdf_grad(q[None])[0]
                    q2 = q + nq * (0.004 + lift * u * u)
                    if cu == 0:
                        q2 = q2 + nq * (0.004 * (1 - u))
                    # Normals stay close to the body's, so shading flows across feathers; tips tip outward a little.
                    nv = nq + flow * (0.2 * u) * 0 - flow * 0.06 + (side * cu * 0.16 * (1 if sx > 0 else -1))
                    nv /= np.linalg.norm(nv)
                    c = base * (1 - u) + tip_col * u
                    c = np.clip(c * jitter, 0, 1)
                    uv = cell_uv(cell_name, cu * float(prof(u)), u)
                    row.append(S.vert(q2, nv, uv, tuple(c) + (0,), K_FEATHER, root_w))
                rows.append(row)
            for r0, r1 in zip(rows, rows[1:]):
                if len(r1) == 1:
                    a, b, c = r0[0], r0[1], r1[0]
                    d = r0[2]
                    tri1 = (a, b, c)
                    tri2 = (b, d, c)
                    if sx > 0:
                        S.tri(*tri1)
                        S.tri(*tri2)
                    else:
                        S.tri(*tri1)
                        S.tri(*tri2)
                else:
                    for k in (0, 1):
                        S.quad(r0[k], r0[k + 1], r1[k + 1], r1[k])
            count += 1
    log(f'plumage total {count}')


# ----------------------------------------------------------------------------------------------------------------- assemble
def fix_winding():
    """Every triangle faces the way its vertex normals say. Double-sided feathers need that to light the correct side."""
    P = np.array(S.P, np.float64)
    N = np.array(S.N, np.float64)
    F = np.array(S.F, np.int64)
    g = np.cross(P[F[:, 1]] - P[F[:, 0]], P[F[:, 2]] - P[F[:, 0]])
    a = N[F].sum(axis=1)
    flip = np.einsum('ij,ij->i', g, a) < 0
    F[flip] = F[flip][:, [0, 2, 1]]
    S.F = [tuple(int(x) for x in t) for t in F]
    log(f'winding: flipped {int(flip.sum())} of {len(F)}')


def wipe():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)


def main():
    wipe()
    dense = add_body()
    n0 = len(S.F)
    plumage(dense)
    log('tris after plumage', len(S.F), f'(plumage {len(S.F) - n0})')
    add_bill()
    add_eye(1)
    add_eye(-1)
    add_crest()
    add_tail()
    add_wing(1)
    add_wing(-1)
    add_leg(1)
    add_leg(-1)
    log(f'{len(S.P):,} vertices, {len(S.F):,} triangles')
    fix_winding()

    atlas = paint_atlas()
    write_atlas(atlas)

    # Build the real object: a mesh with vertex groups, skinned by an armature.
    arm = rig.create_armature()
    me = bpy.data.meshes.new('hoopoe')
    me.from_pydata([tuple(p) for p in S.P], [], S.F)
    me.update()
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new('hoopoe', me)
    bpy.context.scene.collection.objects.link(ob)
    ob.parent = arm
    mod = ob.modifiers.new('rig', 'ARMATURE')
    mod.object = arm
    groups = {n: ob.vertex_groups.new(name=n) for n in BONE_NAMES}
    for i, w in enumerate(S.W):
        for b, x in w.items():
            groups[b].add([i], x, 'REPLACE')

    ao_fold = np.ones(len(S.P), np.float32)
    ao_open = np.ones(len(S.P), np.float32)
    if DO_AO:
        ao_fold = bake_ao(ob, arm, folded=True)
        ao_open = bake_ao(ob, arm, folded=False)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(BLEND, 'hoopoe.blend'))
    write_mesh(arm, ao_fold, ao_open)


def bake_ao(ob, arm, folded):
    for pb in arm.pose.bones:
        pb.rotation_mode = 'QUATERNION'
        pb.rotation_quaternion = Quaternion()
    if folded:
        for k, q in rig.fold_pose(arm).items():
            arm.pose.bones[k].rotation_quaternion = q
        for k, q in rig.crest_pose(arm, 0.12).items():
            arm.pose.bones[k].rotation_quaternion = q
    else:
        for k, q in rig.crest_pose(arm, 0.6).items():
            arm.pose.bones[k].rotation_quaternion = q
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    em = ev.to_mesh()
    P = np.empty(len(em.vertices) * 3, np.float32)
    em.vertices.foreach_get('co', P)
    P = P.reshape(-1, 3)
    ev.to_mesh_clear()
    me = bpy.data.meshes.new('bake')
    me.from_pydata(P.tolist(), [], S.F)
    me.update()
    for p in me.polygons:
        p.use_smooth = True
    attr = me.color_attributes.new('ao', 'FLOAT_COLOR', 'POINT')
    me.color_attributes.active_color = attr
    mat = bpy.data.materials.new('bake')
    me.materials.append(mat)
    bo = bpy.data.objects.new('bake', me)
    bpy.context.scene.collection.objects.link(bo)
    # A ground plane helps the feet and the belly.
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = int(os.environ.get('AO_SAMPLES', 128))
    sc.cycles.use_denoising = False
    sc.render.bake.target = 'VERTEX_COLORS'
    sc.render.bake.margin = 0
    if not sc.world:
        sc.world = bpy.data.worlds.new('w')
    sc.world.light_settings.distance = 0.32
    ob.hide_render = True
    bpy.ops.object.select_all(action='DESELECT')
    bo.select_set(True)
    bpy.context.view_layer.objects.active = bo
    bpy.ops.object.bake(type='AO')
    col = np.empty(len(P) * 4, np.float32)
    me.color_attributes['ao'].data.foreach_get('color', col)
    ao = col[0::4].copy()
    log(f'AO {"folded" if folded else "open"} min {ao.min():.2f} mean {ao.mean():.2f} max {ao.max():.2f}')
    bpy.data.objects.remove(bo, do_unlink=True)
    bpy.data.meshes.remove(me)
    bpy.data.materials.remove(mat)
    ob.hide_render = False
    for pb in arm.pose.bones:
        pb.rotation_quaternion = Quaternion()
    return ao


def write_atlas(A):
    h, w = A.shape[:2]
    img = bpy.data.images.new('atlas', w, h, alpha=True)
    img.colorspace_settings.name = 'Non-Color'
    rgba = np.ones((h, w, 4), np.float32)
    rgba[..., :3] = A[::-1]
    img.pixels.foreach_set(rgba.ravel())
    img.filepath_raw = os.path.join(OUT, 'hoopoe-atlas.webp')
    img.file_format = 'WEBP'
    bpy.context.scene.render.image_settings.quality = 92
    img.save()
    log('atlas', os.path.getsize(img.filepath_raw) // 1024, 'KB')


def to_page(v_):
    return (v_[0], v_[2], -v_[1])


def write_mesh(arm, ao_fold, ao_open):
    P = np.array(S.P, np.float32)
    N = np.array(S.N, np.float32)
    N /= np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-6)
    UV = np.array(S.UV, np.float32)
    C = np.array(S.C, np.float32)
    K = np.array(S.K, np.uint8)
    P = np.stack([P[:, 0], P[:, 2], -P[:, 1]], 1)
    N = np.stack([N[:, 0], N[:, 2], -N[:, 1]], 1)
    SCALE = 8192 / 2  # int16 range covers +/- 8 units
    pos = np.clip(np.round(P * SCALE), -32767, 32767).astype(np.int16)
    nor = np.clip(np.round(N * 127), -127, 127).astype(np.int8)
    uv = np.clip(np.round(UV * 65535), 0, 65535).astype(np.uint16)
    col = np.clip(np.round(C[:, :3] * 255), 0, 255).astype(np.uint8)
    aof = np.clip(np.round(ao_fold * 255), 0, 255).astype(np.uint8)
    aoo = np.clip(np.round(ao_open * 255), 0, 255).astype(np.uint8)
    # Skin weights: top four, normalised to 255.
    J = np.zeros((len(P), 4), np.uint8)
    W = np.zeros((len(P), 4), np.uint8)
    for i, w in enumerate(S.W):
        items = sorted(w.items(), key=lambda kv: -kv[1])[:4]
        tot = sum(x for _, x in items)
        vals = [int(round(x / tot * 255)) for _, x in items]
        vals[0] += 255 - sum(vals)
        for k, ((b, _), x) in enumerate(zip(items, vals)):
            J[i, k] = BONE_IX[b]
            W[i, k] = x
    F = np.array(S.F, np.uint16).ravel()
    # The interleaved vertex: pos int16x3 + kind uint8 + aoOpen uint8, normal int8x3 + aoFold uint8, uv uint16x2, colour uint8x3 + pad, joints, weights = 28 bytes.
    vb = np.zeros(len(P), dtype=[('p', '<i2', 3), ('k', 'u1'), ('aoo', 'u1'), ('n', 'i1', 3), ('aof', 'u1'), ('uv', '<u2', 2), ('c', 'u1', 3), ('pad', 'u1'), ('j', 'u1', 4), ('w', 'u1', 4)])
    vb['p'] = pos
    vb['k'] = K
    vb['aoo'] = aoo
    vb['n'] = nor
    vb['aof'] = aof
    vb['uv'] = uv
    vb['c'] = col
    vb['j'] = J
    vb['w'] = W
    assert vb.dtype.itemsize == 28, vb.dtype.itemsize
    # The skeleton, parents first, in the page's axes.
    bones = []
    for name in BONE_NAMES:
        b = arm.data.bones[name]
        parent = b.parent
        ML = (parent.matrix_local.inverted() @ b.matrix_local) if parent else b.matrix_local.copy()
        t = ML.to_translation()
        q = ML.to_quaternion()
        bones.append(dict(n=name, p=BONE_NAMES.index(parent.name) if parent else -1, t=[round(x, 5) for x in to_page(t)], r=[round(q.x, 6), round(q.z, 6), round(-q.y, 6), round(q.w, 6)]))
    head = json.dumps(dict(v=len(P), i=len(F), scale=SCALE, bones=bones), separators=(',', ':')).encode()
    head += b' ' * ((-len(head) - 4) % 4)
    path = os.path.join(OUT, 'hoopoe-mesh.bin')
    with open(path, 'wb') as f:
        f.write(struct.pack('<I', len(head)))
        f.write(head)
        f.write(vb.tobytes())
        f.write(F.tobytes())
    log(f'wrote {path}: {os.path.getsize(path) // 1024} KB, {len(bones)} bones')


main()
