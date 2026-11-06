// The portal, drawn in raw WebGL2. The arch comes from the hero's Blender file; the other world is generated here from the same
// recipe as the hero art (the same dune function, colours and jellyfish). Everything is in the portal's own space: metres, x
// right, y up, z toward someone standing in front of it, with the floor at y = 0.
//
// The opening is a stencil. From the room you see the other world through it; from the other world you see the room through it,
// because the room is simply what's left when nothing is drawn: the camera image sits behind a transparent canvas.
import { invert, mul, normalize, rotationX, rotationZ, scaling, translation, type M4, type V3 } from './math'

const S = 0.9 // The arch's scale in export_arch.py.
export const OPENING = {
  hw: 0.55 * S,
  y0: 0.14 * S,
  arc: (0.14 + 1.4) * S,
  top: (0.14 + 1.4 + 0.55) * S,
  plane: -0.18,
}
const GROW = 0.035 // The stencil runs a little under the arch's walls so no seam shows.
const SUN = normalize([-0.9, 0.17, -0.4])
export const NEAR = 0.03
export const FAR = 4000

const hex = (h: string): V3 => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255]
const glc = (h: string) => `vec3(${hex(h).map(v => v.toFixed(3)).join(',')})`
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const HEAD = `#version 300 es
precision highp float;
precision highp int;
`
const COMMON = `
const vec3 SUN = vec3(${SUN.map(v => v.toFixed(4)).join(',')});
const float PLANE = ${OPENING.plane.toFixed(3)};
`

// ---------------------------------------------------------------------------------------------------------------- the shaders
const FULLSCREEN_VS = `${HEAD}
uniform mat4 u_ivp; uniform vec3 u_cam; out vec3 v_d;
void main() {
  vec2 p = vec2(gl_VertexID == 1 ? 3. : -1., gl_VertexID == 2 ? 3. : -1.);
  vec4 w = u_ivp * vec4(p, 1., 1.);
  v_d = w.xyz / w.w - u_cam;
  gl_Position = vec4(p, 1., 1.);
}`

// The dusk sky of the hero art: violet overhead, rose then peach at the horizon, with a glow toward the sun.
const SKY_FS = `${HEAD}${COMMON}
in vec3 v_d; out vec4 o;
vec3 ramp(float f) {
  vec3 c = mix(${glc('#ffc79a')}, ${glc('#ffb08e')}, smoothstep(0., .155, f));
  c = mix(c, ${glc('#ff98a6')}, smoothstep(.155, .2, f));
  c = mix(c, ${glc('#e46fb0')}, smoothstep(.2, .3, f));
  c = mix(c, ${glc('#9a58c4')}, smoothstep(.3, .48, f));
  c = mix(c, ${glc('#4b3591')}, smoothstep(.48, .7, f));
  return mix(c, ${glc('#1d1650')}, smoothstep(.7, 1., f));
}
void main() {
  vec3 d = normalize(v_d);
  vec3 c = ramp(clamp((d.y + .06) / .38, 0., 1.));
  float s = max(dot(d, SUN), 0.);
  c = mix(c, ${glc('#ffd9a8')}, pow(smoothstep(.55, 1., s), 3.) * .6);
  c += ${glc('#fff0d8')} * pow(s, 900.) * 1.2;
  // Overhead, slow drifts of colour among the stars.
  float high = smoothstep(.22, .75, d.y);
  float neb = sin(d.x * 5.1 + sin(d.z * 4.3) * 1.4) * sin(d.z * 4.7 + d.y * 3.1 + sin(d.x * 3.7) * 1.2);
  c += mix(${glc('#3a2a9a')}, ${glc('#8a2f8f')}, .5 + .5 * sin(d.x * 3. + d.z * 2.)) * smoothstep(.05, .9, neb) * high * .55;
  // Long thin veils of cloud catch the low sun.
  float band = sin(d.y * 26. + sin(d.x * 3.1 + d.z * 2.3) * 1.6) * .5 + .5;
  c += ${glc('#ff9fc0')} * band * band * smoothstep(.02, .14, d.y) * smoothstep(.42, .16, d.y) * .1;
  o = vec4(c, 1.);
}`

const STAR_VS = `${HEAD}
in vec3 a_d; in vec2 a_s; uniform mat4 u_vp; uniform vec3 u_cam; uniform float u_t, u_dpr; out float v_a;
void main() {
  gl_Position = (u_vp * vec4(u_cam + a_d * 3000., 1.)).xyww;
  float tw = .6 + .4 * sin(u_t * (1. + a_s.y * 2.) + a_s.y * 40.);
  v_a = (.35 + a_s.x * .9) * tw * smoothstep(.07, .24, a_d.y);
  gl_PointSize = (1.5 + a_s.x * 2.2) * u_dpr;
}`
const STAR_FS = `${HEAD}
in float v_a; out vec4 o;
void main() {
  float d = length(gl_PointCoord - .5) * 2.;
  float a = v_a * smoothstep(1., .1, d);
  o = vec4(${glc('#fff6ec')} * a, 0.);
}`

const SPRITE_VS = `${HEAD}
in vec2 a_c; uniform mat4 u_vp; uniform vec3 u_center, u_right, u_up; uniform float u_size; out vec2 v_c;
void main() {
  v_c = a_c;
  gl_Position = u_vp * vec4(u_center + (u_right * a_c.x + u_up * a_c.y) * u_size, 1.);
}`
const SPRITE_FS = `${HEAD}
in vec2 v_c; uniform vec3 u_col; uniform float u_pow; out vec4 o;
void main() {
  float a = pow(max(1. - length(v_c), 0.), u_pow);
  o = vec4(u_col * a, 0.);
}`

const PLANET_VS = `${HEAD}
in vec3 a_p; uniform mat4 u_vp, u_model; out vec3 v_o; out vec3 v_n;
void main() {
  v_o = a_p;
  v_n = mat3(u_model) * a_p;
  gl_Position = u_vp * u_model * vec4(a_p, 1.);
}`
// Wavy bands of peach, rose and lilac, lit from the left by the sun, with a pink rim.
const PLANET_FS = `${HEAD}${COMMON}
in vec3 v_o; in vec3 v_n; uniform vec3 u_view; out vec4 o;
void main() {
  vec3 n = normalize(v_n), p = v_o;
  float w = p.y * 7. + .5 * sin(p.x * 3.1 + p.z * 2.7 + 1.) + .28 * sin(p.x * 7.3 - p.z * 5.1 + p.y * 6.) + .12 * sin(p.x * 17. + p.z * 13. + p.y * 25.);
  float f = .5 + .5 * sin(w * 2.1);
  vec3 c = mix(${glc('#fff1e4')}, ${glc('#ffd3b8')}, smoothstep(0., .3, f));
  c = mix(c, ${glc('#f7b6c8')}, smoothstep(.3, .5, f));
  c = mix(c, ${glc('#dcc6f4')}, smoothstep(.5, .68, f));
  c = mix(c, ${glc('#ffe6d2')}, smoothstep(.68, .85, f));
  float l = smoothstep(-.25, .55, dot(n, SUN));
  c *= mix(vec3(.62, .46, .72), vec3(1.04), l);
  float rim = pow(1. - max(dot(n, u_view), 0.), 3.);
  c += ${glc('#ffb3d6')} * rim * .55;
  o = vec4(c, 1.);
}`
const RING_FS = `${HEAD}${COMMON}
in vec3 v_o; in vec3 v_n; uniform vec3 u_center; uniform float u_pr; uniform mat4 u_model; out vec4 o;
void main() {
  float r = length(v_o.xz);
  float f = (r - 1.35) / 1.;
  float s = .62 + .2 * sin(f * 31.) + .14 * sin(f * 73. + 1.) + .1 * sin(f * 149. + 2.);
  float edge = smoothstep(0., .06, f) * smoothstep(1., .9, f);
  vec3 c = mix(${glc('#ffe6cf')}, ${glc('#ffd1c0')}, smoothstep(0., .35, f));
  c = mix(c, ${glc('#f0c9ef')}, smoothstep(.35, .6, f));
  c = mix(c, ${glc('#ffe9d6')}, smoothstep(.6, 1., f));
  // The planet's shadow falls across the rings on the side away from the sun.
  vec3 w = mat3(u_model) * v_o;
  float along = dot(w, SUN);
  float off = length(w - SUN * along) / u_pr;
  float shade = along < 0. ? smoothstep(.92, 1.08, off) : 1.;
  c *= mix(.42, 1., shade);
  float a = clamp(s * edge, 0., 1.) * .92;
  o = vec4(c * a, a);
}`

const DUNE_VS = `${HEAD}
in vec3 a_p; in vec4 a_n; uniform mat4 u_vp; out vec3 v_p; out vec3 v_n; out float v_s;
void main() {
  v_p = a_p;
  v_n = a_n.xyz;
  v_s = a_n.w;
  gl_Position = u_vp * vec4(a_p, 1.);
}`
const DUNE_FS = `${HEAD}${COMMON}
in vec3 v_p; in vec3 v_n; in float v_s; uniform vec3 u_cam; out vec4 o;
void main() {
  vec3 to = v_p - u_cam;
  float d = length(to);
  // Wind ripples: bands across the wind, fading out with distance.
  float near = exp(-d / 13.);
  float wa = v_p.x * .62 - v_p.z * .78;
  float warp = sin(v_p.x * .9 + v_p.z * .6) * 1.5 + sin(v_p.x * .31 - v_p.z * .47) * 2.4;
  // Ripples too fine for the pixels they land on would shimmer, so they fade out first.
  float fine = 1. - smoothstep(.25, 1.1, fwidth(wa) * 19.);
  float rip = (cos(wa * 19. + warp) + .5 * cos(wa * 41. + warp * 1.7) * fine) * near * fine;
  vec3 n = normalize(normalize(v_n) + vec3(.62, 0., -.78) * rip * .11);
  float ndl = dot(n, SUN);
  float lit = smoothstep(.0, .5, ndl) * v_s;
  vec3 c = mix(${glc('#6f4780')}, ${glc('#a8677f')}, smoothstep(.2, .9, n.y));
  c = mix(c, ${glc('#e8968f')}, lit);
  c += ${glc('#ffd2b4')} * pow(max(ndl, 0.), 2.5) * v_s * .42;
  // A fine grain near the viewer, so the sand doesn't look like plastic.
  float g = fract(sin(dot(floor(v_p.xz * 46.), vec2(12.9898, 78.233))) * 43758.5453);
  c *= 1. + (g - .5) * .09 * near;
  float haze = 1. - exp(-d / 300.);
  c = mix(c, ${glc('#ffa992')}, haze * .92);
  o = vec4(c, 1.);
}`

const ARCH_VS = `${HEAD}
in vec3 a_p; in vec3 a_n; in int a_k; in float a_ao; uniform mat4 u_vp; uniform float u_pop;
out vec3 v_p; out vec3 v_n; flat out int v_k; out float v_ao;
void main() {
  v_p = a_p / 8192.;
  v_n = a_n;
  v_k = a_k;
  v_ao = a_ao;
  vec3 w = v_p * vec3(u_pop, u_pop, u_pop);
  gl_Position = u_vp * vec4(w, 1.);
}`
// The hero's materials: glazed teal ceramic, pale plaster inside the opening, gold trim and sandstone, in a soft studio light.
// The other world's light spills through the opening onto them.
const ARCH_FS = `${HEAD}${COMMON}
in vec3 v_p; in vec3 v_n; flat in int v_k; in float v_ao; uniform vec3 u_cam; uniform float u_dusk, u_open, u_t; out vec4 o;
vec3 studio(vec3 r) {
  vec3 c = mix(vec3(.36, .44, .46), vec3(.9, .96, 1.), smoothstep(-.3, .9, r.y));
  c += vec3(1.5, 1.45, 1.35) * smoothstep(.72, .93, dot(r, normalize(vec3(-.62, .55, .56))));
  c += vec3(.9, .95, 1.) * smoothstep(.09, .01, abs(r.x - .74)) * smoothstep(-.3, .25, r.y);
  return c;
}
vec3 duskEnv(vec3 r) {
  float f = clamp((r.y + .06) / .38, 0., 1.);
  vec3 c = mix(${glc('#ffb08e')}, ${glc('#e46fb0')}, smoothstep(.05, .3, f));
  c = mix(c, ${glc('#3d2c80')}, smoothstep(.3, .85, f));
  c = mix(${glc('#b5707f')}, c, smoothstep(-.1, .02, r.y));
  c += vec3(1.4, 1.05, .8) * pow(max(dot(r, SUN), 0.), 18.);
  return c;
}
void main() {
  vec3 n = normalize(v_n), v = normalize(u_cam - v_p), r = reflect(-v, n);
  float ndv = clamp(dot(n, v), 0., 1.);
  vec3 env = mix(studio(r), duskEnv(r), u_dusk);
  float ao = mix(.42, 1., pow(v_ao, .75));
  vec3 amb = mix(mix(vec3(.62, .66, .66), vec3(1.02), n.y * .5 + .5), mix(vec3(.46, .3, .44), vec3(.74, .56, .74), n.y * .5 + .5), u_dusk);
  vec3 keyD = mix(normalize(vec3(-.58, .6, .56)), SUN, u_dusk);
  vec3 keyC = mix(vec3(.58, .56, .52), vec3(1.05, .76, .58), u_dusk);
  vec3 lit = (amb + keyC * max(dot(n, keyD), 0.)) * ao;
  vec3 to = vec3(0., .95, PLANE - .2) - v_p;
  float l = length(to);
  to /= l;
  vec3 sc = mix(${glc('#ffa58f')}, ${glc('#b98cff')}, smoothstep(.5, 1.9, v_p.y));
  vec3 spill = sc * max(dot(n, to), 0.) / (.45 + l * l * 1.15) * u_open * mix(1., .4, u_dusk);
  vec3 c;
  if (v_k == 0) {
    float pool = .5 + .5 * sin(v_p.x * 4.1 + v_p.y * 3.3 + sin(v_p.y * 7.1) * .6);
    vec3 base = mix(${glc('#0c6a65')}, ${glc('#127f78')}, pool);
    float F = .05 + .95 * pow(1. - ndv, 5.);
    c = base * lit * 1.02 + base * spill * .8;
    c = mix(c, env, F * .85) + env * .045 * ao;
  } else if (v_k == 1) {
    c = vec3(.98, .93, .89) * lit * .66 + spill * 1.05;
  } else if (v_k == 2) {
    float sp = fract(sin(dot(floor(v_p.xy * 160.), vec2(12.9898, 78.233))) * 43758.5453);
    vec3 gold = ${glc('#ffd685')} * (.92 + sp * .16);
    c = gold * (env * .95 + .3) * mix(.6, 1., ao) + spill * .4;
  } else {
    float gr = .5 + .5 * sin(v_p.x * 21. + sin(v_p.z * 17.) * 2.);
    c = mix(${glc('#f0d3c2')}, ${glc('#f9e2d3')}, gr) * lit * .66 + spill * .6;
    c += env * (.03 + .1 * pow(1. - ndv, 5.));
  }
  o = vec4(c, 1.);
}`

const STENCIL_VS = `${HEAD}
in vec3 a_p; uniform mat4 u_vp; uniform float u_open; out float v_e;
void main() {
  v_e = a_p.z;
  vec2 q = vec2(a_p.x, a_p.y - .9) * u_open + vec2(0., .9);
  gl_Position = u_vp * vec4(q, ${OPENING.plane.toFixed(3)}, 1.);
}`
const STENCIL_FS = `${HEAD}
out vec4 o;
void main() { o = vec4(0.); }`
// Near the plane the stencil's mesh would be cut by the camera's near plane, so there the same shape is found ray by ray. It
// keeps the crossing seamless: in front of you is whatever is on the far side of the plane, at any distance.
const STENCIL_RAY_FS = `${HEAD}${COMMON}
in vec3 v_d; uniform vec3 u_cam; uniform float u_open; out vec4 o;
void main() {
  if (abs(v_d.z) < 1e-5) discard;
  float t = (PLANE - u_cam.z) / v_d.z;
  if (t <= 0.) discard;
  vec2 h = (u_cam + v_d * t).xy;
  h = vec2(h.x, h.y - .9) / max(u_open, 1e-3) + vec2(0., .9);
  float hw = ${(OPENING.hw + GROW).toFixed(3)}, arc = ${OPENING.arc.toFixed(3)}, y0 = ${(OPENING.y0 - GROW).toFixed(3)};
  if (h.y < y0 || abs(h.x) > hw) discard;
  if (h.y > arc && length(h - vec2(0., arc)) > hw) discard;
  o = vec4(0.);
}`
// A soft light gathering at the edge of the opening, where the two worlds meet.
const VEIL_FS = `${HEAD}
in float v_e; uniform float u_t, u_a; out vec4 o;
void main() {
  float e = pow(v_e, 11.);
  float s = .8 + .2 * sin(v_e * 22. - u_t * 2.2);
  vec3 c = mix(${glc('#ff8fd0')}, ${glc('#ffe2a0')}, e) * e * s;
  o = vec4(c * u_a * .3, 0.);
}`

const FX_VS = `${HEAD}
in vec2 a_c; uniform mat4 u_vp, u_model; out vec2 v_c; out vec3 v_p;
void main() {
  v_c = a_c;
  vec4 w = u_model * vec4(a_c.x, 0., a_c.y, 1.);
  v_p = w.xyz;
  gl_Position = u_vp * w;
}`
const FX_FS = `${HEAD}${COMMON}
in vec2 v_c; in vec3 v_p; uniform int u_mode; uniform float u_a, u_t; out vec4 o;
void main() {
  vec3 col = vec3(0.);
  float a = 0.;
  if (u_mode == 0) {
    // The plinth's contact shadow.
    float d = length(max(abs(v_c) - vec2(.7), 0.)) / .3;
    a = (1. - smoothstep(0., 1., d)) * .42;
    col = vec3(0., .05, .07) * a;
  } else if (u_mode == 1) {
    // The long soft shadow the hero's key light throws to the right.
    vec2 q = (v_c - vec2(-.68, 0.)) * vec2(.72, 1.7);
    a = exp(-dot(q, q) * 1.9) * .26 * smoothstep(1., .75, length(v_c));
    col = vec3(0., .06, .09) * a;
  } else if (u_mode == 2) {
    // The other world's light falling on the real floor in front of the opening.
    float g = exp(-dot(v_c, v_c) * 3.2) * smoothstep(1., .55, length(v_c));
    a = g * .22;
    col = vec3(1., .44, .66) * g * .3;
  } else {
    // The aiming ring.
    float r = length(v_c);
    float beat = .5 + .5 * sin(u_t * 3.);
    float ring = smoothstep(.09, .03, abs(r - .62 - beat * .05));
    float spin = atan(v_c.y, v_c.x) + u_t * .8;
    float dash = smoothstep(.15, .45, sin(spin * 6.) * .5 + .5);
    float inner = smoothstep(.05, .02, abs(r - .2));
    float glow = exp(-r * r * 4.) * .22;
    a = max(ring * dash, inner) ;
    col = mix(${glc('#ffd65c')}, ${glc('#ffffff')}, inner) * a + ${glc('#fa2a6f')} * glow;
    a = a * .9;
  }
  o = vec4(col, a) * u_a;
}`

// ---- The jellyfish, in three parts: a pulsing bell, trailing ribbons, and sprites for its glow, core and rim beads. Each swims
// in pulses. Each can be clipped at the portal's plane, which lets one drift out of the opening into the room.
const JELLY_HEAD = `
uniform mat4 u_vp, u_model; uniform float u_t, u_ph; uniform vec3 u_cam;
float pulse() { float k = .5 + .5 * sin(u_t * 1.55 + u_ph); return k * k; }
`
const BELL_VS = `${HEAD}${JELLY_HEAD}
in vec3 a_p; in vec2 a_s; out vec3 v_p; out vec3 v_n; out vec2 v_s;
void main() {
  float k = pulse();
  vec3 p = a_p;
  p.xz *= 1. - .17 * k * a_s.x;
  p.y *= 1. + .09 * k;
  vec4 w = u_model * vec4(p, 1.);
  v_p = w.xyz;
  v_n = mat3(u_model) * (a_p * vec3(1., 1.3, 1.));
  v_s = a_s;
  gl_Position = u_vp * w;
}`
const BELL_FS = `${HEAD}${COMMON}
in vec3 v_p; in vec3 v_n; in vec2 v_s; uniform vec3 u_cam, u_bell, u_rim, u_core; uniform float u_clip, u_a; out vec4 o;
void main() {
  if (u_clip * (v_p.z - PLANE) < 0.) discard;
  vec3 n = normalize(v_n), v = normalize(u_cam - v_p);
  float f = pow(1. - abs(dot(n, v)), 1.5);
  float canal = pow(.5 + .5 * cos(v_s.y * 16.), 8.) * smoothstep(.15, .7, v_s.x);
  float skirt = smoothstep(.82, 1., v_s.x);
  vec3 c = u_bell * (.3 + 1.05 * f + .3 * canal) + u_rim * skirt * .4;
  c = mix(c, u_core, pow(1. - v_s.x, 4.) * .3);
  float a = clamp(.1 + .62 * f + .12 * canal + skirt * .22, 0., 1.);
  o = vec4(c * a, a * .82) * u_a;
}`
const RIBBON_VS = `${HEAD}${JELLY_HEAD}
in vec3 a_b; in vec4 a_i; uniform vec2 u_drift; uniform float u_px; out vec2 v_u; out vec3 v_p; out float v_kind;
vec3 at(float s) {
  float ph = a_i.z, len = a_i.w, t = u_t * 1.05 + ph;
  vec3 p = a_b;
  float kind = a_i.y;
  if (kind > .5) {
    // An oral arm: a slow frilly spiral under the bell.
    float a = ph + s * 4.4 + sin(u_t * .6 + ph) * .3;
    float rad = (.1 + .16 * s) * (1. + .35 * sin(s * 19. + ph));
    p = vec3(cos(a) * rad, -.1 - s * 1.5, sin(a) * rad);
  } else {
    p.xz *= 1. - .25 * s - .12 * pulse() * (1. - s);
    p.y -= s * len;
    p.x += sin(t + s * 6.4) * .24 * s;
    p.z += cos(t * .83 + s * 5.2) * .24 * s;
  }
  p.xz -= u_drift * s * s * (kind > .5 ? 1.2 : len * .55);
  return (u_model * vec4(p, 1.)).xyz;
}
void main() {
  float s = a_i.x;
  vec3 c = at(s), d = at(s + .03) - c;
  vec3 v = u_cam - c;
  vec3 side = normalize(cross(d, v));
  float dist = length(v);
  float r = length(u_model[0].xyz);
  float kind = a_i.y;
  float w = (kind > .5 ? .036 : .011) * r * (1. - s * .72) * (1. + sin(s * 40. + a_i.z) * .12);
  w = max(w, dist * u_px);
  vec3 q = c + side * w * (gl_VertexID % 2 == 0 ? -1. : 1.);
  v_u = vec2(gl_VertexID % 2 == 0 ? -1. : 1., s);
  v_p = q;
  v_kind = kind;
  gl_Position = u_vp * vec4(q, 1.);
}`
const RIBBON_FS = `${HEAD}${COMMON}
in vec2 v_u; in vec3 v_p; in float v_kind; uniform vec3 u_ten, u_core; uniform float u_clip, u_a; out vec4 o;
void main() {
  if (u_clip * (v_p.z - PLANE) < 0.) discard;
  float e = 1. - abs(v_u.x);
  float a = smoothstep(0., .7, e) * (1. - v_u.y * v_u.y * .92) * (v_kind > .5 ? .72 : .8);
  vec3 c = mix(u_ten, u_core, v_kind);
  o = vec4(c * a * .9, a * .55) * u_a;
}`
const JSPRITE_VS = `${HEAD}${JELLY_HEAD}
in vec3 a_b; in vec4 a_i; uniform vec3 u_right, u_up, u_bell, u_core, u_rim; out vec2 v_c; out vec3 v_col; out vec3 v_p; out float v_pow; out float v_al;
void main() {
  float k = pulse();
  vec3 b = a_b;
  float kind = a_i.w;
  if (kind > 1.5) { b.xz *= 1. - .17 * k; }
  vec4 w = u_model * vec4(b, 1.);
  float r = length(u_model[0].xyz);
  v_c = a_i.xy;
  v_p = w.xyz;
  float size = a_i.z * r;
  if (kind < .5) {
    v_col = u_bell * (.2 + .1 * k);
    v_pow = 2.6;
    v_al = .22;
  } else if (kind < 1.5) {
    v_col = u_core * (.62 + .3 * k);
    v_pow = 1.6;
    v_al = .7;
  } else {
    v_col = u_rim * .95;
    v_pow = 1.4;
    v_al = .8;
  }
  gl_Position = u_vp * vec4(w.xyz + (u_right * a_i.x + u_up * a_i.y) * size, 1.);
}`
const JSPRITE_FS = `${HEAD}${COMMON}
in vec2 v_c; in vec3 v_col; in vec3 v_p; in float v_pow; in float v_al; uniform float u_clip, u_a; out vec4 o;
void main() {
  if (u_clip * (v_p.z - PLANE) < 0.) discard;
  float a = pow(max(1. - length(v_c), 0.), v_pow);
  // Part glow and part paint, so it keeps its colour over a bright room as well as a dark sky.
  o = vec4(v_col * a, a * v_al) * u_a;
}`

// Drifting motes: spores coming out of the opening into the room, dust in the other world, and the burst when the portal opens.
const MOTE_VS = `${HEAD}
in vec3 a_a; in vec4 a_i; uniform mat4 u_vp; uniform float u_t, u_h, u_mode; out float v_a; out float v_k;
void main() {
  vec3 p;
  float seed = a_i.w;
  float a;
  if (u_mode < .5) {
    float life = fract(u_t * a_i.z + seed);
    p = a_a + vec3(a_i.x, a_i.y, .5 + seed * .8) * life;
    p.x += sin(u_t * .7 + seed * 40.) * .05;
    a = sin(life * 3.14159);
  } else if (u_mode < 1.5) {
    p = a_a + vec3(sin(u_t * .19 + seed * 30.), sin(u_t * .23 + seed * 50.) * .5, cos(u_t * .17 + seed * 70.)) * .9;
    a = .55 + .45 * sin(u_t * 1.3 + seed * 90.);
  } else {
    // The burst, driven by u_t from 0 to 1.
    float t = u_t;
    p = a_a * vec3(.3 + t * 2.4 * a_i.z, 0., .3 + t * 2.4 * a_i.z);
    p.y = a_i.y * t * 2.8 - t * t * 1.3 + .1;
    a = (1. - t) * (1. - t);
  }
  v_a = a;
  v_k = seed;
  vec4 c = u_vp * vec4(p, 1.);
  gl_Position = c;
  gl_PointSize = clamp(u_h * (.018 + seed * .018) / c.w, 1.2, 26.);
}`
const MOTE_FS = `${HEAD}
in float v_a; in float v_k; out vec4 o;
void main() {
  float d = length(gl_PointCoord - .5) * 2.;
  float g = pow(max(1. - d, 0.), 1.8);
  vec3 c = mix(${glc('#e8fdff')}, ${glc('#ffe6a6')}, step(.6, v_k));
  o = vec4(c * g * v_a * 1.2, 0.);
}`

// ------------------------------------------------------------------------------------------------------------- the machinery
type Prog = { p: WebGLProgram; u: Record<string, WebGLUniformLocation> }
function program(gl: WebGL2RenderingContext, vs: string, fs: string): Prog {
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`Shader: ${gl.getShaderInfoLog(s)}`)
    return s
  }
  const p = gl.createProgram()!
  gl.attachShader(p, sh(gl.VERTEX_SHADER, vs))
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs))
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`Link: ${gl.getProgramInfoLog(p)}`)
  const u: Prog['u'] = {}
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS)
  for (let i = 0; i < n; i++) {
    const name = gl.getActiveUniform(p, i)!.name
    u[name] = gl.getUniformLocation(p, name)!
  }
  return { p, u }
}

type Mesh = { vao: WebGLVertexArrayObject; count: number; index: boolean }
type Attr = [string, number, number, number, boolean?, boolean?]

// ------------------------------------------------------------------------------------------------------------- the dunes
function dunes() {
  const fieldOf = (amp: number, scale: number, seed: number) => {
    const r = rng(seed)
    const terms = [0, 1, 2].map(() => [0.4 + r() * 0.6, scale * (0.7 + r()), scale * (0.9 + r() * 1.3), r() * 6.28])
    const ridge = (u: number) => {
      const p = u - Math.floor(u)
      return p < 0.7 ? (p / 0.7) ** 1.6 : ((1 - p) / 0.3) ** 0.9
    }
    return (X: number, Y: number) => {
      let warp = 0
      for (const t of terms) warp += t[0] * Math.sin(X / t[1] + Y / t[2] + t[3])
      const u = (X * 0.62 + Y * 0.78) / scale + 0.3 * warp
      const v = (X * -0.42 + Y * 0.91) / (scale * 0.43) + 0.22 * warp + 1.3
      const mod = 0.65 + 0.35 * Math.sin(X / (scale * 1.9) + 1.3) * Math.sin(Y / (scale * 2.6) + 0.4)
      return amp * (ridge(u) * mod + 0.28 * ridge(v))
    }
  }
  const nearField = fieldOf(1.9, 9, 3), farField = fieldOf(17, 80, 8)
  // Flat where people walk, swelling into a ridge beyond them, then big slow forms in the distance.
  const height = (X: number, Y: number) => {
    const r = Math.hypot(X, Y)
    const g = clamp01((r - 4.5) / 15) ** 1.5
    const near = 0.14 * S - 0.03 + nearField(X, Y) * g - 1.1 * g
    const w = smooth(34, 120, r)
    if (w <= 0) return near
    const far = -7 + farField(X, Y) * clamp01((r - 40) / 120)
    return near * (1 - w) + far * w
  }
  const RINGS = 84, SEG = 112
  const data = new Float32Array((RINGS + 1) * (SEG + 1) * 7)
  const sun = Math.hypot(SUN[0], SUN[2])
  const sx = SUN[0] / sun, sz = SUN[2] / sun, rise = SUN[1] / sun
  let o = 0
  for (let i = 0; i <= RINGS; i++) {
    const r = 1100 * (i / RINGS) ** 2.7
    for (let j = 0; j <= SEG; j++) {
      const a = (j / SEG) * Math.PI * 2
      // a runs through the half behind the plane first, then the half in front, so each can be drawn alone.
      const X = r * Math.cos(a), Y = r * Math.sin(a)
      const y = height(X, Y)
      const e = Math.max(0.2, r * 0.012)
      const nx = height(X - e, Y) - height(X + e, Y), nz = height(X, Y + e) - height(X, Y - e)
      const l = Math.hypot(nx, 2 * e, nz)
      // Let the low sun cast long soft shadows, walking along the ground toward it.
      let lit = 1
      if (r < 700) {
        for (let d = 0.8, k = 0; k < 12; k++, d *= 1.6) {
          const over = height(X + sx * d, Y - sz * d) - (y + rise * d)
          if (over > 0) lit = Math.min(lit, 1 - clamp01(over / (0.12 + d * 0.05)))
          if (lit <= 0) break
        }
      }
      data[o++] = X
      data[o++] = y
      data[o++] = OPENING.plane - Y
      data[o++] = nx / l
      data[o++] = (2 * e) / l
      data[o++] = nz / l
      data[o++] = lit
    }
  }
  const row = SEG + 1
  const half = SEG / 2
  const idx: number[] = []
  const quads = (from: number, to: number) => {
    for (let i = 0; i < RINGS; i++) {
      for (let j = from; j < to; j++) {
        const a = i * row + j, b = a + 1, c = a + row, d = c + 1
        idx.push(a, c, b, b, c, d)
      }
    }
  }
  quads(0, half)
  const backCount = idx.length
  quads(half, SEG)
  return { data, index: new Uint16Array(idx), backCount }
}

// ----------------------------------------------------------------------------------------------------------- the jellyfish
function bellMesh() {
  const rings = 12, seg = 26
  const p: number[] = [], idx: number[] = []
  for (let i = 0; i <= rings; i++) {
    const u = i / rings
    const phi = u * Math.PI * 0.59
    const y0 = 0.78 * Math.cos(phi)
    const low = clamp01((0.25 - Math.cos(phi)) / 0.43)
    for (let j = 0; j <= seg; j++) {
      const a = (j / seg) * Math.PI * 2
      const rad = Math.sin(phi) * (1 + 0.06 * low + 0.06 * low * Math.sin(a * 16))
      p.push(rad * Math.cos(a), y0 - 0.05 * low * (0.5 + 0.5 * Math.cos(a * 16)), rad * Math.sin(a), u, a)
    }
  }
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < seg; j++) {
      const a = i * (seg + 1) + j, b = a + 1, c = a + seg + 1, d = c + 1
      idx.push(a, c, b, b, c, d)
    }
  }
  return { data: new Float32Array(p), index: new Uint16Array(idx) }
}

function ribbonMesh() {
  const r = rng(9)
  const SEGS = 16
  const v: number[] = [], idx: number[] = []
  let base = 0
  const strip = (bx: number, by: number, bz: number, kind: number, ph: number, len: number) => {
    for (let i = 0; i <= SEGS; i++) {
      const s = i / SEGS
      for (let k = 0; k < 2; k++) v.push(bx, by, bz, s, kind, ph, len)
      if (i < SEGS) {
        const a = base + i * 2
        idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3)
      }
    }
    base += (SEGS + 1) * 2
  }
  const tentacles = 13
  for (let k = 0; k < tentacles; k++) {
    const a = (k / tentacles) * Math.PI * 2 + (r() - 0.5) * 0.2
    strip(Math.cos(a) * 1.02, -0.18, Math.sin(a) * 1.02, 0, r() * 6.28, 1.8 + r() * 2.4)
  }
  for (let k = 0; k < 4; k++) strip(0, 0, 0, 1, (k * Math.PI) / 2 + 0.2, 1.9)
  return { data: new Float32Array(v), index: new Uint16Array(idx) }
}

function spriteMesh() {
  const v: number[] = [], idx: number[] = []
  let n = 0
  const add = (x: number, y: number, z: number, size: number, kind: number) => {
    for (const [cx, cy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) v.push(x, y, z, cx, cy, size, kind)
    idx.push(n, n + 1, n + 2, n, n + 2, n + 3)
    n += 4
  }
  add(0, 0.1, 0, 3, 0) // the halo
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + 0.4
    add(Math.cos(a) * 0.22, 0.2, Math.sin(a) * 0.22, 0.34, 1) // the four lobes of its core
  }
  for (let k = 0; k < 26; k++) {
    const a = (k / 26) * Math.PI * 2
    add(Math.cos(a) * 1.08, -0.2, Math.sin(a) * 1.08, 0.075, 2) // the beads along its skirt
  }
  return { data: new Float32Array(v), index: new Uint16Array(idx) }
}

type Jelly = { p: V3; r: number; bell: V3; core: V3; rim: V3; ten: V3; tilt: [number, number]; drift: [number, number]; ph: number }
const jelly = (p: V3, r: number, bell: string, core: string, rim: string, tilt: [number, number], drift: [number, number], ph: number, ten?: string): Jelly => ({
  p, r, bell: hex(bell), core: hex(core), rim: hex(rim), ten: hex(ten ?? rim), tilt, drift, ph,
})
const P = OPENING.plane
// The first three are where the hero art has them, as seen through the opening. The rest are there when you step through.
const JELLIES: Jelly[] = [
  jelly([-0.95, 1.1, P - 4.4], 0.34, '#a7b4ff', '#ffd27a', '#eef0ff', [-0.14, 0.2], [-0.2, 0], 0.6),
  jelly([0.1, 2.15, P - 10], 0.62, '#ff8fe0', '#ffe27a', '#ffd3f3', [0.2, -0.17], [0.3, 0.1], 2.2),
  jelly([3.1, 3.3, P - 21], 1.45, '#7af0ff', '#ff8ad8', '#d7fdff', [0.1, -0.1], [0.2, 0], 4.1),
  jelly([-3.1, 2.2, P + 4.6], 0.6, '#ff8fe0', '#ffe27a', '#ffd3f3', [0.14, 0.2], [0.25, 0], 1.1),
  jelly([3.9, 3, P + 8.4], 1.05, '#7af0ff', '#ff8ad8', '#d7fdff', [-0.2, 0.1], [-0.3, 0], 3.3),
  jelly([-7, 3.5, P - 3.6], 1.3, '#a7b4ff', '#ffd27a', '#eef0ff', [0.1, 0.25], [0.2, 0.2], 5.2),
  jelly([5.6, 1.9, P - 3.2], 0.7, '#ff8fe0', '#ffe27a', '#ffd3f3', [-0.15, -0.2], [-0.2, 0.1], 0.2),
  jelly([-1.6, 5.2, P + 1.8], 1.7, '#7af0ff', '#ff8ad8', '#d7fdff', [0.08, 0.12], [0.1, 0], 2.9),
]
const OUT_K: V3[] = [[0.1, 1.15, P - 1.7], [-0.2, 1.42, P], [-0.55, 1.75, 0.28], [-0.88, 2.1, 0.56]]
/** Where the jellyfish that gets out is, t seconds after the portal opens. */
function outPos(t: number): V3 {
  const f = clamp01(t / 12)
  const e = f * f * (3 - 2 * f)
  const x = e * (OUT_K.length - 1)
  const i = Math.min(OUT_K.length - 2, Math.floor(x)), u = x - i
  const a = OUT_K[Math.max(0, i - 1)], b = OUT_K[i], c = OUT_K[i + 1], d = OUT_K[Math.min(OUT_K.length - 1, i + 2)]
  const cr = (k: number) =>
    0.5 * (2 * b[k] + (c[k] - a[k]) * u + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * u * u + (3 * b[k] - a[k] - 3 * c[k] + d[k]) * u * u * u)
  const hover = smooth(9, 12, t)
  return [cr(0) + Math.sin(t * 0.37) * 0.14 * hover, cr(1) + Math.sin(t * 0.61) * 0.1 * hover, cr(2) + Math.cos(t * 0.29) * 0.1 * hover]
}

// ---------------------------------------------------------------------------------------------------------------- the scene
export interface PortalState {
  /** The transform from the portal's space into the tracker's. Null until it has been placed. */
  place: M4 | null
  /** The arch rising, 0 to 1 (and a little past it, as it springs). */
  pop: number
  /** The opening widening, 0 to 1. */
  open: number
  /** Whether the viewer has stepped through. */
  inside: boolean
  /** 0 in the room's light, 1 in the other world's. It follows `inside` smoothly. */
  dusk: number
  /** Where the aiming ring is, in tracker space. */
  reticle: M4 | null
  /** Seconds, for everything that moves. */
  t: number
  /** Seconds since the opening started to widen. */
  sinceOpen: number
  /** The burst when it opens, 0 to 1, or -1 when there's none. */
  burst: number
}

export function createScene(gl: WebGL2RenderingContext, arch: ArrayBuffer, dpr: number) {
  const prog = {
    sky: program(gl, FULLSCREEN_VS, SKY_FS),
    star: program(gl, STAR_VS, STAR_FS),
    sprite: program(gl, SPRITE_VS, SPRITE_FS),
    planet: program(gl, PLANET_VS, PLANET_FS),
    ring: program(gl, PLANET_VS, RING_FS),
    dune: program(gl, DUNE_VS, DUNE_FS),
    arch: program(gl, ARCH_VS, ARCH_FS),
    stencil: program(gl, STENCIL_VS, STENCIL_FS),
    stencilRay: program(gl, FULLSCREEN_VS, STENCIL_RAY_FS),
    veil: program(gl, STENCIL_VS, VEIL_FS),
    fx: program(gl, FX_VS, FX_FS),
    bell: program(gl, BELL_VS, BELL_FS),
    ribbon: program(gl, RIBBON_VS, RIBBON_FS),
    jsprite: program(gl, JSPRITE_VS, JSPRITE_FS),
    mote: program(gl, MOTE_VS, MOTE_FS),
  }
  const emptyVao = gl.createVertexArray()!

  // Attributes are bound by name, so each mesh is laid out once per program family.
  const mesh = (prg: Prog, data: ArrayBufferView, attrs: Attr[], stride: number, index?: Uint16Array, count = 0): Mesh => {
    const vao = gl.createVertexArray()!
    gl.bindVertexArray(vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
    for (const [name, size, type, offset, norm, int] of attrs) {
      const loc = gl.getAttribLocation(prg.p, name)
      if (loc < 0) continue
      gl.enableVertexAttribArray(loc)
      if (int) gl.vertexAttribIPointer(loc, size, type, stride, offset)
      else gl.vertexAttribPointer(loc, size, type, !!norm, stride, offset)
    }
    if (index) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer())
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index, gl.STATIC_DRAW)
    }
    gl.bindVertexArray(null)
    return { vao, count: index ? index.length : count, index: !!index }
  }

  // The arch.
  const head = new Uint32Array(arch, 0, 2)
  const nv = head[0], ni = head[1]
  const posEnd = 8 + nv * 6, nEnd = posEnd + nv * 3, kEnd = nEnd + nv, aEnd = kEnd + nv
  const iStart = aEnd + ((aEnd - 8) % 2 ? 1 : 0)
  const archVao = gl.createVertexArray()!
  gl.bindVertexArray(archVao)
  const vb = (name: string, view: ArrayBufferView, size: number, type: number, norm: boolean, int = false) => {
    const loc = gl.getAttribLocation(prog.arch.p, name)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, view, gl.STATIC_DRAW)
    gl.enableVertexAttribArray(loc)
    if (int) gl.vertexAttribIPointer(loc, size, type, 0, 0)
    else gl.vertexAttribPointer(loc, size, type, norm, 0, 0)
  }
  vb('a_p', new Int16Array(arch, 8, nv * 3), 3, gl.SHORT, false)
  vb('a_n', new Int8Array(arch, posEnd, nv * 3), 3, gl.BYTE, true)
  vb('a_k', new Int8Array(arch, nEnd, nv), 1, gl.BYTE, false, true)
  vb('a_ao', new Uint8Array(arch, kEnd, nv), 1, gl.UNSIGNED_BYTE, true)
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(arch.slice(iStart, iStart + ni * 2)), gl.STATIC_DRAW)
  gl.bindVertexArray(null)

  // The opening, as a fan whose third coordinate runs from 0 at the middle to 1 at the edge.
  const openPts: number[] = [0, (OPENING.y0 + OPENING.arc) / 2 + 0.1, 0]
  const hw = OPENING.hw + GROW, y0 = OPENING.y0 - GROW
  openPts.push(hw, y0, 1)
  const ARC = 48
  for (let i = 0; i <= ARC; i++) {
    const a = (i / ARC) * Math.PI
    openPts.push(Math.cos(a) * hw, OPENING.arc + Math.sin(a) * hw, 1)
  }
  openPts.push(-hw, y0, 1, hw, y0, 1)
  const openMesh = mesh(prog.stencil, new Float32Array(openPts), [['a_p', 3, gl.FLOAT, 0]], 0, undefined, openPts.length / 3)

  const quadData = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
  const fxQuad = mesh(prog.fx, quadData, [['a_c', 2, gl.FLOAT, 0]], 0, undefined, 4)
  const spriteQuad = mesh(prog.sprite, quadData, [['a_c', 2, gl.FLOAT, 0]], 0, undefined, 4)

  // The world.
  const d = dunes()
  const duneMesh = mesh(prog.dune, d.data, [['a_p', 3, gl.FLOAT, 0], ['a_n', 4, gl.FLOAT, 12]], 28, d.index)
  const backCount = d.backCount, totalCount = d.index.length

  const r0 = rng(21)
  const starData: number[] = []
  for (let i = 0; i < 1100; i++) {
    const y = r0() * 0.95 + 0.05, a = r0() * Math.PI * 2, h = Math.sqrt(1 - y * y)
    starData.push(Math.cos(a) * h, y, Math.sin(a) * h, r0() ** 2.2, r0())
  }
  const stars = mesh(prog.star, new Float32Array(starData), [['a_d', 3, gl.FLOAT, 0], ['a_s', 2, gl.FLOAT, 12]], 20, undefined, 1100)

  const sphere: number[] = [], sphereI: number[] = []
  const LAT = 28, LON = 44
  for (let i = 0; i <= LAT; i++) {
    const th = (i / LAT) * Math.PI
    for (let j = 0; j <= LON; j++) {
      const ph = (j / LON) * Math.PI * 2
      sphere.push(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph))
    }
  }
  for (let i = 0; i < LAT; i++) {
    for (let j = 0; j < LON; j++) {
      const a = i * (LON + 1) + j, b = a + 1, c = a + LON + 1, e = c + 1
      sphereI.push(a, b, c, b, e, c)
    }
  }
  const planet = mesh(prog.planet, new Float32Array(sphere), [['a_p', 3, gl.FLOAT, 0]], 0, new Uint16Array(sphereI))
  const ringData: number[] = []
  const RSEG = 96
  for (let i = 0; i <= RSEG; i++) {
    const a = (i / RSEG) * Math.PI * 2
    ringData.push(Math.cos(a) * 1.35, 0, Math.sin(a) * 1.35, Math.cos(a) * 2.35, 0, Math.sin(a) * 2.35)
  }
  const ring = mesh(prog.ring, new Float32Array(ringData), [['a_p', 3, gl.FLOAT, 0]], 0, undefined, ringData.length / 3)

  // A giant planet rising from the dunes straight ahead, low enough that it shows through the opening from where people stand.
  const PDIST = 1700, PANG = (7.4 * Math.PI) / 180, PR = PDIST * Math.tan(PANG)
  const pDir = normalize([Math.sin(0.035), Math.sin(0.085), -Math.cos(0.085)])
  const PC: V3 = [pDir[0] * PDIST, pDir[1] * PDIST + 1.4, pDir[2] * PDIST + P]
  const planetRot = mul(rotationZ(-0.28), rotationX(0.3))
  const planetM = mul(mul(translation(PC[0], PC[1], PC[2]), planetRot), scaling(PR))
  const sunPos: V3 = [SUN[0] * 3000, SUN[1] * 3000, SUN[2] * 3000]

  const bell = bellMesh()
  const bellM = mesh(prog.bell, bell.data, [['a_p', 3, gl.FLOAT, 0], ['a_s', 2, gl.FLOAT, 12]], 20, bell.index)
  const rib = ribbonMesh()
  const ribM = mesh(prog.ribbon, rib.data, [['a_b', 3, gl.FLOAT, 0], ['a_i', 4, gl.FLOAT, 12]], 28, rib.index)
  const spr = spriteMesh()
  const sprM = mesh(prog.jsprite, spr.data, [['a_b', 3, gl.FLOAT, 0], ['a_i', 4, gl.FLOAT, 12]], 28, spr.index)
  const outJelly = jelly([0, 0, 0], 0.26, '#5cecff', '#ff6fd8', '#d4fdff', [-0.24, -0.34], [-0.5, -0.15], 1.7, '#8ff1ff')

  // Motes.
  const r1 = rng(5)
  const spore: number[] = []
  for (let i = 0; i < 46; i++) {
    const sx = (r1() - 0.5) * 0.8, sy = 0.35 + r1() * 1.25
    spore.push(sx, sy, P + 0.02, -0.5 - r1() * 0.7, 0.5 + r1() * 0.9, 0.05 + r1() * 0.05, r1())
  }
  const sporeM = mesh(prog.mote, new Float32Array(spore), [['a_a', 3, gl.FLOAT, 0], ['a_i', 4, gl.FLOAT, 12]], 28, undefined, 46)
  const dust: number[] = []
  for (let i = 0; i < 240; i++) dust.push((r1() - 0.5) * 34, 0.2 + r1() * 5, P + (r1() - 0.5) * 34, 0, 0, 0, r1())
  const dustM = mesh(prog.mote, new Float32Array(dust), [['a_a', 3, gl.FLOAT, 0], ['a_i', 4, gl.FLOAT, 12]], 28, undefined, 240)
  const burst: number[] = []
  for (let i = 0; i < 70; i++) {
    const a = r1() * Math.PI * 2
    burst.push(Math.cos(a), 0, Math.sin(a), 0, 0.6 + r1() * 1.2, 0.5 + r1() * 0.7, r1())
  }
  const burstM = mesh(prog.mote, new Float32Array(burst), [['a_a', 3, gl.FLOAT, 0], ['a_i', 4, gl.FLOAT, 12]], 28, undefined, 70)

  const drawMesh = (m: Mesh, mode: number = gl.TRIANGLES) => {
    gl.bindVertexArray(m.vao)
    if (m.index) gl.drawElements(mode, m.count, gl.UNSIGNED_SHORT, 0)
    else gl.drawArrays(mode, 0, m.count)
  }

  /** Draws one view. The caller has bound the framebuffer and set the viewport. */
  function draw(view: ArrayLike<number>, proj: ArrayLike<number>, height: number, s: PortalState) {
    gl.clearColor(0, 0, 0, 0)
    gl.clearDepth(1)
    gl.clearStencil(0)
    gl.depthMask(true)
    gl.colorMask(true, true, true, true)
    gl.stencilMask(0xff)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT)
    gl.enable(gl.DEPTH_TEST)
    gl.depthFunc(gl.LEQUAL)
    gl.disable(gl.STENCIL_TEST)
    gl.disable(gl.BLEND)
    gl.enable(gl.CULL_FACE)
    gl.cullFace(gl.BACK)

    const t = s.t

    const blendOn = () => {
      gl.enable(gl.BLEND)
      gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      gl.depthMask(false)
    }
    const blendOff = () => {
      gl.disable(gl.BLEND)
      gl.depthMask(true)
    }

    const drawReticle = () => {
      if (!s.reticle) return
      const vp = mul(proj, view)
      blendOn()
      gl.disable(gl.CULL_FACE)
      gl.useProgram(prog.fx.p)
      gl.uniformMatrix4fv(prog.fx.u.u_vp, false, vp)
      gl.uniformMatrix4fv(prog.fx.u.u_model, false, mul(s.reticle, new Float32Array([0.75, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0.75, 0, 0, 0.004, 0, 1])))
      gl.uniform1i(prog.fx.u.u_mode, 3)
      gl.uniform1f(prog.fx.u.u_a, 1)
      gl.uniform1f(prog.fx.u.u_t, t)
      drawMesh(fxQuad, gl.TRIANGLE_STRIP)
      gl.enable(gl.CULL_FACE)
      blendOff()
    }

    if (!s.place) {
      drawReticle()
      return
    }

    // Everything from here on is in the portal's own space.
    const V = mul(view, s.place)
    const iV = invert(V)
    const cam: V3 = [iV[12], iV[13], iV[14]]
    const VP = mul(proj, V)
    const iVP = invert(VP)
    const right: V3 = [V[0], V[4], V[8]], up: V3 = [V[1], V[5], V[9]]
    const camSide = cam[2] - P
    const open = clamp01(s.open)

    const fxQuadAt = (mode: number, cx: number, cz: number, sx: number, sz: number, a: number) => {
      const fx = prog.fx
      gl.uniformMatrix4fv(fx.u.u_model, false, new Float32Array([sx, 0, 0, 0, 0, 1, 0, 0, 0, 0, sz, 0, cx, 0.003, cz, 1]))
      gl.uniform1i(fx.u.u_mode, mode)
      gl.uniform1f(fx.u.u_a, a)
      gl.uniform1f(fx.u.u_t, t)
      drawMesh(fxQuad, gl.TRIANGLE_STRIP)
    }

    // ---- The arch.
    const drawArch = () => {
      const a = prog.arch
      gl.useProgram(a.p)
      gl.uniformMatrix4fv(a.u.u_vp, false, VP)
      gl.uniform3fv(a.u.u_cam, cam)
      gl.uniform1f(a.u.u_pop, s.pop)
      gl.uniform1f(a.u.u_dusk, s.dusk)
      gl.uniform1f(a.u.u_open, open)
      gl.uniform1f(a.u.u_t, t)
      gl.bindVertexArray(archVao)
      gl.drawElements(gl.TRIANGLES, ni, gl.UNSIGNED_SHORT, 0)
    }

    // ---- The opening, into the stencil.
    const writeStencil = () => {
      gl.enable(gl.STENCIL_TEST)
      gl.stencilFunc(gl.ALWAYS, 1, 0xff)
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE)
      gl.colorMask(false, false, false, false)
      gl.depthMask(false)
      gl.disable(gl.CULL_FACE)
      if (Math.abs(camSide) < 0.5) {
        const r = prog.stencilRay
        gl.useProgram(r.p)
        gl.uniformMatrix4fv(r.u.u_ivp, false, iVP)
        gl.uniform3fv(r.u.u_cam, cam)
        gl.uniform1f(r.u.u_open, open)
        gl.bindVertexArray(emptyVao)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
      } else {
        const st = prog.stencil
        gl.useProgram(st.p)
        gl.uniformMatrix4fv(st.u.u_vp, false, VP)
        gl.uniform1f(st.u.u_open, open)
        drawMesh(openMesh, gl.TRIANGLE_FAN)
      }
      gl.colorMask(true, true, true, true)
      gl.depthMask(true)
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP)
    }

    // ---- One jellyfish.
    const drawJelly = (j: Jelly, pos: V3, clip: number, a = 1) => {
      const bob = Math.sin(t * 0.42 + j.ph) * 0.1 * j.r * 2
      const m = mul(mul(mul(translation(pos[0], pos[1] + bob, pos[2]), rotationZ(j.tilt[1])), rotationX(j.tilt[0])), scaling(j.r))
      gl.disable(gl.CULL_FACE)
      const shared = (pr: Prog) => {
        gl.useProgram(pr.p)
        gl.uniformMatrix4fv(pr.u.u_vp, false, VP)
        gl.uniformMatrix4fv(pr.u.u_model, false, m)
        gl.uniform1f(pr.u.u_t, t)
        gl.uniform1f(pr.u.u_ph, j.ph)
        gl.uniform1f(pr.u.u_clip, clip)
        gl.uniform1f(pr.u.u_a, a)
        if (pr.u.u_cam) gl.uniform3fv(pr.u.u_cam, cam)
      }
      shared(prog.jsprite)
      gl.uniform3fv(prog.jsprite.u.u_right, right)
      gl.uniform3fv(prog.jsprite.u.u_up, up)
      gl.uniform3fv(prog.jsprite.u.u_bell, j.bell)
      gl.uniform3fv(prog.jsprite.u.u_core, j.core)
      gl.uniform3fv(prog.jsprite.u.u_rim, j.rim)
      drawMesh(sprM)
      shared(prog.ribbon)
      gl.uniform2f(prog.ribbon.u.u_drift, j.drift[0], j.drift[1])
      gl.uniform1f(prog.ribbon.u.u_px, 0.9 / (proj[5] * height * 0.5))
      gl.uniform3fv(prog.ribbon.u.u_ten, j.ten)
      gl.uniform3fv(prog.ribbon.u.u_core, j.core)
      drawMesh(ribM)
      shared(prog.bell)
      gl.uniform3fv(prog.bell.u.u_bell, j.bell)
      gl.uniform3fv(prog.bell.u.u_rim, j.rim)
      gl.uniform3fv(prog.bell.u.u_core, j.core)
      drawMesh(bellM)
    }

    const drawMotes = (m: Mesh, mode: number, time: number) => {
      const pr = prog.mote
      gl.useProgram(pr.p)
      gl.uniformMatrix4fv(pr.u.u_vp, false, VP)
      gl.uniform1f(pr.u.u_t, time)
      gl.uniform1f(pr.u.u_h, height)
      gl.uniform1f(pr.u.u_mode, mode)
      drawMesh(m, gl.POINTS)
    }

    // ---- The other world. From the room only the half beyond the plane is drawn; from inside, all of it.
    const drawWorld = (all: boolean) => {
      gl.disable(gl.CULL_FACE)
      gl.depthMask(false)
      const sk = prog.sky
      gl.useProgram(sk.p)
      gl.uniformMatrix4fv(sk.u.u_ivp, false, iVP)
      gl.uniform3fv(sk.u.u_cam, cam)
      gl.bindVertexArray(emptyVao)
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      blendOn()
      gl.useProgram(prog.star.p)
      gl.uniformMatrix4fv(prog.star.u.u_vp, false, VP)
      gl.uniform3fv(prog.star.u.u_cam, cam)
      gl.uniform1f(prog.star.u.u_t, t)
      gl.uniform1f(prog.star.u.u_dpr, dpr)
      drawMesh(stars, gl.POINTS)
      const sp = prog.sprite
      gl.useProgram(sp.p)
      gl.uniformMatrix4fv(sp.u.u_vp, false, VP)
      gl.uniform3fv(sp.u.u_right, right)
      gl.uniform3fv(sp.u.u_up, up)
      const sprite = (c: V3, size: number, col: V3, pow: number) => {
        gl.uniform3fv(sp.u.u_center, c)
        gl.uniform1f(sp.u.u_size, size)
        gl.uniform3fv(sp.u.u_col, col)
        gl.uniform1f(sp.u.u_pow, pow)
        drawMesh(spriteQuad, gl.TRIANGLE_STRIP)
      }
      sprite(sunPos, 620, [0.5, 0.36, 0.22], 2.4)
      sprite(PC, PR * 2.5, [0.34, 0.15, 0.25], 2.2)
      blendOff()

      // The planet and its rings sit behind the dunes.
      gl.useProgram(prog.planet.p)
      gl.uniformMatrix4fv(prog.planet.u.u_vp, false, VP)
      gl.uniformMatrix4fv(prog.planet.u.u_model, false, planetM)
      gl.uniform3fv(prog.planet.u.u_view, normalize([cam[0] - PC[0], cam[1] - PC[1], cam[2] - PC[2]]))
      drawMesh(planet)
      blendOn()
      gl.useProgram(prog.ring.p)
      gl.uniformMatrix4fv(prog.ring.u.u_vp, false, VP)
      gl.uniformMatrix4fv(prog.ring.u.u_model, false, planetM)
      gl.uniform1f(prog.ring.u.u_pr, PR)
      drawMesh(ring, gl.TRIANGLE_STRIP)
      blendOff()

      const du = prog.dune
      gl.useProgram(du.p)
      gl.uniformMatrix4fv(du.u.u_vp, false, VP)
      gl.uniform3fv(du.u.u_cam, cam)
      gl.bindVertexArray(duneMesh.vao)
      // Behind the plane is the first half of the index list; the half in front follows.
      if (all) gl.drawElements(gl.TRIANGLES, totalCount, gl.UNSIGNED_SHORT, 0)
      else if (camSide >= 0) gl.drawElements(gl.TRIANGLES, backCount, gl.UNSIGNED_SHORT, 0)
      else gl.drawElements(gl.TRIANGLES, totalCount - backCount, gl.UNSIGNED_SHORT, backCount * 2)

      blendOn()
      drawMotes(dustM, 1, t)
      for (const j of JELLIES) {
        if (!all) {
          const beyond = camSide >= 0 ? j.p[2] < P + j.r : j.p[2] > P - j.r
          if (!beyond) continue
        }
        drawJelly(j, j.p, all ? 0 : camSide >= 0 ? -1 : 1)
      }
      // The one that gets out is on this side of the plane until it swims through.
      if (open > 0.05) drawJelly(outJelly, outPos(s.sinceOpen), all ? -1 : camSide >= 0 ? -1 : 0)
      blendOff()
    }

    // ---- What belongs to the room: shadows on the floor, the spilling light, spores, and the jellyfish once it's out.
    const drawRoom = () => {
      blendOn()
      gl.disable(gl.CULL_FACE)
      gl.useProgram(prog.fx.p)
      gl.uniformMatrix4fv(prog.fx.u.u_vp, false, VP)
      const k = Math.min(1, s.pop)
      fxQuadAt(1, 1.5, 0.08, 2.2 * k, 0.95 * k, 1)
      fxQuadAt(0, 0, 0.17, 1.2 * k, 0.56 * k, 1)
      if (open > 0) {
        gl.useProgram(prog.fx.p)
        fxQuadAt(2, 0, 1.1, 1.3, 1.3, open)
        drawMotes(sporeM, 0, t * 0.9)
        drawJelly(outJelly, outPos(s.sinceOpen), 1)
      }
      if (s.burst >= 0) drawMotes(burstM, 2, s.burst)
      gl.enable(gl.CULL_FACE)
      blendOff()
    }

    const drawVeil = () => {
      if (open <= 0) return
      blendOn()
      gl.disable(gl.CULL_FACE)
      const ve = prog.veil
      gl.useProgram(ve.p)
      gl.uniformMatrix4fv(ve.u.u_vp, false, VP)
      gl.uniform1f(ve.u.u_open, open)
      gl.uniform1f(ve.u.u_t, t)
      gl.uniform1f(ve.u.u_a, smooth(0.15, 0.9, Math.abs(camSide)))
      drawMesh(openMesh, gl.TRIANGLE_FAN)
      gl.enable(gl.CULL_FACE)
      blendOff()
    }

    gl.enable(gl.CULL_FACE)
    drawArch()
    if (open > 0) writeStencil()

    if (!s.inside) {
      if (open > 0) {
        gl.stencilFunc(gl.EQUAL, 1, 0xff)
        drawWorld(false)
        gl.disable(gl.STENCIL_TEST)
      }
      drawRoom()
    } else {
      gl.enable(gl.STENCIL_TEST)
      gl.stencilFunc(gl.NOTEQUAL, 1, 0xff)
      drawWorld(true)
      gl.stencilFunc(gl.EQUAL, 1, 0xff)
      drawRoom()
      gl.disable(gl.STENCIL_TEST)
    }
    drawVeil()
    drawReticle()
    gl.bindVertexArray(null)
  }

  return { draw }
}

/** The camera's position in the portal's space. */
export function cameraInPortal(view: ArrayLike<number>, place: ArrayLike<number>): V3 {
  const iV = invert(mul(view, place))
  return [iV[12], iV[13], iV[14]]
}

