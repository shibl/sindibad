# The hoopoe's clips, authored as pose keys at 30 fps. Opens hoopoe.blend from build.py and writes hoopoe-clips.bin.
#   nice -n 10 Blender -b concepts/blender/about/hoopoe/hoopoe.blend -P concepts/blender/about/hoopoe/anim.py
#
# Conventions: E(pitch, yaw, roll) in degrees, in body axes, relative to the rest pose. Pitch lifts the nose (and swings a hanging
# limb forward), yaw turns toward the bird's left, roll drops its left side. Timing and arcs come from keys; follow-through
# comes from the spring pass in anim_lib, tuned per bone. Eyes, lids, brows and the head's aim are driven live in the page.
import math
import os
import sys

import bpy
from mathutils import Quaternion, Vector

HERE = os.path.dirname(os.path.abspath(bpy.data.filepath)) if bpy.data.filepath else os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import rig
from rig import E, mirror_q
from anim_lib import Baker, Clip, Pose, both, merge

REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
OUT = os.environ.get('OUT', os.path.join(REPO, 'public', 'about', 'hoopoe'))
arm = bpy.data.objects['hoopoe_rig']
B = Baker(arm)

SIDE_FANS = ['ter', 'sec_a', 'sec_b', 'sec_c', 'pri_a', 'pri_b', 'pri_c', 'pri_d']
ARM = ['wing_up', 'wing_fo', 'wing_ha']
WING_BONES = [f'{n}.{s}' for n in ARM + SIDE_FANS for s in 'LR']
CREST = [f'crest_{i}' for i in range(rig.CREST_N)]
LEG = [f'{n}.{s}' for n in ('thigh', 'shin', 'tarsus', 'foot', 'toe_f', 'toe_b') for s in 'LR']
TAIL = ['tail_base', 'tail_mid', 'tail.L', 'tail.R']
TRUNK = ['hips', 'spine', 'chest', 'neck1', 'neck2', 'head', 'bill', 'jaw']
# Live bones the clips leave alone.
FACE = [f'{n}.{s}' for n in ('eye', 'lid_u', 'lid_l', 'brow') for s in 'LR']
BODY = TRUNK + CREST + TAIL + WING_BONES + LEG  # everything clips write


def crest(x):
    return rig.crest_pose(arm, x)


FOLD = rig.fold_pose(arm)


def nlerp(a, b, t):
    if a.dot(b) < 0:
        b = -b
    q = Quaternion((a.w + (b.w - a.w) * t, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t))
    q.normalize()
    return q


def wings(pose_l, also=None):
    """A wing pose from left-side rotations in body axes (measured from fully open), mirrored to the right."""
    out = {}
    for name, d in pose_l.items():
        out[f'{name}.L'] = B.basis_from_delta(f'{name}.L', d)
        out[f'{name}.R'] = B.basis_from_delta(f'{name}.R', mirror_q(d))
    return out


def mix_wings(a, b, t):
    return {k: nlerp(a.get(k, Quaternion()), b.get(k, Quaternion()), t) for k in WING_BONES}


OPEN = {k: Quaternion() for k in WING_BONES}


def wings_out(deg):
    """The folded wing held away from the body as a whole, the way a bird drops its shoulders. Unlike a partial blend toward the open
    wing, it can't pass through the chest, so it's the one to use for any pose that's held."""
    fold = rig.fold_targets()
    q = E(roll=-deg)
    t = {}
    for nm in rig.WING_FOLD:
        t[f'{nm}.L'] = q @ fold[f'{nm}.L']
        t[f'{nm}.R'] = mirror_q(q) @ fold[f'{nm}.R']
    basis = rig.world_targets_to_basis(arm, t, list(rig.BONES.keys()))
    return {k: basis[k] for k in t}


def fans(spread, ter=0, sec=0):
    """Closes the fan bones from fully open, by rotating primaries toward the wing's trailing edge."""
    d = {}
    # 0 is as modelled. Positive `spread` opens further, negative closes toward the secondaries.
    for name, k in (('pri_b', 0.4), ('pri_c', 0.75), ('pri_d', 1.0)):
        d[name] = E(yaw=spread * k)  # for the left wing, yaw toward +y (back) is positive
    return d


# Wing shapes in the air, on the left. Raising the wing: negative roll.
W_UP = wings({
    'wing_up': E(roll=-58, yaw=-8), 'wing_fo': E(roll=26, yaw=12), 'wing_ha': E(roll=42, yaw=-18),
    'sec_b': E(roll=-6), 'sec_c': E(roll=-8), 'pri_a': E(yaw=6), 'pri_b': E(yaw=12), 'pri_c': E(yaw=20), 'pri_d': E(yaw=26),
})
W_MID_DOWN = wings({
    'wing_up': E(roll=-6, yaw=16), 'wing_fo': E(roll=-2), 'wing_ha': E(roll=-6, yaw=4),
    'pri_b': E(yaw=-2), 'pri_c': E(yaw=-4), 'pri_d': E(yaw=-5),
})
W_DOWN = wings({
    'wing_up': E(roll=46, yaw=14), 'wing_fo': E(roll=8, yaw=-10), 'wing_ha': E(roll=4, yaw=-10),
    'pri_b': E(yaw=4), 'pri_c': E(yaw=8), 'pri_d': E(yaw=12),
})
W_GLIDE = wings({
    'wing_up': E(roll=-11, yaw=6), 'wing_fo': E(roll=9, yaw=-3), 'wing_ha': E(roll=-5, yaw=-4),
    'pri_b': E(yaw=-3), 'pri_c': E(yaw=-6), 'pri_d': E(yaw=-9),
})
W_BRAKE = wings({
    'wing_up': E(roll=-22, yaw=38, pitch=26), 'wing_fo': E(roll=14, yaw=-6), 'wing_ha': E(roll=4, yaw=-16),
    'pri_b': E(yaw=-6), 'pri_c': E(yaw=-11), 'pri_d': E(yaw=-16),
})
W_FLICK = mix_wings(FOLD, W_UP, 0.32)
W_HALF = mix_wings(FOLD, OPEN, 0.55)

# ---------------------------------------------------------------------------------------------------- body poses
N = Pose(abs_=merge(FOLD, crest(0.1)))

TUCK = {
    **both('thigh', E(pitch=26)), **both('shin', E(pitch=-46)), **both('tarsus', E(pitch=58)), **both('foot', E(pitch=-22)),
    **both('toe_f', E(pitch=-38)), **both('toe_b', E(pitch=36)),
}
REACH = {
    **both('thigh', E(pitch=30)), **both('shin', E(pitch=-8)), **both('tarsus', E(pitch=16)), **both('foot', E(pitch=-8)),
    **both('toe_f', E(pitch=12)), **both('toe_b', E(pitch=-12)),
}
TRAIL = {
    **both('thigh', E(pitch=-34)), **both('shin', E(pitch=-34)), **both('tarsus', E(pitch=52)), **both('foot', E(pitch=-20)),
    **both('toe_f', E(pitch=-30)), **both('toe_b', E(pitch=30)),
}

CROUCH = N.but(rot={
    'hips': E(pitch=-9), 'spine': E(pitch=1), 'chest': E(pitch=-2), 'neck1': E(pitch=-12), 'neck2': E(pitch=-5), 'head': E(pitch=23),
    'tail_base': E(pitch=-13), 'tail_mid': E(pitch=-6),
}, t={'hips': (0, -0.02, -0.19)}, s={'hips': (1.11, 0.9, 1.11), 'spine': (1.12, 0.86, 1.12), 'chest': (1.07, 0.93, 1.07)}, abs_=crest(0.0))

STRETCH = N.but(rot={
    'hips': E(pitch=14), 'spine': E(pitch=2), 'chest': E(pitch=2), 'neck1': E(pitch=4), 'neck2': E(pitch=-8), 'head': E(pitch=-8),
    'tail_base': E(pitch=16), 'tail_mid': E(pitch=8),
}, t={'hips': (0, 0.0, 0.1)}, s={'hips': (0.95, 1.08, 0.95), 'spine': (0.92, 1.12, 0.92), 'chest': (0.96, 1.05, 0.96)}, abs_=merge(crest(0.0), mix_wings(FOLD, W_UP, 0.4)))

AIR = N.but(rot={
    'hips': E(pitch=-14), 'spine': E(pitch=0), 'chest': E(pitch=-1), 'neck1': E(pitch=-10), 'neck2': E(pitch=2), 'head': E(pitch=14),
    'tail_base': E(pitch=-14), 'tail_mid': E(pitch=-8), 'tail.L': E(yaw=-14), 'tail.R': E(yaw=14), **TUCK,
}, t={'hips': (0, 0, 0.0)}, abs_=merge(crest(0.3), mix_wings(FOLD, W_UP, 0.55)))

LAND_REACH = N.but(rot={
    'hips': E(pitch=9), 'chest': E(pitch=3), 'neck1': E(pitch=4), 'neck2': E(pitch=-2), 'head': E(pitch=-8),
    'tail_base': E(pitch=-12), 'tail_mid': E(pitch=-6), **REACH,
}, abs_=merge(crest(0.1), mix_wings(FOLD, W_UP, 0.42)))

SQUASH = N.but(rot={
    'hips': E(pitch=-13), 'spine': E(pitch=-2), 'chest': E(pitch=-5), 'neck1': E(pitch=-14), 'neck2': E(pitch=-8), 'head': E(pitch=34),
    'tail_base': E(pitch=-20), 'tail_mid': E(pitch=-10),
}, t={'hips': (0, -0.02, -0.16)}, s={'hips': (1.11, 0.9, 1.11), 'spine': (1.12, 0.86, 1.12), 'chest': (1.07, 0.93, 1.07)}, abs_=merge(crest(0.55), wings_out(7)))

OVER = N.but(rot={
    'hips': E(pitch=6), 'spine': E(pitch=1), 'chest': E(pitch=2), 'neck1': E(pitch=4), 'neck2': E(pitch=-1), 'head': E(pitch=-5),
    'tail_base': E(pitch=7), 'tail_mid': E(pitch=3),
}, t={'hips': (0, 0, 0.03)}, s={'spine': (0.97, 1.03, 0.97)}, abs_=crest(0.28))

clips = []


def add(c, **kw):
    B.bake(c, **kw)


# ---------------------------------------------------------------------------------------------------- idle: breathing
breathe_in = N.but(rot={'hips': E(pitch=0.6), 'spine': E(pitch=0.9), 'chest': E(pitch=1.3), 'neck1': E(pitch=-0.8), 'neck2': E(pitch=-0.4), 'head': E(pitch=-0.8), 'tail_base': E(pitch=1.2)},
                   t={'hips': (0, 0, 0.012)}, s={'chest': (1.02, 1.0, 1.024), 'spine': (1.014, 1.0, 1.014)})
breathe_out = N.but(rot={'hips': E(pitch=-0.4), 'tail_base': E(pitch=-1.0), 'head': E(pitch=0.4)}, t={'hips': (0, 0, -0.005)})
c = Clip('idle', 84, loop=True)
c.key(0, breathe_out).key(36, breathe_in).key(60, breathe_in.but(t={'hips': (0, 0, 0.008)}), 'inout')
add(c, tune={n: (6.0, 0.9) for n in TRUNK + TAIL})

# Weight shifts. Feet stay planted by IK, so the hips can sway.
for name, sgn in (('shift_l', 1), ('shift_r', -1)):
    side = N.but(rot={'hips': E(roll=5 * sgn, yaw=3 * sgn), 'spine': E(roll=-2 * sgn), 'chest': E(roll=-2.5 * sgn), 'neck1': E(roll=-1.5 * sgn), 'head': E(roll=2 * sgn), 'tail_base': E(yaw=-7 * sgn, pitch=-2)},
                 t={'hips': (0.05 * sgn, 0, -0.018)})
    c = Clip(name, 70)
    c.key(0, N).key(5, N.but(t={'hips': (-0.012 * sgn, 0, 0.004)}), 'inout').key(19, side, 'inout').key(50, side, 'linear').key(69, N, 'inout')
    add(c, tune={n: (5.0, 0.85) for n in TRUNK})

# ---------------------------------------------------------------------------------------------------- hop
HOP_LIFT, HOP_LAND = 8, 15
c = Clip('hop', 34, events={'lift': HOP_LIFT, 'land': HOP_LAND})
c.key(0, N)
c.key(6, CROUCH, 'inout')
c.key(HOP_LIFT, STRETCH, 'in')
c.key(11, AIR, 'out')
c.key(14, LAND_REACH, 'inout')
c.key(HOP_LAND + 2, SQUASH, 'out')
c.key(HOP_LAND + 7, OVER, 'inout')
c.key(HOP_LAND + 15, N, 'inout')
add(c)

# ---------------------------------------------------------------------------------------------------- peck and tap
RISE = N.but(rot={
    'hips': E(pitch=7), 'spine': E(pitch=2), 'chest': E(pitch=6), 'neck1': E(pitch=10), 'neck2': E(pitch=6), 'head': E(pitch=16),
    'tail_base': E(pitch=8),
}, t={'hips': (0, 0.02, 0.012)}, abs_=crest(0.45))
STRIKE = N.but(rot={
    'hips': E(pitch=-26), 'spine': E(pitch=-9), 'chest': E(pitch=-13), 'neck1': E(pitch=-26), 'neck2': E(pitch=-13), 'head': E(pitch=-22),
    'tail_base': E(pitch=-22), 'tail_mid': E(pitch=-8),
}, t={'hips': (0, -0.05, -0.1)}, s={'chest': (1.03, 1.03, 1.03)}, abs_=crest(0.32))
PECK_BACK = STRIKE.but(rot={'neck1': E(pitch=19), 'neck2': E(pitch=11), 'head': E(pitch=16), 'hips': E(pitch=9)}, t={'hips': (0, -0.02, -0.06)}, abs_=crest(0.38))
c = Clip('peck', 40, events={'hit1': 9, 'hit2': 17})
c.key(0, N).key(7, RISE, 'inout').key(9, STRIKE, 'in3').key(10, STRIKE, 'linear').key(14, PECK_BACK, 'out').key(17, STRIKE, 'in').key(18, STRIKE, 'linear').key(24, RISE.but(abs_=crest(0.3)), 'out').key(34, N, 'inout')
add(c, tune=merge({n: (24, 0.72) for n in ('hips', 'spine', 'chest', 'neck1', 'neck2', 'head')}))

c = Clip('tap', 40, events={'hit1': 8, 'hit2': 14, 'hit3': 20})
c.key(0, N).key(6, RISE, 'inout').key(8, STRIKE, 'in3').key(11, PECK_BACK, 'out').key(14, STRIKE, 'in').key(17, PECK_BACK, 'out').key(20, STRIKE, 'in').key(23, STRIKE, 'linear').key(30, RISE, 'out').key(39, N, 'inout')
add(c, tune={n: (24, 0.8) for n in ('hips', 'spine', 'chest', 'neck1', 'neck2', 'head')})

# ---------------------------------------------------------------------------------------------------- squawk, when poked
PULL = N.but(rot={'hips': E(pitch=9), 'chest': E(pitch=5), 'neck1': E(pitch=17), 'neck2': E(pitch=10), 'head': E(pitch=-4), 'tail_base': E(pitch=10)}, t={'hips': (0, 0.06, -0.06)}, abs_=crest(0.0),
             s={'chest': (0.95, 1.0, 0.95), 'spine': (0.97, 1.0, 0.97)})
Y = N.but(rot={
    'hips': E(pitch=-3), 'spine': E(pitch=-2), 'chest': E(pitch=-2), 'neck1': E(pitch=-16), 'neck2': E(pitch=-2), 'head': E(pitch=30),
    'jaw': E(pitch=-27), 'bill': E(pitch=9), 'tail_base': E(pitch=-20), 'tail.L': E(yaw=-14), 'tail.R': E(yaw=14),
}, t={'hips': (0, -0.05, 0.04)}, abs_=merge(crest(1.0), wings_out(21)), s={'chest': (1.14, 1.05, 1.14), 'spine': (1.1, 1.0, 1.1)})
Y2 = Y.but(rot={'head': E(pitch=-8), 'neck2': E(pitch=2), 'jaw': E(pitch=9)}, abs_=crest(1.0))
c = Clip('squawk', 42, events={'open': 8})
c.key(0, N).key(5, PULL, 'out').key(8, Y, 'out3').key(11, Y2, 'inout').key(14, Y, 'inout').key(17, Y2, 'inout').key(20, Y, 'inout').key(27, N.but(abs_=crest(0.7), rot={'head': E(pitch=5)}), 'inout').key(41, N, 'inout')
add(c, tune={n: (26, 0.8) for n in ('jaw', 'bill')})

# ---------------------------------------------------------------------------------------------------- crest fan overlay
c = Clip('fan', 34, only=CREST)
c.key(0, Pose(abs_=crest(0.14))).key(3, Pose(abs_=crest(0.05)), 'out').key(8, Pose(abs_=crest(1.0)), 'out3').key(22, Pose(abs_=crest(1.0)), 'linear').key(33, Pose(abs_=crest(0.14)), 'inout')
add(c, tune={n: (5.5, 0.42) for n in CREST})

# ---------------------------------------------------------------------------------------------------- preen
LOOK_WING = N.but(rot={
    'hips': E(yaw=6, roll=4), 'spine': E(yaw=10), 'chest': E(yaw=16, pitch=-4), 'neck1': E(yaw=42, pitch=-10), 'neck2': E(yaw=44, pitch=-16), 'head': E(yaw=36, pitch=-18, roll=-14),
}, t={'hips': (0.02, 0, -0.02)}, abs_=merge(crest(0.3), wings_out(11)))
NIB = {'head': E(yaw=36, pitch=-30, roll=-14), 'neck2': E(yaw=44, pitch=-12)}
c = Clip('preen', 96)
c.key(0, N).key(5, N.but(rot={'neck1': E(yaw=-6), 'head': E(yaw=-8)}), 'inout').key(16, LOOK_WING, 'inout')
key_f = 20
for i in range(5):
    p = LOOK_WING.but(rot={'head': E(pitch=-8 - 4 * (i % 2), yaw=-3 + 3 * (i % 3), roll=2 * (i % 2)), 'neck2': E(pitch=4), 'jaw': E(pitch=-12)})
    q = LOOK_WING.but(rot={'head': E(pitch=8, yaw=2)})
    c.key(key_f, q, 'inout').key(key_f + 3, p, 'inout')
    key_f += 8
c.key(68, LOOK_WING.but(rot={'head': E(pitch=10), 'neck2': E(pitch=6)}), 'inout')
c.key(84, N.but(rot={'neck1': E(yaw=4), 'head': E(yaw=5)}), 'inout')
c.key(95, N, 'inout')
add(c)

# ---------------------------------------------------------------------------------------------------- a shake, every feather settling
c = Clip('shake', 34)
SH = lambda s: N.but(rot={'hips': E(yaw=3 * s, roll=4 * s), 'chest': E(yaw=-7 * s, roll=-7 * s), 'neck1': E(yaw=12 * s, roll=5 * s), 'neck2': E(yaw=14 * s), 'head': E(yaw=18 * s, roll=10 * s), 'tail_base': E(yaw=-16 * s)},
                     s={'chest': (1.09, 1.03, 1.09), 'spine': (1.07, 1.0, 1.07), 'hips': (1.05, 1, 1.05)}, abs_=merge(crest(0.75), wings_out(16)))
c.key(0, N).key(3, N.but(rot={'neck1': E(pitch=-5)}, t={'hips': (0, 0, -0.035)}, abs_=crest(0.2)), 'inout')
fr = 5
s_ = 1
for i in range(6):
    c.key(fr, SH(s_), 'inout')
    s_ = -s_
    fr += 2
c.key(fr + 6, N.but(abs_=crest(0.32)), 'out')
c.key(33, N, 'inout')
add(c, tune={n: (20, 0.7) for n in TRUNK})

# ---------------------------------------------------------------------------------------------------- flight
FLY_BODY = {
    'hips': E(pitch=-33), 'spine': E(pitch=-2), 'chest': E(pitch=-3), 'neck1': E(pitch=-8), 'neck2': E(pitch=12), 'head': E(pitch=30),
    'tail_base': E(pitch=11), 'tail_mid': E(pitch=2), **TUCK,
}
TAIL_FAN = {'tail.L': E(yaw=-18), 'tail.R': E(yaw=18)}
FLY_T = {'hips': (0, 0.05, 0.1)}
FLY_UP = Pose(rot=FLY_BODY, abs_=merge(crest(0.05), W_UP), t=FLY_T)
FLY_DN = Pose(rot=merge(FLY_BODY, {'hips': E(pitch=-27), 'neck1': E(pitch=-4), 'head': E(pitch=25)}), abs_=merge(crest(0.05), W_DOWN), t={'hips': (0, 0.05, 0.14)})
FLY_MD = Pose(rot=FLY_BODY, abs_=merge(crest(0.05), W_MID_DOWN), t=FLY_T)
c = Clip('flap', 12, loop=True)
c.key(0, FLY_UP).key(3, FLY_MD, 'in').key(6, FLY_DN, 'out').key(9, mixpose := Pose(rot=FLY_BODY, abs_=merge(crest(0.05), mix_wings(W_DOWN, W_UP, 0.5)), t=FLY_T), 'inout')
add(c, tune=merge({n: (9, 0.8) for n in TRUNK}, {n: (6, 0.7) for n in TAIL}, {n: (7, 0.8) for n in LEG}, {f'wing_up.{s}': (26, 0.85) for s in 'LR'}, {f'wing_fo.{s}': (20, 0.7) for s in 'LR'}, {f'wing_ha.{s}': (13, 0.6) for s in 'LR'},
                  {f'{n}.{s}': (13, 0.65) for n in SIDE_FANS for s in 'LR'}))

GLIDE = Pose(rot=merge(FLY_BODY, {'hips': E(pitch=-30), 'head': E(pitch=28), **TAIL_FAN}), abs_=merge(crest(0.0), W_GLIDE), t=FLY_T)
GLIDE2 = Pose(rot=merge(FLY_BODY, {'hips': E(pitch=-32), 'head': E(pitch=30), **TAIL_FAN}), abs_=merge(crest(0.04), mix_wings(W_GLIDE, W_MID_DOWN, 0.55)), t={'hips': (0, 0.05, 0.12)})
c = Clip('glide', 44, loop=True)
c.key(0, GLIDE).key(22, GLIDE2, 'inout')
add(c, tune=merge({n: (4, 0.9) for n in BODY}))

# Takeoff: crouch, leap, the first big beat. Ends on the flap's up position.
TAKE_C = CROUCH.but(rot={'hips': E(pitch=-7), 'tail_base': E(pitch=-10)}, abs_=merge(crest(0.0), wings_out(10)))
TAKE_L = STRETCH.but(rot={'hips': E(pitch=-8), 'neck1': E(pitch=-10), 'head': E(pitch=8), **TAIL_FAN}, abs_=merge(crest(0.0), W_UP))
TAKE_D = Pose(rot=merge(FLY_BODY, {'hips': E(pitch=-18), 'head': E(pitch=20), 'neck1': E(pitch=-2), **TUCK, **TAIL_FAN}), abs_=merge(crest(0.1), W_DOWN), t={'hips': (0, 0.02, 0.12)})
c = Clip('takeoff', 20, events={'lift': 8})
c.key(0, N).key(6, TAKE_C, 'inout').key(8, TAKE_L, 'in').key(10, Pose(rot=TAKE_L.rot, abs_=merge(crest(0.0), W_UP), t=TAKE_L.t, s=TAKE_L.s), 'linear').key(14, TAKE_D, 'out').key(19, FLY_UP, 'inout')
add(c, tune=merge({f'wing_up.{s}': (24, 0.85) for s in 'LR'}, {f'wing_fo.{s}': (18, 0.7) for s in 'LR'}, {f'wing_ha.{s}': (13, 0.6) for s in 'LR'}, {f'{n}.{s}': (12, 0.65) for n in SIDE_FANS for s in 'LR'}, {n: (10, 0.7) for n in TRUNK}))

# Landing: starts on the glide, flares and brakes, reaches, hits, folds. The root reaches the perch on 'contact'.
LAND_CONTACT = 13
FLARE = Pose(rot=merge({'hips': E(pitch=-2), 'spine': E(pitch=2), 'chest': E(pitch=2), 'neck1': E(pitch=2), 'neck2': E(pitch=2), 'head': E(pitch=-2), 'tail_base': E(pitch=-24), 'tail_mid': E(pitch=-12), **TAIL_FAN}, REACH),
             abs_=merge(crest(0.1), W_BRAKE), t={'hips': (0, 0.03, 0.05)})
FLARE2 = Pose(rot=merge({'hips': E(pitch=6), 'spine': E(pitch=3), 'chest': E(pitch=2), 'neck1': E(pitch=3), 'neck2': E(pitch=0), 'head': E(pitch=-6), 'tail_base': E(pitch=-28), 'tail_mid': E(pitch=-14), **TAIL_FAN}, REACH),
              abs_=merge(crest(0.05), mix_wings(W_BRAKE, W_DOWN, 0.55)), t={'hips': (0, 0.02, 0.03)})
HALF_FOLD = SQUASH.but(abs_=merge(crest(0.7), mix_wings(FOLD, W_UP, 0.42)))
c = Clip('land', 42, events={'contact': LAND_CONTACT})
c.key(0, GLIDE).key(7, FLARE, 'inout').key(11, FLARE2, 'inout').key(LAND_CONTACT, LAND_REACH.but(abs_=merge(crest(0.0), mix_wings(FOLD, W_UP, 0.6))), 'linear')
c.key(LAND_CONTACT + 3, HALF_FOLD, 'out')
c.key(LAND_CONTACT + 7, SQUASH.but(abs_=merge(crest(0.8), wings_out(11)), rot={'hips': E(pitch=6), 'neck1': E(pitch=5)}, t={'hips': (0, -0.01, -0.09)}), 'inout')
c.key(LAND_CONTACT + 12, OVER.but(abs_=crest(0.7)), 'inout')
c.key(LAND_CONTACT + 20, N.but(abs_=crest(0.32)), 'inout')
c.key(41, N, 'inout')
add(c, tune=merge({f'wing_up.{s}': (17, 0.8) for s in 'LR'}, {f'wing_fo.{s}': (12, 0.65) for s in 'LR'}, {f'wing_ha.{s}': (10, 0.55) for s in 'LR'}, {f'{n}.{s}': (9, 0.55) for n in SIDE_FANS for s in 'LR'}, {n: (12, 0.7) for n in TRUNK}))

# Static poses for the still images and for checking in the viewer.
c = Clip('fold', 2, loop=True)
c.key(0, N)
add(c, tune={n: None for n in B.names})
c = Clip('open', 2, loop=True)
c.key(0, Pose(rot=FLY_BODY, abs_=merge(crest(0.4), W_GLIDE), t=FLY_T))
add(c, tune={n: None for n in B.names})
c = Clip('fan_pose', 2, loop=True)
c.key(0, N.but(abs_=crest(1.0)))
add(c, tune={n: None for n in B.names})

path = os.path.join(OUT, 'hoopoe-clips.bin')
B.write(path)
# Keep the clips in the .blend as ordinary actions, so an animator can open them and see what the page plays.
B.write_actions(arm)
bpy.ops.wm.save_mainfile()
print('wrote clips', os.path.getsize(path) // 1024, 'KB')
print('frames', sum(r['clip'].frames for r in B.out))
