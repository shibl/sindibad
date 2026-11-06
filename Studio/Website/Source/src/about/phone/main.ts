// "World out of a phone": a cheap Android on a sunlit table, the sea leaves its screen, and it ends up a castaway on a raft inside the
// world it was running. Rendered frames carry the break, a live WebGL2 sea takes over underneath them, and the visitor flips airplane
// mode to prove the point. See concepts/blender/about/phone for how the frames are made.
import './phone.css'
import type { AboutCtx } from '../types'
import { FrameStore } from './frames'
import { HEAD, clamp01, compile, lerp, smooth, textureFrom, type Prog, type V3 } from './glx'
import { GameScreen } from './screen'
import { Sea, swell, type Card } from './sea'

type FrameInfo = { f: number; eye: V3; at: V3; lens: number; corners: number[] }
type Manifest = { w: number; h: number; sea: number; frames: FrameInfo[] }
type RaftInfo = { card: { x0: number; x1: number; z0: number; z1: number; y: number }; corners: number[]; crop: number[] }
type CardMeta = { w: number; h: number; x0: number; x1: number; z0: number; z1: number }

const WORDS = {
  en: {
    toggle: 'Airplane mode',
    still: 'Still playing.',
    facts: ['~4.4 MB', 'Fully offline', 'Low-powered Android'],
    art: 'A battered low-cost phone on a wooden raft, adrift on a wide sea, its screen still showing a little island world.',
  },
  ar: {
    toggle: 'وضع الطيران',
    still: 'ما زلنا نلعب.',
    facts: ['نحو 4.4 ميغابايت', 'دون إنترنت بالكامل', 'هواتف أندرويد البسيطة'],
    art: 'هاتف بسيط مستهلك على طوف خشبي في بحر واسع، وشاشته ما زالت تعرض عالماً صغيراً من الجزر.',
  },
}

// The score, in fractions of the pin.
const SEQ_P0 = 0.015
const SEQ_P1 = 0.372
const HAND_P0 = 0.352
const HAND_P1 = 0.4
const ISLES_P0 = 0.41
const ISLES_P1 = 0.66
const OFFLINE_P = 0.68

const FRAME_VS = `${HEAD}
uniform vec2 u_scale; uniform float u_flip; out vec2 v_uv;
void main() {
  vec2 p = vec2((gl_VertexID & 1) == 0 ? -1. : 1., (gl_VertexID & 2) == 0 ? -1. : 1.);
  v_uv = vec2(p.x * .5 + .5, .5 - p.y * .5);
  gl_Position = vec4(p.x * u_scale.x * u_flip, p.y * u_scale.y, 0., 1.);
}`

// Two neighbouring frames blended, a light unsharp to win back what the compression took, and a grade that can dip when the signal dies.
const FRAME_FS = `${HEAD}
in vec2 v_uv; out vec4 o;
uniform sampler2D u_a; uniform sampler2D u_b; uniform float u_mix; uniform float u_alpha; uniform vec2 u_px; uniform float u_sharp;
void main() {
  vec4 c = mix(texture(u_a, v_uv), texture(u_b, v_uv), u_mix);
  if (u_sharp > 0.0) {
    vec4 n = texture(u_a, v_uv + vec2(u_px.x, 0.)) + texture(u_a, v_uv - vec2(u_px.x, 0.)) + texture(u_a, v_uv + vec2(0., u_px.y)) + texture(u_a, v_uv - vec2(0., u_px.y));
    vec4 m = texture(u_b, v_uv + vec2(u_px.x, 0.)) + texture(u_b, v_uv - vec2(u_px.x, 0.)) + texture(u_b, v_uv + vec2(0., u_px.y)) + texture(u_b, v_uv - vec2(0., u_px.y));
    vec4 blur = mix(n, m, u_mix) * 0.25;
    c = c + (c - blur) * u_sharp;
  }
  float dither = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5;
  o = clamp(c + dither / 255.0, 0.0, 1.0) * u_alpha;
}`

// The live game laid on the phone in perspective, added as the difference from the still that's baked into the frame underneath.
const LIVE_VS = `${HEAD}
uniform vec2 u_q[4]; uniform mat3 u_inv; out vec3 v_h;
void main() {
  int idx = gl_VertexID == 0 ? 0 : gl_VertexID == 1 ? 1 : gl_VertexID == 2 ? 3 : 2;
  vec2 p = u_q[idx];
  v_h = u_inv * vec3(p, 1.0);
  gl_Position = vec4(p, 0., 1.);
}`

const LIVE_FS = `${HEAD}
in vec3 v_h; out vec4 o;
uniform sampler2D u_live; uniform sampler2D u_ref; uniform float u_k;
void main() {
  vec2 uv = v_h.xy / v_h.z;
  vec3 d = texture(u_live, uv).rgb - texture(u_ref, uv).rgb;
  // Positive and negative parts are drawn in two passes, by blend mode, so the frame beneath needn't be sampled again.
  o = vec4(max(d, vec3(0.0)) * u_k, 1.0);
}`
const LIVE_NEG_FS = LIVE_FS.replace('max(d, vec3(0.0))', 'max(-d, vec3(0.0))')

function homography(q: number[]) {
  // Unit square to quad (tl, tr, br, bl as uv (0,1) (1,1) (1,0) (0,0)), by the standard square-to-quad solution, then inverted.
  const [x0, y0, x1, y1, x2, y2, x3, y3] = [q[6], q[7], q[4], q[5], q[2], q[3], q[0], q[1]]
  const dx1 = x1 - x2
  const dx2 = x3 - x2
  const sx = x0 - x1 + x2 - x3
  const dy1 = y1 - y2
  const dy2 = y3 - y2
  const sy = y0 - y1 + y2 - y3
  const den = dx1 * dy2 - dx2 * dy1 || 1e-9
  const g = (sx * dy2 - dx2 * sy) / den
  const h = (dx1 * sy - sx * dy1) / den
  const a = x1 - x0 + g * x1
  const b = x3 - x0 + h * x3
  const c = x0
  const d = y1 - y0 + g * y1
  const e = y3 - y0 + h * y3
  const f = y0
  // Forward: [a b c; d e f; g h 1]. Inverse by cofactors, column-major for GLSL.
  const A = e - f * h
  const B = c * h - b
  const C = b * f - c * e
  const D = f * g - d
  const E = a - c * g
  const F = c * d - a * f
  const G = d * h - e * g
  const H = b * g - a * h
  const I = a * e - b * d
  return new Float32Array([A, D, G, B, E, H, C, F, I])
}

async function load(url: string, signal: AbortSignal, premultiply = true) {
  const r = await fetch(url, { signal })
  if (!r.ok) throw new Error(`${url}: ${r.status}`)
  const blob = await r.blob()
  return createImageBitmap(blob, { premultiplyAlpha: premultiply ? 'premultiply' : 'none', colorSpaceConversion: 'none' })
}

export function mount(ctx: AboutCtx) {
  const { stage, copy, section, lang, rtl, reduce, touch, signal, base } = ctx
  const asset = (p: string) => `${base}about/phone/${p}`
  const w = WORDS[lang]
  stage.classList.add('ph-stage')

  // ------------------------------------------------------------------------------------------------------------- the page
  const portraitOf = () => innerHeight > innerWidth * 1.05
  const set = portraitOf() ? 'port' : 'land'
  const canvas = document.createElement('canvas')
  canvas.className = 'ph-canvas'
  canvas.setAttribute('aria-hidden', 'true')
  const poster = document.createElement('div')
  poster.className = 'ph-poster'
  poster.style.backgroundImage = `url(${asset(`poster-${set}.webp`)})`
  if (rtl) poster.style.transform = 'scaleX(-1)'
  poster.setAttribute('aria-hidden', 'true')
  const copyWrap = document.createElement('div')
  copyWrap.className = 'ph-copy'
  copyWrap.dir = rtl ? 'rtl' : 'ltr'
  copyWrap.append(copy)
  stage.append(poster, canvas, copyWrap)

  // The control: a piece of the phone's own plastic, status icons and a real switch.
  const panel = document.createElement('div')
  panel.className = 'ph-panel'
  panel.dir = rtl ? 'rtl' : 'ltr'
  const row = document.createElement('div')
  row.className = 'ph-row'
  const status = document.createElement('div')
  status.className = 'ph-status'
  status.setAttribute('aria-hidden', 'true')
  const bars = document.createElement('div')
  bars.className = 'ph-bars'
  for (let i = 0; i < 4; i++) {
    const b = document.createElement('i')
    b.style.setProperty('--i', String(i))
    bars.append(b)
  }
  const wifi = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  wifi.setAttribute('viewBox', '0 0 24 18')
  wifi.setAttribute('class', 'ph-wifi')
  wifi.innerHTML = '<path d="M2 7c5.6-5 14.4-5 20 0"/><path d="M5.6 10.6c3.6-3.1 9.2-3.1 12.8 0"/><path d="M9.2 14c1.7-1.4 3.9-1.4 5.6 0"/><circle cx="12" cy="16.2" r="1.3"/>'
  status.append(bars, wifi)
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'ph-switch'
  button.setAttribute('role', 'switch')
  button.setAttribute('aria-checked', 'false')
  const label = document.createElement('span')
  label.className = 'ph-label'
  label.textContent = w.toggle
  const track = document.createElement('span')
  track.className = 'ph-track'
  track.setAttribute('aria-hidden', 'true')
  track.innerHTML = '<span class="ph-thumb"><svg viewBox="0 0 24 24"><path d="M21 15.5v-2l-8-5V3.6c0-.9-.5-1.6-1-1.6s-1 .7-1 1.6v4.9l-8 5v2l8-2.6V18l-2.2 1.6V21l3.2-1 3.2 1v-1.4L13 18v-5.1l8 2.6Z"/></svg></span>'
  button.append(label, track)
  row.append(status, button)
  const reply = document.createElement('div')
  reply.className = 'ph-reply'
  reply.setAttribute('aria-live', 'polite')
  const still = document.createElement('p')
  still.className = 'ph-still'
  still.textContent = w.still
  const facts = document.createElement('p')
  facts.className = 'ph-facts'
  w.facts.forEach(fact => {
    const s = document.createElement('span')
    s.textContent = fact
    facts.append(s)
  })
  const replyInner = document.createElement('div')
  replyInner.className = 'ph-reply-in'
  replyInner.append(still, facts)
  reply.append(replyInner)
  panel.append(row, reply)
  stage.append(panel)

  let offline = false
  let flipAt = -1e9
  let now = 0
  const flip = () => {
    offline = !offline
    flipAt = now
    button.setAttribute('aria-checked', String(offline))
    panel.classList.toggle('is-offline', offline)
    reply.classList.toggle('is-on', offline)
  }
  button.addEventListener('click', flip, { signal })

  // A hand-painted still for the visitor who wants no motion, and for browsers without WebGL2.
  const glTest = !reduce ? canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: false }) : null
  if (reduce || !glTest) {
    stage.classList.add('is-static')
    canvas.remove()
    poster.style.backgroundImage = `url(${asset(`still-${set}.webp`)})`
    poster.setAttribute('role', 'img')
    poster.setAttribute('aria-label', w.art)
    poster.removeAttribute('aria-hidden')
    ctx.mark.set(1)
    panel.classList.add('is-in')
    copyWrap.classList.add('is-in')
    const prev = section.previousElementSibling
    section.style.marginTop = `${Math.min(0, 46 - (prev ? parseFloat(getComputedStyle(prev).marginBottom) || 0 : 0))}px`
    return () => {
      copyWrap.remove()
      panel.remove()
    }
  }
  const gl = glTest

  ctx.pin(3.2)

  // ---------------------------------------------------------------------------------------------------------------- GL state
  let alive = true
  let manifest: Manifest | null = null
  let store: FrameStore | null = null
  let sea: Sea | null = null
  let game: GameScreen | null = null
  const cards: Record<string, { tex: WebGLTexture; meta: CardMeta }> = {}
  let raft: { tex: WebGLTexture; info: RaftInfo } | null = null
  let posterTex: WebGLTexture | null = null
  const frameProg = compile(gl, FRAME_VS, FRAME_FS, 'frame')
  const liveProg = compile(gl, LIVE_VS, LIVE_FS, 'live')
  const liveNeg = compile(gl, LIVE_VS, LIVE_NEG_FS, 'live-')
  const vaoEmpty = gl.createVertexArray()!
  // A small pool of frame textures on the GPU around the playhead.
  const pool = new Map<number, { tex: WebGLTexture; last: number }>()
  const POOL = touch ? 6 : 10
  let tick = 0
  let frameW = 1
  let frameH = 1

  const uploadFrame = (i: number) => {
    const bm = store?.get(i)
    if (!bm) return null
    let e = pool.get(i)
    if (e) {
      e.last = tick
      return e.tex
    }
    if (pool.size >= POOL) {
      let oldest = -1
      let age = Infinity
      for (const [k, v] of pool) {
        if (v.last < age && k !== i) {
          age = v.last
          oldest = k
        }
      }
      if (oldest >= 0) {
        e = pool.get(oldest)!
        pool.delete(oldest)
      }
    }
    const tex = e?.tex ?? gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    if (e) {
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, bm)
    } else {
      gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, bm.width, bm.height)
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, bm)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    }
    pool.set(i, { tex, last: tick })
    return tex
  }

  // Lazy start: nothing is fetched until the section is within a screen and a half of the viewport.
  let started = false
  const start = async () => {
    if (started) return
    started = true
    try {
      manifest = await (await fetch(asset(`${set}/manifest.json`), { signal })).json()
      if (!alive || !manifest) return
      frameW = manifest.w
      frameH = manifest.h
      store = new FrameStore(i => asset(`${set}/f${String(i).padStart(3, '0')}.webp`), manifest.frames.length, touch ? 10 : 18, signal, touch ? 3 : 5)
      const [cardsMeta, raftInfo] = await Promise.all([
        fetch(asset('cards.json'), { signal }).then(r => r.json() as Promise<Record<string, CardMeta>>),
        fetch(asset(`raft-${set}.json`), { signal }).then(r => r.json() as Promise<RaftInfo>),
      ])
      // The sharp first impression: a larger still of the first frame, shown until scrolling begins.
      load(asset(`poster-${set}.webp`), signal)
        .then(bm => {
          if (!alive) return bm.close()
          posterTex = textureFrom(gl, bm)
          bm.close()
        })
        .catch(() => {})
      const [world, raftImg, ...imgs] = await Promise.all([
        load(asset('world.webp'), signal),
        load(asset(`raft-${set}.webp`), signal),
        ...['volcano', 'fort', 'light', 'palms', 'dhow'].map(n => load(asset(`${n}.webp`), signal)),
      ])
      if (!alive) return
      sea = new Sea(gl, { low: touch })
      game = new GameScreen(gl, world, touch ? 300 : 420, touch ? 604 : 846)
      ;['volcano', 'fort', 'light', 'palms', 'dhow'].forEach((n, i) => {
        cards[n] = { tex: textureFrom(gl, imgs[i], { mips: true }), meta: cardsMeta[n] }
      })
      raft = { tex: textureFrom(gl, raftImg, { mips: true }), info: raftInfo }
      world.close()
      raftImg.close()
      imgs.forEach(b => b.close())
    } catch (err) {
      if (!signal.aborted) console.warn('[phone] assets', err)
    }
  }
  const near = new IntersectionObserver(([e]) => e.isIntersecting && void start(), { rootMargin: '150% 0px' })
  near.observe(section)

  // ---------------------------------------------------------------------------------------------------------------- resize
  let W = 1
  let H = 1
  // The stage sits a small gutter under the hero, whatever margin the page gives the hero at this width.
  const fitGutter = () => {
    const prev = section.previousElementSibling
    const mb = prev ? parseFloat(getComputedStyle(prev).marginBottom) || 0 : 0
    section.style.marginTop = `${Math.min(0, 46 - mb)}px`
  }
  const resize = () => {
    fitGutter()
    const dpr = Math.min(devicePixelRatio || 1, touch ? 1.5 : 2)
    const nw = Math.round(stage.clientWidth * dpr)
    const nh = Math.round(stage.clientHeight * dpr)
    if (nw !== W || nh !== H) {
      W = canvas.width = nw
      H = canvas.height = nh
    }
  }
  const ro = new ResizeObserver(resize)
  ro.observe(stage)
  resize()

  // ---------------------------------------------------------------------------------------------------------------- pointer
  let pointer: { x: number; y: number; moved: boolean } | null = null
  const onMove = (e: PointerEvent) => {
    const r = stage.getBoundingClientRect()
    pointer = { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: 1 - ((e.clientY - r.top) / r.height) * 2, moved: true }
  }
  stage.addEventListener('pointermove', onMove, { passive: true, signal })
  stage.addEventListener('pointerdown', onMove, { passive: true, signal })

  // ---------------------------------------------------------------------------------------------------------------- the frame
  let sp = 0
  let lastIdx = 0
  let shown = 0
  let stillShown = false
  let worldT = 40
  let idle = 0
  let ringT = 0
  let textShown = false
  let panelShown = false
  let lastPx = -1
  let lastPy = -1
  const flipSign = rtl ? -1 : 1

  const cameraAt = (idx: number) => {
    const fs = manifest!.frames
    const i = Math.min(fs.length - 1, Math.floor(idx))
    const j = Math.min(fs.length - 1, i + 1)
    const t = idx - i
    const a = fs[i]
    const b = fs[j]
    const mix3 = (u: V3, v: V3): V3 => [lerp(u[0], v[0], t), lerp(u[1], v[1], t), lerp(u[2], v[2], t)]
    return { eye: mix3(a.eye, b.eye), at: mix3(a.at, b.at), lens: lerp(a.lens, b.lens, t), a, b, t }
  }

  const draw = (p: number, dt: number) => {
    if (!alive) return
    now += dt
    tick++
    // A little damping over the page's own smoothing, so a flick of the wheel still has weight.
    sp += (p - sp) * (1 - Math.exp(-dt * 16))
    if (Math.abs(p - sp) < 0.00005) sp = p
    const pp = sp
    ctx.stage.style.setProperty('--ph-radius', `${Math.round((1 - smooth(-0.002, 0.004, p)) * 32)}px`)
    ctx.stage.style.setProperty('--ph-radius-b', `${Math.round(smooth(0.985, 1, p) * 32)}px`)
    // ------------------------------------------------------------------- the words
    const showText = pp > HAND_P0 + 0.012
    if (showText !== textShown) {
      textShown = showText
      copyWrap.classList.toggle('is-in', showText)
    }
    ctx.mark.set(smooth(HAND_P0 + 0.015, HAND_P0 + 0.09, pp))
    const showPanel = pp > OFFLINE_P
    if (showPanel !== panelShown) {
      panelShown = showPanel
      panel.classList.toggle('is-in', showPanel)
    }
    // Arrived deep in the scene before the assets: the composed still holds the place, under the words.
    const needStill = pp > HAND_P0 && !(sea && raft)
    if (needStill && !stillShown) {
      stillShown = true
      poster.style.backgroundImage = `url(${asset(`still-${set}.webp`)})`
    }
    if (!manifest || !store) return

    const n = manifest.frames.length
    // Time passes unevenly: the first frames are sparse. Map scroll to sim frames, then to frame index.
    const lastF = manifest.frames[n - 1].f
    const seqT = clamp01((pp - SEQ_P0) / (SEQ_P1 - SEQ_P0))
    const simF = seqT * lastF
    let idx = 0
    {
      const fs = manifest.frames
      let k = 0
      while (k < n - 2 && fs[k + 1].f <= simF) k++
      idx = k + clamp01((simF - fs[k].f) / Math.max(1, fs[k + 1].f - fs[k].f))
    }
    const dir = Math.sign(idx - lastIdx)
    // On the move, neighbouring frames blend. At rest the picture settles onto the nearest whole frame, so nothing stays doubled.
    const moving = Math.abs(idx - lastIdx) > 0.002
    lastIdx = idx
    shown += ((moving ? idx : Math.round(idx)) - shown) * (1 - Math.exp(-dt * (moving ? 40 : 7)))
    store.seek(idx, dir)

    const crossfade = smooth(HAND_P0, HAND_P1, pp)
    const seaOn = !!sea && !!raft && pp > HAND_P0 - 0.004
    const frameAlpha = 1 - crossfade

    // Clocks. Under the frames the live sea keeps pace with the rendered one; once it's alone it runs free, and the flip can slow it.
    const since = now - flipAt
    let timeScale = 1
    let mood = 0
    if (offline && since < 2.2) {
      // For a beat it looks as if the world is going down with the signal. Then it isn't.
      timeScale = since < 0.62 ? lerp(1, 0.06, smooth(0, 0.34, since)) : lerp(0.06, 1, smooth(0.62, 1.9, since))
      mood = since < 0.62 ? smooth(0, 0.36, since) : 1 - smooth(0.62, 1.5, since)
    }
    if (pp < HAND_P0) idle = 0
    else idle += dt * timeScale
    worldT = 40 + (simF - lastF) / 24 + idle
    const sigOn = offline ? 1 - smooth(0.05, 0.75, since) : smooth(0, 0.5, since)

    // ------------------------------------------------------------------- the live scene
    const fa = frameW / frameH
    const va = W / H
    const sx = va > fa ? 1 : fa / va
    const sy = va > fa ? va / fa : 1
    if (game) {
      game.setSignal(sigOn, sigOn)
      game.render(now + 3)
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, W, H)
    gl.disable(gl.BLEND)
    gl.disable(gl.DEPTH_TEST)

    const cam = cameraAt(shown)
    if (seaOn && sea && raft) {
      const seaZ = manifest.sea
      const eye: V3 = [cam.eye[0], cam.eye[1], cam.eye[2] - seaZ]
      const at: V3 = [cam.at[0], cam.at[1], cam.at[2] - seaZ]
      // After the frames end the camera keeps drifting in the last direction, then settles.
      const after = clamp01((pp - SEQ_P1) / (1 - SEQ_P1))
      const drift = after * after * (3 - 2 * after)
      // The camera keeps backing away: the raft gets smaller and the world around it gets bigger.
      eye[1] -= drift * (frameH > frameW ? 30 : 62)
      eye[2] += drift * 2.2
      at[2] += drift * 2.2
      const list: Card[] = []
      // Islands rise, far to near.
      const add = (name: string, x: number, y: number, s: number, t0: number, t1: number, haze: number) => {
        const c = cards[name]
        if (!c) return
        const up = smooth(t0, t1, pp)
        if (up <= 0.001) return
        const settle = 1 + 0.02 * Math.sin(now * 0.5 + x)
        const h = c.meta.h * s
        const ww = c.meta.w * s
        // Water runs off it as it comes: rises with an overshoot and a settle.
        const eased = up < 1 ? 1 - Math.pow(1 - up, 3) * (1 + 1.2 * up) : 1
        const base = -h * (1 - eased) * 1.05 + c.meta.z0 * s
        const sw = swell(x * 0.02, y * 0.02, worldT * 0.3).h * 0.5
        list.push({ tex: c.tex, x, y, z: base + sw * 0.0, w: ww * settle * 1, h, haze, water: 0.0, waterScale: 1.4, mirror: true })
      }
      const portrait = frameH > frameW
      if (portrait) {
        add('volcano', -130, 1500, 12, ISLES_P0, ISLES_P0 + 0.14, 0.42)
        add('fort', 150, 1250, 9, ISLES_P0 + 0.05, ISLES_P0 + 0.2, 0.36)
        add('light', 330, 2100, 10, ISLES_P0 + 0.1, ISLES_P0 + 0.26, 0.5)
      } else {
        add('palms', -470, 1500, 8.5, ISLES_P0 + 0.12, ISLES_P1, 0.46)
        add('volcano', 420, 1900, 16, ISLES_P0, ISLES_P0 + 0.16, 0.5)
        add('light', 880, 1500, 11, ISLES_P0 + 0.06, ISLES_P0 + 0.22, 0.44)
        add('fort', 60, 1250, 7.5, ISLES_P0 + 0.09, ISLES_P0 + 0.24, 0.38)
      }
      // The dhow: into frame from the far side, past the sun's road, slowing as the scene ends. Bow toward the middle of the page.
      {
        const c = cards.dhow
        if (c) {
          const enter = clamp01((pp - (ISLES_P0 + 0.02)) / (1 - ISLES_P0 - 0.02))
          const base = enter * (2 - enter)
          const y = 330
          const span = portrait ? [250, 30] : [470, 128]
          const x = cam.eye[0] + lerp(span[0], span[1], base) - now * 0 + Math.sin(now * 0.1) * 1.5
          const s = portrait ? 3.1 : 3.5
          const sw = swell(x, y, worldT)
          const roll = Math.atan(sw.sx) * 0.9 + Math.sin(worldT * 0.5) * 0.015
          const ww = c.meta.w * s
          const h = c.meta.h * s
          list.push({ tex: c.tex, x, y, z: c.meta.z0 * s + sw.h * 0.9, w: -ww, h, haze: 0.13, water: sw.h * 0.9 + 0.1, waterScale: 0.9, roll, sway: [0.004, 0.75], mirror: true, alpha: smooth(0.0, 0.02, enter) })
        }
      }
      // The raft. Its card sits where the last frame left it, then starts to ride the swell.
      {
        const info = raft.info
        const ride = smooth(HAND_P0, HAND_P1 + 0.05, pp)
        const rx = (info.card.x0 + info.card.x1) / 2
        const ry = info.card.y
        const sw = swell(rx, ry, worldT)
        const bob = sw.h * 0.85 * ride
        const roll = Math.atan(sw.sx) * 0.8 * ride
        const show = crossfade > 0.001
        if (show) {
          list.push({
            tex: raft.tex,
            x: rx,
            y: ry,
            z: info.card.z0 - seaZ + bob,
            w: info.card.x1 - info.card.x0,
            h: info.card.z1 - info.card.z0,
            haze: 0,
            water: 0,
            waterScale: 0,
            roll,
            mirror: true,
            alpha: 1,
            skirt: 0.02,
          })
        }
      }
      // Ripples: the pointer draws on the water, the dhow leaves a wake, the phone's signal rings out until it's silenced.
      const dropsOn = crossfade > 0.2
      if (dropsOn) {
        if (pointer?.moved) {
          pointer.moved = false
          const hit = sea.pick(pointer.x, pointer.y)
          if (hit) {
            const d = Math.hypot(hit[0] - eye[0], hit[1] - eye[1])
            const rad = Math.min(16, 3.4 + d * 0.012)
            if (lastPx >= -1e8) sea.drop(hit[0], hit[1], rad, (touch ? 0.9 : 0.65) * (lastPx < 0 ? 0.2 : 1))
            lastPx = hit[0]
            lastPy = hit[1]
          }
        }
        ringT += dt * timeScale
        if (!offline && ringT > 1.9) {
          ringT = 0
          const rc = raft.info.card
          sea.drop((rc.x0 + rc.x1) / 2, rc.y, 5.0, -0.42)
        }
        if (offline && since > 1.15 && since < 1.15 + dt * 1.2) {
          const rc = raft.info.card
          sea.drop((rc.x0 + rc.x1) / 2, rc.y, 8.0, 0.9)
        }
        const dh = list.find(l => l.tex === cards.dhow?.tex)
        if (dh && Math.round(now * 30) % 3 === 0) sea.drop(dh.x - 16, dh.y, 4.5, 0.16)
      }
      sea.stepRipple(dt)
      sea.render({
        eye,
        at,
        lens: cam.lens,
        frameAspect: fa,
        sx: sx * flipSign,
        sy,
        time: worldT,
        foam: Math.max(0, 0.34 * (1 - smooth(HAND_P1, HAND_P1 + 0.14, pp))),
        swell: 1,
        cards: list,
        birds: smooth(HAND_P1, HAND_P1 + 0.08, pp),
      }, W, H)
      // Live picture on the raft's phone, once the raft card is showing.
      if (game && crossfade > 0) {
        const rc = raft.info.corners
        drawLive(rc, 1, sx * flipSign, sy, 0.95 * crossfade, sea, raft.info, eye, at)
      }
    }

    // ------------------------------------------------------------------- the frames
    if (frameAlpha > 0.001) {
      const i0 = Math.floor(shown)
      const i1 = Math.min(n - 1, i0 + 1)
      const t = smooth(0.12, 0.88, shown - i0)
      let texA = uploadFrame(i0)
      let texB = i1 === i0 ? texA : uploadFrame(i1)
      if (!texA || !texB) {
        const k = store.nearest(shown)
        if (k >= 0) {
          texA = uploadFrame(k)
          texB = texA
        }
      }
      if (texA && texB) {
        gl.useProgram(frameProg.p)
        gl.bindVertexArray(vaoEmpty)
        gl.uniform2f(frameProg.u('u_scale'), sx, sy)
        gl.uniform1f(frameProg.u('u_flip'), flipSign)
        gl.uniform1f(frameProg.u('u_mix'), texA === texB ? 0 : t)
        gl.uniform1f(frameProg.u('u_alpha'), frameAlpha)
        gl.uniform2f(frameProg.u('u_px'), 1 / frameW, 1 / frameH)
        gl.uniform1f(frameProg.u('u_sharp'), 0.4)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, texA)
        gl.uniform1i(frameProg.u('u_a'), 0)
        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(gl.TEXTURE_2D, texB)
        gl.uniform1i(frameProg.u('u_b'), 1)
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        const posterK = 1 - smooth(0.05, 0.9, shown)
        if (posterTex && posterK > 0.001) {
          gl.bindTexture(gl.TEXTURE_2D, posterTex)
          gl.activeTexture(gl.TEXTURE0)
          gl.bindTexture(gl.TEXTURE_2D, posterTex)
          gl.uniform1f(frameProg.u('u_mix'), 0)
          gl.uniform1f(frameProg.u('u_alpha'), posterK)
          gl.uniform1f(frameProg.u('u_sharp'), 0)
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        }
        gl.disable(gl.BLEND)
        gl.activeTexture(gl.TEXTURE0)
        if (!needStill) {
          poster.classList.add('is-hidden')
          canvas.classList.add('is-on')
        }
        // The game stays alive on the phone until the water covers the screen.
        const liveK = (1 - smooth(10, 26, simF)) * 0.9
        if (game && liveK > 0.001) {
          const c = cam.a.corners.map((v, ii) => lerp(v, cam.b.corners[ii], cam.t))
          drawLiveFrame(c, sx * flipSign, sy, liveK)
        }
      }
    } else if (seaOn) {
      canvas.classList.add('is-on')
      poster.classList.add('is-hidden')
    }

    canvas.style.filter = mood > 0.003 ? `saturate(${(1 - mood * 0.55).toFixed(3)}) brightness(${(1 - mood * 0.1).toFixed(3)})` : ''
  }

  // The game on a phone that's a quad in the picture. Adds the difference between the live game and the still baked into what's beneath.
  function laydown(q: Float32Array, k: number) {
    const inv = homography(Array.from(q))
    gl.enable(gl.BLEND)
    gl.bindVertexArray(vaoEmpty)
    for (const [prog, eq] of [
      [liveProg, gl.FUNC_ADD],
      [liveNeg, gl.FUNC_REVERSE_SUBTRACT],
    ] as [Prog, number][]) {
      gl.useProgram(prog.p)
      gl.blendEquation(eq)
      gl.blendFunc(gl.ONE, gl.ONE)
      gl.uniform2fv(prog.u('u_q'), q)
      gl.uniformMatrix3fv(prog.u('u_inv'), false, inv)
      gl.uniform1f(prog.u('u_k'), k)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, game!.live.tex)
      gl.uniform1i(prog.u('u_live'), 0)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, game!.ref.tex)
      gl.uniform1i(prog.u('u_ref'), 1)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
    gl.blendEquation(gl.FUNC_ADD)
    gl.disable(gl.BLEND)
    gl.activeTexture(gl.TEXTURE0)
  }

  function drawLiveFrame(corners: number[], sx: number, sy: number, k: number) {
    // Frame coordinates (y down) to clip.
    const q = new Float32Array(8)
    for (let i = 0; i < 4; i++) {
      q[i * 2] = (corners[i * 2] * 2 - 1) * sx
      q[i * 2 + 1] = (1 - corners[i * 2 + 1] * 2) * sy
    }
    laydown(q, k)
  }

  function drawLive(corners: number[], _unused: number, sx: number, sy: number, k: number, s: Sea, info: RaftInfo, _eye: V3, _at: V3) {
    // The raft's screen, projected through the card's own plane so it stays stuck to the card as the camera drifts.
    const q = new Float32Array(8)
    const c = info.card
    const w = c.x1 - c.x0
    const h = c.z1 - c.z0
    for (let i = 0; i < 4; i++) {
      const u = (corners[i * 2] - info.crop[0]) / info.crop[2]
      const v = (corners[i * 2 + 1] - info.crop[1]) / info.crop[3]
      const [px, py] = s.project(c.x0 + u * w, c.y, c.z1 - (manifest?.sea ?? 0) - v * h, W, H)
      q[i * 2] = (px / W) * 2 - 1
      q[i * 2 + 1] = 1 - (py / H) * 2
    }
    void sx
    void sy
    laydown(q, k)
  }

  ctx.frame(draw)

  // If the browser takes the GPU away, fall back to the composed still rather than a dead canvas.
  canvas.addEventListener(
    'webglcontextlost',
    () => {
      alive = false
      stage.classList.add('is-lost')
      poster.style.backgroundImage = `url(${asset(`still-${set}.webp`)})`
      poster.classList.remove('is-hidden')
      canvas.classList.remove('is-on')
      copyWrap.classList.add('is-in')
      panel.classList.add('is-in')
      ctx.mark.set(1)
    },
    { signal },
  )

  return () => {
    alive = false
    near.disconnect()
    ro.disconnect()
    store?.dispose()
    sea?.dispose()
    game?.dispose()
    for (const e of pool.values()) gl.deleteTexture(e.tex)
    for (const c of Object.values(cards)) gl.deleteTexture(c.tex)
    if (raft) gl.deleteTexture(raft.tex)
    if (posterTex) gl.deleteTexture(posterTex)
    gl.deleteProgram(frameProg.p)
    gl.deleteProgram(liveProg.p)
    gl.deleteProgram(liveNeg.p)
    gl.deleteVertexArray(vaoEmpty)
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    copyWrap.remove()
    panel.remove()
    canvas.remove()
    poster.remove()
  }
}
