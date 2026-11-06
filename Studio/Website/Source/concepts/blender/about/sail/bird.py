# Brings the hoopoe into the poster's scene. The model, rig and feather atlas are copies of the hoopoe concept's own (in ./hoopoe), so the
# poster can still be rebuilt whichever concept survives. Its .blend holds only shape, skin and motion: the colours live in the runtime
# mesh, which keeps the same vertex order, so they're read from there.
import json, math, os, struct
import bpy
import numpy as np
from mathutils import Quaternion

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'hoopoe')


def read_runtime():
    with open(os.path.join(SRC, 'hoopoe-mesh.bin'), 'rb') as f:
        n = struct.unpack('<I', f.read(4))[0]
        head = json.loads(f.read(n))
        vb = np.frombuffer(f.read(head['v'] * 28), dtype=[('p', '<i2', 3), ('k', 'u1'), ('aoo', 'u1'), ('n', 'i1', 3), ('aof', 'u1'), ('uv', '<u2', 2), ('c', 'u1', 3), ('pad', 'u1'), ('j', 'u1', 4), ('w', 'u1', 4)])
    return vb


def material(atlas, translucency=0.22):
    m = bpy.data.materials.new('hoopoe')
    m.use_nodes = True
    t = m.node_tree
    t.nodes.clear()
    out = t.nodes.new('ShaderNodeOutputMaterial')
    uv = t.nodes.new('ShaderNodeUVMap')
    uv.uv_map = 'atlas'
    tex = t.nodes.new('ShaderNodeTexImage')
    tex.image = atlas
    tex.interpolation = 'Cubic'
    t.links.new(uv.outputs[0], tex.inputs['Vector'])
    tint = t.nodes.new('ShaderNodeVertexColor')
    tint.layer_name = 'tint'
    mix = t.nodes.new('ShaderNodeMix')
    mix.data_type = 'RGBA'
    mix.blend_type = 'MULTIPLY'
    mix.inputs['Factor'].default_value = 1
    t.links.new(tex.outputs['Color'], mix.inputs['A'])
    t.links.new(tint.outputs['Color'], mix.inputs['B'])
    bs = t.nodes.new('ShaderNodeBsdfPrincipled')
    bs.inputs['Roughness'].default_value = 0.62
    bs.inputs['Specular IOR Level'].default_value = 0.3
    t.links.new(mix.outputs['Result'], bs.inputs['Base Color'])
    # Feathers let the low sun through, which is what gives a backlit wing its glow.
    tr = t.nodes.new('ShaderNodeBsdfTranslucent')
    t.links.new(mix.outputs['Result'], tr.inputs['Color'])
    ms = t.nodes.new('ShaderNodeMixShader')
    ms.inputs[0].default_value = translucency
    t.links.new(bs.outputs[0], ms.inputs[1])
    t.links.new(tr.outputs[0], ms.inputs[2])
    t.links.new(ms.outputs[0], out.inputs['Surface'])
    return m


def eye_material(atlas):
    """A wet eye: the same painted iris, lit a little from within, under a glossy surface that catches a highlight."""
    m = bpy.data.materials.new('hoopoe_eye')
    m.use_nodes = True
    t = m.node_tree
    t.nodes.clear()
    out = t.nodes.new('ShaderNodeOutputMaterial')
    uv = t.nodes.new('ShaderNodeUVMap')
    uv.uv_map = 'atlas'
    tex = t.nodes.new('ShaderNodeTexImage')
    tex.image = atlas
    t.links.new(uv.outputs[0], tex.inputs['Vector'])
    bs = t.nodes.new('ShaderNodeBsdfPrincipled')
    bs.inputs['Roughness'].default_value = 0.07
    bs.inputs['Specular IOR Level'].default_value = 0.85
    bs.inputs['Emission Strength'].default_value = 0.45
    t.links.new(tex.outputs['Color'], bs.inputs['Base Color'])
    t.links.new(tex.outputs['Color'], bs.inputs['Emission Color'])
    t.links.new(bs.outputs[0], out.inputs['Surface'])
    return m


def load(collection, frame=2.0, crest=0.75, clip='flap', lid_open=15.0):
    """Adds the bird, posed at `frame` of `clip`, with its crest raised by `crest` (0 flat, 1 fully fanned). Returns (armature, mesh)."""
    path = os.path.join(SRC, 'hoopoe.blend')
    with bpy.data.libraries.load(path, link=False) as (a, b):
        b.objects = ['hoopoe', 'hoopoe_rig']
        b.actions = [clip, 'fan_pose']
    me_ob = next(o for o in b.objects if o.type == 'MESH')
    arm = next(o for o in b.objects if o.type == 'ARMATURE')
    for o in (me_ob, arm):
        collection.objects.link(o)
    motion = next(x for x in b.actions if x.name.startswith(clip))
    fan = next(x for x in b.actions if x.name.startswith('fan_pose'))

    # Colour, atlas position and occlusion, per vertex. The occlusion was baked with the wings open, as they are here.
    vb = read_runtime()
    me = me_ob.data
    assert len(me.vertices) == len(vb), (len(me.vertices), len(vb))
    col = me.color_attributes.new('tint', 'FLOAT_COLOR', 'POINT')
    rgba = np.ones((len(vb), 4), np.float32)
    # The same remap the hoopoe's own shader uses: occlusion goes warm rather than grey, as light does between feathers.
    ao = np.clip((vb['aoo'].astype(np.float32) / 255 - 0.02) / 0.76, 0, 1)
    ao = (ao * ao * (3 - 2 * ao))[:, None]
    warm = np.array([0.46, 0.30, 0.30], np.float32)
    rgba[:, :3] = vb['c'].astype(np.float32) / 255 * (warm + (1 - warm) * ao)
    col.data.foreach_set('color', rgba.ravel())
    uv = me.uv_layers.new(name='atlas')
    lv = np.zeros(len(me.loops), np.int64)
    me.loops.foreach_get('vertex_index', lv)
    uvs = vb['uv'].astype(np.float32) / 65535
    uvs[:, 1] = 1 - uvs[:, 1]          # the runtime reads the atlas from its top row, Blender from its bottom row
    uv.uv.foreach_set('vector', uvs[lv].ravel())
    image = bpy.data.images.load(os.path.join(SRC, 'hoopoe-atlas.webp'), check_existing=True)
    image.colorspace_settings.name = 'sRGB'
    me.materials.clear()
    me.materials.append(material(image))
    me.materials.append(eye_material(image))
    KIND_EYE = 3
    corners = np.zeros(len(me.loops), np.int64)
    me.loops.foreach_get('vertex_index', corners)
    for poly in me.polygons:
        if (vb['k'][corners[poly.loop_start:poly.loop_start + poly.loop_total]] == KIND_EYE).all():
            poly.material_index = 1

    # Bake the pose: run the clip to the frame, keep what it did, then let the crest rise.
    def apply(action, f):
        ad = arm.animation_data_create()
        ad.action = action
        ad.action_slot = action.slots[0]
        bpy.context.scene.frame_set(int(f), subframe=f - int(f))
        bpy.context.view_layer.update()
        out = {p.name: (p.rotation_quaternion.copy(), p.location.copy(), p.scale.copy()) for p in arm.pose.bones}
        ad.action = None
        return out

    for p in arm.pose.bones:
        p.rotation_mode = 'QUATERNION'
    pose = apply(motion, frame)
    raised = apply(fan, 0)
    for p in arm.pose.bones:
        q, l, s = pose[p.name]
        if p.name.startswith('crest_'):
            q = q.slerp(raised[p.name][0], crest)
        # The clip holds her eyes half closed, which reads as sleepy at any distance. A bone's +X turns its axis towards up,
        # so this lifts the upper lid and drops the lower one.
        if p.name.startswith('lid_u.'):
            q = q @ Quaternion((1, 0, 0), math.radians(lid_open))
        elif p.name.startswith('lid_l.'):
            q = q @ Quaternion((1, 0, 0), math.radians(-lid_open * 0.35))
        p.rotation_quaternion = q
        p.location = l
        p.scale = s
    bpy.context.view_layer.update()
    return arm, me_ob
