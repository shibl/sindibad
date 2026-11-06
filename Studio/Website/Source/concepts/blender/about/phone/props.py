# The storybook world that lives on the phone: islands with palms, a volcano, a lighthouse, a fort, and a dhow with a lateen sail.
# Everything is modelled here from numbers; imported by render_world.py.
import bpy, math, os
import numpy as np
from mathutils import Vector, Matrix
from common import *

rng = np.random.default_rng(77)


# -------------------------------------------------------------------------------------------------------------- materials
def mat_ground():
    """Colour comes from per-vertex weights: sand, grass, rock, with soft noise so no band is clean."""
    m = material('Ground')
    n = N(m)
    tc = n('TexCoord')
    sand = n('Attribute', attribute_name='sand')
    grass = n('Attribute', attribute_name='grass')
    rock = n('Attribute', attribute_name='rock')
    nz = n('TexNoise', inputs={'Scale': 1.2, 'Detail': 6.0, 'Roughness': 0.6})
    n.link(tc.outputs['Object'], nz.inputs['Vector'])
    nz2 = n('TexNoise', inputs={'Scale': 7.0, 'Detail': 5.0, 'Roughness': 0.6})
    n.link(tc.outputs['Object'], nz2.inputs['Vector'])
    sand_c = n.mix(nz.outputs['Fac'], hx('#f7dea2'), hx('#ecc27c'))
    grass_c = n.mix(n.ramp(nz.outputs['Fac'], [(0.3, (0, 0, 0, 1)), (0.7, (1, 1, 1, 1))]), hx('#3f9a3e'), hx('#86c653'))
    grass_c = n.mix(n.ramp(nz2.outputs['Fac'], [(0.45, (0, 0, 0, 1)), (0.6, (1, 1, 1, 1))]), grass_c, hx('#2e7f3a'))
    rock_c = n.mix(n.ramp(nz2.outputs['Fac'], [(0.35, (0, 0, 0, 1)), (0.65, (1, 1, 1, 1))]), hx('#70493a'), hx('#a97f62'))
    col = n.mix(grass.outputs['Fac'], sand_c, grass_c)
    col = n.mix(rock.outputs['Fac'], col, rock_c)
    # A wet dark rim of sand at the water.
    bsdf = n('BsdfPrincipled', inputs={'Roughness': 0.85, 'Specular IOR Level': 0.3})
    n.link(col, bsdf.inputs['Base Color'])
    bump = n('Bump', inputs={'Strength': 0.5, 'Distance': 0.25})
    n.link(nz2.outputs['Fac'], bump.inputs['Height'])
    n.link(bump.outputs[0], bsdf.inputs['Normal'])
    out = n('OutputMaterial')
    n.link(bsdf.outputs[0], out.inputs[0])
    return m


def mat_palm_leaf():
    m = material('PalmLeaf')
    n = N(m)
    ob = n('ObjectInfo')
    col = n.ramp(ob.outputs['Random'], [(0.0, '#2c8a3f'), (0.5, '#4fae42'), (1.0, '#7cc548')])
    d = n('BsdfDiffuse')
    n.link(col, d.inputs['Color'])
    t = n('BsdfTranslucent')
    n.link(n.mix(0.5, col, hx('#c9e65a')), t.inputs['Color'])
    mx = n('MixShader')
    mx.inputs[0].default_value = 0.42
    n.link(d.outputs[0], mx.inputs[1])
    n.link(t.outputs[0], mx.inputs[2])
    out = n('OutputMaterial')
    n.link(mx.outputs[0], out.inputs[0])
    return m


def mat_simple(name, color, rough=0.6, metal=0.0, emission=0.0):
    m = material(name)
    n = N(m)
    b = n('BsdfPrincipled', inputs={'Base Color': hx(color), 'Roughness': rough, 'Metallic': metal})
    if emission:
        n.set(b.inputs['Emission Color'], hx(color))
        n.set(b.inputs['Emission Strength'], emission)
    out = n('OutputMaterial')
    n.link(b.outputs[0], out.inputs[0])
    return m


def mat_sail():
    """Canvas with a little weathering and two broad warm stripes, and enough translucency that a low sun lights it from behind."""
    m = material('Sail')
    n = N(m)
    uv = n('UVMap', uv_map='UVMap')
    sep = n('SeparateXYZ')
    n.link(uv.outputs['UV'], sep.inputs[0])
    stripes = n.ramp(sep.outputs['Y'], [(0.62, (0, 0, 0, 1)), (0.625, (1, 1, 1, 1)), (0.70, (1, 1, 1, 1)), (0.705, (0, 0, 0, 1)), (0.76, (0, 0, 0, 1)), (0.765, (1, 1, 1, 1)), (0.8, (1, 1, 1, 1)), (0.805, (0, 0, 0, 1))])
    nz = n('TexNoise', inputs={'Scale': 40.0, 'Detail': 6.0, 'Roughness': 0.6})
    n.link(uv.outputs['UV'], nz.inputs['Vector'])
    base = n.mix(n.ramp(nz.outputs['Fac'], [(0.3, (0, 0, 0, 1)), (0.7, (1, 1, 1, 1))]), hx('#f2dfbb'), hx('#fff3da'))
    # Panel seams.
    seam = n.math('FRACT', n.math('MULTIPLY', sep.outputs['X'], 9.0))
    seam_v = n.ramp(seam, [(0.0, (0.72, 0.72, 0.72, 1)), (0.05, (1, 1, 1, 1)), (0.95, (1, 1, 1, 1)), (1.0, (0.72, 0.72, 0.72, 1))])
    col = n.mix(1.0, base, seam_v, 'MULTIPLY')
    col = n.mix(stripes, col, hx('#e0506e'))
    d = n('BsdfDiffuse')
    n.link(col, d.inputs['Color'])
    t = n('BsdfTranslucent')
    n.link(n.mix(1.0, col, hx('#ffe2ac'), 'MULTIPLY'), t.inputs['Color'])
    mx = n('MixShader')
    mx.inputs[0].default_value = 0.55
    n.link(d.outputs[0], mx.inputs[1])
    n.link(t.outputs[0], mx.inputs[2])
    out = n('OutputMaterial')
    n.link(mx.outputs[0], out.inputs[0])
    return m


def mat_hull():
    m = material('Hull')
    n = N(m)
    uv = n('UVMap', uv_map='UVMap')
    sep = n('SeparateXYZ')
    n.link(uv.outputs['UV'], sep.inputs[0])
    y = sep.outputs['Y']
    # Painted bands below the rail, oiled teak below them, planks everywhere.
    planks = n.math('FRACT', n.math('MULTIPLY', y, 15.0))
    pl = n.ramp(planks, [(0.0, (0.55, 0.55, 0.55, 1)), (0.08, (1, 1, 1, 1)), (1.0, (1, 1, 1, 1))])
    nz_m = n('Mapping', inputs={'Scale': (34.0, 4.0, 1.0)})
    n.link(uv.outputs['UV'], nz_m.inputs['Vector'])
    nz = n('TexNoise', inputs={'Scale': 1.0, 'Detail': 6.0, 'Roughness': 0.6})
    n.link(nz_m.outputs[0], nz.inputs['Vector'])
    wood = n.mix(n.ramp(nz.outputs['Fac'], [(0.3, (0, 0, 0, 1)), (0.7, (1, 1, 1, 1))]), hx('#a86a33'), hx('#d79a55'))
    col = n.mix(n.ramp(y, [(0.72, (0, 0, 0, 1)), (0.725, (1, 1, 1, 1)), (0.86, (1, 1, 1, 1)), (0.865, (0, 0, 0, 1))]), wood, hx('#14a3a6'))
    col = n.mix(n.ramp(y, [(0.86, (0, 0, 0, 1)), (0.865, (1, 1, 1, 1)), (0.95, (1, 1, 1, 1)), (0.955, (0, 0, 0, 1))]), col, hx('#f4e6c8'))
    col = n.mix(1.0, col, pl, 'MULTIPLY')
    bsdf = n('BsdfPrincipled', inputs={'Roughness': 0.42, 'Specular IOR Level': 0.45})
    n.link(col, bsdf.inputs['Base Color'])
    out = n('OutputMaterial')
    n.link(bsdf.outputs[0], out.inputs[0])
    return m


# -------------------------------------------------------------------------------------------------------------- islands
def fbm2(x, y, seed, oct=5):
    r = np.random.default_rng(seed)
    out = np.zeros_like(x)
    amp = 1.0
    freq = 1.0
    for o in range(oct):
        ph = r.random(8) * 6.28
        d = r.random(8) * 6.28
        lay = np.zeros_like(x)
        for i in range(8):
            lay += np.sin((x * math.cos(d[i]) + y * math.sin(d[i])) * freq * (0.6 + 0.2 * i) + ph[i])
        out += amp * lay / 8
        amp *= 0.55
        freq *= 2.05
    return out


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def build_ground(name, col, size, peak_fn, seed, res=320, shore_noise=0.22):
    """A heightfield island. peak_fn(x, y, r) is added above a sand-and-grass disc. Coordinates in island units, sea at z = 0."""
    ax = np.linspace(-size, size, res, dtype=np.float32)
    X, Y = np.meshgrid(ax, ax)
    th = np.arctan2(Y, X)
    R = np.hypot(X, Y)
    wob = fbm2(X * 0.32, Y * 0.32, seed, 4)
    r_norm = R / size + wob * shore_noise
    # Low island body, with a beach that shelves under the sea.
    body = 1.0 - smooth(0.42, 0.9, r_norm)
    zz = body * 0.09 * size * (1 + 0.5 * fbm2(X * 0.8, Y * 0.8, seed + 1, 4)) - smooth(0.78, 1.05, r_norm) * 0.09 * size
    extra = peak_fn(X, Y, R, r_norm)
    zz = zz + extra
    fine = fbm2(X * 3.4, Y * 3.4, seed + 2, 4) * 0.012 * size * smooth(0.0, 0.1, zz)
    zz = zz + fine
    h, w = zz.shape
    verts = np.stack([X.ravel(), Y.ravel(), zz.ravel()], 1)
    i = np.arange(h * w).reshape(h, w)
    faces = np.stack([i[:-1, :-1].ravel(), i[:-1, 1:].ravel(), i[1:, 1:].ravel(), i[1:, :-1].ravel()], 1)
    # Keep only what's around or above the water.
    keep = (zz > -0.08 * size)
    fk = keep[:-1, :-1] & keep[:-1, 1:] & keep[1:, 1:] & keep[1:, :-1]
    me = bpy.data.meshes.new(name)
    me.vertices.add(len(verts))
    me.vertices.foreach_set('co', verts.astype(np.float32).ravel())
    fs = faces[fk.ravel()]
    me.loops.add(len(fs) * 4)
    me.polygons.add(len(fs))
    me.loops.foreach_set('vertex_index', fs.astype(np.int32).ravel())
    me.polygons.foreach_set('loop_start', np.arange(len(fs), dtype=np.int32) * 4)
    me.update(calc_edges=True)
    me.shade_smooth()
    # Colour weights.
    gy, gx = np.gradient(zz, ax[1] - ax[0])
    slope = np.hypot(gx, gy)
    n2 = fbm2(X * 1.6, Y * 1.6, seed + 3, 4)
    grass = smooth(0.012 * size, 0.04 * size, zz + n2 * 0.012 * size) * (1 - smooth(1.05, 1.75, slope + n2 * 0.2 + np.maximum(zz - 0.36 * size, 0) * 0.4))
    rock = smooth(1.05, 1.75, slope + n2 * 0.2 + np.maximum(zz - 0.36 * size, 0) * 0.4) * smooth(0.02 * size, 0.07 * size, zz)
    for nm, arr in (('grass', grass), ('rock', rock), ('sand', 1 - grass)):
        me.attributes.new(nm, 'FLOAT', 'POINT').data.foreach_set('value', arr.astype(np.float32).ravel())
    me.materials.append(mat_ground())
    ob = bpy.data.objects.new(name, me)
    col.objects.link(ob)
    return ob, (X, Y, zz, slope)


def height_at(field, x, y):
    X, Y, zz, _ = field
    ax = X[0]
    size = ax[-1]
    i = int((x + size) / (2 * size) * (len(ax) - 1))
    j = int((y + size) / (2 * size) * (len(ax) - 1))
    i = max(0, min(len(ax) - 1, i))
    j = max(0, min(len(ax) - 1, j))
    return float(zz[j, i])


def lathe(name, prof, col, mats, seg=48, cap=True, loc=(0, 0, 0)):
    vs, fs = [], []
    for i in range(seg):
        a = 2 * math.pi * i / seg
        for r, z in prof:
            vs.append((r * math.cos(a) + loc[0], r * math.sin(a) + loc[1], z + loc[2]))
    m = len(prof)
    for i in range(seg):
        j = (i + 1) % seg
        for k in range(m - 1):
            fs.append((i * m + k, j * m + k, j * m + k + 1, i * m + k + 1))
    if cap:
        fs.append(tuple(i * m + m - 1 for i in range(seg)))
        fs.append(tuple(i * m for i in reversed(range(seg))))
    return make_object(name, vs, fs, col, mats, True, 40)


def palm(col, x, y, z, height, lean=None, seed=0, fronds=11):
    r = np.random.default_rng(seed)
    lean_a = r.random() * 6.28 if lean is None else lean
    lean_k = r.uniform(0.12, 0.3)
    # Trunk: a tapered curved tube with rings.
    seg, ring = 18, 8
    vs, fs = [], []
    top = None
    for j in range(seg + 1):
        t = j / seg
        ox = math.cos(lean_a) * lean_k * height * t * t
        oy = math.sin(lean_a) * lean_k * height * t * t
        rad = height * (0.042 * (1 - t) + 0.024) * (1 + 0.08 * math.sin(t * 60))
        for i in range(ring):
            a = 6.283 * i / ring
            vs.append((x + ox + rad * math.cos(a), y + oy + rad * math.sin(a), z + t * height))
        top = Vector((x + ox, y + oy, z + height))
    for j in range(seg):
        for i in range(ring):
            a, b = j * ring + i, j * ring + (i + 1) % ring
            fs.append((a, b, b + ring, a + ring))
    make_object('Trunk', vs, fs, col, [mat_simple('Bark', '#8d6a4b', 0.8)], True)
    # Fronds: a rachis arching out and down, with leaflets either side.
    vs, fs = [], []
    for f in range(fronds):
        az = 6.283 * f / fronds + r.normal(0, 0.14)
        length = height * r.uniform(0.5, 0.68)
        rise = r.uniform(0.15, 0.5)
        nseg = 14
        dirv = Vector((math.cos(az), math.sin(az), 0))
        side = Vector((-math.sin(az), math.cos(az), 0))
        for i in range(nseg):
            t0, t1 = i / nseg, (i + 1) / nseg
            P = lambda t: top + dirv * (length * t) + Vector((0, 0, length * (rise * t - 0.95 * t * t)))
            p0, p1 = P(t0), P(t1)
            w0 = length * 0.2 * math.sin(math.pi * min(1, t0 * 1.02 + 0.04)) ** 0.7
            w1 = length * 0.2 * math.sin(math.pi * min(1, t1 * 1.02 + 0.04)) ** 0.7
            for s in (-1, 1):
                droop = Vector((0, 0, -length * 0.06))
                a = len(vs)
                vs += [p0, p1, p1 + side * s * w1 * 0.7 + dirv * length * 0.05 + droop, p0 + side * s * w0 * 0.7 + dirv * length * 0.05 + droop]
                fs.append((a, a + 1, a + 2, a + 3) if s > 0 else (a, a + 3, a + 2, a + 1))
    ob = make_object('Fronds', [tuple(v) for v in vs], fs, col, [mat_palm_leaf()], True)
    return ob


def scatter_palms(col, field, count, size, zmin, zmax, h0, h1, seed):
    r = np.random.default_rng(seed)
    done = 0
    tries = 0
    while done < count and tries < count * 80:
        tries += 1
        a = r.random() * 6.283
        d = r.random() ** 0.6 * size * 0.88
        x, y = d * math.cos(a), d * math.sin(a)
        z = height_at(field, x, y)
        if zmin < z < zmax:
            palm(col, x, y, z - 0.03, r.uniform(h0, h1), seed=int(r.integers(1 << 30)))
            done += 1


def flag(col, x, y, z, pole, color='#fa2a6f'):
    lathe('Pole', [(0.02 * pole, 0), (0.02 * pole, pole)], col, [mat_simple('PoleWood', '#5a3a22', 0.6)], 8, loc=(x, y, z))
    vs = [(x, y, z + pole), (x + 0.42 * pole, y, z + pole * 0.87), (x, y, z + pole * 0.74)]
    make_object('Flag', vs, [(0, 1, 2)], col, [mat_simple('Pink', color, 0.5, emission=0.25)], False)


def island_volcano(col, seed=11):
    S = 13.0
    def peak(X, Y, R, r):
        cone = np.maximum(0.0, 1 - R / (S * 0.8)) ** 1.35 * S * 1.02
        crater = -np.maximum(0.0, 1 - R / (S * 0.12)) ** 1.5 * S * 0.3
        ridges = 0.1 * S * np.maximum(0, 1 - R / (S * 0.8)) * np.abs(np.sin(np.arctan2(Y, X) * 6 + fbm2(X * 0.4, Y * 0.4, seed, 2) * 2.4))
        return cone + crater + ridges * 0.35
    g, field = build_ground('IslandVolcano', col, S, peak, seed)
    lava = mat_simple('Lava', '#ff7a2a', 0.5, emission=2.0)
    lathe('Lava', [(0.0, S * 0.74), (S * 0.09, S * 0.74)], col, [lava], 24)
    scatter_palms(col, field, 16, S, 0.2, 1.5, 1.7, 2.8, seed)
    return g


def island_lighthouse(col, seed=23):
    S = 11.0
    def peak(X, Y, R, r):
        dx, dy = X + 1.0, Y - 0.4
        cliff = np.maximum(0.0, 1 - np.hypot(dx, dy) / (S * 0.42)) ** 0.5 * S * 0.32
        return cliff * (0.8 + 0.3 * fbm2(X * 0.7, Y * 0.7, seed, 3))
    g, field = build_ground('IslandLight', col, S, peak, seed)
    x, y = -1.0, 0.4
    z = height_at(field, x, y) - 0.2
    h = S * 0.72
    white = mat_simple('White', '#fff8ec', 0.5)
    red = mat_simple('Stripe', '#d8405c', 0.5)
    bands = 6
    for b in range(bands):
        t0, t1 = b / bands, (b + 1) / bands
        r0 = S * (0.105 - 0.05 * t0)
        r1 = S * (0.105 - 0.05 * t1)
        lathe(f'Band{b}', [(r0, z + t0 * h), (r1, z + t1 * h)], col, [red if b % 2 else white], 28, False)
    top = z + h
    lathe('Gallery', [(S * 0.04, top), (S * 0.078, top + 0.02), (S * 0.078, top + 0.12), (S * 0.05, top + 0.14)], col, [mat_simple('Dark', '#23413f', 0.5)], 28)
    lathe('Lamp', [(S * 0.035, top + 0.1), (S * 0.035, top + 0.72)], col, [mat_simple('Lamp', '#ffe6a3', 0.3, emission=5.0)], 20)
    lathe('Cap', [(S * 0.052, top + 0.72), (S * 0.0, top + 1.28)], col, [red], 24)
    scatter_palms(col, field, 12, S, 0.15, 1.5, 1.6, 2.6, seed)
    # A little keeper's house.
    return g


def box(name, col, mat, x, y, z, w, d, h):
    v = [(x - w, y - d, z), (x + w, y - d, z), (x + w, y + d, z), (x - w, y + d, z), (x - w, y - d, z + h), (x + w, y - d, z + h), (x + w, y + d, z + h), (x - w, y + d, z + h)]
    return make_object(name, v, [(3, 2, 1, 0), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)], col, [mat], False)


def island_fort(col, seed=37):
    S = 12.0
    def peak(X, Y, R, r):
        hill = np.maximum(0.0, 1 - np.hypot(X - 0.5, Y + 0.3) / (S * 0.5)) ** 0.7 * S * 0.17
        return hill
    g, field = build_ground('IslandFort', col, S, peak, seed)
    wall = mat_simple('FortWall', '#e9c88f', 0.75)
    x, y = 0.5, -0.3
    z = height_at(field, x, y) - 0.25
    # The curtain wall with crenellations, and round towers at the corners.
    W, D, H = 3.6, 2.8, 2.6
    box('Curtain', col, wall, x, y, z, W, D, H)
    for i in range(14):
        cx = x - W + (i + 0.5) * 2 * W / 14
        box('Mer', col, wall, cx, y - D, z + H, W / 26, 0.17, 0.42)
        box('Mer', col, wall, cx, y + D, z + H, W / 26, 0.17, 0.42)
    for i in range(10):
        cy = y - D + (i + 0.5) * 2 * D / 10
        box('Mer', col, wall, x - W, cy, z + H, 0.17, D / 20, 0.42)
        box('Mer', col, wall, x + W, cy, z + H, 0.17, D / 20, 0.42)
    for sx, sy in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
        tx, ty = x + sx * W, y + sy * D
        lathe('Tower', [(1.05, z), (0.96, z + H + 1.1), (1.2, z + H + 1.3), (1.2, z + H + 1.62)], col, [wall], 28)
    keep = mat_simple('Keep', '#f3dcab', 0.7)
    box('Keep', col, keep, x, y, z + H * 0.6, 1.5, 1.3, H + 1.4)
    for i in range(6):
        box('Mer', col, keep, x - 1.5 + (i + 0.5) * 0.5, y - 1.3, z + H * 1.6 + 1.4, 0.13, 0.13, 0.32)
    # A dome.
    prof = [(1.0 * math.cos(t * math.pi / 2), z + H * 1.6 + 1.4 + 1.1 * math.sin(t * math.pi / 2)) for t in np.linspace(0, 1, 12)]
    lathe('Dome', [(r, zz) for r, zz in prof], col, [mat_simple('Domed', '#0d8f97', 0.3)], 28, False, loc=(x, y, 0))
    flag(col, x, y, z + H * 1.6 + 2.45, 1.6)
    # The gate.
    box('Gate', col, mat_simple('GateDark', '#3b2416', 0.6), x, y - D - 0.02, z, 0.7, 0.08, 1.55)
    scatter_palms(col, field, 14, S, 0.12, 1.1, 1.5, 2.5, seed)
    return g


def island_palms(col, seed=51):
    S = 9.0
    def peak(X, Y, R, r):
        rocks = np.maximum(0.0, 1 - np.hypot(X + 2.6, Y - 1.5) / 3.2) ** 0.8 * 2.8
        return rocks + 0.2 * np.maximum(0.0, 1 - R / S)
    g, field = build_ground('IslandPalms', col, S, peak, seed)
    scatter_palms(col, field, 20, S, 0.1, 2.2, 1.7, 3.2, seed)
    return g


# -------------------------------------------------------------------------------------------------------------- the dhow
def dhow(col):
    """Bow toward +x. About 16 units long, keel at z = -0.8, so the waterline is at about z = 0."""
    L = 16.0
    ns, nr = 96, 20
    def hw(t):
        # half width along the hull, t 0 (transom) to 1 (stem)
        return 2.15 * max(0.0, 1 - abs(2 * t - 0.92) ** 2.6) ** 0.8 * (0.86 + 0.14 * math.sin(t * 3.14)) + (0.55 if t < 0.1 else 0.55 * (0.1 / t) ** 4)
    def sheer(t):
        # top rail: high at the transom, low amidships, sweeping up the stem
        return 1.05 + 2.3 * (1 - t) ** 4.5 + 1.9 * max(0.0, t - 0.55) ** 2 * 6.0
    def keel(t):
        return -0.8 + 1.2 * max(0.0, t - 0.7) ** 2 * 11 + 0.3 * max(0.0, 0.1 - t) * 10
    def station(t, frac):
        # The ends rake out with height: a long overhanging stem, a raked transom.
        rake = 4.0 * max(0.0, t - 0.72) ** 1.5 * 6.0 * frac - 1.3 * max(0.0, 0.1 - t) * 10 * frac
        return (t - 0.5) * L + rake
    vs, fs, uvs = [], [], []
    for i in range(ns + 1):
        t = i / ns
        w = max(hw(t), 0.015)
        for j in range(nr + 1):
            a = j / nr
            frac = abs(a - 0.5) * 2
            z = keel(t) + (sheer(t) - keel(t)) * frac ** 0.72
            y = (1 if a < 0.5 else -1) * w * frac ** 0.46
            vs.append((station(t, frac), y, z))
            uvs.append((t, frac))
    for i in range(ns):
        for j in range(nr):
            a = i * (nr + 1) + j
            b = a + 1
            c = a + nr + 2
            d = a + nr + 1
            fs.append((a, d, c, b))
    hull = make_object('Hull', vs, fs, col, [mat_hull()], True, None, uvs)
    # Deck.
    dv, df = [], []
    for i in range(ns + 1):
        t = i / ns
        x = station(t, 1.0)
        w = max(hw(t), 0.02)
        z = sheer(t) - 0.22
        dv += [(x, -w * 0.97, z), (x, w * 0.97, z)]
    for i in range(ns):
        df.append((2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1))
    make_object('Deck', dv, df, col, [mat_simple('DeckWood', '#b9854e', 0.6)], True)
    # A rail along the hull.
    for s in (-1, 1):
        rv, rf = [], []
        for i in range(ns + 1):
            t = i / ns
            x = station(t, 1.0)
            w = max(hw(t), 0.02)
            z = sheer(t)
            rv += [(x, s * w, z - 0.02), (x, s * w, z + 0.35), (x, s * (w + 0.06), z + 0.35), (x, s * (w + 0.06), z - 0.02)]
        for i in range(ns):
            for k in range(4):
                a, b = i * 4 + k, i * 4 + (k + 1) % 4
                rf.append((a, b, b + 4, a + 4))
        make_object('Rail', rv, rf, col, [mat_simple('RailWood', '#6d4220', 0.45)], True)
    # Poop deck cabin aft.
    box('Cabin', col, mat_simple('Cabin', '#c8935a', 0.6), -5.2, 0, sheer(0.15) - 0.2, 1.7, 1.2, 1.1)
    box('CabinRoof', col, mat_simple('CabinRoof', '#7a4a24', 0.5), -5.2, 0, sheer(0.15) + 0.9, 1.95, 1.4, 0.13)
    # A carved stern gallery, a row of small windows.
    for i in range(5):
        box('Gal', col, mat_simple('GalPaint', '#14a3a6', 0.5), -7.45 + i * 0.5, 0, sheer(0.05) - 0.75, 0.16, 1.55, 0.42)
        box('Gal2', col, mat_simple('GalCream', '#f4e6c8', 0.5), -7.45 + i * 0.5, 0, sheer(0.05) - 0.82, 0.21, 1.57, 0.07)
    # The helmsman, a small dark figure in a white robe, and someone at the rail.
    robe = mat_simple('Robe', '#f7eedc', 0.7)
    skin = mat_simple('Skin', '#8d5a36', 0.6)
    for fx, fz, sc in ((-5.2, sheer(0.15) + 1.03, 1.0), (2.8, sheer(0.68) - 0.2, 0.95)):
        lathe('Body', [(0.0, 0), (0.25 * sc, 0.02), (0.2 * sc, 0.75 * sc), (0.12 * sc, 0.95 * sc), (0.0, 1.0 * sc)], col, [robe], 12, loc=(fx, -0.2, fz))
        lathe('Head', [(0.0, 0), (0.12 * sc, 0.05 * sc), (0.14 * sc, 0.15 * sc), (0.1 * sc, 0.26 * sc), (0.0, 0.3 * sc)], col, [skin], 12, loc=(fx, -0.2, fz + 0.98 * sc))
    # Mast, raked forward.
    mast_h = 13.2
    mx0, mz0 = 0.8, sheer(0.55) - 0.4
    mast_tip = Vector((mx0 + 1.8, 0, mz0 + mast_h))
    tube(col, [Vector((mx0, 0, mz0)), mast_tip], 0.16, 0.08, mat_simple('Spar', '#7a4a24', 0.5))
    # The yard: a long slender spar slung from the mast top, low at the bow and high aft.
    yard_lo = Vector((9.6, 0.2, sheer(0.9) + 1.0))
    yard_hi = Vector((-9.4, 0.2, mz0 + mast_h + 4.4))
    yard_mid = (yard_lo + yard_hi) * 0.5 + Vector((0.6, 0, -0.8))
    pts = [yard_lo.lerp(yard_mid, t / 8) if t <= 8 else yard_mid.lerp(yard_hi, (t - 8) / 8) for t in range(17)]
    tube(col, pts, 0.11, 0.05, mat_simple('Yard', '#6a3f1f', 0.5))
    # The lateen sail: a big triangle bellied by the wind, with the leech curving.
    clew = Vector((-5.8, -0.1, sheer(0.15) + 2.3))
    nu, nv = 44, 44
    sv, sf, suv = [], [], []
    for i in range(nu + 1):
        u = i / nu
        # A point along the yard (the sail's head).
        head = pts[int(u * 16)] if i == nu else pts[int(u * 16)].lerp(pts[min(16, int(u * 16) + 1)], u * 16 - int(u * 16))
        for j in range(nv + 1):
            v = j / nv
            # Foot to head: from the foot line (tack to clew) up to the yard.
            foot = yard_lo.lerp(clew, u ** 0.85) + Vector((0, 0, -0.1 * math.sin(math.pi * u)))
            p = foot.lerp(head, v)
            belly = math.sin(math.pi * u) ** 0.8 * math.sin(math.pi * v) ** 0.7
            p += Vector((0.0, -2.1 * belly - 0.2, 0.0))
            sv.append(tuple(p))
            suv.append((u, v))
    for i in range(nu):
        for j in range(nv):
            a = i * (nv + 1) + j
            sf.append((a, a + nv + 1, a + nv + 2, a + 1))
    make_object('Sail', sv, sf, col, [mat_sail()], True, None, suv)
    # Stays and sheets.
    rope = mat_simple('Rope', '#402915', 0.8)
    tube(col, [clew, Vector((-7.2, 0, sheer(0.05) + 0.3))], 0.028, 0.028, rope)
    tube(col, [mast_tip, Vector((-6.6, 0.8, sheer(0.08) + 0.3))], 0.024, 0.024, rope)
    tube(col, [mast_tip, Vector((-6.6, -0.8, sheer(0.08) + 0.3))], 0.024, 0.024, rope)
    tube(col, [mast_tip, Vector((7.2, 0, sheer(0.92)))], 0.024, 0.024, rope)
    tube(col, [yard_lo, Vector((8.8, 0, sheer(0.92) + 0.3))], 0.03, 0.03, rope)
    # The pennant at the top of the yard.
    py = yard_hi
    pv = [tuple(py + Vector((0, 0, 0.5))), tuple(py + Vector((-2.6, 0.1, 0.05))), tuple(py + Vector((0, 0, -0.4)))]
    make_object('Pennant', pv, [(0, 1, 2)], col, [mat_simple('Pink2', '#fa2a6f', 0.5, emission=0.35)], False)
    return hull


def tube(col, pts, r0, r1, mat, sides=8):
    vs, fs = [], []
    n = len(pts)
    for i, p in enumerate(pts):
        d = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized()
        q = d.to_track_quat('Z', 'Y').to_matrix()
        r = r0 + (r1 - r0) * i / (n - 1)
        for k in range(sides):
            a = 6.283 * k / sides
            vs.append(tuple(p + q @ Vector((r * math.cos(a), r * math.sin(a), 0))))
    for i in range(n - 1):
        for k in range(sides):
            a, b = i * sides + k, i * sides + (k + 1) % sides
            fs.append((a, b, b + sides, a + sides))
    return make_object('Tube', vs, fs, col, [mat], True)
