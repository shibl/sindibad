# Cuts the PLAY letters out of the claw machine's hero art and finds its marquee bulbs, so the page can light them exactly in place.
#   ROOT=<repo> Blender -b --factory-startup -P claw-sign.py
# Writes public/concepts/claw-sign.webp and prints the bulbs and crop in percent of the art.
import bpy, json, os
import numpy as np

ROOT = os.environ['ROOT']
im = bpy.data.images.load(os.path.join(ROOT, 'public/concepts/claw.png'))
im.colorspace_settings.name = 'Non-Color'
W, H = im.size
px = np.empty(W * H * 4, np.float32)
im.pixels.foreach_get(px)
px = px.reshape(H, W, 4)[::-1]          # top row first

# The pink panel, measured from the art, as corners running clockwise from the top left.
QUAD = [(402, 288), (938, 250), (942, 386), (405, 410)]
yy, xx = np.mgrid[0:H, 0:W]
inside = np.ones((H, W), bool)
for (ax, ay), (bx, by) in zip(QUAD, QUAD[1:] + QUAD[:1]):
    inside &= (bx - ax) * (yy - ay) - (by - ay) * (xx - ax) >= 0

# Letters are near white and the panel is strongly pink, so green separates them cleanly.
# The letters' own box keeps the panel's bright edge out of the cut.
box = (xx >= 525) & (xx <= 790) & (yy >= 278) & (yy <= 392)
alpha = np.clip((px[:, :, 1] - 0.56) / 0.26, 0, 1) * inside * box
ys, xs = np.nonzero(alpha > 0.02)
x0, x1, y0, y1 = xs.min() - 2, xs.max() + 3, ys.min() - 2, ys.max() + 3
crop = alpha[y0:y1, x0:x1]
out = np.ones((*crop.shape, 4), np.float32)
out[:, :, 3] = crop
path = os.path.join(ROOT, 'public/concepts/claw-sign.webp')
o = bpy.data.images.new('sign', crop.shape[1], crop.shape[0], alpha=True, float_buffer=False)
o.alpha_mode = 'STRAIGHT'
o.pixels.foreach_set(out[::-1].ravel())
o.filepath_raw = path
o.file_format = 'WEBP'
bpy.context.scene.render.image_settings.quality = 90
o.save()

# Bulbs are small cream blobs on the marquee and on the star's disc.
cream = (px[:, :, 0] > 0.9) & (px[:, :, 1] > 0.86) & (px[:, :, 2] > 0.6) & (px[:, :, 2] < 0.97) & ~inside & (px[:, :, 3] > 0.9)
cream[460:, :] = False
cream[:, :360] = False
cream[:, 1000:] = False
seen = np.zeros_like(cream)
bulbs = []
for sy, sx in zip(*np.nonzero(cream)):
    if seen[sy, sx]: continue
    stack, cells = [(sy, sx)], []
    seen[sy, sx] = True
    while stack:
        y, x = stack.pop()
        cells.append((y, x))
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < H and 0 <= nx < W and cream[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                stack.append((ny, nx))
    if 40 <= len(cells) <= 700:
        c = np.array(cells)
        bulbs.append((float(c[:, 1].mean()), float(c[:, 0].mean()), len(cells)))
print('CROP', json.dumps({k: round(v / W * 100, 2) for k, v in dict(x=int(x0), y=int(y0), w=int(x1 - x0), h=int(y1 - y0)).items()}))
print('BULBS', json.dumps([[round(x / W * 100, 2), round(y / H * 100, 2), a] for x, y, a in bulbs]))
print('SIZE', os.path.getsize(path))
