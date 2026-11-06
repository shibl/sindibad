# Shared numpy helpers for the X-ray lens world: spectral noise, distance transforms, surface nets, fast mesh creation.
# Everything is seeded so a rebuild gives exactly the same world. Blender's bundled Python has numpy and nothing else.
import numpy as np

def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)

def lerp(a, b, t):
    return a + (b - a) * t

def lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def hx(s):
    s = s.lstrip('#')
    return np.array([lin(int(s[i:i + 2], 16) / 255) for i in (0, 2, 4)], np.float32)

def fft_noise2(shape, cell, seed, beta=None):
    """Band-limited tiling noise. cell is the feature size in pixels. Normalised to roughly -1..1."""
    r = np.random.default_rng(seed)
    w = r.standard_normal(shape, dtype=np.float32)
    fy = np.fft.fftfreq(shape[0])[:, None]
    fx = np.fft.rfftfreq(shape[1])[None, :]
    k = np.sqrt(fx * fx + fy * fy)
    if beta is None:
        k0 = 1.0 / max(cell, 1e-3)
        filt = np.exp(-0.5 * (np.log(np.maximum(k, 1e-6) / k0) / 0.55) ** 2)
    else:
        filt = np.maximum(k, 1.0 / cell) ** (-beta)
    out = np.fft.irfft2(np.fft.rfft2(w) * filt, s=shape).astype(np.float32)
    return out / (out.std() * 2.2 + 1e-9)

def fbm2(shape, cell, seed, octaves=5, gain=0.5):
    out = np.zeros(shape, np.float32)
    amp, tot = 1.0, 0.0
    for i in range(octaves):
        out += amp * fft_noise2(shape, max(cell / 2 ** i, 1.5), seed + i * 17)
        tot += amp
        amp *= gain
    return out / tot * 1.5

def ridged2(shape, cell, seed, octaves=4, gain=0.5):
    out = np.zeros(shape, np.float32)
    amp, tot = 1.0, 0.0
    for i in range(octaves):
        n = fft_noise2(shape, max(cell / 2 ** i, 1.5), seed + i * 23)
        out += amp * (1 - np.abs(n) * 1.6)
        tot += amp
        amp *= gain
    return out / tot

def noise3(n, cell, seed):
    """A cube of tiling band-limited noise."""
    r = np.random.default_rng(seed)
    w = r.standard_normal((n, n, n), dtype=np.float32)
    f = np.fft.fftfreq(n)
    fz = np.fft.rfftfreq(n)
    fx, fy = f[:, None, None], f[None, :, None]
    k = np.sqrt(fx * fx + fy * fy + fz[None, None, :] ** 2)
    k0 = 1.0 / cell
    filt = np.exp(-0.5 * (np.log(np.maximum(k, 1e-6) / k0) / 0.5) ** 2)
    out = np.fft.irfftn(np.fft.rfftn(w) * filt, s=(n, n, n)).astype(np.float32)
    return out / (out.std() * 2.2)

def sample2(a, x, y):
    """Bilinear sample with clamped coordinates. a is indexed [iy, ix]."""
    x = np.clip(x, 0, a.shape[1] - 1.001)
    y = np.clip(y, 0, a.shape[0] - 1.001)
    ix, iy = x.astype(np.int32), y.astype(np.int32)
    fx, fy = x - ix, y - iy
    return (a[iy, ix] * (1 - fx) * (1 - fy) + a[iy, ix + 1] * fx * (1 - fy)
            + a[iy + 1, ix] * (1 - fx) * fy + a[iy + 1, ix + 1] * fx * fy)

def sample3(v, x, y, z):
    """Trilinear periodic sample of a cube."""
    n = v.shape[0]
    x, y, z = np.mod(x, n), np.mod(y, n), np.mod(z, n)
    ix, iy, iz = x.astype(np.int32), y.astype(np.int32), z.astype(np.int32)
    fx, fy, fz = x - ix, y - iy, z - iz
    jx, jy, jz = (ix + 1) % n, (iy + 1) % n, (iz + 1) % n
    c00 = v[ix, iy, iz] * (1 - fx) + v[jx, iy, iz] * fx
    c10 = v[ix, jy, iz] * (1 - fx) + v[jx, jy, iz] * fx
    c01 = v[ix, iy, jz] * (1 - fx) + v[jx, iy, jz] * fx
    c11 = v[ix, jy, jz] * (1 - fx) + v[jx, jy, jz] * fx
    return (c00 * (1 - fy) + c10 * fy) * (1 - fz) + (c01 * (1 - fy) + c11 * fy) * fz

def blur(a, sigma):
    """Gaussian blur by FFT, with edge padding so the borders don't wrap."""
    if sigma <= 0:
        return a
    pad = int(sigma * 3) + 1
    if a.ndim == 2:
        p = np.pad(a, pad, mode='edge')
        fy = np.fft.fftfreq(p.shape[0])[:, None]
        fx = np.fft.rfftfreq(p.shape[1])[None, :]
        g = np.exp(-2 * (np.pi * sigma) ** 2 * (fx * fx + fy * fy))
        out = np.fft.irfft2(np.fft.rfft2(p) * g, s=p.shape)
        return out[pad:-pad, pad:-pad].astype(np.float32)
    return np.stack([blur(a[..., i], sigma) for i in range(a.shape[-1])], -1)

def _edt_1d(f):
    n = len(f)
    v = [0] * n
    z = [0.0] * (n + 1)
    k = 0
    z[0], z[1] = -1e20, 1e20
    d = [0.0] * n
    for q in range(1, n):
        fq = f[q] + q * q
        while True:
            s = (fq - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
            if s <= z[k]:
                k -= 1
            else:
                break
        k += 1
        v[k] = q
        z[k] = s
        z[k + 1] = 1e20
    k = 0
    for q in range(n):
        while z[k + 1] < q:
            k += 1
        d[q] = (q - v[k]) ** 2 + f[v[k]]
    return d

def edt(mask):
    """Euclidean distance (pixels) from each True pixel to the nearest False pixel. Felzenszwalb."""
    INF = 1e12
    g = np.where(mask, INF, 0.0).astype(np.float64)
    for ix in range(g.shape[1]):
        col = g[:, ix]
        if (col != col[0]).any():
            g[:, ix] = _edt_1d(col.tolist())
        elif col[0] > 0:
            g[:, ix] = INF
    for iy in range(g.shape[0]):
        row = g[iy]
        if (row != row[0]).any():
            g[iy] = _edt_1d(row.tolist())
    return np.sqrt(g).astype(np.float32)

def surface_nets(f, origin, h):
    """f is a float volume, positive inside. Returns verts (n,3), quads (m,4) with outward winding."""
    s = f > 0
    nx, ny, nz = f.shape
    mixed = np.zeros((nx - 1, ny - 1, nz - 1), np.uint8)
    for i, (dx, dy, dz) in enumerate(((0, 0, 0), (1, 0, 0), (0, 1, 0), (1, 1, 0), (0, 0, 1), (1, 0, 1), (0, 1, 1), (1, 1, 1))):
        mixed |= (s[dx:nx - 1 + dx, dy:ny - 1 + dy, dz:nz - 1 + dz].astype(np.uint8) << i)
    cells = np.nonzero((mixed != 0) & (mixed != 255))
    del mixed
    ci, cj, ck = cells
    ids = (ci.astype(np.int64) * ny + cj) * nz + ck
    corners = np.array([(0, 0, 0), (1, 0, 0), (0, 1, 0), (1, 1, 0), (0, 0, 1), (1, 0, 1), (0, 1, 1), (1, 1, 1)])
    edges = [(0, 1), (2, 3), (4, 5), (6, 7), (0, 2), (1, 3), (4, 6), (5, 7), (0, 4), (1, 5), (2, 6), (3, 7)]
    val = np.stack([f[ci + c[0], cj + c[1], ck + c[2]] for c in corners], 1)
    tot = np.zeros((len(ci), 3), np.float32)
    cnt = np.zeros(len(ci), np.float32)
    for a, b in edges:
        va, vb = val[:, a], val[:, b]
        cross = (va > 0) != (vb > 0)
        t = np.where(cross, va / np.where(va - vb == 0, 1, va - vb), 0)
        p = corners[a][None, :] + (corners[b] - corners[a])[None, :] * t[:, None]
        tot += p * cross[:, None]
        cnt += cross
    pos = tot / cnt[:, None]
    verts = (np.stack([ci, cj, ck], 1) + pos) * h + np.asarray(origin, np.float32)
    # quads around each sign-changing grid edge
    qs = []
    def look(a, b, c):
        q = (a.astype(np.int64) * ny + b) * nz + c
        return np.searchsorted(ids, q)
    ex = np.nonzero(s[:-1, 1:-1, 1:-1] != s[1:, 1:-1, 1:-1])
    i, j, k = ex[0], ex[1] + 1, ex[2] + 1
    q = np.stack([look(i, j - 1, k - 1), look(i, j, k - 1), look(i, j, k), look(i, j - 1, k)], 1)
    q[s[i, j, k] == False] = q[s[i, j, k] == False][:, ::-1]
    qs.append(q)
    ey = np.nonzero(s[1:-1, :-1, 1:-1] != s[1:-1, 1:, 1:-1])
    i, j, k = ey[0] + 1, ey[1], ey[2] + 1
    q = np.stack([look(i - 1, j, k - 1), look(i - 1, j, k), look(i, j, k), look(i, j, k - 1)], 1)
    q[s[i, j, k] == False] = q[s[i, j, k] == False][:, ::-1]
    qs.append(q)
    ez = np.nonzero(s[1:-1, 1:-1, :-1] != s[1:-1, 1:-1, 1:])
    i, j, k = ez[0] + 1, ez[1] + 1, ez[2]
    q = np.stack([look(i - 1, j - 1, k), look(i, j - 1, k), look(i, j, k), look(i - 1, j, k)], 1)
    q[s[i, j, k] == False] = q[s[i, j, k] == False][:, ::-1]
    qs.append(q)
    return verts.astype(np.float32), np.concatenate(qs, 0).astype(np.int32)

def mesh_new(bpy, name, verts, faces, coll=None, smooth_shade=True, attrs=None, material=None, sizes=None):
    """Build a mesh object fast. faces is (m,k) for uniform polygons, or a flat index list with `sizes`."""
    me = bpy.data.meshes.new(name)
    verts = np.asarray(verts, np.float32)
    me.vertices.add(len(verts))
    me.vertices.foreach_set('co', verts.ravel())
    if sizes is None:
        faces = np.asarray(faces, np.int32)
        k = faces.shape[1]
        flat = faces.ravel()
        starts = np.arange(len(faces), dtype=np.int32) * k
    else:
        flat = np.asarray(faces, np.int32)
        starts = np.concatenate([[0], np.cumsum(sizes)[:-1]]).astype(np.int32)
    me.loops.add(len(flat))
    me.loops.foreach_set('vertex_index', flat)
    me.polygons.add(len(starts))
    me.polygons.foreach_set('loop_start', starts)
    me.update(calc_edges=True)
    if smooth_shade:
        me.shade_smooth()
    for key, val in (attrs or {}).items():
        val = np.asarray(val, np.float32)
        if val.ndim == 1:
            val = np.stack([val, val, val, np.ones_like(val)], 1)
        elif val.shape[1] == 3:
            val = np.concatenate([val, np.ones((len(val), 1), np.float32)], 1)
        a = me.color_attributes.new(key, 'FLOAT_COLOR', 'POINT')
        a.data.foreach_set('color', val.ravel())
    if material is not None:
        me.materials.append(material)
    ob = bpy.data.objects.new(name, me)
    (coll or bpy.context.scene.collection).objects.link(ob)
    return ob

def icosphere(sub):
    """Verts and triangles of a unit icosphere."""
    t = (1 + 5 ** 0.5) / 2
    v = [(-1, t, 0), (1, t, 0), (-1, -t, 0), (1, -t, 0), (0, -1, t), (0, 1, t), (0, -1, -t), (0, 1, -t), (t, 0, -1), (t, 0, 1), (-t, 0, -1), (-t, 0, 1)]
    f = [(0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11), (1, 5, 9), (5, 11, 4), (11, 10, 2), (10, 7, 6), (7, 1, 8),
         (3, 9, 4), (3, 4, 2), (3, 2, 6), (3, 6, 8), (3, 8, 9), (4, 9, 5), (2, 4, 11), (6, 2, 10), (8, 6, 7), (9, 8, 1)]
    v = [np.array(p, float) / np.linalg.norm(p) for p in v]
    for _ in range(sub):
        cache = {}
        nf = []
        def mid(a, b):
            key = (min(a, b), max(a, b))
            if key not in cache:
                m = v[a] + v[b]
                v.append(m / np.linalg.norm(m))
                cache[key] = len(v) - 1
            return cache[key]
        for a, b, c in f:
            ab, bc, ca = mid(a, b), mid(b, c), mid(c, a)
            nf += [(a, ab, ca), (b, bc, ab), (c, ca, bc), (ab, bc, ca)]
        f = nf
    return np.array(v, np.float32), np.array(f, np.int32)

def poisson(mask, spacing, seed, tries=30, max_points=100000):
    """Dart-throwing Poisson disc samples over the True pixels of mask, spacing in pixels (float or array)."""
    r = np.random.default_rng(seed)
    ys, xs = np.nonzero(mask)
    if len(xs) == 0:
        return np.zeros((0, 2), np.float32)
    order = r.permutation(len(xs))
    s0 = float(np.max(spacing)) if np.ndim(spacing) else float(spacing)
    grid = {}
    pts = []
    for i in order:
        x, y = float(xs[i]) + r.random(), float(ys[i]) + r.random()
        sp = float(spacing[int(y), int(x)]) if np.ndim(spacing) else s0
        gx, gy = int(x / s0), int(y / s0)
        ok = True
        for ax in range(gx - 1, gx + 2):
            for ay in range(gy - 1, gy + 2):
                for (px, py) in grid.get((ax, ay), ()):
                    if (px - x) ** 2 + (py - y) ** 2 < sp * sp:
                        ok = False
                        break
                if not ok:
                    break
            if not ok:
                break
        if ok:
            grid.setdefault((gx, gy), []).append((x, y))
            pts.append((x, y))
            if len(pts) >= max_points:
                break
    return np.array(pts, np.float32)
