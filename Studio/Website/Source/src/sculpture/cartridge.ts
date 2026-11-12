/**
 * The software that runs on the pocket console's display: a pixel framebuffer, the
 * character's face, and the game. It knows nothing about three.js. The 3D scene uploads
 * `canvas` to the display mesh, forwards button presses, and reacts to `onEvent`.
 *
 * THE EXPORTED TYPES AND `createCartridge` SIGNATURE ARE THE CONTRACT BETWEEN THE GAME
 * AND THE 3D SCENE. Change the implementation freely; do not change the contract.
 */
import { FOAM, Gfx, H, LOOK_DIM, LOOK_HOME, OFF, Presenter, SEA, SKY, W, CREAM, INK, PALE, PINK, WORDMARK, wordmarkWidth, type Look } from './cartridge/gfx'
import { MUTE, SPARK, SPEAKER, WAVES } from './cartridge/art'
import { EYE_LINE, EYE_OPEN, Face, MOUTH_SMILE, drawSmiley, pose } from './cartridge/face'
import type { Host } from './cartridge/host'
import { Sound } from './cartridge/sound'
import { Voyage } from './cartridge/voyage'

/** Framebuffer size. The physical display is 1.86 x 1.54 units, so pixels are square. */
export const SCREEN_WIDTH = 160
export const SCREEN_HEIGHT = 132

/** `select` is the small pill under the display (sound on/off). */
export type PadButton = 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'select'

/** Things the 3D object reacts to physically (LED, rumble, sparkles). */
export type CartridgeEvent =
  | 'boot' // power-on animation started
  | 'ready' // boot finished, the face is awake
  | 'start' // a game began
  | 'collect' // picked something up (small sparkle)
  | 'hit' // lost a life (rumble)
  | 'gameover'
  | 'record' // new high score (big celebration)
  | 'sleep' // dozed off after being ignored
  | 'wake'

export interface CartridgeOptions {
  arabic: boolean
  reducedMotion: boolean
  onEvent?: (event: CartridgeEvent) => void
}

export interface Cartridge {
  /** SCREEN_WIDTH x SCREEN_HEIGHT canvas, repainted by `update`. Row 0 is the top of the display. */
  readonly canvas: HTMLCanvasElement
  /** Average colour currently on screen, each channel 0..1 (sRGB). Drives the light the display casts. */
  readonly glow: { r: number; g: number; b: number }
  /** True while something on screen is moving, so the scene keeps its frame loop running. */
  readonly active: boolean
  /** True while a game is in progress (the scene then captures arrow keys and stops idle wobble). */
  readonly playing: boolean
  /** Turn the display on (plays the boot animation) or off. Starts off. */
  power(on: boolean): void
  press(button: PadButton): void
  release(button: PadButton): void
  /** Pointer position over the console, -1..1 on each axis (y down), for the face to look at. */
  look(x: number, y: number): void
  /** Physical things done to the console: spun fast, or the display glass tapped. */
  nudge(kind: 'spin' | 'poke'): void
  /** Advance by `dt` seconds and repaint. Returns true when pixels changed and the texture needs uploading. */
  update(dt: number): boolean
  dispose(): void
}

const BEST_KEY = 'sindibad-console-best'
const SOUND_KEY = 'sindibad-console-sound'
const TICK = 1 / 120
const BOOT_LEN = 1.9
const BOOT_LEN_REDUCED = 1.4
const WIPE = 0.6

function load(key: string): string | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage.getItem(key) } catch { return null }
}
function save(key: string, value: string) {
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(key, value) } catch { /* private mode etc. */ }
}

type Mode = 'off' | 'boot' | 'face' | 'game'

export function createCartridge(options: CartridgeOptions): Cartridge {
  const canvas = document.createElement('canvas')
  canvas.width = SCREEN_WIDTH
  canvas.height = SCREEN_HEIGHT
  const g = new Gfx()
  const presenter = new Presenter(canvas)
  const reduced = !!options.reducedMotion
  const sound = new Sound(load(SOUND_KEY) !== '0')
  let best = Math.max(0, parseInt(load(BEST_KEY) ?? '0', 10) || 0)
  let seed = (Date.now() ^ 0x2545f491) >>> 0
  const rand = () => {
    seed = (seed + 0x6d2b79f5) >>> 0
    let t = seed
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const host: Host = {
    g,
    reduced,
    emit(event) { try { options.onEvent?.(event) } catch { /* the scene's problem */ } },
    sfx(name) { sound.play(name) },
    rand,
    get best() { return best },
    saveBest(score) { if (score > best) { best = score; save(BEST_KEY, String(score)) } },
  }
  const face = new Face(host)
  const voyage = new Voyage(host)
  const bootPose = pose()

  let mode: Mode = 'off'
  let bootT = 0
  let bootChimed = false
  let bootLetters = 0
  let wipeT = -1
  let wipeTo: Mode = 'face'
  let soundIconT = 0
  let acc = 0
  let dirty = true
  let disposed = false

  function enter(next: Mode) {
    mode = next
    if (next === 'face') { face.enter(); voyage.releaseAll() }
    if (next === 'game') { voyage.reset(); host.emit('start') }
  }

  function wipe(to: Mode) {
    if (reduced) { enter(to); return }
    wipeT = 0
    wipeTo = to
  }

  function step(dt: number) {
    switch (mode) {
      case 'boot': {
        bootT += dt
        const len = reduced ? BOOT_LEN_REDUCED : BOOT_LEN
        const letters = Math.max(0, Math.min(8, Math.floor((bootT - 0.7) / 0.06) + 1))
        if (!reduced && letters > bootLetters) { bootLetters = letters; host.sfx('tick') }
        if (!bootChimed && bootT >= (reduced ? 0.9 : 1.2)) { bootChimed = true; host.sfx('boot') }
        if (bootT >= len) { enter('face'); host.emit('ready') }
        break
      }
      case 'face':
        face.step(dt)
        if (face.wantsStart && wipeT < 0) wipe('game')
        break
      case 'game':
        voyage.step(dt)
        if (voyage.exit && wipeT < 0) { voyage.exit = false; wipe('face') }
        break
    }
    if (wipeT >= 0) {
      const before = wipeT
      wipeT += dt
      if (before < WIPE / 2 && wipeT >= WIPE / 2) enter(wipeTo)
      if (wipeT >= WIPE) wipeT = -1
    }
    if (soundIconT > 0) soundIconT = Math.max(0, soundIconT - dt)
  }

  function drawBoot() {
    const t = bootT
    g.clear(SKY)
    if (reduced) {
      // calm fade up, no flicker
      const k = Math.min(1, t / 0.4)
      bootPose.cx = 80; bootPose.cy = 48; bootPose.d = 48; bootPose.sq = 0
      bootPose.eyeL = bootPose.eyeR = t >= 0.9 ? EYE_OPEN : EYE_LINE
      bootPose.open = 1; bootPose.ex = 0; bootPose.ey = 0; bootPose.mouth = MOUTH_SMILE; bootPose.t = t
      drawSmiley(g, bootPose)
      const ww = wordmarkWidth(2)
      let x = 80 - Math.round(ww / 2)
      for (const gl of WORDMARK) { g.glyph(gl, x, 92, INK, 2); x += (gl.w + 1) * 2 }
      g.dither(0, 0, W, H, OFF, Math.round((1 - k) * 16))
      return
    }
    // smiley grows out of a dot with a little overshoot
    const k = Math.min(1, Math.max(0, (t - 0.3) / 0.42))
    const back = k <= 0 ? 0 : 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2)
    const settle = Math.min(1, Math.max(0, (t - 1.55) / 0.35))
    const se = settle * settle * (3 - 2 * settle)
    bootPose.cx = 80
    bootPose.cy = Math.round(48 + 8 * se)
    bootPose.d = Math.max(0, Math.round(48 * back + 8 * se))
    bootPose.sq = 0; bootPose.ex = 0; bootPose.ey = 0; bootPose.mouth = MOUTH_SMILE; bootPose.t = t
    bootPose.eyeL = bootPose.eyeR = t >= 1.2 ? EYE_OPEN : EYE_LINE
    bootPose.open = t >= 1.2 && t < 1.27 ? 0.4 : 1
    if (bootPose.d >= 6) drawSmiley(g, bootPose)
    else if (t > 0.3) g.rect(79, 47, 3, 3, PINK)
    // wordmark, letter by letter, then dissolving away
    const ww = wordmarkWidth(2)
    let x = 80 - Math.round(ww / 2)
    const fade = Math.round(se * 16)
    for (let i = 0; i < WORDMARK.length; i++) {
      const gl = WORDMARK[i]
      const ti = 0.7 + i * 0.06
      if (t >= ti) {
        const drop = Math.max(0, Math.round(4 - (t - ti) * 40))
        g.glyph(gl, x, 92 - drop, INK, 2)
      }
      x += (gl.w + 1) * 2
    }
    if (fade > 0) g.dither(0, 86, W, 24, SKY, fade)
    // a few sparkles when the eyes open
    if (t >= 1.2 && t < 1.7) {
      const s = Math.floor((t - 1.2) * 10)
      g.glyph(SPARK, 44 - s, 30 - s, s & 1 ? CREAM : PINK)
      g.glyph(SPARK, 110 + s, 26 - s, s & 1 ? PINK : CREAM)
      g.glyph(SPARK, 114 + s, 62 + s, CREAM)
    }
    // backlight warming up: lit band opening from the centre with a few flickering rows
    if (t < 0.4) {
      const half = Math.round((t / 0.32) * 66)
      const frame = Math.floor(t * 40)
      for (let y = 0; y < H; y++) {
        const lit = Math.abs(y - 66) <= half && ((y * 7 + frame * 13) % 17 !== 0 || t > 0.32)
        if (!lit) g.rect(0, y, W, 1, OFF)
        else if (Math.abs(Math.abs(y - 66) - half) < 1) g.rect(0, y, W, 1, CREAM)
      }
    }
  }

  function drawWipe() {
    const p = wipeT < WIPE / 2 ? wipeT / (WIPE / 2) : 1 - (wipeT - WIPE / 2) / (WIPE / 2)
    const e = p * p * (3 - 2 * p)
    for (let x = 0; x < W; x++) {
      const edge = Math.round(H - e * (H + 14) + 3 * Math.sin(x * 0.16 + wipeT * 14))
      if (edge < H) {
        g.rect(x, edge, 1, 2, FOAM)
        g.rect(x, edge + 2, 1, H, SEA)
      }
    }
  }

  function drawSoundIcon() {
    if (!reduced && soundIconT < 1.2 && Math.floor(soundIconT * 6) % 2 === 1) return
    g.rect(70, 2, 20, 13, INK)
    g.rect(71, 3, 18, 11, PALE)
    g.glyph(SPEAKER, 74, 4, INK)
    if (sound.enabled) g.glyph(WAVES, 80, 4, INK)
    else g.glyph(MUTE, 80, 5, PINK)
  }

  function render(): boolean {
    let a: Look = LOOK_HOME, b: Look = LOOK_HOME, mix = 0
    switch (mode) {
      case 'off':
        g.clear(OFF)
        break
      case 'boot':
        drawBoot()
        break
      case 'face':
        face.draw(g)
        b = LOOK_DIM
        mix = face.dim
        break
      case 'game':
        voyage.draw(g)
        voyage.updateLook()
        a = voyage.lookA; b = voyage.lookB; mix = voyage.lookMix
        break
    }
    if (mode !== 'off') {
      if (wipeT >= 0) drawWipe()
      if (soundIconT > 0) drawSoundIcon()
    }
    return presenter.present(g.fb, a, b, mix)
  }

  const cartridge: Cartridge = {
    canvas,
    glow: presenter.glow,
    get active() {
      if (disposed) return false
      if (dirty) return true
      if (mode === 'off') return false
      if (mode === 'boot' || mode === 'game' || wipeT >= 0 || soundIconT > 0) return true
      return face.active
    },
    get playing() {
      return !disposed && mode === 'game' && voyage.playing
    },
    power(on) {
      if (disposed || on === (mode !== 'off')) return
      if (on) {
        mode = 'boot'
        bootT = 0; bootChimed = false; bootLetters = 0; wipeT = -1
        host.emit('boot')
      } else {
        mode = 'off'
        wipeT = -1
        soundIconT = 0
        voyage.releaseAll()
        voyage.reset()
      }
      dirty = true
    },
    press(button) {
      if (disposed || mode === 'off') return
      sound.unlock()
      dirty = true
      if (button === 'select') {
        sound.enabled = !sound.enabled
        save(SOUND_KEY, sound.enabled ? '1' : '0')
        if (sound.enabled) { sound.unlock(); sound.play('on') }
        soundIconT = 1.6
        return
      }
      if (mode === 'boot') {
        // impatient: skip ahead to the face
        if (bootT < (reduced ? BOOT_LEN_REDUCED : BOOT_LEN) - 0.3) bootT = (reduced ? BOOT_LEN_REDUCED : BOOT_LEN) - 0.3
        return
      }
      if (wipeT >= 0) { if (mode === 'game') voyage.press(button); return }
      if (mode === 'face') face.press(button)
      else if (mode === 'game') voyage.press(button)
    },
    release(button) {
      if (disposed) return
      voyage.release(button)
    },
    look(x, y) {
      if (disposed || mode !== 'face' || !Number.isFinite(x) || !Number.isFinite(y)) return
      face.look(x, y)
    },
    nudge(kind) {
      if (disposed || mode !== 'face' || wipeT >= 0) return
      face.nudge(kind)
      dirty = true
    },
    update(dt) {
      if (disposed) return false
      if (!(dt > 0)) dt = 0
      if (dt > 0.1) dt = 0.1
      acc += dt
      let n = 0
      while (acc >= TICK - 1e-7 && n < 16) { step(TICK); acc -= TICK; n++ }
      if (acc < 0) acc = 0
      if (n === 0 && !dirty) return false
      dirty = false
      return render()
    },
    dispose() {
      if (disposed) return
      disposed = true
      mode = 'off'
      voyage.releaseAll()
      sound.close()
    },
  }
  if (import.meta.env.DEV) Object.defineProperty(cartridge, '__debug', { value: { voyage, face } })
  return cartridge
}
