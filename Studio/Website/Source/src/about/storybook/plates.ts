// The printed sheets for the book's chapters, drawn at run time so their words stay in the page's own fonts and languages.
// One sheet is two pages wide: the title page on the left half and the page with the arch on the right. A second sheet of the same
// size holds only what's stamped in gold foil, which the renderer lights separately. Canvas colour is what shows.
import { ARCH, BOOK, INDEX } from './book'
import { CHAPTERS, type Chapter } from '../chapters'

const CLOTH = '#0b4d4c'
const CLOTH_DEEP = '#083e3d'
const CREAM = '#efe3c8'

type Ctx = CanvasRenderingContext2D

const fontStack = (name: '--a-heading' | '--a-body') => getComputedStyle(document.querySelector('.design-a') ?? document.documentElement).getPropertyValue(name).trim() || 'sans-serif'

/** An eight-pointed star, the unit of the lattice. */
function star(c: Ctx, x: number, y: number, r: number) {
  const n = 8
  c.beginPath()
  for (let i = 0; i < n * 2; i++) {
    const a = (i * Math.PI) / n - Math.PI / 2
    const q = i % 2 ? r * 0.66 : r
    const px = x + Math.cos(a) * q, py = y + Math.sin(a) * q
    if (i) c.lineTo(px, py)
    else c.moveTo(px, py)
  }
  c.closePath()
}

/** The arch's outline, grown or shrunk by `inset`, in pixels with one page width being `u`. x0 is where this page starts. */
function archPath(c: Ctx, x0: number, u: number, cx: number, inset: number) {
  const { a, c: off, zs, zb } = ARCH
  const X = (x: number) => x0 + x * u
  const Z = (z: number) => (z + BOOK.H / 2) * u
  const R = a + off - inset
  const h = Math.sqrt(Math.max(0, R * R - off * off))
  const up = Math.atan2(h, off)
  c.beginPath()
  c.moveTo(X(cx - (a - inset)), Z(zb - inset))
  c.lineTo(X(cx - (a - inset)), Z(zs))
  c.arc(X(cx + off), Z(zs), R * u, Math.PI, Math.PI + up)
  c.arc(X(cx - off), Z(zs), R * u, -up, 0)
  c.lineTo(X(cx + (a - inset)), Z(zb - inset))
  c.closePath()
}

function lattice(c: Ctx, x0: number, y0: number, x1: number, y1: number, g: number, width: number, style: string) {
  c.lineWidth = width
  c.strokeStyle = style
  for (let j = 0, y = y0; y < y1 + g; j++, y += g) {
    for (let x = x0; x < x1 + g; x += g) {
      star(c, x, y, g * 0.5)
      c.stroke()
    }
  }
}

function emblem(c: Ctx, d: string, x: number, y: number, size: number) {
  c.save()
  c.translate(x - size / 2, y - size / 2)
  c.scale(size / 100, size / 100)
  c.fill(new Path2D(d), 'evenodd')
  c.restore()
}

/** A page's double gold rule with a small star at each corner. */
function frame(foil: Ctx, x0: number, u: number, h: number) {
  const m = 0.05 * u, m2 = 0.066 * u
  const W = u
  foil.strokeStyle = '#fff'
  foil.lineWidth = 0.0042 * u
  foil.strokeRect(x0 + m, m, W - 2 * m, h - 2 * m)
  foil.lineWidth = 0.0016 * u
  foil.strokeRect(x0 + m2, m2, W - 2 * m2, h - 2 * m2)
  foil.fillStyle = '#fff'
  for (const px of [x0 + m, x0 + W - m]) {
    for (const py of [m, h - m]) {
      star(foil, px, py, 0.024 * u)
      foil.fill()
    }
  }
}

function fitted(c: Ctx, text: string, weight: number, px: number, family: string, width: number) {
  c.font = `${weight} ${px}px ${family}`
  const w = c.measureText(text).width
  if (w > width) {
    px *= width / w
    c.font = `${weight} ${px}px ${family}`
  }
  return px
}

export function drawPlate(color: HTMLCanvasElement, foilC: HTMLCanvasElement, ch: Chapter, lang: 'en' | 'ar', dir: number, tall: boolean) {
  const c = color.getContext('2d')!, f = foilC.getContext('2d')!
  const S = color.width, H = color.height
  const u = S / 2
  const words = ch[lang]
  const heading = fontStack('--a-heading'), body = fontStack('--a-body')
  c.setTransform(1, 0, 0, 1, 0, 0)
  f.setTransform(1, 0, 0, 1, 0, 0)
  c.fillStyle = CLOTH
  c.fillRect(0, 0, S, H)
  f.fillStyle = '#000'
  f.fillRect(0, 0, S, H)
  // A pattern pressed into the card with no colour.
  c.save()
  lattice(c, 0, 0, S, H, 0.13 * u, Math.max(1, 0.0018 * u), 'rgb(255 255 255 / 0.05)')
  c.restore()
  frame(f, 0, u, H)
  frame(f, u, u, H)

  // ------------------------------------------------------------------------------------ the title page
  const mid = u / 2
  c.textAlign = f.textAlign = 'center'
  c.textBaseline = f.textBaseline = 'alphabetic'
  c.direction = f.direction = lang === 'ar' ? 'rtl' : 'ltr'
  f.fillStyle = '#fff'
  emblem(f, ch.icon, mid, H * 0.3, 0.26 * u)
  f.font = `600 ${0.042 * u}px ${body}`
  f.fillText(words.nth, mid, H * 0.445)
  fitted(f, words.title, 700, 0.15 * u, heading, 0.72 * u)
  f.fillText(words.title, mid, H * 0.56)
  // A short rule, then the line in the page's cream ink.
  f.fillRect(mid - 0.06 * u, H * 0.595, 0.12 * u, Math.max(2, 0.004 * u))
  c.fillStyle = CREAM
  c.font = `500 ${0.044 * u}px ${body}`
  const line = words.note.split(' ')
  let row = ''
  let y = H * 0.655
  for (const word of line) {
    const test = row ? `${row} ${word}` : word
    if (c.measureText(test).width > 0.68 * u && row) {
      c.fillText(row, mid, y)
      y += 0.062 * u
      row = word
    } else row = test
  }
  if (row) c.fillText(row, mid, y)

  // ------------------------------------------------------------------------------------ the arch's page
  const cx = dir > 0 ? ARCH.cx : 1 - ARCH.cx
  // Around the arch: a darker band and two gold rules.
  c.save()
  archPath(c, u, u, cx, -0.03)
  c.fillStyle = CLOTH_DEEP
  c.fill()
  c.restore()
  f.strokeStyle = '#fff'
  f.lineWidth = 0.004 * u
  archPath(f, u, u, cx, -0.03)
  f.stroke()
  f.lineWidth = 0.0016 * u
  archPath(f, u, u, cx, -0.018)
  f.stroke()

  // The doors: their print is part of this page. A gold lattice with the chapter's emblem on a disc across the seam.
  const X = (x: number) => u + x * u
  const Z = (z: number) => (z + BOOK.H / 2) * u
  c.save()
  archPath(c, u, u, cx, 0)
  c.clip()
  c.fillStyle = ch.color
  c.globalAlpha = 0.34
  c.fillRect(u, 0, u, H)
  c.globalAlpha = 1
  c.restore()
  f.save()
  archPath(f, u, u, cx, 0.012)
  f.clip()
  lattice(f, X(cx) - 0.07 * u * 6, Z(ARCH.zs) - 0.07 * u * 9 - 0.07 * u * 0.5, X(cx) + 0.07 * u * 6, Z(ARCH.zb), 0.07 * u, Math.max(1, 0.0024 * u), '#fff')
  f.restore()
  // Door borders, and the seam left clear down the middle.
  f.strokeStyle = '#fff'
  f.lineWidth = 0.003 * u
  archPath(f, u, u, cx, 0.012)
  f.stroke()
  const discY = Z(0.1), discR = 0.135 * u
  for (const k of [c, f]) {
    k.beginPath()
    k.arc(X(cx), discY, discR, 0, Math.PI * 2)
  }
  c.fillStyle = CLOTH_DEEP
  c.fill()
  f.fillStyle = '#000'
  f.fill()
  f.beginPath()
  f.arc(X(cx), discY, discR, 0, Math.PI * 2)
  f.lineWidth = 0.005 * u
  f.strokeStyle = '#fff'
  f.stroke()
  f.fillStyle = '#fff'
  emblem(f, ch.icon, X(cx), discY, discR * 1.3)

  // The seam where the doors meet.
  c.fillStyle = '#04201f'
  c.fillRect(X(cx) - Math.max(1, 0.0013 * u), Z(ARCH.zs) - Math.sqrt((ARCH.a + ARCH.c) ** 2 - ARCH.c ** 2) * u, Math.max(2, 0.0026 * u), (ARCH.zb - ARCH.zs + Math.sqrt((ARCH.a + ARCH.c) ** 2 - ARCH.c ** 2)) * u)

  // A phone only ever sees this page, so the title goes at its foot.
  if (tall) {
    f.fillStyle = '#fff'
    fitted(f, words.title, 700, 0.09 * u, heading, 0.7 * u)
    f.fillText(words.title, X(cx), Z(0.585))
  }
}

/** The emblems for the index tabs, one cell each, white on black. */
export function drawTabs(canvas: HTMLCanvasElement) {
  const n = CHAPTERS.length
  const cw = canvas.width / n, ch = canvas.height
  const c = canvas.getContext('2d')!
  c.fillStyle = '#000'
  c.fillRect(0, 0, canvas.width, ch)
  c.fillStyle = '#fff'
  // The cell is the tab's visible card: keep the emblem square on it, whatever the sheet's proportions.
  const px = Math.min(cw, ch * (INDEX.out / INDEX.w)) * 0.66
  CHAPTERS.forEach((chapter, i) => {
    c.save()
    c.translate(cw * i + cw * 0.46, ch / 2)
    c.scale((px / 100) * (cw / (ch * (INDEX.out / INDEX.w))), px / 100)
    c.translate(-50, -50)
    c.fill(new Path2D(chapter.icon), 'evenodd')
    c.restore()
  })
}
