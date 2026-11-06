// The pop-up mechanism: where every piece stands on the page, when it rises, and how it moves once it has. A scroll position
// sets the targets, and a spring on each hinge carries the piece there, so it lags, overshoots and settles like card under
// tension. Coordinates: x across the page from the gutter, y up, z toward the reader. The Arabic book is the same machine built
// the other way round: the whole rig is mirrored in x before lighting, and its own timing table replaces the English one.
import { ARCH, BOOK, CHAPTER_TAB, CHAPTER_TABS, DOOR_FAR, DOOR_NEAR, INDEX, LEAF, LOWER, RIBBON, SPINE, TURN, TURNS, UPPER, WINDOW } from './book'
import { clamp01, compose, identity, lerp, mul, RAD, smooth, smoother, type M4 } from './math'

export const MAX_PARTS = 96

export type Spec = {
  id: string
  mesh: string // a piece in pieces.bin, or 'strip'
  parent?: string // another piece's id, or 'lower' or 'upper'; default is the world page
  x: number
  y?: number
  z: number
  s?: number
  flip?: boolean
  yaw?: number
  /** Final tilt in degrees: 0 stands upright, negative leans back toward the camera's eye. */
  lean?: number
  /** Tilt when folded. 88 lies on the page, toward the reader. */
  fold?: number
  /** Slit pieces rise straight up out of the page instead of folding. */
  slit?: number
  start: number
  dur: number
  /** Chevron plan, as in a V-fold: this much z per unit of x from the crease. */
  v?: number
  /** A belly: local z per x squared. */
  belly?: number
  /** Top of the piece lags the base by this much of the hinge's speed. */
  flex?: number
  w?: number // strips: height
  /** Spring on the hinge: natural frequency and damping ratio. */
  hz?: number
  zeta?: number
  move?: Move
  phase?: number
}

export type Move = 'wave' | 'hullbob' | 'sail' | 'flag' | 'palm' | 'cloud' | 'spin' | 'gull' | 'wingN' | 'wingF' | 'crest' | 'arm' | 'yas' | 'hoopoe' | 'tab' | 'dolphin'


// The world, in the order that it rises. Back rows lie on top of front ones, so they lift first, as in a real book.
const WORLD: Spec[] = [
  { id: 'sun', mesh: 'strip', w: 0.46, x: 0.3, z: -0.6, slit: 0.46 + 0.2, start: 0.61, dur: 0.15, hz: 1.9, zeta: 0.42 },
  { id: 'sun_rays', mesh: 'sun_rays', parent: 'sun', x: 0, y: 0.46, z: 0.004, s: 0.8, lean: -34, start: 0, dur: 0, move: 'spin' },
  { id: 'sun_disc', mesh: 'sun_disc', parent: 'sun', x: 0, y: 0.46, z: 0.008, s: 0.8, lean: -34, start: 0, dur: 0 },
  // The coast continues over the words' page, and stands up as that page lands, driven by the page itself.
  { id: 'coast_left', mesh: 'coast_left', parent: 'upper', x: -0.49, s: 0.96, z: -0.6, lean: -10, start: 0.13, dur: 0.11, hz: 1.7 },
  { id: 'coast_far', mesh: 'coast_far', x: 0.5, z: -0.58, lean: -10, start: 0.22, dur: 0.14, v: 0.05, hz: 1.7 },
  { id: 'coast_town', mesh: 'coast_town', x: 0.5, z: -0.5, lean: -12, start: 0.25, dur: 0.13, v: -0.04, hz: 1.8 },
  { id: 'isle', mesh: 'isle', x: 0.23, z: -0.42, lean: -14, s: 0.8, start: 0.29, dur: 0.1 },
  { id: 'palm_far', mesh: 'palm_far', x: 0.15, z: -0.415, lean: -14, s: 0.86, start: 0.32, dur: 0.1, move: 'palm', phase: 2 },
  { id: 'sea1', mesh: 'sea1', x: 0.5, z: -0.36, lean: -16, start: 0.30, dur: 0.1, v: 0.1, flex: 1, move: 'wave', phase: 0 },
  { id: 'light', mesh: 'light', x: 0.77, z: -0.3, lean: -16, s: 0.92, start: 0.34, dur: 0.11, hz: 2.2 },
  { id: 'sea2', mesh: 'sea2', x: 0.5, z: -0.24, lean: -18, start: 0.35, dur: 0.1, v: -0.1, flex: 1, move: 'wave', phase: 1 },
  { id: 'fort', mesh: 'fort', x: 0.3, z: -0.17, lean: -18, s: 0.86, start: 0.38, dur: 0.11, hz: 2.2 },
  { id: 'palm_fort', mesh: 'palm_short', x: 0.56, z: -0.165, lean: -18, s: 0.8, start: 0.42, dur: 0.09, move: 'palm', phase: 1 },
  { id: 'sea3', mesh: 'sea3', x: 0.5, z: -0.09, lean: -20, start: 0.40, dur: 0.1, v: 0.11, flex: 1, move: 'wave', phase: 2 },
  { id: 'hull', mesh: 'hull', x: 0.62, y: 0.05, z: -0.015, lean: -20, s: 0.86, start: 0.43, dur: 0.11, hz: 2.2, zeta: 0.42, move: 'hullbob', flex: 0.4 },
  { id: 'sail', mesh: 'sail', parent: 'hull', x: 0.0, y: 0.1, z: -0.012, lean: 0, fold: 86, start: 0.48, dur: 0.1, belly: 0.55, hz: 1.8, zeta: 0.36, move: 'sail', flex: 0.5 },
  { id: 'flag', mesh: 'flag', parent: 'sail', x: -0.022, y: 0.455, z: 0.002, lean: 0, fold: 0, start: 0.55, dur: 0.05, move: 'flag', flex: 0.5 },
  { id: 'dolphin', mesh: 'dolphin', x: 0.34, z: 0.045, lean: -22, s: 0.9, start: 0, dur: 0, move: 'dolphin' },
  { id: 'sea4', mesh: 'sea4', x: 0.5, z: 0.08, lean: -22, start: 0.45, dur: 0.1, v: -0.12, flex: 1, move: 'wave', phase: 3 },
  { id: 'sea5', mesh: 'sea5', x: 0.5, z: 0.23, lean: -24, start: 0.50, dur: 0.1, v: 0.12, flex: 1, move: 'wave', phase: 4 },
  { id: 'palm_tall', mesh: 'palm_tall', x: 0.08, z: 0.29, lean: -24, s: 0.88, start: 0.55, dur: 0.1, move: 'palm', phase: 3, hz: 2 },
  { id: 'yas', mesh: 'yasmina', x: 0.285, z: 0.33, lean: -26, s: 0.96, start: 0.57, dur: 0.1, hz: 2.3, zeta: 0.4, move: 'yas' },
  { id: 'yas_arm', mesh: 'yas_arm', parent: 'yas', x: 0.026, y: 0.186, z: 0.004, lean: 0, fold: 0, start: 0.60, dur: 0.05, move: 'arm' },
  { id: 'hoopoe_wire', mesh: 'strip', w: 0.2, x: 0.5, z: 0.335, lean: -26, start: 0.60, dur: 0.1, hz: 2, zeta: 0.38 },
  { id: 'hoopoe', mesh: 'hoopoe', parent: 'hoopoe_wire', x: 0.0, y: 0.2, z: 0.004, s: 0.8, start: 0, dur: 0, move: 'hoopoe' },
  { id: 'hoopoe_crest', mesh: 'hoopoe_crest', parent: 'hoopoe', x: -0.05, y: 0.115, z: -0.002, start: 0, dur: 0, move: 'crest' },
  { id: 'wing_far', mesh: 'hoopoe_wing', parent: 'hoopoe', x: 0.005, y: 0.085, z: -0.004, start: 0, dur: 0, move: 'wingF' },
  { id: 'wing_near', mesh: 'hoopoe_wing', parent: 'hoopoe', x: 0.002, y: 0.082, z: 0.006, start: 0, dur: 0, move: 'wingN' },
  { id: 'shore', mesh: 'shore', x: 0.37, z: 0.395, lean: -28, start: 0.53, dur: 0.1, v: 0.06, flex: 0.6 },
  { id: 'sea6', mesh: 'sea6', x: 0.5, z: 0.48, lean: -28, start: 0.61, dur: 0.1, v: -0.12, flex: 1, move: 'wave', phase: 5 },

  // Clouds on wires, pulled up through slits at the head of the page.
  { id: 'cw_a', mesh: 'strip', w: 0.42, x: 0.62, z: -0.635, slit: 0.42 + 0.17, start: 0.51, dur: 0.13, hz: 1.5, zeta: 0.35, move: 'cloud', phase: 1 },
  { id: 'cloud_a', mesh: 'cloud_a', parent: 'cw_a', x: 0, y: 0.42, z: 0.004, s: 0.96, lean: -34, start: 0, dur: 0 },
  { id: 'cw_b', mesh: 'strip', w: 0.3, x: 0.87, z: -0.62, slit: 0.3 + 0.15, start: 0.55, dur: 0.12, hz: 1.7, zeta: 0.35, move: 'cloud', phase: 2 },
  { id: 'cloud_b', mesh: 'cloud_b', parent: 'cw_b', x: 0, y: 0.3, z: 0.004, s: 0.9, lean: -34, start: 0, dur: 0 },
  { id: 'cw_c', mesh: 'strip', w: 0.34, x: 0.06, z: -0.635, slit: 0.34 + 0.15, start: 0.58, dur: 0.12, hz: 1.6, zeta: 0.35, move: 'cloud', phase: 3 },
  { id: 'cloud_c', mesh: 'cloud_c', parent: 'cw_c', x: 0, y: 0.34, z: 0.004, s: 0.82, lean: -34, start: 0, dur: 0 },
  // On the words' side: they stand at the head of the page, clear of the text.
  { id: 'cw_d', mesh: 'strip', w: 0.3, parent: 'upper', x: -0.42, z: -0.635, slit: 0.3 + 0.15, start: 0.45, dur: 0.14, hz: 1.5, zeta: 0.35, move: 'cloud', phase: 4 },
  { id: 'cloud_d', mesh: 'cloud_a', parent: 'cw_d', x: 0, y: 0.3, z: 0.004, s: 0.8, lean: -34, flip: true, start: 0, dur: 0 },
  { id: 'cw_e', mesh: 'strip', w: 0.2, parent: 'upper', x: -0.82, z: -0.635, slit: 0.2 + 0.13, start: 0.52, dur: 0.14, hz: 1.7, zeta: 0.35, move: 'cloud', phase: 5 },
  { id: 'cloud_e', mesh: 'cloud_b', parent: 'cw_e', x: 0, y: 0.2, z: 0.004, s: 0.72, lean: -34, start: 0, dur: 0 },
  // Gulls on fine wires
  { id: 'gw_a', mesh: 'strip', w: 0.36, x: 0.5, z: -0.2, slit: 0.36 + 0.06, start: 0.63, dur: 0.1, hz: 2, zeta: 0.4, move: 'gull', phase: 1 },
  { id: 'gull_a', mesh: 'gull', parent: 'gw_a', x: 0, y: 0.36, z: 0.004, s: 0.5, lean: -30, start: 0, dur: 0 },
  { id: 'gw_b', mesh: 'strip', w: 0.3, x: 0.92, z: -0.05, slit: 0.3 + 0.05, start: 0.65, dur: 0.1, hz: 2, zeta: 0.4, move: 'gull', phase: 2 },
  { id: 'gull_b', mesh: 'gull', parent: 'gw_b', x: 0, y: 0.3, z: 0.004, s: 0.38, lean: -30, start: 0, dur: 0 },

  // The pull-tab, in its slot along the page's lower edge.
  { id: 'tab', mesh: 'tab', x: 1.075, y: -0.012, z: 0.6, s: 1, start: 0.67, dur: 0.06, move: 'tab' },
]

// In Arabic the book reads the other way, so the eye starts at the far page. The boat comes first and the shore answers it,
// and the sun stands over the fore-edge rather than the gutter.
const ARABIC: Record<string, Partial<Spec>> = {
  coast_left: { start: 0.15 },
  sun: { x: 0.8, start: 0.57 },
  cw_a: { x: 0.44 },
  cw_b: { x: 0.14 },
  cw_c: { x: 0.64 },
  hull: { start: 0.37, x: 0.58 },
  sail: { start: 0.42 },
  flag: { start: 0.50 },
  sea3: { start: 0.33 },
  sea4: { start: 0.39 },
  coast_far: { start: 0.28 },
  coast_town: { start: 0.31 },
  fort: { x: 0.68, start: 0.45 },
  palm_fort: { x: 0.42, start: 0.48 },
  light: { x: 0.2, start: 0.41 },
  isle: { x: 0.8, start: 0.47 },
  palm_far: { x: 0.88, start: 0.50 },
  yas: { start: 0.53 },
  yas_arm: { start: 0.56 },
  hoopoe_wire: { start: 0.55 },
  shore: { start: 0.49 },
  sea5: { start: 0.45 },
}

export const specs = (ar: boolean): Spec[] => WORLD.map(s => (ar && ARABIC[s.id] ? { ...s, ...ARABIC[s.id] } : s))

// A little anticipation, then a fast rise that goes past the mark and comes back.
const rise = (t: number) => {
  if (t <= 0) return 0
  if (t >= 1) return 1
  const a = Math.pow(t, 1.5)
  const u = a - 1
  return 1 + 2.3 * u * u * u + 1.3 * u * u
}

// The cover follows the scroll until it's just past the vertical. From there it isn't the scroll that moves it: it falls.
const TIP = 0.62
const coverTarget = (t: number) => {
  if (t >= TIP) return Math.PI
  const lift = 0.05 * smooth(0, 0.3, t)
  const heave = 0.53 * Math.pow(smoother(0.14, TIP, t), 1.1)
  return (lift + heave) * Math.PI
}

/** A page turning over. phi is how far: 0 lying on the right, pi landed on the left. */
export type TurningPage = { phi: number; v: number; k: number; go: number; t: number; lift: number; curl: number }

export class Rig {
  /** The world can't stand further than this, whatever the scroll says: it folds away when the book turns to a chapter. */
  worldP = 1
  /** Whether the chapter's page, its doors and the turning pages are in the scene at all. */
  chapterShown = false
  private up: number[] = []
  turns: TurningPage[] = [
    { phi: 0, v: 0, k: 0, go: 0, t: 0, lift: 0.5, curl: 0.05 },
    { phi: 0, v: 0, k: 0, go: 0, t: 0, lift: 0.34, curl: 0.13 },
    { phi: 0, v: 0, k: 0, go: 0, t: 0, lift: 0.34, curl: 0.1 },
  ]
  doors = 0
  doorsV = 0
  doorsTarget = 0
  chapterOut = new Array(CHAPTER_TABS).fill(0) as number[]
  chapterV = new Array(CHAPTER_TABS).fill(0) as number[]
  chapterTarget = new Array(CHAPTER_TABS).fill(0) as number[]
  tints: number[][] = []
  /** The world's page as it turns. Standing paper rides on this. */
  pageFrame: M4 = identity()
  specs: Spec[]
  parts: Float32Array
  index = new Map<string, number>()
  state: { r: number; v: number; rt: number }[]
  world: M4[]
  root: M4
  upper: M4 = identity()
  lower: M4 = identity()
  /** The text page's own frame: x as it lies when open, y up off the page, like the world page's. */
  upperFrame: M4 = identity()
  theta = 0
  thetaV = 0
  jolt = 0
  time = 0
  p = 0
  tab = 0
  tabV = 0
  tabTarget = 0
  /** How far the tab comes out, in page widths, at full pull. A phone has less room beside the page. */
  get tabTravel() {
    return this.tall ? 0.055 : 0.12
  }
  rock = 0
  rockV = 0
  flap = 0
  flapPhase = 0
  /** 0 to 1 through a dolphin's leap; below 0 it's waiting. */
  leap = -3
  armWave = 0
  wind = 0
  primed = false
  tall = false
  leaf = 0
  leafV = 0
  leafM: M4 = identity()
  dir: number
  cover: readonly [number, number]
  thump = 0

  constructor(ar: boolean, public partOf: (id: string) => number) {
    this.dir = ar ? -1 : 1
    this.cover = ar ? ([0.04, 0.26] as const) : ([0.03, 0.24] as const)
    this.specs = specs(ar)
    this.root = identity()
    this.root[0] = this.dir
    this.parts = new Float32Array(MAX_PARTS * 5 * 4)
    this.specs.forEach((s, i) => this.index.set(s.id, i))
    this.state = this.specs.map(() => ({ r: 0, v: 0, rt: 0 }))
    this.world = this.specs.map(() => identity())
  }

  /** Where the page's words lie, as three corners in world space. x runs across the page from the gutter. */
  upperPoint(x: number, y: number, z: number) {
    const m = this.upper
    return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]] as [number, number, number]
  }
  leafPoint(x: number, y: number, z: number) {
    const m = this.leafM
    return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]] as [number, number, number]
  }
  lowerPoint(x: number, y: number, z: number) {
    const m = this.lower
    return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]] as [number, number, number]
  }
  worldOf(id: string) {
    const i = this.index.get(id)
    return i === undefined ? null : this.world[i]
  }

  /** Where a page's fore-edge is, in the page's own space: x from the gutter and height above the hinge. */
  pageEdge(l: TurningPage): [number, number] {
    const b = l.phi + l.k
    if (Math.abs(l.k) < 1e-3) return [Math.cos(l.phi), Math.sin(l.phi)]
    return [(Math.sin(b) - Math.sin(l.phi)) / l.k, (Math.cos(l.phi) - Math.cos(b)) / l.k]
  }
  turn(i: number, go: 1 | -1) {
    const l = this.turns[i]
    l.go = go
    l.t = 0
  }
  /** Every page is where it was sent, and has stopped. */
  turnsSettled(go: 1 | -1) {
    const end = go > 0 ? Math.PI : 0
    return this.turns.every(l => Math.abs(l.phi - end) < 0.002 && Math.abs(l.v) < 0.3)
  }
  private stepTurns(dt: number) {
    const h = 1 / 240
    this.turns.forEach((l, i) => {
      if (l.go) {
        l.t += dt
        for (let q = 0; q < dt; q += h) {
          // Worked as the page's own journey, so turning back is the same movement.
          let x = l.go > 0 ? l.phi : Math.PI - l.phi
          let u = l.go > 0 ? l.v : -l.v
          if (x > Math.PI * 0.44) {
            // Past the top it falls by itself, against the air. Coming back it drifts down instead: it's closing over the chapter's
            // page, and a page that snaps shut over it makes the chapter's page look as if it vanished.
            const back = l.go < 0
            u += ((back ? 1.2 : 2.2) + (back ? 6 : 15) * Math.max(0, -Math.cos(x)) - (back ? 1.5 : 0.55) * u) * h
          } else {
            // A hand lifts it there.
            const want = Math.PI * 0.5 * smooth(0, l.lift, l.t)
            u += (90 * (want - x) - 13 * u) * h
          }
          x += u * h
          if (x >= Math.PI) {
            if (u > 1.2) this.jolt = Math.min(1, this.jolt + u * (l === this.turns[0] ? 0.1 : 0.04))
            x = Math.PI
            u *= -0.14
            if (Math.abs(u) < 0.3) u = 0
          }
          if (x < 0) {
            x = 0
            u = 0
          }
          l.phi = l.go > 0 ? x : Math.PI - x
          l.v = l.go > 0 ? u : -u
        }
      }
      // The air holds the fore-edge back, so the sheet bows while it moves and lies flat when it stops.
      const k = Math.max(-0.75, Math.min(0.75, -l.curl * l.v))
      l.k += (k - l.k) * Math.min(1, dt * 14)
      // Not so far that the sheet bows through the page it's just left, or the one it's about to reach.
      l.k = Math.max(-2 * l.phi, Math.min(2 * (Math.PI - l.phi), l.k))
      // Pages can't pass through each other: each stays behind the one that was above it.
      const ahead = this.turns[i - 1]
      if (ahead && l.phi > ahead.phi) {
        l.phi = ahead.phi
        l.v = Math.min(l.v, ahead.v)
      }
    })
  }

  update(p: number, dt: number) {
    this.time += dt
    const snap = !this.primed || Math.abs(p - this.p) > 0.14
    this.p = p
    this.primed = true
    const pw = Math.min(p, this.worldP)
    this.stepTurns(dt)

    // ------------------------------------------------------------------ the cover, with some weight to it
    const target = coverTarget(clamp01((p - this.cover[0]) / (this.cover[1] - this.cover[0])))
    if (snap) {
      this.theta = target
      this.thetaV = 0
    } else {
      const h = 1 / 240
      for (let t = 0; t < dt; t += h) {
        if (target >= Math.PI && this.theta > Math.PI * 0.45) {
          // Falling: gravity on a heavy board, faster the further over it goes, with only the air against it.
          this.thetaV += (2.4 + 15 * Math.max(0, -Math.cos(this.theta)) - 0.35 * this.thetaV) * h
        } else {
          this.thetaV += (58 * (target - this.theta) - 11 * this.thetaV) * h
        }
        this.theta += this.thetaV * h
        if (this.theta >= Math.PI) {
          if (this.thetaV > 1.2) {
            this.jolt = Math.min(1, this.jolt + this.thetaV * 0.26)
            this.thump = Math.min(1, this.thetaV / 4.5)
          }
          this.theta = Math.PI
          this.thetaV *= -0.2
        }
        if (this.theta <= 0) {
          this.theta = 0
          this.thetaV *= -0.2
        }
      }
    }
    this.jolt *= Math.exp(-dt * 7)

    const { Y0 } = BOOK
    const c = Math.cos(this.theta), s = Math.sin(this.theta)
    const U = identity()
    U[0] = c; U[1] = s; U[4] = -s; U[5] = c
    U[12] = Y0 * s
    U[13] = Y0 - Y0 * c
    mul(this.root, identity(), this.lower)
    mul(this.root, U, this.upper)
    const F = identity()
    F[0] = -1
    F[5] = -1
    F[13] = 2 * Y0
    mul(this.upper, F, this.upperFrame)

    // The standing paper rides the page by the line from the gutter to the middle of the sheet, which is the closest a rigid piece can get to a bowed one.
    const main = this.turns[0]
    const pa = main.phi + main.k * 0.25
    const pc = Math.cos(pa), ps = Math.sin(pa)
    const PF = identity()
    PF[0] = pc; PF[1] = ps; PF[4] = -ps; PF[5] = pc
    PF[12] = Y0 * ps
    PF[13] = Y0 - Y0 * pc
    mul(this.lower, PF, this.pageFrame)

    // ------------------------------------------------------------------ the fold-out leaf, on a phone
    if (this.tall) {
      const lt = Math.PI * 0.975 * Math.pow(smoother(0.2, 0.37, pw), 1.1)
      if (snap) {
        this.leaf = lt
        this.leafV = 0
      } else {
        const h = 1 / 240
        for (let q = 0; q < dt; q += h) {
          this.leafV += (70 * (lt - this.leaf) - 12 * this.leafV) * h
          this.leaf += this.leafV * h
          if (this.leaf > Math.PI * 0.975) {
            this.leaf = Math.PI * 0.975
            this.leafV *= -0.25
          }
          if (this.leaf < 0) {
            this.leaf = 0
            this.leafV = 0
          }
        }
      }
    }
    const lf = identity()
    const cl = Math.cos(this.leaf), sl = Math.sin(this.leaf)
    lf[5] = cl; lf[6] = sl; lf[9] = -sl; lf[10] = cl
    lf[12] = 0; lf[13] = Y0 + 0.012; lf[14] = BOOK.H / 2 + 0.0
    mul(this.pageFrame, lf, this.leafM)

    // ------------------------------------------------------------------ the tab and what it drives
    const h2 = Math.min(dt, 1 / 30)
    const tk = 90, tc = 15
    this.tabV += (tk * (this.tabTarget - this.tab) - tc * this.tabV) * h2
    this.tab += this.tabV * h2
    if (this.tab < 0) {
      this.tab = 0
      this.tabV *= -0.3
    }
    const rk = 26, rc = 1.8
    this.rockV += (rk * (this.tab * 0.2 - this.rock) - rc * this.rockV) * h2
    this.rockV += this.tabV * 1.1 * h2
    this.rock += this.rockV * h2
    const flutter = Math.sin(this.time * 0.61) * Math.sin(this.time * 0.23 + 1) > 0.62 ? 0.5 : 0
    const wantFlap = Math.max(flutter, Math.min(1, Math.abs(this.tabV) * 1.8 + this.tab * 0.7))
    this.flap += (wantFlap - this.flap) * Math.min(1, dt * (wantFlap > this.flap ? 12 : 1.6))
    this.flapPhase += dt * (6 + 22 * this.flap)

    // The dolphin
    if (this.leap >= 0 && this.leap < 1) this.leap += dt / 1.25
    else {
      if (this.leap >= 1) this.leap = -6 - 5 * Math.abs(Math.sin(this.time * 12.9))
      this.leap += dt
      if (this.tab > 0.3 && this.leap < 0) this.leap = 0
    }
    const t = this.time
    // Every so often the wind picks up by itself.
    this.wind = 0.6 + 0.4 * Math.sin(t * 0.37) * Math.sin(t * 0.13 + 1)
    const alive = smooth(0.56, 0.8, pw)

    // ------------------------------------------------------------------ every piece
    const local = identity()
    for (let i = 0; i < this.specs.length; i++) {
      const sp = this.specs[i]
      const st = this.state[i]
      const part = this.partOf(sp.id)
      let parentM: M4 = this.pageFrame
      let pid = -1
      if (sp.parent === 'upper') parentM = this.upperFrame
      else if (sp.parent) {
        pid = this.index.get(sp.parent)!
        parentM = this.world[pid]
      }

      // The spring
      // What stands on the words' page stays up until the falling page presses it down.
      const onLeft = sp.parent === 'upper'
      const tgt = sp.dur > 0 ? rise(((onLeft ? p : pw) - sp.start) / sp.dur) * (onLeft ? 1 - smooth(1.75, 2.7, main.phi) : 1) : 1
      if (snap) {
        st.r = tgt
        st.v = 0
      } else {
        // Going down for a turning page it folds promptly and without a bounce: it has to be flat before the page lifts it.
        const folding = this.chapterShown && tgt < st.r
        const w = (sp.hz ?? 2.4) * 6.283 * (folding ? 2 : 1)
        const z = folding ? Math.max(1, sp.zeta ?? 0.5) : sp.zeta ?? 0.5
        const h = Math.min(dt, 1 / 60) / 2
        for (let n = 0; n < Math.max(1, Math.round(dt / h)); n++) {
          st.v += (w * w * (tgt - st.r) - 2 * z * w * st.v) * h
          st.r += st.v * h
        }
        // The slam of the cover makes everything still lying flat jump.
        if (this.thump > 0 && st.r < 0.08 && sp.dur > 0 && !sp.slit) st.v += this.thump * (1.1 + 1.6 * ((i * 0.618) % 1))
        if (tgt <= 0 && st.r < 0) {
          st.r = 0
          st.v = Math.abs(st.v) * 0.3
        }
      }
      const r = st.r

      let ox = sp.x, oy = sp.y ?? 0, oz = sp.z
      // A turned piece only turns once it's up. Lying flat, a corner of it would go through the page and show on the other side.
      const up = sp.dur > 0 ? clamp01(r) : pid >= 0 ? this.up[pid] : 1
      this.up[i] = up
      let rx = 0, ry = (sp.yaw ?? 0) * RAD * up, rz = 0
      const lean = (sp.lean ?? 0) * RAD
      // A piece hinged to another folds over it, which in a shut book is fine. On a page that lifts it would point down through the sheet
      // and show on the other side, so for a turning page it lies along its parent instead.
      const fold = (this.chapterShown && pid >= 0 ? 0 : sp.fold ?? 88) * RAD
      const sc = sp.s ?? 1
      let vis = 1
      if (sp.slit) {
        oy = (sp.y ?? 0) - sp.slit * (1 - r)
        rx = lean
      } else if (sp.dur > 0) {
        rx = fold + (lean - fold) * r
      } else {
        // Whatever stands on a wire tips toward the reader only once it's out of the page.
        rx = lean * (pid >= 0 ? clamp01(this.state[pid].r) : 1)
      }
      if (!sp.parent || sp.parent === 'upper') oy += BOOK.Y0 + 0.002 + 0.0009 * (this.specs.length - i)

      // Life
      const a = alive
      const ph = (sp.phase ?? 0) * 1.3
      switch (sp.move) {
        case 'wave': {
          const n = sp.phase ?? 0
          rx += a * (0.028 * Math.sin(t * 1.25 + ph) + 0.012 * Math.sin(t * 2.1 + ph * 2) + 0.012 * this.jolt)
          ox += a * 0.008 * Math.sin(t * 0.8 + ph * 1.7) + this.tab * (n % 2 ? 0.032 : -0.032) * (0.6 + n * 0.1)
          break
        }
        case 'hullbob': {
          const w = this.wind
          rz += a * (0.042 * Math.sin(t * 1.15) * w + 0.016 * Math.sin(t * 2.3 + 1)) - Math.max(-0.2, Math.min(0.2, this.rock * 0.9))
          oy += a * (0.012 * Math.sin(t * 1.5 + 0.4) + 0.004 * Math.sin(t * 3.3)) + Math.abs(this.rock) * 0.02
          ox += a * 0.008 * Math.sin(t * 0.55) + Math.max(-0.03, Math.min(0.03, this.rock * 0.1))
          rx += a * 0.018 * Math.sin(t * 0.9 + 1.1)
          break
        }
        case 'sail':
          ry += a * (0.09 * Math.sin(t * 0.7) * this.wind + 0.03 * Math.sin(t * 1.7)) + Math.max(-0.25, Math.min(0.25, this.rock * 0.8))
          break
        case 'flag':
          ry += a * (0.5 * Math.sin(t * 5.1) + 0.3 * Math.sin(t * 7.7))
          break
        case 'palm':
          rz += a * (0.018 * Math.sin(t * 0.95 + ph) * this.wind + 0.008 * Math.sin(t * 2.3 + ph))
          rx += a * 0.01 * Math.sin(t * 0.7 + ph)
          break
        case 'cloud':
          ox += a * 0.012 * Math.sin(t * 0.33 + ph)
          rz += a * 0.018 * Math.sin(t * 0.5 + ph)
          ry += a * 0.05 * Math.sin(t * 0.42 + ph)
          break
        case 'spin':
          rz += t * 0.12
          break
        case 'gull':
          rz += a * 0.06 * Math.sin(t * 0.8 + ph)
          ry += a * 0.3 * Math.sin(t * 0.5 + ph)
          break
        case 'wingN':
          rx += up * (-0.25 - 0.95 * (this.flap * 0.9 + 0.06) * (0.5 + 0.5 * Math.sin(this.flapPhase)))
          break
        case 'wingF':
          rx += up * (0.25 + 0.95 * (this.flap * 0.9 + 0.06) * (0.5 + 0.5 * Math.sin(this.flapPhase)))
          break
        case 'crest':
          rz += 0.08 * Math.sin(t * 1.3) + this.flap * 0.5
          break
        case 'arm':
          rz += -0.55 + a * (0.24 * Math.sin(t * 2.4) * (0.4 + 0.6 * smooth(0.2, 0.9, Math.sin(t * 0.31 + 1) * 0.5 + 0.5)) + this.tab * 0.5)
          break
        case 'yas':
          rz += a * 0.008 * Math.sin(t * 1.1)
          rx += a * 0.006 * Math.sin(t * 0.8) - this.tab * 0.03
          break
        case 'hoopoe':
          oy += a * 0.01 * Math.sin(t * 2.1) + this.flap * 0.02 * Math.sin(this.flapPhase)
          rz += a * 0.03 * Math.sin(t * 1.4)
          break
        case 'dolphin': {
          // Out of the water, over and back in. The tab sets one off, and now and then it goes by itself.
          const l = this.leap
          // Caught mid-leap by the world folding down, it sinks away rather than vanishing.
          vis = l <= 0 || l >= 1 ? 0 : smooth(0.7, 0.97, alive)
          ox += (l - 0.5) * 0.42
          oy += -0.18 + Math.sin(Math.PI * l) * 0.58
          rz += 1.05 - 2.1 * l
          break
        }
        case 'tab':
          ox += this.tab * this.tabTravel
          rx = -Math.PI / 2 + 0.03 * (1 - r)
          vis = r
          break
      }

      // While a wire is still inside the page, or the book is shut, there's nothing to draw.
      if ((sp.slit && r < 0.002) || this.theta < 0.012) vis = 0
      // Past the top of its turn the world's page hides what lies on it, and the left page is about to be covered.
      if ((!sp.parent && main.phi > 1.8) || (onLeft && main.phi > 2.8)) vis = 0

      // Local transform
      const flexing = sp.flex ? -st.v * 0.05 * sp.flex : 0
      const lsz = sc
      // Zero scale would leave no handedness to read, so a hidden piece shrinks to almost nothing instead.
      const shown = Math.max(sc * vis, 0.00001)
      compose(local, ox, oy, oz, ry, rx, rz, shown, shown, vis === 0 ? 0.00001 : lsz)
      const W = mul(parentM, local, this.world[i])
      // A strip is one unit tall in its mesh; its height stretches only the strip, never what stands on it.
      const yk = sp.mesh === 'strip' ? (sp.w ?? 1) : 1

      // The part's data: three rows of the matrix, then the shear axis and amount, then the crease, belly, flex and handedness.
      const o = part * 20
      const P = this.parts
      P[o] = W[0]; P[o + 1] = W[4] * yk; P[o + 2] = W[8]; P[o + 3] = W[12]
      P[o + 4] = W[1]; P[o + 5] = W[5] * yk; P[o + 6] = W[9]; P[o + 7] = W[13]
      P[o + 8] = W[2]; P[o + 9] = W[6] * yk; P[o + 10] = W[10]; P[o + 11] = W[14]
      // The V-fold shears along the parent's z.
      const vk = (sp.v ?? 0) * Math.min(1, r * 1.2)
      P[o + 12] = parentM[8]; P[o + 13] = parentM[9]; P[o + 14] = parentM[10]; P[o + 15] = vk
      P[o + 16] = 0
      P[o + 17] = (sp.belly ?? 0) * clamp01(r)
      P[o + 18] = flexing
      P[o + 19] = det3(W) < 0 ? -1 : 1
    }

    this.thump = 0
    this.stepChapters(dt, snap)
    this.writeBook()
    return snap
  }

  private stepChapters(dt: number, snap: boolean) {
    const h = Math.min(dt, 1 / 60) / 2
    for (let n = 0; n < Math.max(1, Math.round(dt / h)); n++) {
      this.doorsV += (70 * (this.doorsTarget - this.doors) - 8.5 * this.doorsV) * h
      this.doors += this.doorsV * h
      if (this.doors < 0) {
        this.doors = 0
        this.doorsV *= -0.2
      }
    }
    for (let i = 0; i < CHAPTER_TABS; i++) {
      if (snap) {
        this.chapterOut[i] = this.chapterTarget[i]
        this.chapterV[i] = 0
        continue
      }
      for (let n = 0; n < Math.max(1, Math.round(dt / h)); n++) {
        this.chapterV[i] += (150 * (this.chapterTarget[i] - this.chapterOut[i]) - 15 * this.chapterV[i]) * h
        this.chapterOut[i] += this.chapterV[i] * h
      }
    }
  }

  /** Whole-book matrices and the curves of the spine and ribbon. */
  private writeBook() {
    const P = this.parts
    const put = (part: number, W: M4) => {
      const o = part * 20
      P[o] = W[0]; P[o + 1] = W[4]; P[o + 2] = W[8]; P[o + 3] = W[12]
      P[o + 4] = W[1]; P[o + 5] = W[5]; P[o + 6] = W[9]; P[o + 7] = W[13]
      P[o + 8] = W[2]; P[o + 9] = W[6]; P[o + 10] = W[10]; P[o + 11] = W[14]
      P[o + 12] = 0; P[o + 13] = 0; P[o + 14] = 0; P[o + 15] = 0
      P[o + 16] = closing; P[o + 17] = 0; P[o + 18] = part === UPPER ? -1 : 1; P[o + 19] = det3(W) < 0 ? -1 : 1
    }
    // Shut, the pages lie flat together; they only fall into the gutter as the book opens.
    const closing = 1 - smooth(0, 0.55, this.theta / Math.PI)
    put(LOWER, this.lower)
    put(UPPER, this.upper)
    if (this.tall && this.theta > 0.012) put(LEAF, this.leafM)
    else {
      const off = identity()
      off[0] = off[5] = off[10] = 0.00001
      off[13] = -1
      put(LEAF, off)
    }
    this.writeChapters(put)
    const { T, hinge, H, over } = BOOK
    // The spine joins the two boards' hinge edges.
    const A = [hinge, 0.0, 0]
    const c = Math.cos(this.theta), s = Math.sin(this.theta)
    const hx = hinge, hy = T - BOOK.Y0
    const B = [hx * c - hy * s, BOOK.Y0 + hx * s + hy * c, 0]
    const dx = B[0] - A[0], dy = B[1] - A[1]
    const l = Math.hypot(dx, dy) || 1
    const f = 1 - this.theta / Math.PI
    const bulge = 0.115 * Math.pow(f, 0.7)
    const C = [(A[0] + B[0]) / 2 + (-dy / l) * bulge, (A[1] + B[1]) / 2 + (dx / l) * bulge, 0]
    if (C[1] < 0.001) C[1] = 0.001
    const d = this.dir
    const o = SPINE * 20
    P[o] = A[0] * d; P[o + 1] = A[1]; P[o + 2] = A[2]; P[o + 3] = 0
    P[o + 4] = C[0] * d; P[o + 5] = C[1]; P[o + 6] = C[2]; P[o + 7] = 0
    P[o + 8] = B[0] * d; P[o + 9] = Math.max(0.001, B[1]); P[o + 10] = B[2]; P[o + 11] = 0
    P[o + 12] = 0; P[o + 13] = 0; P[o + 14] = 1; P[o + 15] = 0
    P[o + 16] = 0; P[o + 17] = 0; P[o + 18] = 0; P[o + 19] = d

    // The ribbon: tucked in at the gutter near the tail, and trailing out over the tail edge onto the table.
    const r = RIBBON * 20
    const open = smooth(0.3, 1, this.theta / Math.PI)
    const startX = 0.16 * (1 - open) + 0.012 * open
    const startY = BOOK.Y0 - 0.016
    const k = this.time
    const sway = 0.008 * Math.sin(k * 0.9)
    // Four control points: inside the book, over the edge, down to the table, along the table.
    const endX = lerp(startX - 0.07, startX + 0.1, open) + sway
    const endZ = H / 2 + lerp(0.25, 0.075, open)
    P[r] = startX * d; P[r + 1] = startY; P[r + 2] = H / 2 - 0.03; P[r + 3] = 0
    P[r + 4] = startX * d; P[r + 5] = startY; P[r + 6] = H / 2 + 0.012; P[r + 7] = 0
    P[r + 8] = (startX + 0.006) * d; P[r + 9] = 0.0025; P[r + 10] = H / 2 + 0.05; P[r + 11] = 0
    P[r + 12] = endX * d; P[r + 13] = 0.0025; P[r + 14] = endZ; P[r + 15] = 0
    P[r + 16] = 0.027; P[r + 17] = 0; P[r + 18] = 0; P[r + 19] = d
  }

  private writeChapters(put: (part: number, W: M4) => void) {
    const P = this.parts
    const off = identity()
    off[0] = off[5] = off[10] = 0.00001
    off[13] = -1
    const { Y0, W } = BOOK
    // The turning pages. Only the last one down carries the chapter's title, so the riffle ends on it.
    this.turns.forEach((l, i) => {
      const part = TURN + i
      if (!this.chapterShown) return put(part, off)
      put(part, this.root)
      const o = part * 20
      // First page on top on the right, so last page on top once they're all over on the left.
      P[o + 12] = l.phi; P[o + 13] = l.k; P[o + 14] = (TURNS - 1 - i) * 0.0007 + 0.0002; P[o + 15] = 0
      // The sheet has to change which way its gutter curves on the way over.
      P[o + 16] = 2 * smoother(0.4, 2.7, l.phi)
      // Which illustrated spread each side belongs to, counted from 1. Facing sides share one: the first page's back with the second's
      // front, the second's back with the third's front. 0 is for the two sides that show something else: the world's map and the title.
      P[o + 17] = i
      P[o + 18] = i < TURNS - 1 ? i + 1 : 0
    })
    put(WINDOW, this.chapterShown ? this.lower : off)
    const door = (part: number, side: number) => {
      if (!this.chapterShown) return put(part, off)
      const b = -side * Math.min(1.12, this.doors) * 1.78
      const c = Math.cos(b), s = Math.sin(b)
      const D = identity()
      D[0] = c; D[1] = s; D[4] = -s; D[5] = c
      D[12] = ARCH.cx + side * ARCH.a
      // Shut, its top sits between the arch's page and the lowest turning page. Any higher and the pattern shows through the gaps in the
      // pop-up from the moment a chapter is chosen, and lies on top of each page as it lands.
      D[13] = Y0 - 0.0014
      put(part, mul(this.lower, D))
    }
    door(DOOR_NEAR, -1)
    door(DOOR_FAR, 1)
    for (let i = 0; i < CHAPTER_TABS; i++) {
      const T = identity()
      T[12] = W + (this.chapterOut[i] - 1) * (INDEX.out + 0.02)
      T[13] = Y0 - 0.0072 - i * 0.0026
      T[14] = INDEX.z0 + i * INDEX.pitch
      put(CHAPTER_TAB + i, mul(this.lower, T))
      const o = (CHAPTER_TAB + i) * 20
      const c = this.tints[i] ?? [0.5, 0.5, 0.5]
      P[o + 16] = c[0]; P[o + 17] = c[1]; P[o + 18] = c[2]
    }
  }
}

const det3 = (m: ArrayLike<number>) =>
  m[0] * (m[5] * m[10] - m[6] * m[9]) - m[4] * (m[1] * m[10] - m[2] * m[9]) + m[8] * (m[1] * m[6] - m[2] * m[5])

