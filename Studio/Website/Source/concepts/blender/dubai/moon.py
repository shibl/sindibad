# Turns NASA's lunar map into the disc of the moon as seen from Earth: north up, the near side centred. Map from NASA's
# CGI Moon Kit (svs.gsfc.nasa.gov/4720), public domain.
#   SRC=lroc_color_poles_2k.tif OUT=moon.webp Blender -b --factory-startup -P moon.py
import bpy, os
import numpy as np
im = bpy.data.images.load(os.environ['SRC'])
w, h = im.size
px = np.empty(w * h * 4, np.float32); im.pixels.foreach_get(px)
src = px.reshape(h, w, 4)[::-1, :, :3]     # row 0 at the top, latitude +90
N = 720
y, x = np.mgrid[0:N, 0:N]
u = (x + 0.5) / N * 2 - 1; v = 1 - (y + 0.5) / N * 2
r2 = np.minimum(u * u + v * v, 0.9999)
z = np.sqrt(1 - r2)
lat = np.arcsin(np.clip(v, -1, 1)); lon = np.arctan2(u, z)
fx = (lon / (2 * np.pi) + 0.5) * w - 0.5
fy = (0.5 - lat / np.pi) * h - 0.5
x0 = np.clip(np.floor(fx).astype(int), 0, w - 2); y0 = np.clip(np.floor(fy).astype(int), 0, h - 2)
tx = (fx - x0)[..., None]; ty = (fy - y0)[..., None]
disc = (src[y0, x0] * (1 - tx) + src[y0, x0 + 1] * tx) * (1 - ty) + (src[y0 + 1, x0] * (1 - tx) + src[y0 + 1, x0 + 1] * tx) * ty
# Stretch the tones so the seas and the bright rays read at a small size.
inside = u * u + v * v < 0.98
lo, hi = np.percentile(disc[inside].mean(1), [1, 99.7])
disc = np.clip((disc - lo) / (hi - lo), 0, 1) ** 0.82
disc = disc * 0.92 + 0.05
out = bpy.data.images.new('moon', N, N, alpha=False)
out.colorspace_settings.name = 'Non-Color'
pix = np.ones((N, N, 4), np.float32); pix[..., :3] = disc
out.pixels.foreach_set(pix[::-1].ravel())
s = bpy.context.scene
s.render.image_settings.file_format = 'WEBP'; s.render.image_settings.quality = 90; s.render.image_settings.color_mode = 'RGB'
s.view_settings.view_transform = 'Raw'
s.display_settings.display_device = 'sRGB'
out.save_render(os.environ['OUT'], scene=s)
print('MOON', os.environ['OUT'], os.path.getsize(os.environ['OUT']) / 1000, 'KB', 'range', lo, hi, flush=True)
