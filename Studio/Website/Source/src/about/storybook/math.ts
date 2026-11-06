// The little matrix kit the storybook needs. Matrices are column-major, as WebGL expects.
export type M4 = Float32Array
export type V3 = [number, number, number]

export const identity = (): M4 => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])

export function mul(a: ArrayLike<number>, b: ArrayLike<number>, o: M4 = new Float32Array(16)): M4 {
  const r = o === a || o === b ? new Float32Array(16) : o
  for (let c = 0; c < 4; c++) {
    const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3]
    r[c * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3
    r[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3
    r[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3
    r[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3
  }
  if (r !== o) o.set(r)
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

export function ortho(l: number, r: number, b: number, t: number, n: number, f: number): M4 {
  const o = new Float32Array(16)
  o[0] = 2 / (r - l)
  o[5] = 2 / (t - b)
  o[10] = -2 / (f - n)
  o[12] = -(r + l) / (r - l)
  o[13] = -(t + b) / (t - b)
  o[14] = -(f + n) / (f - n)
  o[15] = 1
  return o
}

export function lookAt(eye: ArrayLike<number>, at: ArrayLike<number>, up: ArrayLike<number>): M4 {
  const z = norm([eye[0] - at[0], eye[1] - at[1], eye[2] - at[2]])
  const x = norm(cross([up[0], up[1], up[2]], z))
  const y = cross(z, x)
  const o = new Float32Array(16)
  o[0] = x[0]; o[1] = y[0]; o[2] = z[0]
  o[4] = x[1]; o[5] = y[1]; o[6] = z[1]
  o[8] = x[2]; o[9] = y[2]; o[10] = z[2]
  o[12] = -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2])
  o[13] = -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2])
  o[14] = -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2])
  o[15] = 1
  return o
}

export const norm = (v: number[]): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}
export const cross = (a: number[], b: number[]): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
export const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

/** Transforms a point by a matrix, without the perspective divide. */
export function xf(m: ArrayLike<number>, x: number, y: number, z: number): [number, number, number, number] {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
    m[3] * x + m[7] * y + m[11] * z + m[15],
  ]
}

/** Writes a translate * rotY * rotX * rotZ * scale matrix. */
export function compose(o: M4, x: number, y: number, z: number, ry: number, rx: number, rz: number, sx: number, sy: number, sz: number) {
  const cy = Math.cos(ry), sny = Math.sin(ry), cx = Math.cos(rx), snx = Math.sin(rx), cz = Math.cos(rz), snz = Math.sin(rz)
  // R = Ry * Rx * Rz
  const r00 = cy * cz + sny * snx * snz, r01 = -cy * snz + sny * snx * cz, r02 = sny * cx
  const r10 = cx * snz, r11 = cx * cz, r12 = -snx
  const r20 = -sny * cz + cy * snx * snz, r21 = sny * snz + cy * snx * cz, r22 = cy * cx
  o[0] = r00 * sx; o[1] = r10 * sx; o[2] = r20 * sx; o[3] = 0
  o[4] = r01 * sy; o[5] = r11 * sy; o[6] = r21 * sy; o[7] = 0
  o[8] = r02 * sz; o[9] = r12 * sz; o[10] = r22 * sz; o[11] = 0
  o[12] = x; o[13] = y; o[14] = z; o[15] = 1
  return o
}

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
export const smoother = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * t * (t * (6 * t - 15) + 10)
}
export const RAD = Math.PI / 180
