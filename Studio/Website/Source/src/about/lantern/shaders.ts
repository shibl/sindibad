// The shaders. The wall is the point: every pixel looks back along a ray to the flame, reads the lantern's
// piercing in that direction, and tests that same ray against each layer of puppets hung between lamp and wall.

export const QUAD_VS = /* glsl */ `#version 300 es
in vec2 aPos;
out vec2 vPos;
void main() { vPos = aPos; gl_Position = vec4(aPos * 2.0 - 1.0, 0.0, 1.0); }`

export const WALL_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vPos;
out vec4 fragColor;

uniform vec2 uStage;       // the canvas in wall pixels (CSS px)
uniform float uCamY;       // how far down the wall the camera is
uniform vec3 uFlame;       // flame position: x, y along the wall, z off the wall
uniform mat3 uToLamp;      // world direction -> the lantern's own frame
uniform vec2 uMaskRange;   // half range of the baked panorama, in radians (longitude, latitude)
uniform float uMaskLod;    // how soft the piercing is, from the size of the flame
uniform vec2 uMaskTexel;
uniform float uPower;
uniform float uR0;         // falloff radius
uniform vec4 uLayer[4];    // for each puppet plane: scale, offset x, offset y, lod
uniform vec2 uOrg;         // the puppet map's origin and extent, in rest wall pixels
uniform vec2 uExt;
uniform float uFlip;       // 1 mirrors the world, for right to left pages
uniform vec4 uCopyBox;     // the words: x0, y0, x1, y1 in wall px
uniform vec4 uCopyFeather; // how far the calm reaches beyond each side
uniform vec4 uCtaBox;      // the button, which sits lower than the words and doesn't need the calm to run the full width
uniform vec4 uCtaFeather;
uniform float uCalmWob;
uniform float uLumaCap;    // the brightest the wall may get behind the text
uniform float uSeaY;       // on phones, the far end of the long wall, where the water throws back a low glow
uniform float uExposure;
uniform vec3 uAmbient;
uniform vec3 uLightCol;
uniform vec3 uPinkCol;
uniform vec3 uAlbedo;
uniform float uLeak;
uniform float uFogGain;    // beams in the air
uniform float uHalo;       // the size of the glow in the air around the lantern
uniform float uTime;
uniform sampler2D uMask;
uniform sampler2D uShadow;
uniform sampler2D uPlaster;

const float PI = 3.14159265;

vec2 maskUv(vec3 d) {
  // d is the direction from the flame in the world. The lantern's own frame has x right, y up and -z towards the wall.
  vec3 l = uToLamp * d;
  float lon = atan(l.x, -l.z) * (uFlip > 0.5 ? -1.0 : 1.0);
  float lat = asin(clamp(l.y, -1.0, 1.0));
  return vec2(0.5 + lon / (2.0 * uMaskRange.x), 0.5 - lat / (2.0 * uMaskRange.y));
}

vec3 sampleMask(vec3 d, float lod) {
  vec2 uv = maskUv(d);
  // Four taps a step up the mip chain, so the blur stays round and never shows the texels.
  vec2 o = uMaskTexel * pow(2.0, lod) * 0.5;
  float l1 = max(lod - 1.0, 0.0);
  vec3 c = textureLod(uMask, uv + o * vec2(0.92, 0.38), l1).rgb
         + textureLod(uMask, uv + o * vec2(-0.38, 0.92), l1).rgb
         + textureLod(uMask, uv + o * vec2(-0.92, -0.38), l1).rgb
         + textureLod(uMask, uv + o * vec2(0.38, -0.92), l1).rgb;
  return c * 0.25;
}

float layerShadow(vec2 P, int k, vec2 tx) {
  vec4 L = uLayer[k];
  vec2 rest = P * L.x + L.yz;
  vec2 uv = (rest - uOrg) / uExt;
  if (uFlip > 0.5) uv.x = 1.0 - uv.x;
  float lod = L.w;
  if (lod < 1.2) return textureLod(uShadow, uv, lod)[k];
  vec2 o = tx * pow(2.0, lod) * 0.5;
  float l1 = lod - 1.0;
  return 0.25 * (textureLod(uShadow, uv + o * vec2(0.92, 0.38), l1)[k]
               + textureLod(uShadow, uv + o * vec2(-0.38, 0.92), l1)[k]
               + textureLod(uShadow, uv + o * vec2(-0.92, -0.38), l1)[k]
               + textureLod(uShadow, uv + o * vec2(0.38, -0.92), l1)[k]);
}

float calm(vec2 P, vec4 box, vec4 f, float low) {
  return smoothstep(box.x - f.x, box.x, P.x) * (1.0 - smoothstep(box.z, box.z + f.z, P.x))
       * smoothstep(box.y - f.y, box.y, P.y) * (1.0 - smoothstep(box.w + low, box.w + low + f.w, P.y));
}

float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }

vec3 toSrgb(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(max(c, vec3(1e-5)), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
vec3 fromSrgb(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

void main() {
  // Wall position in CSS px, y down
  vec2 P = vec2(vPos.x, 1.0 - vPos.y) * uStage + vec2(0.0, uCamY);
  vec3 W = vec3(P, 0.0);

  vec3 toF = uFlame - W;
  float r = length(toF);
  vec3 L = toF / r;

  // The plaster's relief, raked by the light
  vec2 tileUv = P / 620.0;
  vec3 pl = texture(uPlaster, tileUv).rgb;
  vec3 pl2 = texture(uPlaster, tileUv * 0.37 + 0.31).rgb;
  vec2 slope = (pl.rg - 0.5) * 0.7 + (pl2.rg - 0.5) * 0.45;
  vec3 N = normalize(vec3(-slope * 0.3, 1.0));
  float ndl = max(dot(N, L), 0.0);
  float flat_ndl = max(L.z, 0.0);
  float raking = ndl / max(flat_ndl, 0.08);

  // The text sits in a calmer patch of the wall.
  // The calm's lower edge is an uneven line, like a bank of cloud, so the light never looks boxed. It only ever reaches
  // further down than the words, never up into them.
  float low = uCalmWob * (0.5 + 0.31 * sin(P.x * 0.0061 + 1.3) + 0.19 * sin(P.x * 0.0173 + 0.4));
  float zone = max(calm(P, uCopyBox, uCopyFeather, low), calm(P, uCtaBox, uCtaFeather, low * 0.6));

  // What the flame sees in this direction
  vec3 M = sampleMask(-L, uMaskLod);
  // The pierced pattern's softening in the zone: pattern evens out to its own average there
  if (zone > 0.002) M = mix(M, sampleMask(-L, uMaskLod + 2.4) * 0.8 + 0.06, zone * 0.72);

  // Puppets: test the ray against each plane
  vec2 tx = 1.0 / vec2(textureSize(uShadow, 0));
  float s0 = layerShadow(P, 0, tx);
  float s1 = layerShadow(P, 1, tx);
  float s2 = layerShadow(P, 2, tx);
  float s3 = layerShadow(P, 3, tx);
  float S = (1.0 - s0) * (1.0 - s1) * (1.0 - s2) * (1.0 - s3);
  S = mix(S, 1.0, zone * 0.72);

  // Art-directed inverse square: it reaches further across the wall than real falloff would.
  float att = 1.0 / (1.0 + pow(r / uR0, 1.95));
  float wallCos = pow(flat_ndl, 0.45) * clamp(raking, 0.6, 1.6);

  // White in the mask is the open flame. Red in the mask is the pink glass, which throws its own colour.
  float open_ = min(M.g, M.b);
  float glass = max(M.r - open_, 0.0);
  vec3 thrown = uLightCol * open_ + uPinkCol * glass;
  vec3 direct = thrown * S * att * wallCos * uPower * (1.0 - zone * 0.9);
  float dy = direct.r * 0.5 + direct.g * 0.5;
  direct *= dy / (dy + 0.07);
  // A little light always leaks and bounces, so silhouettes read even where the piercing misses. It carries the shadows faintly.
  float bounce = 1.0 / (1.0 + pow(r / (uR0 * 1.25), 1.8));
  vec3 leak = uLightCol * uLeak * bounce * (0.3 + 0.7 * S) * uPower * (0.92 + 0.08 * raking) * (1.0 - zone * 0.8);

  float wash = (pl.b - 0.5) + (pl2.b - 0.5) * 0.8;
  vec3 albedo = uAlbedo * (1.0 + wash * 0.14);
  vec3 ambient = uAmbient * (1.0 + wash * 0.3) * (1.0 + slope.y * 0.3);
  // Phones: the wall runs long, past where the lamp can reach. The water at its far end holds the last of the light.
  float seaGlow = smoothstep(uSeaY - 230.0, uSeaY - 20.0, P.y);
  vec3 lit = albedo * (ambient + direct + leak + uLightCol * 0.26 * seaGlow * seaGlow * S * uPower * (1.0 - zone * 0.9));

  // Beams in the air: integrate along the view ray in front of the wall, through the same mask.
  float fogReach = 1.0 - smoothstep(1.0, 1.7, length(P - uFlame.xy) / uR0);
  if (uFogGain > 0.0 && fogReach > 0.0) {
    float j = ign(gl_FragCoord.xy + fract(uTime * 7.3) * 37.0);
    vec3 fog = vec3(0.0);
    const int N_FOG = 4;
    for (int i = 0; i < N_FOG; i++) {
      float z = uFlame.z * 1.7 * (float(i) + j) / float(N_FOG);
      vec3 Q = vec3(P, z);
      vec3 d = Q - uFlame;
      float rq = length(d);
      float m = textureLod(uMask, maskUv(d / rq), uMaskLod + 1.4).g;
      fog += m / (1.0 + rq * rq / (uR0 * uR0 * 0.2));
    }
    lit += uLightCol * fog * uFogGain * uPower * fogReach * (1.0 - zone * 0.8) / float(N_FOG);
  }

  // Air around the lamp holds a little of its light. This is what seats the lantern in the room rather than on the page.
  {
    vec2 dl = P - uFlame.xy;
    float d2 = dot(dl, dl) / (uHalo * uHalo);
    lit += vec3(1.0, 0.46, 0.13) * (0.075 / (1.0 + d2 * 1.6) + 0.2 * exp(-d2 * 1.9)) * uPower;
  }

  // A filmic shoulder that keeps warm highlights warm
  vec3 c = 1.0 - exp(-lit * uExposure);
  vec3 out_c = c;

  // The ceiling on brightness behind the text, measured in real luminance: a soft knee, never a hard edge.
  if (zone > 0.001) {
    float y = luma(c);
    float yc = uLumaCap * (1.0 - exp(-y / uLumaCap));
    vec3 capped = c * (yc / max(y, 1e-4));
    out_c = mix(c, capped, smoothstep(0.1, 0.95, zone));
  }

  vec3 srgb = toSrgb(out_c);
  // Triangular dither removes banding from these long dark gradients.
  float n1 = ign(gl_FragCoord.xy);
  float n2 = ign(gl_FragCoord.yx + 17.0);
  srgb += (n1 + n2 - 1.0) * (1.6 / 255.0);
  fragColor = vec4(srgb, 1.0);
}`

// Puppets are drawn into one RGBA map, one layer per channel, then given a mip chain for the penumbrae.
export const PUPPET_VS = /* glsl */ `#version 300 es
in vec2 aPos;
in vec4 iM;     // a b c d
in vec2 iT;     // translation
in vec4 iRect;  // local x, y, w, h
in vec4 iUv;    // u0 v0 u1 v1
in vec2 iCh;    // channel, density
uniform vec2 uOrg;
uniform vec2 uExt;
out vec2 vUv;
flat out vec4 vMask;
void main() {
  vec2 local = iRect.xy + aPos * iRect.zw;
  vec2 p = vec2(iM.x * local.x + iM.y * local.y, iM.z * local.x + iM.w * local.y) + iT;
  vec2 ndc = (p - uOrg) / uExt * 2.0 - 1.0;
  gl_Position = vec4(ndc, 0.0, 1.0);
  vUv = mix(iUv.xy, iUv.zw, aPos);
  int ch = int(iCh.x + 0.5);
  vMask = vec4(ch == 0, ch == 1, ch == 2, ch == 3) * iCh.y;
}`

export const PUPPET_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
flat in vec4 vMask;
uniform sampler2D uAtlas;
out vec4 fragColor;
void main() {
  fragColor = vMask * texture(uAtlas, vUv).a;
}`

// The lantern itself: frames of a Cycles render, crossfaded as it twists, composited over the wall in display space.
export const SPRITE_VS = /* glsl */ `#version 300 es
in vec2 aPos;
uniform vec2 uStage;
uniform float uCamY;
uniform vec2 uCentre;   // where the ring is, in wall px
uniform vec2 uSize;     // sprite size in px
uniform vec2 uPivot;    // the ring in the sprite, 0..1
uniform float uAngle;
uniform float uGrow;    // the quad's margin factor, for bloom
out vec2 vUv;
void main() {
  vec2 q = (aPos - 0.5) * uGrow + 0.5;
  vec2 local = (q - uPivot) * uSize;
  float c = cos(uAngle), s = sin(uAngle);
  vec2 p = vec2(c * local.x - s * local.y, s * local.x + c * local.y) + uCentre - vec2(0.0, uCamY);
  vec2 ndc = p / uStage * 2.0 - 1.0;
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
  vUv = q;
}`

export const SPRITE_FS = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2DArray;
in vec2 vUv;
uniform sampler2DArray uFrames;
uniform vec3 uFrame;    // layer a, layer b, mix
uniform float uFlicker;
uniform float uLit;     // how far the flame has caught
uniform float uMode;    // 0 the lantern, 1 its bloom
out vec4 fragColor;
void main() {
  if (uMode < 0.5) {
    vec4 a = texture(uFrames, vec3(vUv, uFrame.x));
    vec4 b = texture(uFrames, vec3(vUv, uFrame.y));
    vec4 c = mix(a, b, uFrame.z);
    // The bright glass breathes with the flame, the brass doesn't.
    float y = max(c.r, max(c.g, c.b));
    float glow = smoothstep(0.55, 1.0, y / max(c.a, 0.01));
    c.rgb *= (1.0 + (uFlicker - 1.0) * glow * 2.2) * mix(1.0, uLit, glow * 0.9 + 0.1);
    fragColor = c;
  } else {
    float lod = 4.4;
    vec2 uv = vUv;
    vec4 c = textureLod(uFrames, vec3(uv, uFrame.x), lod);
    vec4 d = textureLod(uFrames, vec3(uv, uFrame.x), lod + 1.4);
    vec3 glow = c.rgb * 0.5 + d.rgb * 0.8;
    // Only what is truly bright blooms
    float y = max(glow.r, max(glow.g, glow.b));
    glow *= smoothstep(0.34, 0.85, y);
    float edge = smoothstep(0.0, 0.14, uv.x) * smoothstep(1.0, 0.86, uv.x) * smoothstep(0.0, 0.14, uv.y) * smoothstep(1.0, 0.86, uv.y);
    fragColor = vec4(glow * edge * 0.42 * uFlicker * uLit, 0.0);
  }
}`

// The chain: instanced links, lit from below by the lantern.
export const LINK_VS = /* glsl */ `#version 300 es
in vec2 aPos;
in vec4 iA;  // x, y, angle, kind
in vec2 iB;  // scale, brightness
uniform vec2 uStage;
uniform float uCamY;
uniform vec2 uSize;
out vec2 vUv;
flat out float vKind;
out float vLight;
void main() {
  vec2 local = (aPos - 0.5) * uSize * iB.x;
  float c = cos(iA.z), s = sin(iA.z);
  vec2 p = vec2(c * local.x - s * local.y, s * local.x + c * local.y) + iA.xy - vec2(0.0, uCamY);
  vec2 ndc = p / uStage * 2.0 - 1.0;
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
  vUv = aPos;
  vKind = iA.w;
  vLight = iB.y;
}`

export const LINK_FS = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2DArray;
in vec2 vUv;
flat in float vKind;
in float vLight;
uniform sampler2DArray uLinks;
out vec4 fragColor;
void main() {
  vec4 c = texture(uLinks, vec3(vUv, vKind));
  c.rgb *= vLight;
  fragColor = c;
}`

// Dust. A slow drift of motes in the air in front of the wall. Each one looks up the same piercing, so it only shines while it
// drifts through a beam, and goes dark again as it leaves. Worked out entirely in the vertex shader from gl_VertexID.
export const MOTE_VS = /* glsl */ `#version 300 es
precision highp float;
uniform vec2 uStage;
uniform float uCamY;
uniform vec3 uFlame;
uniform mat3 uToLamp;
uniform vec2 uMaskRange;
uniform float uFlip;
uniform float uTime;
uniform float uPower;
uniform float uDpr;
uniform float uR0;
uniform vec4 uBox;     // x, y, w, h of the air the dust lives in
uniform vec4 uCopyBox;
uniform float uK;
uniform sampler2D uMask;
flat out float vGlow;
vec3 hash3(float n) {
  vec3 p = fract(vec3(n) * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yzx + 33.33);
  return fract((p.xxy + p.yzz) * p.zyx);
}
void main() {
  float id = float(gl_VertexID) + 1.0;
  vec3 h = hash3(id);
  vec3 h2 = hash3(id + 91.0);
  // Rising very slowly on the lamp's warmth, wandering as it goes, wrapped within the box.
  float t = uTime * (0.012 + h2.x * 0.014);
  vec2 q = vec2(h.x + sin(uTime * (0.05 + h2.y * 0.09) + h2.z * 6.28) * 0.018 + t * (h2.z - 0.5) * 0.4, h.y - t);
  q = fract(q);
  float edge = smoothstep(0.0, 0.08, q.x) * smoothstep(1.0, 0.92, q.x) * smoothstep(0.0, 0.08, q.y) * smoothstep(1.0, 0.92, q.y);
  vec3 P = vec3(uBox.xy + q * uBox.zw, uFlame.z * (0.25 + 1.5 * h.z));
  vec3 d = P - uFlame;
  float r = length(d);
  vec3 l = uToLamp * (d / r);
  float lon = atan(l.x, -l.z) * (uFlip > 0.5 ? -1.0 : 1.0);
  float lat = asin(clamp(l.y, -1.0, 1.0));
  vec2 uv = vec2(0.5 + lon / (2.0 * uMaskRange.x), 0.5 - lat / (2.0 * uMaskRange.y));
  float m = textureLod(uMask, uv, 2.5).g;
  float zone = step(uCopyBox.x - 40.0, P.x) * step(P.x, uCopyBox.z + 40.0) * step(uCopyBox.y - 40.0, P.y) * step(P.y, uCopyBox.w + 40.0);
  float twinkle = 0.55 + 0.45 * sin(uTime * (0.8 + h2.y * 1.7) + h2.x * 40.0);
  vGlow = m * edge * twinkle * uPower * (1.0 - zone) / (1.0 + r * r / (uR0 * uR0));
  vec2 ndc = (P.xy - vec2(0.0, uCamY)) / uStage * 2.0 - 1.0;
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
  gl_PointSize = (1.4 + h2.z * 2.2) * uK * uDpr;
}`

export const MOTE_FS = /* glsl */ `#version 300 es
precision highp float;
flat in float vGlow;
out vec4 fragColor;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float a = smoothstep(1.0, 0.1, dot(c, c));
  fragColor = vec4(vec3(1.0, 0.72, 0.42) * a * vGlow * 0.5, 0.0);
}`
