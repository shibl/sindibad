# Renders what the blueprint, trails and depth need, from the same camera as the beauty pass, with no filtering so every pixel
# holds exact values: world position (RGB) + hit (A), then material class (R) and normal (GBA unused).
#   OUT=<cache> W=5120 Blender -b <cache>/world.blend -P data_pass.py
import bpy, os, time
scene = bpy.context.scene
OUT = os.environ['OUT']
W = int(os.environ.get('W', 2560))
H = int(os.environ.get('H', W * 9 // 16))
pr = bpy.context.preferences.addons['cycles'].preferences
pr.compute_device_type = 'METAL'
pr.get_devices()
for d in pr.devices:
    d.use = d.type == 'METAL'
c = scene.cycles
scene.render.engine = 'CYCLES'
c.device = 'GPU'
c.samples = 1
c.use_adaptive_sampling = False
c.use_denoising = False
c.max_bounces = 0
c.diffuse_bounces = c.glossy_bounces = c.transmission_bounces = c.volume_bounces = c.transparent_max_bounces = 0
c.filter_width = 0.01
c.pixel_filter_type = 'BOX'
scene.render.film_transparent = True
scene.render.resolution_x, scene.render.resolution_y = W, H
scene.render.resolution_percentage = 100
scene.view_settings.view_transform = 'Raw'
scene.view_settings.look = 'None'
scene.render.image_settings.file_format = 'OPEN_EXR'
scene.render.image_settings.color_depth = '32'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.image_settings.exr_codec = 'ZIP'
CLASS = {'land_main': 1, 'water': 2, 'plaster': 3, 'wood': 3, 'dark': 3, 'lit': 3, 'tile': 3, 'cloth': 3, 'stone': 3, 'hull': 4, 'sail': 4, 'leaf': 5, 'frond': 5, 'tuft': 0, 'vines': 0, 'boulder': 3}
for ob in list(bpy.data.objects):
    if ob.name.startswith('cloud_') or ob.name.startswith('fall') or ob.name in ('tuft', 'vines'):
        ob.hide_render = True
    elif ob.type == 'MESH':
        ob.pass_index = CLASS.get(ob.name, 6 if ob.name.startswith('land_') else 3)
for m in list(bpy.data.materials):
    pass
def emit_mat(name, build):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    e = nt.nodes.new('ShaderNodeEmission')
    e.inputs['Strength'].default_value = 1
    nt.links.new(e.outputs[0], out.inputs[0])
    build(nt, e)
    return m
def pos(nt, e):
    g = nt.nodes.new('ShaderNodeNewGeometry')
    nt.links.new(g.outputs['Position'], e.inputs['Color'])
def cls(nt, e):
    oi = nt.nodes.new('ShaderNodeObjectInfo')
    g = nt.nodes.new('ShaderNodeNewGeometry')
    nrm = nt.nodes.new('ShaderNodeVectorMath')
    nrm.operation = 'NORMALIZE'
    nt.links.new(g.outputs['Normal'], nrm.inputs[0])
    sp = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(nrm.outputs[0], sp.inputs[0])
    cb = nt.nodes.new('ShaderNodeCombineXYZ')
    nt.links.new(oi.outputs['Object Index'], cb.inputs[0])
    nt.links.new(sp.outputs[2], cb.inputs[1])
    # facing ratio
    dot = nt.nodes.new('ShaderNodeVectorMath')
    dot.operation = 'DOT_PRODUCT'
    nt.links.new(g.outputs['Normal'], dot.inputs[0])
    nt.links.new(g.outputs['Incoming'], dot.inputs[1])
    nt.links.new(dot.outputs['Value'], cb.inputs[2])
    nt.links.new(cb.outputs[0], e.inputs['Color'])
vl = bpy.context.view_layer
t0 = time.time()
vl.material_override = emit_mat('pos', pos)
scene.render.filepath = os.path.join(OUT, 'data_pos.exr')
bpy.ops.render.render(write_still=True)
vl.material_override = emit_mat('cls', cls)
scene.render.filepath = os.path.join(OUT, 'data_cls.exr')
bpy.ops.render.render(write_still=True)
print(f'data passes in {time.time() - t0:.1f}s', flush=True)
