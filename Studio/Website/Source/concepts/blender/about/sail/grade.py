# Finishes the poster from keyart.py's passes: paints the sky behind it, adds the haze and glow, grades it, and writes the
# WebP pictures the site loads, plus the small map of depth and masks that the live layer on the page uses.
#   IN=<keyart OUT dir> SITE=<repo>/public/about/sail MODE=wide|tall Q=78 Blender -b --factory-startup --python grade.py
import bpy, json, math, os
import numpy as np

IN = os.environ['IN']
SITE = os.environ.get('SITE', '')
MODE = os.environ.get('MODE', 'wide')
QUALITY = int(os.environ.get('Q', 86))
PREVIEW = os.environ.get('PREVIEW', '')
J = json.load(open(os.path.join(IN, f'{MODE}.json')))
W, H = J['w'], J['h']


def load_exr(path):
    im = bpy.data.images.load(path)
    im.colorspace_settings.name = 'Non-Color'
    px = np.empty(W * H * 4, np.float32)
    im.pixels.foreach_get(px)
    bpy.data.images.remove(im)
    return px.reshape(H, W, 4)[::-1]            # rows from the top


def lin(hexs):
    hexs = hexs.lstrip('#')
    c = np.array([int(hexs[i:i + 2], 16) / 255 for i in (0, 2, 4)])
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def blur(a, sigma):
    """Gaussian by FFT, on a mirrored copy so nothing wraps round from the far edge."""
    p = int(min(sigma * 3 + 2, min(a.shape[:2]) - 1))
    if a.ndim == 2:
        a2 = np.pad(a, p, mode='reflect')
    else:
        a2 = np.pad(a, ((p, p), (p, p), (0, 0)), mode='reflect')
    out = _blur(a2, sigma)
    return out[p:-p, p:-p]


def _blur(a, sigma):
    h, w = a.shape[:2]
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.rfftfreq(w)[None, :]
    g = np.exp(-2 * (np.pi ** 2) * (sigma ** 2) * (fy * fy + fx * fx))
    if a.ndim == 2:
        return np.fft.irfft2(np.fft.rfft2(a) * g, s=(h, w))
    return np.stack([np.fft.irfft2(np.fft.rfft2(a[:, :, i]) * g, s=(h, w)) for i in range(a.shape[2])], 2)


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


# ------------------------------------------------------------------------------------------ passes
beauty = load_exr(os.path.join(IN, f'{MODE}_beauty.exr'))
data = load_exr(os.path.join(IN, f'{MODE}_data.exr'))
alpha = np.clip(beauty[:, :, 3], 0, 1)
dist = data[:, :, 0] / np.maximum(data[:, :, 3], 1e-4)
seam = np.clip(data[:, :, 1], 0, 1)      # 1 on the sea
solid = np.clip(data[:, :, 3], 0, 1)

# ------------------------------------------------------------------------------------------ where things are on the picture
az0 = math.radians(J['az'])
if W >= H:
    tanh = math.tan(math.radians(J['fov']) / 2)
    tanv = tanh * H / W
else:
    tanv = math.tan(math.radians(J['fov']) / 2)
    tanh = tanv * W / H
sx_, sy_ = J['shift']
ys, xs = np.mgrid[0:H, 0:W]
ndcx = (xs + 0.5) / W * 2 - 1
ndcy = 1 - (ys + 0.5) / H * 2
# Blender's lens shift is in units of the sensor's larger side, and shifting up moves the picture's contents down.
if W >= H:
    rx = (ndcx + 2 * sx_) * tanh
    ry = (ndcy * H / W + 2 * sy_) * tanh
else:
    rx = (ndcx * W / H + 2 * sx_) * tanv
    ry = (ndcy + 2 * sy_) * tanv
# The camera is level, so a pixel's direction is simple.
fx, fy = math.sin(az0), math.cos(az0)
rgx, rgy = math.cos(az0), -math.sin(az0)
dx = fx + rgx * rx
dy = fy + rgy * rx
dz = ry.copy()
ln = np.sqrt(dx * dx + dy * dy + dz * dz)
dx, dy, dz = dx / ln, dy / ln, dz / ln
el = np.degrees(np.arcsin(np.clip(dz, -1, 1)))
az = (np.degrees(np.arctan2(dx, dy)) - J['sun_az'] + 180) % 360 - 180      # degrees from the sun, + to its right
sun_el = J['sun_el']
sa, se = math.radians(J['sun_az']), math.radians(sun_el)
sd = (math.sin(sa) * math.cos(se), math.cos(sa) * math.cos(se), math.sin(se))
cosA = np.clip(dx * sd[0] + dy * sd[1] + dz * sd[2], 0, 1)
horizon_row = int(np.argmin(np.abs(el[:, W // 2])))
sun_x = int(np.argmin(np.abs(az[horizon_row])))
print('horizon row', horizon_row, 'of', H, 'sun column', sun_x, 'of', W, flush=True)

# ------------------------------------------------------------------------------------------ the sky you see
ZEN, MID, HSUN, HANTI = lin('#0e4560'), lin('#4f97a7'), lin('#ffcc86'), lin('#d98f8e')
SUN = np.array([1.0, 0.72, 0.45])
s = np.cos(np.radians(az)) * 0.5 + 0.5
s = (s * s * (3 - 2 * s))[:, :, None]
hor = HANTI + (HSUN - HANTI) * s
# The sky's gradient runs by position in the picture rather than true elevation, so the long lens still gets the whole sweep of colour.
y = np.clip((horizon_row - (ys + 0.5)) / max(horizon_row, 1), 0, 1)[:, :, None]
sky = hor + (lin('#f0a87a') - hor) * smooth(0.0, 0.1, y) * 0.5
sky = sky + (MID - sky) * smooth(0.06, 0.42, y)
sky = sky + (ZEN - sky) * smooth(0.34, 1.0, y)
a16 = cosA ** 16
a64 = cosA ** 64
a256 = cosA ** 256
a1024 = cosA ** 1024
sky = sky + (SUN * (0.012 * a16 + 0.05 * a64 + 0.18 * a256 + 0.5 * a1024)[:, :, None])
# Cover: painted cumulus in pixel space, so the composition can be placed exactly.
rng = np.random.default_rng(int(os.environ.get('SEED', 4)))
A = np.zeros((H, W), np.float32)
G = np.zeros((H, W), np.float32)
U = max(W, H) / 2400.0                    # size of a unit here, relative to the wide picture


_jit = np.random.default_rng(91).random((256, 256, 2), dtype=np.float32)


def cells(x, y):
    """Round domes: 1 at the centre of each cell, falling to 0 at its edge."""
    xi = np.floor(x).astype(np.int32)
    yi = np.floor(y).astype(np.int32)
    best = np.full(x.shape, 9.0, np.float32)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            cx_ = xi + dx
            cy_ = yi + dy
            jx = _jit[cx_ & 255, cy_ & 255, 0]
            jy = _jit[cx_ & 255, cy_ & 255, 1]
            d = (cx_ + jx - x) ** 2 + (cy_ + jy - y) ** 2
            best = np.minimum(best, d)
    return np.sqrt(np.clip(1 - best * 1.05, 0, 1))


def cloud(cx, base_row, width, height, n, sun_side=1.0, backlit=0.6):
    """A heap of billows with a flat base. cx and width are in pixels, base_row the row of its underside."""
    x0 = max(int(cx - width * 1.35), 0)
    x1 = min(int(cx + width * 1.35), W)
    y0 = max(int(base_row - height * 1.5), 0)
    y1 = min(int(base_row + height * 0.2), H)
    if x1 - x0 < 4 or y1 - y0 < 4:
        return
    X, Y = np.meshgrid(np.arange(x0, x1, dtype=np.float32) - cx, base_row - np.arange(y0, y1, dtype=np.float32))
    seed = rng.uniform(0, 400)
    k = 6.0 / height
    n1 = fbm(X * k + seed, Y * k * 1.3 + seed, 3)
    n2 = fbm(X * k * 3 + seed, Y * k * 3.6 + seed, 4)
    XX = X + n1 * height * 0.05
    YY = Y + n2 * height * 0.015
    # The overall heap: many soft spheres, big and low, smaller as they climb.
    P = 4.0
    acc = np.zeros(XX.shape, np.float32)
    for i in range(n):
        u = rng.uniform(-1, 1)
        env = max(1 - abs(u) ** 1.5, 0.04)
        t = rng.uniform(0, 1) ** 1.15
        cy = t * height * env * 0.9
        r = height * rng.uniform(0.09, 0.24) * (0.7 + 0.75 * (1 - t)) * (0.55 + 0.55 * env)
        cy = max(cy, r * 0.25)
        d2 = (XX - u * width) ** 2 + (YY - cy) ** 2
        z = np.maximum(r * r - d2, 0)
        acc += z ** (P / 2)
    heap = acc ** (1 / P)
    # A little billowing on top of that, soft enough to stay cloud and not turn to rock.
    s2 = height / 9.0
    s3 = height / 21.0
    sx = seed * 3.1
    c2 = cells(XX / s2 - sx, YY / (s2 * 0.9) + 7.3)
    c3 = cells(XX / s3 + 3.1, YY / (s3 * 0.9) - sx)
    body = smooth(0, height * 0.08, heap)
    Z = heap + (c2 * 0.72 + c3 * 0.28 - 0.3) * height * 0.05 * body
    base = smooth(-height * 0.01, height * 0.07, YY + n2 * height * 0.018)
    Z = np.maximum(Z, 0) * base
    a = smooth(0, height * 0.012 + 1.0, Z)
    # Light from the softened surface: backlit clouds keep the sun on their upper, sunward edges and go deep in the body.
    zs = blur(Z, 1.0 + height * 0.006)
    gy, gx = np.gradient(zs)
    m = np.sqrt(gx * gx + gy * gy + 1)
    lx = sun_side * (0.42 + 0.58 * (1 - backlit))
    ly = 0.34
    lz = 0.1 + 0.8 * (1 - backlit)
    l_ = math.sqrt(lx * lx + ly * ly + lz * lz)
    # In image rows, up is negative, so the gradient's Y flips.
    ndl = ((-gx / m) * lx + (gy / m) * ly + (1 / m) * lz) / l_
    lit = np.clip(ndl * 0.9 + 0.2, 0, 1)
    rise = np.clip(YY / height, 0, 1)
    lit = lit * (0.3 + 0.7 * smooth(0.0, 0.5, rise))
    # A thin silver lining where the cloud is thinnest.
    thin = 1 - smooth(0, height * 0.03, Z)
    lit = np.clip(lit + thin * (0.3 + 0.7 * backlit) * (0.45 + 0.55 * rise), 0, 1)
    G[y0:y1, x0:x1] = lit * a + G[y0:y1, x0:x1] * (1 - a)
    A[y0:y1, x0:x1] = a + A[y0:y1, x0:x1] * (1 - a)


def clear_behind_boat(reach):
    """Small far clouds seen through the gap under the sail read as stray marks, so the horizon behind the boat stays clear."""
    columns = np.nonzero(((solid > 0.02) & (seam < 0.5) & (dist < reach)).any(0))[0]
    if not len(columns):
        return
    keep = np.ones(W, np.float32)
    keep[columns[0]:columns[-1]] = 0
    keep = np.clip(blur(np.tile(keep, (8, 1)), 26 * U)[4], 0, 1)
    keep = smooth(0.1, 0.9, keep)[None, :]
    A[:] = A * keep
    G[:] = G * keep


hr = horizon_row
if MODE == 'wide':
    # Far banks along the horizon.
    for i in range(34):
        cx = rng.uniform(-100, W + 100)
        if abs(cx - sun_x) < 130 * U:
            continue
        cloud(cx, hr - rng.uniform(4, 16) * U, rng.uniform(60, 200) * U, rng.uniform(22, 60) * U, 34, np.sign(sun_x - cx) or 1, 0.75)
    clear_behind_boat(110)
    # The towers that frame the picture: a great one on the left that the text stands in front of, in shade,
    # and another climbing behind the boat, lit along its edge by the sun.
    cloud(300 * U, hr - 12 * U, 560 * U, 560 * U, 340, 1, 0.82)
    cloud(960 * U, hr - 10 * U, 210 * U, 190 * U, 170, 1, 0.84)
    cloud(2260 * U, hr - 10 * U, 360 * U, 470 * U, 300, -1, 0.74)
else:
    for i in range(22):
        cx = rng.uniform(-100, W + 100)
        if abs(cx - sun_x) < 90 * U:
            continue
        cloud(cx, hr - rng.uniform(3, 16) * U, rng.uniform(60, 170) * U, rng.uniform(24, 64) * U, 34, np.sign(sun_x - cx) or 1, 0.75)
    clear_behind_boat(200)
    cloud(-40 * U, hr - 10 * U, 300 * U, 250 * U, 220, 1, 0.82)
    cloud(980 * U, hr - 10 * U, 260 * U, 250 * U, 200, -1, 0.74)

toward = (s * s)
hue = np.array([1.0, 0.72, 0.45])
lit_c = lin('#ffc99a') * 1.12
shade_c = lin('#2c5f7c') * 0.7 + lin('#9a6480') * 0.26
cc = shade_c + (lit_c - shade_c) * G[:, :, None]
sky = sky * (1 - A[:, :, None]) + cc * A[:, :, None]
# A hard bright sun, drawn over everything where the cloud lets it through.
disc = smooth(0.99982, 0.99992, cosA)
sky += np.array([1.0, 0.86, 0.6])[None, None, :] * (disc * 16)[:, :, None] * (1 - A[:, :, None])

# High cirrus combed across the top.
cir = smooth(0.12, 0.72, fbm((xs * 0.0016 / U).astype(np.float32), (ys * 0.0085 / U).astype(np.float32), 5, 0.55))
cir = cir * smooth(0.25, 0.6, y[:, :, 0]) * (1 - A) * 0.26
sky = sky * (1 - cir[:, :, None]) + (HANTI * 0.9 + (hue - HANTI * 0.9) * s) * cir[:, :, None]

# ------------------------------------------------------------------------------------------ haze and composite
d = np.where(solid > 0.01, dist, 1e5)
fog = (1 - np.exp(-d * 0.00024))[:, :, None]
horizon_col = hor * 1.0 + SUN * (0.01 * a16 + 0.05 * a64 + 0.15 * a256)[:, :, None]
rgb = beauty[:, :, :3]
hazed = rgb * (1 - fog) + horizon_col * fog * alpha[:, :, None]
# The render's alpha already carries soft edges, so the sky goes behind as a straightforward "over".
img = hazed + sky * (1 - alpha[:, :, None])

# ------------------------------------------------------------------------------------------ grade
# The sun's road. The denoiser smooths real glitter away, so the render gives the broad glow and the glints are laid on here:
# a soft knee holds the sea from going flat white, and a scatter of tiny bright points follows the road, finer towards the horizon.
sm = (seam * alpha)[:, :, None]
peak_ = img.max(2, keepdims=True)
knee = peak_ / (1 + np.maximum(peak_ - 0.7, 0) * 0.9)
held = img / np.maximum(peak_, 1e-4) * knee * np.array([1.0, 0.9, 0.72])
over = smooth(0.4, 1.1, peak_)
img = img * (1 - sm * over) + held * sm * over
# Deeper, more saturated water: this is where the picture gets its weight.
seaonly = np.maximum(img, 0) ** 1.3 * np.array([0.8, 0.96, 1.02]) * 1.02
img = img * (1 - sm) + seaonly * sm
gl_rng = np.random.default_rng(8)
wy_ = np.clip(((ys + 0.5) - horizon_row) / max(H - horizon_row, 1), 0, 1)
sigma_ = (0.012 + 0.11 * wy_) * W
road_ = np.exp(-(((xs + 0.5) - sun_x) / sigma_) ** 2)
glints = np.zeros((H, W), np.float32)
tries = int(70000 * (W * H) / (2400 * 1350))
gx_ = gl_rng.integers(5, W - 5, tries)
gy_ = gl_rng.integers(min(horizon_row + 1, H - 3), H - 2, tries)
keep_ = gl_rng.random(tries) < (road_[gy_, gx_] * 0.7 + 0.002) * seam[gy_, gx_] * alpha[gy_, gx_]
for x_, y_ in zip(gx_[keep_], gy_[keep_]):
    w_ = wy_[y_, x_]
    power = gl_rng.uniform(0.4, 1.0) ** 3 * (1.1 + 4.2 * road_[y_, x_])
    # A glint on water is a short horizontal dash, longer the nearer it is.
    reach = int(1 + w_ * 4 * U * 2)
    for d_ in range(-reach, reach + 1):
        glints[y_, np.clip(x_ + d_, 0, W - 1)] += power * (1 - abs(d_) / (reach + 1))
glints = blur(glints, 0.42 * U + 0.1) * 2.6
img = img + np.array([1.0, 0.8, 0.52]) * glints[:, :, None]

# Where the hull meets the water: foam along the waterline, and spray thrown off the bow. The render's foam can't reach this tight.
hull_ = ((solid > 0.02) & (seam < 0.5) & (dist < 400)).astype(np.float32)
if hull_.sum() > 0:
    # Only water that has hull directly above it counts, so the foam stays on the waterline and doesn't trace the bow's outline.
    reach_ = max(int(10 * U), 2)
    under = np.zeros((H, W), bool)
    for k_ in range(1, reach_):
        under[k_:] |= hull_[:-k_] > 0.5
    under &= seam > 0.5
    band = blur(under.astype(np.float32), 2.2 * U + 0.4)
    contact = np.clip(band * 1.8, 0, 1) * (1 - hull_)
    lace = fbm((xs * 0.08 / U).astype(np.float32), (ys * 0.3 / U).astype(np.float32), 4)
    foam_ = smooth(-0.25, 0.3, lace + contact - 0.72) * contact
    img = img + (np.array([1.0, 0.9, 0.74]) * 1.05 - img) * np.clip(foam_, 0, 1)[:, :, None]
    # The bow is the left-most place the hull meets the water. Spray flies up and forward from there.
    rows, cols = np.nonzero(under)
    if len(cols):
        bow = np.argmin(cols)
        bx_, by_ = int(cols[bow]), int(rows[bow])
        spray = np.zeros((H, W), np.float32)
        count = int(1100 * U * U * 4)
        for i in range(count):
            a_ = gl_rng.uniform(math.radians(105), math.radians(170))
            r_ = gl_rng.uniform(0, 1) ** 2.2 * 105 * U
            x_ = int(bx_ + math.cos(a_) * r_ + gl_rng.normal(0, 5 * U) + 26 * U)
            y_ = int(by_ - math.sin(a_) * r_ * 0.6 + gl_rng.normal(0, 3 * U))
            if 0 <= x_ < W and 0 <= y_ < H and hull_[y_, x_] < 0.5:
                spray[y_, x_] += gl_rng.uniform(0.2, 1.0)
        spray = blur(spray, 0.7 * U + 0.15) * 2.6
        img = img + (np.array([1.0, 0.92, 0.8]) * 1.1 - img) * np.clip(spray, 0, 0.9)[:, :, None]

# Lift the sea's sun road a little and let the highlights bloom.
luma = (img * np.array([0.2126, 0.7152, 0.0722])).sum(2)
hi = np.clip(img - 1.0, 0, 1.6)
pad = 0
b1 = blur(hi, 10 * U)
b2 = blur(hi, 42 * U)
b3 = blur(hi, 150 * U)
img = img + b1 * 0.42 + b2 * 0.3 + b3 * 0.2
# Warm wash around the sun.
wash = (0.008 * a16 + 0.02 * a64)[:, :, None] * hue
img = img + wash

# The left of the wide picture, where the text stands, falls off into deep teal. This is a grade, not a scrim: the art itself is darker there.
if MODE == 'wide':
    k = smooth(0.08, 0.62, (xs + 0.5) / W)
    # Multiply down, and pull hue towards the brand's ink.
    darken = (0.34 + 0.66 * k)[:, :, None]
    ink = lin('#004646')
    img = img * darken + ink * (1 - darken) * 0.5
else:
    k = smooth(0.26, 0.62, ((ys + 0.5) / H))
    darken = (0.34 + 0.66 * k)[:, :, None]
    ink = lin('#004646')
    img = img * darken + ink * (1 - darken) * 0.5

# A filmic curve that keeps colour in the highlights.
def tone(x):
    a, b, c, d_, e = 2.51, 0.03, 2.43, 0.59, 0.14
    return np.clip((x * (a * x + b)) / (x * (c * x + d_) + e), 0, 1)

img = img * 0.92
peak = np.maximum(img.max(2, keepdims=True), 1e-4)
mapped = tone(peak)
hue_kept = img / peak * mapped
per_ch = tone(img)
img = hue_kept * 0.55 + per_ch * 0.45
# sRGB.
srgb = np.where(img <= 0.0031308, img * 12.92, 1.055 * np.power(np.maximum(img, 1e-6), 1 / 2.4) - 0.055)
# A tiny vignette and a whisper of grain, which also stops the long gradients from banding once they're compressed.
vx = (xs + 0.5) / W - 0.5
vy = (ys + 0.5) / H - 0.5
srgb *= (1 - 0.2 * smooth(0.25, 0.8, np.sqrt(vx * vx + vy * vy)))[:, :, None]
grain = np.random.default_rng(3).normal(0, 0.0045, (H, W, 1))
srgb = np.clip(srgb + grain, 0, 1)


def save_rgb(arr, path, quality, colorspace='sRGB'):
    h, w = arr.shape[:2]
    o = bpy.data.images.new('o', w, h, alpha=False, float_buffer=False)
    o.colorspace_settings.name = 'Non-Color'
    rgba = np.ones((h, w, 4), np.float32)
    rgba[:, :, :3] = arr[::-1]
    o.pixels.foreach_set(rgba.ravel())
    o.filepath_raw = path
    if path.endswith('.webp'):
        o.file_format = 'WEBP'
    else:
        o.file_format = 'PNG'
    bpy.context.scene.render.image_settings.quality = quality
    o.save()
    bpy.data.images.remove(o)
    print('wrote', path, os.path.getsize(path), flush=True)


save_rgb(srgb, os.path.join(IN, f'{MODE}_final.png'), 100)

if SITE:
    # The picture.
    save_rgb(srgb, os.path.join(SITE, f'{MODE}.webp'), QUALITY)
    # The small map: red is depth for the parallax, green the sea, blue the sky.
    n = 4
    h2, w2 = H // n, W // n
    def down(a):
        return a[:h2 * n, :w2 * n].reshape(h2, n, w2, n).mean((1, 3))
    logd = np.clip(np.log(np.maximum(np.where(solid > 0.01, dist, 9000), 10)) / math.log(9000), 0, 1)
    logd = logd * (1 - seam * 0) * (solid > 0.01) + (solid <= 0.01) * 1.0
    r = down(logd.astype(np.float32))
    above = (solid > 0.02) & (seam < 0.5)              # the boat, the bird and the land
    near_thing = np.clip(blur(above.astype(np.float32), 26 * U) * 44, 0, 1)     # a wide halo: ropes and the bill are thin, so this is generous
    near_low = np.clip(blur(above.astype(np.float32), 7 * U) * 18, 0, 1)
    g = down((seam * (1 - near_low)).astype(np.float32))
    b = down(((1 - solid) * (1 - near_thing)).astype(np.float32))
    save_rgb(np.stack([r, g, b], 2), os.path.join(SITE, f'{MODE}-map.webp'), 88)
    meta = dict(sunX=sun_x / W, horizon=horizon_row / H, w=W, h=H)
    print('META', json.dumps(meta), flush=True)
print('DONE', flush=True)
