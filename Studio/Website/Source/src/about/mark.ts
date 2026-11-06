// The pink mark: four whole shapes (sun, sail, hull, wave) in a strip that slide together into a small boat.
// Original to Sindibad, replacing the reference site's union-pink.svg in the About section.
import type { AboutMark } from './types'

const NS = 'http://www.w3.org/2000/svg'
const PINK = '#fa2a6f'

type Pose = { x: number; y: number; s: number; sy?: number }
type Piece = { strip: Pose; boat: Pose; delay: number; build: (g: SVGGElement) => void }

const shape = (g: SVGGElement, tag: string, attrs: Record<string, string>) => {
  const el = document.createElementNS(NS, tag)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  g.append(el)
}
const solid = { fill: PINK, stroke: PINK, 'stroke-width': '2', 'stroke-linejoin': 'round' }

const PIECES: Piece[] = [
  {
    // Sun
    strip: { x: 10, y: 25, s: 1 },
    boat: { x: 47, y: 9, s: 0.6 },
    delay: 0.3,
    build: g => shape(g, 'circle', { r: '8.5', fill: PINK }),
  },
  {
    // A lateen sail, the dhow's curved triangle
    strip: { x: 37, y: 25, s: 1 },
    boat: { x: 24, y: 14, s: 1 },
    delay: 0.14,
    build: g => shape(g, 'path', { d: 'M-9 10.5 L-9 -10.5 C2 -8.5 9 -1 10.5 10.5 Z', ...solid }),
  },
  {
    // The hull, a crescent with no flat edge
    strip: { x: 77, y: 25, s: 1 },
    boat: { x: 23, y: 32, s: 1.02 },
    delay: 0,
    build: g => shape(g, 'path', { d: 'M-17 -6 C-11 1 11 1 17 -6 C16 5 8 9 0 9 C-8 9 -16 5 -17 -6 Z', ...solid }),
  },
  {
    // The wave
    strip: { x: 121, y: 25, s: 1 },
    boat: { x: 23, y: 45, s: 1.2, sy: 0.5 },
    delay: 0.22,
    build: g => shape(g, 'path', { d: 'M-15 2.5 C-10 -6 -5 -6 0 0 S10 6 15 -2.5', fill: 'none', stroke: PINK, 'stroke-width': '5', 'stroke-linecap': 'round' }),
  },
]

// A little overshoot, so the pieces land rather than arrive.
const land = (t: number) => {
  const c = 1.45
  const u = t - 1
  return 1 + (c + 1) * u * u * u + c * u * u
}
const clamp = (v: number) => Math.max(0, Math.min(1, v))

export function createMark(rtl: boolean, reduce: boolean, signal: AbortSignal): AboutMark {
  const el = document.createElementNS(NS, 'svg')
  el.setAttribute('viewBox', '0 0 140 50')
  el.setAttribute('class', 'about-mark')
  el.setAttribute('aria-hidden', 'true')
  // Sail in the reading direction.
  if (rtl) el.style.transform = 'scaleX(-1)'
  const groups = PIECES.map(piece => {
    const g = document.createElementNS(NS, 'g')
    piece.build(g)
    el.append(g)
    return g
  })

  const pose = (p: number) => {
    PIECES.forEach((piece, i) => {
      const t = clamp((p - piece.delay * 0.6) / (1 - 0.3 * 0.6))
      const e = land(t)
      const x = piece.strip.x + (piece.boat.x - piece.strip.x) * e
      const y = piece.strip.y + (piece.boat.y - piece.strip.y) * e
      const s = piece.strip.s + (piece.boat.s - piece.strip.s) * e
      const sy = piece.strip.s + ((piece.boat.sy ?? piece.boat.s) - piece.strip.s) * e
      groups[i].setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s.toFixed(3)} ${sy.toFixed(3)})`)
    })
  }
  pose(0)

  // On its own the mark assembles shortly after it scrolls into view and comes apart when it leaves.
  let manual = false
  let raf = 0
  let current = 0
  let target = 0
  const tick = (last: number) => (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000)
    const step = dt / 1.1
    current = target > current ? Math.min(target, current + step) : Math.max(target, current - step)
    pose(current)
    raf = current === target ? 0 : requestAnimationFrame(tick(now))
  }
  const go = (to: number) => {
    target = to
    if (reduce) {
      current = to
      pose(to)
      return
    }
    if (!raf) raf = requestAnimationFrame(tick(performance.now()))
  }
  let timer = 0
  const seen = new IntersectionObserver(([entry]) => {
    if (manual) return
    clearTimeout(timer)
    if (entry.isIntersecting) timer = window.setTimeout(() => go(1), 450)
    else go(0)
  })
  seen.observe(el)
  signal.addEventListener('abort', () => {
    seen.disconnect()
    clearTimeout(timer)
    cancelAnimationFrame(raf)
  })

  return {
    el,
    set(p) {
      manual = true
      clearTimeout(timer)
      cancelAnimationFrame(raf)
      raf = 0
      current = target = clamp(p)
      pose(current)
    },
  }
}
