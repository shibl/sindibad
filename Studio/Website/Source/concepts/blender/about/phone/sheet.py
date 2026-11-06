# A contact sheet of rendered frames, for looking at motion in one image.
#   DIR=<dir> OUT=<png> COLS=4 EVERY=1 SCALE=1 Blender -b --factory-startup -P sheet.py
import bpy, os, sys
import numpy as np

src = os.environ['DIR']
files = sorted(f for f in os.listdir(src) if f.lower().endswith(('.png', '.webp')))[:: int(os.environ.get('EVERY', 1))]
cols = int(os.environ.get('COLS', 4))
scale = int(os.environ.get('SCALE', 1))
tiles = []
for f in files:
    im = bpy.data.images.load(os.path.join(src, f))
    w, h = im.size
    a = np.empty(w * h * 4, np.float32)
    im.pixels.foreach_get(a)
    a = a.reshape(h, w, 4)[::-1][::scale, ::scale]
    tiles.append(a)
    bpy.data.images.remove(im)
th, tw = tiles[0].shape[:2]
rows = (len(tiles) + cols - 1) // cols
pad = 4
out = np.ones((rows * (th + pad) - pad, cols * (tw + pad) - pad, 4), np.float32)
for i, t in enumerate(tiles):
    r, c = i // cols, i % cols
    out[r * (th + pad):r * (th + pad) + th, c * (tw + pad):c * (tw + pad) + tw] = t
o = bpy.data.images.new('s', out.shape[1], out.shape[0], alpha=True)
o.colorspace_settings.name = 'Non-Color'
o.pixels.foreach_set(out[::-1].ravel())
o.filepath_raw = os.environ['OUT']
o.file_format = 'PNG'
o.save()
print('sheet', out.shape, len(tiles))
