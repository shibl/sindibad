# Exports the arch from window-frame.blend for the AR portal: the same geometry as the hero art, with ambient occlusion baked
# into its vertices so it sits solidly on a real floor.
#   OUT=public/concepts/portal/arch.dat Blender -b concepts/blender/window-frame.blend -P concepts/blender/portal/export_arch.py
# The file holds the header [vertex count, index count], then int16 positions, int8 normals, uint8 kinds, uint8 occlusion and
# uint16 indices. Kinds: 0 glaze, 1 plaster, 2 gold, 3 stone. Positions are metres * 8192 in the page's axes (x right, y up, z
# toward the viewer), at SCALE, with the origin on the floor under the middle of the arch.
import math
import os
import struct

import bmesh
import bpy
import numpy as np

OUT = os.environ['OUT']
SCALE = 0.9
SAMPLES = int(os.environ.get('SAMPLES', '96'))
KINDS = {'Glaze': 0, 'Plaster': 1, 'Gold': 2, 'Stone': 3}

dg = bpy.context.evaluated_depsgraph_get()
verts, normals, kinds, tris, seen = [], [], [], [], {}
for name in ('Arch', 'Trim', 'Plinth', 'Band'):
    ob = bpy.data.objects[name]
    ev = ob.evaluated_get(dg)
    me = ev.to_mesh()
    me.calc_loop_triangles()
    cn = me.corner_normals
    M = ob.matrix_world
    R = M.to_3x3().inverted().transposed()
    slots = [KINDS[s.material.name] for s in ev.material_slots]
    for t in me.loop_triangles:
        kind = slots[t.material_index]
        out = []
        for li in t.loops:
            v = me.loops[li].vertex_index
            p = M @ me.vertices[v].co
            n = (R @ cn[li].vector).normalized()
            key = (round(p.x, 4), round(p.y, 4), round(p.z, 4), round(n.x, 2), round(n.y, 2), round(n.z, 2), kind)
            i = seen.get(key)
            if i is None:
                i = seen[key] = len(verts)
                verts.append(tuple(p))
                normals.append(tuple(n))
                kinds.append(kind)
            out.append(i)
        tris.append(out)
    ev.to_mesh_clear()
print(f'ARCH {len(verts):,} vertices, {len(tris):,} triangles', flush=True)

# Bake occlusion onto a copy of the mesh, with a floor under it, so the plinth and the foot of the arch darken where they meet.
for o in list(bpy.data.objects):
    if o.type in ('MESH', 'CURVE', 'LIGHT', 'EMPTY'):
        bpy.data.objects.remove(o, do_unlink=True)
me = bpy.data.meshes.new('bake')
me.from_pydata(verts, [], tris)
me.update()
for p in me.polygons:
    p.use_smooth = True
ao_attr = me.color_attributes.new('ao', 'FLOAT_COLOR', 'POINT')
me.color_attributes.active_color = ao_attr
mat = bpy.data.materials.new('bake')
try:
    mat.use_nodes = True
except Exception:
    pass
me.materials.append(mat)
ob = bpy.data.objects.new('bake', me)
bpy.context.scene.collection.objects.link(ob)
fl = bpy.data.meshes.new('floor')
fl.from_pydata([(-20, -20, 0), (20, -20, 0), (20, 20, 0), (-20, 20, 0)], [], [(0, 1, 2, 3)])
fl.update()
fo = bpy.data.objects.new('floor', fl)
bpy.context.scene.collection.objects.link(fo)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.cycles.samples = SAMPLES
sc.cycles.use_denoising = False
sc.world.light_settings.distance = 1.2
sc.render.bake.target = 'VERTEX_COLORS'
sc.render.bake.margin = 0
bpy.ops.object.select_all(action='DESELECT')
ob.select_set(True)
bpy.context.view_layer.objects.active = ob
bpy.ops.object.bake(type='AO')
col = np.empty(len(verts) * 4, np.float32)
me.color_attributes['ao'].data.foreach_get('color', col)
ao = col[0::4]
print(f'AO min {ao.min():.3f} mean {ao.mean():.3f} max {ao.max():.3f}', flush=True)

P = np.array(verts, np.float32) * SCALE
P = np.stack([P[:, 0], P[:, 2], -P[:, 1]], 1)
N = np.array(normals, np.float32)
N = np.stack([N[:, 0], N[:, 2], -N[:, 1]], 1)
print('BOUNDS', P.min(0), P.max(0), flush=True)
q = np.clip(np.round(P * 8192), -32767, 32767).astype(np.int16)
n8 = np.clip(np.round(N * 127), -127, 127).astype(np.int8)
k = np.array(kinds, np.uint8)
a = np.clip(np.round(ao * 255), 0, 255).astype(np.uint8)
idx = np.array(tris, np.uint16).ravel()
blob = q.tobytes() + n8.tobytes() + k.tobytes() + a.tobytes()
blob += b'\0' * ((-len(blob)) % 2)
with open(OUT, 'wb') as f:
    f.write(struct.pack('<II', len(verts), len(idx)) + blob + idx.tobytes())
print(f'ARCH wrote {OUT}: {os.path.getsize(OUT) / 1000:.0f} KB', flush=True)
