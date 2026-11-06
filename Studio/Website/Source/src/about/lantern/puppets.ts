// The cast. Original silhouettes drawn as paths: a Gulf dhow with Yasmina at the helm, the hoopoe, date palms, a wind tower
// island and rows of cut wave boards. Each has fine piercing, visible rivets and the rods a puppeteer would hold.
import { Curve, Pen, chain, about, mul, R, Sc, T, type M, type Piece } from './art'

const pieces: Piece[] = []
const add = (name: string, x: number, y: number, w: number, h: number, res: number, draw: (p: Pen) => void) => {
  const q: Piece = { name, x, y, w, h, res, draw }
  pieces.push(q)
  return q
}

// ---------------------------------------------------------------- the dhow
const SHEER = new Curve([[-118, -14], [-60, -5], [40, -5], [100, -15], [130, -21], [160, -33], [192, -52]])
const KEEL = new Curve([[-146, 22], [-120, 44], [-60, 52], [-10, 52], [50, 52], [100, 40], [134, 14]])
const hull = add('hull', -196, -112, 440, 190, 3, p => {
  // Long raked prow, high poop, a deep belly
  p.fill(
    'M-178 -56 L-174 -68 L-150 -66 L-148 -56 C-140 -36 -128 -24 -106 -18 C-50 -8 40 -8 96 -19 C128 -26 164 -42 208 -70 L216 -66 C196 -30 170 2 134 26 C96 52 20 60 -50 58 C-100 56 -132 46 -152 26 C-166 8 -176 -24 -178 -56 Z',
  )
  // The stern rail and carved poop
  p.fill('M-180 -68 C-184 -78 -178 -86 -170 -84 C-174 -82 -175 -76 -172 -68 Z')
  p.fill('M-158 -68 L-158 -90 C-158 -96 -150 -96 -150 -90 L-150 -66 Z')
  // A stem head scroll at the prow
  p.fill('M210 -68 C214 -82 228 -86 232 -76 C234 -70 226 -66 222 -71 C225 -70 228 -72 227 -75 C224 -79 218 -76 218 -64 Z')
  // Strakes along the sheer, the hull's long lines
  p.cut(SHEER.dashes(p, 9, 7, 1.7, 0.02, 0.98))
  p.cut(KEEL.dashes(p, 8, -8, 1.6, 0.02, 0.96))
  // A band of stars with dots between, the one rich thing along her side
  SHEER.each(11, 20, (x, y, a, i) => {
    p.cut(p.star(x, y, 5.6))
    if (i < 10) {
      const q = SHEER.at(0.08 + (i + 0.5) * 0.08, 20)
      p.cut(p.dot(q.x, q.y, 1.5))
    }
  }, 0.08, 0.88)
  // Second band: teardrops hanging from a line
  SHEER.each(16, 33, (x, y, a) => p.cut(p.drop(x, y, 1.9, a + Math.PI / 2, 2.1)), 0.08, 0.72)
  // Stern gallery, three arched windows and a little balcony
  for (const [x, y] of [[-166, -40], [-156, -38], [-146, -32]] as const) {
    p.cut(`M${x - 3.4} ${y + 9}L${x - 3.4} ${y}C${x - 3.4} ${y - 5} ${x - 0.8} ${y - 7} ${x} ${y - 9}C${x + 0.8} ${y - 7} ${x + 3.4} ${y - 5} ${x + 3.4} ${y}L${x + 3.4} ${y + 9}Z`)
  }
  p.cut(p.star(-158, -56, 3.6))
  // Prow ornament: a large drop and a scatter of holes, her eye
  p.cut(p.star(160, -16, 7))
  p.cut(p.drop(142, -12, 2.6, 0.2, 2.4) + p.drop(176, -30, 2.2, -0.6, 2.3))
  p.cut(p.dot(190, -42, 1.8) + p.dot(198, -50, 1.4))
  // The rudder's gudgeon
  p.rivet(-168, 18, 3.2)
  // The rod's socket
  p.rivet(-20, 42, 4)
  // Deck rail: a row of small balusters standing on the sheer
  for (let i = 0; i <= 19; i++) {
    const q = SHEER.at(0.02 + i * 0.05)
    p.fill(p.bar(q.x, q.y + 2, q.x, q.y - 9, 1.5, 1.2))
  }
  const rail: Array<[number, number]> = []
  for (let i = 0; i <= 28; i++) {
    const q = SHEER.at(0.02 + (i / 28) * 0.95)
    rail.push([q.x, q.y - 9])
  }
  for (let i = 0; i < rail.length - 1; i++) p.fill(p.bar(rail[i][0], rail[i][1], rail[i + 1][0], rail[i + 1][1], 1.6))
})

// The great lateen sail, its yard and its mast
const mast = add('mast', -60, -340, 300, 340, 3, p => {
  // Mast raked forward, with its truck and a small wind vane
  p.fill(p.bar(-8, -6, 18, -300, 7, 3.4))
  p.fill(p.dot(18.4, -304, 4.2))
  // Stays, thin as thread
  p.fill(p.bar(17, -298, 206, -70, 1.15))
  p.fill(p.bar(10, -210, -46, -14, 1))
  p.fill(p.bar(12, -240, 70, -14, 0.95))
  // Mast cleats: little rungs, a place the eye can catch
  for (let i = 0; i < 9; i++) {
    const t = 0.14 + i * 0.07
    const x = -8 + 26 * t
    const y = -6 - 294 * t
    p.fill(p.bar(x - 5, y, x + 5, y - 1, 1.5))
  }
})

const SAIL_P = { tack: [122, -48], peak: [-168, -358], clew: [-132, -56] } as const
const LUFF = new Curve([[122, -48], [40, -112], [-70, -240], [-168, -358]])
const LEECH = new Curve([[-168, -358], [-172, -280], [-168, -150], [-132, -56]])
const FOOT = new Curve([[-132, -56], [-74, -76], [50, -80], [122, -48]])
const sail = add('sail', -190, -376, 330, 340, 3, p => {
  p.fill('M122 -48 C40 -112 -70 -240 -168 -358 C-172 -280 -168 -150 -132 -56 C-74 -76 50 -80 122 -48 Z', 0.94)
  // A double line just inside every edge
  p.cut(LUFF.dashes(p, 14, 8, 0.95, 0.03, 0.97, 0.1))
  p.cut(LEECH.dashes(p, 11, 8, 0.95, 0.05, 0.95, 0.1))
  p.cut(FOOT.dashes(p, 12, 7, 0.95, 0.05, 0.95, 0.1))
  // Cloth panels: long seams from foot to yard, each a run of cuts
  const panels = 8
  for (let i = 1; i < panels; i++) {
    const t = i / panels
    const a = FOOT.at(1 - t, 12)
    const b = LUFF.at(t * 0.94 + 0.03, 12)
    const n = 7 + Math.round(t * 5)
    for (let k = 0; k < n; k++) {
      const u0 = (k + 0.1) / n
      const u1 = (k + 0.9) / n
      p.cut(p.slit(a.x + (b.x - a.x) * u0, a.y + (b.y - a.y) * u0, a.x + (b.x - a.x) * u1, a.y + (b.y - a.y) * u1, 1.05))
    }
  }
  // Her emblem: a rosette, a star in a wheel of drops, cut clean through
  const cx = -82
  const cy = -158
  p.fill(p.dot(cx, cy, 36), 1)
  p.cut(p.star(cx, cy, 24))
  p.fill(p.star(cx, cy, 12.4), 1)
  p.cut(p.star(cx, cy, 7))
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + Math.PI / 16
    p.cut(p.drop(cx + Math.cos(a) * 30.6, cy + Math.sin(a) * 30.6, 1.5, a, 1.9))
  }
  // Smaller stars rising towards the peak, and scattering towards the clew
  const smalls = [[-132, -280, 8], [-145, -232, 9], [-122, -236, 6], [-150, -180, 7.6], [-138, -100, 8], [-64, -90, 6.4], [-26, -96, 7.6], [24, -86, 5], [-34, -148, 5.6], [-112, -94, 5], [-58, -215, 5.6]]
  for (const [x, y, r] of smalls) p.cut(p.star(x, y, r))
})

const yard = add('yard', -196, -386, 350, 360, 3, p => {
  // The long spar, in two fished lengths with a whipping of cord where they meet
  p.fill(p.bar(134, -32, -24, -196, 5.6, 7.8))
  p.fill(p.bar(-24, -196, -182, -372, 7.6, 3))
  for (let i = 0; i < 5; i++) {
    const t = i * 0.012
    const x = -24 - t * 150
    const y = -196 - t * 170
    p.cut(p.slit(x - 3.4, y + 2, x + 3.4, y - 2.5, 0.6))
  }
  // A small pennant knot
  p.fill(p.dot(-182, -372, 3.4))
  // The pivot where the yard hangs on the mast
  p.rivet(4, -224, 5)
})

const pennant1 = add('pennant1', -2, -18, 44, 34, 3, p => {
  p.fill('M0 -8 C10 -11 24 -7 36 -3 C24 0 12 6 0 8 Z')
  p.cut(p.star(11, -0.5, 3.8))
})
const pennant2 = add('pennant2', -2, -8, 44, 16, 3, p => {
  p.fill('M0 -4 C12 -5 22 -2 40 0 C22 2 12 3 0 3.4 Z')
})

const oar = add('oar', -8, -8, 130, 40, 3, p => {
  p.fill(p.bar(0, 0, 112, 20, 3.4, 2.6))
  p.fill('M100 16 C112 16 126 22 128 30 C118 32 104 28 98 22 Z')
  p.cut(p.slit(106, 21, 122, 27, 1.2))
  p.rivet(0, 0, 2.8)
})

const rudder = add('rudder', -30, -10, 56, 96, 3, p => {
  p.fill('M4 -4 L8 2 C6 18 12 36 14 52 C4 76 -12 80 -24 74 C-24 56 -16 30 -4 2 Z')
  p.cut(p.slit(-10, 40, -6, 66, 1.3) + p.slit(0, 30, 2, 60, 1.3))
  p.cut(p.star(-5, 18, 3))
  p.rivet(2, 0, 3)
})

// Yasmina at the bow of her own story, cut as one figure with a jointed arm. Her feet are at the origin and she faces the prow.
const yasmina = add('yasmina', -44, -66, 76, 72, 4, p => {
  // Tunic and flared skirt, feet below
  p.fill('M0 -41 C4 -41 7 -38 7.6 -33 C9 -24 11 -14 14 -5 C8 -3 -8 -3 -14 -5 C-11 -14 -8.6 -24 -7.6 -33 C-7 -38 -4 -41 0 -41 Z')
  p.fill('M-6 -5 L-6.4 0 L-1 0 L-2 -5 Z')
  p.fill('M3 -5 L2.6 0 L9 0 L6 -5 Z')
  // Head, a soft profile with nose and chin
  p.fill('M-1 -41 L-2 -44 C-7 -46 -8.6 -51 -6.6 -55 C-4.4 -59.6 3 -60 5.8 -55.6 C6.6 -54.2 6.8 -53 7 -52 L9 -49.6 L7 -48.8 C7 -46.6 5.6 -44.8 3 -44.4 L3 -41 Z')
  // A long scarf streaming back on the wind, two tails, no fuss
  p.fill('M-5 -57 C-11 -57 -15 -52 -13.6 -46 C-20 -42 -30 -49 -41 -43 C-33 -40 -24 -35 -14 -38 C-9.6 -39.6 -6.4 -43 -5.6 -46 Z')
  p.fill('M-13 -44 C-20 -38 -26 -35 -35 -32 C-27 -30 -18 -33 -11 -39 Z')
  // A flower cut out of the scarf, and small drops in the hem
  p.cut(p.star(-8.4, -51.4, 2.5, 5, 0.46))
  for (let i = 0; i < 5; i++) p.cut(p.drop(-9.4 + i * 4.7, -9.6, 1, -Math.PI / 2, 2))
  p.cut(p.star(0, -27, 2.5))
})
const yasArm = add('yasArm', -4, -6, 36, 12, 4, p => {
  p.fill(p.bar(0, 0, 14, -1, 3.8, 3))
  p.fill(p.bar(14, -1, 28, -4, 3, 2))
  p.fill(p.dot(28.6, -4.2, 1.6))
  p.rivet(0, 0, 1.2)
})

// A rod runs from a socket down out of frame. It is one long thin cut, and it's how you know this is theatre.
const rod = add('rod', -3, 0, 6, 900, 1.6, p => {
  p.fill(p.bar(0, 0, 0, 900, 3, 4))
})
const rodTop = add('rodTop', -6, -6, 12, 132, 3, p => {
  p.fill(p.bar(0, 0, 0, 120, 2.6, 3))
  p.rivet(0, 120, 3.4)
})
const wire = add('wire', -2, 0, 4, 800, 1.6, p => {
  p.fill(p.bar(0, 0, 0, 800, 1.5, 2.4))
})

// ---------------------------------------------------------------- the hoopoe, flying to the right
const hoopoeBody = add('hoopoeBody', -110, -60, 222, 96, 4, p => {
  // Body, neck, head in one line
  p.fill('M38 -18 C46 -19 52 -13 52 -7 C52 -3 49 -0.5 45 1.5 C38 8 28 18 8 19 C-10 20 -26 13 -38 4 L-42 -6 C-30 -15 -14 -19 2 -18 C14 -17 26 -20 38 -18 Z')
  // The long, thin, down-curved bill
  p.fill('M49 -9 C60 -8 74 -4 90 6 C76 1 60 -1 49 -3 Z')
  // Tail, long and square, with its white band
  p.fill('M-34 -7 C-54 -11 -78 -12 -100 -11 C-105 -7 -106 3 -102 7 C-80 8 -56 7 -36 4 Z')
  // The white bands stop short of both edges. Cut right through, the end of the tail would fall off the puppet.
  p.cut(p.slit(-76, -7.8, -76.6, 4.6, 2.2))
  p.cut(p.slit(-68, -7.6, -68.6, 4.2, 0.8))
  // Feather lines down the tail
  for (const y of [-6, -1.4, 3]) p.cut(p.slit(-98, y, -80, y, 0.55) + p.slit(-64, y, -44, y * 0.6, 0.55))
  // The eye, and a band of piercing down the throat and flank
  p.cut(p.dot(42, -9.4, 1.5))
  for (let i = 0; i < 7; i++) {
    const t = i / 6
    p.cut(p.drop(28 - t * 48, 8 - t * 5 + Math.sin(t * 3.14) * 2.6, 1.4, 1.8, 2.1))
  }
  p.cut(p.star(8, -4, 4))
  // Tucked feet
  p.fill('M4 17 L9 25 L13 24 L10 26 L6 26 L1 18 Z')
  // Where the rod meets the belly
  p.rivet(-6, 13, 2.6)
})
const crestFeather = (p: Pen, a: number, l: number, w: number) => {
  const c = Math.cos(a)
  const s = Math.sin(a)
  const q = (x: number, y: number) => `${x * c - y * s} ${x * s + y * c}`
  p.fill(`M${q(0, 0)}C${q(l * 0.3, -w * 0.5)} ${q(l * 0.8, -w)} ${q(l, -w * 0.1)}C${q(l * 0.85, w * 0.8)} ${q(l * 0.35, w * 0.5)} ${q(0, 0)}Z`)
  const mx = l * 0.72 * c
  const my = l * 0.72 * s
  p.cut(p.dot(mx, my, w * 0.28))
}
const hoopoeCrest = add('hoopoeCrest', -44, -46, 84, 56, 4, p => {
  // A fan of feathers. This is the bird's whole signature, so it stands up proud.
  const n = 7
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const a = -Math.PI * (0.2 + 0.72 * t)
    crestFeather(p, a, 33 - Math.abs(t - 0.42) * 12, 6)
  }
})
const WING = new Curve([[0, 0], [-22, -14], [-46, -32], [-70, -46]])
const wingInner = add('wingInner', -50, -60, 72, 72, 4, p => {
  p.fill('M4 4 C-6 -14 -24 -38 -40 -44 C-44 -30 -40 -10 -28 8 C-16 14 -4 12 4 4 Z')
  // Zebra bands: a hoopoe's wing is its other signature
  for (let i = 0; i < 4; i++) {
    const t = 0.15 + i * 0.22
    const x0 = 2 - t * 42
    const y0 = 2 - t * 46
    const x1 = -18 - t * 30
    const y1 = 12 - t * 20
    p.cut(p.slit(x0, y0, x1, y1, 1.9, 1.6))
  }
  p.rivet(0, 0, 2.6)
})
const wingOuter = add('wingOuter', -60, -66, 86, 84, 4, p => {
  // Long primaries, each one a finger, ending in a rounded hand
  p.fill('M6 6 C-6 -6 -20 -28 -36 -48 C-42 -56 -50 -60 -56 -58 C-58 -40 -54 -24 -46 -8 C-42 2 -36 8 -26 10 C-14 12 -2 12 6 6 Z')
  for (let i = 0; i < 5; i++) {
    const t = 0.1 + i * 0.18
    const x0 = 0 - t * 42
    const y0 = 0 - t * 52
    const x1 = -24 - t * 24
    const y1 = 10 - t * 30
    p.cut(p.slit(x0, y0, x1, y1, 1.8, 1.8))
  }
  // Notches between the primaries at the hand's tip
  p.cut(p.slit(-56, -58, -40, -40, 1) + p.slit(-58, -44, -44, -30, 0.9) + p.slit(-54, -26, -40, -16, 0.9))
  p.rivet(0, 0, 2.2)
})

// ---------------------------------------------------------------- date palms
const frond = (name: string, len: number, droop: number, res: number) =>
  add(name, -10, -len * 0.35, len + 20, len * (0.5 + droop) + 20, res, p => {
    const c = new Curve([[0, 0], [len * 0.3, -len * 0.2], [len * 0.7, -len * 0.04 + droop * len * 0.4], [len, droop * len]])
    // The rib
    const n = 34
    let prev = c.at(0)
    for (let i = 1; i <= 16; i++) {
      const q = c.at(i / 16)
      p.fill(p.bar(prev.x, prev.y, q.x, q.y, 3.2 - (i / 16) * 2.4, 3 - (i / 16) * 2.4))
      prev = q
    }
    // Leaflets, both sides, long in the middle and swept to the tip. Each one a blade.
    for (let i = 0; i < n; i++) {
      const t = 0.08 + (0.92 * i) / (n - 1)
      const q = c.at(t)
      const l = len * 0.36 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.86 + 0.12)), 0.7) * (1 - t * 0.2)
      const sweep = 0.95 - t * 0.55
      for (const side of [-1, 1]) {
        const k = side > 0 ? 1.1 : 0.82
        const a = q.a + side * sweep
        const ex = q.x + Math.cos(a) * l * k
        const ey = q.y + Math.sin(a) * l * k + l * 0.16
        const wob = ((i * 7) % 3) * 0.5
        p.fill(p.slit(q.x, q.y, ex, ey + wob, 1.35, -side * l * 0.1))
      }
    }
  })
const frondA = frond('frondA', 118, 0.42, 3)
const frondB = frond('frondB', 96, 0.62, 3)
const frondNear = frond('frondNear', 420, 0.5, 1)
const trunk = (name: string, h: number, lean: number, res: number) =>
  add(name, -20 - Math.abs(lean), -h - 8, 40 + 2 * Math.abs(lean), h + 16, res, p => {
    const c = new Curve([[0, 0], [lean * 0.15, -h * 0.35], [lean * 0.55, -h * 0.72], [lean, -h]])
    const n = 26
    for (let i = 0; i < n; i++) {
      const q0 = c.at(i / n)
      const q1 = c.at((i + 1) / n)
      const w0 = 11.5 - (i / n) * 6.5
      const w1 = 11.5 - ((i + 1) / n) * 6.5
      // Each boot of the trunk is a slightly flared collar, so the edge is notched like a real palm
      p.fill(p.bar(q0.x, q0.y, q1.x, q1.y, w0 + 2, w1 - 0.4))
      if (i % 2) p.cut(p.slit(q0.x - w0 * 0.28, q0.y, q0.x + w0 * 0.28, q0.y - 0.6, 0.7))
    }
    // Dates hanging under the crown
    const top = c.at(1)
    for (const side of [-1, 1]) {
      const x = top.x + side * 8
      const y = top.y + 5
      p.fill(`M${x} ${y - 3}C${x + side * 7} ${y - 2} ${x + side * 9} ${y + 8} ${x + side * 5} ${y + 13}C${x + side * 1} ${y + 11} ${x - side * 2} ${y + 4} ${x} ${y - 3}Z`)
      for (const [dx, dy] of [[3, 2], [5.4, 6], [3, 8], [5, 10.4]]) p.cut(p.dot(x + side * dx, y + dy, 0.75))
    }
  })
const trunkA = trunk('trunkA', 120, 26, 3)
const trunkB = trunk('trunkB', 78, -22, 3)

// ---------------------------------------------------------------- islands
const islandA = add('islandA', -220, -150, 460, 190, 2.4, p => {
  // A long low island with a rocky head
  p.fill('M-214 34 C-190 16 -160 12 -130 0 C-110 -8 -96 -28 -70 -30 C-52 -32 -40 -14 -14 -14 C10 -14 22 -24 48 -22 C72 -20 92 -8 120 0 C160 10 196 18 232 34 Z')
  // Wind tower house
  p.fill('M-40 -14 L-40 -66 L-34 -66 L-34 -120 L0 -120 L0 -66 L30 -66 L30 -14 Z')
  p.fill('M-38 -120 L-38 -128 L-30 -128 L-30 -122 L-24 -122 L-24 -128 L-16 -128 L-16 -122 L-10 -122 L-10 -128 L-2 -128 L-2 -122 L4 -122 L4 -120 Z')
  // The wind tower's slots, tall and pointed, and small house windows
  for (const x of [-27.4, -17, -6.6]) p.cut(`M${x - 3.2} -76L${x - 3.2} -106C${x - 3.2} -110 ${x} -112 ${x} -114C${x} -112 ${x + 3.2} -110 ${x + 3.2} -106L${x + 3.2} -76Z`)
  p.cut(p.star(-17, -67, 4))
  for (const x of [-24, -6, 12]) p.cut(`M${x - 4} -22L${x - 4} -42C${x - 4} -47 ${x} -49 ${x} -52C${x} -49 ${x + 4} -47 ${x + 4} -42L${x + 4} -22Z`)
  // Crenellated parapet on the house
  for (let i = 0; i < 4; i++) p.fill(`M${2 + i * 7} -66L${2 + i * 7} -72L${6 + i * 7} -72L${6 + i * 7} -66Z`)
  // Strata and scrub
  const t = new Curve([[-180, 22], [-130, 8], [-80, -14], [-60, -12], [-20, -4], [40, -2], [96, 10], [130, 12], [170, 18], [206, 30]])
  p.cut(t.dashes(p, 16, 6, 0.9, 0.02, 0.98, 0.2))
  for (const [x, y, r] of [[-126, 18, 2.6], [-98, 6, 2.2], [-74, -14, 3], [72, 8, 2.8], [106, 20, 2.2], [150, 24, 1.8]]) p.cut(p.star(x, y, r))
})
const islandB = add('islandB', -130, -96, 260, 130, 2.4, p => {
  // A distant fort on a rock, a nod to the game's castle island
  p.fill('M-124 30 C-90 14 -70 2 -44 -10 C-20 -22 12 -20 34 -10 C60 2 90 14 124 30 Z')
  p.fill('M-26 -14 L-26 -44 L-18 -44 L-18 -38 L-10 -38 L-10 -44 L-2 -44 L-2 -38 L6 -38 L6 -44 L14 -44 L14 -14 Z')
  p.fill('M14 -14 L14 -68 L18 -68 L18 -74 L22 -74 L22 -68 L26 -68 L26 -74 L30 -74 L30 -68 L34 -68 L34 -14 Z')
  p.cut(p.star(24, -52, 4) + `M21 -36L21 -26L27 -26L27 -36C27 -38 24 -40 24 -41C24 -40 21 -38 21 -36Z`)
  for (const x of [-16, -6, 4]) p.cut(`M${x - 2.4} -18L${x - 2.4} -30C${x - 2.4} -32 ${x} -33 ${x} -34C${x} -33 ${x + 2.4} -32 ${x + 2.4} -30L${x + 2.4} -18Z`)
  const t = new Curve([[-100, 22], [-60, 6], [-40, -4], [0, -8], [30, -6], [70, 12], [100, 22]])
  p.cut(t.dashes(p, 10, 5, 0.8))
})
const islandC = add('islandC', -90, -50, 180, 80, 2.4, p => {
  p.fill('M-86 26 C-60 12 -40 4 -22 -4 C-6 -12 12 -12 28 -2 C48 8 66 14 86 26 Z')
  // A lighthouse, far away
  p.fill('M-4 -8 L-1 -38 L9 -38 L12 -8 Z')
  p.fill('M-3 -38 L-3 -41 L13 -41 L13 -38 Z')
  p.fill('M0 -41 L0 -46 C2 -50 8 -50 10 -46 L10 -41 Z')
  p.cut(p.dot(5, -45, 2) + p.slit(1, -26, 9, -26, 1) + p.slit(0, -16, 10, -16, 1))
})

// A small dhow, far off. One piece: at this size it only needs a beautiful outline.
const farDhow = add('farDhow', -74, -110, 150, 130, 3, p => {
  p.fill('M-52 -6 C-30 0 20 0 38 -6 C46 -10 58 -18 66 -24 C60 -8 48 8 30 14 C4 20 -26 18 -42 8 C-48 4 -52 -2 -52 -6 Z')
  p.fill('M46 -14 C22 -30 -14 -66 -44 -102 C-46 -74 -44 -36 -36 -12 C-14 -18 20 -20 46 -14 Z', 0.94)
  p.fill(p.bar(-2, -2, 6, -82, 2.4, 1.2))
  p.cut(p.star(-22, -38, 6))
  for (let i = 0; i < 4; i++) p.cut(p.slit(-14 + i * 10, -20, -36 + i * 12, -60 + i * 10, 0.5))
})

const gull = add('gull', -16, -8, 32, 14, 3, p => {
  p.fill('M0 0 C-4 -5 -10 -6 -15 -3 C-9 -4 -4 -2 -1 2 L1 2 C4 -2 9 -4 15 -3 C10 -6 4 -5 0 0 Z')
})

// ---------------------------------------------------------------- wave boards
// Each board is a strip of cut hide with a repeating crest. Light shows between boards, so depth reads as rows of water.
const waveTile = (name: string, P: number, amp: number, thick: number, res: number, pierce: boolean, style: number) =>
  add(name, -2, -amp - 6, P + 4, amp + thick + 12, res, p => {
    const a = amp
    const b = thick
    // Top edge: a swell, then a hooked crest. Bottom edge: a slow scallop, so the board reads as a band.
    const top =
      style === 0
        ? `M-2 ${a * 0.1} L0 ${a * 0.1} C${P * 0.14} ${a * 0.1} ${P * 0.26} ${-a * 0.2} ${P * 0.4} ${-a * 0.7} C${P * 0.47} ${-a * 1.02} ${P * 0.56} ${-a * 1.02} ${P * 0.62} ${-a * 0.72} C${P * 0.655} ${-a * 0.48} ${P * 0.635} ${-a * 0.28} ${P * 0.6} ${-a * 0.34} C${P * 0.585} ${-a * 0.38} ${P * 0.59} ${-a * 0.52} ${P * 0.605} ${-a * 0.5} C${P * 0.575} ${-a * 0.72} ${P * 0.53} ${-a * 0.42} ${P * 0.58} ${-a * 0.16} C${P * 0.63} ${a * 0.1} ${P * 0.84} ${a * 0.16} ${P} ${a * 0.1}`
        : `M-2 ${a * 0.1} L0 ${a * 0.1} C${P * 0.2} ${a * 0.1} ${P * 0.3} ${-a * 0.9} ${P * 0.5} ${-a * 0.9} C${P * 0.7} ${-a * 0.9} ${P * 0.8} ${a * 0.1} ${P} ${a * 0.1}`
    const bottom = `L${P + 2} ${a * 0.1} L${P + 2} ${b} L${P} ${b} C${P * 0.86} ${b + a * 0.16} ${P * 0.72} ${b + a * 0.16} ${P * 0.5} ${b - a * 0.04} C${P * 0.32} ${b - a * 0.2} ${P * 0.16} ${b - a * 0.18} 0 ${b} L-2 ${b} Z`
    p.fill(top + bottom)
    if (pierce) {
      const c = new Curve([[P * 0.02, a * 0.34], [P * 0.18, a * 0.3], [P * 0.32, -a * 0.1], [P * 0.45, -a * 0.46], [P * 0.5, -a * 0.6], [P * 0.54, -a * 0.6], [P * 0.56, -a * 0.46]])
      p.cut(c.dashes(p, 5, 0, Math.max(0.7, a * 0.03), 0.04, 0.96))
      c.each(7, a * 0.3, (x, y) => p.cut(p.dot(x, y, Math.max(0.6, a * 0.03))), 0.2, 0.96)
      const c2 = new Curve([[P * 0.62, a * 0.42], [P * 0.72, a * 0.5], [P * 0.86, a * 0.5], [P * 0.98, a * 0.44]])
      p.cut(c2.dashes(p, 3, 0, Math.max(0.6, a * 0.026)))
    }
  })
const waveFar = waveTile('waveFar', 128, 6, 7, 3, false, 1)
const waveMidA = waveTile('waveMidA', 176, 15, 13, 3, true, 0)
const waveMidB = waveTile('waveMidB', 214, 19, 15, 3, true, 0)
const waveFore = waveTile('waveFore', 310, 30, 22, 2, true, 0)
const waveNear = waveTile('waveNear', 620, 54, 150, 1, false, 0)

export const allPieces = () => pieces

// ---------------------------------------------------------------- staging

export type Stage = {
  w: number
  h: number
  /** Puppet size, about 1 at 1440x900. */
  k: number
  /** The horizon. */
  sea: number
  /** Where everything stands. x and y in rest wall coordinates. */
  dhowX: number
  dhowY: number
  dhowK: number
  islandAX: number
  islandAY: number
  islandAK: number
  islandBX: number
  islandBY: number
  islandBK: number
  islandCX: number
  islandCY: number
  farX: number
  farY: number
  hoopSky: number
  hoopY: number
  hoopY2: number
  hoopK: number
  bottom: number
  phone: boolean
}

export type Sink = (piece: Piece, layer: number, m: M, density?: number) => void

const FAR = 0
const MID = 1
const FORE = 2
const NEAR = 3

const wavesRow = (sink: Sink, tile: Piece, layer: number, y: number, x: number, w: number, k: number, tilt = 0) => {
  const P = (tile.w - 4) * k
  const start = ((x % P) + P) % P
  // A board is one long rigid strip, so a tiny tilt runs through its whole length.
  const c = Math.cos(tilt)
  const s = Math.sin(tilt)
  for (let px = start - P * 2; px < w + P * 2; px += P) {
    const dx = px - w * 0.5
    sink(tile, layer, [k * c, -k * s, k * s, k * c, w * 0.5 + dx * c, y + dx * s])
  }
}

/** Places every piece for this moment. t is seconds, p the scroll progress, margin how far past the screen to keep drawing. */
export function stageFrame(sink: Sink, s: Stage, t: number, p: number, margin: number) {
  const { w, k } = s
  const left = -margin
  const span = w + margin * 2

  // ---- the far line of the sea, islands and small things
  const seaY = s.sea
  wavesRow(sink, waveFar, FAR, seaY + 1 * k, Math.sin(t * 0.19) * 18 * k, span + margin, k * 1.05, 0.0012 * Math.sin(t * 0.21))
  wavesRow(sink, waveFar, FAR, seaY + 10 * k, -Math.sin(t * 0.23 + 2) * 22 * k + 60, span + margin, k * 1.2, -0.0012 * Math.sin(t * 0.17))

  // Islands stand on the far boards
  const bob = (a: number, f: number, ph: number) => a * Math.sin(t * f + ph)
  {
    const m: M = [s.islandAK, 0, 0, s.islandAK, s.islandAX, s.islandAY + bob(0.8, 0.31, 0)]
    sink(islandA, FAR, m)
    // Palms on the island, each frond a jointed piece
    palm(sink, FAR, chain(m, T(-140, -6)), trunkA, t, 0.2, 1.05)
    palm(sink, FAR, chain(m, T(92, -10)), trunkB, t, 1.4, 0.9)
    palm(sink, FAR, chain(m, T(138, 2), Sc(0.82)), trunkA, t, 2.7, 0.8)
    const mb: M = [s.islandBK, 0, 0, s.islandBK, s.islandBX, s.islandBY + bob(0.6, 0.27, 1)]
    sink(islandB, FAR, mb)
    const mc: M = [s.islandBK * 0.86, 0, 0, s.islandBK * 0.86, s.islandCX, s.islandCY + bob(0.5, 0.23, 2)]
    sink(islandC, FAR, mc)
  }
  // A small sail, always moving, very slowly
  {
    const span2 = w * 0.42
    const phase = (t * 0.008 + p * 0.1) % 1
    const fx = s.farX + (phase < 0.5 ? phase : 1 - phase) * span2
    const rock = Math.sin(t * 0.6) * 0.03
    sink(farDhow, FAR, chain(T(fx, s.farY + Math.sin(t * 0.7) * 1.6 * k), R(rock), Sc(k * 0.62)))
  }
  // Two gulls
  for (const [i, gx, gy] of [[0, 0.72, -92], [1, 0.76, -78]] as const) {
    const flap = 0.55 + 0.45 * Math.sin(t * (3.2 + i * 0.5) + i * 2)
    const x = (((s.farX * 0.6 + (t * (9 + i * 2)) * k + w * gx) % (w + 200)) + w + 200) % (w + 200) - 100
    sink(gull, FAR, [k * 0.9, 0, 0, k * 0.9 * (0.5 + 0.7 * flap), x, seaY + gy * k + Math.sin(t * 0.6 + i) * 6])
  }

  // ---- the boards behind her
  wavesRow(sink, waveMidA, MID, seaY + 44 * k, Math.sin(t * 0.31) * 34 * k, span, k, 0.002 * Math.sin(t * 0.33))

  // ---- the dhow, in three jointed pieces: hull, sail and yard, oars, the helm
  const roll = Math.sin(t * 0.72) * 0.024 + Math.sin(t * 0.31 + 1) * 0.012
  const heave = Math.sin(t * 0.72 + 0.8) * 2.4 * k + Math.sin(t * 0.43) * 1.2 * k
  const advance = s.dhowX + Math.sin(t * 0.06) * 26 * k + p * 50 * k
  const D = s.dhowK
  const base = chain(T(advance, s.dhowY + heave), R(roll), Sc(D))
  // The rod comes up from below the sea, and rocks as a puppeteer holds it
  {
    const upper = chain(base, T(-20, 42), R(0.16 + roll * 0.8))
    sink(rodTop, MID, upper)
    sink(rod, MID, chain(upper, T(0, 120), R(-0.26 - roll * 0.5)), 1)
  }
  // Mast and sail. The whole rig leans as the wind fills, pivoting at the mast step.
  const rigLean = Math.sin(t * 0.72 + 0.4) * 0.012
  const rig = chain(base, about(-6, -6, rigLean))
  sink(mast, MID, rig)
  // The yard hangs from a pivot, and shifts with the wind
  const yardSwing = Math.sin(t * 0.44 + 0.7) * 0.012 + Math.sin(t * 1.3) * 0.003
  const yardM = chain(rig, about(4, -224, yardSwing))
  // The sail breathes: a very small skew from the tack, like cloth filling and spilling
  const fill = 1 + Math.sin(t * 0.52 + 1.4) * 0.012
  sink(sail, MID, chain(yardM, T(120, -48), [fill, 0, Math.sin(t * 0.52 + 1.4) * 0.006, 1, 0, 0] as M, T(-120, 48)), 1)
  sink(yard, MID, yardM)
  // Pennant, in two hinged lengths at the masthead
  const flap1 = Math.sin(t * 2.3) * 0.18 - 0.12
  const flap2 = Math.sin(t * 2.3 - 0.9) * 0.34 - 0.04
  const pen1 = chain(rig, T(19, -306), R(flap1))
  sink(pennant1, MID, pen1)
  sink(pennant2, MID, chain(pen1, T(34, -3), R(flap2)))
  // Three oars, rowed in time
  const row = t * 1.05
  for (let i = 0; i < 3; i++) {
    const a = 0.72 + Math.sin(row + i * 0.18) * 0.17
    const b = Math.cos(row + i * 0.18)
    sink(oar, MID, chain(base, T(-60 + i * 58, 8 + (i === 1 ? 3 : 0)), R(a + b * 0.03)))
  }
  sink(rudder, MID, chain(base, T(-168, 18), R(Math.sin(t * 0.5) * 0.09)))
  sink(hull, MID, base)
  // Yasmina stands at the helm, and leans with the boat a little more than the boat does
  const yas = chain(base, T(-92, -13), Sc(0.92), about(0, 0, -roll * 1.4 + Math.sin(t * 0.72 + 0.4) * 0.018))
  sink(yasmina, MID, yas)
  sink(yasArm, MID, chain(yas, T(2.2, -35), R(-0.1 + Math.sin(t * 0.5) * 0.07)))

  // ---- boards in front of her hull
  wavesRow(sink, waveMidB, MID, seaY + 80 * k, -Math.sin(t * 0.37 + 1) * 42 * k + 40, span, k, -0.0024 * Math.sin(t * 0.29 + 1))
  wavesRow(sink, waveMidB, MID, seaY + 118 * k, Math.sin(t * 0.29 + 2.4) * 30 * k + 90, span, k * 1.12, 0.0026 * Math.sin(t * 0.25 + 2))

  // ---- the hoopoe crossing. It flies in the bounding way hoopoes do.
  {
    const cycle = 26
    // On arrival it is over the water just past the palm, heading for the space under the words.
    const f = ((t - 19 + cycle * 0.43) % cycle) / cycle
    const hw = w + 420 * k
    const x = -210 * k + hw * f
    const hop = Math.sin(f * Math.PI * 2 * 5.5)
    const ss = (a: number, b: number, v: number) => {
      const u = Math.max(0, Math.min(1, (v - a) / (b - a)))
      return u * u * (3 - 2 * u)
    }
    // High across the stars, eclipsing them, then down behind the lantern, out over the palms and under the words.
    const y = s.hoopSky + (s.hoopY - s.hoopSky) * ss(0.2, 0.31, f) + (s.hoopY2 - s.hoopY) * ss(0.31, 0.43, f) + hop * 9 * k
    const pitch = Math.cos(f * Math.PI * 2 * 5.5) * 0.14
    const H = s.hoopK
    const m = chain(T(x, y), R(-pitch * 0.9), Sc(H))
    // The beat: a run of flaps, then wings folded, which is what gives it that butterfly flight.
    const beat = Math.sin(t * 13)
    const glide = 0.5 + 0.5 * Math.sin(f * Math.PI * 2 * 5.5 + 1)
    const amp = 0.25 + 0.75 * glide
    const inner = beat * 0.62 * amp + 0.12
    const outer = Math.sin(t * 13 - 0.9) * 0.72 * amp + 0.1
    // The far wing first
    const far = chain(m, T(10, -9), R(inner * 0.9 + 0.34), Sc(0.88, 0.88))
    sink(wingInner, MID, far)
    sink(wingOuter, MID, chain(far, T(-30, -30), R(outer * 0.9)))
    sink(hoopoeBody, MID, m)
    sink(hoopoeCrest, MID, chain(m, T(36, -16), R(Math.sin(t * 2.2) * 0.07 + hop * 0.05)))
    sink(wire, MID, chain(m, T(-6, 13), R(-pitch * 0.2 + 0.03)), 0.95)
    const near = chain(m, T(6, -8), R(inner))
    sink(wingInner, MID, near)
    sink(wingOuter, MID, chain(near, T(-30, -30), R(outer)))
  }

  // ---- the boards closest to us, on planes nearer the lantern
  wavesRow(sink, waveFore, FORE, seaY + 167 * k, -Math.sin(t * 0.26 + 0.4) * 60 * k + 130, span, k, -0.003 * Math.sin(t * 0.21))
  wavesRow(sink, waveFore, FORE, seaY + 228 * k, Math.sin(t * 0.21 + 2) * 74 * k + 20, span, k * 1.22, 0.003 * Math.sin(t * 0.19 + 1))

  // ---- phones: a last row of boards at the far end of the long wall
  if (s.phone) {
    const b = s.bottom
    wavesRow(sink, waveMidB, MID, b - 118 * k, Math.sin(t * 0.33) * 30 * k, span, k * 1.3, 0.003 * Math.sin(t * 0.3))
    wavesRow(sink, waveFore, FORE, b - 68 * k, -Math.sin(t * 0.27 + 1) * 46 * k + 80, span, k * 1.1, -0.004 * Math.sin(t * 0.21))
  }

  // ---- out of focus, very near the lamp
  wavesRow(sink, waveNear, NEAR, s.bottom - 16 * k, Math.sin(t * 0.16) * 110 * k, span + margin, k)
  // A great frond across one corner, so the frame has a foreground that moves against the world.
  const fr = Math.sin(t * 0.5) * 0.02 + Math.sin(t * 1.21) * 0.006
  sink(frondNear, NEAR, chain(T(left + margin * 0.34, s.bottom - 170 * k), R(-0.72 + fr), Sc(k * 1.02)))
  sink(frondNear, NEAR, chain(T(left + margin * 0.2, s.bottom - 110 * k), R(-0.2 + fr * 1.3), Sc(k * 0.86)))
}

/** A palm with jointed fronds. Each frond swings about the crown. */
function palm(sink: Sink, layer: number, base: M, tr: Piece, t: number, seed: number, scale: number) {
  const m = mul(base, Sc(scale))
  sink(tr, layer, m)
  const top: [number, number] = tr === trunkA ? [26, -120] : [-22, -78]
  const fronds = [-2.9, -2.4, -1.95, -1.3, -0.82, -0.3, 0.12]
  fronds.forEach((a, i) => {
    const sway = Math.sin(t * 0.8 + seed + i * 0.7) * 0.025 + Math.sin(t * 1.9 + seed * 2 + i) * 0.009
    const piece = i % 2 ? frondA : frondB
    const flip = Math.cos(a) < 0
    sink(piece, layer, chain(m, T(top[0], top[1]), R(a + sway), flip ? Sc(1, -1) : Sc(1, 1)))
  })
}
