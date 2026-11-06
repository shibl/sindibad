# From the data passes and the simulation: the blueprint, the trails (density and time), depth, and the runner's routes.
# Everything is projected through the same camera as the beauty pass, so the passes register exactly.
#   OUT=<cache> DEST=<public dir> W=2560 Blender -b --factory-startup -P passes.py
import bpy, json, math, os, sys, time, struct
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from lib import *
from layout import *
from mathutils import Vector
exec(open(os.path.join(HERE, 'camera.py')).read())

OUT = os.environ['OUT']
DEST = os.environ.get('DEST', OUT)
WF = int(os.environ.get('W', 2560))
HF = WF * 9 // 16
Q_BLUE = int(os.environ.get('Q_BLUE', 90))
Q_TRAIL = int(os.environ.get('Q_TRAIL', 94))
Q_TIME = int(os.environ.get('Q_TIME', 90))
Q_DEPTH = int(os.environ.get('Q_DEPTH', 88))
BW = int(os.environ.get('BLUE_W', WF))          # blueprint's own width
TW = int(os.environ.get('TRAIL_W', WF * 3 // 4))
T0 = time.time()
def log(*a): print(f'[{time.time() - T0:6.1f}s]', *a, flush=True)

def load_exr(name):
    im = bpy.data.images.load(os.path.join(OUT, name))
    im.colorspace_settings.name = 'Non-Color'
    w, h = im.size
    px = np.empty(w * h * 4, np.float32)
    im.pixels.foreach_get(px)
    bpy.data.images.remove(im)
    return px.reshape(h, w, 4)[::-1].copy()

def save_webp(rgb, path, q):
    """rgb: display-referred 0..1, top row first. Gray arrays are written as gray."""
    if rgb.ndim == 2:
        rgb = np.stack([rgb, rgb, rgb], 2)
    h, w = rgb.shape[:2]
    px = np.ones((h, w, 4), np.float32)
    px[..., :3] = np.clip(rgb, 0, 1)
    im = bpy.data.images.new('w', w, h, alpha=False, float_buffer=False)
    im.colorspace_settings.name = 'Non-Color'
    im.pixels.foreach_set(px[::-1].ravel())
    scene = bpy.context.scene
    scene.render.image_settings.file_format = 'WEBP'
    scene.render.image_settings.quality = q
    scene.render.image_settings.color_mode = 'RGB'
    scene.view_settings.view_transform = 'Raw'
    # save_render honours the quality setting (Image.save doesn't), and a byte image tagged Non-Color passes through unchanged
    im.save_render(path, scene=scene)
    bpy.data.images.remove(im)
    log(os.path.basename(path), f'{os.path.getsize(path) / 1024:.0f} KB', f'{w}x{h}', 'q', q)

pos = load_exr('data_pos.exr')
cls_ = load_exr('data_cls.exr')
DH, DW = pos.shape[:2]
SS = DW / WF
log('data', DW, DH)
hit = pos[..., 3] > 0.5
PX, PY, PZ = pos[..., 0], pos[..., 1], pos[..., 2]
CL = np.round(cls_[..., 0]).astype(np.int8)
CL[~hit] = 0
NZ = cls_[..., 1]
FACING = cls_[..., 2]

# ----------------------------------------------------------------- the camera
C = np.array(CAM_LOC, np.float32)
q = (Vector(CAM_TARGET) - Vector(CAM_LOC)).to_track_quat('-Z', 'Y').to_matrix()
RX = np.array(q.col[0], np.float32)
RY = np.array(q.col[1], np.float32)
FW = -np.array(q.col[2], np.float32)
F = CAM_LENS / SENSOR

def project(p, width=None):
    """World points to pixel coordinates at the given width, plus the distance along the view axis."""
    width = width or DW
    height = width * 9 / 16
    p = np.asarray(p, np.float32) - C
    z = p @ FW
    z_safe = np.maximum(z, 1e-3)
    x = (p @ RX) / z_safe * F * width + width / 2
    y = height / 2 - (p @ RY) / z_safe * F * width
    return x, y, z

yy, xx = np.mgrid[0:DH, 0:DW].astype(np.float32)
rx = (xx + 0.5 - DW / 2) / (F * DW)
ry = (DH / 2 - (yy + 0.5)) / (F * DW)
ray = rx[..., None] * RX + ry[..., None] * RY + FW
camz = (pos[..., :3] - C) @ FW
DEPTH = np.where(hit, camz, 1e6)
log('camera')

# ----------------------------------------------------------------- line drawing: anti-aliased splats, depth-tested against the render
def draw_segments(layer, a, b, bias=1.2, weight=1.0, width=None, step=0.7):
    """Splat segments (n,3) a->b into a coverage layer, at the data resolution."""
    if len(a) == 0:
        return
    xa, ya, za = project(a)
    xb, yb, zb = project(b)
    good = (za > 2) & (zb > 2)
    xa, ya, za, xb, yb, zb = xa[good], ya[good], za[good], xb[good], yb[good], zb[good]
    w_arr = weight[good] if np.ndim(weight) else None
    L = np.hypot(xb - xa, yb - ya)
    on = (np.maximum(xa, xb) > 0) & (np.minimum(xa, xb) < DW) & (np.maximum(ya, yb) > 0) & (np.minimum(ya, yb) < DH)
    xa, ya, za, xb, yb, zb, L = xa[on], ya[on], za[on], xb[on], yb[on], zb[on], L[on]
    if w_arr is not None:
        w_arr = w_arr[on]
    n = np.maximum((L / step).astype(np.int64), 1)
    idx = np.repeat(np.arange(len(n)), n)
    t = (np.arange(n.sum()) - np.repeat(np.cumsum(n) - n, n) + 0.5) / np.repeat(n, n)
    sx = xa[idx] + (xb - xa)[idx] * t
    sy = ya[idx] + (yb - ya)[idx] * t
    sz = za[idx] + (zb - za)[idx] * t
    wgt = (w_arr[idx] if w_arr is not None else np.full(len(idx), weight, np.float32)) * step
    ok = (sx >= 1) & (sx < DW - 2) & (sy >= 1) & (sy < DH - 2)
    sx, sy, sz, wgt = sx[ok], sy[ok], sz[ok], wgt[ok]
    ix, iy = sx.astype(np.int64), sy.astype(np.int64)
    vis = sz <= DEPTH[iy, ix] + bias
    ix, iy, sx, sy, wgt = ix[vis], iy[vis], sx[vis], sy[vis], wgt[vis]
    fx, fy = sx - ix, sy - iy
    np.add.at(layer, (iy, ix), wgt * (1 - fx) * (1 - fy))
    np.add.at(layer, (iy, ix + 1), wgt * fx * (1 - fy))
    np.add.at(layer, (iy + 1, ix), wgt * (1 - fx) * fy)
    np.add.at(layer, (iy + 1, ix + 1), wgt * fx * fy)

def thicken(a, sigma):
    return blur(a, sigma) if sigma > 0 else a

def lines_on(field, interval, width_px, mask=None, fade_grad=None):
    """Iso-lines of a smooth per-pixel field, anti-aliased from the field's own screen gradient."""
    f = field / interval
    gy, gx = np.gradient(f)
    g = np.sqrt(gx * gx + gy * gy) + 1e-5
    dist = np.abs((f - 0.5) % 1.0 - 0.5)
    a = np.clip(width_px - dist / g, 0, 1)
    if fade_grad is not None:
        a = a * smooth(fade_grad, fade_grad * 0.45, g)
    if mask is not None:
        a = a * mask
    return a.astype(np.float32)

# ----------------------------------------------------------------- blueprint: base tone
INK, DEEP = hx('#013f3b'), hx('#012b2b')
SRGB = lambda s: np.array([int(s[1:3], 16), int(s[3:5], 16), int(s[5:7], 16)], np.float32) / 255
vign = (yy / DH)[..., None]
canvas = lerp(SRGB('#02504c')[None, None, :], SRGB('#013533')[None, None, :], vign)
LINE, MINT, PALE, PINK_ = SRGB('#d6ecf0'), SRGB('#7df3cf'), SRGB('#a9dcdd'), SRGB('#fa2a6f')

def over(rgb, color, alpha):
    a = np.clip(alpha, 0, 1)[..., None]
    return rgb * (1 - a) + color * a

# the floor: a grid hanging below the world, running to the horizon
FLOOR_Z = -128.0
tp = (FLOOR_Z - C[2]) / np.minimum(ray[..., 2], -1e-4)
down = ray[..., 2] < -0.005
fx_, fy_ = C[0] + ray[..., 0] * tp, C[1] + ray[..., 1] * tp
far = np.sqrt((fx_ - 60) ** 2 + (fy_ - 200) ** 2)
fade = np.where(down & ~hit, smooth(1600, 200, far), 0.0).astype(np.float32)
fgx = np.where(down, fx_, 0).astype(np.float32)
fgy = np.where(down, fy_, 0).astype(np.float32)
for iv, wd, al in ((10.0, 1.1, 0.16), (50.0, 1.6, 0.42)):
    canvas = over(canvas, PALE, (lines_on(fgx, iv, wd, fade_grad=0.42) + lines_on(fgy, iv, wd, fade_grad=0.42)) * fade * al)
log('floor')

# surfaces
tint = np.zeros((DH, DW), np.float32)
island_top = (CL == 1) | (CL == 6)
shade = np.clip(0.78 + 0.28 * NZ, 0, 1.2) * np.clip(0.72 + 0.42 * FACING, 0, 1.1)
fills = {1: SRGB('#035e58'), 2: SRGB('#067f7c'), 3: SRGB('#046a64'), 4: SRGB('#046a64'), 5: SRGB('#05605b'), 6: SRGB('#035550')}
fill = np.zeros((DH, DW, 3), np.float32)
for k, v in fills.items():
    fill[CL == k] = v
canvas = np.where(hit[..., None], fill * shade[..., None], canvas)
del fill

# what can be walked: a mint wash on the top surface
L = np.load(os.path.join(OUT, 'land.npz'))
Pr = np.load(os.path.join(OUT, 'props.npz'))
xs, ys = L['xs'], L['ys']
RES = float(L['RES'])
gxi = (PX - xs[0]) / RES
gyi = (PY - ys[0]) / RES
walk_all = (L['walk'] & ~Pr['obst']).astype(np.float32)
main = CL == 1
walk_px = sample2(walk_all, gxi, gyi) * main
nav_h = L['nav_h']
near_top = np.abs(sample2(nav_h, gxi, gyi) - PZ) < 0.8
walk_px = walk_px * near_top
canvas = over(canvas, MINT, walk_px * 0.07)
# the mesh's edge: where walkable ends
wm = (walk_px > 0.5).astype(np.float32)
edge = np.abs(blur(wm, 0.7 * SS) - wm) * 2
canvas = over(canvas, MINT, np.clip(edge * 1.2, 0, 1) * 0.5)
log('walkable')

# contours: the terrain's real heights
land_m = island_top.astype(np.float32)
zf = np.where(island_top, PZ, 0).astype(np.float32)
c_min = lines_on(zf, 1.6, 0.72 * SS, land_m, fade_grad=0.34)
c_maj = lines_on(zf, 8.0, 0.95 * SS, land_m, fade_grad=0.55)
# hide the contour's false lines along a depth edge
dz_edge = np.abs(np.gradient(np.where(hit, camz, 3000).astype(np.float32), axis=0)) + np.abs(np.gradient(np.where(hit, camz, 3000).astype(np.float32), axis=1))
quiet = smooth(3.0, 0.8, dz_edge)
canvas = over(canvas, LINE, c_min * quiet * 0.26)
canvas = over(canvas, LINE, c_maj * quiet * 0.62)
log('contours')

# the survey grid draped on the land
grid_x = lines_on(np.where(island_top, PX, 0).astype(np.float32), 16.0, 0.62 * SS, land_m, fade_grad=0.5)
grid_y = lines_on(np.where(island_top, PY, 0).astype(np.float32), 16.0, 0.62 * SS, land_m, fade_grad=0.5)
canvas = over(canvas, PALE, (grid_x + grid_y) * quiet * 0.2)

# water: lines that follow the shore
wat = CL == 2
bk = sample2(L['bank'], gxi, gyi)
w_lines = lines_on(np.where(wat, bk, 0).astype(np.float32), 0.85, 0.8 * SS, wat.astype(np.float32), fade_grad=0.9)
canvas = over(canvas, LINE, w_lines * 0.6)
log('water')

# topology: the rock's own polygons, with hidden lines removed
def mesh_edges(name):
    D = np.load(os.path.join(OUT, f'wire_{name}.npz'))
    v, q_ = D['verts'], D['quads']
    p = v[q_]
    n = np.cross(p[:, 1] - p[:, 0], p[:, 3] - p[:, 0])
    mid = p.mean(1)
    front = ((mid - C) * n).sum(1) < 0
    q_ = q_[front]
    e = np.concatenate([q_[:, [0, 1]], q_[:, [1, 2]], q_[:, [2, 3]], q_[:, [3, 0]]])
    e.sort(axis=1)
    e = np.unique(e, axis=0)
    return v[e[:, 0]], v[e[:, 1]]

wire = np.zeros((DH, DW), np.float32)
for name in ['main'] + [i['name'] for i in ISLANDS]:
    a, b = mesh_edges(name)
    draw_segments(wire, a, b, bias=2.4, weight=1.0)
    log('wire', name, len(a))
wire = thicken(wire, 0.55 * SS - 0.3)
canvas = over(canvas, LINE, np.clip(wire * (0.85 * SS / 2 + 0.25), 0, 1) * 0.36)
del wire

# props: real edges, brighter
pw = np.zeros((DH, DW), np.float32)
for key in Pr.files:
    if key.startswith('wire_'):
        seg = Pr[key]
        if len(seg):
            draw_segments(pw, seg[:, 0], seg[:, 1], bias=0.9, weight=1.0)
pw = thicken(pw, 0.6 * SS - 0.3)
canvas = over(canvas, LINE, np.clip(pw * (0.85 * SS / 2 + 0.25), 0, 1) * 0.6)
del pw
log('props')

# silhouettes: the depth edges of everything
Dc = np.where(hit, camz, 4000).astype(np.float32)
jump = np.maximum(np.abs(Dc - np.roll(Dc, 1, 0)), np.abs(Dc - np.roll(Dc, 1, 1)))
sil = (jump > 2.2).astype(np.float32)
sil = np.clip(blur(sil, 0.55 * SS) * 2.0, 0, 1)
canvas = over(canvas, LINE, sil * 0.62)
del jump, sil
log('silhouettes')

# nav mesh: triangles over everything walkable, jittered so they read as a real generated mesh
r = np.random.default_rng(66)
cell = 6.5
nvx = np.arange(xs[0], xs[-1], cell)
nvy = np.arange(ys[0], ys[-1], cell)
VX, VY = np.meshgrid(nvx, nvy)
VX = VX + r.uniform(-1.8, 1.8, VX.shape)
VY = VY + r.uniform(-1.8, 1.8, VY.shape)
wa = sample2(walk_all, (VX - xs[0]) / RES, (VY - ys[0]) / RES) > 0.5
VZ = sample2(nav_h, (VX - xs[0]) / RES, (VY - ys[0]) / RES) + 0.22
segs_a, segs_b = [], []
for i in range(VX.shape[0] - 1):
    for j in range(VX.shape[1] - 1):
        if wa[i, j] and wa[i, j + 1] and wa[i + 1, j] and wa[i + 1, j + 1]:
            p00, p10 = (VX[i, j], VY[i, j], VZ[i, j]), (VX[i, j + 1], VY[i, j + 1], VZ[i, j + 1])
            p01, p11 = (VX[i + 1, j], VY[i + 1, j], VZ[i + 1, j]), (VX[i + 1, j + 1], VY[i + 1, j + 1], VZ[i + 1, j + 1])
            for s_a, s_b in ((p00, p10), (p00, p01), (p10, p11), (p01, p11), ((p00, p11) if (i + j) % 2 else (p10, p01))):
                segs_a.append(s_a)
                segs_b.append(s_b)
nm = np.zeros((DH, DW), np.float32)
draw_segments(nm, np.array(segs_a, np.float32), np.array(segs_b, np.float32), bias=1.1)
nm = thicken(nm, 0.55 * SS - 0.3)
canvas = over(canvas, MINT, np.clip(nm * (0.85 * SS / 2 + 0.25), 0, 1) * 0.42)
del nm
log('navmesh', len(segs_a))

# fine technical marks: ticks round the rim, a scale down the cliff, and callouts at the places the simulation cares about. No letters or
# numbers: the art gets mirrored in Arabic, so words belong to the live page.
ticks = np.zeros((DH, DW), np.float32)
d = L['d']
top = L['top']
# rim polyline: march the contour of d = 0.3 by sampling
gy_, gx_ = np.gradient(d, RES)
rim_idx = np.nonzero((d > 0.1) & (d < 0.7))
rim_pts = np.stack([xs[rim_idx[1]], ys[rim_idx[0]]], 1)
# thin them by rounding to a lattice along the rim, keeping one point per 3-unit bin
bins = np.round(rim_pts / 3.0).astype(np.int64)
_, ui = np.unique(bins, axis=0, return_index=True)
rp = rim_pts[ui]
rg = np.stack([gx_[rim_idx][ui], gy_[rim_idx][ui]], 1)
rg /= np.linalg.norm(rg, axis=1, keepdims=True) + 1e-4
rz_ = top[rim_idx][ui] + 0.1
major = (bins[ui][:, 0] + bins[ui][:, 1]) % 5 == 0
L_ = np.where(major, 3.4, 1.6)
a = np.stack([rp[:, 0], rp[:, 1], rz_], 1)
b = np.stack([rp[:, 0] - rg[:, 0] * L_, rp[:, 1] - rg[:, 1] * L_, rz_], 1)
draw_segments(ticks, a.astype(np.float32), b.astype(np.float32), bias=6.0)
# survey line along the front, off the land
fx0, fx1 = -28, 130
fy0 = -74
n = int((fx1 - fx0) / 4)
xs_ = np.linspace(fx0, fx1, n + 1)
z0 = -2.0
draw_segments(ticks, np.array([(fx0, fy0, z0)], np.float32), np.array([(fx1, fy0, z0)], np.float32), bias=6)
aa = np.stack([xs_, np.full(n + 1, fy0), np.full(n + 1, z0)], 1).astype(np.float32)
hh = np.where(np.arange(n + 1) % 5 == 0, 3.0, 1.2)
bb = np.stack([xs_, np.full(n + 1, fy0), z0 - hh], 1).astype(np.float32)
draw_segments(ticks, aa, bb, bias=6)
# depth rule down the left of the island
rx0, ry0 = -40.0, -38.0
zz = np.arange(-120, 8, 4.0)
draw_segments(ticks, np.array([(rx0, ry0, -120)], np.float32), np.array([(rx0, ry0, 8)], np.float32), bias=4)
ll = np.where(((zz + 120) / 4).astype(int) % 5 == 0, 3.0, 1.2)
draw_segments(ticks, np.stack([np.full_like(zz, rx0), np.full_like(zz, ry0), zz], 1).astype(np.float32), np.stack([rx0 + ll, np.full_like(zz, ry0), zz], 1).astype(np.float32), bias=4)
ticks = thicken(ticks, 0.6 * SS - 0.3)
canvas = over(canvas, LINE, np.clip(ticks * (0.85 * SS / 2 + 0.25), 0, 1) * 0.72)
del ticks

def ring(layer, cx, cy, radius, weight=1.0, n=96):
    t = np.linspace(0, 2 * np.pi, n, endpoint=False)
    ix = np.clip((cx + np.cos(t) * radius).astype(np.int64), 1, DW - 2)
    iy = np.clip((cy + np.sin(t) * radius).astype(np.int64), 1, DH - 2)
    return ix, iy

marks = np.zeros((DH, DW), np.float32)
pinks = np.zeros((DH, DW), np.float32)
def screen_seg(layer, ax, ay, bx, by, w=1.0):
    L = max(np.hypot(bx - ax, by - ay), 1)
    n = int(L / 0.7) + 1
    t = (np.arange(n) + 0.5) / n
    sx = ax + (bx - ax) * t
    sy = ay + (by - ay) * t
    ok = (sx >= 1) & (sx < DW - 2) & (sy >= 1) & (sy < DH - 2)
    sx, sy = sx[ok], sy[ok]
    ix, iy = sx.astype(np.int64), sy.astype(np.int64)
    fx, fy = sx - ix, sy - iy
    k = w * 0.7
    np.add.at(layer, (iy, ix), k * (1 - fx) * (1 - fy))
    np.add.at(layer, (iy, ix + 1), k * fx * (1 - fy))
    np.add.at(layer, (iy + 1, ix), k * (1 - fx) * fy)
    np.add.at(layer, (iy + 1, ix + 1), k * fx * fy)

def callout(layer, wp, r0, leader=True, sign=1):
    x, y, _ = project(np.array([wp], np.float32))
    x, y = float(x[0]), float(y[0])
    u = SS
    for k in range(48):
        a0, a1 = k / 48 * 2 * np.pi, (k + 1) / 48 * 2 * np.pi
        screen_seg(layer, x + np.cos(a0) * r0 * u, y + np.sin(a0) * r0 * u, x + np.cos(a1) * r0 * u, y + np.sin(a1) * r0 * u)
    for a in (0, np.pi / 2, np.pi, 3 * np.pi / 2):
        screen_seg(layer, x + np.cos(a) * r0 * 1.25 * u, y + np.sin(a) * r0 * 1.25 * u, x + np.cos(a) * r0 * 1.8 * u, y + np.sin(a) * r0 * 1.8 * u)
    if leader:
        lx, ly = x + sign * r0 * 2.6 * u, y - r0 * 2.6 * u
        screen_seg(layer, x + sign * r0 * 0.72 * u, y - r0 * 0.72 * u, lx, ly)
        screen_seg(layer, lx, ly, lx + sign * r0 * 3.2 * u, ly)
        for k in range(5):
            tx = lx + sign * (k + 0.5) * r0 * 0.62 * u
            screen_seg(layer, tx, ly, tx, ly + r0 * 0.3 * u)

h_at = lambda x, y: float(sample2(nav_h, np.array([(x - xs[0]) / RES]), np.array([(y - ys[0]) / RES]))[0])
POI_WORLD = {
    'dock': (DOCK[0] + 13, DOCK[1] + 2),
    'plaza': (VILLAGE[0] + 3, VILLAGE[1] - 16),
    'bridge': BRIDGE,
    'lake': (LAKES[0][0], LAKES[0][1]),
    'ramp': (62, 34),
    'grove': (84, -12),
}
for name, (x, y) in POI_WORLD.items():
    callout(marks, (x, y, h_at(x, y) + 0.4), 13)
callout(pinks, (FLAG[0], FLAG[1], h_at(*FLAG) + 0.4), 20)
marks = thicken(marks, 0.55 * SS - 0.3)
pinks = thicken(pinks, 0.75 * SS - 0.3)
canvas = over(canvas, LINE, np.clip(marks * (0.85 * SS / 2 + 0.25), 0, 1) * 0.85)
canvas = over(canvas, PINK_, np.clip(pinks * (0.9 * SS / 2 + 0.3), 0, 1))
# registration crosses, on a loose square lattice, over everything
cross = np.zeros((DH, DW), np.float32)
step = int(128 * SS * 2)
for cy in range(step // 2, DH, step):
    for cx in range(step // 2, DW, step):
        screen_seg(cross, cx - 5 * SS, cy, cx + 5 * SS, cy)
        screen_seg(cross, cx, cy - 5 * SS, cx, cy + 5 * SS)
canvas = over(canvas, PALE, np.clip(thicken(cross, 0.5 * SS - 0.3) * 0.8, 0, 1) * 0.3)
del cross
log('marks')

def downsample(a, W2):
    """Area average to the target width."""
    H2 = W2 * 9 // 16
    if a.shape[1] == W2:
        return a
    f = a.shape[1] / W2
    if abs(f - round(f)) < 1e-3:
        f = int(round(f))
        h, w = a.shape[:2]
        a2 = a[:h - h % f, :w - w % f]
        sh = (h // f, f, w // f, f) + a.shape[2:]
        return a2.reshape(sh).mean(axis=(1, 3))
    # general: bilinear from a slight blur
    b = blur(a, f * 0.42) if f > 1 else a
    yy2, xx2 = np.mgrid[0:H2, 0:W2].astype(np.float32)
    sx = (xx2 + 0.5) * f - 0.5
    sy = (yy2 + 0.5) * f - 0.5
    if b.ndim == 2:
        return sample2(b, sx, sy)
    return np.stack([sample2(b[..., i], sx, sy) for i in range(b.shape[-1])], -1)

os.makedirs(DEST, exist_ok=True)
save_webp(downsample(canvas, BW), os.path.join(DEST, 'blueprint.webp'), Q_BLUE)
del canvas
log('blueprint saved')

# ----------------------------------------------------------------- depth, for parallax and for the runner passing behind things
tpz = (-112.0 - C[2]) / np.minimum(ray[..., 2], -1e-4)
plane = (ray * tpz[..., None] @ FW).astype(np.float32)
zdist = np.where(hit, camz, plane)
nd = np.clip((np.log(np.clip(zdist, 120, 2200)) - math.log(120)) / (math.log(2200) - math.log(120)), 0, 1).astype(np.float32)
DW_OUT = int(os.environ.get('DEPTH_W', 1024))
save_webp(downsample(nd, DW_OUT), os.path.join(DEST, 'depth.webp'), Q_DEPTH)

# ----------------------------------------------------------------- trails
S = np.load(os.path.join(OUT, 'sim.npz'))
tr, off, cl = S['tr'], S['offsets'], S['cls']
log('trails', len(cl), 'agents', len(tr), 'points')
TH = TW * 9 // 16
tSS = TW / DW
# The flow clock: time along a trail. On the ground it is distance walked from the dock (raw simulation time would bunch into closed rings over
# open ground, where fast and slow walkers mix). In the air, on hops and falls, it carries on from where the player left the ground.
dd_ = S['dock_dist']
nr, nx0, ny0 = float(S['nav_res']), float(S['nav_x0']), float(S['nav_y0'])
dd_ = np.where(dd_ >= 1e5, np.nan, dd_)
dmax = float(np.nanmax(dd_))
dd_ = np.nan_to_num(dd_, nan=dmax)
# the clock reads 1 at the flag: everything that happens on screen spans the whole range
d_flag = float(sample2(dd_, np.array([(FLAG[0] - nx0) / nr]), np.array([(FLAG[1] - ny0) / nr]))[0]) * 1.08
t_geo = np.minimum(sample2(dd_, (tr[:, 0] - nx0) / nr, (tr[:, 1] - ny0) / nr) / d_flag, 1.0)
ground = np.abs(sample2(nav_h, (tr[:, 0] - xs[0]) / RES, (tr[:, 1] - ys[0]) / RES) - tr[:, 2]) < 1.6
flow_t = t_geo.copy()
for a_ in range(len(cl)):
    i0, i1 = int(off[a_]), int(off[a_ + 1])
    g_ = ground[i0:i1]
    if g_.all():
        continue
    idx_ = np.arange(i1 - i0)
    last = np.maximum.accumulate(np.where(g_, idx_, 0))
    air = ~g_
    flow_t[i0:i1][air] = t_geo[i0:i1][last[air]] + (idx_[air] - last[air]) * 0.0016
flow_t = np.clip(flow_t * 0.92, 0, 1).astype(np.float32)
pts = tr[:, :3].astype(np.float32)
Xp, Yp, Zp = project(pts, TW)
agent = np.repeat(np.arange(len(cl)), np.diff(off))
same = agent[:-1] == agent[1:]
xa, ya, za, xb, yb, zb, ta, tb, ag = Xp[:-1][same], Yp[:-1][same], Zp[:-1][same], Xp[1:][same], Yp[1:][same], Zp[1:][same], flow_t[:-1][same], flow_t[1:][same], agent[:-1][same]
L_ = np.hypot(xb - xa, yb - ya)
n = np.maximum((L_ / 0.7).astype(np.int64), 1)
idx = np.repeat(np.arange(len(n)), n)
tt = (np.arange(n.sum()) - np.repeat(np.cumsum(n) - n, n) + 0.5) / np.repeat(n, n)
sx = xa[idx] + (xb - xa)[idx] * tt
sy = ya[idx] + (yb - ya)[idx] * tt
sz = za[idx] + (zb - za)[idx] * tt
st = ta[idx] + (tb - ta)[idx] * tt
sa = ag[idx]
ok = (sx >= 1) & (sx < TW - 2) & (sy >= 1) & (sy < TH - 2)
sx, sy, sz, st, sa = sx[ok], sy[ok], sz[ok], st[ok], sa[ok]
ix0, iy0 = (sx / tSS).astype(np.int64).clip(0, DW - 1), (sy / tSS).astype(np.int64).clip(0, DH - 1)
behind = sz > DEPTH[iy0, ix0] + 1.6
# an X-ray sees through trees and roofs, but dimly
vis = np.where(behind, 0.26, 1.0).astype(np.float32)
del ix0, iy0
log('trail splats', len(sx))
I = np.zeros((3, TH, TW), np.float32)
I_s = np.zeros((TH, TW), np.float32)
Tw = np.zeros((TH, TW), np.float32)
Ts = np.zeros((TH, TW), np.float32)
ix, iy = sx.astype(np.int64), sy.astype(np.int64)
fx, fy = sx - ix, sy - iy
c_of = cl[sa]
wgt = 0.7 * vis
for c in range(3):
    k = c_of == c
    np.add.at(I[c], (iy[k], ix[k]), wgt[k] * (1 - fx[k]) * (1 - fy[k]))
    np.add.at(I[c], (iy[k], ix[k] + 1), wgt[k] * fx[k] * (1 - fy[k]))
    np.add.at(I[c], (iy[k] + 1, ix[k]), wgt[k] * (1 - fx[k]) * fy[k])
    np.add.at(I[c], (iy[k] + 1, ix[k] + 1), wgt[k] * fx[k] * fy[k])
# every 26th walker is also drawn on its own, so single threads stay visible inside even the hottest bundles
kk = (sa % 26 == 0) & (c_of != 2)
np.add.at(I_s, (iy[kk], ix[kk]), wgt[kk] * (1 - fx[kk]) * (1 - fy[kk]))
np.add.at(I_s, (iy[kk], ix[kk] + 1), wgt[kk] * fx[kk] * (1 - fy[kk]))
np.add.at(I_s, (iy[kk] + 1, ix[kk]), wgt[kk] * (1 - fx[kk]) * fy[kk])
np.add.at(I_s, (iy[kk] + 1, ix[kk] + 1), wgt[kk] * fx[kk] * fy[kk])
np.add.at(Tw, (iy, ix), wgt)
np.add.at(Ts, (iy, ix), wgt * st)
log('trails splatted', float(I.max()))
# Colour is density, like a heat map made of strands: one lone trail is a thin cold thread, the desire lines burn warm then white. Falls are pink.
def ramp(x):
    return np.log10(1 + x * 2) / 3.45
walked = ramp(I[0] + I[1])
walked = blur(np.clip(walked, 0, 1.3), 0.42)
fell = blur(np.clip(ramp(I[2] * 1.4), 0, 1), 0.42)
cold, warm, hot = SRGB('#2fe0cc'), SRGB('#ffc25e'), SRGB('#fff0c8')
c1 = lerp(cold, warm, smooth(0.22, 0.6, walked)[..., None])
c2 = lerp(c1, hot, smooth(0.78, 1.05, walked)[..., None])
level = np.clip(walked * 1.15, 0, 1) ** 0.9
threads = np.clip(blur(np.minimum(I_s, 2.0), 0.4) * 0.5, 0, 0.8)
rgb = c2 * level[..., None] + lerp(cold, hot, smooth(0.15, 0.7, walked)[..., None]) * threads[..., None] * 0.34
coral = SRGB('#ff5a90')
rgb = rgb + coral * fell[..., None] * 0.95
rgb = np.clip(rgb, 0, 1).astype(np.float32)
save_webp(rgb, os.path.join(DEST, 'trails.webp'), Q_TRAIL)
# time: smooth, filled outwards, so it filters and compresses cleanly
wsum = blur(Tw, 1.0) + 1e-5
tsum = blur(Ts, 1.0)
tmap = tsum / wsum
have = wsum > 0.02
# flood outward with growing blurs
fill = tmap * have
fw = have.astype(np.float32)
for sig in (3, 8, 20, 60):
    b1 = blur(fill, sig)
    b2 = blur(fw, sig) + 1e-4
    fill = np.where(fw > 0.5, fill, np.where(b2 > 0.01, b1 / b2, fill))
    fw = np.where(b2 > 0.01, 1.0, fw)
TIME_W = int(os.environ.get('TIME_W', 1024))
save_webp(downsample(np.clip(fill, 0, 1), TIME_W), os.path.join(DEST, 'time.webp'), Q_TIME)
del I, I_s, Tw, Ts

# ----------------------------------------------------------------- what moves in the beauty pass: 0.5 = cloud (breathes), 1 = falling water (runs)
fv = Pr['fall_verts']
fxp, fyp, fzp = project(fv, 1024)
fm = np.zeros((576, 1024), np.float32)
okf = (fxp >= 1) & (fxp < 1022) & (fyp >= 1) & (fyp < 574)
np.add.at(fm, (fyp[okf].astype(np.int64), fxp[okf].astype(np.int64)), 1.0)
# ribbons are sparse verts: connect them with a small blur, then threshold softly
fm = smooth(0.012, 0.09, blur(fm, 2.4))
# cloud only well clear of anything solid, so thin things like the lighthouse never wobble
cloud_px = smooth(0.94, 1.0, blur(downsample((~hit).astype(np.float32), 1024), 4.0))
flow = np.maximum(cloud_px * 0.5, fm)
save_webp(downsample(flow, int(os.environ.get('FLOW_W', 640))), os.path.join(DEST, 'flow.webp'), 80)

# ----------------------------------------------------------------- the routes a runner can take: real simulated trails, chosen for coverage
good = np.nonzero(cl == 0)[0]
lens = np.diff(off)[good]
good = good[(lens > np.percentile(lens, 10)) & (lens < np.percentile(lens, 85))]
ROUTES = int(os.environ.get('ROUTES', 28))
r2 = np.random.default_rng(5)
chosen = [int(r2.choice(good))]
coarse = {}
def coarse_of(i):
    if i not in coarse:
        coarse[i] = tr[off[i]:off[i + 1], :2][::6]
    return coarse[i]
cand = r2.choice(good, size=min(600, len(good)), replace=False)
for _ in range(ROUTES - 1):
    best, bv = None, -1
    for i in cand:
        c = coarse_of(int(i))
        v = 0
        for j in chosen[-10:]:
            dd = np.sqrt(((c[:, None, :] - coarse_of(j)[None, :, :]) ** 2).sum(-1)).min(1)
            v += dd.mean()
        if v > bv:
            bv, best = v, int(i)
    chosen.append(best)
routes = []
buf = bytearray()
for i in chosen:
    p = tr[off[i]:off[i + 1]]
    # resample evenly by world distance, one point every 2.4 units, smoothing out the agent's jitter
    k = np.hanning(9)
    k /= k.sum()
    sm = np.stack([np.convolve(np.pad(p[:, c], 4, mode='edge'), k, 'valid') for c in range(3)], 1)
    seg = np.linalg.norm(np.diff(sm, axis=0), axis=1)
    s = np.concatenate([[0], np.cumsum(seg)])
    m = max(2, int(s[-1] / 2.4))
    u = np.linspace(0, s[-1], m)
    q_ = np.stack([np.interp(u, s, sm[:, c]) for c in range(3)], 1).astype(np.float32)
    x, y, z = project(q_, 2560)
    # the same log-depth as depth.webp, so the page can pass the runner behind whatever is closer
    ndr = np.clip((np.log(np.clip(z, 120, 2200)) - math.log(120)) / (math.log(2200) - math.log(120)), 0, 1)
    scale = (F * 2560) / np.maximum(z, 1)      # pixels (at 2560) per world unit
    routes.append(dict(n=int(m)))
    arr = np.stack([x / 2560, y / 1440, scale / 40, ndr], 1)
    q16 = np.clip(arr * 65535, 0, 65535).astype(np.uint16)
    buf += q16.tobytes()
with open(os.path.join(DEST, 'routes.bin'), 'wb') as fh:
    fh.write(buf)
log('routes', len(routes), f'{len(buf) / 1024:.0f} KB')

# ----------------------------------------------------------------- manifest: where things are, in image coordinates
def uv(x, y, zoff=0.0):
    a, b, _ = project(np.array([(x, y, h_at(x, y) + zoff)], np.float32), 2560)
    return [round(float(a[0]) / 2560, 4), round(float(b[0]) / 1440, 4)]
fa = Pr['fall_at']
fa_x, fa_y, _ = project(np.array([fa + np.array([0, -4, -26], np.float32)], np.float32), 2560)
drift = [uv(DOCK[0] + 14, DOCK[1] + 2, 1), uv(VILLAGE[0] - 2, VILLAGE[1] - 2, 3), uv(*BRIDGE, 1), uv(LAKES[0][0], LAKES[0][1]),
         uv(62, 34, 1), uv(FLAG[0], FLAG[1], 4), uv(84, -12, 1), [round(float(fa_x[0]) / 2560, 4), round(float(fa_y[0]) / 1440, 4)], uv(38, -48, 0)]
flag_base = uv(FLAG[0], FLAG[1])
fx_, fy_, _ = project(np.array([(FLAG[0], FLAG[1], h_at(*FLAG) + 15.6)], np.float32), 2560)
# what the lens is over, on a coarse grid of the picture, for its little label: 0 sky and floor, 1 rock, 2 walkable, 3 busy trails, 4 hillside contours
GW, GH = 64, 36
fh_, fw_ = DH // GH, DW // GW
blk = lambda a: a[:GH * fh_, :GW * fw_].reshape(GH, fh_, GW, fw_).mean(axis=(1, 3))
hitb = blk(hit.astype(np.float32))
walkb = blk(walk_px.astype(np.float32))
landb = blk(island_top.astype(np.float32))
highb = blk(((PZ > 13) & (CL == 1)).astype(np.float32))
sx0 = np.clip((Xp[::5] / TW * GW).astype(np.int64), 0, GW - 1)
sy0 = np.clip((Yp[::5] / TH * GH).astype(np.int64), 0, GH - 1)
tc_ = np.zeros((GH, GW), np.float32)
np.add.at(tc_, (sy0, sx0), 1)
thr = np.percentile(tc_[tc_ > 0], 55)
labels = np.zeros((GH, GW), np.int32)
labels[hitb >= 0.2] = 1
labels[walkb > 0.12] = 2
labels[tc_ > thr] = 3
labels[(highb > 0.25)] = 4
labels[hitb < 0.2] = 0
man = dict(routes=[r['n'] for r in routes], drift=drift, flag=flag_base, flagTop=[round(float(fx_[0]) / 2560, 4), round(float(fy_[0]) / 1440, 4)],
           agents=int(len(cl)), seed=int(S['SEED']), labels=''.join(str(int(v)) for v in labels.ravel()))
with open(os.path.join(DEST, 'manifest.json'), 'w') as fh:
    json.dump(man, fh)
log('manifest', man['drift'], man['flag'])
log('done')
