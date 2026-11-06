# The hoopoe's skeleton and the helpers both build.py and anim.py use.
# Blender axes: x is the bird's left, -y is forward, z is up. The feet stand on z = 0 and the bird is about two units tall.
from collections import OrderedDict
from mathutils import Matrix, Quaternion, Vector
import math

BONES = OrderedDict()


def add(name, parent, head, tail, up=(0, 0, 1)):
    BONES[name] = dict(parent=parent, head=Vector(head), tail=Vector(tail), up=Vector(up))


def side(name, parent, head, tail, up=(0, 0, 1)):
    """Adds a left bone and its mirror. `parent` may hold {s}, which becomes L or R."""
    for s, sx in (('L', 1), ('R', -1)):
        h, t, u = Vector(head), Vector(tail), Vector(up)
        h.x *= sx
        t.x *= sx
        u.x *= sx
        add(name.format(s=s), parent.format(s=s), h, t, u)


# Landmarks used by the modelling code too.
HEAD_C = Vector((0, -0.36, 1.50))
EYE_C = Vector((0.208, -0.522, 1.565))
EYE_R = 0.122
EYE_AXIS = Vector((0.60, -0.78, 0.10)).normalized()
EYE_TILT = -5.0  # degrees the lid line slopes down toward the bill, which gives a cheeky, confident look
BILL_B = Vector((0, -0.60, 1.455))
SHOULDER = Vector((0.25, -0.10, 1.06))
ELBOW = Vector((0.56, 0.02, 1.10))
WRIST = Vector((0.90, -0.08, 1.12))
HAND = Vector((1.20, -0.02, 1.12))
TAIL_ROOT = Vector((0, 0.50, 0.66))
TAIL_DIR = Vector((0, math.cos(math.radians(22)), -math.sin(math.radians(22))))
HIP = Vector((0.13, 0.08, 0.62))
KNEE = Vector((0.15, -0.07, 0.47))
ANKLE = Vector((0.145, 0.055, 0.265))
BALL = Vector((0.14, -0.015, 0.05))

add('root', '', (0, 0, 0), (0, 0, 0.2), (0, -1, 0))
add('hips', 'root', (0, 0.12, 0.64), (0, 0.02, 0.84), (0, -1, 0))
add('spine', 'hips', (0, 0.02, 0.84), (0, -0.07, 1.00), (0, -1, 0))
add('chest', 'spine', (0, -0.07, 1.00), (0, -0.15, 1.16), (0, -1, 0))
add('neck1', 'chest', (0, -0.15, 1.16), (0, -0.22, 1.30), (0, -1, 0))
add('neck2', 'neck1', (0, -0.22, 1.30), (0, -0.27, 1.42), (0, -1, 0))
add('head', 'neck2', (0, -0.27, 1.42), (0, -0.33, 1.80), (0, -1, 0))
add('bill', 'head', tuple(BILL_B + Vector((0, 0.03, 0.0))), tuple(BILL_B + Vector((0, -0.40, -0.06))))
add('jaw', 'head', tuple(BILL_B + Vector((0, 0.05, -0.03))), tuple(BILL_B + Vector((0, -0.40, -0.14))))


def _eye_axes():
    z = Vector((0, 0, 1))
    s = EYE_AXIS.cross(z).normalized()   # along the lid hinge
    u = s.cross(EYE_AXIS).normalized()
    # Slope the hinge, so the lid line isn't dead level.
    q = Quaternion(EYE_AXIS, math.radians(-EYE_TILT))
    return q @ s, q @ u


_es, _eu = _eye_axes()
EYE_S, EYE_U = _es, _eu
for nm in ('eye', 'lid_u', 'lid_l'):
    side(nm + '.{s}', 'head', tuple(EYE_C), tuple(EYE_C + EYE_AXIS * 0.2), tuple(EYE_U))
side('brow.{s}', 'head', tuple(EYE_C + Vector((-0.03, 0.05, 0.13))), tuple(EYE_C + Vector((0.0, -0.09, 0.15))), (0.3, -0.2, 1))

# One bone per crest feather, fanned over the crown. Index 0 is at the forehead, 8 at the nape.
CREST_N = 9
CREST_ANG = [-62 + i * (62 + 74) / (CREST_N - 1) for i in range(CREST_N)]
CREST_R = 0.262


def crest_frame(i):
    a = math.radians(CREST_ANG[i])
    # Angle from straight up toward the back of the head.
    d = Vector((0, math.sin(a), math.cos(a)))
    root = HEAD_C + Vector((0, 0.0, 0.0)) + Vector((0, d.y * CREST_R * 1.05, d.z * CREST_R))
    return root, d


for i in range(CREST_N):
    r, d = crest_frame(i)
    add(f'crest_{i}', 'head', tuple(r), tuple(r + d * 0.3), (1, 0, 0))

add('tail_base', 'hips', tuple(TAIL_ROOT), tuple(TAIL_ROOT + TAIL_DIR * 0.22), (0, 0, 1))
add('tail_mid', 'tail_base', tuple(TAIL_ROOT + TAIL_DIR * 0.22), tuple(TAIL_ROOT + TAIL_DIR * 0.5), (0, 0, 1))
side('tail.{s}', 'tail_mid', tuple(TAIL_ROOT + TAIL_DIR * 0.5), tuple(TAIL_ROOT + TAIL_DIR * 0.9 + Vector((0.12, 0, 0))), (0, 0, 1))

# Wings are modelled fully open. Each fan bone owns a group of flight feathers, so the wing can fold like a real one.
side('wing_up.{s}', 'chest', tuple(SHOULDER), tuple(ELBOW))
side('wing_fo.{s}', 'wing_up.{s}', tuple(ELBOW), tuple(WRIST))
side('wing_ha.{s}', 'wing_fo.{s}', tuple(WRIST), tuple(HAND))


def wing_dir(alpha):
    """A direction in the open wing's plane: 0 is straight back, 90 is straight out."""
    a = math.radians(alpha)
    return Vector((math.sin(a), math.cos(a), 0))


def lerp3(a, b, t):
    return a + (b - a) * t


FAN = {
    'ter': ('wing_up.{s}', lerp3(SHOULDER, ELBOW, 0.75), -6),
    'sec_a': ('wing_fo.{s}', lerp3(ELBOW, WRIST, 0.08), 2),
    'sec_b': ('wing_fo.{s}', lerp3(ELBOW, WRIST, 0.5), 9),
    'sec_c': ('wing_fo.{s}', lerp3(ELBOW, WRIST, 0.92), 18),
    'pri_a': ('wing_ha.{s}', lerp3(WRIST, HAND, 0.05), 28),
    'pri_b': ('wing_ha.{s}', lerp3(WRIST, HAND, 0.38), 44),
    'pri_c': ('wing_ha.{s}', lerp3(WRIST, HAND, 0.7), 60),
    'pri_d': ('wing_ha.{s}', lerp3(WRIST, HAND, 1.0), 76),
}
for nm, (parent, at, alpha) in FAN.items():
    side(nm + '.{s}', parent, tuple(at), tuple(at + wing_dir(alpha) * 0.5))

side('thigh.{s}', 'hips', tuple(HIP), tuple(KNEE), (0, -1, 0))
side('shin.{s}', 'thigh.{s}', tuple(KNEE), tuple(ANKLE), (0, -1, 0))
side('tarsus.{s}', 'shin.{s}', tuple(ANKLE), tuple(BALL), (0, -1, 0))
side('foot.{s}', 'tarsus.{s}', tuple(BALL), tuple(BALL + Vector((0, -0.09, -0.03))))
side('toe_f.{s}', 'foot.{s}', tuple(BALL + Vector((0, -0.05, -0.02))), tuple(BALL + Vector((0, -0.24, -0.04))))
side('toe_b.{s}', 'foot.{s}', tuple(BALL + Vector((0, 0.02, -0.02))), tuple(BALL + Vector((0, 0.16, -0.04))))


def create_armature():
    import bpy
    data = bpy.data.armatures.new('hoopoe')
    ob = bpy.data.objects.new('hoopoe_rig', data)
    bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    for name, b in BONES.items():
        e = data.edit_bones.new(name)
        e.head, e.tail = b['head'], b['tail']
        e.align_roll(b['up'])
        e.inherit_scale = 'NONE'
        if b['parent']:
            e.parent = data.edit_bones[b['parent']]
    bpy.ops.object.mode_set(mode='OBJECT')
    return ob


# ---------------------------------------------------------------------------------------------------- posing
def rest_rot(arm, name):
    return arm.data.bones[name].matrix_local.to_quaternion()


def E(pitch=0.0, yaw=0.0, roll=0.0):
    """A rotation in body axes, in degrees. Pitch lifts the nose, yaw turns toward the bird's left, roll drops its left side."""
    qp = Quaternion((1, 0, 0), math.radians(-pitch))
    qy = Quaternion((0, 0, 1), math.radians(yaw))
    qr = Quaternion((0, 1, 0), math.radians(roll))
    return qy @ qp @ qr


def mirror_q(q):
    """The same rotation seen in a mirror across the x = 0 plane."""
    return Quaternion((q.w, q.x, -q.y, -q.z))


def to_basis(arm, name, d):
    """Turns a rotation given in body axes (d) into the bone's own pose rotation."""
    r = rest_rot(arm, name)
    return r.inverted() @ d @ r


def frame_q(d, n):
    """A rotation whose columns are the bone axes, with bone y along d and bone z near n."""
    y = Vector(d).normalized()
    x = y.cross(Vector(n)).normalized()
    z = x.cross(y).normalized()
    return Matrix(((x.x, y.x, z.x), (x.y, y.y, z.y), (x.z, y.z, z.z))).to_quaternion()


def world_targets_to_basis(arm, targets, order):
    """targets: bone -> world (armature space) rotation quaternion. Returns bone -> local pose rotation, given parents' targets."""
    out = {}
    world = {}
    for name in order:
        b = arm.data.bones[name]
        rest_world = b.matrix_local.to_quaternion()
        if b.parent:
            pr = b.parent.matrix_local.to_quaternion()
            pw = world.get(b.parent.name, pr)
        else:
            pr = Quaternion()
            pw = Quaternion()
        rest_local = pr.inverted() @ rest_world
        w = targets.get(name)
        if w is None:
            w = pw @ rest_local
        world[name] = w
        out[name] = rest_local.inverted() @ pw.inverted() @ w
    return out


# The folded wing: where each bone points when the wing lies along the body, as (direction, outward normal).
def v(*a):
    return Vector(a)


F_E = v(0.392, 0.17, 1.02)
F_W = v(0.372, -0.17, 0.935)
F_H = v(0.345, 0.125, 0.815)
F_N = v(0.94, -0.03, 0.34)
WING_FOLD = {
    'wing_up': (F_E - SHOULDER, v(0.86, -0.28, 0.42)),
    'wing_fo': (F_W - F_E, F_N),
    'wing_ha': (F_H - F_W, v(0.95, 0.0, 0.31)),
    'ter': (v(-0.05, 0.93, -0.20), v(0.90, 0.02, 0.43)),
    'sec_a': (v(-0.06, 0.94, -0.27), v(0.92, 0.02, 0.39)),
    'sec_b': (v(-0.05, 0.93, -0.31), v(0.93, 0.02, 0.36)),
    'sec_c': (v(-0.05, 0.92, -0.35), v(0.94, 0.02, 0.33)),
    'pri_a': (v(-0.05, 0.92, -0.36), v(0.95, 0.02, 0.31)),
    'pri_b': (v(-0.05, 0.92, -0.375), v(0.95, 0.02, 0.30)),
    'pri_c': (v(-0.05, 0.915, -0.39), v(0.95, 0.02, 0.30)),
    'pri_d': (v(-0.05, 0.91, -0.40), v(0.95, 0.02, 0.29)),
}


def fold_targets():
    """Bone -> world rotation for both wings folded."""
    t = {}
    for nm, (d, n) in WING_FOLD.items():
        t[nm + '.L'] = frame_q(d, n)
        dm = Vector((-d[0], d[1], d[2]))
        nm_ = Vector((-n[0], n[1], n[2]))
        t[nm + '.R'] = frame_q(dm, nm_)
    return t


def fold_pose(arm):
    order = list(BONES.keys())
    return {k: q for k, q in world_targets_to_basis(arm, fold_targets(), order).items() if '.' in k and k.split('.')[0] in WING_FOLD}


# Crest folded back along the head: degrees each feather rotates about the side axis from its open position, as a fan closing.
CREST_FOLD = [132, 118, 103, 89, 76, 63, 49, 34, 19]


def crest_pose(arm, open_amount, spread=1.0):
    """open_amount 0 is laid back, 1 is the full fan."""
    p = {}
    for i in range(CREST_N):
        a = CREST_FOLD[i] * (1 - open_amount)
        # Positive pitch of the feather toward the back of the head.
        p[f'crest_{i}'] = to_basis(arm, f'crest_{i}', Quaternion((1, 0, 0), math.radians(-a)))
    return p
