// The real-time renderer: a skinned mesh on a small transparent canvas that travels with the bird, a stylised film-like shading,
// a shadow map for the bird on itself, and a soft shadow on the page behind it.
import { parseMesh } from './skeleton'

const VS = `#version 300 es
layout(location=0) in vec3 a_p;
layout(location=1) in vec2 a_ka;
layout(location=2) in vec3 a_n;
layout(location=3) in float a_af;
layout(location=4) in vec2 a_uv;
layout(location=5) in vec3 a_c;
layout(location=6) in vec4 a_j;
layout(location=7) in vec4 a_w;
uniform vec4 u_b[192];
uniform float u_ps, u_open;
uniform mat4 u_vp, u_lvp;
out vec3 v_n, v_p, v_c;
out vec2 v_uv;
out float v_ao;
flat out int v_k;
out vec4 v_l;
vec3 sRGB(vec3 c){ return mix(c/12.92, pow((c+.055)/1.055, vec3(2.4)), step(.04045,c)); }
void main(){
  vec3 p = a_p * u_ps;
  ivec4 j = ivec4(a_j);
  vec4 r0 = u_b[j.x*3]*a_w.x + u_b[j.y*3]*a_w.y + u_b[j.z*3]*a_w.z + u_b[j.w*3]*a_w.w;
  vec4 r1 = u_b[j.x*3+1]*a_w.x + u_b[j.y*3+1]*a_w.y + u_b[j.z*3+1]*a_w.z + u_b[j.w*3+1]*a_w.w;
  vec4 r2 = u_b[j.x*3+2]*a_w.x + u_b[j.y*3+2]*a_w.y + u_b[j.z*3+2]*a_w.z + u_b[j.w*3+2]*a_w.w;
  vec4 h = vec4(p,1.);
  vec3 w = vec3(dot(r0,h), dot(r1,h), dot(r2,h));
  v_p = w;
  v_n = vec3(dot(r0.xyz,a_n), dot(r1.xyz,a_n), dot(r2.xyz,a_n));
  v_uv = a_uv;
  v_c = sRGB(a_c);
  v_k = int(a_ka.x + .5);
  v_ao = mix(a_af, a_ka.y/255., u_open);
  v_l = u_lvp * vec4(w,1.);
  gl_Position = u_vp * vec4(w,1.);
}`

const FS = `#version 300 es
precision highp float;
precision highp sampler2DShadow;
in vec3 v_n, v_p, v_c;
in vec2 v_uv;
in float v_ao;
flat in int v_k;
in vec4 v_l;
uniform sampler2D u_tex;
uniform sampler2DShadow u_sm;
uniform vec3 u_cam;
uniform float u_shadowOn;
uniform vec3 u_eyeC[2];
uniform vec3 u_eyeA[2];
out vec4 o;
const vec3 KEY = normalize(vec3(-.52,.74,.50));
const vec3 RIM = normalize(vec3(.72,.34,-.60));
vec3 sRGB(vec3 c){ return mix(c/12.92, pow((c+.055)/1.055, vec3(2.4)), step(.04045,c)); }
float shadow(){
  vec3 q = v_l.xyz/v_l.w*.5+.5;
  if (u_shadowOn < .5 || q.x<0.||q.x>1.||q.y<0.||q.y>1.) return 1.;
  float s = 0.;
  const float t = 1./512.;
  for (int y=-1;y<=1;y++) for (int x=-1;x<=1;x++) s += texture(u_sm, vec3(q.xy+vec2(x,y)*t*1.3, q.z-.0035));
  return s/9.;
}
void main(){
  vec3 N = normalize(v_n);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(u_cam - v_p);
  vec3 tex = texture(u_tex, v_uv).rgb;
  vec3 albedo = sRGB(tex) * v_c;
  // The bake is local occlusion. Remap it, and let it go warm rather than grey, the way light bounces between feathers.
  float ao = smoothstep(.02, .78, clamp(v_ao, 0., 1.));
  vec3 aoTint = mix(vec3(.46,.30,.30), vec3(1.), ao);
  float ndl = dot(N, KEY);
  float sh = shadow();
  float wrapk = (v_k==3) ? .1 : .36;
  float dif = smoothstep(-wrapk, 1.-wrapk*.3, ndl);
  dif *= mix(.34, 1., sh);
  float nv = max(dot(N,V),0.);
  float hemi = .5 + .5*N.y;
  // Sky from above; the page bouncing warm white light from below.
  vec3 amb = mix(vec3(.44,.40,.38), vec3(.46,.52,.56), hemi);
  amb *= aoTint;
  vec3 keyc = vec3(1.12,1.05,.95);
  // Light bleeding through the terminator, the look of feathers and skin.
  float term = exp(-pow((ndl-.04)/.26, 2.)) * sh;
  vec3 c = albedo * (amb + keyc*dif*mix(.75,1.,ao));
  c += albedo * vec3(.5,.18,.06) * term * .3 * ao;
  // Rim.
  float fres = pow(1.-nv, 3.2);
  float rimL = smoothstep(-.3,.75, dot(N,RIM));
  vec3 rimc = mix(albedo*2.2, vec3(1.), .28);
  c += rimc * fres * rimL * .52 * mix(.5,1.,ao);
  // Black feathers keep their form with a cool sheen at grazing angles.
  float lum = dot(albedo, vec3(.3,.6,.1));
  c += vec3(.17,.22,.3) * pow(1.-nv, 2.2) * (1.-smoothstep(.02,.25,lum)) * mix(.4,1.,ao);
  // A soft top sheen on the feathers.
  vec3 H = normalize(KEY+V);
  float nh = max(dot(N,H),0.);
  if (v_k==1 || v_k==0) {
    c += vec3(1.,.95,.88) * pow(nh, 18.) * .08 * sh * ao;
  } else if (v_k==2) {
    c += vec3(1.) * (pow(nh, 46.)*.5 + pow(nh,8.)*.05) * sh;
    c += vec3(.6,.7,.8)*fres*.18;
  } else if (v_k==4) {
    c += vec3(1.) * pow(nh, 22.) * .16 * sh;
  } else if (v_k==3) {
    // A wet eye. Catchlights are placed relative to where this eye is looking and where the camera is, so they stay in the aperture.
    int e = distance(v_p, u_eyeC[0]) < distance(v_p, u_eyeC[1]) ? 0 : 1;
    vec3 A = normalize(u_eyeA[e]);
    vec3 mid = normalize(A*.5 + V*.5);
    vec3 X = normalize(cross(vec3(0.,1.,0.), mid));
    vec3 Y = cross(mid, X);
    float s1 = smoothstep(.9925, .9965, dot(N, normalize(mid - X*.2 + Y*.27)));
    float s1b = smoothstep(.9975, .9985, dot(N, normalize(mid + X*.2 + Y*.13)));
    float glow = pow(max(dot(N, normalize(mid + X*.3 - Y*.34)), 0.), 7.);
    // Light passing through the cornea lifts the far side of the iris.
    c += albedo * vec3(1.15,.95,.7) * glow * 1.3;
    c = mix(c, vec3(1.), s1);
    c = mix(c, vec3(1.), s1b*.75);
    c += vec3(.5,.6,.7) * fres * .35;
  } else if (v_k==5) {
    c += vec3(1.,.9,.8) * pow(nh, 30.) * .1 * sh;
  }
  // Filmic shoulder that leaves mid-tones alone, then back to sRGB.
  c = c / (1. + .18*c*c);
  c = mix(12.92*c, 1.055*pow(max(c,vec3(0.)), vec3(1./2.4))-.055, step(.0031308,c));
  o = vec4(c, 1.);
}`

const DEPTH_VS = `#version 300 es
layout(location=0) in vec3 a_p;
layout(location=6) in vec4 a_j;
layout(location=7) in vec4 a_w;
uniform vec4 u_b[192];
uniform float u_ps;
uniform mat4 u_vp;
void main(){
  vec3 p = a_p*u_ps;
  ivec4 j = ivec4(a_j);
  vec4 r0 = u_b[j.x*3]*a_w.x + u_b[j.y*3]*a_w.y + u_b[j.z*3]*a_w.z + u_b[j.w*3]*a_w.w;
  vec4 r1 = u_b[j.x*3+1]*a_w.x + u_b[j.y*3+1]*a_w.y + u_b[j.z*3+1]*a_w.z + u_b[j.w*3+1]*a_w.w;
  vec4 r2 = u_b[j.x*3+2]*a_w.x + u_b[j.y*3+2]*a_w.y + u_b[j.z*3+2]*a_w.z + u_b[j.w*3+2]*a_w.w;
  vec4 h = vec4(p,1.);
  gl_Position = u_vp*vec4(dot(r0,h),dot(r1,h),dot(r2,h),1.);
}`
const DEPTH_FS = `#version 300 es
precision mediump float;
out vec4 o;
void main(){ o = vec4(1.); }`

const QUAD_VS = `#version 300 es
out vec2 v;
void main(){ vec2 p = vec2((gl_VertexID<<1)&2, gl_VertexID&2); v = p; gl_Position = vec4(p*2.-1.,0.,1.); }`
const BLUR_FS = `#version 300 es
precision mediump float;
in vec2 v;
uniform sampler2D u_t;
uniform vec2 u_d;
out vec4 o;
void main(){
  float s = texture(u_t,v).r*.2270;
  s += (texture(u_t,v+u_d*1.3846).r + texture(u_t,v-u_d*1.3846).r)*.3162;
  s += (texture(u_t,v+u_d*3.2308).r + texture(u_t,v-u_d*3.2308).r)*.0703;
  o = vec4(s);
}`
const SHADOW_FS = `#version 300 es
precision mediump float;
in vec2 v;
uniform sampler2D u_t;
uniform vec4 u_offs; // offset of the far shadow, and of the near
uniform vec2 u_a;
uniform vec3 u_blob[3]; // foot contact blobs: x, y in 0-1 uv, radius
uniform float u_blobA, u_aspect;
uniform vec3 u_col;
out vec4 o;
void main(){
  float s = texture(u_t, v-u_offs.xy).r * u_a.x;
  float c = 0.;
  for (int i=0;i<3;i++){
    vec2 d = (v-u_blob[i].xy)/vec2(u_blob[i].z, u_blob[i].z*.42);
    c = max(c, exp(-dot(d,d)*2.2));
  }
  float a = 1.-(1.-s)*(1.-c*u_blobA);
  o = vec4(u_col*a, a);
}`

const compile = (gl: WebGL2RenderingContext, vs: string, fs: string) => {
  const mk = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`[hoopoe] shader: ${gl.getShaderInfoLog(s)}`)
    return s
  }
  const p = gl.createProgram()!
  const a = mk(gl.VERTEX_SHADER, vs)
  const b = mk(gl.FRAGMENT_SHADER, fs)
  gl.attachShader(p, a)
  gl.attachShader(p, b)
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`[hoopoe] link: ${gl.getProgramInfoLog(p)}`)
  gl.deleteShader(a)
  gl.deleteShader(b)
  return p
}

export type M4 = Float32Array

export const perspective = (fy: number, aspect: number, near: number, far: number): M4 => {
  const f = fy
  return Float32Array.from([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, (2 * far * near) / (near - far), 0])
}
export const mul4 = (a: M4, b: M4): M4 => {
  const o = new Float32Array(16)
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[r + 4] * b[c * 4 + 1] + a[r + 8] * b[c * 4 + 2] + a[r + 12] * b[c * 4 + 3]
  return o
}
export const lookAt = (eye: number[], at: number[], up: number[]): M4 => {
  let zx = eye[0] - at[0], zy = eye[1] - at[1], zz = eye[2] - at[2]
  let l = Math.hypot(zx, zy, zz)
  zx /= l; zy /= l; zz /= l
  let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx
  l = Math.hypot(xx, xy, xz)
  xx /= l; xy /= l; xz /= l
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx
  return Float32Array.from([xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0, -(xx * eye[0] + xy * eye[1] + xz * eye[2]), -(yx * eye[0] + yy * eye[1] + yz * eye[2]), -(zx * eye[0] + zy * eye[1] + zz * eye[2]), 1])
}
export const ortho = (l: number, r: number, b: number, t: number, n: number, f: number): M4 =>
  Float32Array.from([2 / (r - l), 0, 0, 0, 0, 2 / (t - b), 0, 0, 0, 0, -2 / (f - n), 0, -(r + l) / (r - l), -(t + b) / (t - b), -(f + n) / (f - n), 1])

const SM = 512
const SHADOW_RT = 192

export type Frame = {
  /** Skinning matrices, 12 floats per bone. */
  skin: Float32Array
  /** 0 folded, 1 open: blends the two occlusion bakes. */
  open: number
  /** World units per CSS pixel is 1 / scale. */
  scale: number
  /** The bird's world centre, used to fit the shadow map and the camera. */
  center: [number, number, number]
  /** Soft shadow on the page. */
  shadow: { offset: [number, number]; alpha: number; blur: number; blobs: [number, number, number][]; blobAlpha: number }
  /** Each eye's centre and gaze, for its catchlights. */
  eyes: Float32Array
}

export type Renderer = ReturnType<typeof createRenderer>

export function createRenderer(canvas: HTMLCanvasElement, cssSizeStart: number, pr: number, meshBuf: ArrayBuffer, atlas: ImageBitmap | HTMLImageElement) {
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: true, depth: true, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: false })
  if (!gl) throw new Error('no webgl2')
  let cssSize = cssSizeStart
  const { head, verts, idx } = parseMesh(meshBuf)
  let size = Math.round(cssSize * pr)
  canvas.width = size
  canvas.height = size
  canvas.style.width = canvas.style.height = `${cssSize}px`

  const prog = compile(gl, VS, FS)
  const depthProg = compile(gl, DEPTH_VS, DEPTH_FS)
  const blurProg = compile(gl, QUAD_VS, BLUR_FS)
  const shadowProg = compile(gl, QUAD_VS, SHADOW_FS)
  const u = (p: WebGLProgram, n: string) => gl.getUniformLocation(p, n)
  const U = {
    b: u(prog, 'u_b[0]'), ps: u(prog, 'u_ps'), open: u(prog, 'u_open'), vp: u(prog, 'u_vp'), lvp: u(prog, 'u_lvp'), tex: u(prog, 'u_tex'), sm: u(prog, 'u_sm'), cam: u(prog, 'u_cam'), shadowOn: u(prog, 'u_shadowOn'), eyeC: u(prog, 'u_eyeC[0]'), eyeA: u(prog, 'u_eyeA[0]'),
    db: u(depthProg, 'u_b[0]'), dps: u(depthProg, 'u_ps'), dvp: u(depthProg, 'u_vp'),
    bt: u(blurProg, 'u_t'), bd: u(blurProg, 'u_d'),
    st: u(shadowProg, 'u_t'), so: u(shadowProg, 'u_offs'), sa: u(shadowProg, 'u_a'), sb: u(shadowProg, 'u_blob[0]'), sba: u(shadowProg, 'u_blobA'), sc: u(shadowProg, 'u_col'),
  }

  const vao = gl.createVertexArray()!
  gl.bindVertexArray(vao)
  const vb = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, vb)
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW)
  const ib = gl.createBuffer()!
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW)
  const S = 28
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.SHORT, false, S, 0)
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.UNSIGNED_BYTE, false, S, 6)
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 3, gl.BYTE, true, S, 8)
  gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.UNSIGNED_BYTE, true, S, 11)
  gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 2, gl.UNSIGNED_SHORT, true, S, 12)
  gl.enableVertexAttribArray(5); gl.vertexAttribPointer(5, 3, gl.UNSIGNED_BYTE, true, S, 16)
  gl.enableVertexAttribArray(6); gl.vertexAttribPointer(6, 4, gl.UNSIGNED_BYTE, false, S, 20)
  gl.enableVertexAttribArray(7); gl.vertexAttribPointer(7, 4, gl.UNSIGNED_BYTE, true, S, 24)
  gl.bindVertexArray(null)
  const emptyVao = gl.createVertexArray()!

  const tex = gl.createTexture()!
  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, atlas)
  gl.generateMipmap(gl.TEXTURE_2D)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic')
  if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 4)

  // Shadow map for the bird on itself.
  const smTex = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, smTex)
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, SM, SM)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  const smFb = gl.createFramebuffer()!
  gl.bindFramebuffer(gl.FRAMEBUFFER, smFb)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, smTex, 0)
  gl.drawBuffers([gl.NONE])
  gl.readBuffer(gl.NONE)

  // The bird's silhouette for the soft shadow on the page, blurred in two passes.
  const makeRT = (n: number, withDepth: boolean) => {
    const t = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.R8, n, n)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    const f = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, f)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0)
    let rb: WebGLRenderbuffer | null = null
    if (withDepth) {
      rb = gl.createRenderbuffer()!
      gl.bindRenderbuffer(gl.RENDERBUFFER, rb)
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, n, n)
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb)
    }
    return { t, f, rb, n }
  }
  const rtA = makeRT(SHADOW_RT, true)
  const rtB = makeRT(SHADOW_RT, false)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)

  const LIGHT = [-0.52, 0.74, 0.5]
  gl.clearColor(0, 0, 0, 0)

  const drawMesh = () => {
    gl.bindVertexArray(vao)
    gl.drawElements(gl.TRIANGLES, head.i, gl.UNSIGNED_SHORT, 0)
  }

  // The camera sits a long way back, so the bird keeps a film lens's gentle perspective.
  const CAM_D = 14
  const ELEV = 0.05

  const camera = (scale: number, viewW = cssSize, viewH = cssSize) => {
    const halfY = viewH / 2 / scale
    const proj = perspective(CAM_D / halfY, viewW / viewH, 1, 40)
    const eye = [0, Math.sin(ELEV) * CAM_D, Math.cos(ELEV) * CAM_D]
    return { vp: mul4(proj, lookAt(eye, [0, 0, 0], [0, 1, 0])), eye }
  }

  let lost = false
  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault()
    lost = true
  })

  const render = (f: Frame) => {
    if (lost) return
    const { vp, eye } = camera(f.scale)

    // Shadow map, fitted around the bird.
    const c = f.center
    const R = 2.6
    const lv = lookAt([c[0] + LIGHT[0] * 8, c[1] + LIGHT[1] * 8, c[2] + LIGHT[2] * 8], c, [0, 1, 0])
    const lvp = mul4(ortho(-R, R, -R, R, 1, 16), lv)
    gl.enable(gl.DEPTH_TEST)
    gl.depthMask(true)
    gl.disable(gl.BLEND)
    gl.disable(gl.CULL_FACE)
    gl.useProgram(depthProg)
    gl.uniform4fv(U.db, f.skin)
    gl.uniform1f(U.dps, 1 / head.scale)
    gl.bindFramebuffer(gl.FRAMEBUFFER, smFb)
    gl.viewport(0, 0, SM, SM)
    gl.clear(gl.DEPTH_BUFFER_BIT)
    gl.uniformMatrix4fv(U.dvp, false, lvp)
    drawMesh()

    // The silhouette for the shadow on the page.
    gl.bindFramebuffer(gl.FRAMEBUFFER, rtA.f)
    gl.viewport(0, 0, rtA.n, rtA.n)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.uniformMatrix4fv(U.dvp, false, vp)
    drawMesh()
    gl.disable(gl.DEPTH_TEST)
    gl.useProgram(blurProg)
    gl.uniform1i(U.bt, 0)
    gl.bindVertexArray(emptyVao)
    gl.activeTexture(gl.TEXTURE0)
    const passes = 2
    for (let i = 0; i < passes; i++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, rtB.f)
      gl.bindTexture(gl.TEXTURE_2D, rtA.t)
      gl.uniform2f(U.bd, (f.shadow.blur * (1 + i)) / rtA.n, 0)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      gl.bindFramebuffer(gl.FRAMEBUFFER, rtA.f)
      gl.bindTexture(gl.TEXTURE_2D, rtB.t)
      gl.uniform2f(U.bd, 0, (f.shadow.blur * (1 + i)) / rtA.n)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    // To the canvas: first the shadow, then the bird.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, size, size)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.useProgram(shadowProg)
    gl.bindTexture(gl.TEXTURE_2D, rtA.t)
    gl.uniform1i(U.st, 0)
    gl.uniform4f(U.so, f.shadow.offset[0], f.shadow.offset[1], 0, 0)
    gl.uniform2f(U.sa, f.shadow.alpha, 0)
    const blobs = new Float32Array(9)
    f.shadow.blobs.forEach((b, i) => blobs.set(b, i * 3))
    gl.uniform3fv(U.sb, blobs)
    gl.uniform1f(U.sba, f.shadow.blobAlpha)
    gl.uniform3f(U.sc, 0.0, 0.11, 0.11)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.disable(gl.BLEND)

    gl.enable(gl.DEPTH_TEST)
    gl.useProgram(prog)
    gl.uniform4fv(U.b, f.skin)
    gl.uniform1f(U.ps, 1 / head.scale)
    gl.uniform1f(U.open, f.open)
    gl.uniformMatrix4fv(U.vp, false, vp)
    gl.uniformMatrix4fv(U.lvp, false, lvp)
    gl.uniform3f(U.cam, eye[0], eye[1], eye[2])
    gl.uniform1f(U.shadowOn, 1)
    gl.uniform3fv(U.eyeC, f.eyes.subarray(0, 6))
    gl.uniform3fv(U.eyeA, f.eyes.subarray(6, 12))
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.uniform1i(U.tex, 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, smTex)
    gl.uniform1i(U.sm, 1)
    drawMesh()
    gl.activeTexture(gl.TEXTURE0)
  }

  const project = (scale: number, x: number, y: number, z: number): [number, number] => {
    const { vp } = camera(scale)
    const w = vp[3] * x + vp[7] * y + vp[11] * z + vp[15]
    const px = (vp[0] * x + vp[4] * y + vp[8] * z + vp[12]) / w
    const py = (vp[1] * x + vp[5] * y + vp[9] * z + vp[13]) / w
    return [(px * 0.5 + 0.5) * cssSize, (0.5 - py * 0.5) * cssSize]
  }

  const dispose = () => {
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }

  const resize = (css: number) => {
    cssSize = css
    size = Math.round(css * pr)
    canvas.width = size
    canvas.height = size
    canvas.style.width = canvas.style.height = `${css}px`
  }

  return {
    gl,
    render,
    project,
    dispose,
    resize,
    head,
    get cssSize() {
      return cssSize
    },
  }
}
