# Renders the arcade around the machine as a panorama, for the backdrop and the reflections.
#   OUT=<Assets/Art/Textures> SPP=128 Blender -b --factory-startup -P arcade_pano.py
import bpy, math, os, random, struct, zlib
import numpy as np

OUT = os.environ['OUT']
SPP = int(os.environ.get('SPP', '256'))
random.seed(5)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
pr = bpy.context.preferences.addons['cycles'].preferences
pr.compute_device_type = 'METAL'
pr.get_devices()
for d in pr.devices:
    d.use = d.type == 'METAL'
sc.cycles.device = 'GPU'
sc.cycles.samples = SPP
sc.cycles.use_denoising = True
sc.cycles.max_bounces = 6
sc.render.resolution_x, sc.render.resolution_y = 2048, 1024
sc.render.resolution_percentage = 100
sc.view_settings.view_transform = 'Standard'
sc.render.image_settings.file_format = 'OPEN_EXR'
sc.render.image_settings.color_depth = '32'

def mat(name, col, rough=0.5, emit=None, strength=1.0, metal=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*col, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1)
        b.inputs['Emission Strength'].default_value = strength
    return m

def lin(h):
    h = h.lstrip('#')
    return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4))

def box(s, l, m, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=l, rotation=rot)
    o = bpy.context.active_object
    o.scale = s
    o.data.materials.append(m)
    return o

def glow(h, st, name=None):
    return mat(name or f'g{h}{st}', (0, 0, 0), 0.6, lin(h), st)

RX, RY, RH = 9.0, 7.5, 3.5
carpet = mat('carpet', lin('#10222c'), 0.92)
n = carpet.node_tree.nodes
tex = n.new('ShaderNodeTexVoronoi'); tex.inputs['Scale'].default_value = 6.0
ramp = n.new('ShaderNodeValToRGB')
ramp.color_ramp.elements[0].position = 0.02; ramp.color_ramp.elements[0].color = (0.55, 0.05, 0.25, 1)
ramp.color_ramp.elements[1].position = 0.09; ramp.color_ramp.elements[1].color = (0.012, 0.03, 0.04, 1)
carpet.node_tree.links.new(tex.outputs['Distance'], ramp.inputs['Fac'])
carpet.node_tree.links.new(ramp.outputs['Color'], n['Principled BSDF'].inputs['Base Color'])
box((RX * 2, RY * 2, 0.1), (0, 0, -0.05), carpet)
wall = mat('wall', lin('#1a2e38'), 0.7)
box((RX * 2, 0.1, RH), (0, RY, RH / 2), wall); box((RX * 2, 0.1, RH), (0, -RY, RH / 2), wall)
box((0.1, RY * 2, RH), (RX, 0, RH / 2), wall); box((0.1, RY * 2, RH), (-RX, 0, RH / 2), wall)
ceil = mat('ceil', lin('#0d1518'), 0.6)
box((RX * 2, RY * 2, 0.1), (0, 0, RH + 0.05), ceil)

# Ceiling lights, the big soft sources that will show up in the machine's glass and chrome.
panel = glow('#fff2dc', 4.5)
for x in (-6, -3, 0, 3, 6):
    for y in (-5, -1.5, 2, 5.4):
        box((1.8, 0.28, 0.03), (x, y, RH - 0.03), panel)
# Neon tubes around the walls.
for h, st, x0, y0, sx, sy, z in (('#fa2a6f', 18, 0, RY - 0.06, RX * 2 - 1, 0.05, 2.9), ('#22e0e0', 14, 0, RY - 0.06, RX * 2 - 1, 0.05, 3.08),
                                 ('#fa2a6f', 16, 0, -RY + 0.06, RX * 2 - 1, 0.05, 2.9), ('#ffb43c', 12, 0, -RY + 0.06, RX * 2 - 1, 0.05, 3.08),
                                 ('#22e0e0', 14, RX - 0.06, 0, 0.05, RY * 2 - 1, 2.9), ('#fa2a6f', 14, -RX + 0.06, 0, 0.05, RY * 2 - 1, 2.9)):
    box((sx, sy, 0.05), (x0, y0, z), glow(h, st))

body_dark = mat('cab_dark', lin('#14181d'), 0.42)
body_pink = mat('cab_pink', lin('#a81248'), 0.35)
body_teal = mat('cab_teal', lin('#0a5358'), 0.35)
body_yel = mat('cab_yel', lin('#b77f10'), 0.35)
SCREENS = ['#44c7ff', '#ff5fa2', '#64ff9e', '#ffd166', '#b28cff', '#ff8552']

def cabinet(x, y, face):
    """An upright arcade game. face is the rotation around Z that turns its screen to the room."""
    bd = random.choice((body_dark, body_dark, body_pink, body_teal, body_yel))
    w, d = random.uniform(0.72, 0.84), 0.82
    H = random.uniform(1.72, 1.95)
    c, s = math.cos(face), math.sin(face)
    def at(dx, dy, z):
        return (x + dx * c - dy * s, y + dx * s + dy * c, z)
    box((w, d, H), at(0, 0, H / 2), bd, (0, 0, face))
    box((w * 0.84, 0.03, 0.56), at(0, -d / 2 - 0.01, H * 0.62), glow(random.choice(SCREENS), random.uniform(3.5, 6)), (0, 0, face))
    box((w * 0.96, 0.03, 0.20), at(0, -d / 2 - 0.01, H - 0.14), glow(random.choice(SCREENS), random.uniform(4, 7)), (0, 0, face))
    box((w, 0.34, 0.1), at(0, -d / 2 - 0.12, 0.96), bd, (0, 0, face))
    for k in range(3):
        box((0.05, 0.05, 0.02), at(-0.15 + k * 0.15, -d / 2 - 0.12, 1.02), glow(random.choice(('#ff4040', '#ffd040', '#40a0ff')), 4), (0, 0, face))

def craneRow(x, y, face, h):
    """Another claw machine, a tall lit box of coloured prizes."""
    c, s = math.cos(face), math.sin(face)
    def at(dx, dy, z):
        return (x + dx * c - dy * s, y + dx * s + dy * c, z)
    bd = mat(f'crane{h}', lin(h), 0.3)
    box((1.0, 1.0, 0.85), at(0, 0, 0.42), bd, (0, 0, face))
    box((1.04, 1.04, 0.26), at(0, 0, 2.05), bd, (0, 0, face))
    box((0.8, 0.02, 0.17), at(0, -0.53, 2.05), glow('#fff0d0', 6), (0, 0, face))
    box((0.98, 0.98, 0.96), at(0, 0, 1.40), glow('#fff2e0', 0.55), (0, 0, face))
    for i in range(26):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=random.uniform(0.07, 0.11), location=at(random.uniform(-0.43, 0.43), -0.5, random.uniform(0.9, 1.3)), segments=16, ring_count=10)
        bpy.context.active_object.data.materials.append(glow(random.choice(('#fa2a6f', '#ffd166', '#44c7ff', '#64ff9e', '#ffffff', '#b28cff')), 0.75))

# The far wall, straight behind the machine as the player first sees it.
x = -8.0
while x < 8.0:
    if abs(x) < 3.2 and False:
        x += 1.0
        continue
    cabinet(x, RY - 0.65, math.pi * 0) if False else None
    x += 1.0
for i, x in enumerate(np.arange(-7.8, 8.1, 0.98)):
    cabinet(float(x), RY - 0.62, 0.0)
for i, y in enumerate(np.arange(-5.8, 6.2, 0.98)):
    cabinet(RX - 0.62, float(y), math.pi / 2)
    cabinet(-RX + 0.62, float(y), -math.pi / 2)
for i, x in enumerate(np.arange(-7.8, 8.1, 0.98)):
    cabinet(float(x), -RY + 0.62, math.pi)
# Rows of other machines in the middle of the floor, off to the sides.
for i, (x, y, f, h) in enumerate(((-3.9, 3.2, 0.25, '#0f7c88'), (-2.6, 3.5, 0.1, '#d6246e'), (2.9, 3.4, -0.12, '#e0a020'), (4.3, 3.0, -0.3, '#0f7c88'), (-5.2, 2.7, 0.35, '#e0a020'), (5.7, 2.5, -0.4, '#d6246e'))):
    craneRow(x, y, f, h)
for i, (x, y, f) in enumerate(((-2.6, -5.0, math.pi), (2.8, -5.2, math.pi), (5.2, -3.4, 2.4), (-5.3, -3.2, -2.4))):
    craneRow(x, y, f, ('#d6246e', '#0f7c88', '#e0a020', '#d6246e')[i])
# Glowing stars on the far wall, for the eye to rest on behind the machine.
def star_mesh(R, r, l, m):
    vs = []
    for i in range(10):
        a = math.pi * i / 5
        rr = R if i % 2 == 0 else r
        vs.append((rr * math.sin(a), 0, rr * math.cos(a)))
    me = bpy.data.meshes.new('s'); me.from_pydata(vs, [], [list(range(10))]); me.update()
    o = bpy.data.objects.new('s', me); sc.collection.objects.link(o); o.location = l; o.data.materials.append(m)
for (x, z, R, h) in ((-4.5, 2.62, 0.3, '#ffd166'), (-1.6, 2.72, 0.2, '#fa2a6f'), (1.9, 2.66, 0.26, '#44e0ff'), (4.9, 2.6, 0.3, '#ffd166')):
    star_mesh(R, R * 0.44, (x, RY - 0.08, z), glow(h, 11))

cam = bpy.data.cameras.new('c')
cam.type = 'PANO'
try:
    cam.panorama_type = 'EQUIRECTANGULAR'
except Exception:
    cam.cycles.panorama_type = 'EQUIRECTANGULAR'
co = bpy.data.objects.new('c', cam)
sc.collection.objects.link(co)
co.location = (0, -1.5, 1.3)
co.rotation_euler = (math.pi / 2, 0, 0)
sc.camera = co
path = os.path.join(OUT, '_pano_raw.exr')
sc.render.filepath = path
bpy.ops.render.render(write_still=True)

img = bpy.data.images.load(path)
w, h = img.size
px = np.empty(w * h * 4, np.float32)
img.pixels.foreach_get(px)
a = px.reshape(h, w, 4)[:, :, :3].astype(np.float64)     # rows bottom up

def blur(a, s):
    """A cheap Gaussian in the equirect's own pixels, wrapping sideways, in the frequency domain."""
    n, m = a.shape[:2]
    fy = np.fft.fftfreq(n)[:, None]
    fx = np.fft.fftfreq(m)[None, :]
    g = np.exp(-2 * (np.pi * s) ** 2 * (fx * fx + fy * fy))[..., None]
    return np.real(np.fft.ifft2(np.fft.fft2(a, axes=(0, 1)) * g, axes=(0, 1)))

def write_png(name, a):
    a = np.clip(a, 0, 1)
    if a.shape[2] == 3:
        a = np.concatenate([a, np.ones(a.shape[:2] + (1,))], -1)
    hh, ww = a.shape[:2]
    raw = (a * 255 + 0.5).astype(np.uint8)[::-1]
    body = b''.join(b'\0' + raw[y].tobytes() for y in range(hh))
    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    with open(os.path.join(OUT, name + '.png'), 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', ww, hh, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(body, 9)) + chunk(b'IEND', b''))

def write_hdr(name, a):
    hh, ww = a.shape[:2]
    a = np.maximum(a[::-1], 0)
    m = a.max(-1)
    e = np.ceil(np.log2(np.maximum(m, 1e-30)))
    s = 256.0 / np.power(2.0, e)
    rgbe = np.zeros((hh, ww, 4), np.uint8)
    rgbe[..., :3] = np.clip(a * s[..., None], 0, 255).astype(np.uint8)
    rgbe[..., 3] = np.clip(e + 128, 0, 255).astype(np.uint8)
    rgbe[m < 1e-30] = 0
    with open(os.path.join(OUT, name + '.hdr'), 'wb') as f:
        f.write(f'#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y {hh} +X {ww}\n'.encode())
        f.write(rgbe.tobytes())

# The backdrop is out of focus, as behind a real product shot, in display-referred colour so it compresses well.
soft = blur(a, 9.0)
tm = soft * 1.05
tm = tm / (1 + tm * 0.28)
ldr = np.power(np.clip(tm, 0, 1), 1 / 2.2)
write_png('arcade', ldr[::2, ::2])
# The reflections keep their real range, at a size that's cheap.
small = blur(a, 2.0)
step = 2
sm = small[::step, ::step]
write_hdr('arcade_hdr', sm)
print('PANO', w, h, 'mean', float(a.mean()), 'max', float(a.max()), flush=True)
