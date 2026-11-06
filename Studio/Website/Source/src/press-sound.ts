// Every sound the button makes, built on the spot with WebAudio, so there is nothing to download.
let ctx: AudioContext | null = null
let out: GainNode | null = null
let wail: { stop: () => void } | null = null
let muted = false
try {
  muted = localStorage.getItem('press-muted') === '1'
} catch {}

export const isMuted = () => muted
export function setMuted(on: boolean) {
  muted = on
  if (out) out.gain.value = on ? 0 : 0.8
  try {
    localStorage.setItem('press-muted', on ? '1' : '0')
  } catch {}
}
// Browsers only let sound start from a press, so every press calls this first.
export function wake() {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    ctx = new AC()
    out = ctx.createGain()
    out.gain.value = muted ? 0 : 0.8
    out.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
}

function tone(from: number, to: number, seconds: number, type: OscillatorType, level: number, at = 0) {
  if (!ctx || !out) return
  const t = ctx.currentTime + at
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.setValueAtTime(from, t)
  o.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + seconds)
  g.gain.setValueAtTime(level, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + seconds)
  o.connect(g).connect(out)
  o.start(t)
  o.stop(t + seconds + 0.02)
}
function hiss(seconds: number, level: number, freq: number, kind: BiquadFilterType = 'bandpass', at = 0) {
  if (!ctx || !out) return
  const t = ctx.currentTime + at
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  const s = ctx.createBufferSource()
  s.buffer = buf
  const f = ctx.createBiquadFilter()
  f.type = kind
  f.frequency.value = freq
  const g = ctx.createGain()
  g.gain.setValueAtTime(level, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + seconds)
  s.connect(f).connect(g).connect(out)
  s.start(t)
}

export const sound = {
  thunk() {
    tone(170, 46, 0.14, 'sine', 0.75)
    hiss(0.025, 0.3, 2400)
  },
  clunk() {
    tone(110, 70, 0.07, 'square', 0.14)
    hiss(0.03, 0.2, 3200)
  },
  clack() {
    hiss(0.035, 0.22, 1700)
    tone(420, 240, 0.03, 'square', 0.05)
  },
  slam() {
    tone(95, 38, 0.2, 'sine', 0.8)
    hiss(0.06, 0.32, 4200, 'highpass')
    tone(1500, 900, 0.05, 'triangle', 0.07, 0.015)
  },
  tick(streak: number) {
    const f = 540 * 2 ** (Math.min(streak, 14) / 12)
    tone(f, f * 1.02, 0.1, 'triangle', 0.26)
    tone(f * 2, f * 2, 0.05, 'sine', 0.08)
  },
  soft() {
    tone(760, 800, 0.05, 'sine', 0.07)
  },
  combo(level: number) {
    const base = 520 * 2 ** (level / 6)
    ;[1, 1.26, 1.5, 2].forEach((m, i) => tone(base * m, base * m, 0.13, 'triangle', 0.2, i * 0.055))
  },
  slow() {
    tone(310, 210, 0.17, 'sine', 0.2)
  },
  beat(i: number) {
    const f = 320 * 2 ** (i / 12)
    tone(f, f, 0.05, 'triangle', 0.1)
  },
  strike() {
    tone(240, 88, 0.38, 'sawtooth', 0.26)
    tone(180, 66, 0.38, 'square', 0.12)
  },
  // A rising and falling alarm that keeps going for a set time, or until it's stopped.
  siren(seconds = 1.1) {
    if (!ctx || !out) return
    wail?.stop()
    const t = ctx.currentTime
    const o = ctx.createOscillator()
    const f = ctx.createBiquadFilter()
    const g = ctx.createGain()
    o.type = 'sawtooth'
    f.type = 'lowpass'
    f.frequency.value = 2100
    for (let i = 0, k = t; k < t + seconds; i++, k += 0.42) {
      o.frequency.setValueAtTime(470, k)
      o.frequency.exponentialRampToValueAtTime(1020, k + 0.3)
      o.frequency.exponentialRampToValueAtTime(520, k + 0.42)
    }
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.13, t + 0.04)
    g.gain.setValueAtTime(0.13, t + seconds - 0.1)
    g.gain.exponentialRampToValueAtTime(0.0001, t + seconds)
    o.connect(f).connect(g).connect(out)
    o.start(t)
    o.stop(t + seconds + 0.02)
    const self = {
      stop() {
        if (wail === self) wail = null
        try {
          const n = ctx!.currentTime
          g.gain.cancelScheduledValues(n)
          g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), n)
          g.gain.exponentialRampToValueAtTime(0.0001, n + 0.06)
          o.stop(n + 0.08)
        } catch {}
      },
    }
    wail = self
  },
  hush() {
    wail?.stop()
  },
  over() {
    ;[392, 330, 262].forEach((f, i) => tone(f, f * 0.98, 0.26, 'triangle', 0.22, i * 0.17))
  },
  best() {
    ;[523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f, 0.2, 'triangle', 0.22, i * 0.09))
  },
}

export function buzz(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern)
  } catch {}
}
