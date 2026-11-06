// The little matrix kit the portal needs. Matrices are column-major, as WebGL and WebXR expect.
export type M4 = Float32Array
export type V3 = [number, number, number]

export const identity = (): M4 => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])

export function mul(a: ArrayLike<number>, b: ArrayLike<number>): M4 {
  const o = new Float32Array(16)
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[r + 4] * b[c * 4 + 1] + a[r + 8] * b[c * 4 + 2] + a[r + 12] * b[c * 4 + 3]
    }
  }
  return o
}

export function invert(m: ArrayLike<number>): M4 {
  const o = new Float32Array(16)
  const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = Array.from(m)
  const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10
  const b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12
  const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30
  const b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32
  const det = 1 / (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06)
  o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det
  o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det
  o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det
  o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det
  o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det
  o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det
  o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det
  o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det
  o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det
  o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det
  o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det
  o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det
  o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det
  o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det
  o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det
  o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det
  return o
}

export function perspective(fovY: number, aspect: number, near: number, far: number): M4 {
  const f = 1 / Math.tan(fovY / 2), o = new Float32Array(16)
  o[0] = f / aspect
  o[5] = f
  o[10] = (far + near) / (near - far)
  o[11] = -1
  o[14] = (2 * far * near) / (near - far)
  return o
}

export function translation(x: number, y: number, z: number): M4 {
  const o = identity()
  o[12] = x
  o[13] = y
  o[14] = z
  return o
}

export function rotationY(a: number): M4 {
  const c = Math.cos(a), s = Math.sin(a), o = identity()
  o[0] = c
  o[2] = -s
  o[8] = s
  o[10] = c
  return o
}

export function rotationX(a: number): M4 {
  const c = Math.cos(a), s = Math.sin(a), o = identity()
  o[5] = c
  o[6] = s
  o[9] = -s
  o[10] = c
  return o
}

export function rotationZ(a: number): M4 {
  const c = Math.cos(a), s = Math.sin(a), o = identity()
  o[0] = c
  o[1] = s
  o[4] = -s
  o[5] = c
  return o
}

export function scaling(s: number): M4 {
  const o = identity()
  o[0] = o[5] = o[10] = s
  return o
}

/** A rotation matrix from a unit quaternion [x, y, z, w]. */
export function fromQuat(q: ArrayLike<number>): M4 {
  const [x, y, z, w] = [q[0], q[1], q[2], q[3]], o = identity()
  o[0] = 1 - 2 * (y * y + z * z)
  o[1] = 2 * (x * y + z * w)
  o[2] = 2 * (x * z - y * w)
  o[4] = 2 * (x * y - z * w)
  o[5] = 1 - 2 * (x * x + z * z)
  o[6] = 2 * (y * z + x * w)
  o[8] = 2 * (x * z + y * w)
  o[9] = 2 * (y * z - x * w)
  o[10] = 1 - 2 * (x * x + y * y)
  return o
}

export const qMul = (a: number[], b: number[]) => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
]

export function qSlerp(a: number[], b: number[], t: number) {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]
  const s = d < 0 ? -1 : 1
  d = Math.abs(d)
  // Close enough that a straight blend is indistinguishable, and it can't divide by zero.
  const o = a.map((v, i) => v + (b[i] * s - v) * t)
  const l = Math.hypot(o[0], o[1], o[2], o[3]) || 1
  return o.map(v => v / l)
}

/** Where a transform sends the origin, and the direction it sends -z, which is how a camera looks. */
export const posOf = (m: ArrayLike<number>): V3 => [m[12], m[13], m[14]]
export const forwardOf = (m: ArrayLike<number>): V3 => [-m[8], -m[9], -m[10]]

export function normalize(v: number[]): V3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}
