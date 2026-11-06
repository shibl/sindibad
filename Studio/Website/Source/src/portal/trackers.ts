// Where the camera is. Each tracker turns one source of movement into the same thing: a stream of views, and an aiming point on
// the floor. A SLAM engine would be one more of these.
import { FAR, NEAR } from './scene'
import { fromQuat, invert, mul, perspective, qMul, qSlerp, rotationX, rotationY, translation, type M4, type V3 } from './math'

export interface View {
  view: ArrayLike<number>
  proj: ArrayLike<number>
  x: number
  y: number
  w: number
  h: number
}
export interface FrameInfo {
  views: View[]
  framebuffer: WebGLFramebuffer | null
  /** Where the aiming ring is on the floor, as a transform in tracker space, or null while no floor has been found. */
  aim: M4 | null
  /** Where the camera is, in tracker space. */
  camera: V3
  /** The way it's looking, along the ground. */
  ahead: V3
}
export interface Tracker {
  readonly kind: 'webxr' | 'camera' | 'still'
  /** Whether a person's own footsteps carry the camera. If not, moveAlong() does. */
  readonly walks: boolean
  start(onFrame: (f: FrameInfo) => void, onTap: () => void): Promise<void>
  stop(): void
  moveAlong?(path: V3[], ms: number): void
  /** Where moveAlong() starts from. */
  base?(): V3
}

/** A spot on the floor, turned so that the portal's front faces the camera. */
const onFloor = (p: V3, camera: V3) => mul(translation(p[0], p[1], p[2]), rotationY(Math.atan2(camera[0] - p[0], camera[2] - p[2])))

const alongGround = (d: number[]): V3 => {
  const l = Math.hypot(d[0], d[2]) || 1
  return [d[0] / l, 0, d[2] / l]
}

/** Glides the camera along a path for the trackers that can't walk. */
class Glide {
  offset: V3 = [0, 0, 0]
  private path: V3[] | null = null
  private from = 0
  private ms = 1
  moveAlong(path: V3[], ms: number) {
    this.path = path
    this.from = performance.now()
    this.ms = ms
  }
  step() {
    if (!this.path) return
    const k = Math.min(1, (performance.now() - this.from) / this.ms)
    const e = k * k * k * (k * (k * 6 - 15) + 10)
    const n = this.path.length - 1, x = e * n, i = Math.min(n - 1, Math.floor(x)), u = x - i
    const a = this.path[i], b = this.path[i + 1]
    this.offset = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]
    if (k >= 1) this.path = null
  }
}

// ------------------------------------------------------------------------------------------------------- real AR, on Android
/** WebXR's immersive-ar, which knows the phone's true position and where the real floor is, so people can walk through. */
export class WebXRTracker implements Tracker {
  readonly kind = 'webxr'
  readonly walks = true
  private session: XRSession | null = null
  constructor(private gl: WebGL2RenderingContext, private overlay: HTMLElement, private onEnd: () => void) {}

  static async available() {
    try {
      return !!navigator.xr && (await navigator.xr.isSessionSupported('immersive-ar'))
    } catch {
      return false
    }
  }

  async start(onFrame: (f: FrameInfo) => void, onTap: () => void) {
    const session = await navigator.xr!.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay'],
      domOverlay: { root: this.overlay },
    } as XRSessionInit)
    this.session = session
    const gl = this.gl
    await gl.makeXRCompatible()
    const layer = new XRWebGLLayer(session, gl, { alpha: true, antialias: true, depth: true, stencil: true })
    session.updateRenderState({ baseLayer: layer, depthNear: NEAR, depthFar: FAR })
    const space = await session.requestReferenceSpace('local')
    const viewer = await session.requestReferenceSpace('viewer')
    const hits = await session.requestHitTestSource!({ space: viewer })
    session.addEventListener('select', onTap)
    session.addEventListener('end', () => {
      this.session = null
      this.onEnd()
    })
    // Taps on the overlay's own buttons shouldn't also count as taps on the world.
    this.overlay.addEventListener('beforexrselect', e => {
      if ((e.target as Element).closest('button, a')) e.preventDefault()
    })
    const loop = (_: number, frame: XRFrame) => {
      session.requestAnimationFrame(loop)
      const pose = frame.getViewerPose(space)
      if (!pose) return
      const p = pose.transform.position
      const camera: V3 = [p.x, p.y, p.z]
      // The first surface that faces up and lies well below the phone is the floor, not a wall or the table next to it.
      let aim: M4 | null = null
      for (const r of frame.getHitTestResults(hits)) {
        const t = r.getPose(space)?.transform
        if (!t || t.matrix[5] < 0.85 || t.position.y > camera[1] - 0.5) continue
        aim = onFloor([t.position.x, t.position.y, t.position.z], camera)
        break
      }
      const look = pose.transform.inverse.matrix
      onFrame({
        views: pose.views.map(v => {
          const vp = layer.getViewport(v)!
          return { view: v.transform.inverse.matrix, proj: v.projectionMatrix, x: vp.x, y: vp.y, w: vp.width, h: vp.height }
        }),
        framebuffer: layer.framebuffer,
        aim,
        camera,
        ahead: alongGround([-look[2], -look[6], -look[10]]),
      })
    }
    session.requestAnimationFrame(loop)
  }
  stop() {
    void this.session?.end().catch(() => {})
    this.session = null
  }
}

// -------------------------------------------------------------------------------------- the live camera and gyro, for iPhones
const FLOOR = -1.4 // How far below the phone the floor is assumed to be.
const ELBOW = 0.22 // A phone turns about the person holding it, so it moves a little as it turns, which gives true parallax.
const LENS = (65 * Math.PI) / 180 // The usual rear camera's view across its long side.

/** Asks for the motion sensors. It has to be called during the tap itself. */
export function askForMotion(): Promise<boolean> {
  const ask = (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission
  if (!ask) return Promise.resolve(true)
  return ask.call(DeviceOrientationEvent).then(r => r === 'granted', () => false)
}

/** The rear camera behind a transparent canvas, and the gyroscope: the portal stays put as the phone turns. */
export class CameraTracker implements Tracker {
  readonly kind = 'camera'
  readonly walks = false
  private stream: MediaStream | null = null
  private raf = 0
  private q = [0, 0, 0, 1]
  private target: number[] | null = null
  private glide = new Glide()
  private yaw = 0
  private pitch = 0
  private off: (() => void)[] = []
  constructor(private gl: WebGL2RenderingContext, private video: HTMLVideoElement, private surface: HTMLElement) {}

  /** Whether the motion sensors are reporting. If not, a finger does the looking. */
  get sensing() {
    return !!this.target
  }

  /** Throws if there's no camera, or it's refused. */
  async open() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
    })
    // Safari only plays a camera inside the page if these are set before it starts.
    this.video.setAttribute('playsinline', '')
    this.video.setAttribute('muted', '')
    this.video.muted = true
    this.video.srcObject = this.stream
    await this.video.play().catch(() => {})
    this.video.hidden = false
  }

  moveAlong(path: V3[], ms: number) {
    this.glide.moveAlong(path, ms)
  }
  base() {
    return this.glide.offset
  }

  private fov(w: number, h: number) {
    const vw = this.video.videoWidth || 1280, vh = this.video.videoHeight || 720
    // The video is scaled to cover the screen, so what the screen shows is the part of the lens that's left after cropping.
    const scale = Math.max(w / vw, h / vh)
    const focal = Math.max(vw, vh) / 2 / Math.tan(LENS / 2)
    return 2 * Math.atan(h / scale / 2 / focal)
  }

  async start(onFrame: (f: FrameInfo) => void, onTap: () => void) {
    const gl = this.gl
    const listen = <K extends string>(t: EventTarget, name: K, fn: (e: Event) => void, opts?: AddEventListenerOptions) => {
      t.addEventListener(name, fn, opts)
      this.off.push(() => t.removeEventListener(name, fn))
    }
    const S = Math.SQRT1_2
    listen(window, 'deviceorientation', e => {
      const o = e as DeviceOrientationEvent
      if (o.alpha == null || o.beta == null || o.gamma == null) return
      const R = Math.PI / 180
      const x = o.beta * R, y = o.alpha * R, z = -o.gamma * R
      const c1 = Math.cos(x / 2), c2 = Math.cos(y / 2), c3 = Math.cos(z / 2), s1 = Math.sin(x / 2), s2 = Math.sin(y / 2), s3 = Math.sin(z / 2)
      const q = [
        s1 * c2 * c3 + c1 * s2 * s3,
        c1 * s2 * c3 - s1 * c2 * s3,
        c1 * c2 * s3 - s1 * s2 * c3,
        c1 * c2 * c3 + s1 * s2 * s3,
      ]
      // The camera looks out of the back of the phone, and the screen may be turned on its side.
      const angle = screen.orientation?.angle ?? (window as unknown as { orientation?: number }).orientation ?? 0
      const turned = -((angle * Math.PI) / 180) / 2
      this.target = qMul(qMul(q, [-S, 0, 0, S]), [0, 0, Math.sin(turned), Math.cos(turned)])
    })
    // With no motion sensors, a finger can still look around.
    let last: [number, number] | null = null, travelled = 0
    listen(this.surface, 'pointerdown', e => {
      const p = e as PointerEvent
      last = [p.clientX, p.clientY]
      travelled = 0
    })
    listen(window, 'pointermove', e => {
      const p = e as PointerEvent
      if (!last) return
      const dx = p.clientX - last[0], dy = p.clientY - last[1]
      travelled += Math.abs(dx) + Math.abs(dy)
      last = [p.clientX, p.clientY]
      if (!this.target) {
        this.yaw += dx * 0.005
        this.pitch = Math.max(-1.3, Math.min(1.3, this.pitch + dy * 0.005))
      }
    })
    listen(window, 'pointerup', e => {
      const here = (e.target as Element)?.closest?.('button, a')
      if (last && travelled < 14 && !here) onTap()
      last = null
    })
    const loop = () => {
      this.raf = requestAnimationFrame(loop)
      if (this.target) this.q = qSlerp(this.q, this.target, 0.42)
      this.glide.step()
      const R = this.target ? fromQuat(this.q) : mul(rotationY(this.yaw), rotationX(this.pitch))
      const fwd: V3 = [-R[8], -R[9], -R[10]]
      const o = this.glide.offset
      const camera: V3 = [o[0] + fwd[0] * ELBOW, o[1] + fwd[1] * ELBOW, o[2] + fwd[2] * ELBOW]
      const C = mul(translation(camera[0], camera[1], camera[2]), R)
      const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight
      // Aim at the assumed floor. Looking too high still gives a spot straight ahead at a sensible distance.
      const flat = Math.hypot(fwd[0], fwd[2]) || 1
      let dist = 3.2
      if (fwd[1] < -0.05) dist = Math.max(1.7, Math.min(4.2, ((FLOOR - camera[1]) / fwd[1]) * flat))
      const aimAt: V3 = [camera[0] + (fwd[0] / flat) * dist, FLOOR, camera[2] + (fwd[2] / flat) * dist]
      onFrame({
        views: [{ view: invert(C), proj: perspective(this.fov(w, h), w / h, NEAR, FAR), x: 0, y: 0, w, h }],
        framebuffer: null,
        aim: onFloor(aimAt, camera),
        camera,
        ahead: alongGround(fwd),
      })
    }
    this.raf = requestAnimationFrame(loop)
  }
  stop() {
    cancelAnimationFrame(this.raf)
    for (const f of this.off) f()
    this.off = []
    for (const t of this.stream?.getTracks() ?? []) t.stop()
    this.stream = null
    this.video.srcObject = null
    this.video.hidden = true
  }
}

// ------------------------------------------------------------------------------------------------------ no camera at all
const HEIGHT = 1.45

/** The portal on the page, for computers and when the camera's refused: drag to look, and arrow keys to walk. */
export class StillTracker implements Tracker {
  readonly kind = 'still'
  readonly walks = false
  private raf = 0
  private glide = new Glide()
  private off: (() => void)[] = []
  private yaw = 0
  private pitch = -0.1
  private keys = new Set<string>()
  private touched = false
  private last = 0
  constructor(private gl: WebGL2RenderingContext, private surface: HTMLElement, private look: V3 | null, start: V3 = [0.5, HEIGHT, 3.1]) {
    this.glide.offset = start
  }
  moveAlong(path: V3[], ms: number) {
    this.glide.moveAlong(path, ms)
  }
  base() {
    return this.glide.offset
  }
  async start(onFrame: (f: FrameInfo) => void) {
    const gl = this.gl
    const listen = (t: EventTarget, name: string, fn: (e: Event) => void) => {
      t.addEventListener(name, fn)
      this.off.push(() => t.removeEventListener(name, fn))
    }
    let drag: [number, number] | null = null
    listen(this.surface, 'pointerdown', e => {
      const p = e as PointerEvent
      if ((p.target as Element).closest('button, a')) return
      drag = [p.clientX, p.clientY]
    })
    listen(window, 'pointermove', e => {
      const p = e as PointerEvent
      if (!drag) return
      this.touched = true
      this.yaw += (p.clientX - drag[0]) * 0.004
      this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch + (p.clientY - drag[1]) * 0.004))
      drag = [p.clientX, p.clientY]
    })
    listen(window, 'pointerup', () => (drag = null))
    listen(window, 'keydown', e => this.keys.add((e as KeyboardEvent).key))
    listen(window, 'keyup', e => this.keys.delete((e as KeyboardEvent).key))
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop)
      const dt = Math.min(0.05, (now - this.last) / 1000 || 0)
      this.last = now
      this.glide.step()
      const k = this.keys
      const go = (k.has('ArrowUp') || k.has('w') ? 1 : 0) - (k.has('ArrowDown') || k.has('s') ? 1 : 0)
      const side = (k.has('ArrowRight') || k.has('d') ? 1 : 0) - (k.has('ArrowLeft') || k.has('a') ? 1 : 0)
      if (go || side) {
        this.touched = true
        const c = Math.cos(this.yaw), s = Math.sin(this.yaw), v = dt * 1.5
        this.glide.offset = [
          this.glide.offset[0] + (s * go + c * side) * v,
          this.glide.offset[1],
          this.glide.offset[2] + (-c * go + s * side) * v,
        ]
      }
      const o = this.glide.offset
      let camera: V3 = o
      let yaw = this.yaw, pitch = this.pitch
      if (this.look && !this.touched) {
        // On the opening screen the camera drifts slowly from side to side, keeping its eye on the portal.
        camera = [o[0] + Math.sin(now * 0.00031) * 0.7, o[1], o[2]]
        yaw = Math.atan2(this.look[0] - camera[0], camera[2] - this.look[2]) * -1
        pitch = Math.atan2(this.look[1] - camera[1], Math.hypot(this.look[0] - camera[0], this.look[2] - camera[2]))
        this.yaw = yaw
        this.pitch = pitch
      }
      const R = mul(rotationY(yaw), rotationX(pitch))
      const C = mul(translation(camera[0], camera[1], camera[2]), R)
      const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight
      onFrame({
        views: [{ view: invert(C), proj: perspective(w > h ? 0.82 : 1.12, w / h, NEAR, FAR), x: 0, y: 0, w, h }],
        framebuffer: null,
        aim: null,
        camera,
        ahead: alongGround([-R[8], -R[9], -R[10]]),
      })
    }
    this.raf = requestAnimationFrame(loop)
  }
  stop() {
    cancelAnimationFrame(this.raf)
    for (const f of this.off) f()
    this.off = []
  }
}
