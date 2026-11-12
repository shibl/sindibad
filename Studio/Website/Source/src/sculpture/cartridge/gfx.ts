/**
 * Indexed 160x132 framebuffer, a strict LCD palette, integer-pixel primitives and a sprite
 * blitter. Everything draws palette *indices* into `fb`; `Presenter` maps them to colours
 * through a "look" (so day/night is a palette swap, crossfaded with an ordered dither).
 */

export const W = 160
export const H = 132
export const N = W * H

// Physical colours (fixed indices, identical in every look).
export const INK = 0
export const DARK = 1
export const MID = 2
export const PALE = 3
export const PINK = 4
export const CREAM = 5
export const OFF = 6
const PHYSICAL = ['#03100e', '#0d3d39', '#3f8f8a', '#badfe6', '#fa2a6f', '#fff0dc', '#05211e']
const NPHYS = PHYSICAL.length

// Semantic indices: what a pixel *is*; each look maps them to a physical colour.
export const SKY = 7
export const SKY2 = 8
export const FAR = 9
export const SEAFAR = 10
export const SEAFAR_LINE = 11
export const SEA = 12
export const SEA_LINE = 13
export const FOAM = 14
export const OBJ = 15
export const FILL = 16
export const OBJ2 = 17
export const GLOW = 18
export const HUD = 19
export const STAR = 20
export const BEAM = 21
export const CLOUD = 22
export const CLOUD2 = 23
export const FARLINE = 24
const NIDX = 25

export const NONE = 255

export type Look = Uint8Array

function look(pairs: [number, number][]): Look {
  const m = new Uint8Array(NIDX)
  for (let i = 0; i < NIDX; i++) m[i] = i < NPHYS ? i : PALE
  for (const [s, p] of pairs) m[s] = p
  return m
}

/** Home screen (face): lit pale LCD. */
export const LOOK_HOME = look([
  [SKY, PALE], [SKY2, MID], [FAR, MID], [SEAFAR, MID], [SEAFAR_LINE, PALE], [SEA, DARK], [SEA_LINE, MID], [FOAM, PALE],
  [OBJ, INK], [FILL, CREAM], [OBJ2, MID], [GLOW, CREAM], [HUD, INK], [STAR, PALE], [BEAM, PALE], [CLOUD, CREAM], [CLOUD2, MID], [FARLINE, MID],
])
/** Backlight dimmed while asleep. */
export const LOOK_DIM = look([
  [SKY, MID], [SKY2, DARK], [FAR, DARK], [SEAFAR, DARK], [SEAFAR_LINE, MID], [SEA, DARK], [SEA_LINE, MID], [FOAM, PALE],
  [OBJ, INK], [FILL, PALE], [OBJ2, DARK], [GLOW, PALE], [HUD, INK], [STAR, MID], [BEAM, MID], [CLOUD, PALE], [CLOUD2, DARK], [FARLINE, DARK],
])
export const LOOK_DAY = look([
  [SKY, PALE], [SKY2, CREAM], [FAR, MID], [FARLINE, DARK], [SEAFAR, PALE], [SEAFAR_LINE, MID], [SEA, DARK], [SEA_LINE, MID], [FOAM, CREAM],
  [OBJ, INK], [FILL, CREAM], [OBJ2, MID], [GLOW, CREAM], [HUD, INK], [STAR, PALE], [BEAM, PALE], [CLOUD, CREAM], [CLOUD2, MID],
])
export const LOOK_DUSK = look([
  [SKY, MID], [SKY2, PALE], [FAR, DARK], [FARLINE, INK], [SEAFAR, PALE], [SEAFAR_LINE, MID], [SEA, DARK], [SEA_LINE, MID], [FOAM, PALE],
  [OBJ, INK], [FILL, PALE], [OBJ2, MID], [GLOW, PINK], [HUD, INK], [STAR, MID], [BEAM, MID], [CLOUD, PALE], [CLOUD2, DARK],
])
export const LOOK_NIGHT = look([
  [SKY, INK], [SKY2, DARK], [FAR, INK], [FARLINE, MID], [SEAFAR, DARK], [SEAFAR_LINE, MID], [SEA, INK], [SEA_LINE, DARK], [FOAM, MID],
  [OBJ, PALE], [FILL, MID], [OBJ2, MID], [GLOW, CREAM], [HUD, PALE], [STAR, PALE], [BEAM, CREAM], [CLOUD, DARK], [CLOUD2, INK],
])

/** 4x4 ordered-dither thresholds, 0..15. */
export const BAYER = new Uint8Array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5])

export interface Sprite { w: number; h: number; d: Uint8Array }

/** Compile rows of characters into a sprite. Unknown characters (and '.') are transparent. */
export function sprite(rows: string[], key: Record<string, number>): Sprite {
  const h = rows.length
  let w = 0
  for (const r of rows) w = Math.max(w, r.length)
  const d = new Uint8Array(w * h).fill(NONE)
  for (let y = 0; y < h; y++) {
    const r = rows[y]
    for (let x = 0; x < r.length; x++) {
      const v = key[r[x]]
      if (v !== undefined) d[y * w + x] = v
    }
  }
  return { w, h, d }
}

/** One-colour glyph: '#' is set. */
export function glyph(rows: string[]): Sprite {
  return sprite(rows, { '#': 1 })
}

export class Gfx {
  readonly fb = new Uint8Array(N)
  /** Global draw offset (screen shake). */
  ox = 0
  oy = 0

  clear(c: number) {
    this.fb.fill(c)
  }

  rect(x: number, y: number, w: number, h: number, c: number) {
    x = Math.round(x + this.ox); y = Math.round(y + this.oy); w = Math.round(w); h = Math.round(h)
    let x0 = x < 0 ? 0 : x, y0 = y < 0 ? 0 : y
    const x1 = x + w > W ? W : x + w, y1 = y + h > H ? H : y + h
    if (x1 <= x0 || y1 <= y0) return
    const fb = this.fb
    for (; y0 < y1; y0++) fb.fill(c, y0 * W + x0, y0 * W + x1)
  }

  /** Rect without the global offset (HUD, overlays). */
  rectAbs(x: number, y: number, w: number, h: number, c: number) {
    const ox = this.ox, oy = this.oy
    this.ox = 0; this.oy = 0
    this.rect(x, y, w, h, c)
    this.ox = ox; this.oy = oy
  }

  px(x: number, y: number, c: number) {
    x = Math.round(x + this.ox); y = Math.round(y + this.oy)
    if (x >= 0 && y >= 0 && x < W && y < H) this.fb[y * W + x] = c
  }

  /** Ordered-dither fill: `level` 0 (nothing) .. 16 (solid). */
  dither(x: number, y: number, w: number, h: number, c: number, level: number) {
    if (level <= 0) return
    if (level >= 16) { this.rect(x, y, w, h, c); return }
    x = Math.round(x + this.ox); y = Math.round(y + this.oy)
    const x0 = Math.max(0, x), y0 = Math.max(0, y), x1 = Math.min(W, x + Math.round(w)), y1 = Math.min(H, y + Math.round(h))
    const fb = this.fb
    for (let yy = y0; yy < y1; yy++) {
      const row = (yy & 3) * 4
      for (let xx = x0; xx < x1; xx++) if (BAYER[row + (xx & 3)] < level) fb[yy * W + xx] = c
    }
  }

  /** Filled ellipse centred on (cx, cy); with even `w`/`h` the centre sits between pixels. */
  oval(cx: number, cy: number, w: number, h: number, c: number) {
    w = Math.round(w); h = Math.round(h)
    if (w <= 0 || h <= 0) return
    const left = Math.round(cx - w / 2), top = Math.round(cy - h / 2)
    const ry = h / 2, rx = w / 2
    for (let j = 0; j < h; j++) {
      const dy = (j + 0.5 - ry) / ry
      const half = rx * Math.sqrt(Math.max(0, 1 - dy * dy))
      const span = Math.max(1, Math.round(half * 2))
      this.rect(left + Math.round(rx - span / 2), top + j, span, 1, c)
    }
  }

  /** Filled circle of diameter `d`. */
  disc(cx: number, cy: number, d: number, c: number) {
    this.oval(cx, cy, d, d, c)
  }

  /**
   * Blit a sprite. `dw`/`dh` scale it (nearest), `flip` mirrors it, `tint` (>= 0) paints every
   * opaque pixel one colour, `shear` shifts each column vertically by shear * (col - centre),
   * `holes` skips a checkerboard of pixels (ghosting without flashing).
   */
  blit(s: Sprite, x: number, y: number, flip = false, tint = -1, dw = s.w, dh = s.h, shear = 0, holes = false) {
    x = Math.round(x + this.ox); y = Math.round(y + this.oy)
    dw = Math.round(dw); dh = Math.round(dh)
    if (dw <= 0 || dh <= 0) return
    const fb = this.fb, d = s.d, sw = s.w, sh = s.h
    const cxs = (dw - 1) / 2
    for (let i = 0; i < dw; i++) {
      const X = x + i
      if (X < 0 || X >= W) continue
      let sx = dw === sw ? i : Math.floor((i * sw) / dw)
      if (flip) sx = sw - 1 - sx
      const off = shear ? Math.round(shear * (i - cxs)) : 0
      for (let j = 0; j < dh; j++) {
        const Y = y + j + off
        if (Y < 0 || Y >= H) continue
        if (holes && ((X + Y) & 1)) continue
        const sy = dh === sh ? j : Math.floor((j * sh) / dh)
        const v = d[sy * sw + sx]
        if (v !== NONE) fb[Y * W + X] = tint >= 0 ? tint : v
      }
    }
  }

  /** Draw a one-colour glyph (set pixels only) at an integer scale. */
  glyph(gl: Sprite, x: number, y: number, c: number, scale = 1) {
    const d = gl.d
    for (let j = 0; j < gl.h; j++)
      for (let i = 0; i < gl.w; i++)
        if (d[j * gl.w + i] === 1) this.rect(x + i * scale, y + j * scale, scale, scale, c)
  }

  /** Glyph with a 1px outline in `edge` (drawn first), for legibility over busy backgrounds. */
  glyphOutlined(gl: Sprite, x: number, y: number, c: number, edge: number, scale = 1) {
    for (let k = 0; k < 8; k++) {
      const dx = k < 3 ? -1 : k < 5 ? (k === 3 ? -1 : 1) : 1
      const dy = k === 0 || k === 5 ? -1 : k === 1 || k === 6 ? 0 : k === 2 || k === 7 ? 1 : 0
      const ddx = k === 1 ? -1 : k === 6 ? 1 : dx
      const ddy = k === 3 ? -1 : k === 4 ? 1 : dy
      this.glyph(gl, x + ddx, y + ddy, edge, scale)
    }
    this.glyph(gl, x, y, c, scale)
  }
}

// ---------------------------------------------------------------- fonts

const DIGIT_ROWS = [
  ['.###.', '##.##', '##.##', '##.##', '##.##', '##.##', '.###.'],
  ['.##..', '###..', '.##..', '.##..', '.##..', '.##..', '####.'],
  ['.###.', '##.##', '...##', '..##.', '.##..', '##...', '#####'],
  ['####.', '...##', '...##', '.###.', '...##', '...##', '####.'],
  ['...##', '..###', '.####', '##.##', '#####', '...##', '...##'],
  ['#####', '##...', '####.', '...##', '...##', '##.##', '.###.'],
  ['.###.', '##...', '##...', '####.', '##.##', '##.##', '.###.'],
  ['#####', '...##', '..##.', '..##.', '.##..', '.##..', '.##..'],
  ['.###.', '##.##', '##.##', '.###.', '##.##', '##.##', '.###.'],
  ['.###.', '##.##', '##.##', '.####', '...##', '...##', '.###.'],
]
export const DIGITS = DIGIT_ROWS.map(glyph)
export const PLUS = glyph(['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'])
export const TIMES = glyph(['.....', '.....', '##.##', '.###.', '.###.', '##.##', '.....'])

/** Width in pixels of `n` drawn with `numberAt`. */
export function numberWidth(n: number, scale = 1) {
  const s = String(Math.max(0, Math.floor(n)))
  return (s.length * 6 - 1) * scale
}

/** Draw a non-negative integer with its left edge at x. */
export function numberAt(g: Gfx, n: number, x: number, y: number, c: number, scale = 1, edge = -1) {
  const s = String(Math.max(0, Math.floor(n)))
  for (let i = 0; i < s.length; i++) {
    const gl = DIGITS[s.charCodeAt(i) - 48]
    if (edge >= 0) g.glyphOutlined(gl, x + i * 6 * scale, y, c, edge, scale)
    else g.glyph(gl, x + i * 6 * scale, y, c, scale)
  }
}

const LETTERS: Record<string, string[]> = {
  S: ['.####', '##...', '##...', '.###.', '...##', '...##', '####.'],
  I: ['####', '.##.', '.##.', '.##.', '.##.', '.##.', '####'],
  N: ['##..##', '###.##', '######', '##.###', '##..##', '##..##', '##..##'],
  D: ['####.', '##.##', '##.##', '##.##', '##.##', '##.##', '####.'],
  B: ['####.', '##.##', '##.##', '####.', '##.##', '##.##', '####.'],
  A: ['.###.', '##.##', '##.##', '#####', '##.##', '##.##', '##.##'],
}
export const WORDMARK = 'SINDIBAD'.split('').map(ch => glyph(LETTERS[ch]))
export function wordmarkWidth(scale = 1) {
  let w = 0
  for (const g of WORDMARK) w += g.w + 1
  return (w - 1) * scale
}

// ---------------------------------------------------------------- presenter

export class Presenter {
  readonly canvas: HTMLCanvasElement
  readonly glow = { r: 0.02, g: 0.13, b: 0.12 }
  private readonly ctx: CanvasRenderingContext2D | null
  private readonly img: ImageData | null
  private readonly out: Uint32Array
  private readonly col32 = new Uint32Array(NPHYS)
  private readonly rgb: Float32Array = new Float32Array(NPHYS * 3)
  private readonly counts = new Uint32Array(NPHYS)

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.img = this.ctx ? this.ctx.createImageData(W, H) : null
    this.out = this.img ? new Uint32Array(this.img.data.buffer) : new Uint32Array(N)
    for (let i = 0; i < NPHYS; i++) {
      const hex = PHYSICAL[i]
      const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
      this.col32[i] = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0
      this.rgb[i * 3] = r / 255; this.rgb[i * 3 + 1] = g / 255; this.rgb[i * 3 + 2] = b / 255
    }
  }

  /** Map `fb` through look `a` (dithering towards `b` by `mix` 0..1) and upload if anything changed. */
  present(fb: Uint8Array, a: Look, b: Look, mix: number): boolean {
    const out = this.out, col = this.col32, counts = this.counts
    counts.fill(0)
    let changed = false
    const level = Math.round(mix * 16)
    if (level <= 0 || level >= 16 || a === b) {
      const m = level >= 16 ? b : a
      for (let i = 0; i < N; i++) {
        const p = m[fb[i]]
        counts[p]++
        const v = col[p]
        if (out[i] !== v) { out[i] = v; changed = true }
      }
    } else {
      let i = 0
      for (let y = 0; y < H; y++) {
        const row = (y & 3) * 4
        for (let x = 0; x < W; x++, i++) {
          const p = (BAYER[row + (x & 3)] < level ? b : a)[fb[i]]
          counts[p]++
          const v = col[p]
          if (out[i] !== v) { out[i] = v; changed = true }
        }
      }
    }
    if (!changed) return false
    let r = 0, g = 0, bl = 0
    for (let p = 0; p < NPHYS; p++) {
      const k = counts[p]
      r += k * this.rgb[p * 3]; g += k * this.rgb[p * 3 + 1]; bl += k * this.rgb[p * 3 + 2]
    }
    this.glow.r = r / N; this.glow.g = g / N; this.glow.b = bl / N
    if (this.ctx && this.img) this.ctx.putImageData(this.img, 0, 0)
    return true
  }
}
