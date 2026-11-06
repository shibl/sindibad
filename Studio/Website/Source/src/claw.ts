// The claw game. The game itself is a Unity WebGL build running in a frame, so all of its megabytes arrive only after someone
// presses Play, and removing the frame frees everything again. This layer draws all of its words and buttons, in whichever
// language the page is in, and swaps messages with it. Loaded by the Play button in concepts.ts.
import './claw.css'

const BASE = import.meta.env.BASE_URL
const WORDS = {
  en: {
    title: 'Claw machine',
    warming: 'Warming up the machine',
    weight: 'A one-time download of about {mb} MB',
    drag: 'Drag the coin into the slot',
    almost: 'Into the slot!',
    move: 'Line up the claw, then drop it',
    keys: 'to move',
    space: 'to drop',
    spaceKey: 'Space',
    drop: 'Drop',
    holding: ['Going down…', 'Grab it!', 'Hold on…', 'Bringing it home…', 'Here it comes…'],
    slip: 'Oh no, it’s slipping!',
    lose: 'So close! Here’s another coin.',
    won: 'You won!',
    prizes: { bear: 'A teddy bear is yours.', chick: 'A fluffy chick is yours.', star: 'A soft little star is yours.', capsule: 'A surprise capsule is yours.' } as Record<string, string>,
    again: 'Play again',
    leave: 'Back to the site',
    exit: 'Close the game',
    mute: 'Turn the sound off',
    unmute: 'Turn the sound on',
    fail: 'This device can’t run the game. It needs a browser with WebGL 2.',
  },
  ar: {
    title: 'آلة الملقط',
    warming: 'نجهّز الآلة',
    weight: 'تحميل لمرة واحدة بحجم {mb} ميغابايت تقريباً',
    drag: 'اسحب العملة إلى الفتحة',
    almost: 'إلى الفتحة!',
    move: 'وجّه الملقط ثم أسقطه',
    keys: 'للتحريك',
    space: 'للإسقاط',
    spaceKey: 'مسافة',
    drop: 'أسقِط',
    holding: ['ينزل الملقط…', 'التقطها!', 'تمسّك جيداً…', 'يعود بها…', 'ها هي تأتي…'],
    slip: 'يا للأسف، إنها تفلت!',
    lose: 'كدت تفعلها! إليك عملة أخرى.',
    won: 'فزت!',
    prizes: { bear: 'الدبدوب من نصيبك.', chick: 'الكتكوت الناعم من نصيبك.', star: 'النجمة الناعمة من نصيبك.', capsule: 'كبسولة المفاجأة من نصيبك.' } as Record<string, string>,
    again: 'العب مرة أخرى',
    leave: 'العودة إلى الموقع',
    exit: 'أغلق اللعبة',
    mute: 'أوقف الصوت',
    unmute: 'شغّل الصوت',
    fail: 'لا يستطيع هذا الجهاز تشغيل اللعبة، فهي تحتاج إلى متصفح يدعم WebGL 2.',
  },
}
const SOUND_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10v4h4l5 4V6L8 10H4z" fill="currentColor"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11"/></svg>'
const SOUND_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10v4h4l5 4V6L8 10H4z" fill="currentColor"/><path d="M17 10l4 4M21 10l-4 4"/></svg>'
const CROSS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>'
const ARROW = (r: number) => `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="rotate:${r}deg"><path d="M12 4l9 12H3z"/></svg>`

let open_: (() => void) | null = null

export function openClaw(back?: HTMLElement) {
  if (open_) return
  const lang = (document.documentElement.lang || '').startsWith('ar') ? 'ar' : 'en'
  const w = WORDS[lang]
  const host = document.querySelector<HTMLElement>('.design-a') ?? document.body

  const el = document.createElement('div')
  el.className = 'cg'
  el.setAttribute('role', 'dialog')
  el.setAttribute('aria-modal', 'true')
  el.setAttribute('aria-label', w.title)
  el.setAttribute('data-lenis-prevent', '')
  el.innerHTML = `
    <div class="cg-load" aria-live="polite">
      <img src="${BASE}concepts/claw.png" alt="">
      <b>${w.warming}</b>
      <div class="cg-bar"><i></i></div>
      <small>${w.weight.replace('{mb}', lang === 'ar' ? '١٥' : '15')}</small>
    </div>
    <iframe class="cg-frame" title="${w.title}" allow="autoplay; fullscreen; gamepad" src="${BASE}concepts/claw-game/index.html"></iframe>
    <svg class="cg-path" aria-hidden="true"><path/><circle r="34"/></svg>
    <div class="cg-say" role="status"></div>
    <div class="cg-time" aria-hidden="true"></div>
    <div class="cg-play">
      <div class="cg-keys"><kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd><span>${w.keys}</span><kbd>${w.spaceKey}</kbd><span>${w.space}</span></div>
      <div class="cg-pad">
        <button type="button" data-v="0,1" aria-label="↑">${ARROW(0)}</button>
        <button type="button" data-v="-1,0" aria-label="←">${ARROW(-90)}</button>
        <button type="button" data-v="1,0" aria-label="→">${ARROW(90)}</button>
        <button type="button" data-v="0,-1" aria-label="↓">${ARROW(180)}</button>
      </div>
      <button type="button" class="cg-drop">${w.drop}</button>
    </div>
    <div class="cg-card" role="status">
      <h2>${w.won}</h2>
      <p></p>
      <div>
        <button type="button" class="cg-btn is-main" data-a="again">${w.again}</button>
        <button type="button" class="cg-btn" data-a="leave">${w.leave}</button>
      </div>
    </div>
    <div class="cg-top">
      <button type="button" class="cg-round" data-a="sound" aria-label="${w.mute}">${SOUND_ON}</button>
      <button type="button" class="cg-round" data-a="exit" aria-label="${w.exit}">${CROSS}</button>
    </div>`
  host.append(el)
  const $ = <T extends Element>(s: string) => el.querySelector<T>(s)!
  const frame = $<HTMLIFrameElement>('.cg-frame')
  const say = $<HTMLElement>('.cg-say')
  const time = $<HTMLElement>('.cg-time')
  const card = $<HTMLElement>('.cg-card')
  const path = $<SVGSVGElement>('.cg-path')
  const bar = $<HTMLElement>('.cg-bar')
  const load = $<HTMLElement>('.cg-load')
  // Everything else on the page is out of reach while the game is open.
  const behind = [...host.children].filter((c): c is HTMLElement => c !== el && c instanceof HTMLElement && !c.inert)
  behind.forEach(c => (c.inert = true))
  const scrollY = window.scrollY
  const htmlOverflow = document.documentElement.style.overflow
  document.documentElement.style.overflow = 'hidden'
  document.documentElement.dataset.clawGame = 'on'
  requestAnimationFrame(() => el.classList.add('is-on'))

  const ctl = new AbortController()
  const { signal } = ctl
  const send = (fn: string, arg: string | number = '') => frame.contentWindow?.postMessage({ fn, arg, focus: true }, location.origin)
  const refocus = () => frame.focus()
  const speak = (text: string, urgent = false) => {
    say.textContent = text
    say.classList.toggle('is-on', !!text)
    say.classList.toggle('is-urgent', urgent)
  }
  let sayTimer = 0
  const speakFor = (text: string, ms: number) => {
    speak(text)
    clearTimeout(sayTimer)
    sayTimer = window.setTimeout(() => speak(''), ms)
  }
  const fmt = new Intl.NumberFormat(lang)

  const close = () => {
    if (!open_) return
    open_ = null
    ctl.abort()
    clearTimeout(sayTimer)
    el.classList.remove('is-on')
    document.documentElement.style.overflow = htmlOverflow
    delete document.documentElement.dataset.clawGame
    behind.forEach(c => (c.inert = false))
    window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior })
    // Taking the frame out of the page ends the game and frees its memory.
    setTimeout(() => el.remove(), 300)
    back?.focus({ preventScroll: true })
  }
  open_ = close

  window.addEventListener('message', e => {
    if (e.origin !== location.origin || e.source !== frame.contentWindow || !e.data?.claw) return
    const { claw, value } = e.data as { claw: string; value: string }
    switch (claw) {
      case 'progress':
        bar.style.setProperty('--p', String(Math.max(0.02, Number(value))))
        break
      case 'ready':
        el.classList.add('is-ready')
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) send('ReduceMotion')
        refocus()
        break
      case 'fail':
        load.querySelector('b')!.textContent = w.fail
        bar.remove()
        load.querySelector('small')?.remove()
        load.querySelector('img')?.remove()
        break
      case 'esc':
        close()
        break
      case 'coin': {
        const [cx, cy, sx, sy] = value.split(',').map(Number)
        const W = el.clientWidth, H = el.clientHeight
        const x0 = cx * W, y0 = (1 - cy) * H, x1 = sx * W, y1 = (1 - sy) * H
        path.setAttribute('viewBox', `0 0 ${W} ${H}`)
        const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - H * 0.14
        const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy) || 1
        const gap = Math.min(H * 0.1, d * 0.2)
        path.querySelector('path')!.setAttribute('d', `M${x0 + (dx / d) * gap} ${y0 + (dy / d) * gap - gap * 0.5}Q${mx} ${my} ${x1} ${y1}`)
        const c = path.querySelector('circle')!
        c.setAttribute('cx', String(x1))
        c.setAttribute('cy', String(y1))
        break
      }
      case 'state':
        onState(value)
        break
      case 'time': {
        const s = Math.max(0, Number(value))
        time.textContent = `${fmt.format(0)}:${fmt.format(Math.floor(s / 10))}${fmt.format(s % 10)}`
        time.classList.toggle('is-low', s <= 5)
        break
      }
      case 'lose':
        el.classList.remove('is-playing')
        speakFor(w.lose, 3200)
        break
      case 'win':
        el.classList.remove('is-playing')
        speak('')
        card.querySelector('p')!.textContent = w.prizes[value] ?? w.prizes.capsule
        card.classList.add('is-on')
        card.querySelector<HTMLElement>('.is-main')!.focus()
        break
    }
    window.dispatchEvent(new CustomEvent('claw:event', { detail: { claw, value } }))
  }, { signal })

  let slipped = false
  function onState(s: string) {
    path.classList.toggle('is-on', s === 'coin')
    switch (s) {
      case 'coin':
        speak(w.drag)
        break
      case 'dragging':
        speak(w.almost)
        break
      case 'insert':
      case 'fly-in':
      case 'fly-coin':
        if (say.textContent === w.drag || say.textContent === w.almost) speak('')
        break
      case 'play':
        el.classList.add('is-playing')
        speakFor(w.move, 3600)
        refocus()
        break
      case 'drop':
        el.classList.remove('is-playing')
        slipped = false
        speak(w.holding[0])
        break
      case 'close':
        speak(w.holding[1])
        break
      case 'lift':
        speak(w.holding[2])
        break
      case 'return':
        if (!slipped) speak(w.holding[3])
        break
      case 'release':
        speak(w.holding[4])
        break
      case 'slip':
        speak(w.slip, true)
        slipped = true
        break
    }
  }

  // Keys that land on this layer, when a button rather than the game has focus, must not reach the page beneath it.
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
      return
    }
    if (e.key.startsWith('Arrow') || e.key === ' ') {
      if (document.activeElement?.tagName !== 'BUTTON' || e.key !== ' ') e.preventDefault()
      e.stopImmediatePropagation()
      refocus()
    }
  }, { capture: true, signal })

  let muted = false
  el.addEventListener('click', e => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-a]')
    if (!b) return
    switch (b.dataset.a) {
      case 'exit':
      case 'leave':
        close()
        break
      case 'again':
        card.classList.remove('is-on')
        send('Again')
        refocus()
        break
      case 'sound':
        muted = !muted
        b.innerHTML = muted ? SOUND_OFF : SOUND_ON
        b.setAttribute('aria-label', muted ? w.unmute : w.mute)
        send('AudioOn', muted ? '0' : '1')
        refocus()
        break
    }
  }, { signal })

  // The on-screen pad, for touch screens. Sliding from one arrow to another works, as on a real joystick.
  const pad = $<HTMLElement>('.cg-pad')
  const held = new Map<number, HTMLElement>()
  const update = () => {
    let x = 0, y = 0
    pad.querySelectorAll('.is-down').forEach(n => n.classList.remove('is-down'))
    held.forEach(b => {
      const [a, c] = b.dataset.v!.split(',').map(Number)
      x += a
      y += c
      b.classList.add('is-down')
    })
    send('Hold', `${x},${y}`)
  }
  const hit = (e: PointerEvent) => (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLElement>('.cg-pad [data-v]') ?? null
  pad.addEventListener('pointerdown', e => {
    const b = hit(e)
    if (!b) return
    e.preventDefault()
    pad.setPointerCapture(e.pointerId)
    held.set(e.pointerId, b)
    update()
  }, { signal })
  pad.addEventListener('pointermove', e => {
    if (!held.has(e.pointerId)) return
    const b = hit(e)
    if (b && b !== held.get(e.pointerId)) {
      held.set(e.pointerId, b)
      update()
    }
  }, { signal })
  const lift = (e: PointerEvent) => {
    if (held.delete(e.pointerId)) update()
  }
  pad.addEventListener('pointerup', lift, { signal })
  pad.addEventListener('pointercancel', lift, { signal })
  $<HTMLElement>('.cg-drop').addEventListener('click', () => {
    send('Drop')
    refocus()
  }, { signal })

  frame.addEventListener('load', refocus, { signal })
}
