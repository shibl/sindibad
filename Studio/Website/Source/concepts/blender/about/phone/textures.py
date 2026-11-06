# Procedural maps for the battered phone and the table: glass wear, the crack, the printed bezel and the mashrabiya
# shadow screen. Run once; everything is written to $WORK/tex. All original, all generated here.
#   WORK=<dir> Blender -b --factory-startup -P textures.py
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from common import TEX, save_png, gauss_blur
import geometry as G

rng = np.random.default_rng(1971)

# ---------------------------------------------------------------------------------------------------- the glass, in UV space
GW, GH = 1536, 3072              # pixels of the glass maps. v runs up the phone, row 0 is the top of the phone.
gw_cm, gh_cm = G.GLASS_W, G.GLASS_H
px = GW / gw_cm


def to_px(x, y):
    """phone cm (origin at the middle of the glass, y up) to map pixels"""
    return (x / gw_cm + 0.5) * GW, (0.5 - y / gh_cm) * GH


def draw_line(buf, x0, y0, x1, y1, v0, v1, width=1.0):
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 2
    xs = np.linspace(x0, x1, n)
    ys = np.linspace(y0, y1, n)
    vs = np.linspace(v0, v1, n)
    r = int(math.ceil(width))
    for ox in range(-r, r + 1):
        for oy in range(-r, r + 1):
            d = math.hypot(ox, oy)
            if d > width + 0.5:
                continue
            w = min(1.0, width + 0.5 - d)
            ix = np.clip((xs + ox).astype(int), 0, buf.shape[1] - 1)
            iy = np.clip((ys + oy).astype(int), 0, buf.shape[0] - 1)
            buf[iy, ix] = np.maximum(buf[iy, ix], vs * w)


# The crack. The phone landed on its top right corner: an impact point near that corner, long radial runners that wander and fork,
# and short rings between them close to the impact.
crack = np.zeros((GH, GW), np.float32)
impact = (gw_cm / 2 - 0.62, gh_cm / 2 - 0.86)


def walk(x, y, a, length, strength, depth=0):
    step = 0.09
    left = length
    while left > 0:
        a += rng.normal(0, 0.1) + (rng.random() < 0.05) * rng.normal(0, 0.6)
        nx, ny = x + math.cos(a) * step, y + math.sin(a) * step
        if abs(nx) > gw_cm / 2 - 0.02 or abs(ny) > gh_cm / 2 - 0.02:
            break
        s0 = strength * (0.35 + 0.65 * left / length)
        s1 = strength * (0.35 + 0.65 * (left - step) / length)
        draw_line(crack, *to_px(x, y), *to_px(nx, ny), s0, s1, width=0.9 + 0.5 * s0)
        x, y = nx, ny
        left -= step
        if depth < 3 and rng.random() < 0.035:
            walk(x, y, a + rng.choice([-1, 1]) * rng.uniform(0.35, 1.0), left * rng.uniform(0.25, 0.7), strength * 0.75, depth + 1)


angles = [math.radians(d) for d in (-172, -146, -128, -112, -97, -79, -40, 8, 52, 95, 128, 150, 196, 214)]
lengths = [6.8, 5.1, 3.4, 9.5, 4.0, 2.3, 1.6, 1.0, 1.2, 1.0, 1.1, 1.4, 3.2, 2.4]
for a, l in zip(angles, lengths):
    walk(*impact, a + rng.normal(0, 0.05), l, 1.0)
# Rings between the runners near the impact, the spider web.
for ring_r in (0.28, 0.47, 0.72, 1.02, 1.45):
    a = rng.uniform(0, 6.28)
    a_end = a + 6.28
    while a < a_end:
        arc = rng.uniform(0.2, 0.6)
        if rng.random() < (0.85 if ring_r < 0.8 else 0.5):
            r0, r1 = ring_r * rng.uniform(0.9, 1.08), ring_r * rng.uniform(0.9, 1.08)
            x0, y0 = impact[0] + r0 * math.cos(a), impact[1] + r0 * math.sin(a)
            x1, y1 = impact[0] + r1 * math.cos(a + arc), impact[1] + r1 * math.sin(a + arc)
            if all(abs(v) < w for v, w in ((x0, gw_cm / 2 - 0.02), (x1, gw_cm / 2 - 0.02), (y0, gh_cm / 2 - 0.02), (y1, gh_cm / 2 - 0.02))):
                draw_line(crack, *to_px(x0, y0), *to_px(x1, y1), 0.6, 0.6, width=0.8)
        a += arc
# A tiny crushed patch at the impact point.
cx, cy = to_px(*impact)
yy, xx = np.mgrid[0:GH, 0:GW].astype(np.float32)
dist = np.hypot(xx - cx, yy - cy) / px
for _ in range(90):
    r = rng.uniform(0, 0.26)
    a = rng.uniform(0, 6.28)
    b = a + rng.normal(0, 1.3)
    l = rng.uniform(0.04, 0.16)
    x0, y0 = impact[0] + r * math.cos(a), impact[1] + r * math.sin(a)
    x1, y1 = x0 + l * math.cos(b), y0 + l * math.sin(b)
    draw_line(crack, *to_px(x0, y0), *to_px(x1, y1), 0.8, 0.5, width=0.8)
crack_sharp = crack.copy()
crack_wide = gauss_blur(crack, 2.2)
crack_glow = gauss_blur(crack, 9)


# Shards tilt a little, each differently: flat patches between cracks make the broken area catch the light in facets.
def cell_noise(cell_cm, seed):
    r = np.random.default_rng(seed)
    n = int(gw_cm * gh_cm / cell_cm**2 * 1.4) + 8
    sx = r.random(n) * GW
    sy = r.random(n) * GH
    vals = r.normal(0, 1, (n, 2)).astype(np.float32)
    s = 4
    gy, gx = np.mgrid[0:GH // s, 0:GW // s].astype(np.float32)
    best = np.full(gy.shape, 1e12, np.float32)
    outx = np.zeros(gy.shape, np.float32)
    outy = np.zeros(gy.shape, np.float32)
    for i in range(n):
        d = (gx * s - sx[i]) ** 2 + (gy * s - sy[i]) ** 2
        m = d < best
        best[m] = d[m]
        outx[m] = vals[i, 0]
        outy[m] = vals[i, 1]
    return np.kron(outx, np.ones((s, s), np.float32)), np.kron(outy, np.ones((s, s), np.float32))


facet_x, facet_y = cell_noise(0.32, 7)
falloff = np.clip(1.0 - dist / 3.6, 0, 1) ** 1.3

# Hairline scratches: long shallow arcs from pockets and keys, most in loose families.
scratches = np.zeros((GH, GW), np.float32)
for fam in range(26):
    fx, fy = rng.uniform(-gw_cm / 2, gw_cm / 2), rng.uniform(-gh_cm / 2, gh_cm / 2)
    base = rng.uniform(0, math.pi)
    for _ in range(rng.integers(6, 34)):
        x = fx + rng.normal(0, 1.2)
        y = fy + rng.normal(0, 1.8)
        a = base + rng.normal(0, 0.16)
        l = rng.lognormal(0.1, 0.8)
        v = rng.uniform(0.15, 0.9)
        bend = rng.normal(0, 0.03)
        step = 0.2
        for i in range(int(l / step)):
            nx, ny = x + math.cos(a) * step, y + math.sin(a) * step
            draw_line(scratches, *to_px(x, y), *to_px(nx, ny), v, v, width=0.45)
            x, y, a = nx, ny, a + bend
for _ in range(240):
    x, y = rng.uniform(-gw_cm / 2, gw_cm / 2), rng.uniform(-gh_cm / 2, gh_cm / 2)
    a = rng.uniform(0, 6.28)
    l = rng.lognormal(-1.2, 0.6)
    draw_line(scratches, *to_px(x, y), *to_px(x + l * math.cos(a), y + l * math.sin(a)), 0.5, 0.2, width=0.4)


# Smudges: oily areas where thumbs live, fingerprint whorls, wipe streaks.
def fbm(scale, octaves, seed, stretch=(1.0, 1.0)):
    r = np.random.default_rng(seed)
    h, w = GH // 2, GW // 2
    out = np.zeros((h, w), np.float32)
    amp = 1.0
    for o in range(octaves):
        n = r.normal(0, 1, (h, w)).astype(np.float32)
        s = scale * px / 2 / 2**o
        fy = np.fft.fftfreq(h)[:, None] * stretch[1]
        fx = np.fft.rfftfreq(w)[None, :] * stretch[0]
        g = np.exp(-2 * (math.pi * s) ** 2 * (fx * fx + fy * fy))
        lay = np.fft.irfft2(np.fft.rfft2(n) * g, s=(h, w)).astype(np.float32)
        lay /= lay.std() + 1e-6
        out += lay * amp
        amp *= 0.55
    out = (out - out.mean()) / out.std()
    return np.kron(out, np.ones((2, 2), np.float32))


oil = np.clip(fbm(1.1, 4, 11) * 0.5 + 0.5, 0, 1)
hand = np.zeros((GH, GW), np.float32)
gxcm = (xx / GW - 0.5) * gw_cm
gycm = (0.5 - yy / GH) * gh_cm
# The places a thumb lands, and a broad wipe across the middle.
for tx, ty, sx, sy, amp in ((1.4, -2.4, 1.7, 2.4, 1.0), (-1.2, -3.7, 1.5, 2.0, 0.9), (0.2, 1.2, 2.6, 3.8, 0.7), (-1.4, 4.4, 1.4, 1.4, 0.5)):
    hand += amp * np.exp(-(((gxcm - tx) / sx) ** 2 + ((gycm - ty) / sy) ** 2))
smudge = np.clip(oil * 0.6 + 0.4, 0, 1) * np.clip(hand, 0, 1)
prints = np.zeros((GH, GW), np.float32)
for tx, ty, rot, size, amp in ((1.55, -3.1, 0.4, 0.82, 1.0), (-1.25, -1.45, -0.5, 0.78, 0.8), (0.75, 1.9, 0.9, 0.82, 0.7), (-1.65, 4.0, 0.1, 0.8, 0.55), (1.9, -5.1, -0.3, 0.7, 0.6)):
    dx, dy = gxcm - tx, gycm - ty
    c, s = math.cos(rot), math.sin(rot)
    u, v = (dx * c + dy * s) / size, (-dx * s + dy * c) / (size * 1.32)
    w = oil * 0.8
    ridges = 0.5 + 0.5 * np.sin(np.sqrt(u * u + (v * 0.9 + 0.25 * u * u) ** 2) * 34.0 + w * 4.2)
    mask = np.clip(1.15 - np.sqrt(u * u + v * v), 0, 1)
    mask = mask * mask * (3 - 2 * mask)
    prints = np.maximum(prints, ridges * mask * amp)
streak = np.clip(fbm(0.9, 4, 23, stretch=(0.18, 1.0)) * 0.5 + 0.2, 0, 1) * np.clip(hand * 1.3, 0, 1)

rough = 0.045 + 0.2 * smudge + 0.2 * prints * (0.6 + 0.4 * oil) + 0.13 * streak + 0.22 * scratches + 0.5 * np.clip(crack_wide * 2.0, 0, 1)
save_png(f'{TEX}/glass_rough.png', np.clip(rough, 0, 1))

# Height for the normal map: cracks are ridges and steps, plus facet tilt near the impact, plus micro scratches.
height = -0.8 * crack_wide - 0.09 * scratches - 0.03 * gauss_blur(prints, 1.0)
dhdx = np.roll(height, -1, 1) - np.roll(height, 1, 1)
dhdy = np.roll(height, -1, 0) - np.roll(height, 1, 0)
nx = np.clip(-dhdx * 1.3 + facet_x * falloff * 0.07, -1, 1)
ny = np.clip(dhdy * 1.3 - facet_y * falloff * 0.07, -1, 1)
nz = np.sqrt(np.clip(1 - nx * nx - ny * ny, 0.01, 1))
save_png(f'{TEX}/glass_normal.png', np.dstack([nx * 0.5 + 0.5, ny * 0.5 + 0.5, nz]))

# The crack, for the shader: R the sharp line, G its halo (blocks the display behind it), B the worn facet area.
save_png(f'{TEX}/glass_crack.png', np.dstack([np.clip(crack_sharp, 0, 1), np.clip(crack_glow * 3.6, 0, 1), falloff]))

# The printed bezel, as a mask with the display window (R), earpiece (G) and a small camera and sensor (B).
sx0, sx1 = G.SCREEN_X0, G.SCREEN_X1
sy0, sy1 = G.SCREEN_Y0, G.SCREEN_Y1
win = np.clip(np.minimum.reduce([gxcm - sx0, sx1 - gxcm, gycm - sy0, sy1 - gycm]) * px / 1.5 + 0.5, 0, 1)
ey = G.EARPIECE_Y
ear = np.clip((0.09 - np.hypot(np.maximum(np.abs(gxcm) - 0.62, 0), gycm - ey)) * px / 1.5 + 0.5, 0, 1)
cam = np.clip((0.135 - np.hypot(gxcm - G.CAMERA_X, gycm - ey)) * px / 1.5 + 0.5, 0, 1)
cam_in = np.clip((0.075 - np.hypot(gxcm - G.CAMERA_X, gycm - ey)) * px / 1.5 + 0.5, 0, 1)
sensor = np.clip((0.055 - np.hypot(gxcm - G.SENSOR_X, gycm - ey)) * px / 1.5 + 0.5, 0, 1)
# Three printed soft keys on the chin, half worn away: cheap-phone furniture, and no logo.
ky = G.KEYS_Y
def ring(cx, cy, r, w):
    d = np.abs(np.hypot(gxcm - cx, gycm - cy) - r)
    return np.clip((w - d) * px / 1.5 + 0.5, 0, 1)
def box(cx, cy, hw, hh, w):
    d = np.abs(np.maximum(np.abs(gxcm - cx) - hw, np.abs(gycm - cy) - hh))
    return np.clip((w - d) * px / 1.5 + 0.5, 0, 1)
tri_d = np.maximum.reduce([-(gxcm - 2.0) * 1.0 - 0.16, (gxcm - 2.0) * 0.5 + np.abs(gycm - ky) * 0.866 - 0.13])
tri = np.clip((0.018 - np.abs(tri_d)) * px / 1.5 + 0.5, 0, 1)
keys = np.maximum.reduce([ring(0.0, ky, 0.17, 0.02), box(-2.0, ky, 0.14, 0.14, 0.018), tri])
keys = keys * np.clip(oil * 1.5 - 0.1, 0.25, 1)
save_png(f'{TEX}/glass_print.png', np.dstack([win, np.maximum(ear, keys * 0.7), cam * 0.5 + cam_in * 0.5 + sensor * 0.35]))
print('glass maps done', GW, GH)

# ------------------------------------------------------------------------------------------- the mashrabiya: a lattice of stars
S = 2048
yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
period = S / 4
u = (xx % period) / period - 0.5
v = (yy % period) / period - 0.5


def star8(u, v, r_out, r_in):
    a = np.arctan2(v, u)
    r = np.hypot(u, v)
    t = np.abs(((a / (2 * math.pi) * 8) % 1) - 0.5) * 2
    rim = (r_in * r_out) / (r_out * t + r_in * (1 - t))
    return rim - r


open_star = np.clip(star8(u, v, 0.47, 0.25) * period / 1.5, 0, 1)
u2 = ((xx + period / 2) % period) / period - 0.5
v2 = ((yy + period / 2) % period) / period - 0.5
open_cross = np.clip(star8(u2, v2, 0.2, 0.11) * period / 1.5, 0, 1)
inner = np.clip(star8(u, v, 0.24, 0.13) * period / 1.5, 0, 1)
save_png(f'{TEX}/mashrabiya.png', np.clip(open_star + open_cross, 0, 1) * (1 - inner * 0.9))
print('mashrabiya done')
