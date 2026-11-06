// The lantern's motion: a heavy damped pendulum in two directions, with a chain that bows when it is jerked,
// a body that lags behind the chain, and a slow twist on the chain's torsion. Everything is integrated with small
// fixed steps so it feels the same at any frame rate.

export type SwingInput = {
  /** Where the cursor would pull the lantern, in radians, or null when nobody is steering. */
  aimX: number | null
  aimZ: number | null
  /** Pushes this frame, in radians per second, from the hand moving or the page scrolling. */
  kickX: number
  kickZ: number
  /** How much the air moves, for idle sway. 0 is still air. */
  breeze: number
}

const TAU = Math.PI * 2
const STEP = 1 / 240

export class Swing {
  // Main pendulum. x swings along the wall, z swings towards and away from it.
  ax = 0.03
  az = -0.012
  vx = 0
  vz = 0.02
  // The chain's first bending mode
  bx = 0
  bz = 0
  bvx = 0
  bvz = 0
  // The body's tilt relative to the chain, because it hangs from a ring
  tx = 0
  tz = 0
  tvx = 0
  tvz = 0
  // Twist about the chain
  tw = 0
  tvw = 0
  time = Math.random() * 40
  leanX = 0
  leanZ = 0
  private spare = 0

  constructor(
    public w0: number, // natural frequency of the main swing
    public limit: number, // soft stop, radians. Set from the layout, so the lantern can never reach the words.
  ) {}

  step(dt: number, input: SwingInput) {
    this.spare += dt
    let n = 0
    while (this.spare >= STEP && n < 40) {
      this.spare -= STEP
      n++
      this.tick(STEP, input, n === 1)
    }
  }

  private tick(h: number, input: SwingInput, first: boolean) {
    const w0 = this.w0
    const w2 = w0 * w0
    const zeta = 0.065
    this.time += h
    const t = this.time
    if (first) {
      this.vx += input.kickX
      this.vz += input.kickZ
      // A push rarely lands dead centre, so some of it goes into the twist.
      this.tvw += input.kickX * 0.5 - input.kickZ * 0.35
    }
    // The air: two slow tones close to resonance, so it keeps swinging gently without ever repeating.
    const br = input.breeze
    const fx = br * 0.016 * (Math.sin(w0 * t) + 0.55 * Math.sin(w0 * 0.63 * t + 1.7) + 0.35 * Math.sin(w0 * 1.37 * t + 4.1))
    const fz = br * 0.012 * (Math.sin(w0 * 0.93 * t + 0.6) + 0.6 * Math.sin(w0 * 0.57 * t + 3.1))
    // The hand moves the point of balance, like a draught leaning on it. The natural period stays the same, so the swing
    // keeps its weight, and a quick move of the hand overshoots and rings down instead of being followed.
    const smooth = 1 - Math.exp(-h / 0.11)
    this.leanX += ((input.aimX ?? 0) - this.leanX) * smooth
    this.leanZ += ((input.aimZ ?? 0) - this.leanZ) * smooth
    const pullX = w2 * this.leanX
    const pullZ = w2 * this.leanZ
    // Past its limit the swing meets a soft stop and loses energy fast, so a hand pumping at resonance can't throw it into the words.
    const stop = (a: number, v: number, limit: number) => {
      const over = Math.abs(a) - limit
      if (over <= 0) return 0
      const outward = a * v > 0 ? v : 0
      return -Math.sign(a) * over * w2 * 40 - outward * 14
    }
    const ax = -w2 * Math.sin(this.ax) - 2 * zeta * w0 * this.vx + fx + pullX + stop(this.ax, this.vx, this.limit)
    const az = -w2 * Math.sin(this.az) - 2 * zeta * w0 * this.vz + fz + pullZ + stop(this.az, this.vz, this.limit * 0.55)
    this.vx += ax * h
    this.vz += az * h
    this.ax += this.vx * h
    this.az += this.vz * h

    // The chain bows against sudden acceleration, a stiff fast mode.
    const wb = TAU / 0.62
    const bAcc = (b: number, v: number, a: number) => -wb * wb * b - 2 * 0.16 * wb * v - a * 1.2
    this.bvx += bAcc(this.bx, this.bvx, ax) * h
    this.bvz += bAcc(this.bz, this.bvz, az) * h
    this.bx += this.bvx * h
    this.bz += this.bvz * h

    // The body swings on its ring, a short pendulum.
    const wt = TAU / 0.98
    const tAcc = (b: number, v: number, a: number) => -wt * wt * b - 2 * 0.1 * wt * v - a * 0.55
    this.tvx += tAcc(this.tx, this.tvx, ax) * h
    this.tvz += tAcc(this.tz, this.tvz, az) * h
    this.tx += this.tvx * h
    this.tz += this.tvz * h

    // Twist: swinging winds the chain a little, and it unwinds slowly with a long period.
    const wtw = TAU / 7.2
    const windUp = (this.vx * this.az - this.vz * this.ax) * 2.8 + 0.22 * this.vz * Math.abs(this.vx) + br * 0.03 * Math.sin(0.29 * t + 2.0)
    const twistStop = Math.abs(this.tw) > 0.2 ? -Math.sign(this.tw) * (Math.abs(this.tw) - 0.2) * 40 : 0
    this.tvw += (-wtw * wtw * this.tw - 2 * 0.075 * wtw * this.tvw + windUp + twistStop) * h
    this.tw += this.tvw * h
  }
}

// Smooth flicker. Value noise on the time axis, in -1..1.
const hash = (n: number) => {
  const s = Math.sin(n * 127.1) * 43758.5453
  return (s - Math.floor(s)) * 2 - 1
}
export const noise1 = (x: number) => {
  const i = Math.floor(x)
  const f = x - i
  const u = f * f * (3 - 2 * f)
  return hash(i) * (1 - u) + hash(i + 1) * u
}

export class Flame {
  /** Brightness about 1. */
  power = 1
  /** Size of the flame about 1, which sets the softness of everything it throws. */
  size = 1
  /** A small wander of the flame's position, in the lantern's units, -1..1. */
  jx = 0
  jy = 0
  private t = Math.random() * 100
  private gust = 0

  step(dt: number, moving: number) {
    this.t += dt
    const t = this.t
    // A slow breath, a lick of the flame, and an occasional dip when a draught catches it
    const slow = noise1(t * 1.3)
    const lick = noise1(t * 6.7 + 9) * 0.6 + noise1(t * 14.1 + 3) * 0.4
    if (noise1(t * 0.41 + 21) > 0.72) this.gust = Math.min(1, this.gust + dt * 5)
    else this.gust = Math.max(0, this.gust - dt * 1.8)
    const speed = Math.min(1, moving)
    this.power = 1 + 0.055 * slow + 0.035 * lick - 0.11 * this.gust - 0.04 * speed
    this.size = 1 + 0.16 * slow + 0.12 * lick + 0.45 * this.gust + 0.25 * speed
    this.jx = noise1(t * 3.1 + 40) * (0.5 + this.gust)
    this.jy = noise1(t * 2.3 + 77) * (0.5 + this.gust)
  }
}
