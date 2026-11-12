import {
  Box3, CanvasTexture, Color, DirectionalLight, HemisphereLight, DoubleSide, Group, LinearSRGBColorSpace,
  Matrix4, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, NearestFilter,
  NeutralToneMapping, PerspectiveCamera, PlaneGeometry, PMREMGenerator, PointLight, Ray,
  Raycaster, Scene, ShaderMaterial, SphereGeometry, BackSide, SRGBColorSpace, Vector2, Vector3, WebGLRenderer,
  type Material, type Object3D, type Texture, type WebGLRenderTarget,
} from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { createCartridge, SCREEN_HEIGHT, SCREEN_WIDTH, type Cartridge, type CartridgeEvent, type PadButton } from './cartridge'
import { createDotMaterial, createHaloMaterial, createScreenMaterial, createShadowMaterial } from './lcd'
import { Sparks, SPARK_CREAM, SPARK_ICE, SPARK_PINK, SPARK_ROSE } from './sparks'

export interface SculptureOptions { arabic: boolean }

type Zone = 'dpad' | 'a' | 'b' | 'select' | 'screen' | 'power' | 'body'
type Grip =
  | { kind: 'dpad'; dir: PadButton | null }
  | { kind: 'button'; button: PadButton }
  | { kind: 'tap' }
  | { kind: 'drag'; x: number; y: number; t: number }

// Resting three-quarter pose (the Blender poster's view) and the squarer playing pose.
const REST_YAW = -.32, REST_PITCH = .2
const PLAY_YAW = -.035, PLAY_PITCH = .045
const FOV = 18
const TAU = Math.PI * 2
// Model facts (GLB space: Y-up, front +Z).
const FRONT_Z = .3
const DPAD = { x: -.55, y: -.83 }
const BUTTON_A = { x: .65, y: -.7 }
const BUTTON_B = { x: .89, y: -1.08 }
const MENU = { x: 0, y: -1.22 }
const SCREEN = { x0: -.93, x1: .93, y0: -.07, y1: 1.47 }
const POWER_BOX = new Box3(new Vector3(1.12, .58, -.14), new Vector3(1.36, 1.02, .22))
const KEYS: Record<string, PadButton> = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  KeyZ: 'a', Space: 'a', Enter: 'a', NumpadEnter: 'a', KeyX: 'b', KeyM: 'select',
}
const raw = (value: number) => new Color().setHex(value, LinearSRGBColorSpace) // sRGB triple, written unconverted by custom shaders
const LED_PINK = raw(0xff3b7d), LED_CREAM = raw(0xfff0dc), LED_RED = raw(0xff1f3d), LED_ICE = raw(0xbadfe6)
const LED_PARTY = [LED_PINK, LED_ICE, LED_CREAM]
const NO_GLOW = { r: 0, g: 0, b: 0 }
const LABEL_POSTER = { en: 'Sindibad pocket console', ar: 'جهاز سندباد المحمول' }

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3
const easeOutBack = (t: number) => { const c = 1.45; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2 }
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** A playable pocket console: the Blender model, a live pixel display, real buttons, and a body you can spin. */
export async function mountSculpture(host: HTMLElement, signal: AbortSignal, options: SculptureOptions = { arabic: false }): Promise<void> {
  const canvas = host.querySelector<HTMLCanvasElement>('canvas')
  if (!canvas || signal.aborted) return
  const controller = new AbortController()
  const localSignal = controller.signal
  const listen = { signal: localSignal }
  let renderer: WebGLRenderer | undefined
  let environment: WebGLRenderTarget | undefined
  let model: Object3D | undefined
  let cartridge: Cartridge | undefined
  let screenTexture: CanvasTexture | undefined
  let observer: IntersectionObserver | undefined
  let resizeObserver: ResizeObserver | undefined
  let animation = 0, disposed = false, visible = false, loaded = false, previous = 0
  const materials = new Set<Material>()
  const textures = new Set<Texture>()
  const geometries = new Set<{ dispose(): void }>()
  const media = matchMedia('(prefers-reduced-motion: reduce)')
  let reduced = media.matches

  const scene = new Scene()
  const rig = new Group() // entrance, float, play zoom and every rotation
  const pivot = new Group() // re-centres the model on its bounds
  rig.rotation.order = 'XYZ' // yaw about the console's own axis, pitch toward the viewer
  rig.add(pivot)
  scene.add(rig)
  const camera = new PerspectiveCamera(FOV, 1, .1, 100)
  const sparks = new Sparks(160)
  scene.add(sparks.points)

  function releaseObject(object: Object3D) {
    object.traverse(child => {
      if (!(child instanceof Mesh)) return
      child.geometry.dispose()
      for (const mat of Array.isArray(child.material) ? child.material : [child.material]) materials.add(mat)
    })
  }
  function collectTextures(material: Material) {
    for (const value of Object.values(material)) if (value && typeof value === 'object' && 'isTexture' in value) textures.add(value as Texture)
  }
  function dispose() {
    if (disposed) return
    disposed = true
    cancelAnimationFrame(animation)
    animation = 0
    observer?.disconnect()
    resizeObserver?.disconnect()
    controller.abort()
    try { cartridge?.dispose() } catch { /* the cartridge is already gone */ }
    cartridge = undefined
    if (model) releaseObject(model)
    for (const geometry of geometries) geometry.dispose()
    sparks.dispose()
    for (const mat of materials) { collectTextures(mat); mat.dispose() }
    for (const texture of textures) texture.dispose()
    screenTexture?.dispose()
    environment?.dispose()
    renderer?.dispose()
    try { if (renderer && !renderer.getContext().isContextLost()) renderer.forceContextLoss() } catch { /* already lost */ }
    delete host.dataset.ready
    delete host.dataset.awake
    delete host.dataset.playing
    host.style.cursor = ''
    host.setAttribute('aria-disabled', 'true')
    signal.removeEventListener('abort', dispose)
  }
  signal.addEventListener('abort', dispose, { once: true })
  function fallback(error?: unknown) {
    if (disposed) return
    host.dataset.render = 'poster'
    host.removeAttribute('tabindex')
    host.removeAttribute('aria-roledescription')
    host.setAttribute('role', 'img')
    host.setAttribute('aria-label', options.arabic ? LABEL_POSTER.ar : LABEL_POSTER.en)
    if (error && !(error instanceof DOMException && error.name === 'AbortError')) console.warn('Sculpture kept its Blender poster:', error)
    dispose()
  }

  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' })
    renderer.outputColorSpace = SRGBColorSpace
    renderer.toneMapping = NeutralToneMapping
    renderer.toneMappingExposure = 1
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, matchMedia('(pointer: coarse)').matches ? 1.5 : 1.75))
    renderer.debug.onShaderError = (_gl, _program, vertexShader, fragmentShader) => {
      console.error('Sculpture shader compilation failed', vertexShader, fragmentShader)
      fallback()
    }

    // A dark studio with broad softboxes, baked once into the environment: chrome and
    // glass get long, crisp highlights against deep shadow instead of a flat grey room.
    const pmrem = new PMREMGenerator(renderer)
    const studio = new Scene()
    const domeGeometry = new SphereGeometry(20, 32, 16)
    const domeMaterial = new ShaderMaterial({
      side: BackSide, depthWrite: false,
      vertexShader: 'varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `varying vec3 vDir; void main() {
        float y = vDir.y;
        vec3 top = vec3(.16, .25, .25), horizon = vec3(.05, .12, .115), floor = vec3(.004, .03, .028);
        vec3 c = y > 0.0 ? mix(horizon, top, pow(y, .7)) : mix(horizon, floor, pow(-y, .5));
        gl_FragColor = vec4(c, 1.0);
      }`,
    })
    studio.add(new Mesh(domeGeometry, domeMaterial))
    const cardGeometry = new PlaneGeometry(1, 1)
    const studioMaterials: Material[] = [domeMaterial]
    function card(color: string, intensity: number, position: [number, number, number], scale: [number, number]) {
      const material = new MeshBasicMaterial({ color: new Color(color).multiplyScalar(intensity), side: DoubleSide })
      const mesh = new Mesh(cardGeometry, material)
      mesh.position.set(...position)
      mesh.scale.set(scale[0], scale[1], 1)
      mesh.lookAt(0, 0, 0)
      studio.add(mesh)
      studioMaterials.push(material)
    }
    card('#f2fbfd', 9, [-6, 6, 7], [4, 7]) // key softbox, upper left front
    card('#badfe6', 5, [8, 1, 3], [1.4, 10]) // strip on the right
    card('#fff0dc', 4, [0, 9, -2], [9, 2.2]) // warm overhead
    card('#fa2a6f', 3, [-6, 0, -6], [3, 8]) // pink kickers behind
    card('#fa2a6f', 2, [6, -3, -5], [3, 5])
    card('#d9eef2', 1.1, [0, -4, 9], [12, 3]) // low front bounce
    environment = pmrem.fromScene(studio, .02)
    scene.environment = environment.texture
    for (const material of studioMaterials) material.dispose()
    domeGeometry.dispose()
    cardGeometry.dispose()
    pmrem.dispose()

    const key = new DirectionalLight('#eaf8fb', 1.7)
    key.position.set(-4, 6, 6)
    const fill = new DirectionalLight('#badfe6', .35)
    fill.position.set(5, -2, 4)
    const rim = new DirectionalLight('#ff6f9c', 1.1)
    rim.position.set(4, 2, -5)
    const ambient = new HemisphereLight('#fff1e8', '#0b3a36', .85)
    scene.add(key, fill, rim, ambient)

    const response = await fetch(`${import.meta.env.BASE_URL}console/console.glb`, { signal: localSignal })
    if (!response.ok) throw new Error(`Sculpture model returned ${response.status}`)
    const buffer = await response.arrayBuffer()
    if (disposed) return
    const result = await new GLTFLoader().parseAsync(buffer, `${import.meta.env.BASE_URL}console/`)
    if (disposed) {
      releaseObject(result.scene)
      for (const material of materials) { collectTextures(material); material.dispose() }
      return
    }
    model = result.scene

    // ---- Cartridge and its display texture -------------------------------------------------
    cartridge = createCartridge({ arabic: options.arabic, reducedMotion: reduced, onEvent: event => react(event) })
    screenTexture = new CanvasTexture(cartridge.canvas)
    screenTexture.colorSpace = SRGBColorSpace
    screenTexture.magFilter = NearestFilter
    screenTexture.minFilter = NearestFilter
    screenTexture.generateMipmaps = false
    screenTexture.flipY = false // glTF UVs put v = 0 at the top: canvas row 0 lands at the top of the display
    cartridge.update(0)
    screenTexture.needsUpdate = true
    const screen = createScreenMaterial(screenTexture, SCREEN_WIDTH, SCREEN_HEIGHT)
    materials.add(screen.material)

    // ---- Materials: closer to the Blender beauty render -------------------------------------
    const replaced = new Map<string, Material>()
    function restyle(source: Material): Material {
      const cached = replaced.get(source.uuid)
      if (cached) return cached
      let material: Material
      const name = source.name
      if (/ShellPink/i.test(name)) {
        // Translucent raspberry acrylic: a convincing fake of transmission. Thin faces
        // let the pearl core and the dark footer through; grazing edges thicken and catch light.
        const shell = new MeshPhysicalMaterial({
          name, color: '#e8124f', roughness: .16, metalness: 0, transparent: true, opacity: .64,
          clearcoat: 1, clearcoatRoughness: .05, sheen: .25, sheenColor: new Color('#ffc2d4'), sheenRoughness: .35,
          emissive: '#9c0838', emissiveIntensity: .4, envMapIntensity: 1.1, side: DoubleSide, depthWrite: false,
        })
        shell.onBeforeCompile = shader => {
          shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', /* glsl */ `
  float shellFacing = abs( dot( normalize( normal ), normalize( vViewPosition ) ) );
  float shellEdge = pow( 1.0 - shellFacing, 1.6 );
  diffuseColor.a = mix( diffuseColor.a, 0.97, shellEdge );
  outgoingLight += vec3( 0.55, 0.06, 0.2 ) * shellEdge * 0.35;
#include <opaque_fragment>`)
        }
        shell.customProgramCacheKey = () => 'sindibad-shell'
        material = shell
      } else if (/^Core$/i.test(name)) {
        material = new MeshPhysicalMaterial({
          name, color: '#f6ebe3', roughness: .4, metalness: 0, sheen: 1, sheenColor: new Color('#ffd6e3'), sheenRoughness: .45,
          clearcoat: .45, clearcoatRoughness: .2, envMapIntensity: .9,
        })
      } else if (/Chrome/i.test(name)) {
        material = new MeshStandardMaterial({ name, color: '#f4f6f7', metalness: 1, roughness: .09, envMapIntensity: 1.25 })
      } else if (/ButtonPearl/i.test(name)) {
        material = new MeshPhysicalMaterial({ name, color: '#dcedf1', roughness: .22, metalness: 0, clearcoat: 1, clearcoatRoughness: .08, sheen: .5, sheenColor: new Color('#ffffff'), envMapIntensity: 1 })
      } else if (/ButtonPink/i.test(name)) {
        material = new MeshPhysicalMaterial({ name, color: '#ff4f86', roughness: .22, metalness: 0, clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: 1 })
      } else if (/^PCB$/i.test(name)) {
        material = new MeshStandardMaterial({ name, color: '#0c6a62', roughness: .42, metalness: .15, envMapIntensity: .9 })
      } else if (/Gold/i.test(name)) {
        material = new MeshStandardMaterial({ name, color: '#e6b763', roughness: .22, metalness: 1, envMapIntensity: 1.2 })
      } else if (/Screen/i.test(name)) {
        material = screen.material
      } else {
        const clone = source.clone()
        if (clone instanceof MeshStandardMaterial) clone.envMapIntensity = .8
        material = clone
      }
      materials.add(source)
      materials.add(material)
      replaced.set(source.uuid, material)
      return material
    }

    const ledMaterial = new MeshStandardMaterial({ name: 'StatusLED', color: '#33403f', roughness: .3, emissive: '#000000' })
    ledMaterial.toneMapped = false
    materials.add(ledMaterial)
    const nodes: Record<string, Mesh | undefined> = {}
    let meshCount = 0
    model.traverse(child => {
      if (!(child instanceof Mesh)) return
      meshCount++
      child.frustumCulled = false
      const name = child.name
      const original = Array.isArray(child.material) ? child.material : [child.material]
      if (/Status[\s_.-]*LED/i.test(name)) { for (const m of original) materials.add(m); child.material = ledMaterial; nodes.led = child; return }
      const next = original.map(restyle)
      child.material = next.length === 1 ? next[0] : next
      if (/^FaceEye|^FaceMouth/i.test(name)) child.visible = false // the face is drawn in pixels now
      if (/^DisplayScreen/i.test(name)) { child.material = screen.material; nodes.screen = child }
      if (/^DPad$/i.test(name)) nodes.dpad = child
      if (/^ActionA$/i.test(name)) nodes.a = child
      if (/^ActionB$/i.test(name)) nodes.b = child
      if (/^Menu[\s_.-]*pill/i.test(name)) nodes.select = child
      if (/^Side[\s_.-]*power/i.test(name)) nodes.power = child
    })
    if (!meshCount) throw new Error('The sculpture contains no renderable meshes')
    if (!nodes.screen) throw new Error('The sculpture has no display mesh')
    const rest = new Map<Object3D, { z: number; x: number; rx: number; ry: number }>()
    for (const node of [nodes.dpad, nodes.a, nodes.b, nodes.select, nodes.power]) if (node) rest.set(node, { z: node.position.z, x: node.position.x, rx: node.rotation.x, ry: node.rotation.y })

    model.updateMatrixWorld(true)
    const bounds = new Box3().setFromObject(model)
    const center = bounds.getCenter(new Vector3())
    if (!Number.isFinite(center.x) || bounds.isEmpty()) throw new Error('Sculpture bounds are invalid')
    const grabBounds = bounds.clone().expandByScalar(.12)
    pivot.position.copy(center).negate()
    pivot.add(model)

    // ---- Light from the display, the halo, the LED bloom and the contact shadow ---------------
    const screenLight = new PointLight('#badfe6', 0, 4.5, 2)
    screenLight.position.set(0, .7, 1.05)
    model.add(screenLight)
    const haloGeometry = new PlaneGeometry(3.1, 2.75)
    geometries.add(haloGeometry)
    const haloMaterial = createHaloMaterial([0, 0], [.93, .77]) // halo-local: centred on the display
    materials.add(haloMaterial)
    const halo = new Mesh(haloGeometry, haloMaterial)
    halo.position.set(0, .7, .362)
    halo.renderOrder = 2
    halo.frustumCulled = false
    model.add(halo)
    const dotGeometry = new PlaneGeometry(.22, .22)
    geometries.add(dotGeometry)
    const ledGlowMaterial = createDotMaterial(.11)
    materials.add(ledGlowMaterial)
    const ledGlow = new Mesh(dotGeometry, ledGlowMaterial)
    ledGlow.position.set(.795, -.315, .285)
    ledGlow.renderOrder = 2
    ledGlow.frustumCulled = false
    model.add(ledGlow)
    const shadowGeometry = new PlaneGeometry(3.6, .8)
    geometries.add(shadowGeometry)
    const shadowMaterial = createShadowMaterial()
    materials.add(shadowMaterial)
    const shadow = new Mesh(shadowGeometry, shadowMaterial)
    shadow.renderOrder = -1
    shadow.frustumCulled = false
    scene.add(shadow)

    // ---- State ------------------------------------------------------------------------------
    const raycaster = new Raycaster()
    const ndc = new Vector2(), localRay = new Ray(), inverse = new Matrix4(), hitPoint = new Vector3(), boxHit = new Vector3()
    const normal = new Vector3(), emitOrigin = new Vector3(), glowColor = new Color(), ledColor = new Color()
    const holds: Record<PadButton, number> = { up: 0, down: 0, left: 0, right: 0, a: 0, b: 0, select: 0 }
    const grips = new Map<number, Grip>()
    const keyHolds = new Map<string, PadButton>()
    const depress = { a: 0, b: 0, select: 0, power: 0, rockX: 0, rockY: 0 }
    let powered = false, screenPower = 0
    let clock = 0, floatRate = 1
    let entered = false, entranceAge = -1, powerAt = -1
    let yaw = 0, yawVel = 0, pitch = 0, pitchVel = 0, dragging = false, coasting = false, yawTarget = 0
    const tilt = new Vector2(), tiltTarget = new Vector2()
    let lookX = 0, lookY = 0
    let playT = 0, hop = 0, hopVel = 0, shake = 0, droop = 0, sleeping = false
    let ledFlash = 0, ledFlashKind: 'cream' | 'red' | 'ice' | 'party' = 'cream', ledBlink = 0, ledAge = 0
    let viewH = 4.8, playScale = 1.2, aspect = 1, canvasH = 1, canvasW = 1
    let cursor = ''

    function setCursor(next: string) { if (next !== cursor) { cursor = next; host.style.cursor = next } }
    function hold(button: PadButton) {
      if (holds[button]++ === 0) { cartridge?.press(button); if (!powered && button !== 'select') setPower(true) }
      schedule()
    }
    function unhold(button: PadButton) {
      if (holds[button] <= 0) return
      if (--holds[button] === 0) cartridge?.release(button)
      schedule()
    }
    function releaseKeys() { for (const button of keyHolds.values()) unhold(button); keyHolds.clear() }
    function setPower(on: boolean) {
      if (powered === on || !cartridge) return
      powered = on
      cartridge.power(on)
      if (!on) { sleeping = false; ledFlash = 0 }
      schedule()
    }

    function react(event: CartridgeEvent) {
      if (disposed) return
      const calm = reduced
      switch (event) {
        case 'boot': ledFlash = 1; ledFlashKind = 'ice'; break
        case 'ready': ledFlash = .8; ledFlashKind = 'cream'; break
        case 'start': ledFlash = .9; ledFlashKind = 'ice'; if (!calm) hopVel += .9; break
        case 'collect':
          ledFlash = 1; ledFlashKind = 'cream'
          if (!calm) burst(10, [SPARK_PINK, SPARK_CREAM, SPARK_ROSE], 1.7, .2, .8)
          break
        case 'hit': ledFlash = 1; ledFlashKind = 'red'; ledBlink = .5; if (!calm) shake = 1; break
        case 'gameover': ledBlink = 1.2; ledFlashKind = 'red'; ledFlash = .7; break
        case 'record':
          ledFlash = 1; ledFlashKind = 'party'; ledBlink = 1.6
          if (!calm) {
            burst(72, [SPARK_PINK, SPARK_ICE, SPARK_CREAM, SPARK_PINK], 3, .26, 1.6)
            hopVel += 2.2
            if (!dragging) { yawVel += 15; coasting = true }
          }
          break
        case 'sleep': sleeping = true; break
        case 'wake': sleeping = false; ledFlash = .8; ledFlashKind = 'cream'; if (!calm) hopVel += 1.1; break
      }
      schedule()
    }

    /** Sparkles pop out of the display glass toward the viewer. */
    function burst(count: number, palette: [number, number, number][], speed: number, size: number, lifetime: number) {
      if (!nodes.screen) return
      normal.set(0, 0, 1).transformDirection(model!.matrixWorld)
      for (let i = 0; i < count; i++) {
        emitOrigin.set(SCREEN.x0 + .15 + Math.random() * (SCREEN.x1 - SCREEN.x0 - .3), .1 + Math.random() * 1.25, .4)
        model!.localToWorld(emitOrigin)
        // Out of the glass, then fanning across the view so the pop reads in projection.
        const s = speed * (.55 + Math.random() * .7)
        const angle = Math.random() * TAU
        const spread = .6 + Math.random() * .8
        sparks.emit(emitOrigin,
          normal.x * s * .5 + Math.cos(angle) * spread * s,
          normal.y * s * .5 + Math.sin(angle) * spread * s * .8 + s * .7,
          normal.z * s * .5 + .4,
          palette[i % palette.length], size * (.6 + Math.random() * .8), lifetime * (.7 + Math.random() * .6))
      }
    }

    // ---- Framing ----------------------------------------------------------------------------
    function resize() {
      if (disposed || !renderer) return
      const hostRect = host.getBoundingClientRect()
      const canvasRect = canvas!.getBoundingClientRect()
      const width = Math.max(1, hostRect.width), height = Math.max(1, hostRect.height)
      canvasW = Math.max(1, canvasRect.width); canvasH = Math.max(1, canvasRect.height)
      aspect = width / height
      renderer.setSize(canvasW, canvasH, false)
      // The host box is the "full view"; the larger canvas is an offset window onto it.
      viewH = Math.max(4.85, 3.25 / aspect)
      camera.fov = FOV
      camera.aspect = aspect
      camera.position.set(0, 0, viewH / 2 / Math.tan(FOV * Math.PI / 360))
      camera.near = camera.position.z - 6
      camera.far = camera.position.z + 6
      camera.setViewOffset(width, height, canvasRect.left - hostRect.left, canvasRect.top - hostRect.top, canvasW, canvasH)
      camera.updateProjectionMatrix()
      // Playing: the front (from the speaker up) fills the host box.
      playScale = Math.min(.97 * viewH / 3.37, .95 * viewH * aspect / 2.5)
      const pr = renderer.getPixelRatio()
      sparks.material.uniforms.uScale.value = height * pr / (2 * Math.tan(FOV * Math.PI / 360))
      sparks.material.uniforms.uHeight.value = canvasH * pr
    }

    // ---- Hit testing (analytic, generous, allocation free) ------------------------------------
    function hitTest(clientX: number, clientY: number, dpadOnly = false): { zone: Zone | null; dir: PadButton | null } {
      const rect = canvas!.getBoundingClientRect()
      ndc.set((clientX - rect.left) / rect.width * 2 - 1, 1 - (clientY - rect.top) / rect.height * 2)
      raycaster.setFromCamera(ndc, camera)
      inverse.copy(model!.matrixWorld).invert()
      localRay.copy(raycaster.ray).applyMatrix4(inverse)
      const o = localRay.origin, d = localRay.direction
      let frontT = Infinity
      if (d.z < -.08) {
        frontT = (FRONT_Z - o.z) / d.z
        hitPoint.copy(d).multiplyScalar(frontT).add(o)
        const x = hitPoint.x, y = hitPoint.y
        // Off the face (seen from the side), the plane hit must not shadow the side button.
        if (Math.abs(x) > bounds.max.x || y > bounds.max.y || y < bounds.min.y) frontT = Infinity
        const dx = x - DPAD.x, dy = y - DPAD.y
        const dpadR = Math.hypot(dx, dy)
        if (dpadOnly || dpadR < .42) {
          const dir: PadButton | null = dpadR < .035 ? null : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'up' : 'down')
          return { zone: 'dpad', dir }
        }
        const da = Math.hypot(x - BUTTON_A.x, y - BUTTON_A.y), db = Math.hypot(x - BUTTON_B.x, y - BUTTON_B.y)
        if (Math.min(da, db) < .33 && x < 1.3) return { zone: da <= db ? 'a' : 'b', dir: null }
        if (Math.abs(x - MENU.x) < .3 && Math.abs(y - MENU.y) < .16) return { zone: 'select', dir: null }
        if (x > SCREEN.x0 - .02 && x < SCREEN.x1 + .02 && y > SCREEN.y0 - .02 && y < SCREEN.y1 + .02) return { zone: 'screen', dir: null }
      }
      if (localRay.intersectBox(POWER_BOX, boxHit) && boxHit.sub(o).dot(d) < frontT) return { zone: 'power', dir: null }
      if (localRay.intersectBox(grabBounds, boxHit)) return { zone: 'body', dir: null }
      return { zone: null, dir: null }
    }

    // ---- Pointer ----------------------------------------------------------------------------
    function pointerLook(event: PointerEvent) {
      const rect = host.getBoundingClientRect()
      const x = clamp((event.clientX - rect.left) / rect.width * 2 - 1, -1, 1)
      const y = clamp((event.clientY - rect.top) / rect.height * 2 - 1, -1, 1)
      tiltTarget.set(x, y)
      if (Math.abs(x - lookX) > .02 || Math.abs(y - lookY) > .02) { lookX = x; lookY = y; cartridge?.look(x, y) }
    }
    host.addEventListener('pointerdown', event => {
      if (!loaded || !entered || disposed) return
      if (event.pointerType === 'mouse' && event.button !== 0) return
      const { zone, dir } = hitTest(event.clientX, event.clientY)
      if (!zone) return
      if (zone === 'body' && [...grips.values()].some(grip => grip.kind === 'drag')) return
      try { host.setPointerCapture(event.pointerId) } catch { /* pointer already gone */ }
      pointerLook(event)
      if (zone === 'dpad') { grips.set(event.pointerId, { kind: 'dpad', dir }); if (dir) hold(dir) }
      else if (zone === 'a' || zone === 'b' || zone === 'select') { grips.set(event.pointerId, { kind: 'button', button: zone }); hold(zone) }
      else if (zone === 'screen') { grips.set(event.pointerId, { kind: 'tap' }); if (!powered) setPower(true); else cartridge?.nudge('poke') }
      else if (zone === 'power') { grips.set(event.pointerId, { kind: 'tap' }); depress.power = 1; setPower(!powered) }
      else {
        grips.set(event.pointerId, { kind: 'drag', x: event.clientX, y: event.clientY, t: event.timeStamp })
        dragging = true; coasting = false; yawVel = 0; pitchVel = 0
        setCursor('grabbing')
      }
      if (zone !== 'body') setCursor('pointer')
      schedule()
    }, listen)
    host.addEventListener('pointermove', event => {
      if (!loaded || disposed) return
      const grip = grips.get(event.pointerId)
      if (event.pointerType === 'mouse' || grip) pointerLook(event)
      if (!grip) {
        if (entered && event.pointerType === 'mouse') {
          const { zone } = hitTest(event.clientX, event.clientY)
          setCursor(!zone ? '' : zone === 'body' ? 'grab' : 'pointer')
        }
        schedule()
        return
      }
      if (grip.kind === 'dpad') {
        // Rolling a thumb across the pad changes direction, like the real thing.
        const { dir } = hitTest(event.clientX, event.clientY, true)
        if (dir !== grip.dir) { if (grip.dir) unhold(grip.dir); grip.dir = dir; if (dir) hold(dir) }
      } else if (grip.kind === 'drag') {
        const rect = host.getBoundingClientRect()
        const dt = Math.max(1, event.timeStamp - grip.t) / 1000
        const dYaw = (event.clientX - grip.x) / Math.max(200, rect.width) * Math.PI * 1.35
        const dPitch = (event.clientY - grip.y) / Math.max(200, rect.height) * 1.4
        yaw += dYaw
        // Pitch is limited, with a little rubber band near the limit.
        pitch = clamp(pitch + dPitch * (1 - Math.min(1, Math.abs(pitch) / .6) * .7), -.55, .55)
        const instant = dYaw / dt
        yawVel = yawVel * .35 + clamp(instant, -32, 32) * .65
        grip.x = event.clientX; grip.y = event.clientY; grip.t = event.timeStamp
      }
      schedule()
    }, listen)
    function endGrip(event: PointerEvent) {
      const grip = grips.get(event.pointerId)
      if (!grip) return
      grips.delete(event.pointerId)
      if (grip.kind === 'dpad' && grip.dir) unhold(grip.dir)
      else if (grip.kind === 'button') unhold(grip.button)
      else if (grip.kind === 'drag') {
        dragging = false
        // A stale drag (held still before letting go) does not fling.
        if (event.timeStamp - grip.t > 90) yawVel = 0
        if (Math.abs(yawVel) > 8.5) cartridge?.nudge('spin')
        if (reduced) yawVel = clamp(yawVel, -3, 3)
        coasting = Math.abs(yawVel) > 3.2
        yawTarget = Math.round(yaw / TAU) * TAU
        setCursor(event.pointerType === 'mouse' ? 'grab' : '')
      }
      try { if (host.hasPointerCapture(event.pointerId)) host.releasePointerCapture(event.pointerId) } catch { /* already released */ }
      schedule()
    }
    host.addEventListener('pointerup', endGrip, listen)
    host.addEventListener('pointercancel', endGrip, listen)
    host.addEventListener('lostpointercapture', endGrip, listen)
    host.addEventListener('pointerleave', event => {
      endGrip(event)
      if (event.pointerType === 'mouse') { tiltTarget.set(0, 0); setCursor(''); schedule() }
    }, listen)
    // Touches that start on a control must never scroll the page (a held d-pad slides vertically);
    // touches on the body keep pan-y, so a vertical swipe scrolls and a sideways one spins.
    host.addEventListener('touchstart', event => {
      if (!loaded || !entered) return
      for (const touch of event.changedTouches) {
        const { zone } = hitTest(touch.clientX, touch.clientY)
        if (zone && zone !== 'body') { event.preventDefault(); return }
      }
    }, { signal: localSignal, passive: false })
    host.addEventListener('contextmenu', event => { if (grips.size) event.preventDefault() }, listen)

    // ---- Keyboard ---------------------------------------------------------------------------
    host.addEventListener('keydown', event => {
      if (!loaded || disposed) return
      if (event.key === 'Escape') { releaseKeys(); host.blur(); return }
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const button = KEYS[event.code]
      if (!button) return
      event.preventDefault()
      event.stopPropagation()
      if (event.repeat || keyHolds.has(event.code)) return
      keyHolds.set(event.code, button)
      hold(button)
    }, listen)
    host.addEventListener('keyup', event => {
      const button = keyHolds.get(event.code)
      if (!button) return
      event.preventDefault()
      keyHolds.delete(event.code)
      unhold(button)
    }, listen)
    host.addEventListener('blur', releaseKeys, listen)
    // Losing the window (alt-tab, a system dialog) lets go of everything.
    function releaseAll() {
      releaseKeys()
      for (const grip of grips.values()) {
        if (grip.kind === 'dpad' && grip.dir) unhold(grip.dir)
        else if (grip.kind === 'button') unhold(grip.button)
      }
      grips.clear()
      dragging = false
      yawTarget = Math.round(yaw / TAU) * TAU
    }
    addEventListener('blur', releaseAll, listen)

    // ---- Render -----------------------------------------------------------------------------
    function draw() {
      if (!renderer || disposed) return
      renderer.render(scene, camera)
    }
    function verifyFirstFrame() {
      if (!renderer || disposed) return false
      pose(0)
      draw()
      if (!renderer.info.render.calls || !renderer.info.render.triangles) return false
      const gl = renderer.getContext()
      const width = gl.drawingBufferWidth, height = gl.drawingBufferHeight
      const pixels = new Uint8Array(width * height * 4)
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
      const error = gl.getError()
      if (error !== gl.NO_ERROR) throw new Error(`Sculpture GPU render failed (${error})`)
      // Confirm actual visible geometry, rather than hiding the poster after an empty frame.
      let changed = 0
      for (let i = 0; i < pixels.length; i += 4 * 13) if (pixels[i + 3] > 200 && pixels[i] + pixels[i + 1] + pixels[i + 2] > 60) changed++
      return changed > 30
    }

    /** Places the rig and all moving parts for the current state. Returns true while anything is still moving. */
    let moving = false, frameDt = 0
    function settle(current: number, target: number, rate: number) {
      const next = current + (target - current) * (1 - Math.exp(-frameDt * rate))
      if (Math.abs(target - next) > 1e-4) moving = true
      return Math.abs(target - next) < 1e-5 ? target : next
    }
    function pose(dt: number): boolean {
      moving = false
      frameDt = dt
      // Entrance.
      let enterY = 0, enterYaw = 0, enterScale = 1
      if (entranceAge >= 0 && entranceAge < 1) {
        entranceAge = Math.min(1, entranceAge + dt / 1.35)
        const t = entranceAge
        enterY = -3.4 * (1 - easeOutBack(Math.min(1, t * 1.05)))
        enterYaw = -2.4 * (1 - easeOutCubic(t))
        enterScale = .8 + .2 * easeOutCubic(t)
        moving = true
        if (entranceAge >= 1) { entered = true; powerAt = .18 }
      }
      if (powerAt >= 0) { powerAt -= dt; moving = true; if (powerAt < 0) { powerAt = -1; setPower(true) } }

      // Playing pose.
      const playing = !!cartridge?.playing
      if (playing !== (host.dataset.playing !== undefined)) { if (playing) host.dataset.playing = ''; else delete host.dataset.playing }
      playT = settle(playT, playing ? 1 : 0, 3.2)
      const p = playT * playT * (3 - 2 * playT)

      // Spin: free while dragged, coasting with friction after a flick, then a springy return to the front.
      if (!dragging) {
        if (coasting) {
          yaw += yawVel * dt
          yawVel *= Math.exp(-dt * 1.5)
          if (Math.abs(yawVel) < 3.2) {
            coasting = false
            // Settle on the next front face in the direction of travel.
            const ahead = yaw + yawVel * .28
            yawTarget = Math.round(ahead / TAU) * TAU
          }
          moving = true
        } else {
          const k = reduced ? 60 : 26, c = reduced ? 2 * Math.sqrt(60) : 2 * Math.sqrt(26) * .5
          yawVel += ((yawTarget - yaw) * k - yawVel * c) * dt
          yaw += yawVel * dt
          if (Math.abs(yawTarget - yaw) < 1e-4 && Math.abs(yawVel) < 1e-3) { yaw = yawTarget = 0; yawVel = 0 } else moving = true
        }
        const pk = reduced ? 60 : 30, pc = reduced ? 2 * Math.sqrt(60) : 2 * Math.sqrt(30) * .55
        pitchVel += (-pitch * pk - pitchVel * pc) * dt
        pitch += pitchVel * dt
        if (Math.abs(pitch) < 1e-4 && Math.abs(pitchVel) < 1e-3) { pitch = 0; pitchVel = 0 } else moving = true
      } else moving = true

      // Look toward the pointer, calmer while playing.
      tilt.x = settle(tilt.x, tiltTarget.x, 5)
      tilt.y = settle(tilt.y, tiltTarget.y, 5)
      // Idle float and wobble (none with reduced motion, calm while playing or asleep).
      floatRate = settle(floatRate, sleeping ? .45 : 1, 1.5)
      if (!reduced) clock += dt * floatRate
      const idle = reduced ? 0 : (1 - p * .85)
      droop = settle(droop, sleeping && powered ? 1 : 0, 1.6)
      // Hop: a damped spring used by wake, start and record.
      hopVel += (-hop * 40 - hopVel * 7) * dt
      hop += hopVel * dt
      if (Math.abs(hop) > 1e-4 || Math.abs(hopVel) > 1e-3) moving = true; else { hop = 0; hopVel = 0 }
      let shakeX = 0, shakeR = 0
      if (shake > 0) {
        shake = Math.max(0, shake - dt / .38)
        const a = shake * shake
        shakeX = Math.sin(clock * 97 + shake * 40) * .055 * a
        shakeR = Math.sin(clock * 71 + 1.3) * .045 * a
        moving = true
      }

      const scale = enterScale * (1 + (playScale - 1) * p)
      rig.scale.setScalar(scale)
      rig.position.set(
        shakeX,
        enterY + .13 * (1 - p) - .235 * playScale * p + Math.sin(clock * .9) * .05 * idle - droop * .05 + hop * .12,
        0,
      )
      rig.rotation.set(
        REST_PITCH + (PLAY_PITCH - REST_PITCH) * p + pitch + tilt.y * .09 * (1 - p * .7) + droop * .1 + Math.sin(clock * .41) * .02 * idle - hop * .04,
        REST_YAW + (PLAY_YAW - REST_YAW) * p + yaw + enterYaw + tilt.x * .17 * (1 - p * .7) + Math.sin(clock * .27) * .045 * idle,
        Math.sin(clock * .33) * .016 * idle + shakeR + droop * .025,
      )

      // Buttons: A/B/select depress; the d-pad rocks toward the held side.
      depress.a = settle(depress.a, holds.a ? 1 : 0, 30)
      depress.b = settle(depress.b, holds.b ? 1 : 0, 30)
      depress.select = settle(depress.select, holds.select ? 1 : 0, 30)
      depress.power = settle(depress.power, 0, 9)
      depress.rockX = settle(depress.rockX, (holds.down ? 1 : 0) - (holds.up ? 1 : 0), 28)
      depress.rockY = settle(depress.rockY, (holds.right ? 1 : 0) - (holds.left ? 1 : 0), 28)
      if (nodes.a) nodes.a.position.z = rest.get(nodes.a)!.z - depress.a * .048
      if (nodes.b) nodes.b.position.z = rest.get(nodes.b)!.z - depress.b * .048
      if (nodes.select) nodes.select.position.z = rest.get(nodes.select)!.z - depress.select * .025
      if (nodes.power) nodes.power.position.x = rest.get(nodes.power)!.x - depress.power * .03
      if (nodes.dpad) {
        const r = rest.get(nodes.dpad)!
        nodes.dpad.rotation.x = r.rx + depress.rockX * .17
        nodes.dpad.rotation.y = r.ry + depress.rockY * .17
        nodes.dpad.position.z = r.z - Math.min(1, Math.abs(depress.rockX) + Math.abs(depress.rockY)) * .012
      }

      // The display lights the object.
      screenPower = settle(screenPower, powered ? 1 : 0, powered ? 6 : 3)
      const glow = cartridge?.glow ?? NO_GLOW
      const lum = .2126 * glow.r + .7152 * glow.g + .0722 * glow.b
      glowColor.setRGB(glow.r, glow.g, glow.b, SRGBColorSpace)
      screenLight.color.copy(glowColor)
      screenLight.intensity = screenPower * (1 + 3.5 * lum)
      screen.uniforms.lcdPower.value = screenPower
      ;(haloMaterial.uniforms.uColor.value as Color).setRGB(glow.r, glow.g, glow.b, LinearSRGBColorSpace)
      haloMaterial.uniforms.uStrength.value = screenPower * (.8 + .7 * lum)
      ;(shadowMaterial.uniforms.uGlow.value as Color).setRGB(glow.r * screenPower, glow.g * screenPower, glow.b * screenPower, LinearSRGBColorSpace)

      // Contact shadow follows the console's height above it.
      const baseY = .13 * (1 - p) - .235 * playScale * p
      const lift = rig.position.y - baseY
      shadow.position.set(rig.position.x * .5, baseY - 2.2 * scale, -1.2)
      shadow.scale.setScalar(scale * (1 - clamp(lift, -.3, 1.5) * .25))
      shadowMaterial.uniforms.uOpacity.value = clamp(.62 - lift * .3, 0, .75) * (entranceAge < 0 ? 0 : Math.min(1, entranceAge * 1.5 + (entered ? 1 : 0)))

      // Status LED.
      ledAge += dt
      let ledLevel = powered ? .85 : 0
      ledColor.copy(LED_PINK)
      if (powered && sleeping) { ledLevel = .12 + .55 * (.5 + .5 * Math.sin(ledAge * 2.1)); moving = true }
      if (ledBlink > 0) { ledBlink = Math.max(0, ledBlink - dt); if (Math.sin(ledAge * 26) < 0) ledLevel *= .15; moving = true }
      if (ledFlash > 0) {
        ledFlash = Math.max(0, ledFlash - dt / .4)
        const flash = ledFlashKind === 'party' ? LED_PARTY[Math.floor(ledAge * 9) % 3] : ledFlashKind === 'red' ? LED_RED : ledFlashKind === 'ice' ? LED_ICE : LED_CREAM
        ledColor.lerp(flash, Math.min(1, ledFlash * 1.4))
        ledLevel = Math.max(ledLevel, ledFlash * 1.2)
        moving = true
      }
      ;(ledGlowMaterial.uniforms.uColor.value as Color).copy(ledColor).multiplyScalar(ledLevel * .9)
      ledMaterial.emissive.copy(ledColor).multiplyScalar(Math.min(1, ledLevel)).convertSRGBToLinear()
      ledGlow.visible = ledLevel > .01

      return moving
    }

    function animate(now: number) {
      animation = 0
      if (disposed || !renderer || !visible || document.hidden) { previous = 0; return }
      const dt = previous ? Math.min((now - previous) / 1000, .05) : 0
      previous = now
      let moving = pose(dt)
      if (cartridge && cartridge.update(dt)) screenTexture!.needsUpdate = true
      if (!reduced && sparks.update(dt)) moving = true
      else if (reduced && sparks.alive) { sparks.clear() }
      try { draw() } catch (error) { fallback(error); return }
      const busy = !!cartridge?.active || grips.size > 0 || keyHolds.size > 0
      if (!reduced || moving || busy) animation = requestAnimationFrame(animate)
      else previous = 0
    }
    function schedule() {
      if (!animation && loaded && visible && !document.hidden && !disposed) animation = requestAnimationFrame(animate)
    }
    function startEntrance() {
      if (entranceAge >= 0 || disposed) return
      host.dataset.awake = ''
      host.setAttribute('aria-disabled', 'false')
      if (reduced) { entranceAge = 1; entered = true; setPower(true) } else entranceAge = 0
      schedule()
    }

    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); fallback() }, listen)
    media.addEventListener('change', () => { reduced = media.matches; tiltTarget.set(0, 0); schedule() }, listen)
    document.addEventListener('visibilitychange', () => {
      previous = 0
      if (document.hidden) { cancelAnimationFrame(animation); animation = 0; releaseAll() } else schedule()
    }, listen)
    // The footer is revealed from under the page by a clipping wrapper, which an
    // IntersectionObserver ignores: measure what is really on screen before arriving.
    const clippers: Element[] = []
    for (let el = host.parentElement; el && el !== document.body; el = el.parentElement) {
      const style = getComputedStyle(el)
      if (style.clipPath !== 'none' || style.overflow !== 'visible') clippers.push(el)
    }
    function shownRatio() {
      const r = host.getBoundingClientRect()
      let left = Math.max(r.left, 0), top = Math.max(r.top, 0), right = Math.min(r.right, innerWidth), bottom = Math.min(r.bottom, innerHeight)
      for (const el of clippers) {
        const c = el.getBoundingClientRect()
        left = Math.max(left, c.left); top = Math.max(top, c.top); right = Math.min(right, c.right); bottom = Math.min(bottom, c.bottom)
      }
      return Math.max(0, right - left) * Math.max(0, bottom - top) / Math.max(1, r.width * r.height)
    }
    function checkArrival() {
      if (!loaded || !visible || entranceAge >= 0) return
      const needed = Math.min(.45, .8 * innerHeight / Math.max(1, host.getBoundingClientRect().height))
      if (shownRatio() >= needed) startEntrance()
    }
    addEventListener('scroll', checkArrival, { signal: localSignal, passive: true })
    observer = new IntersectionObserver(entries => {
      visible = entries[entries.length - 1].isIntersecting
      if (!visible) { cancelAnimationFrame(animation); animation = 0; previous = 0; return }
      checkArrival()
      schedule()
    }, { threshold: [0, .25, .5, .75, 1] })
    resizeObserver = new ResizeObserver(() => { resize(); if (loaded) { pose(0); draw(); schedule() } })
    resizeObserver.observe(host)
    resize()
    await renderer.compileAsync(scene, camera)
    if (disposed) return
    if (!verifyFirstFrame()) throw new Error('The sculpture did not produce a visible model frame')
    // The poster bows out as soon as the live object is proven; the empty stage then
    // waits for the console to arrive when it is actually on screen.
    renderer.clear()
    loaded = true
    host.dataset.render = 'live'
    host.dataset.ready = ''
    if (import.meta.env.DEV) Object.assign(window, { __sculpture: { scene, rig, react, setPower, get cartridge() { return cartridge }, nodes, halo, ledGlow, shadow, holds, grips, renderer } })
    observer.observe(host)
    schedule()
  } catch (error) { fallback(error) }
}
