// The game's full-screen layer. The game itself is a Unity WebGL build in a frame, so its megabytes arrive only after someone
// presses Set sail, and removing the frame frees everything again. This layer draws every word and button, in whichever language
// the page is in, and swaps messages with the frame. Same arrangement as ../../claw.ts.
import type { AboutCtx } from '../types'
import { WORDS } from './words'

const SOUND_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10v4h4l5 4V6L8 10H4z" fill="currentColor"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11"/></svg>'
const SOUND_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10v4h4l5 4V6L8 10H4z" fill="currentColor"/><path d="M17 10l4 4M21 10l-4 4"/></svg>'
const CROSS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'
// The studio's dhow reduced to a mark, used as the marker that sails along the loading line.
const BOAT = '<svg viewBox="0 0 64 56" aria-hidden="true"><path fill="currentColor" d="M31 3 C20 13 13 26 10 39 L31 39 Z"/><path fill="currentColor" opacity=".78" d="M35 12 C43 19 49 28 52 39 L35 39 Z"/><path fill="currentColor" d="M4 42 H60 C57 50 50 54 42 54 H20 C12 54 7 50 4 42 Z"/></svg>'
// Three small marks for the three islands: a blossom, a lighthouse and a bell.
const ICONS: Record<string, string> = {
  beautiful: '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor"><circle cx="12" cy="5.7" r="3.8"/><circle cx="18" cy="10" r="3.8"/><circle cx="15.7" cy="17.1" r="3.8"/><circle cx="8.3" cy="17.1" r="3.8"/><circle cx="6" cy="10" r="3.8"/></g><circle cx="12" cy="11.8" r="2.4" fill="var(--sg-chip, #013f3b)"/></svg>',
  research: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9 8h6l1.7 13H7.3L9 8z"/><path fill="currentColor" d="M8.5 4.5h7V7h-7zM10 2h4v2h-4z"/><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M17.5 4 22 2.6M17.5 6.2 22 7.6M6.5 4 2 2.6M6.5 6.2 2 7.6"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3a1.6 1.6 0 0 1 1.6 1.6v.5c3 .8 4.7 3.2 4.7 6.3 0 3.3.8 4.8 2.2 6.3.4.5.1 1.3-.6 1.3H4.1c-.7 0-1-.8-.6-1.3 1.4-1.5 2.2-3 2.2-6.3 0-3.1 1.7-5.5 4.7-6.3v-.5A1.6 1.6 0 0 1 12 3z"/><path fill="currentColor" d="M9.8 20.8h4.4a2.2 2.2 0 0 1-4.4 0z"/></svg>',
}
const ORDER = ['beautiful', 'research', 'play']

let open_: (() => void) | null = null

/** Closes the game if it's open. The concept calls this when it's switched away. */
export function closeGame() {
  open_?.()
}

type Island = { x: number; z: number; r: number }
// The chart in the corner draws the same places the game sails through. X east, Z north, in metres.
const WORLD: Record<string, Island> = {
  beautiful: { x: -330, z: 640, r: 130 },
  research: { x: 520, z: 880, r: 118 },
  play: { x: 40, z: 1320, r: 118 },
}
const MAP = { x0: -760, z0: -110, w: 1640, h: 1640 }

export function openGame(ctx: AboutCtx, back: HTMLElement, mbLabel: string) {
  if (open_) return
  const w = WORDS[ctx.lang]
  const base = ctx.base

  const el = document.createElement('div')
  el.className = 'sg'
  el.dir = ctx.rtl ? 'rtl' : 'ltr'
  el.lang = ctx.lang
  el.setAttribute('role', 'dialog')
  el.setAttribute('aria-modal', 'true')
  el.setAttribute('aria-label', w.title)
  el.setAttribute('data-lenis-prevent', '')
  const coarse = matchMedia('(pointer: coarse)').matches
  const chips = ORDER.map(id => `<li data-id="${id}"><i>${ICONS[id]}</i><span>${w.isles[id].name}</span></li>`).join('')
  el.innerHTML = `
    <div class="sg-load" aria-live="polite">
      <div class="sg-load-art" aria-hidden="true"></div>
      <div class="sg-load-box">
        <b>${w.loading}</b>
        <div class="sg-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="${w.loading}">
          <svg class="sg-wave" viewBox="0 0 400 24" preserveAspectRatio="none" aria-hidden="true"><path class="sg-wave-off" d="M0 12 Q 12.5 2 25 12 T 50 12 T 75 12 T 100 12 T 125 12 T 150 12 T 175 12 T 200 12 T 225 12 T 250 12 T 275 12 T 300 12 T 325 12 T 350 12 T 375 12 T 400 12"/><path class="sg-wave-on" pathLength="1" d="M0 12 Q 12.5 2 25 12 T 50 12 T 75 12 T 100 12 T 125 12 T 150 12 T 175 12 T 200 12 T 225 12 T 250 12 T 275 12 T 300 12 T 325 12 T 350 12 T 375 12 T 400 12"/></svg>
          <span class="sg-boat">${BOAT}</span>
        </div>
        <small><span class="sg-pct">0%</span> · ${w.weight.replace('{mb}', mbLabel)}</small>
      </div>
    </div>
    <iframe class="sg-frame" title="${w.title}" allow="autoplay; fullscreen; gamepad" src="${base}about/sail/game/index.html"></iframe>
    <div class="sg-curtain" aria-hidden="true"></div>
    <div class="sg-say" role="status"></div>
    <div class="sg-word" aria-live="polite"><b></b><span></span></div>
    <div class="sg-arrow" aria-hidden="true"><i></i></div>
    <div class="sg-hud">
      <ul class="sg-chips" aria-label="${w.toFind}">${chips}</ul>
      <div class="sg-map" aria-hidden="true"><canvas width="264" height="264"></canvas></div>
    </div>
    <div class="sg-card" role="status">
      <h2></h2>
      <div class="sg-card-row">
        <a class="sg-btn is-main" data-a="work" href="#contact"></a>
        <button type="button" class="sg-btn" data-a="again">${w.again}</button>
        <button type="button" class="sg-btn" data-a="leave">${w.back}</button>
      </div>
    </div>
    <div class="sg-top">
      <button type="button" class="sg-round" data-a="sound" aria-label="${w.mute}">${SOUND_ON}</button>
      <button type="button" class="sg-round" data-a="exit" aria-label="${w.close}">${CROSS}</button>
    </div>`
  ctx.section.append(el)

  const $ = <T extends Element>(s: string) => el.querySelector<T>(s)!
  const frame = $<HTMLIFrameElement>('.sg-frame')
  const load = $<HTMLElement>('.sg-load')
  const say = $<HTMLElement>('.sg-say')
  const word = $<HTMLElement>('.sg-word')
  const card = $<HTMLElement>('.sg-card')
  const arrow = $<HTMLElement>('.sg-arrow')
  const mapBox = $<HTMLElement>('.sg-map')
  const mapCanvas = mapBox.querySelector('canvas')!
  const track = $<HTMLElement>('.sg-track')
  const pct = $<HTMLElement>('.sg-pct')
  const curtain = $<HTMLElement>('.sg-curtain')

  // The poster the visitor just clicked stays behind the loader, so the page doesn't jump to a blank screen.
  const art = $<HTMLElement>('.sg-load-art')
  art.style.backgroundImage = `url(${base}about/sail/${ctx.touch ? 'tall' : 'wide'}.webp)`
  // The finale says the page's own headline back, live from the page, with its CTA.
  card.querySelector('h2')!.textContent = ctx.headline.textContent
  $<HTMLAnchorElement>('[data-a="work"]').textContent = ctx.cta.textContent

  // Everything else on the page is out of reach while the game is open: every sibling on the way up from this layer to the body.
  const behind: HTMLElement[] = []
  for (let node: HTMLElement = el; node !== document.body; node = node.parentElement!)
    for (const c of node.parentElement!.children)
      if (c !== node && c instanceof HTMLElement && !c.inert) behind.push(c)
  behind.forEach(c => (c.inert = true))
  const switcher = document.querySelector<HTMLElement>('.about-switch')
  const switcherVis = switcher?.style.visibility ?? ''
  if (switcher) switcher.style.visibility = 'hidden'
  const scrollY = window.scrollY
  const htmlOverflow = document.documentElement.style.overflow
  document.documentElement.style.overflow = 'hidden'
  document.documentElement.dataset.sailGame = 'on'
  requestAnimationFrame(() => el.classList.add('is-on'))

  const ctl = new AbortController()
  const { signal } = ctl
  ctx.signal.addEventListener('abort', () => close(), { signal })
  const send = (fn: string, arg: string | number = '', focus = true) => frame.contentWindow?.postMessage({ fn, arg, focus }, location.origin)
  const refocus = () => frame.focus()

  let sayTimer = 0
  let wordTimer = 0
  const speak = (text: string, ms = 0) => {
    clearTimeout(sayTimer)
    say.textContent = text
    say.classList.toggle('is-on', !!text)
    if (ms) sayTimer = window.setTimeout(() => say.classList.remove('is-on'), ms)
  }
  const showWord = (big: string, small: string, ms = 5200) => {
    clearTimeout(wordTimer)
    word.querySelector('b')!.textContent = big
    word.querySelector('span')!.textContent = small
    word.classList.add('is-on')
    wordTimer = window.setTimeout(() => word.classList.remove('is-on'), ms)
  }

  let closing = false
  function close(toContact = false) {
    if (closing) return
    closing = true
    open_ = null
    ctl.abort()
    clearTimeout(sayTimer)
    clearTimeout(wordTimer)
    clearTimeout(nextWord)
    clearTimeout(curtainTimer)
    cancelAnimationFrame(mapRaf)
    el.classList.remove('is-on')
    document.documentElement.style.overflow = htmlOverflow
    delete document.documentElement.dataset.sailGame
    behind.forEach(c => (c.inert = false))
    if (switcher) switcher.style.visibility = switcherVis
    window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior })
    // Taking the frame out of the page ends the game and frees its memory.
    frame.src = 'about:blank'
    setTimeout(() => el.remove(), 320)
    if (toContact) {
      document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' })
    } else {
      back.focus({ preventScroll: true })
    }
  }
  open_ = () => close()

  // The little chart. It stays dark until the research island reveals it, then shows you and whatever's left to find.
  const G = mapCanvas.getContext('2d')!
  let chartOn = 0
  let chartT = 0
  let mapRaf = 0
  const seen = new Set<string>()
  let boat = { x: 0, z: 0, h: 0 }
  const mapX = (x: number) => ((x - MAP.x0) / MAP.w) * 264
  const mapY = (z: number) => 264 - ((z - MAP.z0) / MAP.h) * 264
  const drawMap = (now: number) => {
    mapRaf = requestAnimationFrame(drawMap)
    if (!chartOn) return
    chartT = Math.min(1, chartT + 0.02)
    const c = G
    c.clearRect(0, 0, 264, 264)
    c.save()
    c.beginPath()
    c.arc(132, 132, 128 * (1 - (1 - chartT) ** 3), 0, Math.PI * 2)
    c.clip()
    c.fillStyle = 'rgba(2, 40, 44, 0.86)'
    c.fillRect(0, 0, 264, 264)
    c.strokeStyle = 'rgba(255, 228, 170, 0.28)'
    c.lineWidth = 1
    for (const r of [44, 88, 128]) {
      c.beginPath()
      c.arc(132, 132, r, 0, Math.PI * 2)
      c.stroke()
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      c.beginPath()
      c.moveTo(132 + Math.cos(a) * 18, 132 + Math.sin(a) * 18)
      c.lineTo(132 + Math.cos(a) * 128, 132 + Math.sin(a) * 128)
      c.stroke()
    }
    // Dashed routes to whatever is left.
    c.setLineDash([3, 5])
    c.lineDashOffset = -now / 80
    c.strokeStyle = 'rgba(255, 228, 170, 0.8)'
    for (const id of ORDER) {
      if (seen.has(id)) continue
      const i = WORLD[id]
      c.beginPath()
      c.moveTo(mapX(boat.x), mapY(boat.z))
      c.lineTo(mapX(i.x), mapY(i.z))
      c.stroke()
    }
    c.setLineDash([])
    for (const id of ORDER) {
      const i = WORLD[id]
      const done = seen.has(id)
      c.beginPath()
      c.arc(mapX(i.x), mapY(i.z), (i.r / MAP.w) * 264, 0, Math.PI * 2)
      c.fillStyle = done ? 'rgba(255, 228, 170, 0.3)' : 'rgba(255, 228, 170, 0.92)'
      c.fill()
    }
    // The boat.
    c.translate(mapX(boat.x), mapY(boat.z))
    c.rotate((boat.h * Math.PI) / 180)
    c.fillStyle = '#fa2a6f'
    c.strokeStyle = '#fff'
    c.lineWidth = 2
    c.beginPath()
    c.moveTo(0, -9)
    c.lineTo(6, 7)
    c.lineTo(0, 4)
    c.lineTo(-6, 7)
    c.closePath()
    c.stroke()
    c.fill()
    c.restore()
  }
  mapRaf = requestAnimationFrame(drawMap)

  window.addEventListener('message', e => {
    if (e.origin !== location.origin || e.source !== frame.contentWindow || !e.data?.sail) return
    const { sail, value } = e.data as { sail: string; value: string }
    switch (sail) {
      case 'progress': {
        const p = Math.max(0.02, Math.min(1, Number(value)))
        track.style.setProperty('--p', String(p))
        track.setAttribute('aria-valuenow', String(Math.round(p * 100)))
        pct.textContent = new Intl.NumberFormat(ctx.lang, { style: 'percent' }).format(p)
        break
      }
      case 'ready':
        el.classList.add('is-ready')
        if (ctx.reduce) send('ReduceMotion')
        // Sound off may have been pressed while the game was still on its way, or the tab may be in the background already.
        applySound()
        refocus()
        break
      case 'fail': {
        const webgl = value === 'webgl2'
        load.querySelector('b')!.textContent = webgl ? w.noGl : w.noLoad
        load.querySelector('.sg-track')?.remove()
        load.querySelector('small')?.remove()
        load.classList.add('is-failed')
        break
      }
      case 'esc':
        close()
        break
      case 'state':
        onState(value)
        break
      case 'arrive': {
        const i = w.isles[value]
        if (i) {
          speak('')
          showWord(i.name, i.line)
          el.querySelector(`.sg-chips [data-id="${value}"]`)?.classList.add('is-found')
          seen.add(value)
        }
        break
      }
      case 'chart':
        chartOn = 1
        mapBox.classList.add('is-on')
        speak(w.chart, 4200)
        break
      case 'tap':
        if (value === '1') speak(coarse ? w.tapTouch : w.tapDesktop, 6000)
        break
      case 'pos': {
        const [x, z, h, next, vx, vy, vz] = value.split(',').map(Number)
        boat = { x, z, h }
        // Point at the guide when she's out of sight, so nobody ever wonders where to go.
        const off = next >= 0 && (vz < 0 || vx < 0.04 || vx > 0.96 || vy < 0.06 || vy > 0.94)
        // Only once she's been gone a moment, so it doesn't flicker as she swings round the edge of the view.
        offFor = off ? offFor + 1 : 0
        arrow.classList.toggle('is-on', offFor > 10)
        if (off) {
          const toRight = (vz < 0 ? -(vx - 0.5) : vx - 0.5) >= 0
          arrow.style.setProperty('--x', toRight ? '92%' : '8%')
          arrow.style.setProperty('--r', toRight ? '90deg' : '-90deg')
        }
        break
      }
      case 'done':
        el.classList.add('is-done')
        card.classList.add('is-on')
        card.querySelector<HTMLElement>('.is-main')!.focus({ preventScroll: true })
        break
    }
    window.dispatchEvent(new CustomEvent('sail:event', { detail: { sail, value } }))
  }, { signal })

  function onState(s: string) {
    if (s === 'moment') clearTimeout(nextWord)
    if (s === 'sail' && !hinted) {
      hinted = true
      speak(coarse ? w.hintTouch : w.hintKeys)
      nextWord = window.setTimeout(() => speak(w.follow, 5000), 5000)
    }
  }
  let hinted = false
  let nextWord = 0
  let curtainTimer = 0
  let offFor = 0

  // Keys that land on this layer, when a button rather than the game has focus, must not reach the page beneath it,
  // and the review switcher's number keys mustn't change the concept under a game in progress.
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopImmediatePropagation()
      close()
      return
    }
    if (document.activeElement?.tagName === 'A' && e.key === 'Enter') return
    if (e.key.startsWith('Arrow') || e.key === ' ' || /^[0-9a-zA-Z]$/.test(e.key)) {
      if (document.activeElement?.tagName !== 'BUTTON' || e.key !== ' ') e.preventDefault()
      e.stopImmediatePropagation()
      if (!card.classList.contains('is-on')) refocus()
    }
  }, { capture: true, signal })

  // Nothing plays while the tab is in the background: the game stops drawing there, but looping sound wouldn't stop by itself.
  let muted = false
  const applySound = () => send('AudioOn', muted || document.hidden ? '0' : '1', false)
  document.addEventListener('visibilitychange', applySound, { signal })
  el.addEventListener('click', e => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-a]')
    if (!b) return
    switch (b.dataset.a) {
      case 'exit':
      case 'leave':
        close()
        break
      case 'work':
        e.preventDefault()
        close(true)
        break
      case 'again': {
        card.classList.remove('is-on')
        el.classList.remove('is-done')
        el.querySelectorAll('.is-found').forEach(n => n.classList.remove('is-found'))
        seen.clear()
        chartOn = 0
        chartT = 0
        mapBox.classList.remove('is-on')
        hinted = false
        // The day starts over, so it happens behind a short curtain rather than as a jump from dusk to gold.
        curtain.classList.add('is-on')
        curtainTimer = window.setTimeout(() => {
          send('Again')
          refocus()
          curtainTimer = window.setTimeout(() => curtain.classList.remove('is-on'), 160)
        }, 420)
        break
      }
      case 'sound':
        muted = !muted
        b.innerHTML = muted ? SOUND_OFF : SOUND_ON
        b.setAttribute('aria-label', muted ? w.unmute : w.mute)
        applySound()
        refocus()
        break
    }
  }, { signal })

  frame.addEventListener('load', refocus, { signal })
}
