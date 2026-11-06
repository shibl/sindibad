# Paints the game's textures from nothing: the panorama of clouds, tiling water and foam, and a few small sprites.
#   OUT=<Assets/Art/Textures> Blender -b --factory-startup --python gen_textures.py
# The sun's direction here must match SailGame.SunAz, because the clouds are painted lit from it.
import bpy, math, os, sys, time
import numpy as np

OUT = os.environ['OUT']
ONLY = os.environ.get('ONLY', '')
SUN_AZ = 24.0     # degrees east of north
SUN_EL = 9.0
rng = np.random.default_rng(5)


def save(name, rgba, srgb=False):
    """Writes an array (rows top to bottom, floats 0-1) as PNG."""
    h, w = rgba.shape[:2]
    if rgba.ndim == 2:
        rgba = np.stack([rgba, rgba, rgba, np.ones_like(rgba)], 2)
    if rgba.shape[2] == 3:
        rgba = np.concatenate([rgba, np.ones((h, w, 1), rgba.dtype)], 2)
    img = bpy.data.images.new(name, w, h, alpha=True, float_buffer=False)
    img.colorspace_settings.name = 'sRGB' if srgb else 'Non-Color'
    img.alpha_mode = 'STRAIGHT'
    img.pixels.foreach_set(np.clip(rgba[::-1], 0, 1).astype(np.float32).ravel())
    img.filepath_raw = os.path.join(OUT, name + '.png')
    img.file_format = 'PNG'
    img.save()
    bpy.data.images.remove(img)
    print('wrote', name, w, h, flush=True)


def blur(a, k, axis=None):
    """Gaussian blur with wrap on both axes, by FFT."""
    h, w = a.shape[:2]
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.rfftfreq(w)[None, :]
    if isinstance(k, tuple):
        ky, kx = k
    else:
        ky = kx = k
    g = np.exp(-2 * (np.pi ** 2) * ((fy * ky) ** 2 + (fx * kx) ** 2))
    return np.fft.irfft2(np.fft.rfft2(a) * g, s=(h, w))


def spectral(h, w, beta, seed, lo=0.0, hi=1e9, ax=1.0, ay=1.0):
    """Tiling noise with a power-law spectrum, stretchable along each axis."""
    r = np.random.default_rng(seed)
    fy = np.fft.fftfreq(h)[:, None] * h * ay
    fx = np.fft.rfftfreq(w)[None, :] * w * ax
    f = np.sqrt(fx * fx + fy * fy)
    f[0, 0] = 1e9
    amp = f ** (-beta / 2.0)
    amp[(f < lo) | (f > hi)] = 0
    ph = np.exp(2j * np.pi * r.random(f.shape))
    n = np.fft.irfft2(amp * ph, s=(h, w))
    n -= n.mean()
    return n / max(n.std(), 1e-6)


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


# ------------------------------------------------------------------------------------ the cloud panorama
_tab = np.random.default_rng(77).random((512, 512), dtype=np.float32)


def vn(x, y):
    xi = np.floor(x).astype(np.int32)
    yi = np.floor(y).astype(np.int32)
    fx = x - xi
    fy = y - yi
    fx = fx * fx * (3 - 2 * fx)
    fy = fy * fy * (3 - 2 * fy)
    a = _tab[xi & 511, yi & 511]
    b = _tab[(xi + 1) & 511, yi & 511]
    c = _tab[xi & 511, (yi + 1) & 511]
    d = _tab[(xi + 1) & 511, (yi + 1) & 511]
    return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy


def fbm(x, y, oct=4, gain=0.5):
    s = 0
    amp = 1
    tot = 0
    for i in range(oct):
        s = s + amp * vn(x + i * 31.7, y - i * 17.3)
        tot += amp
        amp *= gain
        x = x * 2.03
        y = y * 2.03
    return s / tot * 2 - 1


def clouds():
    """Red is cumulus density, green how much sun it catches, blue thin high cloud. Painted over azimuth and elevation,
    so the shapes are right once the shader wraps them around the sky. It's painted at twice the size it's stored at."""
    W, H = 4096, 1024
    T = time.time()
    az = (np.arange(W) + 0.5) / W * 360.0
    v = (np.arange(H) + 0.5) / H                     # v = 0 at the horizon, 1 at the zenith
    el = 90.0 * v * v
    A = np.zeros((H, W), np.float32)
    G = np.zeros((H, W), np.float32)

    def daz(a, b):
        return (a - b + 540) % 360 - 180

    def bank(az0, el0, width, height, n):
        """One cloud or a line of them: a soft union of spheres with a flat base, lit from where the sun is."""
        x0 = int(((az0 - width * 1.35) % 360) / 360 * W)
        nx = int(width * 2.7 / 360 * W)
        idx_x = (x0 + np.arange(nx)) % W
        jm = np.searchsorted(el, max(0.0, el0 - height * 0.15))
        jx = min(np.searchsorted(el, el0 + height * 1.45), H)
        rows = np.arange(jm, jx)
        if len(rows) < 4 or nx < 4:
            return
        X = daz(az[idx_x], az0)[None, :].astype(np.float32)
        Y = (el[rows] - el0)[:, None].astype(np.float32)
        XY = np.broadcast_arrays(X, Y)
        seed = rng.uniform(0, 400)
        k = 7.0 / height                              # noise in cloud-sized units
        n1 = fbm(XY[0] * k + seed, XY[1] * k * 1.3 + seed, 3)
        n2 = fbm(XY[0] * k * 3 + seed, XY[1] * k * 3.8 + seed, 4)
        n3 = fbm(XY[0] * k * 9 + seed, XY[1] * k * 11 + seed, 3)
        XX = XY[0] + n1 * height * 0.05
        YY = XY[1] + n2 * height * 0.03
        P = 4.0
        acc = np.zeros(XX.shape, np.float32)
        for i in range(n):
            u = rng.uniform(-1, 1)
            env = max(1 - abs(u) ** 1.5, 0.05)
            t = rng.uniform(0, 1) ** 1.25
            cy = t * height * env * 0.92
            # Big soft forms low down, tighter cauliflower up top.
            r = height * rng.uniform(0.13, 0.3) * (0.65 + 0.7 * (1 - t)) * (0.55 + 0.55 * env)
            cy = max(cy, r * 0.25)
            d2 = (XX - u * width) ** 2 + (YY - cy) ** 2
            z = np.maximum(r * r - d2, 0)
            acc += z ** (P / 2)
        Z = acc ** (1 / P)
        # Flat underneath, with a soft lumpy line.
        base = smooth(-height * 0.015, height * 0.09, YY + n2 * height * 0.03)
        Z = Z * base
        zf = Z + (n2 * 0.4 + n3 * 0.05) * height * 0.04 * smooth(0, height * 0.1, Z)
        edge = height * 0.012 + 0.04
        a = smooth(0, edge, zf)
        sx = 360.0 / W
        gy, gx = np.gradient(zf)
        gx = gx / sx
        gy = gy / np.maximum(np.gradient(el[rows])[:, None], 1e-3)
        m = np.sqrt(gx * gx + gy * gy + 1)
        sun_dx = daz(SUN_AZ, az0)
        along = math.exp(-(abs(sun_dx) / 70.0) ** 2)    # near the sun the cloud is backlit, and only its rim catches light
        lx = math.copysign(1, sun_dx) * (0.3 + 0.7 * min(abs(sun_dx) / 60.0, 1))
        ly = 0.42
        lz = 0.18 + 0.72 * (1 - along)
        ln = math.sqrt(lx * lx + ly * ly + lz * lz)
        ndl = ((-gx / m) * lx + (-gy / m) * ly + (1 / m) * lz) / ln
        lit = np.clip(ndl * 0.74 + 0.3, 0, 1)
        # Bellies stay in shade, and it lifts as you go up the cloud.
        rise = np.clip(YY / height, 0, 1)
        lit = lit * (0.34 + 0.66 * smooth(0.02, 0.52, rise))
        rim = (1 - smooth(0, height * 0.075, zf)) * (0.35 + 0.65 * along)
        lit = np.clip(lit + rim * 1.05 * (0.4 + 0.6 * rise), 0, 1)
        i0 = np.ix_(rows, idx_x)
        G[i0] = lit * a + G[i0] * (1 - a)
        A[i0] = a + A[i0] * (1 - a)

    # Far to near. A window stays open around the sun, with banks framing it on either side.
    for k in range(60):
        a0 = rng.uniform(0, 360)
        if abs(daz(a0, SUN_AZ)) < 11:
            continue
        bank(a0, rng.uniform(0.2, 1.1), rng.uniform(4, 11), rng.uniform(1.0, 2.6), 26)
    for k in range(24):
        a0 = rng.uniform(0, 360)
        if abs(daz(a0, SUN_AZ)) < 15:
            continue
        bank(a0, rng.uniform(0.6, 2.4), rng.uniform(6, 14), rng.uniform(3.2, 6.4), 50)
    # The towers that frame the first view, and the ones ahead on each leg.
    big = [(-22, 1.8, 15, 14, 110), (64, 2.2, 13, 16, 110), (112, 1.8, 11, 11, 80), (176, 1.8, 18, 19, 150), (234, 2.4, 12, 13, 90), (288, 2.0, 17, 17, 130), (330, 1.8, 8, 9, 60)]
    for a0, e0, w0, h0, n in big:
        bank(a0, e0, w0, h0, n)
    print('banks', time.time() - T, flush=True)

    # Altocumulus: small drifting flocks of cloud, only where the noise says so.
    AZ, EL = np.meshgrid(az, el)
    cos = np.cos(np.radians(EL))
    nx = AZ * 0.32
    ny = EL * 0.42
    mask = smooth(0.1, 0.42, fbm(nx * 0.16, ny * 0.16 + 30, 3))
    flock = smooth(0.0, 0.55, fbm(nx * 1.4 + 7, ny * 1.4 + 11, 4) + 0.1 * fbm(nx * 5, ny * 5, 2))
    F = flock * mask * smooth(9, 17, EL) * smooth(42, 28, EL) * 0.85
    # Only groups of cloud survive: a lone small blob reads as a mistake once the edge is sharpened.
    F = F * smooth(0.3, 0.46, blur(F, 12.0))
    # Sun-side edges of each flock glow. Lit is simply how high up it sits on the small form.
    lit2 = np.clip(0.42 + 0.7 * fbm(nx * 1.4 + 7, (ny + 0.5) * 1.4 + 11, 4), 0, 0.8)
    G[:] = lit2 * F + G * (1 - F)
    A[:] = F + A * (1 - F)

    # High, combed cirrus: thin and streaked across the sky, in the blue channel.
    c = spectral(H, W, 3.0, 21, 2, 800, ax=0.14, ay=1.0)
    c2 = spectral(H, W, 2.6, 22, 2, 800, ax=0.28, ay=1.0)
    C = smooth(0.25, 1.9, c + 0.4 * c2)
    C = C * smooth(5, 15, EL) * smooth(70, 34, EL)
    # Red becomes a soft ramp across each cloud's edge, with 0.5 on the edge itself, and the shader sharpens it again at whatever size
    # it's drawn. That holds a clean edge at far less resolution than storing the edge directly. Green is spread past the edge, so the
    # shading doesn't darken where a low-resolution sample reaches outside the cloud.
    ramp = np.clip(blur(A, 2.6), 0, 1)
    spread = np.clip(blur(G, 4.0) / np.maximum(blur(A, 4.0), 0.02), 0, 1)
    lit = spread + (G - spread) * smooth(0.6, 1.0, A)

    def half(a):
        return (a[0::2, 0::2] + a[1::2, 0::2] + a[0::2, 1::2] + a[1::2, 1::2]) * 0.25

    out = np.stack([half(ramp), half(lit), half(C)], 2)
    # The picture's bottom row is the horizon, so V in the shader runs up the sky.
    save('clouds', out[::-1])
    print('clouds', time.time() - T, flush=True)


# ------------------------------------------------------------------------------------ water
def tangent_normal(h, strength):
    gy, gx = np.gradient(h)
    gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5
    gy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5
    nx, ny, nz = -gx * strength, gy * strength, np.ones_like(h)
    l = np.sqrt(nx * nx + ny * ny + nz * nz)
    return np.stack([nx / l * 0.5 + 0.5, ny / l * 0.5 + 0.5, nz / l * 0.5 + 0.5], 2)


def water():
    """Two tiling sets of ripples. They have a grain across the wind, as real capillary waves do."""
    N = 512
    a = spectral(N, N, 3.0, 31, 3, 90, ax=1.0, ay=0.62)
    # Sharpen crests slightly by reshaping the heights, so the ripples aren't just blurry sine soup.
    a = a - 0.25 * np.abs(a)
    save('sea_n', tangent_normal(a, 3.6))
    b = spectral(N, N, 2.5, 32, 12, 200, ax=1.0, ay=0.72)
    save('sea_d', tangent_normal(b, 2.4))


def foam():
    """Lacy cells: thin bright walls, broken up, like the marbled pattern foam leaves on water."""
    N = 512
    k = 110
    pts = rng.random((k, 2)) * N
    ys, xs = np.mgrid[0:N, 0:N]
    warp_x = spectral(N, N, 3.2, 41, 2, 60) * 7
    warp_y = spectral(N, N, 3.2, 42, 2, 60) * 7
    x = xs + warp_x
    y = ys + warp_y
    d1 = np.full((N, N), 1e9)
    d2 = np.full((N, N), 1e9)
    for p in pts:
        for ox in (-N, 0, N):
            for oy in (-N, 0, N):
                d = (x - p[0] - ox) ** 2 + (y - p[1] - oy) ** 2
                m = d < d1
                d2 = np.where(m, d1, np.minimum(d2, d))
                d1 = np.where(m, d, d1)
    edge = np.sqrt(d2) - np.sqrt(d1)
    lace = smooth(5.5, 0.5, edge)
    fine = spectral(N, N, 2.0, 43, 12, 220)
    blotch = spectral(N, N, 3.0, 44, 2, 40)
    lace = lace * smooth(-1.2, 0.8, fine)
    soft = smooth(-0.7, 1.4, blotch + 0.5 * fine)
    # Red is the lace, green soft clumps for where the foam is thick.
    out = np.stack([lace, soft, smooth(0.4, 2.0, fine)], 2)
    save('foam', out)


def plank():
    """A strip of planks with grain, seams along U, for the hull and deck."""
    N = 256
    g = spectral(N, N, 2.6, 51, 1, 120, ax=0.1, ay=1.0)
    v = 0.84 + 0.1 * g
    rows = N // 8
    for i in range(8):
        y = int(i * rows)
        tint = rng.uniform(0.86, 1.08)
        v[y:y + rows] *= tint
        v[y:y + 2] = 0.35
        v[y + 2:y + 3] *= 0.8
    # Butt joints along each plank at different places.
    for i in range(8):
        y = i * rows
        x = int(rng.integers(0, N))
        v[y:y + rows, x:x + 2] = 0.45
    # Nails.
    for i in range(8):
        y = i * rows + rows // 2
        for x in range(0, N, 64):
            xx = (x + int(rng.integers(0, 10))) % N
            v[y - 1:y + 1, xx:xx + 2] *= 0.72
    save('plank', np.clip(v, 0, 1))


def sprites():
    N = 128
    y, x = np.mgrid[0:N, 0:N]
    x = (x + 0.5) / N * 2 - 1
    y = (y + 0.5) / N * 2 - 1
    r = np.sqrt(x * x + y * y)
    # A soft blob, used for sparks, spray and glows.
    soft = np.clip(1 - r, 0, 1) ** 2.2
    save('soft', np.stack([soft, soft, soft, soft], 2))
    # Spray: a soft blob eaten away by noise, so it reads as droplets.
    # Mist with a fine grain of droplets in it, so it never reads as blobs.
    n = spectral(N, N, 1.1, 61, 14, 64)
    spray = np.clip(smooth(1.0, 0.0, r) ** 1.5 * (0.32 + 0.68 * smooth(-0.3, 1.5, n)), 0, 1)
    save('spray', np.stack([spray, spray, spray, spray], 2))
    # A petal: a teardrop with a darker base and a soft fold, pale tip.
    px = x * 1.3
    py = y * 1.1 + 0.15
    d = (px * px) / (0.55 * (1 - py * 0.75)) ** 2 + (py * py) / 0.85 ** 2
    a = smooth(1.05, 0.88, d)
    light = 0.82 + 0.18 * (1 - y) * 0.5 - 0.16 * np.abs(x)
    save('petal', np.stack([light, light, light, a], 2))


which = (ONLY or 'clouds,water,foam,plank,sprites').split(',')
for f in which:
    globals()[f]()
print('DONE', flush=True)
