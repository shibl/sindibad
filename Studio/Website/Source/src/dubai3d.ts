// Real Dubai, drawn live with WebGL2 from the Blender models in concepts/blender/dubai. How much sky each spot of ground sees
// is baked in Blender; the sun and moon are live, so the city follows the real time of day in Dubai (see dubai-sky.ts). The
// towers rise in the vertex shader, so the whole move can run backwards just by turning time around.
import { skyAt, type Env } from './dubai-sky'
import type { Tour } from './dubai-tours'

const BASE = '/concepts/dubai/'

function hx(s: string): [number, number, number] {
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const n = parseInt(s.slice(1), 16)
  return [lin(((n >> 16) & 255) / 255), lin(((n >> 8) & 255) / 255), lin((n & 255) / 255)]
}
const LL_ = (lat: number, lon: number): [number, number] => [((lon - 55.27436) * Math.cos((25.19716 * Math.PI) / 180) * 111320) / 100, ((lat - 25.19716) * 110574) / 100]
const glc = ([r, g, b]: [number, number, number]) => `vec3(${r.toFixed(5)},${g.toFixed(5)},${b.toFixed(5)})`
const ss = (x: number) => { x = Math.max(0, Math.min(1, x)); return x * x * x * (x * (6 * x - 15) + 10) }
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const rad = (d: number) => (d * Math.PI) / 180

const COMMON = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
precision highp sampler2DShadow;
uniform mat4 u_vp, u_lvp;
uniform vec3 u_eye, u_L, u_light, u_amb, u_sky, u_zen, u_glow, u_sunDir;
uniform float u_t, u_time, u_haze, u_night;
#define L u_L
#define SUN u_light
#define AMB u_amb
#define SKY u_sky
#define ZENITH u_zen
#define OPEN (SUN * L.z + AMB)
const vec2 MER = vec2(-18.3, 33.7);      // La Mer's beach, whose low-rise buildings get their own paint and height
float outBack(float x, float o) { x = clamp(x, 0., 1.) - 1.; return 1. + (o + 1.) * x * x * x + o * x * x; }
vec3 srgb(vec3 c) { c = clamp(c, 0., 1.); return mix(12.92 * c, 1.055 * pow(c, vec3(1. / 2.4)) - .055, step(.0031308, c)); }
// The colour of the air looking a given way: warmer toward a low sun.
vec3 air(vec3 d) {
  vec3 n = normalize(d);
  float g = max(dot(normalize(n.xy + 1e-5), normalize(u_sunDir.xy + 1e-5)), 0.);
  // After dark the city's own light hangs low in the air, over land and sea alike.
  return SKY + u_glow * (g * g * g * g * .8 + g * .2) + u_night * vec3(.044, .03, .04) * exp(-abs(n.z) * 20.);
}
vec3 haze(vec3 c, vec3 P) { vec3 d = P - u_eye; return mix(c, air(d), 1. - exp(-pow(length(d) / (260. * u_haze), 1.6))); }
`
const LIGHT = /* glsl */ `
uniform sampler2D u_ao;
uniform sampler2DShadow u_sdw;
uniform vec4 u_bake;
// How much sky each spot of ground can see, baked in Blender with every tower standing. It sweeps in with the rising towers.
float aoAt(vec2 xy) {
  vec2 uv = vec2((xy.x - u_bake.x) / u_bake.z, 1. - (xy.y - u_bake.y) / u_bake.z);
  if (uv.x < 0. || uv.y < 0. || uv.x > 1. || uv.y > 1.) return 1.;
  float r = smoothstep(.25, 1., (u_t - (.55 + min(length(xy) / 62., 1.) * 1.25)) / .85);
  return mix(1., texture(u_ao, uv).r, r);
}
float sunSeen(vec3 P, vec3 N) {
  vec4 q = u_lvp * vec4(P + N * .035, 1.);
  vec3 c = q.xyz * .5 + .5;
  if (c.x < 0. || c.y < 0. || c.x > 1. || c.y > 1.) return 1.;
  // Four rotated taps, each filtered by the hardware, soften the edge for a fraction of the cost of many.
  float z = c.z - .00015, r = .00027, q2 = r * .38;
  return (texture(u_sdw, vec3(c.x + r, c.y + q2, z)) + texture(u_sdw, vec3(c.x - r, c.y - q2, z)) +
    texture(u_sdw, vec3(c.x - q2, c.y + r, z)) + texture(u_sdw, vec3(c.x + q2, c.y - r, z))) * .25;
}
float sunOn() { return step(.004, SUN.r + SUN.g + SUN.b); }
// Sky light plus the sun or moon, whichever is up, with live shadows from the towers.
vec3 groundLight(vec3 P) {
  float d = length(P - u_eye), seen = 1.;
  if (sunOn() > 0. && d < 90.) seen = mix(sunSeen(P, vec3(0, 0, 1)), 1., smoothstep(70., 90., d));
  return AMB * aoAt(P.xy) + SUN * L.z * seen;
}
`

const FLAT_VS = /* glsl */ `${COMMON}
uniform vec4 u_b;
in vec2 a_p;
out vec3 v_P;
out float v_side;
void main() { v_P = vec3(mix(u_b.xy, u_b.zw, a_p), 0.); v_side = (gl_VertexID & 1) == 0 ? 1. : -1.; gl_Position = u_vp * vec4(v_P, 1.); }`

// The fountain: how high each jet stands right now. In the city view it just plays; on its own tour it puts on a show,
// moving through waves along the line, swells from the middle, and alternating bursts.
const JET_AT: [number, number] = [1.35, -2.05], JET_TURN = rad(12)
const JET_K = /* glsl */ `
uniform float u_show;
const vec2 JET_AT = vec2(${JET_AT[0].toFixed(3)}, ${JET_AT[1].toFixed(3)});
const vec2 JET_N = vec2(${(-Math.sin(JET_TURN)).toFixed(5)}, ${Math.cos(JET_TURN).toFixed(5)});
float jetK(vec3 i) {
  float T = u_time, q = dot(i.xy - JET_AT, vec2(JET_N.y, -JET_N.x));
  float a = pow(sin(q * 3.4 - T * 1.9) * .5 + .5, 2.);
  float b = pow(sin(T * 1.25) * .5 + .5, 1.5) * (1. - min(abs(q) / 1.5, 1.) * .78);
  float c = step(.5, fract(q * 2.2 + floor(T * .9) * .5)) * (.55 + .45 * sin(T * 2.2));
  float m = mod(floor(T / 7.), 3.);
  float pick = m < 1. ? a : m < 2. ? b : c;
  return smoothstep(3., 3.6, u_t) * mix((.3 + .7 * a) * .8, .22 + pick * .85, u_show) * mix(1., 1.75, u_show);
}
`

const GROUND_FS = /* glsl */ `${COMMON}${LIGHT}${JET_K}
uniform int u_mode;
uniform float u_surf, u_deep;
uniform sampler2D u_noise, u_coast;
uniform vec3 u_moonDir;
uniform float u_moonLit, u_moonUp;
in vec3 v_P;
in float v_side;
out vec4 o;
const vec3 W0 = ${glc(hx('#6cc4f3'))}, W1 = ${glc(hx('#86d3f8'))};
const vec3 D0 = ${glc(hx('#1d7fcb'))}, D1 = ${glc(hx('#2c97db'))};
void main() {
  vec2 xy = v_P.xy;
  vec3 c;
  if (u_mode == 3) {
    float d = length(v_P - u_eye);
    float swell = smoothstep(.3, .7, texture(u_noise, xy / 178.).r);
    vec3 base = mix(mix(W0, W1, swell), mix(D0, D1, swell), u_deep);
    // Near the shore the sea turns to pale turquoise shallows, baked from the real coastline, with surf rolling in.
    vec2 cuv = vec2((xy.x + 190.) / 300., 1. - (xy.y + 120.) / 300.);
    float shore = (cuv.x < 0. || cuv.y < 0. || cuv.x > 1. || cuv.y > 1.) ? 0. : texture(u_coast, cuv).r;
    shore *= smoothstep(0., .012, min(min(cuv.x, cuv.y), min(1. - cuv.x, 1. - cuv.y)));
    base = mix(base, mix(${glc(hx('#8fe6df'))}, ${glc(hx('#55d9cf'))}, u_deep), smoothstep(.05, .6, shore) * .9);
    // Moving ripples catch the sky and the sun. They fade out with distance, before they could shimmer.
    float fade = exp(-d / 55.);
    vec3 N = vec3(0, 0, 1);
    vec2 flow = vec2(u_time * .35, u_time * .22);
    if (fade > .02) {
      vec2 a = texture(u_noise, (xy * 9. + flow) / 8.).gb * 2. - 1.;
      vec2 b = texture(u_noise, (xy * 20.7 - flow * 1.4) / 8.).gb * 2. - 1.;
      N = normalize(vec3((a + b * .6) * .13 * fade, 1.));
    }
    vec3 V = normalize(u_eye - v_P);
    float fres = pow(1. - max(dot(N, V), 0.), 5.);
    vec3 sunAndSky = groundLight(v_P);
    c = base * sunAndSky;
    // Out at sea after dark there are no city lights to see by, so the moon does more: shallows glow a soft teal round the islands.
    c += base * u_deep * u_night * vec3(.09, .14, .2) * (1. + 2. * smoothstep(.05, .6, shore));
    c = mix(c, mix(ZENITH, air(-V), .35) * 1.12, fres * .55 + .05);
    // The fountain mirrored in the lake: each spot of water looks along its reflected ray to the wall of jets, ripples and all.
    if (d < 40. && abs(xy.x - JET_AT.x) < 4. && abs(xy.y - JET_AT.y) < 4.) {
      vec3 Rr = reflect(-V, normalize(vec3(N.xy * 2.4, 1.)));
      float across = dot(Rr.xy, JET_N);
      float hit = dot(JET_AT - v_P.xy, JET_N) / (abs(across) < .001 ? .001 : across);
      if (hit > 0.) {
        vec3 H = v_P + Rr * hit;
        float along = dot(H.xy - JET_AT, vec2(JET_N.y, -JET_N.x));
        float tall = (.58 + .22 * abs(sin(along * 2.15 + .7))) * jetK(vec3(H.xy, 0.));
        float a = smoothstep(1.75, .75, abs(along)) * smoothstep(tall, tall * .35, H.z) * step(0., H.z);
        c += mix(OPEN * .34, vec3(1., .86, .62) * .46, u_night) * a * mix(.5, 1., u_show) * pow(1. - V.z, 1.5);
      }
    }
    // After dark the lit shore smears across the water in long wavering columns.
    if (u_night > .01 && fade > .02) {
      vec2 lookW = normalize(v_P.xy - u_eye.xy);
      float angW = atan(lookW.y, lookW.x);
      float lightsW = smoothstep(.5, .72, texture(u_noise, vec2(angW * 7.3, 9. / d + u_time * .012)).r);
      float tone = texture(u_noise, vec2(angW * 2.1, .4)).r;
      float breakUp = .55 + .9 * length(N.xy) / max(.13 * fade, .01);
      c += mix(vec3(1., .74, .46), vec3(.62, .78, 1.), smoothstep(.42, .6, tone)) * lightsW * breakUp * exp(-V.z * 9.) * u_night * .3 * smoothstep(.0, .35, shore + (1. - u_surf));
    }
    if (u_surf > 0. && shore > .25) {
      // Thin lines of foam close in along the waterline, broken up, each creeping toward the sand.
      float wob = texture(u_noise, xy / 6.5).r * 3.;
      float wave = sin(shore * 62. - u_time * .85 + wob);
      float crest = smoothstep(.8, .98, wave) * smoothstep(.56, .7, shore);
      crest *= smoothstep(.34, .6, texture(u_noise, xy / 1.3 + flow * .03).r) * exp(-d / 60.);
      c = mix(c, sunAndSky * vec3(1.02), crest * .8);
    }
    c += SUN * pow(max(dot(reflect(-L, N), V), 0.), 420.) * 2. * fade;
    // A glittering column on the water under a low sun or the moon, breaking into dashes that drift toward us.
    vec2 look = normalize(v_P.xy - u_eye.xy);
    // Coordinates that go as 1/distance keep the dashes evenly spaced up the screen, thinning toward the horizon.
    float ang = atan(look.y, look.x);
    float v1 = texture(u_noise, vec2(ang * 1.3, 120. / d + u_time * .03)).r;
    float v2 = texture(u_noise, vec2(ang * 3.4 + .31, 410. / d - u_time * .05)).r;
    float dash = smoothstep(.4, .62, v1 * .5 + v2 * .5);
    float wide = mix(420., 2600., smoothstep(8., 130., d));
    if (u_sunDir.z > -.05 && u_sunDir.z < .5) {
      float az = pow(max(dot(look, normalize(u_sunDir.xy)), 0.), wide) * exp(-V.z * 7.);
      vec3 tint = u_glow * 1.2 + SUN * .8;
      float k = max(dot(reflect(-u_sunDir, vec3(0, 0, 1)), V), 0.);
      c += tint * (az * (.25 + dash * 1.5) + pow(k, 30.) * .07) * (1. - smoothstep(.22, .5, u_sunDir.z));
    }
    if (u_moonLit > .01 && u_night > .01) {
      float az = pow(max(dot(look, normalize(u_moonDir.xy)), 0.), wide) * exp(-V.z * 8.);
      c += vec3(.66, .72, .86) * az * (.12 + dash * 1.05) * sqrt(u_moonLit) * u_moonUp * u_night;
    }
  } else {
    if (u_mode == 0) c = mix(${glc(hx('#f5efe2'))}, ${glc(hx('#f0e6d2'))}, smoothstep(.32, .68, texture(u_noise, xy / 160.).r));
    else if (u_mode == 1) c = ${glc(hx('#f8eecb'))};
    else c = mix(${glc(hx('#bbe59c'))}, ${glc(hx('#c7ebab'))}, smoothstep(.32, .68, texture(u_noise, xy / 20.).r));
    vec3 paper = c;
    c *= groundLight(v_P);
    c += paper * u_deep * u_night * vec3(.27, .29, .36);      // moonlit sand, on the tours out at sea
    // After dark the city lifts the ground around it with its own light.
    c += u_night * vec3(.075, .045, .022) * exp(-length(xy) / 48.);
  }
  o = vec4(srgb(haze(c, v_P)), 1.);
}`

const ROAD_FS = /* glsl */ `${COMMON}${LIGHT}
uniform vec3 u_c, u_c2, u_emit;
uniform float u_w, u_fill, u_far;
in vec3 v_P;
in float v_side;
out vec4 o;
void main() {
  float w = fwidth(v_side), s = abs(v_side);
  float a = 1. - smoothstep(u_w - w, u_w, s);
  a *= min(1., 2. * u_w / max(w, 1e-3));      // thinner than a pixel: fade, so it can't shimmer
  a *= 1. - smoothstep(u_far * .5, u_far, length(v_P - u_eye));
  if (a < .004) discard;
  vec3 c = mix(u_c, u_c2, smoothstep(u_fill - w, u_fill, s));
  float close = smoothstep(4., 42., length(v_P - u_eye));
  vec3 lamp = u_emit * u_night * mix(.42, 1., close) * (.72 + .28 * smoothstep(.1, .8, s));
  o = vec4(srgb(haze(c * groundLight(v_P) + lamp, v_P)), a);
}`

const BLD_VS = /* glsl */ `${COMMON}
uniform float u_zmax;
uniform vec4 u_b;
in vec2 a_xy;
in float a_z;
in vec3 a_a;
in float a_k;
out vec3 v_P;
out vec3 v_a;
flat out int v_k;
float rise() {
  int k = int(a_k + .5);
  if (k == 2) return outBack((u_t - 1.1) / .9, 1.);
  if (k == 3) return outBack((u_t - 1.) / 1., .8);
  if (k > 3 || a_a.z > .999) return 1.;
  return outBack((u_t - (.55 + a_a.z * 1.255)) / .85, .7);
}
void main() {
  vec2 xy = mix(u_b.xy, u_b.zw, a_xy);
  float z = a_z * u_zmax;
  // La Mer is low-rise: two or three floors of restaurants and shops behind the sand.
  float mer = 1. - smoothstep(6., 10., length(xy - MER));
  if (mer > 0. && a_k < .5) {
    float top = a_a.x * a_a.x * 8.3, want = .09 + .17 * fract(a_a.y * 7.3);
    if (top > want) z *= mix(1., want / top, mer);
  }
  v_P = vec3(xy, z * max(rise(), .0015));
  v_a = a_a;
  v_k = int(a_k + .5);
#ifdef SHADOW
  gl_Position = u_lvp * vec4(v_P, 1.);
#else
  gl_Position = u_vp * vec4(v_P, 1.);
#endif
}`

const BLD_FS = /* glsl */ `${COMMON}${LIGHT}
in vec3 v_P;
in vec3 v_a;
flat in int v_k;
out vec4 o;
const vec3 TINT[5] = vec3[5](${glc(hx('#f1eadc'))}, ${glc(hx('#ebe2d0'))}, ${glc(hx('#efe6d6'))}, ${glc(hx('#e6dcc9'))}, ${glc(hx('#f4eee3'))});
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
// Lit windows. Up close they are real rows of windows, some on and some off; further away they melt into a glow that
// still varies from floor to floor and building to building, so nothing can shimmer.
vec3 windows(vec3 N, float h) {
  float along = v_P.x * N.y - v_P.y * N.x;
  vec2 g = vec2(along / .085, v_P.z / .068);
  vec2 id = floor(g), f = fract(g);
  float seed = floor(v_a.y * 97.);
  float r = hash(id + seed);
  float mask = smoothstep(.1, .2, f.x) * smoothstep(.9, .8, f.x) * smoothstep(.16, .28, f.y) * smoothstep(.84, .72, f.y);
  float px = max(fwidth(g.x), fwidth(g.y));
  float near = 1. - smoothstep(.35, 1.1, px);
  float patchy = hash(floor(vec2(along, v_P.z) / vec2(.42, .3)) + seed);
  float farGlow = .05 + .34 * patchy * patchy;
  float on = step(.6, r) * mask;
  vec3 tone = mix(${glc(hx('#ffc77f'))}, ${glc(hx('#fff0d6'))}, fract(r * 7.3));
  if (fract(r * 13.7) > .86) tone = ${glc(hx('#bcd8ff'))};
  return tone * mix(farGlow, on * 1.25, near) * mix(.55, 1.1, smoothstep(12., 70., h));
}
void main() {
  vec3 V = normalize(u_eye - v_P);
  vec3 N = normalize(cross(dFdx(v_P), dFdy(v_P)));
  if (dot(N, V) < 0.) N = -N;
  float h = v_a.x * v_a.x * 830.;     // metres
  float wall = 1. - smoothstep(.2, .8, N.z);
  float zw = fwidth(v_P.z);
  float mer = (1. - smoothstep(6., 10., length(v_P.xy - MER))) * float(v_k == 0);
  vec3 c;
  float gloss = 0.;
  if (v_k == 0) {
    float tall = smoothstep(45., 130., h);
    c = mix(TINT[int(min(v_a.y * 5., 4.))], ${glc(hx('#e3e5e2'))}, tall);
    float period = .11;
    float band = smoothstep(.2, .7, sin(v_P.z * 6.2832 / period)) * (1. - smoothstep(.2, .55, zw / period));
    c = mix(c, ${glc(hx('#8d9ea8'))}, wall * band * tall * .35);
    gloss = tall * .22;
    if (mer > 0.) {
      // Pale plaster, slatted timber and a few bright fronts, with rows of glazing and a coloured awning over the ground floor.
      float id = fract(v_a.y * 7.3), id2 = fract(v_a.y * 23.7);
      bool timber = id >= .6 && id < .8;
      vec3 paint = id < .4 ? ${glc(hx('#f8f3e8'))} : id < .6 ? ${glc(hx('#f4e4cf'))} : timber ? ${glc(hx('#c39a6e'))} : id < .9 ? ${glc(hx('#c7e6e8'))} : ${glc(hx('#f3c0a8'))};
      float along = v_P.x * N.y - v_P.y * N.x;
      vec2 g = vec2(along / .055, v_P.z / .042);
      float gpx = max(fwidth(g.x), fwidth(g.y)), close = 1. - smoothstep(.1, .34, gpx);
      if (timber) paint *= 1. + (smoothstep(-.3, .3, sin(along * 330.)) - .5) * .28 * (1. - smoothstep(.1, .5, fwidth(along * 52.)));
      vec2 fg = fract(g);
      float pane = smoothstep(.12, .2, fg.x) * smoothstep(.88, .8, fg.x) * smoothstep(.22, .3, fg.y) * smoothstep(.8, .72, fg.y);
      // Further off the panes melt into a soft shade across each floor, so nothing can sparkle.
      float floors = smoothstep(-.2, .5, sin(v_P.z * 149.6)) * (1. - smoothstep(.2, .7, fwidth(v_P.z * 23.8)));
      float glazed = mix(floors * .2, pane * .8, close);
      paint = mix(paint, ${glc(hx('#5f7c8c'))}, glazed * wall * step(.05, v_P.z));
      float awn = smoothstep(.034, .036, v_P.z) * smoothstep(.052, .05, v_P.z) * wall;
      vec3 accent = id2 < .33 ? ${glc(hx('#fa2a6f'))} : id2 < .66 ? ${glc(hx('#ffd166'))} : ${glc(hx('#2fb7d6'))};
      paint = mix(paint, accent, awn);
      paint = mix(paint, ${glc(hx('#f6f3ec'))}, smoothstep(.6, .9, N.z));
      c = mix(c, paint, mer);
    }
  } else if (v_k == 2) { c = ${glc(hx('#d8e4ec'))}; gloss = .6; }
  else if (v_k == 3) { c = ${glc(hx('#eac870'))}; gloss = .5; }
  else if (v_k == 4) { c = ${glc(hx('#f2f4f6'))}; gloss = .2; }
  else { c = ${glc(hx('#e7ebee'))}; gloss = .2; }
  // Walls darken toward the ground by as much as the ground around them is shaded, so towers sit in their surroundings.
  // Roofs look at the open sky, and the bright ground lights every wall from below.
  float low = 1.;
  if (wall > .01 && v_P.z < .8) low = mix(clamp(aoAt(v_P.xy), .5, 1.), 1., smoothstep(0., .8, v_P.z));
  vec3 bounce = OPEN * ${glc(hx('#efe6d4'))} * vec3(1.08, 1., .88) * .84;
  vec3 amb = AMB * (.5 + .5 * N.z) + bounce * (.5 - .5 * N.z) * mix(1., low, wall);
  amb *= mix(1., mix(.72, 1., smoothstep(0., .6, v_P.z)), wall);
  // The sky-light map and the darkening toward the ground would together halve the light on these little walls: they stand
  // on open, bright sand and are lit from all round.
  amb = mix(amb, AMB * (.62 + .38 * N.z) + bounce * (.5 - .5 * N.z) + OPEN * .16 * wall, mer);
  float ndl = max(dot(N, L), 0.);
  float dist = length(v_P - u_eye), seen = 1.;
  if (ndl > 0. && dist < 90. && sunOn() > 0.) seen = mix(sunSeen(v_P, N), 1., smoothstep(70., 90., dist));
  vec3 col = c * (SUN * ndl * seen + amb);
  float fres = pow(1. - max(dot(N, V), 0.), 4.);
  col = mix(col, mix(ZENITH, air(-V), .5) * 1.05, fres * gloss);
  col += SUN * pow(max(dot(reflect(-L, N), V), 0.), 40.) * gloss * .22;
  if (u_night > .01) {
    vec3 glow = vec3(0);
    if (v_k == 0) {
      glow = windows(N, h) * wall;
    } else if (v_k == 2) {
      glow = ${glc(hx('#bfe9ff'))} * (.42 + .22 * sin(v_P.x * 6. + u_time * .7));
    } else if (v_k == 3) {
      glow = ${glc(hx('#ffc35a'))} * .8;
    } else if (v_k == 4) {
      glow = ${glc(hx('#9a8cff'))} * .55;
    } else {
      glow = ${glc(hx('#ff7ab8'))} * .75;
    }
    col += glow * u_night;
  }
  o = vec4(srgb(haze(col, v_P)), 1.);
}`

const BURJ_VS = /* glsl */ `${COMMON}
uniform mat4 u_lvp2;
uniform float u_zmax;
uniform vec4 u_b;
uniform vec3 u_rise;
in vec2 a_xy;
in float a_z;
in float a_s;
in float a_k;
in vec3 a_n;
out vec3 v_P;
out vec3 v_n;
out float v_s;
flat out int v_k;
void main() {
  v_P = vec3(mix(u_b.xy, u_b.zw, a_xy), a_z * u_zmax * max(outBack((u_t - u_rise.x) / u_rise.y, u_rise.z), .0015));
  v_n = a_n;
  v_s = a_s * 2000.;
  v_k = int(a_k + .5);
#if defined(SHADOW2)
  gl_Position = u_lvp2 * vec4(v_P, 1.);
#elif defined(SHADOW)
  gl_Position = u_lvp * vec4(v_P, 1.);
#else
  gl_Position = u_vp * vec4(v_P, 1.);
#endif
}`

// The tower up close: real rows of glass panels and steel spandrels, each panel tilted a hair so reflections break up across
// the facade as they do on a real curtain wall. Further away it all melts into an even silver-blue, so nothing can shimmer.
const BURJ_FS = /* glsl */ `${COMMON}${LIGHT}
uniform sampler2DShadow u_sdw2;
uniform sampler2D u_noise;
uniform mat4 u_lvp2;
in vec3 v_P;
in vec3 v_n;
in float v_s;
flat in int v_k;
out vec4 o;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
// Bright rings round the tower. Each ring is drawn while it's big enough to see, then every second one, every fourth and so
// on, so the stripes hold at any distance without shimmering.
float stripes(float h, float wh) {
  float lod = log2(max(wh * 3.2, 1.)), l0 = floor(lod), p0 = pow(2., l0);
  float s0 = fract(h / p0), a0 = wh / p0, s1 = fract(h / (p0 * 2.)), a1 = a0 * .5;
  float b = mix(smoothstep(.58 - a0, .58 + a0, s0) - smoothstep(1. - a0, 1. + a0, s0),
    smoothstep(.58 - a1, .58 + a1, s1) - smoothstep(1. - a1, 1. + a1, s1), lod - l0);
  return mix(b, .42, smoothstep(3., 5., lod));
}
float seenNear(vec3 P, vec3 N) {
  vec3 c = (u_lvp2 * vec4(P + N * .012, 1.)).xyz * .5 + .5;
  if (c.x < 0. || c.y < 0. || c.x > 1. || c.y > 1.) return 1.;
  float z = c.z - .0007, r = .00042, q2 = r * .38;
  return (texture(u_sdw2, vec3(c.x + r, c.y + q2, z)) + texture(u_sdw2, vec3(c.x - r, c.y - q2, z)) +
    texture(u_sdw2, vec3(c.x - q2, c.y + r, z)) + texture(u_sdw2, vec3(c.x + q2, c.y - r, z))) * .25;
}
vec3 envAt(vec3 R) {
  if (R.z >= 0.) return mix(air(R), ZENITH, smoothstep(0., .32, R.z));
  vec3 ground = OPEN * vec3(.74, .71, .62) + u_night * vec3(.2, .13, .08);
  return mix(air(R), ground, smoothstep(0., -.16, R.z));
}
void main() {
  vec3 V = normalize(u_eye - v_P);
  vec3 N = dot(v_n, v_n) > .04 ? normalize(v_n) : normalize(cross(dFdx(v_P), dFdy(v_P)));
  if (dot(N, V) < 0.) N = -N;
  float ndl = max(dot(N, L), 0.);
  float seen = 1.;
  if (ndl > 0. && sunOn() > 0.) seen = v_k >= 7 || v_P.z < -1. ? sunSeen(v_P, N) : seenNear(v_P, N);
  float wall = 1. - smoothstep(.2, .8, N.z);
  float low = mix(clamp(aoAt(v_P.xy), .55, 1.), 1., smoothstep(0., .5, v_P.z));
  vec3 bounce = OPEN * vec3(.82, .77, .66) * .84;
  vec3 lit = SUN * ndl * seen + (AMB * (.5 + .5 * N.z) + bounce * (.5 - .5 * N.z)) * mix(1., low, wall);
  vec3 R = reflect(-V, N);
  float fresBase = pow(1. - max(dot(N, V), 0.), 4.);
  vec3 col, glow = vec3(0);
  if (v_k == 0) {
    vec2 g = vec2(v_s / 1.9, v_P.z / .0392);
    vec2 w = fwidth(g), id = floor(g), f = fract(g);
    float detail = 1. - smoothstep(.22, .85, max(w.x, w.y));
    vec3 Np = N;
    if (detail > 0.) Np = normalize(N + (vec3(hash(id), hash(id + 7.3), hash(id + 13.1)) - .5) * .035 * detail);
    vec3 Rp = reflect(-V, Np);
    float fres = mix(.28, .66, pow(1. - max(dot(Np, V), 0.), 4.));
    vec3 glass = mix(${glc(hx('#9aaabb'))} * lit * .72, envAt(Rp) * vec3(.72, .78, .86), fres);
    glass += SUN * pow(max(dot(Rp, L), 0.), 260.) * 1.1 * seen;
    vec3 metal = ${glc(hx('#d8e0e7'))} * lit + envAt(Rp) * .32;
    metal += SUN * pow(max(dot(Rp, L), 0.), 14.) * .28 * seen;
    // Up close a floor is a bright spandrel over darker glass. From further off the floors melt into a soft texture on smooth
    // silver, as they do on the real tower, so the lobes are what the eye reads.
    float ringsUp = mix(.16, 1., 1. - smoothstep(.05, .22, w.y));
    float band = stripes(g.y, w.y);
    float mull = (1. - smoothstep(.07, .07 + max(w.x, .02), min(f.x, 1. - f.x))) * (1. - smoothstep(.1, .28, w.x));
    float share = max(mix(.5, band * .74, ringsUp), mull * .6);
    col = mix(glass, metal, share);
    if (u_night > .01) {
      vec2 gw = vec2(v_s / 3.8, v_P.z / .04), idw = floor(gw);
      float r = hash(idw);
      vec3 tone = mix(${glc(hx('#ffd9a3'))}, ${glc(hx('#f6f3e8'))}, fract(r * 7.3));
      // Some lights are on, and the whole face carries a slow wash of cool light climbing upward, like its LED facade.
      glow = tone * mix(.2, step(.68, r) * (1. - share) * 1.05, detail);
      glow += ${glc(hx('#7fb2ff'))} * (.17 + .17 * sin(v_P.z * 1.5 - u_time * .9));
    }
  } else if (v_k == 1) {
    // Mechanical floors: plain louvred metal, a narrow dark belt round the tower.
    float lg = v_s / .95, lw = fwidth(lg);
    float lou = (1. - smoothstep(.18, .18 + max(lw, .03), abs(fract(lg) - .5))) * (1. - smoothstep(.3, .9, lw));
    col = mix(${glc(hx('#8a96a1'))}, ${glc(hx('#707c87'))}, lou * .6) * lit + envAt(R) * (.06 + fresBase * .2);
    glow = ${glc(hx('#34506f'))} * .25;
  } else if (v_k == 2) {
    // The spire: rings of open steelwork and fine ribs running up it, then the bare needle at the very top.
    float az = atan(v_P.y, v_P.x) * 20. / 6.2832;
    vec2 g = vec2(az, v_P.z / .05);
    vec2 w = fwidth(g), f = fract(g);
    float detail = 1. - smoothstep(.25, .9, max(w.x, w.y));
    float needle = smoothstep(7.78, 7.84, v_P.z);
    float ribLine = (1. - smoothstep(.06, .06 + max(w.x, .03), min(f.x, 1. - f.x))) * detail;
    float ring = mix(.66, stripes(g.y, w.y), mix(.1, 1., 1. - smoothstep(.06, .2, w.y))) * (1. - needle);
    float seam =(1. - needle) * max(ribLine * .55, 1. - ring);
    vec3 panel = mix(${glc(hx('#d5dce2'))}, ${glc(hx('#7b8893'))}, seam);
    col = panel * lit + envAt(R) * (.14 + fresBase * .4) * (1. - seam * .6);
    col += SUN * pow(max(dot(R, L), 0.), 90.) * .9 * seen * (1. - seam);
    glow = ${glc(hx('#9fc4ff'))} * (.18 + .08 * sin(v_P.z * 3. - u_time)) * (1. + ring * 1.6);
    glow += vec3(1., .07, .04) * smoothstep(8.1, 8.24, v_P.z) * step(.45, fract(u_time * .55)) * 5.;
  } else if (v_k == 3) {
    col = ${glc(hx('#e9e0cf'))} * lit;
    glow = ${glc(hx('#ffd29a'))} * .16;
  } else if (v_k == 4) {
    col = ${glc(hx('#a9d98d'))} * lit;
  } else if (v_k == 5) {
    col = mix(${glc(hx('#4fc4e6'))} * lit, envAt(R), .2 + fresBase * .5);
    glow = ${glc(hx('#37c6e8'))} * .5;
  } else {
    col = ${glc(hx('#e4e8ea'))} * lit;
    glow = ${glc(hx('#d6e8ff'))} * .4;
  }
  if (v_k < 2) {
    // The valleys between the wings see less sky, which is what separates the lobes from afar.
    // And a lobe's edges turn away towards the darker surroundings, which is what makes it look round.
    float va = mod(atan(v_P.y, v_P.x) - .96, 2.0944);
    float wing = .155 - .085 * pow(max(v_P.z, 0.) / 6., 1.2);
    float valley = smoothstep(.08, .95, min(va, 2.0944 - va) * length(v_P.xy) / wing);
    col *= mix(.38, 1., valley) * mix(.46, 1., pow(max(dot(N, V), 0.), .8));
    // A bright streak runs down each lobe, where its curve turns the sun toward the viewer, over a softer one from the open sky.
    vec2 Vh = normalize(V.xy + 1e-5), Lh = normalize(L.xy + 1e-5), Hh = normalize(Lh + Vh + 1e-5);
    float sunSide = smoothstep(0., .25, dot(N.xy, Lh));
    col += (SUN * seen * sunSide * .42 * pow(max(dot(N.xy, Hh), 0.), 36.) + OPEN * .16 * pow(max(dot(N.xy, Vh), 0.), 5.)) * valley * step(N.z, .5);
  }
  col += glow * u_night;
  o = vec4(srgb(haze(col, v_P)), 1.);
}`

// The Museum of the Future. Satin steel panels with its windows cut in flowing Arabic script, a dark glass by day and traced in
// light at night, as on the real building. It stands on a green hill over a white plinth.
const MUS_VS = /* glsl */ `${COMMON}
uniform float u_zmax;
uniform vec4 u_b;
uniform vec3 u_rise;
in vec2 a_xy;
in float a_z;
in float a_s;
in float a_k;
in vec3 a_n;
in float a_t;
out vec3 v_P;
out vec3 v_n;
out vec2 v_uv;
flat out int v_k;
void main() {
  v_P = vec3(mix(u_b.xy, u_b.zw, a_xy), a_z * u_zmax * max(outBack((u_t - u_rise.x) / u_rise.y, u_rise.z), .0015));
  v_n = a_n;
  v_uv = vec2(a_s, a_t);
  v_k = int(a_k + .5);
  gl_Position = u_vp * vec4(v_P, 1.);
}`
const MUS_FS = /* glsl */ `${COMMON}${LIGHT}
uniform sampler2D u_noise, u_script;
in vec3 v_P;
in vec3 v_n;
in vec2 v_uv;
flat in int v_k;
out vec4 o;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec3 envAt(vec3 R) {
  if (R.z >= 0.) return mix(air(R), ZENITH, smoothstep(0., .32, R.z));
  vec3 ground = OPEN * vec3(.74, .71, .62) + u_night * vec3(.2, .13, .08);
  return mix(air(R), ground, smoothstep(0., -.16, R.z));
}
void main() {
  vec3 V = normalize(u_eye - v_P);
  vec3 N = normalize(v_n);
  if (dot(N, V) < 0.) N = -N;
  float ndl = max(dot(N, L), 0.);
  float seen = ndl > 0. && sunOn() > 0. ? sunSeen(v_P, N) : 1.;
  vec3 lit = SUN * ndl * seen + AMB * (.55 + .45 * N.z) + OPEN * vec3(.8, .75, .62) * .62 * (.5 - .5 * N.z);
  vec3 col, glow = vec3(0);
  if (v_k == 7) {
    // The surface comes in four patches, one for each half of the loop on each face, every one turned so its script stands
    // upright and reads the right way round from where you'd see it.
    float su = v_uv.x * 2., sv = v_uv.y * 2.;
    bool top = su < 1., nw = sv < 1.;
    float a = fract(su), b = fract(sv);
    vec2 pu = nw == top ? vec2(a, b) : vec2(1. - a, 1. - b);
    vec2 uv = (pu + vec2(top ? 0. : 1., nw ? 0. : 1.)) * .5;
    vec2 dx = dFdx(v_uv), dy = dFdy(v_uv);
    float r = textureGrad(u_script, uv, dx, dy).r;
    float px = max(length(dx * vec2(4096., 1600.)), length(dy * vec2(4096., 1600.)));
    float far = smoothstep(2.5, 9., px);
    float w = max(fwidth(r), .002);
    if (px > 40.) w = .002;
    float rim = smoothstep(0., .018, min(a, 1. - a)) * smoothstep(0., .03, min(b, 1. - b));
    float hard = smoothstep(.33 - w, .33 + w, r);
    float stroke = mix(hard, min(r * 1.5, 1.), far) * rim;
    float line = (1. - smoothstep(.0, w * 1.2 + .05, abs(r - .33))) * (1. - far) * rim;
    // Steel panels, each set a hair differently so the light breaks across them.
    vec2 m = vec2(a * 125.5, b * 54.) / vec2(3.4, 2.8);
    vec2 pid = floor(m) + vec2(top ? 0. : 200., nw ? 0. : 100.), pf = fract(m);
    vec2 pw = fwidth(m);
    float near = 1. - smoothstep(.15, .6, max(pw.x, pw.y));
    vec3 Np = N;
    if (near > 0.) Np = normalize(N + (vec3(hash(pid), hash(pid + 7.3), hash(pid + 13.1)) - .5) * .05 * near);
    vec3 Rp = reflect(-V, Np);
    float fres = pow(1. - max(dot(Np, V), 0.), 4.);
    float seam = near * (1. - smoothstep(.0, max(pw.x, .02) * 1.5, min(pf.x, 1. - pf.x)) * smoothstep(.0, max(pw.y, .02) * 1.5, min(pf.y, 1. - pf.y)));
    float tone = 1. + (hash(pid + 3.1) - .5) * .09 * near;
    // Polished steel mirrors the dark line of the buildings round the horizon, which is what makes it read as metal.
    vec3 steel = ${glc(hx('#a8afb5'))} * lit * .78 * tone + envAt(Rp) * (.24 + fres * .6) * (1. - .55 * exp(-Rp.z * Rp.z * 26.));
    steel += SUN * pow(max(dot(Rp, L), 0.), 34.) * .5 * seen;
    steel *= 1. - seam * .07;
    vec3 Rw = reflect(-V, N);
    float fw = pow(1. - max(dot(N, V), 0.), 3.);
    vec3 win = ${glc(hx('#101b28'))} * lit + envAt(Rw) * (.07 + fw * .22);
    win += SUN * pow(max(dot(Rw, L), 0.), 300.) * 1.2 * seen;
    col = mix(steel, win, stroke);
    col = mix(col, ${glc(hx('#f2f5f6'))} * lit, line * .35);
    // Night: floodlit warm from below, with each letter of the script outlined in white.
    float wash = .05 + .13 * smoothstep(.75, .1, v_P.z) + .07 * (.5 - .5 * N.z);
    glow = ${glc(hx('#c9b892'))} * wash * (1. - stroke);
    glow += ${glc(hx('#fff4de'))} * (line * 3.2 + far * r * .85) * rim;
    glow += ${glc(hx('#ffdca8'))} * stroke * (1. - far) * .07;
  } else if (v_k == 4) {
    float n = texture(u_noise, v_P.xy * .9).r, n2 = texture(u_noise, v_P.xy * 5.3).r;
    col = mix(${glc(hx('#7fc06c'))}, ${glc(hx('#a7d98a'))}, smoothstep(.3, .7, n));
    col *= .86 + .28 * n2;
    col *= lit;
    glow = ${glc(hx('#5c8f54'))} * .14;
  } else {
    // The plinth: a flowing white band over a strip of glazing.
    float glass = smoothstep(.178, .172, v_P.z);
    col = mix(${glc(hx('#f3f1ea'))} * lit, ${glc(hx('#2b3b4c'))} * lit + envAt(reflect(-V, N)) * .3, glass);
    glow = mix(${glc(hx('#f2d9b0'))} * .34, ${glc(hx('#ffe8c4'))} * 1.3, glass);
  }
  col += glow * u_night;
  o = vec4(srgb(haze(col, v_P)), 1.);
}`

// Palms, umbrellas, beach huts and boats on the real shore.
const PROP_VS = /* glsl */ `${COMMON}
uniform vec4 u_b;
in vec3 a_v;
in float a_c;
in vec2 a_xy;
in vec4 a_a;
out vec3 v_P;
flat out vec3 v_col;
flat out float v_lit;
const vec3 PAL[7] = vec3[7](${glc(hx('#fa2a6f'))}, ${glc(hx('#ffd166'))}, ${glc(hx('#2fb7d6'))}, ${glc(hx('#ffffff'))}, ${glc(hx('#ff8a5c'))}, ${glc(hx('#7ad9a8'))}, ${glc(hx('#4f6bed'))});
const vec3 FIXED[8] = vec3[8](vec3(1), ${glc(hx('#8b6b4a'))}, ${glc(hx('#6dbd5f'))}, ${glc(hx('#88cc6c'))}, ${glc(hx('#f6f6f2'))}, ${glc(hx('#9a7450'))}, ${glc(hx('#7d8488'))}, ${glc(hx('#1d2a38'))});
void main() {
  float ang = a_a.x * 6.2832, s = a_a.y * 3. * 1.5;
  vec3 p = a_v * s * .01;
  float h = a_v.z / 12.;
  vec2 xy = mix(u_b.xy, u_b.zw, a_xy);
  p.xy += sin(u_time * 1.15 + xy * 37.) * .004 * h * h;
  float cs = cos(ang), sn = sin(ang);
  v_P = vec3(xy + vec2(p.x * cs - p.y * sn, p.x * sn + p.y * cs), p.z * max(outBack((u_t - 2.2) / .7, 1.4), .0));
  int c = int(a_c + .5);
  v_col = c == 0 ? PAL[int(a_a.z * 255. + .5) % 7] : FIXED[c];
  v_lit = c == 0 ? 1. : 0.;
  gl_Position = u_vp * vec4(v_P, 1.);
}`

const PROP_FS = /* glsl */ `${COMMON}
in vec3 v_P;
flat in vec3 v_col;
flat in float v_lit;
out vec4 o;
void main() {
  vec3 N = normalize(cross(dFdx(v_P), dFdy(v_P)));
  if (dot(N, u_eye - v_P) < 0.) N = -N;
  vec3 col = v_col * (SUN * max(dot(N, L), 0.) + AMB * (.62 + .38 * N.z) + OPEN * vec3(.28, .26, .2) * (.5 - .5 * N.z));
  col += v_col * v_lit * u_night * .28;
  o = vec4(srgb(haze(col, v_P)), 1.);
}`

// Soft mist: a veil drifting off the top of each jet, and a low plume where it leaves the water.
const SPRAY_VS = /* glsl */ `${COMMON}${JET_K}
uniform vec3 u_right, u_up;
uniform float u_at;
in vec2 a_q;
in vec3 a_i;
out vec3 v_P;
out vec2 v_q;
out vec2 v_n;
out float v_a;
void main() {
  float h = a_i.z * jetK(a_i);
  float r = u_at > .5 ? .05 + h * .28 : .05 + h * .13;
  float T = u_time, seed = fract(a_i.x * 17.3 + a_i.y * 7.1);
  vec2 drift = vec2(sin(T * .31 + seed * 6.) * .05 + .04, cos(T * .23 + seed * 9.) * .03) * h;
  vec3 at = vec3(a_i.xy + drift * u_at, h * u_at * .92 + r * (1. - u_at) * .5 + .01);
  v_P = at + (u_right * a_q.x + u_up * a_q.y) * r;
  v_q = a_q;
  v_n = a_q * .13 + seed * 7.;
  // It thins out as the camera comes close, so flying through it doesn't white out the picture.
  vec3 toEye = u_eye - at;
  float eyeD = length(toEye);
  float broadside = abs(dot(normalize(toEye.xy + 1e-4), JET_N));
  v_a = smoothstep(.02, .22, h) * (u_at > .5 ? .03 : .085) * smoothstep(.2, 1.5, eyeD) * mix(.5, 1., u_night);
  v_a *= mix(.3, 1., broadside) * (1. - smoothstep(.2, .8, toEye.z / max(eyeD, .001)) * .8);
  gl_Position = u_vp * vec4(v_P, 1.);
}`
const SPRAY_FS = /* glsl */ `${COMMON}
uniform sampler2D u_noise;
in vec3 v_P;
in vec2 v_q;
in vec2 v_n;
in float v_a;
out vec4 o;
const vec3 WARM = vec3(1., .84, .56);
void main() {
  float a = smoothstep(1., .1, length(v_q));
  a *= .55 + .9 * texture(u_noise, v_n + u_time * .025).r;
  a *= v_a;
  vec3 c = srgb(haze(mix(min(OPEN, vec3(1)) * .98, WARM * .72, u_night), v_P));
  o = vec4(c * a, a);
}`

const SHADOW_FS = /* glsl */ `#version 300 es
precision highp float;
void main() {}`

const TREE_VS = /* glsl */ `${COMMON}
uniform vec4 u_b;
in vec3 a_v;
in vec2 a_xy;
in vec4 a_a;
out vec3 v_P;
out vec3 v_N;
out float v_tone;
out float v_up;
void main() {
  vec2 xy = mix(u_b.xy, u_b.zw, a_xy);
  float pop = outBack((u_t - (1.5 + a_a.w * 1.105)) / .6, 1.6);
  float s = a_a.x * .2, z = a_a.y * .4;
  vec3 p = vec3(a_v.xy * s, (a_v.z + 1.) * z) * max(pop, 0.);
  p.xy += sin(u_time * 1.1 + xy * 2.3) * .006 * (a_v.z + 1.);
  v_P = vec3(xy, 0.) + p;
  v_N = normalize(a_v + vec3(0, 0, .15));
  v_tone = a_a.z;
  v_up = (a_v.z + 1.) * .5;
  gl_Position = u_vp * vec4(v_P, 1.);
}`

const TREE_FS = /* glsl */ `${COMMON}${LIGHT}
in vec3 v_P;
in vec3 v_N;
in float v_tone;
in float v_up;
out vec4 o;
void main() {
  vec3 N = normalize(v_N);
  vec3 c = mix(${glc(hx('#a2d28e'))}, ${glc(hx('#bbe0a2'))}, v_tone);
  float ao = mix(.62, 1., smoothstep(0., .7, v_up));
  vec3 amb = (AMB * (.5 + .5 * N.z) + OPEN * ${glc(hx('#c9dcae'))} * .85 * (.5 - .5 * N.z)) * ao;
  // One shadow lookup is plenty for something this small.
  float seen = 1.;
  if (sunOn() > 0. && length(v_P - u_eye) < 90.) {
    vec3 q = (u_lvp * vec4(v_P + L * .05, 1.)).xyz * .5 + .5;
    seen = texture(u_sdw, vec3(q.xy, q.z - .00015));
  }
  vec3 col = c * (SUN * max(dot(N, L), 0.) * seen + amb);
  o = vec4(srgb(haze(col, v_P)), 1.);
}`

const CAR_VS = /* glsl */ `${COMMON}
uniform sampler2D u_routes;
in vec3 a_v;
in vec4 a_i;      // route, offset, signed speed, lane
in vec2 a_i2;     // length, colour
out vec3 v_P;
out float v_long;
out float v_tall;
flat out float v_c;
flat out float v_face;
void main() {
  float len = a_i2.x - 2.;
  float q = mod(a_i.y + u_time * a_i.z, len);
  if (q < 0.) q += len;
  int i = int(q);
  float f = q - float(i);
  int r = int(a_i.x);
  vec2 A = texelFetch(u_routes, ivec2(i, r), 0).xy, B = texelFetch(u_routes, ivec2(i + 1, r), 0).xy;
  vec2 d = normalize(B - A + 1e-5);
  vec2 n = vec2(-d.y, d.x);
  float end = smoothstep(0., 5., q) * smoothstep(0., 5., len - q);
  float sc = end * smoothstep(3.2, 3.8, u_t) * (1. + u_night * .35);
  vec2 xy = mix(A, B, f) + n * a_i.w;
  v_P = vec3(xy + d * a_v.x * .17 * sc + n * a_v.y * .075 * sc, (a_v.z * .055 + .002) * sc);
  v_c = a_i2.y;
  v_long = a_v.x;
  v_tall = a_v.z;
  v_face = dot(d * sign(a_i.z), u_eye.xy - xy);     // coming toward us we see headlights, going away tail lights
  gl_Position = u_vp * vec4(v_P, 1.);
}`

const CAR_FS = /* glsl */ `${COMMON}
in vec3 v_P;
in float v_long;
in float v_tall;
flat in float v_c;
flat in float v_face;
out vec4 o;
const vec3 CARS[6] = vec3[6](vec3(.94), vec3(.88), ${glc(hx('#e8505b'))}, ${glc(hx('#34404a'))}, ${glc(hx('#f4c95d'))}, ${glc(hx('#5f7486'))});
void main() {
  vec3 N = normalize(cross(dFdx(v_P), dFdy(v_P)));
  if (dot(N, u_eye - v_P) < 0.) N = -N;
  vec3 col = CARS[int(v_c) % 6] * (SUN * max(dot(N, L), 0.) + AMB * (.6 + .4 * N.z));
  vec3 lamp = v_face > 0. ? vec3(1., .93, .74) * 1.5 : vec3(1., .13, .08) * 1.15;
  // From afar a car at night is just its lights. Close up it's a dark body with a pair of lamps at the end facing us.
  float near = smoothstep(9., 2.5, length(v_P - u_eye));
  float ends = smoothstep(.72, .86, abs(v_long)) * smoothstep(.2, .45, v_tall);
  o = vec4(srgb(haze(mix(col, mix(lamp, col + lamp * ends, near), u_night), v_P)), 1.);
}`

const JET_VS = /* glsl */ `${COMMON}${JET_K}
in vec2 a_v;      // across -1 to 1, up the jet 0 to 1
in vec3 a_i;
out vec3 v_P;
out vec2 v_q;
out float v_seed;
out float v_h;
out float v_near;
out float v_glow;
// Each jet is a ribbon turned to face the camera: it climbs, slows, leans into the show's sway and frays into mist at the top.
void main() {
  float h = a_i.z * jetK(a_i), t = a_v.y;
  float seed = fract(a_i.x * 17.3 + a_i.y * 7.1);
  float sway = sin(u_time * 1.05 + a_i.x * 2.6 + seed) * mix(.05, .3, u_show) + (seed - .5) * .1;
  vec2 lean = vec2(.95, .3) * sway * h * t * t;
  vec3 p = vec3(a_i.xy + lean, h * t * (1.22 - .22 * t) + .008);
  vec3 axis = normalize(vec3(vec2(.95, .3) * sway * 2. * t, 1.));
  vec3 across = cross(axis, normalize(u_eye - p));
  across /= max(length(across), .05);
  float dist = length(p - u_eye);
  // Up close the ribbons slim down, so they stay separate streaks of water rather than sheets across the whole picture.
  float w = (.004 + h * (.007 + .008 * t + .05 * t * t * t)) * mix(.4, 1., smoothstep(.35, 2.2, dist));
  v_P = p + across * a_v.x * w;
  v_q = a_v;
  v_seed = seed;
  v_h = h;
  // Each ribbon thins where it would pile up on its neighbours: looking along the line of jets or down on it, and close to the
  // camera. So the wall never adds up to a solid mass, and the sky and city keep showing through.
  vec3 view = (u_eye - p) / max(dist, .001);
  float broadside = abs(dot(normalize(view.xy + 1e-4), JET_N));
  v_near = smoothstep(.1, 1.15, dist) * mix(.3, 1., broadside) * (1. - smoothstep(.2, .8, view.z) * .78);
  v_glow = smoothstep(2., 5., dist);
  gl_Position = u_vp * vec4(v_P, 1.);
}`

const JET_FS = /* glsl */ `${COMMON}
uniform sampler2D u_noise;
in vec3 v_P;
in vec2 v_q;
in float v_seed;
in float v_h;
in float v_near;
in float v_glow;
out vec4 o;
const vec3 WARM = vec3(1., .85, .58);
void main() {
  float s = v_q.x, t = v_q.y, T = u_time;
  float n1 = texture(u_noise, vec2(s * .05 + v_seed, t * .1 - T * .11)).r;
  float n2 = texture(u_noise, vec2(s * .13 + v_seed * 3., t * .3 * (.4 + v_h) - T * .26)).r;
  float streak = smoothstep(.34, .66, n1 * .55 + n2 * .6);
  // Fine droplets flying off the upper part of each jet.
  float drops = smoothstep(.6, .68, texture(u_noise, vec2(s * .4 + v_seed * 9., t * 1.7 * (.4 + v_h) - T * .42)).r) * smoothstep(.25, .7, t);
  float a = (1. - s * s) * smoothstep(0., .02, t) * smoothstep(1., .55, t);
  a *= mix(.7, streak * .62 + drops * .4, smoothstep(.04, .5, t));
  a *= smoothstep(.0, .22, v_h) * v_near;
  // Lit from the water by floodlights: brightest at the foot, fading as it rises. By day, white water with a grey-blue shade.
  // Mostly ordinary "over" blending, not adding: however many ribbons stack up, the wall stays this colour instead of going
  // white. Only from further off does it add a little, which gives the whole show its glow.
  vec3 night = WARM * mix(.95, .52, smoothstep(0., .75, t)) + WARM * drops * .2;
  vec3 day = min(OPEN, vec3(1)) * mix(vec3(.74, .8, .86), vec3(1.), streak * .9 + .1);
  vec3 c = srgb(haze(mix(day, night, u_night), v_P));
  o = vec4(c * a, a * (1. - u_night * v_glow * .4));
}`

const SKY_VS = /* glsl */ `${COMMON}
uniform mat4 u_ivp;
out vec3 v_d;
void main() {
  vec2 p = vec2((gl_VertexID & 1) * 4 - 1, (gl_VertexID & 2) * 2 - 1);
  vec4 w = u_ivp * vec4(p, 1., 1.);
  v_d = w.xyz / w.w - u_eye;
  gl_Position = vec4(p, 1., 1.);
}`

const SKY_FS = /* glsl */ `${COMMON}
uniform sampler2D u_noise, u_moonTex;
uniform vec3 u_moonDir;
uniform vec2 u_moonLimb, u_moonPos, u_sunPos;
uniform float u_moonLit, u_moonUp, u_moonPhase, u_moonRot, u_moonR, u_sunR, u_stars;
in vec3 v_d;
out vec4 o;
float h31(vec3 p) { p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float starField(vec3 d, float scale, float keep) {
  vec3 q = d * scale, i = floor(q), f = fract(q) - .5;
  float r = h31(i);
  if (r < keep) return 0.;
  vec3 jit = vec3(h31(i + 1.), h31(i + 2.), h31(i + 3.)) - .5;
  float b = (r - keep) / (1. - keep);
  float tw = .72 + .28 * sin(u_time * (1.4 + r * 3.5) + r * 60.);
  return smoothstep(.13 + .1 * b, 0., length(f - jit * .55)) * (.35 + b * .95) * tw;
}
void main() {
  vec3 d = normalize(v_d);
  float h = max(d.z, 0.);
  vec3 c = mix(air(d), ZENITH, smoothstep(0., .32, h));
  // Thin high cloud, catching the colour of a low sun.
  vec2 cu = d.xy / (d.z + .16) * vec2(.11, .26) + vec2(u_time * .0016, 0.);
  float cloud = smoothstep(.5, .78, texture(u_noise, cu).r) * smoothstep(.015, .1, h) * smoothstep(.42, .16, h);
  vec3 cc = mix(mix(ZENITH, SKY, .6) * 1.06, SKY + u_glow * 1.5, smoothstep(0., .9, dot(u_glow, vec3(1.))));
  float amount = mix(.34, .12, u_night) + dot(u_glow, vec3(.34));
  c = mix(c, cc, cloud * amount);
  if (u_stars > .01) {
    float s = u_stars * smoothstep(.004, .055, h) * (1. - cloud * .7);
    vec3 axis = normalize(vec3(.42, .52, .74));
    float band = exp(-pow(dot(d, axis) * 3.6, 2.));
    c += vec3(.15, .15, .23) * band * texture(u_noise, d.xy * 1.7 + .3).r * s * .7;
    c += vec3(.92, .95, 1.) * (starField(d, 130., .94) * 1.9 + starField(d, 260., .955) * 1.2 + starField(d, 520., .97) * .7) * s;
  }
  // The sun, a little larger than life so it reads on a web page. It's measured in screen pixels, so a wide lens can't squash it.
  float sd = dot(d, u_sunDir);
  if (u_sunDir.z > -.09 && u_sunR > 0.) {
    vec3 tint = mix(vec3(1., .52, .2), vec3(1., .94, .74), smoothstep(.0, .16, u_sunDir.z));
    c += tint * (pow(max(sd, 0.), 900.) * .3 + pow(max(sd, 0.), 70.) * .17) * smoothstep(-.09, 0., u_sunDir.z);
    float rs = length(gl_FragCoord.xy - u_sunPos) / u_sunR, a = fwidth(rs) * 1.2;
    float disc = (1. - smoothstep(1. - a, 1. + a, rs)) * smoothstep(-.09, -.012, u_sunDir.z);
    c = mix(c, tint * 1.5 + vec3(.1), disc * smoothstep(-.015, .004, d.z));
  }
  // The real moon: NASA's map of the near side, turned the way it hangs in Dubai's sky tonight, lit to tonight's true phase.
  float vis = u_moonUp * smoothstep(.05, .5, u_night);     // a pale day moon just reads as a smudge here
  if (vis > .001 && u_moonR > 0.) {
    vec2 p = (gl_FragCoord.xy - u_moonPos) / u_moonR;
    float r = length(p);
    float bright = sqrt(max(u_moonLit, 0.));
    // A soft halo in the air around it, stronger the fuller it is.
    if (r < 9. && r > .9) {
      float e = max(r - 1., 0.);
      c += vec3(.6, .68, .92) * (exp(-e * 2.6) * .13 + exp(-e * .62) * .05) * bright * vis;
    }
    if (r < 1.03) {
      float z = sqrt(max(1. - r * r, 0.));
      vec3 sunL = vec3(u_moonLimb * sqrt(max(1. - u_moonPhase * u_moonPhase, 0.)), u_moonPhase);
      float cosI = dot(vec3(p, z), sunL);
      float lit = max(cosI, 0.);
      // Moon dust doesn't dim toward the edge the way a matte ball does: its full face looks almost flat, as the real one does.
      float dust = 2. * lit / (lit + z + .001);
      float cs = cos(u_moonRot), sn = sin(u_moonRot);
      vec2 t = vec2(p.x * cs - p.y * sn, p.x * sn + p.y * cs);
      vec3 map = texture(u_moonTex, vec2(t.x, -t.y) * .5 + .5).rgb;
      vec3 day = pow(map, vec3(.66)) * vec3(1., .985, .945) * (.16 + 1.08 * dust);
      float side = smoothstep(-.015, .07, cosI);
      vec3 night_ = map * vec3(.55, .65, .95) * .028;      // earthshine: the dark side barely shows against the sky
      float a = fwidth(r) * 1.3;
      float keep = (1. - smoothstep(1. - a, 1. + a, r)) * vis * smoothstep(-.015, .004, d.z);
      c = mix(c, mix(night_ + c * .8, day, side), keep);
    }
  }
  o = vec4(srgb(c), 1.);
}`

type Pack = { head: { bounds: number[]; zmax: number; sections: Record<string, { type: string; count: number; offset: number; width?: number; height?: number }> }; base: number; buf: ArrayBuffer }
const TYPES = { uint8: Uint8Array, uint16: Uint16Array, uint32: Uint32Array, float32: Float32Array } as const

async function loadPack(name: string): Promise<Pack> {
  const res = await fetch(BASE + name)
  const raw = await new Response(res.body!.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
  const len = new DataView(raw).getUint32(0, true)
  const head = JSON.parse(new TextDecoder().decode(new Uint8Array(raw, 4, len)))
  return { head, base: 4 + len + ((8 - ((4 + len) % 8)) % 8), buf: raw }
}
const section = <T extends keyof typeof TYPES>(p: Pack, name: string) => {
  const s = p.head.sections[name]
  return new TYPES[s.type as T](p.buf, p.base + s.offset, s.count) as InstanceType<(typeof TYPES)[T]>
}
function undelta(z: Uint32Array) {
  const out = new Uint32Array(z.length)
  let cur = 0
  for (let i = 0; i < z.length; i++) {
    const v = z[i]
    cur += (v >>> 1) ^ -(v & 1)
    out[i] = cur
  }
  return out
}

// Sorts triangles into a grid, so whole squares of the city can be skipped when the camera can't see them.
type Chunk = { start: number; count: number; x0: number; y0: number; x1: number; y1: number; z1: number; cx: number; cy: number; d: number }
function chunked(idx: Uint32Array, xy: Uint16Array, z: Uint16Array | null, b: number[], zmax: number) {
  const G = 18, tris = idx.length / 3
  const cell = new Uint16Array(tris), counts = new Uint32Array(G * G)
  for (let t = 0; t < tris; t++) {
    const v = idx[t * 3]
    const c = ((xy[v * 2] * G) >>> 16) + G * ((xy[v * 2 + 1] * G) >>> 16)
    cell[t] = c
    counts[c]++
  }
  const starts = new Uint32Array(G * G)
  for (let c = 1, n = 0; c < G * G; c++) { n += counts[c - 1]; starts[c] = n }
  const at = starts.slice(), out = new Uint32Array(idx.length)
  const box = new Float64Array(G * G * 5)
  for (let c = 0; c < G * G; c++) { box[c * 5] = 1e9; box[c * 5 + 1] = 1e9; box[c * 5 + 2] = -1e9; box[c * 5 + 3] = -1e9 }
  const sx = (b[2] - b[0]) / 65535, sy = (b[3] - b[1]) / 65535, sz = zmax / 65535
  for (let t = 0; t < tris; t++) {
    const c = cell[t], o = at[c]++ * 3
    for (let k = 0; k < 3; k++) {
      const v = idx[t * 3 + k]
      out[o + k] = v
      const x = b[0] + xy[v * 2] * sx, y = b[1] + xy[v * 2 + 1] * sy
      if (x < box[c * 5]) box[c * 5] = x
      if (y < box[c * 5 + 1]) box[c * 5 + 1] = y
      if (x > box[c * 5 + 2]) box[c * 5 + 2] = x
      if (y > box[c * 5 + 3]) box[c * 5 + 3] = y
      if (z && z[v] * sz > box[c * 5 + 4]) box[c * 5 + 4] = z[v] * sz
    }
  }
  const chunks: Chunk[] = []
  for (let c = 0; c < G * G; c++) {
    if (!counts[c]) continue
    const [x0, y0, x1, y1, z1] = box.subarray(c * 5, c * 5 + 5)
    chunks.push({ start: starts[c] * 3, count: counts[c] * 3, x0, y0, x1, y1, z1: z1 * 1.2 + 0.05, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, d: 0 })
  }
  return { out, chunks }
}

function mult(a: Float32Array, b: Float32Array) {
  const o = new Float32Array(16)
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[r + 4] * b[c * 4 + 1] + a[r + 8] * b[c * 4 + 2] + a[r + 12] * b[c * 4 + 3]
  return o
}
function invert(m: Float32Array) {
  const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = m
  const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11
  const b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30
  const b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32
  const d = 1 / (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06)
  return new Float32Array([
    (a11 * b11 - a12 * b10 + a13 * b09) * d, (a02 * b10 - a01 * b11 - a03 * b09) * d, (a31 * b05 - a32 * b04 + a33 * b03) * d, (a22 * b04 - a21 * b05 - a23 * b03) * d,
    (a12 * b08 - a10 * b11 - a13 * b07) * d, (a00 * b11 - a02 * b08 + a03 * b07) * d, (a32 * b02 - a30 * b05 - a33 * b01) * d, (a20 * b05 - a22 * b02 + a23 * b01) * d,
    (a10 * b10 - a11 * b08 + a13 * b06) * d, (a01 * b08 - a00 * b10 - a03 * b06) * d, (a30 * b04 - a31 * b02 + a33 * b00) * d, (a21 * b02 - a20 * b04 - a23 * b00) * d,
    (a11 * b07 - a10 * b09 - a12 * b06) * d, (a00 * b09 - a01 * b07 + a02 * b06) * d, (a31 * b01 - a30 * b03 - a32 * b00) * d, (a20 * b03 - a21 * b01 + a22 * b00) * d,
  ])
}

// ------------------------------------------------------------------------------------------------ the camera move
const END = { tx: 0, ty: 0, tz: 2.7, dist: 29, az: 138, el: 15.5 }
const END_SKY = { tz: 4.18, dist: 22.2, el: 7.3 }     // night, dawn and dusk: lower and closer, the spire up among the stars
const START = { tx: 0.6, ty: 0.4, tz: 0, dist: 62, az: END.az - 62, el: 89.6 }
export const LAND = 118 / 30   // seconds until the camera has landed
export const DONE = 4.5

// Where the camera is at a point of a tour. The tour's first row is replaced by wherever the camera really is.
function ridePose(tour: Tour, p: number, az0: number, r0: number, z0: number, lz0: number) {
  const k = tour.keys
  const row = (i: number) => (i === 0 ? [0, az0, r0, z0, lz0, 0, 0, 0] : k[i])
  let i = 0
  while (i < k.length - 2 && p > k[i + 1][0]) i++
  const a = row(Math.max(i - 1, 0)), b = row(i), c = row(i + 1), d = row(Math.min(i + 2, k.length - 1))
  const t = Math.max(0, Math.min(1, (p - b[0]) / (c[0] - b[0])))
  const at = (n: number) => {
    const A = a[n] ?? 0, B = b[n] ?? 0, C = c[n] ?? 0, D = d[n] ?? 0
    const m0 = (C - A) / 2, m1 = (D - B) / 2, t2 = t * t, t3 = t2 * t
    return (2 * t3 - 3 * t2 + 1) * B + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * C + (t3 - t2) * m1
  }
  return { az: at(1), r: at(2), z: at(3), lz: at(4), side: at(5), free: Math.max(0, Math.min(1, at(6))), yaw: at(7) }
}

const LL = (lat: number, lon: number): [number, number] => [((lon - 55.27436) * Math.cos(rad(25.19716)) * 111320) / 100, ((lat - 25.19716) * 110574) / 100]
export const ANCHORS: Record<string, [number, number, number]> = {
  burj_khalifa: [0, 0, 8.45],
  fountain: [JET_AT[0] + 1.35, JET_AT[1] + 0.3, 1],     // its east end, so from the city view the bubble clears the tower
  future: [...LL(25.21925, 55.28173), 0.95],
  la_mer: [...LL(25.2318, 55.2508), 0.1],
  world: [...LL(25.2245, 55.174), 0.05],
}

export type City = {
  canvas: HTMLCanvasElement
  play(speed: number): Promise<void>
  start(onFrame: (project: (p: [number, number, number]) => [number, number, boolean], t: number) => void): void
  stop(): void
  drag: { az: number; el: number }
  aim: { x: number; y: number }
  fps(): number
  /** The fly-in: where it is (0 to 1), where it's heading, and how fast that target moves by itself. */
  ride: { p: number; target: number; rate: number; z: number; hold: boolean; tour: Tour | null; orbit: number }
  setVisible(v: boolean): void
  setEnv(env: Env): void
  debugSeek(t: number, time?: number): void
  debugTime(frames: number, shadows?: boolean): { median: number; worst: number; size: string }
}

let cityPromise: Promise<City> | null = null
export function loadCity() {
  return (cityPromise ??= build())
}
export function forgetCity() {
  cityPromise = null
}
export function canLive() {
  try {
    return !!document.createElement('canvas').getContext('webgl2') && 'DecompressionStream' in window
  } catch {
    return false
  }
}

async function build(): Promise<City> {
  // Weaker machines get a 4K light map and shadow map instead of 8K: softer, but still the same picture.
  const big = (navigator.hardwareConcurrency || 8) >= 6 && ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) >= 6
  const [pack, burj, extras, coastImg, scriptImg, moonImg, shadeImg] = await Promise.all([
    loadPack('city.dat'),
    loadPack('burj.dat'),
    loadPack('extras.dat'),
    fetch(BASE + 'coast.webp').then(r => r.blob()).then(b => createImageBitmap(b, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' })),
    fetch(BASE + 'script.webp').then(r => r.blob()).then(b => createImageBitmap(b, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' })),
    fetch(BASE + 'moon.webp').then(r => r.blob()).then(b => createImageBitmap(b, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' })),
    fetch(BASE + 'ao.webp').then(r => r.blob()).then(b => createImageBitmap(b, {
      premultiplyAlpha: 'none', colorSpaceConversion: 'none', ...(big ? {} : { resizeWidth: 4096, resizeHeight: 4096, resizeQuality: 'high' as const }),
    })),
  ])
  const canvas = document.createElement('canvas')
  canvas.className = 'dm-gl'
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false })!
  gl.getExtension('EXT_color_buffer_float')
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic')

  const shader = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`shader: ${gl.getShaderInfoLog(s)}`)
    return s
  }
  const program = (vs: string, fs: string, defs = '') => {
    const p = gl.createProgram()!
    gl.attachShader(p, shader(gl.VERTEX_SHADER, defs ? vs.replace('precision highp float;', `#define ${defs}\nprecision highp float;`) : vs))
    gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs))
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`link: ${gl.getProgramInfoLog(p)}`)
    const u: Record<string, WebGLUniformLocation | null> = {}
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS)
    for (let i = 0; i < n; i++) { const nm = gl.getActiveUniform(p, i)!.name; u[nm] = gl.getUniformLocation(p, nm) }
    return { p, u, a: (s: string) => gl.getAttribLocation(p, s) }
  }
  const breathe = () => new Promise(r => setTimeout(r))
  const flatP = program(FLAT_VS, GROUND_FS); await breathe()
  const roadP = program(FLAT_VS, ROAD_FS); await breathe()
  const bldP = program(BLD_VS, BLD_FS); await breathe()
  const sdwP = program(BLD_VS, SHADOW_FS, 'SHADOW'); await breathe()
  const treeP = program(TREE_VS, TREE_FS); await breathe()
  const carP = program(CAR_VS, CAR_FS); await breathe()
  const jetP = program(JET_VS, JET_FS)
  const burjP = program(BURJ_VS, BURJ_FS); await breathe()
  const burjS1 = program(BURJ_VS, SHADOW_FS, 'SHADOW')
  const burjS2 = program(BURJ_VS, SHADOW_FS, 'SHADOW2')
  const propP = program(PROP_VS, PROP_FS)
  const musP = program(MUS_VS, MUS_FS); await breathe()
  const sprayP = program(SPRAY_VS, SPRAY_FS); await breathe()
  const skyP = program(SKY_VS, SKY_FS); await breathe()
  const P = { flat: flatP, road: roadP, bld: bldP, sdw: sdwP, tree: treeP, car: carP, jet: jetP, sky: skyP, burj: burjP, burjS1, burjS2, prop: propP, spray: sprayP, mus: musP }

  const buffer = (data: ArrayBufferView, target: number = gl.ARRAY_BUFFER) => {
    const b = gl.createBuffer()!
    gl.bindBuffer(target, b)
    gl.bufferData(target, data, gl.STATIC_DRAW)
    return b
  }
  const bounds = pack.head.bounds
  const b4 = new Float32Array([bounds[0], bounds[1], bounds[2], bounds[3]])

  const flatMesh = (name: string, cull = false) => {
    let i = undelta(section<'uint32'>(pack, name + '_i'))
    let chunks: Chunk[] | null = null
    if (cull) ({ out: i, chunks } = chunked(i, section<'uint16'>(pack, name + '_p'), null, bounds, 0))
    const vao = gl.createVertexArray()!
    gl.bindVertexArray(vao)
    buffer(section(pack, name + '_p'))
    for (const prog of [P.flat, P.road]) {
      const loc = prog.a('a_p')
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, 2, gl.UNSIGNED_SHORT, true, 0, 0)
    }
    buffer(i, gl.ELEMENT_ARRAY_BUFFER)
    gl.bindVertexArray(null)
    return { vao, count: i.length, chunks }
  }
  const layers = { land: flatMesh('land'), sand: flatMesh('sand'), green: flatMesh('green'), water: flatMesh('water'), road: flatMesh('road', true), big: flatMesh('big'), rail: flatMesh('rail') }
  await breathe()

  // Sea and the land past the edge of the data, in world units.
  const x0 = LL(25.06, 55.1)[0], y0 = LL(25.06, 55.1)[1], x1 = LL(25.3, 55.36)[0], y1 = LL(25.3, 55.36)[1]
  const quads = (qs: number[][]) => {
    const vao = gl.createVertexArray()!
    gl.bindVertexArray(vao)
    const v: number[] = []
    for (const [a, b, c, d] of qs) v.push(a, b, c, b, c, d, a, b, c, d, a, d)
    buffer(new Float32Array(v))
    for (const prog of [P.flat, P.road]) {
      const loc = prog.a('a_p')
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    }
    gl.bindVertexArray(null)
    return { vao, count: v.length / 2, chunks: null }
  }
  const sea = quads([[-6000, -6000, 6000, 6000]])
  const farLand = quads([[x1, y0 - 3000, x1 + 3000, y1 + 40], [x0 - 3000, y0 - 3000, x1, y0]])

  // Buildings
  const bldVao = gl.createVertexArray()!
  gl.bindVertexArray(bldVao)
  // Both building programs must agree on slots.
  const L_XY = 0, L_Z = 1, L_A = 2, L_K = 3, L_N = 4, L_T = 5
  for (const prog of [P.bld, P.sdw]) {
    gl.bindAttribLocation(prog.p, L_XY, 'a_xy'); gl.bindAttribLocation(prog.p, L_Z, 'a_z'); gl.bindAttribLocation(prog.p, L_A, 'a_a'); gl.bindAttribLocation(prog.p, L_K, 'a_k')
    gl.linkProgram(prog.p)
    const n = gl.getProgramParameter(prog.p, gl.ACTIVE_UNIFORMS)
    for (let i = 0; i < n; i++) { const nm = gl.getActiveUniform(prog.p, i)!.name; prog.u[nm] = gl.getUniformLocation(prog.p, nm) }
  }
  buffer(section(pack, 'bld_xy')); gl.enableVertexAttribArray(L_XY); gl.vertexAttribPointer(L_XY, 2, gl.UNSIGNED_SHORT, true, 0, 0)
  buffer(section(pack, 'bld_z')); gl.enableVertexAttribArray(L_Z); gl.vertexAttribPointer(L_Z, 1, gl.UNSIGNED_SHORT, true, 0, 0)
  buffer(section(pack, 'bld_a')); gl.enableVertexAttribArray(L_A); gl.vertexAttribPointer(L_A, 3, gl.UNSIGNED_BYTE, true, 0, 0)
  const { out: bldIdx, chunks: bldChunks } = chunked(undelta(section<'uint32'>(pack, 'bld_i')), section<'uint16'>(pack, 'bld_xy'), section<'uint16'>(pack, 'bld_z'), bounds, pack.head.zmax)
  buffer(bldIdx, gl.ELEMENT_ARRAY_BUFFER)
  await breathe()
  gl.disableVertexAttribArray(L_K)

  // The detailed Burj.
  for (const prog of [P.burj, P.burjS1, P.burjS2, P.mus]) {
    gl.bindAttribLocation(prog.p, L_T, 'a_t')
    gl.bindAttribLocation(prog.p, L_XY, 'a_xy'); gl.bindAttribLocation(prog.p, L_Z, 'a_z'); gl.bindAttribLocation(prog.p, L_A, 'a_s'); gl.bindAttribLocation(prog.p, L_K, 'a_k'); gl.bindAttribLocation(prog.p, L_N, 'a_n')
    gl.linkProgram(prog.p)
    const n = gl.getProgramParameter(prog.p, gl.ACTIVE_UNIFORMS)
    for (let i = 0; i < n; i++) { const nm = gl.getActiveUniform(prog.p, i)!.name; prog.u[nm] = gl.getUniformLocation(prog.p, nm) }
  }
  const burjVao = gl.createVertexArray()!
  gl.bindVertexArray(burjVao)
  buffer(section(burj, 'xy')); gl.enableVertexAttribArray(L_XY); gl.vertexAttribPointer(L_XY, 2, gl.UNSIGNED_SHORT, true, 0, 0)
  buffer(section(burj, 'z')); gl.enableVertexAttribArray(L_Z); gl.vertexAttribPointer(L_Z, 1, gl.UNSIGNED_SHORT, true, 0, 0)
  buffer(section(burj, 's')); gl.enableVertexAttribArray(L_A); gl.vertexAttribPointer(L_A, 1, gl.UNSIGNED_SHORT, true, 0, 0)
  buffer(section(burj, 'k')); gl.enableVertexAttribArray(L_K); gl.vertexAttribPointer(L_K, 1, gl.UNSIGNED_BYTE, false, 0, 0)
  const burjN = burj.head.sections.n
  buffer(new Int8Array(burj.buf, burj.base + burjN.offset, burjN.count)); gl.enableVertexAttribArray(L_N); gl.vertexAttribPointer(L_N, 3, gl.BYTE, true, 0, 0)
  const burjIdx = undelta(section<'uint32'>(burj, 'i'))
  buffer(burjIdx, gl.ELEMENT_ARRAY_BUFFER)
  const B_B = burj.head.bounds

  // The Museum of the Future, in the same format, with smooth normals of its own.
  const FUT = LL_(25.21925, 55.28173), M_B = extras.head.bounds
  const musVao = gl.createVertexArray()!
  gl.bindVertexArray(musVao)
  buffer(section(extras, 'mus_xy')); gl.enableVertexAttribArray(L_XY); gl.vertexAttribPointer(L_XY, 2, gl.UNSIGNED_SHORT, true, 0, 0)
  buffer(section(extras, 'mus_z')); gl.enableVertexAttribArray(L_Z); gl.vertexAttribPointer(L_Z, 1, gl.UNSIGNED_SHORT, true, 0, 0)
  buffer(section(extras, 'mus_s')); gl.enableVertexAttribArray(L_A); gl.vertexAttribPointer(L_A, 1, gl.UNSIGNED_SHORT, true, 0, 0)
  buffer(section(extras, 'mus_k')); gl.enableVertexAttribArray(L_K); gl.vertexAttribPointer(L_K, 1, gl.UNSIGNED_BYTE, false, 0, 0)
  const musN = extras.head.sections.mus_n
  buffer(new Int8Array(extras.buf, extras.base + musN.offset, musN.count)); gl.enableVertexAttribArray(L_N); gl.vertexAttribPointer(L_N, 3, gl.BYTE, true, 0, 0)
  buffer(section(extras, 'mus_t')); gl.enableVertexAttribArray(L_T); gl.vertexAttribPointer(L_T, 1, gl.UNSIGNED_SHORT, true, 0, 0)
  const musIdx = undelta(section<'uint32'>(extras, 'mus_i'))
  buffer(musIdx, gl.ELEMENT_ARRAY_BUFFER)
  const drawDetail = (prog: typeof P.burj) => {
    gl.vertexAttrib3f(L_N, 0, 0, 0)
    gl.uniform4f(prog.u.u_b, B_B[0], B_B[1], B_B[2], B_B[3])
    gl.uniform3f(prog.u.u_rise, 0.45, 3, 0.32)
    gl.bindVertexArray(burjVao)
    gl.drawElements(gl.TRIANGLES, burjIdx.length, gl.UNSIGNED_INT, 0)
  }
  const drawMuseum = (prog: typeof P.burj) => {
    if (prog.u.u_script) gl.uniform1i(prog.u.u_script, 7)
    gl.uniform4f(prog.u.u_b, FUT[0] + M_B[0], FUT[1] + M_B[1], FUT[0] + M_B[2], FUT[1] + M_B[3])
    gl.uniform3f(prog.u.u_rise, 1.1, 0.9, 1)
    gl.bindVertexArray(musVao)
    gl.drawElements(gl.TRIANGLES, musIdx.length, gl.UNSIGNED_INT, 0)
  }

  // Palms, umbrellas, huts and boats, each drawn once per spot on the shore.
  const props = ['palm', 'umbrella', 'hut', 'boat', 'rock'].map(name => {
    const vao = gl.createVertexArray()!
    gl.bindVertexArray(vao)
    buffer(section(extras, name + '_v'))
    { const l = P.prop.a('a_v'); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 3, gl.FLOAT, false, 0, 0) }
    buffer(section(extras, name + '_c'))
    { const l = P.prop.a('a_c'); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 1, gl.UNSIGNED_BYTE, false, 0, 0) }
    const xy = section<'uint16'>(extras, name + '_xy')
    buffer(xy)
    { const l = P.prop.a('a_xy'); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 2, gl.UNSIGNED_SHORT, true, 0, 0); gl.vertexAttribDivisor(l, 1) }
    buffer(section(extras, name + '_a'))
    { const l = P.prop.a('a_a'); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 4, gl.UNSIGNED_BYTE, true, 0, 0); gl.vertexAttribDivisor(l, 1) }
    const idx = section<'uint16'>(extras, name + '_i')
    buffer(idx, gl.ELEMENT_ARRAY_BUFFER)
    return { vao, count: idx.length, n: xy.length / 2 }
  })
  await breathe()

  const markVao = gl.createVertexArray()!
  gl.bindVertexArray(markVao)
  buffer(section(pack, 'mark_xy')); gl.enableVertexAttribArray(L_XY); gl.vertexAttribPointer(L_XY, 2, gl.UNSIGNED_SHORT, true, 0, 0)
  buffer(section(pack, 'mark_z')); gl.enableVertexAttribArray(L_Z); gl.vertexAttribPointer(L_Z, 1, gl.UNSIGNED_SHORT, true, 0, 0)
  buffer(section(pack, 'mark_k')); gl.enableVertexAttribArray(L_K); gl.vertexAttribPointer(L_K, 1, gl.UNSIGNED_BYTE, false, 0, 0)
  gl.disableVertexAttribArray(L_A)
  const markIdx = undelta(section<'uint32'>(pack, 'mark_i'))
  buffer(markIdx, gl.ELEMENT_ARRAY_BUFFER)

  // Trees: a rounded icosahedron per instance.
  const t = 1.618
  const icoV = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(v => { const l = Math.hypot(v[0], v[1], v[2]); return v.map(c => c / l) })
  const icoF = [0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1]
  const verts = icoV, faces = icoF
  const treeCount = section(pack, 'tree_xy').length / 2
  const treeVao = gl.createVertexArray()!
  gl.bindVertexArray(treeVao)
  buffer(new Float32Array(verts.flat()))
  { const l = P.tree.a('a_v'); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 3, gl.FLOAT, false, 0, 0) }
  buffer(section(pack, 'tree_xy'))
  { const l = P.tree.a('a_xy'); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 2, gl.UNSIGNED_SHORT, true, 0, 0); gl.vertexAttribDivisor(l, 1) }
  buffer(section(pack, 'tree_a'))
  { const l = P.tree.a('a_a'); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 4, gl.UNSIGNED_BYTE, true, 0, 0); gl.vertexAttribDivisor(l, 1) }
  buffer(new Uint16Array(faces), gl.ELEMENT_ARRAY_BUFFER)

  // Jets
  // The fountain, laid out down the middle of the lake and about 275 m long: tall shooters along a shallow arc, a lower row
  // either side of them, and rings of smaller jets strung along it.
  const jetData = (() => {
    const out: number[] = []
    const [cx, cy] = JET_AT, ca = Math.cos(JET_TURN), sa = Math.sin(JET_TURN)
    const put = (u: number, v: number, h: number) => out.push(cx + ca * u - sa * v, cy + sa * u + ca * v, h)
    const N = 120, half = 1.37
    for (let i = 0; i <= N; i++) {
      const u = (i / N - 0.5) * 2 * half
      const bow = 0.2 * (1 - (u / half) ** 2)
      put(u, bow, 0.58 + 0.22 * Math.abs(Math.sin(u * 2.15 + 0.7)))
      if (i % 2 === 0) { put(u + 0.02, bow - 0.17, 0.42); put(u - 0.02, bow + 0.17, 0.42) }
    }
    for (const at of [-1, -0.5, 0, 0.5, 1]) {
      const u0 = at * 1.14, v0 = 0.2 * (1 - (u0 / half) ** 2) - 0.02
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2
        put(u0 + Math.cos(a) * 0.15, v0 + Math.sin(a) * 0.15, 0.26 + 0.1 * (i % 2))
      }
    }
    return new Float32Array(out)
  })()
  const jetCount = jetData.length / 3
  const jetVao = gl.createVertexArray()!
  gl.bindVertexArray(jetVao)
  const jv: number[] = []
  const JET_ROWS = 12, JET_VERTS = JET_ROWS * 6
  for (let i = 0; i < JET_ROWS; i++) {
    const a = i / JET_ROWS, b = (i + 1) / JET_ROWS
    jv.push(-1, a, 1, a, 1, b, -1, a, 1, b, -1, b)
  }
  buffer(new Float32Array(jv))
  { const l = P.jet.a('a_v'); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0) }
  const jetBuf = buffer(jetData)
  { const l = P.jet.a('a_i'); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 3, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(l, 1) }
  const sprayVao = gl.createVertexArray()!
  gl.bindVertexArray(sprayVao)
  buffer(new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]))
  { const l = P.spray.a('a_q'); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0) }
  gl.bindBuffer(gl.ARRAY_BUFFER, jetBuf)
  { const l = P.spray.a('a_i'); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 3, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(l, 1) }

  // Traffic: routes live in a float texture, and each car only knows where on its route it started.
  const routeInfo = pack.head.sections.routes
  const routeTex = gl.createTexture()!
  gl.activeTexture(gl.TEXTURE2)
  gl.bindTexture(gl.TEXTURE_2D, routeTex)
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, routeInfo.width!, routeInfo.height!, 0, gl.RG, gl.FLOAT, section<'float32'>(pack, 'routes'))
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  const lens = section<'uint16'>(pack, 'route_len'), flags = section<'uint8'>(pack, 'route_flag')
  const cars: number[] = []
  let seed = 11
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  for (let r = 0; r < lens.length; r++) {
    const big = flags[r] & 2 ? 0.34 : flags[r] & 4 ? 0.28 : 0.12        // cars per point; a point is every 30 m
    const n = Math.round(lens[r] * big)
    const one = flags[r] & 1
    for (let i = 0; i < n; i++) {
      const dir = one || rnd() < 0.5 ? 1 : -1
      const speed = (1.1 + rnd() * 0.9) * dir
      const lane = (one ? (rnd() - 0.5) * 0.16 : 0.07 + rnd() * 0.05) * (dir > 0 ? 1 : -1)
      cars.push(r, rnd() * lens[r], speed, lane, lens[r], Math.floor(rnd() * 6))
    }
  }
  const carCount = cars.length / 6
  const box = [[-.5, -.5, 0], [.5, -.5, 0], [.5, .5, 0], [-.5, .5, 0], [-.5, -.5, 1], [.5, -.5, 1], [.5, .5, 1], [-.5, .5, 1]]
  const boxI = [0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7, 4, 5, 6, 4, 6, 7]
  const carVao = gl.createVertexArray()!
  gl.bindVertexArray(carVao)
  buffer(new Float32Array(box.flat()))
  { const l = P.car.a('a_v'); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 3, gl.FLOAT, false, 0, 0) }
  buffer(new Float32Array(cars))
  { const l = P.car.a('a_i'); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 4, gl.FLOAT, false, 24, 0); gl.vertexAttribDivisor(l, 1) }
  { const l = P.car.a('a_i2'); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 24, 16); gl.vertexAttribDivisor(l, 1) }
  buffer(new Uint16Array(boxI), gl.ELEMENT_ARRAY_BUFFER)
  gl.bindVertexArray(null)

  // A small tiling texture stands in for the noise that used to be worked out per pixel: red is soft clouds for the ground's
  // colour drift, green and blue are ripple directions for the water.
  const NT = 256
  const noiseData = new Uint8Array(NT * NT * 4)
  {
    const grid = (n: number) => { const a = new Float32Array(n * n); for (let i = 0; i < a.length; i++) a[i] = rnd(); return a }
    const smooth = (g: Float32Array, n: number, x: number, y: number) => {
      const xi = Math.floor(x), yi = Math.floor(y); let fx = x - xi, fy = y - yi
      fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy)
      const a = g[(yi % n) * n + (xi % n)], b = g[(yi % n) * n + ((xi + 1) % n)], c = g[((yi + 1) % n) * n + (xi % n)], d = g[((yi + 1) % n) * n + ((xi + 1) % n)]
      return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy
    }
    const o0 = grid(8), o1 = grid(16), o2 = grid(32), r0 = grid(8), r1 = grid(16), r2 = grid(32)
    const fbm = (a: Float32Array, b: Float32Array, c: Float32Array, u: number, v: number) => 0.55 * smooth(a, 8, u * 8, v * 8) + 0.3 * smooth(b, 16, u * 16, v * 16) + 0.15 * smooth(c, 32, u * 32, v * 32)
    const e = 1 / NT
    for (let y = 0; y < NT; y++) for (let x = 0; x < NT; x++) {
      const u = x / NT, v = y / NT, k = (y * NT + x) * 4
      const h = fbm(r0, r1, r2, u, v)
      noiseData[k] = fbm(o0, o1, o2, u, v) * 255
      noiseData[k + 1] = Math.max(0, Math.min(255, 127.5 + (h - fbm(r0, r1, r2, (u + e) % 1, v)) * 2600))
      noiseData[k + 2] = Math.max(0, Math.min(255, 127.5 + (h - fbm(r0, r1, r2, u, (v + e) % 1)) * 2600))
      noiseData[k + 3] = 255
    }
  }
  gl.activeTexture(gl.TEXTURE3)
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, NT, NT, 0, gl.RGBA, gl.UNSIGNED_BYTE, noiseData)
  gl.generateMipmap(gl.TEXTURE_2D)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 4)
  await breathe()

  // How near each spot of water is to the shore.
  gl.activeTexture(gl.TEXTURE6)
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, coastImg)
  gl.generateMipmap(gl.TEXTURE_2D)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  coastImg.close()

  // The script on the Museum.
  gl.activeTexture(gl.TEXTURE7)
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, scriptImg)
  gl.generateMipmap(gl.TEXTURE_2D)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8)
  scriptImg.close()

  // The moon's face.
  gl.activeTexture(gl.TEXTURE4)
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, moonImg)
  gl.generateMipmap(gl.TEXTURE_2D)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  moonImg.close()

  // The baked light on the ground.
  const shadeTex = gl.createTexture()!
  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, shadeTex)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, shadeImg)
  gl.generateMipmap(gl.TEXTURE_2D)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(16, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)))
  shadeImg.close()
  await breathe()

  // The live sun: an 8K shadow map over the part of the city in shot, redrawn only while towers are moving.
  const SDW = Math.min(big ? 8192 : 4096, gl.getParameter(gl.MAX_TEXTURE_SIZE))
  const sdwTex = gl.createTexture()!
  gl.activeTexture(gl.TEXTURE1)
  gl.bindTexture(gl.TEXTURE_2D, sdwTex)
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, SDW, SDW)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  const sdwFbo = gl.createFramebuffer()!
  gl.bindFramebuffer(gl.FRAMEBUFFER, sdwFbo)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, sdwTex, 0)
  gl.drawBuffers([gl.NONE])
  gl.readBuffer(gl.NONE)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)

  let env = skyAt(new Date())
  const lookAt = (eye: number[], fw: number[], up0: number[]) => {
    const f = fw, s = norm(cross(f, up0)), u = cross(s, f)
    return new Float32Array([s[0], u[0], -f[0], 0, s[1], u[1], -f[1], 0, s[2], u[2], -f[2], 0, -dot(s, eye), -dot(u, eye), dot(f, eye), 1])
  }
  // A second, much finer shadow map just for the tower, so its setbacks shade each other crisply up close.
  const SDW2 = big ? 4096 : 2048
  const sdw2Tex = gl.createTexture()!
  gl.activeTexture(gl.TEXTURE5)
  gl.bindTexture(gl.TEXTURE_2D, sdw2Tex)
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, SDW2, SDW2)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  const sdw2Fbo = gl.createFramebuffer()!
  gl.bindFramebuffer(gl.FRAMEBUFFER, sdw2Fbo)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, sdw2Tex, 0)
  gl.drawBuffers([gl.NONE])
  gl.readBuffer(gl.NONE)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)

  const SDW_C = [-6, 7], SDW_R = 92
  const shadowChunks = bldChunks.filter(c => c.x1 > SDW_C[0] - SDW_R - 40 && c.x0 < SDW_C[0] + SDW_R + 40 && c.y1 > SDW_C[1] - SDW_R - 40 && c.y0 < SDW_C[1] + SDW_R + 40)
  const lightMatrix = () => {
    const l = env.L, c = [...SDW_C, 0], R = SDW_R, D = 135
    const eye = [c[0] + l[0] * D, c[1] + l[1] * D, c[2] + l[2] * D]
    const view = lookAt(eye, norm([-l[0], -l[1], -l[2]]), [0, 0, 1])
    const near = 1, far = 280
    const proj = new Float32Array([1 / R, 0, 0, 0, 0, 1 / R, 0, 0, 0, 0, -2 / (far - near), 0, 0, 0, -(far + near) / (far - near), 1])
    return mult(proj, view)
  }
  let lvp = lightMatrix()
  const lightMatrix2 = () => {
    const l = env.L, R = 6.6, D = 26
    const eye = [l[0] * D, l[1] * D, 4.3 + l[2] * D]
    const view = lookAt(eye, norm([-l[0], -l[1], -l[2]]), [0, 0, 1])
    const near = 1, far = 52
    const proj = new Float32Array([1 / R, 0, 0, 0, 0, 1 / R, 0, 0, 0, 0, -2 / (far - near), 0, 0, 0, -(far + near) / (far - near), 1])
    return mult(proj, view)
  }
  let lvp2 = lightMatrix2()

  const state = { t: 0, speed: 0, time: 0, running: false, last: 0, shadowT: -1, resolve: null as null | (() => void), onFrame: null as null | ((p: (w: [number, number, number]) => [number, number, boolean], t: number) => void), dpr: Math.min(devicePixelRatio || 1, 2), frames: 0, slow: 0, fpsAvg: 0, W: 0, H: 0, visible: true, tick: 0 }
  const drag = { az: 0, el: 0 }, aim = { x: 0, y: 0 }, cur = { az: 0, el: 0, x: 0, y: 0 }
  const ride = { p: 0, target: 0, rate: 0, z: 0, hold: false, tour: null as Tour | null, orbit: 0 }
  let camRight = [1, 0, 0], camUp = [0, 0, 1]
  let vp = new Float32Array(16), ivp = new Float32Array(16), eye = [0, 0, 0]

  const camera = () => {
    const f = (state.t * 30) / 118
    const e = ss((f - 0.06) / 0.94), pitch = ss((f - 0.12) / 0.88)
    const landed = ss((state.t - LAND + 0.4) / 0.9)
    cur.az += (drag.az - cur.az) * 0.09
    cur.el += (drag.el - cur.el) * 0.09
    cur.x += (aim.x - cur.x) * 0.045
    cur.y += (aim.y - cur.y) * 0.045
    const az = lerp(START.az, END.az, e) + landed * (cur.az + cur.x * 1.6 + Math.sin(state.time * 0.11) * 1.4)
    const el = Math.max(6, lerp(START.el, lerp(END.el, END_SKY.el, env.skyShow), pitch) + landed * (cur.el - cur.y * 0.8 + Math.sin(state.time * 0.07) * 0.35))
    const endDist = lerp(END.dist, END_SKY.dist, env.skyShow)
    const dist = START.dist * (endDist / START.dist) ** e
    // When there's a sky worth seeing, the camera looks up a little more and lets the spire stand against it.
    const tg = [lerp(START.tx, END.tx, e), lerp(START.ty, END.ty, e), lerp(START.tz, lerp(END.tz, END_SKY.tz, env.skyShow), e)]
    const a = rad(az), l = rad(el)
    eye = [tg[0] + dist * Math.sin(a) * Math.cos(l), tg[1] + dist * Math.cos(a) * Math.cos(l), tg[2] + dist * Math.sin(l)]
    let head = [-Math.sin(a), -Math.cos(a), 0]
    let look = tg
    if (ride.p > 0.0004 && ride.tour) {
      // At the end of a tour the camera keeps slowly circling its subject.
      const T = ride.tour, cx = T.center[0], cy = T.center[1]
      const dx = eye[0] - cx, dy = eye[1] - cy
      let az0 = (Math.atan2(dx, dy) * 180) / Math.PI
      const first = T.keys[1][1]
      while (az0 < first - 180) az0 += 360
      while (az0 > first + 180) az0 -= 360
      const pose = ridePose(T, ride.p, az0, Math.hypot(dx, dy), eye[2], tg[2])
      // Where buildings stand close, the circling swings gently back and forth instead of going all the way round.
      const circling = T.sway ? T.sway * Math.sin(ride.orbit / T.sway) : ride.orbit
      const ra = rad(pose.az + circling + cur.x * 1.3)
      eye = [cx + pose.r * Math.sin(ra), cy + pose.r * Math.cos(ra), pose.z]
      // Negative distances fly on through the middle, so the bearing stays the way the camera is travelling.
      head = [-Math.sin(ra), -Math.cos(ra), 0]
      const side = norm(cross(head, [0, 0, 1]))
      // The subject sits clear of the facts panel, which swaps sides in Arabic.
      const off = pose.side * Math.abs(pose.r) * (document.documentElement.dir === 'rtl' ? -1 : 1)
      const atSubject = [cx - side[0] * off, cy - side[1] * off, pose.lz - cur.y * 0.12]
      // A free camera looks where it's flying, turned by the row's yaw, rather than at the subject.
      const ya = rad(pose.yaw), cya = Math.cos(ya), sya = Math.sin(ya)
      const dir = [head[0] * cya - head[1] * sya, head[0] * sya + head[1] * cya]
      const ahead = [eye[0] + dir[0] * 3, eye[1] + dir[1] * 3, pose.lz]
      const f = pose.free
      const blend = ss(ride.p / 0.13)
      look = [0, 1, 2].map(n => lerp(tg[n], lerp(atSubject[n], ahead[n], f), blend))
      ride.z = pose.z
    } else {
      ride.z = 0
    }
    const fwd = norm([look[0] - eye[0], look[1] - eye[1], look[2] - eye[2]])
    // Looking nearly straight down the heading keeps the picture steady; otherwise "up" follows where the camera really looks.
    // A tour with a map to read locks "up" to its heading as it arrives, so north stays at the top.
    const lock = ride.tour?.north ? 1 - ss((ride.p - 0.6) / 0.3) : 1
    const flat = Math.hypot(fwd[0], fwd[1]), w = ride.p > 0.0004 ? Math.max(0, Math.min(1, (flat - 0.05) / 0.25)) * lock : 0
    const basis = w > 0 ? norm([lerp(head[0], fwd[0] / flat, w), lerp(head[1], fwd[1] / flat, w), 0]) : head
    const right0 = cross(basis, [0, 0, 1]), lean = dot(right0, fwd)
    const right = norm([right0[0] - fwd[0] * lean, right0[1] - fwd[1] * lean, right0[2] - fwd[2] * lean])
    const up = norm(cross(right, fwd))
    camRight = right
    camUp = up
    const view = new Float32Array([right[0], up[0], -fwd[0], 0, right[1], up[1], -fwd[1], 0, right[2], up[2], -fwd[2], 0, -dot(right, eye), -dot(up, eye), dot(fwd, eye), 1])
    // Fills the canvas like object-fit: cover around the 16:9 shot composed in Blender (27 mm lens on a 36 mm sensor).
    const aspect = state.W / Math.max(state.H, 1)
    let tH = 18 / 27, tV = tH / aspect
    if (aspect < 16 / 9) { tV = (18 / 27) * (9 / 16); tH = tV * aspect }
    const n = lerp(2, 0.05, ss(ride.p / 0.16)), fr = 8000
    const proj = new Float32Array([1 / tH, 0, 0, 0, 0, 1 / tV, 0, 0, 0, 0, -(fr + n) / (fr - n), -1, 0, 0, (-2 * fr * n) / (fr - n), 0])
    vp = mult(proj, view)
    ivp = invert(vp)
  }

  const common = (prog: typeof P.flat) => {
    gl.useProgram(prog.p)
    const u = prog.u
    if (u.u_vp) gl.uniformMatrix4fv(u.u_vp, false, vp)
    if (u.u_lvp) gl.uniformMatrix4fv(u.u_lvp, false, lvp)
    if (u.u_lvp2) gl.uniformMatrix4fv(u.u_lvp2, false, lvp2)
    if (u.u_sdw2) gl.uniform1i(u.u_sdw2, 5)
    if (u.u_eye) gl.uniform3f(u.u_eye, eye[0], eye[1], eye[2])
    if (u.u_t) gl.uniform1f(u.u_t, state.t)
    if (u.u_time) gl.uniform1f(u.u_time, state.time)
    if (u.u_haze) gl.uniform1f(u.u_haze, lerp(6, 1 + env.skyShow * 0.7, ss(((state.t * 30) / 118 - 0.25) / 0.6)) * (1 + (ride.tour?.deep ?? 0) * 3 * ss(ride.p / 0.3)))
    if (u.u_ao) gl.uniform1i(u.u_ao, 0)
    if (u.u_L) gl.uniform3fv(u.u_L, env.L)
    if (u.u_light) gl.uniform3fv(u.u_light, env.light)
    if (u.u_amb) gl.uniform3fv(u.u_amb, env.amb)
    if (u.u_sky) gl.uniform3fv(u.u_sky, env.sky)
    if (u.u_zen) gl.uniform3fv(u.u_zen, env.zenith)
    if (u.u_glow) gl.uniform3fv(u.u_glow, env.glow)
    if (u.u_sunDir) gl.uniform3fv(u.u_sunDir, env.sunDir)
    if (u.u_night) gl.uniform1f(u.u_night, env.night)
    if (u.u_moonDir) gl.uniform3fv(u.u_moonDir, env.moonDir)
    if (u.u_moonLit) gl.uniform1f(u.u_moonLit, env.moonLit)
    if (u.u_moonUp) gl.uniform1f(u.u_moonUp, env.moonUp)
    if (u.u_moonPhase) gl.uniform1f(u.u_moonPhase, env.moonPhase)
    if (u.u_moonRot) gl.uniform1f(u.u_moonRot, env.moonRot)
    if (u.u_moonTex) gl.uniform1i(u.u_moonTex, 4)
    if (u.u_moonLimb) gl.uniform2fv(u.u_moonLimb, env.moonLimb)
    if (u.u_stars) gl.uniform1f(u.u_stars, env.stars)
    if (u.u_sdw) gl.uniform1i(u.u_sdw, 1)
    if (u.u_routes) gl.uniform1i(u.u_routes, 2)
    if (u.u_noise) gl.uniform1i(u.u_noise, 3)
    if (u.u_coast) gl.uniform1i(u.u_coast, 6)
    if (u.u_show) gl.uniform1f(u.u_show, ride.tour?.show ? ss(ride.p / 0.42) : 0)
    if (u.u_deep) gl.uniform1f(u.u_deep, (ride.tour?.deep ?? 0) * ss(ride.p / 0.3))
    if (u.u_bake) gl.uniform4f(u.u_bake, -122.4, -80.4, 204.8, 204.8)
    if (u.u_b) gl.uniform4fv(u.u_b, b4)
    if (u.u_zmax) gl.uniform1f(u.u_zmax, pack.head.zmax)
  }

  const drawShadow = () => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, sdwFbo)
    gl.viewport(0, 0, SDW, SDW)
    gl.enable(gl.DEPTH_TEST)
    gl.depthMask(true)
    gl.clear(gl.DEPTH_BUFFER_BIT)
    gl.enable(gl.CULL_FACE)
    gl.cullFace(gl.FRONT)
    gl.disable(gl.BLEND)
    common(P.sdw)
    gl.vertexAttrib1f(L_K, 0)
    gl.bindVertexArray(bldVao)
    for (const c of shadowChunks) gl.drawElements(gl.TRIANGLES, c.count, gl.UNSIGNED_INT, c.start * 4)
    gl.vertexAttrib3f(L_A, 1, 0.5, 1)
    gl.bindVertexArray(markVao)
    gl.drawElements(gl.TRIANGLES, markIdx.length, gl.UNSIGNED_INT, 0)
    gl.disable(gl.CULL_FACE)
    common(P.burjS1)
    drawDetail(P.burjS1)
    drawMuseum(P.burjS1)
    gl.bindFramebuffer(gl.FRAMEBUFFER, sdw2Fbo)
    gl.viewport(0, 0, SDW2, SDW2)
    gl.clear(gl.DEPTH_BUFFER_BIT)
    common(P.burjS2)
    drawDetail(P.burjS2)
    gl.cullFace(gl.BACK)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight
    if (!w || !h) return
    state.W = w; state.H = h
    const pw = Math.round(w * state.dpr), ph = Math.round(h * state.dpr)
    if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph }
  }

  // The camera's six walls, to test squares of the city against.
  const planes = new Float32Array(24)
  const findPlanes = () => {
    const m = vp
    for (let i = 0; i < 3; i++) for (let sign = 0; sign < 2; sign++) {
      const k = (i * 2 + sign) * 4, sg = sign ? -1 : 1
      for (let j = 0; j < 4; j++) planes[k + j] = m[j * 4 + 3] + sg * m[j * 4 + i]
    }
  }
  const inView = (c: Chunk) => {
    for (let i = 0; i < 24; i += 4) {
      const a = planes[i], b = planes[i + 1], z = planes[i + 2], d = planes[i + 3]
      if (a * (a > 0 ? c.x1 : c.x0) + b * (b > 0 ? c.y1 : c.y0) + z * (z > 0 ? c.z1 : 0) + d < 0) return false
    }
    return true
  }
  const seen: Chunk[] = []
  let forceShadow = false

  const draw = () => {
    resize()
    camera()
    findPlanes()
    state.tick++
    // While the towers move, the live shadows only need redrawing every other frame.
    if (state.t !== state.shadowT && (forceShadow || !state.speed || state.tick % 2 === 0)) { drawShadow(); state.shadowT = state.t }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0.85, 0.93, 0.97, 1)
    gl.depthMask(true)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.disable(gl.DEPTH_TEST)
    gl.depthMask(false)
    gl.disable(gl.CULL_FACE)
    gl.disable(gl.BLEND)

    common(P.sky)
    gl.uniformMatrix4fv(P.sky.u.u_ivp, false, ivp)
    const onScreen = (d: number[]) => {
      const x = eye[0] + d[0] * 1000, y = eye[1] + d[1] * 1000, z = eye[2] + d[2] * 1000
      const w = vp[3] * x + vp[7] * y + vp[11] * z + vp[15]
      return [((vp[0] * x + vp[4] * y + vp[8] * z + vp[12]) / w * 0.5 + 0.5) * canvas.width, ((vp[1] * x + vp[5] * y + vp[9] * z + vp[13]) / w * 0.5 + 0.5) * canvas.height, w]
    }
    const body = Math.min(canvas.height, canvas.width * 0.6)
    const mp = onScreen(env.moonDir), sp = onScreen(env.sunDir)
    gl.uniform2f(P.sky.u.u_moonPos, mp[0], mp[1])
    gl.uniform1f(P.sky.u.u_moonR, mp[2] > 0 ? body * 0.058 : 0)
    gl.uniform2f(P.sky.u.u_sunPos, sp[0], sp[1])
    gl.uniform1f(P.sky.u.u_sunR, sp[2] > 0 ? body * 0.046 : 0)
    gl.bindVertexArray(null)
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    // Solid things first, nearest first, so the card can skip everything hidden behind them, including the ground below.
    gl.enable(gl.DEPTH_TEST)
    gl.depthFunc(gl.LEQUAL)
    gl.depthMask(true)
    gl.enable(gl.CULL_FACE)
    common(P.bld)
    gl.vertexAttrib1f(L_K, 0)
    gl.bindVertexArray(bldVao)
    seen.length = 0
    for (const c of bldChunks) {
      if (inView(c)) { c.d = (c.cx - eye[0]) ** 2 + (c.cy - eye[1]) ** 2; seen.push(c) }
    }
    seen.sort((a, b) => a.d - b.d)
    for (const c of seen) gl.drawElements(gl.TRIANGLES, c.count, gl.UNSIGNED_INT, c.start * 4)
    gl.vertexAttrib3f(L_A, 1, 0.5, 1)
    gl.bindVertexArray(markVao)
    gl.drawElements(gl.TRIANGLES, markIdx.length, gl.UNSIGNED_INT, 0)
    gl.disable(gl.CULL_FACE)
    common(P.burj)
    drawDetail(P.burj)
    common(P.mus)
    drawMuseum(P.mus)
    if (state.t > 2) {
      common(P.prop)
      for (const k of props) {
        gl.bindVertexArray(k.vao)
        gl.drawElementsInstanced(gl.TRIANGLES, k.count, gl.UNSIGNED_SHORT, 0, k.n)
      }
    }
    gl.enable(gl.CULL_FACE)
    if (state.t > 1.4) {
      common(P.tree)
      gl.bindVertexArray(treeVao)
      gl.drawElementsInstanced(gl.TRIANGLES, faces.length, gl.UNSIGNED_SHORT, 0, treeCount)
    }
    if (state.t > 3.1) {
      common(P.car)
      gl.disable(gl.CULL_FACE)
      gl.bindVertexArray(carVao)
      gl.drawElementsInstanced(gl.TRIANGLES, boxI.length, gl.UNSIGNED_SHORT, 0, carCount)
    }

    // The ground goes down in layers, painter-style, so nothing can z-fight. It writes no depth and sits just behind everything.
    gl.disable(gl.CULL_FACE)
    gl.depthMask(false)
    gl.enable(gl.POLYGON_OFFSET_FILL)
    gl.polygonOffset(2, 8)
    common(P.flat)
    const f = (m: { vao: WebGLVertexArrayObject; count: number }, mode: number, world = false) => {
      gl.uniform1i(P.flat.u.u_mode, mode)
      gl.uniform1f(P.flat.u.u_surf, m === sea ? 1 : 0)
      gl.uniform4f(P.flat.u.u_b, world ? 0 : b4[0], world ? 0 : b4[1], world ? 1 : b4[2], world ? 1 : b4[3])
      gl.bindVertexArray(m.vao)
      if (world) gl.drawArrays(gl.TRIANGLES, 0, m.count)
      else gl.drawElements(gl.TRIANGLES, m.count, gl.UNSIGNED_INT, 0)
    }
    f(sea, 3, true); f(farLand, 0, true); f(layers.land, 0); f(layers.sand, 1); f(layers.green, 2); f(layers.water, 3)

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    common(P.road)
    const r = (m: { vao: WebGLVertexArrayObject; count: number; chunks: Chunk[] | null }, c: [number, number, number], c2: [number, number, number], w: number, fill: number, far: number, emit: [number, number, number]) => {
      gl.uniform3f(P.road.u.u_emit, emit[0], emit[1], emit[2])
      gl.uniform3f(P.road.u.u_c, c[0], c[1], c[2])
      gl.uniform3f(P.road.u.u_c2, c2[0], c2[1], c2[2])
      gl.uniform1f(P.road.u.u_w, w)
      gl.uniform1f(P.road.u.u_fill, fill)
      gl.uniform1f(P.road.u.u_far, far * (1 + env.night))
      gl.bindVertexArray(m.vao)
      if (!m.chunks) { gl.drawElements(gl.TRIANGLES, m.count, gl.UNSIGNED_INT, 0); return }
      for (const k of m.chunks) if (inView(k)) gl.drawElements(gl.TRIANGLES, k.count, gl.UNSIGNED_INT, k.start * 4)
    }
    const RAIL = hx('#f0a6a0'), BIG_EDGE = hx('#d9cfb9'), BIG = hx('#fff7dc')
    r(layers.rail, RAIL, RAIL, 1, 2, 400, GLOW_RAIL)
    r(layers.road, ROAD, ROAD_EDGE, 1, 0.78, 150, GLOW_ROAD)
    r(layers.big, BIG_EDGE, BIG_EDGE, 1, 2, 600, GLOW_EDGE)
    r(layers.big, BIG, BIG, 0.84, 2, 600, GLOW_BIG)
    gl.disable(gl.POLYGON_OFFSET_FILL)

    if (state.t > 3.1) {
      // Water glows: these shaders choose per pixel how much they add to the picture and how much they cover it.
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      common(P.spray)
      gl.uniform3f(P.spray.u.u_right, camRight[0], camRight[1], camRight[2])
      gl.uniform3f(P.spray.u.u_up, camUp[0], camUp[1], camUp[2])
      gl.bindVertexArray(sprayVao)
      gl.uniform1f(P.spray.u.u_at, 0)
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, jetCount)
      common(P.jet)
      gl.bindVertexArray(jetVao)
      gl.drawArraysInstanced(gl.TRIANGLES, 0, JET_VERTS, jetCount)
      common(P.spray)
      gl.bindVertexArray(sprayVao)
      gl.uniform1f(P.spray.u.u_at, 1)
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, jetCount)
    }
    gl.disable(gl.BLEND)
    gl.depthMask(true)
    gl.bindVertexArray(null)
  }
  const ROAD = hx('#ffffff'), ROAD_EDGE = hx('#dcd5c7')
  // Street lights: the roads themselves glow after dark.
  const GLOW_ROAD = hx('#e39b58'), GLOW_BIG = hx('#ffc070'), GLOW_EDGE = hx('#b37436'), GLOW_RAIL = hx('#d9545c')

  const project = (w: [number, number, number]): [number, number, boolean] => {
    const m = vp
    const x = m[0] * w[0] + m[4] * w[1] + m[8] * w[2] + m[12]
    const y = m[1] * w[0] + m[5] * w[1] + m[9] * w[2] + m[13]
    const ww = m[3] * w[0] + m[7] * w[1] + m[11] * w[2] + m[15]
    return [((x / ww) * 0.5 + 0.5) * state.W, (0.5 - (y / ww) * 0.5) * state.H, ww > 0]
  }

  const loop = (now: number) => {
    if (!state.running) return
    requestAnimationFrame(loop)
    const dt = Math.min((now - state.last) / 1000, 0.05)
    const real = (now - state.last) / 1000
    state.last = now
    if (document.hidden || !state.visible) return
    state.time += dt
    if (state.speed) {
      state.t += dt * state.speed
      if (state.speed > 0 && state.t >= DONE) { state.t = DONE; state.speed = 0; state.resolve?.(); state.resolve = null }
      if (state.speed < 0 && state.t <= 0) { state.t = 0; state.speed = 0; state.resolve?.(); state.resolve = null }
    }
    if (ride.rate || ride.target !== ride.p) {
      ride.target = Math.max(0, Math.min(1, ride.target + ride.rate * dt))
      ride.p += (ride.target - ride.p) * (1 - Math.exp(-dt * 3.4))
      if (Math.abs(ride.target - ride.p) < 0.0002) ride.p = ride.target
    }
    if (ride.tour) ride.orbit = ride.p > 0.995 ? ride.orbit + dt * ride.tour.orbit : ride.orbit * Math.exp(-dt * 2.5)
    // If the machine can't keep up, trade resolution for smoothness.
    state.frames++
    state.fpsAvg += (real - state.fpsAvg) * 0.05
    if (state.frames > 30 && state.fpsAvg > 1 / 48 && state.dpr > 1) { state.dpr = Math.max(1, state.dpr - 0.25); state.frames = 0; state.fpsAvg = 1 / 60 }
    draw()
    state.onFrame?.(project, state.t)
  }

  // Draw one tiny frame with everything in it now, so the graphics driver has built all its pipelines before anyone clicks.
  canvas.width = canvas.height = 64
  state.W = state.H = 64
  state.t = DONE
  draw()
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4))
  state.t = 0
  state.shadowT = -1
  state.tick = 0

  return {
    canvas,
    drag,
    aim,
    ride,
    setVisible(v) { state.visible = v },
    setEnv(e) {
      const moved = Math.hypot(e.L[0] - env.L[0], e.L[1] - env.L[1], e.L[2] - env.L[2]) > 0.002
      env = e
      if (moved) { lvp = lightMatrix(); lvp2 = lightMatrix2(); state.shadowT = -1 }
    },
    fps: () => (state.fpsAvg ? 1 / state.fpsAvg : 0),
    play(speed) {
      state.speed = speed
      return new Promise(res => { state.resolve?.(); state.resolve = res })
    },
    start(onFrame) {
      state.onFrame = onFrame
      if (state.running) return
      state.running = true
      state.last = performance.now()
      requestAnimationFrame(loop)
    },
    stop() {
      state.running = false
      state.onFrame = null
      state.resolve = null
      state.t = 0
      state.speed = 0
      state.shadowT = -1
    },
    debugTime(frames, shadows = false) {
      // How long the graphics card really takes: a pixel read can't return until the frame is finished.
      const px = new Uint8Array(4), times: number[] = []
      forceShadow = shadows
      for (let i = 0; i < frames; i++) {
        const t0 = performance.now()
        state.time += 0.016
        if (shadows) state.shadowT = -1
        draw()
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px)
        times.push(performance.now() - t0)
      }
      forceShadow = false
      times.sort((a, b) => a - b)
      return { median: times[frames >> 1], worst: times[frames - 1], size: `${canvas.width}x${canvas.height}` }
    },
    debugSeek(t2, time) {
      state.t = t2
      if (time !== undefined) state.time = time
      cur.az = drag.az; cur.el = drag.el
      draw()
      state.onFrame?.(project, state.t)
    },
  }
}

function cross(a: number[], b: number[]) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]] }
function dot(a: number[], b: number[]) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] }
function norm(a: number[]) { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l] }
