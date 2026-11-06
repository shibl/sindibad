# Shared helpers for the "World out of a phone" scene: colours, node building, Cycles setup, mesh lofting.
import bpy, math, os
import numpy as np

WORK = os.environ.get('WORK', '/tmp/phone-work')
TEX = os.path.join(WORK, 'tex')
os.makedirs(TEX, exist_ok=True)


def lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hx(s, a=1.0):
    s = s.lstrip('#')
    return (lin(int(s[0:2], 16) / 255), lin(int(s[2:4], 16) / 255), lin(int(s[4:6], 16) / 255), a)


def setup_cycles(w, h, spp=64, threshold=0.02, bounces=(6, 3, 4, 6, 0), denoise=True):
    scene = bpy.context.scene
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
    c.samples = spp
    c.use_adaptive_sampling = True
    c.adaptive_threshold = threshold
    c.use_denoising = denoise
    c.denoiser = 'OPENIMAGEDENOISE'
    c.denoising_input_passes = 'RGB_ALBEDO_NORMAL'
    c.denoising_prefilter = 'ACCURATE'
    c.max_bounces, c.diffuse_bounces, c.glossy_bounces, c.transmission_bounces, c.volume_bounces = bounces
    c.transparent_max_bounces = 16
    c.sample_clamp_indirect = 6.0
    c.sample_clamp_direct = 0
    c.caustics_reflective = False
    c.caustics_refractive = False
    scene.render.use_persistent_data = True
    scene.render.resolution_x, scene.render.resolution_y = w, h
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = os.environ.get('LOOK_CM', 'AgX - Medium High Contrast')
    scene.view_settings.exposure = 0
    scene.view_settings.gamma = 1
    scene.display_settings.display_device = 'sRGB'


class N:
    """A small wrapper to keep shader graphs readable."""

    def __init__(self, mat):
        mat.use_nodes = True
        self.t = mat.node_tree
        self.t.nodes.clear()

    def __call__(self, kind, **props):
        node = self.t.nodes.new(kind if kind.startswith(('Shader', 'NodeGroup')) else f'ShaderNode{kind}')
        inputs = props.pop('inputs', {})
        for k, v in props.items():
            setattr(node, k, v)
        for k, v in inputs.items():
            self.set(node.inputs[k], v)
        return node

    def set(self, sock, v):
        if isinstance(v, bpy.types.NodeSocket):
            self.t.links.new(v, sock)
        else:
            sock.default_value = v

    def link(self, a, b):
        self.t.links.new(a, b)

    def math(self, op, a, b=None, clamp=False):
        m = self('Math', operation=op, use_clamp=clamp)
        self.set(m.inputs[0], a)
        if b is not None:
            self.set(m.inputs[1], b)
        return m.outputs[0]

    def mix(self, fac, a, b, blend='MIX'):
        m = self('Mix', data_type='RGBA', blend_type=blend)
        self.set(m.inputs['Factor'], fac)
        self.set(m.inputs['A'], a)
        self.set(m.inputs['B'], b)
        return m.outputs['Result']

    def ramp(self, fac, stops, interp='LINEAR'):
        r = self('ValToRGB')
        r.color_ramp.interpolation = interp
        cr = r.color_ramp
        while len(cr.elements) > 1:
            cr.elements.remove(cr.elements[-1])
        cr.elements[0].position = stops[0][0]
        cr.elements[0].color = stops[0][1] if not isinstance(stops[0][1], str) else hx(stops[0][1])
        for pos, col in stops[1:]:
            e = cr.elements.new(pos)
            e.color = col if not isinstance(col, str) else hx(col)
        self.set(r.inputs['Fac'], fac)
        return r.outputs['Color']

    def image(self, path, coord=None, colorspace='Non-Color', interp='Cubic', ext='CLIP'):
        im = bpy.data.images.load(path, check_existing=True)
        im.colorspace_settings.name = colorspace
        node = self('TexImage', image=im, interpolation=interp, extension=ext)
        if coord is not None:
            self.link(coord, node.inputs['Vector'])
        return node


def material(name):
    return bpy.data.materials.get(name) or bpy.data.materials.new(name)


def collection(name):
    col = bpy.data.collections.get(name)
    if not col:
        col = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(col)
    return col


def make_object(name, verts, faces, col=None, mats=(), smooth=True, angle=None, uvs=None):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([tuple(v) for v in verts], [], faces)
    mesh.update()
    if uvs is not None:
        layer = mesh.uv_layers.new(name='UVMap')
        for poly in mesh.polygons:
            for li in poly.loop_indices:
                layer.data[li].uv = uvs[mesh.loops[li].vertex_index]
    if smooth:
        mesh.shade_smooth()
        if angle is not None:
            mesh.set_sharp_from_angle(angle=math.radians(angle))
    for m in mats:
        mesh.materials.append(m)
    ob = bpy.data.objects.new(name, mesh)
    (col or bpy.context.scene.collection).objects.link(ob)
    return ob


def rounded_rect(hw, hh, r, seg=14):
    """Outline of a rounded rectangle, counter-clockwise from the right side. seg points per corner."""
    pts = []
    r = max(r, 1e-4)
    for cx, cy, a0 in ((hw - r, hh - r, 0), (-hw + r, hh - r, 90), (-hw + r, -hh + r, 180), (hw - r, -hh + r, 270)):
        for i in range(seg + 1):
            a = math.radians(a0 + 90 * i / seg)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def loft(name, hw, hh, r, rings, col=None, mats=(), seg=14, cap_top=True, cap_bottom=True, angle=None, uv_box=None, deform=None):
    """A rounded-rectangle loft: rings are (inset, z) from bottom to top."""
    verts, faces, uvs = [], [], []
    count = None
    for inset, z in rings:
        o = rounded_rect(hw - inset, hh - inset, max(r - inset, 0.02), seg)
        count = len(o)
        for x, y in o:
            verts.append((x, y, z))
    n = len(rings)
    for j in range(n - 1):
        for i in range(count):
            a, b = j * count + i, j * count + (i + 1) % count
            c, d = (j + 1) * count + (i + 1) % count, (j + 1) * count + i
            faces.append((a, b, c, d))
    if cap_bottom:
        faces.append(tuple(reversed(range(count))))
    if cap_top:
        faces.append(tuple((n - 1) * count + i for i in range(count)))
    if deform:
        verts = [deform(*v) for v in verts]
    if uv_box:
        ux0, uy0, ux1, uy1 = uv_box
        uvs = [((v[0] - ux0) / (ux1 - ux0), (v[1] - uy0) / (uy1 - uy0)) for v in verts]
    return make_object(name, verts, faces, col, mats, True, angle, uvs if uv_box else None)


def save_png(path, arr):
    """arr: float array HxW, HxWx3 or HxWx4 in 0..1, top row first. Written as 8 bit."""
    a = np.asarray(arr, np.float32)
    if a.ndim == 2:
        a = np.dstack([a, a, a])
    if a.shape[2] == 3:
        a = np.dstack([a, np.ones(a.shape[:2], np.float32)])
    h, w = a.shape[:2]
    name = os.path.basename(path) + '.tmp'
    im = bpy.data.images.new(name, w, h, alpha=True, float_buffer=False)
    im.colorspace_settings.name = 'Non-Color'
    im.pixels.foreach_set(a[::-1].ravel())
    im.filepath_raw = path
    im.file_format = 'PNG'
    im.save()
    bpy.data.images.remove(im)


def gauss_blur(a, s):
    """A gaussian blur by FFT, for speed. Wraps at the edges, which is fine for these maps."""
    if s <= 0:
        return a
    h, w = a.shape[:2]
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.rfftfreq(w)[None, :]
    g = np.exp(-2 * (math.pi * s) ** 2 * (fx * fx + fy * fy))
    return np.fft.irfft2(np.fft.rfft2(a) * g, s=(h, w)).astype(np.float32)
