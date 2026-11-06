// The page side of the concept. Sets the type to fit whatever screen it's on, then reads the live layout: where each word and line
// actually falls, and how high the ink really is above the baseline at every pixel, so the bird can stand on the tops of the letters.
import type { AboutCtx } from '../types'

export type Word = {
  i: number
  el: HTMLSpanElement
  text: string
  /** Stage pixels. */
  x0: number
  x1: number
  baseline: number
  top: number
  bottom: number
  line: number
  /** Height of the ink above the baseline at each pixel from x0, or -1 where there is none. */
  sky: Float32Array
  /** Live bend of the word under the bird: offset in px and rotation in radians. */
  dy: number
  vy: number
  rot: number
  vr: number
  active: boolean
}

export type Surface = {
  /** A stretch of ink that can be stood on. */
  x0: number
  sky: Float32Array
  baseline: number
}

export type Stand = { x: number; y: number; word: Word | null; footL: number; footR: number; cost: number }

const isPhone = () => innerWidth < 760

export class Typeset {
  words: Word[] = []
  lines: { baseline: number; x0: number; x1: number; words: Word[] }[] = []
  private original: string
  private meas = document.createElement('canvas')
  private mctx = this.meas.getContext('2d', { willReadFrequently: true })!
  fontSize = 100
  phone = false
  ctaRect = { x: 0, y: 0, w: 0, h: 0 }
  boat: Surface | null = null

  constructor(private ctx: AboutCtx) {
    this.original = ctx.headline.textContent ?? ''
    const parts = this.original.split(/(\s+)/)
    ctx.headline.textContent = ''
    let i = 0
    for (const part of parts) {
      if (!part) continue
      if (/^\s+$/.test(part)) {
        ctx.headline.append(' ')
        continue
      }
      const el = document.createElement('span')
      el.className = 'hp-w'
      el.textContent = part
      ctx.headline.append(el)
      this.words.push({ i: i++, el, text: part, x0: 0, x1: 0, baseline: 0, top: 0, bottom: 0, line: 0, sky: new Float32Array(0), dy: 0, vy: 0, rot: 0, vr: 0, active: false })
    }
    // The mark ends the sentence, like a colophon.
    ctx.headline.append(ctx.mark.el)
  }

  restore() {
    // Only if the words on the page are still ours.
    if (this.words[0]?.el.parentElement === this.ctx.headline) this.ctx.headline.textContent = this.original
  }

  private lineCount() {
    let n = 0
    let last = -1e9
    for (const w of this.words) {
      const t = w.el.offsetTop
      if (Math.abs(t - last) > 4) {
        n++
        last = t
      }
    }
    // The mark can wrap onto a line of its own.
    const mt = this.ctx.mark.el.getBoundingClientRect().top
    const wt = this.words[this.words.length - 1].el.getBoundingClientRect().bottom
    if (mt > wt - 4) n++
    return n
  }

  /** Sets the type. On a phone the stylesheet does it all; on bigger screens this finds the biggest size that composes. */
  layout() {
    const { headline, body, cta, stage, copy } = this.ctx
    this.clearBends()
    this.phone = isPhone()
    this.ctx.mark.el.style.marginInlineStart = ''
    if (this.phone) {
      for (const el of [headline, body, cta]) el.removeAttribute('style')
      copy.style.removeProperty('position')
      // Words can't wrap, so the longest one sets the largest size this screen can hold.
      const css = parseFloat(getComputedStyle(headline).fontSize)
      const room = headline.clientWidth
      let widest = 0
      for (const w of this.words) widest = Math.max(widest, w.el.getBoundingClientRect().width)
      if (widest > room) headline.style.fontSize = `${Math.floor(((css * room) / widest) * 0.985)}px`
      this.fontSize = parseFloat(getComputedStyle(headline).fontSize)
      // Alone on its line, the mark lines up with the text instead of keeping the gap it has after a word.
      const mark = this.ctx.mark.el
      const last = this.words[this.words.length - 1].el.getBoundingClientRect()
      if (mark.getBoundingClientRect().top > last.bottom - this.fontSize * 0.2) mark.style.marginInlineStart = '0'
      return
    }
    const vw = stage.clientWidth
    const vh = stage.clientHeight
    const mx = Math.max(40, vw * 0.055)
    const W = vw - 2 * mx
    // Arabic has marks above and below its letters, so it needs far more leading than Latin to keep the lines from touching.
    const LH = this.ctx.rtl ? 1.34 : 1.1
    // The first line needs room above it for the bird to stand; the bottom needs enough air to look deliberate.
    const topMin = vh * 0.15
    const bottomMin = Math.max(56, vh * 0.085)
    const bodySize = Math.max(17, Math.min(24, vw * 0.0142))
    const gap = bodySize * 1.5
    headline.style.width = `${W}px`
    headline.style.insetInlineStart = `${mx}px`
    headline.style.lineHeight = String(LH)
    body.style.fontSize = `${bodySize}px`
    body.style.insetInlineEnd = 'auto'
    body.style.bottom = 'auto'
    cta.style.bottom = 'auto'
    cta.style.insetInlineEnd = `${mx}px`
    cta.style.top = '0px'
    const ctaW = cta.offsetWidth
    const ctaH = cta.offsetHeight
    // The real ink of this text, as fractions of the font size: Arabic reaches much further below the baseline than English.
    const hs = getComputedStyle(headline)
    const mc = this.mctx
    mc.font = `${hs.fontStyle} ${hs.fontWeight} 100px ${hs.fontFamily}`
    mc.direction = this.ctx.rtl ? 'rtl' : 'ltr'
    let inkUp = 0
    let inkDown = 0
    for (const w of this.words) {
      const m = mc.measureText(w.text)
      inkUp = Math.max(inkUp, m.actualBoundingBoxAscent / 100)
      inkDown = Math.max(inkDown, m.actualBoundingBoxDescent / 100)
    }
    const Fmax = Math.min(vw * 0.1, (vh - topMin - bottomMin) / (3.6 * LH))
    let chosen: { F: number; T: number; pw: number; pTop: number; ctaTop: number; below: boolean; pEnd: number; hw: number } | null = null
    const lineEnds = (F: number) => {
      // Each line's extent from the start of the measure, in reading direction.
      const rects = this.words.map(w => w.el.getBoundingClientRect())
      const box = headline.getBoundingClientRect()
      const rows: { top: number; bottom: number; end: number }[] = []
      for (const r of rects) {
        const end = this.ctx.rtl ? box.right - r.left : r.right - box.left
        const last = rows[rows.length - 1]
        if (last && Math.abs(last.top - (r.top - box.top)) < 4) last.end = Math.max(last.end, end)
        else rows.push({ top: r.top - box.top, bottom: r.top - box.top + F * LH, end })
      }
      const m = this.ctx.mark.el.getBoundingClientRect()
      const mEnd = this.ctx.rtl ? box.right - m.left : m.right - box.left
      const lastRow = rows[rows.length - 1]
      if (m.top - box.top < lastRow.bottom - 4) lastRow.end = Math.max(lastRow.end, mEnd)
      else rows.push({ top: lastRow.bottom, bottom: lastRow.bottom + F * LH, end: mEnd })
      return rows
    }
    // The search, strictest first. The mark should finish the sentence on the same line, so the bird can knock it into a boat from
    // the last word; and the button should have clear air above it, so the bird can stand there without hiding any words.
    const baseFromRowTop = (F: number) => F * (LH / 2 + 0.33)
    const attempt = (needMarkInline: boolean, needHeadroom: boolean) => {
      for (let F = Math.floor(Fmax); F >= 48; F -= 2) {
        headline.style.fontSize = `${F}px`
        const S = Math.max(56, F * 0.66)
        // A slightly narrower measure can be what breaks the last word onto the mark's line, so try them finely.
        for (let widthK = 1; widthK >= 0.78; widthK -= 0.01) {
          headline.style.width = `${W * widthK}px`
          const rows = lineEnds(F)
          if (rows.length > 4 + (F < 90 ? 1 : 0)) continue
          if (needMarkInline) {
            const m = this.ctx.mark.el.getBoundingClientRect()
            const lw = this.words[this.words.length - 1].el.getBoundingClientRect()
            if (m.top > lw.bottom - F * 0.1) continue
          }
          const H = rows.length * LH * F
          if (H + topMin + bottomMin > vh) continue
          // The paragraph and the button sit side by side in the space the last lines leave.
          for (const pw of [Math.min(W * 0.36, bodySize * 24), Math.min(W * 0.32, bodySize * 21), Math.min(W * 0.28, bodySize * 18.5)]) {
            body.style.width = `${pw}px`
            const pH = body.offsetHeight
            const stackW = pw + gap + ctaW
            const startX = W - stackW // measured from the start of the measure
            let lastClash = -1
            rows.forEach((r, i) => {
              if (r.end + F * 0.34 > startX) lastClash = i
            })
            // Clear the ink of the line above, not just its box.
            const clashBottom = lastClash >= 0 ? rows[lastClash].top + baseFromRowTop(F) + inkDown * F + bodySize * 0.9 : 0
            const blockBottom = Math.max(H, clashBottom + pH)
            // Room above the first line for the bird to stand, whatever height the letters reach.
            const birdRoom = 2.28 * S + 6
            const firstInk = F * (LH / 2 + 0.33 - inkUp * 0.86)
            // Standing on the button, the bird's crest mustn't hide any line above it: in Arabic that can even hide the dots that
            // make a letter what it is. So the paragraph and button drop as far as that needs, if the screen has the room.
            const birdSide = W - ctaW * 1.15
            let drop = 0
            for (const r of rows) {
              if (r.end > birdSide) drop = Math.max(drop, r.top + baseFromRowTop(F) + inkDown * F + 2.2 * S - (blockBottom - ctaH))
            }
            const bottom = blockBottom + drop
            const T = Math.max(topMin, birdRoom - firstInk, (vh - bottom + vh * 0.05) / 2)
            if (T + bottom + bottomMin > vh) {
              if (needHeadroom) continue
              const flat = Math.max(topMin, birdRoom - firstInk, (vh - blockBottom + vh * 0.05) / 2)
              if (flat + blockBottom + bottomMin > vh) continue
              return { F, T: flat, pw, pTop: flat + blockBottom - pH, ctaTop: flat + blockBottom - ctaH, below: false, pEnd: stackW, hw: W * widthK }
            }
            return { F, T, pw, pTop: T + bottom - pH, ctaTop: T + bottom - ctaH, below: false, pEnd: stackW, hw: W * widthK }
          }
        }
      }
      return null
    }
    chosen = attempt(true, true) ?? attempt(false, true) ?? attempt(true, false) ?? attempt(false, false)
    if (!chosen) {
      // The fallback: the paragraph goes under the headline.
      headline.style.width = `${W}px`
      for (let F = Math.floor(Fmax); F >= 40; F -= 2) {
        headline.style.fontSize = `${F}px`
        const rows = lineEnds(F)
        const H = rows.length * LH * F
        const pw = Math.min(W - ctaW - gap, bodySize * 34)
        body.style.width = `${pw}px`
        const pH = body.offsetHeight
        const total = H + bodySize * 1.5 + Math.max(pH, ctaH)
        if (total + topMin + bottomMin > vh && F > 40) continue
        const T = Math.max(topMin * 0.8, (vh - total) / 2)
        chosen = { F, T, pw, pTop: T + total - pH, ctaTop: T + total - ctaH, below: true, pEnd: pw + gap + ctaW, hw: W }
        break
      }
    }
    if (chosen) {
      const c = chosen
      headline.style.fontSize = `${c.F}px`
      headline.style.width = `${c.hw}px`
      headline.style.top = `${c.T}px`
      body.style.width = `${c.pw}px`
      body.style.top = `${c.pTop}px`
      body.style.insetInlineStart = `${mx + W - c.pEnd}px`
      cta.style.top = `${c.ctaTop}px`
      this.fontSize = c.F
    }
  }

  /** Reads where every word landed and rasterises its ink, so we know the true skyline of the text. */
  measure() {
    const { stage, headline, rtl } = this.ctx
    this.clearBends()
    const sr = stage.getBoundingClientRect()
    const cs = getComputedStyle(headline)
    const F = parseFloat(cs.fontSize)
    this.fontSize = F
    const c = this.mctx
    const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
    const SS = 2
    const pad = Math.ceil(F * 0.4)
    this.lines = []
    for (const w of this.words) {
      const node = w.el.firstChild as Text
      const range = document.createRange()
      range.selectNodeContents(node)
      const r = range.getBoundingClientRect()
      // A zero-sized inline-block sits exactly on the baseline.
      const probe = document.createElement('span')
      probe.style.cssText = 'display:inline-block;width:0;height:0'
      w.el.append(probe)
      const baseline = probe.getBoundingClientRect().bottom - sr.top
      probe.remove()
      w.x0 = r.left - sr.left
      w.x1 = r.right - sr.left
      w.top = r.top - sr.top
      w.bottom = r.bottom - sr.top
      w.baseline = baseline
      // Draw the word by itself to find the top of its ink at every column.
      const width = Math.ceil(r.width + pad * 2)
      const height = Math.ceil(F * 1.8)
      this.meas.width = width * SS
      this.meas.height = height * SS
      c.setTransform(SS, 0, 0, SS, 0, 0)
      c.font = font
      c.direction = rtl ? 'rtl' : 'ltr'
      c.textAlign = 'left'
      c.textBaseline = 'alphabetic'
      ;(c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = cs.letterSpacing
      c.fontKerning = 'normal'
      c.fillStyle = '#000'
      const by = Math.ceil(F * 1.25)
      c.fillText(w.text, pad, by)
      const img = c.getImageData(0, 0, this.meas.width, this.meas.height).data
      const W = this.meas.width
      const H = this.meas.height
      const sky = new Float32Array(Math.ceil(r.width) + 2).fill(-1)
      for (let x = 0; x < sky.length; x++) {
        let best = -1
        for (let sx = (x + pad) * SS; sx < (x + pad + 1) * SS && sx < W; sx++) {
          for (let y = 0; y < H; y++) {
            if (img[(y * W + sx) * 4 + 3] > 110) {
              const h = by - y / SS
              if (h > best) best = h
              break
            }
          }
        }
        sky[x] = best
      }
      w.sky = sky
      // Group into lines by baseline.
      let line = this.lines.find(l => Math.abs(l.baseline - baseline) < F * 0.3)
      if (!line) {
        line = { baseline, x0: w.x0, x1: w.x1, words: [] }
        this.lines.push(line)
      }
      line.words.push(w)
      line.x0 = Math.min(line.x0, w.x0)
      line.x1 = Math.max(line.x1, w.x1)
    }
    this.lines.sort((a, b) => a.baseline - b.baseline)
    this.lines.forEach((l, i) => l.words.forEach(w => (w.line = i)))
    const cr = this.ctx.cta.getBoundingClientRect()
    this.ctaRect = { x: cr.left - sr.left, y: cr.top - sr.top, w: cr.width, h: cr.height }
    this.measureBoat(sr)
  }

  /** The boat's top edge, sampled from the mark's own shapes in their assembled position. */
  private measureBoat(sr: DOMRect) {
    const { mark } = this.ctx
    const svg = mark.el
    // Assemble it for a moment: nothing paints until this frame ends.
    // The sun floats free, so only the sail and the hull count as somewhere to stand.
    const shapes = [...svg.querySelectorAll<SVGGeometryElement>('path')].slice(0, 2)
    const before = [...svg.querySelectorAll('g')].map(g => g.getAttribute('transform'))
    mark.set(1)
    let minX = 1e9, maxX = -1e9
    const pts: [number, number][] = []
    for (const s of shapes) {
      const m = s.getScreenCTM()
      if (!m) continue
      const len = s.getTotalLength()
      for (let d = 0; d <= len; d += 0.5) {
        const p = s.getPointAtLength(d)
        const x = m.a * p.x + m.c * p.y + m.e - sr.left
        const y = m.b * p.x + m.d * p.y + m.f - sr.top
        pts.push([x, y])
        if (x < minX) minX = x
        if (x > maxX) maxX = x
      }
    }
    ;[...svg.querySelectorAll('g')].forEach((g, i) => before[i] && g.setAttribute('transform', before[i]!))
    if (!pts.length) {
      this.boat = null
      return
    }
    const x0 = Math.floor(minX)
    const n = Math.ceil(maxX - x0) + 1
    const base = Math.max(...pts.map(p => p[1]))
    const sky = new Float32Array(n).fill(-1)
    for (const [x, y] of pts) {
      const i = Math.round(x - x0)
      const h = base - y
      if (h > sky[i]) sky[i] = h
    }
    this.boat = { x0, sky, baseline: base }
  }

  private clearBends() {
    for (const w of this.words) {
      if (w.active || w.dy || w.rot) {
        w.el.style.transform = ''
        w.dy = w.vy = w.rot = w.vr = 0
        w.active = false
      }
    }
  }

  /** Ink height at stage x on a surface, taking the highest ink under a small foot pad. Returns -1 for nothing. */
  skyOn(s: Surface, x: number, pad: number) {
    const i0 = Math.round(x - pad - s.x0)
    const i1 = Math.round(x + pad - s.x0)
    let best = -1
    for (let i = Math.max(0, i0); i <= i1 && i < s.sky.length; i++) if (s.sky[i] > best) best = s.sky[i]
    return best
  }

  /** The ground under stage x along a word's own line, including its neighbours. */
  skyOnLine(line: number, x: number, pad: number) {
    let best = -1
    for (const w of this.lines[line]?.words ?? []) {
      if (x + pad < w.x0 || x - pad > w.x1) continue
      const h = this.skyOn({ x0: w.x0, sky: w.sky, baseline: w.baseline }, x, pad)
      if (h > best) best = h
    }
    return best
  }

  /**
   * Finds where on a word the bird should stand: both feet on ink at nearly the same height, nothing tall rising through its body,
   * and as little as possible of the line above behind it.
   */
  standOn(w: Word, S: number, yaw: number, prefer?: number): Stand {
    const F = this.fontSize
    const sw = Math.max(0.5, Math.abs(Math.cos(yaw)) * 0.14 * S)
    const pad = Math.max(1.5, 0.018 * S)
    const bodyHalf = 0.34 * S
    const birdH = 1.75 * S
    const surface: Surface = { x0: w.x0, sky: w.sky, baseline: w.baseline }
    let best: Stand | null = null
    const margin = Math.min((w.x1 - w.x0) * 0.2, sw + 2)
    const prev = this.lines[w.line - 1]
    for (let x = w.x0 + margin; x <= w.x1 - margin; x += 1.5) {
      const hl = this.skyOn(surface, x - sw, pad)
      const hr = this.skyOn(surface, x + sw, pad)
      if (hl < 0 || hr < 0) continue
      const h = Math.max(hl, hr)
      const diff = Math.abs(hl - hr)
      // Letters rising beyond the feet would pass through the bird.
      let spike = 0
      for (let bx = x - bodyHalf; bx <= x + bodyHalf; bx += 2) {
        const v = this.skyOn(surface, bx, 0)
        if (v > h + 0.05 * S) spike = Math.max(spike, v - h)
      }
      // How much of the line above would be hidden.
      let occl = 0
      if (prev) {
        const ground = w.baseline - h
        const headTop = ground - birdH
        for (const p of prev.words) {
          const ox = Math.min(x + bodyHalf * 1.3, p.x1) - Math.max(x - bodyHalf * 1.3, p.x0)
          if (ox <= 0) continue
          const inkTop = p.baseline - F * 0.5
          const oy = Math.min(ground, p.baseline) - Math.max(headTop, inkTop)
          if (oy > 0) occl += (ox * oy) / (S * S)
        }
      }
      const mid = Math.abs(x - (prefer ?? (w.x0 + w.x1) / 2)) / Math.max(1, w.x1 - w.x0)
      const cost = (diff * 1.2) / (0.02 * F) + (spike * 2.2) / (0.1 * F) + occl * 1.5 + mid * (prefer === undefined ? 0.7 : 2.2)
      if (!best || cost < best.cost) best = { x, y: w.baseline - (hl + hr) / 2, word: w, footL: w.baseline - hl, footR: w.baseline - hr, cost }
    }
    if (best) return best
    // A very short word: stand on its highest point.
    let top = -1
    let tx = (w.x0 + w.x1) / 2
    for (let i = 0; i < w.sky.length; i++) {
      if (w.sky[i] > top) {
        top = w.sky[i]
        tx = w.x0 + i
      }
    }
    const y = w.baseline - Math.max(0, top)
    return { x: tx, y, word: w, footL: y, footR: y, cost: 99 }
  }

  /** A stand at this exact spot on a word, if both feet have ink under them at about the same height. */
  standAt(w: Word, x: number, S: number, yaw: number): Stand | null {
    const surface: Surface = { x0: w.x0, sky: w.sky, baseline: w.baseline }
    const sw = Math.max(0.5, Math.abs(Math.cos(yaw)) * 0.14 * S)
    const pad = Math.max(1.5, 0.018 * S)
    const hl = this.skyOn(surface, x - sw, pad)
    const hr = this.skyOn(surface, x + sw, pad)
    if (hl < 0 || hr < 0 || Math.abs(hl - hr) > this.fontSize * 0.12) return null
    return { x, y: w.baseline - (hl + hr) / 2, word: w, footL: w.baseline - hl, footR: w.baseline - hr, cost: 0 }
  }

  /** How many pixel columns of ink lie inside a box on the page, read from each word's measured skyline. */
  inkInBox(x0: number, x1: number, yTop: number, yBottom: number) {
    let n = 0
    for (const line of this.lines) {
      for (const w of line.words) {
        const a = Math.max(x0, w.x0)
        const b = Math.min(x1, w.x1)
        for (let x = a; x < b; x += 2) {
          const h = w.sky[Math.round(x - w.x0)]
          if (h === undefined || h < 0) continue
          if (w.baseline - h < yBottom && w.baseline + this.fontSize * 0.05 > yTop) n += 2
        }
      }
    }
    return n
  }

  /** Stands on the boat, by the same rules. */
  standOnBoat(S: number, yaw: number): Stand | null {
    const b = this.boat
    if (!b) return null
    const sw = Math.max(0.5, Math.abs(Math.cos(yaw)) * 0.1 * S)
    const pad = Math.max(1.5, 0.02 * S)
    let best: Stand | null = null
    for (let x = b.x0 + 1; x < b.x0 + b.sky.length - 1; x += 1) {
      const hl = this.skyOn(b, x - sw, pad)
      const hr = this.skyOn(b, x + sw, pad)
      if (hl < 0 || hr < 0) continue
      // On the boat, higher is better: a lookout on the sail.
      const cost = Math.abs(hl - hr) * 0.4 - Math.max(hl, hr) * 0.12
      if (!best || cost < best.cost) best = { x, y: b.baseline - (hl + hr) / 2, word: null, footL: b.baseline - hl, footR: b.baseline - hr, cost }
    }
    return best
  }

  /** Bends the words the bird has disturbed back toward rest. */
  stepWords(dt: number) {
    for (const w of this.words) {
      if (!w.active) continue
      const k = 340, c = 15
      w.vy += (-k * w.dy - c * w.vy) * dt
      w.dy += w.vy * dt
      const kr = 300, cr = 12
      w.vr += (-kr * w.rot - cr * w.vr) * dt
      w.rot += w.vr * dt
      if (Math.abs(w.dy) < 0.03 && Math.abs(w.vy) < 0.3 && Math.abs(w.rot) < 0.0003 && Math.abs(w.vr) < 0.003) {
        w.dy = w.vy = w.rot = w.vr = 0
        w.active = false
        w.el.style.transform = ''
        continue
      }
      w.el.style.transform = `translateY(${w.dy.toFixed(2)}px) rotate(${w.rot.toFixed(4)}rad)`
    }
  }

  kick(w: Word | null, down: number, spin: number) {
    if (!w) return
    w.active = true
    w.vy += down
    w.vr += spin
  }
}
