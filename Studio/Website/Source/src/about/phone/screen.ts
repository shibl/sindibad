// The game on the battered phone's screen: a little archipelago with live water, a dhow working along a dotted route, and chunky toy
// buttons in the spirit of the real game. No words on it. Drawn into its own small target, then laid onto the phone in perspective.
import { HEAD, compile, freeTarget, target, textureFrom, type Prog, type Target } from './glx'

const QUAD_VS = `${HEAD}
out vec2 v_uv;
void main() {
  vec2 p = vec2(gl_VertexID == 1 ? 3. : -1., gl_VertexID == 2 ? 3. : -1.);
  v_uv = p * .5 + .5;
  gl_Position = vec4(p, 0., 1.);
}`

const BLUR_FS = `${HEAD}
in vec2 v_uv; out vec4 o; uniform sampler2D u_t; uniform vec2 u_d;
void main() {
  vec4 s = vec4(0.0); float w = 0.0;
  for (int i = -12; i <= 12; i++) { float g = exp(-float(i * i) / 72.0); s += texture(u_t, v_uv + u_d * float(i)) * g; w += g; }
  o = s / w;
}`

// The route, bottom of the map to the top, weaving between the islands. Same points as the HUD's markers are placed from.
export const ROUTE: [number, number][] = [
  [0.44, 0.11], [0.5, 0.2], [0.34, 0.28], [0.46, 0.36], [0.62, 0.46], [0.52, 0.55], [0.4, 0.66], [0.55, 0.75], [0.43, 0.84], [0.58, 0.93],
]

const WORLD_FS = `${HEAD}
in vec2 v_uv; out vec4 o;
uniform sampler2D u_world; uniform sampler2D u_shore; uniform sampler2D u_hud;
uniform float u_t; uniform vec3 u_boat; uniform float u_dynamic; uniform vec2 u_route[${ROUTE.length}]; uniform float u_routeOn;
const float TAU = 6.28318530718;
float sdSeg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
vec2 rot(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }
float sdTri(vec2 p, vec2 a, vec2 b, vec2 c) {
  vec2 e0 = b - a, e1 = c - b, e2 = a - c, v0 = p - a, v1 = p - b, v2 = p - c;
  vec2 q0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0);
  vec2 q1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0);
  vec2 q2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0);
  float s = sign(e0.x * e2.y - e0.y * e2.x);
  vec2 d = min(min(vec2(dot(q0, q0), s * (v0.x * e0.y - v0.y * e0.x)), vec2(dot(q1, q1), s * (v1.x * e1.y - v1.y * e1.x))), vec2(dot(q2, q2), s * (v2.x * e2.y - v2.y * e2.x)));
  return -sqrt(d.x) * sign(d.y);
}
float lines(vec2 p, float t) {
  // Bright moving threads of light on the water, by warping crossed sine sheets.
  float v = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 q = rot(p, fi * 2.1 + 0.7);
    float w = sin(q.y * 1.7 + t * 0.7 + fi) * 0.55 + sin(q.y * 0.73 - t * 0.41 + fi * 3.0) * 0.7;
    float s = abs(sin(q.x * 2.2 + w * 2.4 + t * 0.3));
    v += pow(1.0 - s, 5.0);
  }
  return v / 3.0;
}
void main() {
  vec2 uv = v_uv;
  vec2 asp = vec2(1.0, 2.0);
  float t = u_t;
  vec4 w = texture(u_world, vec2(uv.x, 1.0 - uv.y));
  float shore = texture(u_shore, uv).r;
  float near = smoothstep(0.02, 0.62, shore);
  // The depth of the sea: dark blue-teal, lifting to turquoise near the islands.
  vec3 deep = vec3(0.020, 0.420, 0.610);
  vec3 mid = vec3(0.035, 0.620, 0.735);
  vec3 shal = vec3(0.330, 0.860, 0.810);
  vec3 col = mix(deep, mid, smoothstep(0.0, 0.3, shore + (uv.y - 0.5) * 0.1));
  col = mix(col, shal, near * near);
  // Large soft swells of tone so the sea isn't flat.
  float sw = sin(uv.x * 7.0 + uv.y * 4.0 + sin(uv.y * 9.0 + t * 0.2) + t * 0.15) * 0.5 + sin(uv.y * 13.0 - uv.x * 3.0 - t * 0.21) * 0.5;
  col *= 1.0 + 0.055 * sw;
  float l = lines(uv * asp * 7.0, t);
  col += vec3(0.62, 0.95, 0.92) * l * (0.42 + 0.58 * near) * 0.4;
  // Scalloped white ripples drifting, the mark of the game's map.
  vec2 g = uv * asp * vec2(7.5, 7.5);
  g.x += floor(g.y) * 0.5;
  g.y += t * 0.03;
  vec2 cell = fract(g) - 0.5;
  vec2 id = floor(g);
  float rnd = fract(sin(dot(id, vec2(12.9898, 78.233))) * 43758.5453);
  float ph = fract(rnd * 7.0 + t * 0.08);
  float life = smoothstep(0.0, 0.2, ph) * smoothstep(1.0, 0.7, ph) * step(0.52, rnd);
  vec2 c2 = cell * vec2(1.0, 1.0) + vec2(0.0, 0.12);
  float arc = abs(length(c2 - vec2(-0.1, 0.0)) - 0.2);
  arc = min(arc, abs(length(c2 - vec2(0.27, 0.0)) - 0.2));
  float arcm = smoothstep(0.035, 0.012, arc) * step(c2.y, 0.0) * step(abs(c2.x), 0.42);
  col = mix(col, vec3(0.92, 1.0, 0.98), arcm * life * 0.6 * (1.0 - near * 0.9));
  // Foam rings breathing around the shores.
  float r1 = smoothstep(0.022, 0.0, abs(shore - (0.68 + 0.04 * sin(t * 0.9))));
  float r2 = smoothstep(0.018, 0.0, abs(shore - (0.82 + 0.025 * sin(t * 0.7 + 2.0))));
  col = mix(col, vec3(0.97, 1.0, 0.98), max(r1 * 0.62, r2 * 0.75));
  // The soft shadow of each island on the water.
  float shade = texture(u_shore, uv + vec2(-0.006, 0.006)).g;
  col *= 1.0 - 0.3 * smoothstep(0.34, 0.92, shade) * (1.0 - w.a);
  // The dotted route.
  if (u_routeOn > 0.5) {
    float best = 1e3;
    for (int i = 0; i < ${ROUTE.length - 1}; i++) {
      vec2 a = u_route[i], b = u_route[i + 1];
      vec2 m = (a + b) * 0.5;
      float d = min(min(length((uv - a) * asp), length((uv - m) * asp)), length((uv - (a * 0.75 + b * 0.25)) * asp));
      d = min(d, length((uv - (a * 0.25 + b * 0.75)) * asp));
      best = min(best, d);
    }
    col = mix(col, vec3(1.0, 0.97, 0.87), smoothstep(0.0125, 0.0085, best) * 0.92);
  }
  // Islands.
  col = col * (1.0 - w.a) + w.rgb;
  // The dhow, only in the live picture: the still reference under the delta has none, so it can move freely.
  if (u_dynamic > 0.5) {
    // The little dhow, seen from above and slightly behind. Local x is to starboard, y is ahead.
    vec2 bp = rot((uv - u_boat.xy) * asp, -u_boat.z);
    // Its wake: two fading lines opening behind it.
    float wakeL = smoothstep(0.009, 0.0, abs(abs(bp.x) - (-bp.y - 0.02) * 0.34)) * smoothstep(-0.13, -0.03, bp.y) * step(bp.y, -0.018);
    col = mix(col, vec3(1.0), wakeL * 0.7);
    // A soft shadow on the water.
    float shdw = length((bp - vec2(0.006, -0.006)) * vec2(1.0, 0.45)) - 0.015;
    col = mix(col, col * 0.6, smoothstep(0.006, -0.002, shdw) * 0.8);
    // Hull: an almond.
    float hull = length(vec2(bp.x + bp.y * bp.y * 0.0, bp.y) * vec2(1.0, 0.42)) - 0.0145;
    col = mix(col, vec3(0.25, 0.12, 0.05), smoothstep(0.0028, 0.0005, hull));
    col = mix(col, vec3(0.64, 0.38, 0.17), smoothstep(0.0005, -0.0015, hull));
    // Sail: a pale curved triangle leaning to one side.
    vec2 a0 = vec2(-0.002, 0.03), b0 = vec2(-0.002, -0.022), c0 = vec2(0.03, -0.011);
    float sail = sdTri(bp, a0, b0, c0) - 0.0012;
    float sailS = sdTri(bp - vec2(0.003, -0.003), a0, b0, c0);
    col = mix(col, col * 0.72, smoothstep(0.002, 0.0, sailS) * 0.7);
    col = mix(col, vec3(1.0, 0.965, 0.87), smoothstep(0.0012, -0.0006, sail));
    col = mix(col, vec3(0.3, 0.17, 0.08), smoothstep(0.0016, 0.0, abs(bp.x + 0.002)) * step(abs(bp.y - 0.004), 0.026));
    // A pink pennant, the only pink at sea.
    float pen = sdTri(bp, vec2(-0.002, 0.035), vec2(-0.002, 0.027), vec2(-0.016, 0.032));
    col = mix(col, vec3(0.98, 0.17, 0.44), smoothstep(0.001, -0.0005, pen));
  }
  // Toy buttons and the status bar.
  vec4 h = texture(u_hud, vec2(uv.x, 1.0 - uv.y));
  col = col * (1.0 - h.a) + h.rgb;
  // A cheap panel: slight vignette, faint gamma lift at the edges.
  vec2 e = uv - 0.5;
  col *= 1.0 - dot(e, e) * 0.18;
  o = vec4(col, 1.0);
}`

const star = (c: CanvasRenderingContext2D, x: number, y: number, r: number, on: boolean, ink: string) => {
  c.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? r * 0.46 : r
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  c.closePath()
  c.lineJoin = 'round'
  c.fillStyle = on ? '#ffc53a' : '#e9dcc0'
  c.fill()
  c.lineWidth = r * 0.22
  c.strokeStyle = on ? ink : '#b9a988'
  c.stroke()
}

/** A chunky cream shape with a dark outline and a hard shadow under it, as the game draws its buttons. */
const chunky = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, s: number) => {
  const path = (yy: number) => {
    c.beginPath()
    c.roundRect(x, yy, w, h, r)
  }
  path(y + 4 * s)
  c.fillStyle = '#3a2413'
  c.fill()
  path(y)
  c.fillStyle = '#fff5dc'
  c.fill()
  c.lineWidth = 2.6 * s
  c.strokeStyle = '#3a2413'
  c.stroke()
}

export function drawHud(c: CanvasRenderingContext2D, W: number, H: number, signal: number, wifi: number) {
  const s = W / 360
  c.clearRect(0, 0, W, H)
  c.save()
  const ink = '#3a2413'
  // The status bar across the top: a dim band like any cheap phone.
  const sb = 25 * s
  c.fillStyle = 'rgba(2,28,38,0.45)'
  c.fillRect(0, 0, W, sb)
  // Signal bars.
  const bx = W - 118 * s
  const by = 19 * s
  for (let i = 0; i < 4; i++) {
    const on = Math.max(0, Math.min(1, signal * 4 - (3 - i)))
    const h = (4 + i * 3.2) * s
    const dy = (1 - on) * h * 0.6
    c.fillStyle = on > 0.5 ? '#ffffff' : 'rgba(255,255,255,0.28)'
    c.fillRect(bx + i * 7 * s, by - h + dy, 5 * s, h - dy)
  }
  // Wifi.
  c.lineCap = 'round'
  for (let i = 0; i < 3; i++) {
    const on = Math.max(0, Math.min(1, wifi * 3 - (2 - i)))
    c.beginPath()
    c.arc(W - 72 * s, by, (3.5 + i * 4) * s, -Math.PI * 0.75, -Math.PI * 0.25)
    c.lineWidth = 2.1 * s
    c.strokeStyle = `rgba(255,255,255,${0.18 + on * 0.82})`
    c.stroke()
  }
  // Battery, tired.
  c.strokeStyle = '#fff'
  c.lineWidth = 1.5 * s
  c.beginPath()
  c.roundRect(W - 48 * s, 8 * s, 26 * s, 12 * s, 2.5 * s)
  c.stroke()
  c.fillStyle = '#fff'
  c.fillRect(W - 21 * s, 11 * s, 2.5 * s, 6 * s)
  c.fillRect(W - 46 * s, 10 * s, 10 * s, 8 * s)
  // Compass button, top left.
  chunky(c, 14 * s, 36 * s, 52 * s, 52 * s, 26 * s, s)
  const cx = 40 * s
  const cy = 62 * s
  c.fillStyle = '#d8355f'
  c.beginPath()
  c.moveTo(cx, cy - 17 * s)
  c.lineTo(cx + 6 * s, cy)
  c.lineTo(cx - 6 * s, cy)
  c.closePath()
  c.fill()
  c.fillStyle = '#35797a'
  c.beginPath()
  c.moveTo(cx, cy + 17 * s)
  c.lineTo(cx + 6 * s, cy)
  c.lineTo(cx - 6 * s, cy)
  c.closePath()
  c.fill()
  // Stars earned, in the middle.
  chunky(c, 90 * s, 40 * s, 148 * s, 42 * s, 21 * s, s)
  star(c, 121 * s, 61 * s, 13 * s, true, ink)
  star(c, 164 * s, 61 * s, 13 * s, true, ink)
  star(c, 207 * s, 61 * s, 13 * s, false, ink)
  // A shell button, top right.
  chunky(c, 294 * s, 36 * s, 52 * s, 52 * s, 26 * s, s)
  const sx = 320 * s
  const sy = 64 * s
  c.fillStyle = '#ffb56b'
  c.strokeStyle = ink
  c.lineWidth = 2 * s
  c.beginPath()
  c.moveTo(sx, sy + 12 * s)
  c.bezierCurveTo(sx - 21 * s, sy - 3 * s, sx - 12 * s, sy - 20 * s, sx, sy - 16 * s)
  c.bezierCurveTo(sx + 12 * s, sy - 20 * s, sx + 21 * s, sy - 3 * s, sx, sy + 12 * s)
  c.fill()
  c.stroke()
  for (const a of [-0.5, 0, 0.5]) {
    c.beginPath()
    c.moveTo(sx, sy + 10 * s)
    c.lineTo(sx + Math.sin(a) * 14 * s, sy - Math.cos(a) * 13 * s)
    c.stroke()
  }
  // A pink marker on the next island: this is where you go.
  const mx = 0.64 * W
  const my = 0.33 * H
  c.fillStyle = ink
  c.beginPath()
  c.roundRect(mx - 22 * s, my - 18 * s + 4 * s, 44 * s, 36 * s, 11 * s)
  c.fill()
  c.fillStyle = '#fa2a6f'
  c.beginPath()
  c.roundRect(mx - 22 * s, my - 18 * s, 44 * s, 36 * s, 11 * s)
  c.fill()
  c.strokeStyle = ink
  c.lineWidth = 2.6 * s
  c.stroke()
  c.fillStyle = '#fa2a6f'
  c.beginPath()
  c.moveTo(mx - 8 * s, my + 17 * s)
  c.lineTo(mx, my + 28 * s)
  c.lineTo(mx + 8 * s, my + 17 * s)
  c.closePath()
  c.fill()
  c.stroke()
  star(c, mx, my, 11 * s, true, '#7a1439')
  c.restore()
}

export class GameScreen {
  live: Target
  ref: Target
  private shore: Target
  private prog: Prog
  private hudTex: WebGLTexture
  private world: WebGLTexture
  private hud: HTMLCanvasElement
  private hudC: CanvasRenderingContext2D
  private lastHud = ''

  constructor(private gl: WebGL2RenderingContext, worldImg: TexImageSource, w: number, h: number) {
    this.live = target(gl, w, h)
    this.ref = target(gl, w, h)
    this.prog = compile(gl, QUAD_VS, WORLD_FS, 'screen')
    this.world = textureFrom(gl, worldImg, { mips: true })
    this.shore = this.bakeShore()
    this.hud = document.createElement('canvas')
    this.hud.width = w
    this.hud.height = h
    this.hudC = this.hud.getContext('2d')!
    drawHud(this.hudC, w, h, 1, 1)
    this.hudTex = textureFrom(gl, this.hud, { premultiply: true })
    this.draw(this.ref, 0, false)
  }

  /** How far the sea is from any shore, from the islands' own alpha. R wide, G tight (the island's soft shadow). */
  private bakeShore() {
    const gl = this.gl
    const blur = compile(gl, QUAD_VS, BLUR_FS, 'shore-blur')
    const w = 180
    const h = 362
    const a = target(gl, w, h, {})
    const b = target(gl, w, h, {})
    const c = target(gl, w, h, {})
    const copyWorld = compile(gl, QUAD_VS, `${HEAD}in vec2 v_uv; out vec4 o; uniform sampler2D u_t; void main(){ o = vec4(texture(u_t, vec2(v_uv.x, 1.0 - v_uv.y)).a); }`, 'shore-alpha')
    gl.disable(gl.BLEND)
    gl.bindFramebuffer(gl.FRAMEBUFFER, a.fb)
    gl.viewport(0, 0, w, h)
    gl.useProgram(copyWorld.p)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.world)
    gl.uniform1i(copyWorld.u('u_t'), 0)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.useProgram(blur.p)
    gl.uniform1i(blur.u('u_t'), 0)
    const pass = (src: Target, dst: Target, dx: number, dy: number) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb)
      gl.bindTexture(gl.TEXTURE_2D, src.tex)
      gl.uniform2f(blur.u('u_d'), dx, dy)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    pass(a, b, 1 / w, 0)
    pass(b, c, 0, 1 / h)
    // c is tight. Wide: blur again.
    const tight = c
    const wide = target(gl, w, h, {})
    pass(tight, b, 3 / w, 0)
    pass(b, wide, 0, 3 / h)
    const out = target(gl, w, h, {})
    const merge = compile(gl, QUAD_VS, `${HEAD}in vec2 v_uv; out vec4 o; uniform sampler2D u_a; uniform sampler2D u_b; void main(){ float aw = texture(u_a, v_uv).r; float at = texture(u_b, v_uv).r; o = vec4(pow(clamp(aw * 1.7, 0., 1.), 0.6), at, 0., 1.); }`, 'shore-merge')
    gl.bindFramebuffer(gl.FRAMEBUFFER, out.fb)
    gl.useProgram(merge.p)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, wide.tex)
    gl.uniform1i(merge.u('u_a'), 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, tight.tex)
    gl.uniform1i(merge.u('u_b'), 1)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    freeTarget(gl, a)
    freeTarget(gl, b)
    freeTarget(gl, c)
    freeTarget(gl, wide)
    gl.deleteProgram(blur.p)
    gl.deleteProgram(copyWorld.p)
    gl.deleteProgram(merge.p)
    return out
  }

  private draw(dst: Target, t: number, dynamic: boolean) {
    const gl = this.gl
    const p = this.prog
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb)
    gl.viewport(0, 0, dst.w, dst.h)
    gl.disable(gl.BLEND)
    gl.useProgram(p.p)
    gl.uniform1f(p.u('u_t'), t)
    gl.uniform1f(p.u('u_dynamic'), dynamic ? 1 : 0)
    gl.uniform1f(p.u('u_routeOn'), 1)
    const flat = new Float32Array(ROUTE.length * 2)
    ROUTE.forEach((r, i) => {
      flat[i * 2] = r[0]
      flat[i * 2 + 1] = r[1]
    })
    gl.uniform2fv(p.u('u_route'), flat)
    // Along the route, at a sailing pace, back and forth so it never teleports.
    const n = ROUTE.length - 1
    const cycle = (t * 0.018) % 2
    const s = (cycle < 1 ? cycle : 2 - cycle) * n
    const i = Math.min(n - 1, Math.floor(s))
    const f = s - i
    const a = ROUTE[i]
    const b = ROUTE[i + 1]
    const x = a[0] + (b[0] - a[0]) * f
    const y = a[1] + (b[1] - a[1]) * f
    const heading = Math.atan2((b[0] - a[0]) * (cycle < 1 ? 1 : -1), (b[1] - a[1]) * 2 * (cycle < 1 ? 1 : -1))
    gl.uniform3f(p.u('u_boat'), x, y, -heading)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.world)
    gl.uniform1i(p.u('u_world'), 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.shore.tex)
    gl.uniform1i(p.u('u_shore'), 1)
    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D, this.hudTex)
    gl.uniform1i(p.u('u_hud'), 2)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  setSignal(signal: number, wifi: number) {
    const key = `${signal.toFixed(2)}:${wifi.toFixed(2)}`
    if (key === this.lastHud) return
    this.lastHud = key
    drawHud(this.hudC, this.hud.width, this.hud.height, signal, wifi)
    const gl = this.gl
    gl.bindTexture(gl.TEXTURE_2D, this.hudTex)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.hud)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0)
  }

  render(t: number) {
    this.draw(this.live, t, true)
  }

  dispose() {
    const gl = this.gl
    freeTarget(gl, this.live)
    freeTarget(gl, this.ref)
    freeTarget(gl, this.shore)
    gl.deleteProgram(this.prog.p)
    gl.deleteTexture(this.hudTex)
    gl.deleteTexture(this.world)
  }
}
