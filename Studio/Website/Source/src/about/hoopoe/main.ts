// The hoopoe lives on the page. This is its director: it reads the type's live layout, decides where the bird should be for the
// current scroll, and runs it there through hops and flights it always finishes, with a small brain for when nothing is happening.
import type { AboutCtx } from '../types'
import './hoopoe.css'
import { angleDelta, Bird, clamp, lerp, smooth, Spring, type Vec3 } from './bird'
import { createRenderer, type Renderer } from './renderer'
import { parseMesh } from './skeleton'
import { Typeset, type Stand, type Word } from './typeset'

const YAW = 0.96 // how far the bird faces sideways when it's perched: enough for the bill's profile, and still both eyes' worth of face.
/** Extra screens of scroll the pinned scene holds for. */
const PIN = 2.2
/** Beyond this many bird-heights it flies. Anything nearer is a hop, so the route reads as hopping from word to word. */
const HOP_MAX = 5.2
const t = (ctx: AboutCtx, en: string, ar: string) => (ctx.lang === 'ar' ? ar : en)

type Kind = 'word' | 'boat' | 'cta'
type Perch = { kind: Kind; word: Word | null; stand: Stand; peck?: boolean; face: -1 | 1; yaw: number; covers: boolean }

type Move =
  | {
      kind: 'hop'
      t: number
      lift: number
      air: number
      x0: number
      y0: number
      to: Perch
      height: number
      yaw0: number
      yaw1: number
      landed: boolean
      planted: boolean
    }
  | {
      kind: 'fly'
      t: number
      lift: number
      air: number
      p: [number, number, number, number, number, number, number, number]
      to: Perch
      yaw0: number
      yaw1: number
      z0: number
      landed: boolean
      planted: boolean
      started: boolean
      clipState: 'takeoff' | 'flap' | 'glide' | 'land'
      entering: boolean
      yawApproach: number | null
    }

const FPS = 30

export async function mountHoopoe(ctx: AboutCtx) {
  const { stage, copy, cta, mark, signal, rtl } = ctx
  const page = new Typeset(ctx)
  // Give the headline back the moment this concept is switched away, even if it's still loading.
  signal.addEventListener('abort', () => page.restore(), { once: true })
  stage.append(copy)
  const phoneAtStart = innerWidth < 760
  if (!phoneAtStart) ctx.pin(ctx.reduce ? 0 : PIN)

  page.layout()
  // Fonts that arrive after we've stopped waiting for them change the layout, so measure again then.
  let lateFonts = () => {}
  if (document.fonts) {
    void document.fonts.ready.then(() => lateFonts())
    await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1200))])
  }
  if (signal.aborted) return () => page.restore()
  page.layout()
  mark.set(ctx.reduce ? 1 : 0)
  page.measure()

  // Assets.
  const base = `${ctx.base}about/hoopoe/`
  const fetchBuf = (n: string) => fetch(`${base}${n}`, { signal }).then(r => {
    if (!r.ok) throw new Error(`${n}: ${r.status}`)
    return r.arrayBuffer()
  })
  const probe = document.createElement('canvas').getContext('webgl2')
  probe?.getExtension('WEBGL_lose_context')?.loseContext()
  if (!probe) return mountStill(ctx, page)
  let meshBuf: ArrayBuffer, clipBuf: ArrayBuffer, atlas: ImageBitmap
  try {
    const [a, b, blob] = await Promise.all([fetchBuf('hoopoe-mesh.bin'), fetchBuf('hoopoe-clips.bin'), fetch(`${base}hoopoe-atlas.webp`, { signal }).then(r => r.blob())])
    meshBuf = a
    clipBuf = b
    atlas = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' })
  } catch {
    // Switched away mid-load, or the files didn't arrive. The words are already on the page either way.
    return signal.aborted ? () => page.restore() : mountStill(ctx, page)
  }
  if (signal.aborted) return () => page.restore()

  const { head } = parseMesh(meshBuf)
  const bird = new Bird(head.bones, clipBuf)

  // The pieces on the page.
  const canvas = document.createElement('canvas')
  canvas.className = 'hp-gl'
  canvas.setAttribute('aria-hidden', 'true')
  const hit = document.createElement('button')
  hit.type = 'button'
  hit.className = 'hp-hit'
  hit.setAttribute('aria-label', t(ctx, 'Poke the hoopoe', 'انقر على الهدهد'))
  const fx = document.createElement('div')
  fx.className = 'hp-fx'
  fx.setAttribute('aria-hidden', 'true')
  stage.append(canvas, fx, hit)

  const birdScale = () => {
    const F = page.fontSize
    return page.phone ? Math.max(46, F * 0.84) : clamp(F * 0.66, 56, 150)
  }
  let S = birdScale()
  const winSize = () => Math.round(S * 6)
  // Up to 2x, less on a touch screen. A desktop at 1x still draws at 1.5x, which keeps the feathers' edges clean.
  const pr = () => (ctx.touch ? Math.min(devicePixelRatio || 1, 1.75) : Math.min(2, Math.max(devicePixelRatio || 1, 1.5)))
  let R: Renderer
  try {
    R = createRenderer(canvas, winSize(), pr(), meshBuf, atlas)
  } catch {
    canvas.remove()
    hit.remove()
    fx.remove()
    atlas.close()
    return mountStill(ctx, page)
  }
  const win = { x: 0, y: 0, tx: -1e9, ty: -1e9 }

  // ---------------------------------------------------------------------------------------------- the route
  let path: Perch[] = []
  // Would a bird standing here hide any type? Checks its real shape, not just its body: the tail reaches back low down and the bill
  // reaches forward high up, and either can hide a comma or the dots of a letter. Ink below its belly is the word it's standing on.
  const bodyOver = (x: number, y: number) => page.inkInBox(x - S * 0.42, x + S * 0.42, y - S * 2.05, y - S * 0.42) > 4
  const coverAt = (x: number, y: number, face: number, yaw: number) => {
    const side = Math.sin(Math.abs(yaw))
    const tail = x - face * 1.4 * side * S
    const bill = x + face * 1.35 * side * S
    return (
      bodyOver(x, y) ||
      page.inkInBox(Math.min(x, tail), Math.max(x, tail), y - S * 0.8, y - S * 0.3) > 6 ||
      page.inkInBox(Math.min(x, bill), Math.max(x, bill), y - S * 1.7, y - S * 1.2) > 6
    )
  }
  const buildPath = () => {
    const F = page.fontSize
    const out: Perch[] = []
    const W = stage.clientWidth
    // Near an edge the bird turns more toward the viewer, so its bill and tail stay on the page.
    const yawAt = (x: number, face: number) => {
      const reach = face > 0 ? W - x : x
      const back = face > 0 ? x : W - x
      const k = Math.min((reach - 6) / (S * 1.32), (back - 6) / (S * 1.5))
      return clamp(Math.asin(clamp(k, 0.3, 1)) * 1.0, 0.36, YAW)
    }
    let dir = rtl ? -1 : 1
    let lastX: number | null = null
    let longest: Perch | null = null
    let longestW = 0
    page.lines.forEach((line, li) => {
      // Every word wide enough to stand on is a perch, so neighbours are a hop apart.
      const wide = line.words.filter(w => w.x1 - w.x0 >= F * 0.7)
      const pool = wide.length ? wide : line.words
      const sorted = [...pool].sort((a, b) => (a.x0 - b.x0) * dir)
      // Enter from whichever end is nearest, so the route zigzags down the headline.
      if (lastX !== null && sorted.length > 1) {
        const dFirst = Math.abs((sorted[0].x0 + sorted[0].x1) / 2 - lastX)
        const dLast = Math.abs((sorted[sorted.length - 1].x0 + sorted[sorted.length - 1].x1) / 2 - lastX)
        if (dLast < dFirst) {
          sorted.reverse()
          dir = -dir
        }
      }
      const pick = sorted
      pick.forEach((w, k) => {
        const face: -1 | 1 = w === page.words[page.words.length - 1] ? (rtl ? -1 : 1) : dir > 0 ? 1 : -1
        // Stand toward the end of the word nearest where the bird is going, so hops stay short enough to be hops.
        const span = w.x1 - w.x0
        const toward = pick.length < 2 || (k > 0 && k < pick.length - 1) ? undefined : k === 0 ? (dir > 0 ? w.x1 - span * 0.2 : w.x0 + span * 0.2) : dir > 0 ? w.x0 + span * 0.25 : w.x1 - span * 0.25
        const isLast = w === page.words[page.words.length - 1]
        const prefer = isLast ? (rtl ? w.x0 + (w.x1 - w.x0) * 0.12 : w.x1 - (w.x1 - w.x0) * 0.12) : li === 0 && k === 0 ? (w.x0 + w.x1) / 2 + dir * (w.x1 - w.x0) * 0.08 : toward
        const stand = page.standOn(w, S, face * YAW, prefer)
        const yaw = yawAt(stand.x, face)
        const p: Perch = { kind: 'word', word: w, stand, face, yaw, covers: coverAt(stand.x, stand.y, face, yaw) }
        // Hiding something? Look along the word for the nearest spot that hides nothing.
        if (p.covers) {
          // On a phone it can also turn further toward the viewer, which pulls its tail and bill in over the short lines.
          const turns = page.phone ? [1, 0.72, 0.48] : [1]
          search: for (let d = 0; d < span; d += 6) {
            for (const sgn of [1, -1]) {
              const x = stand.x + sgn * d
              if (x < w.x0 + 2 || x > w.x1 - 2) continue
              for (const turn of turns) {
                const y2 = Math.max(0.3, yawAt(x, face) * turn)
                const st = page.standAt(w, x, S, face * y2)
                if (st && !coverAt(x, st.y, face, y2)) {
                  p.stand = st
                  p.yaw = y2
                  p.covers = false
                  break search
                }
              }
            }
          }
        }
        // On a phone it never stops with its body over a word. A tail or bill over one is fine for a moment, because it moves on, and
        // that keeps the route rich on a tall column. So failing a clear spot, it looks for one where only those overlap.
        if (page.phone && li > 0 && p.covers) {
          if (bodyOver(p.stand.x, p.stand.y)) {
            let found = false
            for (let d = 6; d < span && !found; d += 6) {
              for (const sgn of [1, -1]) {
                const x = stand.x + sgn * d
                if (x < w.x0 + 2 || x > w.x1 - 2) continue
                const y2 = Math.max(0.3, yawAt(x, face) * 0.72)
                const st = page.standAt(w, x, S, face * y2)
                if (st && !bodyOver(x, st.y)) {
                  p.stand = st
                  p.yaw = y2
                  found = true
                  break
                }
              }
            }
            if (!found) return
          }
        }
        out.push(p)
        if (li > 0 && w !== page.words[page.words.length - 1] && w.x1 - w.x0 > longestW) {
          longestW = w.x1 - w.x0
          longest = p
        }
        lastX = p.stand.x
      })
      dir = -dir
    })
    if (longest) (longest as Perch).peck = true
    const boat = page.standOnBoat(S, YAW)
    if (boat) {
      const face: -1 | 1 = rtl ? -1 : 1
      out.push({ kind: 'boat', word: null, stand: boat, face, yaw: yawAt(boat.x, face), covers: coverAt(boat.x, boat.y, face, yawAt(boat.x, face)) })
    }
    const c = page.ctaRect
    const cx = c.x + c.w * (rtl ? 0.34 : 0.66)
    const ctaFace: -1 | 1 = cx > W / 2 ? -1 : 1
    out.push({ kind: 'cta', word: null, stand: { x: cx, y: c.y + 1, word: null, footL: c.y + 1, footR: c.y + 1, cost: 0 }, face: ctaFace, yaw: yawAt(cx, ctaFace), covers: false })
    path = out
  }
  buildPath()

  // Where a foot lands: its own column of ink, not just the stand's height.
  const footOn = (perch: Perch, side: 'L' | 'R', yaw: number): { x: number; y: number; z: number } => {
    const o = bird.footRest(side, yaw)
    const x = perch.stand.x + o[0] * S
    let y = perch.stand.y
    if (perch.kind === 'word' && perch.word) {
      const h = page.skyOnLine(perch.word.line, x, 2)
      if (h >= 0) y = perch.word.baseline - h
    } else if (perch.kind === 'boat' && page.boat) {
      const h = page.skyOn(page.boat, x, 2)
      if (h >= 0) y = page.boat.baseline - h
    }
    return { x, y, z: o[2] }
  }

  // ---------------------------------------------------------------------------------------------- the state
  let at: Perch | null = null
  let index = 0
  let wantIndex = 0
  let rx = 0
  let ry = -1000
  let rz = 0
  let move: Move | null = null
  let visible = false
  let arrived = false
  let dwell = 0
  let time = 0
  let busyUntil = 0
  let nextBlink = 1.2
  let nextGesture = 2.5
  let pointer: { x: number; y: number; at: number } | null = null
  let pokeCount = 0
  let lastPoke = -10
  let pendingPokeMove = 0
  let parked = false
  let lastPeck = -100
  let stillFrames = 0
  let glance: { until: number; target: Vec3 } | null = null
  let lastPivot = 0
  let tiltUntil = 0
  let boatP = ctx.reduce ? 1 : 0
  let boatTarget = boatP
  const boatDy = new Spring(0, 2.6, 0.32)
  const ctaPress = new Spring(0, 7, 0.45)
  let plant = { xL: 0, yL: 0, zL: 0, xR: 0, yR: 0, zR: 0 }
  let groundWeight = 0
  let frozen = false
  let lastScroll = scrollY
  let lastScrollV = 0
  let clipActive = false
  type Feather = { el: HTMLCanvasElement; x: number; y: number; vx: number; vy: number; t: number; life: number; ph: number; spin: number }
  const feathers: Feather[] = []
  const hero = document.querySelector<HTMLElement>('.a-hero')

  const setPlant = (perch: Perch, yaw: number) => {
    const l = footOn(perch, 'L', yaw)
    const r = footOn(perch, 'R', yaw)
    plant = { xL: l.x, yL: l.y, zL: l.z, xR: r.x, yR: r.y, zR: r.z }
    bird.plantYawL = yaw
    bird.plantYawR = yaw
  }

  const snapTo = (perch: Perch) => {
    at = perch
    rx = perch.stand.x
    ry = perch.stand.y
    rz = 0
    bird.yaw = perch.face * perch.yaw
    bird.pitch = bird.roll = 0
    setPlant(perch, bird.yaw)
    bird.ikW = bird.ikTarget = 1
    bird.stopAll(0.01)
    bird.teleported()
    move = null
  }

  // ---------------------------------------------------------------------------------------------- moves
  const facingTo = (from: number, to: number, fallback: -1 | 1): -1 | 1 => (Math.abs(to - from) < 6 ? fallback : to > from ? 1 : -1)

  const hopTo = (to: Perch) => {
    const lift = bird.clips.get('hop')!.events.lift / FPS
    const land = bird.clips.get('hop')!.events.land / FPS
    const dist = Math.hypot(to.stand.x - rx, to.stand.y - ry)
    const air = clamp(dist / 900, 0.24, 0.5)
    const lastWord = to.word === page.words[page.words.length - 1]
    const yaw1 = (lastWord ? to.face : facingTo(rx, to.stand.x, to.face)) * to.yaw
    const k = (land - lift) / air
    bird.play('hop', { fade: 0.06, warp: tt => (tt < lift ? tt : tt < lift + air ? lift + (tt - lift) * k : land + (tt - lift - air)), autoOut: 0.25 })
    bird.lookAmount = Math.min(bird.lookAmount, 0.3)
    // Keep the arc on screen.
    const viewTop = -stage.getBoundingClientRect().top
    const headroom = Math.min(ry, to.stand.y) - (viewTop + S * 1.95)
    const height = clamp(Math.max(S * 0.62, dist * 0.3), S * 0.18, Math.max(S * 0.18, headroom))
    move = { kind: 'hop', t: 0, lift, air, x0: rx, y0: ry, to, height, yaw0: bird.yaw, yaw1, landed: false, planted: false }
    bird.triggerBlink()
  }

  const flyTo = (to: Perch, entry?: { x: number; y: number; z: number }) => {
    const x0 = entry ? entry.x : rx
    const y0 = entry ? entry.y : ry
    const dx = to.stand.x - x0
    const dy = to.stand.y - y0
    const dist = Math.hypot(dx, dy)
    const air = clamp(dist / 640, 0.72, 2.1)
    const lift = entry ? 0 : bird.clips.get('takeoff')!.events.lift / FPS
    const viewTop = -stage.getBoundingClientRect().top + S * 2.1
    const arc = clamp(dist * 0.22 + S * 0.8, S, S * 3.2)
    const p: [number, number, number, number, number, number, number, number] = [x0, y0, x0 + dx * 0.34, Math.max(viewTop, y0 + dy * 0.1 - arc), to.stand.x - dx * 0.2, Math.max(viewTop, to.stand.y - arc * 0.9), to.stand.x, to.stand.y]
    const face = facingTo(x0, to.stand.x, to.face)
    if (entry) {
      bird.play('flap', { fade: 0.01 })
      bird.ikW = bird.ikTarget = 0
      rx = x0
      ry = y0
      rz = entry.z
      bird.yaw = face * 1.15
      bird.teleported()
    } else {
      bird.play('takeoff', { fade: 0.08 })
    }
    move = { kind: 'fly', t: 0, lift, air, p, to, yaw0: bird.yaw, yaw1: face * 1.12, z0: rz, landed: false, planted: false, started: !!entry, clipState: entry ? 'flap' : 'takeoff', entering: !!entry, yawApproach: null }
    bird.browUpTarget = 0.3
  }

  const bez = (p: number[], s: number): [number, number] => {
    const u = 1 - s
    const a = u * u * u, b = 3 * u * u * s, c = 3 * u * s * s, d = s * s * s
    return [a * p[0] + b * p[2] + c * p[4] + d * p[6], a * p[1] + b * p[3] + c * p[5] + d * p[7]]
  }

  const onLanded = (perch: Perch, hard: number) => {
    at = perch
    if (perch.word) {
      const w = perch.word
      const off = (rx - (w.x0 + w.x1) / 2) / Math.max(40, w.x1 - w.x0)
      page.kick(w, (rtl ? 1 : 1) * 95 * hard, off * 1.1 * hard)
    }
    if (perch.kind === 'boat') boatDy.kick(70 * hard)
    if (perch.kind === 'cta') ctaPress.kick(26 * hard)
    bird.triggerBlink()
    bird.browUpTarget = 0
    dwell = 0
  }

  const arriveActions = (perch: Perch) => {
    // What the bird does on reaching a perch from the scroll route. The peck and the knock hold it there for a moment, once per pass,
    // so that someone scrolling steadily still sees them.
    const lastWordPerch = perch.word === page.words[page.words.length - 1]
    if (perch.peck && !lastWordPerch && time - lastPeck > 8) {
      lastPeck = time
      busyUntil = Math.max(busyUntil, time + 0.4)
      setTimeoutFrames(0.16, () => {
        if (at === perch && !move) doPeck(perch)
      })
    }
    if (lastWordPerch && boatTarget < 1) {
      // The last word: look over at the mark and knock it into a boat.
      busyUntil = Math.max(busyUntil, time + 0.4)
      setTimeoutFrames(0.16, () => {
        if (at === perch && !move && boatTarget < 1) knockBoat(perch)
      })
    }
    if (perch.kind === 'cta') {
      setTimeoutFrames(0.55, () => {
        if (at === perch && !move) doTap()
      })
    }
  }

  const timers: { at: number; fn: () => void }[] = []
  const setTimeoutFrames = (sec: number, fn: () => void) => timers.push({ at: time + sec, fn })

  const doPeck = (perch: Perch) => {
    const clip = bird.clips.get('peck')!
    bird.play('peck', { fade: 0.08, autoOut: 0.2 })
    busyUntil = time + clip.duration - 0.25
    const w = perch.word
    const hits = [clip.events.hit1, clip.events.hit2].map(f => f / FPS)
    const dir = bird.yaw > 0 ? 1 : -1
    for (const h of hits) {
      setTimeoutFrames(h, () => {
        if (w) page.kick(w, 45, dir * 0.9)
        bird.triggerBlink()
      })
    }
    bird.tiltTarget = 0
    bird.lookAmount = 0
  }

  const knockBoat = (perch: Perch) => {
    const clip = bird.clips.get('peck')!
    bird.play('peck', { fade: 0.08, autoOut: 0.2 })
    busyUntil = time + clip.duration - 0.25
    setTimeoutFrames(clip.events.hit1 / FPS, () => {
      boatTarget = 1
      boatDy.kick(40)
      if (perch.word) page.kick(perch.word, 30, 0.4)
    })
  }

  const doTap = () => {
    const clip = bird.clips.get('tap')!
    bird.play('tap', { fade: 0.08, autoOut: 0.2 })
    busyUntil = time + clip.duration - 0.25
    const hits = [clip.events.hit1, clip.events.hit2, clip.events.hit3]
    for (const h of hits) {
      setTimeoutFrames(h / FPS, () => {
        ctaPress.kick(26)
        cta.classList.remove('hp-rung')
        void cta.offsetWidth
        cta.classList.add('hp-rung')
        setTimeoutFrames(0.5, () => cta.classList.remove('hp-rung'))
      })
    }
  }

  const goStep = (i: number) => {
    const to = path[i]
    index = i
    const dist = Math.hypot(to.stand.x - rx, to.stand.y - ry)
    const far = dist > S * HOP_MAX || to.kind === 'cta' || at?.kind === 'cta'
    if (far) flyTo(to)
    else hopTo(to)
    if (to.kind === 'boat' || to.kind === 'cta') boatTarget = 1
    else if (i < path.length - 3) boatTarget = 0
  }

  // ---------------------------------------------------------------------------------------------- poke
  const poke = () => {
    if (ctx.reduce || !visible) return
    if (time - lastPoke < 0.7) return
    if (move && move.kind === 'fly') return
    if (time - lastPoke > 9) pokeCount = 0
    pokeCount++
    lastPoke = time
    const clip = bird.clips.get('squawk')!
    bird.play('squawk', { fade: 0.05, autoOut: 0.2 })
    bird.overlay('fan')
    busyUntil = time + clip.duration - 0.35
    bird.wideTarget = 1
    bird.browUpTarget = 1
    bird.lookAmount = 0.2
    setTimeoutFrames(0.6, () => {
      bird.wideTarget = 0
      bird.browUpTarget = 0
    })
    setTimeoutFrames(clip.events.open / FPS, () => {
      squawkLines()
      spawnFeather(0)
      if (pokeCount < 3 && Math.random() < 0.8) setTimeoutFrames(0.12, () => spawnFeather(1))
      if (at?.word) page.kick(at.word, 25, 0)
    })
    if (pokeCount <= 3) pendingPokeMove = time + clip.duration - 0.3
  }
  const nearestClear = (): number => {
    let best = -1
    let bestD = 1e9
    const nearEnd = index >= path.length - 3
    path.forEach((p, i) => {
      if (p.covers || (p.kind === 'boat' && boatTarget < 1) || (p.kind === 'cta' && !nearEnd)) return
      // A phone's column scrolls, so somewhere clear only helps if it's on the screen.
      if (page.phone) {
        const sy = p.stand.y + stage.getBoundingClientRect().top
        if (sy < S * 2 || sy > innerHeight - 20) return
      }
      // Near the end of the headline the button is where it's going anyway, so it counts as close.
      const d = Math.hypot(p.stand.x - rx, p.stand.y - ry) * (p.kind === 'cta' ? 0.4 : 1)
      if (d < bestD) {
        best = i
        bestD = d
      }
    })
    return best
  }
  const pickAway = (): number => {
    // Somewhere else on the headline, near enough to follow.
    const here = at
    let best = -1
    let bestCost = 1e9
    path.forEach((p, i) => {
      if (p === here || p.kind !== 'word' || p.covers) return
      const d = Math.hypot(p.stand.x - rx, p.stand.y - ry)
      const cost = Math.abs(d - S * 5) + p.stand.cost * S * 0.6 + Math.random() * S
      if (cost < bestCost) {
        best = i
        bestCost = cost
      }
    })
    return best
  }

  hit.addEventListener('click', poke, { signal })
  window.addEventListener(
    'pointermove',
    e => {
      if (e.pointerType === 'touch') return
      const r = stage.getBoundingClientRect()
      pointer = { x: e.clientX - r.left, y: e.clientY - r.top, at: time }
    },
    { signal, passive: true },
  )
  window.addEventListener(
    'pointerdown',
    e => {
      const r = stage.getBoundingClientRect()
      pointer = { x: e.clientX - r.left, y: e.clientY - r.top, at: time }
    },
    { signal, passive: true },
  )

  // ---------------------------------------------------------------------------------------------- feathers and squawks
  const sprites = makeFeatherSprites(S)
  const spawnFeather = (i: number) => {
    if (feathers.length > 4) return
    const src = sprites[i % sprites.length]
    const el = document.createElement('canvas')
    el.className = 'hp-feather'
    el.width = src.width
    el.height = src.height
    el.getContext('2d')!.drawImage(src, 0, 0)
    const w = src.width / 2
    el.style.width = `${w}px`
    fx.append(el)
    const pos = bird.bonePos('chest')
    const sx = win.x + pos[0] * S
    const sy = win.y - pos[1] * S
    feathers.push({ el, x: sx + (Math.random() - 0.5) * S * 0.4, y: sy, vx: (i ? -1 : 1) * (28 + Math.random() * 30), vy: -46 - Math.random() * 40, t: 0, life: 3.4 + Math.random() * 1.1, ph: Math.random() * 6, spin: Math.random() < 0.5 ? -1 : 1 })
  }
  const stepFeathers = (dt: number) => {
    for (let i = feathers.length - 1; i >= 0; i--) {
      const f = feathers[i]
      f.t += dt
      f.vy += (34 - f.vy * 1.0) * dt * 1.4
      f.vx *= 1 - dt * 1.3
      const sway = Math.sin(f.t * 2.3 + f.ph)
      f.x += (f.vx + sway * 34) * dt
      f.y += f.vy * dt
      const rot = f.spin * 0.5 + sway * 0.75
      const fl = Math.cos(f.t * 2.3 + f.ph) * 44
      const a = clamp((f.life - f.t) / 0.9)
      f.el.style.opacity = a.toFixed(3)
      f.el.style.transform = `translate(${f.x.toFixed(1)}px,${f.y.toFixed(1)}px) rotate(${rot.toFixed(3)}rad) rotateY(${fl.toFixed(1)}deg)`
      if (f.t > f.life) {
        f.el.remove()
        feathers.splice(i, 1)
      }
    }
  }
  const squawkLines = () => {
    const tip = bird.billTip()
    const sx = win.x + tip[0] * S
    const sy = win.y - tip[1] * S
    const NS = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(NS, 'svg')
    svg.setAttribute('class', 'hp-squawk')
    svg.setAttribute('width', '1')
    svg.setAttribute('height', '1')
    const dir = bird.yaw > 0 ? 1 : -1
    const L = S * 0.42
    ;[-0.55, 0, 0.55].forEach((a, i) => {
      const line = document.createElementNS(NS, 'path')
      const ang = a - 0.08
      const cx = Math.cos(ang) * dir, cy = Math.sin(ang)
      const start = S * 0.14
      line.setAttribute('d', `M${cx * start} ${cy * start} L${cx * (start + L)} ${cy * (start + L)}`)
      line.setAttribute('stroke', '#fa2a6f')
      line.setAttribute('stroke-width', String(Math.max(3, S * 0.05)))
      line.setAttribute('stroke-linecap', 'round')
      line.setAttribute('fill', 'none')
      svg.append(line)
      line.animate(
        [
          { strokeDasharray: `0 ${L * 2}`, strokeDashoffset: 0, opacity: 1 },
          { strokeDasharray: `${L} ${L * 2}`, strokeDashoffset: 0, opacity: 1, offset: 0.45 },
          { strokeDasharray: `${L * 0.2} ${L * 2}`, strokeDashoffset: -L * 0.9, opacity: 0.9 },
        ],
        { duration: 380, delay: i * 18, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both' },
      )
    })
    svg.style.transform = `translate(${sx}px,${sy}px)`
    fx.append(svg)
    setTimeout(() => svg.remove(), 520)
  }

  // ---------------------------------------------------------------------------------------------- scroll to route
  const scrollTarget = (p: number) => {
    const n = path.length
    if (n <= 1) return 0
    if (!page.phone) {
      // The pinned scene: the route spreads over the scroll, with the last stretch for the flight to the button.
      const a = 0.02
      const b = 0.86
      const k = (p - a) / (b - a)
      return clamp(Math.floor(k * (n - 1) + 0.5), 0, n - 1)
    }
    // The phone: the bird works down the column as the words pass the middle of the screen.
    const r = stage.getBoundingClientRect()
    const focus = innerHeight * 0.44 - r.top
    let i = 0
    for (let k = 0; k < n; k++) if (path[k].stand.y < focus) i = k
    const c = page.ctaRect
    if (c.y + c.h + r.top < innerHeight - 30) i = n - 1
    return i
  }

  // ---------------------------------------------------------------------------------------------- reduced motion
  const composed = () => {
    if (!path.length) return
    snapTo(path[0])
    visible = true
    arrived = true
    canvas.classList.add('is-on')
    bird.idleT = 0.7
  }

  // ---------------------------------------------------------------------------------------------- the frame
  const frame = (p: number, rawDt: number) => {
    if (frozen) return
    step(p, rawDt)
  }

  const step = (p: number, dt: number) => {
    time += dt
    for (let i = timers.length - 1; i >= 0; i--) {
      if (timers[i].at <= time) {
        const fn = timers[i].fn
        timers.splice(i, 1)
        fn()
      }
    }
    const r = stage.getBoundingClientRect()
    const sectionTop = ctx.section.getBoundingClientRect().top
    const vh = innerHeight

    // Scrolling back above the section lets the arrival play again.
    if (arrived && sectionTop > vh * 1.02 && !ctx.reduce) {
      arrived = false
      visible = false
      canvas.classList.remove('is-on')
      boatTarget = 0
      index = 0
      at = null
      move = null
    }

    if (ctx.reduce) {
      if (!arrived) composed()
    } else if (!arrived) {
      const first = path[0]
      const trigger = page.phone ? sectionTop + first.stand.y < vh * 0.82 : sectionTop < vh * 0.62
      if (trigger) {
        // In from the hero's edge, from behind it.
        arrived = true
        visible = true
        wantIndex = scrollTarget(p)
        index = wantIndex
        const to = path[index]
        if (to.kind !== 'word') boatTarget = 1
        const hb = hero ? hero.getBoundingClientRect().bottom - r.top : -S * 3
        const viewTop = -r.top
        const fromRight = rtl ? 0.26 : 0.74
        const ex = stage.clientWidth * fromRight
        const heroOnScreen = hb > viewTop - S
        const ey = heroOnScreen ? hb - S * 1.3 : viewTop - S * 3.2
        flyTo(to, { x: ex, y: ey, z: heroOnScreen ? 2.4 : 1.2 })
        clipActive = heroOnScreen
        canvas.classList.add('is-on')
      }
    }

    if (arrived && !ctx.reduce) {
      wantIndex = scrollTarget(p)
      if (!move && time >= busyUntil && at && dwell > 0.12) {
        if (wantIndex !== index) {
          parked = false
          const delta = wantIndex - index
          // A fast scroll goes straight there.
          if (Math.abs(delta) > 3) goStep(wantIndex)
          else goStep(index + Math.sign(delta))
        } else if (parked && dwell > 7 && !path[index].covers && at !== path[index]) {
          // A while after being chased off, it comes back to where the scroll wants it.
          parked = false
          const to = path[index]
          const d = Math.hypot(to.stand.x - rx, to.stand.y - ry)
          if (d > S * HOP_MAX) flyTo(to)
          else hopTo(to)
        } else if (!parked && at.covers && dwell > 3.4) {
          // Standing in front of the line above: don't stay there long. Find somewhere clear nearby and wait there.
          const near = nearestClear()
          if (near >= 0) {
            parked = true
            const to = path[near]
            const d = Math.hypot(to.stand.x - rx, to.stand.y - ry)
            if (d > S * HOP_MAX) flyTo(to)
            else hopTo(to)
          }
        } else if (pendingPokeMove && time >= pendingPokeMove) {
          pendingPokeMove = 0
          const i = pickAway()
          if (i >= 0) {
            parked = true
            // The poke's detour: stays on the route, so the next scroll carries on from here.
            const to = path[i]
            const dist = Math.hypot(to.stand.x - rx, to.stand.y - ry)
            if (dist > S * HOP_MAX) flyTo(to)
            else hopTo(to)
          }
        }
      }
    }

    // Boat.
    if (boatP !== boatTarget) {
      boatP = boatTarget > boatP ? Math.min(boatTarget, boatP + dt / 0.95) : Math.max(boatTarget, boatP - dt / 0.8)
      mark.set(boatP)
    }
    const bd = boatDy.step(0, dt)
    const flip = rtl ? ' scaleX(-1)' : ''
    if (Math.abs(bd) > 0.02) {
      mark.el.style.transform = `translateY(${bd.toFixed(2)}px) rotate(${(bd * 0.004 * (rtl ? -1 : 1)).toFixed(4)}rad)${flip}`
    } else if (mark.el.style.transform && !rtl) {
      mark.el.style.transform = ''
    } else if (rtl) {
      mark.el.style.transform = 'scaleX(-1)'
    }

    // The button bends under the taps.
    const press = ctaPress.step(0, dt)
    if (Math.abs(press) > 0.02) cta.style.transform = `translateY(${(press * 0.16).toFixed(2)}px) scale(${(1 - press * 0.0016).toFixed(4)})`
    else if (cta.style.transform) cta.style.transform = ''

    page.stepWords(dt)
    updateMove(dt)
    if (!ctx.reduce) brain()
    else {
      if (pointer) {
        const dir = clamp((pointer.x - rx) / (stage.clientWidth * 0.5), -1, 1)
        const dirY = clamp((ry - S - pointer.y) / (vh * 0.6), -1, 1)
        bird.tiltTarget = dir * 0.26 * (bird.yaw > 0 ? 1 : -1) + dirY * 0.1
      }
      bird.headTilt.freq = 0.35
      bird.headTilt.damp = 1
      bird.idleT = 0.7
    }

    if (!visible) return

    // The canvas follows the bird, snapped so that it never resamples. While the bird stands still, the canvas doesn't move.
    const dpr = devicePixelRatio || 1
    const wantX = rx
    const wantY = ry - S * 1.0
    win.x = Math.round(wantX * dpr) / dpr
    win.y = Math.round(wantY * dpr) / dpr
    const size = R.cssSize
    if (win.x !== win.tx || win.y !== win.ty) {
      win.tx = win.x
      win.ty = win.y
      canvas.style.transform = `translate(${(win.x - size / 2).toFixed(2)}px,${(win.y - size / 2).toFixed(2)}px)`
    }
    // Comes out from behind the hero's edge.
    if (clipActive) {
      const hb = hero ? hero.getBoundingClientRect().bottom - r.top : -1e9
      const top = hb - (win.y - size / 2)
      if (move && move.kind === 'fly' && ry - S * 1.6 < hb) canvas.style.clipPath = `inset(${Math.max(0, top).toFixed(1)}px 0 0 0)`
      else {
        canvas.style.clipPath = ''
        clipActive = false
      }
    }

    // Feet follow a word that's bending under the bird.
    const w = at?.word
    const bend = w && groundWeight > 0.5 ? (x: number) => w.dy + (x - (w.x0 + w.x1) / 2) * w.rot : () => 0
    const boatBend = at?.kind === 'boat' ? bd : 0
    const ctaBend = at?.kind === 'cta' ? press * 0.16 : 0
    const extra = boatBend + ctaBend
    const toX = (x: number) => (x - win.x) / S
    const toY = (y: number) => (win.y - y) / S
    bird.pos = [toX(rx), toY(ry + bend(rx) * 0.8 + extra), rz]
    bird.plantL = [toX(plant.xL), toY(plant.yL + bend(plant.xL) + extra) + 0.05, plant.zL]
    bird.plantR = [toX(plant.xR), toY(plant.yR + bend(plant.xR) + extra) + 0.05, plant.zR]

    // Where to look.
    updateLook()

    // The page's own movement shakes the crest a little.
    const sNow = scrollY
    const v = dt > 0 ? (sNow - lastScroll) / dt : 0
    lastScroll = sNow
    const acc = clamp((v - lastScrollV) * 0.02, -60, 60)
    lastScrollV = v
    if (page.phone) {
      bird.externalKick(acc / S)
      // A hard fling widens its eyes a little.
      if (time > lastPoke + 1) bird.wideTarget = clamp(Math.abs(v) / 3200) * 0.6
    }

    bird.update(dt)

    // Reduced motion: nothing moves but a slow tilt, so don't draw once it has settled.
    if (ctx.reduce) {
      const settled = Math.abs(bird.headTilt.x - bird.tiltTarget) < 0.002 && Math.abs(bird.headTilt.v) < 0.002
      stillFrames = settled ? stillFrames + 1 : 0
      if (stillFrames > 30) return
    }

    // The shadow falls on the page behind the bird: nearly under it when perched, away and softer when it's high.
    const lift = clamp(rz * 0.25 + (groundWeight < 0.5 ? 0.5 : 0))
    const off = lerp(0.016, 0.075, lift)
    const blobs: [number, number, number][] = []
    const blobA = groundWeight
    if (blobA > 0.01) {
      const u = (sx: number) => (sx - (win.x - size / 2)) / size
      const v_ = (sy: number) => 1 - (sy - (win.y - size / 2)) / size
      const rad = (S * 0.34) / size
      blobs.push([u(plant.xL), v_(plant.yL + bend(plant.xL) + extra), rad], [u(plant.xR), v_(plant.yR + bend(plant.xR) + extra), rad], [u(rx), v_(ry + bend(rx) + extra), rad * 1.9])
    }
    const center: Vec3 = [bird.pos[0], bird.pos[1] + 1, bird.pos[2]]
    R.render({
      skin: bird.sk.skin,
      open: bird.open,
      scale: S,
      center,
      eyes: bird.eyes,
      shadow: { offset: [off * 0.75, -off], alpha: lerp(0.13, 0.1, lift), blur: lerp(0.62, 2.2, lift), blobs, blobAlpha: 0.34 * blobA },
    })

    // The button over the bird: only where the bird is.
    const hh = bird.bonePos('neck1')
    const hx = win.x + hh[0] * S
    const hy = win.y - hh[1] * S
    const hw = S * 1.5
    const hhh = S * 1.95
    hit.style.width = `${hw}px`
    hit.style.height = `${hhh}px`
    hit.style.transform = `translate(${(hx - hw / 2).toFixed(1)}px,${(hy - hhh * 0.46).toFixed(1)}px)`

    stepFeathers(dt)
  }

  const updateMove = (dt: number) => {
    if (!move) {
      groundWeight = Math.min(1, groundWeight + dt * 8)
      dwell += dt
      return
    }
    move.t += dt
    if (move.kind === 'hop') {
      const m = move
      const e = m.t - m.lift
      if (e < 0) {
        groundWeight = 1
      } else if (e < m.air) {
        groundWeight = Math.max(0, groundWeight - dt * 20)
        bird.ikTarget = 0
        bird.ikRate = 13
        const s = e / m.air
        rx = lerp(m.x0, m.to.stand.x, s)
        ry = lerp(m.y0, m.to.stand.y, s) - m.height * 4 * s * (1 - s)
        if (at && at.word) at = null
        bird.yaw = m.yaw0 + angleDelta(m.yaw0, m.yaw1) * smooth(0, 0.8, s)
        // The body follows the arc: nose up leaving, nose down arriving.
        bird.pitch = clamp((1 - 2 * s) * 0.34 * clamp(m.height / (S * 0.9)), -0.4, 0.4) * smooth(0, 0.3, s) * (1 - smooth(0.72, 1, s))
        if (s > 0.8 && !m.planted) {
          m.planted = true
          setPlant(m.to, m.yaw1)
          bird.ikTarget = 1
          bird.ikRate = 24
        }
      } else if (!m.landed) {
        m.landed = true
        rx = m.to.stand.x
        ry = m.to.stand.y
        bird.yaw = m.yaw1
        bird.pitch = 0
        if (!m.planted) setPlant(m.to, m.yaw1)
        bird.ikTarget = 1
        bird.ikRate = 40
        onLanded(m.to, clamp(0.55 + Math.hypot(m.x0 - rx, m.y0 - ry) / (S * 9), 0.5, 1.1))
      } else {
        groundWeight = Math.min(1, groundWeight + dt * 10)
        if (e > m.air + 0.2) {
          const to = m.to
          move = null
          arriveActions(to)
        }
      }
      return
    }
    // A flight.
    const m = move
    const e = m.t - m.lift
    const landClip = bird.clips.get('land')!
    const contact = landClip.events.contact / FPS
    if (e < 0) {
      groundWeight = 1
      return
    }
    if (!m.started) {
      m.started = true
      bird.ikTarget = 0
      bird.ikRate = 16
      if (at) at = null
    }
    if (e < m.air) {
      groundWeight = Math.max(0, groundWeight - dt * 12)
      const u = e / m.air
      // Quick off the mark, easing into the landing.
      const s = u * u * (3 - 2 * u) * 0.35 + (1 - (1 - u) * (1 - u)) * 0.65
      const prevX = rx
      const prevY = ry
      const [x, y] = bez(m.p, s)
      rx = x
      ry = y
      if (m.entering) rz = lerp(m.z0, 0, smooth(0, 0.85, u))
      const vx = (rx - prevX) / Math.max(dt, 1e-3) / S
      const vy = (prevY - ry) / Math.max(dt, 1e-3) / S
      // Banking and climbing, fading out as it reaches the perch.
      const blend = 1 - smooth(0.8, 1.0, u)
      const speed = Math.hypot(vx, vy)
      const climb = speed > 0.1 ? Math.atan2(vy, Math.abs(vx) + 2) : 0
      bird.pitch += (clamp(climb * 0.9, -0.5, 0.6) * blend - bird.pitch) * Math.min(1, dt * 9)
      const bank = clamp(-vx * 0.03, -0.35, 0.35) * blend
      bird.roll += (bank - bird.roll) * Math.min(1, dt * 7)
      // Faces the way it's going, then turns on the approach so that it arrives already facing the way it will stand.
      const turnFrom = 0.7
      if (u < turnFrom) {
        bird.yaw += angleDelta(bird.yaw, m.yaw1) * Math.min(1, dt * 6)
      } else {
        if (m.yawApproach === null) m.yawApproach = bird.yaw
        const end = m.to.face * m.to.yaw
        bird.yaw = m.yawApproach + angleDelta(m.yawApproach, end) * smooth(turnFrom, 0.97, u)
      }
      // Clip changes.
      const remain = m.air - e
      if (m.clipState === 'takeoff' && e > bird.clips.get('takeoff')!.duration - m.lift - 0.04) {
        m.clipState = 'flap'
        bird.play('flap', { fade: 0.08, rate: 1 })
      }
      if (m.clipState === 'flap' && remain > contact + 0.38 && m.air > 1.1 && e > 0.75 && s > 0.55) {
        m.clipState = 'glide'
        bird.play('glide', { fade: 0.22 })
      }
      if (m.clipState !== 'land' && remain <= contact) {
        m.clipState = 'land'
        bird.play('land', { fade: 0.1, autoOut: 0.28 })
      }
      if (remain < 0.14 && !m.planted) {
        m.planted = true
        setPlant(m.to, m.to.face * m.to.yaw)
        bird.ikTarget = 1
        bird.ikRate = 12
      }
    } else if (!m.landed) {
      m.landed = true
      rx = m.to.stand.x
      ry = m.to.stand.y
      rz = 0
      bird.pitch = bird.roll = 0
      bird.yaw = m.to.face * m.to.yaw
      setPlant(m.to, bird.yaw)
      bird.ikTarget = 1
      bird.ikRate = 40
      onLanded(m.to, 1.2)
      bird.wideTarget = 0
    } else {
      groundWeight = Math.min(1, groundWeight + dt * 10)
      if (e > m.air + 0.45) {
        const to = m.to
        move = null
        arriveActions(to)
      }
    }
  }

  const updateLook = () => {
    let target: Vec3 | null = null
    let amount = 1
    const birdBusy = !!move || time < busyUntil
    const fresh = pointer && time - pointer.at < 0.8
    if (glance && time < glance.until && !fresh) {
      target = glance.target
    } else if (pointer && time - pointer.at < 3.5 && !ctx.touch) {
      const px = (pointer.x - win.x) / S
      const py = (win.y - pointer.y) / S
      target = [px, py, 2.6]
    } else if (pointer && ctx.touch && time - pointer.at < 1.4) {
      target = [(pointer.x - win.x) / S, (win.y - pointer.y) / S, 2.6]
    }
    if (ctx.reduce) amount = 0.32
    if (birdBusy && !ctx.reduce) amount = move ? 0.0 : 0.15
    bird.lookTarget = target
    bird.lookAmount = target ? amount : 0
  }

  const brain = () => {
    if (!at || move) return
    if (time > nextBlink) {
      bird.triggerBlink(Math.random() < 0.18)
      nextBlink = time + 1.6 + Math.random() * 3.6
    }
    if (tiltUntil && time > tiltUntil) {
      bird.tiltTarget = 0
      tiltUntil = 0
    }
    if (glance && time > glance.until) glance = null
    if (time < busyUntil) return
    if (time > nextGesture && dwell > 0.8) {
      const idlePointer = !pointer || time - pointer.at > 2.0
      const roll = Math.random()
      const yawSign = bird.yaw > 0 ? 1 : -1
      if (at.kind === 'cta' && roll < 0.2) {
        doTap()
      } else if (roll < 0.34) {
        // A curious tilt.
        bird.tiltTarget = (Math.random() < 0.5 ? -1 : 1) * (0.22 + Math.random() * 0.2)
        tiltUntil = time + 1.0 + Math.random() * 1.1
        if (Math.random() < 0.6) bird.browUpTarget = 0.5
        setTimeoutFrames(1.2, () => (bird.browUpTarget = 0))
      } else if (roll < 0.58) {
        bird.play(Math.random() < 0.5 ? 'shift_l' : 'shift_r', { fade: 0.2, autoOut: 0.3 })
      } else if (roll < 0.76 && idlePointer) {
        // Turn and look out of the page at the visitor.
        glance = { until: time + 1.4 + Math.random() * 1.2, target: [yawSign * 3.2, 1.6, 12] }
        bird.triggerBlink()
      } else if (roll < 0.88 && idlePointer && dwell > 5) {
        const clip = bird.clips.get('preen')!
        bird.play('preen', { fade: 0.2, autoOut: 0.28 })
        busyUntil = time + clip.duration - 0.3
      } else if (roll < 0.94) {
        bird.overlay('fan')
      } else {
        const clip = bird.clips.get('shake')!
        bird.play('shake', { fade: 0.08, autoOut: 0.2 })
        bird.overlay('fan')
        busyUntil = time + clip.duration - 0.3
      }
      nextGesture = time + 2.2 + Math.random() * 3.8
    }
    // Turn to face a pointer that's been behind it for a while.
    if (pointer && !ctx.touch && time - pointer.at < 1.5 && time - lastPivot > 4.5) {
      const dx = pointer.x - rx
      const face = bird.yaw > 0 ? 1 : -1
      if (dx * face < -S * 2.4 && dwell > 1.2) {
        lastPivot = time
        // A little hop on the spot to turn around.
        const here = at
        const flipped: Perch = { ...here, face: face > 0 ? -1 : 1 }
        // Re-find the stand for the new yaw so the feet stay on ink.
        if (here.word) {
          flipped.stand = page.standOn(here.word, S, flipped.face * YAW, here.stand.x)
          flipped.covers = coverAt(flipped.stand.x, flipped.stand.y, flipped.face, flipped.yaw)
        }
        hopTurn(flipped)
      }
    }
  }

  const hopTurn = (to: Perch) => {
    const lift = bird.clips.get('hop')!.events.lift / FPS
    const land = bird.clips.get('hop')!.events.land / FPS
    const air = 0.22
    const k = (land - lift) / air
    bird.play('hop', { fade: 0.06, warp: tt => (tt < lift ? tt : tt < lift + air ? lift + (tt - lift) * k : land + (tt - lift - air)), autoOut: 0.25 })
    move = { kind: 'hop', t: 0, lift, air, x0: rx, y0: ry, to, height: S * 0.32, yaw0: bird.yaw, yaw1: to.face * to.yaw, landed: false, planted: false }
    // Keep the route's perch, with the new way of facing.
    const i = path.indexOf(at!)
    if (i >= 0) {
      path[i] = to
    }
  }

  // ---------------------------------------------------------------------------------------------- resizing
  let resizeTimer = 0
  let pinnedNow = !phoneAtStart
  const relayout = () => {
    const wasIndex = path.indexOf(at!)
    // Crossing the phone breakpoint swaps the pinned scene for the tall column.
    const phoneNow = innerWidth < 760
    if (phoneNow && pinnedNow) {
      ctx.section.style.removeProperty('height')
      stage.classList.remove('is-pinned')
      pinnedNow = false
    } else if (!phoneNow && !pinnedNow) {
      ctx.pin(ctx.reduce ? 0 : PIN)
      pinnedNow = true
    }
    page.layout()
    page.measure()
    const s2 = birdScale()
    if (s2 !== S) {
      S = s2
      R.resize(winSize())
    }
    stillFrames = 0
    buildPath()
    index = Math.min(path.length - 1, Math.max(0, wasIndex >= 0 ? wasIndex : index))
    if (arrived) snapTo(path[index])
    win.tx = win.ty = -1e9
  }
  lateFonts = () => {
    if (!signal.aborted) relayout()
  }
  const ro = new ResizeObserver(() => {
    clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(relayout, 90)
  })
  ro.observe(stage)

  ctx.frame(frame)

  // Debug hooks for development captures only.
  if (import.meta.env.DEV) {
    const dbg = {
      bird, page, path: () => path, freeze: (on: boolean) => (frozen = on), tick: (p: number, dt: number) => step(p, dt), poke,
      state: () => ({ rx, ry, rz, at: at?.kind, word: at?.word?.text, index, wantIndex, move: move?.kind, F: page.fontSize, S, lines: page.lines.length }),
    }
    ;(window as unknown as { __hoopoe: typeof dbg }).__hoopoe = dbg
  }

  return () => {
    clearTimeout(resizeTimer)
    ro.disconnect()
    for (const f of feathers) f.el.remove()
    R.dispose()
    canvas.remove()
    hit.remove()
    fx.remove()
    atlas.close()
    cta.classList.remove('hp-rung')
    page.restore()
  }
}

/** Loose feathers, drawn as feathers: a curved quill, a soft uneven vane, fine barbs and a split or two. Sized for 2x. */
function makeFeatherSprites(S: number) {
  const make = (stops: [number, string][], seed: number) => {
    const L = Math.round(S * 0.62 * 2)
    const W = Math.round(L * 0.34)
    const c = document.createElement('canvas')
    c.width = W
    c.height = L
    const g = c.getContext('2d')!
    let n = seed
    const rnd = () => (n = (n * 16807) % 2147483647) / 2147483647
    const cx = W * 0.5
    const bend = W * 0.14
    // The shaft, as a function of how far along it from the quill (0) to the tip (1).
    const sx = (t: number) => cx + bend * (t * t - t) * 2.2
    const sy = (t: number) => L * (0.985 - 0.97 * t)
    const vane = new Path2D()
    vane.moveTo(sx(0.17), sy(0.17))
    vane.bezierCurveTo(W * 0.02, sy(0.3), W * 0.03, sy(0.78), sx(1), sy(1))
    vane.bezierCurveTo(W * 0.95, sy(0.8), W * 0.99, sy(0.34), sx(0.17), sy(0.17))
    g.save()
    g.clip(vane)
    const grad = g.createLinearGradient(0, sy(0.17), 0, sy(1))
    for (const [p, col] of stops) grad.addColorStop(p, col)
    g.fillStyle = grad
    g.fillRect(0, 0, W, L)
    // Barbs sweep from the shaft toward the tip.
    g.lineWidth = Math.max(0.6, L / 170)
    for (let i = 0; i < 44; i++) {
      const t = 0.17 + (i / 44) * 0.8
      const side = i % 2 ? 1 : -1
      g.strokeStyle = rnd() < 0.5 ? 'rgba(255,245,230,.16)' : 'rgba(50,20,10,.13)'
      g.beginPath()
      g.moveTo(sx(t), sy(t))
      g.quadraticCurveTo(sx(t) + (side * W) / 4, sy(t + 0.05), sx(t) + (side * W) / 1.8, sy(t + 0.16))
      g.stroke()
    }
    // Soft dark at the edge and down the shaft, for a little form.
    const edge = g.createLinearGradient(0, 0, W, 0)
    edge.addColorStop(0, 'rgba(60,20,5,.26)')
    edge.addColorStop(0.3, 'rgba(60,20,5,0)')
    edge.addColorStop(0.7, 'rgba(60,20,5,0)')
    edge.addColorStop(1, 'rgba(60,20,5,.2)')
    g.fillStyle = edge
    g.fillRect(0, 0, W, L)
    // The splits where barbs have come apart.
    g.globalCompositeOperation = 'destination-out'
    for (const [t, side] of [[0.46, -1], [0.66, 1]] as const) {
      const x0 = sx(t) + (side * W) / 2.2
      const y0 = sy(t + 0.12)
      g.beginPath()
      g.moveTo(x0 + side * W * 0.2, y0 - L * 0.015)
      g.lineTo(sx(t) + side * W * 0.16, sy(t))
      g.lineTo(x0 + side * W * 0.2, y0 + L * 0.03)
      g.fill()
    }
    g.restore()
    // The shaft, thin and pale, running out past the vane as the quill.
    g.strokeStyle = 'rgba(247,232,210,.95)'
    g.lineCap = 'round'
    g.lineWidth = Math.max(1, L / 72)
    g.beginPath()
    g.moveTo(sx(0), sy(0))
    for (let t = 0.05; t <= 0.96; t += 0.05) g.lineTo(sx(t), sy(t))
    g.stroke()
    return c
  }
  return [
    make([[0, '#f6c79a'], [0.3, '#ee8c4c'], [1, '#d4602a']], 11),
    make([[0, '#fbe9d0'], [0.45, '#f3b27c'], [1, '#e2763a']], 37),
  ]
}

function mountStill(ctx: AboutCtx, page: Typeset) {
  // No WebGL2: a still of the same bird, standing on the same measured letters.
  const img = new Image()
  img.className = 'hp-still'
  img.alt = ctx.lang === 'ar' ? 'هدهد يقف على العنوان' : 'A hoopoe standing on the headline'
  img.src = `${ctx.base}about/hoopoe/hoopoe-still.webp`
  ctx.mark.set(1)
  const place = () => {
    const S = page.phone ? page.fontSize * 0.84 : page.fontSize * 0.66
    const w = page.words[0]
    const stand = page.standOn(w, S, (ctx.rtl ? -1 : 1) * YAW)
    const size = S * STILL_UNITS
    img.style.width = `${size}px`
    img.style.transform = `translate(${stand.x - size * STILL_FOOT_X}px,${stand.y - size * STILL_FOOT_Y}px) scaleX(${ctx.rtl ? -1 : 1})`
  }
  place()
  ctx.stage.append(img)
  addEventListener(
    'resize',
    () => {
      page.layout()
      page.measure()
      place()
    },
    { signal: ctx.signal },
  )
  return () => {
    img.remove()
    page.restore()
  }
}
const STILL_UNITS = 4
const STILL_FOOT_X = 0.5
const STILL_FOOT_Y = 0.75

