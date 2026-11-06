# The still life: a battered low-cost Android lying on an old teak table in late sun through a mashrabiya, with a glass of tea.
# Imported by the render scripts, and it can draft a still by itself:
#   WORK=<dir> OUT=<png> W=960 H=600 SPP=48 Blender -b --factory-startup -P scene.py
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from mathutils import Vector, Matrix, Euler
from common import *
import geometry as G

PHONE_YAW = math.radians(-34)
SUN_DIR = Vector((-0.52, 0.80, 0.50)).normalized()     # toward the sun: behind the phone and to the left, low


# ------------------------------------------------------------------------------------------------------------- materials
def mat_wood(name='Teak', raft=False):
    m = material(name)
    n = N(m)
    tc = n('TexCoord')
    sep = n('SeparateXYZ')
    n.link(tc.outputs['Object'], sep.inputs[0])
    x, y = sep.outputs['X'], sep.outputs['Y']
    W_PLANK = 15.0
    u = n.math('DIVIDE', x, W_PLANK)
    pid = n.math('FLOOR', u)
    fr = n.math('SUBTRACT', u, pid)
    rnd = n('TexWhiteNoise', noise_dimensions='1D')
    n.link(pid, rnd.inputs['W'])
    r_val = rnd.outputs['Value']
    # the butt joints: each plank has its own length and offset
    v_off = n.math('MULTIPLY', r_val, 61.0)
    yy = n.math('ADD', y, v_off)
    vv = n.math('DIVIDE', yy, 96.0)
    seg = n.math('FLOOR', vv)
    frv = n.math('SUBTRACT', vv, seg)
    # grain coordinates, stretched along the plank, each plank (and piece) its own cut of the tree
    rnd2 = n('TexWhiteNoise', noise_dimensions='2D')
    cc = n('CombineXYZ')
    n.link(pid, cc.inputs['X'])
    n.link(seg, cc.inputs['Y'])
    n.link(cc.outputs[0], rnd2.inputs['Vector'])
    r2 = rnd2.outputs['Value']
    gx = n.math('ADD', x, n.math('MULTIPLY', r2, 47.0))
    gy = n.math('ADD', n.math('MULTIPLY', yy, 0.085), n.math('MULTIPLY', r2, 91.0))
    g = n('CombineXYZ')
    n.link(gx, g.inputs['X'])
    n.link(gy, g.inputs['Y'])
    n.link(n.math('MULTIPLY', r_val, 13.0), g.inputs['Z'])
    gv = g.outputs[0]
    # cathedral figure: rings pushed about by a slow noise
    warp = n('TexNoise', noise_dimensions='3D', inputs={'Scale': 0.32, 'Detail': 3.0, 'Roughness': 0.45})
    n.link(gv, warp.inputs['Vector'])
    rings_in = n.math('ADD', n.math('MULTIPLY', gx, 0.95), n.math('MULTIPLY', warp.outputs['Fac'], 7.0))
        # a plain sine would look printed; use a saw through a ramp, late wood darker and sharper
    ring_v = n.math('FRACT', n.math('MULTIPLY', rings_in, 0.62))
    ring_c = n.ramp(ring_v, [(0.0, (0.0, 0, 0, 1)), (0.72, (0.42, 0.42, 0.42, 1)), (0.93, (1, 1, 1, 1)), (1.0, (0.0, 0, 0, 1))])
    # pores, long and thin
    pcoord = n('Mapping', inputs={'Scale': (26.0, 1.1, 1.0)})
    n.link(gv, pcoord.inputs['Vector'])
    pores = n('TexNoise', inputs={'Scale': 1.0, 'Detail': 6.0, 'Roughness': 0.62})
    n.link(pcoord.outputs[0], pores.inputs['Vector'])
    pore_v = n.ramp(pores.outputs['Fac'], [(0.32, (1, 1, 1, 1)), (0.48, (0.5, 0.5, 0.5, 1)), (0.6, (0, 0, 0, 1))])
    fine = n('Mapping', inputs={'Scale': (9.0, 0.7, 1.0)})
    n.link(gv, fine.inputs['Vector'])
    fine_n = n('TexNoise', inputs={'Scale': 1.0, 'Detail': 3.0})
    n.link(fine.outputs[0], fine_n.inputs['Vector'])
    broad = n('Mapping', inputs={'Scale': (0.5, 0.6, 1.0)})
    n.link(gv, broad.inputs['Vector'])
    broad_n = n('TexNoise', inputs={'Scale': 0.16, 'Detail': 4.0})
    n.link(broad.outputs[0], broad_n.inputs['Vector'])
    # colour
    tone = n.math('ADD', n.math('MULTIPLY', ring_c, 0.17), n.math('MULTIPLY', pore_v, 0.17))
    tone = n.math('ADD', tone, n.math('MULTIPLY', n.math('SUBTRACT', fine_n.outputs['Fac'], 0.5), 0.3))
    tone = n.math('ADD', tone, n.math('MULTIPLY', n.math('SUBTRACT', broad_n.outputs['Fac'], 0.5), 1.0))
    tone = n.math('ADD', tone, n.math('MULTIPLY', n.math('SUBTRACT', r2, 0.5), 0.38))
    col = n.ramp(tone, [(0.0, '#c48a4e'), (0.3, '#a56c38'), (0.52, '#835025'), (0.78, '#5e3517'), (1.0, '#37200f')])
    # seams
    edge_u = n.math('MINIMUM', fr, n.math('SUBTRACT', 1.0, fr))
    edge_v = n.math('MINIMUM', frv, n.math('SUBTRACT', 1.0, frv))
    seam_u = n.ramp(n.math('MULTIPLY', edge_u, W_PLANK), [(0.0, (0, 0, 0, 1)), (0.075, (0, 0, 0, 1)), (0.22, (1, 1, 1, 1))])
    seam_v = n.ramp(n.math('MULTIPLY', edge_v, 96.0), [(0.0, (0, 0, 0, 1)), (0.06, (0, 0, 0, 1)), (0.16, (1, 1, 1, 1))])
    seam = n.math('MINIMUM', seam_u, seam_v)
    dirt = n.ramp(n.math('MULTIPLY', edge_u, W_PLANK), [(0.0, (0.25, 0.25, 0.25, 1)), (0.9, (1, 1, 1, 1))])
    col = n.mix(1.0, col, dirt, 'MULTIPLY')
    col = n.mix(seam, hx('#120a05'), col)
    # worn varnish
    wear_m = n('Mapping', inputs={'Scale': (0.22, 0.09, 1.0)})
    n.link(tc.outputs['Object'], wear_m.inputs['Vector'])
    wear = n('TexNoise', inputs={'Scale': 1.0, 'Detail': 6.0, 'Roughness': 0.6})
    n.link(wear_m.outputs[0], wear.inputs['Vector'])
    wear_v = n.ramp(wear.outputs['Fac'], [(0.42, (0, 0, 0, 1)), (0.62, (1, 1, 1, 1))])
    rough = n.mix(wear_v, (0.24, 0.24, 0.24, 1), (0.54, 0.54, 0.54, 1))
    rough = n.mix(n.math('MULTIPLY', pore_v, 0.5), rough, (0.72, 0.72, 0.72, 1))
    # scratches on the varnish: thin bright lines from years of cups and plates
    sc_m = n('Mapping', inputs={'Rotation': (0, 0, 0.5), 'Scale': (0.05, 2.4, 1.0)})
    n.link(tc.outputs['Object'], sc_m.inputs['Vector'])
    sc = n('TexNoise', inputs={'Scale': 1.0, 'Detail': 1.5})
    n.link(sc_m.outputs[0], sc.inputs['Vector'])
    sc_v = n.ramp(sc.outputs['Fac'], [(0.71, (0, 0, 0, 1)), (0.735, (1, 1, 1, 1))])
    bsdf = n('BsdfPrincipled', inputs={'Specular IOR Level': 0.5})
    n.link(col, bsdf.inputs['Base Color'])
    n.link(n.mix(sc_v, rough, (0.65, 0.65, 0.65, 1)), bsdf.inputs['Roughness'])
    # relief
    h = n.math('ADD', n.math('MULTIPLY', ring_c, 0.25), n.math('MULTIPLY', pore_v, 0.6))
    h = n.math('ADD', h, n.math('MULTIPLY', seam, 7.0))
    bump = n('Bump', inputs={'Strength': 0.35, 'Distance': 0.07})
    n.link(h, bump.inputs['Height'])
    n.link(bump.outputs[0], bsdf.inputs['Normal'])
    out = n('OutputMaterial')
    n.link(bsdf.outputs[0], out.inputs[0])
    return m


def mat_plastic():
    m = material('PhonePlastic')
    n = N(m)
    tc = n('TexCoord')
    attr = n('Attribute', attribute_name='wear')
    # Where the paint has gone: on the rims and the corners, in chipped patches rather than an even line.
    wn = n('TexNoise', inputs={'Scale': 2.2, 'Detail': 7.0, 'Roughness': 0.6})
    n.link(tc.outputs['Object'], wn.inputs['Vector'])
    wn2 = n('TexNoise', inputs={'Scale': 26.0, 'Detail': 5.0, 'Roughness': 0.65})
    n.link(tc.outputs['Object'], wn2.inputs['Vector'])
    chip = n.math('ADD', attr.outputs['Fac'], n.math('MULTIPLY', n.math('SUBTRACT', wn.outputs['Fac'], 0.5), 1.1))
    chip = n.math('ADD', chip, n.math('MULTIPLY', n.math('SUBTRACT', wn2.outputs['Fac'], 0.5), 0.55))
    wear = n.ramp(chip, [(0.62, (0, 0, 0, 1)), (0.70, (1, 1, 1, 1))])
    wear_soft = n.ramp(chip, [(0.3, (0, 0, 0, 1)), (0.7, (1, 1, 1, 1))])
    base = n.mix(n.ramp(wn.outputs['Fac'], [(0.3, (0, 0, 0, 1)), (0.7, (1, 1, 1, 1))]), hx('#0f2529'), hx('#17343a'))
    base = n.mix(n.math('MULTIPLY', wear_soft, 0.5), base, hx('#3b5457'))   # rubbed shiny and pale before it chips
    col = n.mix(wear, base, hx('#8f9493'))
    fine = n('TexNoise', inputs={'Scale': 130.0, 'Detail': 5.0})
    n.link(tc.outputs['Object'], fine.inputs['Vector'])
    bsdf = n('BsdfPrincipled', inputs={'Specular IOR Level': 0.5})
    n.link(col, bsdf.inputs['Base Color'])
    r = n.ramp(wn.outputs['Fac'], [(0.3, (0.3, 0.3, 0.3, 1)), (0.7, (0.46, 0.46, 0.46, 1))])
    r = n.mix(wear_soft, r, (0.22, 0.22, 0.22, 1))
    r = n.mix(wear, r, (0.34, 0.34, 0.34, 1))
    n.link(r, bsdf.inputs['Roughness'])
    n.link(n.math('MULTIPLY', wear, 0.8), bsdf.inputs['Metallic'])
    # Fine scuffs and pitting.
    sc_m = n('Mapping', inputs={'Rotation': (0.3, 0.4, 0.9), 'Scale': (0.5, 26.0, 1.0)})
    n.link(tc.outputs['Object'], sc_m.inputs['Vector'])
    sc = n('TexNoise', inputs={'Scale': 3.0, 'Detail': 2.0})
    n.link(sc_m.outputs[0], sc.inputs['Vector'])
    sc_v = n.ramp(sc.outputs['Fac'], [(0.66, (0, 0, 0, 1)), (0.71, (1, 1, 1, 1))])
    h = n.math('ADD', n.math('MULTIPLY', fine.outputs['Fac'], 0.28), n.math('MULTIPLY', sc_v, -0.6))
    h = n.math('ADD', h, n.math('MULTIPLY', wear, -1.2))
    bump = n('Bump', inputs={'Strength': 0.3, 'Distance': 0.015})
    n.link(h, bump.inputs['Height'])
    n.link(bump.outputs[0], bsdf.inputs['Normal'])
    out = n('OutputMaterial')
    n.link(bsdf.outputs[0], out.inputs[0])
    return m


def mat_rubber_white():
    m = material('Cable')
    n = N(m)
    tc = n('TexCoord')
    nz = n('TexNoise', inputs={'Scale': 3.0, 'Detail': 6.0})
    n.link(tc.outputs['Object'], nz.inputs['Vector'])
    col = n.ramp(nz.outputs['Fac'], [(0.35, '#b9ad9c'), (0.65, '#e4dccd')])
    bsdf = n('BsdfPrincipled', inputs={'Roughness': 0.46, 'Specular IOR Level': 0.45})
    n.link(col, bsdf.inputs['Base Color'])
    out = n('OutputMaterial')
    n.link(bsdf.outputs[0], out.inputs[0])
    return m


def mat_flat(name, color, rough=0.5, metal=0.0, spec=0.5):
    m = material(name)
    n = N(m)
    bsdf = n('BsdfPrincipled', inputs={'Base Color': hx(color) if isinstance(color, str) else color, 'Roughness': rough, 'Metallic': metal, 'Specular IOR Level': spec})
    out = n('OutputMaterial')
    n.link(bsdf.outputs[0], out.inputs[0])
    return m


def mat_glass_screen(screen_path):
    """The front glass. One opaque-but-glossy surface: black print, the display as emission, reflections on top with all the wear."""
    m = material('PhoneGlass')
    n = N(m)
    uv = n('UVMap', uv_map='UVMap')
    uvo = uv.outputs['UV']
    rough = n.image(f'{TEX}/glass_rough.png', uvo, ext='EXTEND')
    normal = n.image(f'{TEX}/glass_normal.png', uvo, ext='EXTEND')
    crack = n.image(f'{TEX}/glass_crack.png', uvo, ext='EXTEND')
    prnt = n.image(f'{TEX}/glass_print.png', uvo, ext='EXTEND')
    c_sep = n('SeparateColor')
    n.link(crack.outputs['Color'], c_sep.inputs[0])
    p_sep = n('SeparateColor')
    n.link(prnt.outputs['Color'], p_sep.inputs[0])
    # the display's own UVs inside the window
    sep = n('SeparateXYZ')
    n.link(uvo, sep.inputs[0])
    gu = n.math('SUBTRACT', n.math('MULTIPLY', sep.outputs['X'], G.GLASS_W), G.GLASS_W / 2)
    gv = n.math('SUBTRACT', n.math('MULTIPLY', sep.outputs['Y'], G.GLASS_H), G.GLASS_H / 2)
    su = n.math('DIVIDE', n.math('SUBTRACT', gu, G.SCREEN_X0), G.SCREEN_X1 - G.SCREEN_X0)
    sv = n.math('DIVIDE', n.math('SUBTRACT', gv, G.SCREEN_Y0), G.SCREEN_Y1 - G.SCREEN_Y0)
    cb = n('CombineXYZ')
    n.link(su, cb.inputs['X'])
    n.link(sv, cb.inputs['Y'])
    screen = n.image(screen_path, cb.outputs[0], colorspace='sRGB', interp='Linear', ext='EXTEND')
    screen.name = 'ScreenImage'
    # The picture is dimmed and scattered where the glass is fractured.
    through = n.math('SUBTRACT', 1.0, n.math('MULTIPLY', c_sep.outputs[1], 0.62))
    # AgX is gentle on bright saturated light, so push the picture a little to arrive looking like itself.
    hs = n('HueSaturation', inputs={'Hue': 0.5, 'Saturation': float(os.environ.get('SCREEN_SAT', 1.32)), 'Value': 1.0, 'Fac': 1.0})
    n.link(screen.outputs['Color'], hs.inputs['Color'])
    em_col = hs.outputs['Color']
    em_strength = n.math('MULTIPLY', n.math('MULTIPLY', p_sep.outputs[0], through), float(os.environ.get('SCREEN_E', 1.15)))
    em_strength.node.name = 'ScreenStrength'
    # Printed black with an earpiece and a lens.
    base = n.mix(p_sep.outputs[1], hx('#040507'), hx('#2c2c2b'))
    base = n.mix(p_sep.outputs[2], base, hx('#0b1320'))
    # The crack itself scatters light: pale, frosty.
    base = n.mix(n.math('MULTIPLY', c_sep.outputs[0], 0.85), base, hx('#d7dfe0'))
    # Normal map, stronger on the shards.
    nm = n('NormalMap', space='TANGENT', uv_map='UVMap', inputs={'Strength': 1.0})
    n.link(normal.outputs['Color'], nm.inputs['Color'])
    bsdf = n('BsdfPrincipled', inputs={'Specular IOR Level': 0.62, 'Metallic': 0})
    n.link(base, bsdf.inputs['Base Color'])
    n.link(rough.outputs['Color'], bsdf.inputs['Roughness'])
    n.link(nm.outputs[0], bsdf.inputs['Normal'])
    n.link(em_col, bsdf.inputs['Emission Color'])
    n.link(em_strength, bsdf.inputs['Emission Strength'])
    out = n('OutputMaterial')
    n.link(bsdf.outputs[0], out.inputs[0])
    return m


def mat_gobo():
    m = material('Gobo')
    n = N(m)
    tc = n('TexCoord')
    tex = n.image(f'{TEX}/mashrabiya.png', tc.outputs['UV'], interp='Linear', ext='REPEAT')
    mp = n('Mapping', inputs={'Scale': (5.4, 5.4, 1.0)})
    mp.name = 'GoboMap'
    n.link(tc.outputs['UV'], mp.inputs['Vector'])
    n.link(mp.outputs[0], tex.inputs['Vector'])
    bsdf = n('BsdfDiffuse', inputs={'Color': (0.1, 0.05, 0.02, 1)})
    tr = n('BsdfTransparent')
    fac = n('Math', operation='MAXIMUM')
    fac.name = 'GoboOpen'
    n.link(tex.outputs['Color'], fac.inputs[0])
    fac.inputs[1].default_value = 0.0
    mx = n('MixShader')
    n.link(fac.outputs[0], mx.inputs[0])
    n.link(bsdf.outputs[0], mx.inputs[1])
    n.link(tr.outputs[0], mx.inputs[2])
    out = n('OutputMaterial')
    n.link(mx.outputs[0], out.inputs[0])
    return m


def mat_tea_glass():
    m = material('TeaGlass')
    n = N(m)
    bsdf = n('BsdfPrincipled', inputs={'Base Color': (1, 1, 1, 1), 'Roughness': 0.02, 'Transmission Weight': 1.0, 'IOR': 1.48, 'Specular IOR Level': 0.5})
    out = n('OutputMaterial')
    n.link(bsdf.outputs[0], out.inputs[0])
    return m


def mat_tea():
    m = material('Tea')
    n = N(m)
    bsdf = n('BsdfPrincipled', inputs={'Base Color': hx('#ffd7a2'), 'Roughness': 0.03, 'Transmission Weight': 1.0, 'IOR': 1.34})
    vol = n('VolumeAbsorption', inputs={'Color': hx('#c2470e'), 'Density': 0.55})
    out = n('OutputMaterial')
    n.link(bsdf.outputs[0], out.inputs[0])
    n.link(vol.outputs[0], out.inputs[1])
    return m


# ------------------------------------------------------------------------------------------------------------- the phone
def body_deform(x, y, z):
    """The corner it landed on: the top right is crushed in a little, and the whole rim is not quite true."""
    cx, cy = G.W / 2 - 0.4, G.H / 2 - 0.4
    d = math.hypot(x - cx, y - cy)
    if d < 1.5:
        k = (1 - d / 1.5) ** 2
        n1 = math.sin(x * 19.0 + y * 7.0) * 0.5 + math.sin(y * 23.0 - x * 5.0 + z * 9.0) * 0.5
        x -= 0.16 * k * (1 + 0.4 * n1)
        y -= 0.14 * k * (1 - 0.4 * n1)
        z += 0.018 * k * n1
    return (x, y, z)


def build_phone(screen_path, col):
    root = bpy.data.objects.new('Phone', None)
    col.objects.link(root)
    plastic = mat_plastic()
    black = mat_flat('PortBlack', '#050505', 0.6)
    metal = mat_flat('PortMetal', '#8f9191', 0.35, 1.0)
    T = G.T
    t = T / 0.98
    rings = [
        (0.70, 0.0), (0.60, 0.0), (0.46, 0.012), (0.30, 0.05), (0.18, 0.11), (0.09, 0.20), (0.035, 0.31), (0.012, 0.40),
        (0.012, 0.455), (0.030, 0.462), (0.030, 0.478), (0.0, 0.485),     # the parting line between back cover and frame
        (0.0, 0.76), (0.008, 0.83), (0.03, 0.875), (0.06, 0.905), (0.092, 0.92), (0.125, 0.92), (0.150, 0.905), (0.165, 0.885), (0.172, 0.875),
    ]
    # How exposed each ring is: the outer lip and the shoulder of the back take the knocks.
    ring_wear = [0.0, 0.0, 0.05, 0.1, 0.18, 0.3, 0.42, 0.34, 0.2, 0.05, 0.05, 0.14, 0.2, 0.28, 0.44, 0.62, 0.74, 0.74, 0.5, 0.2, 0.1]
    rings = [(i, z * t) for i, z in rings]
    body = loft('PhoneBody', G.W / 2, G.H / 2, G.CORNER, rings, col, [plastic], seg=20, cap_top=True, cap_bottom=True, deform=body_deform)
    body.parent = root
    # Corners stick out, so they wear far more, and the dropped corner most of all.
    me = body.data
    at = me.attributes.new('wear', 'FLOAT', 'POINT')
    count = len(me.vertices) // len(rings)
    for j, rw in enumerate(ring_wear):
        for i in range(count):
            v = me.vertices[j * count + i].co
            cx = abs(v.x) - (G.W / 2 - G.CORNER)
            cy = abs(v.y) - (G.H / 2 - G.CORNER)
            corner = 1.0 if cx > 0 and cy > 0 else 0.0
            drop = max(0.0, 1.0 - math.hypot(v.x - G.W / 2 + 0.5, v.y - G.H / 2 + 0.5) / 2.4)
            at.data[j * count + i].value = rw * (0.62 + 0.62 * corner) + 0.5 * drop * (0.3 + rw)
    # Bevel-style subdivision of the body is unnecessary: the rings do it. But pointiness needs a little density.
    # The glass.
    gw, gh = G.GLASS_W / 2, G.GLASS_H / 2
    g_rings = [(0.0, 0.875 * t), (0.006, 0.90 * t), (0.022, 0.909 * t), (0.05, 0.913 * t)]
    glass = loft('PhoneGlass', gw, gh, G.CORNER - G.GLASS_INSET, g_rings, col, [mat_glass_screen(screen_path)], seg=20, cap_top=True, cap_bottom=False,
                 uv_box=(-gw, -gh, gw, gh), deform=body_deform)
    glass.parent = root
    # Buttons on the right side: a volume rocker and the power key.
    for name, y0, y1 in (('Volume', 1.6, 4.05), ('Power', 0.05, 1.1)):
        hl = (y1 - y0) / 2
        b_rings = [(0.0, 0.0), (0.0, 0.06), (0.012, 0.075), (0.03, 0.085), (0.05, 0.09)]
        btn = loft(name, 0.16, hl, 0.09, b_rings, col, [plastic], seg=6)
        btn.rotation_euler = (0, math.radians(90), 0)
        btn.location = (G.W / 2 - 0.012, (y0 + y1) / 2, 0.62 * t)
        btn.parent = root
    # The chin edge: a micro USB port, a jack and speaker holes.
    y_edge = -G.H / 2
    port = loft('Port', 0.40, 0.14, 0.05, [(0.0, -0.3), (0.0, 0.01)], col, [black], seg=4, cap_bottom=False)
    port.rotation_euler = (math.radians(90), 0, 0)
    port.location = (0, y_edge + 0.01 * 0, 0.62 * t)
    port.parent = root
    for i in range(14):
        x = 1.1 + i * 0.13
        for sgn in (-1, 1):
            hole = loft(f'Grill{i}{sgn}', 0.035, 0.035, 0.034, [(0.0, -0.05), (0.0, 0.006)], col, [black], seg=3, cap_bottom=False)
            hole.rotation_euler = (math.radians(90), 0, 0)
            hole.location = (sgn * x, y_edge, 0.62 * t)
            hole.parent = root
    jack = loft('Jack', 0.14, 0.14, 0.139, [(0.0, -0.4), (0.0, 0.006)], col, [black], seg=8, cap_bottom=False)
    jack.rotation_euler = (math.radians(-90), 0, 0)
    jack.location = (-1.6, G.H / 2, 0.62 * t)
    jack.parent = root
    # Lift the glass and body onto the table, set the phone's pose.
    root.rotation_euler = (0, 0, PHONE_YAW)
    root.location = (0, 0, 0)
    return root


def cable_points():
    """A dirty white cable from the port, wandering off across the table."""
    # In phone space near the port, then world space.
    rot = Matrix.Rotation(PHONE_YAW, 4, 'Z')
    p = lambda x, y, z=0.0: rot @ Vector((x, y, z))
    return [p(0, -G.H / 2 - 1.1, 0.42), p(0, -G.H / 2 - 3.2, 0.24), Vector(p(0.6, -G.H / 2 - 6.0, 0.17)), Vector((14.0, -24.0, 0.17)), Vector((26.0, -26.0, 0.17)),
            Vector((31.0, -12.0, 0.17)), Vector((24.0, -3.0, 0.17)), Vector((36.0, 12.0, 0.17)), Vector((70.0, 18.0, 0.17))]


def build_cable(col, root):
    rot = Matrix.Rotation(PHONE_YAW, 4, 'Z')
    cu = bpy.data.curves.new('CableCurve', 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = 0.17
    cu.bevel_resolution = 4
    cu.resolution_u = 24
    sp = cu.splines.new('BEZIER')
    pts = cable_points()
    sp.bezier_points.add(len(pts) - 1)
    for bp, co in zip(sp.bezier_points, pts):
        bp.co = co
        bp.handle_left_type = bp.handle_right_type = 'AUTO'
    ob = bpy.data.objects.new('Cable', cu)
    cu.materials.append(mat_rubber_white())
    col.objects.link(ob)
    # The plug and its strain relief.
    strain = loft('Strain', 0.46, 0.68, 0.2, [(0.0, 0.0), (0.0, 1.05), (0.06, 1.25)], col, [mat_rubber_white()], seg=6, angle=50)
    strain.rotation_euler = (math.radians(90), 0, 0)
    strain.location = (0, -G.H / 2 - 0.03 - 0.06, 0.62 * G.T / 0.98)
    strain.scale = (1, 0.42, 1)
    strain.parent = root
    plug_m = mat_flat('PlugMetal', '#a7a9a6', 0.32, 1.0)
    return ob


def build_tea(col):
    """A small waisted tea glass on a saucer, on the far side of the phone."""
    root = bpy.data.objects.new('Tea', None)
    col.objects.link(root)

    def lathe(name, prof, mats, seg=72, cap=False):
        vs, fs = [], []
        for i in range(seg):
            a = 2 * math.pi * i / seg
            for r, z in prof:
                vs.append((r * math.cos(a), r * math.sin(a), z))
        m = len(prof)
        for i in range(seg):
            j = (i + 1) % seg
            for k in range(m - 1):
                fs.append((i * m + k, j * m + k, j * m + k + 1, i * m + k + 1))
        if cap:
            fs.append(tuple(i * m + m - 1 for i in range(seg)))
            fs.append(tuple(i * m for i in reversed(range(seg))))
        ob = make_object(name, vs, fs, col, mats, True)
        ob.parent = root
        return ob

    def waist(z):
        # radius of the outside of the glass at height z
        t = z / 8.2
        return 2.62 + 0.0 * t - 0.82 * math.sin(math.pi * min(1, t * 1.05)) ** 1.6 * (1 - 0.15 * t) + 0.95 * t ** 3

    outer = [(0.0, 0.42), (1.6, 0.42), (2.32, 0.46), (2.5, 0.62)]
    for i in range(1, 25):
        z = 0.62 + (8.2 - 0.62) * i / 24
        outer.append((waist(z), z))
    outer += [(waist(8.2) - 0.03, 8.26), (waist(8.2) - 0.1, 8.26)]
    inner = []
    for i in range(24, 0, -1):
        z = 0.95 + (8.2 - 0.95) * i / 24
        inner.append((waist(z) - 0.12, z))
    inner += [(2.1, 0.95), (1.2, 0.86), (0.0, 0.84)]
    lathe('TeaGlass', outer + inner, [mat_tea_glass()])
    tea_top = 6.7
    tea = [(0.0, 0.87)]
    tea.append((1.2, 0.89))
    tea.append((2.08, 0.98))
    for i in range(1, 20):
        z = 0.98 + (tea_top - 0.98) * i / 19
        tea.append((waist(z) - 0.125, z))
    tea.append((waist(tea_top) - 0.15, tea_top + 0.04))
    tea.append((waist(tea_top) - 0.4, tea_top))
    tea.append((0.0, tea_top))
    lathe('TeaLiquid', tea, [mat_tea()])
    # The saucer.
    china = mat_flat('China', '#f3eadb', 0.2, 0, 0.6)
    gold = mat_flat('Gold', '#d8a648', 0.25, 1.0)
    sau = [(0.0, 0.07), (2.8, 0.07), (3.0, 0.03), (3.2, 0.0), (3.9, 0.0), (5.1, 0.38), (5.46, 0.68), (5.5, 0.74), (5.42, 0.77), (5.1, 0.62), (3.9, 0.3), (3.0, 0.28), (2.8, 0.34), (0.0, 0.34)]
    lathe('Saucer', sau, [china])
    rim = [(5.44, 0.725), (5.51, 0.742), (5.44, 0.78), (5.38, 0.75), (5.44, 0.725)]
    lathe('SaucerRim', rim, [gold])
    root.location = (-9.5, 15.5, 0)
    return root


def build_table(col):
    verts = [(-900, -300, 0), (900, -300, 0), (900, 1400, 0), (-900, 1400, 0)]
    # A dense enough grid is unnecessary: it's flat. Bump does the rest.
    table = make_object('Table', verts, [(0, 1, 2, 3)], col, [mat_wood()], False)
    return table


def add_panel(name, center, size, target, strength, color, col, receivers=None):
    """A window seen only in reflections, with a soft edge and the same lattice as the shadow."""
    bpy.ops.mesh.primitive_plane_add(size=1.0, location=center)
    ob = bpy.context.object
    for c in ob.users_collection:
        c.objects.unlink(ob)
    col.objects.link(ob)
    ob.name = name
    ob.scale = (size[0], size[1], 1)
    d = (Vector(target) - Vector(center)).normalized()
    ob.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    m = material(name)
    n = N(m)
    tc = n('TexCoord')
    sep = n('SeparateXYZ')
    n.link(tc.outputs['UV'], sep.inputs[0])
    grad = n.ramp(sep.outputs['Y'], [(0.0, (0.0, 0, 0, 1)), (0.04, (1, 1, 1, 1)), (0.96, (1, 1, 1, 1)), (1.0, (0, 0, 0, 1))])
    grad2 = n.ramp(sep.outputs['X'], [(0.0, (0.0, 0, 0, 1)), (0.03, (1, 1, 1, 1)), (0.97, (1, 1, 1, 1)), (1.0, (0, 0, 0, 1))])
    mp = n('Mapping', inputs={'Scale': (size[0] / 22.0, size[1] / 22.0, 1.0)})
    n.link(tc.outputs['UV'], mp.inputs['Vector'])
    lat = n.image(f'{TEX}/mashrabiya.png', mp.outputs[0], interp='Linear', ext='REPEAT')
    lat_v = n.mix(0.0, (1, 1, 1, 1), lat.outputs['Color'])
    em = n('Emission', inputs={'Color': color})
    n.link(n.math('MULTIPLY', n.math('MULTIPLY', n.math('MULTIPLY', grad, grad2), lat_v), strength), em.inputs['Strength'])
    tr = n('BsdfTransparent')
    add = n('AddShader')
    n.link(em.outputs[0], add.inputs[0])
    n.link(tr.outputs[0], add.inputs[1])
    out = n('OutputMaterial')
    n.link(em.outputs[0], out.inputs[0])
    ob.data.materials.append(m)
    ob.visible_camera = False
    ob.visible_shadow = False
    ob.visible_diffuse = False
    if receivers:
        ob.light_linking.receiver_collection = receivers
    return ob


def build_lights(col):
    scene = bpy.context.scene
    # The sun, low and warm, behind the phone.
    sun = bpy.data.lights.new('Sun', 'SUN')
    sun.energy = float(os.environ.get('SUN', 6.5))
    sun.color = hx('#ffc78a')[:3]
    sun.angle = math.radians(0.55)
    so = bpy.data.objects.new('Sun', sun)
    col.objects.link(so)
    so.rotation_euler = SUN_DIR.to_track_quat('Z', 'Y').to_euler()
    # The mashrabiya between the sun and the table.
    size = 360
    c = SUN_DIR * 150 + Vector((-8, -8, 0))
    bpy.ops.mesh.primitive_plane_add(size=1.0, location=c)
    gobo = bpy.context.object
    for u in gobo.users_collection:
        u.objects.unlink(gobo)
    col.objects.link(gobo)
    gobo.name = 'Gobo'
    gobo.scale = (size, size, 1)
    gobo.rotation_euler = (SUN_DIR.to_track_quat('Z', 'Y').to_euler().to_matrix().to_4x4() @ Euler((0, 0, math.radians(14))).to_matrix().to_4x4()).to_euler()
    gobo.data.materials.append(mat_gobo())
    gobo.visible_camera = False
    gobo.visible_diffuse = False
    gobo.visible_glossy = False
    gobo.visible_transmission = False
    # The world: to diffuse light a warm dim room, to anything that reflects (and the camera) an open evening sky.
    w = bpy.data.worlds.new('World')
    scene.world = w
    n = N(w)
    tc = n('TexCoord')
    sep = n('SeparateXYZ')
    n.link(tc.outputs['Generated'], sep.inputs[0])
    room = n.ramp(n.math('ADD', n.math('MULTIPLY', sep.outputs['Z'], 0.5), 0.5), [(0.0, '#2b1a0f'), (0.5, '#75624e'), (0.72, '#b6c4c3'), (1.0, '#dfe9e9')])
    bg_room = n('Background', inputs={'Strength': float(os.environ.get('AMB', 0.3))})
    bg_room.name = 'RoomLight'
    n.link(room, bg_room.inputs['Color'])
    sky = n.ramp(sep.outputs['Z'], [(0.0, '#ffd8a6'), (0.05, '#ffe6c8'), (0.2, '#cfe8ec'), (0.6, '#8fc9da'), (1.0, '#69b3cb')])
    # Below the horizon the sky has nothing to give: a dim warm floor.
    floor = n.ramp(n.math('MULTIPLY', sep.outputs['Z'], -1.0), [(0.0, '#d8b48c'), (0.2, '#4a3324')])
    is_up = n.math('GREATER_THAN', sep.outputs['Z'], 0.0)
    sky_all = n.mix(is_up, floor, sky)
    bg_sky = n('Background', inputs={'Strength': 1.0})
    bg_sky.name = 'SkyLight'
    n.link(sky_all, bg_sky.inputs['Color'])
    lp = n('LightPath')
    use_sky = n.math('MAXIMUM', lp.outputs['Is Glossy Ray'], lp.outputs['Is Camera Ray'])
    mx = n('MixShader')
    n.link(use_sky, mx.inputs[0])
    n.link(bg_room.outputs[0], mx.inputs[1])
    n.link(bg_sky.outputs[0], mx.inputs[2])
    out = n('OutputWorld')
    n.link(mx.outputs[0], out.inputs[0])
    return so, gobo


def default_camera(col):
    cam = bpy.data.cameras.new('Cam')
    ob = bpy.data.objects.new('Cam', cam)
    col.objects.link(ob)
    bpy.context.scene.camera = ob
    cam.lens = 58
    cam.sensor_width = 36
    cam.clip_start = 0.5
    cam.clip_end = 8000
    cam.dof.use_dof = True
    cam.dof.aperture_fstop = float(os.environ.get('FSTOP', 0.18))
    return ob


def look_at(ob, target, roll=0.0):
    d = (Vector(target) - ob.location).normalized()
    q = d.to_track_quat('-Z', 'Y')
    ob.rotation_euler = (q.to_matrix().to_4x4() @ Euler((0, 0, roll)).to_matrix().to_4x4()).to_euler()


def placeholder_screen(path):
    """A stand-in until the page's own screen world is dumped: only used for look development."""
    h, w = 1264, 628
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    u, v = xx / w, yy / h
    deep = np.array(hx('#0c7f96')[:3], np.float32)
    shallow = np.array(hx('#44c6c8')[:3], np.float32)
    k = np.clip(0.5 + 0.5 * np.sin(u * 7 + v * 11 + np.sin(v * 21) * 0.5), 0, 1)[:, :, None]
    im = deep * (1 - k) + shallow * k
    d = np.hypot((u - 0.45) * w, (v - 0.55) * h)
    isl = np.clip((120 - d + 15 * np.sin(np.arctan2(v - 0.55, u - 0.45) * 5)) / 4, 0, 1)[:, :, None]
    sand = np.clip((85 - d + 15 * np.sin(np.arctan2(v - 0.55, u - 0.45) * 5)) / 4, 0, 1)[:, :, None]
    im = im * (1 - isl) + np.array(hx('#f6dfa0')[:3]) * isl
    im = im * (1 - sand) + np.array(hx('#55b24c')[:3]) * sand
    srgb = np.where(im <= 0.0031308, im * 12.92, 1.055 * np.power(np.maximum(im, 1e-6), 1 / 2.4) - 0.055)
    save_png(path, srgb)


def build_scene(screen_path=None):
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o)
    col = collection('Set')
    screen_path = screen_path or os.environ.get('SCREEN') or (f'{TEX}/screen.png' if os.path.exists(f'{TEX}/screen.png') else f'{TEX}/screen_placeholder.png')
    if not os.path.exists(screen_path):
        placeholder_screen(screen_path)
    table = build_table(col)
    root = build_phone(screen_path, col)
    build_cable(col, root)
    tea = build_tea(col)
    sun, gobo = build_lights(col)
    refl = bpy.data.collections.get('Reflects') or bpy.data.collections.new('Reflects')
    for o_ in bpy.data.objects:
        if o_.name in ('PhoneGlass',):
            refl.objects.link(o_)
    bpy.context.scene['reflect_group'] = refl.name
    wx, wy, wz = eval(os.environ.get('WIN', '(-3.4,51.7,39.4)'))
    window = add_panel('Window', (wx, wy, wz), (30, 24), (3.3, 5, 0.9), float(os.environ.get('WINS', 3.4)), hx('#ffe9d0'), col, refl)
    cam = default_camera(col)
    return dict(table=table, phone=root, tea=tea, sun=sun, gobo=gobo, window=window, cam=cam)


def align_to_phone(set_):
    """Turn the whole set so the phone lies square to the axes: the fluid domain, the camera keys and the page all work in that frame."""
    root = bpy.data.objects.new('SetRoot', None)
    collection('Set').objects.link(root)
    for o in list(bpy.data.objects):
        if o is not root and o.parent is None and o.name not in ('Cam',):
            o.parent = root
    root.rotation_euler = (0, 0, -PHONE_YAW)
    bpy.context.view_layer.update()
    return root


if __name__ == '__main__' and os.environ.get('OUT'):
    W_, H_ = int(os.environ.get('W', 960)), int(os.environ.get('H', 600))
    setup_cycles(W_, H_, int(os.environ.get('SPP', 48)))
    s = build_scene()
    cam = s['cam']
    cam.location = Vector(eval(os.environ.get('CAM', '(9.0,-34.0,33.0)')))
    look_at(cam, Vector(eval(os.environ.get('LOOK', '(0.0,0.0,0.5)'))), math.radians(float(os.environ.get('ROLL', 0))))
    bpy.data.cameras['Cam'].dof.focus_distance = (cam.location - Vector((0, -2, 0.9))).length
    if os.environ.get('LENS'):
        bpy.data.cameras['Cam'].lens = float(os.environ['LENS'])
    bpy.context.scene.render.filepath = os.environ['OUT']
    bpy.context.scene.render.image_settings.file_format = 'PNG'
    bpy.ops.render.render(write_still=True)
