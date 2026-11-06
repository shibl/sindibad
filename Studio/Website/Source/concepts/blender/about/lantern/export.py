# Turns the renders from lantern.py into the page's runtime assets, and writes the plaster tile.
#   IN=<render dir> DEST=<repo>/public/about/lantern Blender -b --factory-startup --python-use-system-env -P export.py
#   Env: ONLY=mask,frames,chain,plaster to do part of it.  MASK_Q, FRAME_Q, PLASTER_Q set WebP quality.
import bpy, json, math, os
import numpy as np

IN = os.environ.get('IN', '')
DEST = os.environ['DEST']
ONLY = set(os.environ.get('ONLY', 'mask,frames,chain,plaster').split(','))
os.makedirs(DEST, exist_ok=True)
scene = bpy.context.scene
st = scene.render.image_settings
st.file_format = 'WEBP'

def save(px, path, q, rgba=False):
    """px is H x W x (3|4) floats in 0..1 with row 0 at the top. Values are written as they are, with no colour conversion."""
    h, w = px.shape[:2]
    im = bpy.data.images.new('x', w, h, alpha=True, float_buffer=False)
    im.colorspace_settings.name = 'Non-Color'
    out = np.ones((h, w, 4), np.float32)
    out[:, :, :px.shape[2]] = px
    im.pixels.foreach_set(out[::-1].ravel())
    st.color_mode = 'RGBA' if rgba else 'RGB'
    st.quality = q
    im.save_render(path, scene=scene)
    bpy.data.images.remove(im)
    print(f'{os.path.basename(path)}  {w}x{h}  {os.path.getsize(path) / 1024:.0f} KB')

def load(path):
    im = bpy.data.images.load(path)
    im.colorspace_settings.name = 'Non-Color'
    w, h = im.size
    px = np.empty(w * h * 4, np.float32)
    im.pixels.foreach_get(px)
    return px.reshape(h, w, 4)[::-1].copy()

if 'mask' in ONLY:
    px = load(os.path.join(IN, 'mask.png'))
    save(px[:, :, :3], os.path.join(DEST, 'mask.webp'), int(os.environ.get('MASK_Q', 70)))

if 'frames' in ONLY:
    meta = json.load(open(os.path.join(IN, 'lantern.json')))
    q = int(os.environ.get('FRAME_Q', 80))
    for i in range(meta['frames']):
        px = load(os.path.join(IN, f'f{i}.png'))
        # WebP keeps colour under transparent pixels poorly, so bleed nothing: premultiply happens at upload.
        save(px, os.path.join(DEST, f'f{i}.webp'), q, True)
    with open(os.path.join(DEST, 'lantern.json'), 'w') as f:
        json.dump(meta, f)

if 'chain' in ONLY:
    for n in ('link0', 'link1'):
        px = load(os.path.join(IN, f'{n}.png'))
        save(px, os.path.join(DEST, f'{n}.webp'), 82, True)

if 'plaster' in ONLY:
    # A seamless tile of hand-laid lime plaster, from layered filtered noise: broad trowel sweeps, fine sand, a few pits.
    # R and G hold the surface slope, B holds the mottling of the wash.
    S = 640
    rng = np.random.default_rng(11)
    fy = np.fft.fftfreq(S)[:, None]
    fx = np.fft.fftfreq(S)[None, :]
    def band(power, aniso=1.0, angle=0.0, low=0.0, high=0.5):
        c, s = math.cos(angle), math.sin(angle)
        u = (fx * c + fy * s)
        v = (-fx * s + fy * c) * aniso
        f = np.sqrt(u * u + v * v)
        amp = np.where((f > low) & (f < high), 1 / np.maximum(f, 1e-3) ** power, 0)
        n = np.fft.ifft2(np.fft.fft2(rng.standard_normal((S, S))) * amp).real
        return (n - n.mean()) / n.std()
    # Trowel arcs: several directions of long smears, each blended by a broad mask
    h = np.zeros((S, S))
    for ang in (0.3, 1.25, 2.3):
        mask = band(2.0, 1, 0, 0.002, 0.012)
        mask = np.clip(mask * 0.9 + 0.5, 0, 1)
        h += band(1.5, 2.6, ang, 0.006, 0.06) * mask * 0.5
    h += band(1.7, 1.0, 0, 0.004, 0.06) * 0.6       # lumps
    h += band(0.8, 1.0, 0, 0.06, 0.5) * 0.09        # sand
    pits = band(0.2, 1.0, 0, 0.06, 0.32)
    h -= np.clip(pits - 2.3, 0, 2) * 0.55           # pits
    gy, gx = np.gradient(h)
    # Periodic gradient (np.gradient isn't, so patch the seam)
    gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5
    gy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5
    k = 0.5 / (3 * max(gx.std(), gy.std()))
    wash = band(1.8, 1.0, 0, 0.002, 0.08) * 0.8 + band(1.0, 2.5, 0.8, 0.02, 0.25) * 0.2
    wash = np.clip(wash * 0.22 + 0.5, 0, 1)
    px = np.stack([np.clip(gx * k + 0.5, 0, 1), np.clip(gy * k + 0.5, 0, 1), wash], -1).astype(np.float32)
    save(px, os.path.join(DEST, 'plaster.webp'), int(os.environ.get('PLASTER_Q', 50)))

if 'stills' in ONLY:
    # The fallback for browsers without WebGL2: screenshots of the wall with the text hidden, so no words are baked in.
    for name in ('still', 'still-phone'):
        px = load(os.path.join(IN, f'{name}.png'))
        save(px[:, :, :3], os.path.join(DEST, f'{name}.webp'), int(os.environ.get('STILL_Q', 62)))

total = sum(os.path.getsize(os.path.join(DEST, f)) for f in os.listdir(DEST))
print(f'TOTAL {total / 1048576:.2f} MB')
