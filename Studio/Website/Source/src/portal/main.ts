// The AR portal page. It opens on the portal itself, turning slowly on the page. From a phone, one tap asks for the camera and
// the motion sensors and puts the portal in the room. From a computer, it offers a QR code, and a way to walk through it here.
import '../fonts.css'
import './portal.css'
import { portalForPhone, qrImage } from '../qr'
import { invert, mul, rotationY, translation, type M4, type V3 } from './math'
import { cameraInPortal, createScene, OPENING, type PortalState } from './scene'
import { playCross, playOpen, setMuted, setWorldPad, unlock } from './sound'
import { askForMotion, CameraTracker, StillTracker, WebXRTracker, type FrameInfo, type Tracker } from './trackers'

const ar = document.documentElement.lang.startsWith('ar')
const t = (en: string, arabic: string) => (ar ? arabic : en)
const COPY = {
  mark: t('Sindibad\nStudios', 'سندباد\nاستوديو'),
  title: t('Step into another world', 'ادخل إلى عالم آخر'),
  sub: t("Your phone's camera puts a portal right in the room you're in. Nothing to install.", 'تضع كاميرا هاتفك بوابة في الغرفة التي أنت فيها. من دون تثبيت أي شيء.'),
  open: t('Open the portal', 'افتح البوابة'),
  why: t('It needs your camera and motion sensors. Nothing is recorded or sent anywhere.', 'تحتاج البوابة إلى الكاميرا ومستشعرات الحركة. لا يُسجَّل شيء ولا يُرسَل إلى أي مكان.'),
  starting: t('Opening…', 'لحظة…'),
  find: t('Move your phone slowly so it can find the floor', 'حرّك هاتفك ببطء ليجد الأرض'),
  tap: t('Aim at the floor, then tap', 'وجّه الهاتف إلى الأرض ثم اضغط'),
  anyway: t("Can't see the floor? Tap anyway", 'لا تظهر الأرض؟ اضغط على أي حال'),
  walk: t('Now walk through it!', 'الآن امشِ عبرها!'),
  walkBack: t('Walk back through the arch to go home', 'امشِ عبر القوس لتعود'),
  step: t('Step through', 'ادخل البوابة'),
  back: t('Step back', 'ارجع'),
  made: t('You made it!', 'وصلت!'),
  madeSub: t('Look behind you: your room is still there.', 'انظر خلفك: غرفتك ما زالت هناك.'),
  home: t('Welcome home', 'أهلاً بعودتك'),
  homeSub: t('The portal stays open.', 'البوابة تبقى مفتوحة.'),
  noCam: t('See it without the camera', 'شاهدها بلا كاميرا'),
  again: t('Try again', 'حاول مجدداً'),
  blockedT: t('The camera is blocked', 'الكاميرا محجوبة'),
  blocked: t('Allow the camera for this site in your browser settings, then try again.', 'اسمح للكاميرا لهذا الموقع من إعدادات المتصفح، ثم حاول مجدداً.'),
  noneT: t("We couldn't find a camera", 'لم نجد كاميرا'),
  none: t('The portal needs a camera to appear in your room. You can still walk through it here.', 'تحتاج البوابة إلى كاميرا لتظهر في غرفتك، لكن يمكنك عبورها هنا.'),
  insecureT: t('The camera needs a secure page', 'الكاميرا تعمل على الصفحات الآمنة فقط'),
  insecure: t('Browsers only open the camera on https. You can still walk through it here.', 'لا تفتح المتصفحات الكاميرا إلا عبر https، لكن يمكنك عبور البوابة هنا.'),
  deskT: t('Step into another world', 'ادخل إلى عالم آخر'),
  deskSub: t('Open it on your phone, and this portal stands in your room.', 'افتحها على هاتفك لتقف هذه البوابة في غرفتك.'),
  scan: t('Scan to explore in augmented reality!', 'امسح لتستكشف بالواقع المعزّز!'),
  point: t('Point your phone here', 'وجّه كاميرا هاتفك هنا'),
  keys: t('Drag to look. Arrow keys to walk.', 'اسحب لتنظر حولك، واستخدم الأسهم للمشي.'),
  noMotion: t('Drag to look around, then tap', 'اسحب لتنظر حولك ثم اضغط'),
  here: t('Try it here first', 'جرّبها هنا أولاً'),
  noGl: t("This browser can't draw the portal. Try an up-to-date Chrome or Safari.", 'لا يستطيع هذا المتصفح رسم البوابة. جرّب إصداراً حديثاً من كروم أو سفاري.'),
  close: t('Close', 'إغلاق'),
  sound: t('Sound', 'الصوت'),
  qrAlt: t('QR code for this page', 'رمز QR لهذه الصفحة'),
}

const make = <K extends keyof HTMLElementTagNameMap>(tag: K, parent: Element, cls = '', text = '') => {
  const e = parent.appendChild(document.createElement(tag))
  if (cls) e.className = cls
  if (text) e.textContent = text
  return e
}

make('div', document.body, 'pt-back')
const video = make('video', document.body, 'pt-video')
video.hidden = true
const canvas = make('canvas', document.body, 'pt-gl')
const ui = make('div', document.body, 'pt-ui')

const dpr = Math.min(window.devicePixelRatio || 1, 2)
const gl = canvas.getContext('webgl2', {
  alpha: true,
  premultipliedAlpha: true,
  antialias: true,
  depth: true,
  stencil: true,
  powerPreference: 'high-performance',
}) as WebGL2RenderingContext | null

const phoneLike = matchMedia('(hover: none) and (pointer: coarse)').matches
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

// ------------------------------------------------------------------------------------------------------------------ the page
const ICON = {
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  on: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.500v5h3.500L12 18.500v-13L7.500 9.500z" fill="currentColor"/><path d="M16 9a4 4 0 0 1 0 6M18.500 6.500a8 8 0 0 1 0 11"/></svg>',
  off: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.500v5h3.500L12 18.500v-13L7.500 9.500z" fill="currentColor"/><path d="M16.500 9.500l5 5M21.500 9.500l-5 5"/></svg>',
}
let muted = false

function chrome(live: boolean) {
  ui.textContent = ''
  document.body.classList.toggle('is-live', live)
  const row = make('div', ui, 'pt-row')
  const mark = make('a', row, 'pt-mark', COPY.mark)
  mark.href = `${import.meta.env.BASE_URL}${ar ? 'ar/' : ''}`
  const end = make('div', row, 'pt-round-row')
  if (live) {
    const snd = make('button', end, 'pt-round')
    snd.type = 'button'
    snd.setAttribute('aria-label', COPY.sound)
    snd.innerHTML = muted ? ICON.off : ICON.on
    snd.addEventListener('click', () => {
      muted = !muted
      setMuted(muted)
      snd.innerHTML = muted ? ICON.off : ICON.on
    })
    const x = make('button', end, 'pt-round')
    x.type = 'button'
    x.setAttribute('aria-label', COPY.close)
    x.innerHTML = ICON.close
    x.addEventListener('click', () => showStart())
  }
}

function goButton(parent: Element, label: string, onClick: (b: HTMLButtonElement) => void) {
  const b = make('button', parent, 'pt-go')
  b.type = 'button'
  make('span', b, '', label)
  b.addEventListener('click', () => onClick(b))
  return b
}

function intro(title: string, sub: string) {
  const box = make('div', ui, 'pt-intro')
  make('h1', box, '', title)
  make('p', box, '', sub)
  return box
}

function burstStars() {
  for (let i = 0; i < 14; i++) {
    const s = make('i', ui, 'pt-star')
    const a = (i / 14) * Math.PI * 2 + Math.random()
    const d = 160 + Math.random() * 220
    s.style.setProperty('--x', `${Math.cos(a) * d}px`)
    s.style.setProperty('--y', `${Math.sin(a) * d}px`)
    s.style.animationDelay = `${Math.random() * 0.12}s`
    s.addEventListener('animationend', () => s.remove())
  }
}

function celebrate(inside: boolean) {
  if (!reduced) {
    const f = make('div', ui, 'pt-flash')
    f.addEventListener('animationend', () => f.remove())
    burstStars()
  }
  document.querySelector('.pt-badge')?.remove()
  const b = make('div', ui, 'pt-badge')
  make('b', b, '', inside ? COPY.made : COPY.home)
  make('small', b, '', inside ? COPY.madeSub : COPY.homeSub)
  b.addEventListener('animationend', () => b.remove())
  navigator.vibrate?.(inside ? [30, 40, 60] : 30)
  playCross()
  setWorldPad(inside)
}

// ------------------------------------------------------------------------------------------------------------------ the state
const state: PortalState = { place: null, pop: 0, open: 0, inside: false, dusk: 0, reticle: null, t: 0, sinceOpen: 0, burst: -1 }
let scene: ReturnType<typeof createScene> | null = null
let tracker: Tracker | null = null
let placedAt = 0
let opened = false
let prevCam: V3 | null = null
let coach: HTMLElement | null = null
let stepBtn: HTMLButtonElement | null = null
let aimLost = 0
let lastAim: M4 | null = null
let lastCamera: V3 = [0, 0, 0]
let lastAhead: V3 = [0, 0, -1]
let preview = false

function resize() {
  const w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr)
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w
    canvas.height = h
  }
}
addEventListener('resize', resize)

function setCoach(text: string | null) {
  if (!coach) return
  coach.hidden = !text
  if (text && coach.textContent !== text) coach.textContent = text
}

function placeAt(aim: M4) {
  state.place = aim
  state.pop = 0
  state.open = 0
  state.reticle = null
  state.inside = false
  state.dusk = 0
  state.burst = -1
  placedAt = performance.now()
  opened = false
  prevCam = null
  setCoach(null)
}

function onFrame(f: FrameInfo) {
  if (!gl || !scene) return
  const now = performance.now()
  state.t = now / 1000
  lastCamera = f.camera
  lastAhead = f.ahead
  lastAim = f.aim
  if (!state.place) {
    state.reticle = f.aim
    if (tracker?.kind === 'webxr') {
      setCoach(f.aim ? COPY.tap : now - aimLost > 9000 ? COPY.anyway : COPY.find)
    } else if (tracker instanceof CameraTracker && now - aimLost > 1500) {
      setCoach(tracker.sensing ? COPY.tap : COPY.noMotion)
    }
  } else {
    const k = (now - placedAt) / 1000
    if (preview || reduced) {
      state.pop = 1
      state.open = 1
      state.sinceOpen = 14 + k
    } else {
      // The arch rises on a spring, then the opening widens from its middle.
      state.pop = 1 - Math.exp(-6.5 * k) * Math.cos(8.5 * k)
      const o = (k - 0.55) / 1
      const e = Math.max(0, Math.min(1, o))
      state.open = e * e * (3 - 2 * e)
      state.sinceOpen = Math.max(0, k - 0.55)
      state.burst = k > 0.45 && k < 1.65 ? (k - 0.45) / 1.2 : -1
      if (!opened && k > 0.05) {
        opened = true
        playOpen()
        navigator.vibrate?.(30)
      }
    }
    state.dusk += ((state.inside ? 1 : 0) - state.dusk) * 0.08

    // Stepping through the opening, from either side, swaps which world you're in.
    const cam = cameraInPortal(f.views[0].view, state.place)
    if (prevCam) {
      const a = prevCam[2] - OPENING.plane, b = cam[2] - OPENING.plane
      if (a * b < 0) {
        const u = a / (a - b)
        const x = prevCam[0] + (cam[0] - prevCam[0]) * u, y = prevCam[1] + (cam[1] - prevCam[1]) * u
        if (Math.abs(x) < OPENING.hw + 0.03 && y > -0.3 && y < OPENING.top + 0.45 && state.open > 0.5) {
          state.inside = !state.inside
          if (!preview) celebrate(state.inside)
          afterCrossing()
        }
      }
    }
    prevCam = cam
    if (!preview) updateHints(k)
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, f.framebuffer)
  for (const v of f.views) {
    gl.viewport(v.x, v.y, v.w, v.h)
    scene.draw(v.view, v.proj, v.h, state)
  }
}

function updateHints(k: number) {
  if (tracker?.walks) {
    if (k > 1.6) setCoach(state.inside ? COPY.walkBack : COPY.walk)
  } else {
    if (k > 1.5 && stepBtn) {
      stepBtn.hidden = false
      stepBtn.querySelector('span')!.textContent = state.inside ? COPY.back : COPY.step
    }
    if (k > 1.5) setCoach(tracker?.kind === 'still' ? COPY.keys : null)
  }
}

function afterCrossing() {
  if (stepBtn) stepBtn.querySelector('span')!.textContent = state.inside ? COPY.back : COPY.step
}

/** For the trackers that can't walk: glides the camera through the opening, from wherever it's standing. */
function stepThrough() {
  if (!tracker?.moveAlong || !tracker.base || !state.place) return
  const place = state.place
  const from = tracker.base()
  const m = mul(invert(place), translation(from[0], from[1], from[2]))
  const y = Math.min(m[13], OPENING.top - 0.3)
  const outside = m[14] > OPENING.plane
  const toTracker = (z: number): V3 => {
    const w = mul(place, translation(0, y, OPENING.plane + z))
    return [w[12], w[13], w[14]]
  }
  tracker.moveAlong([from, toTracker(outside ? 0.9 : -0.9), toTracker(outside ? -2.7 : 2.6)], 3000)
}

// --------------------------------------------------------------------------------------------------------------- the screens
function stopTracker() {
  tracker?.stop()
  tracker = null
  setWorldPad(false)
  state.inside = false
  state.dusk = 0
}

async function loadScene() {
  if (scene || !gl) return
  const res = await fetch(`${import.meta.env.BASE_URL}concepts/portal/arch.dat`)
  scene = createScene(gl, await res.arrayBuffer(), dpr)
}

function runPreview() {
  stopTracker()
  preview = true
  // It stands a little ahead of the camera, and off to the side where the words aren't.
  const wide = innerWidth > innerHeight
  const side = wide ? (ar ? -1 : 1) : 0
  placeAt(translation(side * 1.25, 0, 0))
  // A low camera, like the hero art's, so the horizon sits halfway up the opening and the planet shows. In a tall window it looks
  // above the arch, so the arch stands below the words.
  const still = new StillTracker(gl!, ui, [side * 0.1, wide ? 1.3 : 1.85, 0], wide ? [side * 0.1 - 0.5, 0.82, 4.9] : [-0.3, 0.72, 5.4])
  tracker = still
  void still.start(onFrame)
}

function showStart() {
  video.hidden = true
  chrome(false)
  if (!gl) {
    intro(COPY.title, COPY.noGl)
    return
  }
  if (phoneLike && (!window.isSecureContext || !navigator.mediaDevices)) return showProblem(COPY.insecureT, COPY.insecure, false)
  runPreview()
  if (!phoneLike) return showComputer()
  intro(COPY.title, COPY.sub)
  make('div', ui, 'pt-space')
  const foot = make('div', ui, 'pt-foot')
  goButton(foot, COPY.open, b => void begin(b))
  make('p', foot, 'pt-note', COPY.why)
}

function showComputer() {
  intro(COPY.deskT, COPY.deskSub)
  const card = make('a', ui, 'pt-card')
  card.href = portalForPhone(ar)
  card.target = '_blank'
  card.rel = 'noopener'
  const frame = make('span', card, 'pt-card-frame')
  const face = make('span', frame, 'pt-card-in')
  const img = make('img', face)
  img.src = qrImage(portalForPhone(ar))
  img.alt = COPY.qrAlt
  make('small', face, '', COPY.point)
  make('span', card, 'pt-ribbon', COPY.scan)
  make('div', ui, 'pt-space')
  const foot = make('div', ui, 'pt-foot')
  goButton(foot, COPY.here, () => {
    unlock()
    walkHere()
  })
}

function showProblem(title: string, body: string, canRetry: boolean) {
  stopTracker()
  chrome(false)
  video.hidden = true
  runPreview()
  intro(title, body)
  make('div', ui, 'pt-space')
  const foot = make('div', ui, 'pt-foot')
  if (canRetry) goButton(foot, COPY.again, b => void begin(b))
  const other = make('button', foot, canRetry ? 'pt-quiet' : 'pt-go pt-go-long')
  other.type = 'button'
  if (canRetry) other.textContent = COPY.noCam
  else make('span', other, '', COPY.noCam)
  other.addEventListener('click', () => {
    unlock()
    walkHere()
  })
}

/** The same portal with no camera, on the page: drag to look, and walk through it. */
function walkHere() {
  stopTracker()
  preview = false
  chrome(true)
  make('div', ui, 'pt-space')
  const foot = make('div', ui, 'pt-foot')
  coach = make('div', foot, 'pt-coach')
  coach.hidden = true
  stepBtn = goButton(foot, COPY.step, () => stepThrough())
  stepBtn.hidden = true
  placeAt(translation(0, 0, 0))
  const still = new StillTracker(gl!, ui, null)
  tracker = still
  void still.start(onFrame)
}

function liveScreen(webxr: boolean) {
  preview = false
  chrome(true)
  make('div', ui, 'pt-space')
  const foot = make('div', ui, 'pt-foot')
  coach = make('div', foot, 'pt-coach')
  setCoach(webxr ? COPY.find : COPY.tap)
  stepBtn = goButton(foot, COPY.step, () => stepThrough())
  stepBtn.hidden = true
  state.place = null
  state.reticle = null
  aimLost = performance.now()
}

function tapWorld() {
  if (state.place) return
  if (lastAim) return placeAt(lastAim)
  // If no floor has turned up after a good while, take a guess: straight ahead, and as far below the phone as a floor usually is.
  if (performance.now() - aimLost < 9000) return
  const c = lastCamera, a = lastAhead, d = 2.5
  placeAt(mul(translation(c[0] + a[0] * d, c[1] - 1.4, c[2] + a[2] * d), rotationY(Math.atan2(-a[0], -a[2]))))
}

async function begin(button: HTMLButtonElement) {
  button.disabled = true
  const label = button.querySelector('span')
  if (label) label.textContent = COPY.starting
  // Both of these need the tap itself, so they're the very first things to happen.
  unlock()
  const motion = askForMotion()
  stopTracker()
  if (await WebXRTracker.available()) {
    try {
      const xr = new WebXRTracker(gl!, ui, () => {
        if (tracker === xr) showStart()
      })
      tracker = xr
      liveScreen(true)
      await xr.start(onFrame, tapWorld)
      return
    } catch (err) {
      console.warn('WebXR did not start, so using the camera path.', err)
      tracker = null
    }
  }
  await motion
  const cam = new CameraTracker(gl!, video, ui)
  try {
    await cam.open()
  } catch (err) {
    const name = (err as DOMException).name
    if (name === 'NotAllowedError' || name === 'SecurityError') return showProblem(COPY.blockedT, COPY.blocked, true)
    return showProblem(COPY.noneT, COPY.none, false)
  }
  tracker = cam
  liveScreen(false)
  await cam.start(onFrame, tapWorld)
}

async function main() {
  resize()
  if (!gl) return showStart()
  try {
    await loadScene()
  } catch (err) {
    console.error(err)
  }
  showStart()
}
void main()
