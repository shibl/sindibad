// The bird as a character: layers of baked clips, then the live layers on top. The head and eyes aim at a target, the lids and
// brows act, the crest and tail drag behind on springs, and two-bone IK plants the feet on whatever is under them.
import { applyClip, type Clip, parseClips, qaxis, qmul, qrot, Skeleton, type BoneInfo } from './skeleton'

export type Vec3 = [number, number, number]

const TAU = Math.PI * 2
export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
export const angleDelta = (a: number, b: number) => {
  let d = (b - a) % TAU
  if (d > Math.PI) d -= TAU
  if (d < -Math.PI) d += TAU
  return d
}

type Layer = {
  clip: Clip
  t: number
  rate: number
  w: number
  /** Where the weight is heading, and how fast (per second). */
  tw: number
  fade: number
  /** Remaps layer time to clip time, for stretching a clip's air time. */
  warp?: (t: number) => number
  autoOut?: number
}

/** A damped spring on one number. */
export class Spring {
  v = 0
  constructor(public x = 0, public freq = 3, public damp = 0.6) {}
  step(target: number, dt: number) {
    const w = TAU * this.freq
    const sub = dt > 0.018 ? 2 : 1
    const h = dt / sub
    for (let i = 0; i < sub; i++) {
      this.v += (w * w * (target - this.x) - 2 * this.damp * w * this.v) * h
      this.x += this.v * h
    }
    return this.x
  }
  kick(v: number) {
    this.v += v
  }
}

const qTmp = new Float32Array(4)
const qTmp2 = new Float32Array(4)
const vTmp = new Float32Array(3)

const qinv = (o: Float32Array, oi: number, a: ArrayLike<number>, ai: number) => {
  o[oi] = -a[ai]
  o[oi + 1] = -a[ai + 1]
  o[oi + 2] = -a[ai + 2]
  o[oi + 3] = a[ai + 3]
}

/** The shortest rotation taking unit vector a to unit vector b. */
const qbetween = (ax: number, ay: number, az: number, bx: number, by: number, bz: number): [number, number, number, number] => {
  const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx
  const w = 1 + ax * bx + ay * by + az * bz
  if (w < 1e-5) return [1, 0, 0, 0]
  const l = Math.hypot(cx, cy, cz, w)
  return [cx / l, cy / l, cz / l, w / l]
}

/** Raises a unit quaternion to the power k. */
const qpow = (q: ArrayLike<number>, k: number): [number, number, number, number] => {
  const w = clamp(q[3], -1, 1)
  const a = Math.acos(w)
  const s = Math.sin(a)
  if (s < 1e-5) return [0, 0, 0, 1]
  const n = Math.sin(a * k) / s
  return [q[0] * n, q[1] * n, q[2] * n, Math.cos(a * k)]
}

const rotv = (q: ArrayLike<number>, qi: number, x: number, y: number, z: number): Vec3 => {
  qrot(vTmp, 0, q, qi, x, y, z)
  return [vTmp[0], vTmp[1], vTmp[2]]
}

export class Bird {
  sk: Skeleton
  clips: Map<string, Clip>
  // World transform of the root, set by the director.
  pos: Vec3 = [0, 0, 0]
  yaw = 0
  pitch = 0
  roll = 0
  layers: Layer[] = []
  overlays: Layer[] = []
  idle: Clip
  idleT = Math.random() * 2
  /** World-space point the head wants to look at, or null for straight ahead. */
  lookTarget: Vec3 | null = null
  lookAmount = 0
  private lookAmountS = new Spring(0, 1.6, 1)
  private lookDir: Vec3 = [0, 0, 1]
  private lookVel: Vec3 = [0, 0, 0]
  lookFreq = 2.4
  /** Eye target, usually the same point. */
  eyeDir: Vec3 = [0, 0, 1]
  headTilt = new Spring(0, 1.1, 0.7)
  tiltTarget = 0
  // Expression.
  blink = 0
  private blinkT = -1
  private blinkDouble = false
  wide = new Spring(0, 5, 0.7)
  wideTarget = 0
  browUp = new Spring(0, 3.5, 0.6)
  browUpTarget = 0
  browFrown = new Spring(0, 3.5, 0.7)
  browFrownTarget = 0
  // Foot planting, in world space.
  plantL: Vec3 = [0.14, 0.05, 0]
  plantR: Vec3 = [-0.14, 0.05, 0]
  plantYawL = 0
  plantYawR = 0
  ikW = 1
  ikTarget = 1
  ikRate = 14
  /** 0 is folded, 1 is open. Measured from the pose, used for occlusion. */
  open = 0

  private id: Record<string, number>
  private restWorldFoot = new Float32Array(8)
  private L = { shin: 0, tarsus: 0 }
  private crest: number[] = []
  private crestDrag: Spring[] = []
  private crestPrev: Vec3[] = []
  private crestPrev2: Vec3[] = []
  private tailDragP = new Spring(0, 3.3, 0.36)
  private tailDragY = new Spring(0, 3.0, 0.38)
  private tailPrev: Vec3 = [0, 0, 0]
  private tailPrev2: Vec3 = [0, 0, 0]
  private rootRest = new Float32Array(4)
  private headLocalFwd: Vec3 = [0, 0, 1]
  private hasPrev = 0

  constructor(bones: BoneInfo[], clipBuf: ArrayBuffer) {
    this.sk = new Skeleton(bones)
    this.clips = parseClips(clipBuf, this.sk.n)
    this.idle = this.clips.get('idle')!
    const sk = this.sk
    const names = ['root', 'hips', 'chest', 'neck1', 'neck2', 'head', 'bill', 'jaw', 'tail_base', 'tail_mid', 'tail.L', 'tail.R', 'eye.L', 'eye.R', 'lid_u.L', 'lid_u.R', 'lid_l.L', 'lid_l.R', 'brow.L', 'brow.R',
      'thigh.L', 'thigh.R', 'shin.L', 'shin.R', 'tarsus.L', 'tarsus.R', 'foot.L', 'foot.R', 'toe_f.L', 'toe_f.R', 'toe_b.L', 'toe_b.R', 'wing_ha.L', 'wing_ha.R']
    this.id = Object.fromEntries(names.map(n => [n, sk.id(n)]))
    this.rootRest.set(sk.restR.subarray(this.id.root * 4, this.id.root * 4 + 4))
    sk.reset()
    sk.solveWorld()
    const dist = (a: number, b: number) => Math.hypot(sk.WT[a * 3] - sk.WT[b * 3], sk.WT[a * 3 + 1] - sk.WT[b * 3 + 1], sk.WT[a * 3 + 2] - sk.WT[b * 3 + 2])
    this.L.shin = dist(this.id['shin.L'], this.id['tarsus.L'])
    this.L.tarsus = dist(this.id['tarsus.L'], this.id['foot.L'])
    this.restWorldFoot.set(sk.WR.subarray(this.id['foot.L'] * 4, this.id['foot.L'] * 4 + 4), 0)
    this.restWorldFoot.set(sk.WR.subarray(this.id['foot.R'] * 4, this.id['foot.R'] * 4 + 4), 4)
    // The head's forward direction in its own axes: along the bill, a little down from level.
    const h = this.id.head * 4
    qinv(qTmp, 0, sk.WR, h)
    const f = Math.hypot(0, 0.24, 1)
    this.headLocalFwd = rotv(qTmp, 0, 0, -0.24 / f, 1 / f)
    for (let i = 0; i < 9; i++) {
      this.crest.push(sk.id(`crest_${i}`))
      this.crestDrag.push(new Spring(0, 2.3 + (i % 3) * 0.35, 0.3))
      this.crestPrev.push([0, 0, 0])
      this.crestPrev2.push([0, 0, 0])
    }
  }

  // ------------------------------------------------------------------------------------------------- clips
  has(name: string) {
    return this.clips.has(name)
  }

  /** Plays a full-body clip, fading out whatever else is playing. */
  play(name: string, opts: { fade?: number; rate?: number; warp?: (t: number) => number; loop?: boolean; start?: number; autoOut?: number } = {}) {
    const clip = this.clips.get(name)
    if (!clip) throw new Error(`no clip ${name}`)
    const fade = opts.fade ?? 0.1
    for (const l of this.layers) {
      l.tw = 0
      l.fade = 1 / fade
    }
    const layer: Layer = { clip, t: opts.start ?? 0, rate: opts.rate ?? 1, w: 0, tw: 1, fade: 1 / fade, warp: opts.warp, autoOut: opts.autoOut }
    this.layers.push(layer)
    return layer
  }

  /** Stops the top layer, fading back to the idle. */
  stopAll(fade = 0.2) {
    for (const l of this.layers) {
      l.tw = 0
      l.fade = 1 / fade
    }
  }

  /** A crest-only layer on top of everything. */
  overlay(name: string, fade = 0.06) {
    const clip = this.clips.get(name)!
    for (const o of this.overlays) if (o.clip === clip) o.tw = 0
    const layer: Layer = { clip, t: 0, rate: 1, w: 0, tw: 1, fade: 1 / fade, autoOut: 0.14 }
    this.overlays.push(layer)
    return layer
  }

  triggerBlink(double = false) {
    if (this.blinkT >= 0 && this.blinkT < 0.09) return
    this.blinkT = 0
    this.blinkDouble = double
  }

  // ------------------------------------------------------------------------------------------------- the frame
  update(dt: number) {
    const sk = this.sk
    this.idleT += dt
    sk.reset()
    applyClip(sk, this.idle, this.idleT, 1)
    for (const list of [this.layers, this.overlays]) {
      for (let i = 0; i < list.length; i++) {
        const l = list[i]
        l.t += dt * l.rate
        const dur = l.clip.duration
        if (!l.clip.loop && l.autoOut !== undefined && l.t >= dur - l.autoOut) l.tw = 0
        if (l.w < l.tw) l.w = Math.min(l.tw, l.w + l.fade * dt)
        else if (l.w > l.tw) l.w = Math.max(l.tw, l.w - l.fade * dt)
        applyClip(sk, l.clip, l.warp ? l.warp(l.t) : l.t, smooth(0, 1, l.w))
        if (l.w <= 0 && l.tw === 0) {
          list.splice(i, 1)
          i--
        }
      }
    }

    // Root.
    const id = this.id
    const qy = qaxis(0, 1, 0, this.yaw)
    const qp = qaxis(1, 0, 0, -this.pitch)
    const qr = qaxis(0, 0, 1, this.roll)
    qmul(qTmp, 0, qy, 0, qp, 0)
    qmul(qTmp, 0, qTmp, 0, qr, 0)
    qmul(sk.R, id.root * 4, qTmp, 0, this.rootRest, 0)
    sk.T.set(this.pos, id.root * 3)
    sk.solveWorld()

    this.aim(dt)
    this.face(dt)
    this.dragCrestAndTail(dt)
    this.plantFeet(dt)

    // How open are the wings? From the wrists' distance to the chest.
    const c = id.chest * 3
    const hl = id['wing_ha.L'] * 3
    const hr = id['wing_ha.R'] * 3
    const d = 0.5 * (Math.hypot(sk.WT[hl] - sk.WT[c], sk.WT[hl + 1] - sk.WT[c + 1], sk.WT[hl + 2] - sk.WT[c + 2]) + Math.hypot(sk.WT[hr] - sk.WT[c], sk.WT[hr + 1] - sk.WT[c + 1], sk.WT[hr + 2] - sk.WT[c + 2]))
    this.open = smooth(0.48, 0.85, d)
    sk.buildSkin()
    this.readEyes()
  }

  /** Recomputes the world pose of a bone and everything under it. Bones are stored parents first. */
  private resolve(i: number) {
    const { sk } = this
    sk.worldOf(i)
    for (let k = i + 1; k < sk.n; k++) {
      let p = sk.parent[k]
      while (p > i) p = sk.parent[p]
      if (p === i) sk.worldOf(k)
    }
  }

  /** Applies a world-space rotation to a bone, by changing its local rotation. Doesn't touch its children's world pose. */
  private rotateWorld(i: number, q: ArrayLike<number>) {
    const { sk } = this
    const p = sk.parent[i]
    // new world = q * world; local = inv(parentWorld) * new world
    qmul(qTmp, 0, q, 0, sk.WR, i * 4)
    qinv(qTmp2, 0, sk.WR, p * 4)
    qmul(sk.R, i * 4, qTmp2, 0, qTmp, 0)
    sk.worldOf(i)
  }

  // ---------------------------------------------------------------------------------------- head, neck and eyes
  private aim(dt: number) {
    const { sk, id } = this
    const head = id.head
    const [fx, fy, fz] = rotv(sk.WR, head * 4, ...this.headLocalFwd)
    const hx = sk.WT[head * 3], hy = sk.WT[head * 3 + 1] + 0.1, hz = sk.WT[head * 3 + 2]
    const wantAmount = this.lookTarget ? this.lookAmount : 0
    const amount = this.lookAmountS.step(wantAmount, dt)
    let tx = fx, ty = fy, tz = fz
    if (this.lookTarget) {
      tx = this.lookTarget[0] - hx
      ty = this.lookTarget[1] - hy
      tz = this.lookTarget[2] - hz
      const l = Math.hypot(tx, ty, tz) || 1
      tx /= l
      ty /= l
      tz /= l
      // Keep the look within what a neck can do: turn the target back toward the body's forward if it's too far around.
      const fwdx = rotv(this.rootOnly(), 0, 0, 0, 1)
      const dot = tx * fwdx[0] + tz * fwdx[2]
      const maxTurn = Math.cos(1.25)
      if (dot < maxTurn) {
        const side = tx * fwdx[2] - tz * fwdx[0]
        const s = Math.sign(side) || 1
        const a = 1.25
        const c = Math.cos(a), sn = Math.sin(a) * s
        const horiz = Math.hypot(tx, tz)
        tx = (fwdx[0] * c + fwdx[2] * sn) * horiz
        tz = (fwdx[2] * c - fwdx[0] * sn) * horiz
      }
      ty = clamp(ty, -0.62, 0.72)
      // A hoopoe is its long bill, which vanishes when the head points straight down the camera. So the head stops short of that,
      // on the side the body already faces.
      const offCamera = Math.atan2(tx, tz)
      if (tz > 0 && Math.abs(offCamera) < 0.62) {
        const side = Math.sign(fwdx[0]) || Math.sign(offCamera) || 1
        const horiz = Math.hypot(tx, tz)
        tx = Math.sin(0.62) * side * horiz
        tz = Math.cos(0.62) * horiz
      }
      const l2 = Math.hypot(tx, ty, tz) || 1
      tx /= l2
      ty /= l2
      tz /= l2
    }
    // A slightly underdamped spring, so turns overshoot and settle.
    const w = TAU * this.lookFreq
    const z = 0.72
    const ld = this.lookDir
    const lv = this.lookVel
    const sub = 2
    const h = dt / sub
    for (let i = 0; i < sub; i++) {
      for (let c = 0; c < 3; c++) {
        const target = c === 0 ? tx : c === 1 ? ty : tz
        lv[c] += (w * w * (target - ld[c]) - 2 * z * w * lv[c]) * h
        ld[c] += lv[c] * h
      }
    }
    const ll = Math.hypot(ld[0], ld[1], ld[2]) || 1
    const dx = ld[0] / ll, dy = ld[1] / ll, dz = ld[2] / ll
    const delta = qbetween(fx, fy, fz, dx, dy, dz)
    const shares: [number, number][] = [[id.chest, 0.08], [id.neck1, 0.2], [id.neck2, 0.27], [id.head, 0.45]]
    for (const [bone, share] of shares) {
      const q = qpow(delta, share * amount)
      this.rotateWorld(bone, q)
      this.resolve(bone)
    }
    // A tilt of the head, around the bill.
    const tilt = this.headTilt.step(this.tiltTarget, dt)
    if (Math.abs(tilt) > 1e-3) {
      const [ax, ay, az] = rotv(sk.WR, head * 4, ...this.headLocalFwd)
      this.rotateWorld(head, qaxis(ax, ay, az, tilt))
      this.resolve(head)
    }
    // The eyes get there first.
    for (const name of ['eye.L', 'eye.R']) {
      const e = id[name]
      const ex = sk.WT[e * 3], ey = sk.WT[e * 3 + 1], ez = sk.WT[e * 3 + 2]
      const [cx, cy, cz] = rotv(sk.WR, e * 4, 0, 0, -1) // along the bone in page axes is -z
      let ax = cx, ay = cy, az = cz
      if (this.lookTarget) {
        ax = this.lookTarget[0] - ex
        ay = this.lookTarget[1] - ey
        az = this.lookTarget[2] - ez
        const l = Math.hypot(ax, ay, az) || 1
        ax /= l
        ay /= l
        az /= l
      }
      const qd = qbetween(cx, cy, cz, ax, ay, az)
      // Limit the eye's travel inside its socket.
      const ang = 2 * Math.acos(clamp(qd[3], -1, 1))
      const lim = 0.42
      const k = ang > lim ? lim / ang : 1
      const out = qpow(qd, k * Math.min(1, amount * 1.6))
      const { eyeNow } = this
      const key = name === 'eye.L' ? 0 : 1
      const now = eyeNow[key]
      // Fast, like a saccade.
      const r = 1 - Math.exp(-dt * 38)
      for (let c = 0; c < 4; c++) now[c] += (out[c] - now[c]) * r
      const nl = Math.hypot(now[0], now[1], now[2], now[3]) || 1
      const qq = [now[0] / nl, now[1] / nl, now[2] / nl, now[3] / nl]
      this.rotateWorld(e, qq)
    }
  }
  private eyeNow: [number, number, number, number][] = [[0, 0, 0, 1], [0, 0, 0, 1]]
  private rootOnly() {
    // World rotation of the bird with its rest rotation taken out.
    const o = new Float32Array(4)
    const qy = qaxis(0, 1, 0, this.yaw)
    o.set(qy)
    return o
  }

  // ------------------------------------------------------------------------------------------------ lids and brows
  private face(dt: number) {
    const { sk, id } = this
    if (this.blinkT >= 0) {
      this.blinkT += dt
      const t = this.blinkT
      const dur = 0.13
      const one = (x: number) => (x < 0 ? 0 : x < 0.3 * dur ? x / (0.3 * dur) : x < dur ? 1 - (x - 0.3 * dur) / (0.7 * dur) : 0)
      this.blink = this.blinkDouble ? Math.max(one(t), one(t - 0.19)) : one(t)
      if (t > (this.blinkDouble ? 0.34 : 0.15)) {
        this.blinkT = -1
        this.blink = 0
      }
    }
    const wide = this.wide.step(this.wideTarget, dt)
    const up = this.browUp.step(this.browUpTarget, dt)
    const fr = this.browFrown.step(this.browFrownTarget, dt)
    const k = this.blink
    const uAng = -k * 0.86 + wide * 0.25
    const lAng = k * 0.2 - wide * 0.1
    for (const s of ['L', 'R']) {
      const u = id[`lid_u.${s}`]
      const l = id[`lid_l.${s}`]
      const qu = qaxis(1, 0, 0, uAng)
      const ql = qaxis(1, 0, 0, lAng)
      qmul(sk.R, u * 4, sk.restR, u * 4, qu, 0)
      qmul(sk.R, l * 4, sk.restR, l * 4, ql, 0)
      sk.worldOf(u)
      sk.worldOf(l)
      // The brow lifts along the head's up and tilts toward the bill when frowning.
      const b = id[`brow.${s}`]
      const lift = up * 0.038 - fr * 0.016 - k * 0.006
      const o = b * 3
      sk.T[o] = sk.restT[o]
      sk.T[o + 1] = sk.restT[o + 1] + lift
      sk.T[o + 2] = sk.restT[o + 2]
      const sgn = s === 'L' ? 1 : -1
      const qb = qaxis(0, 0, 1, sgn * fr * 0.3)
      qmul(qTmp2, 0, qb, 0, sk.restR, b * 4)
      sk.R[b * 4] = qTmp2[0]; sk.R[b * 4 + 1] = qTmp2[1]; sk.R[b * 4 + 2] = qTmp2[2]; sk.R[b * 4 + 3] = qTmp2[3]
      sk.worldOf(b)
    }
  }

  // ------------------------------------------------------------------------------------------- crest and tail on springs
  private dragCrestAndTail(dt: number) {
    const { sk } = this
    const inv = dt > 0 ? 1 / (dt * dt) : 0
    const warm = this.hasPrev >= 2
    for (let i = 0; i < this.crest.length; i++) {
      const b = this.crest[i]
      const o = b * 3
      // A point part way out along the feather.
      const [lx, ly, lz] = rotv(sk.WR, b * 4, 0, 0, -0.35)
      const px = sk.WT[o] + lx, py = sk.WT[o + 1] + ly, pz = sk.WT[o + 2] + lz
      let torque = 0
      if (warm && dt > 0.001) {
        const a0 = (px - 2 * this.crestPrev[i][0] + this.crestPrev2[i][0]) * inv
        const a1 = (py - 2 * this.crestPrev[i][1] + this.crestPrev2[i][1]) * inv
        const a2 = (pz - 2 * this.crestPrev[i][2] + this.crestPrev2[i][2]) * inv
        // The hinge is the head's side axis, and the feather lags against its own acceleration.
        const [ax, ay, az] = rotv(sk.WR, b * 4, 1, 0, 0)
        const tx = ly * -a2 - lz * -a1, ty = lz * -a0 - lx * -a2, tz = lx * -a1 - ly * -a0
        torque = clamp((tx * ax + ty * ay + tz * az) * 2.4, -200, 200)
      }
      this.crestPrev2[i] = this.crestPrev[i]
      this.crestPrev[i] = [px, py, pz]
      const s = this.crestDrag[i]
      s.v += torque * dt
      s.step(0, dt)
      const a = clamp(s.x, -0.65, 0.65)
      if (Math.abs(a) > 1e-3) {
        const q = qaxis(1, 0, 0, a)
        qmul(sk.R, b * 4, sk.R, b * 4, q, 0)
        sk.worldOf(b)
      }
    }
    // Tail: a point near the tip, driving two springs.
    const tm = this.id.tail_mid
    const o = tm * 3
    const px = sk.WT[o], py = sk.WT[o + 1], pz = sk.WT[o + 2]
    let ax = 0, ay = 0, az = 0
    if (warm && dt > 0.001) {
      ax = (px - 2 * this.tailPrev[0] + this.tailPrev2[0]) * inv
      ay = (py - 2 * this.tailPrev[1] + this.tailPrev2[1]) * inv
      az = (pz - 2 * this.tailPrev[2] + this.tailPrev2[2]) * inv
    }
    this.tailPrev2 = this.tailPrev
    this.tailPrev = [px, py, pz]
    // Express the acceleration in the root's axes.
    qinv(qTmp, 0, sk.WR, this.id.hips * 4)
    const la = rotv(qTmp, 0, ax, ay, az)
    // Local axes come from Blender's bones: along the hips is -z in page axes, across is x.
    this.tailDragP.v += clamp(-la[1] * 0.012, -60, 60) * dt * 60 * dt
    this.tailDragY.v += clamp(la[0] * 0.012, -60, 60) * dt * 60 * dt
    this.tailDragP.step(0, dt)
    this.tailDragY.step(0, dt)
    const dp = clamp(this.tailDragP.x, -0.6, 0.6)
    const dy = clamp(this.tailDragY.x, -0.6, 0.6)
    if (Math.abs(dp) + Math.abs(dy) > 1e-3) {
      for (const [bone, k] of [[this.id.tail_base, 0.45], [tm, 0.6], [this.id['tail.L'], 0.4], [this.id['tail.R'], 0.4]] as const) {
        const [sx, sy, sz] = rotv(sk.WR, this.id.hips * 4, 1, 0, 0)
        const [ux, uy, uz] = rotv(sk.WR, this.id.hips * 4, 0, 1, 0)
        const qa = qaxis(sx, sy, sz, dp * k)
        const qb = qaxis(ux, uy, uz, dy * k)
        qmul(qTmp2, 0, qa, 0, qb, 0)
        this.rotateWorld(bone, qTmp2)
        this.resolve(bone)
      }
    }
    this.hasPrev = Math.min(2, this.hasPrev + 1)
  }

  /** A kick to the crest from outside, such as the page itself being flung. */
  externalKick(a: number) {
    for (let i = 0; i < this.crestDrag.length; i++) this.crestDrag[i].v += a * (0.8 + (i % 3) * 0.2)
    this.tailDragP.v += a * 0.5
  }

  /** Forget velocity history, after the bird is moved without flying there. */
  teleported() {
    this.hasPrev = 0
    for (const s of this.crestDrag) {
      s.x = 0
      s.v = 0
    }
    this.tailDragP.x = this.tailDragP.v = 0
    this.tailDragY.x = this.tailDragY.v = 0
  }

  // ------------------------------------------------------------------------------------------------------------- feet
  /** Where a foot would rest for this yaw, relative to the root, in units. */
  footRest(side: 'L' | 'R', yaw: number): Vec3 {
    const sign = side === 'L' ? 1 : -1
    const fx = 0.14 * sign
    const fz = 0.015
    const c = Math.cos(yaw), s = Math.sin(yaw)
    return [fx * c + fz * s, 0.05, -fx * s + fz * c]
  }

  private plantFeet(dt: number) {
    if (this.ikW < this.ikTarget) this.ikW = Math.min(this.ikTarget, this.ikW + this.ikRate * dt)
    else if (this.ikW > this.ikTarget) this.ikW = Math.max(this.ikTarget, this.ikW - this.ikRate * dt)
    const w = smooth(0, 1, this.ikW)
    if (w <= 0.001) return
    this.leg('L', this.plantL, this.plantYawL, w)
    this.leg('R', this.plantR, this.plantYawR, w)
  }

  private leg(side: 'L' | 'R', target: Vec3, plantYaw: number, w: number) {
    const { sk, id } = this
    const shin = id[`shin.${side}`], tars = id[`tarsus.${side}`], foot = id[`foot.${side}`]
    const kx = sk.WT[shin * 3], ky = sk.WT[shin * 3 + 1], kz = sk.WT[shin * 3 + 2]
    const fbx = sk.WT[foot * 3], fby = sk.WT[foot * 3 + 1], fbz = sk.WT[foot * 3 + 2]
    const tx = lerp(fbx, target[0], w), ty = lerp(fby, target[1], w), tz = lerp(fbz, target[2], w)
    let dx = tx - kx, dy = ty - ky, dz = tz - kz
    const L1 = this.L.shin, L2 = this.L.tarsus
    const dist0 = Math.hypot(dx, dy, dz) || 1e-4
    const dist = clamp(dist0, Math.abs(L1 - L2) + 0.01, L1 + L2 - 0.002)
    dx /= dist0
    dy /= dist0
    dz /= dist0
    // The ankle points backward.
    const [fx, , fz] = rotv(this.rootOnly(), 0, 0, 0, 1)
    let px = -fx, py = 0, pz = -fz
    const pd = px * dx + py * dy + pz * dz
    px -= dx * pd
    py -= dy * pd
    pz -= dz * pd
    const pl = Math.hypot(px, py, pz) || 1
    px /= pl
    py /= pl
    pz /= pl
    const a = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist)
    const h = Math.sqrt(Math.max(0, L1 * L1 - a * a))
    const ax = kx + dx * a + px * h, ay = ky + dy * a + py * h, az = kz + dz * a + pz * h
    // Point the shin at the new ankle.
    {
      const cx = sk.WT[tars * 3] - kx, cy = sk.WT[tars * 3 + 1] - ky, cz = sk.WT[tars * 3 + 2] - kz
      const cl = Math.hypot(cx, cy, cz) || 1
      const nx = ax - kx, ny = ay - ky, nz = az - kz
      const nl = Math.hypot(nx, ny, nz) || 1
      const q = qbetween(cx / cl, cy / cl, cz / cl, nx / nl, ny / nl, nz / nl)
      this.rotateWorld(shin, q)
      this.resolve(shin)
    }
    // Point the tarsus at the target.
    {
      const bx = sk.WT[tars * 3], by = sk.WT[tars * 3 + 1], bz = sk.WT[tars * 3 + 2]
      const cx = sk.WT[foot * 3] - bx, cy = sk.WT[foot * 3 + 1] - by, cz = sk.WT[foot * 3 + 2] - bz
      const cl = Math.hypot(cx, cy, cz) || 1
      const nx = kx + dx * dist - bx, ny = ky + dy * dist - by, nz = kz + dz * dist - bz
      const nl = Math.hypot(nx, ny, nz) || 1
      const q = qbetween(cx / cl, cy / cl, cz / cl, nx / nl, ny / nl, nz / nl)
      this.rotateWorld(tars, q)
      this.resolve(tars)
    }
    // Keep the foot flat on what it's standing on.
    {
      const offset = side === 'L' ? 0 : 4
      const qy = qaxis(0, 1, 0, plantYaw)
      qmul(qTmp, 0, qy, 0, this.restWorldFoot, offset)
      // Blend from the clip's foot rotation by w.
      const cur = sk.WR
      const fi = foot * 4
      let dot = 0
      for (let c = 0; c < 4; c++) dot += cur[fi + c] * qTmp[c]
      const sgn = dot < 0 ? -1 : 1
      let x = lerp(cur[fi], qTmp[0] * sgn, w), y = lerp(cur[fi + 1], qTmp[1] * sgn, w), z = lerp(cur[fi + 2], qTmp[2] * sgn, w), q = lerp(cur[fi + 3], qTmp[3] * sgn, w)
      const l = Math.hypot(x, y, z, q) || 1
      x /= l
      y /= l
      z /= l
      q /= l
      qinv(qTmp2, 0, sk.WR, tars * 4)
      const world = [x, y, z, q]
      qmul(sk.R, fi, qTmp2, 0, world, 0)
      this.resolve(foot)
    }
  }

  /** Eye centres then gaze directions, for the renderer. */
  eyes = new Float32Array(12)
  private readEyes() {
    const { sk, id } = this
    ;['eye.L', 'eye.R'].forEach((n, i) => {
      const e = id[n]
      this.eyes[i * 3] = sk.WT[e * 3]
      this.eyes[i * 3 + 1] = sk.WT[e * 3 + 1]
      this.eyes[i * 3 + 2] = sk.WT[e * 3 + 2]
      const a = rotv(sk.WR, e * 4, 0, 0, -1)
      this.eyes[6 + i * 3] = a[0]
      this.eyes[6 + i * 3 + 1] = a[1]
      this.eyes[6 + i * 3 + 2] = a[2]
    })
  }

  /** World position of the tip of the bill. */
  billTip(): Vec3 {
    const { sk, id } = this
    const b = id.bill
    const [x, y, z] = rotv(sk.WR, b * 4, 0, -0.1, -0.78)
    return [sk.WT[b * 3] + x, sk.WT[b * 3 + 1] + y, sk.WT[b * 3 + 2] + z]
  }

  bonePos(name: string): Vec3 {
    const i = this.sk.id(name) * 3
    return [this.sk.WT[i], this.sk.WT[i + 1], this.sk.WT[i + 2]]
  }
}
