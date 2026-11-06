# Turns screenshots of the finished scene, with the words hidden, into the stills used when WebGL isn't available.
#   ROOT=<repo> SCRATCH=<dir> Blender -b --factory-startup -P stills.py    (stills.sh takes the screenshots and runs this)
import bpy, os
import numpy as np

ROOT, SCRATCH = os.environ['ROOT'], os.environ['SCRATCH']
PUB = os.path.join(ROOT, 'public/about/storybook')
scene = bpy.context.scene
for name in ('still-wide-en', 'still-wide-ar', 'still-tall-en', 'still-tall-ar'):
    src = os.path.join(SCRATCH, f'{name}.png')
    if not os.path.exists(src):
        continue
    im = bpy.data.images.load(src)
    im.colorspace_settings.name = 'Non-Color'
    W, H = im.size
    px = np.empty(W * H * 4, np.float32)
    im.pixels.foreach_get(px)
    px = px.reshape(H, W, 4)
    px[:, :, 3] = 1
    o = bpy.data.images.new(name, W, H, alpha=False, float_buffer=False)
    o.colorspace_settings.name = 'Non-Color'
    o.pixels.foreach_set(px.ravel())
    scene.render.image_settings.file_format = 'WEBP'
    scene.render.image_settings.color_mode = 'RGB'
    scene.render.image_settings.quality = 72
    p = os.path.join(PUB, f'{name}.webp')
    o.save_render(p, scene=scene)
    print(name, f'{W}x{H}', f'{os.path.getsize(p) / 1024:.0f} KB', flush=True)
