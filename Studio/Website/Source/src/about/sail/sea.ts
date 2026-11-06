// The life in the poster: a small WebGL2 layer over the key art. It shimmers the sea, twinkles the sun's road, drifts the clouds,
// rocks the boat and answers the pointer with a little parallax. It uses a small map rendered with the art (red is depth, green
// the sea, blue the sky). Nothing here comes from Unity, and if WebGL2 isn't there the page keeps the still picture.

const VERT = `#version 300 es
out vec2 vP;
void main() {
  vec2 p = vec2(float((gl_VertexID & 1) << 2) - 1.0, float((gl_VertexID & 2) << 1) - 1.0);
  vP = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5);
  gl_Position = vec4(p, 0.0, 1.0);
}`

const FRAG = `#version 300 es
precision highp float;
in vec2 vP;
out vec4 O;
uniform sampler2D uArt, uMap;
uniform vec2 uRes;
uniform float uImg;       // the picture's aspect
uniform vec4 uRect;       // the part of the picture on show: left, top, width, height
uniform float uT;
uniform vec2 uPtr;
uniform float uScroll;
uniform float uFlip;
uniform vec2 uSun;
uniform float uHorizon;
uniform vec2 uBoat;       // the boat's waterline, the point it rocks about
uniform vec2 uBoatR;
uniform float uDpr;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  return 0.55 * noise(p) + 0.3 * noise(p * 2.1 + 3.7) + 0.15 * noise(p * 4.3 + 9.1);
}
vec2 cover(vec2 p) {
  return uRect.xy + p * uRect.zw;
}

void main() {
  vec2 p = vP;
  if (uFlip > 0.5) p.x = 1.0 - p.x;
  vec2 uv = cover(p);

  // The boat rides the swell: everything around its waterline turns a hair and rises and falls, fading out to nothing,
  // so the picture bends rather than tears.
  vec2 fromBoat = uv - uBoat;
  vec2 stretch = vec2(uImg, 1.0);
  float r = length((fromBoat - vec2(0.0, -uBoatR.y)) * stretch / (uBoatR.x * uImg));
  float rock = smoothstep(1.25, 0.5, r);
  float th = (sin(uT * 0.62) * 0.0075 + sin(uT * 0.97 + 1.2) * 0.004) * rock;
  float cth = cos(th), sth = sin(th);
  vec2 q = fromBoat * stretch;
  q = vec2(q.x * cth - q.y * sth, q.x * sth + q.y * cth) / stretch;
  uv = uBoat + q + vec2(0.0, (sin(uT * 0.8) * 0.0028 + sin(uT * 1.31 + 0.8) * 0.0012) * rock);

  // Parallax: near things slide further than far ones, by how far the pointer has moved and how far the page has scrolled.
  vec4 m0 = texture(uMap, uv);
  float near = pow(clamp(1.0 - m0.r, 0.0, 1.0), 1.4);
  vec2 par = (uPtr * vec2(0.022, 0.012) + vec2(0.0, uScroll * 0.03)) * (0.1 + near * 1.6);
  vec2 st = uv + par;
  vec4 m = texture(uMap, st);
  float sea = smoothstep(0.35, 0.8, m.g);
  float sky = smoothstep(0.55, 0.95, m.b);

  vec3 col;
  if (sea > 0.002) {
    // The water's surface in perspective: coordinates that stretch with distance, as far water would.
    float wy = clamp((st.y - uHorizon) / (1.0 - uHorizon), 0.0015, 1.0);
    vec2 w = vec2((st.x - 0.5) * uImg / wy, 0.32 / wy);
    float t = uT;
    vec2 d = vec2(
      fbm(w * 5.5 + vec2(t * 0.34, t * 0.6)) + 0.6 * fbm(w * 14.0 + vec2(-t * 0.5, t * 0.9)) - 0.8,
      fbm(w * 4.7 + vec2(-t * 0.28, t * 0.47) + 11.0) + 0.6 * fbm(w * 12.0 + vec2(t * 0.42, t * 0.8) + 5.0) - 0.8
    );
    vec2 disp = d * vec2(0.0065, 0.009) * (0.1 + wy * 1.1);
    vec3 c = texture(uArt, st + disp * sea).rgb;
    // A slow breath across the swell.
    float swell = fbm(w * 1.4 + vec2(t * 0.09, t * 0.2));
    c *= 0.965 + 0.07 * swell;
    // The sun's road: tiny points of light flick on and off along it, densest under the sun and scattered to either side.
    // They're laid out in screen space, so they stay the same fine size whatever the picture's scale.
    float dx = (st.x - uSun.x) * uImg;
    float road = exp(-dx * dx / (0.012 + wy * wy * 0.1));
    vec2 gp = vP * uRes / vec2(6.0, 3.0 + wy * 4.0) / uDpr;
    vec2 cellId = floor(gp);
    float h = hash(cellId);
    float chance = road * 0.42 + 0.006;
    if (h > 1.0 - chance) {
      vec2 off = vec2(hash(cellId + 3.1), hash(cellId + 7.7)) - 0.5;
      float dist = length(fract(gp) - 0.5 - off * 0.5);
      float tw = max(0.0, sin(t * (1.6 + h * 3.0) + h * 80.0));
      tw *= tw * tw;
      c += vec3(1.0, 0.86, 0.6) * smoothstep(0.34, 0.06, dist) * tw * (0.22 + road * 0.8) * (0.4 + wy * 0.6);
    }
    col = mix(texture(uArt, st).rgb, c, sea);
  } else {
    col = texture(uArt, st).rgb;
  }
  if (sky > 0.002) {
    // Clouds drift: two sliding copies crossfaded on a slow cycle, held still at the sun and the boat so they stay crisp.
    float cyc = uT / 44.0;
    float a = fract(cyc), b = fract(cyc + 0.5);
    float high = clamp(1.0 - st.y / max(uHorizon, 0.01), 0.0, 1.0);
    vec2 flow = vec2(0.03 + 0.05 * high, 0.002);
    float keep = smoothstep(0.03, 0.2, length((st - uSun) * stretch))
               * smoothstep(0.0, 0.32, length((st - uBoat + vec2(0.0, uBoatR.y)) * stretch) - uBoatR.x * uImg * 0.72);
    float fade = abs(2.0 * a - 1.0);
    vec3 c1 = texture(uArt, st - flow * (a - 0.5) * keep).rgb;
    vec3 c2 = texture(uArt, st - flow * (b - 0.5) * keep).rgb;
    vec3 c = mix(c1, c2, fade);
    // Thin veils of high cloud pass in front of it all, catching a little of the light.
    float veil = fbm(vec2(st.x * uImg * 2.0 - uT * 0.012, st.y * 7.0 + uT * 0.003));
    veil = smoothstep(0.52, 0.86, veil) * high;
    c = mix(c, c + vec3(0.2, 0.16, 0.12), veil * 0.26);
    col = mix(col, c, sky);
  }
  O = vec4(col, 1.0);
}`

export type SeaOptions = {
  canvas: HTMLCanvasElement
  /** The poster already on the page. The layer draws from the same image rather than fetching it again. */
  art: HTMLImageElement
  map: string
  /** The picture's width / height. */
  aspect: number
  sun: [number, number]
  horizon: number
  boat: [number, number]
  /** The boat's rough width and height in the picture, as fractions of its width and height. */
  boatSize: [number, number]
  flip: boolean
  dpr: number
  signal: AbortSignal
  onReady: () => void
}

export type Sea = {
  /** The part of the picture on show, as fractions of its size. */
  frame: (left: number, top: number, width: number, height: number) => void
  draw: (dt: number, ptrX: number, ptrY: number, scroll: number) => void
  destroy: () => void
}

function shader(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader failed')
  return s
}

const loaded = (i: HTMLImageElement) =>
  new Promise<HTMLImageElement>((res, rej) => {
    if (i.complete && i.naturalWidth) return res(i)
    i.addEventListener('load', () => res(i), { once: true })
    i.addEventListener('error', () => rej(new Error('poster failed')), { once: true })
  })

const image = (src: string, signal: AbortSignal) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image()
    i.decoding = 'async'
    i.onload = () => res(i)
    i.onerror = () => rej(new Error(`could not load ${src}`))
    signal.addEventListener('abort', () => rej(new Error('aborted')), { once: true })
    i.src = src
  })

/** Returns null if this browser has no WebGL2, which leaves the page's still picture in place. */
export function createSea(o: SeaOptions): Sea | null {
  const gl = o.canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance', depth: false, stencil: false })
  if (!gl) return null
  const prog = gl.createProgram()!
  gl.attachShader(prog, shader(gl, gl.VERTEX_SHADER, VERT))
  gl.attachShader(prog, shader(gl, gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link failed')
  gl.useProgram(prog)
  const U = (n: string) => gl.getUniformLocation(prog, n)
  const u = {
    res: U('uRes'), t: U('uT'), ptr: U('uPtr'), scroll: U('uScroll'), rect: U('uRect'),
  }
  gl.uniform1i(U('uArt'), 0)
  gl.uniform1i(U('uMap'), 1)
  gl.uniform1f(U('uImg'), o.aspect)
  gl.uniform1f(U('uFlip'), o.flip ? 1 : 0)
  gl.uniform2f(U('uSun'), o.sun[0], o.sun[1])
  gl.uniform1f(U('uHorizon'), o.horizon)
  gl.uniform2f(U('uBoat'), o.boat[0], o.boat[1])
  gl.uniform2f(U('uBoatR'), o.boatSize[0], o.boatSize[1])
  gl.uniform1f(U('uDpr'), o.dpr)
  const vao = gl.createVertexArray()
  gl.bindVertexArray(vao)

  const textures: WebGLTexture[] = []
  const texture = (unit: number, im: HTMLImageElement, srgb: boolean) => {
    const t = gl.createTexture()!
    textures.push(t)
    gl.activeTexture(gl.TEXTURE0 + unit)
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    // Parallax can reach just past the picture's edge. A mirror there is invisible, where clamping would smear the last row into streaks.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT)
    gl.texImage2D(gl.TEXTURE_2D, 0, srgb ? gl.RGBA8 : gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, im)
  }

  let ready = false
  let time = 0
  let lastW = 0
  let lastH = 0
  void Promise.all([loaded(o.art), image(o.map, o.signal)])
    .then(async ([a, m]) => {
      if (o.signal.aborted) return
      texture(0, a, true)
      texture(1, m, false)
      ready = true
      o.onReady()
    })
    .catch(() => {
      // The still picture stays. A missing layer is never worth an error on the page.
    })

  return {
    frame(left, top, width, height) {
      gl.uniform4f(u.rect, left, top, width, height)
    },
    draw(dt, px, py, scroll) {
      if (!ready) return
      time += dt
      const w = Math.round(o.canvas.clientWidth * o.dpr)
      const h = Math.round(o.canvas.clientHeight * o.dpr)
      if (w !== lastW || h !== lastH) {
        lastW = w
        lastH = h
        o.canvas.width = w
        o.canvas.height = h
        gl.viewport(0, 0, w, h)
        gl.uniform2f(u.res, w, h)
      }
      gl.uniform1f(u.t, time)
      gl.uniform2f(u.ptr, o.flip ? -px : px, py)
      gl.uniform1f(u.scroll, scroll)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    },
    destroy() {
      for (const t of textures) gl.deleteTexture(t)
      gl.deleteProgram(prog)
      gl.deleteVertexArray(vao)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}
