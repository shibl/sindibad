// Shadow Lantern: a pierced brass lantern hangs in front of a plaster wall and throws a whole world across it.
// The light is computed, not faked with layers sliding about: see shaders.ts. This file owns the DOM, the physics and the frame.
import './lantern.css'
import { buildAtlas, type M, type Piece } from './art'
import { Flame, Swing } from './physics'
import { allPieces, stageFrame, type Sink, type Stage } from './puppets'
import { LINK_FS, LINK_VS, MOTE_FS, MOTE_VS, PUPPET_FS, PUPPET_VS, QUAD_VS, SPRITE_FS, SPRITE_VS, WALL_FS } from './shaders'
import type { AboutCtx } from '../types'

type Meta = { w: number; h: number; range: number; frames: number; flame: [number, number]; ring: [number, number]; pxPerCm: number }

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x))

const CM = 8.5 // Wall pixels per centimetre of lantern at 1440x900.
const MASK_RANGE: [number, number] = [(110 * Math.PI) / 180, (82 * Math.PI) / 180]
const RING_TO_FLAME = 24.3 + 3.4 // Centimetres. The mask is baked from this point.
const CAM_DIST = 2400
const PIN = 0.55
const LAYER_Q = [0.05, 0.2, 0.42, 1.6] // How far each puppet plane is towards the lamp, as parallax: z / (Fz - z)

// A deep teal night with warm gold light. Warm plaster at dusk was tried and rejected: it loses the drama of the light.
const AMBIENT = [0.0024, 0.0605, 0.0705]
const LIGHT = [3.3, 1.42, 0.33]
const PINK = [6.0, 0.1, 0.7]
const ALBEDO = [0.86, 0.78, 0.66]
const LEAK = 0.01
const LUMA_CAP = 0.115 // A ceiling on the wall's luminance behind the text, as a backstop: even at this, the warmest headline colour is 5.2:1.
const FOG = 0.03

function compile(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const make = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`lantern shader: ${gl.getShaderInfoLog(s)}`)
    return s
  }
  const p = gl.createProgram()!
  const v = make(gl.VERTEX_SHADER, vs)
  const f = make(gl.FRAGMENT_SHADER, fs)
  gl.attachShader(p, v)
  gl.attachShader(p, f)
  gl.bindAttribLocation(p, 0, 'aPos')
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`lantern program: ${gl.getProgramInfoLog(p)}`)
  gl.deleteShader(v)
  gl.deleteShader(f)
  const u = new Proxy({} as Record<string, WebGLUniformLocation | null>, {
    get(cache, key: string) {
      if (!(key in cache)) cache[key] = gl.getUniformLocation(p, key)
      return cache[key]
    },
  })
  return { p, u }
}

const fetchBitmap = async (url: string, signal: AbortSignal, opts: ImageBitmapOptions) => {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return createImageBitmap(await res.blob(), { colorSpaceConversion: 'none', ...opts })
}

/** Resolves when the section comes within reach, so nobody downloads a lantern they never scroll to. */
const whenNear = (el: Element, signal: AbortSignal) =>
  new Promise<void>(resolve => {
    if (signal.aborted) return resolve()
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        resolve()
      },
      { rootMargin: '160% 0px' },
    )
    io.observe(el)
    signal.addEventListener('abort', () => {
      io.disconnect()
      resolve()
    })
  })

export default async function mount(ctx: AboutCtx): Promise<() => void> {
  const { stage, copy, section, signal, base, rtl, reduce, touch } = ctx
  const dir = `${base}about/lantern/`

  // ---------------------------------------------------------------- DOM
  const sticky = document.createElement('div')
  sticky.className = 'ln-sticky'
  sticky.setAttribute('aria-hidden', 'true')
  const poster = document.createElement('div')
  poster.className = 'ln-poster'
  const canvas = document.createElement('canvas')
  canvas.className = 'ln-canvas'
  sticky.append(poster, canvas)
  stage.append(sticky)
  copy.classList.add('ln-copy')
  stage.append(copy)

  // Exactly the stylesheet's test for the flowing layout: narrow, upright, or too short for the words to fit in a pinned panel.
  const flowQuery = matchMedia('(max-width: 760px), (max-aspect-ratio: 20/21), (max-height: 559px)')
  const narrow = () => flowQuery.matches
  let pinnedNow = false
  const syncPin = () => {
    const want = !narrow()
    if (want && !pinnedNow) ctx.pin(PIN)
    if (!want && pinnedNow) {
      stage.classList.remove('is-pinned')
      section.style.removeProperty('height')
    }
    pinnedNow = want
  }
  syncPin()

  /**
   * A still of the same scene, for anyone without WebGL2, or if the GPU goes away. In the flowing layout it only fills the room
   * above the words and fades into the wall, because the words would otherwise scroll across its bright parts.
   */
  let still = false
  const fallback = () => {
    still = true
    const flow = narrow()
    poster.style.backgroundImage = `url(${dir}${flow && W <= 600 ? 'still-phone' : 'still'}.webp)`
    if (rtl) poster.style.transform = 'scaleX(-1)'
    sticky.classList.toggle('is-still', flow)
    poster.classList.add('is-on')
    canvas.classList.remove('is-on')
  }

  // ---------------------------------------------------------------- layout numbers, shared by everything
  let W = 1
  let VH = 1 // what the canvas shows
  let wallH = 1 // the length of the wall
  let k = 1
  let margin = 200
  let ringX = 300
  let ringY = 100
  let pivotY = -900
  let lever = 1000
  let restZ = 430
  let phone = false
  let cmPx = CM
  const stageInfo: Stage = {
    w: 1, h: 1, k: 1, sea: 700, dhowX: 500, dhowY: 700, dhowK: 1, islandAX: 0, islandAY: 0, islandAK: 1, islandBX: 0, islandBY: 0, islandBK: 1, islandCX: 0, islandCY: 0, farX: 0, farY: 0, hoopSky: 300, hoopY: 500, hoopY2: 500, hoopK: 1, bottom: 900, phone: false,
  }
  const copyBox = { x0: 0, y0: 0, x1: 0, y1: 0 }
  const ctaBox = { x0: 0, y0: 0, x1: 0, y1: 0 }
  const headlineBox = { x: 0, y: 0 }
  const swing = new Swing(2.5, 0.17)
  const flame = new Flame()
  let onResizeGL: (() => void) | null = null

  const layout = () => {
    syncPin()
    W = stage.clientWidth
    phone = narrow()
    VH = phone ? sticky.clientHeight : stage.clientHeight
    k = phone ? clamp(W / 560, 0.56, 1.1) : clamp(Math.min(W / 1440, VH / 900), 0.62, 1.6)
    cmPx = phone ? clamp(Math.min(W, VH) / 62, 5.4, 9) : CM * k
    const lanternLen = 48 * cmPx
    if (phone) {
      ringX = W * (rtl ? 0.36 : 0.64)
      ringY = 52
      section.style.setProperty('--ln-lamp-room', `${Math.round(ringY + lanternLen * 1.4)}px`)
      section.style.setProperty('--ln-sea-room', '230px')
    } else {
      section.style.removeProperty('--ln-lamp-room')
      section.style.removeProperty('--ln-sea-room')
      ringX = W * (rtl ? 1 - 0.235 : 0.235)
      ringY = VH * 0.105
    }
    wallH = phone ? stage.clientHeight : VH
    const sea = phone ? ringY + lanternLen * 1.1 : VH * 0.705
    // Hang the lantern at the distance from the wall that lands the foot of its windows just under the dhow's keel, at any
    // screen shape, so the hero puppet always stands in the light.
    restZ = phone ? 30 * cmPx : Math.max(160 * k, sea + 52 * k - (ringY + RING_TO_FLAME * cmPx))
    lever = 1000 * k
    pivotY = ringY - lever
    // The same period at any size, since size is only the zoom on one real lantern.
    swing.w0 = Math.sqrt(9.8 / ((lever + 12 * cmPx) / (CM * k * 100)))

    Object.assign(stageInfo, {
      w: W,
      h: wallH,
      k,
      sea,
      phone,
      bottom: wallH,
      dhowX: phone ? W * 0.235 : W * 0.168,
      dhowY: sea + (phone ? 0 : -2 * k),
      dhowK: phone ? 0.5 : k * 0.88,
      islandAX: phone ? W * 0.92 : W * 0.37,
      islandAY: sea - (phone ? 2 : 4 * k),
      islandAK: phone ? 0.44 : k * 0.82,
      islandBX: phone ? W * 0.6 : W * 0.88,
      islandBY: sea - 2 * k,
      islandBK: phone ? 0.42 : k * 0.72,
      islandCX: phone ? -100 : W * 0.7,
      islandCY: sea + 1 * k,
      farX: phone ? W * 0.44 : W * 0.56,
      farY: sea + 1,
      hoopSky: phone ? ringY + lanternLen * 0.45 : VH * 0.33,
      hoopY: phone ? ringY + lanternLen * 0.86 : VH * 0.54,
      hoopY2: phone ? ringY + lanternLen * 1.0 : VH * 0.69,
      hoopK: phone ? 0.46 : k * 0.72,
    })
    margin = Math.round(W * 0.22 + 60)

    const rects = [ctx.headline, ctx.body, ctx.mark.el].map(e => e.getBoundingClientRect())
    const sr = stage.getBoundingClientRect()
    const cr = ctx.cta.getBoundingClientRect()
    headlineBox.x = rects[0].left - sr.left
    headlineBox.y = rects[0].top - sr.top
    copyBox.x0 = Math.min(...rects.map(r => r.left)) - sr.left - 12
    copyBox.x1 = Math.max(...rects.map(r => r.right)) - sr.left + 12
    copyBox.y0 = Math.min(...rects.map(r => r.top)) - sr.top - 10
    copyBox.y1 = Math.max(...rects.map(r => r.bottom)) - sr.top + 10
    ctaBox.x0 = cr.left - sr.left - 10
    ctaBox.x1 = cr.right - sr.left + 10
    ctaBox.y0 = cr.top - sr.top - 10
    ctaBox.y1 = cr.bottom - sr.top + 10
    if (!phone) stageInfo.hoopY2 = Math.min(sea - 8 * k, ctaBox.y1 + 34 * k)
    // How far it may swing, from the real gap to the words. The widest part that gets furthest is the waist of the body: 36cm
    // below the ring and 8.6cm in half width. 0.021 is what a hand pumping at resonance overshoots the stop by (measured).
    if (phone) swing.limit = 0.17
    else {
      const room = (rtl ? ringX - copyBox.x1 : copyBox.x0 - ringX) - 8.6 * cmPx - 19 * k
      swing.limit = clamp(room / (lever + 36 * cmPx) - 0.021, 0.06, 0.17)
    }
    onResizeGL?.()
    if (still) fallback()
  }
  layout()
  const ro = new ResizeObserver(() => layout())
  ro.observe(stage)
  signal.addEventListener('abort', () => ro.disconnect())
  void document.fonts?.ready.then(() => {
    if (!signal.aborted) layout()
  })

  // ---------------------------------------------------------------- GL
  let gl: WebGL2RenderingContext | null = null
  try {
    gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' })
  } catch {
    gl = null
  }
  let freeGL: (() => void) | null = null
  const dispose = () => {
    ro.disconnect()
    freeGL?.()
    freeGL = null
    sticky.remove()
    delete (window as unknown as { __lantern?: unknown }).__lantern
  }
  if (!gl) {
    fallback()
    return dispose
  }

  // Assets wait until the section is near. The wall colour, the text and the layout are already right.
  await whenNear(section, signal)
  if (signal.aborted) return dispose

  // Until everything is built, losing the context is enough to free whatever got made.
  freeGL = () => gl?.getExtension('WEBGL_lose_context')?.loseContext()
  try {
    await start(gl)
  } catch (err) {
    if (signal.aborted) return dispose
    console.warn('[lantern] falling back to the still', err)
    fallback()
  }
  return dispose

  async function start(gl: WebGL2RenderingContext) {
    const wall = compile(gl, QUAD_VS, WALL_FS)
    const puppet = compile(gl, PUPPET_VS, PUPPET_FS)
    const sprite = compile(gl, SPRITE_VS, SPRITE_FS)
    const link = compile(gl, LINK_VS, LINK_FS)
    const mote = compile(gl, MOTE_VS, MOTE_FS)

    const quadVbo = gl.createBuffer()
    const quadVao = gl.createVertexArray()
    gl.bindVertexArray(quadVao)
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVbo)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

    const attr = (name: string, size: number, off: number, prog: WebGLProgram, stride: number) => {
      const loc = gl.getAttribLocation(prog, name)
      if (loc < 0) return
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride * 4, off * 4)
      gl.vertexAttribDivisor(loc, 1)
    }

    // Puppet instances
    const MAX_INST = 900
    const INST_STRIDE = 16
    const instData = new Float32Array(MAX_INST * INST_STRIDE)
    const instVbo = gl.createBuffer()
    const puppetVao = gl.createVertexArray()
    gl.bindVertexArray(puppetVao)
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVbo)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.bindBuffer(gl.ARRAY_BUFFER, instVbo)
    gl.bufferData(gl.ARRAY_BUFFER, instData.byteLength, gl.DYNAMIC_DRAW)
    attr('iM', 4, 0, puppet.p, INST_STRIDE)
    attr('iT', 2, 4, puppet.p, INST_STRIDE)
    attr('iRect', 4, 6, puppet.p, INST_STRIDE)
    attr('iUv', 4, 10, puppet.p, INST_STRIDE)
    attr('iCh', 2, 14, puppet.p, INST_STRIDE)

    // Chain links
    const MAX_LINKS = 90
    const LINK_STRIDE = 6
    const linkData = new Float32Array(MAX_LINKS * LINK_STRIDE)
    const linkVbo = gl.createBuffer()
    const linkVao = gl.createVertexArray()
    gl.bindVertexArray(linkVao)
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVbo)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.bindBuffer(gl.ARRAY_BUFFER, linkVbo)
    gl.bufferData(gl.ARRAY_BUFFER, linkData.byteLength, gl.DYNAMIC_DRAW)
    attr('iA', 4, 0, link.p, LINK_STRIDE)
    attr('iB', 2, 4, link.p, LINK_STRIDE)
    // Dust has no attributes: it is all worked out from gl_VertexID.
    const emptyVao = gl.createVertexArray()
    gl.bindVertexArray(null)

    // ---- assets
    const opaque: ImageBitmapOptions = { premultiplyAlpha: 'none' }
    const [meta, maskImg, plasterImg] = await Promise.all([
      fetch(`${dir}lantern.json`, { signal }).then(r => r.json() as Promise<Meta>),
      fetchBitmap(`${dir}mask.webp`, signal, opaque),
      fetchBitmap(`${dir}plaster.webp`, signal, opaque),
    ])
    const frameImgs = await Promise.all(Array.from({ length: meta.frames }, (_, i) => fetchBitmap(`${dir}f${i}.webp`, signal, { premultiplyAlpha: 'premultiply' })))
    const linkImgs = await Promise.all([0, 1].map(i => fetchBitmap(`${dir}link${i}.webp`, signal, { premultiplyAlpha: 'premultiply' })))
    if (signal.aborted) throw new DOMException('aborted', 'AbortError')

    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE)
    const tex2d = (img: TexImageSource, wrap: number) => {
      const t = gl.createTexture()!
      gl.bindTexture(gl.TEXTURE_2D, t)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, img)
      gl.generateMipmap(gl.TEXTURE_2D)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap)
      return t
    }
    const texMask = tex2d(maskImg, gl.CLAMP_TO_EDGE)
    const maskTexel: [number, number] = [1 / maskImg.width, 1 / maskImg.height]
    const texPlaster = tex2d(plasterImg, gl.REPEAT)
    maskImg.close()
    plasterImg.close()

    const arrayTex = (imgs: ImageBitmap[]) => {
      const t = gl.createTexture()!
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, t)
      const w = imgs[0].width
      const h = imgs[0].height
      gl.texStorage3D(gl.TEXTURE_2D_ARRAY, Math.floor(Math.log2(Math.max(w, h))) + 1, gl.RGBA8, w, h, imgs.length)
      imgs.forEach((img, i) => {
        gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, w, h, 1, gl.RGBA, gl.UNSIGNED_BYTE, img)
        img.close()
      })
      gl.generateMipmap(gl.TEXTURE_2D_ARRAY)
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      return { t, w, h }
    }
    const frames = arrayTex(frameImgs)
    const links = arrayTex(linkImgs)

    // The puppets, drawn once at this screen's size.
    const atlas = await buildAtlas(allPieces(), touch ? 2048 : 4096, touch ? 0.72 : 1.12)
    if (signal.aborted) throw new DOMException('aborted', 'AbortError')
    const texAtlas = tex2d(atlas.canvas, gl.CLAMP_TO_EDGE)
    atlas.canvas.width = atlas.canvas.height = 1

    const texShadow = gl.createTexture()!
    const fbo = gl.createFramebuffer()!
    let shadowW = 0
    let shadowH = 0

    freeGL = () => {
      for (const t of [texMask, texPlaster, texAtlas, texShadow, frames.t, links.t]) gl.deleteTexture(t)
      gl.deleteFramebuffer(fbo)
      for (const b of [quadVbo, instVbo, linkVbo]) gl.deleteBuffer(b)
      for (const v of [quadVao, puppetVao, linkVao, emptyVao]) gl.deleteVertexArray(v)
      for (const pr of [wall.p, puppet.p, sprite.p, link.p, mote.p]) gl.deleteProgram(pr)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }

    // ---- sizes
    let dprCap = Math.min(devicePixelRatio || 1, touch ? 1.75 : 2)
    let dpr = 1
    const resizeGL = () => {
      const budget = touch ? 1.56e6 : 8.84e6
      dpr = Math.max(1, Math.min(dprCap, Math.sqrt(budget / Math.max(1, W * VH))))
      const cw = Math.round(W * dpr)
      const ch = Math.round(VH * dpr)
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw
        canvas.height = ch
      }
      const map = Math.min(touch ? 1.3 : 1.35, dpr)
      const max = Math.min(4096, gl.getParameter(gl.MAX_TEXTURE_SIZE) as number)
      const sw = Math.min(max, Math.round((W + 2 * margin) * map))
      const sh = Math.min(max, Math.round((wallH + 2 * margin) * map))
      if (sw !== shadowW || sh !== shadowH) {
        shadowW = sw
        shadowH = sh
        gl.bindTexture(gl.TEXTURE_2D, texShadow)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, sw, sh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.generateMipmap(gl.TEXTURE_2D)
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texShadow, 0)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      }
      if (reduce && !signal.aborted) render(0, 0.3)
    }

    // ---- input
    let hasCursor = false
    let mx = 0
    let my = 0
    let lastX = 0
    let lastY = 0
    let kickX = 0
    let kickZ = 0
    let draggingId = -1
    let moved = 0

    const onMove = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect()
      const x = e.clientX - r.left
      const y = e.clientY - r.top
      const inside = y >= 0 && y <= r.height && x >= 0 && x <= r.width
      if (e.pointerType === 'mouse') {
        if (!inside) {
          hasCursor = false
          return
        }
        if (hasCursor) {
          kickX += ((x - lastX) / W) * 0.34
          kickZ += ((y - lastY) / VH) * 0.14
          moved = Math.min(1, moved + Math.hypot(x - lastX, y - lastY) / 280)
        }
        hasCursor = true
        lastX = x
        lastY = y
        mx = x
        my = y
      } else if (e.pointerId === draggingId) {
        // On touch a sideways drag swings it. touch-action: pan-y hands vertical drags to the page.
        kickX += ((x - lastX) / W) * 1.25
        kickZ += ((y - lastY) / VH) * 0.12
        moved = Math.min(1, moved + Math.hypot(x - lastX, y - lastY) / 200)
        lastX = x
        lastY = y
        mx = x
        my = y
      }
    }
    const opts = { signal, passive: true } as AddEventListenerOptions
    addEventListener('pointermove', onMove, opts)
    stage.addEventListener(
      'pointerdown',
      e => {
        if (e.pointerType === 'mouse') return
        draggingId = e.pointerId
        const r = stage.getBoundingClientRect()
        lastX = e.clientX - r.left
        lastY = e.clientY - r.top
        mx = lastX
        my = lastY
      },
      opts,
    )
    const endDrag = (e: PointerEvent) => {
      if (e.pointerId === draggingId) draggingId = -1
    }
    addEventListener('pointerup', endDrag, opts)
    addEventListener('pointercancel', endDrag, opts)
    document.documentElement.addEventListener('mouseleave', () => (hasCursor = false), opts)

    let lastScroll = scrollY
    addEventListener(
      'scroll',
      () => {
        const d = scrollY - lastScroll
        lastScroll = scrollY
        // Scrolling lifts the wall past the lantern, so it nods towards you and away, and a little of that goes sideways.
        const nudge = clamp(d / Math.max(VH, 1), -0.25, 0.25)
        kickZ += nudge * 0.36
        kickX += nudge * 0.22 * (swing.vx >= 0 ? 1 : -1)
        moved = Math.min(1, moved + Math.abs(nudge))
      },
      opts,
    )
    canvas.addEventListener(
      'webglcontextlost',
      e => {
        if (signal.aborted) return
        e.preventDefault()
        dead = true
        fallback()
      },
      { signal },
    )

    // ---- the frame
    let dead = false
    let time = 0
    let instCount = 0
    const sink: Sink = (q: Piece, layer: number, m: M, density = 1) => {
      if (instCount >= MAX_INST) return
      const o = instCount++ * INST_STRIDE
      instData.set(m, o)
      instData[o + 6] = q.x
      instData[o + 7] = q.y
      instData[o + 8] = q.w
      instData[o + 9] = q.h
      const uv = q.uv!
      instData[o + 10] = uv[0]
      instData[o + 11] = uv[1]
      instData[o + 12] = uv[2]
      instData[o + 13] = uv[3]
      instData[o + 14] = layer
      instData[o + 15] = density
    }
    const toLamp = new Float32Array(9)
    const uL = new Float32Array(16)
    const moteCount = touch ? 36 : 90

    // The flame catches the first time the wall comes into view, then burns steadily.
    let lit = reduce ? 1 : 0
    let litT = 0
    let windowT = 0
    let windowN = 0
    let slowWindows = 0
    let fogOn = !touch
    let litX = 1e6
    let litY = 1e6
    // Quality settings the controller below can lower. The shadow map's rebuild is the biggest fixed cost, and the puppets move
    // slowly enough that every second frame holds up, because the light that moves them across the wall is still per frame.
    let mapEvery = 1
    let frameNo = 0
    let headlineStep = 4 // Pixels the flame must move before the headline's light is repainted.

    function render(dt: number, p: number) {
      if (dead) return
      // Judged over a window, because a machine at 50fps mixes frames that look fine one by one. Two slow windows in a row lower
      // the next setting, cheapest to lose first, so a passing stall costs nothing.
      if (dt > 0) {
        windowT += dt
        windowN++
        if (windowT >= 1.5) {
          slowWindows = windowN / windowT < 54 ? slowWindows + 1 : 0
          windowT = 0
          windowN = 0
          if (slowWindows >= 2) {
            slowWindows = 0
            if (fogOn) fogOn = false
            else if (mapEvery === 1) mapEvery = 2
            else if (dprCap > 1.25) {
              dprCap = Math.max(1.25, dprCap * 0.85)
              resizeGL()
            }
          }
        }
      }
      if (lit < 1 && dt > 0 && stage.getBoundingClientRect().top < innerHeight * 0.55) {
        litT += dt
        lit = Math.min(1, litT / 1.7)
      }
      // A stutter, a dip as the wick takes, then the swell
      const catching = lit >= 1 ? 1 : (lit * lit * (3 - 2 * lit)) * (1 + (1 - lit) * 0.5 * Math.sin(litT * 31) * Math.sin(litT * 13))

      // Physics
      if (!reduce) {
        let aimX: number | null = null
        let aimZ: number | null = null
        if (hasCursor || draggingId !== -1) {
          aimX = swing.limit * 0.8 * Math.tanh((mx - ringX) / (W * 0.34))
          aimZ = 0.045 * Math.tanh((my - VH * 0.5) / (VH * 0.5))
        }
        swing.step(dt, { aimX, aimZ, kickX, kickZ, breeze: 1 })
        kickX = 0
        kickZ = 0
        moved = Math.max(0, moved - dt * 1.2)
        flame.step(dt, moved + Math.abs(swing.vx) * 0.6)
        time += dt
      }
      const t = time

      // The lantern in the room
      const sa = Math.sin(swing.ax)
      const ca = Math.cos(swing.ax)
      const sc = Math.sin(swing.az)
      const cc = Math.cos(swing.az)
      const ring = { x: ringX + sa * lever, y: pivotY + ca * cc * lever, z: restZ + sc * ca * lever }
      const bodyA = swing.ax + swing.tx
      const bodyC = swing.az + swing.tz
      const sb = Math.sin(bodyA)
      const cb = Math.cos(bodyA)
      const sd = Math.sin(bodyC)
      const cd = Math.cos(bodyC)
      const toFlame = RING_TO_FLAME * cmPx
      const fx = ring.x + sb * toFlame + flame.jx * 0.9 * k
      const fy = ring.y + cb * cd * toFlame + flame.jy * 0.9 * k
      const fz = ring.z + sd * cb * toFlame

      // World direction -> the lantern's own frame. World: x right, y down, z toward the viewer.
      // Lantern: x right, y up, -z facing the wall. R = Ry(-twist) Rx(+tilt z) Rz(-tilt x) S
      {
        const cw = Math.cos(-swing.tw)
        const sw = Math.sin(-swing.tw)
        const mult = (x: number[], y: number[]) => {
          const o = [0, 0, 0, 0, 0, 0, 0, 0, 0]
          for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let l = 0; l < 3; l++) o[i * 3 + j] += x[i * 3 + l] * y[l * 3 + j]
          return o
        }
        const R3 = mult([cw, 0, sw, 0, 1, 0, -sw, 0, cw], mult([1, 0, 0, 0, cd, -sd, 0, sd, cd], mult([cb, sb, 0, -sb, cb, 0, 0, 0, 1], [1, 0, 0, 0, -1, 0, 0, 0, 1])))
        toLamp.set([R3[0], R3[3], R3[6], R3[1], R3[4], R3[7], R3[2], R3[5], R3[8]])
      }

      // Puppet planes, as a ratio of the flame's rest distance. Each one maps wall pixels to its place in the puppet map.
      const flameR = 5 * k * flame.size
      const rest = { x: ringX, y: pivotY + lever + toFlame, z: restZ }
      const texelsPerPx = shadowW / (W + 2 * margin)
      for (let i = 0; i < 4; i++) {
        const q = LAYER_Q[i]
        const z = (rest.z * q) / (1 + q)
        const kappa = 1 + q
        const zr = z / fz
        const scale = (1 - zr) * kappa
        uL[i * 4] = scale
        uL[i * 4 + 1] = rest.x * (1 - kappa) + fx * zr * kappa
        uL[i * 4 + 2] = rest.y * (1 - kappa) + fy * zr * kappa
        // Penumbra: the flame's width seen past the occluder, so the further from the wall, the softer.
        const pen = 2 * flameR * Math.pow(z / Math.max(1, fz - z), 1.4)
        uL[i * 4 + 3] = Math.max(0, Math.log2(Math.max(1e-3, pen * texelsPerPx * scale)) + 0.4)
      }

      // ---- puppets to the map
      frameNo++
      if (dt === 0 || frameNo % mapEvery === 0) {
        instCount = 0
        stageFrame(sink, stageInfo, t + 19.0, p, margin)
        gl.bindBuffer(gl.ARRAY_BUFFER, instVbo)
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, instData.subarray(0, instCount * INST_STRIDE))
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
        gl.viewport(0, 0, shadowW, shadowH)
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.useProgram(puppet.p)
        gl.uniform2f(puppet.u.uOrg, -margin, -margin)
        gl.uniform2f(puppet.u.uExt, W + 2 * margin, wallH + 2 * margin)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, texAtlas)
        gl.uniform1i(puppet.u.uAtlas, 0)
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR)
        gl.bindVertexArray(puppetVao)
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, instCount)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.bindTexture(gl.TEXTURE_2D, texShadow)
        gl.generateMipmap(gl.TEXTURE_2D)
      }

      // ---- the wall
      const camY = phone ? clamp(-stage.getBoundingClientRect().top, 0, Math.max(0, wallH - VH)) : 0
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.disable(gl.BLEND)
      gl.useProgram(wall.p)
      gl.bindVertexArray(quadVao)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, texMask)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, texShadow)
      gl.activeTexture(gl.TEXTURE2)
      gl.bindTexture(gl.TEXTURE_2D, texPlaster)
      const w = wall.u
      const power = flame.power * catching
      gl.uniform1i(w.uMask, 0)
      gl.uniform1i(w.uShadow, 1)
      gl.uniform1i(w.uPlaster, 2)
      gl.uniform2f(w.uStage, W, VH)
      gl.uniform1f(w.uCamY, camY)
      gl.uniform3f(w.uFlame, fx, fy, fz)
      gl.uniformMatrix3fv(w.uToLamp, false, toLamp)
      gl.uniform2f(w.uMaskRange, MASK_RANGE[0], MASK_RANGE[1])
      gl.uniform2f(w.uMaskTexel, maskTexel[0], maskTexel[1])
      gl.uniform1f(w.uMaskLod, 2.3 + Math.log2(Math.max(0.5, flame.size)))
      gl.uniform1f(w.uPower, power)
      gl.uniform1f(w.uR0, phone ? 48 * cmPx : restZ * 1.57)
      gl.uniform4fv(w['uLayer[0]'], uL)
      gl.uniform2f(w.uOrg, -margin, -margin)
      gl.uniform2f(w.uExt, W + 2 * margin, wallH + 2 * margin)
      gl.uniform1f(w.uFlip, rtl ? 1 : 0)
      gl.uniform4f(w.uCopyBox, copyBox.x0, copyBox.y0, copyBox.x1, copyBox.y1)
      gl.uniform4f(w.uCtaBox, ctaBox.x0, ctaBox.y0, ctaBox.x1, ctaBox.y1)
      gl.uniform1f(w.uCalmWob, 34 * k)
      // The calm reaches a long way up and out to the page edge, and only a little into the sea or towards the lantern.
      if (phone) {
        gl.uniform4f(w.uCopyFeather, 40, 56, 40, 90)
        gl.uniform4f(w.uCtaFeather, 40, 40, 40, 90)
      } else {
        const toLantern = 150
        const toEdge = 500
        const below = 60 * k
        gl.uniform4f(w.uCopyFeather, rtl ? toEdge : toLantern, 300, rtl ? toLantern : toEdge, below)
        gl.uniform4f(w.uCtaFeather, rtl ? 110 * k : toLantern, 60 * k, rtl ? toLantern : 110 * k, 34 * k)
      }
      gl.uniform1f(w.uLumaCap, LUMA_CAP)
      gl.uniform1f(w.uSeaY, phone ? wallH : 1e6)
      gl.uniform1f(w.uExposure, 1)
      gl.uniform3fv(w.uAmbient, AMBIENT)
      gl.uniform3fv(w.uLightCol, LIGHT)
      gl.uniform3fv(w.uPinkCol, PINK)
      gl.uniform3fv(w.uAlbedo, ALBEDO)
      gl.uniform1f(w.uLeak, LEAK)
      gl.uniform1f(w.uFogGain, fogOn ? FOG : 0)
      gl.uniform1f(w.uHalo, 150 * (phone ? cmPx / CM : k))
      gl.uniform1f(w.uTime, reduce ? 0 : t)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      // ---- dust in the beams: it only shows where the piercing lets light through
      if (!reduce) {
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.ONE, gl.ONE)
        gl.useProgram(mote.p)
        gl.bindVertexArray(emptyVao)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, texMask)
        const u = mote.u
        gl.uniform1i(u.uMask, 0)
        gl.uniform2f(u.uStage, W, VH)
        gl.uniform1f(u.uCamY, camY)
        gl.uniform3f(u.uFlame, fx, fy, fz)
        gl.uniformMatrix3fv(u.uToLamp, false, toLamp)
        gl.uniform2f(u.uMaskRange, MASK_RANGE[0], MASK_RANGE[1])
        gl.uniform1f(u.uFlip, rtl ? 1 : 0)
        gl.uniform1f(u.uTime, t)
        gl.uniform1f(u.uPower, power)
        gl.uniform1f(u.uDpr, dpr)
        gl.uniform1f(u.uR0, (phone ? 48 * cmPx : restZ * 1.57) * 0.8)
        gl.uniform4f(u.uBox, ringX - 460 * k, ringY - 40, 920 * k, Math.min(wallH, 760 * k))
        gl.uniform4f(u.uCopyBox, copyBox.x0, copyBox.y0, copyBox.x1, copyBox.y1)
        gl.uniform1f(u.uK, k)
        gl.drawArrays(gl.POINTS, 0, moteCount)
      }

      // ---- the chain
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      const zoom = 1 + (ring.z - restZ) / CAM_DIST
      const spacing = 2.62 * cmPx * zoom
      let nLinks = 0
      {
        const dx = ring.x - ringX
        const dy = ring.y - pivotY
        const len = Math.hypot(dx, dy, ring.z - restZ)
        const bend = swing.bx * lever * 0.5
        const nx = dy / len
        const ny = -dx / len
        // The first link threads the ring, which sits a little above the point the ring is measured from.
        let s = 1.05 * cmPx * zoom
        while (nLinks < MAX_LINKS) {
          const f = 1 - s / len
          if (f < 0) break
          const by = bend * Math.sin(Math.PI * f)
          const x = ringX + dx * f + nx * by
          const y = pivotY + dy * f + ny * by
          if (y < camY - 30) break
          // Tangent, including the bow
          const by2 = bend * Math.sin(Math.PI * (f + 0.01))
          const ang = Math.atan2(-(dx * 0.01 + nx * (by2 - by)), dy * 0.01 + ny * (by2 - by))
          const o = nLinks * LINK_STRIDE
          linkData[o] = x
          linkData[o + 1] = y
          linkData[o + 2] = ang
          linkData[o + 3] = (nLinks + 1) % 2
          linkData[o + 4] = 1
          // Lit from below by the lantern, going into the dusk further up
          linkData[o + 5] = clamp(1.05 - (s / (lever * 0.34)) * 0.78, 0.26, 1.05) * (0.96 + 0.32 * (power - 1))
          nLinks++
          s += spacing
        }
      }
      gl.useProgram(link.p)
      gl.bindVertexArray(linkVao)
      gl.bindBuffer(gl.ARRAY_BUFFER, linkVbo)
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, linkData.subarray(0, nLinks * LINK_STRIDE))
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, links.t)
      gl.uniform1i(link.u.uLinks, 0)
      gl.uniform2f(link.u.uStage, W, VH)
      gl.uniform1f(link.u.uCamY, camY)
      const linkScale = cmPx * 4.4 * zoom
      gl.uniform2f(link.u.uSize, linkScale * (links.w / links.h), linkScale)
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, nLinks)

      // ---- the lantern
      gl.useProgram(sprite.p)
      gl.bindVertexArray(quadVao)
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, frames.t)
      gl.uniform1i(sprite.u.uFrames, 0)
      gl.uniform2f(sprite.u.uStage, W, VH)
      gl.uniform1f(sprite.u.uCamY, camY)
      gl.uniform2f(sprite.u.uCentre, ring.x, ring.y)
      const spriteH = (meta.h * cmPx * zoom) / meta.pxPerCm
      const spriteW = (meta.w * cmPx * zoom) / meta.pxPerCm
      gl.uniform2f(sprite.u.uSize, spriteW, spriteH * (0.985 + 0.015 * Math.cos(bodyC * 3)))
      gl.uniform2f(sprite.u.uPivot, meta.ring[0] / meta.w, meta.ring[1] / meta.h)
      gl.uniform1f(sprite.u.uAngle, -bodyA)
      const fi = clamp(((swing.tw * 180) / Math.PI / meta.range + 1) * 0.5, 0, 1) * (meta.frames - 1)
      const f0 = Math.floor(fi)
      gl.uniform3f(sprite.u.uFrame, f0, Math.min(meta.frames - 1, f0 + 1), fi - f0)
      gl.uniform1f(sprite.u.uFlicker, flame.power)
      gl.uniform1f(sprite.u.uLit, 0.18 + 0.82 * catching)
      gl.uniform1f(sprite.u.uMode, 0)
      gl.uniform1f(sprite.u.uGrow, 1)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      // Its bloom
      gl.blendFunc(gl.ONE, gl.ONE)
      gl.uniform1f(sprite.u.uMode, 1)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      gl.disable(gl.BLEND)

      // The words are on the wall too, so the side nearest the lamp reads a shade warmer. Both ends of this stay well past AA.
      const hx = fx - headlineBox.x
      const hy = fy - camY - headlineBox.y
      if (Math.abs(hx - litX) + Math.abs(hy - litY) > headlineStep) {
        litX = hx
        litY = hy
        ctx.headline.style.setProperty('--ln-lx', `${hx.toFixed(0)}px`)
        ctx.headline.style.setProperty('--ln-ly', `${hy.toFixed(0)}px`)
      }
    }

    // ---- a hook for measuring, in development only
    if (import.meta.env.DEV) {
      ;(window as unknown as { __lantern?: unknown }).__lantern = {
        swing: () => swing,
        set: (o: Partial<Swing>) => Object.assign(swing, o),
        // For profiling: lets a test force each quality setting by hand.
        tune: (o: { fog?: boolean; mapEvery?: number; headlineStep?: number; dprCap?: number }) => {
          if (o.fog !== undefined) fogOn = o.fog
          if (o.mapEvery) mapEvery = o.mapEvery
          if (o.headlineStep) headlineStep = o.headlineStep
          if (o.dprCap) {
            dprCap = o.dprCap
            resizeGL()
          }
        },
        quality: () => ({ fogOn, mapEvery, dprCap, canvasScale: canvas.width / canvas.clientWidth }),
        time: (x: number) => {
          time = x
        },
        // Reads back the real pixels under each line of text across the extreme poses, and reports the brightest luminance found
        // under each block. The caller turns that into WCAG contrast for whichever text colour it wants to test.
        audit: (limits: { ax: number; az: number; tw: number }) => {
          const lin = (c: number) => {
            const v = c / 255
            return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
          }
          const saved = { ...swing }
          const savedTime = time
          const savedFlame = { power: flame.power, size: flame.size }
          const els = { headline: ctx.headline, body: ctx.body }
          const maxY: Record<string, number> = { headline: 0, body: 0 }
          const at: Record<string, string> = {}
          const top = sticky.getBoundingClientRect().top
          const left = stage.getBoundingClientRect().left
          const buf = new Uint8Array(canvas.width * canvas.height * 4)
          const span = (m: number) => [-m, -m * 0.6, 0, m * 0.6, m]
          let poses = 0
          for (const ax of span(limits.ax))
            for (const az of [-limits.az, 0, limits.az])
              for (const tw of [-limits.tw, limits.tw])
                for (const tt of [0, 5, 9, 13, 16, 19, 22]) {
                  Object.assign(swing, { ax, az, tw, tx: 0, tz: 0, vx: 0, vz: 0 })
                  time = tt
                  flame.power = 1.12
                  flame.size = 0.8
                  lit = 1
                  render(0, 0.5)
                  gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, buf)
                  poses++
                  for (const [name, el] of Object.entries(els)) {
                    const range = document.createRange()
                    range.selectNodeContents(el)
                    for (const rc of range.getClientRects()) {
                      const x0 = Math.max(0, Math.floor((rc.left - left) * dpr))
                      const x1 = Math.min(canvas.width, Math.ceil((rc.right - left) * dpr))
                      const y0 = Math.max(0, Math.floor((rc.top - top) * dpr))
                      const y1 = Math.min(canvas.height, Math.ceil((rc.bottom - top) * dpr))
                      for (let y = y0; y < y1; y += 2)
                        for (let x = x0; x < x1; x += 2) {
                          const o = (canvas.height - 1 - y) * canvas.width * 4 + x * 4
                          const Y = 0.2126 * lin(buf[o]) + 0.7152 * lin(buf[o + 1]) + 0.0722 * lin(buf[o + 2])
                          if (Y > maxY[name]) {
                            maxY[name] = Y
                            at[name] = `ax ${ax.toFixed(2)} az ${az.toFixed(2)} tw ${tw.toFixed(2)} t ${tt}`
                          }
                        }
                    }
                  }
                }
          Object.assign(swing, saved)
          time = savedTime
          Object.assign(flame, savedFlame)
          return { poses, maxY, at }
        },
      }
    }

    onResizeGL = resizeGL
    // Composed and still for reduced motion: the lantern a little off plumb, the flame steady.
    if (reduce) {
      flame.power = 1
      flame.size = 1
      Object.assign(swing, { ax: 0.012, az: 0, tw: 0.03, vx: 0, vz: 0 })
      time = 4.5 // A moment when the hoopoe is clear of the dhow.
    }
    resizeGL()
    render(0, reduce ? 0.3 : 0)
    canvas.classList.add('is-on')
    if (!reduce) ctx.frame((p, dt) => render(dt, p))
    else {
      // Nothing moves, but on a phone the long wall still has to follow the scroll.
      let lastTop = NaN
      ctx.frame(() => {
        const top = stage.getBoundingClientRect().top
        if (phone && top !== lastTop) render(0, 0.3)
        lastTop = top
      })
    }
  }
}
