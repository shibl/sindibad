# The Shadow Lantern hero object: a pierced brass fanous, modelled entirely from this script. regen.sh runs the final settings.
#
#   OUT=<dir> MODE=still|frames|mask|chain YAW=0 W=480 H=860 SPP=64 \
#     Blender -b --factory-startup --python-use-system-env -P lantern.py
#
# still   one beauty render at YAW degrees, to OUT/still.png
# frames  the yaw sequence the page plays while the lantern twists, to OUT/f<n>.png (FRAMES of them from -RANGE to +RANGE degrees)
# mask    what the flame sees: an equirectangular panorama from the flame through the piercing, to OUT/mask.png
#         Black is brass. White is an open hole. Pink is the pink glass. This is the gobo the wall shader looks up by direction.
# chain   the two chain links, face on and edge on, to OUT/link0.png and OUT/link1.png
#
# Units are centimetres. Z is up. The camera sits at -Y looking at +Y, and the wall the lantern lights is at +Y.
import bpy, bmesh, json, math, os, random
from mathutils import Vector, Matrix
from mathutils.geometry import tessellate_polygon

OUT = os.environ.get('OUT', '/tmp/lantern')
MODE = os.environ.get('MODE', 'still')
YAW = float(os.environ.get('YAW', 0))
W, H = int(os.environ.get('W', 480)), int(os.environ.get('H', 860))
SPP = int(os.environ.get('SPP', 64))
FRAMES = int(os.environ.get('FRAMES', 9))
RANGE = float(os.environ.get('RANGE', 16))
os.makedirs(OUT, exist_ok=True)

N = 8                       # sides
PHASE = math.pi / N         # so a flat facet looks straight at the camera and another straight at the wall
COS = math.cos(math.pi / N)
TAN = math.tan(math.pi / N)
FLAME_Z = -3.4

# ---------------------------------------------------------------- reset
scene = bpy.context.scene
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o)
root = bpy.data.objects.new('lantern', None)
scene.collection.objects.link(root)

def lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def hx(s):
    s = s.lstrip('#')
    return (lin(int(s[0:2], 16) / 255), lin(int(s[2:4], 16) / 255), lin(int(s[4:6], 16) / 255), 1.0)

# ---------------------------------------------------------------- mesh helpers
def add_mesh(name, verts, faces, mats=(), smooth=False, parent=root):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    if smooth:
        me.shade_smooth()
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    ob.parent = parent
    for m in mats:
        me.materials.append(m)
    return ob

def lathe(name, profile, sides=N, closed=False, cap=True, mats=(), smooth=False):
    """Revolves (apothem, z) points into a faceted solid. Outward normals when the profile runs from top to bottom."""
    verts, faces = [], []
    m = len(profile)
    phase = PHASE if sides == N else 0
    k = 1 / COS if sides == N else 1
    for r, z in profile:
        for i in range(sides):
            a = phase + 2 * math.pi * i / sides
            verts.append((r * k * math.sin(a), -r * k * math.cos(a), z))
    rows = m if closed else m - 1
    for j in range(rows):
        j2 = (j + 1) % m
        for i in range(sides):
            i2 = (i + 1) % sides
            faces.append((j * sides + i, j * sides + i2, j2 * sides + i2, j2 * sides + i))
    if cap and not closed:
        faces.append(tuple(i for i in range(sides)))
        faces.append(tuple((m - 1) * sides + sides - 1 - i for i in range(sides)))
    ob = add_mesh(name, verts, faces, mats, smooth)
    # Make the normals outward whichever way the profile ran.
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(ob.data)
    bm.free()
    return ob

def shell(profile, t):
    """A closed outline for a sheet of thickness t that follows a top to bottom profile."""
    outer = list(profile)
    inner = []
    for i, (r, z) in enumerate(profile):
        a = profile[max(0, i - 1)]
        b = profile[min(len(profile) - 1, i + 1)]
        dr, dz = b[0] - a[0], b[1] - a[1]
        l = math.hypot(dr, dz) or 1
        # the normal pointing inward (towards the axis), for a profile running downward
        nr, nz = dz / l, -dr / l
        inner.append((r + nr * t, z + nz * t))
    return outer + inner[::-1]

def interp_profile(profile, z):
    for (r0, z0), (r1, z1) in zip(profile, profile[1:]):
        if z1 <= z <= z0 or z0 <= z <= z1:
            f = 0 if z0 == z1 else (z - z0) / (z1 - z0)
            return r0 + (r1 - r0) * f
    return profile[0][0] if abs(z - profile[0][1]) < abs(z - profile[-1][1]) else profile[-1][0]

def smooth_profile(pts, sub=6):
    """Catmull-Rom through the points, so ogees read as one drawn line."""
    out = []
    n = len(pts)
    for i in range(n - 1):
        p0, p1, p2, p3 = pts[max(0, i - 1)], pts[i], pts[i + 1], pts[min(n - 1, i + 2)]
        for s in range(sub):
            t = s / sub
            t2, t3 = t * t, t * t * t
            f = lambda a, b, c, d: 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3)
            out.append((f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])))
    out.append(pts[-1])
    return out

# ---------------------------------------------------------------- 2D piercing shapes (s, z) in centimetres on a facet
def star8(cx, cy, R, inner=0.7654, turn=0.0, n=8):
    pts = []
    for i in range(n * 2):
        a = turn + i * math.pi / n
        r = R if i % 2 == 0 else R * inner
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts

def circle(cx, cy, R, n=14):
    return [(cx + R * math.cos(2 * math.pi * i / n), cy + R * math.sin(2 * math.pi * i / n)) for i in range(n)]

def teardrop(cx, cy, R, ang=math.pi / 2, n=14, stretch=2.1):
    """A drop whose point faces ang."""
    pts = []
    ca, sa = math.cos(ang), math.sin(ang)
    for i in range(n):
        t = 2 * math.pi * i / n
        x = math.cos(t)
        y = math.sin(t)
        # pinch toward +x
        k = (1 + x) * 0.5
        lx = (x + k * k * (stretch - 1)) * R
        ly = y * R * (1 - k ** 3 * 0.92)
        pts.append((cx + lx * ca - ly * sa, cy + lx * sa + ly * ca))
    return pts

def diamond(cx, cy, Rx, Ry):
    return [(cx + Rx, cy), (cx, cy + Ry), (cx - Rx, cy), (cx, cy - Ry)]

def inset(poly, d):
    """Offsets a polygon inward by d, keeping sharp corners."""
    n = len(poly)
    area = sum(poly[i][0] * poly[(i + 1) % n][1] - poly[(i + 1) % n][0] * poly[i][1] for i in range(n))
    sign = 1 if area > 0 else -1
    out = []
    for i in range(n):
        ax, ay = poly[i - 1]
        bx, by = poly[i]
        cx, cy = poly[(i + 1) % n]
        e1 = (bx - ax, by - ay)
        e2 = (cx - bx, cy - by)
        l1, l2 = math.hypot(*e1) or 1, math.hypot(*e2) or 1
        n1 = (-e1[1] / l1 * sign, e1[0] / l1 * sign)
        n2 = (-e2[1] / l2 * sign, e2[0] / l2 * sign)
        bis = (n1[0] + n2[0], n1[1] + n2[1])
        bl = math.hypot(*bis) or 1
        bis = (bis[0] / bl, bis[1] / bl)
        cos = max(0.25, bis[0] * n1[0] + bis[1] * n1[1])
        out.append((bx + bis[0] * d / cos, by + bis[1] * d / cos))
    return out

def cross_between(cx, cy, a):
    """The cross that fills the gap between four 8-point stars of spacing a, centred at (cx, cy)."""
    k1, k2, h = 0.3536 * a, 0.1464 * a, 0.5 * a
    # One quarter from the bottom touch point to the left touch point, in local coordinates.
    quarter = [(0, -h), (-(h - k1), -(h - k2)), (-(h - k1), -(h - k1)), (-(h - k2), -(h - k1))]
    pts = []
    for turn in range(4):
        c, s = math.cos(-turn * math.pi / 2), math.sin(-turn * math.pi / 2)
        for x, y in quarter:
            pts.append((cx + x * c - y * s, cy + x * s + y * c))
    return pts

# ---------------------------------------------------------------- cutters
def cutters(name, shapes, depth_fn, facets=range(N)):
    """Extrudes each 2D shape through the shell, on each facet. shapes: list of polygons in (s, z).
       depth_fn(s, z) -> (r_in, r_out) gives the radial span to cut through at that point."""
    verts, faces = [], []
    for k in facets:
        ang = 2 * math.pi * k / N
        c, s_ = math.cos(ang), math.sin(ang)
        def place(s, r, z):
            # facet k is centred at angle ang from -Y; s runs along its width
            x0, y0 = s, -r
            return (x0 * c - y0 * s_, x0 * s_ + y0 * c, z)
        for poly in shapes:
            start = len(verts)
            n = len(poly)
            for p in poly:
                r0, r1 = depth_fn(p[0], p[1])
                verts.append(place(p[0], r0, p[1]))
                verts.append(place(p[0], r1, p[1]))
            for i in range(n):
                a, b = start + 2 * i, start + 2 * ((i + 1) % n)
                faces.append((a, b, b + 1, a + 1))
            for tri in tessellate_polygon([[Vector((q[0], q[1], 0)) for q in poly]]):
                faces.append((start + 2 * tri[0], start + 2 * tri[1], start + 2 * tri[2]))
                faces.append((start + 2 * tri[2] + 1, start + 2 * tri[1] + 1, start + 2 * tri[0] + 1))
    ob = add_mesh(name, verts, faces)
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(ob.data)
    bm.free()
    ob.hide_render = True
    ob.hide_viewport = True
    return ob

def cut(ob, cutter):
    mod = ob.modifiers.new('cut', 'BOOLEAN')
    mod.operation = 'DIFFERENCE'
    mod.solver = 'MANIFOLD'
    mod.object = cutter
    return mod

# ---------------------------------------------------------------- materials
def brass_material(name='brass', base='#dcb064', rough=0.24, patina=0.5):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nodes, links = nt.nodes, nt.links
    bsdf = nodes['Principled BSDF']
    bsdf.inputs['Metallic'].default_value = 1
    # Colour: warm brass, going to dark tarnish in recesses and small hammered variation.
    tc = nodes.new('ShaderNodeTexCoord')
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 0.42
    noise.inputs['Detail'].default_value = 7
    noise.inputs['Roughness'].default_value = 0.56
    links.new(tc.outputs['Object'], noise.inputs['Vector'])
    ao = nodes.new('ShaderNodeAmbientOcclusion')
    ao.inputs['Distance'].default_value = 0.5
    ao.samples = 8
    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.25
    ramp.color_ramp.elements[0].color = hx('#3a2a12')
    ramp.color_ramp.elements[1].position = 0.86
    ramp.color_ramp.elements[1].color = hx(base)
    links.new(ao.outputs['AO'], ramp.inputs['Fac'])
    vary = nodes.new('ShaderNodeMix')
    vary.data_type = 'RGBA'
    vary.blend_type = 'MULTIPLY'
    vary.inputs[0].default_value = 0.22
    links.new(ramp.outputs[0], vary.inputs[6])
    r2 = nodes.new('ShaderNodeValToRGB')
    r2.color_ramp.elements[0].position = 0.34
    r2.color_ramp.elements[0].color = (0.62, 0.5, 0.36, 1)
    r2.color_ramp.elements[1].position = 0.66
    r2.color_ramp.elements[1].color = (1, 0.98, 0.92, 1)
    links.new(noise.outputs[0], r2.inputs['Fac'])
    links.new(r2.outputs[0], vary.inputs[7])
    links.new(vary.outputs[2], bsdf.inputs['Base Color'])
    # Roughness: rubbed bright on the edges, slightly mottled
    r3 = nodes.new('ShaderNodeMapRange')
    r3.inputs['From Min'].default_value = 0.3
    r3.inputs['From Max'].default_value = 0.7
    r3.inputs['To Min'].default_value = rough + 0.02
    r3.inputs['To Max'].default_value = rough + 0.2
    links.new(noise.outputs[0], r3.inputs['Value'])
    links.new(r3.outputs[0], bsdf.inputs['Roughness'])
    # Normal: a rolled bevel on every edge plus the faint dimples of hand hammering
    bevel = nodes.new('ShaderNodeBevel')
    bevel.samples = 6
    bevel.inputs['Radius'].default_value = 0.055
    dim = nodes.new('ShaderNodeTexVoronoi')
    dim.inputs['Scale'].default_value = 5.5
    links.new(tc.outputs['Object'], dim.inputs['Vector'])
    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.14
    bump.inputs['Distance'].default_value = 0.08
    links.new(dim.outputs['Distance'], bump.inputs['Height'])
    links.new(bevel.outputs[0], bump.inputs['Normal'])
    links.new(bump.outputs[0], bsdf.inputs['Normal'])
    return m

def glass_material(name, tint, glow, rough=0.03, tr=0.75):
    """Thin glass: transparent with a Fresnel sheen, and a translucent part that glows when lit from inside."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nodes, links = nt.nodes, nt.links
    for n in list(nodes):
        nodes.remove(n)
    out = nodes.new('ShaderNodeOutputMaterial')
    tp = nodes.new('ShaderNodeBsdfTransparent')
    tp.inputs['Color'].default_value = tint
    tl = nodes.new('ShaderNodeBsdfTranslucent')
    tl.inputs['Color'].default_value = glow
    gl = nodes.new('ShaderNodeBsdfAnisotropic')
    gl.inputs['Roughness'].default_value = rough
    gl.inputs['Color'].default_value = (1, 1, 1, 1)
    m1 = nodes.new('ShaderNodeMixShader')
    m1.inputs[0].default_value = tr
    links.new(tl.outputs[0], m1.inputs[1])
    links.new(tp.outputs[0], m1.inputs[2])
    fr = nodes.new('ShaderNodeFresnel')
    fr.inputs['IOR'].default_value = 1.5
    m2 = nodes.new('ShaderNodeMixShader')
    links.new(fr.outputs[0], m2.inputs[0])
    links.new(m1.outputs[0], m2.inputs[1])
    links.new(gl.outputs[0], m2.inputs[2])
    links.new(m2.outputs[0], out.inputs['Surface'])
    return m

def emission_material(name, color, strength):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nodes, links = m.node_tree.nodes, m.node_tree.links
    for n in list(nodes):
        nodes.remove(n)
    out = nodes.new('ShaderNodeOutputMaterial')
    em = nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = color
    em.inputs['Strength'].default_value = strength
    links.new(em.outputs[0], out.inputs['Surface'])
    return m

def glow_material(name, near, far, strength, d0=7.0, d1=20.0, tr=0.1):
    """Frosted glass lit from inside. Graded by distance from the flame: hot and yellow close by, deep amber far off."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nodes, links = nt.nodes, nt.links
    for n in list(nodes):
        nodes.remove(n)
    out = nodes.new('ShaderNodeOutputMaterial')
    tc = nodes.new('ShaderNodeTexCoord')
    dist = nodes.new('ShaderNodeVectorMath')
    dist.operation = 'DISTANCE'
    dist.inputs[1].default_value = (0, 0, FLAME_Z)
    links.new(tc.outputs['Object'], dist.inputs[0])
    mr = nodes.new('ShaderNodeMapRange')
    mr.inputs['From Min'].default_value = d0
    mr.inputs['From Max'].default_value = d1
    links.new(dist.outputs['Value'], mr.inputs['Value'])
    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.interpolation = 'EASE'
    ramp.color_ramp.elements[0].color = near
    ramp.color_ramp.elements[1].color = far
    links.new(mr.outputs[0], ramp.inputs['Fac'])
    em = nodes.new('ShaderNodeEmission')
    links.new(ramp.outputs[0], em.inputs['Color'])
    em.inputs['Strength'].default_value = strength
    tp = nodes.new('ShaderNodeBsdfTransparent')
    tp.inputs['Color'].default_value = (1, 0.8, 0.55, 1)
    mix = nodes.new('ShaderNodeMixShader')
    mix.inputs[0].default_value = tr
    links.new(em.outputs[0], mix.inputs[1])
    links.new(tp.outputs[0], mix.inputs[2])
    links.new(mix.outputs[0], out.inputs['Surface'])
    return m

def haze_material(name, color, strength, power=3.0):
    """Fake air glow: an additive ball that is brightest through its middle and fades to nothing at its limb."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nodes, links = nt.nodes, nt.links
    for n in list(nodes):
        nodes.remove(n)
    out = nodes.new('ShaderNodeOutputMaterial')
    lw = nodes.new('ShaderNodeLayerWeight')
    lw.inputs[0].default_value = 0.5
    inv = nodes.new('ShaderNodeMath')
    inv.operation = 'SUBTRACT'
    inv.inputs[0].default_value = 1
    links.new(lw.outputs['Facing'], inv.inputs[1])
    pw = nodes.new('ShaderNodeMath')
    pw.operation = 'POWER'
    pw.inputs[1].default_value = power
    links.new(inv.outputs[0], pw.inputs[0])
    mul = nodes.new('ShaderNodeMath')
    mul.operation = 'MULTIPLY'
    mul.inputs[1].default_value = strength
    links.new(pw.outputs[0], mul.inputs[0])
    em = nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = color
    links.new(mul.outputs[0], em.inputs['Strength'])
    tp = nodes.new('ShaderNodeBsdfTransparent')
    add = nodes.new('ShaderNodeAddShader')
    links.new(em.outputs[0], add.inputs[0])
    links.new(tp.outputs[0], add.inputs[1])
    links.new(add.outputs[0], out.inputs['Surface'])
    return m

BRASS = brass_material()
DARK = brass_material('dark brass', base='#b98b42', rough=0.2)
PINK = hx('#fa2a6f')
GLASS_PINK = glow_material('pink glass', (1.0, 0.1, 0.34, 1), (1.0, 0.03, 0.2, 1), float(os.environ.get('PGLOW', 0.85)), d0=6, d1=12, tr=0.04)
GLASS_CLEAR = glass_material('clear glass', (1.0, 0.86, 0.62, 1), (1.0, 0.62, 0.3, 1), tr=0.96)
GLASS_LINER = glow_material('liner glass', (1.0, 0.66, 0.18, 1), (1.0, 0.36, 0.05, 1), float(os.environ.get('GLOW', 0.84)))
GLASS_BACK = glow_material('back glass', (1.0, 0.54, 0.1, 1), (0.2, 0.035, 0.004, 1), float(os.environ.get('BACK', 0.8)), d0=7.2, d1=12.5)
def flame_material(name, core, edge, strength, alpha_power=1.6):
    """A soft flame: hot through its middle, orange at the limb, fading out at the very edge."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nodes, links = nt.nodes, nt.links
    for n in list(nodes):
        nodes.remove(n)
    out = nodes.new('ShaderNodeOutputMaterial')
    lw = nodes.new('ShaderNodeLayerWeight')
    lw.inputs[0].default_value = 0.5
    inv = nodes.new('ShaderNodeMath')
    inv.operation = 'SUBTRACT'
    inv.inputs[0].default_value = 1
    links.new(lw.outputs['Facing'], inv.inputs[1])
    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.15
    ramp.color_ramp.elements[0].color = edge
    ramp.color_ramp.elements[1].position = 0.9
    ramp.color_ramp.elements[1].color = core
    links.new(inv.outputs[0], ramp.inputs['Fac'])
    em = nodes.new('ShaderNodeEmission')
    links.new(ramp.outputs[0], em.inputs['Color'])
    em.inputs['Strength'].default_value = strength
    pw = nodes.new('ShaderNodeMath')
    pw.operation = 'POWER'
    pw.inputs[1].default_value = alpha_power
    links.new(inv.outputs[0], pw.inputs[0])
    mix = nodes.new('ShaderNodeMixShader')
    links.new(pw.outputs[0], mix.inputs[0])
    tp = nodes.new('ShaderNodeBsdfTransparent')
    links.new(tp.outputs[0], mix.inputs[1])
    links.new(em.outputs[0], mix.inputs[2])
    links.new(mix.outputs[0], out.inputs['Surface'])
    return m
FLAME = flame_material('flame', (1.0, 0.72, 0.2, 1), (1.0, 0.36, 0.03, 1), float(os.environ.get('FLAMEA', 2.4)))
FLAME_CORE = flame_material('flame core', (1.0, 0.95, 0.72, 1), (1.0, 0.76, 0.28, 1), float(os.environ.get('FLAMEB', 4.5)), 0.8)

# ---------------------------------------------------------------- the lantern, top to bottom
T = 0.16   # sheet thickness

# The tiers as (apothem, z) profiles running from top to bottom.
DOME = smooth_profile([(0.75, 17.2), (1.0, 16.4), (1.9, 15.1), (4.1, 13.0), (7.0, 10.7), (8.9, 8.6), (9.5, 7.2)], 6)
BODY = [(9.0, 6.0), (7.6, -11.6)]
BOWL = smooth_profile([(7.55, -12.0), (7.0, -13.6), (5.3, -15.4), (3.3, -16.7), (1.7, -17.7)], 6)

def facet_halfwidth(r):
    return r * TAN

# ---- dome
dome_cut = []
def dome_row(z, count, R, kind='star', spread=0.8):
    r = interp_profile(DOME, z)
    hw = facet_halfwidth(r) * spread
    out = []
    for i in range(count):
        s = 0 if count == 1 else -hw + 2 * hw * i / (count - 1)
        if kind == 'star':
            out.append(star8(s, z, R))
        elif kind == 'star6':
            out.append(star8(s, z, R, inner=0.62, n=6, turn=math.pi / 2))
        elif kind == 'drop':
            out.append(teardrop(s, z, R))
        elif kind == 'dot':
            out.append(circle(s, z, R, 10))
    return out
dome_cut += dome_row(8.5, 5, 0.46, 'star', 0.82)
dome_cut += dome_row(9.75, 4, 0.40, 'star', 0.72)
dome_cut += dome_row(10.95, 3, 0.36, 'star', 0.60)
dome_cut += dome_row(12.1, 3, 0.26, 'star', 0.58)
dome_cut += dome_row(13.1, 2, 0.24, 'star', 0.42)
dome_cut += dome_row(14.1, 1, 0.26, 'drop')
dome_ob = lathe('dome', shell(DOME, T), closed=True, mats=[BRASS])
def dome_depth(s, z):
    r = interp_profile(DOME, z)
    return r - 1.2, r + 1.2
cut(dome_ob, cutters('dome cut', dome_cut, dome_depth))
# Ribs along the dome's corners, a little proud of the sheet
def corner_rib(name, profile, half=0.17, proud=0.09):
    verts, faces = [], []
    for k in range(N):
        a = PHASE + 2 * math.pi * k / N
        base = len(verts)
        for r, z in profile:
            rr = (r + proud) / COS
            x, y = rr * math.sin(a), -rr * math.cos(a)
            ix, iy = (r - T) / COS * math.sin(a), -(r - T) / COS * math.cos(a)
            tx, ty = math.cos(a) * half, math.sin(a) * half
            verts += [(x - tx, y - ty, z), (x + tx, y + ty, z), (ix + tx, iy + ty, z), (ix - tx, iy - ty, z)]
        for j in range(len(profile) - 1):
            p = base + j * 4
            q = p + 4
            for e in range(4):
                e2 = (e + 1) % 4
                faces.append((p + e, q + e, q + e2, p + e2))
        faces.append((base, base + 1, base + 2, base + 3))
        q = base + (len(profile) - 1) * 4
        faces.append((q + 3, q + 2, q + 1, q))
    ob = add_mesh(name, verts, faces, [BRASS])
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(ob.data)
    bm.free()
    return ob
corner_rib('dome ribs', DOME[2:], 0.14, 0.08)

# ---- the crown: a band of stepped merlons sitting on the shoulder
crown_profile = [(9.65, 8.9), (9.5, 6.9)]
crown = lathe('crown', shell(crown_profile, T), closed=True, mats=[BRASS])
crown_cut = []
hw = facet_halfwidth(9.6)
step = 2 * hw / 3
for i in range(3):
    s = -hw + step * (i + 0.5)
    # the gap between merlons at the top edge
    if i < 3:
        gx = s + step / 2
    for g in ([-hw] if i == 0 else []) + [gx]:
        w0, w1, w2 = 0.34 * step, 0.24 * step, 0.14 * step
        crown_cut.append([(g - w2, 7.95), (g + w2, 7.95), (g + w2, 8.25), (g + w1, 8.25), (g + w1, 8.6), (g + w0, 8.6), (g + w0, 9.6), (g - w0, 9.6), (g - w0, 8.6), (g - w1, 8.6), (g - w1, 8.25), (g - w2, 8.25)])
    crown_cut.append(teardrop(s, 7.5, 0.2))
def crown_depth(s, z):
    return 8.8, 10.4
cut(crown, cutters('crown cut', crown_cut, crown_depth))

# ---- body facets
# The three facets the viewer sees carry a window, so the flame shows. The five that face the wall are drawn as a gobo:
# what matters there is the picture they throw, read through the flame.
FRONT = (7, 0, 1)
WALLWARD = (2, 3, 4, 5, 6)
BODY_T = 0.2
body = lathe('body', shell(BODY, BODY_T), closed=True, mats=[BRASS])
def body_r(z):
    return interp_profile(BODY, z)
def body_scale(z):
    return facet_halfwidth(body_r(z)) / facet_halfwidth(body_r(-3))
def on_body(poly):
    # the pattern is drawn at the facet's middle width and tapers with the sheet, as hand-cut lattice does
    return [(p[0] * body_scale(p[1]), p[1]) for p in poly]
body_cut = []
a = 1.86                     # lattice spacing
wire = 0.095                 # half the width of the lattice bar
# Upper field, the star and cross lattice: 3 stars across, 3 rows.
STAR_ROWS = [4.05, 4.05 - a, 4.05 - 2 * a]
pink_stars = []
for rz, row in enumerate(STAR_ROWS):
    for col in (-1, 0, 1):
        sx, sz = col * a, row
        st = inset(star8(sx, sz, a * 0.5), wire)
        if col == 0 and rz == 1:
            pink_stars.append(on_body(inset(star8(sx, sz, a * 0.5), wire * 0.5)))
        body_cut.append(on_body(st))
for rz in range(len(STAR_ROWS) - 1):
    for col in (-0.5, 0.5):
        body_cut.append(on_body(inset(cross_between(col * a, STAR_ROWS[rz] - a / 2, a), wire)))
# Lower field: an arched clear window with slim mullions.
ARCH_TOP = STAR_ROWS[-1] - a * 0.62
ARCH_BOT = -10.55
def arch(hw, z_spring, z_top, z_bot, n=14, cx=0.0):
    pts = [(cx - hw, z_bot), (cx + hw, z_bot)]
    # A pointed arch made from two circular arcs that meet at the crown
    rise = z_top - z_spring
    R = (hw * hw + rise * rise) / (2 * hw)
    ang1 = math.atan2(rise, R - hw)
    for i in range(n + 1):
        a_ = ang1 * i / n
        pts.append((cx + hw - R + R * math.cos(a_), z_spring + R * math.sin(a_)))
    for i in range(1, n + 1):
        a_ = ang1 - ang1 * i / n
        pts.append((cx - (hw - R + R * math.cos(a_)), z_spring + R * math.sin(a_)))
    return pts
ARCH_HW = 2.38
SPRING = ARCH_TOP - 1.9
win = arch(ARCH_HW, SPRING, ARCH_TOP, ARCH_BOT)
body_cut.append(on_body(win))
def body_depth(s, z):
    r = body_r(z)
    return r - 1.0, r + 1.0
cut(body, cutters('body cut', body_cut, body_depth, FRONT))

# ---- the wall's picture, facet by facet
# The flame is at FLAME_Z, and each centimetre on the sheet is a few degrees on the wall. From the top of the lower field up:
# an arcade of light (the pool the sea sails in), a frieze of star and cross, then a sky of scattered stars and one crescent.
ARC_TIP = FLAME_Z - 1.9      # the arch tips sit about 13 degrees below the flame
ARC_SPRING = ARC_TIP - 1.15
ARC_BOT = -10.9
FRIEZE_Z = ARC_TIP + 1.0
FRIEZE_A = 1.14
SKY_BOTTOM = FRIEZE_Z + 1.2
SKY_TOP = 5.3
wall_pink = {}
def stars_for(k):
    rng = random.Random(40 + k * 7)
    out = []
    pink = []
    hw = 2.92
    placed = []
    # The frieze: one row of stars with crosses between them, then a line of drops above
    cols = [-2, -1, 0, 1, 2]
    for c_ in cols:
        out.append(on_body(inset(star8(c_ * FRIEZE_A, FRIEZE_Z, FRIEZE_A * 0.5), 0.05)))
    for c_ in cols[:-1]:
        # half crosses tucked above and below would be fussy on the wall, so use small diamonds
        out.append(on_body(diamond((c_ + 0.5) * FRIEZE_A, FRIEZE_Z + 0.42, 0.19, 0.17)))
        out.append(on_body(diamond((c_ + 0.5) * FRIEZE_A, FRIEZE_Z - 0.42, 0.19, 0.17)))
    # Reserved spots first: the moon and the pink stars. Cutters must never overlap, or the boolean fails.
    moon_spot = (-1.55, 1.9) if k == 5 else None
    pink_spots = {4: [(1.7, 3.0)], 5: [(-0.8, -1.9)]}.get(k, [])
    if moon_spot:
        placed.append((moon_spot[0], moon_spot[1], 1.3))
    for x, z in pink_spots:
        placed.append((x, z, 0.72))
    reserved = len(placed)
    # The sky: poisson-ish scatter, larger stars low, tiny ones high, never regular
    tries = 0
    while tries < 900 and len(placed) < 28 + reserved:
        tries += 1
        x = rng.uniform(-hw, hw)
        z = rng.uniform(SKY_BOTTOM, SKY_TOP)
        h = (z - SKY_BOTTOM) / (SKY_TOP - SKY_BOTTOM)
        R = rng.choice((0.14, 0.17, 0.2, 0.24, 0.3, 0.38, 0.5)) * (1.0 - 0.28 * h)
        if any(math.hypot(x - q[0], z - q[1]) < (R + q[2]) * 1.5 + 0.28 for q in placed):
            continue
        if abs(x) + R > hw:
            continue
        placed.append((x, z, R))
    for x, z, R in placed[reserved:]:
        out.append(on_body(star8(x, z, R, inner=0.56 if R < 0.26 else 0.7654, turn=rng.uniform(0, 0.8))))
    # A crescent on the facet to one side of the wall: it is the moon in this sky
    if k == 5:
        Rm, cx, cz = 1.2, moon_spot[0], moon_spot[1]
        pts = []
        n = 26
        for i in range(n + 1):
            t = -math.pi * 0.72 + math.pi * 1.44 * i / n
            pts.append((cx + Rm * math.cos(t), cz + Rm * math.sin(t)))
        Rin = Rm * 0.82
        # the inner arc runs back between the same two horns
        hx, hz = pts[-1][0] - cx, pts[-1][1] - cz
        ox = hx - math.sqrt(max(0.0, Rin * Rin - hz * hz))
        a0 = math.atan2(hz, hx - ox)
        for i in range(1, n):
            t = a0 - 2 * a0 * i / n
            pts.append((cx + ox + Rin * math.cos(t), cz + Rin * math.sin(t)))
        out.append(on_body(pts))
    # Pink stars: the accent, a few of them only, set with glass
    for x, z in pink_spots:
        out.append(on_body(star8(x, z, 0.62)))
        pink.append(on_body(star8(x + 0.0, z, 0.72)))
    # The arcade: three arches on each facet
    n_arch = 3
    aw = 2 * 3.02 / n_arch
    for i in range(n_arch):
        cx = -3.02 + aw * (i + 0.5)
        out.append(on_body(arch(aw * 0.5 - 0.09, ARC_SPRING, ARC_TIP, ARC_BOT, 10, cx)))
    return out, pink

all_pink_wall = []
for k_ in WALLWARD:
    shapes, pink_ = stars_for(k_)
    cut(body, cutters(f'wall cut {k_}', shapes, body_depth, (k_,)))
    wall_pink[k_] = pink_

# The window's mullions: a slim bar frame set in the arch, in the sheet's own plane
def facet_mesh(name, polys, depth=0.14, mats=(BRASS,), r_offset=0.0, facets=range(N), rfn=body_r):
    """Flat 2D polygons laid on the facet, extruded inward."""
    verts, faces = [], []
    for k in facets:
        ang = 2 * math.pi * k / N
        c, s_ = math.cos(ang), math.sin(ang)
        def place(s, r, z):
            x0, y0 = s, -r
            return (x0 * c - y0 * s_, x0 * s_ + y0 * c, z)
        for poly in polys:
            b = len(verts)
            n = len(poly)
            for p in poly:
                r = rfn(p[1]) + r_offset
                verts.append(place(p[0], r, p[1]))
                verts.append(place(p[0], r - depth, p[1]))
            faces.append(tuple(b + 2 * i for i in range(n)))
            faces.append(tuple(b + 2 * (n - 1 - i) + 1 for i in range(n)))
            for i in range(n):
                i2 = (i + 1) % n
                faces.append((b + 2 * i, b + 2 * i + 1, b + 2 * i2 + 1, b + 2 * i2))
    ob = add_mesh(name, verts, faces, list(mats))
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(ob.data)
    bm.free()
    return ob

def bar(x0, z0, x1, z1, w):
    dx, dz = x1 - x0, z1 - z0
    l = math.hypot(dx, dz) or 1
    nx, nz = -dz / l * w, dx / l * w
    return [(x0 + nx, z0 + nz), (x1 + nx, z1 + nz), (x1 - nx, z1 - nz), (x0 - nx, z0 - nz)]
mull = []
# Three thin uprights springing into a pair of crossing arcs, as in a mashrabiya window
sc0 = body_scale(ARCH_BOT)
for s in (-ARCH_HW * 0.5, ARCH_HW * 0.5):
    mull.append(on_body(bar(s, ARCH_BOT - 0.1, s, SPRING + 0.1, 0.06)))
for z in (ARCH_BOT + 2.9, ):
    mull.append(on_body(bar(-ARCH_HW - 0.1, z, ARCH_HW + 0.1, z, 0.055)))
top_z = SPRING + 0.05
mull.append(on_body(bar(-ARCH_HW - 0.1, top_z, ARCH_HW + 0.1, top_z, 0.06)))
facet_mesh('mullions', mull, 0.1, facets=FRONT)

# Raised lines on the solid sheet: they catch light and make the sheet look worked by hand
def outline(poly, w):
    out = []
    n = len(poly)
    for i in range(n):
        x0, z0 = poly[i]
        x1, z1 = poly[(i + 1) % n]
        out.append(bar(x0, z0, x1, z1, w))
    return out
frame_hw, frame_top, frame_bot = 2.98, 5.36, ARCH_BOT - 0.5
lines = outline([(-frame_hw, frame_top), (frame_hw, frame_top), (frame_hw, frame_bot), (-frame_hw, frame_bot)], 0.05)
facet_mesh('raised lines', [on_body(p) for p in lines], 0.2, r_offset=0.06)
lines2 = outline(arch(ARCH_HW + 0.2, SPRING, ARCH_TOP + 0.24, ARCH_BOT - 0.2), 0.05)
facet_mesh('raised arch', [on_body(p) for p in lines2], 0.2, r_offset=0.06, facets=FRONT)
rivets = []
for (x, z) in [(-frame_hw, frame_top), (frame_hw, frame_top), (-frame_hw, frame_bot), (frame_hw, frame_bot)]:
    rivets.append(circle(x * 0.93, z - 0.28 if z > 0 else z + 0.28, 0.13, 10))
facet_mesh('rivets', [on_body(p) for p in rivets], 0.2, r_offset=0.1)

# Pink stars, set like jewels at the lattice's heart: a sheet of pink glass just inside each facet
pink = []
for poly in pink_stars:
    pink.append(poly)
facet_mesh('pink glass', pink, 0.03, [GLASS_PINK], r_offset=-BODY_T - 0.02, facets=FRONT)
for k_, polys in wall_pink.items():
    if polys:
        facet_mesh(f'pink glass {k_}', polys, 0.03, [GLASS_PINK], r_offset=-BODY_T - 0.02, facets=(k_,))


# Clear glass liner behind the arched windows
glass_faces = [on_body(arch(ARCH_HW + 0.1, SPRING, ARCH_TOP + 0.1, ARCH_BOT - 0.1))]
facet_mesh('window glass', glass_faces, 0.02, [GLASS_CLEAR], r_offset=-BODY_T - 0.08, facets=FRONT)

# Frosted amber liner behind the lattice: what you see through the piercing is lit glass, not the far wall
lathe('liner', [(body_r(z) - 0.42, z) for z in (5.95, ARCH_TOP + 0.05)], cap=False, mats=[GLASS_LINER])
lathe('dome liner', [(r - 0.5, z) for r, z in DOME[6:]], cap=False, mats=[GLASS_LINER])
lathe('bowl liner', [(max(0.2, r - 0.4), z) for r, z in BOWL[:-4]], cap=False, mats=[GLASS_LINER])

# The far side of the interior is frosted too, so the flame stands against lit glass rather than a view through to the wall.
back = [[(-3.5, 5.9), (3.5, 5.9), (3.5, -11.6), (-3.5, -11.6)]]
facet_mesh('back liner', [on_body(q) for q in back], 0.02, [GLASS_BACK], r_offset=-0.5, facets=(3, 4, 5))

# ---- collars: moulded octagonal rings between the tiers
def collar(name, z, r, h, proud):
    prof = smooth_profile([(r - 0.25, z + h), (r + proud * 0.5, z + h * 0.72), (r + proud, z), (r + proud * 0.5, z - h * 0.72), (r - 0.25, z - h)], 3)
    return lathe(name, prof, closed=True, mats=[BRASS])
collar('collar shoulder', 6.72, 9.25, 0.42, 0.5)
collar('collar shoulder 2', 5.95, 9.0, 0.18, 0.18)
collar('collar waist', -11.8, 7.5, 0.4, 0.46)
collar('collar waist 2', -11.2, 7.72, 0.14, 0.12)
collar('collar top', 15.5, 1.8, 0.28, 0.32)

# ---- corner bars down the body
corner_rib('body ribs', BODY, 0.2, 0.1)

# ---- bowl
bowl_cut = []
def bowl_row(z, count, R, kind='drop', spread=0.78, ang=-math.pi / 2):
    r = interp_profile(BOWL, z)
    hw = facet_halfwidth(r) * spread
    out = []
    for i in range(count):
        s = 0 if count == 1 else -hw + 2 * hw * i / (count - 1)
        if kind == 'drop':
            out.append(teardrop(s, z, R, ang))
        elif kind == 'star':
            out.append(star8(s, z, R))
        else:
            out.append(circle(s, z, R, 10))
    return out
bowl_cut += bowl_row(-13.15, 5, 0.3, 'drop', 0.8)
bowl_cut += bowl_row(-14.35, 4, 0.26, 'drop', 0.68)
bowl_cut += bowl_row(-15.5, 3, 0.2, 'star', 0.6)
bowl_wall = []
bowl_wall += bowl_row(-13.3, 4, 0.58, 'drop', 0.72)
bowl_wall += bowl_row(-15.0, 3, 0.46, 'drop', 0.6)
bowl_wall += bowl_row(-16.25, 2, 0.26, 'drop', 0.5)
bowl_ob = lathe('bowl', shell(BOWL, T), closed=True, mats=[BRASS])
def bowl_depth(s, z):
    r = interp_profile(BOWL, z)
    return r - 1.2, r + 1.2
cut(bowl_ob, cutters('bowl cut', bowl_cut, bowl_depth, FRONT))
cut(bowl_ob, cutters('bowl wall cut', bowl_wall, bowl_depth, WALLWARD))
corner_rib('bowl ribs', BOWL, 0.13, 0.07)

# ---- finials, turned round
def turned(name, pts, z0=0, sub=4):
    prof = smooth_profile(pts, sub)
    prof = [(max(0.001, r), z + z0) for r, z in prof]
    return lathe(name, prof, sides=48, mats=[BRASS], smooth=True)
turned('finial top', [(0.25, 22.4), (0.42, 21.9), (0.3, 21.3), (0.42, 20.9), (0.82, 20.0), (0.42, 19.2), (0.62, 18.8), (0.42, 18.3), (0.78, 17.8), (1.0, 17.2), (0.7, 16.8)])
turned('finial bottom', [(1.8, -17.6), (1.42, -18.0), (0.62, -18.5), (0.42, -18.9), (0.86, -19.6), (0.9, -20.2), (0.4, -21.0), (0.34, -21.5), (0.54, -21.95), (0.25, -22.5), (0.02, -23.0)])

# ---- hanging ring
bpy.ops.mesh.primitive_torus_add(major_radius=1.15, minor_radius=0.2, major_segments=48, minor_segments=14, location=(0, 0, 23.35), rotation=(math.pi / 2, 0, 0))
ring = bpy.context.active_object
ring.name = 'ring'
ring.parent = root
ring.data.materials.append(BRASS)
ring.data.shade_smooth()

# ---- the oil cup and flame inside
turned('cup', [(0.5, -7.0), (2.1, -7.2), (2.3, -8.2), (1.5, -9.2), (0.42, -9.6), (0.36, -10.8), (2.1, -11.4), (2.3, -11.9)])
turned('wick', [(0.1, -4.75), (0.13, -5.6), (0.17, -6.2), (0.22, -7.1)])
wick = bpy.data.objects['wick']
def flame_mesh(name, scale, mat):
    prof = [(0.001, 2.0), (0.06, 1.55), (0.17, 1.1), (0.31, 0.62), (0.40, 0.25), (0.40, -0.02), (0.30, -0.3), (0.15, -0.46), (0.001, -0.52)]
    prof = smooth_profile(prof, 4)
    # scaled about the flame's root, so the core sits low inside it
    prof = [(max(0.001, r * scale), (z + 0.52) * scale - 0.52 + FLAME_Z - 1.0) for r, z in prof]
    return lathe(name, prof, sides=32, mats=[mat], smooth=True)
flame_outer = flame_mesh('flame', 1.0, FLAME)
flame_inner = flame_mesh('flame core', 0.62, FLAME_CORE)

for o in (bpy.data.objects['wick'],):
    o.data.materials[0] = emission_material('wick', (0.01, 0.006, 0.003, 1), 1)
bpy.data.objects['cup'].data.materials[0] = DARK
bpy.ops.mesh.primitive_uv_sphere_add(radius=6.6, location=(0, 0, FLAME_Z - 0.8), segments=48, ring_count=32)
haze = bpy.context.active_object
haze.name = 'haze'
haze.parent = root
haze.data.shade_smooth()
haze.data.materials.append(haze_material('haze', (1.0, 0.5, 0.16, 1), float(os.environ.get('HAZE', 0.3)), 2.5))

# The flame's own light. Warm, slightly larger than the flame so edges aren't razor sharp inside.
ld = bpy.data.lights.new('flame light', 'POINT')
ld.energy = float(os.environ.get('FL', 900))
ld.color = (1.0, 0.62, 0.3)
ld.shadow_soft_size = 0.35
flame_light = bpy.data.objects.new('flame light', ld)
scene.collection.objects.link(flame_light)
flame_light.parent = root
flame_light.location = (0, 0, FLAME_Z + 0.8)

# ---------------------------------------------------------------- camera and the room
cam_d = bpy.data.cameras.new('cam')
cam = bpy.data.objects.new('cam', cam_d)
scene.collection.objects.link(cam)
scene.camera = cam

world = bpy.data.worlds.new('room')
scene.world = world
world.use_nodes = True
wn = world.node_tree
for n in list(wn.nodes):
    wn.nodes.remove(n)
wo = wn.nodes.new('ShaderNodeOutputWorld')
bg = wn.nodes.new('ShaderNodeBackground')
wn.links.new(bg.outputs[0], wo.inputs['Surface'])

def set_room():
    """A dusk room: dark teal overhead, warm lamplit wall behind, a low warm card in front so brass reads as brass."""
    tc = wn.nodes.new('ShaderNodeTexCoord')
    sep = wn.nodes.new('ShaderNodeSeparateXYZ')
    wn.links.new(tc.outputs['Generated'], sep.inputs[0])
    # Behind the lantern (+Y) the wall is lit gold; toward the camera the room falls into teal dusk.
    back = wn.nodes.new('ShaderNodeValToRGB')
    back.color_ramp.elements[0].position = 0.28
    back.color_ramp.elements[0].color = (0.006, 0.03, 0.032, 1)
    back.color_ramp.elements[1].position = 0.84
    back.color_ramp.elements[1].color = (0.72, 0.42, 0.18, 1)
    mr = wn.nodes.new('ShaderNodeMapRange')
    mr.inputs['From Min'].default_value = -1
    mr.inputs['From Max'].default_value = 1
    wn.links.new(sep.outputs['Y'], mr.inputs['Value'])
    wn.links.new(mr.outputs[0], back.inputs['Fac'])
    wn.links.new(back.outputs[0], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = 1.0

def card(name, loc, size, color, strength, look_at=(0, 0, 0)):
    me = bpy.data.meshes.new(name)
    sx, sy = size
    me.from_pydata([(-sx, -sy, 0), (sx, -sy, 0), (sx, sy, 0), (-sx, sy, 0)], [], [(0, 1, 2, 3)])
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    ob.location = loc
    d = Vector(look_at) - Vector(loc)
    ob.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    m = emission_material(name, color, strength)
    me.materials.append(m)
    ob.visible_camera = False
    return ob

# ---------------------------------------------------------------- render setup
pr = bpy.context.preferences.addons['cycles'].preferences
pr.compute_device_type = 'METAL'
pr.get_devices()
for d in pr.devices:
    d.use = d.type == 'METAL'
try:
    pr.metalrt = 'ON'
except Exception:
    pass
c = scene.cycles
scene.render.engine = 'CYCLES'
c.device = 'GPU'
c.samples = SPP
c.use_adaptive_sampling = True
c.adaptive_threshold = 0.01
c.use_denoising = True
c.denoiser = 'OPENIMAGEDENOISE'
c.denoising_input_passes = 'RGB_ALBEDO_NORMAL'
c.denoising_prefilter = 'ACCURATE'
c.max_bounces, c.diffuse_bounces, c.glossy_bounces, c.transmission_bounces, c.volume_bounces, c.transparent_max_bounces = 8, 3, 4, 2, 0, 16
c.sample_clamp_indirect = 8.0
c.caustics_reflective = c.caustics_refractive = False
scene.render.use_persistent_data = True
scene.render.resolution_x, scene.render.resolution_y = W, H
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.image_settings.compression = 40
scene.view_settings.view_transform = os.environ.get('VT', 'Khronos PBR Neutral')
scene.view_settings.look = 'None'
scene.view_settings.exposure = 0

def setup_beauty():
    set_room()
    # A broad warm card low in front: the room's lamplight bouncing back onto the viewer-side facets.
    card('front warm', (-52, -64, 10), (9, 42), (1.0, 0.8, 0.58, 1), float(os.environ.get('K1', 2.2)))
    card('front low', (12, -60, -46), (30, 12), (1.0, 0.68, 0.4, 1), float(os.environ.get('K2', 0.7)))
    card('front haze', (6, -90, 30), (60, 30), (0.55, 0.5, 0.42, 1), float(os.environ.get('K3', 0.16)))
    # A narrow cool slip on the right to separate the far edge from the wall
    card('teal slip', (58, -34, 20), (6, 40), (0.3, 0.75, 0.74, 1), 6)
    # Top light: dusk from above catches the dome's ribs
    card('top', (10, -24, 70), (28, 28), (0.7, 0.86, 0.9, 1), 1.5)
    cam_d.type = 'PERSP'
    cam_d.lens = 110
    cam_d.sensor_width = 36
    # A little below the lantern, looking up, so it hangs above you with weight
    cam.location = (0, -170, -22)
    d = Vector((0, 0, 0.4)) - cam.location
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    # Fit the lantern's 50cm height to the frame
    cam_d.sensor_fit = 'VERTICAL'
    cam_d.sensor_height = 36 * (54 / (cam.location - Vector((0, 0, 0.4))).length) * (110 / 36)
    scene.render.film_transparent = True

def project(p):
    from bpy_extras.object_utils import world_to_camera_view
    bpy.context.view_layer.update()
    co = world_to_camera_view(scene, cam, Vector(p))
    return (co.x * W, (1 - co.y) * H)

def render(path):
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)

if MODE in ('still', 'frames'):
    setup_beauty()
    meta = {'w': W, 'h': H, 'range': RANGE, 'frames': FRAMES}
    meta['flame'] = project((0, 0, FLAME_Z))
    meta['ring'] = project((0, 0, 24.3))
    meta['pxPerCm'] = abs(project((0, 0, 10))[1] - project((0, 0, 0))[1]) / 10
    with open(os.path.join(OUT, 'lantern.json'), 'w') as f:
        json.dump(meta, f)
    print('META', meta)
    if MODE == 'still':
        root.rotation_euler = (0, 0, math.radians(YAW))
        render(os.path.join(OUT, 'still.png'))
    else:
        for i in range(FRAMES):
            t = -1 + 2 * i / (FRAMES - 1) if FRAMES > 1 else 0
            root.rotation_euler = (0, 0, math.radians(RANGE * t))
            path = os.path.join(OUT, f'f{i}.png')
            if os.path.exists(path):
                continue
            render(path)

if MODE == 'chain':
    # Two links, one seen flat and one on edge, lit from below by the lantern and from above by the dusk.
    for o in list(bpy.data.objects):
        if o.name not in ('cam',) and o.type in ('MESH', 'LIGHT', 'EMPTY'):
            bpy.data.objects.remove(o)
    setup_beauty()
    cam_d.type = 'ORTHO'
    cam.location = (0, -60, 0)
    cam.rotation_euler = (math.pi / 2, 0, 0)
    cam_d.ortho_scale = 4.4       # the page draws the link 4.4cm tall
    scene.render.resolution_x, scene.render.resolution_y = W, H
    def make_link(flat):
        L, Wd, tube = 1.32, 0.68, 0.2     # half length, half width, wire radius
        pts = []
        n = 40
        for i in range(n):
            t = 2 * math.pi * i / n
            # A stadium, the shape of a real chain link
            x = Wd * math.cos(t)
            z = (L - Wd) * (1 if math.sin(t) >= 0 else -1) + Wd * math.sin(t)
            pts.append(Vector((x, 0, z)))
        verts, faces = [], []
        m = 16
        for i, p_ in enumerate(pts):
            prev, nxt = pts[i - 1], pts[(i + 1) % n]
            tan = (nxt - prev).normalized()
            nor = tan.cross(Vector((0, 1, 0))).normalized()
            for j in range(m):
                a = 2 * math.pi * j / m
                verts.append(tuple(p_ + nor * math.cos(a) * tube + Vector((0, 1, 0)) * math.sin(a) * tube))
        for i in range(n):
            for j in range(m):
                i2, j2 = (i + 1) % n, (j + 1) % m
                faces.append((i * m + j, i2 * m + j, i2 * m + j2, i * m + j2))
        ob = add_mesh('link', verts, faces, [BRASS], smooth=True, parent=None)
        if not flat:
            ob.rotation_euler = (0, 0, math.radians(82))
        return ob
    bl = bpy.data.lights.new('below', 'POINT')
    bl.energy = 900
    bl.color = (1.0, 0.62, 0.3)
    bo = bpy.data.objects.new('below', bl)
    scene.collection.objects.link(bo)
    bo.location = (0, -6, -16)
    for i, flat in enumerate((True, False)):
        ob = make_link(flat)
        render(os.path.join(OUT, f'link{i}.png'))
        bpy.data.objects.remove(ob)

if MODE == 'mask':
    # What the flame sees. Only the piercing and the glass matter, so everything opaque goes black and the world is white.
    for o in list(bpy.data.objects):
        if o.name in ('flame', 'flame core', 'flame light', 'wick', 'haze', 'cup'):
            bpy.data.objects.remove(o)
    black = emission_material('black', (0, 0, 0, 1), 0)
    tint_pink = bpy.data.materials.new('pink tint')
    tint_pink.use_nodes = True
    n = tint_pink.node_tree.nodes
    for x in list(n):
        n.remove(x)
    o_ = n.new('ShaderNodeOutputMaterial')
    tb = n.new('ShaderNodeBsdfTransparent')
    tb.inputs['Color'].default_value = (1.0, 0.09, 0.27, 1)
    tint_pink.node_tree.links.new(tb.outputs[0], o_.inputs['Surface'])
    clear_tint = bpy.data.materials.new('clear tint')
    clear_tint.use_nodes = True
    n = clear_tint.node_tree.nodes
    for x in list(n):
        n.remove(x)
    o_ = n.new('ShaderNodeOutputMaterial')
    tb = n.new('ShaderNodeBsdfTransparent')
    tb.inputs['Color'].default_value = (1, 1, 1, 1)
    clear_tint.node_tree.links.new(tb.outputs[0], o_.inputs['Surface'])
    for o in bpy.data.objects:
        if o.type != 'MESH':
            continue
        if o.name.startswith('pink glass'):
            o.data.materials[0] = tint_pink
        elif o.name in ('window glass', 'liner', 'dome liner', 'bowl liner', 'back liner'):
            o.data.materials[0] = clear_tint
        else:
            for i in range(len(o.data.materials)):
                o.data.materials[i] = black
    bg.inputs['Color'].default_value = (1, 1, 1, 1)
    bg.inputs['Strength'].default_value = 1
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = 'RGB'
    scene.view_settings.view_transform = 'Raw'
    scene.view_settings.look = 'None'
    c.use_denoising = False
    c.use_adaptive_sampling = False
    c.samples = SPP
    c.max_bounces = 32
    c.transparent_max_bounces = 32
    scene.render.filter_size = 1.2
    cam_d.type = 'PANO'
    cam_d.panorama_type = 'EQUIRECTANGULAR'
    LAT = 82
    LON = 110
    cam_d.latitude_min = math.radians(-LAT)
    cam_d.latitude_max = math.radians(LAT)
    cam_d.longitude_min = math.radians(-LON)
    cam_d.longitude_max = math.radians(LON)
    cam.location = (0, 0, FLAME_Z)
    # The panorama's centre looks at the wall (+Y). Z stays up.
    cam.rotation_euler = (math.pi / 2, 0, 0)
    render(os.path.join(OUT, 'mask.png'))
    with open(os.path.join(OUT, 'mask.json'), 'w') as f:
        json.dump({'lat': LAT, 'lon': LON, 'w': W, 'h': H, 'flameCm': FLAME_Z}, f)

print('DONE')
