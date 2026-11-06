// Don't Press: a reflex game about self-control. The board hanging over the machine gives orders, and you press the dome only when
// it truly tells you to. It starts plain, then lies: fake-outs, double negatives, colours that mean nothing, and finally Simon.
// One input throughout (the dome, or Space), about thirty seconds, three strikes.
import { LAYOUT } from './press-layout'
import { buzz, isMuted, setMuted, sound, wake } from './press-sound'
import { fitText, lang, stillness, WORDS } from './press-words'

const ART = `${import.meta.env.BASE_URL}concepts/press/`
const NAMES = ['g-cover-0', 'g-base', 'g-dome-0', 'g-dome-1', 'g-dome-2', 'g-dome-3', 'g-cover-1', 'g-cover-2', 'g-cover-3', 'g-cover-4', 'board']
const SOUND_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.500v5h4l5 4v-13l-5 4z" fill="currentColor"/><path d="M16.500 9a4.200 4.200 0 0 1 0 6M19 6.500a7.800 7.800 0 0 1 0 11"/></svg>'
const SOUND_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.500v5h4l5 4v-13l-5 4z" fill="currentColor"/><path d="m17 9.500 5 5m0-5-5 5"/></svg>'
const CROSS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>'

// Where the machine sits in its picture, and the board's proportions, measured from the renders.
const MACHINE = { left: 0.231, right: 0.758, top: 0.429, bottom: 0.853, cx: 0.4945 }
const BOARD_RATIO = 1400 / 495
const GAME_SECONDS = 30
// A press this soon after the board turns against you was meant for the order before, and costs nothing. Longer if that order said to press.
const GRACE = 130
const GRACE_AFTER_GO = 260
const RANKS = [0, 1500, 4000, 7500, 11000]

const pictures: HTMLImageElement[] = []
let loading: Promise<unknown> | null = null
export function loadGame() {
  loading ??= Promise.all(
    NAMES.map(n => {
      const i = new Image()
      i.src = `${ART}${n}.webp`
      pictures.push(i)
      return i.decode().catch(() => {})
    }),
  )
  return loading
}

type Tone = 'go' | 'stop' | 'plain'
type Card = {
  say: string
  go: boolean // whether pressing is right
  ms: number
  tone: Tone
  soft?: boolean // no blame for missing it: it turns into `next` on its own
  next?: Card
  tease?: boolean // the board makes as if to flip, and doesn't
  reveal?: string // the words carry on after a moment
  warn?: boolean // a wrong press is only a warning, the first time you meet a new trick
  hint?: string
  dodge?: boolean
}

export function openGame(opts: { x: number; y: number; back: HTMLElement; onClose: () => void }) {
  const words = WORDS[lang()]
  const fmt = new Intl.NumberFormat(lang() === 'ar' ? 'ar-EG' : 'en')
  const host = document.querySelector<HTMLElement>('.design-a') ?? document.body
  const ctl = new AbortController()
  const { signal } = ctl

  const el = document.createElement('div')
  el.className = 'pr'
  el.setAttribute('role', 'dialog')
  el.setAttribute('aria-modal', 'true')
  el.setAttribute('aria-label', words.title)
  el.setAttribute('data-lenis-prevent', '')
  el.style.setProperty('--ox', `${opts.x}px`)
  el.style.setProperty('--oy', `${opts.y}px`)
  el.innerHTML = `
    <div class="pr-beams" aria-hidden="true"></div>
    <div class="pr-machine">
      <div class="pr-v"></div>
    </div>
    <div class="pr-sign" aria-hidden="true">
      <i class="pr-rod is-a"></i><i class="pr-rod is-b"></i>
      <div class="pr-board">
        <img src="${ART}board.webp" alt="" draggable="false">
        <div class="pr-board-text"></div>
      </div>
    </div>
    <div class="pr-say" aria-hidden="true"></div>
    <div class="pr-flash" aria-hidden="true"></div>
    <div class="pr-hud">
      <div class="pr-score"><small>${words.score}</small><b data-n="0">${fmt.format(0)}</b></div>
      <div class="pr-streak" aria-hidden="true"></div>
      <div class="pr-strikes" role="img" aria-label="${words.strikes}"><i></i><i></i><i></i></div>
    </div>
    <div class="pr-top">
      <button type="button" class="pr-round" data-a="sound" aria-label="${isMuted() ? words.unmute : words.mute}">${isMuted() ? SOUND_OFF : SOUND_ON}</button>
      <button type="button" class="pr-round" data-a="exit" aria-label="${words.exit}">${CROSS}</button>
    </div>
    <div class="pr-card" role="status">
      <small class="pr-card-new"></small>
      <h2 class="pr-card-rank"></h2>
      <p class="pr-card-joke"></p>
      <div class="pr-card-nums">
        <div><small>${words.score}</small><b class="pr-card-score"></b></div>
        <div><small>${words.best}</small><b class="pr-card-best"></b></div>
      </div>
      <div class="pr-card-do">
        <button type="button" class="pr-btn is-main" data-a="again">${words.again}</button>
        <button type="button" class="pr-btn" data-a="exit">${words.leave}</button>
      </div>
    </div>
    <div class="pr-sr" aria-live="assertive"></div>`
  host.append(el)
  const $ = <T extends Element>(s: string) => el.querySelector<T>(s)!

  // ------------------------------------------------------------------------------------------------- the machine's parts
  const v = $<HTMLElement>('.pr-v')
  const machine = $<HTMLElement>('.pr-machine')
  const layer = (name: string, cls = '') => {
    const i = v.appendChild(document.createElement('img'))
    i.src = `${ART}${name}.webp`
    i.alt = ''
    i.draggable = false
    if (cls) i.className = cls
    return i
  }
  const coverOpen = layer('g-cover-0')
  layer('g-base')
  const game = LAYOUT.game
  // The bulbs the camera can see, in one unbroken run around the rim, so that they go out in order.
  const seen = game.bulbs.map((_, i) => i).filter(i => game.seen[i])
  const firstAfterGap = seen.findIndex((i, k) => k > 0 && seen[k - 1] !== i - 1)
  const order = firstAfterGap > 0 ? [...seen.slice(firstAfterGap), ...seen.slice(0, firstAfterGap)] : seen
  const bulbs = order.map(i => {
    const b = v.appendChild(document.createElement('i'))
    b.className = 'pr-bulb'
    b.style.cssText = `left:${game.bulbs[i][0] * 1000}px;top:${game.bulbs[i][1] * 1000}px`
    return b
  })
  const domes = [0, 1, 2, 3].map(i => layer(`g-dome-${i}`, i ? 'is-off' : ''))
  const glow = v.appendChild(document.createElement('i'))
  glow.className = 'pr-dome-glow'
  glow.style.cssText = `left:${game.dome.cx * 1000}px;top:${(game.dome.cy - 0.02) * 1000}px;width:${game.dome.rx * 2200}px;height:${game.dome.ry * 2300}px`
  const covers = [1, 2, 3, 4].map(i => layer(`g-cover-${i}`, 'is-off'))
  const go = v.appendChild(document.createElement('button'))
  go.type = 'button'
  go.className = 'pr-go'
  go.setAttribute('aria-label', words.press1)
  // Generous on purpose: the whole top of the machine counts, so a thumb never misses for the wrong reason.
  go.style.cssText = `left:${(game.dome.cx - game.dome.rx * 1.42) * 1000}px;top:${(game.dome.top[1] - 0.05) * 1000}px;width:${game.dome.rx * 2840}px;height:${(game.dome.cy + game.dome.ry * 1.5 - game.dome.top[1] + 0.05) * 1000}px`

  const sign = $<HTMLElement>('.pr-sign')
  const board = $<HTMLElement>('.pr-board')
  const boardText = $<HTMLElement>('.pr-board-text')
  const sayEl = $<HTMLElement>('.pr-say')
  const flashEl = $<HTMLElement>('.pr-flash')
  const scoreEl = $<HTMLElement>('.pr-score b')
  const streakEl = $<HTMLElement>('.pr-streak')
  const strikeEls = [...el.querySelectorAll<HTMLElement>('.pr-strikes i')]
  const card = $<HTMLElement>('.pr-card')
  const sr = $<HTMLElement>('.pr-sr')

  // ------------------------------------------------------------------------------------------------------------ layout
  let boardH = 100
  let nudge = 0
  const place = () => {
    const W = innerWidth, H = innerHeight
    const narrow = W < 720
    const boardW = Math.min(W * 0.86, narrow ? 560 : 640, (H * 0.27) * BOARD_RATIO)
    boardH = boardW / BOARD_RATIO
    const clearOfHud = (W - boardW) / 2 > 190
    const top = clearOfHud ? Math.max(18, H * 0.035) : 86
    sign.style.cssText = `left:${(W - boardW) / 2}px;top:${top}px;width:${boardW}px;height:${boardH}px;--drop:${top + boardH * 0.5}px`
    sayEl.style.top = `${top + boardH + 12}px`
    const below = top + boardH + 12
    const gapMachine = MACHINE.bottom - MACHINE.top
    const S = Math.min((W * 0.94) / (MACHINE.right - MACHINE.left), (H - below - 14) / gapMachine, 1080)
    // On tall screens the machine sits a little above the bottom edge, in easy reach of a thumb.
    const spare = H - below - S * gapMachine
    const bottom = Math.max(12, spare * 0.32)
    machine.style.cssText = `width:${S}px;height:${S}px;left:${W / 2 - S * MACHINE.cx}px;top:${H - bottom - S * MACHINE.bottom}px;--nudge:${nudge}px`
    v.style.transform = `scale(${S / 1000})`
    nudge = 0
    machine.style.setProperty('--nudge', '0px')
    const text = boardText.textContent
    if (text) fitText(boardText, text, boardH * 0.46, boardH * 0.14)
  }
  place()
  window.addEventListener('resize', place, { signal })

  // ------------------------------------------------------------------------------------------------------- the page beneath
  const htmlOverflow = document.documentElement.style.overflow
  const scrollY_ = window.scrollY
  document.documentElement.style.overflow = 'hidden'
  const behind = [...host.children].filter(c => c !== el) as HTMLElement[]
  behind.forEach(c => (c.inert = true))

  // -------------------------------------------------------------------------------------------------------------- timers
  let timers: ReturnType<typeof setTimeout>[] = []
  const after = (ms: number, fn: () => void) => {
    const id = setTimeout(fn, ms)
    timers.push(id)
    return id
  }
  const clearTimers = () => {
    timers.forEach(clearTimeout)
    timers = []
  }

  // ------------------------------------------------------------------------------------------------------- the moving parts
  let domeBusy = 0
  const setDome = (f: number) => domes.forEach((d, i) => d.classList.toggle('is-off', i !== f))
  const pressDome = () => {
    const token = ++domeBusy
    if (stillness()) {
      setDome(3)
      setTimeout(() => token === domeBusy && setDome(0), 140)
      return
    }
    setDome(2)
    setTimeout(() => token === domeBusy && setDome(3), 22)
    setTimeout(() => token === domeBusy && setDome(2), 110)
    setTimeout(() => token === domeBusy && setDome(1), 145)
    setTimeout(() => token === domeBusy && setDome(0), 185)
  }
  let coverShut = false
  const setCover = (f: number) => {
    coverOpen.classList.toggle('is-off', f > 0)
    covers.forEach((c, i) => c.classList.toggle('is-off', i !== f - 1))
  }
  const slam = () => {
    coverShut = true
    if (stillness()) {
      setCover(4)
      sound.slam()
      return
    }
    ;[1, 2, 3, 4].forEach((f, i) => after(i * 36, () => setCover(f)))
    after(130, () => {
      sound.slam()
      buzz(30)
      machine.animate([{ translate: '0 7px' }, { translate: '0 -2px' }, { translate: '0 0' }], { duration: 170, easing: 'ease-out', composite: 'add' })
    })
  }
  const reopen = () => {
    coverShut = false
    if (stillness()) return setCover(0)
    ;[3, 2, 1, 0].forEach((f, i) => after(i * 55, () => setCover(f)))
  }

  // The board turns on its axle: words change while it's edge-on to you.
  let flips = 0
  const boardTone = (t: Tone) => (boardText.dataset.tone = t)
  const flip = (text: string, tone: Tone, onChange?: () => void, opts2?: { silent?: boolean }) => {
    if (!opts2?.silent) sound.clack()
    sr.textContent = text
    const change = () => {
      fitText(boardText, text, boardH * 0.46, boardH * 0.14)
      boardTone(tone)
      boardText.dataset.flips = String(++flips)
      onChange?.()
    }
    if (stillness()) return change()
    board.getAnimations().forEach(a => a.cancel())
    board.animate([{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(88deg)' }], { duration: 68, easing: 'ease-in' }).onfinish = () => {
      change()
      board.animate(
        [{ transform: 'rotateX(-88deg)' }, { transform: 'rotateX(10deg)', offset: 0.72 }, { transform: 'rotateX(0deg)' }],
        { duration: 120, easing: 'ease-out' },
      )
    }
    sign.animate([{ rotate: '0deg' }, { rotate: '1.1deg' }, { rotate: '-0.7deg' }, { rotate: '0deg' }], { duration: 430, easing: 'ease-out' })
  }
  const wobble = () => {
    sound.clack()
    if (stillness()) return
    board.animate([{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(52deg)', offset: 0.45 }, { transform: 'rotateX(-8deg)', offset: 0.8 }, { transform: 'rotateX(0deg)' }], { duration: 300, easing: 'ease-in-out' })
  }
  let sayTimer = 0
  const bubble = (text: string, ms = 1100, tone = '') => {
    sayEl.textContent = text
    sayEl.dataset.tone = tone
    sayEl.classList.add('is-on')
    clearTimeout(sayTimer)
    sayTimer = window.setTimeout(() => sayEl.classList.remove('is-on'), ms)
  }
  const float_ = (text: string, big: boolean) => {
    const f = machine.appendChild(document.createElement('i'))
    f.className = big ? 'pr-float is-big' : 'pr-float'
    f.textContent = text
    f.style.left = `${game.dome.cx * 100 + (Math.random() - 0.5) * 8}%`
    f.style.top = `${(game.dome.top[1] - 0.01) * 100}%`
    if (stillness()) setTimeout(() => f.remove(), 500)
    else f.animate(
      [{ translate: '-50% 8px', scale: '0.7', opacity: 0 }, { translate: '-50% -18px', scale: '1.12', opacity: 1, offset: 0.2 }, { translate: '-50% -74px', scale: '1', opacity: 0 }],
      { duration: 720, easing: 'cubic-bezier(.2,.7,.3,1)' },
    ).onfinish = () => f.remove()
  }
  const burst = () => {
    if (stillness()) return
    for (let i = 0; i < 9; i++) {
      const s = machine.appendChild(document.createElement('i'))
      s.className = 'pr-star'
      const a = (i / 9) * Math.PI * 2 + Math.random()
      const r = 90 + Math.random() * 120
      s.style.left = `${game.dome.cx * 100}%`
      s.style.top = `${game.dome.cy * 100}%`
      s.animate(
        [{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * r}px), calc(-50% + ${Math.sin(a) * r * 0.7 - 30}px)) scale(1) rotate(120deg)`, opacity: 0 }],
        { duration: 620, easing: 'cubic-bezier(.15,.7,.3,1)' },
      ).onfinish = () => s.remove()
    }
  }
  const flash = (red: boolean) => {
    flashEl.dataset.tone = red ? 'red' : 'gold'
    flashEl.animate(stillness() ? [{ opacity: 0.35 }, { opacity: 0 }] : [{ opacity: 0.75 }, { opacity: 0.1 }, { opacity: 0.55 }, { opacity: 0 }], { duration: stillness() ? 500 : 620, easing: 'ease-out' })
  }

  // --------------------------------------------------------------------------------------------------------- the game's state
  type Phase = 'intro' | 'play' | 'locked' | 'banner' | 'over' | 'closed'
  let phase: Phase = 'intro'
  let timeLeft = GAME_SECONDS
  let score = 0
  let streak = 0
  let strikes = 0
  let simon = false
  let current: Card | null = null
  let truth: boolean | null = null
  let changedAt = 0
  let grace = GRACE
  let shownAt = 0
  let answered = false
  let runGo = 0
  let runStop = 0
  let clockRuns = false
  let met = { double: false, reveal: false, flop: false, tease: false }

  const multiplier = () => Math.min(5, 1 + Math.floor(streak / 4))
  const elapsed = () => GAME_SECONDS - timeLeft
  const setScore = (n: number) => {
    score = n
    scoreEl.textContent = fmt.format(n)
    scoreEl.dataset.n = String(n)
  }
  const setStreak = () => {
    const m = multiplier()
    streakEl.textContent = m > 1 ? `×${fmt.format(m)}` : ''
    streakEl.dataset.m = String(m)
  }
  const drawBulbs = () => {
    const n = bulbs.length
    const lit = Math.max(0, Math.ceil((timeLeft / GAME_SECONDS) * n))
    bulbs.forEach((b, i) => {
      b.classList.toggle('is-on', i < lit)
      b.classList.toggle('is-last', i === lit - 1 && lit <= 5)
    })
  }

  // -------------------------------------------------------------------------------------------------------------- the deck
  const windowFor = (t: number) => Math.max(650, 1500 - 850 * Math.min(1, t / GAME_SECONDS))
  const holdFor = (t: number) => Math.max(650, 1150 - 480 * Math.min(1, t / GAME_SECONDS))
  const lied = (t: number) => t >= 14 && Math.random() < 0.45
  const toneFor = (right: boolean, t: number): Tone => (lied(t) ? (right ? 'stop' : 'go') : right ? 'go' : 'stop')
  const pressCard = (t: number): Card => ({ say: words.press, go: true, ms: windowFor(t), tone: toneFor(true, t) })
  const dontCard = (t: number): Card => ({ say: words.dont, go: false, ms: holdFor(t), tone: toneFor(false, t) })

  const deal = (): Card => {
    const t = elapsed()
    const dodge = t >= 20 && !stillness() && Math.random() < 0.35
    if (simon) {
      const r = Math.random()
      if (runStop >= 3 || r < 0.5) return { say: words.simonGo, go: true, ms: windowFor(t) + 320 + (dodge ? 230 : 0), tone: toneFor(true, t), dodge }
      // A plain order isn't Simon's, however green it looks.
      if (r < 0.76) return { say: words.press, go: false, ms: holdFor(t) + 120, tone: 'go' }
      if (r < 0.9) return { say: words.simonNo, go: false, ms: holdFor(t) + 180, tone: 'stop' }
      return dontCard(t)
    }
    if (t >= 10 && !met.double) {
      met.double = true
      return { say: words.double, go: true, ms: windowFor(t) + 700, tone: 'go', hint: words.twoDonts }
    }
    if (t >= 12.5 && !met.reveal) {
      met.reveal = true
      return { say: words.almost, go: false, ms: 1300, tone: 'stop', reveal: words.not, warn: true, hint: words.readAll }
    }
    const r = Math.random()
    if (t >= 5 && !met.tease) {
      met.tease = true
      return { ...dontCard(t), ms: holdFor(t) + 450, tease: true }
    }
    if (t >= 7 && !met.flop) {
      met.flop = true
      return { ...pressCard(t), ms: 720, soft: true, tone: 'go', next: { ...dontCard(t), ms: holdFor(t) + 150 } }
    }
    if (runGo >= 3) return r < 0.5 && t >= 5 ? { ...dontCard(t), ms: holdFor(t) + 350, tease: true } : dontCard(t)
    if (runStop >= 3) return pressCard(t)
    if (t >= 12.5 && r < 0.12) return { say: words.almost, go: false, ms: holdFor(t) + 380, tone: toneFor(false, t), reveal: words.not }
    if (t >= 10 && r < 0.28) return { say: words.double, go: true, ms: windowFor(t) + 380, tone: toneFor(true, t) }
    if (t >= 7 && r < 0.4) return { ...pressCard(t), ms: 650, soft: true, next: { ...dontCard(t), ms: holdFor(t) + 100 } }
    if (t >= 5 && r < 0.48) return { ...dontCard(t), ms: holdFor(t) + 300, tease: true }
    return r < 0.74 ? pressCard(t) : dontCard(t)
  }

  // ------------------------------------------------------------------------------------------------------------- the rules
  const show = (c: Card) => {
    grace = current?.go ? GRACE_AFTER_GO : GRACE
    current = c
    answered = false
    truth = null
    machine.classList.toggle('is-slid', false)
    flip(c.say, c.tone, () => {
      truth = c.go
      changedAt = performance.now()
      shownAt = changedAt
      if (c.hint) bubble(c.hint, 1400)
      after(c.ms, () => expire(c))
      if (c.reveal) {
        after(Math.min(420, c.ms * 0.4), () => {
          sound.clack()
          fitText(boardText, c.reveal!, boardH * 0.46, boardH * 0.14)
          sr.textContent = c.reveal!
          if (!stillness()) board.animate([{ scale: '1' }, { scale: '1.04' }, { scale: '1' }], { duration: 160 })
        })
      }
      if (c.tease) after(Math.min(420, c.ms * 0.4), wobble)
      if (c.dodge) {
        after(170, () => {
          const side = Math.random() < 0.5 ? -1 : 1
          nudge = side * Math.min(innerWidth * 0.16, 130)
          machine.style.setProperty('--nudge', `${nudge}px`)
          sound.soft()
        })
      }
    })
  }
  const expire = (c: Card) => {
    if (phase !== 'play' || c !== current || answered) return
    if (c.next) {
      // It changed its mind before you got there. No harm done, and no points.
      show(c.next)
      return
    }
    if (c.go) {
      streak = 0
      setStreak()
      sound.slow()
      bubble(words.slow, 700)
      runGo++
      runStop = 0
    } else {
      streak++
      setStreak()
      setScore(score + 20 * multiplier())
      sound.soft()
      runStop++
      runGo = 0
    }
    answered = true
    nextCard()
  }
  const nudgeBack = () => {
    if (!nudge) return
    nudge = 0
    machine.style.setProperty('--nudge', '0px')
  }
  const nextCard = () => {
    nudgeBack()
    if (phase !== 'play') return
    if (timeLeft <= 0) return finish(false)
    const t = elapsed()
    if (!simon && t >= 18) return startSimon()
    if (t >= 9 && !stillness() && Math.random() < 0.09) return ambush()
    show(deal())
  }
  // The cover slams for no reason at all. Nothing is at stake while it's shut.
  const ambush = () => {
    truth = null
    current = null
    flip(words.notYet, 'plain')
    slam()
    after(560, () => {
      reopen()
      after(190, () => phase === 'play' && show(deal()))
    })
  }
  const startSimon = () => {
    phase = 'banner'
    clockRuns = false
    simon = true
    truth = null
    current = null
    flip(words.newRule, 'plain')
    sound.combo(3)
    flash(false)
    after(1000, () => flip(words.onlySimon, 'plain'))
    after(2500, () => {
      phase = 'play'
      clockRuns = true
      show({ say: words.simonGo, go: true, ms: windowFor(elapsed()) + 500, tone: 'go' })
    })
  }
  const correct = (c: Card) => {
    answered = true
    const now = performance.now()
    const used = Math.min(1, (now - shownAt) / Math.max(1, c.ms))
    const before = multiplier()
    streak++
    const after_ = multiplier()
    const gained = Math.round((100 + 100 * (1 - used)) * after_)
    setScore(score + gained)
    setStreak()
    float_(`+${fmt.format(gained)}`, after_ >= 3)
    sound.tick(streak)
    buzz(12)
    glow.classList.remove('is-hit')
    void glow.offsetWidth
    glow.classList.add('is-hit')
    if (after_ > before) {
      sound.combo(after_)
      burst()
      if (!stillness()) streakEl.animate([{ scale: '1.6' }, { scale: '1' }], { duration: 300, easing: 'cubic-bezier(.2,1.6,.4,1)' })
    }
    runGo++
    runStop = 0
    clearTimers()
    after(170, nextCard)
  }
  const strike = () => {
    strikes++
    strikeEls[strikes - 1]?.classList.add('is-hit')
    streak = 0
    setStreak()
    phase = 'locked'
    clockRuns = false
    truth = null
    clearTimers()
    nudgeBack()
    // Each strike knocks two lights out, and the time with them.
    timeLeft = Math.max(0.01, timeLeft - (2 / bulbs.length) * GAME_SECONDS)
    drawBulbs()
    sound.strike()
    sound.siren(0.84)
    buzz([70, 40, 70])
    flash(true)
    el.classList.add('is-alarm')
    machine.classList.add('is-alarm')
    if (!stillness()) el.animate([0, 1, -1, 1, -0.7, 0.5, 0].map(k => ({ transform: `translate(${k * 9}px, ${k * 5}px)` })), { duration: 380 })
    flip(words.told, 'stop')
    slam()
    if (strikes >= 3) {
      after(760, () => finish(true))
      return
    }
    after(880, () => {
      el.classList.remove('is-alarm')
      machine.classList.remove('is-alarm')
      reopen()
      after(230, () => {
        phase = 'play'
        clockRuns = true
        show(deal())
      })
    })
  }

  const tap = () => {
    if (phase === 'over' || phase === 'closed') return
    wake()
    if (coverShut) {
      sound.clunk()
      return
    }
    pressDome()
    sound.thunk()
    if (phase !== 'play' || answered || truth === null || !current) return
    if (truth) return correct(current)
    if (performance.now() - changedAt < grace) return
    if (current.warn) {
      current.warn = false
      bubble(words.readAll, 1100, 'warn')
      sound.clunk()
      return
    }
    strike()
  }

  const finish = (struck: boolean) => {
    phase = 'over'
    clockRuns = false
    truth = null
    current = null
    clearTimers()
    nudgeBack()
    timeLeft = struck ? timeLeft : 0
    if (!struck) drawBulbs()
    bulbs.forEach(b => b.classList.remove('is-on', 'is-last'))
    el.classList.remove('is-alarm')
    machine.classList.remove('is-alarm')
    flip(struck ? words.enough : words.time, 'plain')
    if (!coverShut) slam()
    sound.hush()
    let best = 0
    try {
      best = Number(localStorage.getItem('press-best')) || 0
    } catch {}
    const record = score > best && score > 0
    if (record) {
      best = score
      try {
        localStorage.setItem('press-best', String(best))
      } catch {}
    }
    after(780, () => {
      let rank = 0
      RANKS.forEach((at, i) => {
        if (score >= at) rank = i
      })
      // Going out on three strikes without much to show for it earns its own title.
      const [title, joke] = struck && rank < 2 ? words.offender : words.ranks[rank]
      $('.pr-card-rank').textContent = title
      $('.pr-card-joke').textContent = joke
      $('.pr-card-score').textContent = fmt.format(score)
      $('.pr-card-score').setAttribute('data-n', String(score))
      $('.pr-card-best').textContent = fmt.format(best)
      $('.pr-card-new').textContent = record ? words.newBest : ''
      card.classList.add('is-on')
      if (record) {
        sound.best()
        burst()
      } else {
        sound.over()
      }
      $<HTMLElement>('.pr-card .is-main').focus({ preventScroll: true })
    })
  }

  // The first go explains itself. Replays get straight to it.
  const begin = (first: boolean) => {
    clearTimers()
    card.classList.remove('is-on')
    timeLeft = GAME_SECONDS
    score = 0
    streak = 0
    strikes = 0
    simon = false
    current = null
    truth = null
    answered = false
    runGo = runStop = 0
    met = { double: false, reveal: false, flop: false, tease: false }
    setScore(0)
    setStreak()
    strikeEls.forEach(s => s.classList.remove('is-hit'))
    el.classList.remove('is-alarm')
    machine.classList.remove('is-alarm')
    coverShut = false
    setCover(0)
    setDome(0)
    phase = 'intro'
    clockRuns = false
    bulbs.forEach(b => b.classList.remove('is-on', 'is-last'))
    go.focus({ preventScroll: true })
    // The rim charges up, light by light, as the machine gets ready.
    const charge = (lead: number) => bulbs.forEach((b, i) => after(lead + i * 34, () => {
      b.classList.add('is-on')
      sound.beat(i)
    }))
    const start = () => {
      phase = 'play'
      clockRuns = true
      drawBulbs()
      show(pressCard(0))
    }
    if (first) {
      flip(words.fine, 'plain')
      after(1050, () => flip(words.rule, 'plain'))
      charge(1200)
      after(2650, () => flip(words.ready, 'plain'))
      after(3300, start)
    } else {
      flip(words.ready, 'plain')
      charge(0)
      after(800, start)
    }
  }

  // ------------------------------------------------------------------------------------------------------------- the clock
  let last = performance.now()
  let raf = 0
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame)
    const dt = Math.min(100, now - last)
    last = now
    if (!clockRuns) return
    timeLeft -= dt / 1000
    drawBulbs()
    if (timeLeft <= 0 && phase === 'play') finish(false)
  }
  raf = requestAnimationFrame(frame)
  // A hidden tab stops the clock, and coming back picks up with a fresh order rather than a stale one.
  document.addEventListener('visibilitychange', () => {
    if (phase !== 'play') return
    if (document.hidden) {
      clearTimers()
      truth = null
      current = null
    } else {
      flip(words.ready, 'plain')
      after(800, nextCard)
    }
  }, { signal })

  // ------------------------------------------------------------------------------------------------------------- the inputs
  go.addEventListener('pointerdown', e => {
    e.preventDefault()
    tap()
  }, { signal })
  // Only assistive technology clicks without a pointer or a key: those two have already pressed by now.
  let keyAt = 0
  go.addEventListener('click', e => {
    if (e.detail === 0 && performance.now() - keyAt > 500) tap()
  }, { signal })
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopImmediatePropagation()
      close()
      return
    }
    const onOtherButton = document.activeElement instanceof HTMLButtonElement && document.activeElement !== go
    if (e.key === ' ' || e.key === 'Enter') {
      if (onOtherButton) return
      e.preventDefault()
      e.stopImmediatePropagation()
      if (!e.repeat) {
        keyAt = performance.now()
        tap()
      }
      return
    }
    if (e.key.startsWith('Arrow')) {
      e.preventDefault()
      e.stopImmediatePropagation()
    }
  }, { capture: true, signal })
  el.addEventListener('click', e => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-a]')
    if (!b) return
    switch (b.dataset.a) {
      case 'exit':
        close()
        break
      case 'again':
        begin(false)
        break
      case 'sound': {
        const off = !isMuted()
        setMuted(off)
        b.innerHTML = off ? SOUND_OFF : SOUND_ON
        b.setAttribute('aria-label', off ? words.unmute : words.mute)
        go.focus({ preventScroll: true })
        break
      }
    }
  }, { signal })

  const close = () => {
    if (phase === 'closed') return
    phase = 'closed'
    clockRuns = false
    clearTimers()
    cancelAnimationFrame(raf)
    ctl.abort()
    clearTimeout(sayTimer)
    sound.hush()
    el.classList.remove('is-on')
    document.documentElement.style.overflow = htmlOverflow
    behind.forEach(c => (c.inert = false))
    window.scrollTo({ top: scrollY_, behavior: 'instant' as ScrollBehavior })
    setTimeout(() => el.remove(), stillness() ? 200 : 420)
    opts.onClose()
    opts.back.focus({ preventScroll: true })
  }

  // In it comes: the alarm's colour spreads out from the button you pressed.
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-on')))
  arrive()
  begin(true)

  function arrive() {
    if (stillness()) return
    machine.animate([{ scale: '0.72', translate: '0 40px', opacity: 0 }, { scale: '1', translate: '0 0', opacity: 1 }], { duration: 620, easing: 'cubic-bezier(.2,1.2,.3,1)' })
    sign.animate(
      [{ translate: '0 calc(-1 * var(--drop) - 60%)' }, { translate: '0 10px', offset: 0.65 }, { translate: '0 -3px', offset: 0.85 }, { translate: '0 0' }],
      { duration: 620, delay: 90, easing: 'cubic-bezier(.3,.8,.3,1)', fill: 'backwards' },
    )
  }
}
