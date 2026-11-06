# The land: the main island's heightfield, paths, river, lake and walkable map, then every island's solid rock as a signed
# volume meshed with surface nets (so cliffs can overhang while the walkable top stays an exact heightfield).
#   OUT=<cache dir> RES=0.5 Blender -b --factory-startup -P terrain.py
# Writes OUT/land.npz (grids for the simulator, painter and scatter) and OUT/mesh_<island>.npz.
import os, sys, time
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
from layout import *

OUT = os.environ['OUT']
RES = float(os.environ.get('RES', 0.5))
os.makedirs(OUT, exist_ok=True)
T0 = time.time()
def log(*a): print(f'[{time.time() - T0:6.1f}s]', *a, flush=True)

def spline(points, step=0.5):
    """Catmull-Rom through the points, resampled to an even step."""
    p = np.asarray(points, np.float32)
    p = np.concatenate([[2 * p[0] - p[1]], p, [2 * p[-1] - p[-2]]])
    out = []
    for i in range(1, len(p) - 2):
        t = np.linspace(0, 1, 40, endpoint=False)[:, None]
        a, b, c, d = p[i - 1], p[i], p[i + 1], p[i + 2]
        out.append(0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t ** 2 + (3 * b - a - 3 * c + d) * t ** 3))
    out = np.concatenate(out + [p[-2:-1]])
    seg = np.linalg.norm(np.diff(out, axis=0), axis=1)
    s = np.concatenate([[0], np.cumsum(seg)])
    n = max(2, int(s[-1] / step))
    u = np.linspace(0, s[-1], n)
    return np.stack([np.interp(u, s, out[:, k]) for k in range(out.shape[1])], 1).astype(np.float32)

def stamp_dist(path, xs, ys, radius):
    """Distance to a polyline and the index of the nearest sample, within radius."""
    res = xs[1] - xs[0]
    dist = np.full((len(ys), len(xs)), 1e6, np.float32)
    near = np.zeros((len(ys), len(xs)), np.int32)
    R = int(radius / res) + 1
    for i, p in enumerate(path):
        cx, cy = int((p[0] - xs[0]) / res), int((p[1] - ys[0]) / res)
        x0, x1 = max(cx - R, 0), min(cx + R + 1, len(xs))
        y0, y1 = max(cy - R, 0), min(cy + R + 1, len(ys))
        if x0 >= x1 or y0 >= y1:
            continue
        dx = xs[x0:x1][None, :] - p[0]
        dy = ys[y0:y1][:, None] - p[1]
        d = np.sqrt(dx * dx + dy * dy)
        sub = dist[y0:y1, x0:x1]
        hit = d < sub
        sub[hit] = d[hit]
        near[y0:y1, x0:x1][hit] = i
    return dist, near

def outline(xs, ys, lobes, seed, warp=9.0, fine=2.4):
    X, Y = np.meshgrid(xs, ys)
    res = xs[1] - xs[0]
    sh = X.shape
    cell = 42 / res
    wx = fbm2(sh, cell, seed + 1, 3) * warp
    wy = fbm2(sh, cell, seed + 2, 3) * warp
    wx += fbm2(sh, 9 / res, seed + 3, 3) * fine
    wy += fbm2(sh, 9 / res, seed + 4, 3) * fine
    o = np.full(sh, -1e3, np.float32)
    for cx, cy, a, b in lobes:
        o = np.maximum(o, 1 - np.sqrt(((X + wx - cx) / a) ** 2 + ((Y + wy - cy) / b) ** 2))
    return o > 0

def rock_volume(name, xs, ys, top, d, seed, cliff, sink, sink_fall, spike=0.5, facet=(9.0, 3.4), zmax=None):
    """Solid rock. The sides and underside are a smooth inverted mountain, then chiselled: each voxel takes the tangent plane
    of its nearest (flat, slab-shaped) Voronoi seed, so the cliffs break into stacked planes with crisp, slightly offset edges.
    The walkable top stays the exact heightfield."""
    res = float(xs[1] - xs[0])
    sh = top.shape
    r = np.random.default_rng(seed)
    zmax = float(top[d > 0].max()) + 2 if zmax is None else zmax
    n_big = fbm2(sh, 80 / res, seed + 11, 3, 0.45)
    n_rid = ridged2(sh, 60 / res, seed + 12, 3, 0.45)
    depth_mod = 0.8 + 0.42 * n_big + spike * np.maximum(n_rid, 0) ** 2 * 1.6
    deepest = cliff + sink * float(depth_mod.max()) + 8
    top_soft = blur(top, 8 / res)
    zmin = float(top[d > 0].min()) - deepest
    zs = np.arange(zmin, zmax + res, res, dtype=np.float32)
    # coarse smooth field for the sides and underside
    rc = max(res * 2, 1.0)
    st = max(1, int(round(rc / res)))
    rc = res * st
    cxs, cys = xs[::st], ys[::st]
    czs = np.arange(zmin - rc, zmax + 2 * rc, rc, dtype=np.float32)
    log(name, 'coarse', len(cxs), len(cys), len(czs))
    nA, nB = noise3(96, 18, seed + 31), noise3(96, 18, seed + 32)
    nC = noise3(96, 9, seed + 33)
    CX, CY = np.meshgrid(cxs, cys)
    gx0, gy0 = (CX - xs[0]) / res, (CY - ys[0]) / res
    V = np.zeros((len(cxs), len(cys), len(czs)), np.float32)
    ws = 96 / 150.0
    for k, z in enumerate(czs):
        wx = sample3(nA, CX * ws, CY * ws, np.full(CX.shape, z * ws * 1.4, np.float32)) * 9.0
        wy = sample3(nB, CX * ws, CY * ws, np.full(CX.shape, z * ws * 1.4, np.float32)) * 9.0
        fall = smooth(0, 14, top_soft[::st, ::st] - z)
        de = sample2(d, gx0 + wx * fall / res, gy0 + wy * fall / res)
        dm = sample2(depth_mod, gx0 + wx * fall / res, gy0 + wy * fall / res)
        rim = top_soft[::st, ::st]
        bot = rim - cliff * smooth(0, 6, de) - sink * dm * (1 - np.exp(-np.maximum(de, 0) / sink_fall))
        # broad shelves, the same level all the way round
        bench = 1.3 * np.sin(z * 0.27 + 0.8) + 0.8 * np.sin(z * 0.61)
        V[:, :, k] = np.minimum(z - bot, (de + bench * fall) * 1.1).T
    gvx, gvy, gvz = np.gradient(V, rc)
    gn = np.sqrt(gvx ** 2 + gvy ** 2 + gvz ** 2) + 1e-4
    gvx, gvy, gvz = gvx / gn, gvy / gn, gvz / gn
    del gn
    def sample_c(arr, px, py, pz):
        fx, fy, fz = (px - cxs[0]) / rc, (py - cys[0]) / rc, (pz - czs[0]) / rc
        fx, fy, fz = np.clip(fx, 0, arr.shape[0] - 1.001), np.clip(fy, 0, arr.shape[1] - 1.001), np.clip(fz, 0, arr.shape[2] - 1.001)
        ix, iy, iz = fx.astype(np.int32), fy.astype(np.int32), fz.astype(np.int32)
        tx, ty, tz = fx - ix, fy - iy, fz - iz
        c00 = arr[ix, iy, iz] * (1 - tx) + arr[ix + 1, iy, iz] * tx
        c10 = arr[ix, iy + 1, iz] * (1 - tx) + arr[ix + 1, iy + 1, iz] * tx
        c01 = arr[ix, iy, iz + 1] * (1 - tx) + arr[ix + 1, iy, iz + 1] * tx
        c11 = arr[ix, iy + 1, iz + 1] * (1 - tx) + arr[ix + 1, iy + 1, iz + 1] * tx
        return (c00 * (1 - ty) + c10 * ty) * (1 - tz) + (c01 * (1 - ty) + c11 * ty) * tz
    # slab-shaped seeds on a jittered grid
    cxy, cz = facet
    nsx, nsy, nsz = int((xs[-1] - xs[0]) / cxy) + 3, int((ys[-1] - ys[0]) / cxy) + 3, int((zs[-1] - zs[0]) / cz) + 3
    I, J, K = np.meshgrid(np.arange(nsx), np.arange(nsy), np.arange(nsz), indexing='ij')
    Sx = xs[0] + (I + 0.1 + 0.8 * r.random(I.shape)) * cxy
    Sy = ys[0] + (J + 0.1 + 0.8 * r.random(I.shape)) * cxy
    Sz = zs[0] + (K + 0.15 + 0.7 * r.random(I.shape)) * cz
    layer = r.normal(0, 0.8, nsz)[K]
    Off = layer + r.normal(0, 0.45, I.shape)
    Sv = sample_c(V, Sx, Sy, Sz) + Off
    Sgx, Sgy, Sgz = sample_c(gvx, Sx, Sy, Sz), sample_c(gvy, Sx, Sy, Sz), sample_c(gvz, Sx, Sy, Sz)
    Sn = np.sqrt(Sgx ** 2 + Sgy ** 2 + Sgz ** 2) + 1e-3
    Sgx, Sgy, Sgz = Sgx / Sn, Sgy / Sn, Sgz / Sn
    log(name, 'volume', len(xs), len(ys), len(zs), f'{len(xs) * len(ys) * len(zs) / 1e6:.0f}M', 'seeds', nsx * nsy * nsz)
    f = np.zeros((len(xs), len(ys), len(zs)), np.float32)
    X, Y = np.meshgrid(xs, ys)
    band_w = 9.0
    for k, z in enumerate(zs):
        below = top - z
        vs = sample_c(V, X, Y, np.full(X.shape, z, np.float32))
        vf = vs.copy()
        band = (np.abs(vs) < band_w) & (below > -1.0)
        if band.any():
            px, py = X[band], Y[band]
            pz = np.full(px.shape, z, np.float32)
            ux, uy, uz = (px - xs[0]) / cxy, (py - ys[0]) / cxy, (pz - zs[0]) / cz
            ci, cj, ck = ux.astype(np.int32), uy.astype(np.int32), uz.astype(np.int32)
            best = np.full(px.shape, 1e9, np.float32)
            bi = np.zeros(px.shape, np.int32)
            bj = np.zeros(px.shape, np.int32)
            bk = np.zeros(px.shape, np.int32)
            for a in (-1, 0, 1):
                ni = np.clip(ci + a, 0, nsx - 1)
                for b in (-1, 0, 1):
                    nj = np.clip(cj + b, 0, nsy - 1)
                    for c in (-1, 0, 1):
                        nk = np.clip(ck + c, 0, nsz - 1)
                        dd = ((Sx[ni, nj, nk] - px) / cxy) ** 2 + ((Sy[ni, nj, nk] - py) / cxy) ** 2 + ((Sz[ni, nj, nk] - pz) / cz) ** 2
                        hit = dd < best
                        best[hit] = dd[hit]
                        bi[hit], bj[hit], bk[hit] = ni[hit], nj[hit], nk[hit]
            vf[band] = (Sv[bi, bj, bk] + Sgx[bi, bj, bk] * (px - Sx[bi, bj, bk]) + Sgy[bi, bj, bk] * (py - Sy[bi, bj, bk])
                        + Sgz[bi, bj, bk] * (pz - Sz[bi, bj, bk]))
        f[:, :, k] = np.minimum(below, vf).T
        if k % 100 == 0:
            log(name, 'slice', k, '/', len(zs))
    f[0], f[-1] = -1, -1
    f[:, 0], f[:, -1] = -1, -1
    f[:, :, 0], f[:, :, -1] = -1, -1
    del V, gvx, gvy, gvz
    verts, quads = surface_nets(f, (xs[0], ys[0], zs[0]), res)
    log(name, 'nets', len(verts), 'verts', len(quads), 'quads')
    verts, quads = drop_specks(verts, quads)
    log(name, 'after specks', len(verts))
    # Relax the rock a little: this takes out the voxel staircase on shallow planes and softens each chisel edge into a small bevel.
    # The walkable top keeps its exact heights.
    tz0 = sample2(top, (verts[:, 0] - xs[0]) / res, (verts[:, 1] - ys[0]) / res) - verts[:, 2]
    free = smooth(0.3, 1.2, tz0)[:, None]
    for _ in range(int(os.environ.get('RELAX', 5))):
        acc = np.zeros_like(verts)
        cnt = np.zeros(len(verts), np.float32)
        for a_, b_ in ((0, 1), (1, 2), (2, 3), (3, 0)):
            np.add.at(acc, quads[:, a_], verts[quads[:, b_]])
            np.add.at(cnt, quads[:, a_], 1)
            np.add.at(acc, quads[:, b_], verts[quads[:, a_]])
            np.add.at(cnt, quads[:, b_], 1)
        avg = acc / np.maximum(cnt, 1)[:, None]
        verts = verts + (avg - verts) * 0.6 * free
    # cavity: a blurred copy of the solid against the surface. Dark in cracks, light on edges.
    s = f[::2, ::2, ::2].clip(-3, 3)
    for ax in range(3):
        for _ in range(2):
            s = (np.roll(s, 2, ax) + np.roll(s, 1, ax) + s + np.roll(s, -1, ax) + np.roll(s, -2, ax)) / 5
    gi = np.clip(((verts - np.array([xs[0], ys[0], zs[0]])) / (res * 2)).astype(np.int32), 0, np.array(s.shape) - 1)
    cav = s[gi[:, 0], gi[:, 1], gi[:, 2]]
    tz = sample2(top, (verts[:, 0] - xs[0]) / res, (verts[:, 1] - ys[0]) / res) - verts[:, 2]
    np.savez(os.path.join(OUT, f'mesh_{name}.npz'), verts=verts, quads=quads, cav=cav.astype(np.float32), tz=tz.astype(np.float32),
             zmin=zmin, zmax=zmax)
    # a coarse copy for the blueprint's wireframe, pulled onto the real surface along the field's gradient
    step = max(1, int(round(WIRE_CELL / res)))
    fc = f[::step, ::step, ::step]
    cv, cq = surface_nets(fc, (xs[0], ys[0], zs[0]), res * step)
    cv, cq = drop_specks(cv, cq, 20)
    half = f[::2, ::2, ::2].clip(-6, 6)
    gx, gy, gz = np.gradient(half, res * 2)
    for _ in range(4):
        i = np.clip(((cv - np.array([xs[0], ys[0], zs[0]])) / (res * 2)).astype(np.int32), 0, np.array(gx.shape) - 1)
        val = half[i[:, 0], i[:, 1], i[:, 2]]
        g = np.stack([gx[i[:, 0], i[:, 1], i[:, 2]], gy[i[:, 0], i[:, 1], i[:, 2]], gz[i[:, 0], i[:, 1], i[:, 2]]], 1)
        g2 = np.maximum((g * g).sum(1, keepdims=True), 0.05)
        cv = cv - (val[:, None] * g / g2) * 0.6
    np.savez(os.path.join(OUT, f'wire_{name}.npz'), verts=cv.astype(np.float32), quads=cq)
    return verts, quads

def drop_specks(verts, quads, min_q=400):
    """Union-find over quads: removes tiny floating crumbs from the nets."""
    parent = np.arange(len(verts))
    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a
    # numpy label propagation is faster than a Python union-find at this size
    lab = np.arange(len(verts), dtype=np.int64)
    for _ in range(200):
        m = lab[quads].min(1)
        new = lab.copy()
        for c in range(4):
            np.minimum.at(new, quads[:, c], m)
        new = new[new]
        if (new == lab).all():
            break
        lab = new
    qlab = lab[quads[:, 0]]
    u, cnt = np.unique(qlab, return_counts=True)
    keep = np.isin(qlab, u[cnt >= min_q])
    quads = quads[keep]
    used = np.unique(quads)
    remap = np.full(len(verts), -1, np.int32)
    remap[used] = np.arange(len(used))
    return verts[used], remap[quads]

# ---------------------------------------------------------------- the main island's top surface
xs = np.arange(MAIN_X[0], MAIN_X[1], RES, dtype=np.float32)
ys = np.arange(MAIN_Y[0], MAIN_Y[1], RES, dtype=np.float32)
X, Y = np.meshgrid(xs, ys)
sh = X.shape
log('main grid', sh)
mask = outline(xs, ys, MAIN_LOBES, 100)
d = (edt(mask) - edt(~mask)) * RES
log('edt', d.max())

base = 4.5 * smooth(0, 22, d) + 2.6 * fbm2(sh, 60 / RES, 110, 2, 0.35) * smooth(0, 16, d)
# rolling ground, then the hills
hills = np.zeros(sh, np.float32)
for hxy, hh, hr, terr in HILLS:
    r = np.sqrt((X - hxy[0]) ** 2 + (Y - hxy[1]) ** 2)
    hills = np.maximum(hills, hh * np.exp(-(r / hr) ** 2.1))
nh = fbm2(sh, 34 / RES, 120, 2, 0.4)
hills_n = hills * (1 + 0.1 * nh) + 1.2 * nh * smooth(1, 8, hills)
# terraces: flat treads and steep risers, the same steps contour lines will trace in the blueprint
step = TERRACE
t = hills_n / step
frac = t - np.floor(t)
terr = step * (np.floor(t) + smooth(0.62, 1.0, frac))
hills_t = lerp(hills_n, terr, 0.9)
top = base + hills_t
log('heights')

# flat pads for the village and the summit
for (cx, cy), rad, level in PADS:
    r = np.sqrt((X - cx) ** 2 + (Y - cy) ** 2)
    k = smooth(rad * 1.45, rad * 0.8, r + 2.5 * fbm2(sh, 12 / RES, 130, 2))
    z0 = sample2(top, np.array([(cx - xs[0]) / RES]), np.array([(cy - ys[0]) / RES]))[0] if level is None else level
    top = lerp(top, z0, k)

# the main path: its own smooth profile, cut into the land
path = spline(MAIN_PATH, 0.4)
pz = sample2(top, (path[:, 0] - xs[0]) / RES, (path[:, 1] - ys[0]) / RES)
# one long easy ramp: smooth hard, then never let it fall going up the hill
kernel = np.hanning(121)
kernel /= kernel.sum()
pz2 = np.convolve(np.pad(pz, 60, mode='edge'), kernel, 'valid')
climb = int(len(path) * 0.55)
pz2[climb:] = np.maximum.accumulate(pz2[climb:])
pz2 = np.convolve(np.pad(pz2, 25, mode='edge'), np.hanning(51) / np.hanning(51).sum(), 'valid')
pdist, pnear = stamp_dist(path, xs, ys, 12)
pk = smooth(PATH_W + 3.0, PATH_W - 0.4, pdist)
top = lerp(top, pz2[pnear], pk)
for spur in SIDE_PATHS:
    p2 = spline(spur, 0.4)
    z2 = sample2(top, (p2[:, 0] - xs[0]) / RES, (p2[:, 1] - ys[0]) / RES)
    k2 = np.hanning(31)
    k2 /= k2.sum()
    z2 = np.convolve(np.pad(z2, 15, mode='edge'), k2, 'valid')
    dd, nn = stamp_dist(p2, xs, ys, 9)
    top = lerp(top, z2[nn], smooth(PATH_W * 0.72 + 2.2, PATH_W * 0.72 - 0.4, dd))
    pdist = np.minimum(pdist, dd + (PATH_W - PATH_W * 0.72))
log('paths')

# the river: runs downhill from the spring, through the lake, and off the front of the island
river = spline(RIVER, 0.4)
rz = sample2(top, (river[:, 0] - xs[0]) / RES, (river[:, 1] - ys[0]) / RES)
rz = np.minimum.accumulate(rz)
k3 = np.hanning(41)
k3 /= k3.sum()
rz = np.convolve(np.pad(rz, 20, mode='edge'), k3, 'valid')
rdist, rnear = stamp_dist(river, xs, ys, 16)
lake_d = np.full(sh, 1e3, np.float32)
for cx, cy, a, b in LAKES:
    lake_d = np.minimum(lake_d, (np.sqrt(((X - cx) / a) ** 2 + ((Y - cy) / b) ** 2) - 1) * min(a, b))
lake_d += 1.6 * fbm2(sh, 14 / RES, 140, 3)
# the water's level is continuous: river profile outside, lake level around the lake
lake_level = float(np.median(rz[np.argmin(np.abs(river[:, 1] - LAKES[0][1])):][:6])) - 0.4
river_w = RIVER_W * (0.75 + 0.5 * smooth(0, len(river), rnear.astype(np.float32)))
river_w = river_w + 1.2 * fft_noise2(sh, 10 / RES, 141)
water_z = rz[rnear] - 0.9
near_lake = smooth(30, 4, lake_d)
water_z = lerp(water_z, lake_level, near_lake)
bank = np.minimum(rdist - river_w, lake_d)
# carve: bed falls below the water level, banks blend back to the land
bed = water_z - 1.8 * smooth(0, -3.5, bank)
carve = smooth(5.5, 0, bank)
top_before_river = top.copy()
top = lerp(top, np.minimum(top, water_z + 0.25 + np.maximum(bank, 0) * 0.42), carve)
top = np.where(bank < 0, np.minimum(top, bed), top)
water_mask = bank < 1.2
log('water', lake_level)

# the rounded lip around the rim
lip = (1 - smooth(0, 3.0, d)) ** 2 * 1.4
top_final = top - lip

# a fine pass of ground undulation everywhere that isn't water, path or a pad
fine = 0.06 * fbm2(sh, 5 / RES, 150, 2, 0.4) * smooth(0.5, 3, pdist) * smooth(0.5, 3, bank)
top_final = top_final + fine

# ---------------------------------------------------------------- what can be walked on
gy_, gx_ = np.gradient(top_final, RES)
slope = np.sqrt(gx_ ** 2 + gy_ ** 2)
walk = (d > 1.5) & (slope < 0.85) & (bank > 0.2)
walk = walk | ((pdist < PATH_W * 0.95) & (d > 1.5) & (bank > 0.2))
# the bridge deck (the river cuts the path, the deck rejoins it)
bdist, bnear = stamp_dist(path, xs, ys, 6)
bridge_i = int(np.argmin(np.linalg.norm(path[:, :2] - np.array(BRIDGE), axis=1)))
along = np.abs(bnear.astype(np.float32) - bridge_i) * 0.4
bridge = (bdist < 2.8) & (along < 11)
deck_z = pz2[bridge_i]
nav_h = top_final.copy()
nav_h[bridge] = np.maximum(nav_h[bridge], deck_z + 0.8)
walk = walk | (bridge & (d > 1.5))
log('walkable', walk.mean())

np.savez_compressed(os.path.join(OUT, 'land.npz'), xs=xs, ys=ys, top=top_final, nav_h=nav_h, d=d, walk=walk, slope=slope, pdist=pdist, bank=bank,
                    water_z=water_z, water_mask=water_mask, lake_d=lake_d, rdist=rdist, path=path, pz=pz2, river=river, rz=rz, bridge_i=bridge_i,
                    deck_z=deck_z, lake_level=lake_level, RES=RES)

# ---------------------------------------------------------------- solid rock
m = rock_volume('main', xs, ys, top_final, d, 200, cliff=MAIN_CLIFF, sink=MAIN_SINK, sink_fall=MAIN_SINK_FALL, spike=0.65, facet=(9.5, 3.6))

# ---------------------------------------------------------------- the other islands: smaller, simpler, coarser
for isl in ISLANDS:
    res = max(RES, isl.get('res', RES))
    (ax, ay), (bx, by) = isl['box']
    ixs = np.arange(ax, bx, res, dtype=np.float32)
    iys = np.arange(ay, by, res, dtype=np.float32)
    X2, Y2 = np.meshgrid(ixs, iys)
    sh2 = X2.shape
    seed = isl['seed']
    mask2 = outline(ixs, iys, isl['lobes'], seed, warp=isl.get('warp', 5.0), fine=isl.get('fine', 1.5))
    d2 = (edt(mask2) - edt(~mask2)) * res
    t2 = isl['z'] + isl.get('roll', 2.5) * smooth(0, 10, d2) + isl.get('rough', 1.4) * fbm2(sh2, 20 / res, seed + 5, 4) * smooth(0, 8, d2)
    for hxy, hh, hr, in isl.get('hills', []):
        r = np.sqrt((X2 - hxy[0]) ** 2 + (Y2 - hxy[1]) ** 2)
        raw = hh * np.exp(-(r / hr) ** 2.1) * (1 + 0.25 * fbm2(sh2, 14 / res, seed + 6, 3))
        tt = raw / isl.get('terrace', 3.6)
        terr2 = isl.get('terrace', 3.6) * (np.floor(tt) + smooth(0.62, 1.0, tt - np.floor(tt)))
        t2 = t2 + lerp(raw, terr2, 0.85)
    for (cx, cy), rad, level in isl.get('pads', []):
        r = np.sqrt((X2 - cx) ** 2 + (Y2 - cy) ** 2)
        k = smooth(rad * 1.5, rad * 0.8, r)
        z0 = sample2(t2, np.array([(cx - ixs[0]) / res]), np.array([(cy - iys[0]) / res]))[0] if level is None else level
        t2 = lerp(t2, z0, k)
    t2 = t2 - (1 - smooth(0, 2.5, d2)) ** 2 * 1.0
    rock_volume(isl['name'], ixs, iys, t2, d2, seed + 50, cliff=isl.get('cliff', 6), sink=isl.get('sink', 26), sink_fall=isl.get('fall', 16), spike=isl.get('spike', 0.6), facet=isl.get('facet', (6.0, 2.6)))
    gy2, gx2 = np.gradient(t2, res)
    np.savez_compressed(os.path.join(OUT, f'top_{isl["name"]}.npz'), xs=ixs, ys=iys, top=t2, d=d2, slope=np.sqrt(gx2 ** 2 + gy2 ** 2))
log('done')
