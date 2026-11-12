/**
 * Tiny chiptune bleeps. The AudioContext is created lazily, only from `unlock()` which the
 * cartridge calls inside `press()` (a user gesture). Every call is guarded: a missing or
 * blocked AudioContext simply means silence.
 */

export type Sfx =
  | 'jump' | 'land' | 'dive' | 'duck' | 'collect' | 'heart' | 'hit' | 'over' | 'record' | 'start'
  | 'boot' | 'on' | 'off' | 'blip' | 'poke' | 'dizzy' | 'warn' | 'splash' | 'tick' | 'wake' | 'whistle' | 'drop'

// A few notes from a Hijaz-flavoured scale (D, Eb, F#, G, A, Bb, C).
const D4 = 293.66, Eb4 = 311.13, Fs4 = 369.99, G4 = 392, A4 = 440
const D5 = 587.33, Eb5 = 622.25, Fs5 = 739.99, G5 = 783.99, A5 = 880, Bb5 = 932.33, C6 = 1046.5, D6 = 1174.66

export class Sound {
  enabled: boolean
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private noise: AudioBuffer | null = null
  private failed = false

  constructor(enabled: boolean) {
    this.enabled = enabled
  }

  /** Create/resume the context. Call only from a user gesture. */
  unlock() {
    if (!this.enabled || this.failed) return
    try {
      if (!this.ctx) {
        const AC: typeof AudioContext | undefined =
          typeof window !== 'undefined' ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) : undefined
        if (!AC) { this.failed = true; return }
        const ctx = new AC()
        const master = ctx.createGain()
        master.gain.value = 0.065
        master.connect(ctx.destination)
        this.ctx = ctx
        this.master = master
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => {})
    } catch {
      this.failed = true
      this.ctx = null
      this.master = null
    }
  }

  private tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.6, slide = 0, delay = 0) {
    const ctx = this.ctx, master = this.master
    if (!ctx || !master) return
    try {
      const t0 = ctx.currentTime + delay
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(freq, t0)
      if (slide > 0) osc.frequency.exponentialRampToValueAtTime(slide, t0 + dur)
      gain.gain.setValueAtTime(0.0001, t0)
      gain.gain.linearRampToValueAtTime(vol, t0 + 0.006)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
      osc.connect(gain)
      gain.connect(master)
      osc.start(t0)
      osc.stop(t0 + dur + 0.03)
    } catch { /* ignore */ }
  }

  private hiss(dur: number, vol = 0.5, freq = 1200, delay = 0) {
    const ctx = this.ctx, master = this.master
    if (!ctx || !master) return
    try {
      if (!this.noise) {
        const len = Math.floor(ctx.sampleRate * 0.5)
        const buf = ctx.createBuffer(1, len, ctx.sampleRate)
        const data = buf.getChannelData(0)
        let s = 1234567
        for (let i = 0; i < len; i++) { s = (s * 1103515245 + 12345) >>> 0; data[i] = ((s >>> 16) / 32768) - 1 }
        this.noise = buf
      }
      const t0 = ctx.currentTime + delay
      const src = ctx.createBufferSource()
      src.buffer = this.noise
      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.value = freq
      filter.Q.value = 0.8
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(vol, t0)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
      src.connect(filter)
      filter.connect(gain)
      gain.connect(master)
      src.start(t0)
      src.stop(t0 + dur + 0.02)
    } catch { /* ignore */ }
  }

  play(name: Sfx) {
    if (!this.enabled || !this.ctx) return
    const t = this.tone.bind(this), n = this.hiss.bind(this)
    switch (name) {
      case 'jump': t(330, 0.12, 'square', 0.35, 720); break
      case 'land': n(0.12, 0.35, 700); t(120, 0.07, 'triangle', 0.5, 70); break
      case 'splash': n(0.25, 0.4, 900); break
      case 'dive': t(600, 0.12, 'square', 0.3, 160); break
      case 'duck': t(260, 0.06, 'square', 0.25, 180); break
      case 'collect': t(A5, 0.06, 'square', 0.32); t(D6, 0.11, 'square', 0.32, 0, 0.055); break
      case 'heart': t(D5, 0.07, 'triangle', 0.6); t(Fs5, 0.07, 'triangle', 0.6, 0, 0.07); t(A5, 0.14, 'triangle', 0.6, 0, 0.14); break
      case 'hit': t(220, 0.28, 'square', 0.45, 55); n(0.3, 0.6, 500); break
      case 'over': [A4, G4, Fs4, Eb4, D4].forEach((f, i) => t(f, i === 4 ? 0.5 : 0.16, 'triangle', 0.7, 0, i * 0.15)); break
      case 'record': [D5, Eb5, Fs5, G5, A5, D6].forEach((f, i) => t(f, i === 5 ? 0.45 : 0.09, 'square', 0.3, 0, i * 0.085)); t(D6 * 2, 0.4, 'triangle', 0.25, 0, 0.5); break
      case 'start': t(D5, 0.08, 'square', 0.3); t(A5, 0.08, 'square', 0.3, 0, 0.08); t(D6, 0.16, 'square', 0.3, 0, 0.16); break
      case 'boot': t(D5, 0.12, 'triangle', 0.6); t(Fs5, 0.12, 'triangle', 0.6, 0, 0.1); t(A5, 0.12, 'triangle', 0.6, 0, 0.2); t(D6, 0.45, 'triangle', 0.6, 0, 0.3); t(Eb5, 0.05, 'square', 0.15, 0, 0.05); break
      case 'on': t(G5, 0.06, 'square', 0.3); t(C6, 0.09, 'square', 0.3, 0, 0.06); break
      case 'off': break
      case 'blip': t(Bb5, 0.05, 'square', 0.22); break
      case 'tick': t(1400, 0.025, 'square', 0.12); break
      case 'poke': [C6, A5, C6, A5].forEach((f, i) => t(f, 0.05, 'triangle', 0.5, 0, i * 0.06)); break
      case 'dizzy': t(900, 0.5, 'triangle', 0.4, 300); t(700, 0.5, 'triangle', 0.25, 1100, 0.1); break
      case 'warn': t(1200, 0.06, 'square', 0.22); t(1200, 0.06, 'square', 0.22, 0, 0.12); break
      case 'drop': t(1600, 0.5, 'triangle', 0.25, 400); break
      case 'wake': t(D5, 0.06, 'triangle', 0.5, 0); t(A5, 0.1, 'triangle', 0.5, 0, 0.06); break
      case 'whistle': t(G5, 0.12, 'triangle', 0.3); t(A5, 0.12, 'triangle', 0.3, 0, 0.14); t(Fs5, 0.2, 'triangle', 0.3, 0, 0.28); break
    }
  }

  close() {
    const ctx = this.ctx
    this.ctx = null
    this.master = null
    this.noise = null
    if (ctx) try { void ctx.close().catch(() => {}) } catch { /* ignore */ }
  }
}
