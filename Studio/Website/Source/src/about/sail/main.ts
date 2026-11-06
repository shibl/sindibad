// Set sail: the section is a poster for a game, and one click opens the game. The poster is the art from
// concepts/blender/about/sail, made alive by sea.ts. Nothing from Unity downloads until the visitor presses the button.
import type { AboutCtx, AboutMount } from '../types'
import './sail.css'
import { closeGame, openGame } from './game'
import { createSea, type Sea } from './sea'
import { WORDS } from './words'

// Measured from the files in public/about/sail/game/: what one visitor downloads (11.2 MB on desktop, 11.6 MB with the phones' ASTC
// textures), not the whole folder, which holds both. Update with each player build.
const GAME_MB = { desktop: 11, phone: 12 }

// Where things fall on each picture, as measured from the renders: fractions of its width and height.
const WIDE = {
  file: 'wide',
  aspect: 2400 / 1350,
  anchor: [0.62, 0.7] as [number, number],
  sun: [0.612, 0.4] as [number, number],
  horizon: 0.802,
  boat: [0.65, 0.915] as [number, number],
  boatSize: [0.21, 0.38] as [number, number],
}
const TALL = {
  file: 'tall',
  aspect: 1000 / 2600,
  anchor: [0.44, 1] as [number, number],
  sun: [0.19, 0.66] as [number, number],
  horizon: 0.79,
  boat: [0.4, 0.82] as [number, number],
  boatSize: [0.26, 0.1] as [number, number],
}

// The live layer shows a little less than the whole picture, so its parallax never runs out of picture.
const ZOOM = 0.955
// How far from the text's edge the shade has all but gone, so the sun can sit clear of it: its centre (96px in) plus most of its 720px radius.
const SHADE_CLEAR = 96 + 720 * 0.93
// The boat's far end on the picture, which has to stay on screen when the art slides across.
const BOAT_END = 0.845

// Where the hoopoe's raised wing tips reach on the tall picture, measured from the render, and how much sky to leave above them.
const TALL_WING_TOP = 0.572
const WING_GAP = 22
// Where the phone shade's gradient starts to fade, as a share of its box. The box is sized so this falls just under the last line of text.
const TALL_SHADE_FULL = 0.54

type Pic = typeof WIDE

/** The part of the picture to show in a window this size, as fractions of the picture. */
function framing(pic: Pic, W: number, H: number, inset: number) {
  const ratio = W / H
  let w = (ratio > pic.aspect ? 1 : ratio / pic.aspect) * ZOOM
  let l = pic.anchor[0] * (1 - w)
  if (pic.file === 'wide') {
    // The sun belongs outside the text's shade. Where it would fall inside, slide the art across, and if that runs out of picture, go in closer.
    const want = (inset + SHADE_CLEAR) / W
    if ((pic.sun[0] - l) / w < want) {
      w = Math.min(w, pic.sun[0] / want)
      l = Math.max(0, pic.sun[0] - w * want, BOAT_END - 0.985 * w)
    }
  }
  const h = (w * pic.aspect) / ratio
  return { l, t: pic.anchor[1] * (1 - h), w, h }
}

const SAIL_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11.5 2.5C7.6 7 5 12 3.8 17h7.7V2.5z"/><path fill="currentColor" opacity=".72" d="M13.3 7.2c2.7 2.8 4.8 6.2 6 9.8h-6V7.2z"/><path fill="currentColor" d="M2 18.7h20c-1 2.2-3.2 3.3-5.5 3.3h-9C5.200 22 3 20.900 2 18.700z"/></svg>'

const mount: AboutMount = (ctx: AboutCtx) => {
  const w = WORDS[ctx.lang]
  const tallQuery = matchMedia('(max-width: 760px) and (orientation: portrait)')
  const choose = () => (ctx.touch || tallQuery.matches ? TALL : WIDE)
  const base = `${ctx.base}about/sail/`
  const hasGl = (() => {
    try {
      return !!document.createElement('canvas').getContext('webgl2')
    } catch {
      return false
    }
  })()
  const mbText = new Intl.NumberFormat(ctx.lang === 'ar' ? 'ar-EG' : 'en').format(ctx.touch ? GAME_MB.phone : GAME_MB.desktop)

  // The stage: poster, live layer, and the text sitting on them.
  const root = document.createElement('div')
  root.dir = ctx.rtl ? 'rtl' : 'ltr'
  const still = document.createElement('img')
  still.className = 'sail-still'
  still.alt = w.art
  still.decoding = 'async'
  const shade = document.createElement('div')
  shade.className = 'sail-shade'
  shade.setAttribute('aria-hidden', 'true')

  // The invitation, beside the page's own CTA.
  const actions = document.createElement('div')
  actions.className = 'sail-actions'
  const go = document.createElement('button')
  go.type = 'button'
  go.className = 'sail-go'
  go.innerHTML = `${SAIL_ICON}<span>${w.setSail}</span>`
  const note = document.createElement('p')
  note.className = 'sail-note'
  note.textContent = hasGl ? w.weight.replace('{mb}', mbText) : w.noGl
  // In this order for phones, where the size note sits straight under the button it's about. Wide windows rearrange them in CSS.
  if (hasGl) actions.append(go)
  actions.append(note, ctx.cta)
  ctx.copy.append(actions)
  ctx.copy.classList.add('sail-copy')

  root.append(still, shade, ctx.copy)
  ctx.stage.append(root)

  go.addEventListener('click', () => openGame(ctx, go, mbText), { signal: ctx.signal })

  // The picture and the live layer on it. Rebuilt if the window changes between the wide and tall layouts.
  let sea: Sea | null = null
  let canvas: HTMLCanvasElement | null = null
  let shown = ''
  const live = hasGl && !ctx.reduce
  const show = () => {
    const pic = choose()
    if (pic.file === shown) return
    shown = pic.file
    sea?.destroy()
    sea = null
    canvas?.remove()
    root.className = `sail is-${pic.file}`
    still.src = `${base}${pic.file}.webp`
    still.style.transform = ctx.rtl ? 'scaleX(-1)' : ''
    current = pic
    place()
    if (!live) return
    canvas = document.createElement('canvas')
    canvas.className = 'sail-live'
    canvas.setAttribute('aria-hidden', 'true')
    still.after(canvas)
    const made = createSea({
      canvas,
      art: still,
      map: `${base}${pic.file}-map.webp`,
      aspect: pic.aspect,
      sun: pic.sun,
      horizon: pic.horizon,
      boat: pic.boat,
      boatSize: pic.boatSize,
      flip: ctx.rtl,
      dpr: Math.min(devicePixelRatio || 1, ctx.touch ? 1.5 : 2),
      signal: ctx.signal,
      onReady: () => {
        if (sea === made) root.classList.add('is-live')
      },
    })
    sea = made
    place()
  }
  // Puts the still and the live layer on exactly the same part of the picture, so nothing moves when the live layer fades in.
  function place() {
    if (!current) return
    const W = root.clientWidth
    if (!W) return
    if (current.file === 'tall') makeRoom(current, W)
    else {
      root.style.paddingBlockEnd = ''
      shade.style.bottom = ''
      shade.style.height = ''
    }
    const H = root.clientHeight
    if (!H) return
    const inset = parseFloat(getComputedStyle(ctx.copy).paddingInlineStart) || 0
    const f = framing(current, W, H, inset)
    const iw = W / f.w
    const ih = H / f.h
    const left = -f.l * iw
    still.style.width = `${iw}px`
    still.style.height = `${ih}px`
    still.style.left = `${ctx.rtl ? W - left - iw : left}px`
    still.style.top = `${-f.t * ih}px`
    sea?.frame(f.l, f.t, f.w, f.h)
  }
  // On the tall layout the art scales with the section, and the text wraps differently at every width, so no fixed padding keeps the
  // hoopoe clear of the buttons. This works out the section height that does, and ends the shade above her so it doesn't dim her.
  function makeRoom(pic: Pic, W: number) {
    const top = root.getBoundingClientRect().top
    const textEnd = ctx.copy.getBoundingClientRect().bottom - top
    const want = textEnd + WING_GAP
    // While the picture is cropped at its sides it fills the section's height, so the wing tip sits at a fixed share of it.
    let H = want / ((TALL_WING_TOP - (1 - ZOOM)) / ZOOM)
    // In a wider window it's cropped at the top instead, and the wing tip sits a fixed distance from the bottom.
    if (W / H > pic.aspect) H = want + ((1 - TALL_WING_TOP) * W) / (ZOOM * pic.aspect)
    const pad = Math.ceil(H - textEnd)
    if (Math.abs(parseFloat(root.style.paddingBlockEnd || '0') - pad) >= 1) root.style.paddingBlockEnd = `${pad}px`
    shade.style.bottom = 'auto'
    shade.style.height = `${(note.getBoundingClientRect().bottom - top) / TALL_SHADE_FULL}px`
  }
  let current: Pic | null = null
  show()
  tallQuery.addEventListener('change', show, { signal: ctx.signal })
  const watch = new ResizeObserver(place)
  watch.observe(root)

  // The pointer leans the scene, gently. Touch screens get a slow sway of their own instead.
  let tx = 0
  let ty = 0
  let px = 0
  let py = 0
  let clock = 0
  if (!ctx.touch) {
    ctx.section.addEventListener('pointermove', e => {
      const r = root.getBoundingClientRect()
      tx = ((e.clientX - r.left) / r.width) * 2 - 1
      ty = ((e.clientY - r.top) / r.height) * 2 - 1
    }, { signal: ctx.signal })
    ctx.section.addEventListener('pointerleave', () => {
      tx = 0
      ty = 0
    }, { signal: ctx.signal })
  }
  ctx.frame((p, dt) => {
    if (!sea || !root.classList.contains('is-live')) return
    // The game has the screen and the GPU while it's open.
    if (document.documentElement.dataset.sailGame) return
    clock += dt
    const sway = ctx.touch ? Math.sin(clock * 0.37) * 0.35 : 0
    const k = 1 - Math.exp(-dt * 2.4)
    px += (tx + sway - px) * k
    py += (ty - py) * k
    sea.draw(dt, px, py, p - 0.5)
  })

  return () => {
    closeGame()
    watch.disconnect()
    sea?.destroy()
    ctx.copy.classList.remove('sail-copy')
    ctx.copy.append(ctx.cta)
    actions.remove()
    note.remove()
    root.remove()
  }
}

export default mount
