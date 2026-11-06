// The bird's skeleton at runtime: rest pose, baked clips, and the pose that the renderer skins with.
// Scale doesn't pass down the chain (Blender's "inherit scale: none"), so squash on the body can't shear the head or wings.

export type BoneInfo = { n: string; p: number; t: number[]; r: number[] }
export type MeshHeader = { v: number; i: number; scale: number; bones: BoneInfo[] }

type Track = { bone: number; r?: Int16Array; t?: Int16Array; s?: Int16Array }
export type Clip = { name: string; frames: number; loop: boolean; fps: number; tracks: Track[]; duration: number; mask: Uint8Array; events: Record<string, number> }

export const qmul = (o: Float32Array, oi: number, a: ArrayLike<number>, ai: number, b: ArrayLike<number>, bi: number) => {
  const ax = a[ai], ay = a[ai + 1], az = a[ai + 2], aw = a[ai + 3]
  const bx = b[bi], by = b[bi + 1], bz = b[bi + 2], bw = b[bi + 3]
  o[oi] = aw * bx + ax * bw + ay * bz - az * by
  o[oi + 1] = aw * by - ax * bz + ay * bw + az * bx
  o[oi + 2] = aw * bz + ax * by - ay * bx + az * bw
  o[oi + 3] = aw * bw - ax * bx - ay * by - az * bz
}

export const qrot = (o: Float32Array, oi: number, q: ArrayLike<number>, qi: number, x: number, y: number, z: number) => {
  const qx = q[qi], qy = q[qi + 1], qz = q[qi + 2], qw = q[qi + 3]
  const tx = 2 * (qy * z - qz * y), ty = 2 * (qz * x - qx * z), tz = 2 * (qx * y - qy * x)
  o[oi] = x + qw * tx + qy * tz - qz * ty
  o[oi + 1] = y + qw * ty + qz * tx - qx * tz
  o[oi + 2] = z + qw * tz + qx * ty - qy * tx
}

/** A quaternion from an axis (need not be unit) and an angle in radians, as [x, y, z, w]. */
export const qaxis = (x: number, y: number, z: number, a: number): [number, number, number, number] => {
  const l = Math.hypot(x, y, z) || 1
  const s = Math.sin(a / 2) / l
  return [x * s, y * s, z * s, Math.cos(a / 2)]
}

export class Skeleton {
  n: number
  names: Map<string, number>
  parent: Int16Array
  restT: Float32Array
  restR: Float32Array
  T: Float32Array
  R: Float32Array
  S: Float32Array
  /** World rotation and position of each bone, rigid. */
  WR: Float32Array
  WT: Float32Array
  skin: Float32Array
  private inv: Float32Array
  private tmpQ = new Float32Array(4)
  private tmpV = new Float32Array(3)

  constructor(bones: BoneInfo[]) {
    const n = (this.n = bones.length)
    this.names = new Map(bones.map((b, i) => [b.n, i]))
    this.parent = Int16Array.from(bones.map(b => b.p))
    this.restT = new Float32Array(n * 3)
    this.restR = new Float32Array(n * 4)
    bones.forEach((b, i) => {
      this.restT.set(b.t, i * 3)
      this.restR.set(b.r, i * 4)
    })
    this.T = this.restT.slice()
    this.R = this.restR.slice()
    this.S = new Float32Array(n * 3).fill(1)
    this.WR = new Float32Array(n * 4)
    this.WT = new Float32Array(n * 3)
    this.skin = new Float32Array(n * 12)
    this.inv = new Float32Array(n * 12)
    this.reset()
    this.solveWorld()
    // Inverse of the rest world transform, as rows of a 3x4.
    for (let i = 0; i < n; i++) {
      const x = this.WR[i * 4], y = this.WR[i * 4 + 1], z = this.WR[i * 4 + 2], w = this.WR[i * 4 + 3]
      const m = [1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y)]
      const tx = this.WT[i * 3], ty = this.WT[i * 3 + 1], tz = this.WT[i * 3 + 2]
      const o = i * 12
      this.inv[o] = m[0]; this.inv[o + 1] = m[1]; this.inv[o + 2] = m[2]; this.inv[o + 3] = -(m[0] * tx + m[1] * ty + m[2] * tz)
      this.inv[o + 4] = m[3]; this.inv[o + 5] = m[4]; this.inv[o + 6] = m[5]; this.inv[o + 7] = -(m[3] * tx + m[4] * ty + m[5] * tz)
      this.inv[o + 8] = m[6]; this.inv[o + 9] = m[7]; this.inv[o + 10] = m[8]; this.inv[o + 11] = -(m[6] * tx + m[7] * ty + m[8] * tz)
    }
  }

  id(name: string) {
    const i = this.names.get(name)
    if (i === undefined) throw new Error(`no bone ${name}`)
    return i
  }

  reset() {
    this.T.set(this.restT)
    this.R.set(this.restR)
    this.S.fill(1)
  }

  /** Recomputes world rotation and position for bone i from its parent. */
  worldOf(i: number) {
    const p = this.parent[i]
    if (p < 0) {
      this.WR[i * 4] = this.R[i * 4]; this.WR[i * 4 + 1] = this.R[i * 4 + 1]; this.WR[i * 4 + 2] = this.R[i * 4 + 2]; this.WR[i * 4 + 3] = this.R[i * 4 + 3]
      this.WT[i * 3] = this.T[i * 3]; this.WT[i * 3 + 1] = this.T[i * 3 + 1]; this.WT[i * 3 + 2] = this.T[i * 3 + 2]
      return
    }
    qmul(this.WR, i * 4, this.WR, p * 4, this.R, i * 4)
    qrot(this.tmpV, 0, this.WR, p * 4, this.T[i * 3], this.T[i * 3 + 1], this.T[i * 3 + 2])
    this.WT[i * 3] = this.WT[p * 3] + this.tmpV[0]
    this.WT[i * 3 + 1] = this.WT[p * 3 + 1] + this.tmpV[1]
    this.WT[i * 3 + 2] = this.WT[p * 3 + 2] + this.tmpV[2]
  }

  solveWorld() {
    for (let i = 0; i < this.n; i++) this.worldOf(i)
  }

  /** Fills the skinning matrices from the world pose. */
  buildSkin() {
    const { WR, WT, S, inv, skin } = this
    for (let i = 0; i < this.n; i++) {
      const x = WR[i * 4], y = WR[i * 4 + 1], z = WR[i * 4 + 2], w = WR[i * 4 + 3]
      const sx = S[i * 3], sy = S[i * 3 + 1], sz = S[i * 3 + 2]
      // World rotation times local scale, as rows.
      const a0 = (1 - 2 * (y * y + z * z)) * sx, a1 = 2 * (x * y - z * w) * sy, a2 = 2 * (x * z + y * w) * sz
      const b0 = 2 * (x * y + z * w) * sx, b1 = (1 - 2 * (x * x + z * z)) * sy, b2 = 2 * (y * z - x * w) * sz
      const c0 = 2 * (x * z - y * w) * sx, c1 = 2 * (y * z + x * w) * sy, c2 = (1 - 2 * (x * x + y * y)) * sz
      const o = i * 12
      const m0 = inv[o], m1 = inv[o + 1], m2 = inv[o + 2], m3 = inv[o + 3]
      const m4 = inv[o + 4], m5 = inv[o + 5], m6 = inv[o + 6], m7 = inv[o + 7]
      const m8 = inv[o + 8], m9 = inv[o + 9], m10 = inv[o + 10], m11 = inv[o + 11]
      skin[o] = a0 * m0 + a1 * m4 + a2 * m8
      skin[o + 1] = a0 * m1 + a1 * m5 + a2 * m9
      skin[o + 2] = a0 * m2 + a1 * m6 + a2 * m10
      skin[o + 3] = a0 * m3 + a1 * m7 + a2 * m11 + WT[i * 3]
      skin[o + 4] = b0 * m0 + b1 * m4 + b2 * m8
      skin[o + 5] = b0 * m1 + b1 * m5 + b2 * m9
      skin[o + 6] = b0 * m2 + b1 * m6 + b2 * m10
      skin[o + 7] = b0 * m3 + b1 * m7 + b2 * m11 + WT[i * 3 + 1]
      skin[o + 8] = c0 * m0 + c1 * m4 + c2 * m8
      skin[o + 9] = c0 * m1 + c1 * m5 + c2 * m9
      skin[o + 10] = c0 * m2 + c1 * m6 + c2 * m10
      skin[o + 11] = c0 * m3 + c1 * m7 + c2 * m11 + WT[i * 3 + 2]
    }
  }
}

const Q = 1 / 32767
const POS = 1 / 4096

/** Blends a clip at time t (seconds) into the skeleton's local pose with weight w, only on the bones the clip animates. */
export function applyClip(sk: Skeleton, clip: Clip, t: number, w: number) {
  if (w <= 0.0005) return
  let f = t * clip.fps
  const last = clip.frames - 1
  if (clip.loop) {
    f = ((f % clip.frames) + clip.frames) % clip.frames
  } else {
    f = Math.max(0, Math.min(last, f))
  }
  const f0 = Math.floor(f)
  const k = f - f0
  const f1 = clip.loop ? (f0 + 1) % clip.frames : Math.min(last, f0 + 1)
  for (const tr of clip.tracks) {
    const b = tr.bone
    if (tr.r) {
      const r = tr.r
      const i0 = f0 * 4, i1 = f1 * 4
      let bx = r[i1], by = r[i1 + 1], bz = r[i1 + 2], bw = r[i1 + 3]
      const ax = r[i0], ay = r[i0 + 1], az = r[i0 + 2], aw = r[i0 + 3]
      if (ax * bx + ay * by + az * bz + aw * bw < 0) {
        bx = -bx; by = -by; bz = -bz; bw = -bw
      }
      let x = (ax + (bx - ax) * k) * Q, y = (ay + (by - ay) * k) * Q, z = (az + (bz - az) * k) * Q, q = (aw + (bw - aw) * k) * Q
      const R = sk.R
      const o = b * 4
      if (w < 0.999) {
        const cx = R[o], cy = R[o + 1], cz = R[o + 2], cw = R[o + 3]
        if (cx * x + cy * y + cz * z + cw * q < 0) {
          x = -x; y = -y; z = -z; q = -q
        }
        x = cx + (x - cx) * w; y = cy + (y - cy) * w; z = cz + (z - cz) * w; q = cw + (q - cw) * w
      }
      const l = 1 / Math.hypot(x, y, z, q)
      R[o] = x * l; R[o + 1] = y * l; R[o + 2] = z * l; R[o + 3] = q * l
    }
    if (tr.t) {
      const d = tr.t
      const i0 = f0 * 3, i1 = f1 * 3, o = b * 3
      for (let c = 0; c < 3; c++) {
        const v = (d[i0 + c] + (d[i1 + c] - d[i0 + c]) * k) * POS
        sk.T[o + c] += (v - sk.T[o + c]) * w
      }
    }
    if (tr.s) {
      const d = tr.s
      const i0 = f0 * 3, i1 = f1 * 3, o = b * 3
      for (let c = 0; c < 3; c++) {
        const v = 1 + (d[i0 + c] + (d[i1 + c] - d[i0 + c]) * k) * POS
        sk.S[o + c] += (v - sk.S[o + c]) * w
      }
    }
  }
}

/** Parses hoopoe-clips.bin. */
export function parseClips(buf: ArrayBuffer, boneCount: number): Map<string, Clip> {
  const headLen = new DataView(buf).getUint32(0, true)
  const head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, headLen))) as {
    fps: number
    clips: { n: string; f: number; loop: boolean; e?: Record<string, number>; tracks: [number, number, number][] }[]
  }
  const start = 4 + headLen
  const out = new Map<string, Clip>()
  let off = start
  for (const c of head.clips) {
    const tracks: Track[] = []
    const mask = new Uint8Array(boneCount)
    for (const [bone, flags] of c.tracks) {
      const tr: Track = { bone }
      mask[bone] = 1
      if (flags & 1) {
        tr.r = new Int16Array(buf, off, c.f * 4)
        off += c.f * 8
      }
      if (flags & 2) {
        tr.t = new Int16Array(buf, off, c.f * 3)
        off += c.f * 6
      }
      if (flags & 4) {
        tr.s = new Int16Array(buf, off, c.f * 3)
        off += c.f * 6
      }
      tracks.push(tr)
    }
    out.set(c.n, { name: c.n, frames: c.f, loop: c.loop, fps: head.fps, tracks, duration: (c.loop ? c.f : c.f - 1) / head.fps, mask, events: c.e ?? {} })
  }
  return out
}

/** Parses hoopoe-mesh.bin. */
export function parseMesh(buf: ArrayBuffer) {
  const headLen = new DataView(buf).getUint32(0, true)
  const head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, headLen))) as MeshHeader
  const vStart = 4 + headLen
  const verts = new Uint8Array(buf, vStart, head.v * 28)
  const idx = new Uint16Array(buf, vStart + head.v * 28, head.i)
  return { head, verts, idx }
}
