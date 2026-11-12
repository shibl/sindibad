/**
 * "The Voyage": an original side-scrolling sea run. Sindibad's dhow rides rolling waves,
 * hops rocks, lets leaping fish sail over, dodges the Roc's boulders and ducks its swoops,
 * gathering pink stars from day into night.
 */
import {
  BOULDER, BTN, CLOUDS, FIN, CROWN, DHOW, DHOW_FURLED, DHOW_H, DHOW_W, DOWN, FISH, HEART, HUD_HEART, HUD_HEART_EMPTY,
  LETTER_A, LETTER_B, LIGHTHOUSE, PALM, REPLAY, ROC, ROCK_L, ROCK_S, SMILEY, SPARK, STAR, BANG,
} from './art'
import {
  BEAM, CREAM, FAR, FARLINE, FOAM, GLOW, Gfx, H, HUD, INK, LOOK_DAY, LOOK_DUSK, LOOK_NIGHT, MID, OBJ, OBJ2, PALE, PINK,
  PLUS, SEA, SEAFAR, SEAFAR_LINE, SEA_LINE, SKY, SKY2, STAR as STAR_C, W, numberAt, numberWidth, type Look,
} from './gfx'
import type { Host } from './host'

const SEA_Y = 106
const HORIZON = 84
const HOME_X = 30
const MIN_X = 4
const MAX_X = 100
const GRAV_UP = 380
const GRAV_DOWN = 560
const JUMP_V = 172
const CUT_V = 60
const DIVE_V = -260
const COYOTE = 0.1
const BUFFER = 0.15
const CYCLE = 120
const FIRST_SWOOP = 58

const K_ROCK_S = 1, K_ROCK_L = 2, K_STAR = 3, K_HEART = 4, K_FISH = 5, K_ROC = 6, K_BOULDER = 7, K_SWOOP = 8, K_WARN = 9

class Ent {
  on = false
  kind = 0
  x = 0
  y = 0
  vx = 0
  vy = 0
  t = 0
  s = 0
  a = 0
  b = 0
}

const NP = 180
const CLOUD_LAYOUT = [20, 18, 0, 130, 30, 1, 228, 12, 0, 330, 36, 1]
const FAR_ROWS = [86, 89, 93, 98], FAR_PAR = [0.3, 0.42, 0.56, 0.74]
const NEAR_ROWS = [114, 120, 127], NEAR_PAR = [1.1, 1.25, 1.45]
const SEGMENTS: [number, Look][] = [[0, LOOK_DAY], [30, LOOK_DUSK], [48, LOOK_NIGHT], [104, LOOK_DUSK]]

function overlap(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && bx < ax + aw && ay < by + bh && by < ay + ah
}

export class Voyage {
  // round state
  state: 'intro' | 'play' | 'sink' | 'result' = 'intro'
  private T = 0
  private clock = 0
  private dist = 0
  private speed = 40
  private scoreF = 0
  private bonus = 0
  private stars = 0
  lives = 3
  private hitPause = 0
  private shake = 0
  private sinceSpawn = 0
  private nextGap = 120
  private lastSwoop = -99
  private swoops = 0
  private lastHeart = 0
  private jumped = false
  // boat
  private bx = HOME_X
  private bvx = 0
  private bh = 0
  private bvh = 0
  private coyote = 0
  private buffer = 0
  private duckT = 0
  private diving = false
  private squash = 0
  private stretch = 0
  private inv = 0
  private wakeT = 0
  private held = { left: false, right: false, a: false, b: false, up: false, down: false }
  // result
  private resultT = 0
  private record = false
  private recordFired = false
  private bestBefore = 0
  private ticked = 0
  private resultIdle = 0
  /** Set when the result screen wants to go back to the face. */
  exit = false
  // pools
  private readonly ents: Ent[] = []
  private readonly px = new Float32Array(NP)
  private readonly py = new Float32Array(NP)
  private readonly pvx = new Float32Array(NP)
  private readonly pvy = new Float32Array(NP)
  private readonly plife = new Float32Array(NP)
  private readonly pcol = new Uint8Array(NP)
  private readonly pkind = new Uint8Array(NP)
  private pnext = 0
  private readonly popX = new Float32Array(8)
  private readonly popY = new Float32Array(8)
  private readonly popT = new Float32Array(8)
  private readonly popV = new Uint16Array(8)
  private popNext = 0
  // scenery (built once)
  private readonly surf = new Int16Array(W + 2)
  private readonly island = new Uint8Array(512)
  private readonly palms: number[] = []
  private readonly lighthouse = 302
  private readonly dashes: Uint8Array[] = []
  private readonly skyStars: number[] = []

  constructor(private readonly host: Host) {
    for (let i = 0; i < 32; i++) this.ents.push(new Ent())
    // deterministic scenery
    let s = 0x5eed
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
    const isles: [number, number, number][] = [[22, 18, 8], [44, 10, 4], [120, 26, 11], [146, 12, 6], [236, 14, 5], [300, 16, 7], [372, 24, 10], [398, 10, 5], [470, 14, 6]]
    for (const [c, w, h] of isles) {
      for (let i = -w; i <= w; i++) {
        const k = i / w
        const v = Math.round(h * Math.pow(Math.max(0, 1 - k * k), 0.7) + (rnd() < 0.3 ? 1 : 0) * (1 - Math.abs(k)))
        const u = (c + i + 512) & 511
        if (v > this.island[u]) this.island[u] = v
      }
    }
    this.palms.push(16, 26, 114, 128, 368, 380)
    for (let r = 0; r < 7; r++) {
      const pat = new Uint8Array(256)
      let x = Math.floor(rnd() * 20)
      while (x < 256) {
        const len = 2 + Math.floor(rnd() * (r < 3 ? 5 : 8))
        for (let i = 0; i < len && x + i < 256; i++) pat[x + i] = 1
        x += len + 6 + Math.floor(rnd() * 18)
      }
      this.dashes.push(pat)
    }
    for (let i = 0; i < 40; i++) this.skyStars.push(Math.floor(rnd() * W), 3 + Math.floor(rnd() * 70), Math.floor(rnd() * 100))
  }

  get playing() { return this.state === 'intro' || this.state === 'play' }

  /** Dev only: invulnerable boat and time warp, for scripted screenshots. */
  god = false
  forceNext = ''
  spawnNow(name: string) { this.forceNext = name; this.spawnChunk() }
  warp(T: number) { this.T = T; this.dist = T * 60 }
  debugInfo() { return { state: this.state, T: this.T, lives: this.lives, score: this.score, x: this.bx, h: this.bh, ents: this.ents.filter(e => e.on).map(e => [e.kind, Math.round(e.x), Math.round(e.y), e.s]) } }

  get score() { return Math.floor(this.scoreF) + this.bonus }

  reset() {
    this.state = 'intro'
    this.T = 0; this.dist = 0; this.speed = 46; this.scoreF = 0; this.bonus = 0; this.stars = 0
    this.lives = 3; this.hitPause = 0; this.shake = 0; this.sinceSpawn = 0; this.nextGap = 150
    this.lastSwoop = -99; this.swoops = 0; this.lastHeart = 0; this.jumped = false
    this.bx = -DHOW_W; this.bvx = 0; this.bh = 0; this.bvh = 0; this.coyote = 0; this.buffer = 0; this.duckT = 0
    this.diving = false; this.squash = 0; this.stretch = 0; this.inv = 0
    this.resultT = 0; this.record = false; this.recordFired = false; this.ticked = 0; this.resultIdle = 0; this.exit = false
    this.bestBefore = this.host.best
    for (const e of this.ents) e.on = false
    this.plife.fill(0)
    this.popT.fill(0)
  }

  // ------------------------------------------------------------ input

  press(b: string) {
    const h = this.held
    if (b === 'left') h.left = true
    else if (b === 'right') h.right = true
    else if (b === 'a' || b === 'up') { if (b === 'a') h.a = true; else h.up = true }
    else if (b === 'b' || b === 'down') { if (b === 'b') h.b = true; else h.down = true }
    if (this.state === 'result') {
      this.resultIdle = 0
      if (this.resultT < 0.8) return
      if (b === 'a') { this.reset(); this.host.emit('start'); this.host.sfx('start') }
      else if (b === 'b') this.exit = true
      return
    }
    if (!this.playing) return
    if (b === 'a' || b === 'up') { this.buffer = BUFFER; this.jumped = true }
    if (b === 'b' || b === 'down') {
      if (this.bh > 0 && !this.diving) { this.diving = true; this.bvh = Math.min(this.bvh, DIVE_V); this.host.sfx('dive') }
      else if (this.bh <= 0) { if (this.duckT <= 0) this.host.sfx('duck'); this.duckT = 0.35 }
    }
  }

  release(b: string) {
    const h = this.held
    if (b === 'left') h.left = false
    else if (b === 'right') h.right = false
    else if (b === 'a') h.a = false
    else if (b === 'up') h.up = false
    else if (b === 'b') h.b = false
    else if (b === 'down') h.down = false
  }

  releaseAll() {
    const h = this.held
    h.left = h.right = h.a = h.b = h.up = h.down = false
  }

  // ------------------------------------------------------------ helpers

  private surfAt(x: number) {
    const d = this.dist, t = this.clock
    return SEA_Y + 2.2 * Math.sin((x + d) * 0.06 + t * 1.25) + 1.1 * Math.sin((x + d * 0.7) * 0.15 - t * 2.0)
  }

  private ent(kind: number, x: number, y: number): Ent {
    let e = this.ents[0]
    for (const c of this.ents) if (!c.on) { e = c; break }
    e.on = true; e.kind = kind; e.x = x; e.y = y; e.vx = 0; e.vy = 0; e.t = 0; e.s = 0; e.a = 0; e.b = 0
    return e
  }

  private particle(x: number, y: number, vx: number, vy: number, life: number, col: number, kind = 0) {
    const i = this.pnext
    this.pnext = (i + 1) % NP
    this.px[i] = x; this.py[i] = y; this.pvx[i] = vx; this.pvy[i] = vy; this.plife[i] = life; this.pcol[i] = col; this.pkind[i] = kind
  }

  private splash(x: number, y: number, n: number, force = 1) {
    const r = this.host.rand
    for (let i = 0; i < n; i++) this.particle(x + (r() - 0.5) * 10, y, (r() - 0.5) * 70 * force, -(40 + r() * 70) * force, 0.5 + r() * 0.3, FOAM, r() < 0.3 ? 1 : 0)
  }

  private popup(x: number, y: number, v: number) {
    const i = this.popNext
    this.popNext = (i + 1) & 7
    this.popX[i] = x; this.popY[i] = y; this.popT[i] = 0.8; this.popV[i] = v
  }

  lookA: Look = LOOK_DAY
  lookB: Look = LOOK_DAY
  lookMix = 0

  /** Update lookA/lookB/lookMix for the day/night cycle. */
  updateLook() {
    const T = this.T
    if (T < 2.5) { this.lookA = this.lookB = LOOK_DAY; this.lookMix = 0; return }
    const tm = T % CYCLE
    let idx = 0
    for (let i = 0; i < SEGMENTS.length; i++) if (tm >= SEGMENTS[i][0]) idx = i
    this.lookA = SEGMENTS[(idx + SEGMENTS.length - 1) % SEGMENTS.length][1]
    this.lookB = SEGMENTS[idx][1]
    this.lookMix = Math.min(1, (tm - SEGMENTS[idx][0]) / 2.5)
  }

  // ------------------------------------------------------------ spawning

  private spawnChunk() {
    const h = this.host, r = h.rand, T = this.T
    const x0 = W + 8
    const sp = this.speed
    let width = 20
    type Pick = [number, () => void, string?]
    const rockStars = (x: number, top: number) => {
      // three stars along the hop arc over a rock
      for (let k = -1; k <= 1; k++) this.ent(K_STAR, x + k * 13 - 4, top - (k === 0 ? 30 : 22)).a = r() * 6
    }
    const picks: Pick[] = [
      [T < 20 ? 3 : 1.6, () => { const e = this.ent(K_ROCK_S, x0, SEA_Y + 3 - ROCK_S.h); width = 14; if (r() < 0.35) rockStars(x0 + 7, e.y) }, 'rock'],
      [2, () => {
        const n = 3 + Math.floor(r() * 3), wave = T > 10 && r() < 0.5
        for (let i = 0; i < n; i++) this.ent(K_STAR, x0 + i * 15, SEA_Y - 22 - (wave ? Math.round(Math.sin((i / (n - 1)) * Math.PI) * 18) : 0)).a = i
        width = n * 15
      }, 'stars'],
    ]
    if (T >= 12) picks.push([2, () => { const e = this.ent(K_ROCK_L, x0, SEA_Y + 3 - ROCK_L.h); width = 18; if (r() < 0.4) rockStars(x0 + 9, e.y) }, 'big'])
    if (T >= 28) picks.push([1.4, () => {
      const gap = 44 + Math.round(sp * 0.85)
      this.ent(K_ROCK_S, x0, SEA_Y + 3 - ROCK_S.h)
      const big = r() < 0.5
      this.ent(big ? K_ROCK_L : K_ROCK_S, x0 + gap, SEA_Y + 3 - (big ? ROCK_L.h : ROCK_S.h))
      width = gap + 18
    }, 'double'])
    if (T >= 20) picks.push([1.5, () => {
      const e = this.ent(K_FISH, W - 4, SEA_Y)
      e.s = 0
      // a few stars low on the water as bait to stay down
      for (let i = 0; i < 2; i++) this.ent(K_STAR, W + 30 + i * 14, SEA_Y - 20).a = i
      width = 60
    }, 'fish'])
    if (T >= 36) picks.push([1.3, () => {
      // the Roc drops a boulder a little ahead of the boat; it then sits in the sea as a rock
      const Ti = 2.1, Tf = 0.62
      const land = this.bx + DHOW_W / 2 + 34 + r() * 22
      const b = this.ent(K_BOULDER, land + sp * Ti - 5, 0)
      b.t = Ti; b.a = Tf
      const bird = this.ent(K_ROC, W + 12, 10)
      const meet = b.x - sp * (Ti - Tf)
      bird.vx = (meet - (W + 12)) / (Ti - Tf) - 4
      bird.a = Ti - Tf
      h.sfx('warn')
      width = 70
    }, 'boulder'])
    if (T >= FIRST_SWOOP && T - this.lastSwoop > 13) picks.push([this.swoops === 0 ? 50 : 1.3, () => {
      const w = this.ent(K_WARN, W - 16, 81)
      w.t = 1.3
      this.lastSwoop = T
      this.swoops++
      width = 90
    }, 'swoop'])
    if (this.lives < 3 && T > 20 && T - this.lastHeart > 24) picks.push([1.4, () => {
      this.ent(K_HEART, x0, SEA_Y - 40)
      this.lastHeart = T
      width = 20
    }, 'heart'])
    const forced = this.forceNext ? picks.find(p => p[2] === this.forceNext) : undefined
    this.forceNext = ''
    if (forced) forced[1]()
    let total = forced ? 0 : 0.0001
    if (!forced) for (const p of picks) total += p[0]
    let roll = r() * total
    if (!forced) for (const p of picks) { roll -= p[0]; if (roll <= 0) { p[1](); break } }
    const k = Math.min(1, Math.max(0, (T - 3) / 140))
    const gapTime = 2.3 - 1.15 * k + r() * 0.5
    this.nextGap = width + sp * gapTime
    this.sinceSpawn = 0
  }

  // ------------------------------------------------------------ simulation

  step(dt: number) {
    const h = this.host
    this.clock += dt
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt)
    this.stepParticles(dt)
    if (this.state === 'result') { this.stepResult(dt); return }
    if (this.hitPause > 0) { this.hitPause -= dt; return }
    if (this.state === 'sink') {
      this.T += dt
      this.speed = Math.max(0, this.speed - 45 * dt)
      this.dist += this.speed * dt
      this.bh -= 9 * dt
      this.bvh = 0
      this.wakeT -= dt
      if (this.wakeT <= 0) { this.wakeT = 0.08; this.particle(this.bx + 6 + h.rand() * 16, this.surfAt(this.bx + 14) - 2, 0, -20, 0.6, FOAM, 2) }
      this.stepEnts(dt, false)
      this.resultT += dt
      if (this.resultT > 1.3) {
        this.state = 'result'
        this.resultT = 0
        const score = this.score
        this.record = score > this.bestBefore && score > 0
        if (this.record) h.saveBest(score)
        h.emit('gameover')
        h.sfx('over')
      }
      return
    }

    this.T += dt
    const ramp = Math.min(1, this.T / 150)
    this.speed = 46 + 40 * ramp * (2 - ramp)
    const move = this.speed * dt
    this.dist += move
    if (this.state === 'play') this.scoreF += move / 10

    // boat: horizontal
    const held = this.held
    if (this.state === 'intro') {
      this.bx += (HOME_X - this.bx) * Math.min(1, dt * 4) + 20 * dt
      if (this.bx >= HOME_X - 0.5) { this.bx = HOME_X; this.state = 'play' }
    } else {
      const dir = (held.right ? 1 : 0) - (held.left ? 1 : 0)
      const target = dir * 62
      const acc = dir !== 0 ? 520 : 420
      if (this.bvx < target) this.bvx = Math.min(target, this.bvx + acc * dt)
      else if (this.bvx > target) this.bvx = Math.max(target, this.bvx - acc * dt)
      this.bx += this.bvx * dt
      if (this.bx < MIN_X) { this.bx = MIN_X; this.bvx = 0 }
      if (this.bx > MAX_X) { this.bx = MAX_X; this.bvx = 0 }
    }

    // boat: vertical
    const grounded = this.bh <= 0
    if (grounded) this.coyote = COYOTE
    else this.coyote = Math.max(0, this.coyote - dt)
    if (this.buffer > 0) {
      this.buffer = Math.max(0, this.buffer - dt)
      if (this.coyote > 0 && this.bvh <= 0) {
        this.bvh = JUMP_V; this.bh = Math.max(this.bh, 0.01); this.coyote = 0; this.buffer = 0; this.diving = false
        this.stretch = 1; this.duckT = 0
        h.sfx('jump')
        this.splash(this.bx + 14, this.surfAt(this.bx + 14), 6, 0.6)
      }
    }
    if (this.bh > 0) {
      const holding = held.a || held.up
      if (!holding && this.bvh > CUT_V && !this.diving) this.bvh = CUT_V
      this.bvh -= (this.bvh > 0 ? GRAV_UP : GRAV_DOWN) * dt * (this.diving ? 1.6 : 1)
      this.bh += this.bvh * dt
      if (this.bh <= 0) {
        const impact = -this.bvh
        this.bh = 0; this.bvh = 0
        this.squash = Math.min(1, impact / 230)
        const sx = this.bx + 14, sy = this.surfAt(sx)
        this.splash(sx - 8, sy, this.diving ? 14 : 7, this.diving ? 1.3 : 0.8)
        this.splash(sx + 8, sy, this.diving ? 10 : 4, this.diving ? 1.3 : 0.8)
        h.sfx(this.diving ? 'splash' : 'land')
        if (this.diving) { this.duckT = 0.25; if (!h.reduced) this.shake = Math.max(this.shake, 0.08) }
        this.diving = false
      }
    }
    if (this.duckT > 0) this.duckT = Math.max(0, this.duckT - dt)
    if (this.squash > 0) this.squash = Math.max(0, this.squash - dt * 5)
    if (this.stretch > 0) this.stretch = Math.max(0, this.stretch - dt * 4)
    if (this.inv > 0) this.inv = Math.max(0, this.inv - dt)

    // wake trail
    this.wakeT -= dt
    if (this.wakeT <= 0 && this.bh <= 0) {
      this.wakeT = 0.07
      const sy = this.surfAt(this.bx + 2)
      this.particle(this.bx + 1, sy - 1, -this.speed * 0.6 - 12, -10 - h.rand() * 15, 0.35, FOAM)
    }

    // spawning
    if (this.state === 'play') {
      this.sinceSpawn += move
      if (this.sinceSpawn >= this.nextGap) this.spawnChunk()
    }
    this.stepEnts(dt, true)
  }

  private ducked() {
    return this.bh <= 0 && (this.duckT > 0 || this.held.b || this.held.down)
  }

  private boatTop() {
    return this.surfAt(this.bx + 14) - DHOW_H - this.bh
  }

  private stepEnts(dt: number, collide: boolean) {
    const h = this.host, sp = this.speed
    const bx = this.bx, by = this.boatTop(), ducked = this.ducked()
    const vulnerable = collide && this.inv <= 0 && this.state === 'play' && !this.god
    for (const e of this.ents) {
      if (!e.on) continue
      e.t += dt
      if (e.kind !== K_WARN) e.x -= sp * dt
      switch (e.kind) {
        case K_ROCK_S: case K_ROCK_L: {
          const s = e.kind === K_ROCK_S ? ROCK_S : ROCK_L
          if (vulnerable && this.hitsBoat(e.x + 4, e.y + 3, s.w - 8, s.h - 3, bx, by, ducked)) this.hurt()
          break
        }
        case K_STAR: case K_HEART: {
          const yy = e.y + Math.sin(this.clock * 3 + e.a) * 2
          if (collide && this.state === 'play' && overlap(e.x - 3, yy - 3, 15, 15, bx + 2, by + (ducked ? 11 : 2), 24, ducked ? 10 : 19)) {
            e.on = false
            for (let i = 0; i < 8; i++) {
              const a = (i / 8) * Math.PI * 2
              this.particle(e.x + 4, yy + 4, Math.cos(a) * 55, Math.sin(a) * 55, 0.35, i & 1 ? CREAM : PINK, 1)
            }
            if (e.kind === K_STAR) {
              this.stars++
              this.bonus += 10
              this.popup(e.x, yy - 4, 10)
              h.sfx('collect')
            } else {
              this.lives = Math.min(3, this.lives + 1)
              h.sfx('heart')
            }
            h.emit('collect')
          }
          break
        }
        case K_FISH: {
          const boatC = bx + DHOW_W / 2
          if (e.s === 0) {
            // lurking under the surface, bubbling (the telegraph)
            if (Math.floor(e.t * 12) !== Math.floor((e.t - dt) * 12)) this.particle(e.x + 4 + h.rand() * 9, this.surfAt(e.x + 8) - 1, (h.rand() - 0.5) * 10, -25 - h.rand() * 30, 0.4, FOAM, 2)
            if (e.t > 0.75 && e.x < boatC + 80) {
              // leap over the boat: take off here, land well behind it
              const Tl = 0.95, apex = 54
              const g = (8 * apex) / (Tl * Tl)
              e.s = 1; e.t = 0
              e.vx = (boatC - 50 - e.x) / Tl
              e.vy = (g * Tl) / 2
              e.b = g
              e.a = 0
              this.splash(e.x + 8, SEA_Y, 8, 1)
              h.sfx('splash')
            }
          } else if (e.s === 1) {
            e.x += (e.vx + sp) * dt
            e.vy -= e.b * dt
            e.a += e.vy * dt
            e.y = this.surfAt(e.x + 8) - e.a - 4
            if (e.a < -6) { e.s = 2; this.splash(e.x + 8, SEA_Y, 8, 1) }
            else if (vulnerable && this.hitsBoat(e.x + 3, e.y + 1, FISH.w - 6, FISH.h - 2, bx, by, ducked)) this.hurt()
          } else if (e.t > 0.3) e.on = false
          break
        }
        case K_ROC:
          e.x += (e.vx + sp) * dt
          break
        case K_BOULDER: {
          e.t -= dt * 2 // (t counts down; it was advanced above)
          const left = e.t
          if (left <= e.a && e.s === 0) { e.s = 1; h.sfx('drop') }
          if (e.s === 1) {
            const g = 2 * (SEA_Y - 8 - 14) / (e.a * e.a)
            e.y = SEA_Y - 8 - 0.5 * g * left * left
            if (vulnerable && this.hitsBoat(e.x + 1, e.y + 1, 8, 8, bx, by, ducked)) {
              this.hurt(); e.on = false; this.splash(e.x + 5, SEA_Y, 10, 1.2)
              break
            }
          }
          if (left <= 0) {
            this.splash(e.x + 5, SEA_Y, 18, 1.5)
            h.sfx('splash')
            if (!h.reduced) this.shake = Math.max(this.shake, 0.1)
            // it stays in the sea as a rock
            const rx = e.x - 4
            e.kind = K_ROCK_L; e.x = rx; e.y = SEA_Y + 3 - ROCK_L.h; e.t = 0; e.s = 0
            if (vulnerable && this.hitsBoat(e.x + 3, e.y + 3, ROCK_L.w - 6, ROCK_L.h - 3, bx, by, ducked)) this.hurt()
          }
          break
        }
        case K_WARN: {
          e.t -= dt * 2
          if (Math.floor(e.t * 4) !== Math.floor((e.t + dt) * 4)) h.sfx('warn')
          if (e.t <= 0) {
            const s = this.ent(K_SWOOP, W + 6, e.y)
            s.vx = -(sp + 105)
            e.on = false
            h.sfx('dive')
          }
          break
        }
        case K_SWOOP: {
          e.x += (e.vx + sp) * dt
          if (vulnerable && this.hitsBoat(e.x + 3, e.y + 5, 20, 5, bx, by, ducked)) this.hurt()
          break
        }
      }
      if (e.on && e.x < -44) e.on = false
    }
  }

  private hitsBoat(x: number, y: number, w: number, h: number, bx: number, by: number, ducked: boolean) {
    if (overlap(x, y, w, h, bx + 6, by + 15, 17, 6)) return true
    if (ducked) return overlap(x, y, w, h, bx + 3, by + 12, 20, 4)
    return overlap(x, y, w, h, bx + 4, by + 3, 12, 12) || overlap(x, y, w, h, bx + 8, by + 10, 12, 5)
  }

  private hurt() {
    const h = this.host
    this.lives--
    this.inv = 1.7
    this.hitPause = 0.13
    if (!h.reduced) this.shake = 0.32
    this.bvh = Math.max(this.bvh, 110); this.bh = Math.max(this.bh, 0.5); this.diving = false
    this.bx = Math.max(MIN_X, this.bx - 8)
    const cx = this.bx + 14, cy = this.boatTop() + 12
    for (let i = 0; i < 10; i++) this.particle(cx, cy, (h.rand() - 0.5) * 120, -40 - h.rand() * 90, 0.6, OBJ, h.rand() < 0.5 ? 1 : 0)
    this.splash(cx, SEA_Y, 8, 1)
    h.emit('hit')
    h.sfx('hit')
    if (this.lives <= 0) {
      this.lives = 0
      this.state = 'sink'
      this.resultT = 0
      this.inv = 0
      this.bvh = 0; this.bh = 0
    }
  }

  private stepParticles(dt: number) {
    for (let i = 0; i < NP; i++) {
      if (this.plife[i] <= 0) continue
      this.plife[i] -= dt
      this.px[i] += this.pvx[i] * dt
      this.py[i] += this.pvy[i] * dt
      if (this.pkind[i] === 2) this.pvy[i] -= 10 * dt
      else if (this.pkind[i] !== 3) this.pvy[i] += 260 * dt
      else this.pvy[i] += 60 * dt
    }
    for (let i = 0; i < 8; i++) if (this.popT[i] > 0) { this.popT[i] -= dt; this.popY[i] -= 14 * dt; this.popX[i] -= this.speed * dt * 0.5 }
  }

  private stepResult(dt: number) {
    const h = this.host
    this.resultT += dt
    this.resultIdle += dt
    const tally = Math.min(1, Math.max(0, (this.resultT - 0.35) / 0.9))
    const shown = Math.floor(this.score * tally)
    if (shown !== this.ticked && Math.floor(shown / Math.max(1, Math.ceil(this.score / 12))) !== Math.floor(this.ticked / Math.max(1, Math.ceil(this.score / 12)))) h.sfx('tick')
    this.ticked = shown
    if (this.record && !this.recordFired && tally >= 1) {
      this.recordFired = true
      h.emit('record')
      h.sfx('record')
      for (let i = 0; i < 40; i++) this.particle(h.rand() * W, -4 - h.rand() * 40, (h.rand() - 0.5) * 30, 20 + h.rand() * 30, 3 + h.rand() * 2, h.rand() < 0.6 ? PINK : CREAM, 3)
    }
    if (this.resultIdle > 8.5) this.exit = true
  }

  // ------------------------------------------------------------ drawing

  draw(g: Gfx) {
    const h = this.host
    const shaking = this.shake > 0 && !h.reduced
    g.ox = shaking ? Math.round((h.rand() - 0.5) * 4) : 0
    g.oy = shaking ? Math.round((h.rand() - 0.5) * 4) : 0
    for (let x = 0; x <= W + 1; x++) this.surf[x] = Math.round(this.surfAt(x))
    this.drawSky(g)
    this.drawFar(g)
    // hazards that sit in the water, the boat, then the near water over their bases
    for (const e of this.ents) if (e.on && (e.kind === K_ROCK_S || e.kind === K_ROCK_L)) g.blit(e.kind === K_ROCK_S ? ROCK_S : ROCK_L, e.x, e.y)
    this.drawBoat(g)
    this.drawSea(g)
    for (const e of this.ents) if (e.on && (e.kind === K_ROCK_S || e.kind === K_ROCK_L)) {
      const s = e.kind === K_ROCK_S ? ROCK_S : ROCK_L
      const fo = Math.floor(this.clock * 4 + e.x * 0.1) & 1
      g.rect(e.x - 2 - fo, this.surf[Math.max(0, Math.min(W, Math.round(e.x)))] - 1, 3, 2, FOAM)
      g.rect(e.x + s.w - 1 + fo, this.surf[Math.max(0, Math.min(W, Math.round(e.x + s.w)))] - 1, 3, 2, FOAM)
    }
    this.drawEnts(g)
    this.drawParticles(g)
    g.ox = 0; g.oy = 0
    this.drawHud(g)
    if (this.state === 'result') this.drawResult(g)
  }

  private drawSky(g: Gfx) {
    const tm = this.T % CYCLE, t = this.clock
    g.rect(0, 0, W, HORIZON, SKY)
    g.dither(0, 62, W, 6, SKY2, 2)
    g.dither(0, 68, W, 6, SKY2, 5)
    g.dither(0, 74, W, 5, SKY2, 8)
    g.dither(0, 79, W, 5, SKY2, 12)
    // stars (invisible by day: STAR maps to the sky colour)
    const st = this.skyStars
    const drift = Math.floor(this.dist * 0.02)
    for (let i = 0; i < st.length; i += 3) {
      const x = ((st[i] - drift) % W + W) % W, y = st[i + 1]
      g.px(x, y, STAR_C)
      if (st[i + 2] < 18 && Math.sin(t * 2.5 + st[i + 2]) > 0.2) { g.px(x - 1, y, STAR_C); g.px(x + 1, y, STAR_C); g.px(x, y - 1, STAR_C); g.px(x, y + 1, STAR_C) }
    }
    // clouds
    const off = this.dist * 0.12 + t * 1.5
    const cl = CLOUD_LAYOUT
    for (let i = 0; i < cl.length; i += 3) {
      const x = ((cl[i] - off) % 400 + 400) % 400 - 40
      if (x < W) g.blit(CLOUDS[cl[i + 2]], x, cl[i + 1])
    }
    // sun / moon
    if (tm < 52) this.sun(g, 118, 22 + (tm / 52) * 80)
    else if (tm > 102) this.sun(g, 118, 102 - ((tm - 102) / 18) * 80)
    if (tm > 44 && tm < 110) {
      const k = (tm - 44) / 66
      const my = Math.round(98 - Math.sin(k * Math.PI) * 76)
      g.disc(44, my, 15, GLOW)
      g.disc(49, my - 3, 13, SKY)
    }
  }

  private sun(g: Gfx, x: number, y: number) {
    y = Math.round(y)
    g.disc(x, y, 19, OBJ2)
    g.disc(x, y, 17, GLOW)
  }

  private drawFar(g: Gfx) {
    const fd = Math.floor(this.dist * 0.25)
    const isl = this.island
    for (let x = 0; x < W; x++) {
      const v = isl[(x + fd) & 511]
      if (v > 0) { g.rect(x, HORIZON - v, 1, v, FAR); g.px(x, HORIZON - v, FARLINE) }
    }
    for (const p of this.palms) {
      let x = ((p - fd) % 512 + 512) % 512
      if (x > W + 10) x -= 512
      if (x > -12 && x < W + 2) g.blit(PALM, x - 4, HORIZON - isl[p & 511] - PALM.h + 1)
    }
    let lx = ((this.lighthouse - fd) % 512 + 512) % 512
    if (lx > W + 10) lx -= 512
    if (lx > -40 && lx < W + 40) {
      const top = HORIZON - isl[this.lighthouse] - LIGHTHOUSE.h + 1
      // sweeping beam (only visible at night: BEAM matches the sky by day)
      const dir = Math.floor(this.clock / 1.4) & 1 ? 1 : -1
      for (let i = 1; i < 34; i++) {
        const half = Math.floor(i / 6)
        g.dither(lx + dir * (i + 3), top + 3 - half, 1, half * 2 + 1, BEAM, 7 - Math.floor(i / 6))
      }
      g.blit(LIGHTHOUSE, lx - 3, top)
    }
    g.rect(0, HORIZON, W, SEA_Y - HORIZON + 10, SEAFAR)
    g.rect(0, HORIZON, W, 1, SEAFAR_LINE)
    const rows = FAR_ROWS, par = FAR_PAR
    for (let r = 0; r < 4; r++) {
      const pat = this.dashes[r], off = Math.floor(this.dist * par[r] + this.clock * 3 * (r + 1))
      const y = rows[r]
      for (let x = 0; x < W; x++) if (pat[(x + off) & 255]) g.px(x, y, SEAFAR_LINE)
    }
  }

  private drawSea(g: Gfx) {
    const s = this.surf
    for (let x = 0; x < W; x++) {
      const top = s[x]
      g.rect(x, top, 1, 2, FOAM)
      g.rect(x, top + 2, 1, H - top - 2, SEA)
      if (x > 0 && top < s[x - 1] && top <= s[x + 1]) { g.rect(x - 1, top - 1, 3, 1, FOAM) }
    }
    const rows = NEAR_ROWS, par = NEAR_PAR
    for (let r = 0; r < 3; r++) {
      const pat = this.dashes[4 + r], off = Math.floor(this.dist * par[r])
      for (let x = 0; x < W; x++) if (pat[(x + off) & 255]) g.px(x, rows[r], SEA_LINE)
    }
  }

  private drawBoat(g: Gfx) {
    const h = this.host
    if (this.inv > 0 && !h.reduced && Math.floor(this.inv * 12) % 2 === 1) return
    const holes = this.inv > 0 && h.reduced
    const flag = Math.floor(this.clock * 6) & 1
    const spr = this.ducked() || this.state === 'sink' ? DHOW_FURLED[flag] : DHOW[flag]
    const sq = this.squash > 0 ? Math.sin(this.squash * Math.PI * 0.5) : 0
    const st = this.stretch > 0 ? Math.sin(this.stretch * Math.PI) : 0
    const dw = Math.round(DHOW_W * (1 + sq * 0.18 - st * 0.1))
    const dh = Math.round(DHOW_H * (1 - sq * 0.2 + st * 0.14))
    const cx = this.bx + DHOW_W / 2
    let shear: number
    if (this.bh > 0) shear = Math.max(-0.3, Math.min(0.3, -this.bvh * 0.0016))
    else shear = Math.max(-0.3, Math.min(0.3, (this.surfAt(cx + 8) - this.surfAt(cx - 8)) / 16))
    if (this.state === 'sink') shear = Math.min(0.45, this.resultT * 0.4)
    const bottom = this.surfAt(cx) - this.bh
    g.blit(spr, Math.round(cx - dw / 2), Math.round(bottom - dh), false, -1, dw, dh, shear, holes)
  }

  private drawEnts(g: Gfx) {
    const h = this.host, t = this.clock, still = h.reduced
    for (const e of this.ents) {
      if (!e.on) continue
      switch (e.kind) {
        case K_STAR: {
          const yy = e.y + Math.round(Math.sin(t * 3 + e.a) * 2)
          const w = Math.max(1, Math.round(9 * Math.abs(Math.cos(t * 2.2 + e.a))))
          g.blit(STAR, e.x + Math.round((9 - (w | 1)) / 2), yy, false, -1, w | 1, 9)
          break
        }
        case K_HEART: {
          const yy = e.y + Math.round(Math.sin(t * 3) * 2)
          g.blit(HEART, e.x, yy)
          if (!still && Math.floor(t * 4) & 1) g.glyph(SPARK, e.x + 8, yy - 4, CREAM)
          break
        }
        case K_FISH: {
          if (e.s === 1) {
            const shear = Math.max(-0.6, Math.min(0.6, (e.vy / Math.max(30, Math.abs(e.vx))) * 0.35))
            g.blit(FISH, e.x, e.y, false, -1, FISH.w, FISH.h, shear)
          } else if (e.s === 0) {
            const sy = this.surf[Math.max(0, Math.min(W, Math.round(e.x + 8)))]
            const bob = still ? 0 : Math.round(Math.sin(e.t * 9))
            g.blit(FIN, e.x + 5, sy - 5 + bob)
            const wv = still ? 3 : 2 + (Math.floor(t * 8) & 1) * 2
            g.rect(e.x + 4 - wv, sy - 1, wv, 1, FOAM)
            g.rect(e.x + 12, sy - 1, wv + 1, 1, FOAM)
          }
          break
        }
        case K_ROC: case K_SWOOP: {
          const f = Math.floor(t * (e.kind === K_SWOOP ? 10 : 6)) & 3
          g.blit(ROC[f], e.x, e.y)
          break
        }
        case K_BOULDER: {
          // landing marker
          const mx = Math.round(e.x + 5)
          const sy = this.surf[Math.max(0, Math.min(W, mx))]
          if (still || Math.floor(t * 6) & 1 || e.s === 1) g.glyph(DOWN, mx - 3, sy - 12, HUD)
          const ring = 4 + Math.round(Math.max(0, e.t) * 4)
          g.rect(mx - ring, sy + 2, ring * 2, 1, FOAM)
          if (e.s === 1) g.blit(BOULDER, e.x, e.y)
          break
        }
        case K_WARN: {
          if (!still && e.t % 0.4 > 0.28) break
          const x = e.x, y = e.y
          g.rect(x - 1, y - 1, 10, 12, HUD)
          g.glyph(BANG, x + 3, y + 1, SKY)
          if (this.swoops <= 2) {
            g.glyph(BTN, x - 26, y - 1, PINK)
            g.glyph(LETTER_B, x - 23, y + 2, CREAM)
            g.glyph(DOWN, x - 12, y + 3, HUD)
          }
          break
        }
      }
    }
    // score popups
    for (let i = 0; i < 8; i++) {
      if (this.popT[i] <= 0) continue
      const x = Math.round(this.popX[i]), y = Math.round(this.popY[i])
      g.glyph(PLUS, x - 6, y, PINK)
      numberAt(g, this.popV[i], x, y, PINK)
    }
  }

  private drawParticles(g: Gfx) {
    for (let i = 0; i < NP; i++) {
      if (this.plife[i] <= 0) continue
      const k = this.pkind[i], x = this.px[i], y = this.py[i], c = this.pcol[i]
      if (k === 1) g.rect(x, y, 2, 2, c)
      else if (k === 3) { g.rect(x, y, 2, 2, c); if ((i & 3) === 0) g.rect(x + 2, y, 1, 1, c) }
      else g.px(x, y, c)
    }
  }

  private drawHud(g: Gfx) {
    for (let i = 0; i < 3; i++) g.blit(i < this.lives ? HUD_HEART : HUD_HEART_EMPTY, 4 + i * 9, 4)
    const sc = this.score
    numberAt(g, sc, 156 - numberWidth(sc), 3, HUD)
    // first-seconds hint: press A to hop
    if (this.state !== 'result' && this.T < 8 && !this.jumped && (this.host.reduced || Math.floor(this.clock * 3) & 1)) {
      const x = Math.round(this.bx) + 9, y = Math.round(this.boatTop()) - 16
      g.glyph(BTN, x, y, PINK)
      g.glyph(LETTER_A, x + 3, y + 3, CREAM)
    }
  }

  private drawResult(g: Gfx) {
    const h = this.host, t = this.resultT, still = h.reduced
    g.dither(0, 0, W, H, INK, Math.min(8, Math.round(t * 24)))
    const k = Math.min(1, t / 0.35)
    const ease = 1 - (1 - k) * (1 - k) * (1 - k)
    const pw = 108, ph = 70
    const x0 = 26, y0 = Math.round(-ph - 4 + (ph + 4 + 22) * (still ? 1 : ease))
    g.rect(x0 - 2, y0 - 2, pw + 4, ph + 4, INK)
    g.rect(x0, y0, pw, ph, PALE)
    g.rect(x0 + 2, y0 + ph, pw - 2, 2, MID)
    const tally = Math.min(1, Math.max(0, (t - 0.35) / 0.9))
    const shown = Math.floor(this.score * tally)
    const done = tally >= 1
    const big = numberWidth(shown, 2)
    const scoreCol = this.record && done ? (still || Math.floor(t * 4) & 1 ? PINK : INK) : INK
    numberAt(g, shown, 80 - Math.round(big / 2), y0 + 8, scoreCol, 2)
    if (this.record && done) {
      const tw = still ? 0 : Math.floor(t * 5) & 1
      g.glyph(SPARK, 80 - Math.round(big / 2) - 10, y0 + 6 + tw * 4, PINK)
      g.glyph(SPARK, 80 + Math.round(big / 2) + 5, y0 + 14 - tw * 4, PINK)
    }
    for (let x = x0 + 8; x < x0 + pw - 8; x += 3) g.px(x, y0 + 29, MID)
    // best (crown) and stars collected
    const best = Math.max(this.bestBefore, this.record ? this.score : 0)
    const crownY = y0 + 35 - (this.record && done && !still ? Math.abs(Math.round(Math.sin(t * 6) * 2)) : 0)
    g.glyph(CROWN, x0 + 10, crownY, this.record ? PINK : INK)
    numberAt(g, best, x0 + 22, y0 + 34, INK)
    g.blit(STAR, x0 + 66, y0 + 33)
    numberAt(g, this.stars, x0 + 78, y0 + 34, INK)
    // prompts: (A) replay   (B) home
    if (t > 0.8) {
      const py = y0 + 51
      g.glyph(BTN, x0 + 12, py, INK)
      g.glyph(LETTER_A, x0 + 15, py + 3, PALE)
      g.glyph(REPLAY, x0 + 26, py + 1, INK)
      g.glyph(BTN, x0 + 62, py, INK)
      g.glyph(LETTER_B, x0 + 65, py + 3, PALE)
      g.glyph(SMILEY, x0 + 76, py + 1, PINK)
    }
  }
}
