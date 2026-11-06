# The runner: the repo's own little character (public/concepts/level-runner.png, from concepts/blender/level-char.blend), shrunk to what
# the lens needs and colour-matched to the warm light of the world.
#   ROOT=<repo> DEST=<public dir> Blender -b --factory-startup -P sprite.py
import bpy, os
import numpy as np
ROOT, DEST = os.environ['ROOT'], os.environ['DEST']
im = bpy.data.images.load(os.path.join(ROOT, 'public/concepts/level-runner.png'))
im.colorspace_settings.name = 'Non-Color'
W, H = im.size
px = np.empty(W * H * 4, np.float32)
im.pixels.foreach_get(px)
px = px.reshape(H, W, 4)
print('runner', W, H, 'alpha bbox rows', np.nonzero(px[..., 3].max(1) > 0.5)[0][[0, -1]], flush=True)
F = int(os.environ.get('F', 2))
# premultiplied average, so edges don't pick up the transparent colour
pm = px[..., :3] * px[..., 3:4]
h2, w2 = H // F, W // F
pm2 = pm[:h2 * F, :w2 * F].reshape(h2, F, w2, F, 3).mean(axis=(1, 3))
a2 = px[:h2 * F, :w2 * F, 3].reshape(h2, F, w2, F).mean(axis=(1, 3))
rgb = pm2 / np.maximum(a2[..., None], 1e-3)
# dilate colour into the transparent area
rgb = np.where(a2[..., None] > 0.01, rgb, 1.0)
out = np.concatenate([np.clip(rgb, 0, 1), a2[..., None]], 2).astype(np.float32)
o = bpy.data.images.new('w', w2, h2, alpha=True, float_buffer=False)
o.colorspace_settings.name = 'Non-Color'
o.alpha_mode = 'STRAIGHT'
o.pixels.foreach_set(out.ravel())
s = bpy.context.scene
s.render.image_settings.file_format = 'WEBP'
s.render.image_settings.quality = int(os.environ.get('Q', 86))
s.render.image_settings.color_mode = 'RGBA'
p = os.path.join(DEST, 'runner.webp')
o.save_render(p, scene=s)
print('runner.webp', os.path.getsize(p) // 1024, 'KB', w2, h2, flush=True)
