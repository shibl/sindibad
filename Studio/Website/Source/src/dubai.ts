// Clicking "Dubai" in the hero. The map bursts out of the word in a circle, the flat 2D map tilts up into 3D while the
// towers rise, the headline changes, and the landmarks pop their pins as the shot lands. On desktops the city is drawn
// live (dubai3d.ts) from the Blender models in concepts/blender/dubai. Phones and reduced motion get the rendered video.
import './dubai.css'
import { ANCHORS, canLive, DONE, forgetCity, LAND, loadCity, type City } from './dubai3d'
import { dubaiNow, skyAt } from './dubai-sky'
import { TOURS, type Tour } from './dubai-tours'

const BASE = '/concepts/dubai/'
const ar = document.documentElement.lang === 'ar'
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches

type Route = { k: string; p: [number, number, number][] }
type MapData = { aspect: number; pins: Record<string, [number, number, number]>; routes: Route[] }

const TEXT = ar
  ? { place: 'دبي · الإمارات العربية المتحدة', title: ['نحن في', 'دبي!'], sub: 'لكن ما زال بإمكاننا أن نلعب معاً!', contact: 'تواصل معنا', close: 'العودة' }
  : { place: 'Dubai · United Arab Emirates', title: ['We are in', 'Dubai!'], sub: 'But, we still can play together!', contact: 'Contact us', close: 'Back' }
const PINS: [string, string, string][] = [
  ['burj_khalifa', 'Burj Khalifa', 'برج خليفة'],
  ['fountain', 'The Dubai Fountain', 'نافورة دبي'],
  ['future', 'Museum of the Future', 'متحف المستقبل'],
  ['la_mer', 'La Mer', 'لا مير'],
  ['world', 'The World Islands', 'جزر العالم'],
]

const NUM = new Intl.NumberFormat(ar ? 'ar-AE' : 'en-US')

const SPRING = 'linear(0, 0.009, 0.035 2.1%, 0.141, 0.281 6.7%, 0.723 12.9%, 0.938 16.7%, 1.017, 1.077, 1.121, 1.149 24.3%, 1.159, 1.163, 1.161, 1.154 29.9%, 1.129 32.8%, 1.051 39.6%, 1.017 43.1%, 0.991, 0.977 51%, 0.974 53.8%, 0.975 57.1%, 0.997 69.8%, 1.003 76.9%, 1)'
const SWEEP = 'cubic-bezier(.76, 0, .24, 1)'
const words = (s: string) => s.split(' ').map(w => `<span class="dm-w"><span>${w}</span></span>`).join(' ')

const PIN_HTML = (id: string, name: string) =>
  `<span class="dm-pin-bob"><span class="dm-pin-pop"><u class="dm-pin-ring"></u><img src="${BASE}pin-${id}.webp" alt="" /><i></i><b>${name}</b></span></span>`

let layer: HTMLElement | null = null
let data: MapData | null = null
let open = false
let busy = 0
let stopTraffic = () => {}
let leaveRide: (() => void) | null = null
let stopBar = () => {}
const timers: number[] = []
const later = (ms: number, f: () => void) => timers.push(window.setTimeout(f, ms))
const clearLater = () => { timers.forEach(clearTimeout); timers.length = 0 }

async function loadData() {
  data ??= await fetch(BASE + 'dubai-map.json').then(r => r.json()).catch(() => null)
  return data
}

// Warm the video before anyone clicks, unless they've asked to save data.
const useLive = () => !reduce() && innerWidth > 768 && canLive()
let warmed = false
export function warm() {
  if (warmed || (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return
  warmed = true
  if (useLive()) {
    void loadCity().catch(() => {})
    return
  }
  void loadData()
  for (const href of ['final.webp', 'fly.mp4']) {
    const l = document.createElement('link')
    l.rel = 'prefetch'
    l.href = BASE + href
    document.head.append(l)
  }
}

function build(hero: HTMLElement) {
  const el = document.createElement('div')
  el.className = 'dm'
  el.setAttribute('aria-hidden', 'true')
  el.innerHTML = `
    <div class="dm-stage">
      <img class="dm-still" alt="" />
      <video class="dm-video" muted playsinline></video>
      <canvas class="dm-traffic"></canvas>
      <div class="dm-pins"></div>
    </div>
    <div class="dm-top"></div>
    <div class="dm-frost"></div>
    <div class="dm-ring"></div>
    <div class="dm-copy">
      <p class="dm-place">${TEXT.place} · <time class="dm-clock"></time></p>
      <h2 class="dm-title">${words(TEXT.title[0])} <em>${words(TEXT.title[1])}</em></h2>
      <p class="dm-sub">${words(TEXT.sub)}</p>
      <a class="a-pill dm-contact" href="#contact">${TEXT.contact}</a>
    </div>
    <div class="dm-ride">
      <button class="dm-back" type="button">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        ${ar ? 'العودة إلى دبي' : 'Back to Dubai'}
      </button>
      <div class="dm-tags" aria-hidden="true"></div>
      <div class="dm-rail" aria-hidden="true"><span></span></div>
      <p class="dm-fact" aria-live="polite"></p>
      <div class="dm-meter" aria-hidden="true">
        <small class="dm-level-name">${ar ? 'الطابق' : 'Level'}</small>
        <strong class="dm-level">0</strong>
        <span class="dm-height">0 m</span>
      </div>
      <p class="dm-hint" aria-hidden="true">${ar ? 'مرّر للتحكم بالرحلة' : 'Scroll to steer the ride'}</p>
    </div>
    <button class="dm-close" type="button" aria-label="${TEXT.close}">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>
    </button>`
  hero.prepend(el)
  el.querySelector('.dm-close')!.addEventListener('click', () => closeDubai())
  return el
}

// The picture fills the layer like object-fit: cover, centred. These turn picture fractions into layer pixels.
function fit(el: HTMLElement) {
  const w = el.clientWidth, h = el.clientHeight
  const s = Math.max(w / 16, h / 9)
  const pw = 16 * s, ph = 9 * s
  return { w, h, pw, ph, x: (fx: number) => (w - pw) / 2 + fx * pw, y: (fy: number) => (h - ph) / 2 + fy * ph }
}

function placePins(el: HTMLElement) {
  if (!data) return
  const box = el.querySelector<HTMLElement>('.dm-pins')!
  const f = fit(el)
  box.innerHTML = ''
  // Keep clear of the words at the foot of the picture, and of the edges on narrow screens.
  const copy = el.querySelector<HTMLElement>('.dm-copy')!
  const text = el.querySelector<HTMLElement>('.dm-title')!.getBoundingClientRect()
  const left = el.getBoundingClientRect().left
  PINS.forEach(([id, en, arabic], i) => {
    const at = data!.pins[id]
    if (!at) return
    const x = f.x(at[0]), y = f.y(at[1])
    if (x < 50 || x > f.w - 50 || y < 90) return
    const overText = x > text.left - left - 90 && x < text.right - left + 90
    if (y + 34 > copy.offsetTop && (overText || y > f.h * 0.72)) return
    const pin = document.createElement('div')
    pin.className = 'dm-pin'
    pin.style.left = `${x}px`
    pin.style.top = `${y}px`
    pin.style.setProperty('--i', String(i))
    pin.innerHTML = PIN_HTML(id, ar ? arabic : en)
    box.append(pin)
  })
}

// Each bubble pops like a pickup in a game: it bursts out past full size, squashes back, and settles, with a ring flying
// off it and its name following a beat later.
function popPins(el: HTMLElement) {
  if (reduce()) return
  el.querySelectorAll<HTMLElement>('.dm-pin').forEach((pin, i) => {
    const delay = i * 150
    const pop = pin.querySelector<HTMLElement>('.dm-pin-pop')!
    // unpopPins holds the bubble at nothing. Left running, it takes over again the moment this pop ends.
    pop.getAnimations().forEach(a => a.cancel())
    pop.animate(
      [
        { scale: '0', opacity: 0, easing: 'cubic-bezier(.2,.9,.3,1)' },
        { scale: '1.32', opacity: 1, offset: 0.34, easing: 'cubic-bezier(.4,0,.6,1)' },
        { scale: '0.88', offset: 0.58, easing: 'cubic-bezier(.4,0,.6,1)' },
        { scale: '1.07', offset: 0.78, easing: 'cubic-bezier(.4,0,.6,1)' },
        { scale: '1' },
      ],
      { duration: 780, delay, fill: 'backwards' })
    pin.querySelector<HTMLElement>('.dm-pin-ring')!.animate(
      [{ scale: '0.5', opacity: 0.95 }, { scale: '2.1', opacity: 0 }],
      { duration: 620, delay: delay + 90, easing: 'cubic-bezier(.15,.7,.3,1)', fill: 'backwards' })
    pin.querySelector<HTMLElement>('b')!.animate(
      [{ opacity: 0, translate: '0 -7px', scale: '0.8' }, { opacity: 1, translate: '0 0', scale: '1' }],
      { duration: 340, delay: delay + 240, easing: 'cubic-bezier(.3,1.5,.5,1)', fill: 'backwards' })
  })
}
function unpopPins(el: HTMLElement) {
  if (reduce()) return
  el.querySelectorAll<HTMLElement>('.dm-pin-pop').forEach((pop, i) => {
    pop.animate([{ scale: '1', opacity: 1 }, { scale: '1.15', opacity: 1, offset: 0.3 }, { scale: '0', opacity: 0 }],
      { duration: 240, delay: i * 25, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards' })
  })
}

// Little cars on the real motorways. The routes stop where a tower hides the road, so nothing drives over a building.
function traffic(el: HTMLElement) {
  const cv = el.querySelector<HTMLCanvasElement>('.dm-traffic')!
  const ctx = cv.getContext('2d')
  if (!ctx || !data || reduce()) return () => {}
  let f = fit(el), raf = 0, last = 0, seen = true
  const dpr = Math.min(devicePixelRatio || 1, 2)
  const size = () => {
    f = fit(el)
    cv.width = f.w * dpr
    cv.height = f.h * dpr
  }
  size()
  const COLORS = ['#ffffff', '#ffffff', '#e8505b', '#2d3a44', '#f4c95d', '#6b7c8a']
  const cars: { r: Route; at: number; dir: number; v: number; c: string }[] = []
  for (const r of data.routes) {
    const n = Math.min(26, Math.round(r.p.length * (r.k === 'motorway' ? 0.5 : 0.28)))
    for (let i = 0; i < n; i++) {
      cars.push({ r, at: Math.random() * (r.p.length - 1), dir: 1, v: 0.7 + Math.random() * 0.6, c: COLORS[(Math.random() * COLORS.length) | 0] })
    }
  }
  const io = new IntersectionObserver(([e]) => (seen = e.isIntersecting))
  io.observe(el)
  const ro = new ResizeObserver(size)
  ro.observe(el)
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick)
    const dt = Math.min((now - last) / 1000, 0.1)
    last = now
    if (!seen) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, f.w, f.h)
    for (const car of cars) {
      const pts = car.r.p
      car.at += car.dir * car.v * dt * 1.5
      if (car.at >= pts.length - 1) car.at = 0
      const i = Math.floor(car.at), t = car.at - i
      const a = pts[i], b = pts[i + 1] ?? a
      const x = f.x(a[0] + (b[0] - a[0]) * t), y = f.y(a[1] + (b[1] - a[1]) * t)
      const ang = Math.atan2(f.y(b[1]) - f.y(a[1]), f.x(b[0]) - f.x(a[0]))
      const s = Math.max(0.55, a[2] * 32 * (f.ph / 1080))
      const fade = Math.min(1, car.at / 2, (pts.length - 1 - car.at) / 2)
      ctx.globalAlpha = Math.max(0, fade)
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(ang)
      ctx.fillStyle = 'rgba(40,50,60,.22)'
      ctx.fillRect(-1.8 * s, -0.5 * s, 3.6 * s, 1.6 * s)
      ctx.fillStyle = car.c
      ctx.fillRect(-1.6 * s, -0.8 * s, 3.2 * s, 1.5 * s)
      ctx.restore()
    }
    ctx.globalAlpha = 1
  }
  last = performance.now()
  raf = requestAnimationFrame(tick)
  cv.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, fill: 'both' })
  return () => {
    cancelAnimationFrame(raf)
    io.disconnect()
    ro.disconnect()
  }
}

const copyOut = (hero: HTMLElement, out: boolean) => {
  const still = reduce()
  hero.querySelectorAll<HTMLElement>('.a-hero h1 > span').forEach((line, i) => {
    line.getAnimations().forEach(a => a.cancel())
    const hidden = { translate: '0 -0.5em', opacity: 0, filter: 'blur(10px)' }
    const shown = { translate: '0 0', opacity: 1, filter: 'blur(0)' }
    line.animate(out ? [shown, hidden] : [{ ...hidden, translate: '0 0.5em' }, shown],
      { duration: still ? 1 : out ? 460 : 720, delay: still ? 0 : i * 70, easing: out ? 'cubic-bezier(.6,0,.9,.4)' : 'cubic-bezier(.16,1,.3,1)', fill: 'both' })
  })
  hero.querySelectorAll<HTMLElement>('.a-eyebrow, .a-hero-description').forEach(el => {
    el.getAnimations().forEach(a => a.cancel())
    el.animate(out ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: 1 }],
      { duration: still ? 1 : out ? 280 : 640, delay: !out && !still ? 240 : 0, fill: 'both' })
  })
}

function revealFrom(trigger: Element, el: HTMLElement) {
  const a = trigger.getBoundingClientRect(), b = el.getBoundingClientRect()
  const x = a.left + a.width / 2 - b.left, y = a.top + a.height / 2 - b.top
  const R = Math.hypot(Math.max(x, b.width - x), Math.max(y, b.height - y)) + 40
  return { x, y, R }
}

// After dark the whole website goes dark with the city, for as long as you're in it. The colours only ease across while
// switching, so nothing else on the page pays for transitions the rest of the time.
let themeTimer = 0
function setDark(on: boolean) {
  const root = document.documentElement
  if ('dmDark' in root.dataset === on) return
  root.classList.add('dm-theming')
  clearTimeout(themeTimer)
  themeTimer = window.setTimeout(() => root.classList.remove('dm-theming'), 950)
  if (on) root.dataset.dmDark = 'on'
  else delete root.dataset.dmDark
}

// The real hour in Dubai sets the whole mood: sky, light, and whether the city has its lights on. Everything around the
// map, from the words at its foot to the top bar, takes its colours from the same sky.
const CLOCK = new Intl.DateTimeFormat(ar ? 'ar-AE' : 'en-US', { timeZone: 'Asia/Dubai', hour: 'numeric', minute: '2-digit' })
function applySky(el: HTMLElement, city: City | null, live = true) {
  const when = dubaiNow()
  el.querySelector('.dm-clock')!.textContent = CLOCK.format(when)
  const root = document.documentElement.style
  if (!live) {
    // The rendered video is always daytime, so everything around it stays daytime too.
    el.style.setProperty('--dm-fade', '255 255 255')
    root.setProperty('--dm-top', '217 238 249')
    return
  }
  const env = skyAt(when)
  el.style.setProperty('--dm-fade', env.fade)
  root.setProperty('--dm-top', env.top)
  el.classList.toggle('is-dark', env.dark)
  el.dataset.mode = env.mode
  setDark(env.dark)
  city?.setEnv(env)
  return env
}

// The live version. The video code below is what phones get.
let liveCity: City | null = null
function runLive(el: HTMLElement, run: number) {
  const stage = el.querySelector<HTMLElement>('.dm-stage')!
  el.classList.add('is-live', 'is-waiting')
  el.querySelector('.dm-traffic')?.remove()     // the live city has its own cars
  const box = el.querySelector<HTMLElement>('.dm-pins')!
  const pins = PINS.map(([id, en, arabic], i) => {
    const pin = document.createElement('div')
    pin.className = 'dm-pin is-go'
    pin.style.setProperty('--i', String(i))
    pin.innerHTML = PIN_HTML(id, ar ? arabic : en)
    box.append(pin)
    return { pin, id, name: ar ? arabic : en, at: ANCHORS[id], hide: false }
  })
  const copy = el.querySelector<HTMLElement>('.dm-copy')!
  const ctl = new AbortController()
  stopTraffic = () => ctl.abort()
  const skyTimer = window.setInterval(() => applySky(el, liveCity), 30000)
  ctl.signal.addEventListener('abort', () => clearInterval(skyTimer))
  // No need to draw a city nobody can see.
  const seen = new IntersectionObserver(([e]) => liveCity?.setVisible(e.isIntersecting))
  seen.observe(el)
  ctl.signal.addEventListener('abort', () => { seen.disconnect(); liveCity?.setVisible(true) })
  later(780, () => el.classList.add('is-title'))
  loadCity().then(city => {
    if (ctl.signal.aborted) return
    if (run !== busy) return
    liveCity = city
    if (import.meta.env.DEV) (window as unknown as { __city: City }).__city = city
    stage.prepend(city.canvas)
    applySky(el, city)
    city.drag.az = city.drag.el = 0
    // If the graphics card drops us, show the finished picture rather than a dead canvas.
    city.canvas.addEventListener('webglcontextlost', () => {
      forgetCity()
      if (el.isConnected) {
        const still = el.querySelector<HTMLImageElement>('.dm-still')!
        still.src = BASE + 'final.webp'
        el.classList.remove('is-live', 'is-waiting')
        el.classList.add('is-landed', 'is-title')
        city.canvas.remove()
      }
    }, { signal: ctl.signal })
    let popped = false
    let toScreen: ((p: [number, number, number]) => [number, number, boolean]) | null = null

    // The ride up the tower.
    const meter = el.querySelector<HTMLElement>('.dm-level')!, heightEl = el.querySelector<HTMLElement>('.dm-height')!
    const nameEl = el.querySelector<HTMLElement>('.dm-level-name')!, rail = el.querySelector<HTMLElement>('.dm-rail span')!
    const fact = el.querySelector<HTMLElement>('.dm-fact')!, tags = el.querySelector<HTMLElement>('.dm-tags')!
    let riding = false, leaving = false, shownFact = -1, shownMeter = '', lastInput = 0
    let tour: Tour | null = null
    const showFact = (i: number) => {
      shownFact = i
      fact.textContent = i < 0 || !tour ? '' : ar ? tour.facts[i][2] : tour.facts[i][1]
      if (i >= 0 && !reduce()) fact.animate([{ opacity: 0, translate: '0 16px', filter: 'blur(5px)' }, { opacity: 1, translate: '0 0', filter: 'blur(0)' }], { duration: 620, easing: 'cubic-bezier(.16,1,.3,1)' })
    }
    const updateRide = () => {
      if (!riding || !tour) return
      const r = city.ride
      if (!leaving && r.rate >= 0) r.rate = r.hold || performance.now() - lastInput < 1300 || r.target >= 1 ? 0 : tour.rate
      const m = tour.meter({ p: r.p, z: r.z, time: performance.now() / 1000 }, ar, n => NUM.format(n))
      const key = m.name + m.big + m.small
      if (key !== shownMeter) {
        shownMeter = key
        meter.textContent = m.big
        heightEl.textContent = m.small
        nameEl.textContent = m.name
      }
      rail.style.scale = `1 ${m.bar}`
      if (tour.labels && toScreen) {
        const on = !leaving && r.p >= tour.labels.from
        tags.classList.toggle('is-on', on)
        if (on) tour.labels.at.forEach(([x, y, z], i) => {
          const [sx, sy, front] = toScreen!([x, y, z])
          const tag = tags.children[i] as HTMLElement
          tag.style.visibility = front ? '' : 'hidden'
          tag.style.transform = `translate3d(${sx}px, ${sy}px, 0) translate(-50%, -50%)`
        })
      }
      let want = -1
      tour.facts.forEach(([at], i) => { if (r.p >= at) want = i })
      if (!leaving && want !== shownFact) showFact(want)
      if (leaving && r.p < 0.002) {
        r.p = r.target = r.rate = r.orbit = 0
        r.tour = null
        tour = null
        riding = leaving = false
        leaveRide = null
        el.classList.remove('is-ride', 'is-ride-out')
        el.removeAttribute('data-lenis-prevent')
        delete document.documentElement.dataset.dubaiRide
        showFact(-1)
        el.classList.remove('is-title')
        requestAnimationFrame(() => el.classList.add('is-title'))
        popPins(el)
      }
    }
    const enterRide = (id: string) => {
      if (riding || !popped || el.classList.contains('is-leaving')) return
      riding = true
      tour = TOURS[id]
      shownMeter = ''
      tags.classList.remove('is-on')
      tags.replaceChildren(...(tour.labels?.at ?? []).map(([, , , en, arabic]) => {
        const tag = document.createElement('span')
        tag.textContent = ar ? arabic : en
        return tag
      }))
      el.dataset.tour = id
      city.ride.tour = tour
      city.ride.orbit = 0
      lastInput = 0
      unpopPins(el)
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
      el.classList.add('is-ride')
      el.setAttribute('data-lenis-prevent', '')
      document.documentElement.dataset.dubaiRide = 'on'
      city.drag.az = city.drag.el = 0
      city.ride.target = 0.002
      city.ride.rate = tour.rate
      leaveRide = () => {
        if (leaving) return
        leaving = true
        el.classList.add('is-ride-out')
        showFact(-1)
        city.ride.rate = -0.52
      }
    }
    el.querySelector('.dm-back')!.addEventListener('click', () => leaveRide?.(), { signal: ctl.signal })
    el.addEventListener('wheel', e => {
      if (!riding || leaving) return
      e.preventDefault()
      e.stopPropagation()
      lastInput = performance.now()
      city.ride.rate = 0
      city.ride.target = Math.max(0.06, Math.min(1, city.ride.target + e.deltaY * 0.00032))
    }, { passive: false, signal: ctl.signal })
    window.addEventListener('keydown', e => {
      if (!riding || leaving || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return
      e.preventDefault()
      lastInput = performance.now()
      city.ride.rate = 0
      city.ride.target = Math.max(0.06, Math.min(1, city.ride.target + (e.key === 'ArrowDown' ? 0.04 : -0.04)))
    }, { signal: ctl.signal })
    for (const p of pins) {
      const go = p.pin.querySelector<HTMLElement>('.dm-pin-pop')!
      go.setAttribute('role', 'button')
      go.tabIndex = 0
      go.setAttribute('aria-label', ar ? `طِر إلى ${p.name}` : `Fly to ${p.name}`)
      go.addEventListener('click', () => enterRide(p.id), { signal: ctl.signal })
      go.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          enterRide(p.id)
        }
      }, { signal: ctl.signal })
    }
    // Is this point on screen over the tower itself? Then the tower can be clicked too.
    const overTower = (x: number, y: number) => {
      if (!toScreen) return false
      const [ax, ay] = toScreen([0, 0, 0.3]), [bx, by] = toScreen([0, 0, 8.2])
      const dx = bx - ax, dy = by - ay, q = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)))
      return Math.hypot(x - (ax + dx * q), y - (ay + dy * q)) < 16 + 30 * (1 - q)
    }

    city.start((project, t) => {
      toScreen = project
      updateRide()
      if (riding) return
      if (t > LAND - 0.25 && !popped && !el.classList.contains('is-leaving')) {
        popped = true
        el.classList.add('is-pins')
        popPins(el)
      }
      if (!popped) return
      const text = copy.offsetTop
      for (const p of pins) {
        const [x, y, front] = project(p.at)
        // A landmark that falls behind the words or just off the edge keeps its bubble: it waits at the nearest clear spot, so
        // all of them can always be reached.
        const W = el.clientWidth
        const hide = !front || x < -420 || x > W + 420 || y < -200 || y > text + 300
        if (hide !== p.hide) {
          p.hide = hide
          p.pin.style.visibility = hide ? 'hidden' : ''
        }
        p.pin.style.transform = `translate3d(${Math.max(84, Math.min(x, W - 84))}px, ${Math.max(150, Math.min(y, text - 34))}px, 0)`
      }
    })
    requestAnimationFrame(() => el.classList.remove('is-waiting'))
    void city.play(1)
    // Lean with the pointer, and drag to look around.
    let from: { x: number; y: number; az: number; el: number } | null = null
    let moved = 0
    el.addEventListener('pointermove', e => {
      const b = el.getBoundingClientRect()
      city.aim.x = ((e.clientX - b.left) / b.width - 0.5) * 2
      city.aim.y = ((e.clientY - b.top) / b.height - 0.5) * 2
      city.canvas.classList.toggle('is-over-tower', !from && !riding && popped && overTower(e.clientX - b.left, e.clientY - b.top))
      if (!from) return
      moved = Math.max(moved, Math.hypot(e.clientX - from.x, e.clientY - from.y))
      city.drag.az = Math.max(-55, Math.min(55, from.az - (e.clientX - from.x) * 0.14))
      city.drag.el = Math.max(-7, Math.min(32, from.el + (e.clientY - from.y) * 0.09))
    }, { signal: ctl.signal })
    city.canvas.addEventListener('pointerdown', e => {
      if (riding) return
      moved = 0
      from = { x: e.clientX, y: e.clientY, az: city.drag.az, el: city.drag.el }
      city.canvas.setPointerCapture(e.pointerId)
      city.canvas.classList.add('is-dragging')
    }, { signal: ctl.signal })
    const end = () => { from = null; city.canvas.classList.remove('is-dragging') }
    city.canvas.addEventListener('pointerup', e => {
      const clicked = from && moved < 6
      end()
      const b = el.getBoundingClientRect()
      if (clicked && overTower(e.clientX - b.left, e.clientY - b.top)) enterRide('burj_khalifa')
    }, { signal: ctl.signal })
    city.canvas.addEventListener('pointercancel', end, { signal: ctl.signal })
    el.dataset.ready = '1'
  }).catch(err => {
    // No live city after all: fall back to the finished picture rather than an empty hero.
    console.error(err)
    forgetCity()
    if (run !== busy) return
    el.querySelector<HTMLImageElement>('.dm-still')!.src = BASE + 'final.webp'
    el.classList.remove('is-live', 'is-waiting')
    el.classList.add('is-landed', 'is-title')
  })
}

export async function openDubai(trigger: Element) {
  if (open) return closeDubai()
  const hero = document.querySelector<HTMLElement>('.a-hero')
  if (!hero) return
  open = true
  const run = ++busy
  clearLater()
  warm()
  layer?.remove()
  const el = (layer = build(hero))
  const still = reduce()
  const video = el.querySelector<HTMLVideoElement>('.dm-video')!
  const img = el.querySelector<HTMLImageElement>('.dm-still')!
  const { x, y, R } = revealFrom(trigger, el)
  el.style.setProperty('--ox', `${x}px`)
  el.style.setProperty('--oy', `${y}px`)
  el.style.setProperty('--or', `${R}px`)
  applySky(el, null, useLive())

  document.documentElement.dataset.dubai = 'on'
  trigger.setAttribute('aria-expanded', 'true')
  // The top bar melts into the sky of the scene once the circle has reached it, and firms up again if the page scrolls.
  const bar = () => document.documentElement.style.setProperty('--dm-bar', String(Math.min(scrollY / 90, 1)))
  stopBar()
  bar()
  window.addEventListener('scroll', bar, { passive: true })
  stopBar = () => {
    window.removeEventListener('scroll', bar)
    delete document.documentElement.dataset.dubaiBar
    setDark(false)
  }
  later(still ? 0 : 480, () => { document.documentElement.dataset.dubaiBar = 'on' })
  window.dispatchEvent(new CustomEvent('hero:dubai', { detail: true }))
  copyOut(hero, true)
  el.classList.add('is-on')
  el.setAttribute('aria-hidden', 'false')

  if (still) {
    video.remove()
    img.src = BASE + 'final.webp'
    el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250 })
    el.classList.add('is-landed', 'is-title')
  } else if (useLive()) {
    video.remove()
    // While the city loads, show the flat day map, or just the night's colour after dark.
    if (!skyAt(dubaiNow()).dark) img.src = BASE + 'first.webp'
    el.animate([{ clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(${R}px at ${x}px ${y}px)` }],
      { duration: 1250, delay: 90, easing: SWEEP, fill: 'backwards' })
    el.querySelector<HTMLElement>('.dm-ring')!.animate(
      [{ width: '0px', height: '0px', opacity: 1 }, { width: `${R * 2}px`, height: `${R * 2}px`, opacity: 1, offset: 0.9 }, { width: `${R * 2}px`, height: `${R * 2}px`, opacity: 0 }],
      { duration: 1250, delay: 90, easing: SWEEP, fill: 'both' })
    runLive(el, run)
    el.querySelector<HTMLButtonElement>('.dm-close')?.focus({ preventScroll: true })
    return
  } else {
    img.src = BASE + 'final.webp'
    video.poster = BASE + 'first.webp'
    video.preload = 'auto'
    video.src = BASE + 'fly.mp4'
    el.animate([{ clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(${R}px at ${x}px ${y}px)` }],
      { duration: 1250, delay: 90, easing: SWEEP, fill: 'backwards' })
    el.querySelector<HTMLElement>('.dm-ring')!.animate(
      [{ width: '0px', height: '0px', opacity: 1 }, { width: `${R * 2}px`, height: `${R * 2}px`, opacity: 1, offset: 0.9 }, { width: `${R * 2}px`, height: `${R * 2}px`, opacity: 0 }],
      { duration: 1250, delay: 90, easing: SWEEP, fill: 'both' })
    // The video may still be on its way: if it can't start soon, go straight to the landed picture.
    const land = () => {
      if (run !== busy) return
      el.classList.add('is-landed')
      video.classList.add('is-done')
      later(600, () => video.remove())
    }
    video.addEventListener('ended', land, { once: true })
    video.addEventListener('error', land, { once: true })
    video.currentTime = 0
    later(120, () => video.play().catch(land))
    later(2600, () => { if (video.paused || video.currentTime === 0) land() })
    later(780, () => el.classList.add('is-title'))
  }

  await loadData()
  if (run !== busy) return
  placePins(el)
  const onResize = () => placePins(el)
  window.addEventListener('resize', onResize)
  later(still ? 0 : 3750, () => {
    el.classList.add('is-pins')
    popPins(el)
    if (!still) stopTraffic = traffic(el)
  })
  const stop = stopTraffic
  stopTraffic = () => {
    stop()
    window.removeEventListener('resize', onResize)
  }
  el.querySelector<HTMLButtonElement>('.dm-close')?.focus({ preventScroll: true })
  el.dataset.ready = '1'
}

export function closeDubai() {
  if (!open || !layer) return
  if (leaveRide) return leaveRide()
  open = false
  const run = ++busy
  clearLater()
  stopTraffic()
  stopTraffic = () => {}
  const el = layer
  const hero = document.querySelector<HTMLElement>('.a-hero')!
  const trigger = hero.querySelector<HTMLElement>('.a-dubai')
  const still = reduce()
  el.classList.add('is-leaving')
  el.classList.remove('is-title')
  unpopPins(el)
  later(300, () => el.classList.remove('is-pins'))
  delete document.documentElement.dataset.dubai
  later(still ? 0 : 560, stopBar)
  trigger?.setAttribute('aria-expanded', 'false')
  const city = el.classList.contains('is-live') ? liveCity : null
  const done = () => {
    if (run !== busy) return
    city?.stop()
    el.remove()
    if (layer === el) layer = null
  }
  later(still ? 0 : 340, () => {
    copyOut(hero, false)
    window.dispatchEvent(new CustomEvent('hero:dubai', { detail: false }))
  })
  if (still) return done()
  // Live, the whole move runs backwards: the towers sink and the camera climbs back over the flat map as the circle closes.
  void city?.play(-DONE / 1.45)
  const o = trigger ? revealFrom(trigger, el) : { x: el.clientWidth / 2, y: el.clientHeight / 2, R: el.clientWidth }
  el.animate([{ clipPath: `circle(${o.R}px at ${o.x}px ${o.y}px)` }, { clipPath: `circle(0px at ${o.x}px ${o.y}px)` }],
    { duration: city ? 1000 : 900, delay: city ? 620 : 130, easing: SWEEP, fill: 'both' }).onfinish = done
  trigger?.focus({ preventScroll: true })
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && open && !document.querySelector('dialog[open]')) closeDubai()
})
