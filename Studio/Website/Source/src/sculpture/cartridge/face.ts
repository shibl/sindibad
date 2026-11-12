/** The console's character: a round pink smiley that lives on the home screen. */
import { BTN, CROWN, LETTER_A, MINI_DHOW, NOTE, PLAY, SMALL_STAR, SPARK, ZED } from './art'
import { CREAM, Gfx, HUD, INK, NONE, PINK, SKY, SKY2, numberAt, type Sprite } from './gfx'
import type { Host } from './host'

export const EYE_OPEN = 0, EYE_LINE = 1, EYE_HAPPY = 2, EYE_SLEEP = 3, EYE_SPIRAL = 4, EYE_BIG = 5
export const MOUTH_SMILE = 0, MOUTH_GRIN = 1, MOUTH_O = 2, MOUTH_WAVY = 3, MOUTH_YAWN = 4, MOUTH_SMALL = 5, MOUTH_FLAT = 6

export interface Pose {
  cx: number; cy: number; d: number; sq: number
  eyeL: number; eyeR: number; open: number; ex: number; ey: number
  mouth: number; mouthSize: number; spin: number; t: number
}
export function pose(): Pose {
  return { cx: 80, cy: 56, d: 56, sq: 0, eyeL: EYE_OPEN, eyeR: EYE_OPEN, open: 1, ex: 0, ey: 0, mouth: MOUTH_SMILE, mouthSize: 1, spin: 0, t: 0 }
}

// Spiral eyes, four rotation frames.
const SPIRALS: Sprite[] = []
for (let f = 0; f < 4; f++) {
  const d = new Uint8Array(169).fill(NONE)
  for (let a = 0.6; a < Math.PI * 3.7; a += 0.02) {
    const r = a * 0.56
    const x = Math.round(6 + r * Math.cos(a + (f * Math.PI) / 2)), y = Math.round(6 + r * Math.sin(a + (f * Math.PI) / 2))
    if (x >= 0 && y >= 0 && x < 13 && y < 13) d[y * 13 + x] = INK
  }
  d[6 * 13 + 6] = INK
  SPIRALS.push({ w: 13, h: 13, d })
}

function arc(g: Gfx, cx: number, y: number, half: number, depth: number, c: number, thick = 2) {
  // depth > 0: ends up, middle down (smile). depth < 0: middle up.
  for (let dx = -half; dx <= half; dx++) {
    const k = dx / (half + 0.5)
    const yy = y + Math.round(depth * (1 - k * k))
    g.rect(cx + dx, yy, 1, thick, c)
  }
}

function eye(g: Gfx, kind: number, x: number, y: number, open: number, spin: number) {
  switch (kind) {
    case EYE_OPEN: {
      const h = Math.max(2, Math.round(15 * open))
      if (h <= 3) { g.rect(x - 4, y, 9, 2, INK); break }
      g.oval(x + 0.5, y + 0.5, 9, h, INK)
      if (h >= 9) { g.rect(x - 2, y - Math.floor(h / 2) + 2, 2, 3, CREAM) }
      break
    }
    case EYE_BIG:
      g.oval(x + 0.5, y + 0.5, 11, 17, INK)
      g.rect(x - 3, y - 6, 3, 3, CREAM)
      g.rect(x + 1, y + 2, 2, 2, CREAM)
      break
    case EYE_LINE: g.rect(x - 4, y, 9, 2, INK); break
    case EYE_HAPPY: arc(g, x, y + 2, 4, -4, INK); break
    case EYE_SLEEP: arc(g, x, y, 4, 2.5, INK); break
    case EYE_SPIRAL: g.blit(SPIRALS[spin & 3], x - 6, y - 6); break
  }
}

export function drawSmiley(g: Gfx, p: Pose) {
  const w = Math.round(p.d * (1 + p.sq * 0.14)), h = Math.round(p.d * (1 - p.sq * 0.14))
  const cx = p.cx, cy = p.cy
  g.oval(cx, cy, w + 4, h + 4, INK)
  g.oval(cx, cy, w, h, PINK)
  // glassy shine, top left
  g.rect(cx - Math.round(w * 0.3), cy - Math.round(h * 0.38), 5, 2, CREAM)
  g.rect(cx - Math.round(w * 0.38), cy - Math.round(h * 0.3), 2, 4, CREAM)
  const eyeY = cy - Math.round(h * 0.12) + p.ey
  const sep = Math.round(w * 0.2)
  eye(g, p.eyeL, cx - sep + p.ex, eyeY, p.open, p.spin)
  eye(g, p.eyeR, cx + sep + p.ex, eyeY, p.open, p.spin + 2)
  const mx = cx + Math.round(p.ex * 0.6), my = cy + Math.round(h * 0.2) + Math.round(p.ey * 0.5)
  switch (p.mouth) {
    case MOUTH_SMILE:
      arc(g, mx, my, 9, 4, INK)
      g.rect(mx - 10, my - 1, 1, 2, INK); g.rect(mx + 10, my - 1, 1, 2, INK)
      break
    case MOUTH_GRIN:
      for (let j = 0; j < 7; j++) {
        const half = Math.round(8.5 * Math.sqrt(Math.max(0, 1 - (j / 7) * (j / 7))))
        g.rect(mx - half, my + j, half * 2 + 1, 1, INK)
      }
      g.rect(mx - 3, my + 4, 7, 2, PINK)
      break
    case MOUTH_O: g.oval(mx + 0.5, my + 3.5, Math.round(7 * p.mouthSize), Math.round(7 * p.mouthSize), INK); break
    case MOUTH_SMALL: g.oval(mx + 0.5, my + 2.5, 4, Math.max(2, Math.round(3 * p.mouthSize)), INK); break
    case MOUTH_YAWN:
      g.oval(mx + 0.5, my + 4, 10, Math.max(3, Math.round(13 * p.mouthSize)), INK)
      if (p.mouthSize > 0.6) g.oval(mx + 0.5, my + 4 + Math.round(4 * p.mouthSize), 6, 3, PINK)
      break
    case MOUTH_WAVY:
      for (let dx = -8; dx <= 8; dx++) g.rect(mx + dx, my + 2 + Math.round(1.6 * Math.sin(dx * 0.95 + p.t * 9)), 1, 2, INK)
      break
    case MOUTH_FLAT: g.rect(mx - 5, my + 2, 11, 2, INK); break
  }
}

/** Shared bottom prompt: (A) > [dhow]. */
export function drawPrompt(g: Gfx, cx: number, y: number) {
  const x = cx - 18
  g.glyph(BTN, x, y, PINK)
  g.glyph(LETTER_A, x + 3, y + 3, CREAM)
  g.glyph(PLAY, x + 14, y + 2, HUD)
  g.blit(MINI_DHOW, x + 23, y)
}

const NONE_E = 0, DIZZY = 1, WINK = 2, SURPRISE = 3, HAPPY = 4, GLANCE = 5, WHISTLE = 6, YAWN = 7

export class Face {
  private t = 0
  private idle = 0
  asleep = false
  private sleepT = 0
  /** 0 awake .. 1 dimmed (sleep). */
  dim = 0
  private blinkIn = 2.2
  private blinkT = -1
  private tx = 0
  private ty = 0
  private ex = 0
  private ey = 0
  private gazeT = 0
  private gx = 0
  private gy = 0
  private expr = NONE_E
  private exprT = 0
  private exprDur = 0
  private gestureIn = 6
  private yawned = false
  private hopY = 0
  private hopV = 0
  private squash = 0
  private leaving = -1
  private wakeMove = 0
  private readonly p = pose()

  constructor(private readonly host: Host) {}

  enter() {
    this.idle = 0; this.asleep = false; this.sleepT = 0; this.dim = 0
    this.expr = NONE_E; this.exprT = 0; this.leaving = -1; this.hopY = 0; this.hopV = 0
    this.yawned = false; this.blinkIn = 1.5; this.blinkT = -1; this.gazeT = 0
  }

  /** True once the face has finished its little "let's go" after A. */
  get wantsStart() { return this.leaving >= 0.32 }

  get active() {
    if (this.leaving >= 0 || this.exprT > 0 || this.hopV !== 0 || this.hopY !== 0 || this.squash > 0) return true
    if (this.dim > 0 && this.dim < 1) return true
    if (Math.abs(this.ex - this.targetX()) > 0.05 || Math.abs(this.ey - this.targetY()) > 0.05) return true
    if (this.host.reduced) return false
    return !(this.asleep && this.sleepT > 20)
  }

  private targetX() {
    if (this.gazeT > 0) return this.gx * 5
    if (this.expr === GLANCE) return this.exprT > this.exprDur / 2 ? -5 : 5
    return this.tx * 5
  }
  private targetY() {
    if (this.gazeT > 0) return this.gy * 4
    if (this.expr === GLANCE) return -1
    return this.ty * 4
  }

  private setExpr(e: number, dur: number) { this.expr = e; this.exprT = dur; this.exprDur = dur }

  private hop(v: number) {
    if (this.host.reduced) return
    if (this.hopY === 0) this.hopV = -v
  }

  private wake() {
    this.asleep = false; this.sleepT = 0; this.idle = 0; this.yawned = false; this.wakeMove = 0
    this.setExpr(SURPRISE, 0.7)
    this.hop(70)
    this.host.emit('wake')
    this.host.sfx('wake')
  }

  press(button: string) {
    this.idle = 0
    this.yawned = false
    if (this.asleep) { this.wake(); return }
    if (this.leaving >= 0) return
    if (button === 'a' || button === 'b') {
      this.leaving = 0
      this.setExpr(HAPPY, 1)
      this.hop(80)
      this.host.sfx('start')
    } else if (button === 'left' || button === 'right' || button === 'up' || button === 'down') {
      this.gazeT = 1.4
      this.gx = button === 'left' ? -1 : button === 'right' ? 1 : 0
      this.gy = button === 'up' ? -1 : button === 'down' ? 1 : 0
      this.host.sfx('tick')
    }
  }

  look(x: number, y: number) {
    const moved = Math.abs(x - this.tx) + Math.abs(y - this.ty)
    this.tx = Math.max(-1, Math.min(1, x)); this.ty = Math.max(-1, Math.min(1, y))
    if (moved > 0.03) {
      this.idle = 0
      if (this.asleep) { this.wakeMove += moved; if (this.wakeMove > 0.3) this.wake() }
    }
  }

  nudge(kind: 'spin' | 'poke') {
    if (this.leaving >= 0) return
    if (this.asleep) this.wake()
    this.idle = 0
    if (kind === 'spin') { this.setExpr(DIZZY, 2.4); this.host.sfx('dizzy') }
    else { this.setExpr(WINK, 1.3); this.hop(60); this.host.sfx('poke') }
  }

  step(dt: number) {
    const h = this.host
    this.t += dt
    if (this.exprT > 0) { this.exprT -= dt; if (this.exprT <= 0) { this.exprT = 0; this.expr = NONE_E } }
    if (this.gazeT > 0) this.gazeT = Math.max(0, this.gazeT - dt)
    if (this.leaving >= 0) this.leaving += dt
    if (!this.asleep) {
      this.idle += dt
      if (!h.reduced) {
        this.blinkIn -= dt
        if (this.blinkIn <= 0 && this.blinkT < 0) { this.blinkT = 0; this.blinkIn = h.rand() < 0.2 ? 0.25 : 2 + h.rand() * 3.5 }
        if (this.blinkT >= 0) { this.blinkT += dt; if (this.blinkT > 0.16) this.blinkT = -1 }
        if (this.expr === NONE_E && this.gazeT <= 0 && this.leaving < 0) {
          this.gestureIn -= dt
          if (this.idle > 16 && !this.yawned) { this.yawned = true; this.setExpr(YAWN, 1.8); this.host.sfx('whistle') }
          else if (this.gestureIn <= 0) {
            this.gestureIn = 6 + h.rand() * 6
            const r = h.rand()
            if (r < 0.3) this.setExpr(GLANCE, 1.6)
            else if (r < 0.55) { this.setExpr(HAPPY, 0.8); this.hop(70) }
            else if (r < 0.8) this.setExpr(WHISTLE, 2)
            else this.hop(60)
          }
        }
      }
      if (this.idle > 25 && this.leaving < 0 && this.expr !== DIZZY && this.expr !== WINK) {
        this.asleep = true; this.sleepT = 0; this.expr = NONE_E; this.exprT = 0; this.wakeMove = 0
        h.emit('sleep')
      }
    } else this.sleepT += dt
    // backlight
    const want = this.asleep ? 1 : 0
    if (h.reduced) this.dim = want
    else if (this.dim < want) this.dim = Math.min(want, this.dim + dt * (1 / 1.2))
    else if (this.dim > want) this.dim = Math.max(want, this.dim - dt * 3)
    // hop
    if (this.hopV !== 0 || this.hopY !== 0) {
      this.hopV += 420 * dt
      this.hopY += this.hopV * dt
      if (this.hopY >= 0) { if (this.hopV > 40) this.squash = 1; this.hopY = 0; this.hopV = 0 }
    }
    if (this.squash > 0) this.squash = Math.max(0, this.squash - dt * 6)
    // eyes ease toward their target
    const k = h.reduced ? 1 : Math.min(1, dt * 14)
    this.ex += (this.targetX() - this.ex) * k
    this.ey += (this.targetY() - this.ey) * k
    if (Math.abs(this.ex - this.targetX()) < 0.05) this.ex = this.targetX()
    if (Math.abs(this.ey - this.targetY()) < 0.05) this.ey = this.targetY()
  }

  draw(g: Gfx) {
    const h = this.host, p = this.p, t = this.t, still = h.reduced
    g.clear(SKY)
    let wob = 0, bob = 0
    if (!still) {
      if (this.expr === DIZZY) wob = Math.round(Math.sin(t * 11) * 3)
      else if (this.expr === WINK) wob = Math.round(Math.sin(t * 40))
      if (this.asleep && this.sleepT <= 20) bob = Math.round(Math.sin(t * 1.6) * 1.2)
      else if (!this.asleep) bob = Math.round(Math.sin(t * 2.1) * 0.8)
    }
    const lift = Math.round(this.hopY)
    p.cx = 80 + wob + Math.round(this.ex * 0.4)
    p.cy = 56 + lift + bob + Math.round(this.ey * 0.3)
    p.d = 56
    p.sq = this.squash > 0 ? Math.sin(this.squash * Math.PI) * 1 : lift < -4 ? -0.4 : 0
    p.t = still ? 0 : t
    p.ex = Math.round(this.ex); p.ey = Math.round(this.ey)
    p.eyeL = EYE_OPEN; p.eyeR = EYE_OPEN; p.open = 1; p.mouth = MOUTH_SMILE; p.mouthSize = 1; p.spin = 0
    if (this.blinkT >= 0) p.open = this.blinkT < 0.05 || this.blinkT > 0.11 ? 0.4 : 0
    switch (this.expr) {
      case DIZZY: p.eyeL = p.eyeR = EYE_SPIRAL; p.spin = still ? 0 : Math.floor(t * 10); p.mouth = MOUTH_WAVY; p.ex = 0; p.ey = 0; break
      case WINK: p.eyeR = EYE_HAPPY; p.mouth = MOUTH_GRIN; break
      case SURPRISE: p.eyeL = p.eyeR = EYE_BIG; p.mouth = MOUTH_O; break
      case HAPPY: p.eyeL = p.eyeR = EYE_HAPPY; p.mouth = MOUTH_GRIN; break
      case WHISTLE: p.mouth = MOUTH_SMALL; break
      case YAWN: {
        const k = 1 - this.exprT / this.exprDur
        const open = Math.sin(Math.min(1, k * 1.2) * Math.PI)
        p.mouth = MOUTH_YAWN; p.mouthSize = open; p.open = 1 - open * 0.85; p.eyeL = p.eyeR = open > 0.5 ? EYE_SLEEP : EYE_OPEN
        break
      }
    }
    if (this.asleep) {
      p.eyeL = p.eyeR = EYE_SLEEP; p.mouth = MOUTH_SMALL
      p.mouthSize = still || this.sleepT > 20 ? 1 : 0.7 + 0.5 * Math.sin(t * 1.6)
      p.ex = 0; p.ey = 2
    }
    // shadow on the "floor"
    const sw = 40 + Math.round(lift * 0.6)
    g.oval(80 + wob, 93, sw, 4, SKY2)
    drawSmiley(g, p)

    if (this.asleep) {
      const deep = still || this.sleepT > 20
      for (let i = 0; i < 3; i++) {
        let ph = deep ? i / 3 + 0.15 : ((t * 0.35 + i / 3) % 1)
        ph = Math.floor(ph * 12) / 12
        const x = p.cx + 26 + Math.round(ph * 14), y = p.cy - 22 - Math.round(ph * 26)
        g.glyph(ZED, x, y, INK, ph > 0.45 ? 2 : 1)
      }
    }
    if (this.expr === DIZZY) {
      for (let i = 0; i < 3; i++) {
        const a = (still ? 0.6 : t * 5) + i * 2.094
        g.glyph(SMALL_STAR, p.cx - 2 + Math.round(Math.cos(a) * 30), p.cy - 34 + Math.round(Math.sin(a) * 5), PINK)
      }
    }
    if (this.expr === WINK) {
      const k = 1 - this.exprT / this.exprDur
      g.glyph(SPARK, p.cx + 32, p.cy - 18 - Math.round(k * 8), PINK)
      g.glyph(SPARK, p.cx - 38, p.cy - 10 - Math.round(k * 6), PINK)
    }
    if (this.expr === WHISTLE) {
      const k = 1 - this.exprT / this.exprDur
      g.glyph(NOTE, p.cx + 18 + Math.round(k * 8), p.cy + 6 - Math.round(k * 24), INK)
    }
    if (h.best > 0) {
      g.glyph(CROWN, 4, 4, PINK)
      numberAt(g, h.best, 16, 3, HUD)
    }
    if (!this.asleep && this.leaving < 0 && (still || t % 1.2 < 0.85)) drawPrompt(g, 80, 110)
  }
}
