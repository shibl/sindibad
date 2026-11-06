// The pages that riffle past on the way to a chapter: two illustrated spreads for each one, cut-paper pictures of that chapter's world.
// Each spread runs across two facing pages. They're drawn at run time so they weigh nothing until they're needed, and the same page
// shows them on the way into a chapter and on the way back. Units are page widths: a spread is 2 wide and 1.36 tall, the gutter at x = 1.
import { ICONS } from '../chapters'

type C = CanvasRenderingContext2D
const W = 2, H = 1.36, TAU = Math.PI * 2

let seed = 7
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647

/** A sheet of cut paper: a filled shape with a soft shadow under it. */
function paper(c: C, fill: string | CanvasGradient, shape: () => void, lift = 0.012) {
  const u = c.getTransform().d
  c.save()
  c.shadowColor = 'rgb(0 22 28 / 0.42)'
  c.shadowBlur = lift * u
  c.shadowOffsetY = lift * 0.5 * u
  c.fillStyle = fill
  c.beginPath()
  shape()
  c.fill('evenodd')
  c.restore()
}
const linearV = (c: C, y0: number, y1: number, stops: [number, string][]) => {
  const g = c.createLinearGradient(0, y0, 0, y1)
  for (const [at, col] of stops) g.addColorStop(at, col)
  return g
}
const glow = (c: C, x: number, y: number, r: number, col: string, a = 1) => {
  const g = c.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, col)
  g.addColorStop(1, col.replace(/\/ [\d.]+\)/, '/ 0)'))
  c.save()
  c.globalAlpha = a
  c.fillStyle = g
  c.fillRect(x - r, y - r, r * 2, r * 2)
  c.restore()
}
/** Light on a dark wall. Added rather than laid over: amber at half strength on teal is olive, and this stays warm. */
function lamp(c: C, x: number, y: number, r: number, col: string) {
  c.save()
  c.globalCompositeOperation = 'screen'
  glow(c, x, y, r, col)
  c.restore()
}
function star(c: C, x: number, y: number, r: number, points = 8, inner = 0.6) {
  for (let i = 0; i < points * 2; i++) {
    const a = (i * Math.PI) / points - Math.PI / 2
    const q = i % 2 ? r * inner : r
    if (i) c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q)
    else c.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q)
  }
  c.closePath()
}
function icon(c: C, d: string, x: number, y: number, size: number, fill: string, turn = 0, flip = 1) {
  c.save()
  c.translate(x, y)
  c.rotate(turn)
  c.scale((size / 100) * flip, size / 100)
  c.translate(-50, -50)
  c.fillStyle = fill
  c.fill(new Path2D(d), 'evenodd')
  c.restore()
}
/** The top edge of a wave: swells with pointed crests that lean the way the sea is going. */
function waveEdge(c: C, y: number, amp: number, n: number, ph: number) {
  const step = (W + 0.1) / n
  c.lineTo(-0.05, y)
  for (let i = 0; i < n; i++) {
    const x = -0.05 + i * step
    const h = amp * (0.72 + 0.4 * Math.sin(i * 2.13 + ph))
    const tip = x + step * 0.74
    c.bezierCurveTo(x + step * 0.3, y + amp * 0.3, x + step * 0.56, y - h * 0.5, tip, y - h)
    c.bezierCurveTo(tip + step * 0.03, y - h * 0.42, x + step * 0.86, y + amp * 0.14, x + step, y)
  }
}
function sea(c: C, fill: string, rim: string, y: number, amp: number, n: number, ph: number) {
  paper(c, fill, () => {
    c.moveTo(-0.05, H + 0.05)
    waveEdge(c, y, amp, n, ph)
    c.lineTo(W + 0.05, H + 0.05)
    c.closePath()
  })
  c.strokeStyle = rim
  c.lineWidth = 0.0042
  c.lineJoin = 'round'
  c.beginPath()
  c.moveTo(-0.05, y)
  waveEdge(c, y, amp, n, ph)
  c.stroke()
}
function dhow(c: C, x: number, y: number, s: number, hull: string, sail: string, mast = hull, stripe?: string) {
  c.save()
  c.translate(x, y)
  c.scale(s, s)
  c.strokeStyle = mast
  c.lineWidth = 0.012
  c.beginPath()
  c.moveTo(0.02, 0)
  c.lineTo(-0.02, -0.56)
  c.stroke()
  const sailShape = () => {
    c.moveTo(-0.08, -0.62)
    c.bezierCurveTo(0.2, -0.5, 0.34, -0.26, 0.36, -0.05)
    c.lineTo(-0.2, -0.05)
    c.bezierCurveTo(-0.13, -0.24, -0.08, -0.44, -0.08, -0.62)
    c.closePath()
  }
  paper(c, sail, sailShape, 0.008)
  if (stripe) {
    c.save()
    c.beginPath()
    sailShape()
    c.clip()
    c.fillStyle = stripe
    c.fillRect(-0.3, -0.17, 0.8, 0.035)
    c.fillRect(-0.3, -0.115, 0.8, 0.018)
    c.restore()
  }
  paper(c, hull, () => {
    c.moveTo(-0.42, -0.05)
    c.bezierCurveTo(-0.2, 0, 0.26, 0, 0.46, -0.1)
    c.bezierCurveTo(0.4, 0.06, 0.22, 0.1, 0.02, 0.1)
    c.bezierCurveTo(-0.2, 0.1, -0.36, 0.06, -0.42, -0.05)
    c.closePath()
  }, 0.008)
  c.restore()
}
function palm(c: C, x: number, y: number, s: number, col: string, lean = 1) {
  c.save()
  c.translate(x, y)
  c.scale(s * lean, s)
  c.fillStyle = col
  c.beginPath()
  c.moveTo(-0.018, 0)
  c.bezierCurveTo(-0.01, -0.2, 0.03, -0.38, 0.09, -0.52)
  c.lineTo(0.112, -0.51)
  c.bezierCurveTo(0.06, -0.36, 0.03, -0.2, 0.024, 0)
  c.closePath()
  c.fill()
  for (const [a, l] of [[-2.9, 0.26], [-2.45, 0.3], [-1.95, 0.27], [-1.4, 0.28], [-0.9, 0.31], [-0.4, 0.3], [0.05, 0.25]] as const) {
    const bx = 0.1 + Math.cos(a) * l, by = -0.52 + Math.sin(a) * l * 0.74 + l * 0.3
    c.beginPath()
    c.moveTo(0.1, -0.52)
    c.quadraticCurveTo(0.1 + Math.cos(a) * l * 0.55, -0.52 + Math.sin(a) * l * 0.8 - 0.035, bx, by)
    c.quadraticCurveTo(0.1 + Math.cos(a) * l * 0.5, -0.52 + Math.sin(a) * l * 0.5 + 0.03, 0.1, -0.52)
    c.fill()
  }
  c.restore()
}
/** A row of pointed arches cut through a wall. */
function arcade(c: C, fill: string, top: number, count: number, x0: number, x1: number, floor = H + 0.05) {
  paper(c, fill, () => {
    c.rect(x0 - 0.05, top, x1 - x0 + 0.1, floor - top)
    const pitch = (x1 - x0) / count
    for (let i = 0; i < count; i++) {
      const cx = x0 + pitch * (i + 0.5), a = pitch * 0.33, foot = floor - 0.06, spring = top + a * 2.3
      c.moveTo(cx - a, foot)
      c.lineTo(cx - a, spring)
      c.bezierCurveTo(cx - a, spring - a * 0.9, cx - a * 0.25, spring - a * 1.45, cx, spring - a * 1.75)
      c.bezierCurveTo(cx + a * 0.25, spring - a * 1.45, cx + a, spring - a * 0.9, cx + a, spring)
      c.lineTo(cx + a, foot)
      c.closePath()
    }
  })
}
/** A wandering closed loop around a point, for islands and their contour lines. */
function blob(c: C, x: number, y: number, r: number, ph: number, squash = 0.68) {
  const n = 64
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU
    const k = 1 + 0.17 * Math.sin(a * 3 + ph) + 0.09 * Math.sin(a * 5 + ph * 2.3) + 0.05 * Math.sin(a * 9 + ph * 1.1)
    const px = x + Math.cos(a) * r * k, py = y + Math.sin(a) * r * k * squash
    if (i) c.lineTo(px, py)
    else c.moveTo(px, py)
  }
  c.closePath()
}
function compass(c: C, x: number, y: number, r: number, a: string, b: string) {
  c.save()
  c.translate(x, y)
  c.strokeStyle = a
  c.lineWidth = 0.003
  for (const k of [1, 0.84]) {
    c.beginPath()
    c.arc(0, 0, r * k, 0, TAU)
    c.stroke()
  }
  for (let i = 0; i < 8; i++) {
    const long = i % 2 === 0, l = long ? r * 1.14 : r * 0.68, w = r * (long ? 0.11 : 0.08)
    c.save()
    c.rotate((i * TAU) / 8)
    c.fillStyle = a
    c.beginPath()
    c.moveTo(0, -l)
    c.lineTo(w, -w)
    c.lineTo(0, 0)
    c.closePath()
    c.fill()
    c.fillStyle = b
    c.beginPath()
    c.moveTo(0, -l)
    c.lineTo(-w, -w)
    c.lineTo(0, 0)
    c.closePath()
    c.fill()
    c.restore()
  }
  c.restore()
}

// ---------------------------------------------------------------------------------------------------------------- the Lens
function lens0(c: C) {
  c.fillStyle = '#134567'
  c.fillRect(0, 0, W, H)
  const grid = (step: number, a: number) => {
    c.strokeStyle = `rgb(214 236 248 / ${a})`
    c.lineWidth = 0.0016
    c.beginPath()
    for (let x = 0; x <= W; x += step) {
      c.moveTo(x, 0)
      c.lineTo(x, H)
    }
    for (let y = 0; y <= H; y += step) {
      c.moveTo(0, y)
      c.lineTo(W, y)
    }
    c.stroke()
  }
  grid(0.05, 0.08)
  grid(0.25, 0.2)
  const isles: [number, number, number, number][] = [[0.42, 0.42, 0.26, 1.1], [1.5, 0.34, 0.2, 2.6], [1.3, 0.98, 0.3, 4.2], [0.5, 1.06, 0.17, 5.4], [0.98, 0.66, 0.1, 0.4]]
  for (const [x, y, r, ph] of isles) {
    paper(c, 'rgb(214 236 248 / 0.1)', () => blob(c, x, y, r, ph), 0.004)
    c.strokeStyle = '#d9eef8'
    for (let k = 0; k < 6; k++) {
      c.lineWidth = k === 0 ? 0.0044 : 0.0022
      c.globalAlpha = 1 - k * 0.1
      c.beginPath()
      blob(c, x, y, r * (1 - k * 0.15), ph + k * 0.1)
      c.stroke()
    }
    c.globalAlpha = 1
  }
  // Where players went: pale trails between the islands, with marks where they stopped.
  seed = 311
  c.strokeStyle = '#f4c869'
  c.lineWidth = 0.004
  c.setLineDash([0.012, 0.012])
  for (let i = 0; i < 9; i++) {
    const a = isles[i % isles.length], b = isles[(i * 2 + 1) % isles.length]
    c.beginPath()
    c.moveTo(a[0], a[1])
    c.bezierCurveTo(a[0] + (rnd() - 0.5) * 0.7, a[1] + (rnd() - 0.5) * 0.6, b[0] + (rnd() - 0.5) * 0.7, b[1] + (rnd() - 0.5) * 0.6, b[0], b[1])
    c.stroke()
  }
  c.setLineDash([])
  for (const [x, y] of isles) {
    c.fillStyle = '#fa2a6f'
    c.beginPath()
    c.arc(x, y, 0.012, 0, TAU)
    c.fill()
  }
  // The lens itself, lying on the chart.
  const lx = 1.38, ly = 0.62, lr = 0.27
  c.save()
  c.beginPath()
  c.arc(lx, ly, lr, 0, TAU)
  c.clip()
  c.fillStyle = 'rgb(236 248 252 / 0.2)'
  c.fillRect(lx - lr, ly - lr, lr * 2, lr * 2)
  c.restore()
  paper(c, '#e9c063', () => {
    c.arc(lx, ly, lr + 0.022, 0, TAU)
    c.arc(lx, ly, lr, 0, TAU, true)
  }, 0.016)
  c.save()
  c.translate(lx, ly)
  c.rotate(0.82)
  paper(c, '#0a2d45', () => c.roundRect(lr + 0.02, -0.024, 0.34, 0.048, 0.024), 0.014)
  c.restore()
}
function lens1(c: C) {
  c.fillStyle = '#123f60'
  c.fillRect(0, 0, W, H)
  c.strokeStyle = 'rgb(214 236 248 / 0.1)'
  c.lineWidth = 0.0016
  c.beginPath()
  for (let x = 0; x <= W; x += 0.08) {
    c.moveTo(x, 0)
    c.lineTo(x, H)
  }
  for (let y = 0; y <= H; y += 0.08) {
    c.moveTo(0, y)
    c.lineTo(W, y)
  }
  c.stroke()
  // A section through an island: its layers, cut clean, down below the waterline.
  const ground = (d: number) => (x: number) => 0.56 + d - 0.22 * Math.exp(-((x - 1.02) ** 2) / 0.24) * (1 - d * 1.2) + 0.018 * Math.sin(x * 9 + d * 14)
  const bands = ['#7fb7cf', '#5a9bb9', '#3f83a5', '#2c6c8f', '#1e5777', '#144764']
  bands.forEach((col, i) => {
    const f = ground(i * 0.095)
    paper(c, col, () => {
      c.moveTo(-0.05, H + 0.05)
      for (let x = -0.05; x <= W + 0.05; x += 0.02) c.lineTo(x, f(x))
      c.lineTo(W + 0.05, H + 0.05)
      c.closePath()
    }, 0.006)
    c.strokeStyle = '#d9eef8'
    c.lineWidth = i === 0 ? 0.005 : 0.0024
    c.beginPath()
    for (let x = -0.05; x <= W + 0.05; x += 0.02) c.lineTo(x, f(x))
    c.stroke()
  })
  // What's buried in it: the small marks a study leaves.
  seed = 73
  for (let i = 0; i < 46; i++) {
    const x = 0.1 + rnd() * 1.8, f = ground(0.1 + rnd() * 0.42)
    c.fillStyle = i % 7 === 0 ? '#fa2a6f' : '#f4c869'
    c.beginPath()
    c.arc(x, f(x) + 0.03, 0.006 + rnd() * 0.006, 0, TAU)
    c.fill()
  }
  // The waterline, and a dhow in outline over it.
  c.strokeStyle = '#d9eef8'
  c.lineWidth = 0.003
  c.setLineDash([0.02, 0.014])
  c.beginPath()
  c.moveTo(0, 0.62)
  c.lineTo(W, 0.62)
  c.stroke()
  c.setLineDash([])
  dhow(c, 1.56, 0.6, 0.62, '#d9eef8', 'rgb(217 238 248 / 0.22)', '#d9eef8', '#f4c869')
  dhow(c, 0.34, 0.61, 0.36, '#d9eef8', 'rgb(217 238 248 / 0.22)', '#d9eef8')
  palm(c, 1.02, 0.36, 0.4, '#d9eef8')
}

// ------------------------------------------------------------------------------------------------------------- the Lantern
function lantern0(c: C) {
  c.fillStyle = '#0d3b3d'
  c.fillRect(0, 0, W, H)
  const dusk = c.createRadialGradient(1, 0.74, 0, 1, 0.74, 1.2)
  for (const [at, col] of [[0, '#ffe2a4'], [0.2, '#f8bb68'], [0.42, '#c9713b'], [0.66, '#6a3f38'], [0.88, '#1f3d41'], [1, '#0d3b3d']] as const) dusk.addColorStop(at, col)
  c.fillStyle = dusk
  c.fillRect(0, 0, W, H)
  seed = 41
  c.fillStyle = '#f4c273'
  for (let i = 0; i < 46; i++) {
    const x = rnd() * W, y = rnd() * 0.62, r = 0.008 + rnd() * rnd() * 0.034
    c.fillStyle = i % 9 === 0 ? '#fa2a6f' : '#0d3b3d'
    c.beginPath()
    star(c, x, y, r)
    c.fill()
  }
  // A crescent, cut from the night.
  c.fillStyle = '#0d3b3d'
  c.beginPath()
  c.arc(0.3, 0.2, 0.1, 1.008, -1.008)
  c.arc(0.345, 0.2, 0.085, -1.473, 1.473, true)
  c.closePath()
  c.fill()
  arcade(c, '#0c3234', 0.72, 8, 0, W)
  palm(c, 0.36, 0.86, 0.72, '#082628')
  palm(c, 1.66, 0.88, 0.84, '#082628', -1)
  palm(c, 1.42, 0.86, 0.48, '#0c3234', -1)
  dhow(c, 1.02, 1.1, 0.72, '#051c1e', '#082628', '#051c1e')
  sea(c, '#062224', 'rgb(244 194 115 / 0.65)', 1.12, 0.05, 10, 1.2)
  sea(c, '#041a1c', 'rgb(244 194 115 / 0.4)', 1.25, 0.04, 8, 3.1)
}
function lantern1(c: C) {
  c.fillStyle = '#0b3436'
  c.fillRect(0, 0, W, H)
  const hang: [number, number, number][] = [[0.17, 0.46, 0.21], [0.46, 0.76, 0.27], [0.74, 0.4, 0.18], [1.03, 0.68, 0.34], [1.31, 0.34, 0.17], [1.58, 0.8, 0.27], [1.85, 0.5, 0.21]]
  seed = 19
  for (let i = 0; i < 70; i++) {
    c.fillStyle = `rgb(244 194 115 / ${0.2 + rnd() * 0.5})`
    c.beginPath()
    star(c, rnd() * W, rnd() * H, 0.004 + rnd() * rnd() * 0.016)
    c.fill()
  }
  for (const [x, y, s] of hang) {
    lamp(c, x, y + s * 0.12, s * 1.5, 'rgb(226 112 40 / 0.85)')
    lamp(c, x, y + s * 0.14, s * 0.62, 'rgb(255 190 96 / 0.75)')
    c.strokeStyle = '#d29a45'
    c.lineWidth = 0.004
    c.setLineDash([0.012, 0.007])
    c.beginPath()
    c.moveTo(x, -0.02)
    c.lineTo(x, y - s * 0.46)
    c.stroke()
    c.setLineDash([])
    // The lit glass behind the frame.
    c.fillStyle = '#ffd98f'
    c.beginPath()
    c.moveTo(x - s * 0.26, y + s * 0.03)
    c.lineTo(x + s * 0.26, y + s * 0.03)
    c.lineTo(x + s * 0.18, y + s * 0.36)
    c.lineTo(x - s * 0.18, y + s * 0.36)
    c.closePath()
    c.fill()
    c.save()
    c.shadowColor = 'rgb(0 16 18 / 0.5)'
    c.shadowBlur = 0.01 * c.getTransform().d
    icon(c, ICONS.lantern, x, y, s, '#b9772a')
    c.restore()
  }
  sea(c, '#072628', 'rgb(244 194 115 / 0.55)', 1.2, 0.04, 11, 2.2)
}

// --------------------------------------------------------------------------------------------------------------- the Phone
function phone0(c: C) {
  c.fillStyle = linearV(c, 0, 0.9, [[0, '#cfe9ee'], [1, '#f6e6c6']])
  c.fillRect(0, 0, W, H)
  glow(c, 1.48, 0.34, 0.56, 'rgb(255 214 130 / 0.85)')
  paper(c, '#f2b64f', () => {
    c.arc(1.48, 0.34, 0.13, 0, TAU)
  }, 0.01)
  paper(c, '#f7f3e7', () => {
    blob(c, 0.42, 0.24, 0.13, 1, 0.34)
    blob(c, 0.58, 0.27, 0.1, 2.4, 0.3)
  }, 0.01)
  paper(c, '#f7f3e7', () => blob(c, 1.04, 0.15, 0.1, 4, 0.32), 0.01)
  sea(c, '#7fcfc6', '#f4f9f2', 0.6, 0.05, 12, 0.5)
  dhow(c, 0.74, 0.68, 0.66, '#7c4a24', '#f6efdd', '#5d3618', '#e0175f')
  sea(c, '#47b4ab', '#f4f9f2', 0.74, 0.06, 10, 1.9)
  sea(c, '#1f9a94', '#f4f9f2', 0.88, 0.07, 9, 3.3)
  sea(c, '#0f807d', '#f4f9f2', 1.02, 0.075, 8, 4.8)
  sea(c, '#086764', '#f4f9f2', 1.16, 0.08, 7, 0.9)
  sea(c, '#054f4e', '#f4f9f2', 1.28, 0.06, 7, 2.7)
}
function phone1(c: C) {
  c.fillStyle = '#0a4a4a'
  c.fillRect(0, 0, W, H)
  seed = 53
  for (let i = 0; i < 60; i++) {
    c.fillStyle = `rgb(230 245 240 / ${0.15 + rnd() * 0.45})`
    c.beginPath()
    star(c, rnd() * W, rnd() * 0.9, 0.003 + rnd() * rnd() * 0.012, 4, 0.4)
    c.fill()
  }
  c.save()
  c.translate(1, 0.58)
  c.rotate(-0.09)
  paper(c, '#13211f', () => c.roundRect(-0.36, -0.54, 0.72, 1.3, 0.07), 0.04)
  c.fillStyle = linearV(c, -0.46, 0.5, [[0, '#f6b679'], [0.55, '#f7dca9'], [1, '#7fcfc6']])
  c.beginPath()
  c.roundRect(-0.32, -0.46, 0.64, 1.0, 0.018)
  c.fill()
  c.save()
  c.beginPath()
  c.roundRect(-0.32, -0.46, 0.64, 1.0, 0.018)
  c.clip()
  c.fillStyle = '#fbe39c'
  c.beginPath()
  c.arc(0.06, -0.1, 0.1, 0, TAU)
  c.fill()
  c.restore()
  // The signal is off: bars with a stroke through them.
  c.fillStyle = '#20312f'
  for (let i = 0; i < 4; i++) c.fillRect(0.17 + i * 0.024, -0.42 - i * 0.012, 0.014, 0.018 + i * 0.012)
  c.strokeStyle = '#e0175f'
  c.lineWidth = 0.008
  c.beginPath()
  c.moveTo(0.16, -0.39)
  c.lineTo(0.27, -0.46)
  c.stroke()
  c.restore()
  dhow(c, 1.04, 0.86, 0.5, '#7c4a24', '#f6efdd', '#5d3618', '#e0175f')
  // The sea comes over the screen's edge and fills the pages.
  sea(c, '#47b4ab', '#f4f9f2', 0.88, 0.07, 9, 1)
  sea(c, '#1f9a94', '#f4f9f2', 1.02, 0.08, 8, 2.6)
  sea(c, '#0f807d', '#f4f9f2', 1.15, 0.08, 7, 4.2)
  sea(c, '#075b59', '#f4f9f2', 1.27, 0.06, 7, 0.4)
}

// -------------------------------------------------------------------------------------------------------------- the Hoopoe
/** Facing left, standing. Long curved bill, fanned crest tipped black and white, zebra wing, on cinnamon. Feet at y = 0.46. */
function hoopoeBird(c: C, x: number, y: number, s: number) {
  const ink = '#1c1713', cream = '#f6e8cc', body = '#d9843f', head = '#e29a57'
  c.save()
  c.translate(x, y)
  c.scale(s, s)
  // Legs, behind everything.
  c.strokeStyle = '#3a2618'
  c.lineWidth = 0.022
  c.lineCap = 'round'
  c.beginPath()
  c.moveTo(0.02, 0.28)
  c.lineTo(0.01, 0.46)
  c.lineTo(-0.06, 0.47)
  c.moveTo(0.12, 0.28)
  c.lineTo(0.13, 0.46)
  c.lineTo(0.06, 0.47)
  c.stroke()
  c.lineCap = 'butt'
  // Tail: black, with the one white band.
  c.save()
  c.translate(0.42, 0.16)
  c.rotate(0.52)
  const tail = () => {
    c.moveTo(-0.08, -0.07)
    c.lineTo(0.46, -0.085)
    c.quadraticCurveTo(0.49, 0, 0.46, 0.085)
    c.lineTo(-0.08, 0.07)
    c.closePath()
  }
  paper(c, ink, tail, 0.01)
  c.fillStyle = cream
  c.fillRect(0.2, -0.09, 0.07, 0.18)
  c.restore()
  // Crest, fanned back from the crown. Drawn from the back of the head forward so each overlaps the next.
  const crownX = -0.2, crownY = -0.3
  for (let i = 0; i < 8; i++) {
    const t = i / 7
    const a = 1.42 - t * 2.12
    const len = 0.3 + 0.06 * Math.sin(t * Math.PI)
    c.save()
    c.translate(crownX + t * -0.03 + 0.03, crownY)
    c.rotate(a)
    const feather = (l: number, w: number, col: string, lift: number) =>
      paper(c, col, () => {
        c.moveTo(-w * 0.35, 0.04)
        c.bezierCurveTo(-w, -l * 0.45, -w * 0.95, -l * 0.86, 0, -l)
        c.bezierCurveTo(w * 0.95, -l * 0.86, w, -l * 0.45, w * 0.35, 0.04)
        c.closePath()
      }, lift)
    feather(len, 0.042, ink, 0.008)
    feather(len - 0.05, 0.04, cream, 0)
    feather(len - 0.085, 0.038, '#e6a361', 0)
    c.restore()
  }
  // Body and head as one piece of paper.
  paper(c, body, () => {
    c.moveTo(-0.27, -0.14)
    c.bezierCurveTo(-0.3, 0.1, -0.12, 0.33, 0.1, 0.33)
    c.bezierCurveTo(0.28, 0.33, 0.44, 0.27, 0.54, 0.2)
    c.bezierCurveTo(0.42, 0.02, 0.22, -0.12, 0.02, -0.16)
    c.bezierCurveTo(-0.03, -0.17, -0.07, -0.2, -0.08, -0.25)
    c.bezierCurveTo(-0.09, -0.36, -0.3, -0.38, -0.32, -0.25)
    c.bezierCurveTo(-0.325, -0.21, -0.28, -0.18, -0.27, -0.14)
    c.closePath()
  }, 0.014)
  // A lighter face and chest over it.
  c.fillStyle = head
  c.beginPath()
  c.moveTo(-0.27, -0.14)
  c.bezierCurveTo(-0.3, 0.02, -0.22, 0.16, -0.1, 0.25)
  c.bezierCurveTo(-0.12, 0.08, -0.06, -0.08, -0.08, -0.25)
  c.bezierCurveTo(-0.09, -0.36, -0.3, -0.38, -0.32, -0.25)
  c.bezierCurveTo(-0.325, -0.21, -0.28, -0.18, -0.27, -0.14)
  c.closePath()
  c.fill()
  // Bill: long and curving down.
  paper(c, ink, () => {
    c.moveTo(-0.305, -0.285)
    c.quadraticCurveTo(-0.52, -0.27, -0.71, -0.12)
    c.quadraticCurveTo(-0.5, -0.2, -0.31, -0.2)
    c.closePath()
  }, 0.006)
  // Eye.
  c.fillStyle = ink
  c.beginPath()
  c.arc(-0.235, -0.265, 0.02, 0, TAU)
  c.fill()
  c.fillStyle = cream
  c.beginPath()
  c.arc(-0.241, -0.272, 0.006, 0, TAU)
  c.fill()
  // The folded wing: black, barred with cream across it.
  const wing = () => {
    c.moveTo(-0.08, -0.02)
    c.bezierCurveTo(0.08, -0.12, 0.34, -0.02, 0.62, 0.27)
    c.bezierCurveTo(0.4, 0.33, 0.12, 0.3, 0.0, 0.2)
    c.bezierCurveTo(-0.07, 0.14, -0.11, 0.05, -0.08, -0.02)
    c.closePath()
  }
  paper(c, ink, wing, 0.012)
  c.save()
  c.beginPath()
  wing()
  c.clip()
  c.strokeStyle = cream
  c.lineWidth = 0.034
  for (let i = 0; i < 6; i++) {
    const bx = 0.03 + i * 0.094
    c.beginPath()
    c.moveTo(bx + 0.02, -0.14)
    c.quadraticCurveTo(bx + 0.11, 0.08, bx - 0.05, 0.38)
    c.stroke()
  }
  c.restore()
  c.restore()
}
function hoopoe0(c: C) {
  c.fillStyle = linearV(c, 0, 0.95, [[0, '#f3a56f'], [0.55, '#f8cf97'], [1, '#fbe9c3']])
  c.fillRect(0, 0, W, H)
  glow(c, 0.66, 0.5, 0.74, 'rgb(255 240 190 / 0.9)')
  paper(c, '#fff0c4', () => c.arc(0.66, 0.5, 0.29, 0, TAU), 0.008)
  const dune = (fill: string, y: number, a: number, k: number, ph: number) =>
    paper(c, fill, () => {
      c.moveTo(-0.05, H + 0.05)
      for (let x = -0.05; x <= W + 0.05; x += 0.02) c.lineTo(x, y + a * Math.sin(x * k + ph) + a * 0.4 * Math.sin(x * k * 2.3 + ph * 2))
      c.lineTo(W + 0.05, H + 0.05)
      c.closePath()
    })
  dune('#e9a76c', 0.76, 0.05, 3.1, 0.6)
  palm(c, 1.5, 0.92, 0.94, '#6b3b1c', -1)
  palm(c, 1.78, 0.94, 0.62, '#7f4924', -1)
  // The guide, standing on the crest of the dune and looking back the way you came.
  hoopoeBird(c, 0.68, 0.585, 0.68)
  dune('#d98a4b', 0.87, 0.06, 2.6, 2.2)
  dune('#c4581e', 1.0, 0.055, 2.2, 3.9)
  dune('#96421c', 1.15, 0.05, 2.9, 5.2)
  seed = 29
  for (let i = 0; i < 7; i++) {
    const x = 0.2 + rnd() * 1.6, y = 0.1 + rnd() * 0.3, s = 0.012 + rnd() * 0.016
    c.strokeStyle = '#6b3b1c'
    c.lineWidth = 0.004
    c.beginPath()
    c.moveTo(x - s, y)
    c.quadraticCurveTo(x - s * 0.4, y - s * 0.7, x, y)
    c.quadraticCurveTo(x + s * 0.4, y - s * 0.7, x + s, y)
    c.stroke()
  }
}
function hoopoe1(c: C) {
  // A wing, filling both pages: the bird's black and cream bars on its cinnamon.
  c.fillStyle = '#d3813f'
  c.fillRect(0, 0, W, H)
  const bars = 9
  for (let i = 0; i <= bars; i++) {
    const t = i / bars
    const y0 = -0.06 + t * 1.42
    const shape = (off: number) => {
      c.moveTo(-0.1, y0 + off + 0.22)
      c.bezierCurveTo(0.5, y0 + off - 0.16, 1.3, y0 + off - 0.1, 2.1, y0 + off + 0.42)
    }
    paper(c, i % 2 ? '#1c1713' : '#f6e8cc', () => {
      shape(0)
      c.lineTo(2.1, H + 0.6)
      c.lineTo(-0.1, H + 0.6)
      c.closePath()
    }, 0.012)
  }
  // The crest, fanned over the gutter, each feather tipped with black.
  c.save()
  c.translate(1, 1.5)
  const n = 9
  for (let i = 0; i < n; i++) {
    const a = -0.86 + (i / (n - 1)) * 1.72
    c.save()
    c.rotate(a)
    const feather = (l: number, w: number, col: string) =>
      paper(c, col, () => {
        c.moveTo(-w * 0.3, 0)
        c.bezierCurveTo(-w, -l * 0.5, -w * 0.9, -l * 0.9, 0, -l)
        c.bezierCurveTo(w * 0.9, -l * 0.9, w, -l * 0.5, w * 0.3, 0)
        c.closePath()
      }, 0.012)
    const len = 0.92 + 0.12 * Math.cos(a * 1.7)
    feather(len, 0.082, '#1c1713')
    feather(len - 0.075, 0.074, '#f6e8cc')
    feather(len - 0.14, 0.07, '#e39a55')
    c.restore()
  }
  c.restore()
}

// ---------------------------------------------------------------------------------------------------------------- Set Sail
function sail0(c: C) {
  c.fillStyle = '#ebe3cc'
  c.fillRect(0, 0, W, H)
  // A sea chart: rhumb lines out of two roses, islands with a shallows tint, and a route to follow.
  c.strokeStyle = 'rgb(11 77 76 / 0.2)'
  c.lineWidth = 0.002
  for (const [x, y] of [[0.5, 0.68], [1.54, 0.68]] as const) {
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * TAU
      c.beginPath()
      c.moveTo(x, y)
      c.lineTo(x + Math.cos(a) * 2.4, y + Math.sin(a) * 2.4)
      c.stroke()
    }
  }
  const isles: [number, number, number, number][] = [[0.26, 0.26, 0.15, 1.4], [0.82, 1.08, 0.2, 3], [1.28, 0.3, 0.17, 4.6], [1.76, 1.02, 0.14, 0.2]]
  for (const [x, y, r, ph] of isles) {
    c.fillStyle = '#c0dfda'
    c.beginPath()
    blob(c, x, y, r * 1.42, ph)
    c.fill()
    c.strokeStyle = 'rgb(11 77 76 / 0.35)'
    c.lineWidth = 0.002
    c.setLineDash([0.008, 0.008])
    c.beginPath()
    blob(c, x, y, r * 1.2, ph)
    c.stroke()
    c.setLineDash([])
    paper(c, '#d7b777', () => blob(c, x, y, r, ph), 0.008)
    c.fillStyle = '#0a7a78'
    c.beginPath()
    blob(c, x, y, r * 0.5, ph + 0.5)
    c.fill()
  }
  c.strokeStyle = '#d81f63'
  c.lineWidth = 0.006
  c.lineCap = 'round'
  c.setLineDash([0.001, 0.02])
  c.beginPath()
  c.moveTo(0.3, 0.42)
  c.bezierCurveTo(0.6, 0.82, 0.9, 0.5, 1.14, 0.46)
  c.bezierCurveTo(1.5, 0.42, 1.28, 0.82, 1.6, 0.92)
  c.stroke()
  c.setLineDash([])
  c.lineCap = 'butt'
  compass(c, 0.5, 0.68, 0.16, '#0b4d4c', '#c49a4a')
  compass(c, 1.54, 0.68, 0.11, '#0b4d4c', '#c49a4a')
  // A little dhow, on its way.
  dhow(c, 1.12, 0.47, 0.24, '#7c4a24', '#f8f2e2', '#5d3618', '#d81f63')
  // Small waves drawn on the open water.
  seed = 67
  c.strokeStyle = 'rgb(11 77 76 / 0.42)'
  c.lineWidth = 0.003
  for (let i = 0; i < 26; i++) {
    const x = rnd() * W, y = rnd() * H, s = 0.016
    c.beginPath()
    c.moveTo(x - s, y)
    c.quadraticCurveTo(x - s * 0.5, y - s * 0.7, x, y)
    c.quadraticCurveTo(x + s * 0.5, y - s * 0.7, x + s, y)
    c.stroke()
  }
}
function sail1(c: C) {
  c.fillStyle = linearV(c, 0, 0.92, [[0, '#a9dbe2'], [0.65, '#e1eddc'], [1, '#fbdcae']])
  c.fillRect(0, 0, W, H)
  glow(c, 1.6, 0.76, 0.44, 'rgb(255 214 130 / 0.9)')
  paper(c, '#f6ba58', () => c.arc(1.6, 0.76, 0.1, 0, TAU), 0.006)
  paper(c, '#f9f6ec', () => {
    blob(c, 0.32, 0.2, 0.15, 1.2, 0.3)
    blob(c, 0.5, 0.23, 0.1, 2.2, 0.28)
  }, 0.01)
  paper(c, '#f9f6ec', () => blob(c, 1.62, 0.2, 0.13, 3.8, 0.3), 0.01)
  for (const [x, r, col] of [[0.24, 0.17, '#5e9c94'], [0.52, 0.1, '#4b8a84'], [1.8, 0.14, '#4b8a84']] as const) {
    paper(c, col, () => {
      c.moveTo(x - r, 0.86)
      c.bezierCurveTo(x - r * 0.5, 0.72, x + r * 0.3, 0.72, x + r, 0.86)
      c.closePath()
    }, 0.006)
  }
  sea(c, '#6cc4bb', '#f7fbf4', 0.86, 0.03, 13, 0.9)
  dhow(c, 0.98, 0.97, 1.42, '#7c4a24', '#fbf5e4', '#5d3618', '#d81f63')
  sea(c, '#2ea49c', '#f7fbf4', 1.06, 0.05, 10, 2.4)
  sea(c, '#0f807d', '#f7fbf4', 1.17, 0.06, 8, 4)
  sea(c, '#075b59', '#f7fbf4', 1.28, 0.05, 7, 5.4)
}

const ART: Record<string, [(c: C) => void, (c: C) => void]> = {
  xray: [lens0, lens1],
  lantern: [lantern0, lantern1],
  phone: [phone0, phone1],
  hoopoe: [hoopoe0, hoopoe1],
  sail: [sail0, sail1],
}

/** The sheets the pop-up's backs are printed in while it lies folded under a turning page: pale, middle and deep, from each world's art. */
export const BACKS: Record<string, [string, string, string]> = {
  xray: ['#cfe6f2', '#5a9bb9', '#1e5777'],
  lantern: ['#f4c273', '#c9713b', '#0f3f41'],
  phone: ['#9fdcd2', '#1f9a94', '#0a5f5c'],
  hoopoe: ['#f6e8cc', '#e39a55', '#96421c'],
  sail: ['#f1e7cc', '#6cc4bb', '#0f807d'],
}

/** Two spreads stacked, for one chapter. The canvas is as wide as two pages and tall enough for two spreads. */
export function drawLeaves(canvas: HTMLCanvasElement, id: string) {
  const c = canvas.getContext('2d')!
  const u = canvas.width / W
  const art = ART[id]
  art.forEach((draw, i) => {
    c.save()
    c.setTransform(u, 0, 0, u, 0, (i * canvas.height) / 2)
    c.beginPath()
    c.rect(0, 0, W, H)
    c.clip()
    draw(c)
    c.restore()
  })
}
