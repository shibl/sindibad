# Writes the game's surface textures, all procedural. Runs under Blender's Python for numpy, or any Python with numpy.
#   OUT=<Assets/Art/Textures> Blender -b --factory-startup --python gen_textures.py
import math, os, struct, zlib
import numpy as np

OUT = os.environ['OUT']
rng = np.random.default_rng(7)

def write_png(name, a):
    a = np.clip(a, 0, 1)
    if a.ndim == 2:
        a = np.stack([a] * 3 + [np.ones_like(a)], -1)
    if a.shape[2] == 3:
        a = np.concatenate([a, np.ones(a.shape[:2] + (1,))], -1)
    h, w = a.shape[:2]
    raw = (a * 255 + 0.5).astype(np.uint8)[::-1]          # image rows run top down; we build them bottom up, as UVs do
    body = b''.join(b'\0' + raw[y].tobytes() for y in range(h))
    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    with open(os.path.join(OUT, name + '.png'), 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(body, 9)) + chunk(b'IEND', b''))
    print('wrote', name, w, h, flush=True)

def noise(n, lo, hi, aniso=(1.0, 1.0)):
    """Band-limited tiling noise, scaled to -1..1. lo and hi are in cycles across the tile."""
    f = np.fft.fft2(rng.standard_normal((n, n)))
    fy = np.fft.fftfreq(n)[:, None] * n * aniso[1]
    fx = np.fft.fftfreq(n)[None, :] * n * aniso[0]
    r = np.sqrt(fx * fx + fy * fy) + 1e-6
    f *= np.exp(-(r / hi) ** 2) * (1 - np.exp(-(r / lo) ** 2))
    a = np.real(np.fft.ifft2(f))
    return a / (np.abs(a).max() + 1e-9)

def to_normal(h, strength):
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * strength
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * strength
    n = np.stack([-dx, -dy, np.ones_like(h)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return n * 0.5 + 0.5

def grid(n):
    y, x = np.mgrid[0:n, 0:n] + 0.5
    return x / n, y / n

def hex2(c):
    c = c.lstrip('#')
    return np.array([int(c[i:i + 2], 16) / 255 for i in (0, 2, 4)])

def star_sdf(px, py, cx, cy, R, r, rot=0.0):
    """Distance, roughly in pixels, outside a five-pointed star with straight edges."""
    a = np.arctan2(px - cx, py - cy) + rot
    d = np.hypot(px - cx, py - cy)
    k = np.pi / 5
    th = np.abs((a % (2 * k)) - k)
    th = k - th                           # 0 at a tip, k at a valley
    x2, y2 = r * np.cos(k), r * np.sin(k)
    edge = (R * y2) / (y2 * np.cos(th) - (x2 - R) * np.sin(th))
    return (d - edge) * 0.55

# Car-paint orange peel, a very gentle ripple.
write_png('paint_n', to_normal(noise(512, 22, 70), 0.35))

# Brushed steel: long streaks one way, with a smoothness map that varies along them.
b = noise(1024, 2, 300, aniso=(0.02, 1.0))
write_png('brushed_n', to_normal(b, 0.7))
ms = np.zeros((512, 512, 4))
s = noise(512, 2, 200, aniso=(0.03, 1.0))
ms[..., 0] = 1.0
ms[..., 3] = 0.62 + 0.14 * s
write_png('brushed_ms', ms)

# Fingerprints, wipes and dust: what makes glass and chrome read as real, handled surfaces.
n = 1024
wipes = noise(n, 1, 7) * 0.5 + 0.5
fine = noise(n, 40, 220) * 0.5 + 0.5
x, y = grid(n)
prints = np.zeros((n, n))
for i in range(26):
    cx, cy = rng.random(2)
    r = rng.uniform(0.012, 0.026)
    ang = rng.uniform(0, 6.28)
    u = (x - cx + 0.5) % 1 - 0.5
    v = (y - cy + 0.5) % 1 - 0.5
    ru = u * math.cos(ang) + v * math.sin(ang)
    rv = -u * math.sin(ang) + v * math.cos(ang)
    d = np.sqrt((ru / r) ** 2 + (rv / (r * 1.4)) ** 2)
    prints = np.maximum(prints, np.clip(1 - d, 0, 1) ** 1.5 * (0.55 + 0.45 * fine))
spots = (rng.random((n, n)) > 0.9996).astype(float)
for _ in range(2):
    spots = (spots + np.roll(spots, 1, 0) + np.roll(spots, 1, 1) + np.roll(spots, -1, 0) + np.roll(spots, -1, 1)) / 2.2
rough = np.clip(0.10 * wipes ** 2 + 0.04 * fine * wipes + 0.16 * prints + 0.08 * spots, 0, 1)
for nm, metal, base in (('smudge_glass', 0.0, 0.98), ('smudge_chrome', 1.0, 0.93)):
    m = np.zeros((n, n, 4))
    m[..., 0] = metal
    m[..., 3] = base - rough * (0.75 if metal == 0 else 0.5)
    write_png(nm, m)

# Fine plastic grain for trim and buttons.
write_png('grain_n', to_normal(noise(256, 30, 110), 0.5))

# Felt and fabric.
weave = noise(512, 60, 230) * 0.6 + np.sin(np.mgrid[0:512, 0:512][1] * 2 * np.pi * 64 / 512) * np.sin(np.mgrid[0:512, 0:512][0] * 2 * np.pi * 64 / 512) * 0.25
write_png('felt_n', to_normal(weave, 1.3))

# Plush: short, soft clumps of fibre, tufted in patches.
tuft = noise(512, 10, 60) * 0.45 + noise(512, 90, 240) * 0.55
write_png('plush_n', to_normal(tuft, 3.0))
pv = (noise(512, 8, 80) * 0.5 + 0.5)
write_png('plush_v', np.stack([0.72 + 0.28 * pv] * 3 + [np.ones_like(pv)], -1))

# Capsule colours. A column per colourway, with the shell seam at mid height.
COLS = ['#fa2a6f', '#ffc93c', '#3fb8e8', '#12a594', '#ff7a59', '#9b8cff', '#ffffff', '#fa2a6f']
TOPS = ['#fbf7ee', '#fbf7ee', '#fbf7ee', '#fbf7ee', '#fbf7ee', '#fbf7ee', '#3fb8e8', '#ffc93c']
sz = 64
atlas = np.zeros((sz, sz * 8 // 8 * 1, 4))
atlas = np.zeros((sz, 64, 4))
for c in range(8):
    for yy in range(sz):
        v = (yy + 0.5) / sz
        col = hex2(COLS[c]) if v < 0.5 else hex2(TOPS[c])
        col = col ** 1.0
        atlas[yy, c * 8:(c + 1) * 8, :3] = col
        atlas[yy, c * 8:(c + 1) * 8, 3] = 1
write_png('cap_atlas', atlas)

# The lit sign behind the word PLAY.
w, h = 1024, 256
y, x = np.mgrid[0:h, 0:w] + 0.5
u, v = x / w, y / h
pink, deep = hex2('#ff3f80'), hex2('#b10c47')
sign = np.zeros((h, w, 4))
t = np.clip(np.hypot((u - 0.5) * 1.3, (v - 0.5) * 1.4) * 1.3, 0, 1)[..., None]
sign[..., :3] = pink * (1 - t) + deep * t
stars = np.zeros((h, w))
for i, (cx, cy, R) in enumerate(((0.10, 0.52, 54), (0.90, 0.52, 54), (0.21, 0.28, 20), (0.79, 0.74, 20), (0.20, 0.76, 15), (0.80, 0.26, 15))):
    d = star_sdf(x, y, cx * w, cy * h, R, R * 0.42)
    stars = np.maximum(stars, np.clip(0.5 - d / 1.5, 0, 1))
sign[..., :3] = sign[..., :3] * (1 - stars[..., None]) + hex2('#ffe08a') * stars[..., None]
sign[..., 3] = 1
write_png('sign', sign)

# The printed board at the back of the box: a sunburst behind a scatter of stars.
w, h = 1024, 1024
y, x = np.mgrid[0:h, 0:w] + 0.5
u, v = x / w, y / h
a = np.arctan2(u - 0.5, v - 0.42)
rays = (np.sin(a * 16) > 0).astype(float)
rays = np.clip(np.sin(a * 16) * (1 + np.hypot(u - 0.5, v - 0.42) * 240), -1, 1) * 0.5 + 0.5
ink, ink2 = hex2('#006b6b'), hex2('#004646')
board = (ink * rays[..., None] + ink2 * (1 - rays[..., None]))
rd = np.clip(np.hypot(u - 0.5, v - 0.42) * 1.25, 0, 1)[..., None]
board = board * (1 - rd * 0.72)
gl = np.exp(-(np.hypot(u - 0.5, v - 0.42) / 0.30) ** 2)[..., None]
board = board + gl * hex2('#0d9b9b') * 0.5
mask = np.zeros((h, w))
pts = []
tries = 0
while len(pts) < 34 and tries < 4000:
    tries += 1
    px, py, R = rng.uniform(0.05, 0.95), rng.uniform(0.35, 0.97), rng.uniform(0.018, 0.05)
    if all(math.hypot(px - q[0], py - q[1]) > q[2] + R + 0.035 for q in pts):
        pts.append((px, py, R))
col = np.zeros((h, w, 3))
PAL = ['#fa2a6f', '#ffc93c', '#ffffff', '#3fb8e8', '#ff7a59']
for i, (px, py, R) in enumerate(pts):
    d = star_sdf(x, y, px * w, py * h, R * w, R * w * 0.44, rot=rng.uniform(-0.4, 0.4))
    m = np.clip(0.5 - d / 1.5, 0, 1)
    board = board * (1 - m[..., None]) + hex2(PAL[i % len(PAL)]) * m[..., None]
out = np.concatenate([board, np.ones((h, w, 1))], -1)
write_png('backdrop', out)

# The coin's face: a raised star in a beaded ring, and its worn, handled roughness.
n = 1024
y, x = np.mgrid[0:n, 0:n] + 0.5
u, v = x / n - 0.5, y / n - 0.5
r = np.hypot(u, v) * 2
d = star_sdf(x, y, n / 2, n / 2, n * 0.27, n * 0.118)
hs = np.clip(0.5 - d / 12, 0, 1)
ang = np.arctan2(u, v)
beads = (np.cos(ang * 44) * 0.5 + 0.5) * np.exp(-((r - 0.70) / 0.022) ** 2)
ring = np.exp(-((r - 0.77) / 0.008) ** 2)
ring2 = np.exp(-((r - 0.63) / 0.006) ** 2)
hcoin = hs * 1.4 + beads * 0.9 + ring * 0.7 + ring2 * 0.5
hcoin += noise(n, 12, 90) * 0.02 + noise(n, 120, 400) * 0.008
write_png('coin_n', to_normal(hcoin, 7.0))
msc = np.zeros((n, n, 4))
msc[..., 0] = 1
wear = noise(n, 3, 30) * 0.5 + 0.5
msc[..., 3] = np.clip(0.72 + hs * 0.14 + beads * 0.12 - 0.20 * wear ** 2 - np.clip(hcoin * 0, 0, 1), 0, 1)
write_png('coin_ms', msc)
aoc = np.ones((n, n, 3)) * (1 - 0.32 * np.clip(np.exp(-(np.abs(d) / 22)) * (d > 0), 0, 1))[..., None]
write_png('coin_ao', aoc)

# A soft pool of darkness to sit under the cabinet on the arcade floor.
n = 512
y, x = np.mgrid[0:n, 0:n] + 0.5
u, v = (x / n - 0.5) * 2, (y / n - 0.5) * 2
ex, ey = 0.60, 0.56
dist = np.maximum(np.abs(u) / ex, np.abs(v) / ey)
inner = np.hypot(np.maximum(np.abs(u) - ex * 0.8, 0), np.maximum(np.abs(v) - ey * 0.8, 0))
sh = np.clip(1 - inner / 0.42, 0, 1) ** 2.1
out = np.zeros((n, n, 4))
out[..., 3] = sh
write_png('shadow', out)

# A soft glow sprite, for the sparks and the coin's halo.
n = 128
y, x = np.mgrid[0:n, 0:n] + 0.5
r = np.hypot(x / n - 0.5, y / n - 0.5) * 2
g = np.clip(1 - r, 0, 1) ** 2.4
out = np.ones((n, n, 4))
out[..., 3] = g
write_png('glow', out)
print('DONE', flush=True)
