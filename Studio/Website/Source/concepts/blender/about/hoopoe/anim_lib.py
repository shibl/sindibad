# Tools for authoring the hoopoe's clips: pose keys, per-segment easing, and a spring pass that gives every bone its own
# drag and overshoot, so follow-through comes from physics rather than from hand-placed keys.
import json
import math
import struct

import numpy as np
from mathutils import Quaternion, Vector

import rig
from rig import E, mirror_q

FPS = 30


def ease_fn(name):
    if name == 'linear':
        return lambda t: t
    if name == 'in':
        return lambda t: t * t
    if name == 'in3':
        return lambda t: t * t * t
    if name == 'out':
        return lambda t: 1 - (1 - t) * (1 - t)
    if name == 'out3':
        return lambda t: 1 - (1 - t) ** 3
    if name == 'inout':
        return lambda t: t * t * (3 - 2 * t)
    if name == 'back':
        return lambda t: 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2
    raise ValueError(name)


class Pose:
    """rot: bone -> rotation delta in body axes. abs: bone -> pose rotation (basis), used for the wings. t: bone -> offset, s: bone -> scale."""

    def __init__(self, rot=None, abs_=None, t=None, s=None):
        self.rot = dict(rot or {})
        self.abs = dict(abs_ or {})
        self.t = {k: Vector(v) for k, v in (t or {}).items()}
        self.s = {k: tuple(v) for k, v in (s or {}).items()}

    def but(self, rot=None, abs_=None, t=None, s=None):
        """A copy, with rotations composed onto this pose and offsets replaced."""
        p = Pose(self.rot, self.abs, self.t, self.s)
        for k, v in (rot or {}).items():
            p.rot[k] = (p.rot[k] @ v) if k in p.rot else v
        for k, v in (abs_ or {}).items():
            p.abs[k] = v
        for k, v in (t or {}).items():
            p.t[k] = Vector(v)
        for k, v in (s or {}).items():
            p.s[k] = tuple(v)
        return p


def both(name, q):
    """A rotation for a left bone and its mirror image on the right."""
    return {name + '.L': q, name + '.R': mirror_q(q)}


def merge(*ds):
    out = {}
    for d in ds:
        out.update(d)
    return out


class Clip:
    def __init__(self, name, frames, loop=False, events=None, only=None):
        self.name, self.frames, self.loop = name, frames, loop
        self.keys = []
        self.events = events or {}
        self.only = only  # the only bones this clip writes, for overlays

    def key(self, frame, pose, ease='inout', bones=None):
        self.keys.append((frame, pose, ease, bones))
        return self


class Baker:
    def __init__(self, arm):
        self.arm = arm
        self.names = list(rig.BONES.keys())
        self.ix = {n: i for i, n in enumerate(self.names)}
        self.rest_q = {}
        self.rest_t = {}
        self.parent_q = {}
        self.world_q = {}
        for n in self.names:
            b = arm.data.bones[n]
            w = b.matrix_local.to_quaternion()
            self.world_q[n] = w
            if b.parent:
                ml = b.parent.matrix_local.inverted() @ b.matrix_local
                self.parent_q[n] = b.parent.matrix_local.to_quaternion()
            else:
                ml = b.matrix_local.copy()
                self.parent_q[n] = Quaternion()
            self.rest_q[n] = ml.to_quaternion()
            self.rest_t[n] = ml.to_translation()
        self.out = []
        self.spring = {}

    def basis_from_delta(self, name, d):
        r = self.world_q[name]
        return r.inverted() @ d @ r

    def pose_channels(self, pose, name):
        """Returns (basis quaternion as a 4-array, offset 3-array, scale 3-array) for a bone in a pose."""
        if name in pose.abs:
            q = pose.abs[name]
        elif name in pose.rot:
            q = self.basis_from_delta(name, pose.rot[name])
        else:
            q = Quaternion()
        if name in pose.abs and name in pose.rot:
            q = pose.abs[name] @ self.basis_from_delta(name, pose.rot[name])
        t = pose.t.get(name, Vector((0, 0, 0)))
        s = pose.s.get(name, (1, 1, 1))
        return np.array([q.w, q.x, q.y, q.z]), np.array(t), np.array(s)

    def bake(self, clip, tune=None, delay=None):
        """Samples the keys into frames, runs the spring pass and stores the result."""
        F = clip.frames
        names = clip.only or self.names
        keys = sorted(clip.keys, key=lambda k: k[0])
        delay = delay or {}
        tune = tune or {}
        Qs = {}
        Ts = {}
        Ss = {}
        for n in names:
            # Each bone interpolates over the keys that mention it.
            ks = [k for k in keys if k[3] is None or n in k[3]]
            if not ks:
                continue
            ch = [self.pose_channels(k[1], n) for k in ks]
            q = np.zeros((F, 4))
            t = np.zeros((F, 3))
            s = np.zeros((F, 3))
            d = delay.get(n, 0)
            for f in range(F):
                x = f - d
                if clip.loop:
                    x = x % F
                else:
                    x = max(0, x)
                if clip.loop:
                    # Wrap from the last key back to the first.
                    i = 0
                    while i + 1 < len(ks) and ks[i + 1][0] <= x:
                        i += 1
                    a = ks[i]
                    ca = ch[i]
                    if i + 1 < len(ks):
                        b, cb, span = ks[i + 1], ch[i + 1], ks[i + 1][0] - a[0]
                    else:
                        b, cb, span = ks[0], ch[0], F - a[0] + ks[0][0]
                    u = (x - a[0]) / max(span, 1e-5)
                    e = ease_fn(b[2])(min(1, max(0, u)))
                else:
                    if x <= ks[0][0]:
                        ca = cb = ch[0]
                        e = 0
                    elif x >= ks[-1][0]:
                        ca = cb = ch[-1]
                        e = 0
                    else:
                        i = 0
                        while ks[i + 1][0] <= x:
                            i += 1
                        a, b = ks[i], ks[i + 1]
                        ca, cb = ch[i], ch[i + 1]
                        e = ease_fn(b[2])((x - a[0]) / (b[0] - a[0]))
                q0 = ca[0]
                q1 = cb[0] * (1 if np.dot(ca[0], cb[0]) >= 0 else -1)
                v = q0 + (q1 - q0) * e
                q[f] = v / np.linalg.norm(v)
                t[f] = ca[1] + (cb[1] - ca[1]) * e
                s[f] = ca[2] + (cb[2] - ca[2]) * e
            # The spring pass.
            sp = tune.get(n, spring_default(n))
            if sp:
                q = spring_filter(q, sp, clip.loop)
                q /= np.linalg.norm(q, axis=1, keepdims=True)
                t = spring_filter(t, sp, clip.loop)
                s = spring_filter(s, (sp[0] * 1.2, min(1.0, sp[1] * 1.2)), clip.loop)
            Qs[n] = q
            Ts[n] = t
            Ss[n] = s
        self.out.append(dict(clip=clip, q=Qs, t=Ts, s=Ss))

    def write_actions(self, arm):
        import bpy
        for pb in arm.pose.bones:
            pb.rotation_mode = 'QUATERNION'
        if not arm.animation_data:
            arm.animation_data_create()
        for rec in self.out:
            clip = rec['clip']
            old = bpy.data.actions.get(clip.name)
            if old:
                bpy.data.actions.remove(old)
            act = bpy.data.actions.new(clip.name)
            act.use_fake_user = True
            arm.animation_data.action = act
            for n, q in rec['q'].items():
                pb = arm.pose.bones[n]
                t = rec['t'][n]
                s = rec['s'][n]
                for f in range(clip.frames):
                    pb.rotation_quaternion = Quaternion(q[f])
                    pb.keyframe_insert('rotation_quaternion', frame=f, group=n)
                    # Offsets and scale are written only when they move, which is a few bones.
                    if abs(t).max() > 1e-4:
                        pb.location = self.parent_free_offset(n, t[f])
                        pb.keyframe_insert('location', frame=f, group=n)
                    if abs(s - 1).max() > 1e-4:
                        pb.scale = tuple(s[f])
                        pb.keyframe_insert('scale', frame=f, group=n)
        arm.animation_data.action = None

    def parent_free_offset(self, name, t):
        # Pose-bone location is in the bone's own rest axes.
        return self.world_q[name].inverted() @ Vector(t)

    def write(self, path):
        tracks_meta = []
        blobs = []
        for rec in self.out:
            clip = rec['clip']
            tr = []
            for n in self.names:
                if n not in rec['q']:
                    continue
                q = rec['q'][n]
                t = rec['t'][n]
                s = rec['s'][n]
                flags = 0
                still_q = np.abs(q - np.array([1, 0, 0, 0])).max() < 1e-4
                if not still_q or clip.only:
                    flags |= 1
                if np.abs(t).max() > 1e-4:
                    flags |= 2
                if np.abs(s - 1).max() > 1e-4:
                    flags |= 4
                if not flags:
                    continue
                tr.append([self.ix[n], flags, 0])
                # Full local rotation in the page's axes: conjugated by the axis swap (x, y, z) -> (x, z, -y).
                rl = self.rest_q[n]
                if flags & 1:
                    arr = np.zeros((clip.frames, 4), np.int16)
                    for f in range(clip.frames):
                        l = rl @ Quaternion(q[f])
                        v = np.array([l.x, l.z, -l.y, l.w])
                        if f and np.dot(v, arr[f - 1] / 32767) < 0:
                            v = -v
                        arr[f] = np.clip(np.round(v * 32767), -32767, 32767).astype(np.int16)
                    blobs.append(arr.tobytes())
                if flags & 2:
                    arr = np.zeros((clip.frames, 3), np.int16)
                    pq = self.parent_q[n].inverted()
                    for f in range(clip.frames):
                        off = pq @ Vector(t[f])
                        l = self.rest_t[n] + off
                        arr[f] = np.clip(np.round(np.array([l.x, l.z, -l.y]) * 4096), -32767, 32767).astype(np.int16)
                    blobs.append(arr.tobytes())
                if flags & 4:
                    arr = np.zeros((clip.frames, 3), np.int16)
                    for f in range(clip.frames):
                        sv = s[f]
                        arr[f] = np.clip(np.round(np.array([sv[0] - 1, sv[2] - 1, sv[1] - 1]) * 4096), -32767, 32767).astype(np.int16)
                    blobs.append(arr.tobytes())
            tracks_meta.append(dict(n=clip.name, f=clip.frames, loop=clip.loop, e=clip.events, tracks=tr))
        head = json.dumps(dict(fps=FPS, clips=tracks_meta), separators=(',', ':')).encode()
        # Int16 data must start on an even offset.
        head += b' ' * ((-len(head) - 4) % 4)
        with open(path, 'wb') as f:
            f.write(struct.pack('<I', len(head)))
            f.write(head)
            for b in blobs:
                f.write(b)


def spring_default(n):
    """(frequency in Hz, damping ratio) for a bone's follow-through. Lighter parts lag more and ring longer."""
    if n.startswith('crest'):
        return (3.4, 0.42)
    if n.startswith('tail'):
        return (4.2, 0.46)
    if n.startswith('pri') or n.startswith('sec') or n.startswith('ter'):
        return (7.5, 0.55)
    if n.startswith('wing_ha'):
        return (9.0, 0.6)
    if n.startswith('wing_fo'):
        return (11.0, 0.65)
    if n.startswith('wing_up'):
        return (14.0, 0.75)
    if n in ('head',):
        return (9.0, 0.58)
    if n in ('neck2',):
        return (10.0, 0.6)
    if n in ('neck1',):
        return (11.0, 0.65)
    if n in ('chest',):
        return (12.0, 0.7)
    if n.startswith('toe') or n.startswith('foot'):
        return (12.0, 0.7)
    if n.startswith('brow'):
        return (8.0, 0.5)
    if n in ('jaw', 'bill'):
        return (16.0, 0.8)
    if n.startswith('lid') or n.startswith('eye'):
        return None
    return (16.0, 0.9)


def spring_filter(x, sp, loop):
    """A semi-implicit second-order follower on every component of x (frames, comps). sp is (freq Hz, damping ratio)."""
    freq, zeta = sp
    w = 2 * math.pi * freq
    dt = 1 / FPS
    # Enough substeps to stay stable at any stiffness.
    sub = max(6, int(math.ceil(w * dt / 0.2)))
    h = dt / sub
    y = np.zeros_like(x)
    pos = x[0].copy()
    vel = np.zeros_like(pos)
    rounds = 2 if loop else 1
    for r in range(rounds):
        for f in range(len(x)):
            target = x[f]
            for _ in range(sub):
                acc = w * w * (target - pos) - 2 * zeta * w * vel
                vel = vel + acc * h
                pos = pos + vel * h
            y[f] = pos
    return y
