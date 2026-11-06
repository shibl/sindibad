# Packs renders for the page: trims the cards to their alpha, writes WebP, and works out where the raft's card sits in the world so it
# lands exactly on the last rendered frame.
#   WORK=<dir> OUT=<repo>/public/about/phone SEQ=<seq dir> SET=land|port WHAT=cards,raft Blender -b --factory-startup -P pack.py
import bpy, json, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from mathutils import Vector

WORK = os.environ['WORK']
OUT = os.environ['OUT']
WHAT = os.environ.get('WHAT', 'cards,raft').split(',')
os.makedirs(OUT, exist_ok=True)


def load_rgba(path):
    im = bpy.data.images.load(path)
    im.colorspace_settings.name = 'Non-Color'
    w, h = im.size
    a = np.empty(w * h * 4, np.float32)
    im.pixels.foreach_get(a)
    bpy.data.images.remove(im)
    return a.reshape(h, w, 4)[::-1]


def resize(a, nw, nh):
    """Area-average downscale, premultiplied so alpha edges stay clean."""
    h, w = a.shape[:2]
    if nw == w and nh == h:
        return a
    p = a.copy()
    p[:, :, :3] *= p[:, :, 3:4]
    ys = (np.arange(nh + 1) * h / nh).astype(int)
    xs = (np.arange(nw + 1) * w / nw).astype(int)
    c = np.cumsum(np.cumsum(np.pad(p, ((1, 0), (1, 0), (0, 0))), 0), 1)
    o = (c[ys[1:]][:, xs[1:]] - c[ys[1:]][:, xs[:-1]] - c[ys[:-1]][:, xs[1:]] + c[ys[:-1]][:, xs[:-1]])
    area = ((ys[1:] - ys[:-1])[:, None] * (xs[1:] - xs[:-1])[None, :])[:, :, None]
    o = o / area
    al = np.maximum(o[:, :, 3:4], 1e-4)
    o[:, :, :3] = np.clip(o[:, :, :3] / al, 0, 1)
    return o


def save_webp(a, path, q=82):
    h, w = a.shape[:2]
    im = bpy.data.images.new('o', w, h, alpha=True, float_buffer=False)
    im.colorspace_settings.name = 'Non-Color'
    im.alpha_mode = 'STRAIGHT'
    im.pixels.foreach_set(np.clip(a, 0, 1)[::-1].astype(np.float32).ravel())
    bpy.context.scene.render.image_settings.file_format = 'WEBP'
    bpy.context.scene.render.image_settings.color_mode = 'RGBA'
    bpy.context.scene.render.image_settings.quality = q
    im.save_render(path)
    bpy.data.images.remove(im)
    print(os.path.basename(path), w, h, os.path.getsize(path) // 1024, 'KB', flush=True)


if 'cards' in WHAT:
    src = os.path.join(WORK, 'world')
    meta = json.load(open(os.path.join(src, 'cards.json')))
    sizes = {'volcano': 760, 'fort': 700, 'light': 620, 'palms': 520, 'dhow': 1000}
    for name, m in meta.items():
        a = load_rgba(os.path.join(src, f'{name}.png'))
        tw = sizes.get(name, 700)
        th = max(2, round(a.shape[0] * tw / a.shape[1]))
        save_webp(resize(a, min(tw, a.shape[1]), min(th, a.shape[0])), os.path.join(OUT, f'{name}.webp'), int(os.environ.get('CARD_Q', 78)))
    with open(os.path.join(OUT, 'cards.json'), 'w') as f:
        json.dump(meta, f)
    a = load_rgba(os.path.join(src, 'world.png'))
    save_webp(a, os.path.join(OUT, 'world.webp'), 82)

if 'still' in WHAT:
    # A composed still from a screenshot of the live scene, for reduced motion and for browsers without WebGL2.
    a = load_rgba(os.environ['IN'])
    tw = int(os.environ.get('TW', a.shape[1]))
    th = round(a.shape[0] * tw / a.shape[1])
    a[:, :, 3] = 1
    save_webp(resize(a, tw, th), os.path.join(OUT, os.environ['NAME']), int(os.environ.get('STILL_Q', 68)))

if 'encode' in WHAT:
    # Re-encode a sequence from its lossless copies at a new quality, with no re-render.
    SET = os.environ.get('SET', 'land')
    src = os.environ['RAW']
    q = int(os.environ.get('Q', 60))
    total = 0
    for name in sorted(os.listdir(src)):
        if not name.endswith('.png'):
            continue
        im = bpy.data.images.load(os.path.join(src, name))
        im.colorspace_settings.name = 'Non-Color'     # or save_render would run the scene's view transform over it again
        s_ = bpy.context.scene.render.image_settings
        s_.file_format = 'WEBP'
        s_.color_mode = 'RGB'
        s_.quality = q
        path = os.path.join(OUT, SET, name.replace('.png', '.webp'))
        im.save_render(path)
        bpy.data.images.remove(im)
        total += os.path.getsize(path)
    print('encoded', SET, q, total / 1048576, 'MB', flush=True)

if 'raft' in WHAT:
    SET = os.environ.get('SET', 'land')
    seq = os.environ['SEQ']
    a = load_rgba(os.path.join(seq, 'raft_full.png'))
    H, W = a.shape[:2]
    ys, xs = np.nonzero(a[:, :, 3] > 0.01)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    pad = 6
    x0, x1, y0, y1 = max(0, x0 - pad), min(W, x1 + pad), max(0, y0 - pad), min(H, y1 + pad)
    crop = a[y0:y1, x0:x1]
    save_webp(crop, os.path.join(OUT, f'raft-{SET}.webp'), 84)
    info = json.load(open(os.path.join(seq, 'raft.json')))
    # The card is a vertical plane through the raft, facing the camera along y. Pass camera rays through the crop's corners onto it.
    eye = Vector(info['eye'])
    at = Vector(info['at'])
    lens = info['lens']
    f = (at - eye).normalized()
    r = f.cross(Vector((0, 0, 1))).normalized()
    u = r.cross(f)
    sensor = 36.0
    aspect = W / H
    half_w = (sensor / 2) / lens if aspect >= 1 else (sensor / 2) / lens * aspect
    half_h = half_w / aspect
    plane_y = info['pivot'][1]

    def world(px, py):
        nx = (px / W) * 2 - 1
        ny = 1 - (py / H) * 2
        d = f + r * (nx * half_w) + u * (ny * half_h)
        s = (plane_y - eye.y) / d.y
        return eye + d * s

    tl = world(x0, y0)
    br = world(x1, y1)
    out = dict(card=dict(x0=tl.x, x1=br.x, z0=br.z, z1=tl.z, y=plane_y), corners=info['corners'], crop=[x0 / W, y0 / H, (x1 - x0) / W, (y1 - y0) / H])
    with open(os.path.join(OUT, f'raft-{SET}.json'), 'w') as fo:
        json.dump(out, fo)
    print('raft card', out, flush=True)
