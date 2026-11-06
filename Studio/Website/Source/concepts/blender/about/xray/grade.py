# Turns the beauty EXR into the final picture: the page's sky behind it, aerial haze so the far cloud goes quiet behind the text,
# clouds graded into the brand's teals and warm whites, bloom, a tone curve, and a clean fade to the white page at the bottom.
#   OUT=<cache> DEST=<public dir> NAME=beauty W=2560 Q=78 Blender -b --factory-startup -P grade.py
import bpy, json, math, os, sys, time
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from lib import *
exec(open(os.path.join(HERE, 'camera.py')).read())
from mathutils import Vector

OUT = os.environ['OUT']
DEST = os.environ.get('DEST', OUT)
NAME = os.environ.get('NAME', 'beauty')
QUAL = int(os.environ.get('Q', 98))
T0 = time.time()
def log(*a): print(f'[{time.time() - T0:6.1f}s]', *a, flush=True)

def load_exr(name):
    im = bpy.data.images.load(os.path.join(OUT, name))
    im.colorspace_settings.name = 'Non-Color'
    w, h = im.size
    px = np.empty(w * h * 4, np.float32)
    im.pixels.foreach_get(px)
    bpy.data.images.remove(im)
    return px.reshape(h, w, 4)[::-1].copy()

def to_lin(c):
    c = np.asarray(c, np.float32)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def to_srgb(c):
    c = np.clip(c, 0, None)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)
def L(s):
    return to_lin(np.array([int(s[1:3], 16), int(s[3:5], 16), int(s[5:7], 16)], np.float32) / 255)
def lum(c):
    return c[..., 0] * 0.2126 + c[..., 1] * 0.7152 + c[..., 2] * 0.0722

beauty = load_exr(f'{NAME}.exr')
H, W = beauty.shape[:2]
pos = load_exr('data_pos.exr')
# data passes can be at another resolution: bring hit and distance to the beauty's
if pos.shape[0] != H:
    f = pos.shape[0] / H
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    sx, sy = (xx + 0.5) * f - 0.5, (yy + 0.5) * f - 0.5
    hit = blur(pos[..., 3], f * 0.4)
    hit = sample2(hit, sx, sy)
    C = np.array(CAM_LOC, np.float32)
    dist_full = np.linalg.norm(pos[..., :3] - C, axis=2)
    dist_full = np.where(pos[..., 3] > 0.5, dist_full, 0)
    dist = sample2(dist_full, sx, sy)
else:
    hit = pos[..., 3]
    C = np.array(CAM_LOC, np.float32)
    dist = np.where(hit > 0.5, np.linalg.norm(pos[..., :3] - C, axis=2), 0)
del pos
log('loaded', W, H)
v = (np.arange(H, dtype=np.float32) + 0.5)[:, None] / H
u = (np.arange(W, dtype=np.float32) + 0.5)[None, :] / W
U, V = np.broadcast_to(u, (H, W)), np.broadcast_to(v, (H, W))

# ---------------------------------------------------------------- the sky is the page's own blue at the top, warming towards the horizon glow
TOP = L('#d6ecf0')
MID = L('#e3f0ea')
WARM = L('#fbeed8')
PALE = L('#fff8ee')
SUNC = L('#fff0d2')
t = V[..., None]
sky = lerp(TOP, MID, smooth(0.08, 0.42, t))
sky = lerp(sky, WARM, smooth(0.3, 0.7, t))
sky = lerp(sky, PALE, smooth(0.6, 0.95, t))
# the sun's glow, from behind the upper left, where the text is
sx, sy = 0.14, 0.34
dd = np.sqrt(((U - sx) * 1.5) ** 2 + (V - sy) ** 2)
sky = sky + SUNC * np.exp(-(dd / 0.42) ** 2)[..., None] * 0.10
sky = sky.astype(np.float32)
log('sky')

a = np.clip(beauty[..., 3], 0, 1)
rgb = beauty[..., :3]
# Clouds: pixels that aren't hard surfaces. Light is regraded through a palette: teal in the shadows, warm white on top.
surf = np.clip(hit, 0, 1)
cloud_l = lum(rgb) / np.maximum(a, 1e-3)
EXPO = float(os.environ.get('CLOUD_EXPO', 1.0))
cl = np.clip(cloud_l * EXPO, 0, 2.0)
c0, c1, c2, c3 = L('#a8cfd2'), L('#c2dddd'), L('#e6eadf'), L('#fff4df')
print('cloud lum percentiles', np.percentile(cl[int(H * 0.5):int(H * 0.9), :int(W * 0.4)], [2, 25, 50, 75, 98]), 'alpha', np.percentile(a[int(H * 0.5):int(H * 0.9), :int(W * 0.4)], [2, 50, 98]), flush=True)
cc = lerp(c0, c1, smooth(0.28, 0.58, cl)[..., None])
cc = lerp(cc, c2, smooth(0.5, 0.86, cl)[..., None])
cc = lerp(cc, c3, smooth(0.8, 1.15, cl)[..., None]).astype(np.float32)
# a touch of softness: the volume's finest speckle isn't cloud, it's noise
cc = lerp(cc, blur(cc, W / 2560 * 2.2), (1 - surf[..., None]))
clouds = sky * (1 - a[..., None]) + cc * a[..., None]
# Aerial haze over the cloud sea: thick in the distance (top of the frame) and far left, thin at the bottom. This is what makes the calm area calm.
haze = smooth(0.46, 0.08, V)
calm = np.clip(haze, 0, 1) * 0.96
# the text's column gets the quietest air of all, fading out well before the land
text_zone = smooth(0.54, 0.4, U) * smooth(0.9, 0.72, V)
calm = np.maximum(calm, text_zone * float(os.environ.get('CALM', 0.34)))
clouds = lerp(clouds, sky, calm[..., None])

# Surfaces: colour straight from the render, in atmosphere by distance. Warm near the sun, cool away from it.
EXP = float(os.environ.get('EXPO', 1.0))
sr = rgb * EXP
air = 1 - np.exp(-(np.maximum(dist - 240, 0) / 1000) ** 1.3)
air = np.where(surf > 0.5, air, 0).astype(np.float32)
sr = lerp(sr, sky * a[..., None], air[..., None] * 0.92)
# cloud in front of a surface: some of this pixel is volume. Keep the render's look there.
comp = clouds * (1 - surf[..., None]) + (sr + sky * (1 - a[..., None])) * surf[..., None]
log('comp')

# Shafts of light from the sun, behind the upper left: a radial blur of the bright sky, lying soft over everything.
def rays(img, cx, cy, steps=5, spread=0.62):
    h, w = img.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    out = img
    k = spread
    for i in range(steps):
        sc = 1 - k
        sx_ = cx * w + (xx - cx * w) * sc
        sy_ = cy * h + (yy - cy * h) * sc
        out = 0.5 * out + 0.5 * sample2(out, sx_, sy_)
        k *= 0.5
    return out
small_w = 640
f_ = W // small_w
lum_small = lum(comp[::f_, ::f_])
mask = smooth(0.72, 0.98, lum_small) * (1 - surf[::f_, ::f_] * 0.97)
sun_u, sun_v = -0.08, -0.04
ray = rays(mask.astype(np.float32), sun_u, sun_v)
ray = blur(ray, 3)
yy_, xx_ = np.mgrid[0:H, 0:W].astype(np.float32)
ray_full = sample2(ray, xx_ / f_, yy_ / f_)
ray_amt = float(os.environ.get('RAYS', 0.06))
# rays read where things are dark, so this is mostly a warm lift of the island's shaded side
comp = comp + (L('#ffe3b8') * (ray_full * ray_amt * (0.35 + 0.65 * surf))[..., None]).astype(np.float32) * (1 - comp.clip(0, 1) * 0.72)

# bloom: light bleeding around bright things
hi = np.clip(comp - 0.82, 0, 2)
bl = blur(hi, W / 2560 * 10) * 0.55 + blur(hi, W / 2560 * 42) * 0.55
comp = comp + bl.astype(np.float32)

# colour: a soft shoulder and a gentle S in display space; shadows lean teal, highlights lean warm
x = np.clip(comp, 0, None)
x = x / (1 + np.maximum(x - 0.72, 0) * 0.7)      # shoulder only above 0.72
d = to_srgb(np.clip(x, 0, 1))
l_ = lum(d)[..., None]
d = d + (d - l_) * 0.1                           # a little saturation
s = d * d * (3 - 2 * d)
d = lerp(d, s, 0.16)
sh = smooth(0.5, 0.05, lum(d))[..., None]
d = d + sh * (L('#02504c') - 0.12) * 0.1 * surf[..., None]
d = np.clip(d, 0, 1).astype(np.float32)

# the edges of the picture: exactly the page's colours
TOPS = np.array([214, 236, 240], np.float32) / 255
k = smooth(0.1, 0.0, V)[..., None]
d = lerp(d, TOPS, k)
kb = smooth(0.88, 0.998, V)[..., None]
d = lerp(d, np.ones(3, np.float32), kb ** 1.2)
log('graded')

# a report: how readable is ink on this sky in the text's column
ink_l = 0.0481
col = d[int(H * 0.15):int(H * 0.8), int(W * 0.05):int(W * 0.44)]
lin = to_lin(col)
Lb = lum(lin)
print('text area: min contrast with ink', float((Lb.min() + 0.05) / (ink_l + 0.05)), 'median', float((np.median(Lb) + 0.05) / (ink_l + 0.05)), flush=True)

def save_webp(arr, path, q):
    h, w = arr.shape[:2]
    px = np.ones((h, w, 4), np.float32)
    px[..., :3] = np.clip(arr, 0, 1)
    im = bpy.data.images.new('w', w, h, alpha=False, float_buffer=False)
    im.colorspace_settings.name = 'Non-Color'
    im.pixels.foreach_set(px[::-1].ravel())
    scene = bpy.context.scene
    scene.render.image_settings.file_format = 'WEBP'
    scene.render.image_settings.quality = q
    scene.render.image_settings.color_mode = 'RGB'
    # save_render honours the quality setting (Image.save doesn't), and a byte image tagged Non-Color passes through unchanged
    im.save_render(path, scene=scene)
    bpy.data.images.remove(im)
    log(os.path.basename(path), f'{os.path.getsize(path) / 1024:.0f} KB', f'{w}x{h}', 'q', q)

os.makedirs(DEST, exist_ok=True)
# dither before 8 bits so the long sky gradient can't band
r = np.random.default_rng(3)
d2 = d + (r.random(d.shape[:2], dtype=np.float32)[..., None] - r.random(d.shape[:2], dtype=np.float32)[..., None]) / 255 * 0.6
save_webp(d2, os.path.join(DEST, f'{os.environ.get("OUTNAME", "world")}.webp'), QUAL)
# the blurred first impression, small enough to inline in the page's code
TS = os.environ.get('POSTER_TS')
if TS:
    import base64
    H2, W2 = 36, 64
    f = H // H2
    small = d[:H2 * f, :W2 * f].reshape(H2, f, W2, f, 3).mean(axis=(1, 3))
    tmp = os.path.join(OUT, 'poster.webp')
    save_webp(small, tmp, 92)
    b = base64.b64encode(open(tmp, 'rb').read()).decode()
    with open(TS, 'w') as fh:
        fh.write('// A 64 x 36 version of the world, inlined so something composed shows before anything loads. Written by concepts/blender/about/xray/grade.py.\n')
        fh.write(f"export const POSTER = 'data:image/webp;base64,{b}'\n")
