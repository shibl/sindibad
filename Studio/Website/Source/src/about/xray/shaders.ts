// The two programs of the X-ray lens. MAIN draws the world and the glass. OVERLAY draws the runner and its pink path, in image
// space, into a texture MAIN then reads through whichever coordinates it's using, so the glass refracts them like everything else.

export const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`

export const MAIN = `#version 300 es
precision highp float;
uniform sampler2D uWorld, uBlue, uTrail, uTimeMap, uDepth, uOver, uFlow;
uniform vec2 uRes;         // canvas pixels
uniform vec2 uOff, uSize;  // the image's top-left and size, in canvas pixels
uniform float uFlip;       // 1 in Arabic: the art mirrors, so the text and the land change sides
uniform vec3 uLens;        // centre (canvas pixels, y down) and radius
uniform float uTime;
uniform vec2 uPar;         // parallax, in uv, for the nearest things
uniform float uLensOn;     // 0 to 1, the lens arriving
uniform float uMag;
uniform float uMotion;     // 0 when the visitor prefers stillness
uniform float uRimPx;      // the bevel's width
uniform float uLod;        // mip level for this zoom. Explicit, so texture reads inside the glass have no derivative seams.
uniform vec3 uTop;         // from this canvas y to this canvas y the picture melts into the hero's blue, this strongly
uniform vec3 uBot;         // from this canvas y to this canvas y it melts into the page's white
out vec4 o;

const vec3 SKY = vec3(214., 236., 240.) / 255.;

vec2 toUv(vec2 px) {
  vec2 uv = (px - uOff) / uSize;
  if (uFlip > 0.5) uv.x = 1.0 - uv.x;
  return uv;
}

vec2 parallax(vec2 uv) {
  // Read a soft version of depth: the shift becomes a smooth warp with no doubled edges.
  float d = textureLod(uDepth, uv, 4.0).r;
  return uv + uPar * vec2(uFlip > 0.5 ? -1.0 : 1.0, 1.0) * (0.5 - d);
}

float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  vec2 h = vec2(127.1, 311.7);
  float a = fract(sin(dot(i, h)) * 43758.5453), b = fract(sin(dot(i + vec2(1, 0), h)) * 43758.5453);
  float c = fract(sin(dot(i + vec2(0, 1), h)) * 43758.5453), d = fract(sin(dot(i + vec2(1, 1), h)) * 43758.5453);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

vec3 world(vec2 uv) {
  // Beyond the picture is only the page: its blue above, its white below.
  if (uv.y < 0.0) return SKY;
  if (uv.y > 1.0) return vec3(1.0);
  if (uMotion < 0.5) return textureLod(uWorld, uv, uLod).rgb;
  // The picture is alive: cloud breathes around its rest position, water runs.
  float m = textureLod(uFlow, uv, 0.0).r;
  float cloud = smoothstep(0.2, 0.5, m) * (1.0 - smoothstep(0.62, 0.8, m));
  float fall = smoothstep(0.62, 0.95, m);
  vec2 d = vec2(0.0);
  if (cloud > 0.0) {
    float T = uTime * 0.17;
    d = cloud * 0.0026 * vec2(sin(uv.y * 21.0 + T + sin(uv.x * 9.0 - T * 0.7) * 1.4), cos(uv.x * 17.0 - T * 0.8 + sin(uv.y * 11.0 + T) * 1.2));
  }
  vec3 c = textureLod(uWorld, uv + d, uLod).rgb;
  if (fall > 0.0) {
    float n = vnoise(vec2(uv.x * 460.0, uv.y * 20.0 - uTime * 1.5)) * 0.55 + vnoise(vec2(uv.x * 980.0, uv.y * 44.0 - uTime * 2.6)) * 0.45;
    c += (n - 0.5) * 0.17 * fall;
  }
  return c;
}

vec4 over(vec2 uv) {
  return (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) ? vec4(0.0) : textureLod(uOver, uv, 0.0);
}

// What's underneath: blueprint on deep teal, and the players' trails flowing along their own recorded time.
vec3 xrayTrails(vec2 uv) {
  vec3 tr = textureLod(uTrail, uv, max(uLod - 0.75, 0.0)).rgb;
  float t = textureLod(uTimeMap, uv, 1.2).r;
  float f = fract(t * 6.0 - uTime * 0.14);
  float head = smoothstep(0.0, 0.14, f) * pow(1.0 - f, 3.2) * 1.25;  // a soft front and a long tail, travelling dock to flag
  float flow = 0.66 + 1.25 * head * uMotion + (1.0 - uMotion) * 0.3;
  vec3 halo = textureLod(uTrail, uv, 2.6).rgb * 0.5 + textureLod(uTrail, uv, 4.5).rgb * 0.26;
  vec3 c = tr * flow + halo * (0.08 + 0.26 * head * uMotion);
  return 1.0 - exp(-c * 1.5);    // saturates softly, so the busiest lines glow instead of clipping into white shapes
}

vec3 hashTone(vec2 p) {
  float h = fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
  return vec3(h - 0.5) / 255.0;
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 uv0 = toUv(px);
  vec2 uv = parallax(uv0);
  vec3 col = world(uv);
  vec4 ov = over(uv);
  col = col * (1.0 - ov.a) + ov.rgb;
  // the picture's top and bottom are the page's own colours, whenever the page's other sections are on screen
  col = mix(col, SKY, smoothstep(uTop.y, uTop.x, px.y) * uTop.z);
  col = mix(col, vec3(1.0), smoothstep(uBot.x, uBot.y, px.y) * uBot.z);

  vec2 q = (px - uLens.xy) / uLens.z;
  float r = length(q);
  float R = uLens.z;
  float on = uLensOn;

  // light comes from the art's sun; in Arabic the art is mirrored, so the sun is too
  vec2 sun = normalize(vec2(uFlip > 0.5 ? 0.62 : -0.62, -0.78));

  if (on > 0.001 && r < 1.75) {
    // contact shadow: a soft, teal-tinted disc on the world, offset away from the sun, further where the world is far below the glass
    float dep = textureLod(uDepth, clamp(uv, 0.0, 1.0), 2.0).r;
    vec2 off = -sun * (0.07 + 0.16 * dep);
    float d = length(q - off);
    float shadow = smoothstep(1.34 + 0.2 * dep, 0.82, d);
    col *= mix(vec3(1.0), vec3(0.50, 0.68, 0.70), shadow * 0.72 * on);
    // light gathered by the glass: a warm crescent inside the shadow, on the far side from the sun
    float cres = smoothstep(0.34, 0.02, abs(d - 1.03)) * smoothstep(0.1, 0.95, dot(normalize(q - off + 1e-4), -sun));
    col += vec3(1.0, 0.86, 0.62) * cres * 0.34 * on;
  }

  if (r < 1.0) {
    float aa = 1.4 / R;
    float rimStart = 1.0 - clamp(uRimPx / R, 0.04, 0.14);
    float b = smoothstep(rimStart, 1.0, r);          // 0 inside, 1 at the outer edge
    vec2 dir = q / max(r, 1e-4);

    // the inside: a gently bulging magnifier
    float bulge = 1.0 / uMag * (1.0 + 0.13 * r * r);
    float ca = 0.012 * smoothstep(0.35, 0.95, r);
    vec2 base = uLens.xy;
    vec2 pR = base + q * R * bulge * (1.0 + ca);
    vec2 pG = base + q * R * bulge;
    vec2 pB = base + q * R * bulge * (1.0 - ca);
    vec2 uvG = parallax(toUv(pG));
    vec3 xr;
    float lodB = max(uLod - log2(uMag), 0.0);
    if (ca > 0.0005) {
      vec2 uvR = uvG + (toUv(pR) - toUv(pG));
      vec2 uvB = uvG + (toUv(pB) - toUv(pG));
      xr = vec3(textureLod(uBlue, uvR, lodB).r, textureLod(uBlue, uvG, lodB).g, textureLod(uBlue, uvB, lodB).b);
      vec3 tr = vec3(xrayTrails(uvR).r, xrayTrails(uvG).g, xrayTrails(uvB).b);
      xr = xr * (1.0 - 0.6 * clamp(max(tr.r, max(tr.g, tr.b)), 0.0, 1.0)) + tr;
    } else {
      xr = textureLod(uBlue, uvG, lodB).rgb;
      vec3 tr = xrayTrails(uvG);
      xr = xr * (1.0 - 0.6 * clamp(max(tr.r, max(tr.g, tr.b)), 0.0, 1.0)) + tr;
    }
    if (uvG.y < 0.0 || uvG.y > 1.0) xr = vec3(0.004, 0.22, 0.21);
    vec4 ovL = over(uvG);
    xr = xr * (1.0 - ovL.a) + ovL.rgb;
    // falls off towards the rim, as if we're looking down through a thick disc
    xr *= mix(1.0, 0.72, smoothstep(0.55, 0.9, r));

    // the bevel: the glass bends the beauty world back in along its edge, with colour fringes
    float bev = b * b;
    vec2 refr = -dir * R * (0.42 * bev + 0.05);
    vec3 rim;
    {
      // white-ish: the bevel mostly bends in the sky, and a little of the colour around it
      vec2 a0 = px + refr * 1.0;
      vec2 a1 = px + refr * 1.03;
      vec2 a2 = px + refr * 1.06;
      rim = vec3(world(toUv(a0)).r, world(toUv(a1)).g, world(toUv(a2)).b);
    }
    rim = mix(rim, vec3(dot(rim, vec3(0.3, 0.55, 0.15))), 0.34) * 1.05 + 0.04;

    float inner = smoothstep(rimStart + 0.012, rimStart - 0.012, r);
    vec3 glass = mix(rim, xr, inner);

    // inside edge: a dark line where the bevel starts, then a bright one, which is what makes glass look thick
    float line = smoothstep(0.011, 0.0, abs(r - rimStart - 0.002));
    glass *= 1.0 - 0.42 * line;
    float line2 = smoothstep(0.012, 0.0, abs(r - rimStart - 0.022));
    glass += vec3(0.8, 0.95, 0.95) * 0.14 * line2;

    // highlights
    float facing = dot(dir, sun);
    float spec = pow(max(facing, 0.0), 5.0);
    glass += vec3(1.0, 0.98, 0.92) * spec * smoothstep(0.9, 0.99, r) * smoothstep(1.0, 0.985, r) * 0.95;
    float back = pow(max(-facing, 0.0), 7.0);
    glass += vec3(0.75, 1.0, 0.98) * back * smoothstep(0.9, 0.975, r) * 0.42;
    // a window-shaped sheen sliding across the upper part of the face
    vec2 sh = q - sun * 0.42;
    float sheen = smoothstep(0.62, 0.0, length(sh * vec2(1.0, 1.65))) * smoothstep(0.86, 0.5, r);
    glass += vec3(0.88, 0.97, 1.0) * sheen * 0.075;
    float arc = smoothstep(0.02, 0.0, abs(r - 0.82)) * pow(max(facing, 0.0), 3.0);
    glass += vec3(1.0) * arc * 0.2;
    // the outermost edge
    glass += vec3(1.0) * smoothstep(0.988, 0.998, r) * 0.22;

    float cover = smoothstep(1.0, 1.0 - aa, r) * on;
    col = mix(col, glass, cover);
  }

  col += hashTone(gl_FragCoord.xy);
  o = vec4(col, 1.0);
}`

export const OVER_VERT = `#version 300 es
in vec2 aPos;      // image px at 2560 x 1440
in vec2 aSt;
in vec4 aColor;
in vec2 aMode;     // mode, depth
out vec2 vSt;
out vec4 vColor;
out vec2 vMode;
out vec2 vUv;
void main() {
  vUv = aPos / vec2(2560.0, 1440.0);
  vSt = aSt;
  vColor = aColor;
  vMode = aMode;
  gl_Position = vec4(vUv.x * 2.0 - 1.0, vUv.y * 2.0 - 1.0, 0.0, 1.0);
}`

export const OVER_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uSprite, uDepth;
in vec2 vSt;
in vec4 vColor;
in vec2 vMode;
in vec2 vUv;
out vec4 o;
void main() {
  float mode = vMode.x;
  // pass behind whatever the depth pass says is closer
  float seen = 1.0;
  if (vMode.y > 0.0) seen = smoothstep(-0.012, 0.006, textureLod(uDepth, vUv, 0.0).r - vMode.y + 0.004);
  vec4 t = texture(uSprite, vSt);
  vec4 c;
  if (mode < 0.5) {
    float a = smoothstep(1.0, 0.6, abs(vSt.x));
    c = vec4(vColor.rgb, 1.0) * vColor.a * a;
  } else if (mode < 1.5) {
    c = t * vColor.a;
  } else if (mode < 2.5) {
    float r = length(vSt * 2.0 - 1.0);
    c = vec4(vColor.rgb, 1.0) * vColor.a * smoothstep(1.0, 0.1, r);
  } else {
    float r = length(vSt * 2.0 - 1.0);
    c = vec4(vColor.rgb, 1.0) * vColor.a * smoothstep(0.09, 0.0, abs(r - 0.86));
  }
  o = c * mix(0.0, 1.0, seen);
}`
