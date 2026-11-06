# The break: the sea leaving the phone. A shallow-water solver over the table with the phone as a raised bed, so bores, cascades off
# the bezel and running fronts come from real hydraulics, plus a foam field and flow-advected lace, and ballistic spray thrown off
# the breaking fronts. Far faster to direct than a 3D liquid sim, and it gives a clean high-resolution sea surface.
# One npz per frame in $WORK/hydro/$TAG: eta, depth, foam, velocity, spray.
#   WORK=<dir> TAG=h1 N=700 FRAMES=120 Blender -b --factory-startup -P hydro.py
import math, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import geometry as G

WORK = os.environ.get('WORK', '/tmp/phone-work')
TAG = os.environ.get('TAG', 'h1')
N = int(os.environ.get('N', 700))
FRAMES = int(os.environ.get('FRAMES', 120))
OUT = os.path.join(WORK, 'hydro', TAG)
os.makedirs(OUT, exist_ok=True)
X0, X1, Y0, Y1 = -50.0, 50.0, -72.0, 28.0       # world box, phone at the origin, chin toward -y
dx = (X1 - X0) / N
GRAV = 9.81
FPS = 24.0
xs = X0 + (np.arange(N, dtype=np.float32) + 0.5) * dx
ys = Y0 + (np.arange(N, dtype=np.float32) + 0.5) * dx
XX, YY = np.meshgrid(xs, ys)       # [row = y, col = x]
T0 = time.time()
rng = np.random.default_rng(1001)


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def blur(a, s):
    """Gaussian blur by FFT, in cells."""
    if s <= 0:
        return a
    h, w = a.shape
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.rfftfreq(w)[None, :]
    g = np.exp(-2 * (math.pi * s) ** 2 * (fx * fx + fy * fy))
    return np.fft.irfft2(np.fft.rfft2(a) * g, s=(h, w)).astype(np.float32)


# ---------------------------------------------------------------------------------------------------------------- the bed
def rounded_box_sd(x, y, hw, hh, r):
    qx = np.abs(x) - (hw - r)
    qy = np.abs(y) - (hh - r)
    return np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - r


sd = rounded_box_sd(XX, YY, G.W / 2, G.H / 2, G.CORNER)
GLASS_Z = 0.90
# A rounded shoulder over the last 0.28 of the body.
z_bed = GLASS_Z * np.sqrt(np.clip(1 - np.clip((sd + 0.28) / 0.28, 0, 1) ** 2, 0, 1))
z_bed = np.where(sd > 0, 0.0, z_bed).astype(np.float32)
# The table: nearly flat, with the seams between planks as narrow grooves so running water finds them, and a little warp.
YAW = math.radians(34.0)         # the table's planks are turned against the phone
u = XX * math.cos(YAW) + YY * math.sin(YAW)
plank = (u / 15.0) % 1.0
seam = np.minimum(plank, 1 - plank) * 15.0
groove = -0.05 * (1 - smoothstep(0.05, 0.16, seam))
warp = blur(rng.normal(0, 1, XX.shape).astype(np.float32), 26 * 700 / N)
warp = warp / warp.std() * 0.03
z_bed = np.where(sd > 0, z_bed + (groove + warp) * smoothstep(0.0, 0.2, sd), z_bed).astype(np.float32)
# A low soft lip across the chin. It's under the water it lifts, and it kicks the running sea upward as it leaves the glass.
LIP = float(os.environ.get('LIP', 0.0))
if LIP > 0:
    lip = LIP * smoothstep(-G.H / 2 + 4.2, -G.H / 2 + 0.7, YY) * (1 - smoothstep(-G.H / 2 + 0.7, -G.H / 2 + 0.25, YY))
    lip *= 1 - smoothstep(G.W / 2 - 0.9, G.W / 2 - 0.3, np.abs(XX))
    z_bed = z_bed + np.where(sd < 0, lip, 0).astype(np.float32)

# The wood is not equally slick everywhere, so a running front breaks into tongues rather than a perfect circle.
_r = blur(rng.normal(0, 1, XX.shape).astype(np.float32), 16 * N / 700)
_r2 = blur(rng.normal(0, 1, XX.shape).astype(np.float32), 5 * N / 700)
ROUGH = (0.016 * np.exp((_r / _r.std()) * 0.7 + (_r2 / _r2.std()) * 0.35)).astype(np.float32)
# Water state.
h = np.zeros_like(XX)
hu = np.zeros_like(XX)
hv = np.zeros_like(XX)
foam = np.zeros_like(XX)
# Flow-advected lookup coordinates for the foam's lace, two staggered sets so the stretching can be reset without a visible jump.
PERIOD = 44
adv = [np.dstack([XX.copy(), YY.copy()]), np.dstack([XX.copy(), YY.copy()])]
adv_age = [0, PERIOD // 2]

# ---------------------------------------------------------------------------------------------------------------- the lace
S = 1024
sx = np.fft.fftfreq(S)[None, :]
sy = np.fft.fftfreq(S)[:, None]


def tile_noise(scale, seed):
    r = np.random.default_rng(seed)
    n = r.normal(0, 1, (S, S))
    g = np.exp(-2 * (math.pi * scale) ** 2 * (sx * sx + sy * sy))
    o = np.fft.ifft2(np.fft.fft2(n) * g).real.astype(np.float32)
    return o / o.std()


def tile_cells(count, seed):
    """Tiling distance to the nearest of `count` points. The bright network of foam is the cell edges."""
    r = np.random.default_rng(seed)
    pts = r.random((count, 2)) * S
    all_pts = np.concatenate([pts + np.array([ox, oy]) * S for ox in (-1, 0, 1) for oy in (-1, 0, 1)])
    # Grid accelerated: compute on a quarter grid and upsample, it's going to be blurred anyway.
    q = 4
    gy, gx = np.mgrid[0:S // q, 0:S // q].astype(np.float32) * q
    d1 = np.full(gy.shape, 1e9, np.float32)
    d2 = np.full(gy.shape, 1e9, np.float32)
    for p in all_pts:
        if not (-S * 0.15 < p[0] < S * 1.15 and -S * 0.15 < p[1] < S * 1.15):
            continue
        d = (gx - p[0]) ** 2 + (gy - p[1]) ** 2
        closer = d < d1
        d2 = np.where(closer, d1, np.minimum(d2, d))
        d1 = np.where(closer, d, d1)
    edge = np.sqrt(d2) - np.sqrt(d1)
    edge = edge.repeat(q, 0).repeat(q, 1)
    fy = np.fft.fftfreq(edge.shape[0])[:, None]
    fx = np.fft.fftfreq(edge.shape[1])[None, :]
    g = np.exp(-2 * (math.pi * q * 0.7) ** 2 * (fx * fx + fy * fy))
    return np.fft.ifft2(np.fft.fft2(edge) * g).real.astype(np.float32)


print('building foam pattern', flush=True)
c1 = tile_cells(260, 3)
c2 = tile_cells(1100, 5)
n1 = tile_noise(40.0, 7)
n2 = tile_noise(9.0, 9)
# Network: thin edges are bright, holes are dark, mixed at two sizes and broken by soft noise.
net = np.exp(-c1 / (S / 260 ** 0.5 * 0.11)) * 0.62 + np.exp(-c2 / (S / 1100 ** 0.5 * 0.13)) * 0.38
LACE = (net * 0.8 + 0.2 * (n2 * 0.5 + 0.5) + 0.12 * n1).astype(np.float32)
LACE = (LACE - LACE.min()) / (LACE.max() - LACE.min())
LACE_WORLD = 26.0        # world units per tile
WRINKLE = (tile_noise(14.0, 21) * 0.55 + tile_noise(5.5, 23) * 0.3 + tile_noise(2.4, 25) * 0.15).astype(np.float32)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
_im = bpy.data.images.new('lace', S, S, alpha=False, float_buffer=False)
_im.colorspace_settings.name = 'Non-Color'
_a = np.dstack([LACE, LACE, LACE, np.ones_like(LACE)])
_im.pixels.foreach_set(_a[::-1].ravel())
_im.filepath_raw = os.path.join(OUT, 'lace.png')
_im.file_format = 'PNG'
_im.save()


def sample_tile(tile, uvx, uvy):
    fx = (uvx / LACE_WORLD % 1.0) * S
    fy = (uvy / LACE_WORLD % 1.0) * S
    ix = fx.astype(np.int32) % S
    iy = fy.astype(np.int32) % S
    tx = fx - np.floor(fx)
    ty = fy - np.floor(fy)
    ix1 = (ix + 1) % S
    iy1 = (iy + 1) % S
    return (tile[iy, ix] * (1 - tx) * (1 - ty) + tile[iy, ix1] * tx * (1 - ty) + tile[iy1, ix] * (1 - tx) * ty + tile[iy1, ix1] * tx * ty).astype(np.float32)


def bilinear(field, px, py):
    """Sample a cell-centred field at positions in cell coordinates, clamped."""
    px = np.clip(px, 0, N - 1.001)
    py = np.clip(py, 0, N - 1.001)
    ix = px.astype(np.int32)
    iy = py.astype(np.int32)
    tx = px - ix
    ty = py - iy
    return field[iy, ix] * (1 - tx) * (1 - ty) + field[iy, ix + 1] * tx * (1 - ty) + field[iy + 1, ix] * (1 - tx) * ty + field[iy + 1, ix + 1] * tx * ty


# ---------------------------------------------------------------------------------------------------------------- the source
def ss(a, b, t):
    x = min(1.0, max(0.0, (t - a) / (b - a)))
    return x * x * (3 - 2 * x)


# Screen mask, soft inside the display.
sxm = (1 - smoothstep(G.SCREEN_X1 - 0.5, G.SCREEN_X1 + 0.1, np.abs(XX)))
sym = smoothstep(G.SCREEN_Y0 - 0.1, G.SCREEN_Y0 + 0.7, YY) * (1 - smoothstep(G.SCREEN_Y1 - 0.6, G.SCREEN_Y1 + 0.1, YY))
SCREEN = (sxm * sym).astype(np.float32)
hump_n = blur(rng.normal(0, 1, XX.shape).astype(np.float32), 14 * N / 700)
hump_n /= hump_n.std()


TABLE_MAKER = eval(os.environ.get('TABLE_MAKER', '(2.1, 3.3, 9.0, -9.0, -36.0)'))   # start, end, rate, y from, y to
DRAIN = eval(os.environ.get('DRAIN', '(2.35, 3.5, 2.6)'))


def source(t):
    """Water coming through the glass at time t. A swell gathers at the top of the phone, then a moving wave-maker runs it down the
    screen and over the chin, the way a real swell grows as it travels. After it, a steady pour keeps the flood going."""
    rate = np.zeros_like(XX)
    vy = 0.0
    # (start, end, peak rate, y at start, y at end, spread, speed toward the chin)
    pulses = eval(os.environ.get('PULSES', '[(0.35,1.25,5.0,4.5,4.0,2.8,1.2),(1.05,2.25,float(os.environ.get("MAKER",17)),5.5,-7.5,2.0,11.0),(2.2,3.0,float(os.environ.get("POUR",2.0)),3.0,3.0,5.0,8.0)]'))
    for t0, t1, peak, y0_, y1_, spread, speed in pulses:
        if t <= t0 or t >= t1:
            continue
        env = ss(t0, t0 + (t1 - t0) * 0.3, t) * (1 - ss(t0 + (t1 - t0) * 0.7, t1, t))
        yc = y0_ + (y1_ - y0_) * ss(t0, t1, t) if y0_ != y1_ else y0_
        band = np.exp(-(((YY - yc) / spread) ** 2))
        rate = rate + SCREEN * band * (1 + 0.4 * hump_n) * peak * env
        vy = max(vy, speed * env)
    # Past the chin the sea keeps being fed from below as it runs at the camera, so the front holds its height over the table.
    t0, t1 = TABLE_MAKER[0], TABLE_MAKER[1]
    if t0 < t < t1:
        env = ss(t0, t0 + 0.25, t) * (1 - ss(t1 - 0.4, t1, t))
        k = (t - t0) / (t1 - t0)
        yc = TABLE_MAKER[3] + (TABLE_MAKER[4] - TABLE_MAKER[3]) * k
        width = 5.0 + 13.0 * k
        band = np.exp(-(((YY - yc) / 3.2) ** 2)) * np.exp(-((XX / width) ** 4))
        rate = rate + band * (1 + 0.5 * hump_n) * TABLE_MAKER[2] * env
        vy = max(vy, 11.0 * env)
    return rate, vy


# ---------------------------------------------------------------------------------------------------------------- the solver
def step(dt, t):
    global h, hu, hv
    eps = 1e-4
    u_ = np.where(h > eps, hu / np.maximum(h, eps), 0).astype(np.float32)
    v_ = np.where(h > eps, hv / np.maximum(h, eps), 0).astype(np.float32)
    c_ = np.sqrt(GRAV * h)

    def fluxes(hL, hR, zL, zR, unL, unR, utL, utR):
        zf = np.maximum(zL, zR)
        hLs = np.maximum(0, hL + zL - zf)
        hRs = np.maximum(0, hR + zR - zf)
        cL = np.sqrt(GRAV * hLs)
        cR = np.sqrt(GRAV * hRs)
        aL = np.minimum(np.minimum(unL - cL, unR - cR), 0)
        aR = np.maximum(np.maximum(unL + cL, unR + cR), 0)
        den = np.maximum(aR - aL, 1e-5)
        qL, qR = hLs * unL, hRs * unR
        Fh = (aR * qL - aL * qR + aL * aR * (hRs - hLs)) / den
        Fn = (aR * (qL * unL + 0.5 * GRAV * hLs * hLs) - aL * (qR * unR + 0.5 * GRAV * hRs * hRs) + aL * aR * (qR - qL)) / den
        Ft = (aR * qL * utL - aL * qR * utR + aL * aR * (hRs * utR - hLs * utL)) / den
        return Fh, Fn, Ft, hLs, hRs

    # x faces
    Fh, Fu, Fv, hLs, hRs = fluxes(h[:, :-1], h[:, 1:], z_bed[:, :-1], z_bed[:, 1:], u_[:, :-1], u_[:, 1:], v_[:, :-1], v_[:, 1:])
    # y faces
    Gh, Gv, Gu, hBs, hTs = fluxes(h[:-1, :], h[1:, :], z_bed[:-1, :], z_bed[1:, :], v_[:-1, :], v_[1:, :], u_[:-1, :], u_[1:, :])
    k = dt / dx
    h2 = 0.5 * GRAV * h * h
    dh = np.zeros_like(h)
    dhu = np.zeros_like(h)
    dhv = np.zeros_like(h)
    dh[:, :-1] -= k * Fh
    dh[:, 1:] += k * Fh
    dh[:-1, :] -= k * Gh
    dh[1:, :] += k * Gh
    dhu[:, :-1] -= k * (Fu + (h2[:, :-1] - 0.5 * GRAV * hLs * hLs))
    dhu[:, 1:] += k * (Fu + (h2[:, 1:] - 0.5 * GRAV * hRs * hRs))
    dhu[:-1, :] -= k * Gu
    dhu[1:, :] += k * Gu
    dhv[:-1, :] -= k * (Gv + (h2[:-1, :] - 0.5 * GRAV * hBs * hBs))
    dhv[1:, :] += k * (Gv + (h2[1:, :] - 0.5 * GRAV * hTs * hTs))
    dhv[:, :-1] -= k * Fv
    dhv[:, 1:] += k * Fv
    h += dh
    hu += dhu
    hv += dhv
    # The source: mass with momentum toward the chin.
    rate, vy = source(t)
    if rate.any():
        add = rate * dt
        h += add
        hv += add * (-vy)
        # A little fan-out, away from the phone's centre line.
        hu += add * np.clip(XX * 0.35, -1.6, 1.6)
    if DRAIN[0] < t < DRAIN[1]:
        over = (sd < 0.2)
        h[over] *= 1.0 / (1.0 + DRAIN[2] * dt)
    # Rising sea: late on, the whole table takes on water.
    rise = RISE(t)
    if rise > 0:
        h += rise * dt * smoothstep(-0.2, 0.02, h - 0.015) * WET_FADE
    # Friction: thin water drags on the wood, deep water doesn't feel it.
    np.clip(h, 0, None, out=h)
    sp = np.sqrt(hu * hu + hv * hv) / np.maximum(h, 0.002)
    drag = 1.0 / (1.0 + dt * ROUGH * GRAV * sp / np.maximum(h, 0.015) ** 1.33)
    hu *= drag
    hv *= drag
    # Never let a thin sliver run away: it would only be numerical.
    limit = np.minimum(18.0 / np.maximum(sp, 1e-3), 1.0)
    hu *= limit
    hv *= limit
    # Keep thin films from racing.
    thin = h < 0.004
    hu[thin] = 0
    hv[thin] = 0
    # Open edges: fade momentum and water near the box edge.
    h[:, 0] = h[:, 1]
    h[:, -1] = h[:, -2]
    h[0, :] = h[1, :]
    h[-1, :] = h[-2, :]


RISE_T0, RISE_RATE, RISE_T1 = eval(os.environ.get('RISE_', '(3.1, 3.05, 5.75)'))
def RISE(t):
    return RISE_RATE * ss(RISE_T0, RISE_T0 + 1.0, t) * (1 - ss(RISE_T1 - 0.7, RISE_T1, t))
WET_FADE = 1.0


# ---------------------------------------------------------------------------------------------------------------- spray
sp_pos = np.zeros((0, 3), np.float32)
sp_vel = np.zeros((0, 3), np.float32)
sp_life = np.zeros(0, np.float32)


def emit_spray(eta, u_, v_, crest_field, dt):
    global sp_pos, sp_vel, sp_life
    speed = np.hypot(u_, v_)
    strength = crest_field * 2.2
    prob = strength * dt * float(os.environ.get('SPRAY_RATE', 10)) * (dx * dx) * 6.0
    pick = rng.random(h.shape) < prob
    iy, ix = np.nonzero(pick)
    if len(iy) == 0:
        return
    n = len(iy)
    jit = rng.normal(0, 1, (n, 3)).astype(np.float32)
    p = np.stack([XX[iy, ix] + rng.random(n) * dx, YY[iy, ix] + rng.random(n) * dx, eta[iy, ix] + rng.random(n) * 0.2], 1).astype(np.float32)
    up = (1.2 + rng.gamma(2.0, 1.15, n)) * (0.6 + 0.3 * strength[iy, ix])
    v = np.stack([u_[iy, ix] * 1.02 + jit[:, 0] * 0.8, v_[iy, ix] * 1.02 + jit[:, 1] * 0.8, up], 1).astype(np.float32)
    sp_pos = np.concatenate([sp_pos, p])
    sp_vel = np.concatenate([sp_vel, v])
    sp_life = np.concatenate([sp_life, rng.uniform(0.6, 2.4, n).astype(np.float32)])


def move_spray(eta, dt):
    global sp_pos, sp_vel, sp_life
    if not len(sp_pos):
        return
    sp_vel[:, 2] -= GRAV * dt
    sp_vel *= 1.0 / (1.0 + 0.16 * dt)
    sp_pos += sp_vel * dt
    sp_life -= dt
    px = (sp_pos[:, 0] - X0) / dx - 0.5
    py = (sp_pos[:, 1] - Y0) / dx - 0.5
    ground = bilinear(eta, px, py)
    keep = (sp_life > 0) & (sp_pos[:, 2] > ground - 0.03)
    keep &= (sp_pos[:, 0] > X0) & (sp_pos[:, 0] < X1) & (sp_pos[:, 1] > Y0) & (sp_pos[:, 1] < Y1)
    sp_pos, sp_vel, sp_life = sp_pos[keep], sp_vel[keep], sp_life[keep]


# ---------------------------------------------------------------------------------------------------------------- run
t = 0.0
steps = 0
for frame in range(1, FRAMES + 1):
    t_end = frame / FPS
    while t < t_end - 1e-6:
        wet = h > 1e-3
        umax = 0.5
        if wet.any():
            s_ = np.sqrt(hu[wet] ** 2 + hv[wet] ** 2) / np.maximum(h[wet], 1e-3)
            c_ = np.sqrt(GRAV * h[wet])
            umax = float(np.percentile(s_, 99.99) + c_.max()) + 0.5
        dt = min(0.3 * dx / umax, 1 / FPS / 2, t_end - t)
        step(dt, t)
        t += dt
        steps += 1
    # Derived fields for this frame.
    eps = 2e-3
    u_ = np.where(h > eps, hu / np.maximum(h, eps), 0).astype(np.float32)
    v_ = np.where(h > eps, hv / np.maximum(h, eps), 0).astype(np.float32)
    eta = z_bed + h
    dudx = (np.roll(u_, -1, 1) - np.roll(u_, 1, 1)) / (2 * dx)
    dvdy = (np.roll(v_, -1, 0) - np.roll(v_, 1, 0)) / (2 * dx)
    compress = np.maximum(-(dudx + dvdy), 0)
    # Foam: born where the flow piles up and tumbles, carried along with it, slowly fading.
    dt_f = 1 / FPS
    # Born at crests (the top of a steep moving rise) and at the tumbling foot of a front, carried down the wave's face with the flow.
    speed_f = np.hypot(u_, v_)
    eta_b = blur(eta, 0.5 / dx)
    rise = eta_b - blur(eta_b, 3.0 / dx)
    gx_ = (np.roll(eta_b, -1, 1) - np.roll(eta_b, 1, 1)) / (2 * dx)
    gy_ = (np.roll(eta_b, -1, 0) - np.roll(eta_b, 1, 0)) / (2 * dx)
    slope = np.hypot(gx_, gy_)
    # The face of a moving front: the surface drops away in the direction the water is going.
    downhill = -(gx_ * u_ + gy_ * v_) / np.maximum(speed_f, 0.2)
    crest = smoothstep(0.5, 1.5, downhill) * smoothstep(0.25, 1.0, rise) * smoothstep(3.0, 7.5, speed_f)
    tumble = smoothstep(2.5, 9.0, compress) * smoothstep(0.08, 0.5, h) * smoothstep(1.5, 5.0, speed_f) * 0.55
    marble = smoothstep(1.5, 6.0, speed_f) * smoothstep(0.03, 0.2, h) * float(os.environ.get('MARBLE', 0.12))
    src = np.clip(crest + tumble + marble, 0, 1)
    foam = np.clip(foam + src * dt_f * float(os.environ.get('FOAM_RATE', 3.6)), 0, 1.5)
    bx = np.arange(N, dtype=np.float32)[None, :] - u_ * dt_f / dx
    by = np.arange(N, dtype=np.float32)[:, None] - v_ * dt_f / dx
    foam = bilinear(foam, bx, by) * (1 - float(os.environ.get('FOAM_DECAY', 1.1)) * dt_f)
    foam = blur(foam, 0.35)
    foam *= smoothstep(0.0, 0.012, h)
    # Advect the two lace lookups, resetting each when it's too stretched.
    weights = []
    laces = []
    for i in range(2):
        adv[i] = np.dstack([bilinear(adv[i][:, :, 0], bx, by), bilinear(adv[i][:, :, 1], bx, by)])
        adv_age[i] += 1
        if adv_age[i] >= PERIOD:
            adv[i] = np.dstack([XX.copy(), YY.copy()])
            adv_age[i] = 0
        w = 1 - abs(adv_age[i] / PERIOD * 2 - 1)
        weights.append(w)
    ws = weights[0] + weights[1] + 1e-4
    # Spray thrown off the fronts.
    for _ in range(2):
        emit_spray(eta, u_, v_, crest, dt_f / 2)
        move_spray(eta, dt_f / 2)
    speed = np.hypot(u_, v_)
    np.savez(
        os.path.join(OUT, f'h{frame:04d}.npz'),
        h=h.astype(np.float16),
        u=u_.astype(np.float16),
        v=v_.astype(np.float16),
        foam=np.clip(foam, 0, 1.6).astype(np.float16),
        a0x=adv[0][:, :, 0].astype(np.float32),
        a0y=adv[0][:, :, 1].astype(np.float32),
        a1x=(adv[1][:, :, 0] + 11.3).astype(np.float32),
        a1y=(adv[1][:, :, 1] + 5.7).astype(np.float32),
        w1=np.float32(weights[0] / ws),
        spray=sp_pos.astype(np.float16) if len(sp_pos) else np.zeros((0, 3), np.float16),
        spray_v=sp_vel.astype(np.float16) if len(sp_vel) else np.zeros((0, 3), np.float16),
    )
    if frame % 10 == 0 or frame == 1:
        cl = N // 2
        ylist = [-10, -16, -24, -36]
        prof = ' '.join(f'{yy_}:{eta[int((yy_ - Y0) / dx), cl]:.2f}' for yy_ in ylist)
        print('   front', prof, flush=True)
        print(f'[{time.time() - T0:6.1f}s] frame {frame} t={t:.2f} steps={steps} maxh={h.max():.2f} wet={(h > 0.01).mean():.3f} eta@table={np.percentile(h[h > 0.01], 90) if (h > 0.01).any() else 0:.2f} umax={speed.max():.1f} foam={(foam > 0.2).mean():.3f} spray={len(sp_pos)}', flush=True)
np.savez(os.path.join(OUT, 'grid.npz'), bed=z_bed.astype(np.float32), x0=X0, x1=X1, y0=Y0, y1=Y1, n=N, lace_world=LACE_WORLD, wrinkle=WRINKLE)
print('done', time.time() - T0, flush=True)
