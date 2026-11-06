# Everything that moves in the break, as a function of the sim frame: camera keys for landscape and portrait, the sun, the raft, and
# which frames get rendered. Phone space: chin toward -Y, table at z = 0. The live sea takes over from the last frame.
import math
from mathutils import Vector
import scene as S

SIM_FRAMES = 150
FINAL_F = 150
SEA_LEVEL = 5.6
SUN_END = (0.2, 1.0, 0.135)           # keep in step with SUN in src/about/phone/sea.ts
SUN_F0, SUN_F1 = 66, 118
GOBO_F0, GOBO_F1 = 40, 84
FLOOD_F = 84
RAFT_F0, RAFT_F1 = 118, 146
RAFT_LIFT = 2.1
RAFT_YAW = -28.0
RAFT_PITCH = 8.0
RAFT_ROLL = -2.0
PHONE_PROP = 15.0                      # the phone comes up tilted toward the camera, lodged on a broken plank
RAFT_XY = (0.0, 0.0)
SWELL_F0, SWELL_F1 = 104, 150
WORLD_T_END = 40.0                     # the live sea's clock at the last frame


def smoothstep(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def swell_amount(f):
    return smoothstep(SWELL_F0, SWELL_F1, f)


def world_time(f):
    return WORLD_T_END + (f - FINAL_F) / 24.0


def wave_table():
    """The same swell as WAVES in src/about/phone/sea.ts."""
    W = [(186, 74, 0.62, 0.34), (168, 47, 0.42, 0.42), (205, 29, 0.25, 0.5), (150, 19, 0.15, 0.55), (222, 12.3, 0.085, 0.55), (176, 8.1, 0.05, 0.55), (136, 5.3, 0.03, 0.5), (198, 3.7, 0.018, 0.45)]
    out = []
    for deg, length, amp, q in W:
        k = 2 * math.pi / length
        a = math.radians(deg)
        out.append((math.sin(a), math.cos(a), k, math.sqrt(9.8 * k), amp, q))
    return out


# frame, position, target, lens, focus point
LAND = [
    (0, (26.5, -23.2, 33.0), (0.0, 0.0, 0.5), 58, (0, -2, 1)),
    (28, (15.5, -25.0, 17.0), (0.0, -1.0, 1.2), 50, (0, -2, 1)),
    (46, (7.5, -22.5, 7.0), (0.0, -3.0, 3.2), 40, (0, -6, 2)),
    (60, (3.5, -22.5, 4.0), (0.0, -7.0, 4.4), 32, (0, -10, 3)),
    (74, (2.5, -30.0, 5.4), (0.0, -12.0, 4.8), 30, (0, -22, 2)),
    (92, (2.0, -46.0, 13.0), (0.0, -10.0, 3.0), 30, (0, -18, 2)),
    (116, (-11.0, -76.0, 20.0), (-9.0, 40.0, 23.0), 30, (-2, -6, 4)),
    (150, (-22.0, -94.0, 21.5), (-22.0, 6.0, 30.0), 30, (0, 0, 6)),
]
# Portrait: the phone in the picture is lined up with the phone in the visitor's hand, then the same event from a taller frame.
PORT = [
    (0, (15.0, -27.0, 42.0), (0.0, -0.4, 0.4), 44, (0, -2, 1)),
    (28, (8.5, -25.0, 26.0), (0.0, -1.2, 1.5), 36, (0, -2, 1)),
    (46, (4.5, -22.5, 10.0), (0.0, -3.0, 3.0), 31, (0, -6, 2)),
    (60, (2.0, -23.5, 5.2), (0.0, -6.0, 3.2), 28, (0, -10, 3)),
    (74, (1.5, -32.0, 6.6), (0.0, -12.0, 3.4), 26, (0, -22, 2)),
    (92, (1.0, -48.0, 15.0), (0.0, -10.0, 5.0), 24, (0, -18, 2)),
    (116, (-1.0, -66.0, 21.0), (0.0, 40.0, 29.0), 26, (-1, -6, 4)),
    (150, (-1.0, -76.0, 23.5), (-1.0, 24.0, 34.0), 28, (0, 0, 6)),
]


def frame_list():
    """The sequence: sparse while the still life barely changes, dense through the break."""
    return list(range(0, 20, 5)) + list(range(20, 136, 2)) + [138, 142, 146, 150]


def _spline(keys, t, idx):
    ts = [k[0] for k in keys]
    if t <= ts[0]:
        return Vector(keys[0][idx]) if not isinstance(keys[0][idx], (int, float)) else keys[0][idx]
    if t >= ts[-1]:
        return Vector(keys[-1][idx]) if not isinstance(keys[-1][idx], (int, float)) else keys[-1][idx]
    i = next(j for j in range(len(ts) - 1) if ts[j] <= t <= ts[j + 1])
    get = lambda j: keys[max(0, min(len(keys) - 1, j))]
    k0, k1, k2, k3 = get(i - 1), get(i), get(i + 1), get(i + 2)
    # Tangents scaled by the uneven key spacing, so the move doesn't kick at a key.
    u = (t - k1[0]) / (k2[0] - k1[0])
    conv = (lambda v: v) if isinstance(k1[idx], (int, float)) else Vector
    p0, p1, p2, p3 = conv(k0[idx]), conv(k1[idx]), conv(k2[idx]), conv(k3[idx])
    dt = k2[0] - k1[0]
    m1 = (p2 - p0) / max(k2[0] - k0[0], 1e-3) * dt
    m2 = (p3 - p1) / max(k3[0] - k1[0], 1e-3) * dt
    u2, u3 = u * u, u * u * u
    return (2 * u3 - 3 * u2 + 1) * p1 + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2 + (u3 - u2) * m2


def camera_target(f, portrait=False):
    return _spline(PORT if portrait else LAND, f, 2)


def apply_camera(cam, f, portrait=False):
    keys = PORT if portrait else LAND
    cam.location = _spline(keys, f, 1)
    S.look_at(cam, _spline(keys, f, 2))
    cam.data.lens = _spline(keys, f, 3)
    cam.data.dof.focus_distance = (cam.location - _spline(keys, f, 4)).length
