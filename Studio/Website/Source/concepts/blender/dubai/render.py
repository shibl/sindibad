# The look, camera move and rendering for the Dubai map. Opens city.blend from build.py.
#   OUT=<dir> MODE=still|seq|export FRAME=119 W=1280 H=720 SPP=64 Blender -b <dir>/city.blend -P render.py
# seq renders FROM..TO into OUT/frames, skipping frames that already exist, so a stopped run can resume.
import bpy, json, math, os, time
import numpy as np
from mathutils import Vector, Matrix
from bpy_extras.object_utils import world_to_camera_view

OUT = os.environ['OUT']
MODE = os.environ.get('MODE', 'still')
W, H = int(os.environ.get('W', 1280)), int(os.environ.get('H', 720))
SPP = int(os.environ.get('SPP', 64))
FPS, FRAMES = 30, 135
scene = bpy.context.scene
T0 = time.time()
def log(*a): print(f'[{time.time() - T0:6.1f}s]', *a, flush=True)
def hx(s, a=1.0):
    def lin(c): return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    s = s.lstrip('#')
    return (lin(int(s[0:2], 16) / 255), lin(int(s[2:4], 16) / 255), lin(int(s[4:6], 16) / 255), a)

# ---------------------------------------------------------------- render setup
pr = bpy.context.preferences.addons['cycles'].preferences
pr.compute_device_type = 'METAL'
pr.get_devices()
for d in pr.devices: d.use = d.type == 'METAL'
try: pr.metalrt = 'ON'
except Exception: pass
c = scene.cycles
scene.render.engine = 'CYCLES'
c.device = 'GPU'
c.samples = SPP
c.use_adaptive_sampling = True
c.adaptive_threshold = 0.012
c.use_denoising = True
c.denoiser = 'OPENIMAGEDENOISE'
c.denoising_input_passes = 'RGB_ALBEDO_NORMAL'
c.denoising_prefilter = 'ACCURATE'
c.max_bounces, c.diffuse_bounces, c.glossy_bounces, c.transmission_bounces, c.volume_bounces = 4, 3, 2, 0, 0
c.sample_clamp_indirect = 3.0
c.caustics_reflective = c.caustics_refractive = False
scene.render.use_persistent_data = True
scene.render.resolution_x, scene.render.resolution_y = W, H
scene.render.resolution_percentage = 100
scene.render.fps = FPS
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
scene.view_settings.exposure = 0
scene.view_settings.gamma = 1
scene.display_settings.display_device = 'sRGB'

# ---------------------------------------------------------------- the look: soft pastel clay, as in Apple Maps' 3D views
SKY = '#d9eef9'
HAZE_KM = float(os.environ.get('HAZE', 26))     # distance scale of the aerial haze, in km
haze_nodes = []
def set_haze(k):
    for n in haze_nodes: n.inputs[1].default_value = HAZE_KM * 10 * k

def shader(name, build):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Specular IOR Level'].default_value = 0.25
    bsdf.inputs['Roughness'].default_value = 0.85
    build(nt, bsdf)
    # Distance fades everything into the sky colour, like the soft horizon of a 3D map.
    cam = nt.nodes.new('ShaderNodeCameraData')
    div = nt.nodes.new('ShaderNodeMath'); div.operation = 'DIVIDE'; div.inputs[1].default_value = HAZE_KM * 10
    haze_nodes.append(div)
    nt.links.new(cam.outputs['View Distance'], div.inputs[0])
    pw = nt.nodes.new('ShaderNodeMath'); pw.operation = 'POWER'; pw.inputs[1].default_value = 1.6
    nt.links.new(div.outputs[0], pw.inputs[0])
    neg = nt.nodes.new('ShaderNodeMath'); neg.operation = 'MULTIPLY'; neg.inputs[1].default_value = -1
    nt.links.new(pw.outputs[0], neg.inputs[0])
    ex = nt.nodes.new('ShaderNodeMath'); ex.operation = 'EXPONENT'
    nt.links.new(neg.outputs[0], ex.inputs[0])
    inv = nt.nodes.new('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1
    nt.links.new(ex.outputs[0], inv.inputs[1])
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = hx(SKY); em.inputs['Strength'].default_value = 1
    mix = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(inv.outputs[0], mix.inputs[0])
    nt.links.new(bsdf.outputs[0], mix.inputs[1])
    nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs['Surface'])
    return m

def plain(color, rough=0.85, spec=0.25):
    def b(nt, bsdf):
        bsdf.inputs['Base Color'].default_value = hx(color)
        bsdf.inputs['Roughness'].default_value = rough
        bsdf.inputs['Specular IOR Level'].default_value = spec
    return b

def noise_tone(a, b_, scale):
    """A large soft drift between two tones, so big flat areas aren't dead."""
    def b(nt, bsdf):
        tc = nt.nodes.new('ShaderNodeNewGeometry')
        n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = scale; n.inputs['Detail'].default_value = 3
        nt.links.new(tc.outputs['Position'], n.inputs['Vector'])
        r = nt.nodes.new('ShaderNodeValToRGB')
        r.color_ramp.elements[0].position, r.color_ramp.elements[1].position = 0.32, 0.68
        r.color_ramp.elements[0].color, r.color_ramp.elements[1].color = hx(a), hx(b_)
        nt.links.new(n.outputs[0], r.inputs[0])
        nt.links.new(r.outputs[0], bsdf.inputs['Base Color'])
    return b

def buildings(nt, bsdf):
    """Warm clay in a few tints; towers go cooler with floor bands, roofs catch the light."""
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    a_h = nt.nodes.new('ShaderNodeAttribute'); a_h.attribute_name = 'bh'
    a_r = nt.nodes.new('ShaderNodeAttribute'); a_r.attribute_name = 'rnd'
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    cols = ['#f1eadc', '#ebe2d0', '#efe6d6', '#e6dcc9', '#f4eee3']
    ramp.color_ramp.interpolation = 'CONSTANT'
    while len(ramp.color_ramp.elements) < len(cols): ramp.color_ramp.elements.new(0.5)
    for i, col in enumerate(cols):
        ramp.color_ramp.elements[i].position = i / len(cols); ramp.color_ramp.elements[i].color = hx(col)
    nt.links.new(a_r.outputs['Fac'], ramp.inputs[0])
    # Taller means cooler and glassier.
    tall = nt.nodes.new('ShaderNodeMapRange'); tall.inputs['From Min'].default_value = 45; tall.inputs['From Max'].default_value = 130
    nt.links.new(a_h.outputs['Fac'], tall.inputs['Value'])
    glass = nt.nodes.new('ShaderNodeMix'); glass.data_type = 'RGBA'
    glass.inputs['B'].default_value = hx('#e3e5e2')
    nt.links.new(tall.outputs[0], glass.inputs['Factor'])
    nt.links.new(ramp.outputs[0], glass.inputs['A'])
    # Floor bands on the walls of tall buildings: one band every 3 floors or so.
    sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(geo.outputs['Position'], sep.inputs[0])
    wave = nt.nodes.new('ShaderNodeMath'); wave.operation = 'SINE'
    mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = 2 * math.pi / 0.11
    nt.links.new(sep.outputs['Z'], mul.inputs[0]); nt.links.new(mul.outputs[0], wave.inputs[0])
    band = nt.nodes.new('ShaderNodeMapRange'); band.inputs['From Min'].default_value = 0.2; band.inputs['From Max'].default_value = 0.7
    nt.links.new(wave.outputs[0], band.inputs['Value'])
    nsep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(geo.outputs['True Normal'], nsep.inputs[0])
    wall = nt.nodes.new('ShaderNodeMapRange'); wall.inputs['From Min'].default_value = 0.2; wall.inputs['From Max'].default_value = 0.8
    wall.inputs['To Min'].default_value = 1; wall.inputs['To Max'].default_value = 0
    nt.links.new(nsep.outputs['Z'], wall.inputs['Value'])
    k = nt.nodes.new('ShaderNodeMath'); k.operation = 'MULTIPLY'
    nt.links.new(wall.outputs[0], k.inputs[0]); nt.links.new(band.outputs[0], k.inputs[1])
    k2 = nt.nodes.new('ShaderNodeMath'); k2.operation = 'MULTIPLY'; k2.use_clamp = True
    nt.links.new(k.outputs[0], k2.inputs[0]); nt.links.new(tall.outputs[0], k2.inputs[1])
    k3 = nt.nodes.new('ShaderNodeMath'); k3.operation = 'MULTIPLY'; k3.inputs[1].default_value = 0.35
    nt.links.new(k2.outputs[0], k3.inputs[0])
    dark = nt.nodes.new('ShaderNodeMix'); dark.data_type = 'RGBA'
    dark.inputs['B'].default_value = hx('#8d9ea8')
    nt.links.new(k3.outputs[0], dark.inputs['Factor'])
    nt.links.new(glass.outputs['Result'], dark.inputs['A'])
    nt.links.new(dark.outputs['Result'], bsdf.inputs['Base Color'])
    # Rounded edges: every corner catches a little light, which is most of the toy-model look.
    bev = nt.nodes.new('ShaderNodeBevel'); bev.samples = 4; bev.inputs['Radius'].default_value = 0.012
    nt.links.new(bev.outputs[0], bsdf.inputs['Normal'])

def steel(color, band_every=None, metal=0.15, rough=0.5):
    def b(nt, bsdf):
        bsdf.inputs['Base Color'].default_value = hx(color)
        bsdf.inputs['Metallic'].default_value = metal
        bsdf.inputs['Roughness'].default_value = rough
        bsdf.inputs['Specular IOR Level'].default_value = 0.5
        bev = nt.nodes.new('ShaderNodeBevel'); bev.samples = 4; bev.inputs['Radius'].default_value = 0.012
        nt.links.new(bev.outputs[0], bsdf.inputs['Normal'])
        if band_every:
            geo = nt.nodes.new('ShaderNodeNewGeometry')
            sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(geo.outputs['Position'], sep.inputs[0])
            mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = 2 * math.pi / band_every
            nt.links.new(sep.outputs['Z'], mul.inputs[0])
            sin = nt.nodes.new('ShaderNodeMath'); sin.operation = 'SINE'; nt.links.new(mul.outputs[0], sin.inputs[0])
            mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 0.4; mr.inputs['From Max'].default_value = 0.9
            mr.inputs['To Max'].default_value = 0.3
            nt.links.new(sin.outputs[0], mr.inputs['Value'])
            mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'
            mx.inputs['A'].default_value = hx(color); mx.inputs['B'].default_value = hx('#6f8aa0')
            nt.links.new(mr.outputs[0], mx.inputs['Factor'])
            nt.links.new(mx.outputs['Result'], bsdf.inputs['Base Color'])
    return b

def water(nt, bsdf):
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = 0.09; n.inputs['Detail'].default_value = 2
    nt.links.new(geo.outputs['Position'], n.inputs['Vector'])
    r = nt.nodes.new('ShaderNodeValToRGB')
    r.color_ramp.elements[0].position, r.color_ramp.elements[1].position = 0.35, 0.65
    r.color_ramp.elements[0].color, r.color_ramp.elements[1].color = hx('#6cc4f3'), hx('#86d3f8')
    nt.links.new(n.outputs[0], r.inputs[0]); nt.links.new(r.outputs[0], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.32
    bsdf.inputs['Specular IOR Level'].default_value = 0.35
    fine = nt.nodes.new('ShaderNodeTexNoise'); fine.inputs['Scale'].default_value = 26; fine.inputs['Detail'].default_value = 3
    nt.links.new(geo.outputs['Position'], fine.inputs['Vector'])
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.06; bump.inputs['Distance'].default_value = 0.02
    nt.links.new(fine.outputs[0], bump.inputs['Height']); nt.links.new(bump.outputs[0], bsdf.inputs['Normal'])

def tree_mat(nt, bsdf):
    a_r = nt.nodes.new('ShaderNodeAttribute'); a_r.attribute_name = 'rnd'
    r = nt.nodes.new('ShaderNodeValToRGB')
    r.color_ramp.elements[0].color, r.color_ramp.elements[1].color = hx('#a2d28e'), hx('#bbe0a2')
    nt.links.new(a_r.outputs['Fac'], r.inputs[0]); nt.links.new(r.outputs[0], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.8

LOOK = {
    'm_land': noise_tone('#f5efe2', '#f0e6d2', 0.05),
    'm_sand': plain('#f8eecb', 0.95),
    'm_green': noise_tone('#bbe59c', '#c7ebab', 0.4),
    'm_water': water,
    'm_sea': water,
    'm_road': plain('#ffffff', 0.9),
    'm_road_edge': plain('#dcd5c7', 0.9),
    'm_road_big': plain('#fff7dc', 0.9),
    'm_road_big_edge': plain('#d9cfb9', 0.9),
    'm_rail': plain('#f0a6a0', 0.8),
    'm_city_near': buildings,
    'm_city_far': buildings,
    'm_burj_khalifa': steel('#b4cfe6', band_every=0.13),
    'm_future': steel('#d8e4ec', metal=0.5, rough=0.32),
    'm_frame': steel('#eac870', metal=0.55, rough=0.38),
    'm_burj_al_arab': steel('#f2f4f6', metal=0.0, rough=0.5),
    'm_ain_dubai': steel('#e7ebee', metal=0.2, rough=0.5),
    'm_jets': plain('#ffffff', 0.6),
    'm_trees': tree_mat,
}
for name, b in LOOK.items():
    if bpy.data.materials.get(name): shader(name, b)

# ---------------------------------------------------------------- light
w = bpy.data.worlds.get('World') or bpy.data.worlds.new('World')
scene.world = w
w.use_nodes = True
wn = w.node_tree; wn.nodes.clear()
w_out = wn.nodes.new('ShaderNodeOutputWorld')
w_amb = wn.nodes.new('ShaderNodeBackground'); w_amb.inputs['Color'].default_value = hx(SKY); w_amb.inputs['Strength'].default_value = float(os.environ.get('AMB', 0.48))
# What the camera sees is a brighter sky than what lights the city: it starts at the haze colour on the horizon and deepens upward.
w_sky = wn.nodes.new('ShaderNodeBackground'); w_sky.inputs['Strength'].default_value = 1
w_tc = wn.nodes.new('ShaderNodeTexCoord'); w_sp = wn.nodes.new('ShaderNodeSeparateXYZ')
wn.links.new(w_tc.outputs['Generated'], w_sp.inputs[0])
w_rp = wn.nodes.new('ShaderNodeValToRGB')
w_rp.color_ramp.elements[0].position, w_rp.color_ramp.elements[1].position = 0.0, 0.32
w_rp.color_ramp.elements[0].color, w_rp.color_ramp.elements[1].color = hx(SKY), hx('#9fd2f3')
wn.links.new(w_sp.outputs['Z'], w_rp.inputs[0]); wn.links.new(w_rp.outputs[0], w_sky.inputs['Color'])
w_lp = wn.nodes.new('ShaderNodeLightPath'); w_mx = wn.nodes.new('ShaderNodeMixShader')
wn.links.new(w_lp.outputs['Is Camera Ray'], w_mx.inputs[0])
wn.links.new(w_amb.outputs[0], w_mx.inputs[1]); wn.links.new(w_sky.outputs[0], w_mx.inputs[2])
wn.links.new(w_mx.outputs[0], w_out.inputs['Surface'])
sun = bpy.data.lights.get('sun') or bpy.data.lights.new('sun', 'SUN')
sun.energy = float(os.environ.get('SUN', 2.4))
sun.angle = math.radians(float(os.environ.get('SUNA', 7)))
sun.color = (1.0, 0.965, 0.91)
so = bpy.data.objects.get('sun') or bpy.data.objects.new('sun', sun)
if so.name not in scene.collection.objects: scene.collection.objects.link(so)
az, el = math.radians(float(os.environ.get('SUNAZ', 215))), math.radians(float(os.environ.get('SUNEL', 46)))   # from the south-west
so.rotation_euler = (Vector((math.sin(az) * math.cos(el), math.cos(az) * math.cos(el), math.sin(el)))).to_track_quat('Z', 'Y').to_euler()

# ---------------------------------------------------------------- the move: a flat 2D map tilts up into 3D as the towers rise
cam_d = bpy.data.cameras.get('cam') or bpy.data.cameras.new('cam')
cam_d.sensor_width = 36
cam_d.clip_start, cam_d.clip_end = 0.5, 6000
cam = bpy.data.objects.get('cam') or bpy.data.objects.new('cam', cam_d)
if cam.name not in scene.collection.objects: scene.collection.objects.link(cam)
scene.camera = cam

def ss(x):   # smootherstep
    x = max(0.0, min(1.0, x))
    return x * x * x * (x * (6 * x - 15) + 10)
def lerp(a, b, t): return a + (b - a) * t

# Final shot, looking north-west over the tower toward the Gulf. All overridable while looking for the frame.
END = dict(tx=float(os.environ.get('TX', 0)), ty=float(os.environ.get('TY', 0)), tz=float(os.environ.get('TZ', 2.7)),
           dist=float(os.environ.get('DIST', 29)), az=float(os.environ.get('AZ', 138)), el=float(os.environ.get('EL', 15.5)),
           lens=float(os.environ.get('LENS', 27)))
START = dict(tx=0.6, ty=0.4, tz=0.0, dist=62.0, az=END['az'] - 62, el=89.6, lens=END['lens'])

def shot(f):
    """Camera parameters at frame f. Everything lands together at frame 118, with a long soft ease."""
    t = f / 118
    e = ss((t - 0.06) / 0.94)
    pitch = ss((t - 0.12) / 0.88)
    return dict(tx=lerp(START['tx'], END['tx'], e), ty=lerp(START['ty'], END['ty'], e), tz=lerp(START['tz'], END['tz'], e),
                dist=START['dist'] * (END['dist'] / START['dist']) ** e, az=lerp(START['az'], END['az'], e),
                el=lerp(START['el'], END['el'], pitch), lens=END['lens'])

def place(p):
    cam_d.lens = p['lens']
    a, e = math.radians(p['az']), math.radians(p['el'])
    t = Vector((p['tx'], p['ty'], p['tz']))
    pos = t + p['dist'] * Vector((math.sin(a) * math.cos(e), math.cos(a) * math.cos(e), math.sin(e)))
    head = Vector((-math.sin(a), -math.cos(a), 0))       # stays defined when looking straight down
    fwd = (t - pos).normalized()
    right = head.cross(Vector((0, 0, 1))).normalized()
    up = right.cross(fwd).normalized()
    cam.matrix_world = Matrix((
        (right.x, up.x, -fwd.x, pos.x), (right.y, up.y, -fwd.y, pos.y),
        (right.z, up.z, -fwd.z, pos.z), (0, 0, 0, 1)))

# ---------------------------------------------------------------- the rise
rise = np.load(os.path.join(OUT, 'rise.npz'))
near = bpy.data.objects['city_near']; tree = bpy.data.objects['trees']
nv = len(near.data.vertices); tv = len(tree.data.vertices)
near_co = np.zeros(nv * 3, dtype=np.float32); near.data.vertices.foreach_get('co', near_co)
tree_co = np.zeros(tv * 3, dtype=np.float32); tree.data.vertices.foreach_get('co', tree_co)
near_delay, tree_delay = rise['near_delay'], rise['tree_delay']
tree_base = np.zeros(tv, dtype=np.float32)

def out_back(x, over=1.25):
    """Rises past the target a touch, then settles."""
    x = np.clip(x, 0, 1) - 1
    return 1 + (over + 1) * x * x * x + over * x * x

def stage(f):
    """Grows every tower for frame f: a wave leaves the Burj and spreads out across the city."""
    t = f / FPS
    # Looking straight down there is no air to look through, so the haze only arrives with the tilt.
    set_haze(lerp(6.0, 1.0, ss((f / 118 - 0.25) / 0.6)))
    start = 0.55 + near_delay * 1.25
    s = out_back((t - start) / 0.85, 0.7)
    co = near_co.copy()
    co[2::3] = near_co[2::3] * np.maximum(s, 0.0015)
    near.data.vertices.foreach_set('co', co); near.data.update()
    st = 1.5 + tree_delay * 1.1
    ts = out_back((t - st) / 0.6, 1.6)
    co = tree_co.copy()
    co[2::3] = tree_co[2::3] * np.maximum(ts, 0.002)
    tree.data.vertices.foreach_set('co', co); tree.data.update()
    # The tower itself keeps climbing the longest and lands last, with the camera.
    def set_z(name, k):
        ob = bpy.data.objects.get(name)
        if ob: ob.scale = (1, 1, max(k, 0.0015))
    set_z('burj_khalifa', float(out_back((t - 0.45) / 3.0, 0.32)))
    set_z('frame', float(out_back((t - 1.0) / 1.0, 0.8)))
    set_z('burj_al_arab', 1.0); set_z('ain_dubai', 1.0)
    ob = bpy.data.objects.get('future')
    if ob:
        k = float(out_back((t - 1.1) / 0.9, 1.0)); ob.scale = (1, 1, max(k, 0.0015))
    set_z('jets', float(max(0.0, min(1.0, (t - 3.0) / 0.6))))

def render(f, path):
    place(shot(f)); stage(f)
    scene.frame_set(f)
    bpy.context.view_layer.update()
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)

if MODE == 'still':
    f = int(os.environ.get('FRAME', FRAMES - 1))
    scene.render.image_settings.file_format = 'PNG'
    render(f, os.path.join(OUT, os.environ.get('NAME', f'still-{f:03d}') + '.png'))
    log('rendered', f)
elif MODE == 'seq':
    SEQ = os.path.join(OUT, os.environ.get('SEQ', 'frames'))
    os.makedirs(SEQ, exist_ok=True)
    scene.render.image_settings.file_format = 'PNG'
    for f in range(int(os.environ.get('FROM', 0)), int(os.environ.get('TO', FRAMES - 1)) + 1, int(os.environ.get('STEP', 1))):
        path = os.path.join(SEQ, f'f{f:04d}.png')
        if os.path.exists(path): continue
        t = time.time()
        render(f, path)
        log(f'frame {f} took {time.time() - t:.1f}s')
elif MODE == 'export':
    # Where things land on screen in the final frame, as fractions of the picture, for the page's pins and traffic.
    place(shot(FRAMES - 1)); stage(FRAMES - 1); bpy.context.view_layer.update()
    scene.render.resolution_x, scene.render.resolution_y = 1920, 1080
    dg = bpy.context.evaluated_depsgraph_get()
    eye = cam.matrix_world.translation.copy()
    def proj(x, y, z=0.0):
        p = world_to_camera_view(scene, cam, Vector((x, y, z)))
        return [round(p.x, 4), round(1 - p.y, 4), round(p.z, 2)]
    def clear(x, y, z):
        """True if nothing stands between the camera and this point."""
        to = Vector((x, y, z))
        d = to - eye
        hit, loc, _n, _i, ob, _m = scene.ray_cast(dg, eye, d.normalized(), distance=d.length + 0.5)
        return (not hit) or (loc - to).length < 0.5 or ob.name.startswith(('road', 'land', 'green', 'sand', 'water', 'rail', 'trees', 'sea'))
    from_ll = lambda lat, lon: ((lon - 55.27436) * math.cos(math.radians(25.19716)) * 111320 / 100, (lat - 25.19716) * 110574 / 100)
    pins = {
        'burj_khalifa': proj(0, 0, 8.45),
        'fountain': proj(-0.75, -1.55, 1.1),
        'future': proj(*from_ll(25.21925, 55.28173), 0.95),
        'world': proj(*from_ll(25.2245, 55.1740), 0.05),
        'la_mer': proj(*from_ll(25.2318, 55.2508), 0.1),
    }
    routes = []
    dbg = [0, 0, 0]
    for r in json.load(open(os.path.join(OUT, 'routes.json'))):
        run = []
        def flush():
            global run
            if len(run) > 8: routes.append({'k': r['k'], 'p': run})
            run = []
        for (a, b), (c, d) in zip(r['p'], r['p'][1:]):
            n = max(1, int(math.hypot(c - a, d - b) / 0.4))
            for k in range(n):
                x, y = a + (c - a) * k / n, b + (d - b) * k / n
                s_ = proj(x, y, 0.02)
                inf = s_[2] > 1 and -0.02 < s_[0] < 1.02 and 0.0 < s_[1] < 1.02
                vis = inf and clear(x, y, 0.02)
                dbg[0] += 1; dbg[1] += inf; dbg[2] += vis
                if vis:
                    run.append([s_[0], s_[1], round(1 / s_[2], 4)])
                else:
                    flush()
        flush()
    json.dump({'aspect': 16 / 9, 'pins': pins, 'routes': routes}, open(os.path.join(OUT, 'dubai-map.json'), 'w'), separators=(',', ':'))
    log('samples, in frame, visible', dbg)
    log('exported', len(routes), 'routes,', sum(len(x['p']) for x in routes), 'points', pins)
elif MODE == 'thumbs':
    # The round pictures in the pins: each landmark photographed close up, in the same world and light.
    from_ll = lambda lat, lon: ((lon - 55.27436) * math.cos(math.radians(25.19716)) * 111320 / 100, (lat - 25.19716) * 110574 / 100)
    fu, wo, lm = from_ll(25.21925, 55.28173), from_ll(25.2245, 55.1740), from_ll(25.2318, 55.2508)
    SHOTS = {
        'burj_khalifa': dict(tx=0, ty=0, tz=4.6, dist=17, az=138, el=12, lens=50),
        'fountain': dict(tx=0.9, ty=-2.2, tz=0.7, dist=9, az=165, el=16, lens=40),
        'future': dict(tx=fu[0], ty=fu[1], tz=0.42, dist=3.4, az=205, el=13, lens=50),
        'world': dict(tx=wo[0], ty=wo[1], tz=0, dist=62, az=210, el=68, lens=35),
        'la_mer': dict(tx=lm[0], ty=lm[1], tz=0, dist=13, az=170, el=30, lens=35),
    }
    scene.render.resolution_x = scene.render.resolution_y = 256
    scene.render.image_settings.file_format = 'WEBP'
    scene.render.image_settings.quality = 88
    stage(FRAMES - 1); set_haze(6)
    for name, p in SHOTS.items():
        place(p); bpy.context.view_layer.update()
        scene.render.filepath = os.path.join(OUT, f'pin-{name}.webp')
        bpy.ops.render.render(write_still=True)
        log('pin', name)
elif MODE == 'bake':
    # The light falling on the ground, from straight above, with towers and trees hidden from the camera but still casting
    # shadow. The page multiplies its map colours by this picture, so the ground gets Blender's soft shadows live.
    BX, BY, BS = float(os.environ.get('BX', -20)), float(os.environ.get('BY', 22)), float(os.environ.get('BS', 204.8))
    stage(FRAMES - 1); set_haze(1000)
    # The ground should see the detailed tower from burj.py, not the simple one in the city file.
    for name in ('burj_khalifa', 'burj_khalifa.spire'):
        if bpy.data.objects.get(name): bpy.data.objects[name].hide_render = True
    bl = os.path.join(os.path.dirname(os.environ['SCRIPT_DIR'] + '/x'), 'burj.blend')
    if os.path.exists(bl):
        with bpy.data.libraries.load(bl) as (src, dst): dst.objects = ['burj_detail']
        scene.collection.objects.link(dst.objects[0])
    for ob in scene.objects:
        if ob.type == 'MESH' and not ob.name.startswith(('land', 'sea', 'sand', 'green', 'water', 'road', 'rail')):
            ob.visible_camera = False
    white = bpy.data.materials.new('white'); white.use_nodes = True
    pb = white.node_tree.nodes['Principled BSDF']
    pb.inputs['Base Color'].default_value = (1, 1, 1, 1); pb.inputs['Roughness'].default_value = 1; pb.inputs['Specular IOR Level'].default_value = 0
    bpy.context.view_layer.material_override = white
    # Sky light only: how much of the sky each spot of ground can see. The page adds the sun and moon itself, wherever they are.
    sun.energy = 0
    w_amb.inputs['Color'].default_value = (1, 1, 1, 1); w_amb.inputs['Strength'].default_value = 1
    c.max_bounces, c.diffuse_bounces = 3, 2
    cam_d.type = 'ORTHO'; cam_d.ortho_scale = BS
    cam.matrix_world = Matrix(((1, 0, 0, BX), (0, 1, 0, BY), (0, 0, 1, 400), (0, 0, 0, 1)))
    scene.render.resolution_x = scene.render.resolution_y = W
    scene.render.image_settings.file_format = 'PNG'
    scene.render.filepath = os.path.join(OUT, 'ao.png')
    bpy.ops.render.render(write_still=True)
    log('baked', W, 'px over', BS, 'units')
elif MODE == 'probe':
    # Names what is under given picture positions: PX="x,y;x,y" in 0..1 from the top-left.
    f = int(os.environ.get('FRAME', 149))
    place(shot(f)); stage(f); bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    fr = cam_d.view_frame(scene=scene)      # top-right, bottom-right, bottom-left, top-left
    m = cam.matrix_world
    for s in os.environ['PX'].split(';'):
        u, v = map(float, s.split(','))
        local = fr[3].lerp(fr[0], u).lerp(fr[2].lerp(fr[1], u), v)
        o = m.translation
        d = ((m @ local) - o).normalized()
        hit, loc, nor, idx, ob, _ = scene.ray_cast(dg, o, d)
        ma = ob.data.materials[ob.data.polygons[idx].material_index].name if hit and ob.data.materials else None
        print('PROBE', s, ob.name if hit else None, ma, 'at', [round(c, 2) for c in loc], 'n', [round(c, 2) for c in nor], flush=True)
