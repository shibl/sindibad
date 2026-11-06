// Draws the book in raw WebGL2. One merged vertex buffer and one draw call per pass; the uniform block holds every part's matrix.
//   1. A shadow map from the key light, filtered so shadows sharpen at contact and soften with distance.
//   2. A top-down map of what stands over the page, blurred: soft occlusion at the foot of everything, and it moves with the paper.
//   3. The table, then the book and its paper world, with 4x MSAA from the context.
import { ARCH, BOOK, Mat } from './book'
import { lookAt, mul, norm, ortho, type M4 } from './math'
import { MAX_PARTS } from './rig'

const HEAD = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
precision highp sampler2DShadow;
`
const PARTS = `layout(std140) uniform Parts { vec4 PARTS[${MAX_PARTS * 5}]; };`

// The transform every pass shares: hinge matrix, flex along the height, a belly across the width, and a V-fold's shear.
const RIG = `
${PARTS}
layout(location=0) in vec3 a_p;
layout(location=1) in vec3 a_n;
layout(location=2) in vec2 a_uv;
layout(location=3) in uvec2 a_id;
struct Rigged { vec3 w, n, tx, ty, sh; float lx, flip; };
Rigged rig() {
  Rigged o;
  int b = int(a_id.x) * 5;
  int mat = int(a_id.y);
  vec4 r0 = PARTS[b], r1 = PARTS[b + 1], r2 = PARTS[b + 2], s = PARTS[b + 3], d = PARTS[b + 4];
  o.flip = d.w;
  o.sh = vec3(0.);
  o.lx = 0.;
  if (mat == ${Mat.Spine}) {
    float t = a_p.x;
    vec3 A = r0.xyz, C = r1.xyz, B = r2.xyz, Z = s.xyz;
    float u = 1. - t;
    o.w = u * u * A + 2. * u * t * C + t * t * B + Z * a_p.z;
    vec3 tg = normalize(2. * u * (C - A) + 2. * t * (B - C) + vec3(1e-5, 0., 0.));
    o.n = normalize(cross(tg, Z)) * -d.w;
    o.tx = tg; o.ty = Z;
    return o;
  }
  if (mat == ${Mat.Ribbon}) {
    float t = a_p.x, u = 1. - t;
    vec3 P0 = r0.xyz, P1 = r1.xyz, P2 = r2.xyz, P3 = s.xyz;
    vec3 c = u * u * u * P0 + 3. * u * u * t * P1 + 3. * u * t * t * P2 + t * t * t * P3;
    vec3 tg = normalize(3. * u * u * (P1 - P0) + 6. * u * t * (P2 - P1) + 3. * t * t * (P3 - P2) + vec3(0., 0., 1e-5));
    vec3 across = normalize(cross(tg, vec3(0., 1., 0.)) + vec3(1e-4, 0., 0.));
    o.w = c + across * a_p.z * d.x;
    o.n = normalize(cross(across, tg));
    if (o.n.y < 0.) o.n = -o.n;
    o.tx = tg; o.ty = across;
    return o;
  }
  mat3 RM = mat3(r0.x, r1.x, r2.x, r0.y, r1.y, r2.y, r0.z, r1.z, r2.z);
  if (mat >= ${Mat.TurnFront} && mat <= ${Mat.TurnEdge}) {
    // A bowed sheet: its angle grows evenly from the gutter to the fore-edge, so its position has a closed form.
    float phi = s.x, k = s.y, x = a_p.x;
    float b = phi + k * x;
    vec2 c = abs(k) > 1e-3 ? vec2(sin(b) - sin(phi), cos(phi) - cos(b)) / k : x * vec2(cos(phi), sin(phi));
    vec2 nr = vec2(-sin(b), cos(b)), tn = vec2(cos(b), sin(b));
    float e = exp(-x / .03) * ${BOOK.dip.toFixed(4)} * d.x;
    float off = a_p.y + e + s.z;
    vec3 q = vec3(c + nr * off + vec2(0., ${BOOK.Y0.toFixed(4)}), a_p.z);
    o.w = vec3(dot(r0, vec4(q, 1.)), dot(r1, vec4(q, 1.)), dot(r2, vec4(q, 1.)));
    o.n = RM * vec3(tn * a_n.x + nr * a_n.y, a_n.z);
    o.tx = RM * vec3(tn, 0.);
    o.ty = RM * vec3(0., 0., 1.);
    o.sh = vec3(d.y, d.z, 0.);
    return o;
  }
  vec3 lp = a_p;
  vec3 ltx = vec3(1., 0., 0.), lty = vec3(0., 1., 0.);
  float f = d.z;
  if (abs(f) > 1e-3 && mat <= ${Mat.Edge}) {
    float ang = f * lp.y, sa = sin(ang), ca = cos(ang);
    lp = vec3(lp.x, sa / f - lp.z * sa, (1. - ca) / f + lp.z * ca);
    lty = vec3(0., ca, sa);
  }
  if (d.x > 0. && (mat == ${Mat.Page} || mat == ${Mat.Block})) {
    float e = exp(-a_p.x / .03) * ${BOOK.dip.toFixed(4)} * d.x;
    lp.y += (mat == ${Mat.Page} ? 1. : a_uv.y) * e * d.z;
  }
  if (d.y != 0. && mat <= ${Mat.Edge}) {
    lp.z += d.y * lp.x * lp.x;
    ltx = vec3(1., 0., 2. * d.y * a_p.x);
  }
  vec4 h = vec4(lp, 1.);
  o.w = vec3(dot(r0, h), dot(r1, h), dot(r2, h));
  mat3 M = mat3(r0.x, r1.x, r2.x, r0.y, r1.y, r2.y, r0.z, r1.z, r2.z);
  o.tx = M * ltx;
  o.ty = M * lty;
  o.n = M * a_n;
  if (mat == ${Mat.ChapterTab}) o.sh = d.xyz;
  if (s.w != 0.) {
    o.lx = a_p.x - d.x;
    float sg = s.w;
    o.w += s.xyz * sg * abs(o.lx);
    o.sh = s.xyz * sg;
  }
  return o;
}`

const SHADOW_VS = `${HEAD}${RIG}
uniform mat4 u_svp;
void main() {
  Rigged r = rig();
  gl_Position = u_svp * vec4(r.w, 1.);
}`
const EMPTY_FS = `${HEAD}
out vec4 o; void main() { o = vec4(1.); }`

// The top-down map. Red: paper standing over the page, strongest at its foot. Green: the book over the table.
const OCC_VS = `${HEAD}${RIG}
uniform vec4 u_occ; out float v_h; flat out int v_book;
void main() {
  Rigged r = rig();
  v_h = r.w.y;
  int m = int(a_id.y);
  v_book = (m >= ${Mat.Page} && m <= ${Mat.Spine}) || m == ${Mat.Leaf} || m == ${Mat.Window} || m == ${Mat.ChapterTab} ? 1 : 0;
  if ((m >= ${Mat.TurnFront} && m <= ${Mat.TurnEdge}) || m == ${Mat.DoorFront} || m == ${Mat.DoorBack} || m == ${Mat.DoorEdge}) v_book = 2;
  gl_Position = vec4((r.w.xz - u_occ.xy) * u_occ.zw * vec2(1., -1.), .5, 1.);
}`
const OCC_FS = `${HEAD}
in float v_h; flat in int v_book; out vec4 o;
void main() {
  if (v_book == 2) {
    // A page or a door only shades what's under it once it has lifted off.
    float h = max(v_h - ${BOOK.Y0.toFixed(3)}, 0.);
    o = vec4(exp(-h * 3.) * smoothstep(.012, .07, h), 0., 0., 1.);
  } else if (v_book == 1) o = vec4(0., exp(-max(v_h, 0.) * 6.), 0., 1.);
  else o = vec4(exp(-max(v_h - ${BOOK.Y0.toFixed(3)}, 0.) * 8.), 0., 0., 1.);
}`
const BLUR_VS = `${HEAD}
out vec2 v_uv;
void main() {
  vec2 p = vec2(gl_VertexID == 1 ? 3. : -1., gl_VertexID == 2 ? 3. : -1.);
  v_uv = p * .5 + .5;
  gl_Position = vec4(p, 0., 1.);
}`
const BLUR_FS = `${HEAD}
in vec2 v_uv; uniform sampler2D u_t; uniform vec2 u_d; out vec4 o;
void main() {
  vec4 c = texture(u_t, v_uv) * .1964;
  c += (texture(u_t, v_uv + u_d * 1.41) + texture(u_t, v_uv - u_d * 1.41)) * .2969;
  c += (texture(u_t, v_uv + u_d * 3.29) + texture(u_t, v_uv - u_d * 3.29)) * .0945;
  c += (texture(u_t, v_uv + u_d * 5.17) + texture(u_t, v_uv - u_d * 5.17)) * .0104;
  o = c;
}`

const SHADOW_LIB = (taps: number) => `
uniform sampler2DShadow u_sh;
uniform sampler2D u_shd;
uniform mat4 u_svp;
uniform vec4 u_sp; // search radius, penumbra scale, smallest and largest radius
uniform float u_fade; // how fast a shadow thins with distance from what casts it
const vec2 DISK[16] = vec2[16](
  vec2(.1250,.0000),vec2(-.2024,.1854),vec2(.0413,-.3513),vec2(.2982,.3024),vec2(-.4802,-.0882),vec2(.4212,-.3481),
  vec2(-.1274,.5789),vec2(-.3772,-.5228),vec2(.6620,.1830),vec2(-.6390,.3584),vec2(.2460,-.7248),vec2(.3180,.7420),
  vec2(-.7825,-.3097),vec2(.8230,-.2780),vec2(-.3760,.8330),vec2(-.2570,-.9150));
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(.06711056, .00583715)))); }
float shadow(vec3 w, vec3 n) {
  vec4 q = u_svp * vec4(w + n * .0045, 1.);
  vec3 c = q.xyz * .5 + .5;
  if (c.x < .002 || c.x > .998 || c.y < .002 || c.y > .998) return 1.;
  float phi = ign(gl_FragCoord.xy) * 6.2832;
  float cs = cos(phi), sn = sin(phi);
  mat2 R = mat2(cs, sn, -sn, cs);
  float sum = 0., cnt = 0.;
  for (int i = 0; i < 8; i++) {
    float d = texture(u_shd, c.xy + R * DISK[i * 2] * u_sp.x).r;
    if (d < c.z - .0004) { sum += d; cnt += 1.; }
  }
  if (cnt < .5) return 1.;
  float rad = clamp((c.z - sum / cnt) * u_sp.y, u_sp.z, u_sp.w);
  float s = 0.;
  for (int i = 0; i < ${taps}; i++) s += texture(u_sh, vec3(c.xy + R * DISK[i * ${16 / taps}] * rad, c.z - .0004));
  float avg = (c.z - sum / cnt);
  return 1. - (1. - s / ${taps}.) * exp(-avg * u_fade);
}
vec3 finish(vec3 c) {
  // A gentle shoulder, then sRGB, then dither so soft gradients don't band.
  c = mix(c, 1. - (1. - .82) * exp(-(c - .82) / (1. - .82)), step(.82, c));
  c = pow(max(c, vec3(0.)), vec3(1. / 2.2));
  float n = ign(gl_FragCoord.xy + 17.3) - .5;
  return c + n / 255.;
}
`

const VS = `${HEAD}${RIG}
uniform mat4 u_vp;
out vec3 v_w, v_n, v_tx, v_ty, v_sh; out vec2 v_uv, v_lp; out float v_lx; flat out float v_flip, v_part; flat out int v_mat;
void main() {
  Rigged r = rig();
  v_w = r.w; v_n = r.n; v_tx = r.tx; v_ty = r.ty; v_sh = r.sh; v_lx = r.lx; v_flip = r.flip; v_part = float(a_id.x);
  v_uv = a_uv; v_lp = a_p.xy; v_mat = int(a_id.y);
  gl_Position = u_vp * vec4(r.w, 1.);
}`

const FS = (taps: number) => `${HEAD}
in vec3 v_w, v_n, v_tx, v_ty, v_sh; in vec2 v_uv, v_lp; in float v_lx; flat in float v_flip, v_part; flat in int v_mat;
out vec4 o;
uniform sampler2D u_atlas, u_pages, u_cover, u_blind, u_fibre, u_weave, u_occt;
uniform vec3 u_cam, u_L, u_key, u_sky, u_gnd;
uniform vec4 u_occ;
uniform float u_dir;
uniform vec4 u_sun; // where the paper sun is, and how far it has risen
uniform sampler2D u_plate, u_plateFoil, u_tabs, u_leaves;
uniform vec3 u_accent;
uniform vec3 u_back0, u_back1, u_back2;
uniform float u_backArt, u_rim;
${SHADOW_LIB(taps)}
// The arch cut through a chapter's page. Negative inside. p is across the page from the gutter, then along it.
float archD(vec2 p) {
  vec2 q = p - vec2(${ARCH.cx.toFixed(4)}, ${ARCH.zs.toFixed(4)});
  float ax = abs(q.x);
  float d = q.y < 0. ? length(vec2(ax + ${ARCH.c.toFixed(4)}, q.y)) - ${(ARCH.a + ARCH.c).toFixed(4)} : ax - ${ARCH.a.toFixed(4)};
  return max(d, q.y - ${(ARCH.zb - ARCH.zs).toFixed(4)});
}
vec3 bump(vec3 N, vec3 p, float h) {
  vec3 dx = dFdx(p), dy = dFdy(p);
  float hx = dFdx(h), hy = dFdy(h);
  vec3 r1 = cross(dy, N), r2 = cross(N, dx);
  float det = dot(dx, r1);
  return normalize(abs(det) * N - sign(det) * (hx * r1 + hy * r2));
}
vec3 gold(vec3 R, vec3 w, float n, float grain) {
  // A little room for the foil to reflect: pale all round, darker low down, and soft boxes overhead whose edges slide across
  // the cover as it turns. Offsetting by position is what makes the light travel over the stamping instead of flashing all at once.
  vec3 D = normalize(R + w * .3);
  D.x *= u_dir;
  float room = smoothstep(-.3, .75, D.y);
  float a = smoothstep(.962, .996, dot(D, normalize(vec3(-.30, .60, -.74))));
  float b = smoothstep(.88, .985, dot(D, normalize(vec3(.32, .74, .58))));
  float c = smoothstep(.86, .985, dot(D, normalize(vec3(-.72, .62, .3))));
  float e = .25 + .3 * room + .62 * a + .8 * b + .6 * c + (n - .5) * .34;
  e *= .9 + .24 * grain;
  vec3 deep = vec3(.34, .16, .03), mid = vec3(.84, .53, .13), hi = vec3(1.14, .88, .44);
  vec3 f = mix(deep, mid, clamp(e * 1.75, 0., 1.));
  return mix(f, hi, smoothstep(.62, 1.15, e));
}
void main() {
  int mat = v_mat;
  vec3 V = normalize(u_cam - v_w);
  vec3 N;
  if (mat <= ${Mat.Back}) {
    vec3 T = v_tx + v_sh * (v_lx < 0. ? -1. : 1.);
    N = normalize(cross(T, v_ty)) * v_flip;
    if (mat == ${Mat.Back}) N = -N;
  } else {
    N = normalize(v_n);
  }
  vec3 G = N;
  vec3 alb;
  float spec = .025, sheen = 0., trans = 0.;
  vec3 extra = vec3(0.);
  float ao = 1.;
  bool metal = false;
  vec3 foilCol = vec3(0.);
  float foil = 0.;

  if (mat <= ${Mat.Edge}) {
    alb = texture(u_atlas, v_uv).rgb;
    if (mat == ${Mat.Back} && u_backArt > 0.) {
      // Each piece a different sheet from the world's colours, so the folded pile reads as layers of cut paper.
      float t = fract(v_part * .618034);
      alb = mix(alb, t < .5 ? mix(u_back0, u_back1, t * 2.) : mix(u_back1, u_back2, t * 2. - 1.), u_backArt);
    }
    N = bump(N, v_w, (texture(u_fibre, v_lp * 3.1).r - .5) * .0011);
    alb *= 1. + (texture(u_fibre, v_lp * .4, 2.).r - .5) * .06;
    trans = mat == ${Mat.Edge} ? 0. : .42;
    if (mat == ${Mat.Edge}) alb *= 1.06;
    // Paper darkens toward where it meets the page.
    float h = v_w.y - ${BOOK.Y0.toFixed(3)};
    ao *= mix(.74, 1., smoothstep(0., .17, h));
  } else if (mat == ${Mat.Wire}) {
    alb = texture(u_atlas, v_uv).rgb;
    spec = .1;
  } else if (mat == ${Mat.Leaf}) {
    bool top = v_uv.x < .47;
    alb = texture(u_pages, top ? vec2(.75, .02) : v_uv).rgb;
    if (top && u_backArt > 0.) alb = mix(alb, texture(u_leaves, vec2(.5 + .5 * (v_uv.x / .45) * u_dir, (2. - clamp(v_uv.y, .002, .998)) * .5)).rgb, u_backArt);
    N = bump(N, v_w, (texture(u_fibre, v_uv * vec2(6.2, 4.2)).r - .5) * .0008);
    alb *= 1. + (texture(u_fibre, v_uv * .8, 2.).r - .5) * .03;
    trans = .25;
  } else if (mat == ${Mat.TurnBack} || mat == ${Mat.DoorFront} || mat == ${Mat.Window}) {
    float x01 = v_uv.x;
    bool illustrated = mat == ${Mat.TurnBack} && v_sh.y > .5;
    // The printed sheet is two pages wide: the title page on its left half, the arch's page on its right. In Arabic the mesh is
    // mirrored, so the print is read the other way across it and its words stay the right way round.
    vec2 puv = mat == ${Mat.TurnBack} ? vec2(.5 * (u_dir > 0. ? 1. - x01 : x01), v_uv.y) : vec2(.5 + .5 * (u_dir > 0. ? x01 : 1. - x01), v_uv.y);
    vec2 buv = vec2(x01, v_uv.y * ${BOOK.H.toFixed(3)});
    // A spread runs across two facing pages, so it's read by where the sheet lands in the world, which also keeps it the right way round in Arabic.
    alb = illustrated ? texture(u_leaves, vec2(.5 - .5 * x01 * u_dir, (clamp(v_uv.y, .002, .998) + v_sh.y - 1.) * .5)).rgb : texture(u_plate, puv).rgb;
    N = bump(N, v_w, (texture(u_fibre, buv * 3.1).r - .5) * .0008);
    alb *= 1. + (texture(u_fibre, buv * .4, 2.).r - .5) * .05;
    if (mat != ${Mat.DoorFront}) ao *= mix(.55, 1., smoothstep(0., .1, x01));
    spec = .03;
    sheen = .02;
    if (!illustrated) {
      float cf = texture(u_plateFoil, puv).r;
      float wf = fwidth(cf) * .7 + .002;
      foil = smoothstep(.5 - wf, .5 + wf, cf);
      if (foil > 0.) {
        vec3 Nf = bump(normalize(v_n), v_w, -foil * .002);
        float n0 = texture(u_fibre, buv * vec2(.5, .7), 3.).r, n1 = texture(u_fibre, buv.yx * vec2(.6, .45) + .3, 3.).r;
        Nf = normalize(Nf + vec3(n0 - .5, 0., n1 - .5) * .3);
        foilCol = gold(reflect(-V, Nf), v_w, n0, texture(u_fibre, buv * 3.1).r);
        foilCol *= mix(.72, 1., smoothstep(.5, .75, cf));
      }
    }
  } else if (mat == ${Mat.DoorBack}) {
    alb = u_accent;
    N = bump(N, v_w, (texture(u_fibre, v_uv * 3.1).r - .5) * .0008);
    alb *= 1. + (texture(u_fibre, v_uv * .4, 2.).r - .5) * .06;
    trans = .15;
  } else if (mat == ${Mat.TurnEdge} || mat == ${Mat.DoorEdge}) {
    alb = vec3(.86, .78, .63);
  } else if (mat == ${Mat.ChapterTab}) {
    // Card in the chapter's colour with its emblem printed on it. The sides are the same card, seen on its edge.
    float m = texture(u_tabs, v_uv).r;
    float wm = fwidth(m) * .7 + .002;
    m = smoothstep(.5 - wm, .5 + wm, m);
    float nap = texture(u_fibre, v_w.xz * 3.1).r;
    N = bump(N, v_w, (nap - .5) * .0009);
    alb = mix(v_sh, vec3(.93, .80, .55), m);
    alb *= 1. + (texture(u_fibre, v_w.xz * .4, 2.).r - .5) * .08;
    spec = .05;
    sheen = .05;
    if (abs(v_n.y) < .5) alb *= .78;
  } else if (mat == ${Mat.Page} || mat == ${Mat.TurnFront}) {
    alb = mat == ${Mat.TurnFront} && v_sh.x > .5 ? texture(u_leaves, vec2(.5 + v_uv.x * u_dir, (clamp(v_uv.y, .002, .998) + v_sh.x - 1.) * .5)).rgb : texture(u_pages, v_uv).rgb;
    vec2 uv = vec2(v_uv.x * 2., v_uv.y * ${(BOOK.H).toFixed(3)});
    N = bump(N, v_w, (texture(u_fibre, uv * 3.1).r - .5) * .0008);
    alb *= 1. + (texture(u_fibre, uv * .4, 2.).r - .5) * .03;
    float x = v_uv.x < .5 ? v_uv.x * 2. : (1. - v_uv.x) * 2.;
    // The curve into the gutter holds a soft shadow, and the sprayed edge bleeds a little pink into the sheet.
    ao *= mix(.6, 1., smoothstep(0., .1, x));
    float e = min(1. - x, min(v_uv.y, 1. - v_uv.y) * ${(BOOK.H).toFixed(3)});
    alb = mix(alb, vec3(.95, .46, .55), .32 * exp(-e / .0045));
  } else if (mat == ${Mat.Block}) {
    // The sprayed page edge: seven thick boards to a half.
    float n = 7.;
    float f = fract(v_uv.y * n);
    float w = fwidth(v_uv.y * n) * 1.2;
    float gap = 1. - smoothstep(.0, .12 + w, min(f, 1. - f));
    float noise = texture(u_fibre, vec2(v_uv.x, v_uv.y * .12) * 1.4, 1.).r;
    alb = mix(vec3(.90, .055, .23), vec3(.98, .12, .30), smoothstep(.3, .7, noise)) * mix(1., .46, gap * (1. - min(w * 2., 1.)));
    ao *= mix(.58, 1., smoothstep(0., .22, v_uv.y) * smoothstep(1.02, .86, v_uv.y));
    spec = .02;
  } else if (mat == ${Mat.Cover} || mat == ${Mat.Cloth} || mat == ${Mat.Spine}) {
    alb = vec3(.0042, .060, .066);
    vec2 cuv = v_uv * vec2(1.05, 1.41);
    if (mat == ${Mat.Spine}) cuv = v_uv * vec2(.22, 1.41);
    float weave = texture(u_weave, cuv * 7.).r;
    N = bump(N, v_w, (weave - .5) * .0026);
    alb *= .74 + .6 * weave;
    float clothNoise = texture(u_fibre, cuv * .5, 2.).r;
    alb *= 1. + (clothNoise - .5) * .3;
    sheen = .045;
    spec = .035;
    if (mat == ${Mat.Cover}) {
      float cf = texture(u_cover, v_uv).r, cb = texture(u_blind, v_uv).r;
      // The hinge groove by the spine.
      float gx = u_dir > 0. ? v_uv.x : 1. - v_uv.x;
      float gr = smoothstep(.0, .022, gx - .012) * smoothstep(.062, .036, gx);
      N = normalize(N + normalize(cross(vec3(0., 0., 1.), N)) * 0.0);
      ao *= 1. - .34 * gr;
      // Blind stamping: pressed into the cloth with no colour.
      float wb = fwidth(cb) * .7 + .004;
      float blind = smoothstep(.5 - wb, .5 + wb, cb);
      // Pressed cloth is flatter, darker and takes a slight shine.
      N = normalize(mix(N, normalize(v_n), blind * .75));
      alb *= 1. - .34 * blind;
      spec += .05 * blind;
      sheen += .02 * blind;
      // The foil, pressed in too, with a slightly burnished surface.
      float wf = fwidth(cf) * .7 + .002;
      foil = smoothstep(.5 - wf, .5 + wf, cf);
      if (foil > 0.) {
        vec3 Nf = bump(normalize(v_n), v_w, -foil * .003);
        // Foil never lies quite flat: slow dents make its light wander, and the cloth shows through as a fine texture.
        float n0 = texture(u_fibre, v_uv * vec2(.5, .7), 3.).r, n1 = texture(u_fibre, v_uv.yx * vec2(.6, .45) + .3, 3.).r;
        Nf = normalize(Nf + vec3(n0 - .5, 0., n1 - .5) * .32 + (weave - .5) * .05);
        float grain = texture(u_fibre, cuv * 7.).r;
        foilCol = gold(reflect(-V, Nf), v_w, n0, grain);
        // The stamp bites into the cloth, so the foil is a touch darker just inside its edge.
        foilCol *= mix(.7, 1., smoothstep(.5, .72, cf));
      }
    }
    if (mat == ${Mat.Spine}) {
      // Foil bands across the spine.
      float z = abs(v_uv.y - .5) * 2.;
      float aa = fwidth(z) + .001;
      float bands = 0.;
      for (int i = 0; i < 3; i++) {
        float c = i == 0 ? .92 : (i == 1 ? .86 : .06);
        float hw = i == 2 ? .006 : .009;
        bands = max(bands, 1. - smoothstep(hw - aa, hw + aa, abs(z - c)));
      }
      foil = bands;
      if (foil > 0.) foilCol = gold(reflect(-V, N), v_w, .5, .5);
    }
  } else if (mat == ${Mat.Ribbon}) {
    vec2 w = v_uv * vec2(90., 6.);
    alb = vec3(.92, .035, .17) * (.86 + .28 * sin(v_uv.y * 3.14159));
    alb *= 1. - .1 * smoothstep(.0, .04, abs(sin(w.x * 3.1415)) - .9);
    spec = .1; sheen = .2;
  } else {
    alb = vec3(.8);
  }

  // Light
  float ndl = dot(N, u_L);
  float gdl = dot(G, u_L);
  float vis = shadow(v_w, G);
  vec3 c = alb * u_key * max(ndl, 0.) * vis;
  // Thin paper glows when the light is behind it.
  if (trans > 0. && gdl < 0.) {
    float bv = shadow(v_w - G * .012, -G);
    c += alb * sqrt(max(alb, vec3(.001))) * u_key * trans * (-gdl) * bv;
  }
  // Soft light from the room, with the warm paper bouncing up from below.
  vec2 ouv = (v_w.xz - u_occ.xy) * u_occ.zw * vec2(.5, -.5) + .5;
  vec2 occ = texture(u_occt, ouv).rg;
  float up = clamp(N.y, 0., 1.);
  float above = exp(-max(v_w.y - ${BOOK.Y0.toFixed(3)}, 0.) * 9.);
  if (mat <= ${Mat.Edge}) ao *= 1. - .45 * occ.r * above * (1. - up);
  else if (mat == ${Mat.Page} || mat == ${Mat.TurnFront} || mat == ${Mat.TurnBack} || mat == ${Mat.Window}) ao *= 1. - .62 * occ.r * above;
  vec3 amb = mix(u_gnd, u_sky, N.y * .5 + .5);
  c += alb * amb * ao;
  // The paper sun is a light of its own: a warm glow on what faces it, and through thin card that doesn't.
  if (u_sun.w > 0. && (mat <= ${Mat.Edge})) {
    vec3 sv = u_sun.xyz - v_w;
    float d2 = dot(sv, sv);
    vec3 sl = sv / sqrt(d2);
    float nl = dot(G, sl);
    float glow = max(nl, 0.) * .85 + max(-nl, 0.) * .85 * (trans / .42);
    c += alb * vec3(1., .72, .38) * glow * u_sun.w / (1. + d2 * 3.2) * .95;
  }
  // Cloth nap and a little gloss.
  float ndv = max(dot(N, V), 0.);
  vec3 H = normalize(u_L + V);
  float nh = max(dot(N, H), 0.);
  c += u_key * vis * spec * pow(nh, 22.) * step(0., ndl);
  c += (u_sky + u_key * .3) * sheen * pow(1. - ndv, 3.) * (.35 + .65 * vis);
  if (foil > 0.) {
    vec3 fc = foilCol * (.5 + .5 * vis);
    c = mix(c, fc, foil);
  }
  vec3 col = finish(c);
  float alpha = 1.;
  if (mat == ${Mat.Window}) {
    // Inside the arch the sheet is gone. Nested arches step down through the page block, each seen through the one above it with
    // its own parallax, and what's left at the bottom is transparent: the chapter itself, alive behind the book.
    vec2 lp = vec2(v_w.x * u_dir, v_w.z);
    vec3 Vl = vec3(V.x * u_dir, V.y, V.z);
    vec2 sl = Vl.xz / max(Vl.y, .2);
    float d0 = archD(lp);
    float w0 = fwidth(d0);
    float in0 = smoothstep(w0, -w0, d0);
    if (in0 > 0.) {
      float dn = archD(lp - sl * ${(ARCH.depth * ARCH.layers).toFixed(4)}) + ${(ARCH.inset * ARCH.layers).toFixed(4)};
      vec3 hc = vec3(0.);
      float ha = .6 * exp(min(dn, 0.) / .03) * u_rim;
      vec3 room = u_key * .62 + u_sky * .62;
      for (int i = ${ARCH.layers}; i >= 1; i--) {
        float fi = float(i);
        vec2 q = lp - sl * ${ARCH.depth.toFixed(4)} * fi;
        float di = archD(q) + ${ARCH.inset.toFixed(4)} * fi;
        float wi = fwidth(di);
        float open = smoothstep(wi, -wi, di);
        // The card above throws a soft shadow on this one, deepest right under its edge.
        float dUp = archD(q + vec2(-.012, .018)) + ${ARCH.inset.toFixed(4)} * (fi - 1.);
        float sh = smoothstep(-.05, .008, dUp);
        vec3 la = i == 1 ? vec3(.010, .075, .076) : (i == 2 ? u_accent : mix(u_accent, vec3(.82, .66, .42), .62));
        vec3 lc = finish(la * room * (1. - .68 * sh));
        float lip = 1. - smoothstep(.0012, .0034 + wi, abs(di));
        lc = mix(lc, finish(vec3(.86, .56, .17) * (.65 + .55 * room)), lip * step(di, .006));
        hc = mix(lc, hc, open);
        ha = mix(1., ha, open);
      }
      // A gilt lip on the cut through the page itself.
      float lip0 = smoothstep(.0052 + w0, .0016, -d0);
      hc = mix(hc, finish(vec3(.9, .6, .2) * (.7 + .5 * room)), lip0);
      ha = mix(ha, 1., lip0);
      col = mix(col, hc, in0);
      alpha = mix(1., ha, in0);
    }
  }
  o = vec4(col, alpha);
}`

const TABLE_VS = `${HEAD}
uniform mat4 u_vp; layout(location=0) in vec2 a_p; out vec3 v_w;
void main() {
  v_w = vec3(a_p.x, 0., a_p.y);
  gl_Position = u_vp * vec4(v_w, 1.);
}`
const TABLE_FS = (taps: number) => `${HEAD}
in vec3 v_w; out vec4 o;
uniform vec4 u_occ;
uniform sampler2D u_occt, u_weave;
uniform vec2 u_res;
uniform vec3 u_shadow, u_pool;
uniform float u_poolA;
${SHADOW_LIB(taps)}
void main() {
  float vis = shadow(v_w, vec3(0., 1., 0.));
  vis = mix(1., vis, smoothstep(2.5, 1.35, length(v_w.xz * vec2(.82, 1.))));
  vec2 ouv = (v_w.xz - u_occ.xy) * u_occ.zw * vec2(.5, -.5) + .5;
  vec2 occ = (ouv.x > 0. && ouv.x < 1. && ouv.y > 0. && ouv.y < 1.) ? texture(u_occt, ouv).rg : vec2(0.);
  // Soft linen. The table is exactly the page's white where nothing falls on it, so the section's edges don't show.
  float wv = texture(u_weave, v_w.xz * 5.).r;
  float near = smoothstep(1.7, .55, length(v_w.xz * vec2(.56, .8)));
  vec3 c = mix(u_shadow, vec3(1.), vis);
  c *= mix(vec3(.30, .42, .46), vec3(1.), 1. - .9 * occ.g);
  c *= 1. - .16 * occ.r;
  // A pool of colour under the book, as if the sea were showing through.
  c *= mix(vec3(1.), u_pool, u_poolA * near);
  c *= 1. - .022 * near * (wv - .5) * 2.;
  float sy = gl_FragCoord.y / u_res.y;
  float e = smoothstep(0., .1, sy) * smoothstep(1., .9, sy);
  c = mix(vec3(1.), c, e);
  c = pow(max(c, vec3(0.)), vec3(1. / 2.2));
  o = vec4(c + (ign(gl_FragCoord.xy + 5.1) - .5) / 255., 1.);
}`

function shader(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s)
    throw new Error(`storybook shader: ${log}`)
  }
  return s
}
function program(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const p = gl.createProgram()!
  gl.attachShader(p, shader(gl, gl.VERTEX_SHADER, vs))
  gl.attachShader(p, shader(gl, gl.FRAGMENT_SHADER, fs))
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`storybook link: ${gl.getProgramInfoLog(p)}`)
  const u: Record<string, WebGLUniformLocation | null> = {}
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS)
  for (let i = 0; i < n; i++) {
    const a = gl.getActiveUniform(p, i)!
    u[a.name] = gl.getUniformLocation(p, a.name)
  }
  const block = gl.getUniformBlockIndex(p, 'Parts')
  if (block !== gl.INVALID_INDEX) gl.uniformBlockBinding(p, block, 0)
  return { p, u }
}

export type Geometry = { vertices: Uint8Array; indices: Uint32Array; stride: number }
export type Quality = { shadow: number; taps: number; occW: number; occH: number }
export type Frame = {
  vp: M4
  cam: ArrayLike<number>
  res: [number, number]
  light: [number, number, number]
  key: [number, number, number]
  sky: [number, number, number]
  gnd: [number, number, number]
  shadowTint: [number, number, number]
  sun: [number, number, number, number]
  pool: [number, number, number]
  poolA: number
  accent: [number, number, number]
  backs: [[number, number, number], [number, number, number], [number, number, number]]
  backArt: number
  rim: number
}

// The areas the two maps cover, in page widths.
const SHADOW_R = 2.3
const OCC = { x: 0, z: 0, hx: 2.6, hz: 1.7 }

export function createScene(gl: WebGL2RenderingContext, geo: Geometry, q: Quality, dir: number) {
  const main = program(gl, VS, FS(q.taps))
  const table = program(gl, TABLE_VS, TABLE_FS(q.taps))
  const shadow = program(gl, SHADOW_VS, EMPTY_FS)
  const occ = program(gl, OCC_VS, OCC_FS)
  const blur = program(gl, BLUR_VS, BLUR_FS)

  // Geometry
  const vao = gl.createVertexArray()!
  gl.bindVertexArray(vao)
  const vbo = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
  gl.bufferData(gl.ARRAY_BUFFER, geo.vertices, gl.STATIC_DRAW)
  const ibo = gl.createBuffer()!
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.indices, gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, geo.stride, 0)
  gl.enableVertexAttribArray(1)
  gl.vertexAttribPointer(1, 3, gl.BYTE, true, geo.stride, 12)
  gl.enableVertexAttribArray(2)
  gl.vertexAttribPointer(2, 2, gl.UNSIGNED_SHORT, true, geo.stride, 16)
  gl.enableVertexAttribArray(3)
  gl.vertexAttribIPointer(3, 2, gl.UNSIGNED_BYTE, geo.stride, 20)
  const count = geo.indices.length

  const tableVao = gl.createVertexArray()!
  gl.bindVertexArray(tableVao)
  const tb = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, tb)
  const S = 40
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-S, -S, S, -S, S, S, -S, -S, S, S, -S, S]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  const emptyVao = gl.createVertexArray()!
  gl.bindVertexArray(null)

  const ubo = gl.createBuffer()!
  gl.bindBuffer(gl.UNIFORM_BUFFER, ubo)
  gl.bufferData(gl.UNIFORM_BUFFER, MAX_PARTS * 5 * 16, gl.DYNAMIC_DRAW)
  gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, ubo)

  // The shadow map, read both with hardware comparison and as plain depth.
  const depth = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, depth)
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, q.shadow, q.shadow)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  const shadowFbo = gl.createFramebuffer()!
  gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFbo)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depth, 0)
  gl.drawBuffers([gl.NONE])
  gl.readBuffer(gl.NONE)
  const compare = gl.createSampler()!
  gl.samplerParameteri(compare, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE)
  gl.samplerParameteri(compare, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL)
  gl.samplerParameteri(compare, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.samplerParameteri(compare, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.samplerParameteri(compare, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.samplerParameteri(compare, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  const raw = gl.createSampler()!
  gl.samplerParameteri(raw, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.samplerParameteri(raw, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.samplerParameteri(raw, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.samplerParameteri(raw, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

  // The occlusion map, and a second target for its blur.
  const target = () => {
    const t = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RG8, q.occW, q.occH)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    const f = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, f)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0)
    return { t, f }
  }
  const occA = target(), occB = target()
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)

  // Textures
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic')
  const maxAniso = aniso ? gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 1
  const tex: Record<string, WebGLTexture> = {}
  const solid = (r: number, g: number, b: number) => {
    const t = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([r, g, b, 255]))
    return t
  }
  tex.atlas = solid(200, 200, 200)
  tex.pages = solid(244, 236, 220)
  tex.cover = solid(0, 0, 0)
  tex.blind = solid(0, 0, 0)
  tex.fibre = solid(128, 128, 128)
  tex.weave = solid(128, 128, 128)
  tex.plate = solid(11, 74, 73)
  tex.plateFoil = solid(0, 0, 0)
  tex.tabs = solid(0, 0, 0)
  tex.leaves = solid(232, 222, 200)
  const setTexture = (name: 'atlas' | 'pages' | 'cover' | 'blind' | 'fibre' | 'weave' | 'plate' | 'plateFoil' | 'tabs' | 'leaves', img: TexImageSource, srgb: boolean, an = 8) => {
    const t = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
    gl.texImage2D(gl.TEXTURE_2D, 0, srgb ? gl.SRGB8_ALPHA8 : gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, img)
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    const rep = name === 'fibre' || name === 'weave' ? gl.REPEAT : gl.CLAMP_TO_EDGE
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, rep)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, rep)
    if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(an, maxAniso))
    gl.deleteTexture(tex[name])
    tex[name] = t
  }

  const set = (P: ReturnType<typeof program>, f: Frame, shadowVP: M4, sp: number[], fade: number) => {
    const u = P.u
    gl.uniformMatrix4fv(u.u_vp, false, f.vp)
    gl.uniformMatrix4fv(u.u_svp, false, shadowVP)
    gl.uniform4fv(u.u_sp, sp)
    gl.uniform4f(u.u_occ, OCC.x, OCC.z, 1 / OCC.hx, 1 / OCC.hz)
    gl.uniform1i(u.u_sh, 0)
    gl.uniform1i(u.u_shd, 1)
    gl.uniform1i(u.u_occt, 2)
    gl.uniform1i(u.u_fibre, 3)
    gl.uniform1i(u.u_atlas, 4)
    gl.uniform1i(u.u_pages, 5)
    gl.uniform1i(u.u_cover, 6)
    gl.uniform1i(u.u_blind, 7)
    gl.uniform1i(u.u_weave, 8)
    gl.uniform1i(u.u_plate, 9)
    gl.uniform1i(u.u_plateFoil, 10)
    gl.uniform1i(u.u_tabs, 11)
    gl.uniform1i(u.u_leaves, 12)
    gl.uniform1f(u.u_dir, dir)
    gl.uniform1f(u.u_fade, fade)
  }

  const draw = (parts: Float32Array, f: Frame) => {
    gl.bindBuffer(gl.UNIFORM_BUFFER, ubo)
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, parts)

    // The shadow map
    const L = norm(f.light)
    const shadowVP = mul(ortho(-SHADOW_R, SHADOW_R, -SHADOW_R, SHADOW_R, 0.5, 11), lookAt([L[0] * 6, L[1] * 6 + 0.1, L[2] * 6], [0, 0.1, 0], [0, 1, 0]))
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFbo)
    gl.viewport(0, 0, q.shadow, q.shadow)
    gl.clear(gl.DEPTH_BUFFER_BIT)
    gl.enable(gl.DEPTH_TEST)
    gl.disable(gl.BLEND)
    gl.disable(gl.CULL_FACE)
    gl.enable(gl.POLYGON_OFFSET_FILL)
    gl.polygonOffset(1.6, 2.2)
    gl.useProgram(shadow.p)
    gl.uniformMatrix4fv(shadow.u.u_svp, false, shadowVP)
    gl.bindVertexArray(vao)
    gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_INT, 0)
    gl.disable(gl.POLYGON_OFFSET_FILL)

    // The occlusion map
    gl.bindFramebuffer(gl.FRAMEBUFFER, occA.f)
    gl.viewport(0, 0, q.occW, q.occH)
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.disable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
    gl.blendEquation(gl.MAX)
    gl.useProgram(occ.p)
    gl.uniform4f(occ.u.u_occ, OCC.x, OCC.z, 1 / OCC.hx, 1 / OCC.hz)
    gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_INT, 0)
    gl.disable(gl.BLEND)
    gl.blendEquation(gl.FUNC_ADD)
    gl.useProgram(blur.p)
    gl.uniform1i(blur.u.u_t, 0)
    gl.bindVertexArray(emptyVao)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindSampler(0, null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, occB.f)
    gl.bindTexture(gl.TEXTURE_2D, occA.t)
    gl.uniform2f(blur.u.u_d, 1 / q.occW, 0)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.bindFramebuffer(gl.FRAMEBUFFER, occA.f)
    gl.bindTexture(gl.TEXTURE_2D, occB.t)
    gl.uniform2f(blur.u.u_d, 0, 1 / q.occH)
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    // The picture
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, f.res[0], f.res[1])
    gl.clearColor(1, 1, 1, 1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.enable(gl.DEPTH_TEST)
    const bind = (unit: number, t: WebGLTexture, s: WebGLSampler | null = null) => {
      gl.activeTexture(gl.TEXTURE0 + unit)
      gl.bindTexture(gl.TEXTURE_2D, t)
      gl.bindSampler(unit, s)
    }
    bind(0, depth, compare)
    bind(1, depth, raw)
    bind(2, occA.t)
    bind(3, tex.fibre)
    bind(4, tex.atlas)
    bind(5, tex.pages)
    bind(6, tex.cover)
    bind(7, tex.blind)
    bind(8, tex.weave)
    bind(9, tex.plate)
    bind(10, tex.plateFoil)
    bind(11, tex.tabs)
    bind(12, tex.leaves)

    const tanA = 0.14
    const range = 11 - 0.5
    const sp = [0.012, (range * tanA) / (2 * SHADOW_R) , 0.6 / q.shadow, 0.013]

    gl.useProgram(table.p)
    set(table, f, shadowVP, sp, 26)
    gl.uniform2f(table.u.u_res, f.res[0], f.res[1])
    gl.uniform3fv(table.u.u_shadow, f.shadowTint)
    gl.uniform3fv(table.u.u_pool, f.pool)
    gl.uniform1f(table.u.u_poolA, f.poolA)
    gl.bindVertexArray(tableVao)
    gl.drawArrays(gl.TRIANGLES, 0, 6)

    gl.useProgram(main.p)
    set(main, f, shadowVP, sp, 0.3)
    gl.uniform3fv(main.u.u_cam, f.cam as number[])
    gl.uniform3fv(main.u.u_L, L)
    gl.uniform3fv(main.u.u_key, f.key)
    gl.uniform3fv(main.u.u_sky, f.sky)
    gl.uniform3fv(main.u.u_gnd, f.gnd)
    gl.uniform4fv(main.u.u_sun, f.sun)
    gl.uniform3fv(main.u.u_accent, f.accent)
    gl.uniform3fv(main.u.u_back0, f.backs[0])
    gl.uniform3fv(main.u.u_back1, f.backs[1])
    gl.uniform3fv(main.u.u_back2, f.backs[2])
    gl.uniform1f(main.u.u_backArt, f.backArt)
    gl.uniform1f(main.u.u_rim, f.rim)
    gl.bindVertexArray(vao)
    gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_INT, 0)
    gl.bindVertexArray(null)
  }

  const dispose = () => {
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
  return { draw, setTexture, dispose }
}
