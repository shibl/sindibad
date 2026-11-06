// Small WebGL2 helpers for the phone concept: programs, render targets, matrices. World space matches Blender: x right, y out to
// the horizon, z up, so camera keys exported from the Blender scene can be used as they are.

export type V3 = [number, number, number]
export type M4 = Float32Array

export const HEAD = `#version 300 es
precision highp float;
precision highp int;
`

export function compile(gl: WebGL2RenderingContext, vs: string, fs: string, label = 'program') {
  const shader = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) {
      throw new Error(`[phone] ${label}: ${gl.getShaderInfoLog(s)}`)
    }
    return s
  }
  const p = gl.createProgram()!
  const a = shader(gl.VERTEX_SHADER, vs)
  const b = shader(gl.FRAGMENT_SHADER, fs)
  gl.attachShader(p, a)
  gl.attachShader(p, b)
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) {
    throw new Error(`[phone] ${label}: ${gl.getProgramInfoLog(p)}`)
  }
  gl.deleteShader(a)
  gl.deleteShader(b)
  const cache = new Map<string, WebGLUniformLocation | null>()
  const u = (name: string) => {
    if (!cache.has(name)) cache.set(name, gl.getUniformLocation(p, name))
    return cache.get(name)!
  }
  return { p, u }
}
export type Prog = ReturnType<typeof compile>

export type Target = { fb: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number }

export function target(gl: WebGL2RenderingContext, w: number, h: number, opts: { internal?: number; format?: number; type?: number; filter?: number; wrap?: number; mips?: boolean } = {}): Target {
  const tex = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texImage2D(gl.TEXTURE_2D, 0, opts.internal ?? gl.RGBA8, w, h, 0, opts.format ?? gl.RGBA, opts.type ?? gl.UNSIGNED_BYTE, null)
  const f = opts.filter ?? gl.LINEAR
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, opts.mips ? gl.LINEAR_MIPMAP_LINEAR : f)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, opts.wrap ?? gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, opts.wrap ?? gl.CLAMP_TO_EDGE)
  const fb = gl.createFramebuffer()!
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  return { fb, tex, w, h }
}

export function freeTarget(gl: WebGL2RenderingContext, t: Target | null | undefined) {
  if (!t) return
  gl.deleteFramebuffer(t.fb)
  gl.deleteTexture(t.tex)
}

export function textureFrom(gl: WebGL2RenderingContext, src: TexImageSource, opts: { mips?: boolean; premultiply?: boolean; wrap?: number } = {}) {
  const tex = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, opts.premultiply ? 1 : 0)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, src)
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, opts.mips ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, opts.wrap ?? gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, opts.wrap ?? gl.CLAMP_TO_EDGE)
  if (opts.mips) gl.generateMipmap(gl.TEXTURE_2D)
  return tex
}

// ---------------------------------------------------------------------------------------------------- vectors and matrices
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
export const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1
  return [a[0] / l, a[1] / l, a[2] / l]
}
export const mix3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

export function lookAt(eye: V3, at: V3, up: V3 = [0, 0, 1]): M4 {
  const z = norm(sub(eye, at))
  const x = norm(cross(up, z))
  const y = cross(z, x)
  return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1])
}

/** Blender's camera: lens over a 36mm sensor fitted to the frame's larger side. sx, sy are the extra cover-crop scale. */
export function perspective(lens: number, aspect: number, sx: number, sy: number, near: number, far: number): M4 {
  const fit = 2 * lens / 36
  const fx = (aspect >= 1 ? fit : fit / aspect) * sx
  const fy = (aspect >= 1 ? fit * aspect : fit) * sy
  const a = (far + near) / (near - far)
  const b = (2 * far * near) / (near - far)
  return new Float32Array([fx, 0, 0, 0, 0, fy, 0, 0, 0, 0, a, -1, 0, 0, b, 0])
}

export function mul(a: M4, b: M4): M4 {
  const o = new Float32Array(16)
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let s = 0
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]
      o[c * 4 + r] = s
    }
  }
  return o
}

export function invert(m: M4): M4 {
  const r = new Float32Array(16)
  const a = m
  const b00 = a[0] * a[5] - a[1] * a[4]
  const b01 = a[0] * a[6] - a[2] * a[4]
  const b02 = a[0] * a[7] - a[3] * a[4]
  const b03 = a[1] * a[6] - a[2] * a[5]
  const b04 = a[1] * a[7] - a[3] * a[5]
  const b05 = a[2] * a[7] - a[3] * a[6]
  const b06 = a[8] * a[13] - a[9] * a[12]
  const b07 = a[8] * a[14] - a[10] * a[12]
  const b08 = a[8] * a[15] - a[11] * a[12]
  const b09 = a[9] * a[14] - a[10] * a[13]
  const b10 = a[9] * a[15] - a[11] * a[13]
  const b11 = a[10] * a[15] - a[11] * a[14]
  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06
  if (!det) return r
  det = 1 / det
  r[0] = (a[5] * b11 - a[6] * b10 + a[7] * b09) * det
  r[1] = (a[2] * b10 - a[1] * b11 - a[3] * b09) * det
  r[2] = (a[13] * b05 - a[14] * b04 + a[15] * b03) * det
  r[3] = (a[10] * b04 - a[9] * b05 - a[11] * b03) * det
  r[4] = (a[6] * b08 - a[4] * b11 - a[7] * b07) * det
  r[5] = (a[0] * b11 - a[2] * b08 + a[3] * b07) * det
  r[6] = (a[14] * b02 - a[12] * b05 - a[15] * b01) * det
  r[7] = (a[8] * b05 - a[10] * b02 + a[11] * b01) * det
  r[8] = (a[4] * b10 - a[5] * b08 + a[7] * b06) * det
  r[9] = (a[1] * b08 - a[0] * b10 - a[3] * b06) * det
  r[10] = (a[12] * b04 - a[13] * b02 + a[15] * b00) * det
  r[11] = (a[9] * b02 - a[8] * b04 - a[11] * b00) * det
  r[12] = (a[5] * b07 - a[4] * b09 - a[6] * b06) * det
  r[13] = (a[0] * b09 - a[1] * b07 + a[2] * b06) * det
  r[14] = (a[13] * b01 - a[12] * b03 - a[14] * b00) * det
  r[15] = (a[8] * b03 - a[9] * b01 + a[10] * b00) * det
  return r
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
