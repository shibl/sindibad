# Builds every mesh in the game and writes one FBX for Unity, a .blend for the key art and the sea's depth map.
#   OUT=<Assets/Art> Blender -b --factory-startup -P world.py
# Object names are Group__material. The Unity scene builder reads them to give each part its material and its place.
import bpy, json, math, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from lib import *
import dhow as D
import islands as I

OUT = os.environ['OUT']
ONLY = os.environ.get('ONLY', '')
AO = os.environ.get('AO', '1') == '1'
t0 = time.time()
bpy.ops.wm.read_factory_settings(use_empty=True)
s = bpy.context.scene

layout = {}

print('dhow', flush=True)
hull, inner, trim = D.build_hull()
emit('Hull__hull', hull, angle=50)
emit('Inner__hull', inner, angle=50)
emit('Trim__world', trim, angle=50)
mast, yard = D.build_rig()
emit('Mast__world', mast, angle=50)
emit('Yard__world', yard, pivot=(0, 0, 0), angle=60)
bpy.data.objects['Yard__world'].location = D.PIVOT
emit('Sail__sail', D.build_sail(), angle=180)
bpy.data.objects['Sail__sail'].location = D.PIVOT
emit('Pennant__flag', D.build_pennant(), angle=180)
bpy.data.objects['Pennant__flag'].location = D.MAST_TOP + np.array([0, 0, 0.0])
emit('Rudder__world', D.build_rudder(), angle=50)
stern_y = -D.L / 2 - 0.05
bpy.data.objects['Rudder__world'].location = (0, stern_y, 0)
cargo = D.build_cargo()
cargo.merge(D.build_lantern_frames())
cargo.merge(D.build_rigging())
cargo.merge(D.build_figure())
emit('Cargo__world', cargo, angle=50)
emit('Lamps__lamp', D.build_lamps(), angle=180)

print('hoopoe and fish', flush=True)
body, wl, wr, tail, crest = D.build_bird()
emit('BirdBody__world', body, angle=60)
emit('BirdWingL__wing', wl, pivot=(-0.22, 0, 0.1), angle=60)
emit('BirdWingR__wing', wr, pivot=(0.22, 0, 0.1), angle=60)
emit('BirdTail__wing', tail, pivot=(0, -0.55, 0), angle=60)
emit('BirdCrest__wing', crest, pivot=(0, 0.66, 0.3), angle=60)
emit('Fish__world', D.build_fish(), angle=60)
emit('Gull__flap', D.build_gull(), angle=60)

def out(d):
    for name, val in d.items():
        # Foliage and blossom are soft forms, with few enough points that a tighter angle would break them into facets.
        soft = name.endswith(('__leaf', '__blossom'))
        if isinstance(val, tuple):
            # These parts are modelled around their own origin, which is the point they turn about.
            emit(name, val[0]).location = val[1]
        else:
            emit(name, val, angle=75 if soft else 42)

print('beautiful', flush=True)
out(I.isle_beautiful())
print('research', flush=True)
d, lamp_at = I.isle_research()
out(d)
print('play', flush=True)
d, anchors, bell_at = I.isle_play()
out(d)
print('islets', flush=True)
out(I.islets())
print('far', flush=True)
out(I.far_isles())

tex = os.path.join(OUT, 'Textures')
os.makedirs(tex, exist_ok=True)
H = I.shore_map(os.path.join(tex, 'shore.png'))

# Everything the game needs to know about the world that's easiest to measure here.
for k in ('beautiful', 'research', 'play'):
    v = I.ISLES[k]
    layout[k] = [float(v[0]), float(v[1]), float(v[2])]
layout['lamp'] = list(map(float, lamp_at))
layout['kites'] = [float(c) for a in anchors for c in a]
layout['bell'] = list(map(float, bell_at))
layout['pivot'] = list(map(float, D.PIVOT))
layout['clew'] = list(map(float, D.CLEW))
layout['peak'] = list(map(float, D.PEAK))
layout['mastTop'] = list(map(float, D.MAST_TOP))
layout['wheel'] = list(map(float, bpy.data.objects['Wheel__world'].location))
layout['dome'] = list(map(float, bpy.data.objects['DomeL__world'].location))
json.dump(layout, open(os.path.join(OUT, 'layout.json'), 'w'), indent=1)

if AO:
    print('baking occlusion', time.time() - t0, flush=True)
    # The dhow's hull and the islands benefit most. Skip what's thin, moving or far away.
    names = ['Hull__hull', 'Inner__hull', 'Trim__world', 'Mast__world', 'Cargo__world', 'Beautiful_ground__world', 'Beautiful_trunk__world',
             'Research_ground__world', 'Research_trunk__world', 'Research_build__world', 'Play_ground__world', 'Play_trunk__world', 'Play_build__world', 'Islets_ground__world']
    bake_ao([bpy.data.objects[n] for n in names], 24, 7.0)

for o in made:
    print(o.name, o.location[:], flush=True)
tot = sum(len(o.data.polygons) for o in made)
print('polygons', tot, 'time', time.time() - t0, flush=True)
export_fbx(os.path.join(OUT, 'world.fbx'))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, '..', '..', 'blender', 'world.blend'), compress=True)
print('DONE', flush=True)
