# Builds the world from terrain.py's output: paints the land, plants it, raises the village, adds water, materials, lights and the camera.
#   OUT=<cache dir> Blender -b --factory-startup -P build.py
# Writes OUT/world.blend, OUT/props.npz (edges for the blueprint, obstacles and points of interest for the simulator).
import bpy, json, math, os, sys, time
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from lib import *
from geo import *
from layout import *
from props import *
from mathutils import Vector
exec(open(os.path.join(HERE, 'camera.py')).read())

OUT = os.environ['OUT']
DENSITY = float(os.environ.get('DENSITY', 1.0))
T0 = time.time()
def log(*a): print(f'[{time.time() - T0:6.1f}s]', *a, flush=True)
scene = bpy.context.scene
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o)
L = np.load(os.path.join(OUT, 'land.npz'))
xs, ys = L['xs'], L['ys']
RES = float(L['RES'])
top, d, slope, pdist, bank, nav_h = L['top'], L['d'], L['slope'], L['pdist'], L['bank'], L['nav_h']
path = L['path']
pz = L['pz']
river, rz_ = L['river'], L['rz']
lake_level = float(L['lake_level'])
water_z = L['water_z']
rng = np.random.default_rng(77)

def h_at(x, y):
    return float(sample2(top, np.array([(x - xs[0]) / RES]), np.array([(y - ys[0]) / RES]))[0])
def grid_at(a, x, y):
    return sample2(a, (np.asarray(x) - xs[0]) / RES, (np.asarray(y) - ys[0]) / RES)

# ---------------------------------------------------------------- painting the land
def paint(name, gxs, gys, gtop, gd, gslope, gpd=None, gbank=None, width=None, seed=1):
    """Hand-paint the top surface in numpy: patches of jade, teal hollows, sun-bleached rises, sand along paths and water."""
    res = float(gxs[1] - gxs[0])
    sh = gtop.shape
    n1 = fbm2(sh, 34 / res, seed + 1, 4, 0.5)
    n2 = fbm2(sh, 11 / res, seed + 2, 3, 0.55)
    n3 = fbm2(sh, 3 / res, seed + 3, 2, 0.5)
    patch = smooth(-0.12, 0.2, n1 + 0.3 * n2)
    deep, jade, mint, sun = hx('#177f6f'), hx('#28a585'), hx('#67cda0'), hx('#c4e298')
    col = lerp(deep[None, None, :], jade[None, None, :], patch[..., None])
    high = smooth(0.0, 0.5, n2 + 0.5 * n1 + 0.25 * n3)
    col = lerp(col, mint[None, None, :], high[..., None] * 0.65)
    rel = (gtop - np.percentile(gtop[gd > 0], 8)) / (np.percentile(gtop[gd > 0], 98) - np.percentile(gtop[gd > 0], 8) + 1e-3)
    bleached = smooth(0.25, 0.75, rel + 0.5 * n1) * smooth(-0.2, 0.3, n2)
    col = lerp(col, sun[None, None, :], bleached[..., None] * 0.55)
    col *= (0.96 + 0.07 * n3[..., None])
    # risers of the terraces show banded warm stone through the grass
    riser = smooth(0.95, 1.45, gslope + 0.22 * n3)
    band = 0.5 + 0.5 * np.sin(gtop * 2.1 + 2.0 * n2)
    stone = lerp(hx('#c3906c')[None, None, :], hx('#ecc79f')[None, None, :], band[..., None])
    col = lerp(col, stone, riser[..., None])
    # dry, wind-cropped edge along the rim
    rim = smooth(4.0, 0.5, gd + 2.0 * n2)
    col = lerp(col, hx('#a9c67e')[None, None, :], rim[..., None] * 0.5)
    if gbank is not None:
        lush = smooth(10, 1, gbank + 2 * n2)
        col = lerp(col, hx('#0b6a60')[None, None, :], lush[..., None] * 0.55)
        shore = smooth(1.9, 0.5, gbank + 0.7 * n3)
        col = lerp(col, hx('#f2dcb0')[None, None, :], shore[..., None])
        wet = smooth(0.3, -0.8, gbank)
        col = lerp(col, hx('#3fb8a8')[None, None, :], wet[..., None])
    if gpd is not None:
        edge = PATH_W * 0.95 + 0.9 * n3 + 0.4 * n2
        k = smooth(edge + 0.8, edge - 0.4, gpd)
        pathc = lerp(hx('#ecd2a3'), hx('#dbb985'), np.clip(0.5 + 0.8 * n3, 0, 1)[..., None])
        col = lerp(col, pathc, k[..., None])
    out = np.concatenate([col, np.ones((*sh, 1), np.float32)], 2).astype(np.float32)
    if width and width != sh[1]:
        pass
    im = bpy.data.images.new(f'land_{name}', sh[1], sh[0], alpha=True, float_buffer=True)
    im.colorspace_settings.name = 'Linear Rec.709'
    im.pixels.foreach_set(out.ravel())
    p = os.path.join(OUT, f'land_{name}.exr')
    im.filepath_raw = p
    im.file_format = 'OPEN_EXR'
    im.save()
    im.pack()
    return im

# ---------------------------------------------------------------- materials
def new_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    return m, nt, nt.nodes.new('ShaderNodeOutputMaterial')

def node(nt, kind, **kw):
    n = nt.nodes.new(kind)
    for k, v in kw.items():
        if hasattr(n, k) and k not in ('inputs', 'outputs'):
            setattr(n, k, v)
        else:
            n.inputs[k.replace('_', ' ')].default_value = v
    return n

def math_(nt, op, a, b=None, clamp=False):
    n = nt.nodes.new('ShaderNodeMath')
    n.operation = op
    n.use_clamp = clamp
    for i, v in enumerate((a, b)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            n.inputs[i].default_value = v
        else:
            nt.links.new(v, n.inputs[i])
    return n.outputs[0]

def sstep(nt, a, b, x):
    n = nt.nodes.new('ShaderNodeMapRange')
    n.interpolation_type = 'SMOOTHSTEP'
    n.inputs['From Min'].default_value = a
    n.inputs['From Max'].default_value = b
    nt.links.new(x, n.inputs['Value'])
    return n.outputs[0]

def mixc(nt, f, a, b):
    n = nt.nodes.new('ShaderNodeMix')
    n.data_type = 'RGBA'
    n.blend_type = 'MIX'
    if isinstance(f, (int, float)):
        n.inputs['Factor'].default_value = f
    else:
        nt.links.new(f, n.inputs['Factor'])
    for slot, v in ((6, a), (7, b)):
        if isinstance(v, (tuple, list, np.ndarray)):
            n.inputs[slot].default_value = (float(v[0]), float(v[1]), float(v[2]), 1)
        else:
            nt.links.new(v, n.inputs[slot])
    return n.outputs[2]

def strata_lut():
    """The rock's colours by height: warm sandstone bands on top, cooling through dusky teal into deep ink at the bottom."""
    n = 2048
    r = np.random.default_rng(9)
    u = np.linspace(0, 1, n)
    warm = [hx('#f2cda4'), hx('#dc9a72'), hx('#c67a5c'), hx('#ecbb94'), hx('#a9654f'), hx('#d3926f'), hx('#f7dcb6')]
    cols = np.zeros((n, 3), np.float32)
    i = 0
    while i < n:
        t = int(r.uniform(14, 62))
        cols[i:i + t] = warm[r.integers(len(warm))]
        i += t
    # soften band edges a touch
    k = np.hanning(9)
    k /= k.sum()
    for c in range(3):
        cols[:, c] = np.convolve(np.pad(cols[:, c], 4, mode='edge'), k, 'valid')
    # u runs along height: the rim is at u = 0.81, and every 21 units down is 0.1. Warm by the turf, teal by mid-cliff, ink in the depths.
    cool = hx('#2f8f8c')
    ink = hx('#0a4f52')
    a = smooth(0.78, 0.52, u)[:, None]
    b = smooth(0.54, 0.2, u)[:, None]
    cols = lerp(lerp(cols, cool, a * 0.94), ink, b)
    im = bpy.data.images.new('strata', n, 1, alpha=True, float_buffer=True)
    im.colorspace_settings.name = 'Linear Rec.709'
    px = np.ones((n, 4), np.float32)
    px[:, :3] = cols
    im.pixels.foreach_set(px.ravel())
    im.pack()
    return im
STRATA = strata_lut()

def ground_material(name, img, box_, zr):
    """Painted turf on top, stacked sandstone below, moss on the shelves, lit edges and dark cracks."""
    m, nt, out = new_mat(name)
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    sep = node(nt, 'ShaderNodeSeparateXYZ')
    nt.links.new(geo.outputs['Position'], sep.inputs[0])
    # the painted map
    ux = math_(nt, 'DIVIDE', math_(nt, 'SUBTRACT', sep.outputs[0], box_[0]), box_[1] - box_[0])
    uy = math_(nt, 'DIVIDE', math_(nt, 'SUBTRACT', sep.outputs[1], box_[2]), box_[3] - box_[2])
    cuv = node(nt, 'ShaderNodeCombineXYZ')
    nt.links.new(ux, cuv.inputs[0])
    nt.links.new(uy, cuv.inputs[1])
    tex = node(nt, 'ShaderNodeTexImage')
    tex.image = img
    tex.extension = 'EXTEND'
    nt.links.new(cuv.outputs[0], tex.inputs[0])
    # data from the volume
    at = node(nt, 'ShaderNodeAttribute')
    at.attribute_name = 'ld'
    asep = node(nt, 'ShaderNodeSeparateXYZ')
    nt.links.new(at.outputs['Vector'], asep.inputs[0])
    tz = asep.outputs[0]
    cav = asep.outputs[1]
    # noise
    ntex = node(nt, 'ShaderNodeTexNoise', noise_dimensions='3D')
    ntex.inputs['Scale'].default_value = 0.42
    ntex.inputs['Detail'].default_value = 5
    ntex.inputs['Roughness'].default_value = 0.55
    nt.links.new(geo.outputs['Position'], ntex.inputs['Vector'])
    nf = ntex.outputs['Fac']
    # strata LUT, wobbling
    zn = math_(nt, 'DIVIDE', math_(nt, 'SUBTRACT', math_(nt, 'ADD', sep.outputs[2], math_(nt, 'MULTIPLY', math_(nt, 'SUBTRACT', nf, 0.5), 2.6)), zr[0]), zr[1] - zr[0])
    cz = node(nt, 'ShaderNodeCombineXYZ')
    nt.links.new(zn, cz.inputs[0])
    cz.inputs[1].default_value = 0.5
    lut = node(nt, 'ShaderNodeTexImage')
    lut.image = STRATA
    lut.extension = 'EXTEND'
    nt.links.new(cz.outputs[0], lut.inputs[0])
    rock = lut.outputs[0]
    # cracks and worn edges
    rock = mixc(nt, sstep(nt, 0.0, 0.9, math_(nt, 'MULTIPLY', cav, 1.0)), rock, (0.06, 0.2, 0.2))
    rock = mixc(nt, math_(nt, 'MULTIPLY', sstep(nt, 0.0, -1.0, cav), 0.4), rock, (1.0, 0.82, 0.62))
    # moss on rock that faces up
    nz = node(nt, 'ShaderNodeSeparateXYZ')
    nt.links.new(geo.outputs['Normal'], nz.inputs[0])
    mossf = sstep(nt, 0.86, 1.02, math_(nt, 'ADD', nz.outputs[2], math_(nt, 'MULTIPLY', math_(nt, 'SUBTRACT', nf, 0.5), 0.5)))
    rock = mixc(nt, math_(nt, 'MULTIPLY', mossf, 0.42), rock, hx('#35a184'))
    # turf to rock, breaking along the lip
    fine = node(nt, 'ShaderNodeTexNoise', noise_dimensions='3D')
    fine.inputs['Scale'].default_value = 1.15
    fine.inputs['Detail'].default_value = 4
    nt.links.new(geo.outputs['Position'], fine.inputs['Vector'])
    edge = math_(nt, 'ADD', tz, math_(nt, 'MULTIPLY', math_(nt, 'SUBTRACT', fine.outputs['Fac'], 0.5), 2.0))
    isrock = sstep(nt, 0.55, 1.3, edge)
    # anything steep is rock too, wherever it is: a map painted from above would only smear down a riser
    steep = sstep(nt, 0.74, 0.5, math_(nt, 'ADD', nz.outputs[2], math_(nt, 'MULTIPLY', math_(nt, 'SUBTRACT', fine.outputs['Fac'], 0.5), 0.3)))
    isrock = math_(nt, 'MAXIMUM', isrock, steep)
    colr = mixc(nt, isrock, tex.outputs[0], rock)
    # a fine painterly grain over everything
    g2 = node(nt, 'ShaderNodeTexNoise', noise_dimensions='3D')
    g2.inputs['Scale'].default_value = 5.5
    g2.inputs['Detail'].default_value = 3
    nt.links.new(geo.outputs['Position'], g2.inputs['Vector'])
    gm = node(nt, 'ShaderNodeMapRange')
    gm.inputs['From Min'].default_value = 0.3
    gm.inputs['From Max'].default_value = 0.7
    gm.inputs['To Min'].default_value = 0.86
    gm.inputs['To Max'].default_value = 1.1
    nt.links.new(g2.outputs['Fac'], gm.inputs['Value'])
    mul = node(nt, 'ShaderNodeVectorMath')
    mul.operation = 'SCALE'
    nt.links.new(colr, mul.inputs[0])
    nt.links.new(gm.outputs[0], mul.inputs['Scale'])
    b = node(nt, 'ShaderNodeBsdfPrincipled')
    nt.links.new(mul.outputs[0], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.82
    b.inputs['Specular IOR Level'].default_value = 0.3
    # bump: turf is soft and fine, rock is craggy
    bfine = math_(nt, 'MULTIPLY', g2.outputs['Fac'], 0.12)
    brock = math_(nt, 'MULTIPLY', fine.outputs['Fac'], 1.0)
    bh = math_(nt, 'ADD', bfine, math_(nt, 'MULTIPLY', brock, isrock))
    bump = node(nt, 'ShaderNodeBump')
    bump.inputs['Distance'].default_value = 0.3
    bump.inputs['Strength'].default_value = 0.75
    nt.links.new(bh, bump.inputs['Height'])
    nt.links.new(bump.outputs[0], b.inputs['Normal'])
    nt.links.new(b.outputs[0], out.inputs[0])
    return m

def col_material(name, rough=0.8, spec=0.3, translucent=0.0, emit=0.0, bump=0.0, bump_scale=8.0, sheen=0.0):
    m, nt, out = new_mat(name)
    at = node(nt, 'ShaderNodeVertexColor')
    at.layer_name = 'col'
    b = node(nt, 'ShaderNodeBsdfPrincipled')
    c = at.outputs['Color']
    nt.links.new(c, b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = rough
    b.inputs['Specular IOR Level'].default_value = spec
    if bump > 0:
        geo = nt.nodes.new('ShaderNodeNewGeometry')
        n = node(nt, 'ShaderNodeTexNoise', noise_dimensions='3D')
        n.inputs['Scale'].default_value = bump_scale
        n.inputs['Detail'].default_value = 3
        nt.links.new(geo.outputs['Position'], n.inputs['Vector'])
        bu = node(nt, 'ShaderNodeBump')
        bu.inputs['Distance'].default_value = bump
        nt.links.new(n.outputs['Fac'], bu.inputs['Height'])
        nt.links.new(bu.outputs[0], b.inputs['Normal'])
    last = b.outputs[0]
    if translucent > 0:
        tr = node(nt, 'ShaderNodeBsdfTranslucent')
        nt.links.new(c, tr.inputs['Color'])
        mix = node(nt, 'ShaderNodeMixShader')
        mix.inputs[0].default_value = translucent
        nt.links.new(last, mix.inputs[1])
        nt.links.new(tr.outputs[0], mix.inputs[2])
        last = mix.outputs[0]
    if emit > 0:
        b.inputs['Emission Strength'].default_value = emit
        nt.links.new(c, b.inputs['Emission Color'])
    nt.links.new(last, out.inputs[0])
    return m

M = dict(
    plaster=col_material('plaster', 0.72, 0.25, bump=0.03, bump_scale=9),
    wood=col_material('wood', 0.75, 0.2),
    dark=col_material('dark', 0.9, 0.1),
    lit=col_material('lit', 0.5, 0.2, emit=2.4),
    tile=col_material('tile', 0.32, 0.55),
    cloth=col_material('cloth', 0.75, 0.2, translucent=0.3),
    hull=col_material('hull', 0.5, 0.35),
    sail=col_material('sail', 0.85, 0.15, translucent=0.42),
    stone=col_material('stone', 0.85, 0.2, bump=0.08, bump_scale=3),
    leaf=col_material('leaf', 0.62, 0.3, translucent=0.2, bump=0.32, bump_scale=1.8),
    frond=col_material('frond', 0.5, 0.35, translucent=0.34),
    tuft=col_material('tuft', 0.7, 0.2, translucent=0.2),
    boulder=col_material('boulder', 0.9, 0.2, bump=0.1, bump_scale=2.5),
)
G = {k: Geo() for k in M}

# ---------------------------------------------------------------- the land's meshes
def land_mesh(name, gxs, gys, gtop, gd, gslope, gpd=None, gbank=None, seed=1):
    data = np.load(os.path.join(OUT, f'mesh_{name}.npz'))
    v, q = data['verts'], data['quads']
    rim_level = float(np.median(gtop[(gd > 0.5) & (gd < 4)]))
    zr = (rim_level - 170.0, rim_level + 40.0)
    img = paint(name, gxs, gys, gtop, gd, gslope, gpd, gbank, seed=seed)
    res = float(gxs[1] - gxs[0])
    box_ = (float(gxs[0]) - res / 2, float(gxs[-1]) + res / 2, float(gys[0]) - res / 2, float(gys[-1]) + res / 2)
    m = ground_material(f'ground_{name}', img, box_, zr)
    ld = np.stack([data['tz'], data['cav'], np.zeros(len(v), np.float32), np.ones(len(v), np.float32)], 1)
    return mesh_new(bpy, f'land_{name}', v, q, attrs={'ld': ld}, material=m)

land_mesh('main', xs, ys, top, d, slope, pdist, bank, seed=500)
for i, isl in enumerate(ISLANDS):
    t = np.load(os.path.join(OUT, f'top_{isl["name"]}.npz'))
    land_mesh(isl['name'], t['xs'], t['ys'], t['top'], t['d'], t['slope'], seed=510 + i * 7)
log('land')

# ---------------------------------------------------------------- water
def water_material():
    m, nt, out = new_mat('water')
    at = node(nt, 'ShaderNodeAttribute')
    at.attribute_name = 'wd'
    sep = node(nt, 'ShaderNodeSeparateXYZ')
    nt.links.new(at.outputs['Vector'], sep.inputs[0])
    shore = sep.outputs[0]
    deep = sstep(nt, 0.0, 5.0, shore)
    c = mixc(nt, deep, hx('#5fe0c8'), hx('#0a8f92'))
    foam = sstep(nt, 0.55, 0.0, shore)
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    n = node(nt, 'ShaderNodeTexNoise', noise_dimensions='3D')
    n.inputs['Scale'].default_value = 1.2
    n.inputs['Detail'].default_value = 3
    nt.links.new(geo.outputs['Position'], n.inputs['Vector'])
    c = mixc(nt, math_(nt, 'MULTIPLY', foam, sstep(nt, 0.3, 0.6, n.outputs['Fac'])), c, (1, 1, 1))
    b = node(nt, 'ShaderNodeBsdfPrincipled')
    nt.links.new(c, b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.1
    b.inputs['Specular IOR Level'].default_value = 0.6
    bu = node(nt, 'ShaderNodeBump')
    bu.inputs['Distance'].default_value = 0.05
    bu.inputs['Strength'].default_value = 0.5
    nt.links.new(n.outputs['Fac'], bu.inputs['Height'])
    nt.links.new(bu.outputs[0], b.inputs['Normal'])
    nt.links.new(b.outputs[0], out.inputs[0])
    return m

wm = (bank < 1.0) & (d > 0.9)
sub = max(1, int(round(0.5 / RES)))
wgrid = wm[::sub, ::sub]
wz = water_z[::sub, ::sub]
bk = np.maximum(-bank[::sub, ::sub], 0)
idx = -np.ones(wgrid.shape, np.int32)
cells = wgrid[:-1, :-1] | wgrid[1:, :-1] | wgrid[:-1, 1:] | wgrid[1:, 1:]
need = np.zeros(wgrid.shape, bool)
ii, jj = np.nonzero(cells)
need[ii, jj] = need[ii + 1, jj] = need[ii, jj + 1] = need[ii + 1, jj + 1] = True
idx[need] = np.arange(need.sum())
gx, gy = np.meshgrid(xs[::sub], ys[::sub])
wv = np.stack([gx[need], gy[need], blur(wz, 2)[need]], 1).astype(np.float32)
wq = np.stack([idx[ii, jj], idx[ii, jj + 1], idx[ii + 1, jj + 1], idx[ii + 1, jj]], 1)
wa = np.stack([bk[need], np.zeros(need.sum()), np.zeros(need.sum()), np.ones(need.sum())], 1).astype(np.float32)
mesh_new(bpy, 'water', wv, wq, attrs={'wd': wa}, material=water_material())
log('water', len(wv))

# ---------------------------------------------------------------- the waterfall: ribbons that pour off the lip and thin out into mist
def fall_material():
    m, nt, out = new_mat('fall')
    tc = node(nt, 'ShaderNodeAttribute')
    tc.attribute_name = 'uvw'
    sep = node(nt, 'ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Vector'], sep.inputs[0])
    u, v, w = sep.outputs[0], sep.outputs[1], sep.outputs[2]
    # streaks run down the water: noise stretched hard along the fall
    cc = node(nt, 'ShaderNodeCombineXYZ')
    nt.links.new(math_(nt, 'ADD', math_(nt, 'MULTIPLY', u, 7.0), math_(nt, 'MULTIPLY', w, 13.0)), cc.inputs[0])
    nt.links.new(math_(nt, 'MULTIPLY', v, 2.4), cc.inputs[1])
    nt.links.new(w, cc.inputs[2])
    streak = node(nt, 'ShaderNodeTexNoise', noise_dimensions='3D')
    streak.inputs['Scale'].default_value = 2.6
    streak.inputs['Detail'].default_value = 7
    streak.inputs['Roughness'].default_value = 0.62
    nt.links.new(cc.outputs[0], streak.inputs['Vector'])
    across = math_(nt, 'MINIMUM', u, math_(nt, 'SUBTRACT', 1.0, u))
    edge = sstep(nt, 0.0, 0.34, math_(nt, 'ADD', across, math_(nt, 'MULTIPLY', math_(nt, 'SUBTRACT', streak.outputs['Fac'], 0.5), 0.5)))
    fade = sstep(nt, 0.95, 0.28, v)
    body = sstep(nt, 0.3, 0.6, math_(nt, 'ADD', streak.outputs['Fac'], math_(nt, 'MULTIPLY', sstep(nt, 0.0, 0.2, v), -0.02)))
    alpha = math_(nt, 'MULTIPLY', math_(nt, 'MULTIPLY', edge, fade), body)
    wh = node(nt, 'ShaderNodeBsdfPrincipled')
    wh.inputs['Base Color'].default_value = (0.97, 1.0, 1.0, 1)
    wh.inputs['Roughness'].default_value = 0.45
    wh.inputs['Emission Color'].default_value = (0.72, 0.95, 0.95, 1)
    wh.inputs['Emission Strength'].default_value = 0.34
    tr = node(nt, 'ShaderNodeBsdfTransparent')
    mix = node(nt, 'ShaderNodeMixShader')
    nt.links.new(alpha, mix.inputs[0])
    nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(wh.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])
    return m

FALLM = fall_material()
def waterfall(name, start, tangent, width, length, seed, strands=7):
    r = np.random.default_rng(seed)
    tangent = np.array(tangent, np.float32)
    side = np.array([-tangent[1], tangent[0], 0], np.float32)
    all_v, all_f, all_a = [], [], []
    base = 0
    for s in range(strands):
        off = (s + 0.5) / strands - 0.5
        w = width / strands * r.uniform(1.5, 2.6)
        seg = 44
        out0 = r.uniform(3.2, 6.0)
        L_ = length * r.uniform(0.72, 1.08)
        wob = r.uniform(0, 6.28)
        rows = []
        for i in range(seg + 1):
            t = i / seg
            z = -L_ * t ** 1.42
            forward = out0 * (1 - np.exp(-t * 11.0)) + t * 2.4
            p = np.array(start, np.float32) + side * (off * width * (1 + t * 0.34) + np.sin(t * 8 + wob) * 0.34 * t) + tangent * forward + np.array([0, 0, z], np.float32)
            ww = w * (0.72 + 1.15 * t)
            rows.append((p - side * ww / 2, p + side * ww / 2, t))
        for a, b, t in rows:
            all_v += [a, b]
            all_a += [(0, t, s * 0.37, 1), (1, t, s * 0.37, 1)]
        for i in range(seg):
            all_f.append((base + 2 * i, base + 2 * i + 1, base + 2 * i + 3, base + 2 * i + 2))
        base += 2 * (seg + 1)
    mesh_new(bpy, name, np.array(all_v, np.float32), np.array(all_f, np.int32), attrs={'uvw': np.array(all_a, np.float32)}, material=FALLM)
    return np.array(all_v, np.float32)

# find where the river leaves the land
ri = int(np.nonzero(grid_at(d, river[:, 0], river[:, 1]) > 0.5)[0].max()) + 1
ri = min(ri, len(river) - 1)
fall_at = np.array([river[ri, 0], river[ri, 1], float(grid_at(water_z, river[ri:ri + 1, 0], river[ri:ri + 1, 1])[0])], np.float32)
fall_dir = river[min(ri + 2, len(river) - 1), :2] - river[ri - 6, :2]
fall_dir = fall_dir / np.linalg.norm(fall_dir)
fall_verts = waterfall('fall', fall_at - (0, 0, 0.1), (fall_dir[0], fall_dir[1], 0), 6.2, 112.0, 7)
for k_, (fx0, wd_, ln_) in enumerate(SMALL_FALLS):
    # a spring seeping out of the cliff, a little way below the lip
    gi = int(np.argmin(np.abs(xs - fx0)))
    col = d[:, gi]
    ji = int(np.nonzero(col > 0.6)[0].min())
    y0_ = ys[ji]
    z0_ = float(top[ji, gi]) - 2.0
    fall_verts = np.concatenate([fall_verts, waterfall(f'fall_{k_}', (fx0, y0_ - 0.6, z0_), (0, -1, 0), wd_, ln_, 30 + k_, strands=3)])
log('waterfall', fall_at)

# ---------------------------------------------------------------- the village
obst = np.zeros(top.shape, bool)
def block(x, y, w, dd, rot, grow=0.35):
    X, Y = np.meshgrid(xs, ys)
    cx, cy = int((x - xs[0]) / RES), int((y - ys[0]) / RES)
    R = int(max(w, dd) / RES) + 3
    y0, y1, x0, x1 = max(cy - R, 0), cy + R, max(cx - R, 0), cx + R
    gx_, gy_ = xs[x0:x1][None, :] - x, ys[y0:y1][:, None] - y
    c, s = np.cos(-rot), np.sin(-rot)
    lx, ly = gx_ * c - gy_ * s, gx_ * s + gy_ * c
    obst[y0:y1, x0:x1] |= (np.abs(lx) < w / 2 + grow) & (np.abs(ly) < dd / 2 + grow)

def flat_for(x, y, r):
    return float(np.median(grid_at(top, x + r * np.cos(np.linspace(0, 6.28, 9)), y + r * np.sin(np.linspace(0, 6.28, 9)))))

vr = np.random.default_rng(11)
vx, vy = VILLAGE
placed = []
# a little planned street pattern: rows that step around the path
slots = [(-14, 6, 0.1, 8.5, 6.5, 5.5), (-5, 9, -0.05, 7, 7, 7.0), (4, 11, 0.06, 8, 6, 5.0), (13, 7, -0.1, 7, 6.5, 6.5),
         (-13, -6.5, 0.08, 6.5, 6, 4.4), (-20, 1, 0.14, 6, 6, 5.0), (11, -9.5, -0.12, 7, 6, 4.8), (20, -3, -0.16, 6.5, 6.5, 5.8),
         (-3, 18, 0.05, 9, 7, 8.0), (9, 20, -0.08, 7, 6.5, 6.0), (-13, 16, 0.12, 7.5, 6.5, 6.5), (19, 14, -0.2, 7, 6, 5.2),
         (-23, 12, 0.22, 6.5, 6, 4.6), (2, 27, 0.02, 8, 6.5, 6.8)]
special = {2: dict(dome=True), 8: dict(wind=True, storey=True), 1: dict(wind=True), 5: dict(awn=True), 3: dict(storey=True, awn=True),
           6: dict(awn=True), 9: dict(dome=True), 10: dict(wind=True), 7: dict(wind=True), 4: dict(awn=True), 12: dict(storey=True)}
for i, (ox, oy, rot, w, dp, h) in enumerate(slots):
    x, y = vx + ox, vy + oy
    if pdist[int((y - ys[0]) / RES), int((x - xs[0]) / RES)] < PATH_W + 1:
        y += 3 if oy > 0 else -3
    z = flat_for(x, y, max(w, dp) * 0.5)
    # terrace the ground under each house: it sits on a plinth instead of floating
    house(G, x, y, z, w, dp, h, rot, vr, **special.get(i, {}))
    block(x, y, w, dp, rot)
    placed.append((x, y, w, dp, rot, z, h))
round_tower(G, vx + 24, vy + 24, flat_for(vx + 24, vy + 24, 3.5), 3.6, 13.5, vr)
block(vx + 24, vy + 24, 7.5, 7.5, 0)
round_tower(G, vx - 27, vy - 9, flat_for(vx - 27, vy - 9, 3), 2.8, 9.5, vr)
block(vx - 27, vy - 9, 6, 6, 0)
log('village', len(placed))

# ---------------------------------------------------------------- the dock, the boat, the bridge, the flag
dz = h_at(DOCK[0] + 11, DOCK[1] + 2) + 0.3
pier(G, (DOCK[0] + 12, DOCK[1] + 2), (DOCK[0] - 9, DOCK[1] - 0.5), dz)
dhow(G, DOCK[0] - 9, DOCK[1] + 8, dz - 1.0, math.radians(190), 0.86, sail_col=PINK)
for (px, py) in ((DOCK[0] + 7, DOCK[1] + 4.5), (DOCK[0] + 4, DOCK[1] - 2.5)):
    pass
# bridge
i_b = int(L['bridge_i'])
p0, p1 = path[max(i_b - 28, 0)], path[min(i_b + 28, len(path) - 1)]
deck = float(L['deck_z'])
bd = (p1 - p0) / np.linalg.norm(p1 - p0)
bn = np.array([-bd[1], bd[0]], np.float32)
span = np.linalg.norm(p1 - p0)
seg = 18
for i in range(seg):
    t = (i + 0.5) / seg
    q = p0 + (p1 - p0) * t
    zdeck = deck + 0.9 + 1.6 * math.sin(math.pi * t)
    ang = math.atan2(bd[1], bd[0])
    col = STONE * (0.92 + 0.18 * (i % 3) / 3)
    box(G['stone'], (q[0], q[1], zdeck - 0.55), (span / seg + 0.05, 5.0, 1.1), ang, col, wire=i % 3 == 0)
    for s in (-1, 1):
        r_ = q + bn * s * 2.6
        box(G['stone'], (r_[0], r_[1], zdeck + 0.42), (span / seg + 0.02, 0.5, 0.95), ang, col * 1.05, wire=i % 3 == 0)
    # the arch's solid spandrels, thick at the ends and thin over the river
    thick = 0.8 + 3.8 * abs(2 * t - 1) ** 2.2
    box(G['stone'], (q[0], q[1], zdeck - 1.1 - thick / 2), (span / seg + 0.05, 4.6, thick), ang, col * 0.9, wire=False)
fz = h_at(*FLAG)
goal_flag(G, FLAG[0], FLAG[1], fz + 0.2)
block(FLAG[0], FLAG[1], 2.4, 2.4, 0, 0.1)
# little watch-post on the far hill and the lighthouse on its own island
t_l = np.load(os.path.join(OUT, 'top_light.npz'))
lx, ly = ISLANDS[0]['pads'][0][0]
lz = float(sample2(t_l['top'], np.array([(lx - t_l['xs'][0]) / (t_l['xs'][1] - t_l['xs'][0])]), np.array([(ly - t_l['ys'][0]) / (t_l['ys'][1] - t_l['ys'][0])]))[0])
lighthouse(G, lx, ly, lz)
for k, (ox, oy, w_, dp_, h_) in enumerate(((10, -6, 7, 6, 4.8), (-9, -7, 6, 5.5, 4.0))):
    house(G, lx + ox, ly + oy, lz - 0.2, w_, dp_, h_, 0.15 * k, vr)
t_f = np.load(os.path.join(OUT, 'top_fort.npz'))
fx, fy = ISLANDS[1]['pads'][0][0]
fz2 = float(sample2(t_f['top'], np.array([(fx - t_f['xs'][0]) / (t_f['xs'][1] - t_f['xs'][0])]), np.array([(fy - t_f['ys'][0]) / (t_f['ys'][1] - t_f['ys'][0])]))[0])
round_tower(G, fx - 8, fy - 6, fz2 - 0.4, 4.2, 15, vr)
round_tower(G, fx + 9, fy - 5, fz2 - 0.4, 3.6, 12, vr)
house(G, fx, fy + 3, fz2 - 0.4, 14, 10, 8.5, 0, vr, wind=True, dome=True)
log('props')

# ---------------------------------------------------------------- planting
LEAF = {
    'jade': (hx('#2bb18e'), hx('#07504c')),
    'teal': (hx('#1a9c8f'), hx('#053f42')),
    'mint': (hx('#61c99a'), hx('#0c6a5d')),
    'olive': (hx('#9cc873'), hx('#1c6b50')),
    'pink': (hx('#ff5a8e'), hx('#8e1752')),
}
FROND = (hx('#2db27f'), hx('#07594e'))
CYPRESS = (hx('#14857a'), hx('#043a3d'))
sh = top.shape
n_forest = fbm2(sh, 38 / RES, 600, 3, 0.45)
clear = (pdist > PATH_W + 2.2) & (bank > 4.5) & (d > 5.5) & (slope < 0.8) & (~obst)
# no trees on the village pad, and keep the lake's front and the goal clear
X, Y = np.meshgrid(xs, ys)
vill = np.sqrt((X - vx) ** 2 + (Y - vy - 6) ** 2) > 31
goal = np.sqrt((X - FLAG[0]) ** 2 + (Y - FLAG[1]) ** 2) > 13
lakeview = np.sqrt((X - 30) ** 2 + (Y + 6) ** 2) > 30
frontv = ~((Y < vy - 2) & (X > vx - 34) & (X < vx + 34))
forest_mask = clear & (n_forest > 0.1) & vill & goal & lakeview & frontv
step_grid = 0.5
scale = lerp(1.0, 1.25, smooth(-0.1, 0.5, n_forest))
pts = poisson(forest_mask[::2, ::2], 4.4 / RES / 2 / DENSITY ** 0.5, 601, max_points=int(1400 * DENSITY))
tr = np.random.default_rng(602)
n_ghaf = 0
trunks = []
for (px, py) in pts:
    x, y = xs[0] + px * 2 * RES, ys[0] + py * 2 * RES
    z = h_at(x, y)
    kind = tr.random()
    s = tr.uniform(0.8, 1.22) * 0.66
    col = tr.random()
    if kind < 0.12 and slope[int(py * 2), int(px * 2)] < 0.5:
        cypress(G, x, y, z, s, tr, CYPRESS)
    else:
        pal = LEAF['teal'] if col < 0.36 else (LEAF['jade'] if col < 0.76 else (LEAF['mint'] if col < 0.97 else LEAF['pink']))
        ghaf(G, x, y, z, s, tr, pal)
    trunks.append((x, y))
    n_ghaf += 1
log('trees', n_ghaf)
# pink trees and palms around the village, by hand
for (ox, oy, s) in ((-30, 8, 0.8), (27, 3, 0.7), (-9, -15, 0.62), (30, 16, 0.75), (15, 33, 0.8)):
    x, y = vx + ox, vy + oy
    ghaf(G, x, y, h_at(x, y), s, tr, LEAF['pink'])
palm_clear = (pdist > PATH_W + 1.4) & (bank > 1.4) & (d > 2.6) & (slope < 0.8) & (~obst)
palm_mask = palm_clear & (((bank > 1.4) & (bank < 5) & (X > 12)) | ((np.sqrt((X - vx) ** 2 + (Y - vy - 10) ** 2) < 40) & (np.sqrt((X - vx) ** 2 + (Y - vy - 10) ** 2) > 27) & (Y > vy - 6)) | (np.sqrt((X - DOCK[0] - 12) ** 2 + (Y - DOCK[1]) ** 2) < 9))
palm_pts = poisson(palm_mask[::2, ::2], 7.5 / RES / 2, 610, max_points=int(60 * DENSITY))
for (px, py) in palm_pts:
    x, y = xs[0] + px * 2 * RES, ys[0] + py * 2 * RES
    palm(G, x, y, h_at(x, y), tr.uniform(0.62, 0.92), tr, FROND)
    trunks.append((x, y))
log('palms', len(palm_pts))
# bushes hug the terrace edges, the woods and the path
# (they keep to the woods' edges: the open meadow stays open, for the eye and for the players)
bush_mask = (bank > 1.0) & (d > 2.0) & (pdist > PATH_W + 0.6) & (~obst) & (slope < 1.0)
bpts = poisson(bush_mask[::2, ::2], 3.6 / RES / 2 / DENSITY ** 0.5, 620, max_points=int(1800 * DENSITY))
for (px, py) in bpts:
    nfv = n_forest[int(py * 2), int(px * 2)]
    if nfv < 0.1:
        continue
    x, y = xs[0] + px * 2 * RES, ys[0] + py * 2 * RES
    if tr.random() < 0.4:
        continue
    pal = LEAF['olive'] if tr.random() < 0.34 else (LEAF['mint'] if tr.random() < 0.5 else LEAF['jade'])
    if tr.random() < 0.05:
        pal = LEAF['pink']
    bush(G, x, y, h_at(x, y), tr.uniform(0.5, 1.05), tr, pal)
log('bushes', len(bpts))
# boulders along the path and the river
bo_mask = (((pdist > PATH_W + 0.4) & (pdist < PATH_W + 3)) | ((bank > 0.2) & (bank < 2.5))) & (~obst) & (d > 1.5)
bo = poisson(bo_mask[::2, ::2], 9 / RES / 2, 630, max_points=int(260 * DENSITY))
for (px, py) in bo:
    x, y = xs[0] + px * 2 * RES, ys[0] + py * 2 * RES
    boulder(G, x, y, h_at(x, y), tr.uniform(0.35, 1.0), tr, hx('#c9ab8e') * tr.uniform(0.8, 1.1))
# grass and flowers
tf_mask = (bank > 0.8) & (d > 0.6) & (pdist > PATH_W - 0.1) & (~obst) & (slope < 0.9)
tp = poisson(tf_mask[::2, ::2], 1.15 / RES / 2 / DENSITY ** 0.5, 640, max_points=int(26000 * DENSITY))
for (px, py) in tp:
    x, y = xs[0] + px * 2 * RES, ys[0] + py * 2 * RES
    z = h_at(x, y)
    c = tr.random()
    if c < 0.86:
        tuft(G, x, y, z, tr.uniform(0.55, 1.05), tr, hx('#46b98c') if tr.random() < 0.7 else hx('#a2d27f'))
    elif c < 0.93:
        flower(G, x, y, z, tr.uniform(0.2, 0.32), hx('#fff4df'))
    elif c < 0.975:
        flower(G, x, y, z, tr.uniform(0.2, 0.32), hx('#ff5f92'))
    else:
        flower(G, x, y, z, tr.uniform(0.2, 0.3), hx('#ffd35a'))
log('tufts', len(tp))

# planting on the other islands
for isl in ISLANDS:
    t = np.load(os.path.join(OUT, f'top_{isl["name"]}.npz'))
    res = float(t['xs'][1] - t['xs'][0])
    sl = t['slope']
    m_ = (t['d'] > 2.2) & (sl < 0.8)
    if isl.get('pads'):
        for (cx, cy), rad, _ in isl['pads']:
            xx, yy = np.meshgrid(t['xs'], t['ys'])
            m_ &= np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) > rad * 1.8
    small = isl['name'] in ('step_a', 'step_b', 'step_c', 'near_rock')
    n_isl = fbm2(sh_ := t['top'].shape, 26 / res, isl['seed'] + 8, 2, 0.4)
    if not small:
        m_ &= n_isl > -0.04
    pp = poisson(m_, (9.0 if small else 5.6) / res, isl['seed'] + 3, max_points=6 if small else 120)
    for (px, py) in pp:
        x, y = t['xs'][0] + px * res, t['ys'][0] + py * res
        z = float(sample2(t['top'], np.array([px]), np.array([py]))[0])
        c = tr.random()
        s = tr.uniform(0.8, 1.2) * (2.4 if isl['name'].startswith('far') else (0.62 if small else 0.74))
        if isl['name'] in ('step_a', 'step_b', 'step_c', 'near_rock') and c < 0.5:
            palm(G, x, y, z, s, tr, FROND)
        else:
            pal = LEAF['teal'] if c < 0.4 else (LEAF['jade'] if c < 0.85 else LEAF['mint'])
            ghaf(G, x, y, z, s, tr, pal, sub=2)
    if small or isl['name'] in ('light', 'fort'):
        # grass, flowers and a few stones, so the little islands aren't bare
        gm = (t['d'] > 0.6) & (sl < 0.9)
        for (px, py) in poisson(gm, 1.25 / res, isl['seed'] + 4, max_points=500 if small else 1400):
            x, y = t['xs'][0] + px * res, t['ys'][0] + py * res
            z = float(sample2(t['top'], np.array([px]), np.array([py]))[0])
            c = tr.random()
            if c < 0.82:
                tuft(G, x, y, z, tr.uniform(0.5, 1.0), tr, hx('#46b98c') if tr.random() < 0.65 else hx('#a2d27f'))
            elif c < 0.9:
                flower(G, x, y, z, tr.uniform(0.2, 0.3), hx('#fff4df'))
            elif c < 0.96:
                flower(G, x, y, z, tr.uniform(0.2, 0.3), hx('#ff5f92'))
            else:
                boulder(G, x, y, z, tr.uniform(0.3, 0.7), tr, hx('#c9ab8e'))
log('other islands')

# Gulls, a few of them, riding the air round the lighthouse and off the cliff. They give the whole thing its size.
GULLS = [(-30, 230, 34), (-16, 250, 44), (6, 232, 28), (-52, 150, 22), (-40, 120, 40), (20, 170, 34)]
gull_r = np.random.default_rng(88)
for (gx_, gy_, gz_) in GULLS:
    sz = gull_r.uniform(1.5, 2.3)
    a = gull_r.uniform(0, 6.28)
    lift = gull_r.uniform(0.25, 0.6)
    body = np.array([gx_, gy_, gz_], np.float32)
    fw_, sd_ = rz(np.array([1, 0, 0], np.float32), a), rz(np.array([0, 1, 0], np.float32), a)
    up = np.array([0, 0, 1], np.float32)
    v_ = [body + fw_ * 0.45 * sz, body - fw_ * 0.45 * sz,
          body + sd_ * sz * 0.55 + up * lift * sz * 0.5, body + sd_ * sz * 1.25 + up * lift * sz * 0.25 - fw_ * 0.2 * sz,
          body - sd_ * sz * 0.55 + up * lift * sz * 0.5, body - sd_ * sz * 1.25 + up * lift * sz * 0.25 - fw_ * 0.2 * sz]
    v_ = np.array(v_, np.float32)
    w_ = np.array([(v_[0], v_[2]), (v_[2], v_[3]), (v_[3], v_[1]), (v_[0], v_[4]), (v_[4], v_[5]), (v_[5], v_[1])], np.float32)
    G['sail'].add(v_, [(0, 2, 3), (0, 3, 1), (0, 1, 5), (0, 5, 4)], hx('#fffaf0'), w_)

# hanging roots and vines off the rim: long thin curtains that soften the cut between turf and rock
rim_mask = (d > 0.2) & (d < 1.1)
rp = poisson(rim_mask, 1.1 / RES, 650, max_points=int(2600 * DENSITY))
vine = Geo()
gy_, gx_ = np.gradient(d, RES)
for (px, py) in rp:
    ix_, iy_ = int(px), int(py)
    x, y = xs[0] + px * RES, ys[0] + py * RES
    z = float(top[iy_, ix_])
    nx, ny = -gx_[iy_, ix_], -gy_[iy_, ix_]
    nn = math.hypot(nx, ny) + 1e-3
    nx, ny = nx / nn, ny / nn
    length = tr.uniform(1.8, 9.5) * (1 if tr.random() < 0.9 else 1.6)
    seg = 8
    pts_ = []
    for k in range(seg + 1):
        t = k / seg
        pts_.append((x + nx * (0.5 + 0.9 * t ** 0.5) + np.sin(t * 5 + px) * 0.12, y + ny * (0.5 + 0.9 * t ** 0.5) + np.cos(t * 4 + py) * 0.12, z + 0.1 - length * t))
    tube(vine, pts_, np.linspace(0.13, 0.03, seg + 1), 3, hx('#1a9477') * tr.uniform(0.75, 1.25))
va, fa, sa, ca = vine.arrays()
mesh_new(bpy, 'vines', va, fa, attrs={'col': ca}, material=col_material('vines', 0.65, 0.2, translucent=0.2), sizes=sa)
log('vines', len(rp))

# ---------------------------------------------------------------- merge
wires = {}
for key, geo_ in G.items():
    a = geo_.arrays()
    if a is None:
        continue
    v, f, s, c = a
    ob = mesh_new(bpy, key, v, f, attrs={'col': c}, material=M[key], sizes=s, smooth_shade=key in ('leaf', 'frond', 'hull', 'sail', 'cloth', 'tuft'))
    if key in ('plaster', 'stone', 'wood'):
        mod = ob.modifiers.new('bevel', 'BEVEL')
        mod.limit_method = 'ANGLE'
        mod.angle_limit = math.radians(35)
        mod.width = 0.1 if key == 'plaster' else 0.05
        mod.segments = 2
        mod.harden_normals = False
    wires[key] = geo_.wires()
    log(key, len(v), 'verts', len(wires[key]), 'wire edges')

np.savez_compressed(os.path.join(OUT, 'props.npz'), obst=obst, trunks=np.array(trunks, np.float32), fall_at=fall_at, fall_verts=fall_verts,
                    **{f'wire_{k}': v for k, v in wires.items()})

# ---------------------------------------------------------------- camera, sun, world
cam = bpy.data.cameras.new('cam')
co = bpy.data.objects.new('cam', cam)
scene.collection.objects.link(co)
scene.camera = co
setup_camera(co, cam)
sun = bpy.data.lights.new('sun', 'SUN')
so = bpy.data.objects.new('sun', sun)
scene.collection.objects.link(so)
sun.energy = 5.2
sun.angle = math.radians(3.5)
sun.color = (1.0, 0.76, 0.52)
sdir = Vector(SUN_DIR).normalized()
so.rotation_euler = sdir.to_track_quat('Z', 'Y').to_euler()

# The sky lights the land from all round: cool teal above, bright warm cloud-bounce from below.
w = bpy.data.worlds.new('sky')
scene.world = w
w.use_nodes = True
nt = w.node_tree
nt.nodes.clear()
wo = nt.nodes.new('ShaderNodeOutputWorld')
bg = nt.nodes.new('ShaderNodeBackground')
tc = nt.nodes.new('ShaderNodeTexCoord')
sp = nt.nodes.new('ShaderNodeSeparateXYZ')
nt.links.new(tc.outputs['Generated'], sp.inputs[0])
ramp = nt.nodes.new('ShaderNodeValToRGB')
cr = ramp.color_ramp
cr.elements[0].position = 0.0
cr.elements[0].color = (*hx('#c7efe8'), 1)
cr.elements[1].position = 1.0
cr.elements[1].color = (*hx('#5fb6d6'), 1)
e = cr.elements.new(0.48)
e.color = (*hx('#d9f0ee'), 1)
e2 = cr.elements.new(0.56)
e2.color = (*hx('#ffe2c2'), 1)
mp = nt.nodes.new('ShaderNodeMapRange')
mp.inputs['From Min'].default_value = -1
mp.inputs['From Max'].default_value = 1
nt.links.new(sp.outputs[2], mp.inputs['Value'])
nt.links.new(mp.outputs[0], ramp.inputs[0])
nt.links.new(ramp.outputs[0], bg.inputs[0])
bg.inputs[1].default_value = 1.05
nt.links.new(bg.outputs[0], wo.inputs[0])

if os.environ.get('CLOUDS', '1') == '1':
    from clouds_add import add_clouds
    add_clouds(OUT)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'world.blend'), compress=False)
log('saved')
