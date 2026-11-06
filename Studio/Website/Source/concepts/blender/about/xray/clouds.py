# The sea of cloud under the archipelago and the banks around it, authored in numpy and written as real OpenVDB grids.
#   OUT=<cache> Q=1 Blender -b --factory-startup -P clouds.py
import os, sys, time
import numpy as np
import openvdb as vdb
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from lib import *

OUT = os.environ['OUT']
Q = float(os.environ.get('Q', 1.0))
T0 = time.time()
def log(*a): print(f'[{time.time() - T0:6.1f}s]', *a, flush=True)

N1, N2, N3 = noise3(128, 26, 901), noise3(128, 13, 902), noise3(128, 6.5, 903)
N4 = noise3(128, 3.2, 904)

def billow(px, py, pz, scale, amps=(1.0, 0.5, 0.25, 0.12)):
    """Cauliflower: absolute value noise gives round bulges with creases between, like the top of a cumulus."""
    s = 128.0 / scale
    out = np.abs(sample3(N1, px * s, py * s, pz * s * 1.3)) * amps[0]
    out += np.abs(sample3(N2, px * s, py * s, pz * s * 1.3)) * amps[1]
    out += np.abs(sample3(N3, px * s, py * s, pz * s * 1.3)) * amps[2]
    out += np.abs(sample3(N4, px * s, py * s, pz * s * 1.3)) * amps[3]
    return out

def write(name, dens, origin, voxel):
    g = vdb.FloatGrid(0.0)
    g.name = 'density'
    g.copyFromArray(dens, tolerance=0.002)
    t = vdb.createLinearTransform(voxelSize=float(voxel))
    t.postTranslate((float(origin[0]), float(origin[1]), float(origin[2])))
    g.transform = t
    p = os.path.join(OUT, f'cloud_{name}.vdb')
    vdb.write(p, grids=[g])
    log(name, dens.shape, f'{dens.size / 1e6:.0f}M', f'{os.path.getsize(p) / 1e6:.0f} MB', 'active', g.activeVoxelCount())

def deck(name, box, voxel, top_z, soft, field, bscale, bamp, seed, edge=None):
    """A cloud layer: a painted height map (top of the cloud) eroded by billow noise."""
    (x0, x1), (y0, y1), (z0, z1) = box
    v = voxel / Q
    xs = np.arange(x0, x1, v, dtype=np.float32)
    ys = np.arange(y0, y1, v, dtype=np.float32)
    zs = np.arange(z0, z1, v, dtype=np.float32)
    X, Y = np.meshgrid(xs, ys, indexing='ij')
    H = field(X, Y)
    dens = np.zeros((len(xs), len(ys), len(zs)), np.float32)
    for k, z in enumerate(zs):
        Z = np.full(X.shape, z, np.float32)
        b = billow(X + seed * 37.0, Y + seed * 11.0, Z, bscale)
        s = H + b * bamp - bamp * 0.75 - z
        dens[:, :, k] = np.clip(s / soft, 0, 1) ** 1.2
    # fade at the volume's walls so no box ever shows
    wall = 6
    ramp = np.linspace(0, 1, wall, dtype=np.float32)
    dens[:wall] *= ramp[:, None, None]
    dens[-wall:] *= ramp[::-1, None, None]
    dens[:, :wall] *= ramp[None, :, None]
    dens[:, -wall:] *= ramp[::-1][None, :, None]
    write(name, dens, (x0, y0, z0), v)

def hmap(cell, seed, n=1024, span=4096):
    a = fbm2((n, n), cell, seed, 5, 0.52)
    return a

Hf = hmap(70, 910)
def field_noise(X, Y, span):
    gx = np.mod(X / span, 1) * 1023
    gy = np.mod(Y / span, 1) * 1023
    return sample2(Hf, gx, gy)

# The near deck is what the bottom of the frame looks down on. It rises to a billowing shelf on the right and under the islands,
# and is low and calm to the left so the calm part of the picture stays calm.
def near_field(X, Y):
    n = field_noise(X, Y, 780)
    base = -128 + 26 * n
    # banks: gaussian mounds placed by hand
    for (cx, cy, r, h) in ((60, 10, 150, 44), (-50, -60, 90, 26), (200, -20, 130, 44), (-170, -30, 110, 16), (-60, 90, 120, 12), (-10, 160, 110, 34)):
        base = base + h * np.exp(-(((X - cx) ** 2 + (Y - cy) ** 2) / r ** 2))
    return base

deck('near', ((-360, 460), (-160, 420), (-175, -48)), 1.6, -130, 7.0, near_field, 90, 22, 1)

def far_field(X, Y):
    n = field_noise(X, Y, 3200)
    d = np.sqrt((X - 100) ** 2 + (Y - 600) ** 2)
    return -128 + 38 * n + 10 * smooth(1500, 500, d)

deck('far', ((-1900, 2500), (380, 3000), (-185, -60)), 7.0, -130, 26.0, far_field, 420, 60, 2)

# Banks that sit among the islands, soft at the edges. One behind the main island's left end, some low in the left of the frame.
def bank_field(cx, cy, rx, ry, top, seed):
    def f(X, Y):
        r = ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2
        n = field_noise(X + seed * 91.0, Y - seed * 43.0, 500)
        return top - 34 * np.maximum(r + 0.34 * n, 0) ** 1.1 + 0 * X
    return f

deck('bank_a', ((-130, 130), (190, 400), (-98, -30)), 0.8, 0, 3.0, bank_field(-2, 300, 70, 60, -44, 3), 48, 12, 3)
deck('bank_b', ((120, 450), (340, 640), (-100, -18)), 1.0, 0, 3.5, bank_field(290, 480, 120, 100, -30, 4), 60, 14, 4)
deck('bank_c', ((-270, -50), (-130, 80), (-128, -62)), 0.7, 0, 2.6, bank_field(-160, -40, 80, 66, -82, 5), 44, 11, 5)
# fine mist where the waterfall thins out
deck('mist', ((-20, 90), (-110, -30), (-128, -66)), 0.6, 0, 2.4, bank_field(32, -72, 34, 24, -86, 6), 26, 7, 6)
log('done')
