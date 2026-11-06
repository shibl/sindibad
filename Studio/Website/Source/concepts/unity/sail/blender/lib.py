# Small modelling kit shared by the world builder and the key art. Everything is plain arrays of positions, faces and
# vertex colours, gathered into a Geo and written out as one mesh, so a hull, an island or a bird are just code.
import bmesh, bpy, math, os, random
import numpy as np
from mathutils import Matrix, Vector


def lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hx(s, a=1.0):
    """A hex colour as linear RGBA, which is what every colour below is held in until export."""
    s = s.lstrip('#')
    return np.array([lin(int(s[0:2], 16) / 255), lin(int(s[2:4], 16) / 255), lin(int(s[4:6], 16) / 255), a], np.float32)


def mix(a, b, t):
    return a + (b - a) * t


def sstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def spline(xs, ys, x):
    """A smooth curve through control points (Catmull-Rom by way of a dense linear table), for hull lines."""
    xs = np.asarray(xs, float)
    ys = np.asarray(ys, float)
    fine = np.linspace(xs[0], xs[-1], 400)
    v = np.interp(fine, xs, ys)
    k = np.hanning(41)
    k /= k.sum()
    pad = np.pad(v, 20, mode='edge')
    v = np.convolve(pad, k, mode='valid')
    return np.interp(x, fine, v)


# ------------------------------------------------------------------------------------------- noise
_rng = np.random.default_rng(7)
_tab = _rng.random((256, 256), dtype=np.float32)


def vnoise(x, y, seed=0):
    x = np.asarray(x, np.float32) + seed * 17.13
    y = np.asarray(y, np.float32) + seed * 9.71
    xi = np.floor(x).astype(np.int32)
    yi = np.floor(y).astype(np.int32)
    fx = x - xi
    fy = y - yi
    fx = fx * fx * (3 - 2 * fx)
    fy = fy * fy * (3 - 2 * fy)
    a = _tab[xi & 255, yi & 255]
    b = _tab[(xi + 1) & 255, yi & 255]
    c = _tab[xi & 255, (yi + 1) & 255]
    d = _tab[(xi + 1) & 255, (yi + 1) & 255]
    return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy


def fbm(x, y, oct=4, seed=0, gain=0.5, lac=2.03):
    s = 0
    amp = 1
    tot = 0
    for i in range(oct):
        s = s + amp * vnoise(x, y, seed + i)
        tot += amp
        amp *= gain
        x = np.asarray(x) * lac + 3.1
        y = np.asarray(y) * lac - 1.7
    return s / tot


# ------------------------------------------------------------------------------------------- geometry
class Geo:
    def __init__(self):
        self.v, self.f, self.c, self.uv = [], [], [], []
        self.n = 0

    def add(self, verts, faces, col, uv=None):
        verts = np.asarray(verts, np.float32).reshape(-1, 3)
        if len(verts) == 0:
            return self
        col = np.asarray(col, np.float32)
        if col.ndim == 1:
            col = np.tile(col, (len(verts), 1))
        if uv is None:
            uv = np.zeros((len(verts), 2), np.float32)
        self.v.append(verts)
        self.c.append(col)
        self.uv.append(np.asarray(uv, np.float32))
        n = self.n
        self.f.extend([tuple(i + n for i in face) for face in faces])
        self.n += len(verts)
        return self

    def merge(self, other, m=None):
        for v, c, u in zip(other.v, other.c, other.uv):
            self.v.append(xf(v, m) if m is not None else v)
            self.c.append(c)
            self.uv.append(u)
        n = self.n
        self.f.extend([tuple(i + n for i in face) for face in other.f])
        self.n += other.n
        return self

    def tris(self):
        return sum(len(f) - 2 for f in self.f)


def xf(v, m):
    """Applies a mathutils Matrix to an Nx3 array."""
    a = np.array(m, np.float32)
    v = np.asarray(v, np.float32)
    return v @ a[:3, :3].T + a[:3, 3]


def TRS(pos=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)):
    """A transform from a position, Euler degrees (XYZ) and scale."""
    from mathutils import Euler
    if not hasattr(scale, '__len__'):
        scale = (scale, scale, scale)
    r = Euler([math.radians(a) for a in rot], 'XYZ').to_matrix().to_4x4()
    s = Matrix.Diagonal((*scale, 1))
    return Matrix.Translation(pos) @ r @ s


def grid_faces(r, m, closed=False, flip=False):
    """Quads for r rings of m points each."""
    faces = []
    span = m if closed else m - 1
    for i in range(r - 1):
        for j in range(span):
            a = i * m + j
            b = i * m + (j + 1) % m
            c = (i + 1) * m + (j + 1) % m
            d = (i + 1) * m + j
            faces.append((a, d, c, b) if flip else (a, b, c, d))
    return faces


def loft(g, rings, col, closed=True, caps=(False, False), uv=None, flip=False):
    """A skin over rings of points, shape (r, m, 3). `col` may be one colour or a function of (ring, point) indices."""
    rings = np.asarray(rings, np.float32)
    r, m = rings.shape[:2]
    faces = grid_faces(r, m, closed, flip)
    v = rings.reshape(-1, 3)
    if callable(col):
        c = np.array([col(i, j) for i in range(r) for j in range(m)], np.float32)
    else:
        c = col
    if caps[0]:
        faces.append(tuple(range(m)) if flip else tuple(reversed(range(m))))
    if caps[1]:
        base = (r - 1) * m
        faces.append(tuple(reversed(range(base, base + m))) if flip else tuple(range(base, base + m)))
    g.add(v, faces, c, uv)
    return g


def frames(path):
    """Parallel transport along a polyline. Returns the tangent, normal and binormal at each point."""
    path = np.asarray(path, float)
    t = np.gradient(path, axis=0)
    t /= np.maximum(np.linalg.norm(t, axis=1, keepdims=True), 1e-9)
    n = np.zeros_like(t)
    up = np.array([0, 0, 1.0]) if abs(t[0][2]) < 0.9 else np.array([0, 1.0, 0])
    n0 = np.cross(t[0], up)
    n0 /= np.linalg.norm(n0)
    n[0] = n0
    for i in range(1, len(t)):
        v = n[i - 1] - t[i] * np.dot(n[i - 1], t[i])
        n[i] = v / max(np.linalg.norm(v), 1e-9)
    b = np.cross(t, n)
    return t, n, b


def tube(g, path, radius, col, sides=6, caps=(True, True), flat=1.0, uv_v=None):
    """A swept tube. `radius` is a number or one value per path point, `flat` squashes the section into a ribbon."""
    path = np.asarray(path, float)
    r = np.broadcast_to(np.asarray(radius, float), (len(path),))
    _, n, b = frames(path)
    a = np.linspace(0, 2 * math.pi, sides, endpoint=False)
    rings = []
    for i in range(len(path)):
        rings.append(path[i] + np.outer(np.cos(a), n[i]) * r[i] + np.outer(np.sin(a), b[i]) * r[i] * flat)
    uv = None
    if uv_v is not None:
        uv = np.array([[j / sides, uv_v[i]] for i in range(len(path)) for j in range(sides)], np.float32)
    return loft(g, rings, col if not callable(col) else (lambda i, j: col(i / max(1, len(path) - 1), j)), True, caps, uv)


def line(a, b, n=2):
    return np.linspace(np.asarray(a, float), np.asarray(b, float), n)


def catenary(a, b, sag=0.3, n=8):
    p = line(a, b, n)
    t = np.linspace(0, 1, n)
    p[:, 2] -= sag * 4 * t * (1 - t)
    return p


_ico = {}


def ico_data(sub):
    if sub not in _ico:
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1)
        bm.verts.ensure_lookup_table()
        v = np.array([x.co[:] for x in bm.verts], np.float32)
        f = [tuple(x.index for x in face.verts) for face in bm.faces]
        bm.free()
        _ico[sub] = (v, f)
    return _ico[sub]


def ball(g, c, r, col, sub=2, squash=(1, 1, 1), lump=0.0, seed=0.0, shade=None, uv=None):
    """A sphere, optionally lumpy. `shade` takes the unit directions and returns colours, for painted gradients."""
    v, f = ico_data(sub)
    d = v.copy()
    if lump:
        w = np.sin(d[:, 0] * 4.1 + seed) * np.sin(d[:, 1] * 3.7 + seed * 1.7) * np.sin(d[:, 2] * 4.3 + seed * 0.6)
        w += 0.5 * np.sin(d[:, 0] * 8.3 - seed) * np.sin(d[:, 1] * 9.1 + seed) * np.sin(d[:, 2] * 7.7 - seed * 2)
        d = d * (1 + lump * w)[:, None]
    p = d * r * np.asarray(squash, np.float32) + np.asarray(c, np.float32)
    colours = shade(v) if shade else col
    g.add(p, f, colours, uv)
    return g


def lathe(g, profile, col, sides=20, m=None, caps=(False, False)):
    """A surface of revolution around Z from (radius, z) pairs. `col` may be a function of (ring, angle index)."""
    a = np.linspace(0, 2 * math.pi, sides, endpoint=False)
    rings = []
    for r, z in profile:
        rings.append(np.stack([np.cos(a) * r, np.sin(a) * r, np.full(sides, z)], 1))
    rings = np.array(rings, np.float32)
    if m is not None:
        rings = xf(rings.reshape(-1, 3), m).reshape(len(profile), sides, 3)
    return loft(g, rings, col, True, caps)


def box(g, size, m, col, chamfer=0.0):
    """A box centred on the transform's origin, with its corners cut so its edges catch the light."""
    sx, sy, sz = [s / 2 for s in size]
    if chamfer <= 0:
        v = [(x, y, z) for z in (-sz, sz) for y in (-sy, sy) for x in (-sx, sx)]
        f = [(0, 2, 3, 1), (4, 5, 7, 6), (0, 1, 5, 4), (2, 6, 7, 3), (0, 4, 6, 2), (1, 3, 7, 5)]
        g.add(xf(v, m), f, col)
        return g
    c = chamfer
    v = []
    idx = {}
    for ix, x in enumerate((-1, 1)):
        for iy, y in enumerate((-1, 1)):
            for iz, z in enumerate((-1, 1)):
                for a, off in enumerate(((c, 0, 0), (0, c, 0), (0, 0, c))):
                    p = (x * (sx - off[0]), y * (sy - off[1]), z * (sz - off[2]))
                    idx[(ix, iy, iz, a)] = len(v)
                    v.append(p)
    I = lambda *k: idx[k]
    f = []
    # Six faces.
    f.append(tuple(I(1, j, k, 0) for j, k in ((0, 0), (1, 0), (1, 1), (0, 1))))
    f.append(tuple(I(0, j, k, 0) for j, k in ((0, 1), (1, 1), (1, 0), (0, 0))))
    f.append(tuple(I(j, 1, k, 1) for j, k in ((0, 1), (1, 1), (1, 0), (0, 0))))
    f.append(tuple(I(j, 0, k, 1) for j, k in ((0, 0), (1, 0), (1, 1), (0, 1))))
    f.append(tuple(I(j, k, 1, 2) for j, k in ((0, 0), (1, 0), (1, 1), (0, 1))))
    f.append(tuple(I(j, k, 0, 2) for j, k in ((0, 1), (1, 1), (1, 0), (0, 0))))
    # Twelve bevels, along the edges of each axis.
    for j in (0, 1):
        for k in (0, 1):
            flip = (j != k)
            q = (I(0, j, k, 1), I(1, j, k, 1), I(1, j, k, 2), I(0, j, k, 2))
            f.append(q if not flip else tuple(reversed(q)))
            q = (I(j, 0, k, 2), I(j, 1, k, 2), I(j, 1, k, 0), I(j, 0, k, 0))
            f.append(q if not flip else tuple(reversed(q)))
            q = (I(j, k, 0, 0), I(j, k, 1, 0), I(j, k, 1, 1), I(j, k, 0, 1))
            f.append(q if not flip else tuple(reversed(q)))
    # Eight corners.
    for ix in (0, 1):
        for iy in (0, 1):
            for iz in (0, 1):
                t = (I(ix, iy, iz, 0), I(ix, iy, iz, 1), I(ix, iy, iz, 2))
                f.append(t if (ix ^ iy ^ iz) else tuple(reversed(t)))
    g.add(xf(v, m), f, col)
    return g


# ------------------------------------------------------------------------------------------- objects
made = []


def emit(name, g, pivot=(0, 0, 0), smooth=True, angle=42, parent=None):
    """Writes a Geo out as one object. Its origin sits at `pivot`, which is where a moving part turns."""
    v = np.concatenate(g.v) - np.asarray(pivot, np.float32)
    c = np.concatenate(g.c)
    uv = np.concatenate(g.uv)
    me = bpy.data.meshes.new(name)
    me.from_pydata(v.tolist(), [], g.f)
    me.update()
    a = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    a.data.foreach_set('color', c.ravel())
    me.color_attributes.active_color = a
    if np.any(uv):
        layer = me.uv_layers.new(name='UV')
        loops = np.zeros(len(me.loops), np.int32)
        me.loops.foreach_get('vertex_index', loops)
        layer.uv.foreach_set('vector', uv[loops].ravel()) if hasattr(layer, 'uv') else layer.data.foreach_set('uv', uv[loops].ravel())
    if smooth:
        me.shade_smooth()
        if angle < 180:
            me.set_sharp_from_angle(angle=math.radians(angle))
    o = bpy.data.objects.new(name, me)
    o.location = pivot
    bpy.context.scene.collection.objects.link(o)
    made.append(o)
    print(f'  {name}: {len(v)} verts, {g.tris()} tris', flush=True)
    return o


def bake_ao(objs, samples=48, dist=8.0):
    """Bakes ambient occlusion into each object's vertex colours, which does most of the work of making them feel solid."""
    s = bpy.context.scene
    s.render.engine = 'CYCLES'
    s.cycles.device = 'CPU'
    s.cycles.samples = samples
    s.render.bake.target = 'VERTEX_COLORS'
    w = bpy.data.worlds.new('w')
    s.world = w
    w.light_settings.distance = dist
    for o in objs:
        me = o.data
        if not me.materials:
            m = bpy.data.materials.get('bakeM') or bpy.data.materials.new('bakeM')
            me.materials.append(m)
        ao = me.color_attributes.new('AO', 'FLOAT_COLOR', 'POINT')
        me.color_attributes.active_color = ao
    for o in objs:
        bpy.ops.object.select_all(action='DESELECT')
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        o.data.color_attributes.active_color = o.data.color_attributes['AO']
        bpy.ops.object.bake(type='AO', target='VERTEX_COLORS')
        me = o.data
        n = len(me.vertices)
        col = np.zeros(n * 4, np.float32)
        ao = np.zeros(n * 4, np.float32)
        me.color_attributes['Col'].data.foreach_get('color', col)
        me.color_attributes['AO'].data.foreach_get('color', ao)
        # Occlusion tints towards the sky's blue rather than to black, so shadowed creases stay colourful.
        k = np.clip(ao[0::4], 0, 1)
        k = k ** 0.8
        tint = np.array([0.46, 0.56, 0.72], np.float32)
        for i in range(3):
            col[i::4] *= k * (1.0) + (1 - k) * tint[i] * 0.5
        me.color_attributes['Col'].data.foreach_set('color', col)
        me.color_attributes.remove(me.color_attributes['AO'])
        me.color_attributes.active_color = me.color_attributes['Col']
        print('  baked AO', o.name, 'mean', float(k.mean()), flush=True)


def export_fbx(path, objs=None):
    bpy.ops.object.select_all(action='DESELECT')
    for o in (objs or made):
        o.select_set(True)
    bpy.ops.export_scene.fbx(filepath=path, use_selection=True, object_types={'MESH'}, apply_unit_scale=True, apply_scale_options='FBX_SCALE_ALL',
                             axis_forward='-Z', axis_up='Y', bake_space_transform=True, mesh_smooth_type='FACE', use_mesh_modifiers=True,
                             add_leaf_bones=False, bake_anim=False, colors_type='SRGB')
