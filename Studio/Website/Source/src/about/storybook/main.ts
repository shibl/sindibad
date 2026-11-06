// The storybook: a cloth-bound book opens as you scroll and a paper world stands up out of its pages.
// See src/about/README.md for the contract and concepts/blender/about/storybook for where the art comes from.
import { BOOK_WORDS, chapterById, CHAPTERS, linear, type Chapter } from '../chapters'
import type { AboutCtx, AboutMount, BookApi, BookTrip } from '../types'
import { parsePieces } from './assets'
import { addBook, addChapters, addPiece, addStrip, ARCH, archD, BOOK, FIRST_PIECE, INDEX, MeshBuilder } from './book'
import { clamp01, lerp, lookAt, mul, norm, perspective, RAD, smooth, smoother, xf, type M4, type V3 } from './math'
import { BACKS, drawLeaves } from './leaves'
import { drawPlate, drawTabs } from './plates'
import { MAX_PARTS, Rig } from './rig'
import { createScene, type Frame } from './scene'
import './storybook.css'

const WORDS = {
  en: { pull: 'Pull', tab: 'Pull-tab: rocks the boat and makes the hoopoe fly', art: 'A cloth-bound storybook lying open. A paper sea, islands, a dhow, Yasmina and her hoopoe stand up out of its pages.' },
  ar: { pull: 'اسحب', tab: 'لسان السحب: يهزّ المركب ويجعل الهدهد يطير', art: 'كتاب حكايات مجلّد بالقماش مفتوح، يقوم من صفحاته بحر من الورق وجزر ومركب شراعي وياسمينة وهدهدها.' },
}

// sx slides the lens sideways without turning it, as a view camera does: verticals on the words' page stay nearly upright.
type Pose = { at: V3; az: number; el: number; dist: number; fov: number; sx: number }

const lerpPose = (a: Pose, b: Pose, t: number): Pose => ({
  at: [lerp(a.at[0], b.at[0], t), lerp(a.at[1], b.at[1], t), lerp(a.at[2], b.at[2], t)],
  az: lerp(a.az, b.az, t),
  el: lerp(a.el, b.el, t),
  dist: lerp(a.dist, b.dist, t),
  fov: lerp(a.fov, b.fov, t),
  sx: lerp(a.sx, b.sx, t),
})

function viewOf(p: Pose, aspect: number) {
  const ce = Math.cos(p.el), se = Math.sin(p.el), ca = Math.cos(p.az), sa = Math.sin(p.az)
  const eye: V3 = [p.at[0] + p.sx + p.dist * ce * sa, p.at[1] + p.dist * se, p.at[2] + p.dist * ce * ca]
  // The camera's own up, which still has a direction when it's looking straight down into a chapter.
  const view = lookAt(eye, [p.at[0] + p.sx, p.at[1], p.at[2]], [-se * sa, ce, -se * ca])
  const proj = perspective(p.fov, aspect, 0.2, 30)
  proj[8] = (-proj[0] * p.sx) / p.dist
  return { eye, vp: mul(proj, view), view }
}

/** Finds the distance and aim that fit these points in a rectangle of the screen (0 to 1, y down). */
function fit(points: V3[], base: Pose, aspect: number, rect: [number, number, number, number]) {
  const pose: Pose = { ...base, at: [...base.at] as V3 }
  const rw = rect[2] - rect[0], rh = rect[3] - rect[1]
  for (let it = 0; it < 40; it++) {
    const { vp, view } = viewOf(pose, aspect)
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9
    for (const q of points) {
      const c = xf(vp, q[0], q[1], q[2])
      const x = (c[0] / c[3]) * 0.5 + 0.5, y = 0.5 - (c[1] / c[3]) * 0.5
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
    const k = Math.max((x1 - x0) / rw, (y1 - y0) / rh)
    pose.dist *= Math.pow(k, 0.7)
    const dx = (x0 + x1) / 2 - (rect[0] + rect[2]) / 2
    const dy = (y0 + y1) / 2 - (rect[1] + rect[3]) / 2
    const h = 2 * pose.dist * Math.tan(pose.fov / 2)
    const right: V3 = [view[0], view[4], view[8]], up: V3 = [view[1], view[5], view[9]]
    const mx = dx * h * aspect * 0.8, my = -dy * h * 0.8
    for (let i = 0; i < 3; i++) pose.at[i] += right[i] * mx + up[i] * my
  }
  return pose
}

// A reload restores the scroll position before the section has grown to its pinned height, and Chrome then carries the reader
// far past the book. So the position is kept here and put back once, unless the visitor has already started scrolling.
const PLACE = 'sindibad-storybook-place'
let placeUsed = false
function keepPlaceOnReload(section: HTMLElement, signal: AbortSignal) {
  addEventListener('pagehide', () => {
    try {
      sessionStorage.setItem(PLACE, String(scrollY))
    } catch {}
  }, { signal })
  if (placeUsed) return
  placeUsed = true
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
  if (!nav || (nav.type !== 'reload' && nav.type !== 'back_forward')) return
  let saved = NaN
  try {
    saved = Number(sessionStorage.getItem(PLACE) ?? NaN)
    sessionStorage.removeItem(PLACE)
  } catch {}
  if (!Number.isFinite(saved)) return
  let touched = false
  for (const ev of ['wheel', 'touchstart', 'keydown', 'pointerdown']) addEventListener(ev, () => (touched = true), { signal, passive: true, once: true })
  const put = () => {
    if (touched || signal.aborted) return
    const r = section.getBoundingClientRect()
    const top = r.top + scrollY
    if (saved >= top - innerHeight && saved <= top + r.height) window.scrollTo({ top: saved, behavior: 'instant' as ScrollBehavior })
  }
  put()
  requestAnimationFrame(put)
  if (document.readyState !== 'complete') addEventListener('load', () => setTimeout(put, 60), { signal, once: true })
  setTimeout(put, 500)
}

const mount: AboutMount = async (ctx: AboutCtx) => {
  const { stage, section, copy, signal } = ctx
  // Mounted out of sight behind a chapter, the book doesn't have the words until the reader comes back to it.
  let wordsHere = !ctx.chapters?.parked
  const words = WORDS[ctx.lang]
  const dir = ctx.rtl ? -1 : 1
  const url = (f: string) => `${ctx.base}about/storybook/${f}`

  const root = document.createElement('div')
  root.className = 'sb'
  if (ctx.rtl) root.classList.add('is-rtl')
  stage.append(root)
  const canvas = document.createElement('canvas')
  canvas.className = 'sb-canvas'
  canvas.setAttribute('role', 'img')
  canvas.setAttribute('aria-label', words.art)
  root.append(canvas)
  const ink = document.createElement('div')
  ink.className = 'sb-ink'
  if (wordsHere) ink.append(copy)
  root.append(ink)

  // The still: what shows when WebGL isn't there, and for a moment if the art is slow to arrive.
  let still: HTMLElement | null = null
  let stillRo: ResizeObserver | null = null
  signal.addEventListener('abort', () => stillRo?.disconnect())
  const showStill = () => {
    if (still) return
    const wide = innerWidth / innerHeight >= 1.02
    const box = document.createElement('div')
    box.className = `sb-still ${wide ? 'is-wide' : 'is-tall'}`
    const img = document.createElement('img')
    img.src = url(`still-${wide ? 'wide' : 'tall'}-${ctx.rtl ? 'ar' : 'en'}.webp`)
    img.alt = words.art
    img.decoding = 'async'
    box.append(img)
    if (wordsHere) box.append(copy)
    root.append(box)
    still = box
    // The words are sized to the blank page in the picture, as they are to the live one.
    const size = () => {
      let lo = 0.3, hi = 1.8
      for (let i = 0; i < 12; i++) {
        const m = (lo + hi) / 2
        box.style.setProperty('--k', String(m))
        if (copy.scrollHeight > copy.clientHeight || copy.scrollWidth > copy.clientWidth + 1) hi = m
        else lo = m
      }
      box.style.setProperty('--k', String(lo))
    }
    size()
    stillRo = new ResizeObserver(size)
    stillRo.observe(box)
    document.fonts?.ready.then(() => still === box && size())
    ink.remove()
    canvas.style.display = 'none'
    root.classList.add('is-still')
  }

  // The canvas has alpha for one reason: the arch in a chapter's page really is a hole, and the chapter is behind it.
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: true, depth: true, stencil: false, powerPreference: 'high-performance' })
  if (!gl) {
    showStill()
    flatChapters()
    ctx.chapters?.register(flatBook())
    return () => root.remove()
  }
  const quit = () => {
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    root.remove()
  }
  if (!ctx.reduce) {
    ctx.pin(3)
    keepPlaceOnReload(section, signal)
  }
  const slow = wordsHere ? window.setTimeout(showStill, 900) : 0

  // No WebGL means no flight. The tabs are plain buttons under the picture and the chapter simply replaces it.
  function flatChapters() {
    const nav = document.createElement('nav')
    nav.className = 'sb-chapters is-flat'
    nav.setAttribute('aria-label', BOOK_WORDS[ctx.lang].nav)
    for (const chapter of CHAPTERS) {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'sb-ch'
      b.dataset.chapter = chapter.id
      b.style.setProperty('--ch', chapter.color)
      b.textContent = chapter[ctx.lang].short
      b.addEventListener('click', () => ctx.chapters?.go(chapter.id), { signal })
      nav.append(b)
    }
    root.append(nav)
  }
  function flatBook(): BookApi {
    const adopt = () => {
      wordsHere = true
      ;(still ?? ink).append(copy)
      copy.insertBefore(ctx.mark.el, ctx.headline)
    }
    return {
      lend() {
        wordsHere = false
      },
      depart(_id, trip) {
        trip.opening()
        return trip.ready.then(() => {})
      },
      back(_id, _stage, release) {
        release(1)
        adopt()
        return Promise.resolve()
      },
      hop(_a, _s, _b, swap) {
        const trip = swap()
        trip.opening()
        return trip.ready.then(() => {})
      },
      park() {
        wordsHere = false
      },
    }
  }

  const fetchBin = async (f: string) => (await fetch(url(f), { signal })).arrayBuffer()
  // Colour values go to the GPU exactly as they are in the file. Older browsers that refuse these options get the plain decode.
  const decode = async (f: string, extra?: ImageBitmapOptions) => {
    const blob = await (await fetch(url(f), { signal })).blob()
    try {
      return await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none', ...extra })
    } catch {
      return createImageBitmap(blob)
    }
  }
  const fetchImg = (f: string) => decode(f)
  const lang = ctx.rtl ? 'ar' : 'en'
  // On a phone the atlas comes in at half size: plenty for its screen, and far kinder to its memory.
  const fetchAtlas = () => decode('atlas.webp', ctx.touch ? { resizeWidth: 1536, resizeHeight: 1536, resizeQuality: 'high' } : undefined)
  const loaded = await Promise.all([
    fetchBin('pieces.bin'),
    fetchAtlas(),
    fetchImg('pages.webp'),
    fetchImg(`foil-${lang}.webp`),
    fetchImg(`blind-${lang}.webp`),
    fetchImg('fibre.webp'),
    fetchImg('weave.webp'),
  ]).catch(err => {
    // A failed download leaves the still in place: never an empty section.
    if (!signal.aborted) console.warn('[storybook] art failed to load', err)
    return null
  })
  if (!loaded) {
    clearTimeout(slow)
    if (!signal.aborted) {
      showStill()
      return () => root.remove()
    }
    quit()
    return () => {}
  }
  const [bin, atlas, pages, cover, blind, fibre, weave] = loaded
  if (signal.aborted) {
    clearTimeout(slow)
    quit()
    return () => {}
  }
  const { pieces, swatches } = parsePieces(bin)

  // Geometry: the book, then every piece of the world with its own part index.
  const partIds = new Map<string, number>()
  let nextPart = FIRST_PIECE
  const partOf = (id: string) => {
    let p = partIds.get(id)
    if (p === undefined) {
      p = nextPart++
      partIds.set(id, p)
    }
    return p
  }
  const rig = new Rig(ctx.rtl, partOf)
  rig.tints = CHAPTERS.map(c => linear(c.color))
  const mb = new MeshBuilder()
  addBook(mb, dir)
  addChapters(mb, dir)
  for (const s of rig.specs) {
    const part = partOf(s.id)
    if (s.mesh === 'strip') addStrip(mb, 0.0042, swatches.wire ?? [0, 0], part)
    else {
      const mesh = pieces[s.mesh]
      addPiece(mb, mesh, part, s.flip)
    }
  }
  if (nextPart > MAX_PARTS) throw new Error('storybook: too many parts')

  const touch = ctx.touch
  const scene = createScene(gl, mb.build(), touch ? { shadow: 1024, taps: 8, occW: 256, occH: 170 } : { shadow: 2048, taps: 16, occW: 512, occH: 340 }, dir)
  scene.setTexture('atlas', atlas, true, 8)
  scene.setTexture('pages', pages, true, 16)
  scene.setTexture('cover', cover, false, 16)
  scene.setTexture('blind', blind, false, 16)
  scene.setTexture('fibre', fibre, false, 4)
  scene.setTexture('weave', weave, false, 4)
  for (const b of [atlas, pages, cover, blind, fibre, weave]) b.close()
  // The index tabs' emblems, then the printed sheets, which are drawn when the book turns to a chapter.
  const tabsSheet = document.createElement('canvas')
  tabsSheet.width = 1100
  tabsSheet.height = 360
  drawTabs(tabsSheet)
  scene.setTexture('tabs', tabsSheet, false, 8)
  const plateSheet = document.createElement('canvas'), foilSheet = document.createElement('canvas')
  plateSheet.width = foilSheet.width = touch ? 1400 : 2048
  plateSheet.height = foilSheet.height = Math.round((plateSheet.width / 2) * BOOK.H)
  const leavesSheet = document.createElement('canvas')
  leavesSheet.width = touch ? 1400 : 2048
  leavesSheet.height = Math.round((leavesSheet.width / 2) * BOOK.H) * 2
  let printed = ''
  const printChapter = (chapter: Chapter) => {
    const key = `${chapter.id}/${tall}`
    if (key === printed) return
    printed = key
    drawPlate(plateSheet, foilSheet, chapter, ctx.lang, dir, tall)
    scene.setTexture('plate', plateSheet, true, 8)
    scene.setTexture('plateFoil', foilSheet, false, 8)
    drawLeaves(leavesSheet, chapter.id)
    scene.setTexture('leaves', leavesSheet, true, 8)
    frame.accent = linear(chapter.color)
    frame.backs = BACKS[chapter.id].map(linear) as Frame['backs']
  }

  // ----------------------------------------------------------------------------------------------------- the camera's stations
  let W = 1, H = 1
  let closed: Pose, swing: Pose, open: Pose, gate: Pose, through: Pose
  let tall = false
  // Where the words lie. Wide screens print them on the page across the gutter; phones on a leaf that folds out toward the reader.
  const textBox = { xa: 0.115, xb: 0.905, za: -0.555, zb: 0.555, w: 400, h: 500 }
  const leafBox = { xa: 0.09, xb: 0.84, d0: 0.075, d1: BOOK.H - 0.075 }
  // Render a little over the screen's own pixels on a 1x display, as paper edges are thin, and step down if the frame rate asks for it.
  let scale = touch ? Math.min(devicePixelRatio || 1, 1.6) : Math.min(2, Math.max(devicePixelRatio || 1, 1.5))
  const resize = () => {
    canvas.width = Math.round(W * scale)
    canvas.height = Math.round(H * scale)
  }
  let slowTime = 0, frames = 0
  const watchRate = (dt: number) => {
    if (dt <= 0) return
    frames++
    slowTime = slowTime * 0.97 + dt * 0.03
    if (frames > 60 && slowTime > 1 / 42 && scale > 1) {
      scale = Math.max(1, scale - 0.25)
      resize()
      frames = 0
      slowTime = 1 / 60
    }
  }
  const layout = () => {
    const r = root.getBoundingClientRect()
    W = Math.max(1, r.width)
    H = Math.max(1, r.height)
    resize()
    const aspect = W / H
    const { W: pw, H: ph, T, over } = BOOK
    tall = aspect < 1.02
    rig.tall = tall
    root.classList.toggle('is-tall', tall)
    const closedPts: V3[] = []
    const openPts: V3[] = []
    for (const sx of [0, pw + over]) for (const sz of [-ph / 2 - over, ph / 2 + over]) for (const y of [0, T]) closedPts.push([sx * dir, y, sz])
    for (const sx of [-pw - over, pw + over]) for (const sz of [-ph / 2 - over, ph / 2 + over]) openPts.push([sx, 0, sz])
    closed = fit(closedPts, { at: [0.5 * dir, 0.1, 0], az: 26 * RAD * dir, el: 38 * RAD, dist: 6, fov: 18 * RAD, sx: 0 }, aspect, tall ? [0.1, 0.24, 0.9, 0.76] : [0.22, 0.14, 0.78, 0.9])
    // While the cover stands on end the camera holds all of it: the whole book, standing half and lying half.
    const up = BOOK.W + BOOK.over + BOOK.Y0 + 0.12
    const swingPts: V3[] = [
      [(pw + over) * dir, 0, -ph / 2 - over], [(pw + over) * dir, 0, ph / 2 + over],
      [-0.12 * dir, 0, ph / 2 + over], [-0.12 * dir, up, ph / 2 + over], [-0.12 * dir, up, -ph / 2 - over], [-0.12 * dir, 0, -ph / 2 - over],
    ]
    swing = fit(swingPts, { at: [0.3 * dir, 0.4, 0], az: 21 * RAD * dir, el: 34 * RAD, dist: 7, fov: 18 * RAD, sx: 0 }, aspect, tall ? [0.06, 0.18, 0.94, 0.8] : [0.2, 0.04, 0.8, 0.95])
    if (tall) {
      // The world's page above, the leaf below: the leaf runs edge to edge and the page sits behind it.
      const tallPts: V3[] = []
      for (const x of [0, pw]) {
        tallPts.push([x * dir, BOOK.Y0, -ph / 2])
        tallPts.push([x * dir, 0, ph / 2 + ph])
      }
      open = fit(tallPts, { at: [0.5 * dir, 0.05, 0.7], az: 0, el: 57 * RAD, dist: 6, fov: 24 * RAD, sx: 0 }, aspect, [0.015, 0.2, 0.985, 0.985])
    } else {
      open = fit(openPts, { at: [0, 0.1, 0], az: 0, el: 50 * RAD, dist: 6, fov: 15 * RAD, sx: -0.4 * dir }, aspect, [0.08, 0.31, 0.92, 0.95])
    }
    // Before going through the doors a phone first settles on their page. A wide screen already has it in view.
    gate = open
    if (tall) {
      const pagePts: V3[] = []
      for (const x of [0, pw]) for (const z of [-ph / 2, ph / 2]) pagePts.push([x * dir, BOOK.Y0, z])
      gate = fit(pagePts, { at: [0.5 * dir, 0.1, 0], az: 0, el: 62 * RAD, dist: 6, fov: 20 * RAD, sx: 0 }, aspect, [0.09, 0.15, 0.85, 0.88])
    }
    // Through the doors: straight down and close enough that the screen's corners are all inside the innermost arch.
    const fov = 34 * RAD
    const inset = ARCH.inset * ARCH.layers + 0.012
    const zc = tall ? 0.06 : 0.05
    let lo = 0.02, hi = 0.7
    for (let i = 0; i < 24; i++) {
      const h = (lo + hi) / 2, w = h * aspect
      const fits = [-1, 1].every(a => [-1, 1].every(b => archD(ARCH.cx + a * w, zc + b * h, inset) < 0))
      if (fits) lo = h
      else hi = h
    }
    through = { at: [ARCH.cx * dir, BOOK.Y0, zc], az: 0, el: Math.PI / 2, dist: Math.max(0.3, lo / Math.tan(fov / 2) - ARCH.depth * ARCH.layers), fov, sx: 0 }
    // Size the words to the page, at the final pose.
    placeText()
  }
  const placeText = () => {
    const { vp } = viewOf(open, W / H)
    const P = (x: number, y: number, z: number) => {
      const c = xf(vp, x, y, z)
      return [((c[0] / c[3]) * 0.5 + 0.5) * W, (0.5 - (c[1] / c[3]) * 0.5) * H]
    }
    // The text box as it lies at the end of the scroll: on the page opposite the world, or on the fold-out leaf.
    let tl: number[], tr: number[], bl: number[], br: number[]
    if (tall) {
      const yn = BOOK.Y0 + 0.012, zh = BOOK.H / 2
      const a = Math.PI * 0.975
      const dy = Math.sin(a), dz = -Math.cos(a)
      const at = (d: number): [number, number] => [yn + d * dy, zh + d * dz]
      const [y0, z0] = at(leafBox.d0), [y1, z1] = at(leafBox.d1)
      const L = (leafBox.xa) * dir, R = (leafBox.xb) * dir
      const xl = Math.min(L, R), xr = Math.max(L, R)
      tl = P(xl, y0, z0); tr = P(xr, y0, z0); bl = P(xl, y1, z1); br = P(xr, y1, z1)
    } else {
      const xL = dir > 0 ? -textBox.xb : textBox.xa
      const xR = dir > 0 ? -textBox.xa : textBox.xb
      tl = P(xL, BOOK.Y0, textBox.za); tr = P(xR, BOOK.Y0, textBox.za); bl = P(xL, BOOK.Y0, textBox.zb); br = P(xR, BOOK.Y0, textBox.zb)
    }
    textBox.w = Math.round((tr[0] - tl[0] + br[0] - bl[0]) / 2)
    textBox.h = Math.round((bl[1] - tl[1] + br[1] - tr[1]) / 2)
    ink.style.width = `${textBox.w}px`
    ink.style.height = `${textBox.h}px`
    if (!wordsHere) return
    const k = Math.min(textBox.w / 440, textBox.h / 560)
    let lo = 0.5, hi = 1.6
    for (let i = 0; i < 12; i++) {
      const m = (lo + hi) / 2
      ink.style.setProperty('--k', String(k * m))
      if (copy.scrollHeight > textBox.h || copy.scrollWidth > textBox.w + 1) hi = m
      else lo = m
    }
    ink.style.setProperty('--k', String(k * lo))
  }

  const ro = new ResizeObserver(() => {
    layout()
    dirty = true
  })
  ro.observe(root)
  layout()
  if (document.fonts?.ready) document.fonts.ready.then(() => !signal.aborted && placeText())

  const parts = rig.parts
  let enter = 0
  const frame: Frame = {
    vp: new Float32Array(16),
    cam: [0, 0, 0],
    res: [1, 1],
    light: [-0.42 * dir, 0.62, 0.66],
    sun: [0, 0, 0, 0],
    key: [1, 1, 1],
    sky: [0.4, 0.42, 0.44],
    gnd: [0.3, 0.27, 0.24],
    shadowTint: [0.55, 0.63, 0.67],
    pool: [1, 1, 1],
    poolA: 0,
    accent: [0.05, 0.3, 0.3],
    backs: [[0.8, 0.75, 0.65], [0.8, 0.75, 0.65], [0.8, 0.75, 0.65]],
    backArt: 0,
    rim: 1,
  }
  let lastCss = ''

  // ---------------------------------------------------------------------------------------------------------------- the tab
  const tabEl = document.createElement('div')
  tabEl.className = 'sb-tab'
  tabEl.setAttribute('role', 'slider')
  tabEl.setAttribute('aria-label', words.tab)
  tabEl.setAttribute('aria-valuemin', '0')
  tabEl.setAttribute('aria-valuemax', '100')
  tabEl.setAttribute('aria-valuenow', '0')
  tabEl.tabIndex = -1
  const tabWord = document.createElement('span')
  tabWord.className = 'sb-tab-word'
  tabWord.textContent = words.pull
  tabEl.append(tabWord)
  root.append(tabEl)
  let tabReady = false, tabPx = 300, dragging = false, hinted = false, nudge = 0, startX = 0, startU = 0, keyTimer = 0
  const setTab = (u: number) => {
    rig.tabTarget = clamp01(u)
    tabEl.setAttribute('aria-valuenow', String(Math.round(rig.tabTarget * 100)))
  }
  tabEl.addEventListener('pointerdown', e => {
    if (!tabReady) return
    dragging = true
    hinted = true
    nudge = 0
    startX = e.clientX
    startU = rig.tabTarget
    tabEl.setPointerCapture(e.pointerId)
    tabEl.classList.add('is-held')
  }, { signal })
  tabEl.addEventListener('pointermove', e => {
    if (!dragging) return
    setTab(startU + (dir * (e.clientX - startX)) / (tabPx * rig.tabTravel))
  }, { signal })
  const letGo = () => {
    if (!dragging) return
    dragging = false
    tabEl.classList.remove('is-held')
    setTab(0)
  }
  tabEl.addEventListener('pointerup', letGo, { signal })
  tabEl.addEventListener('pointercancel', letGo, { signal })
  tabEl.addEventListener('lostpointercapture', letGo, { signal })
  tabEl.addEventListener('keydown', e => {
    const out = dir > 0 ? 'ArrowRight' : 'ArrowLeft', back = dir > 0 ? 'ArrowLeft' : 'ArrowRight'
    if (e.key === out || e.key === 'ArrowUp') setTab(rig.tabTarget + 0.25)
    else if (e.key === back || e.key === 'ArrowDown') setTab(rig.tabTarget - 0.25)
    else if (e.key === 'End') setTab(1)
    else if (e.key === 'Home') setTab(0)
    else return
    e.preventDefault()
    hinted = true
    nudge = 0
    clearTimeout(keyTimer)
    // A tab springs back when you let go of it, so the keys do the same.
    keyTimer = window.setTimeout(() => setTab(0), 700)
  }, { signal })
  ink.style.opacity = '0'

  // ------------------------------------------------------------------------------------------- the chapters' index tabs
  const bookWords = BOOK_WORDS[ctx.lang]
  const chapterNav = document.createElement('nav')
  chapterNav.className = 'sb-chapters'
  chapterNav.setAttribute('aria-label', bookWords.nav)
  let hovered = -1
  const chapterButtons = CHAPTERS.map((chapter, i) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'sb-ch'
    b.dataset.chapter = chapter.id
    b.tabIndex = -1
    b.setAttribute('aria-label', chapter[ctx.lang].title)
    const label = document.createElement('span')
    label.className = 'sb-ch-label'
    label.textContent = chapter[ctx.lang].short
    b.append(label)
    const on = () => {
      hovered = i
      dirty = true
      ctx.chapters?.preload(chapter.id)
    }
    const off = () => {
      if (hovered === i) hovered = -1
      dirty = true
    }
    b.addEventListener('pointerenter', on, { signal })
    b.addEventListener('pointerleave', off, { signal })
    b.addEventListener('focus', on, { signal })
    b.addEventListener('blur', off, { signal })
    b.addEventListener('click', () => ctx.chapters?.go(chapter.id), { signal })
    chapterNav.append(b)
    return b
  })
  root.append(chapterNav)
  let chaptersOn = false, chaptersSince = 0

  // -------------------------------------------------------------------------------------------------------- the flight
  // Into a chapter: the world folds flat, its page turns, two more riffle after it, the doors open onto the chapter running behind
  // the book, and the camera goes through them. Coming back is the same journey the other way.
  type Flight = {
    kind: 'out' | 'back' | 'hop'
    t: number
    /** How far through this flight's current stretch. */
    since: number
    phase: 'fold' | 'doors' | 'through' | 'pull' | 'shut' | 'leaves' | 'rise' | 'hopBack' | 'hopForward'
    stage: HTMLElement | null
    trip: BookTrip | null
    ready: boolean
    resolve: () => void
    release?: (p: number) => void
    swap?: () => BookTrip
    started: boolean[]
    landed?: boolean
    to?: Chapter
  }
  let flight: Flight | null = null
  let inside = false
  let heldP = 1
  let lastP = 1
  let throughE = 0
  let risen = 0
  // How far the camera has gone from where the reader left it, lean and all, to its view of the doors.
  let gateE = 0
  let ghost: HTMLElement | null = null
  const LEAF_OUT = [0.34, 0.66, 0.82]
  const LEAF_BACK = [0.56, 0.28, 0]
  const easeInOut = (t: number) => t * t * t * (t * (6 * t - 15) + 10)
  const setFlying = (on: boolean) => {
    stage.classList.toggle('is-flying', on)
    root.classList.toggle('is-flying', on)
  }
  const dropGhost = () => {
    ghost?.remove()
    ghost = null
  }
  const moveChapter = (el: HTMLElement | null, e: number, vp: ArrayLike<number>) => {
    if (!el) return
    if (e >= 1) {
      el.style.removeProperty('transform')
      el.style.removeProperty('transform-origin')
      el.style.removeProperty('will-change')
      return
    }
    // Far away behind the arch it's a little bigger and moves less than the page does, so it reads as being deep inside the book.
    const z = easeInOut(e)
    const s = 1 + 0.24 * (1 - z)
    const c = xf(vp, ARCH.cx * dir, BOOK.Y0, 0.05)
    const cx = ((c[0] / c[3]) * 0.5 + 0.5) * W, cy = (0.5 - (c[1] / c[3]) * 0.5) * H
    const roomX = ((s - 1) * W) / 2, roomY = ((s - 1) * H) / 2
    const tx = Math.max(-roomX, Math.min(roomX, (cx - W / 2) * 0.5 * (1 - z)))
    const ty = Math.max(-roomY, Math.min(roomY, (cy - H / 2) * 0.5 * (1 - z)))
    el.style.willChange = 'transform'
    el.style.transformOrigin = `50% ${H / 2}px`
    el.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${s.toFixed(4)})`
  }
  const openDoors = (f: Flight) => {
    f.phase = 'doors'
    f.since = 0
    rig.doorsTarget = 1
    f.trip?.opening()
  }
  const adoptWords = () => {
    wordsHere = true
    const home = still ?? ink
    home.append(copy)
    copy.insertBefore(ctx.mark.el, ctx.headline)
    placeText()
  }
  const fly = (f: Flight, dt: number) => {
    f.t += dt
    f.since += dt
    switch (f.phase) {
      case 'fold': {
        // Out from the open book: the world goes down while the pages go over.
        rig.worldP = lerp(heldP, 0.08, smooth(0, 0.72, f.t))
        LEAF_OUT.forEach((at, i) => {
          if (!f.started[i] && f.t >= at) {
            f.started[i] = true
            rig.turn(i, 1)
          }
        })
        if (rig.turnsSettled(1)) {
          dropGhost()
          f.since = f.landed ? f.since : 0
          f.landed = true
          // The title gets a moment on its own before anything else moves.
          if (f.ready && f.since > 0.24) openDoors(f)
        }
        break
      }
      case 'doors':
        if (f.since > 0.2) {
          f.phase = 'through'
          f.since = 0
        }
        break
      case 'through': {
        throughE = clamp01(f.since / 1.25)
        if (throughE >= 1) {
          flight = null
          inside = true
          moveChapter(f.stage, 1, frame.vp)
          f.resolve()
        }
        break
      }
      case 'pull': {
        // Coming out: the chapter shrinks back into the arch and the doors swing shut behind it.
        throughE = 1 - clamp01(f.since / 1.1)
        if (f.since > 0.56) rig.doorsTarget = 0
        if (f.since >= 1.1 && rig.doors < 0.05) {
          rig.doors = 0
          rig.doorsV = 0
          moveChapter(f.stage, 1, frame.vp)
          f.stage = null
          if (f.kind === 'hop') {
            f.trip = f.swap!()
            f.stage = f.trip.stage
            f.trip.ready.then(() => (f.ready = true))
            f.phase = 'hopBack'
          } else {
            f.release!(heldP)
            adoptWords()
            f.phase = 'leaves'
          }
          f.since = 0
          f.started = [false, false, false]
        }
        break
      }
      case 'hopBack': {
        // Back through the two loose pages to find the next chapter's.
        if (!f.started[2]) {
          f.started[2] = true
          rig.turn(2, -1)
        }
        if (!f.started[1] && f.since > 0.12) {
          f.started[1] = true
          rig.turn(1, -1)
        }
        if (rig.turns[1].phi < 0.002 && rig.turns[2].phi < 0.002) {
          printChapter(f.to!)
          f.phase = 'hopForward'
          f.since = 0
          f.started = [false, false, false]
        }
        break
      }
      case 'hopForward': {
        if (!f.started[1]) {
          f.started[1] = true
          rig.turn(1, 1)
        }
        if (!f.started[2] && f.since > 0.14) {
          f.started[2] = true
          rig.turn(2, 1)
        }
        if (rig.turnsSettled(1)) {
          f.since = f.landed ? f.since : 0
          f.landed = true
          if (f.ready && f.since > 0.24) openDoors(f)
        }
        break
      }
      case 'leaves': {
        LEAF_BACK.forEach((at, i) => {
          if (!f.started[i] && f.since >= at) {
            f.started[i] = true
            rig.turn(i, -1)
          }
        })
        // The world's page brings the world back up as it comes down.
        if (rig.turns[0].phi < 1.25) risen = Math.min(1, risen + dt / 1.05)
        rig.worldP = lerp(0.08, heldP, smooth(0, 1, risen))
        if (risen >= 1 && gateE <= 0 && rig.turnsSettled(-1)) {
          flight = null
          rig.chapterShown = false
          rig.worldP = 1
          setFlying(false)
          f.resolve()
        }
        break
      }
    }
  }

  const api: BookApi = {
    lend() {
      wordsHere = false
      if (ctx.reduce) return
      ghost = copy.cloneNode(true) as HTMLElement
      // Its own class, as the chapter's styles will be after the real text's class as soon as the chapter takes the section.
      ghost.className = 'sb-ghost'
      ghost.setAttribute('aria-hidden', 'true')
      ghost.querySelectorAll('a, button').forEach(a => a.setAttribute('tabindex', '-1'))
      ink.append(ghost)
    },
    depart(id, trip) {
      const chapter = chapterById(id)!
      return new Promise<void>(resolve => {
        if (ctx.reduce) {
          trip.opening()
          trip.ready.then(() => resolve())
          return
        }
        printChapter(chapter)
        heldP = Math.max(lastP, 0.72)
        rig.chapterShown = true
        risen = 0
        throughE = 0
        gateE = 0
        setFlying(true)
        const f: Flight = { kind: 'out', t: 0, since: 0, phase: 'fold', stage: trip.stage, trip, ready: false, resolve, started: [false, false, false] }
        trip.ready.then(() => (f.ready = true))
        flight = f
      })
    },
    back(id, chapterStage, release) {
      const chapter = chapterById(id)!
      return new Promise<void>(resolve => {
        if (ctx.reduce) {
          release(1)
          adoptWords()
          resolve()
          return
        }
        printChapter(chapter)
        inside = false
        setFlying(true)
        risen = 0
        throughE = 1
        flight = { kind: 'back', t: 0, since: 0, phase: 'pull', stage: chapterStage, trip: null, ready: true, resolve, release, started: [false, false, false] }
      })
    },
    hop(from, chapterStage, to, swap) {
      const a = chapterById(from)!
      const b = chapterById(to)!
      return new Promise<void>(resolve => {
        if (ctx.reduce) {
          swap().ready.then(() => resolve())
          return
        }
        printChapter(a)
        inside = false
        setFlying(true)
        throughE = 1
        flight = { kind: 'hop', t: 0, since: 0, phase: 'pull', stage: chapterStage, trip: null, ready: false, resolve, swap, started: [false, false, false], to: b }
      })
    },
    park(id) {
      inside = true
      wordsHere = false
      heldP = 1
      rig.chapterShown = true
      rig.worldP = 0.08
      rig.doors = rig.doorsTarget = 1
      for (const l of rig.turns) l.phi = Math.PI
      throughE = 1
      gateE = 1
      root.classList.add('is-ready')
      void id
    },
  }
  ctx.chapters?.register(api)

  // The camera leans a little with the mouse: the paper really is standing there, and the foil catches it.
  let lookX = 0, lookY = 0, wantX = 0, wantY = 0
  // The page comes to rest as the pointer nears the button, so the button is standing still by the time the pointer reaches it,
  // and moves off again gently once the pointer goes.
  let nearButton = false, follow = 1
  if (!touch && !ctx.reduce) {
    const HOLD = 56
    window.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return
      wantX = (e.clientX / innerWidth) * 2 - 1
      wantY = (e.clientY / innerHeight) * 2 - 1
      const b = ctx.cta.getBoundingClientRect()
      nearButton = e.clientX > b.left - HOLD && e.clientX < b.right + HOLD && e.clientY > b.top - HOLD && e.clientY < b.bottom + HOLD
    }, { signal, passive: true })
  }
  const chapterTall: number[] = []
  let dirty = true
  const tick = (p: number, dt: number) => {
    // Reduced motion: the finished scene, drawn only when something has changed.
    if (ctx.reduce) {
      if (!dirty) return
      dirty = false
      p = 1
      dt = 0
    } else {
      watchRate(dt)
    }
    // During a flight the scroll doesn't drive the book: it's held where the reader left it.
    if (flight || inside) p = heldP
    else lastP = p
    if (flight) fly(flight, dt)
    const r = section.getBoundingClientRect()
    enter = ctx.reduce || flight ? 0 : clamp01(r.top / H)
    rig.update(p, dt)

    // The camera
    // Three stations, blended so the move never has a corner in it.
    let pose = lerpPose(lerpPose(closed, swing, smoother(0.02, 0.16, p)), open, smoother(0.12, 0.38, p))
    if (ctx.reduce) pose = open
    follow += ((nearButton ? 0 : 1) - follow) * (1 - Math.exp(-dt * 9))
    const ease = (1 - Math.exp(-dt * 3.2)) * follow
    lookX += (wantX - lookX) * ease
    lookY += (wantY - lookY) * ease
    pose.az += lookX * 2.1 * RAD
    pose.el -= lookY * 1.3 * RAD
    pose.az += enter * 8 * RAD * dir
    pose.el -= enter * 6 * RAD
    pose.dist *= 1 + enter * 0.08
    // A slow push in once the world has stood up, and a thump when the cover lands.
    pose.dist *= 1 - 0.018 * smooth(0.4, 1, p)
    pose.at = [pose.at[0], pose.at[1] + rig.jolt * 0.006 * Math.sin(rig.time * 40), pose.at[2]]
    if (rig.chapterShown) {
      // A phone settles on the doors' page as the pages turn, then everything leads into the arch: first the turn to look straight
      // down, and last the fall itself, in even steps of scale so it keeps speeding up on screen, with the lens widening as it goes.
      // It goes the same way home while the pages come back, rather than jumping there when they've landed.
      const leaving = flight?.phase === 'leaves'
      const waiting = flight?.phase === 'fold' && flight.t < 0.5
      gateE = clamp01(gateE + (leaving ? -dt / 1.3 : waiting ? -dt : dt))
      pose = lerpPose(pose, gate, smooth(0, 1, gateE))
      const fov0 = pose.fov, sx0 = pose.sx
      const turnIn = easeInOut(clamp01(throughE / 0.72))
      const fall = easeInOut(throughE)
      const dist = Math.exp(lerp(Math.log(pose.dist), Math.log(through.dist), fall))
      pose = lerpPose(pose, through, turnIn)
      pose.dist = dist
      pose.fov = lerp(fov0, through.fov, fall)
      pose.sx = lerp(sx0, 0, turnIn)
    }
    const { eye, vp } = viewOf(pose, W / H)
    if (flight?.stage) moveChapter(flight.stage, throughE, vp)

    // The light warms and lowers a little as the sun comes up, and every shadow swings with it.
    const pw = Math.min(p, rig.worldP)
    const sun = smooth(0.58, 0.8, pw)
    // The backs of the pop-up take the world's colours as it folds down, and keep them until it's nearly up: the pieces lag behind this
    // number on their springs, and fading sooner shows them as blank paper for a moment.
    frame.backArt = rig.chapterShown ? 1 - smooth(0.55, 1, pw / Math.max(0.01, heldP)) : 0
    // The shadow around the arch is gone by the time the arch is off the screen, or it drops away in one frame when the book is put aside.
    frame.rim = 1 - smooth(0.6, 0.96, throughE)
    frame.vp = vp
    frame.cam = eye
    frame.res = [canvas.width, canvas.height]
    frame.light = norm([(-0.42 - 0.12 * sun) * dir, 0.64 - 0.1 * sun, 0.66 + 0.02 * sun]) as V3
    // Before the sun is up the world opens in a cool, even light, and the sun brings the warmth.
    const dawn = smooth(0.2, 0.4, pw) * (1 - sun)
    frame.key = [lerp(lerp(0.93, 0.88, dawn), 1.08, sun), lerp(lerp(0.88, 0.87, dawn), 0.96, sun), lerp(lerp(0.8, 0.85, dawn), 0.76, sun)]
    const disc = rig.worldOf('sun_disc')
    frame.sun = disc ? [disc[12], disc[13], disc[14], sun * 1.1] : [0, 0, 0, 0]
    frame.sky = [0.44, lerp(0.45, 0.45, sun), lerp(0.46, 0.5, sun)]
    frame.gnd = [lerp(0.3, 0.36, sun), lerp(0.27, 0.3, sun), lerp(0.24, 0.24, sun)]
    frame.pool = [lerp(1, 0.9, sun), lerp(1, 0.97, sun), 1]
    frame.poolA = smooth(0.25, 0.7, pw)

    scene.draw(parts, frame)

    // The words follow the page. Corners are in closed-book coordinates, as the page swings with the cover.
    let O: V3, X: V3, Y: V3
    if (tall) {
      // On the leaf: x runs across it, -z away from its hinge, and its printed side faces -y until it turns over.
      const a = dir > 0 ? leafBox.xa : leafBox.xb, b = dir > 0 ? leafBox.xb : leafBox.xa
      O = rig.leafPoint(a, -0.004, -leafBox.d0)
      X = rig.leafPoint(b, -0.004, -leafBox.d0)
      Y = rig.leafPoint(a, -0.004, -leafBox.d1)
    } else {
      const x0 = dir > 0 ? textBox.xb : textBox.xa, x1 = dir > 0 ? textBox.xa : textBox.xb
      const y = BOOK.Y0
      O = rig.upperPoint(x0, y, textBox.za)
      X = rig.upperPoint(x1, y, textBox.za)
      Y = rig.upperPoint(x0, y, textBox.zb)
    }
    const w = textBox.w, h = textBox.h
    const ax = [(X[0] - O[0]) / w, (X[1] - O[1]) / w, (X[2] - O[2]) / w]
    const ay = [(Y[0] - O[0]) / h, (Y[1] - O[1]) / h, (Y[2] - O[2]) / h]
    const c0 = [vp[0] * ax[0] + vp[4] * ax[1] + vp[8] * ax[2], vp[1] * ax[0] + vp[5] * ax[1] + vp[9] * ax[2], vp[3] * ax[0] + vp[7] * ax[1] + vp[11] * ax[2]]
    const c1 = [vp[0] * ay[0] + vp[4] * ay[1] + vp[8] * ay[2], vp[1] * ay[0] + vp[5] * ay[1] + vp[9] * ay[2], vp[3] * ay[0] + vp[7] * ay[1] + vp[11] * ay[2]]
    const c3 = xf(vp, O[0], O[1], O[2])
    const col = (c: number[]) => [(c[0] + c[2]) * (W / 2), (c[2] - c[1]) * (H / 2), c[2]]
    const a = col(c0), b = col(c1), d = col([c3[0], c3[1], c3[3]])
    const css = `matrix3d(${a[0]},${a[1]},0,${a[2]},${b[0]},${b[1]},0,${b[2]},0,0,1,0,${d[0]},${d[1]},0,${d[2]})`
    if (css !== lastCss) {
      ink.style.transform = css
      lastCss = css
    }
    // The page has to face the camera before its words can be seen.
    const nm = tall ? rig.leafM : rig.upper
    const n = norm([nm[4] * -1, nm[5] * -1, nm[6] * -1])
    const v = norm([eye[0] - O[0], eye[1] - O[1], eye[2] - O[2]])
    const facing = n[0] * v[0] + n[1] * v[1] + n[2] * v[2]
    const shown = smooth(0.05, 0.22, facing) * (rig.theta > 0.3 ? 1 : 0)
    ink.style.opacity = shown.toFixed(3)
    ink.style.pointerEvents = shown > 0.5 && !flight ? 'auto' : 'none'
    // A page coming over covers the words, which sit on top of the canvas: cut them where its fore-edge falls on their page.
    if (!tall && rig.chapterShown) {
      let line = Infinity
      const hit = (l: (typeof rig.turns)[number], z: number) => {
        const [ex, ey] = rig.pageEdge(l)
        const E: V3 = [ex * dir, BOOK.Y0 + ey, z]
        const k = (BOOK.Y0 - eye[1]) / (E[1] - eye[1])
        return eye[0] + (E[0] - eye[0]) * k
      }
      let ua = 0, ub = 0
      const zA = O[2], zB = Y[2]
      for (const l of rig.turns) {
        if (l.phi < 0.3) continue
        const a0 = hit(l, zA) * dir, b0 = hit(l, zB) * dir
        if (a0 + b0 < line) {
          line = a0 + b0
          ua = a0
          ub = b0
        }
      }
      if (line === Infinity) ink.style.removeProperty('clip-path')
      else {
        const span = X[0] - O[0]
        const toU = (x: number) => ((x * dir - O[0]) / span) * w
        const ax = toU(ua), bx = toU(ub)
        const far = dir > 0 ? -60 : w + 60
        ink.style.clipPath = `polygon(${far}px -60px, ${ax.toFixed(1)}px -60px, ${bx.toFixed(1)}px ${h + 60}px, ${far}px ${h + 60}px)`
      }
    } else if (ink.style.clipPath) ink.style.removeProperty('clip-path')

    if (!ctx.reduce && wordsHere) ctx.mark.set(smooth(0.43, 0.6, p))

    // The tab's handle follows the tab on screen.
    const tabM = rig.worldOf('tab')
    const ready = p > 0.7 && !ctx.reduce && !flight && !inside
    if (tabM && ready !== tabReady) {
      tabReady = ready
      tabEl.classList.toggle('is-on', ready)
      tabEl.tabIndex = ready ? 0 : -1
      if (!ready) tabEl.blur()
    }
    if (tabM) {
      const c = xf(vp, tabM[12] + 0.04 * dir, tabM[13], tabM[14])
      const sx = ((c[0] / c[3]) * 0.5 + 0.5) * W, sy = (0.5 - (c[1] / c[3]) * 0.5) * H
      const c2 = xf(vp, tabM[12] + 0.04 * dir + 0.1 * dir, tabM[13], tabM[14])
      tabPx = Math.abs(((c2[0] / c2[3]) * 0.5 + 0.5) * W - sx) * 10
      tabEl.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`
    }
    // The chapters' tabs slide out of the page block one after another once the world has stood up, and each button follows its own.
    const wantChapters = (p > 0.72 || ctx.reduce) && !flight && !inside
    if (wantChapters !== chaptersOn) {
      chaptersOn = wantChapters
      chaptersSince = 0
      chapterNav.classList.toggle('is-on', wantChapters)
      for (const b of chapterButtons) b.tabIndex = wantChapters ? 0 : -1
      if (!wantChapters) {
        if (chapterNav.contains(document.activeElement)) (document.activeElement as HTMLElement).blur()
        hovered = -1
      }
    }
    chaptersSince += dt
    for (let i = 0; i < CHAPTERS.length; i++) {
      const showing = chaptersOn && (ctx.reduce || chaptersSince > 0.16 + i * 0.075)
      // In a flight the tabs stay out: they belong to the pages under the one that's turning.
      rig.chapterTarget[i] = (showing || !!flight || inside ? 1 : 0) + (hovered === i ? 0.26 : 0)
      const tz = INDEX.z0 + i * INDEX.pitch
      const out = BOOK.W + INDEX.out * 0.62
      const c0 = xf(vp, out * dir, BOOK.Y0, tz)
      const sx = ((c0[0] / c0[3]) * 0.5 + 0.5) * W, sy = (0.5 - (c0[1] / c0[3]) * 0.5) * H
      const c1 = xf(vp, out * dir, BOOK.Y0, tz - INDEX.w / 2), c2 = xf(vp, out * dir, BOOK.Y0, tz + INDEX.w / 2)
      const bh = Math.abs((c2[1] / c2[3] - c1[1] / c1[3]) * 0.5 * H)
      const b = chapterButtons[i]
      b.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`
      // Its height follows in steps, and only at rest. Set every frame, it lays out and repaints the whole page whenever the mouse moves.
      const tall = Math.round(Math.max(30, bh) / 4) * 4
      if (!flight && !inside && tall !== chapterTall[i]) {
        chapterTall[i] = tall
        b.style.height = `${tall}px`
        b.style.marginBlockStart = `${-tall / 2}px`
      }
    }

    // Once, on arrival, the tab gives a small tug by itself, so people see what it does.
    if (p > 0.8 && !hinted && !ctx.reduce) {
      hinted = true
      nudge = 0.55
    }
    if (nudge > 0 && !dragging) {
      nudge -= dt
      rig.tabTarget = nudge > 0.2 ? 0.34 : 0
    }
  }

  // Let the page's own smoothing run; everything is drawn inside the host's frame loop.
  let first = true
  ctx.frame((p, dt) => {
    tick(p, dt)
    if (first) {
      first = false
      clearTimeout(slow)
      // Bring the words back if the still had borrowed them.
      if (still) {
        const old = still
        stillRo?.disconnect()
        if (wordsHere) ink.append(copy)
        root.append(ink)
        canvas.style.display = ''
        old.classList.add('is-leaving')
        setTimeout(() => old.remove(), 500)
        still = null
        root.classList.remove('is-still')
        placeText()
      }
      root.classList.add('is-ready')
    }
  })
  if (ctx.reduce) {
    tabEl.style.display = 'none'
    if (wordsHere) ctx.mark.set(1)
  }

  // The link can be reached by keyboard before the book has opened: take the reader to the page.
  copy.addEventListener('focusin', () => {
    if (!wordsHere) return
    const r = section.getBoundingClientRect()
    const span = Math.max(1, r.height - innerHeight)
    if (-r.top / span < 0.42 && !ctx.reduce) window.scrollTo({ top: r.top + scrollY + span * 0.44, behavior: 'instant' as ScrollBehavior })
  }, { signal })

  return () => {
    ro.disconnect()
    clearTimeout(keyTimer)
    clearTimeout(slow)
    scene.dispose()
    root.remove()
  }
}

export default mount
