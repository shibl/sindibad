# Writes a quick PNG from an EXR with a neutral tone curve and a flat sky, for checking drafts.
#   IN=x.exr PNG=x.png Blender -b --factory-startup -P peek.py
import bpy, os
import numpy as np
im = bpy.data.images.load(os.environ['IN'])
im.colorspace_settings.name = 'Non-Color'
W, H = im.size
px = np.empty(W * H * 4, np.float32)
im.pixels.foreach_get(px)
px = px.reshape(H, W, 4)
exp = float(os.environ.get('EXP', 1.0))
sky = (np.array([214, 236, 240], np.float32) / 255) ** 2.2
rgb = px[..., :3] * exp + sky * (1 - px[..., 3:4])
rgb = np.clip(rgb, 0, None)
rgb = rgb * (1 + rgb / 16) / (1 + rgb * 0.45)
rgb = np.clip(rgb, 0, 1) ** (1 / 2.2)
out = np.ones((H, W, 4), np.float32)
out[..., :3] = rgb
o = bpy.data.images.new('o', W, H, alpha=True)
o.pixels.foreach_set(out.ravel())
o.filepath_raw = os.environ['PNG']
o.file_format = 'PNG'
o.save()
