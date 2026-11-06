# Renders the beauty pass of world.blend to linear EXR.
#   OUT=<cache> W=2560 SPP=192 NAME=beauty Blender -b <cache>/world.blend -P render.py
import bpy, os, sys, time, math
scene = bpy.context.scene
OUT = os.environ['OUT']
W = int(os.environ.get('W', 1280))
H = int(os.environ.get('H', W * 9 // 16))
SPP = int(os.environ.get('SPP', 64))
NAME = os.environ.get('NAME', 'beauty')
pr = bpy.context.preferences.addons['cycles'].preferences
pr.compute_device_type = 'METAL'
pr.get_devices()
for d in pr.devices:
    d.use = d.type == 'METAL'
c = scene.cycles
scene.render.engine = 'CYCLES'
c.device = 'GPU'
c.samples = SPP
c.use_adaptive_sampling = True
c.adaptive_threshold = float(os.environ.get('NOISE', 0.012))
c.use_denoising = True
c.denoiser = 'OPENIMAGEDENOISE'
c.denoising_input_passes = 'RGB_ALBEDO_NORMAL'
c.denoising_prefilter = 'ACCURATE'
c.max_bounces, c.diffuse_bounces, c.glossy_bounces, c.transmission_bounces, c.volume_bounces = 12, 4, 3, 4, int(os.environ.get('VOLB', 4))
c.transparent_max_bounces = 16
c.sample_clamp_indirect = 4.0
c.caustics_reflective = c.caustics_refractive = False
scene.render.film_transparent = True
scene.render.use_persistent_data = True
scene.render.resolution_x, scene.render.resolution_y = W, H
scene.render.resolution_percentage = int(os.environ.get('PCT', 100))
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
scene.display_settings.display_device = 'sRGB'
scene.render.image_settings.file_format = 'OPEN_EXR'
scene.render.image_settings.color_depth = '32'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.image_settings.exr_codec = 'ZIP'
scene.render.filepath = os.path.join(OUT, f'{NAME}.exr')
t0 = time.time()
bpy.ops.render.render(write_still=True)
print(f'rendered {NAME} in {time.time() - t0:.1f}s', flush=True)
