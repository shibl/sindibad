// The drawing kit for the puppets: cut hide, in canvas paths. Everything is a silhouette with holes punched through it, as a
// real khayal al-zill figure is. Pieces are rasterised once into an atlas, at whatever size this screen needs.

export type Pt = [number, number]

export class Pen {
  constructor(readonly c: CanvasRenderingContext2D) {}

  /** Solid hide. alpha below 1 is a thinner, more translucent skin. */
  fill(d: string | Path2D, alpha = 1) {
    const c = this.c
    c.globalCompositeOperation = 'source-over'
    c.fillStyle = `rgba(0,0,0,${alpha})`
    c.fill(typeof d === 'string' ? new Path2D(d) : d, 'nonzero')
  }
  /** Punch a hole. */
  cut(d: string | Path2D) {
    const c = this.c
    c.globalCompositeOperation = 'destination-out'
    c.fillStyle = '#000'
    c.fill(typeof d === 'string' ? new Path2D(d) : d, 'nonzero')
    c.globalCompositeOperation = 'source-over'
  }
  poly(pts: Pt[]) {
    return 'M' + pts.map(p => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join('L') + 'Z'
  }
  dot(x: number, y: number, r: number) {
    const k = 0.5523 * r
    return `M${x + r} ${y}C${x + r} ${y + k} ${x + k} ${y + r} ${x} ${y + r}C${x - k} ${y + r} ${x - r} ${y + k} ${x - r} ${y}C${x - r} ${y - k} ${x - k} ${y - r} ${x} ${y - r}C${x + k} ${y - r} ${x + r} ${y - k} ${x + r} ${y}Z`
  }
  star(x: number, y: number, R: number, n = 8, inner = 0.7654, turn = 0) {
    const pts: Pt[] = []
    for (let i = 0; i < n * 2; i++) {
      const a = turn + (i * Math.PI) / n
      const r = i % 2 ? R * inner : R
      pts.push([x + r * Math.cos(a), y + r * Math.sin(a)])
    }
    return this.poly(pts)
  }
  /** A pointed lens between two points, the classic cut of a leather punch. bow pushes its middle sideways. */
  slit(x0: number, y0: number, x1: number, y1: number, w: number, bow = 0) {
    const dx = x1 - x0
    const dy = y1 - y0
    const l = Math.hypot(dx, dy) || 1
    const nx = -dy / l
    const ny = dx / l
    const mx = (x0 + x1) / 2 + nx * bow
    const my = (y0 + y1) / 2 + ny * bow
    return `M${x0} ${y0}Q${mx + nx * w} ${my + ny * w} ${x1} ${y1}Q${mx - nx * w} ${my - ny * w} ${x0} ${y0}Z`
  }
  /** A teardrop with its point towards angle a. */
  drop(x: number, y: number, R: number, a: number, stretch = 2.2) {
    const ca = Math.cos(a)
    const sa = Math.sin(a)
    const tx = x + ca * R * stretch
    const ty = y + sa * R * stretch
    const nx = -sa * R
    const ny = ca * R
    const bx = x - ca * R
    const by = y - sa * R
    return `M${tx} ${ty}C${x + nx * 0.5 + ca * R * 0.8} ${y + ny * 0.5 + sa * R * 0.8} ${x + nx * 1.05} ${y + ny * 1.05} ${x + nx - ca * R * 0.55} ${y + ny - sa * R * 0.55}Q${bx} ${by} ${x - nx - ca * R * 0.55} ${y - ny - sa * R * 0.55}C${x - nx * 1.05} ${y - ny * 1.05} ${x - nx * 0.5 + ca * R * 0.8} ${y - ny * 0.5 + sa * R * 0.8} ${tx} ${ty}Z`
  }
  /** A tapered bar, for spars, rigging and rods. */
  bar(x0: number, y0: number, x1: number, y1: number, w0: number, w1 = w0) {
    const dx = x1 - x0
    const dy = y1 - y0
    const l = Math.hypot(dx, dy) || 1
    const nx = -dy / l
    const ny = dx / l
    return this.poly([
      [x0 + (nx * w0) / 2, y0 + (ny * w0) / 2],
      [x1 + (nx * w1) / 2, y1 + (ny * w1) / 2],
      [x1 - (nx * w1) / 2, y1 - (ny * w1) / 2],
      [x0 - (nx * w0) / 2, y0 - (ny * w0) / 2],
    ])
  }
  /** A pivot: the visible rivet where one piece hangs from another. */
  rivet(x: number, y: number, r = 3.4) {
    this.fill(this.dot(x, y, r + 1.6))
    this.cut(ring(this, x, y, r, r - 1.1))
  }
}

export const ring = (p: Pen, x: number, y: number, r0: number, r1: number) => {
  // Two opposite circles make a hole only under evenodd, so build the annulus from slits around the circle.
  const n = 8
  let d = ''
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2 + 0.1
    const a1 = ((i + 0.78) / n) * Math.PI * 2 + 0.1
    const m = (r0 + r1) / 2
    d += p.slit(x + m * Math.cos(a0), y + m * Math.sin(a0), x + m * Math.cos(a1), y + m * Math.sin(a1), (r0 - r1) * 0.95, -m * 0.19)
  }
  return d
}

/** A chain of cubic Bezier segments with an arc length table, so ornament can be spaced evenly along a line. */
export class Curve {
  private pts: Pt[] = []
  private lens: number[] = [0]
  constructor(cp: Pt[], steps = 24) {
    for (let s = 0; s + 3 < cp.length; s += 3) {
      const [a, b, c, d] = [cp[s], cp[s + 1], cp[s + 2], cp[s + 3]]
      for (let i = s === 0 ? 0 : 1; i <= steps; i++) {
        const t = i / steps
        const u = 1 - t
        const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t]
        this.pts.push([w[0] * a[0] + w[1] * b[0] + w[2] * c[0] + w[3] * d[0], w[0] * a[1] + w[1] * b[1] + w[2] * c[1] + w[3] * d[1]])
      }
    }
    for (let i = 1; i < this.pts.length; i++) {
      this.lens.push(this.lens[i - 1] + Math.hypot(this.pts[i][0] - this.pts[i - 1][0], this.pts[i][1] - this.pts[i - 1][1]))
    }
  }
  get length() {
    return this.lens[this.lens.length - 1]
  }
  /** Position and tangent angle, t from 0 to 1 by arc length. off pushes along the normal. */
  at(t: number, off = 0) {
    const target = Math.max(0, Math.min(1, t)) * this.length
    let i = 1
    while (i < this.lens.length - 1 && this.lens[i] < target) i++
    const span = this.lens[i] - this.lens[i - 1] || 1
    const f = (target - this.lens[i - 1]) / span
    const a = this.pts[i - 1]
    const b = this.pts[i]
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0])
    return {
      x: a[0] + (b[0] - a[0]) * f - Math.sin(ang) * off,
      y: a[1] + (b[1] - a[1]) * f + Math.cos(ang) * off,
      a: ang,
    }
  }
  /** Long cuts following the line, broken into strakes with little bridges of hide. */
  dashes(p: Pen, n: number, off: number, w: number, from = 0, to = 1, gap = 0.12) {
    let d = ''
    for (let i = 0; i < n; i++) {
      const t0 = from + ((to - from) * (i + gap / 2)) / n
      const t1 = from + ((to - from) * (i + 1 - gap / 2)) / n
      const a = this.at(t0, off)
      const b = this.at(t1, off)
      const m = this.at((t0 + t1) / 2, off)
      const bx = m.x - (a.x + b.x) / 2
      const by = m.y - (a.y + b.y) / 2
      const l = Math.hypot(b.x - a.x, b.y - a.y) || 1
      const bow = (bx * -(b.y - a.y) + by * (b.x - a.x)) / l
      d += p.slit(a.x, a.y, b.x, b.y, w, bow)
    }
    return d
  }
  /** Put something at n even points along the line. */
  each(n: number, off: number, fn: (x: number, y: number, a: number, i: number) => void, from = 0, to = 1) {
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? (from + to) / 2 : from + ((to - from) * i) / (n - 1)
      const q = this.at(t, off)
      fn(q.x, q.y, q.a, i)
    }
  }
}

export type Piece = {
  name: string
  x: number
  y: number
  w: number
  h: number
  /** Atlas texels per design unit. */
  res: number
  draw: (p: Pen) => void
  uv?: [number, number, number, number]
}

/** Packs pieces onto one canvas with a simple shelf, and returns the canvas plus each piece's uv. Yields as it draws, so scrolling stays smooth. */
export async function buildAtlas(pieces: Piece[], size: number, scale: number) {
  const pad = 10
  const canvas = document.createElement('canvas')
  // First a dry run, to scale everything to fit.
  const order = [...pieces].sort((a, b) => b.h * b.res - a.h * a.res)
  const fits = (s: number) => {
    let x = pad
    let y = pad
    let shelf = 0
    for (const q of order) {
      const w = Math.ceil(q.w * q.res * s) + pad
      const h = Math.ceil(q.h * q.res * s) + pad
      if (x + w > size) {
        x = pad
        y += shelf
        shelf = 0
      }
      if (y + h > size) return false
      x += w
      shelf = Math.max(shelf, h)
    }
    return true
  }
  let s = scale
  while (!fits(s) && s > 0.2) s *= 0.95
  let used = 0
  {
    let x = pad
    let y = pad
    let shelf = 0
    for (const q of order) {
      const w = Math.ceil(q.w * q.res * s) + pad
      const h = Math.ceil(q.h * q.res * s) + pad
      if (x + w > size) {
        x = pad
        y += shelf
        shelf = 0
      }
      ;(q as Piece & { cx: number; cy: number }).cx = x
      ;(q as Piece & { cx: number; cy: number }).cy = y
      x += w
      shelf = Math.max(shelf, h)
      used = y + shelf
    }
  }
  // No taller than it needs to be: this goes to the GPU uncompressed.
  const height = Math.min(size, used + pad)
  canvas.width = size
  canvas.height = height
  const c = canvas.getContext('2d', { willReadFrequently: false })!
  const pen = new Pen(c)
  let slice = performance.now()
  for (const q of order) {
    if (performance.now() - slice > 6) {
      await new Promise(r => setTimeout(r))
      slice = performance.now()
    }
    const { cx, cy } = q as Piece & { cx: number; cy: number }
    const k = q.res * s
    const w = q.w * k
    const h = q.h * k
    c.save()
    c.beginPath()
    c.rect(cx - 1, cy - 1, w + 2, h + 2)
    c.clip()
    // Pieces are authored y down. The GL map is y up and uses this canvas without a flip, so keep the row order and flip in uv.
    c.setTransform(k, 0, 0, k, cx - q.x * k, cy - q.y * k)
    q.draw(pen)
    c.restore()
    c.setTransform(1, 0, 0, 1, 0, 0)
    q.uv = [cx / size, cy / height, (cx + w) / size, (cy + h) / height]
  }
  return { canvas, used, scale: s }
}

// A tiny affine kit: [a, b, c, d, e, f] maps (x, y) to (a x + b y + e, c x + d y + f)
export type M = [number, number, number, number, number, number]
export const T = (x: number, y: number): M => [1, 0, 0, 1, x, y]
export const R = (a: number): M => {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [c, -s, s, c, 0, 0]
}
export const Sc = (x: number, y = x): M => [x, 0, 0, y, 0, 0]
export const mul = (m: M, n: M): M => [
  m[0] * n[0] + m[1] * n[2],
  m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2],
  m[2] * n[1] + m[3] * n[3],
  m[0] * n[4] + m[1] * n[5] + m[4],
  m[2] * n[4] + m[3] * n[5] + m[5],
]
/** Rotate by a about the point (x, y). */
export const about = (x: number, y: number, a: number): M => mul(mul(T(x, y), R(a)), T(-x, -y))
export const chain = (...ms: M[]): M => ms.reduce(mul)
