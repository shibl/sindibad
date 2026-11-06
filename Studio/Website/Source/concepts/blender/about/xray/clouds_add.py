# Adds the VDB clouds to world.blend. Imported by build.py.
import bpy, os
def add_clouds(OUT, dens_scale=1.0):
    m = bpy.data.materials.new('cloud')
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    pv = nt.nodes.new('ShaderNodeVolumePrincipled')
    pv.inputs['Color'].default_value = (1.0, 1.0, 1.0, 1)
    pv.inputs['Density'].default_value = 0.34 * dens_scale
    pv.inputs['Anisotropy'].default_value = 0.42
    nt.links.new(pv.outputs[0], out.inputs['Volume'])
    for name, k in (('near', 1.0), ('far', 0.22), ('bank_a', 1.0), ('bank_b', 1.0), ('bank_c', 1.0), ('mist', 0.8)):
        p = os.path.join(OUT, f'cloud_{name}.vdb')
        if not os.path.exists(p):
            continue
        v = bpy.data.volumes.new(f'cloud_{name}')
        v.filepath = p
        if k == 1.0:
            v.materials.append(m)
        else:
            m2 = m.copy()
            m2.node_tree.nodes['Principled Volume'].inputs['Density'].default_value = 0.34 * dens_scale * k
            v.materials.append(m2)
        ob = bpy.data.objects.new(f'cloud_{name}', v)
        bpy.context.scene.collection.objects.link(ob)
