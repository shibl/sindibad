// The hero's 3D art (hero-concepts branch): all six rendered concepts take turns in the hero. The arrow buttons,
// the keyboard's arrow keys or a swipe swap them, and each swap plays like a game: the old piece winds up and gets
// flung away, the new one drops in, lands with a squash and a puff of dust. `?concept=<id>` starts on that one.
// Loaded by entry-client.tsx.
import { portalForPhone, portalPath, qrImage } from './qr'

type Ctx = {
  hero: HTMLElement // the hero section
  slot: HTMLElement // the square box the concept draws into
  signal: AbortSignal // aborted the moment the concept starts to leave
  ready: Promise<void> // resolves once the entrance has landed, so the box is at its real size and place
  overlay: (cls: string) => HTMLElement // a hero-wide layer that fades in on landing and leaves with the concept
}
type Concept = {
  alt: [string, string] // English, Arabic
  box?: { w?: string; max?: string; bottom?: string; end?: string }
  assets: string[]
  mount: (ctx: Ctx) => void
}

const c = (name: string) => `/concepts/${name}.png`
const still = (name: string, alt: [string, string], bottom: string): Concept => ({
  alt,
  box: { bottom },
  assets: [c(name)],
  mount: ({ slot }) => img(slot, c(name)),
})
const concepts: Record<string, Concept> = {
  window: {
    alt: ['A stone arch opening onto a dusk world, with a glowing jellyfish floating out of it',
      'قوس حجري يطلّ على عالم عند الغسق، وقنديل بحر مضيء يطفو خارجاً منه'],
    box: { bottom: '34px' },
    assets: ['frame', 'sky', 'far', 'near', 'jelly', 'mask'].map(n => c(`window-${n}`)),
    mount: otherWorlds,
  },
  level: {
    alt: ['A floating island with a goal flag', 'جزيرة طائرة عليها راية الوصول'],
    box: { bottom: '30px' },
    assets: ['island', 'flag', 'runner', 'coin'].map(n => c(`level-${n}`)),
    mount: headlineLevel,
  },
  forty: {
    alt: ['A treasure chest drawn in five eras of video games, from 1986 to today',
      'صندوق كنز مرسوم بأساليب خمس حقب من ألعاب الفيديو، من ١٩٨٦ حتى اليوم'],
    box: { w: '49%', max: '720px', bottom: '36px', end: '1.5%' },
    assets: ['px8', 'px16', 'ps1', 'cel', 'modern'].flatMap(n => [c(`forty-${n}`), c(`forty-sil-${n}`)]),
    mount: fortyYears,
  },
  claw: {
    alt: ['A claw machine full of colourful prizes', 'آلة ملقط مليئة بالجوائز الملوّنة'],
    box: { bottom: '40px' },
    assets: [c('claw'), '/concepts/claw-sign.webp'],
    mount: clawMachine,
  },
  press: {
    alt: ['A big pink button under a clear safety cover', 'زر وردي كبير تحت غطاء أمان شفاف'],
    box: { bottom: '60px' },
    assets: [c('press')],
    mount: dontPress,
  },
  pet: still('pet', ['A furry studio mascot resting on a velvet cushion', 'تميمة الاستوديو الفروية مستلقية على وسادة مخملية'], '50px'),
}
const ORDER = ['window', 'level', 'forty', 'claw', 'press', 'pet']

const styled = new Set<string>()
function css(key: string, text: string) {
  if (styled.has(key)) return
  styled.add(key)
  document.head.append(Object.assign(document.createElement('style'), { textContent: text }))
}
function el<K extends keyof HTMLElementTagNameMap>(tag: K, parent: Element, cls = '') {
  const e = parent.appendChild(document.createElement(tag))
  if (cls) e.className = cls
  return e
}
function img(parent: Element, src: string, cls = '') {
  const i = el('img', parent, cls)
  i.src = src
  i.alt = ''
  return i
}
// requestAnimationFrame loop that stops when the concept leaves.
function loop(signal: AbortSignal, fn: (now: number) => void) {
  const step = (now: number) => {
    if (signal.aborted) return
    fn(now)
    requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

// "Forty years in one scroll": the same chest rendered in five eras of games, shown as diagonal
// slices. The eras arrive one by one on load, the slice under the pointer widens, and scrolling
// through the hero sweeps the whole chest forward to today.
function fortyYears({ hero, slot, signal, ready }: Ctx) {
  const eras = [
    { name: 'px8', year: '1986', pixel: true },
    { name: 'px16', year: '1991', pixel: true },
    { name: 'ps1', year: '1996', pixel: true },
    { name: 'cel', year: '2002', pixel: false },
    { name: 'modern', year: '2026', pixel: false },
  ]
  const n = eras.length
  // The chest spans about 16%–80% of the frame across. Seams lean right by SLANT at the top.
  const L = 0.16, R = 0.8, SLANT = 0.07
  const rest = Array.from({ length: n - 1 }, (_, i) => (i + 1) / n)

  css('forty', `
    .forty { position: absolute; inset: 0; }
    .forty img { position: absolute; inset: 0; width: 100%; height: 100%; }
    .forty img.px { image-rendering: pixelated; }
    .forty svg { position: absolute; inset: 0; width: 100%; height: 100%; mask-size: 100% 100%; mask-composite: add; }
    .forty svg { filter: drop-shadow(0 0 5px rgba(255, 255, 255, .9)); }
    .forty line { stroke: #fff; stroke-width: 1.6; vector-effect: non-scaling-stroke; }
    .forty-years { position: absolute; left: 0; right: 0; top: 93%; height: 2.4em;
      font: 700 clamp(9px, 2.3cqw, 15px)/1 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .08em; color: #004646; }
    .forty-years i { position: absolute; top: -13px; height: 1px; background: currentColor; opacity: .22; }
    .forty-years b { position: absolute; top: -17px; width: 1px; height: 9px; margin-left: -.5px; background: currentColor; opacity: .45; }
    .forty-years span { position: absolute; top: 0; transform: translateX(-50%); padding: 5px 8px 4px;
      border-radius: 999px; transition: color .25s, background-color .25s; white-space: nowrap; }
    .forty-years span { padding: .33em .53em .27em; }
    .forty-years span.on { color: #fff; background: #fa2a6f; }
  `)
  const wrap = el('div', slot, 'forty')

  const layers = eras.map(e => {
    const img = document.createElement('img')
    img.src = `/concepts/forty-${e.name}.png`
    img.alt = ''
    if (e.pixel) img.className = 'px'
    wrap.append(img)
    return img
  })
  const svgNS = 'http://www.w3.org/2000/svg'
  // One seam between each pair of eras, shown only where either of the two has solid chest.
  const seams = rest.map((_, i) => {
    const svg = document.createElementNS(svgNS, 'svg')
    svg.setAttribute('viewBox', '0 0 100 100')
    svg.setAttribute('preserveAspectRatio', 'none')
    svg.style.maskImage = [eras[i], eras[i + 1]].map(e => `url(/concepts/forty-sil-${e.name}.png)`).join(', ')
    wrap.append(svg)
    return svg.appendChild(document.createElementNS(svgNS, 'line'))
  })
  const years = document.createElement('div')
  years.className = 'forty-years'
  const rule = years.appendChild(document.createElement('i'))
  const ticks = rest.map(() => years.appendChild(document.createElement('b')))
  const labels = eras.map(e => years.appendChild(Object.assign(document.createElement('span'), { textContent: e.year })))
  wrap.append(years)

  const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3)
  // Preview flags for still screenshots: &still skips the intro, &t=<ms> freezes it at that time,
  // &focus=<0..1> fakes the pointer, &sweep=<0..1> fakes the scroll.
  const q = new URLSearchParams(location.search)
  const fixedT = q.has('t') ? Number(q.get('t')) : null
  const still = q.has('still') || fixedT !== null || matchMedia('(prefers-reduced-motion: reduce)').matches
  // The eras start rolling in once the chest has landed (it lands in 8-bit).
  let t0 = Infinity
  ready.then(() => (t0 = performance.now()))
  let focus: number | null = q.has('focus') ? Number(q.get('focus')) : null
  const cur = rest.map(() => 1)

  hero.addEventListener('pointermove', ev => {
    const r = wrap.getBoundingClientRect()
    focus = ((ev.clientX - r.left) / r.width - L) / (R - L)
  }, { signal })
  hero.addEventListener('pointerleave', () => (focus = null), { signal })

  loop(signal, now => {
    // Resting seams, or seams pushed apart around the slice under the pointer.
    let target = rest
    let peak = 0
    if (focus !== null) {
      const w = eras.map((_, i) => 1 + 2.4 * Math.exp(-(((focus! - (i + 0.5) / n) / 0.17) ** 2)))
      peak = Math.max(...w)
      const sum = w.reduce((a, b) => a + b)
      let acc = 0
      target = rest.map((_, i) => (acc += w[i]) / sum)
    }
    // Scrolling through the hero carries everything forward to today.
    const sweep = q.has('sweep') ? Number(q.get('sweep')) : ease(scrollY / (hero.offsetHeight * 0.55))
    // On load, each era rolls in from the right in turn.
    const intro = ((fixedT ?? (still ? 1e5 : now - t0)) - 350) / 900
    rest.forEach((_, i) => {
      const enter = ease(intro - i * 0.42)
      const goal = (1 - enter) * 1.45 + enter * (target[i] * (1 - sweep) - sweep * 0.3)
      cur[i] += (goal - cur[i]) * (enter < 1 || still ? 1 : 0.14)
    })
    const x = (s: number) => (L + s * (R - L)) * 100
    const k = SLANT * 100
    layers.forEach((img, i) => {
      const a = i === 0 ? -60 : x(cur[i - 1])
      const b = i === n - 1 ? 160 : x(cur[i])
      img.style.clipPath = `polygon(${a + k}% 0, ${b + k}% 0, ${b - k}% 100%, ${a - k}% 100%)`
    })
    seams.forEach((ln, i) => {
      ln.setAttribute('x1', `${x(cur[i]) + k}`); ln.setAttribute('y1', '0')
      ln.setAttribute('x2', `${x(cur[i]) - k}`); ln.setAttribute('y2', '100')
    })
    // A ruler under the chest: ticks where the seams land, a year under the middle of each
    // visible slice, and the widest slice highlighted while the pointer is near.
    const edges = [-0.25, ...cur, 1.25].map(s => Math.min(R + 0.02, Math.max(L - 0.02, L + s * (R - L))))
    const lean = SLANT * 0.86
    rule.style.left = `${(edges[0] - lean) * 100}%`
    rule.style.width = `${(edges[n] - edges[0]) * 100}%`
    ticks.forEach((tk, i) => {
      tk.style.left = `${(edges[i + 1] - lean) * 100}%`
      tk.style.opacity = `${Math.min(edges[i + 1] - edges[0], edges[n] - edges[i + 1]) > 0.012 ? 0.45 : 0}`
    })
    let widest = 0
    labels.forEach((lab, i) => {
      const w = edges[i + 1] - edges[i]
      lab.style.left = `${((edges[i] + edges[i + 1]) / 2 - lean) * 100}%`
      lab.style.opacity = `${Math.min(1, Math.max(0, (w - 0.075) / 0.03))}`
      if (w > edges[widest + 1] - edges[widest]) widest = i
    })
    labels.forEach((lab, i) => lab.classList.toggle('on', peak > 1.6 && i === widest))
  })
}

// "A window to other worlds": an arch on the hero floor that opens onto a dusk world. The world is three
// depth layers masked to the opening, so it shifts with the pointer like a view through a real window; the
// jellyfish that got out floats in front, and spores keep drifting out after it.
// The portal opens in augmented reality on the portal page. On a computer it offers a QR code to scan with a phone. A phone can't
// scan its own screen, so there the portal itself is the button. Only the code's frame animates, never its modules, so it stays
// readable to a camera.
function portalWay(slot: HTMLElement) {
  css('ow-way', `
    .ow-card { display: none; position: absolute; z-index: 2; left: 70.5%; top: 14%; width: clamp(176px, 14vw, 224px);
      pointer-events: auto; color: var(--a-ink); text-align: center; text-decoration: none;
      animation: ow-card-float 5s ease-in-out infinite; transition: scale 0.25s cubic-bezier(0.3, 1.7, 0.5, 1); }
    .ow-card:hover { scale: 1.04; }
    .ow-card:focus-visible { outline: 3px solid var(--a-pink); outline-offset: 5px; border-radius: 24px; }
    @keyframes ow-card-float { 50% { translate: 0 -5px; } }
    .ow-card-pop { position: relative; display: block; animation: ow-pop 0.6s cubic-bezier(0.2, 1.5, 0.4, 1) 0.5s backwards; }
    @keyframes ow-pop { from { scale: 0.3; opacity: 0; } }
    .ow-card-tail { position: absolute; left: -8px; top: 42%; width: 22px; height: 22px; rotate: 45deg; border-radius: 4px; background: #ffd65c; }
    .ow-card-frame { position: relative; display: block; padding: 5px; overflow: hidden; isolation: isolate; border-radius: 24px;
      box-shadow: 0 16px 26px rgb(0 70 70 / 0.26), 0 0 26px rgb(255 214 92 / 0.55); }
    .ow-card-frame::before { content: ''; position: absolute; z-index: -1; left: 50%; top: 50%; width: 170%; aspect-ratio: 1; translate: -50% -50%;
      background: conic-gradient(#ffd65c, #fa2a6f, #7b4fd6, #27c4b4, #ffd65c); animation: ow-card-spin 4s linear infinite; }
    @keyframes ow-card-spin { to { rotate: 360deg; } }
    .ow-card-in { display: block; padding: 32px 4px 10px; border-radius: 19px; background: #fff8ea; }
    .ow-card img { display: block; width: 100%; height: auto; }
    .ow-card-ribbon { position: absolute; z-index: 1; left: 50%; top: -22px; translate: -50% 0; rotate: -2deg; width: calc(100% + 10px); padding: 0.42em 0.7em 0.48em;
      border-radius: 10px; text-wrap: balance; color: #fff; background: linear-gradient(180deg, #ff5f97, #fa2a6f 60%, #e01c64);
      box-shadow: 0 0 0 3px #ffd65c, 0 6px 0 1px #a80f47; font: 800 clamp(14px, 1.1vw, 17px)/1.12 var(--a-heading); text-shadow: 0 2px 0 #a80f47; }
    .ow-card small { display: block; margin-top: 1px; font: 600 clamp(11px, 0.85vw, 13px)/1.3 var(--a-body); }
    .ow-spark { position: absolute; width: 1em; height: 1em; pointer-events: none; background: #ffc531;
      clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%); animation: ow-twinkle 1.8s ease-in-out infinite; }
    @keyframes ow-twinkle { 0%, 100% { scale: 0.2; opacity: 0; rotate: 0deg; } 50% { scale: 1; opacity: 1; rotate: 45deg; } }
    .ow-card .ow-spark:nth-of-type(1) { right: -15px; top: -8px; font-size: 24px; }
    .ow-card .ow-spark:nth-of-type(2) { left: -17px; bottom: 16%; font-size: 17px; animation-delay: -0.6s; }
    .ow-card .ow-spark:nth-of-type(3) { right: -13px; bottom: -8px; font-size: 19px; animation-delay: -1.2s; }

    .ow-go { position: absolute; z-index: 2; left: 25%; top: 14%; width: 43.5%; height: 71%; pointer-events: auto; text-decoration: none;
      -webkit-tap-highlight-color: transparent; }
    .ow-go:focus-visible { outline: none; }
    .ow-go:focus-visible .ow-go-face { outline: 3px solid #fff; outline-offset: 3px; }
    .ow-go-ring { position: absolute; left: 20%; top: 18.3%; width: 59%; height: 72.5%; border: 3px solid #ffd65c; border-radius: 999px 999px 0 0;
      transform-origin: 50% 100%; animation: ow-go-ring 1.6s ease-out infinite; }
    @keyframes ow-go-ring { from { scale: 0.92; opacity: 1; } to { scale: 1.22; opacity: 0; } }
    .ow-go-btn { position: absolute; left: 50%; bottom: -27%; translate: -50% 0; display: block; padding-bottom: 7px; border-radius: 18px; white-space: nowrap;
      background: #a80f47; box-shadow: 0 12px 18px rgb(0 70 70 / 0.34); animation: ow-go-hop 1.5s ease-in-out infinite; }
    @keyframes ow-go-hop { 0%, 55%, 100% { transform: none; } 18% { transform: translateY(-9px) rotate(-2.5deg); } 36% { transform: translateY(0) rotate(2deg) scale(1.05, 0.96); } }
    .ow-go-face { position: relative; display: block; overflow: hidden; padding: 0.5em 1em 0.56em; border: 3px solid #ffd65c; border-radius: 18px; color: #fff;
      background: linear-gradient(180deg, #ff77a8, #fa2a6f 55%, #e01c64); font: 800 clamp(21px, 6vw, 30px)/1 var(--a-heading); text-shadow: 0 2px 0 #a80f47; }
    .ow-go-face::before { content: ''; position: absolute; inset: 3px 8px auto; height: 36%; border-radius: 12px;
      background: linear-gradient(180deg, rgb(255 255 255 / 0.5), rgb(255 255 255 / 0)); }
    .ow-go-face::after { content: ''; position: absolute; inset: -20% auto -20% -60%; width: 40%; rotate: 18deg;
      background: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.85), transparent); animation: ow-go-sweep 1.9s ease-in-out infinite; }
    @keyframes ow-go-sweep { 0% { left: -60%; } 70%, 100% { left: 130%; } }
    .ow-go:active .ow-go-btn { padding-bottom: 2px; translate: -50% 5px; animation: none; }
    .ow-go-hand { position: absolute; left: 66%; bottom: -49%; width: clamp(36px, 11vw, 48px); pointer-events: none; transform-origin: 40% 10%;
      animation: ow-go-tap 1.5s ease-in-out infinite; }
    @keyframes ow-go-tap { 0%, 55%, 100% { transform: translate(0, 0); } 18% { transform: translate(5px, 12px) rotate(4deg); } 36% { transform: translate(-3px, -4px) scale(0.92); } }
    .ow-go .ow-spark:nth-of-type(1) { left: 10%; top: 8%; font-size: 22px; }
    .ow-go .ow-spark:nth-of-type(2) { right: 6%; top: 40%; font-size: 16px; animation-delay: -0.6s; }
    .ow-go .ow-spark:nth-of-type(3) { left: 2%; top: 58%; font-size: 18px; animation-delay: -1.2s; }

    @media (hover: hover) and (pointer: fine) and (min-width: 1025px) {
      .ow-card { display: block; }
      .ow-go { display: none; }
    }
    /* Arabic's description runs wider, so on smaller screens the card sits higher to clear it. */
    @media (max-width: 1180px) {
      [dir='rtl'] .ow-card { top: -4%; }
    }
    /* Where the button can't stand clear below the portal without reaching the slide controls, it stands on the portal's step. */
    @media (min-width: 769px), (max-height: 760px) {
      .ow-go-btn { bottom: -12%; }
      .ow-go-face { font-size: clamp(20px, 2vw, 24px); }
      .ow-go-hand { left: 90%; bottom: -14%; width: 38px; rotate: -32deg; }
    }
    @media (prefers-reduced-motion: reduce) {
      .ow-card, .ow-card-pop, .ow-card-frame::before, .ow-go-ring, .ow-go-btn, .ow-go-hand, .ow-spark { animation: none; }
      .ow-go-face::after { display: none; }
      .ow-go-ring { opacity: 0.8; }
    }
  `)
  const ar = (document.documentElement.lang || '').startsWith('ar')
  const link = (cls: string) => {
    const a = el('a', slot, cls)
    a.href = portalPath(ar)
    a.setAttribute('aria-label', ar ? 'استكشف البوابة بالواقع المعزّز' : 'Explore the portal in augmented reality')
    return a
  }
  // A picture can't hold a link for assistive technology, so this slot is a labelled group instead.
  slot.setAttribute('role', 'group')

  // On a computer a click opens the page in its own tab, so this one stays put.
  const cardLink = link('ow-card')
  cardLink.target = '_blank'
  cardLink.rel = 'noopener'
  const card = el('span', cardLink, 'ow-card-pop')
  el('span', card, 'ow-card-tail')
  for (let i = 0; i < 3; i++) el('i', card, 'ow-spark')
  const frame = el('span', card, 'ow-card-frame')
  const face = el('span', frame, 'ow-card-in')
  img(face, qrImage(portalForPhone(ar))).alt = ar ? 'رمز QR لبوابة الواقع المعزّز' : 'QR code for the portal in augmented reality'
  const words = el('small', face)
  words.append(ar ? 'وجّه كاميرا هاتفك هنا' : 'Point your phone here')
  el('span', card, 'ow-card-ribbon').textContent = ar ? 'امسح لتستكشف بالواقع المعزّز!' : 'Scan to explore in augmented reality!'

  const go = link('ow-go')
  el('span', go, 'ow-go-ring')
  for (let i = 0; i < 3; i++) el('i', go, 'ow-spark')
  el('span', el('span', go, 'ow-go-btn'), 'ow-go-face').textContent = ar ? 'اضغطني!' : 'Click me!'
  el('span', go, 'ow-go-hand').innerHTML =
    '<svg viewBox="0 0 48 60" aria-hidden="true"><path d="M19 7a5.5 5.5 0 0 1 11 0v19l9.500 2c4.500 1 6.500 3.500 6 8l-1 10c-.7 6-5 10-11 10H23c-4 0-7-1.800-9-5L4 37c-2.200-3.500 1.800-7.500 5.500-5L19 38z" fill="#fff" stroke="#004646" stroke-width="3.500" stroke-linejoin="round"/><path d="M30 33v9M37.500 34v8" stroke="#004646" stroke-width="3" stroke-linecap="round"/></svg>'
}

function otherWorlds({ hero, slot, signal }: Ctx) {
  css('ow', `
    .ow { position: absolute; inset: 0; }
    .ow > img, .ow-world, .ow-world img { position: absolute; inset: 0; width: 100%; height: 100%; }
    .ow-world { -webkit-mask: url(/concepts/window-mask.png) center / 100% 100% no-repeat;
      mask: url(/concepts/window-mask.png) center / 100% 100% no-repeat; }
    .ow img { will-change: transform; }
    .ow .ow-jelly { animation: ow-bob 6.5s ease-in-out infinite; }
    @keyframes ow-bob { 0%, 100% { translate: 0 0; rotate: 0deg; } 50% { translate: -0.6% -2.2%; rotate: -2deg; } }
    .ow-spore { position: absolute; width: 5px; height: 5px; margin: -2.5px; border-radius: 50%; background: #f2feff;
      box-shadow: 0 0 6px 2px rgba(150, 245, 255, .85), 0 0 14px 4px rgba(255, 140, 220, .35);
      opacity: 0; animation: ow-spore var(--d) linear var(--delay) infinite; }
    @keyframes ow-spore {
      0% { opacity: 0; transform: translate(0, 0) scale(.6); }
      15% { opacity: 1; }
      80% { opacity: .9; }
      100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(1.1); } }
    @media (prefers-reduced-motion: reduce) { .ow .ow-jelly, .ow-spore { animation: none; } }
  `)
  const wrap = el('div', slot, 'ow')
  const layer = (name: string, parent: HTMLElement, cls = '') => img(parent, `/concepts/window-${name}.png`, cls)
  const world = el('div', wrap, 'ow-world')
  // How far each layer moves (in % of the frame) when the pointer goes from the centre to an edge.
  const layers: [HTMLImageElement, number, number][] = [
    [layer('sky', world), 2.4, 1.3],
    [layer('far', world), 1.3, 0.7],
    [layer('near', world), 0.35, 0.2],
    [layer('frame', wrap), 0, 0],
    [layer('jelly', wrap, 'ow-jelly'), -1.2, -0.7],
  ]
  // Spores rise out of the opening and drift up and left, after the jellyfish.
  for (let k = 0; k < 9; k++) {
    const sp = el('i', wrap, 'ow-spore')
    sp.style.left = `${40 + Math.random() * 18}%`
    sp.style.top = `${30 + Math.random() * 26}%`
    sp.style.setProperty('--dx', `${-60 - Math.random() * 90}px`)
    sp.style.setProperty('--dy', `${-70 - Math.random() * 90}px`)
    sp.style.setProperty('--d', `${5 + Math.random() * 4}s`)
    sp.style.setProperty('--delay', `${-Math.random() * 8}s`)
    if (Math.random() < 0.4) sp.style.width = sp.style.height = '3px'
  }
  portalWay(slot)

  const q = new URLSearchParams(location.search)
  const aim = { x: Number(q.get('px') ?? 0), y: Number(q.get('py') ?? 0) }
  const cur = { ...aim }
  hero.addEventListener('pointermove', ev => {
    const r = wrap.getBoundingClientRect()
    aim.x = Math.max(-1, Math.min(1, (ev.clientX - (r.left + r.width / 2)) / (r.width * 0.9)))
    aim.y = Math.max(-1, Math.min(1, (ev.clientY - (r.top + r.height / 2)) / (r.height * 0.9)))
  }, { signal })
  hero.addEventListener('pointerleave', () => ((aim.x = 0), (aim.y = 0)), { signal })
  loop(signal, () => {
    cur.x += (aim.x - cur.x) * 0.08
    cur.y += (aim.y - cur.y) * 0.08
    for (const [el, mx, my] of layers) {
      if (mx || my) el.style.transform = `translate(${cur.x * mx}%, ${cur.y * my}%)`
    }
  })
}

// "The headline is a level": the headline's real letter shapes, in whatever language is showing, become the
// ground. A little runner hops over ascenders and i-dots, picks up coins at the top of its jumps, zig-zags down
// the lines, then leaps from the last letter onto the goal island and the flag goes up. Click to make it hop.
// Preview flags: &t=<ms> freezes at that moment of the loop, &debug draws the ground it reads from the text.
function headlineLevel({ hero, slot, signal, ready, overlay }: Ctx) {
  const q = new URLSearchParams(location.search)
  const fixed = q.has('t') ? Number(q.get('t')) / 1000 : null
  const debug = q.has('debug')
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  // From the renders: where the feet sit in a runner frame, the landing spot and flag on the island (fractions).
  const FEET = 0.8639
  const LAND = { x: 0.4355, y: 0.457 }
  const FLAG = { x: 0.628, y: 0.125, drop: 0.2 }
  const [JUMP, FALL, CHEER, IDLE] = [8, 9, 10, 11]
  const COLORS = ['#fa2a6f', '#ffc414', '#1fc8f5', '#3fbf5a', '#ffffff', '#0f5d5a', '#ff8a3d']

  css('lv', `
    .lv-art { position: absolute; inset: 0; }
    .lv-art img { position: absolute; inset: 0; width: 100%; height: 100%; }
    .lv-flag { transition: translate 1.1s cubic-bezier(.25, 1.35, .45, 1); }
    .lv-flag.down { translate: 0 ${FLAG.drop * 100}%; transition: none; }
    .lv-flag.wave { transform-origin: ${FLAG.x * 100}% ${FLAG.y * 100}%; animation: lv-wave 1.5s ease-in-out infinite; }
    @keyframes lv-wave { 0%, 100% { transform: none; } 50% { transform: skewY(-2.5deg) scaleX(.95); } }
    .lv { position: absolute; inset: 0; pointer-events: none; z-index: 2; }
    .lv > * { position: absolute; left: 0; top: 0; }
    .lv-runner { background: url(/concepts/level-runner.png) 0 0 / auto 100% no-repeat; transform-origin: 50% 58%;
      will-change: transform; }
    .lv-coin { background: url(/concepts/level-coin.png) 0 0 / auto 100% no-repeat;
      animation: lv-spin .8s steps(8) infinite; filter: drop-shadow(0 2px 3px rgba(150, 90, 0, .25)); }
    @keyframes lv-spin { to { background-position-x: calc(var(--s) * -8); } }
    .lv-fx { border-radius: 50%; }
    .lv .lv-hud { left: auto; top: 28px; inset-inline-end: 6%; display: flex; align-items: center; gap: 8px;
      padding: 7px 18px 7px 8px; border-radius: 999px; background: #fff; color: #0b5552;
      font: 700 24px/1 var(--a-heading, sans-serif); box-shadow: 0 5px 0 rgba(11, 85, 82, .1); }
    .lv-hud i { width: 32px; height: 32px; background: url(/concepts/level-coin.png) 0 0 / auto 100% no-repeat; }
    .lv-hud b { display: inline-block; min-width: 1.2em; font-variant-numeric: tabular-nums; }
    .lv svg { overflow: visible; }
    @media (max-width: 768px) {
      .lv .lv-hud { top: 8px; gap: 5px; padding: 4px 12px 4px 5px; font-size: 16px; }
      .lv-hud i { width: 22px; height: 22px; }
    }
    @media (prefers-reduced-motion: reduce) { .lv-coin, .lv-flag.wave { animation: none; } }
  `)
  const h1 = hero.querySelector('h1')
  if (!h1) return
  const wrap = el('div', slot, 'lv-art')
  const add = <K extends keyof HTMLElementTagNameMap>(tag: K, parent: HTMLElement, cls = '') => {
    const el = parent.appendChild(document.createElement(tag))
    el.className = cls
    return el
  }
  const island = add('img', wrap)
  island.src = '/concepts/level-island.png'
  island.alt = ''
  const flag = add('img', wrap, 'lv-flag wave down')
  flag.src = '/concepts/level-flag.png'
  flag.alt = ''
  const layer = overlay('lv')
  layer.setAttribute('aria-hidden', 'true')
  const hud = add('div', layer, 'lv-hud')
  hud.innerHTML = '<i></i><span>×</span><b></b>'
  const hudN = hud.querySelector('b') as HTMLElement
  const fmt = new Intl.NumberFormat(document.documentElement.lang || undefined)
  const runner = add('div', layer, 'lv-runner')

  type Line = { ox: number; ground: Float32Array; bottom: Float32Array; start: number; end: number }
  type Coin = { el: HTMLElement; x: number; y: number; t: number; anim?: Animation }
  type Ev = { t: number; kind: 'puff' | 'dust' | 'goal'; x: number; y: number }
  let X: number[] = [], Y: number[] = [], F: number[] = [], D: number[] = [], R: number[] = [], W: number[] = []
  let SC: number[] = []
  let T = 1, goalT = 0, fs = 120, S = 74, grav = 1800, events: Ev[] = [], coins: Coin[] = []
  let box = { x: 0, y: 0, w: 1, h: 1 }
  let debugSvg: SVGSVGElement | null = null
  const bob = (abs: number) => Math.sin((abs / 5.5) * Math.PI * 2) * box.h * 0.01

  // Reads the top edge of the ink in each pixel column of every visual line of the headline, by drawing the
  // words on a canvas exactly where the page put them. Works for any script, including wrapped lines.
  const measure = (hr: DOMRect): Line[] => {
    const cs = getComputedStyle(h1)
    const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
    ctx.font = font
    const ascent = ctx.measureText('Hg').fontBoundingBoxAscent
    const words: { text: string; r: DOMRect }[] = []
    const range = document.createRange()
    const walker = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      for (const m of (n.textContent ?? '').matchAll(/\S+/g)) {
        range.setStart(n, m.index ?? 0)
        range.setEnd(n, (m.index ?? 0) + m[0].length)
        const r = range.getBoundingClientRect()
        if (r.width) words.push({ text: m[0], r })
      }
    }
    const rows: { top: number; words: typeof words }[] = []
    for (const w of words) {
      const row = rows.find(r => Math.abs(r.top - w.r.top) < fs * 0.3)
      if (row) row.words.push(w)
      else rows.push({ top: w.r.top, words: [w] })
    }
    rows.sort((a, b) => a.top - b.top)
    const pad = Math.ceil(fs * 0.12)
    const foot = Math.round(fs * 0.08)
    return rows.map(row => {
      const left = Math.min(...row.words.map(w => w.r.left))
      const right = Math.max(...row.words.map(w => w.r.right))
      const w = Math.ceil(right - left) + pad * 2
      const base = Math.ceil(ascent) + pad
      const h = base + Math.ceil(fs * 0.4)
      canvas.width = w
      canvas.height = h
      ctx.font = font
      ctx.direction = cs.direction === 'rtl' ? 'rtl' : 'ltr'
      ;(ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = cs.letterSpacing
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      for (const wd of row.words) ctx.fillText(wd.text, wd.r.left - left + pad, base)
      const px = ctx.getImageData(0, 0, w, h).data
      const top = new Float32Array(w).fill(Infinity)
      const bottom = new Float32Array(w).fill(-Infinity)
      for (let x = 0; x < w; x++)
        for (let y = 0; y < h; y++)
          if (px[(y * w + x) * 4 + 3] > 110) {
            if (top[x] === Infinity) top[x] = y
            bottom[x] = y
          }
      const baseY = row.top + ascent - hr.top
      for (let x = 0; x < w; x++) bottom[x] += baseY - base
      // The runner stands on the highest ink under either half of its feet.
      const ground = new Float32Array(w)
      for (let x = 0; x < w; x++) {
        let m = Infinity
        for (let k = Math.max(0, x - foot); k <= Math.min(w - 1, x + foot); k++) m = Math.min(m, top[k])
        ground[x] = baseY + m - base
      }
      let a = 0
      let b = w - 1
      while (a < w && top[a] === Infinity) a++
      while (b > 0 && top[b] === Infinity) b--
      const ox = left - pad - hr.left
      return { ox, ground, bottom, start: ox + a, end: ox + b }
    })
  }
  const groundAt = (L: Line, x: number) => {
    const i = Math.round(x - L.ox)
    return i >= 0 && i < L.ground.length ? L.ground[i] : Infinity
  }

  // Simulates the whole loop once, at 60 steps a second, so any moment can be shown exactly.
  const build = () => {
    const hr = hero.getBoundingClientRect()
    wrap.style.translate = ''
    const wr = wrap.getBoundingClientRect()
    box = { x: wr.left - hr.left, y: wr.top - hr.top, w: wr.width, h: wr.height }
    const cs = getComputedStyle(h1)
    fs = parseFloat(cs.fontSize)
    S = Math.round(fs * 0.7)
    runner.style.width = runner.style.height = `${S}px`
    const rtl = cs.direction === 'rtl'
    const lines = measure(hr)
    if (!lines.length) return
    const dt = 1 / 60
    const speed = fs * 2.1
    grav = fs * 15
    X = []
    Y = []
    F = []
    D = []
    R = []
    W = []
    SC = []
    events = []
    for (const c of coins) c.el.remove()
    coins = []
    const now = () => X.length * dt
    const push = (x: number, y: number, f: number, d: number, r = 0, w = 0, s = 1) => {
      X.push(x)
      Y.push(y)
      F.push(f)
      D.push(d < 0 ? -1 : 1)
      R.push(r)
      W.push(w)
      SC.push(s)
    }
    const coin = (x: number, y: number, t: number) => {
      const el = add('div', layer, 'lv-coin')
      const s = Math.round(fs * 0.27)
      el.style.width = el.style.height = `${s}px`
      el.style.setProperty('--s', `${s}px`)
      el.style.transform = `translate(${x - s / 2}px, ${y - s / 2}px)`
      el.style.animationDelay = `${-Math.random()}s`
      coins.push({ el, x, y, t })
    }
    const body = fs * 0.25 // from the feet up to the middle of the runner
    let dist = 0

    const run = (L: Line, dir: number, from: number, to: number, y0: number) => {
      let x = from
      let y = y0
      let vy = 0
      let ground = true
      let air = 0
      const apex: { x: number; y: number; t: number }[] = []
      const look = fs * 0.3
      const tol = fs * 0.05
      // Tries jumps from just high enough upwards and takes the first that comes down on a letter rather than into
      // a gap between words (brushing a letter's side is fine: the runner slides up it, as in the run below).
      const jump = (x0: number, y1: number, need: number) => {
        for (const extra of [0, 0.12, 0.25, 0.4, 0.6, 0.85, 1.2]) {
          const v0 = -Math.sqrt(2 * grav * (need + extra * fs))
          let jx = x0
          let jy = y1
          let jv = v0
          for (let n = 0; n < 200; n++) {
            const py = jy
            const pjx = jx
            jx += dir * speed * dt
            if ((to - jx) * dir < 0) jx = to
            jv += grav * dt
            jy += jv * dt
            let g = groundAt(L, jx)
            if (jy > g + 2 && py > g + 2 && g < Infinity) {
              jx = pjx
              g = groundAt(L, jx)
            }
            if (jv > 0 && jy >= g && py <= g + 2) return v0
            if (jy > y1 + fs) break
          }
        }
        return -Math.sqrt(2 * grav * (need + 1.2 * fs))
      }
      for (let guard = 0; guard < 4000 && ((to - x) * dir > 0 || !ground); guard++) {
        const px = x
        x += dir * speed * dt
        if ((to - x) * dir < 0) x = to // airborne at the end of the line: come down on it
        dist += speed * dt
        if (ground) {
          let ahead = Infinity
          let gap = false
          for (let k = 2; k <= look; k += 2) {
            const g = groundAt(L, x + dir * k)
            ahead = Math.min(ahead, g)
            if (k < fs * 0.16 && g === Infinity) gap = true
          }
          const g = groundAt(L, x)
          const nearEnd = (to - x) * dir < fs * 0.2
          if (!nearEnd && (ahead < y - tol || gap)) {
            vy = jump(x, y, Math.max(fs * 0.3, y - ahead + fs * 0.17))
            ground = false
          } else if (g > y + tol) {
            ground = false
            vy = 0
          } else if (g < y - tol) {
            x = px // bumped into a letter: hop up it
            vy = jump(x, y, y - g + fs * 0.17)
            ground = false
          } else y = g
        }
        if (!ground) {
          const py = y
          vy += grav * dt
          y += vy * dt
          air++
          if (vy - grav * dt < 0 && vy >= 0) apex.push({ x, y, t: now() })
          let g = groundAt(L, x)
          if (y > g + 2 && py > g + 2 && g < Infinity) {
            x = px // inside a letter's side: slide down it instead of passing through
            g = groundAt(L, x)
          }
          if (vy > 0 && y >= g && py <= g + 2) {
            if (air > 14) events.push({ t: now(), kind: 'dust', x, y: g })
            y = g
            vy = 0
            ground = true
            air = 0
          }
          if (y > y0 + fs * 3) break
        }
        push(x, y, ground ? Math.floor(dist / (fs * 0.085)) % 8 : vy < 0 ? JUMP : FALL, dir)
      }
      return { x, y, apex }
    }
    // How far to bow a straight drop from y0 to y1 so that its highest point is at peak.
    const bow = (y0: number, y1: number, peak: number) => {
      const top = (k: number) => {
        let m = Infinity
        for (let i = 0; i <= 60; i++) m = Math.min(m, y0 + ((y1 - y0) * i) / 60 + (k * 4 * i * (60 - i)) / 3600)
        return m
      }
      let lo = -fs * 20
      let hi = 0
      for (let n = 0; n < 40; n++) {
        const mid = (lo + hi) / 2
        if (top(mid) < peak) lo = mid
        else hi = mid
      }
      return (lo + hi) / 2
    }
    // An arc between two points; the curve's control point pulls the path past the edge first.
    const arc = (x0: number, y0: number, cx: number, x1: number, y1: number, lift: number, dur: number,
      spin = 0, toIsland = false) => {
      const n = Math.round(dur * 60)
      const k = bow(y0, y1, Math.min(y0, y1) - lift)
      let px = x0
      let py = y0
      for (let i = 1; i <= n; i++) {
        const t = i / n
        const x = (1 - t) * (1 - t) * x0 + 2 * t * (1 - t) * cx + t * t * x1
        const y = y0 + (y1 - y0) * t + k * 4 * t * (1 - t)
        const e = Math.min(1, Math.max(0, (t - 0.12) / 0.7))
        const r = spin * (e * e * (3 - 2 * e)) * 360
        push(x, y, y < py ? JUMP : FALL, x - px || (x1 - x0), r, toIsland ? t : 0)
        px = x
        py = y
      }
    }

    const dirs = lines.map((_, i) => ((i % 2 === 0) !== rtl ? 1 : -1))
    let x = dirs[0] > 0 ? lines[0].start + fs * 0.18 : lines[0].end - fs * 0.18
    let y = groundAt(lines[0], x)
    events.push({ t: 0, kind: 'puff', x, y: y - body })
    for (let i = 0; i < 30; i++) {
      const s = Math.min(1, i / 14)
      push(x, y, IDLE, dirs[0], 0, 0, s < 1 ? 1 + 2.7 * (s - 1) ** 3 + 1.7 * (s - 1) ** 2 : 1)
    }
    lines.forEach((L, i) => {
      const d = dirs[i]
      const to = d > 0 ? L.end - fs * 0.1 : L.start + fs * 0.1
      const r = run(L, d, x, to, y)
      x = r.x
      y = r.y
      // Coins at the top of this line's jumps (a few, spread out), or along it when it has none.
      // Only where the coin is clear of the letters of every line above, so the headline stays readable.
      const clear = (cx: number, cy: number) => {
        const r = fs * 0.16
        for (const above of lines.slice(0, i))
          for (let k = -r; k <= r; k += 2) {
            const j = Math.round(cx + k - above.ox)
            if (j >= 0 && j < above.bottom.length && above.bottom[j] > cy - r - 3) return false
          }
        return true
      }
      const picks: { x: number; y: number; t: number }[] = []
      for (const a of r.apex)
        if (clear(a.x, a.y - body) && !picks.some(p => Math.abs(p.x - a.x) < fs * 0.9)) picks.push(a)
      const spread = picks.filter((_, k) => picks.length <= 3 || k % Math.ceil(picks.length / 3) === 0)
      for (const p of spread) coin(p.x, p.y - body, p.t)
      const next = lines[i + 1]
      if (next) {
        const nd = dirs[i + 1]
        const nx = nd > 0 ? next.start + fs * 0.18 : next.end - fs * 0.18
        const ny = groundAt(next, nx)
        arc(x, y, x + d * fs * 0.7, nx, ny, fs * 0.45, 0.85)
        events.push({ t: now(), kind: 'dust', x: nx, y: ny })
        x = nx
        y = ny
      }
    })
    // The leap to the island, with a somersault, through a little line of coins.
    const lx = box.x + LAND.x * box.w
    const ly = box.y + LAND.y * box.h
    const t0 = now()
    const leapDur = 1.25
    const ld = Math.sign(lx - x) || 1
    for (let i = 0; i < 8; i++) push(x, y, IDLE, ld) // a beat to wind up
    const k = bow(y, ly, Math.min(y, ly) - fs * 1.1)
    for (const t of [0.3, 0.5, 0.7]) {
      const cy = y + (ly - y) * t + k * 4 * t * (1 - t)
      coin(x + (lx - x) * t, cy - body, t0 + 8 / 60 + t * leapDur)
    }
    arc(x, y, (x + lx) / 2, lx, ly, fs * 1.1, leapDur, ld, true)
    goalT = now()
    events.push({ t: goalT, kind: 'dust', x: lx, y: ly })
    events.push({ t: goalT, kind: 'goal', x: box.x + FLAG.x * box.w, y: box.y + FLAG.y * box.h })
    // Celebrate with little hops, then vanish in a puff and start again.
    for (let i = 0; i < 160; i++) {
      const hop = Math.abs(Math.sin((i / 26) * Math.PI)) * fs * 0.13 * (i > 18 ? 1 : 0)
      push(lx, ly - hop, i < 18 ? IDLE : CHEER, ld, 0, 1)
    }
    events.push({ t: now(), kind: 'puff', x: lx, y: ly - body })
    for (let i = 0; i < 12; i++) push(lx, ly, CHEER, ld, 0, 1, 1 - i / 11)
    for (let i = 0; i < 40; i++) push(lx, ly, CHEER, ld, 0, 1, 0)
    T = now()

    if (debug) {
      hero.dataset.lvLoop = `${Math.round(T * 1000)} ${Math.round(goalT * 1000)}`
      hero.dataset.lvCoins = coins.map(c => `${Math.round(c.x)},${Math.round(c.y)}@${c.t.toFixed(2)}`).join(' ')
      hero.dataset.lvPath = X.map((x, i) => `${Math.round(x)},${Math.round(Y[i])},${F[i]}`).join(' ')
      hero.dataset.lvLines = JSON.stringify(lines.map(L => ({ ox: Math.round(L.ox), start: Math.round(L.start), end: Math.round(L.end),
        g: Array.from(L.ground, v => (v === Infinity ? -1 : Math.round(v))) })))
      debugSvg?.remove()
      const ns = 'http://www.w3.org/2000/svg'
      debugSvg = document.createElementNS(ns, 'svg')
      layer.append(debugSvg)
      const path = (d: string, color: string) => {
        const p = debugSvg?.appendChild(document.createElementNS(ns, 'path'))
        p?.setAttribute('d', d)
        p?.setAttribute('fill', 'none')
        p?.setAttribute('stroke', color)
        p?.setAttribute('stroke-width', '2')
      }
      for (const L of lines) {
        let d = ''
        L.ground.forEach((g, i) => {
          if (g < Infinity) d += `${d && L.ground[i - 1] < Infinity ? 'L' : 'M'}${L.ox + i},${g}`
        })
        path(d, '#0b5552')
      }
      path(X.map((x, i) => `${i ? 'L' : 'M'}${x},${Y[i]}`).join(''), 'rgba(250,42,111,.5)')
    }
  }

  const fx = (x: number, y: number, size: number, color: string, kf: (dx: number, dy: number) => Keyframe[],
    dur: number, at: number | null) => {
    const p = add('i', layer, 'lv-fx')
    p.style.width = p.style.height = `${size}px`
    p.style.background = color
    p.style.marginLeft = p.style.marginTop = `${-size / 2}px`
    const a = p.animate(kf(x, y), { duration: dur, fill: 'forwards' })
    a.onfinish = () => p.remove()
    if (at != null) {
      a.currentTime = Math.min(at, dur - 1)
      a.pause()
    }
  }
  const puff = (x: number, y: number, at: number | null, n = 8, r = fs * 0.4, flat = 0.6) => {
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + Math.random() * 0.4
      const dx = Math.cos(a) * r
      const dy = Math.sin(a) * r * flat
      const s = r * (0.45 + Math.random() * 0.3)
      fx(x, y, s, '#ffffff', (x0, y0) => [
        { transform: `translate(${x0}px, ${y0}px) scale(.3)`, opacity: 0.95, easing: 'cubic-bezier(.2,.8,.3,1)' },
        { transform: `translate(${x0 + dx}px, ${y0 + dy}px) scale(1)`, opacity: 0 },
      ], 560, at)
    }
  }
  const sparkle = (x: number, y: number) => {
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2
      const r = fs * (0.3 + Math.random() * 0.12)
      fx(x, y, 6, k % 2 ? '#fff4b8' : '#ffffff', (x0, y0) => [
        { transform: `translate(${x0}px, ${y0}px) scale(1.4)`, opacity: 1, easing: 'cubic-bezier(.1,.8,.3,1)' },
        { transform: `translate(${x0 + Math.cos(a) * r}px, ${y0 + Math.sin(a) * r}px) scale(.2)`, opacity: 0 },
      ], 420, null)
    }
  }
  const confetti = (x: number, y: number, at: number | null) => {
    for (let k = 0; k < 56; k++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4
      const v = fs * (1.1 + Math.random() * 1.6)
      const dx = Math.cos(a) * v
      const dy = Math.sin(a) * v
      const spin = (Math.random() - 0.5) * 1100
      const w = 7 + Math.random() * 6
      const dur = 1900 + Math.random() * 1000
      fx(x, y, w, COLORS[k % COLORS.length], (x0, y0) => [
        { transform: `translate(${x0}px, ${y0}px) rotate(0deg) scaleY(.5)`, opacity: 1, easing: 'cubic-bezier(.15,.75,.35,1)' },
        { transform: `translate(${x0 + dx * 0.8}px, ${y0 + dy * 0.85}px) rotate(${spin * 0.4}deg) scaleY(.45)`, opacity: 1, offset: 0.35, easing: 'cubic-bezier(.5,0,.85,.55)' },
        { transform: `translate(${x0 + dx * 1.2}px, ${y0 + dy * 0.2 + fs * 1.8}px) rotate(${spin}deg) scaleY(.5)`, opacity: 0 },
      ], dur, at)
    }
  }

  let got = 0
  const setCount = (n: number, bump = false) => {
    got = n
    hudN.textContent = fmt.format(n)
    if (bump) hudN.animate([{ transform: 'scale(1.45)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'ease-out' })
  }
  const resetLoop = () => {
    for (const c of coins) {
      c.anim?.cancel()
      c.anim = undefined
      c.el.style.visibility = ''
    }
    flag.classList.add('down')
    setCount(0)
  }
  const fire = (from: number, to: number, at: number | null) => {
    for (const e of events) {
      if (e.t <= from || e.t > to) continue
      const ago = at == null ? null : (to - e.t) * 1000
      if (e.kind === 'puff') puff(e.x, e.y, ago)
      else if (e.kind === 'dust') {
        puff(e.x - fs * 0.12, e.y - fs * 0.04, ago, 3, fs * 0.2, 0.2)
        puff(e.x + fs * 0.12, e.y - fs * 0.04, ago, 3, fs * 0.2, 0.2)
      } else if (e.kind === 'goal') {
        flag.classList.remove('down')
        confetti(e.x, e.y, ago)
      }
    }
    for (const c of coins) {
      if (c.t <= from || c.t > to) continue
      if (at == null) {
        c.anim = c.el.animate([{ translate: '0 0', scale: '1', opacity: 1 },
          { translate: `0 ${-fs * 0.45}px`, scale: '1.35', opacity: 0 }], { duration: 380, easing: 'ease-out', fill: 'forwards' })
        sparkle(c.x, c.y)
      } else c.el.style.visibility = 'hidden'
      setCount(got + 1, at == null)
    }
  }

  // Click anywhere in the hero (not on a link) to make the runner hop.
  let hopAt = -10
  const clock = () => performance.now() / 1000
  hero.addEventListener('pointerdown', ev => {
    if ((ev.target as Element).closest('a, button')) return
    hopAt = clock()
  }, { signal })

  let started = clock()
  let last = 0
  const draw = (abs: number, t: number) => {
    const i = Math.min(X.length - 1, Math.floor(t * 60))
    if (i < 0) return
    const b = bob(abs)
    wrap.style.translate = `0 ${b}px`
    let y = Y[i] + W[i] * b
    let f = F[i]
    const tau = abs - hopAt
    const v = Math.sqrt(2 * grav * fs * 0.5)
    if (tau >= 0 && tau < (2 * v) / grav && (f < 8 || f >= CHEER)) {
      y -= v * tau - (grav * tau * tau) / 2
      f = tau < v / grav ? JUMP : FALL
    }
    runner.style.transform = `translate(${X[i] - S / 2}px, ${y - S * FEET}px) scale(${D[i] * SC[i]}, ${SC[i]}) rotate(${D[i] * R[i]}deg)`
    runner.style.backgroundPositionX = `${-f * S}px`
  }
  const tick = () => {
    if (signal.aborted) return
    const abs = clock() - started
    const t = abs % T
    if (t < last) {
      fire(last, T, null)
      resetLoop()
      fire(-1, t, null)
    } else fire(last, t, null)
    last = t
    draw(abs, t)
    requestAnimationFrame(tick)
  }
  const show = (t: number) => {
    resetLoop()
    flag.style.transition = 'none'
    fire(-1, t, t)
    draw(t, t)
  }

  // Re-measure whenever the headline moves inside the hero, e.g. when a late web font rewraps the copy
  // below it, or the window is resized.
  const layoutKey = () => {
    const hr = hero.getBoundingClientRect()
    const r = h1.getBoundingClientRect()
    return [hr.width, hr.height, r.left - hr.left, r.top - hr.top, r.width, r.height, slot.offsetLeft, slot.offsetTop,
      slot.offsetWidth].map(Math.round).join()
  }
  let built = ''
  const rebuild = () => {
    built = layoutKey()
    build()
    resetLoop()
  }
  const watch = (onChange: () => void) => {
    const id = setInterval(() => layoutKey() !== built && onChange(), 250)
    signal.addEventListener('abort', () => clearInterval(id))
  }

  // Measure once the font is in and the island has landed (mid-hop its box is scaled and moving).
  Promise.all([document.fonts.ready, ready]).then(() => {
    if (signal.aborted) return
    rebuild()
    const still = fixed ?? (reduce ? goalT + 1 : null)
    if (still != null) {
      show(still)
      watch(() => {
        rebuild()
        show(fixed ?? goalT + 1)
      })
      return
    }
    started = clock()
    last = 0
    fire(-1, 0, null)
    tick()
    watch(() => {
      rebuild()
      started = clock()
      last = 0
      fire(-1, 0, null)
    })
  })
}

// ---------------------------------------------------------------------------------------------------------------
// The button you must not press. It starts as the plain picture; press.ts brings it to life once the slide has landed.
function dontPress({ slot, signal, ready }: Ctx) {
  img(slot, c('press'))
  // A picture can't hold a button for assistive technology, so this slot is a labelled group instead.
  slot.setAttribute('role', 'group')
  void ready.then(() => import('./press')).then(m => {
    if (!signal.aborted) m.mountPress(slot, signal)
  })
}

// ---------------------------------------------------------------------------------------------------------------
// The claw machine's own PLAY sign is the button. It stays lit to invite a click: the letters glow like neon, light sweeps across
// the panel and the marquee bulbs chase. Pressing it opens the real game, a separate download fetched only then. See claw.ts.
// Bulb positions and the letters' cut-out come from the art, by concepts/blender/claw-sign.py, in percent of the picture.
const CLAW_MARQUEE = [
  [24.21, 16.64], [26.69, 16.46], [29.21, 16.28], [31.77, 16.09], [34.37, 15.89], [37, 15.7], [39.69, 15.5],
  [42.4, 15.29], [45.17, 15.09], [47.94, 14.9], [50.8, 14.72], [53.7, 14.5], [56.62, 14.26], [59.66, 14.05],
  [59.63, 25.42], [56.65, 25.55], [53.71, 25.67], [50.83, 25.79], [47.98, 25.92], [45.18, 26.04], [42.43, 26.16],
  [39.71, 26.27], [37.05, 26.38], [34.42, 26.5], [31.82, 26.62], [29.27, 26.72], [26.76, 26.83], [24.28, 26.94],
]
const CLAW_DISC = [
  [34.99, 13.99], [35.58, 11.53], [36.73, 9.32], [38.37, 7.5], [40.36, 6.25], [42.57, 5.66],
  [44.8, 5.81], [46.87, 6.68], [48.61, 8.23], [49.86, 10.31], [50.52, 12.76],
]
function clawMachine({ slot, signal }: Ctx) {
  css('claw', `
    .hc-claw-halo { position: absolute; left: 12%; top: -3%; width: 66%; height: 42%; pointer-events: none;
      background: radial-gradient(closest-side, rgb(255 96 150 / 0.7), rgb(255 150 190 / 0.28) 55%, transparent);
      animation: hc-claw-halo 1.5s ease-in-out infinite; }
    @keyframes hc-claw-halo { 0%, 100% { opacity: 0.45; scale: 0.96; } 50% { opacity: 1; scale: 1.05; } }
    .hc-slot .hc-claw-play { position: absolute; left: 22.5%; top: 4%; width: 41%; height: 25%; padding: 0; border: 0; border-radius: 3cqw;
      background: none; pointer-events: auto; cursor: pointer; -webkit-tap-highlight-color: transparent; }
    .hc-slot .hc-claw-play:focus-visible { outline: 3px solid var(--a-ink); outline-offset: 2px; }
    .hc-claw-panel { position: absolute; left: 25.125%; top: 15.625%; width: 33.75%; height: 10%; overflow: hidden; pointer-events: none;
      clip-path: polygon(0 23.75%, 99.26% 0, 100% 85%, 0.56% 100%); }
    .hc-claw-panel::before { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, #ffb3cd, #ff5a93);
      mix-blend-mode: screen; animation: hc-claw-panel 1.5s ease-in-out infinite; }
    @keyframes hc-claw-panel { 0%, 100% { opacity: 0.1; } 50% { opacity: 0.55; } }
    .hc-claw-panel::after { content: ''; position: absolute; top: -40%; bottom: -40%; left: 0; width: 26%; rotate: 16deg;
      background: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.95), transparent); animation: hc-claw-sweep 2s cubic-bezier(0.45, 0, 0.55, 1) infinite; }
    @keyframes hc-claw-sweep { 0% { transform: translateX(-160%); } 62%, 100% { transform: translateX(440%); } }
    .hc-claw-neon { position: absolute; left: 33.56%; top: 17.75%; width: 15.5%; height: 6.94%; pointer-events: none;
      filter: drop-shadow(0 0 0.5cqw #fff) drop-shadow(0 0 1.5cqw #ffd0e0) drop-shadow(0 0 2.6cqw #ff4d88); animation: hc-claw-neon 1.5s ease-in-out infinite; }
    .hc-claw-neon i { position: absolute; inset: 0; background: #fff; -webkit-mask: url(/concepts/claw-sign.webp) center / 100% 100% no-repeat;
      mask: url(/concepts/claw-sign.webp) center / 100% 100% no-repeat; }
    @keyframes hc-claw-neon { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
    .hc-claw-bulb { position: absolute; width: 2.5%; aspect-ratio: 1; translate: -50% -50%; border-radius: 50%; pointer-events: none;
      background: radial-gradient(closest-side, #fff 30%, rgb(255 244 190 / 0.9) 52%, rgb(255 226 130 / 0)); opacity: 0.12;
      animation: hc-claw-bulb 1.2s linear infinite; animation-delay: calc(var(--k) * -0.2s); }
    @keyframes hc-claw-bulb { 0%, 26% { opacity: 1; scale: 1.25; } 44%, 100% { opacity: 0.12; scale: 0.9; } }
    .hc-claw-spark { position: absolute; width: 1em; height: 1em; translate: -50% -50%; font-size: clamp(13px, 3.6cqw, 26px); pointer-events: none; background: #fff;
      clip-path: polygon(50% 0, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0 50%, 40% 40%);
      filter: drop-shadow(0 0 2px #ffd65c); animation: hc-claw-twinkle 1.7s ease-in-out infinite; }
    @keyframes hc-claw-twinkle { 0%, 100% { scale: 0.2; opacity: 0; rotate: 0deg; } 50% { scale: 1; opacity: 1; rotate: 45deg; } }
    .hc-claw-play:hover ~ .hc-claw-neon, .hc-claw-play:focus-visible ~ .hc-claw-neon { animation-duration: 0.6s; }
    .hc-claw-play:hover ~ .hc-claw-panel::before, .hc-claw-play:focus-visible ~ .hc-claw-panel::before { animation-duration: 0.6s; }
    .hc-claw-play:hover ~ .hc-claw-panel::after, .hc-claw-play:focus-visible ~ .hc-claw-panel::after { animation-duration: 1s; }
    .hc-claw-play:hover ~ .hc-claw-bulb, .hc-claw-play:focus-visible ~ .hc-claw-bulb { animation-duration: 0.6s; animation-delay: calc(var(--k) * -0.1s); }
    .hc-claw-play:active ~ .hc-claw-panel::before { animation: none; opacity: 1; }
    @media (prefers-reduced-motion: reduce) {
      .hc-claw-halo, .hc-claw-panel::before, .hc-claw-neon, .hc-claw-bulb, .hc-claw-spark { animation: none; }
      .hc-claw-panel::after, .hc-claw-spark { display: none; }
      .hc-claw-bulb { opacity: 0.8; }
    }
  `)
  el('div', slot, 'hc-claw-halo')
  img(slot, c('claw'))
  // A picture can't hold a button for assistive technology, so this slot is a labelled group instead.
  slot.setAttribute('role', 'group')
  const play = el('button', slot, 'hc-claw-play')
  play.type = 'button'
  play.setAttribute('aria-label', (document.documentElement.lang || '').startsWith('ar') ? 'العب' : 'Play')
  el('div', slot, 'hc-claw-panel')
  el('i', el('div', slot, 'hc-claw-neon'))
  const dots = (list: number[][]) => list.forEach(([x, y], k) => {
    const b = el('i', slot, 'hc-claw-bulb')
    b.style.left = `${x}%`
    b.style.top = `${y}%`
    b.style.setProperty('--k', String(k % 6))
  })
  dots(CLAW_MARQUEE)
  dots(CLAW_DISC)
  for (const [x, y, delay] of [[25.5, 17.6, 0], [58.4, 16, -0.55], [58.8, 24.4, -1.1]]) {
    const s = el('i', slot, 'hc-claw-spark')
    s.style.left = `${x}%`
    s.style.top = `${y}%`
    s.style.animationDelay = `${delay}s`
  }
  play.addEventListener('click', () => void import('./claw').then(m => m.openClaw(play)), { signal })
  // A tap on the sign shouldn't also count as the start of a swipe on the hero.
  play.addEventListener('pointerdown', e => e.stopPropagation(), { signal })
}

// ---------------------------------------------------------------------------------------------------------------
// The carousel.

css('hc', `
  .hc-slot { aspect-ratio: 1; height: auto; pointer-events: none; transform-origin: 50% 93%; container-type: inline-size; }
  .hc-slot > img { position: absolute; inset: 0; width: 100%; height: 100%; }
  @media (min-width: 1025px) {
    .a-hero-art.hc-slot { width: var(--hc-w, 40%); max-width: var(--hc-max, 680px); max-height: var(--hc-max, 680px);
      bottom: var(--hc-bottom, 40px); inset-inline-end: var(--hc-end, 6%); }
  }
  /* Stacked layouts: the art sits in the flow under the copy, bigger than the old picture since it's the star. */
  @media (max-width: 1024px) {
    .a-hero-art.hc-slot { position: relative; bottom: auto; inset-inline-end: auto; width: min(36vw, 320px); max-width: none; }
  }
  @media (max-width: 768px) { .a-hero-art.hc-slot { width: min(64vw, 280px); } }
  .a-hero { touch-action: pan-y; }

  /* Arrows and level pips in a white capsule that sits on the hero's bottom edge, like the scroll button. */
  .hc-ctl { position: absolute; z-index: 3; bottom: -28px; inset-inline-end: 26%; translate: 50% 0;
    display: flex; align-items: center; gap: 14px; padding: 8px; border-radius: 999px; background: #fff; }
  .design-a[dir='rtl'] .hc-ctl { translate: -50% 0; }
  @media (max-width: 1024px) { .hc-ctl, .design-a[dir='rtl'] .hc-ctl { inset-inline-end: var(--a-x); translate: none; } }
  .hc-btn { width: 56px; height: 56px; padding: 0; border: 0; border-radius: 50%; display: grid; place-items: center;
    background: var(--a-pink, #fa2a6f); color: #fff; cursor: pointer; translate: 0 -3px; box-shadow: 0 5px 0 #b3134b;
    transition: translate .12s, box-shadow .12s; }
  .hc-btn:hover { translate: 0 -5px; box-shadow: 0 7px 0 #b3134b; }
  .hc-btn:active, .hc-btn.is-pressed { translate: 0 2px; box-shadow: 0 0 0 #b3134b; transition-duration: .04s; }
  .hc-btn svg { width: 22px; height: 22px; }
  .design-a[dir='rtl'] .hc-btn svg { scale: -1 1; }
  .hc-pips { display: flex; align-items: center; gap: 8px; }
  .hc-pip { width: 10px; height: 10px; padding: 0; border: 0; border-radius: 999px; cursor: pointer;
    background: rgba(0, 70, 70, .2); transition: width .45s cubic-bezier(.3, 1.6, .5, 1), background-color .2s; }
  .hc-pip:hover { background: rgba(0, 70, 70, .42); }
  .hc-pip[aria-current='true'] { width: 28px; background: var(--a-pink, #fa2a6f); }
  .hc-pip:focus-visible { outline-offset: 3px; }
  @media (max-width: 768px) {
    .hc-ctl { gap: 10px; padding: 6px; bottom: -24px; }
    .hc-btn { width: 44px; height: 44px; }
    .hc-btn svg { width: 18px; height: 18px; }
    .hc-pips { gap: 6px; }
    .hc-pip[aria-current='true'] { width: 22px; }
  }
  .hc-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .hc-fx { position: absolute; inset: 0; z-index: 3; pointer-events: none; }
  .hc-fx i { position: absolute; left: 0; top: 0; }
`)

const q = new URLSearchParams(location.search)
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches

type Mounted = { slot: HTMLElement; ac: AbortController; overlays: HTMLElement[]; landed: () => void; anim?: Animation }

// Where an element sits inside the hero, ignoring any transform it is animating with.
function boxIn(e: HTMLElement, hero: HTMLElement) {
  let x = 0
  let y = 0
  for (let n: HTMLElement | null = e; n && n !== hero; n = n.offsetParent as HTMLElement | null) {
    x += n.offsetLeft
    y += n.offsetTop
  }
  return { x, y, w: e.offsetWidth, h: e.offsetHeight }
}

// Keyframes sampled from a little physics, so the arcs are real parabolas and the squash springs back.
type Pose = { x: number; y: number; r: number; sx: number; sy: number; o: number }
const frames = (n: number, f: (t: number) => Pose): Keyframe[] =>
  Array.from({ length: n + 1 }, (_, k) => {
    const p = f(k / n)
    return {
      transform: `translate(${p.x}%, ${p.y}%) rotate(${p.r}deg) scale(${p.sx}, ${p.sy})`,
      opacity: p.o,
    }
  })
const smooth = (u: number) => u * u * (3 - 2 * u)
// way: -1 when things travel left, +1 right.
const exitFrames = (way: number) =>
  frames(30, t => {
    if (t < 0.24) {
      // wind up: lean back and crouch
      const u = smooth(t / 0.24)
      return { x: -way * 4 * u, y: 0, r: -way * 3 * u, sx: 1 + 0.1 * u, sy: 1 - 0.13 * u, o: 1 }
    }
    // flung: up and away along an arc, spinning, shrinking into the distance
    const u = (t - 0.24) / 0.76
    const s = 1 - 0.5 * u
    const st = Math.sin(Math.PI * Math.min(1, u * 1.6))
    return {
      x: way * (-4 + 84 * u ** 1.45),
      y: -34 * Math.sin(Math.PI * u * 0.85) + 10 * u * u,
      r: way * (-3 + 34 * u ** 1.3),
      sx: s * (1 - 0.08 * st),
      sy: s * (1 + 0.12 * st),
      o: u < 0.45 ? 1 : 1 - (u - 0.45) / 0.55,
    }
  })
const LAND = 0.5
const enterFrames = (way: number) =>
  frames(40, t => {
    if (t < LAND) {
      // drops in from above (and from the side it was thrown from), stretched by the fall
      const u = t / LAND
      const s = 0.62 + 0.38 * u ** 0.7
      return {
        x: -way * 68 * (1 - u) ** 2,
        y: -62 * (1 - u * u),
        r: -way * 24 * (1 - u) ** 2,
        sx: s * (1 - 0.1 * u),
        sy: s * (1 + 0.16 * u),
        o: Math.min(1, u / 0.22),
      }
    }
    // lands: squash, a little rebound hop, settle
    const w = (t - LAND) / (1 - LAND)
    const d = Math.exp(-4.2 * w) * Math.cos(w * Math.PI * 3.4)
    const hop = w > 0.1 && w < 0.5 ? Math.sin((Math.PI * (w - 0.1)) / 0.4) : 0
    return { x: 0, y: -7 * hop, r: 0, sx: 1 + 0.17 * d, sy: 1 - 0.22 * d, o: 1 }
  })

// Dust and sparkles: white puffs that roll out flat from the feet, and a few pink and gold diamonds that pop up.
function burst(hero: HTMLElement, x: number, y: number, size: number, stars: boolean) {
  if (reduce) return
  const fx = el('div', hero, 'hc-fx')
  setTimeout(() => fx.remove(), 1100)
  const part = (w: number, bg: string, round: boolean, kf: Keyframe[], dur: number, delay = 0) => {
    const p = el('i', fx)
    p.style.width = p.style.height = `${w}px`
    p.style.margin = `${-w / 2}px 0 0 ${-w / 2}px`
    p.style.background = bg
    p.style.borderRadius = round ? '50%' : '2px'
    p.animate(kf, { duration: dur, delay, easing: 'cubic-bezier(.15,.8,.3,1)', fill: 'both' })
  }
  for (let k = 0; k < 12; k++) {
    const side = k % 2 ? 1 : -1
    const reach = size * (0.28 + Math.random() * 0.3)
    const w = size * (0.07 + Math.random() * 0.07)
    part(w, '#fff', true, [
      { transform: `translate(${x + side * size * 0.06}px, ${y}px) scale(.3)`, opacity: 0.95 },
      { transform: `translate(${x + side * reach}px, ${y - Math.random() * size * 0.1}px) scale(1)`, opacity: 0 },
    ], 520 + Math.random() * 200)
  }
  if (!stars) return
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI / 2 + (k / 6 - 0.5) * 2.2
    const r = size * (0.32 + Math.random() * 0.18)
    const w = 7 + Math.random() * 5
    part(w, k % 2 ? '#ffc414' : '#fa2a6f', false, [
      { transform: `translate(${x}px, ${y - size * 0.1}px) rotate(45deg) scale(.2)`, opacity: 1 },
      { transform: `translate(${x + Math.cos(a) * r}px, ${y - size * 0.1 + Math.sin(a) * r}px) rotate(225deg) scale(1)`,
        opacity: 1, offset: 0.7 },
      { transform: `translate(${x + Math.cos(a) * r * 1.1}px, ${y - size * 0.1 + Math.sin(a) * r * 1.1 + 14}px) rotate(270deg) scale(.4)`,
        opacity: 0 },
    ], 700, 40)
  }
}

function carousel(inner: HTMLElement) {
  const hero = (inner.closest('section') ?? inner) as HTMLElement
  const rtl = getComputedStyle(inner).direction === 'rtl'
  const ar = (document.documentElement.lang || '').startsWith('ar')
  inner.querySelector('.a-hero-art')?.remove()

  const ctl = document.createElement('div')
  ctl.className = 'hc-ctl'
  ctl.setAttribute('role', 'group')
  ctl.setAttribute('aria-label', ar ? 'العمل الفني' : 'Hero art')
  const arrow = (d: string) =>
    `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="${d}" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  const prev = el('button', ctl, 'hc-btn')
  prev.type = 'button'
  prev.innerHTML = arrow('M15 4.5 7.5 12l7.5 7.5')
  prev.setAttribute('aria-label', ar ? 'السابق' : 'Previous')
  const pips = el('div', ctl, 'hc-pips')
  const next = el('button', ctl, 'hc-btn')
  next.type = 'button'
  next.innerHTML = arrow('M9 4.5 16.5 12 9 19.5')
  next.setAttribute('aria-label', ar ? 'التالي' : 'Next')
  const status = el('span', ctl, 'hc-sr')
  status.setAttribute('aria-live', 'polite')
  const fmt = new Intl.NumberFormat(document.documentElement.lang || undefined)
  const pip = ORDER.map((id, k) => {
    const b = el('button', pips, 'hc-pip')
    b.type = 'button'
    b.setAttribute('aria-label', `${fmt.format(k + 1)} / ${fmt.format(ORDER.length)}`)
    b.addEventListener('click', () => go(k, Math.sign(k - idx)))
    return b
  })
  inner.insertBefore(ctl, inner.querySelector('.a-scroll'))

  const mount = (id: string): Mounted => {
    const concept = concepts[id]
    const slot = document.createElement('div')
    slot.className = 'a-hero-art hc-slot'
    slot.setAttribute('role', 'img')
    slot.setAttribute('aria-label', concept.alt[ar ? 1 : 0])
    const box = concept.box ?? {}
    if (box.w) slot.style.setProperty('--hc-w', box.w)
    if (box.max) slot.style.setProperty('--hc-max', box.max)
    if (box.bottom) slot.style.setProperty('--hc-bottom', box.bottom)
    if (box.end) slot.style.setProperty('--hc-end', box.end)
    inner.insertBefore(slot, ctl)
    const ac = new AbortController()
    let landed = () => {}
    const ready = new Promise<void>(r => (landed = r))
    const overlays: HTMLElement[] = []
    const m: Mounted = { slot, ac, overlays, landed: () => landed() }
    ready.then(() => {
      for (const o of overlays) o.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 }).onfinish = () => (o.style.opacity = '')
    })
    concept.mount({
      hero,
      slot,
      signal: ac.signal,
      ready,
      overlay: cls => {
        const o = el('div', hero, cls)
        o.style.opacity = '0'
        overlays.push(o)
        return o
      },
    })
    return m
  }

  const feet = (m: Mounted) => {
    const b = boxIn(m.slot, hero)
    return { x: b.x + b.w / 2, y: b.y + b.h * 0.93, size: b.w }
  }

  const leave = (m: Mounted, way: number) => {
    m.ac.abort()
    m.anim?.cancel()
    m.slot.removeAttribute('role')
    m.slot.setAttribute('aria-hidden', 'true')
    // In the stacked phone layout the art is in the flow: lift it out so the newcomer can take its place.
    if (getComputedStyle(m.slot).position !== 'absolute') {
      const b = { l: m.slot.offsetLeft, t: m.slot.offsetTop, w: m.slot.offsetWidth }
      Object.assign(m.slot.style, { position: 'absolute', left: `${b.l}px`, top: `${b.t}px`, width: `${b.w}px`,
        right: 'auto', bottom: 'auto', margin: '0' })
    }
    for (const o of m.overlays) o.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' })
    const f = feet(m)
    const a = reduce
      ? m.slot.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' })
      : m.slot.animate(exitFrames(way), { duration: 460, fill: 'forwards' })
    setTimeout(() => burst(hero, f.x, f.y, f.size, false), 110)
    a.onfinish = () => {
      m.slot.remove()
      for (const o of m.overlays) o.remove()
    }
  }

  const enter = async (m: Mounted, way: number, wait: number) => {
    m.slot.style.visibility = 'hidden'
    const t0 = performance.now()
    const imgs = [...m.slot.querySelectorAll('img')]
    await Promise.race([
      Promise.all(imgs.map(i => i.decode().catch(() => {}))),
      new Promise(r => setTimeout(r, 900)),
    ])
    await new Promise(r => setTimeout(r, Math.max(0, wait - (performance.now() - t0))))
    if (m.ac.signal.aborted) return
    m.slot.style.visibility = ''
    if (reduce) {
      m.anim = m.slot.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250 })
      m.anim.onfinish = m.landed
      return
    }
    const dur = 780
    m.anim = m.slot.animate(enterFrames(way), { duration: dur })
    setTimeout(() => {
      if (m.ac.signal.aborted) return
      const f = feet(m)
      burst(hero, f.x, f.y, f.size, true)
    }, dur * LAND)
    m.anim.onfinish = m.landed
  }

  // Keep the neighbours' pictures warm so a swap never waits on the network.
  const warm = new Set<string>()
  const preload = (k: number) => {
    for (const src of concepts[ORDER[(k + ORDER.length) % ORDER.length]].assets) {
      if (warm.has(src)) continue
      warm.add(src)
      const i = new Image()
      i.src = src
    }
  }

  // After a restart (see start() below) the carousel carries on with the piece that was showing.
  let idx = Math.max(0, ORDER.indexOf(q.get('concept') ?? document.documentElement.dataset.concept ?? ''))
  let cur: Mounted | null = null
  const show = (k: number, step: number) => {
    idx = (k + ORDER.length) % ORDER.length
    // step +1 is "next": in English things travel left, in Arabic right.
    const way = step === 0 ? 0 : (step > 0 ? -1 : 1) * (rtl ? -1 : 1)
    const old = cur
    if (old) leave(old, way)
    cur = mount(ORDER[idx])
    enter(cur, way, old ? 230 : 150)
    pip.forEach((b, i) => b.setAttribute('aria-current', i === idx ? 'true' : 'false'))
    if (old) status.textContent = `${fmt.format(idx + 1)} / ${fmt.format(ORDER.length)}`
    document.documentElement.dataset.concept = ORDER[idx]
    preload(idx + 1)
    preload(idx - 1)
  }
  const go = (k: number, step: number) => {
    if (step !== 0) show(k, step)
  }
  const press = (b: HTMLElement) => {
    b.classList.add('is-pressed')
    setTimeout(() => b.classList.remove('is-pressed'), 120)
  }
  prev.addEventListener('click', () => go(idx - 1, -1))
  next.addEventListener('click', () => go(idx + 1, 1))

  const life = new AbortController()
  // The Dubai map takes over the hero: the current piece is flung away, and a piece drops back in when it closes.
  let away = false
  window.addEventListener('hero:dubai', e => {
    away = (e as CustomEvent<boolean>).detail
    if (away) {
      if (cur) leave(cur, rtl ? 1 : -1)
      cur = null
    } else {
      show(idx, 1)
    }
  }, { signal: life.signal })

  document.addEventListener('keydown', e => {
    if (away) return
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    const t = e.target as HTMLElement
    if (t.closest?.('input, textarea, select, [contenteditable], dialog, .a-rail')) return
    const r = hero.getBoundingClientRect()
    if (r.bottom < 160 || r.top > innerHeight * 0.5) return
    e.preventDefault()
    const step = (e.key === 'ArrowRight') !== rtl ? 1 : -1
    press(step > 0 ? next : prev)
    go(idx + step, step)
  }, { signal: life.signal })

  // Swipe sideways on a touch screen.
  let sx = 0
  let sy = 0
  let sid = -1
  hero.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return
    sid = e.pointerId
    sx = e.clientX
    sy = e.clientY
  })
  hero.addEventListener('pointerup', e => {
    if (e.pointerId !== sid) return
    sid = -1
    const dx = e.clientX - sx
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(e.clientY - sy) * 1.5) return
    const step = dx < 0 !== rtl ? 1 : -1
    go(idx + step, step)
  })

  show(idx, 0)
  return () => {
    life.abort()
    cur?.ac.abort()
  }
}

const start = (): void => {
  const inner = document.querySelector<HTMLElement>('.a-hero-inner')
  if (!inner) {
    requestAnimationFrame(start)
    return
  }
  const stop = carousel(inner)
  // A hot reload in development rebuilds the hero but not this module, which would leave the
  // carousel on the old, removed hero with no art until a refresh. Built sites don't hot reload,
  // so this drops out of them.
  if (import.meta.hot) {
    const id = setInterval(() => {
      if (inner.isConnected) return
      clearInterval(id)
      stop()
      start()
    }, 200)
  }
}
start()

export {}
