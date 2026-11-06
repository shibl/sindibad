// The sea, in raw WebGL2: a projected grid displaced by Gerstner waves, a late sun, a painted sky, planar reflections of whatever
// floats on it, and a real wave-equation ripple field the pointer, the dhow and the phone's signal all write into.
import { HEAD, compile, freeTarget, invert, lookAt, mul, norm, perspective, target, textureFrom, type M4, type Prog, type Target, type V3 } from './glx'

// One sun for the sky, the water and every rendered sprite. Matches SUN_END in concepts/blender/about/phone/path.py.
export const SUN: V3 = norm([0.2, 1, 0.135])

// The swell. Direction (degrees from +y), wavelength, amplitude, steepness. Long waves roll toward the camera, a little across it.
export const WAVES: [number, number, number, number][] = [
  [186, 74, 0.62, 0.34],
  [168, 47, 0.42, 0.42],
  [205, 29, 0.25, 0.5],
  [150, 19, 0.15, 0.55],
  [222, 12.3, 0.085, 0.55],
  [176, 8.1, 0.05, 0.55],
  [136, 5.3, 0.03, 0.5],
  [198, 3.7, 0.018, 0.45],
]
const G = 9.8
const WAVE_DATA = WAVES.map(([deg, len, amp, q]) => {
  const k = (2 * Math.PI) / len
  const a = (deg * Math.PI) / 180
  return { dx: Math.sin(a), dy: Math.cos(a), k, w: Math.sqrt(G * k), amp, q }
})

/** Height and slope of the swell at a point, for things that float on it. */
export function swell(x: number, y: number, t: number) {
  let h = 0
  let sx = 0
  let sy = 0
  for (const w of WAVE_DATA) {
    const ph = w.k * (w.dx * x + w.dy * y) - w.w * t
    h += w.amp * Math.sin(ph)
    const c = w.amp * w.k * Math.cos(ph)
    sx += c * w.dx
    sy += c * w.dy
  }
  return { h, sx, sy }
}

const glsl3 = (v: V3) => `vec3(${v.map(n => n.toFixed(5)).join(',')})`
const WAVE_GLSL = `
const int NW = ${WAVE_DATA.length};
const vec4 WA[NW] = vec4[NW](${WAVE_DATA.map(w => `vec4(${w.dx.toFixed(5)},${w.dy.toFixed(5)},${w.k.toFixed(5)},${w.w.toFixed(5)})`).join(',')});
const vec2 WB[NW] = vec2[NW](${WAVE_DATA.map(w => `vec2(${w.amp.toFixed(5)},${w.q.toFixed(5)})`).join(',')});
`

const COMMON = `
const vec3 SUN = ${glsl3(SUN)};
// The sky, display-referred, chosen so ink text stays above AA everywhere it can sit.
const vec3 ZENITH = vec3(0.565, 0.800, 0.860);
const vec3 MID = vec3(0.800, 0.910, 0.920);
const vec3 LOW = vec3(0.985, 0.915, 0.800);
const vec3 HORIZON = vec3(1.000, 0.835, 0.640);
uniform sampler2D u_clouds;
uniform float u_time;
vec3 skyBase(vec3 d) {
  float e = max(d.z, 0.0);
  vec3 c = mix(HORIZON, LOW, smoothstep(0.0, 0.055, e));
  c = mix(c, MID, smoothstep(0.03, 0.26, e));
  c = mix(c, ZENITH, smoothstep(0.2, 0.75, e));
  float s = max(dot(normalize(d), SUN), 0.0);
  // The air around a low sun, wide and warm.
  c = mix(c, vec3(1.0, 0.925, 0.76), pow(s, 12.0) * 0.55);
  c = mix(c, vec3(1.0, 0.86, 0.62), pow(s, 90.0) * 0.5);
  return c;
}
vec4 cloudAt(vec3 d) {
  // Clouds live on a strip of azimuth against elevation, drifting very slowly.
  float az = atan(d.x, d.y) / 2.2 + 0.5 + u_time * 0.0009;
  float el = pow(max(d.z, 0.0), 0.72) * 1.45;
  return texture(u_clouds, vec2(az, el));
}
vec3 skyColor(vec3 d) {
  vec3 c = skyBase(d);
  vec4 cl = cloudAt(d);
  c = c * (1.0 - cl.a) + cl.rgb;
  float s = max(dot(normalize(d), SUN), 0.0);
  // The disc itself is hot enough to burn through a thin cloud.
  c += vec3(1.0, 0.9, 0.7) * smoothstep(0.99982, 0.99992, s) * 0.85;
  c += vec3(1.0, 0.86, 0.6) * pow(s, 1400.0) * 0.5;
  return c;
}
`

const SKY_VS = `${HEAD}
uniform mat4 u_ivp; uniform vec3 u_cam; out vec3 v_d;
void main() {
  vec2 p = vec2(gl_VertexID == 1 ? 3. : -1., gl_VertexID == 2 ? 3. : -1.);
  vec4 w = u_ivp * vec4(p, 1., 1.);
  v_d = w.xyz / w.w - u_cam;
  gl_Position = vec4(p, 1., 1.);
}`

const SKY_FS = `${HEAD}${COMMON}
in vec3 v_d; out vec4 o;
float dither() { return fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5; }
void main() {
  vec3 d = normalize(v_d);
  vec3 c = skyColor(d);
  o = vec4(c + dither() / 255.0, 1.0);
}`

// The painted clouds: rendered once into a strip when the scene starts, so the live sky costs one texture read.
const CLOUD_FS = `${HEAD}
in vec2 v_uv; out vec4 o;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p, float per) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * f * (f * (f * 6. - 15.) + 10.);
  vec2 q = vec2(per, 1000.);
  float a = hash(mod(i, q)), b = hash(mod(i + vec2(1, 0), q)), c = hash(mod(i + vec2(0, 1), q)), d = hash(mod(i + vec2(1, 1), q));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p, float per, int n) {
  float s = 0., a = .5;
  for (int i = 0; i < n; i++) { s += a * noise(p, per); p *= 2.03; p.y += 3.1; per *= 2.03; a *= .52; }
  return s;
}
float density(vec2 p) {
  // Billowing lower clouds: flat-bottomed, heaped upward, bigger and sparser high in the sky.
  float per = 14.0;
  vec2 q = vec2(p.x * per, p.y * 9.0);
  vec2 warp = vec2(fbm(q * 0.7 + 7.0, floor(per * 0.7), 4), fbm(q * 0.7 + 21.0, floor(per * 0.7), 4));
  float d = fbm(q + warp * 1.6, per, 6);
  return d;
}
void main() {
  vec2 uv = v_uv;
  float band = smoothstep(0.015, 0.09, uv.y) * smoothstep(0.62, 0.2, uv.y);
  float gate = 0.53 + 0.1 * smoothstep(0.1, 0.5, uv.y);
  float d = density(uv);
  float a = smoothstep(gate, gate + 0.17, d) * band;
  // Light from the low sun: sample toward it for soft self-shadow.
  vec2 toSun = normalize(vec2((0.5 + 0.09 - uv.x) * 3.0, -0.6));
  float dl = density(uv + toSun * 0.018);
  float dl2 = density(uv + toSun * 0.05);
  float shade = clamp(0.5 + (d - dl) * 3.2 + (d - dl2) * 1.6, 0.0, 1.0);
  vec3 lit = vec3(1.0, 0.975, 0.93);
  vec3 dark = vec3(0.885, 0.815, 0.795);
  vec3 under = vec3(0.985, 0.76, 0.60);
  vec3 c = mix(dark, lit, shade);
  // Warm undersides close to the horizon.
  c = mix(under, c, smoothstep(0.02, 0.2, uv.y));
  // Thin high streaks.
  float st = fbm(vec2(uv.x * 10.0, uv.y * 62.0) + 5.0, 10.0, 5);
  float sa = smoothstep(0.54, 0.86, st) * smoothstep(0.22, 0.38, uv.y) * smoothstep(0.98, 0.5, uv.y) * 0.42;
  vec3 out_c = c * a;
  float out_a = a;
  out_c = out_c + vec3(1.0, 0.985, 0.96) * sa * (1.0 - out_a);
  out_a = out_a + sa * (1.0 - out_a);
  o = vec4(out_c, out_a);
}`

const QUAD_VS = `${HEAD}
out vec2 v_uv;
void main() {
  vec2 p = vec2(gl_VertexID == 1 ? 3. : -1., gl_VertexID == 2 ? 3. : -1.);
  v_uv = p * .5 + .5;
  gl_Position = vec4(p, 0., 1.);
}`

// A tiling sheet of small waves: slope in xy, height in z. Generated once.
const DETAIL_FS = `${HEAD}
in vec2 v_uv; out vec4 o;
const float TAU = 6.283185307;
void main() {
  vec2 s = vec2(0.0);
  float h = 0.0, wsum = 0.0;
  for (int i = 0; i < 48; i++) {
    float fi = float(i);
    float seed = fract(sin(fi * 12.9898) * 43758.5453);
    float seed2 = fract(sin(fi * 78.233) * 12543.123);
    float seed3 = fract(sin(fi * 39.425) * 95413.771);
    // Integer frequencies, so it tiles.
    float m = floor(2.0 + pow(seed, 1.8) * 26.0);
    float ang = seed2 * TAU;
    vec2 f = floor(vec2(cos(ang), sin(ang)) * m + 0.5);
    float l = length(f);
    if (l < 0.5) continue;
    float a = 1.0 / pow(l, 1.15);
    float ph = TAU * dot(f, v_uv) + seed3 * TAU;
    // A sharper crest than a sine.
    float wave = sin(ph);
    float c = cos(ph);
    float sharp = exp(wave * 1.2 - 1.2);
    h += a * sharp;
    s += a * sharp * 1.2 * c * f * TAU * 0.02;
    wsum += a;
  }
  s /= wsum * 0.14;
  o = vec4(s * 0.5 + 0.5, clamp(h / wsum, 0.0, 1.0), 1.0);
}`

// The ripple field. R: height now. G: height last step. B: foam.
const RIPPLE_FS = `${HEAD}
in vec2 v_uv; out vec4 o;
uniform sampler2D u_prev; uniform vec2 u_texel;
uniform vec4 u_drops[12]; uniform int u_ndrops;
void main() {
  vec4 c = texture(u_prev, v_uv);
  float n = texture(u_prev, v_uv + vec2(0., u_texel.y)).r;
  float s = texture(u_prev, v_uv - vec2(0., u_texel.y)).r;
  float e = texture(u_prev, v_uv + vec2(u_texel.x, 0.)).r;
  float w = texture(u_prev, v_uv - vec2(u_texel.x, 0.)).r;
  float lap = n + s + e + w - 4.0 * c.r;
  float nxt = 2.0 * c.r - c.g + lap * 0.45;
  nxt *= 0.992;
  // Fade toward the edges so nothing rebounds off them.
  vec2 ed = min(v_uv, 1.0 - v_uv);
  nxt *= smoothstep(0.0, 0.06, min(ed.x, ed.y));
  float foam = c.b * 0.988;
  foam += smoothstep(0.1, 0.7, abs(nxt - c.r)) * 0.2;
  for (int i = 0; i < u_ndrops; i++) {
    vec4 d = u_drops[i];
    vec2 r = (v_uv - d.xy) / d.z;
    float g = exp(-dot(r, r));
    nxt += d.w * g;
    foam += abs(d.w) * g * 0.12;
  }
  o = vec4(nxt, c.r, min(foam, 1.0), 1.0);
}`

const SEA_VS = `${HEAD}${WAVE_GLSL}
in vec2 a_p;
uniform mat4 u_vp; uniform mat4 u_ivp; uniform vec3 u_cam; uniform float u_time; uniform float u_swell;
out vec3 v_w; out vec3 v_n; out float v_crest; out vec3 v_flat;
void main() {
  vec4 fw = u_ivp * vec4(a_p, 1., 1.);
  vec3 d = normalize(fw.xyz / fw.w - u_cam);
  d.z = min(d.z, -0.0012);
  float s = (0.0 - u_cam.z) / d.z;
  s = min(s, 5200.0);
  vec3 p = u_cam + d * s;
  vec3 flat_p = p;
  float fade = 1.0 / (1.0 + s * s * 0.0000012);
  vec3 off = vec3(0.0);
  vec2 sl = vec2(0.0);
  float crest = 0.0;
  for (int i = 0; i < NW; i++) {
    vec4 a = WA[i]; vec2 b = WB[i];
    float ph = a.z * dot(a.xy, flat_p.xy) - a.w * u_time;
    float sn = sin(ph), cs = cos(ph);
    float amp = b.x * u_swell;
    float q = b.y / (a.z * max(b.x, 1e-3) * float(NW));
    off.xy += q * amp * a.xy * cs;
    off.z += amp * sn;
    sl += amp * a.z * a.xy * cs;
    crest += q * amp * a.z * sn;
  }
  off *= fade;
  sl *= fade;
  p += off;
  v_w = p;
  v_flat = flat_p;
  v_n = vec3(-sl, 1.0);
  v_crest = crest;
  gl_Position = u_vp * vec4(p, 1.0);
}`

const SEA_FS = `${HEAD}${COMMON}
in vec3 v_w; in vec3 v_n; in float v_crest; in vec3 v_flat; out vec4 o;
uniform vec3 u_cam; uniform sampler2D u_detail; uniform sampler2D u_ripple; uniform sampler2D u_refl; uniform vec4 u_rect; uniform vec2 u_res; uniform float u_foamAmt;
uniform float u_ripOn; uniform float u_time2;
float dither() { return fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5; }
void main() {
  vec3 toCam = u_cam - v_w;
  float dist = length(toCam);
  vec3 V = toCam / dist;
  // Small waves over the swell, three sizes crossing each other.
  float nearF = 1.0 / (1.0 + dist * 0.0035);
  float tt = u_time2;
  vec3 d1 = texture(u_detail, v_flat.xy * 0.0174 + tt * vec2(0.0035, -0.0105)).xyz;
  vec3 d2 = texture(u_detail, v_flat.yx * 0.0473 + tt * vec2(-0.0150, -0.0096)).xyz;
  vec3 d3 = texture(u_detail, v_flat.xy * 0.1310 + tt * vec2(0.0210, -0.0300)).xyz;
  float farCalm = 0.42 + 0.58 * smoothstep(0.08, 0.5, nearF);
  vec2 fine = ((d1.xy - 0.5) * 0.30 + (d2.xy - 0.5) * 0.22 * (0.45 + 0.55 * nearF) + (d3.xy - 0.5) * 0.16 * nearF) * farCalm;
  // The ripple field.
  vec2 ruv = (v_flat.xy - u_rect.xy) / u_rect.zw;
  vec2 ripSlope = vec2(0.0);
  float ripFoam = 0.0;
  if (u_ripOn > 0.5 && all(greaterThan(ruv, vec2(0.0))) && all(lessThan(ruv, vec2(1.0)))) {
    vec2 tx = 1.0 / vec2(textureSize(u_ripple, 0));
    float e = texture(u_ripple, ruv + vec2(tx.x, 0.)).r, w = texture(u_ripple, ruv - vec2(tx.x, 0.)).r;
    float n = texture(u_ripple, ruv + vec2(0., tx.y)).r, s = texture(u_ripple, ruv - vec2(0., tx.y)).r;
    ripSlope = vec2(e - w, n - s) * 0.5 * 0.9;
    ripFoam = texture(u_ripple, ruv).b;
  }
  vec2 slope = v_n.xy * 1.0 + fine * vec2(1.0, 1.0) - ripSlope;
  vec3 N = normalize(vec3(slope, 1.0));
  // The body of the water: dark teal looking down, lit turquoise through the backs of waves in front of the sun.
  float facing = max(dot(N, V), 0.0);
  vec3 deep = vec3(0.012, 0.215, 0.285);
  vec3 mid = vec3(0.020, 0.420, 0.475);
  vec3 lit = vec3(0.120, 0.720, 0.690);
  float h = v_w.z;
  vec3 body = mix(deep, mid, smoothstep(0.1, 0.62, 1.0 - facing));
  vec2 sunXY = normalize(SUN.xy);
  float back = pow(max(dot(-V, vec3(SUN.xy, 0.25)), 0.0), 3.0);
  float thru = clamp(h * 0.55 + 0.25 + dot(slope, sunXY) * -1.2, 0.0, 1.0);
  body = mix(body, lit, thru * thru * back * 0.85);
  // Reflection.
  vec3 R = reflect(-V, N);
  R.z = abs(R.z) + 0.004;
  float F = 0.021 + 0.979 * pow(1.0 - facing, 5.0);
  F = min(F, 0.82);
  vec3 refl = skyColor(R);
  // Reflections of floating things, slightly smeared by the surface.
  vec2 suv = gl_FragCoord.xy / u_res;
  vec2 rd = slope * vec2(0.09, 0.22);
  vec2 tp = 1.5 / u_res;
  vec4 ro = (texture(u_refl, suv + rd) + texture(u_refl, suv + rd * 1.5 + vec2(tp.x * 2.0, tp.y * 5.0)) + texture(u_refl, suv + rd * 0.6 - vec2(tp.x * 2.0, tp.y * 3.0)) + texture(u_refl, suv + rd * 2.0 + vec2(0.0, -tp.y * 8.0))) * 0.25;
  refl = refl * (1.0 - ro.a) + ro.rgb;
  float fo = F + (1.0 - F) * ro.a * 0.42;
  vec3 col = mix(body, refl, fo);
  // The sun on the water: a tall glittering road, sharper close by.
  vec3 H = normalize(V + SUN);
  float nh = max(dot(N, H), 0.0);
  float rough = mix(0.012, 0.0009, clamp(nearF * 1.1, 0.0, 1.0));
  float glint = exp(-(1.0 - nh) / rough);
  // Broad sheen of the road far away, sparkle near.
  vec3 Hf = normalize(V + SUN);
  vec3 Nf = normalize(vec3(slope * 0.62, 1.0));
  float sheen = pow(max(dot(Nf, Hf), 0.0), 260.0);
  col += vec3(1.0, 0.84, 0.58) * (glint * 2.6 + sheen * 0.75);
  // Foam: thin lace on the crests, plus whatever the flood is still shedding and the ripple field has churned.
  float lace = texture(u_detail, v_flat.xy * 0.041 + vec2(0.0, tt * 0.004)).z;
  float lace2 = texture(u_detail, v_flat.xy * 0.113 - vec2(tt * 0.006, 0.0)).z;
  float cover = smoothstep(0.34, 0.56, lace * 0.65 + lace2 * 0.45);
  float crestF = smoothstep(0.26, 0.5, v_crest + (lace2 - 0.3) * 0.25) * cover * (0.35 + 0.65 * nearF);
  float flood = smoothstep(0.75 - u_foamAmt * 0.75, 1.0 - u_foamAmt * 0.6, lace * 0.75 + lace2 * 0.42 + 0.06);
  float foam = clamp(crestF + flood * u_foamAmt * 1.15 + ripFoam * (0.6 + lace2 * 0.8), 0.0, 1.0);
  vec3 foamC = mix(vec3(0.89, 0.94, 0.93), vec3(1.0, 0.965, 0.885), max(dot(N, SUN) * 0.5 + 0.5, 0.0));
  col = mix(col, foamC, foam * (0.86));
  // Aerial haze into the horizon colour.
  vec3 dir = normalize(vec3(-V.x, -V.y, 0.0));
  vec3 air = skyBase(dir + vec3(0.0, 0.0, 0.002));
  float hz = 1.0 - exp(-pow(dist * 0.00062, 1.35));
  col = mix(col, air, hz);
  o = vec4(col + dither() / 255.0, 1.0);
}`

// Anything that floats: a textured upright card in world space. Below the local waterline it's hidden and foam laps at the line.
const CARD_VS = `${HEAD}
in vec2 a_p;
uniform mat4 u_vp; uniform vec3 u_o; uniform vec3 u_ax; uniform vec3 u_ay; uniform float u_mirror; out vec2 v_uv; out vec3 v_w;
void main() {
  v_uv = vec2(a_p.x, 1.0 - a_p.y);
  vec3 p = u_o + u_ax * (a_p.x - 0.5) + u_ay * a_p.y;
  if (u_mirror > 0.5) p.z = -p.z;
  v_w = p;
  gl_Position = u_vp * vec4(p, 1.0);
}`

const CARD_FS = `${HEAD}
in vec2 v_uv; in vec3 v_w; out vec4 o;
uniform sampler2D u_tex; uniform vec4 u_tint; uniform float u_water; uniform float u_time; uniform float u_mirror; uniform vec2 u_sway; uniform vec4 u_flag;
uniform float u_alpha; uniform float u_waterScale; uniform float u_skirt;
void main() {
  vec2 uv = v_uv;
  // Sail-belly sway: only the upper part of the card, more toward the top.
  if (u_sway.x > 0.0) {
    float k = smoothstep(u_sway.y, 0.0, uv.y);
    uv.x += sin(u_time * 1.3 + uv.y * 7.0 + uv.x * 3.0) * u_sway.x * k;
  }
  vec4 c = texture(u_tex, uv);
  // Foam where the thing meets the water: just under the bottom edge of its alpha, wobbling.
  if (u_skirt > 0.0 && u_mirror < 0.5) {
    float wob = 0.5 + 0.5 * sin(v_w.x * 1.6 + u_time * 1.7) * sin(v_w.x * 0.57 - u_time * 0.9);
    float reach = u_skirt * (0.35 + 0.9 * wob);
    float above = texture(u_tex, uv - vec2(0.0, reach)).a;
    float above2 = texture(u_tex, uv - vec2(reach * 0.35, reach * 0.55)).a;
    float edge = max(above, above2) * (1.0 - c.a);
    // In patches that come and go, never an even outline.
    float lace = smoothstep(-0.25, 0.75, sin(v_w.x * 0.83 + u_time * 0.9 + sin(v_w.x * 0.37 - u_time * 0.6) * 2.4) * 0.6 + sin(v_w.x * 2.9 - u_time * 1.4) * 0.4);
    vec3 fc = vec3(0.97, 0.985, 0.95);
    float a = smoothstep(0.0, 1.0, edge) * lace * 0.62;
    c = vec4(c.rgb + fc * a * (1.0 - c.a), c.a + a * (1.0 - c.a));
  }
  // premultiplied
  if (u_alpha < 0.999) c *= u_alpha;
  // Atmosphere: mix toward the air colour for distant things.
  c.rgb = mix(c.rgb, u_tint.rgb * c.a, u_tint.a);
  if (u_mirror < 0.5 && u_waterScale > 0.0) {
    // The waterline wobbles on small waves.
    float wob = sin(v_w.x * 0.9 + u_time * 1.4) * 0.22 + sin(v_w.x * 2.3 - u_time * 1.9) * 0.1 + sin(v_w.x * 0.31 + u_time * 0.7) * 0.34;
    float line = u_water + wob * u_waterScale;
    float dz = v_w.z - line;
    float a = smoothstep(-0.04, 0.05, dz / max(u_waterScale, 0.15));
    float rim = smoothstep(0.9, 0.0, dz / max(u_waterScale * 0.9, 0.1)) * a * c.a;
    c.rgb = mix(c.rgb, vec3(1.0, 0.97, 0.9) * c.a, rim * 0.72);
    c *= a;
  }
  o = c;
}`

// Far gulls: each a pair of thin wings, flapping now and then. They keep to the sky over the sun's road, away from the words.
const BIRD_VS = `${HEAD}
in vec3 a_p; uniform mat4 u_vp;
void main() { gl_Position = u_vp * vec4(a_p, 1.0); }`
const BIRD_FS = `${HEAD}
out vec4 o; uniform vec4 u_c;
void main() { o = u_c; }`

export type Card = {
  tex: WebGLTexture
  /** Foot of the card on the water plane, world units. */
  x: number
  y: number
  z: number
  w: number
  h: number
  /** How much of the air colour to mix in, 0..1. */
  haze: number
  /** Below this height the card is under water. */
  water: number
  roll?: number
  sway?: [number, number]
  alpha?: number
  waterScale?: number
  mirror?: boolean
  /** Foam under the bottom edge of the card's own alpha: how far it reaches, in texture space. */
  skirt?: number
}

export type SeaState = {
  eye: V3
  at: V3
  lens: number
  frameAspect: number
  sx: number
  sy: number
  roll?: number
  time: number
  foam: number
  swell: number
  cards: Card[]
  birds: number
}

export class Sea {
  private sky: Prog
  private sea: Prog
  private card: Prog
  private ripple: Prog
  private vao: WebGLVertexArrayObject
  private grid: WebGLBuffer
  private ibo: WebGLBuffer
  private cardVao: WebGLVertexArrayObject
  private cardBuf: WebGLBuffer
  private indices = 0
  private bird: Prog
  private birdVao: WebGLVertexArrayObject
  private birdBuf: WebGLBuffer
  private birdData = new Float32Array(9 * 2 * 9)
  private clouds: WebGLTexture
  private detail: WebGLTexture
  private rip: [Target, Target] | null = null
  private refl: Target | null = null
  private drops: number[] = []
  private ripAcc = 0
  vp: M4 = new Float32Array(16)
  ivp: M4 = new Float32Array(16)
  eye: V3 = [0, 0, 1]
  /** The patch of sea covered by the ripple field: x0, y0, width, height. */
  rect: [number, number, number, number] = [-260, -180, 520, 620]

  constructor(private gl: WebGL2RenderingContext, private opts: { low: boolean }) {
    this.sky = compile(gl, SKY_VS, SKY_FS, 'sky')
    this.sea = compile(gl, SEA_VS, SEA_FS, 'sea')
    this.card = compile(gl, CARD_VS, CARD_FS, 'card')
    this.ripple = compile(gl, QUAD_VS, RIPPLE_FS, 'ripple')
    this.bird = compile(gl, BIRD_VS, BIRD_FS, 'bird')
    this.birdVao = gl.createVertexArray()!
    gl.bindVertexArray(this.birdVao)
    this.birdBuf = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, this.birdBuf)
    gl.bufferData(gl.ARRAY_BUFFER, this.birdData.byteLength, gl.DYNAMIC_DRAW)
    const bl = gl.getAttribLocation(this.bird.p, 'a_p')
    gl.enableVertexAttribArray(bl)
    gl.vertexAttribPointer(bl, 3, gl.FLOAT, false, 0, 0)
    gl.bindVertexArray(null)

    // The grid over the screen, a little beyond its edges.
    const nx = opts.low ? 110 : 240
    const ny = opts.low ? 130 : 200
    const verts = new Float32Array((nx + 1) * (ny + 1) * 2)
    let k = 0
    for (let j = 0; j <= ny; j++) {
      for (let i = 0; i <= nx; i++) {
        verts[k++] = (i / nx) * 2.5 - 1.25
        verts[k++] = (j / ny) * 2.5 - 1.25
      }
    }
    const idx = new Uint32Array(nx * ny * 6)
    k = 0
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const a = j * (nx + 1) + i
        const b = a + 1
        const c = a + nx + 1
        const d = c + 1
        idx[k++] = a
        idx[k++] = b
        idx[k++] = d
        idx[k++] = a
        idx[k++] = d
        idx[k++] = c
      }
    }
    this.indices = idx.length
    this.vao = gl.createVertexArray()!
    gl.bindVertexArray(this.vao)
    this.grid = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, this.grid)
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(this.sea.p, 'a_p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    this.ibo = gl.createBuffer()!
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW)

    this.cardVao = gl.createVertexArray()!
    gl.bindVertexArray(this.cardVao)
    this.cardBuf = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, this.cardBuf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW)
    const cl = gl.getAttribLocation(this.card.p, 'a_p')
    gl.enableVertexAttribArray(cl)
    gl.vertexAttribPointer(cl, 2, gl.FLOAT, false, 0, 0)
    gl.bindVertexArray(null)

    this.clouds = this.bakeClouds()
    this.detail = this.bakeDetail()
    gl.getExtension('EXT_color_buffer_float')
    gl.getExtension('EXT_color_buffer_half_float')
    gl.getExtension('OES_texture_float_linear')
    this.initRipple()
  }

  private bakeClouds() {
    const gl = this.gl
    const w = this.opts.low ? 1024 : 2048
    const h = this.opts.low ? 512 : 1024
    const t = target(gl, w, h, { wrap: gl.REPEAT, mips: true })
    const p = compile(gl, QUAD_VS, CLOUD_FS, 'clouds')
    gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb)
    gl.viewport(0, 0, w, h)
    gl.disable(gl.BLEND)
    gl.useProgram(p.p)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.bindTexture(gl.TEXTURE_2D, t.tex)
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.deleteProgram(p.p)
    gl.deleteFramebuffer(t.fb)
    return t.tex
  }

  private bakeDetail() {
    const gl = this.gl
    const s = this.opts.low ? 512 : 1024
    const t = target(gl, s, s, { wrap: gl.REPEAT, mips: true })
    const p = compile(gl, QUAD_VS, DETAIL_FS, 'detail')
    gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb)
    gl.viewport(0, 0, s, s)
    gl.disable(gl.BLEND)
    gl.useProgram(p.p)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.bindTexture(gl.TEXTURE_2D, t.tex)
    gl.generateMipmap(gl.TEXTURE_2D)
    const aniso = gl.getExtension('EXT_texture_filter_anisotropic')
    if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8)
    gl.deleteProgram(p.p)
    gl.deleteFramebuffer(t.fb)
    return t.tex
  }

  private initRipple() {
    const gl = this.gl
    const size = this.opts.low ? 192 : 320
    const make = () => target(gl, size, size, { internal: gl.RGBA16F, format: gl.RGBA, type: gl.HALF_FLOAT, filter: gl.LINEAR })
    const a = make()
    const b = make()
    gl.bindFramebuffer(gl.FRAMEBUFFER, a.fb)
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    if (!ok) {
      freeTarget(gl, a)
      freeTarget(gl, b)
      return
    }
    for (const t of [a, b]) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    this.rip = [a, b]
  }

  /** A disturbance in the ripple field, at a world point. Radius in world units. */
  drop(x: number, y: number, radius: number, strength: number) {
    if (!this.rip || this.drops.length >= 48) return
    const r = this.rect
    this.drops.push((x - r[0]) / r[2], (y - r[1]) / r[3], radius / r[2], strength)
  }

  /** Where a screen point (NDC) meets the sea, or null above the horizon. */
  pick(nx: number, ny: number): [number, number] | null {
    const m = this.ivp
    const w = m[3] * nx + m[7] * ny + m[11] + m[15]
    const fx = (m[0] * nx + m[4] * ny + m[8] + m[12]) / w
    const fy = (m[1] * nx + m[5] * ny + m[9] + m[13]) / w
    const fz = (m[2] * nx + m[6] * ny + m[10] + m[14]) / w
    const dx = fx - this.eye[0]
    const dy = fy - this.eye[1]
    const dz = fz - this.eye[2]
    if (dz >= -1e-4) return null
    const s = -this.eye[2] / dz
    return [this.eye[0] + dx * s, this.eye[1] + dy * s]
  }

  stepRipple(dt: number) {
    if (!this.rip) return
    const gl = this.gl
    this.ripAcc = Math.min(this.ripAcc + dt, 1 / 20)
    const step = 1 / 60
    let first = true
    gl.disable(gl.BLEND)
    gl.useProgram(this.ripple.p)
    while (this.ripAcc >= step) {
      this.ripAcc -= step
      const pair: [Target, Target] = this.rip
      const [a, b] = pair
      gl.bindFramebuffer(gl.FRAMEBUFFER, b.fb)
      gl.viewport(0, 0, b.w, b.h)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, a.tex)
      gl.uniform1i(this.ripple.u('u_prev'), 0)
      gl.uniform2f(this.ripple.u('u_texel'), 1 / a.w, 1 / a.h)
      const n = first ? Math.min(12, this.drops.length / 4) : 0
      gl.uniform1i(this.ripple.u('u_ndrops'), n)
      if (n) gl.uniform4fv(this.ripple.u('u_drops'), new Float32Array(this.drops.slice(0, n * 4)))
      if (first) this.drops.splice(0, n * 4)
      first = false
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      this.rip = [b, a]
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  private ensureRefl(w: number, h: number) {
    const gl = this.gl
    const rw = Math.max(2, Math.round(w / 3))
    const rh = Math.max(2, Math.round(h / 3))
    if (this.refl && this.refl.w === rw && this.refl.h === rh) return
    freeTarget(gl, this.refl)
    this.refl = target(gl, rw, rh, {})
  }

  private drawCard(c: Card, mirror: boolean, time: number) {
    const gl = this.gl
    const p = this.card
    const roll = c.roll ?? 0
    const cr = Math.cos(roll)
    const sr = Math.sin(roll)
    gl.uniform3f(p.u('u_o'), c.x, c.y, c.z)
    gl.uniform3f(p.u('u_ax'), c.w * cr, 0, c.w * sr)
    gl.uniform3f(p.u('u_ay'), -c.h * sr, 0, c.h * cr)
    gl.uniform1f(p.u('u_mirror'), mirror ? 1 : 0)
    gl.uniform1f(p.u('u_water'), c.water)
    gl.uniform1f(p.u('u_waterScale'), c.waterScale ?? 1)
    gl.uniform1f(p.u('u_skirt'), c.skirt ?? 0)
    gl.uniform1f(p.u('u_alpha'), c.alpha ?? 1)
    gl.uniform1f(p.u('u_time'), time)
    gl.uniform2f(p.u('u_sway'), c.sway?.[0] ?? 0, c.sway?.[1] ?? 0)
    gl.uniform4f(p.u('u_tint'), 1.0, 0.86, 0.7, c.haze)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, c.tex)
    gl.uniform1i(p.u('u_tex'), 0)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  /** Draw sky, sea and floating things to the current framebuffer, at w by h pixels. */
  render(s: SeaState, w: number, h: number, outFb: WebGLFramebuffer | null = null) {
    const gl = this.gl
    const view = lookAt(s.eye, s.at)
    const proj = perspective(s.lens, s.frameAspect, s.sx, s.sy, 1, 12000)
    this.vp = mul(proj, view)
    this.ivp = invert(this.vp)
    this.eye = s.eye

    // Reflections of the cards.
    this.ensureRefl(w, h)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.refl!.fb)
    gl.viewport(0, 0, this.refl!.w, this.refl!.h)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.disable(gl.DEPTH_TEST)
    gl.useProgram(this.card.p)
    gl.uniformMatrix4fv(this.card.u('u_vp'), false, this.vp)
    gl.bindVertexArray(this.cardVao)
    for (const c of s.cards) if (c.mirror !== false) this.drawCard(c, true, s.time)

    gl.bindFramebuffer(gl.FRAMEBUFFER, outFb)
    gl.viewport(0, 0, w, h)
    gl.disable(gl.BLEND)

    // The sky.
    gl.useProgram(this.sky.p)
    gl.uniformMatrix4fv(this.sky.u('u_ivp'), false, this.ivp)
    gl.uniform3fv(this.sky.u('u_cam'), s.eye)
    gl.uniform1f(this.sky.u('u_time'), s.time)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.clouds)
    gl.uniform1i(this.sky.u('u_clouds'), 0)
    gl.bindVertexArray(null)
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    // The sea.
    const p = this.sea
    gl.useProgram(p.p)
    gl.uniformMatrix4fv(p.u('u_vp'), false, this.vp)
    gl.uniformMatrix4fv(p.u('u_ivp'), false, this.ivp)
    gl.uniform3fv(p.u('u_cam'), s.eye)
    gl.uniform1f(p.u('u_time'), s.time)
    gl.uniform1f(p.u('u_time2'), s.time)
    gl.uniform1f(p.u('u_swell'), s.swell)
    gl.uniform1f(p.u('u_foamAmt'), s.foam)
    gl.uniform2f(p.u('u_res'), w, h)
    gl.uniform4fv(p.u('u_rect'), this.rect)
    gl.uniform1f(p.u('u_ripOn'), this.rip ? 1 : 0)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.clouds)
    gl.uniform1i(p.u('u_clouds'), 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.detail)
    gl.uniform1i(p.u('u_detail'), 1)
    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D, this.rip ? this.rip[0].tex : this.detail)
    gl.uniform1i(p.u('u_ripple'), 2)
    gl.activeTexture(gl.TEXTURE3)
    gl.bindTexture(gl.TEXTURE_2D, this.refl!.tex)
    gl.uniform1i(p.u('u_refl'), 3)
    gl.bindVertexArray(this.vao)
    gl.drawElements(gl.TRIANGLES, this.indices, gl.UNSIGNED_INT, 0)
    gl.bindVertexArray(null)
    gl.activeTexture(gl.TEXTURE0)

    // Floating things, far to near.
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.useProgram(this.card.p)
    gl.uniformMatrix4fv(this.card.u('u_vp'), false, this.vp)
    gl.bindVertexArray(this.cardVao)
    for (const c of s.cards) this.drawCard(c, false, s.time)
    gl.bindVertexArray(null)
    if (s.birds > 0) this.drawBirds(s.time, s.birds, s.eye)
    gl.disable(gl.BLEND)
  }

  private drawBirds(t: number, alpha: number, eye: V3) {
    const gl = this.gl
    const d = this.birdData
    let k = 0
    const count = 9
    for (let i = 0; i < count; i++) {
      const seed = i * 2.399
      const sp = 7 + (i % 3) * 2.2
      // A loose flock drifting across and around, wrapping far out of frame.
      const wrap = 760
      const rel = (t * sp * 0.6 + i * 137) % wrap
      const x = rel + 90 + eye[0] + Math.sin(t * 0.13 + seed) * 12
      const y = 900 + (i % 4) * 90 + Math.sin(seed) * 60
      const z = 138 + (i % 5) * 26 + Math.sin(t * 0.2 + seed) * 9
      const flap = Math.sin(t * (2.5 + (i % 3) * 0.5) + seed) * (0.5 + 0.5 * Math.sin(t * 0.33 + seed * 2))
      const span = (7.5 + (i % 3)) * Math.min(1, rel / 70, (wrap - rel) / 70)
      const lift = span * (0.2 + 0.5 * flap)
      const tip = span
      const thick = 0.75
      const push = (a: number, b: number, c: number) => {
        d[k++] = a
        d[k++] = b
        d[k++] = c
      }
      // Two triangles per wing, thin, with a slight sweep.
      for (const sgn of [-1, 1]) {
        push(x, y, z)
        push(x + sgn * tip * 0.45, y, z + lift * 0.75 + thick)
        push(x + sgn * tip, y, z + lift)
        push(x, y, z)
        push(x + sgn * tip * 0.45, y, z + lift * 0.75 - thick * 0.6)
        push(x + sgn * tip, y, z + lift)
      }
    }
    gl.useProgram(this.bird.p)
    gl.uniformMatrix4fv(this.bird.u('u_vp'), false, this.vp)
    const a = alpha * 0.62
    gl.uniform4f(this.bird.u('u_c'), 0.13 * a, 0.22 * a, 0.27 * a, a)
    gl.bindVertexArray(this.birdVao)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.birdBuf)
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, d.subarray(0, k))
    gl.drawArrays(gl.TRIANGLES, 0, k / 3)
    gl.bindVertexArray(null)
  }

  /** Project a world point to pixels in the output. */
  project(x: number, y: number, z: number, w: number, h: number): [number, number] {
    const m = this.vp
    const cw = m[3] * x + m[7] * y + m[11] * z + m[15]
    const cx = (m[0] * x + m[4] * y + m[8] * z + m[12]) / cw
    const cy = (m[1] * x + m[5] * y + m[9] * z + m[13]) / cw
    return [(cx * 0.5 + 0.5) * w, (0.5 - cy * 0.5) * h]
  }

  dispose() {
    const gl = this.gl
    for (const pr of [this.sky, this.sea, this.card, this.ripple, this.bird]) gl.deleteProgram(pr.p)
    gl.deleteVertexArray(this.birdVao)
    gl.deleteBuffer(this.birdBuf)
    gl.deleteVertexArray(this.vao)
    gl.deleteVertexArray(this.cardVao)
    gl.deleteBuffer(this.grid)
    gl.deleteBuffer(this.ibo)
    gl.deleteBuffer(this.cardBuf)
    gl.deleteTexture(this.clouds)
    gl.deleteTexture(this.detail)
    if (this.rip) {
      freeTarget(gl, this.rip[0])
      freeTarget(gl, this.rip[1])
    }
    freeTarget(gl, this.refl)
  }
}

export { textureFrom }
