# Turns the PNGs from prints.ts into the page's textures, and generates the fibre and weave tile.
#   ROOT=<repo> SCRATCH=<dir> Blender -b --factory-startup -P textures.py
# foil-*.webp and blind-*.webp: the foil and the blind stamping, each blurred a little so its edge stays crisp at any scale.
# pages.webp: the printed pages. fibre.webp and weave.webp: tiles of paper fibre and cloth weave.
import bpy, math, os
import numpy as np

ROOT, SCRATCH = os.environ['ROOT'], os.environ['SCRATCH']
PUB = os.path.join(ROOT, 'public/about/storybook')
scene = bpy.context.scene


def load(name):
    im = bpy.data.images.load(os.path.join(SCRATCH, f'{name}.png'))
    im.colorspace_settings.name = 'Non-Color'
    W, H = im.size
    px = np.empty(W * H * 4, np.float32)
    im.pixels.foreach_get(px)
    return px.reshape(H, W, 4)[::-1][:, :, :3].copy()


def blur(a, s):
    """Separable Gaussian."""
    r = int(s * 3)
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / s) ** 2)
    k /= k.sum()
    a = np.apply_along_axis(lambda m: np.convolve(m, k, mode='same'), 0, a)
    a = np.apply_along_axis(lambda m: np.convolve(m, k, mode='same'), 1, a)
    return a


def shrink(a, w, h):
    H, W = a.shape[:2]
    ys = (np.arange(h) + 0.5) * H / h
    xs = (np.arange(w) + 0.5) * W / w
    y0 = np.clip(ys.astype(int), 0, H - 1)
    x0 = np.clip(xs.astype(int), 0, W - 1)
    return a[y0][:, x0]


def save(name, rgb, q, alpha=None):
    H, W = rgb.shape[:2]
    o = bpy.data.images.new(name, W, H, alpha=False, float_buffer=False)
    o.colorspace_settings.name = 'Non-Color'
    f = np.ones((H, W, 4), np.float32)
    f[:, :, :3] = np.clip(rgb, 0, 1)
    o.pixels.foreach_set(f[::-1].ravel())
    scene.render.image_settings.file_format = 'WEBP'
    scene.render.image_settings.color_mode = 'RGB'
    scene.render.image_settings.quality = q
    p = os.path.join(PUB, f'{name}.webp')
    o.save_render(p, scene=scene)
    print(name, f'{W}x{H}', f'{os.path.getsize(p) / 1024:.0f} KB', flush=True)


CW, CH = 1024, 1465
for lang in ('en', 'ar'):
    foil = blur(load(f'foil-{lang}')[:, :, 0], 1.6)
    blind = blur(load(f'blind-{lang}')[:, :, 0], 1.8)
    # A smooth area average down to size: 1400 to 1024 is close enough for the nearest sample after this blur.
    foil = shrink(foil, CW, CH)
    blind = shrink(blind, CW, CH)
    # Kept apart, because lossy WebP lets one channel bleed into another.
    save(f'foil-{lang}', np.stack([foil] * 3, 2), 80)
    save(f'blind-{lang}', np.stack([blind] * 3, 2), 60)

save('pages', load('pages')[:, :, :3] if False else shrink(load('pages'), 1536, 1044), 84)

# -------------------------------------------------------------------------------------------------------------- the detail tile
N = 256
rng = np.random.default_rng(7)


def tile_noise(beta, seed):
    r = np.random.default_rng(seed)
    f = np.fft.fftfreq(N)
    fx, fy = np.meshgrid(f, f)
    amp = 1 / np.maximum(np.hypot(fx, fy), 1 / N) ** beta
    ph = r.uniform(0, 2 * math.pi, (N, N))
    out = np.fft.ifft2(amp * np.exp(1j * ph)).real
    return (out - out.min()) / (out.max() - out.min())


# Paper: lots of short fibres at every angle, drawn with wrap-around, over a fine grain.
fib = np.zeros((N, N), np.float32)
for _ in range(2600):
    x, y = rng.uniform(0, N, 2)
    a = rng.uniform(0, math.tau)
    L = rng.uniform(8, 34)
    curve = rng.uniform(-0.03, 0.03)
    w = rng.uniform(0.25, 0.8)
    for i in range(int(L)):
        fib[int(y) % N, int(x) % N] += w
        x += math.cos(a)
        y += math.sin(a)
        a += curve
fib = np.real(np.fft.ifft2(np.fft.fft2(fib) * np.fft.fft2(np.roll(np.roll(np.exp(-0.5 * (((np.arange(N) - N // 2)[:, None]) ** 2 + ((np.arange(N) - N // 2)[None, :]) ** 2) / 0.8 ** 2), N // 2, 0), N // 2, 1))))
fib = (fib - fib.min()) / (fib.max() - fib.min())
paper = 0.55 * fib ** 0.7 + 0.45 * tile_noise(0.9, 3)

# Cloth: an over-under weave of threads with slubs, tiling every 32 threads.
TH = 8
yy, xx = np.mgrid[0:N, 0:N]
i, j = xx // TH, yy // TH
fx, fy = (xx % TH + 0.5) / TH - 0.5, (yy % TH + 0.5) / TH - 0.5
warp_w = rng.uniform(0.82, 1.0, N // TH)[i]
weft_w = rng.uniform(0.82, 1.0, N // TH)[j]
slub_x = tile_noise(1.6, 11)
slub_y = tile_noise(1.6, 12)
over = (i + j) % 2 == 0
warp = np.cos(fx * math.pi) ** 0.8 * warp_w * (0.75 + 0.5 * slub_x)
weft = np.cos(fy * math.pi) ** 0.8 * weft_w * (0.75 + 0.5 * slub_y)
cloth = np.where(over, warp * (0.75 + 0.25 * np.cos(fy * math.pi)), weft * (0.75 + 0.25 * np.cos(fx * math.pi)))
cloth = (cloth - cloth.min()) / (cloth.max() - cloth.min())

save('fibre', np.stack([paper] * 3, 2), 82)
save('weave', np.stack([cloth] * 3, 2), 82)
