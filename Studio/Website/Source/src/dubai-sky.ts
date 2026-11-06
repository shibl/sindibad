// The real sky over Dubai at a given moment: where the sun and moon are, how much of the moon is lit, and the light and
// colours that follow from them. Dubai is on UTC+4 all year; the sums below only need the true instant.
export type Rgb = [number, number, number]
export type Env = {
  /** day, dawn, dusk or night, for anything that wants a name. */
  mode: 'day' | 'dawn' | 'dusk' | 'night'
  sunEl: number
  sunAz: number
  moonEl: number
  moonAz: number
  /** Fraction of the moon's face that is lit, 0 to 1, and how far it is above the horizon as a fade. */
  moonLit: number
  moonUp: number
  /** Cosine of the phase angle (1 full, -1 new), and which way on the disc the bright side faces, seen from Dubai. */
  moonPhase: number
  moonLimb: [number, number]
  /** How far the moon's north leans from straight up, in radians, as it hangs in the sky at this moment. */
  moonRot: number
  /** Directions as drawn: low bodies swing into the part of the sky the camera can see. */
  sunDir: Rgb
  moonDir: Rgb
  /** The light that casts shadows, and its strength: the sun, or the moon once the sun has gone. */
  L: Rgb
  light: Rgb
  amb: Rgb
  sky: Rgb
  zenith: Rgb
  glow: Rgb
  /** 1 when street and window lights are fully on. */
  night: number
  stars: number
  /** 1 when the camera should tilt up to show the sky. */
  skyShow: number
  /** Colours for the page around the map, as "r g b". */
  fade: string
  top: string
  dark: boolean
}

const LAT = 25.2048, LON = 55.2708
const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI
const wrap = (a: number) => ((a % 360) + 540) % 360 - 180
const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
const smooth = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t) }

/** Days since 2000-01-01 12:00 UTC. */
const jd2000 = (d: Date) => d.getTime() / 86400000 - 10957.5

function toHorizon(ra: number, dec: number, d: Date) {
  // Local sidereal time, then altitude and azimuth (azimuth from north, through east).
  const n = jd2000(d)
  const lst = rad(((280.46061837 + 360.98564736629 * n + LON) % 360 + 360) % 360)
  const H = lst - ra, phi = rad(LAT)
  const el = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H))
  const az = Math.atan2(-Math.cos(dec) * Math.sin(H), Math.sin(dec) * Math.cos(phi) - Math.cos(dec) * Math.sin(phi) * Math.cos(H))
  // The parallactic angle: how far the object's north leans from straight up, seen from here.
  const q = Math.atan2(Math.sin(H), Math.tan(phi) * Math.cos(dec) - Math.sin(dec) * Math.cos(H))
  return { el: deg(el), az: (deg(az) + 360) % 360, q }
}

export function sunAt(d: Date) {
  const n = jd2000(d)
  const g = rad((357.529 + 0.98560028 * n) % 360)
  const q = 280.459 + 0.98564736 * n
  const lon = rad(q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g))
  const e = rad(23.439 - 0.00000036 * n)
  const ra = Math.atan2(Math.cos(e) * Math.sin(lon), Math.cos(lon)), dec = Math.asin(Math.sin(e) * Math.sin(lon))
  return { ...toHorizon(ra, dec, d), lon }
}

export function moonAt(d: Date) {
  // Low-precision formula from the Astronomical Almanac: good to a fraction of a degree, far finer than a drawing needs.
  const T = jd2000(d) / 36525
  const s = (a: number, b: number) => a * Math.sin(rad(b))
  const lon = 218.32 + 481267.881 * T + s(6.29, 135.0 + 477198.87 * T) + s(-1.27, 259.3 - 413335.36 * T) + s(0.66, 235.7 + 890534.22 * T)
    + s(0.21, 269.9 + 954397.74 * T) + s(-0.19, 357.5 + 35999.05 * T) + s(-0.11, 186.5 + 966404.03 * T)
  const lat = s(5.13, 93.3 + 483202.02 * T) + s(0.28, 228.2 + 960400.89 * T) + s(-0.28, 318.3 + 6003.15 * T) + s(-0.17, 217.6 - 407332.21 * T)
  const l = rad(lon), b = rad(lat), e = rad(23.439 - 0.013 * T)
  const x = Math.cos(b) * Math.cos(l)
  const y = Math.cos(e) * Math.cos(b) * Math.sin(l) - Math.sin(e) * Math.sin(b)
  const z = Math.sin(e) * Math.cos(b) * Math.sin(l) + Math.cos(e) * Math.sin(b)
  const ra = Math.atan2(y, x), dec = Math.asin(z)
  const sun = sunAt(d)
  const elong = Math.acos(Math.cos(b) * Math.cos(l - sun.lon))
  return { ...toHorizon(ra, dec, d), lit: (1 - Math.cos(elong)) / 2 }
}

const lin = (s: string): Rgb => {
  const f = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const n = parseInt(s.slice(1), 16)
  return [f(((n >> 16) & 255) / 255), f(((n >> 8) & 255) / 255), f((n & 255) / 255)]
}
const css = (c: Rgb) => c.map(v => Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.max(v, 0) ** (1 / 2.4) - 0.055))).join(' ')
const scale = (c: Rgb, k: number): Rgb => [c[0] * k, c[1] * k, c[2] * k]

// The look of the sky, keyed by how high the sun is.
type Key = { el: number; sky: Rgb; zen: Rgb; amb: Rgb; light: Rgb; glow: Rgb; fade: Rgb }
const KEYS: Key[] = [
  { el: -18, sky: lin('#0d1636'), zen: lin('#040818'), amb: [0.042, 0.056, 0.115], light: [0, 0, 0], glow: [0, 0, 0], fade: lin('#0a1026') },
  { el: -10, sky: lin('#1c2652'), zen: lin('#070d28'), amb: [0.065, 0.085, 0.17], light: [0, 0, 0], glow: [0.02, 0.012, 0.03], fade: lin('#0d1430') },
  { el: -5, sky: lin('#5e5a9c'), zen: lin('#141f55'), amb: [0.12, 0.13, 0.27], light: [0, 0, 0], glow: [0.28, 0.1, 0.09], fade: lin('#1b2150') },
  { el: -1, sky: lin('#b98498'), zen: lin('#34488f'), amb: [0.19, 0.17, 0.32], light: [0.3, 0.13, 0.08], glow: [0.72, 0.27, 0.1], fade: lin('#2f2a5a') },
  { el: 1, sky: lin('#e8a98f'), zen: lin('#5479bd'), amb: [0.22, 0.19, 0.32], light: [0.75, 0.36, 0.16], glow: [0.72, 0.3, 0.1], fade: lin('#4c3f68') },
  { el: 2, sky: lin('#f6bd97'), zen: lin('#6490cf'), amb: [0.23, 0.2, 0.32], light: [1.05, 0.54, 0.25], glow: [0.68, 0.3, 0.1], fade: lin('#fbe6d4') },
  { el: 4, sky: lin('#ffcfa6'), zen: lin('#78a3dd'), amb: [0.26, 0.24, 0.35], light: [1.3, 0.74, 0.36], glow: [0.55, 0.27, 0.09], fade: lin('#fff0e0') },
  { el: 9, sky: lin('#ffe4c8'), zen: lin('#8fbee9'), amb: [0.33, 0.34, 0.44], light: [1.2, 0.9, 0.6], glow: [0.2, 0.11, 0.04], fade: lin('#fff7ee') },
  { el: 18, sky: lin('#e9f0ee'), zen: lin('#9cd0f0'), amb: [0.44, 0.47, 0.5], light: [0.95, 0.86, 0.72], glow: [0, 0, 0], fade: lin('#ffffff') },
  { el: 35, sky: lin('#d9eef9'), zen: lin('#9fd2f3'), amb: [0.39, 0.44, 0.48], light: [0.78, 0.74, 0.68], glow: [0, 0, 0], fade: lin('#ffffff') },
  { el: 55, sky: lin('#d9eef9'), zen: lin('#9fd2f3'), amb: [0.31, 0.385, 0.43], light: [0.7, 0.67, 0.62], glow: [0, 0, 0], fade: lin('#ffffff') },
]
const mix3 = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
function look(el: number): Key {
  if (el <= KEYS[0].el) return KEYS[0]
  for (let i = 1; i < KEYS.length; i++) {
    if (el <= KEYS[i].el) {
      const a = KEYS[i - 1], b = KEYS[i], t = (el - a.el) / (b.el - a.el)
      return { el, sky: mix3(a.sky, b.sky, t), zen: mix3(a.zen, b.zen, t), amb: mix3(a.amb, b.amb, t), light: mix3(a.light, b.light, t), glow: mix3(a.glow, b.glow, t), fade: mix3(a.fade, b.fade, t) }
    }
  }
  return KEYS[KEYS.length - 1]
}

const cross = (a: Rgb, b: Rgb): Rgb => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const dot = (a: Rgb, b: Rgb) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const norm = (a: Rgb): Rgb => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l] }
const dir = (az: number, el: number): Rgb => {
  const a = rad(az), e = rad(el)
  return [Math.sin(a) * Math.cos(e), Math.cos(a) * Math.cos(e), Math.sin(e)]
}

export const HEADING = 318   // the way the camera looks at rest, in compass degrees: north-west, over the tower to the Gulf

export function skyAt(d: Date): Env {
  const sun = sunAt(d), moon = moonAt(d)
  // The camera only sees a slice of sky, so a low sun or moon swings round into it. Morning comes up on the right of the
  // frame and evening sets on the left, which is the side they'd really be on. Higher up, the sun keeps its true bearing.
  const morning = sun.az < 180
  const rel = wrap(sun.az - HEADING)
  const low = 1 - smooth(4, 24, sun.el)
  const artAz = HEADING + rel + wrap((morning ? 25 : -25) - rel) * low
  const sunDir = dir(artAz, sun.el)
  const mRel = wrap(moon.az - HEADING)
  const mAz = HEADING + (Math.abs(mRel) < 16 ? (mRel < 0 ? -16 : 16) : Math.abs(mRel) < 26 ? mRel : mRel > 0 ? 22 : -22)
  const moonUp = smooth(-1, 2, moon.el)
  const moonDir = dir(mAz, 4 + 0.9 * clamp01(moon.el / 50))    // always where you can see it while it's up, clear of the tower

  const k = look(sun.el)
  let L: Rgb = dir(artAz, Math.max(sun.el, 3))
  let light = k.light
  if (sun.el < -1.5) {
    // Moonlight: soft and blue, and only as bright as the moon is full. Its shadows come from high enough to stay readable.
    L = dir(mAz, Math.max(moon.el, 34))
    const m = moonUp * Math.sqrt(moon.lit) * smooth(-1.5, -6, sun.el)
    light = [0.14 * m, 0.18 * m, 0.27 * m]
  }
  // Which way the lit side of the moon faces: toward the true sun, on the true sky.
  const tm = dir(moon.az, moon.el), ts = dir(sun.az, sun.el)
  const tr = norm(cross(tm, [0, 0, 1])), tu = cross(tr, tm)
  const lx = dot(ts, tr), ly = dot(ts, tu), ll = Math.hypot(lx, ly) || 1
  const night = 1 - smooth(-8, 0.5, sun.el)
  const dark = sun.el < 1.5
  const mode = sun.el > 8 ? 'day' : sun.el < -6 ? 'night' : morning ? 'dawn' : 'dusk'
  return {
    mode, sunEl: sun.el, sunAz: sun.az, moonEl: moon.el, moonAz: moon.az, moonLit: moon.lit, moonUp,
    moonPhase: 2 * moon.lit - 1,
    moonLimb: [lx / ll, ly / ll],
    moonRot: moon.q,
    sunDir, moonDir, L, light, amb: k.amb, sky: k.sky, zenith: k.zen, glow: k.glow, night,
    stars: 1 - smooth(-13, -4, sun.el),
    skyShow: 1 - smooth(5, 16, sun.el),
    fade: css(k.fade),
    top: css(mix3(k.sky, k.zen, 0.45 * (1 - smooth(5, 16, sun.el)))),
    dark,
  }
}

/** The moment to draw: now, or ?time=HH:MM and ?date=YYYY-MM-DD in Dubai, for previewing other hours and moons. */
export function dubaiNow(): Date {
  const q = new URLSearchParams(location.search)
  const m = /^(\d{1,2}):(\d{2})$/.exec(q.get('time') ?? '')
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(q.get('date') ?? '')
  const now = new Date()
  if (!m && !day) return now
  const dubai = new Date(now.getTime() + 4 * 3600000)
  return new Date(Date.UTC(
    day ? +day[1] : dubai.getUTCFullYear(), day ? +day[2] - 1 : dubai.getUTCMonth(), day ? +day[3] : dubai.getUTCDate(),
    (m ? +m[1] : dubai.getUTCHours()) - 4, m ? +m[2] : dubai.getUTCMinutes()))
}
