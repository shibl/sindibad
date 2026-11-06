// The portal's sounds, all synthesised, so there's nothing to download. Audio can only start from a tap, so unlock() runs there.
let ctx: AudioContext | null = null
let master: GainNode | null = null
let pad: { gain: GainNode; stop: () => void } | null = null
let muted = false

export function unlock() {
  try {
    ctx ??= new AudioContext()
    void ctx.resume()
    if (!master) {
      master = ctx.createGain()
      master.gain.value = muted ? 0 : 0.8
      master.connect(ctx.destination)
    }
  } catch {
    ctx = null
  }
}

export function setMuted(on: boolean) {
  muted = on
  if (master && ctx) master.gain.setTargetAtTime(on ? 0 : 0.8, ctx.currentTime, 0.05)
}

function tone(freq: number, at: number, length: number, level: number, type: OscillatorType = 'sine') {
  if (!ctx || !master) return
  const t = ctx.currentTime + at
  const o = ctx.createOscillator(), g = ctx.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(level, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0008, t + length)
  o.connect(g).connect(master)
  o.start(t)
  o.stop(t + length + 0.05)
}

function whoosh(length: number, from: number, to: number, level: number) {
  if (!ctx || !master) return
  const n = Math.floor(ctx.sampleRate * length)
  const b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
  const s = ctx.createBufferSource()
  s.buffer = b
  const f = ctx.createBiquadFilter()
  f.type = 'bandpass'
  f.Q.value = 1.4
  const t = ctx.currentTime
  f.frequency.setValueAtTime(from, t)
  f.frequency.exponentialRampToValueAtTime(to, t + length)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(level, t + length * 0.45)
  g.gain.linearRampToValueAtTime(0, t + length)
  s.connect(f).connect(g).connect(master)
  s.start(t)
}

/** A deep bump and a rising shimmer, as the arch rises and the opening widens. */
export function playOpen() {
  tone(70, 0, 0.5, 0.5)
  whoosh(1.1, 300, 4200, 0.16)
  ;[523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, 0.45 + i * 0.09, 0.8, 0.09, 'triangle'))
}

/** A rush of air and a bright little fanfare, as you cross. */
export function playCross() {
  whoosh(0.9, 500, 5200, 0.28)
  ;[659.25, 880, 1108.73, 1318.5, 1760].forEach((f, i) => tone(f, 0.12 + i * 0.075, 0.9, 0.11, 'triangle'))
}

/** A soft, slowly breathing chord while you're in the other world. */
export function setWorldPad(on: boolean) {
  if (!ctx || !master) return
  const c = ctx
  if (on && !pad) {
    const gain = c.createGain()
    gain.gain.value = 0
    gain.gain.linearRampToValueAtTime(0.1, c.currentTime + 2.5)
    gain.connect(master)
    const oscs = [110, 164.81, 220.6, 329.63].map(f => {
      const o = c.createOscillator()
      o.frequency.value = f
      const g = c.createGain()
      g.gain.value = 0.32
      const l = c.createOscillator(), lg = c.createGain()
      l.frequency.value = 0.06 + Math.random() * 0.1
      lg.gain.value = 0.2
      l.connect(lg).connect(g.gain)
      o.connect(g).connect(gain)
      o.start()
      l.start()
      return [o, l]
    })
    pad = { gain, stop: () => oscs.flat().forEach(o => o.stop()) }
  } else if (!on && pad) {
    const p = pad
    pad = null
    p.gain.gain.setTargetAtTime(0, c.currentTime, 0.4)
    setTimeout(p.stop, 1800)
  }
}
