# The poster for the About section: the game's own dhow and islands, path-traced on a real sea with a painted sky behind them.
#   OUT=<dir> MODE=wide|tall SPP=256 Blender -b concepts/unity/sail/blender/world.blend -P concepts/blender/about/sail/keyart.py
# Writes OUT/<mode>_beauty.exr (the render with no sky), OUT/<mode>_dist.exr (distance), OUT/<mode>_mask.exr (sea and sky masks).
# grade.py then paints the sky, adds the haze and glow, and writes the WebP files the site loads. Run it after this.
import bpy, math, os, sys, time
import numpy as np
from mathutils import Euler, Matrix, Vector

OUT = os.environ['OUT']
MODE = os.environ.get('MODE', 'wide')
SPP = int(os.environ.get('SPP', 64))
SCALE = float(os.environ.get('SCALE', 1))
T0 = time.time()
TEX = os.path.join(os.path.dirname(bpy.data.filepath), '..', 'Assets', 'Art', 'Textures')
os.makedirs(OUT, exist_ok=True)


def log(*a):
    print(f'[{time.time() - T0:6.1f}s]', *a, flush=True)


SHOT = {
    'wide': dict(w=2400, h=1350, az=27.0, boat=(0, 150), head=-112, swing=-22, dist=74, cam_h=3.1, fov=37, shift=(-0.19, 0.17), heel=7.0, bird=(0.57, 0.2, 66, 2.05), sun_el=8.5),
    # On a phone the text takes the sky, so the boat sits low and small with the sun just over the horizon beside it.
    'tall': dict(w=1000, h=2600, az=27.5, boat=(0, 150), head=-112, swing=-22, dist=150, cam_h=3.6, fov=38.6, shift=(0.03, 0.29), heel=7.0, bird=(0.3, 0.622, 140, 3.25), sun_el=4.6),
}[MODE]
W, H = int(SHOT['w'] * SCALE), int(SHOT['h'] * SCALE)
SUN_AZ, SUN_EL = 24.0, SHOT['sun_el']

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
pr = bpy.context.preferences.addons['cycles'].preferences
pr.compute_device_type = 'METAL'
pr.get_devices()
for d in pr.devices:
    d.use = d.type == 'METAL'
c = scene.cycles
c.device = 'GPU'
c.samples = SPP
c.use_denoising = True
c.max_bounces = 6
c.glossy_bounces = 3
c.transmission_bounces = 4
c.diffuse_bounces = 3
c.caustics_reflective = False
c.caustics_refractive = False
c.sample_clamp_indirect = 8
scene.render.resolution_x, scene.render.resolution_y = W, H
scene.render.film_transparent = True
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
scene.render.image_settings.file_format = 'OPEN_EXR'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.image_settings.color_depth = '32'


# ------------------------------------------------------------------------------------------ materials
def vc_material(name, rough=0.7, spec=0.25, leaf=False, plank=False):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    bs = nt.nodes.new('ShaderNodeBsdfPrincipled')
    vc = nt.nodes.new('ShaderNodeVertexColor')
    vc.layer_name = 'Col'
    bs.inputs['Roughness'].default_value = rough
    bs.inputs['Specular IOR Level'].default_value = spec
    col = vc.outputs['Color']
    if plank:
        tx = nt.nodes.new('ShaderNodeTexImage')
        tx.image = bpy.data.images.load(os.path.join(TEX, 'plank.png'), check_existing=True)
        tx.image.colorspace_settings.name = 'Non-Color'
        tc = nt.nodes.new('ShaderNodeTexCoord')
        mp = nt.nodes.new('ShaderNodeMapping')
        mp.inputs['Scale'].default_value = (0.14, 0.42, 1)
        nt.links.new(tc.outputs['UV'], mp.inputs['Vector'])
        nt.links.new(mp.outputs[0], tx.inputs['Vector'])
        mx = nt.nodes.new('ShaderNodeMix')
        mx.data_type = 'RGBA'
        mx.blend_type = 'MULTIPLY'
        mx.inputs['Factor'].default_value = 0.85
        nt.links.new(vc.outputs['Color'], mx.inputs['A'])
        nt.links.new(tx.outputs['Color'], mx.inputs['B'])
        col = mx.outputs['Result']
        # The planks stand proud of their seams, which is what a low light finds.
        bp = nt.nodes.new('ShaderNodeBump')
        bp.inputs['Strength'].default_value = 0.8
        bp.inputs['Distance'].default_value = 0.035
        nt.links.new(tx.outputs['Color'], bp.inputs['Height'])
        nt.links.new(bp.outputs['Normal'], bs.inputs['Normal'])
        # Sunlight thrown up off the ripples plays across the planks in thin bright filaments, strongest at the waterline, gone by the rail.
        co_ = nt.nodes.new('ShaderNodeTexCoord')
        sc_ = nt.nodes.new('ShaderNodeMapping')
        sc_.inputs['Scale'].default_value = (1, 0.3, 1.5)
        nt.links.new(co_.outputs['Object'], sc_.inputs['Vector'])
        nz = nt.nodes.new('ShaderNodeTexNoise')
        nz.inputs['Scale'].default_value = 1.15
        nz.inputs['Detail'].default_value = 3
        nz.inputs['Distortion'].default_value = 0.9
        nt.links.new(sc_.outputs[0], nz.inputs['Vector'])
        ridge = nt.nodes.new('ShaderNodeValToRGB')
        rr_ = ridge.color_ramp
        rr_.elements[0].position = 0.465
        rr_.elements[0].color = (0, 0, 0, 1)
        rr_.elements[1].position = 0.5
        rr_.elements[1].color = (1, 1, 1, 1)
        e3 = rr_.elements.new(0.535)
        e3.color = (0, 0, 0, 1)
        nt.links.new(nz.outputs['Fac'], ridge.inputs['Fac'])
        sp_ = nt.nodes.new('ShaderNodeSeparateXYZ')
        nt.links.new(co_.outputs['Object'], sp_.inputs[0])
        fade = nt.nodes.new('ShaderNodeMapRange')
        fade.interpolation_type = 'SMOOTHSTEP'
        fade.inputs['From Min'].default_value = 1.5
        fade.inputs['From Max'].default_value = 0.0
        nt.links.new(sp_.outputs['Z'], fade.inputs['Value'])
        strength = nt.nodes.new('ShaderNodeMath')
        strength.operation = 'MULTIPLY'
        nt.links.new(ridge.outputs['Color'], strength.inputs[0])
        nt.links.new(fade.outputs[0], strength.inputs[1])
        ca = nt.nodes.new('ShaderNodeMath')
        ca.operation = 'MULTIPLY'
        ca.inputs[1].default_value = float(os.environ.get('CAUSTIC', 0.15))
        nt.links.new(strength.outputs[0], ca.inputs[0])
        nt.links.new(ca.outputs[0], bs.inputs['Emission Strength'])
        bs.inputs['Emission Color'].default_value = (1.0, 0.58, 0.26, 1)
    nt.links.new(col, bs.inputs['Base Color'])
    shader = bs.outputs[0]
    if leaf:
        tr = nt.nodes.new('ShaderNodeBsdfTranslucent')
        nt.links.new(col, tr.inputs['Color'])
        mx = nt.nodes.new('ShaderNodeMixShader')
        mx.inputs[0].default_value = 0.3
        nt.links.new(bs.outputs[0], mx.inputs[1])
        nt.links.new(tr.outputs[0], mx.inputs[2])
        shader = mx.outputs[0]
    nt.links.new(shader, out.inputs['Surface'])
    return m


def emit_material(name, rgb, strength):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    e = nt.nodes.new('ShaderNodeEmission')
    e.inputs['Color'].default_value = (*rgb, 1)
    e.inputs['Strength'].default_value = strength
    nt.links.new(e.outputs[0], out.inputs['Surface'])
    return m


def sail_texture():
    """The same cloth the game's shader draws: panels, seams and the pink band with a thin teal line."""
    n = 2048
    ys, xs = np.mgrid[0:n, 0:n]
    u = (xs + 0.5) / n
    v = (ys + 0.5) / n
    s = u * 11
    i = np.floor(s)
    panel = s - i
    h = np.modf(np.sin(i * 12.9898) * 43758.5453)[0] % 1.0
    base = np.array([0.93, 0.84, 0.66])[None, None, :] * (0.88 + 0.14 * h)[:, :, None]
    seam = np.clip((np.abs(panel - 0.5) - 0.42) / 0.05, 0, 1)
    base = base * (1 - 0.2 * seam)[:, :, None]
    pink = np.array([0.92, 0.08, 0.26])
    teal = np.array([0.02, 0.26, 0.28])
    pb = (np.clip((v - 0.785) / 0.005, 0, 1) * np.clip((0.9 - v) / 0.005, 0, 1))[:, :, None]
    tb = (np.clip((v - 0.75) / 0.003, 0, 1) * np.clip((0.77 - v) / 0.003, 0, 1))[:, :, None]
    base = base * (1 - pb * 0.92) + pink * pb * 0.92
    base = base * (1 - tb * 0.9) + teal * tb * 0.9
    base = base * (1 - 0.1 * np.clip((v - 0.82) / 0.18, 0, 1))[:, :, None]
    # Image V runs up from the bottom row, and the mesh's V was written directly, so row index matches V.
    rgba = np.ones((n, n, 4), np.float32)
    rgba[:, :, :3] = base
    im = bpy.data.images.new('sailcloth', n, n, float_buffer=True)
    im.colorspace_settings.name = 'Linear Rec.709'
    im.pixels.foreach_set(rgba.ravel())
    return im


def sail_material():
    m = bpy.data.materials.new('sailMat')
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    tx = nt.nodes.new('ShaderNodeTexImage')
    tx.image = sail_texture()
    nt.links.new(tc.outputs['UV'], tx.inputs['Vector'])
    bs = nt.nodes.new('ShaderNodeBsdfDiffuse')
    tr = nt.nodes.new('ShaderNodeBsdfTranslucent')
    nt.links.new(tx.outputs['Color'], bs.inputs['Color'])
    nt.links.new(tx.outputs['Color'], tr.inputs['Color'])
    mx = nt.nodes.new('ShaderNodeMixShader')
    mx.inputs[0].default_value = 0.62
    nt.links.new(bs.outputs[0], mx.inputs[1])
    nt.links.new(tr.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], out.inputs['Surface'])
    return m


world_m = vc_material('m_world')
hull_m = vc_material('m_hull', 0.34, 0.55, plank=True)
leaf_m = vc_material('m_leaf', 0.75, 0.15, leaf=True)
flag_m = vc_material('m_flag', 0.8, 0.1, leaf=True)
falls_m = emit_material('m_falls', (0.75, 0.9, 0.9), 0.55)
sail_m = sail_material()
lamp_m = emit_material('m_lamp', (1.0, 0.6, 0.2), 9)
far_m = emit_material('m_far', (0.11, 0.2, 0.26), 1.0)
for o in bpy.data.objects:
    if o.type != 'MESH':
        continue
    key = o.name.split('__')[-1]
    mat = {'hull': hull_m, 'leaf': leaf_m, 'blossom': leaf_m, 'flag': flag_m, 'falls': falls_m, 'sail': sail_m, 'lamp': lamp_m, 'far': far_m}.get(key, world_m)
    o.data.materials.clear()
    o.data.materials.append(mat)
    if o.name.startswith(('Fish', 'Gull')):
        o.hide_render = True

# ------------------------------------------------------------------------------------------ the boat, posed
bx, by = SHOT['boat']
root = bpy.data.objects.new('BoatRoot', None)
scene.collection.objects.link(root)
heel = SHOT['heel']
root.rotation_euler = Euler((math.radians(-0.8), math.radians(heel), math.radians(-SHOT['head'])), 'ZYX')
root.location = (bx, by, 0.05)
PIV = bpy.data.objects['Yard__world'].location.copy()
swing_rig = bpy.data.objects.new('Swing', None)
scene.collection.objects.link(swing_rig)
swing_rig.parent = root
swing_rig.location = PIV
swing_rig.rotation_euler = (0, 0, math.radians(SHOT['swing']))
for n in ('Hull__hull', 'Inner__hull', 'Trim__world', 'Mast__world', 'Cargo__world', 'Lamps__lamp', 'Rudder__world', 'Pennant__flag'):
    o = bpy.data.objects[n]
    o.parent = root
for n in ('Yard__world', 'Sail__sail'):
    o = bpy.data.objects[n]
    o.parent = swing_rig
    o.location = (0, 0, 0)
# The pennant streams to port.
bpy.data.objects['Pennant__flag'].rotation_euler = (0, 0, math.radians(60))

# Belly the sail: the same shape the game's shader gives it.
sm = bpy.data.objects['Sail__sail'].data
uv = np.zeros(len(sm.loops) * 2)
sm.uv_layers[0].uv.foreach_get('vector', uv) if hasattr(sm.uv_layers[0], 'uv') else sm.uv_layers[0].data.foreach_get('uv', uv)
uv = uv.reshape(-1, 2)
lv = np.zeros(len(sm.loops), np.int64)
sm.loops.foreach_get('vertex_index', lv)
vuv = np.zeros((len(sm.vertices), 2))
vuv[lv] = uv
co = np.zeros(len(sm.vertices) * 3)
sm.vertices.foreach_get('co', co)
co = co.reshape(-1, 3)
s, t = vuv[:, 0], np.clip(vuv[:, 1], 0, 1)
k = np.maximum(np.sin(np.pi * np.clip(s * 0.96 + 0.02, 0, 1)), 0)
belly = k * np.sqrt(k) * (1 - (1 - t) ** 2.2) * (1.05 - t * 0.4) * 3.6
wobble = 0.03 * np.sin(s * 40 + t * 10) * np.sin(np.pi * s) * t
co[:, 0] += -np.sign(SHOT['swing'] or 1) * (belly + wobble) * -1
sm.vertices.foreach_set('co', co.ravel())
sm.update()

# The hoopoe, mid-beat: banked towards the viewer, with the far wing lifting behind her crest and the near wing sweeping down, so the
# bars show on both. She's placed by where she should fall on the picture, clear of the text.
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bird as bird_kit

_az = math.radians(SHOT['az'])
_view = Vector((math.sin(_az), math.cos(_az), 0))
_right = Vector((math.cos(_az), -math.sin(_az), 0))
_to_cam = -_view
_cam = Vector((bx, by, SHOT['cam_h'])) - _view * SHOT['dist']
fx_, fy_, bd, bird_size = SHOT['bird']
_nx, _ny = fx_ * 2 - 1, 1 - fy_ * 2
_sx, _sy = SHOT['shift']
_t = math.tan(math.radians(SHOT['fov']) / 2)
if W >= H:
    _rx, _ry = (_nx + 2 * _sx) * _t, (_ny * H / W + 2 * _sy) * _t
else:
    _rx, _ry = (_nx * W / H + 2 * _sx) * _t, (_ny + 2 * _sy) * _t
bird_arm, bird_mesh = bird_kit.load(scene.collection, frame=2.5, crest=0.58)
# Her bill points along -Y. It should run to the left of the picture, turned a little towards the viewer.
_ang = math.radians(66)
_head = _to_cam * math.cos(_ang) - _right * math.sin(_ang)
_yaw = math.atan2(_head.x, -_head.y)
bird_arm.rotation_euler = Euler((math.radians(4), math.radians(50), _yaw), 'XYZ')
bird_arm.scale = (bird_size, bird_size, bird_size)
# Her middle, not her feet, goes on the chosen spot.
_mid = bird_arm.rotation_euler.to_matrix() @ Vector((0, 0, 1.3 * bird_size))
bird_arm.location = _cam + (_view + _right * _rx + Vector((0, 0, _ry))) * bd - _mid
# The old model and the kites, which have no strings in this picture and read as stray marks, stay out of the render.
for o in bpy.data.objects:
    if o.name.startswith(('BirdBody', 'BirdWing', 'BirdTail', 'BirdCrest', 'Kite')):
        o.hide_render = True

# ------------------------------------------------------------------------------------------ the sea
WAVES = [(64.0, 0.62, 20, 0.42, 0.0), (39.0, 0.38, -14, 0.5, 1.3), (24.0, 0.22, 47, 0.6, 2.6), (14.5, 0.12, -38, 0.7, 4.0), (8.5, 0.065, 74, 0.75, 0.7), (5.1, 0.036, 6, 0.8, 3.1)]
TIME = 41.0


def sea_mesh():
    az = math.radians(SHOT['az'])
    view = np.array([math.sin(az), math.cos(az)])
    cam = np.array([bx, by]) - view * SHOT['dist']
    rings, segs = 700, 900
    u = np.linspace(0, 1, rings) ** 3.2
    rad = 1.0 + u * 9000
    # A wide wedge in front of the camera, not a full disc, so the triangles go where they count.
    a = np.linspace(az - 1.1, az + 1.1, segs)
    R, A = np.meshgrid(rad, a, indexing='ij')
    X = cam[0] + np.sin(A) * R
    Y = cam[1] + np.cos(A) * R
    Xd, Yd = X.copy(), Y.copy()
    Z = np.zeros_like(X)
    crest = np.zeros_like(X)
    fade = 1 - np.clip((R - 400) / 1400, 0, 1) ** 2
    for lam, amp, dr, q, ph in WAVES:
        d = math.radians(dr)
        kk = 2 * math.pi / lam
        dx, dy = math.sin(d), math.cos(d)
        p = kk * (dx * X + dy * Y) - math.sqrt(9.81 * kk) * TIME + ph
        am = amp * fade
        qq = q / (kk * amp * 6)
        Xd += qq * am * dx * np.cos(p)
        Yd += qq * am * dy * np.cos(p)
        Z += am * np.sin(p)
    crest = Z.copy()
    v = np.stack([Xd, Yd, Z], 2).reshape(-1, 3)
    faces = []
    for i in range(rings - 1):
        base = i * segs
        faces.extend((base + j, base + j + 1, base + segs + j + 1, base + segs + j) for j in range(segs - 1))
    me = bpy.data.meshes.new('sea')
    me.from_pydata(v.tolist(), [], faces)
    me.update()
    me.shade_smooth()
    col = me.color_attributes.new('Crest', 'FLOAT_COLOR', 'POINT')
    cc = np.zeros((len(v), 4), np.float32)
    cc[:, 0] = np.clip((crest.ravel() + 1.2) / 2.4, 0, 1)
    cc[:, 3] = 1
    col.data.foreach_set('color', cc.ravel())
    o = bpy.data.objects.new('Sea', me)
    scene.collection.objects.link(o)
    return o


def wake_mask():
    """Top-down foam mask around the boat: the V from the bow and the boil astern, as a world-space image."""
    n = 2048
    size = 420.0
    head = math.radians(SHOT['head'])
    f = np.array([math.sin(head), math.cos(head)])
    r = np.array([f[1], -f[0]])
    ys, xs = np.mgrid[0:n, 0:n]
    wx = (xs + 0.5) / n * size - size / 2
    wy = (ys + 0.5) / n * size - size / 2
    along = wx * f[0] + wy * f[1]
    acr = wx * r[0] + wy * r[1]
    behind = 7.0 - along
    m = np.zeros((n, n), np.float32)
    # The bow's two arms spread as a V and thin with age.
    for sgn in (1, -1):
        centre = sgn * (2.0 + behind * 0.15)
        width = 0.5 + behind * 0.04
        age = np.clip(behind / 170.0, 0, 1)
        arm = np.exp(-((acr - centre) / np.maximum(width, 0.3)) ** 2) * (behind > 0) * (1 - age) ** 1.5
        m = np.maximum(m, arm)
    # The straight turbulent track behind the stern.
    b2 = behind - 16.0
    w2 = 1.5 + np.maximum(b2, 0) * 0.026
    track = np.exp(-(acr / np.maximum(w2, 0.5)) ** 2) * (b2 > 0) * np.clip(1 - b2 / 160.0, 0, 1) ** 1.3
    m = np.maximum(m, track * 0.9)
    # Foam hugging the hull where it cuts the water.
    bow = np.exp(-((np.abs(acr) - np.maximum(2.6 - np.abs(along) * 0.08, 0.3)) / 0.9) ** 2) * (np.abs(along) < 11.6)
    m = np.maximum(m, bow * 0.85)
    rgba = np.ones((n, n, 4), np.float32)
    rgba[:, :, 0] = m
    rgba[:, :, 1] = m
    rgba[:, :, 2] = m
    im = bpy.data.images.new('wake', n, n, float_buffer=True)
    im.colorspace_settings.name = 'Non-Color'
    im.pixels.foreach_set(rgba.ravel())
    return im, size


def sea_material():
    m = bpy.data.materials.new('seaMat')
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    N = lambda t: nt.nodes.new(t)

    # World XY, kept as a single vector for all the maps.
    sep = N('ShaderNodeSeparateXYZ')
    nt.links.new(geo.outputs['Position'], sep.inputs[0])
    xy = N('ShaderNodeCombineXYZ')
    nt.links.new(sep.outputs['X'], xy.inputs['X'])
    nt.links.new(sep.outputs['Y'], xy.inputs['Y'])

    def noise(scale, detail=4.0, rough=0.5, stretch=(1, 1, 1)):
        mp = N('ShaderNodeMapping')
        mp.inputs['Scale'].default_value = stretch
        nt.links.new(xy.outputs[0], mp.inputs['Vector'])
        t = N('ShaderNodeTexNoise')
        t.inputs['Scale'].default_value = scale
        t.inputs['Detail'].default_value = detail
        t.inputs['Roughness'].default_value = rough
        nt.links.new(mp.outputs[0], t.inputs['Vector'])
        return t.outputs['Fac']

    # Ripples at three sizes, through bumps. Far water averages these into the long road of sun.
    add = N('ShaderNodeMath'); add.operation = 'ADD'
    mul = N('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = 0.55
    nt.links.new(noise(0.42, 3, 0.5, (1, 0.62, 1)), add.inputs[0])
    nt.links.new(noise(1.5, 4, 0.55, (1, 0.7, 1)), mul.inputs[0])
    nt.links.new(mul.outputs[0], add.inputs[1])
    mul2 = N('ShaderNodeMath'); mul2.operation = 'MULTIPLY'; mul2.inputs[1].default_value = 0.2
    nt.links.new(noise(6.0, 4, 0.6), mul2.inputs[0])
    add2 = N('ShaderNodeMath'); add2.operation = 'ADD'
    nt.links.new(add.outputs[0], add2.inputs[0])
    nt.links.new(mul2.outputs[0], add2.inputs[1])
    bump = N('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.42
    bump.inputs['Distance'].default_value = 0.55
    nt.links.new(add2.outputs[0], bump.inputs['Height'])

    # Depth colour from the game's own depth map.
    mp = N('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (1 / 2800.0, 1 / 2800.0, 1)
    mp.inputs['Location'].default_value = (0.5 - 60 / 2800.0, 0.5 - 800 / 2800.0, 0)
    nt.links.new(xy.outputs[0], mp.inputs['Vector'])
    dep = N('ShaderNodeTexImage')
    dep.image = bpy.data.images.load(os.path.join(TEX, 'shore.png'), check_existing=True)
    dep.image.colorspace_settings.name = 'Non-Color'
    dep.extension = 'EXTEND'
    nt.links.new(mp.outputs[0], dep.inputs['Vector'])
    ramp = N('ShaderNodeValToRGB')
    cr = ramp.color_ramp
    cr.elements[0].position = 0.25
    cr.elements[0].color = (0.32, 0.72, 0.62, 1)
    e = cr.elements.new(0.4); e.color = (0.012, 0.24, 0.28, 1)
    cr.elements[-1].position = 0.65
    cr.elements[-1].color = (0.004, 0.075, 0.11, 1)
    nt.links.new(dep.outputs['Color'], ramp.inputs['Fac'])

    # Foam: the wake's mask times a lace that's denser where the mask is strong, with a little on the crests.
    im, size = wake_mask()
    mp2 = N('ShaderNodeMapping')
    mp2.inputs['Scale'].default_value = (1 / size, 1 / size, 1)
    mp2.inputs['Location'].default_value = (0.5 - bx / size, 0.5 - by / size, 0)
    nt.links.new(xy.outputs[0], mp2.inputs['Vector'])
    wk = N('ShaderNodeTexImage')
    wk.image = im
    wk.extension = 'CLIP'
    nt.links.new(mp2.outputs[0], wk.inputs['Vector'])

    mp3 = N('ShaderNodeMapping')
    mp3.inputs['Scale'].default_value = (1 / 17.0, 1 / 17.0, 1)
    nt.links.new(xy.outputs[0], mp3.inputs['Vector'])
    fm = N('ShaderNodeTexImage')
    fm.image = bpy.data.images.load(os.path.join(TEX, 'foam.png'), check_existing=True)
    fm.image.colorspace_settings.name = 'Non-Color'
    nt.links.new(mp3.outputs[0], fm.inputs['Vector'])

    # strength = wake * (lace + wake). Thick foam fills in, thin foam stays lacy.
    a1 = N('ShaderNodeMath'); a1.operation = 'ADD'
    nt.links.new(fm.outputs['Color'], a1.inputs[0])
    m1 = N('ShaderNodeMath'); m1.operation = 'MULTIPLY'; m1.inputs[1].default_value = 1.2
    nt.links.new(wk.outputs['Color'], m1.inputs[0])
    nt.links.new(m1.outputs[0], a1.inputs[1])
    m2 = N('ShaderNodeMath'); m2.operation = 'MULTIPLY'
    nt.links.new(a1.outputs[0], m2.inputs[0])
    nt.links.new(wk.outputs['Color'], m2.inputs[1])
    # Crest foam: where the wave is high and the lace agrees.
    crest = N('ShaderNodeVertexColor')
    crest.layer_name = 'Crest'
    sepc = N('ShaderNodeSeparateColor')
    nt.links.new(crest.outputs['Color'], sepc.inputs[0])
    rr = N('ShaderNodeMapRange')
    rr.inputs['From Min'].default_value = 0.7
    rr.inputs['From Max'].default_value = 0.92
    nt.links.new(sepc.outputs[0], rr.inputs['Value'])
    m3 = N('ShaderNodeMath'); m3.operation = 'MULTIPLY'
    nt.links.new(rr.outputs[0], m3.inputs[0])
    nt.links.new(fm.outputs['Color'], m3.inputs[1])
    a2 = N('ShaderNodeMath'); a2.operation = 'ADD'; a2.use_clamp = True
    nt.links.new(m2.outputs[0], a2.inputs[0])
    nt.links.new(m3.outputs[0], a2.inputs[1])

    water = N('ShaderNodeBsdfPrincipled')
    nt.links.new(ramp.outputs['Color'], water.inputs['Base Color'])
    water.inputs['Roughness'].default_value = 0.05
    water.inputs['IOR'].default_value = 1.33
    water.inputs['Specular IOR Level'].default_value = 0.5
    nt.links.new(bump.outputs[0], water.inputs['Normal'])
    # Foam is lit by the low sun, and glows a little of its own, the way a bright froth holds light at this hour.
    foam_d = N('ShaderNodeBsdfDiffuse')
    foam_d.inputs['Color'].default_value = (0.9, 0.88, 0.82, 1)
    foam_e = N('ShaderNodeEmission')
    foam_e.inputs['Color'].default_value = (1.0, 0.78, 0.6, 1)
    foam_e.inputs['Strength'].default_value = 0.2
    foam = N('ShaderNodeAddShader')
    nt.links.new(foam_d.outputs[0], foam.inputs[0])
    nt.links.new(foam_e.outputs[0], foam.inputs[1])
    mx = N('ShaderNodeMixShader')
    nt.links.new(a2.outputs[0], mx.inputs[0])
    nt.links.new(water.outputs[0], mx.inputs[1])
    nt.links.new(foam.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], out.inputs['Surface'])
    return m


sea = sea_mesh()
sea.data.materials.append(sea_material())


# ------------------------------------------------------------------------------------------ light
def world_env():
    """Lighting and reflections: the game's sky, built at a modest size. grade.py paints the sky you actually see."""
    w, h = 2048, 1024
    v = (np.arange(h) + 0.5) / h * 2 - 1        # -1 straight down, 1 straight up
    el = v * math.pi / 2
    az = (np.arange(w) + 0.5) / w * 2 * math.pi - math.pi
    AZ, EL = np.meshgrid(az, el)
    dx = np.sin(AZ) * np.cos(EL)
    dy = np.cos(AZ) * np.cos(EL)
    dz = np.sin(EL)
    sa, se = math.radians(SUN_AZ), math.radians(SUN_EL)
    sx, sy, sz = math.sin(sa) * math.cos(se), math.cos(sa) * math.cos(se), math.sin(se)

    def lin(hexs):
        hexs = hexs.lstrip('#')
        c = np.array([int(hexs[i:i + 2], 16) / 255 for i in (0, 2, 4)])
        return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)

    zen, mid, hs, ha = lin('#123f5e'), lin('#6aa4b0'), lin('#ffcf8c'), lin('#e8a89a')
    y = np.clip(dz, 0, 1)[:, :, None]
    flat = np.sqrt(dx * dx + dy * dy) + 1e-5
    s = ((dx / flat * math.sin(sa) + dy / flat * math.cos(sa)) * 0.5 + 0.5)[:, :, None]
    s = s * s * (3 - 2 * s)
    hor = ha + (hs - ha) * s
    def ss(a, b, x):
        t = np.clip((x - a) / (b - a), 0, 1)
        return t * t * (3 - 2 * t)
    col = hor + (mid - hor) * ss(0, 0.2, y)
    col = col + (zen - col) * ss(0.1, 0.75, y)
    a = np.clip(dx * sx + dy * sy + dz * sz, 0, 1)[:, :, None]
    sun = np.array([1.0, 0.72, 0.45])
    col = col + sun * (0.03 * a ** 16 + 0.1 * a ** 64 + 0.4 * a ** 256 + 2.2 * a ** 1024)
    # Cloud cover from the game's panorama, softened.
    cl = bpy.data.images.load(os.path.join(TEX, 'clouds.png'), check_existing=True)
    cl.colorspace_settings.name = 'Non-Color'
    cw, ch = cl.size
    px = np.empty(cw * ch * 4, np.float32)
    cl.pixels.foreach_get(px)
    px = px.reshape(ch, cw, 4)
    uu = ((np.degrees(AZ) % 360) / 360 * cw).astype(int) % cw
    vv = np.clip((np.sqrt(np.clip(EL, 0, None) / (math.pi / 2)) * ch).astype(int), 0, ch - 1)
    A = px[vv, uu, 0][:, :, None] * (EL[:, :, None] > 0)
    G = px[vv, uu, 1][:, :, None]
    lit = ha * 1.1 + (np.array([1.0, 0.75, 0.48]) * 1.1 - ha * 1.1) * s
    shade = mid * 0.5 + ha * 0.2
    cc = shade + (lit - shade) * G
    col = col * (1 - A) + cc * A
    # Below the horizon: the sea's own colour, a dim blue-green.
    below = (EL < 0)[:, :, None]
    col = np.where(below, lin('#0a4a56') * 0.5, col)
    rgba = np.ones((h, w, 4), np.float32)
    rgba[:, :, :3] = col
    im = bpy.data.images.new('env', w, h, float_buffer=True)
    im.colorspace_settings.name = 'Linear Rec.709'
    im.pixels.foreach_set(rgba.ravel())
    world = bpy.data.worlds.new('W')
    world.use_nodes = True
    nt = world.node_tree
    bg = nt.nodes['Background']
    tx = nt.nodes.new('ShaderNodeTexEnvironment')
    tx.image = im
    # Our azimuth is measured from north (+Y) clockwise, so the panorama needs its middle at north.
    mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Rotation'].default_value = (0, 0, math.radians(-90))
    mp.inputs['Scale'].default_value = (1, 1, 1)
    tc = nt.nodes.new('ShaderNodeTexCoord')
    nt.links.new(tc.outputs['Generated'], mp.inputs['Vector'])
    nt.links.new(mp.outputs[0], tx.inputs['Vector'])
    nt.links.new(tx.outputs[0], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = 1.35
    scene.world = world


world_env()
sun = bpy.data.lights.new('sun', 'SUN')
sun.energy = 5.2
sun.color = (1.0, 0.68, 0.4)
sun.angle = math.radians(2.0)
so = bpy.data.objects.new('sun', sun)
scene.collection.objects.link(so)
sa, se = math.radians(SUN_AZ), math.radians(SUN_EL)
sd = Vector((math.sin(sa) * math.cos(se), math.cos(sa) * math.cos(se), math.sin(se)))
so.rotation_euler = sd.to_track_quat('Z', 'Y').to_euler()
# The lamp lights the boat and islands but not the sea: its mirror image would burn the water out to a flat white. The water takes
# its light from the sky alone, which keeps its waves, and grade.py lays the sun's glints over the top.
lit_things = bpy.data.collections.new('LampReceivers')
for o_ in scene.objects:
    if o_.type == 'MESH' and o_.name != 'Sea':
        lit_things.objects.link(o_)
lit_things.objects.link(bpy.data.objects['Sea'])
so.light_linking.receiver_collection = lit_things
lit_things.collection_objects[list(lit_things.objects).index(bpy.data.objects['Sea'])].light_linking.link_state = 'EXCLUDE'

# The side of the boat we see faces away from the sun, so on its own it goes flat. A painter would cheat, and so does this.
_hd = math.radians(SHOT['head'])
_f = Vector((math.sin(_hd), math.cos(_hd), 0))           # the way she's heading
_n = Vector((_f.y, -_f.x, 0))                            # out of the side we can see
if _n.dot(Vector((math.sin(_az), math.cos(_az), 0))) > 0:
    _n = -_n
boat_only = bpy.data.collections.new('BoatOnly')
for nm in ('Hull__hull', 'Inner__hull', 'Trim__world', 'Mast__world', 'Cargo__world', 'Rudder__world', 'Yard__world'):
    boat_only.objects.link(bpy.data.objects[nm])

# 1. Low sunlight raking along the hull from beyond the bow. It's a near light rather than a distant one, so it falls away down her length:
# the bow and the turn of the planks catch it, and the stern sinks into shade, which is what gives a side-on hull its shape.
rake = bpy.data.lights.new('rake', 'POINT')
rake.energy = float(os.environ.get('RAKE', 8200))
rake.color = (1.0, 0.55, 0.25)
rake.shadow_soft_size = 1.5
ro = bpy.data.objects.new('rake', rake)
scene.collection.objects.link(ro)
ro.location = Vector((bx, by, 0)) + _f * 15 + _n * 9 + Vector((0, 0, 7))
ro.light_linking.receiver_collection = boat_only

# 2. Light thrown back up off the water: a rippled glowing sheet just under the surface beside her, which reaches only the boat. It lights
# the turn of the hull from below and fades as it climbs, and the sea itself doesn't block or show it.
_verts = []
_faces = []
_nx_, _ny_ = 60, 26
_c0 = Vector((bx, by, -0.75))
for i in range(_nx_ + 1):
    for j in range(_ny_ + 1):
        q = _c0 + _f * ((i / _nx_ - 0.5) * 34) + _n * (1.6 + (j / _ny_) * 14)
        _verts.append(q[:])
for i in range(_nx_):
    for j in range(_ny_):
        a_ = i * (_ny_ + 1) + j
        b_ = a_ + _ny_ + 1
        _faces.append((a_, b_, b_ + 1, a_ + 1))
_gm = bpy.data.meshes.new('bounce')
_gm.from_pydata(_verts, [], _faces)
_gm.update()
_mm = bpy.data.materials.new('bounce')
_mm.use_nodes = True
_nt = _mm.node_tree
_nt.nodes.clear()
_o = _nt.nodes.new('ShaderNodeOutputMaterial')
_e = _nt.nodes.new('ShaderNodeEmission')
_e.inputs['Color'].default_value = (1.0, 0.66, 0.36, 1)
_tc = _nt.nodes.new('ShaderNodeTexCoord')
_vn = _nt.nodes.new('ShaderNodeTexVoronoi')
_vn.feature = 'SMOOTH_F1'
_vn.inputs['Scale'].default_value = 0.55
_nt.links.new(_tc.outputs['Object'], _vn.inputs['Vector'])
_mr = _nt.nodes.new('ShaderNodeMapRange')
_mr.inputs['From Min'].default_value = 0.1
_mr.inputs['From Max'].default_value = 0.8
_mr.inputs['To Min'].default_value = 0.25
_mr.inputs['To Max'].default_value = float(os.environ.get('BOUNCE', 2.2))
_nt.links.new(_vn.outputs['Distance'], _mr.inputs['Value'])
_nt.links.new(_mr.outputs[0], _e.inputs['Strength'])
_nt.links.new(_e.outputs[0], _o.inputs['Surface'])
_gm.materials.append(_mm)
bounce = bpy.data.objects.new('bounce', _gm)
scene.collection.objects.link(bounce)
bounce.visible_camera = False
bounce.visible_glossy = False
bounce.visible_transmission = False
bounce.visible_shadow = False
bounce.light_linking.receiver_collection = boat_only
sea.visible_shadow = False

# The bird would otherwise be a dark shape against the sky, since she flies between us and the sun. A soft warm light lifts her colour.
bird_only = bpy.data.collections.new('BirdOnly')
bird_only.objects.link(bird_mesh)
bk = bpy.data.lights.new('birdkey', 'SUN')
bk.energy = float(os.environ.get('BIRDKEY', 2.0))
bk.color = (1.0, 0.8, 0.62)
bk.angle = math.radians(25)
bko = bpy.data.objects.new('birdkey', bk)
scene.collection.objects.link(bko)
_bk = Vector((math.sin(math.radians(SHOT['az'] + 180 + 30)) * 0.8, math.cos(math.radians(SHOT['az'] + 180 + 30)) * 0.8, 0.5))
bko.rotation_euler = _bk.to_track_quat('Z', 'Y').to_euler()
bko.light_linking.receiver_collection = bird_only

# 3. A little cool sky from behind the camera, which keeps the shadow side blue against all that warmth rather than filling it flat.
fill = bpy.data.lights.new('fill', 'SUN')
fill.energy = 0.42
fill.color = (0.72, 0.84, 1.0)
fill.angle = math.radians(40)
fo = bpy.data.objects.new('fill', fill)
scene.collection.objects.link(fo)
faz = math.radians(SHOT['az'] + 180 - 35)
fd = Vector((math.sin(faz) * 0.8, math.cos(faz) * 0.8, 0.6))
fo.rotation_euler = fd.to_track_quat('Z', 'Y').to_euler()

# ------------------------------------------------------------------------------------------ camera
cam = bpy.data.cameras.new('c')
co = bpy.data.objects.new('c', cam)
scene.collection.objects.link(co)
scene.camera = co
az = math.radians(SHOT['az'])
view = Vector((math.sin(az), math.cos(az), 0))
co.location = Vector((bx, by, SHOT['cam_h'])) - view * SHOT['dist']
co.rotation_euler = view.to_track_quat('-Z', 'Y').to_euler()
cam.lens_unit = 'FOV'
cam.sensor_fit = 'HORIZONTAL' if W >= H else 'VERTICAL'
cam.angle = math.radians(SHOT['fov'])
cam.clip_end = 30000
cam.clip_start = 2
cam.shift_x, cam.shift_y = SHOT['shift']

scene.camera.data.dof.use_dof = False


# ------------------------------------------------------------------------------------------ render
def render(path):
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


render(os.path.join(OUT, f'{MODE}_beauty.exr'))
log('beauty done')

# Distance and masks, flat and quick. Everything shares one material that writes camera distance into red,
# with the sea's mask in green. The sky stays transparent, so its mask is simply the alpha of this pass.
dm = bpy.data.materials.new('dist')
dm.use_nodes = True
nt = dm.node_tree
nt.nodes.clear()
out = nt.nodes.new('ShaderNodeOutputMaterial')
em = nt.nodes.new('ShaderNodeEmission')
cd = nt.nodes.new('ShaderNodeCameraData')
cb0 = nt.nodes.new('ShaderNodeCombineColor')
nt.links.new(cd.outputs['View Distance'], cb0.inputs[0])
cb0.inputs[1].default_value = 0.0
cb0.inputs[2].default_value = 0.0
nt.links.new(cb0.outputs[0], em.inputs['Color'])
nt.links.new(em.outputs[0], out.inputs['Surface'])
sm2 = bpy.data.materials.new('seadist')
sm2.use_nodes = True
nt = sm2.node_tree
nt.nodes.clear()
out = nt.nodes.new('ShaderNodeOutputMaterial')
em = nt.nodes.new('ShaderNodeEmission')
cd = nt.nodes.new('ShaderNodeCameraData')
cb = nt.nodes.new('ShaderNodeCombineColor')
nt.links.new(cd.outputs['View Distance'], cb.inputs[0])
cb.inputs[1].default_value = 1.0
cb.inputs[2].default_value = 0.0
nt.links.new(cb.outputs[0], em.inputs['Color'])
nt.links.new(em.outputs[0], out.inputs['Surface'])
for o in scene.objects:
    if o.type == 'MESH':
        o.data.materials.clear()
        o.data.materials.append(sm2 if o.name == 'Sea' else dm)
so.hide_render = True
fo.hide_render = True
ro.hide_render = True
bounce.hide_render = True
bko.hide_render = True
scene.world = None
c.samples = 8
c.use_denoising = False
c.max_bounces = 0
scene.render.filter_size = 0.01 if hasattr(scene.render, 'filter_size') else 0
render(os.path.join(OUT, f'{MODE}_data.exr'))
log('data done')
import json
json.dump(dict(w=W, h=H, az=SHOT['az'], fov=SHOT['fov'], shift=SHOT['shift'], sun_az=SUN_AZ, sun_el=SUN_EL, cam=list(co.location), mode=MODE), open(os.path.join(OUT, f'{MODE}.json'), 'w'))
print('DONE', flush=True)
