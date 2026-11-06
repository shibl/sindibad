// The Don't Press slide. It starts as the same picture as ever, then swaps to separate layers of that picture, so the dome can
// breathe and the rim lights can chase, tempting you. Pressing it sets off the alarm and opens the game. Loaded by concepts.ts
// once the slide has landed. The game itself, and its pictures, only arrive after a press.
import './press.css'
import { LAYOUT } from './press-layout'
import { buzz, sound, wake } from './press-sound'
import { fitText, lang, quadMatrix, stillness, WORDS } from './press-words'

const ART = `${import.meta.env.BASE_URL}concepts/press/`
const FACE = { w: 1500, h: 424 } // the wedge sign's sloped face, in the same units as its corners below

export function mountPress(slot: HTMLElement, signal: AbortSignal) {
  const words = WORDS[lang()]
  const div = (parent: Element, cls: string) => {
    const e = parent.appendChild(document.createElement('div'))
    e.className = cls
    return e
  }
  const stage = div(slot, 'pr-hero')
  const v = div(stage, 'pr-v')
  const loading: Promise<unknown>[] = []
  const image = (parent: Element, name: string, cls = '') => {
    const i = parent.appendChild(document.createElement('img'))
    i.src = `${ART}${name}.webp`
    i.alt = ''
    i.draggable = false
    if (cls) i.className = cls
    loading.push(i.decode())
    return i
  }
  const hero = LAYOUT.hero
  div(v, 'pr-halo').style.cssText = `left:${hero.dome.cx * 1000}px;top:${hero.dome.cy * 1000}px`
  const cover = image(v, 'h-cover', 'pr-h-cover')
  cover.style.transformOrigin = `${hero.hinge[0] * 1000}px ${hero.hinge[1] * 1000}px`
  image(v, 'h-base')
  hero.bulbs.forEach(([x, y], i) => {
    if (!hero.seen[i]) return
    const b = div(v, 'pr-bulb')
    b.style.cssText = `left:${x * 1000}px;top:${y * 1000}px;--i:${i}`
  })
  const up = image(v, 'h-dome-0', 'pr-h-dome')
  up.style.transformOrigin = `${hero.dome.cx * 1000}px ${(hero.dome.cy + hero.dome.ry) * 1000}px`
  const down = image(v, 'h-dome-1', 'pr-h-dome-down')

  const wedge = div(v, 'pr-wedge')
  image(wedge, 'h-sign-blank')
  const baked = image(wedge, 'h-sign', 'pr-baked')
  const face = div(wedge, 'pr-wedge-face')
  face.style.cssText = `width:${FACE.w}px;height:${FACE.h}px;transform:${quadMatrix(
    FACE.w,
    FACE.h,
    // The slope's far edge is the top of the words, as seen from the camera.
    [hero.sign[3], hero.sign[2], hero.sign[1], hero.sign[0]].map(([x, y]) => [x * 1000, y * 1000]),
  )}`
  const faceText = div(face, 'pr-wedge-text')
  const say = (text: string | null) => {
    baked.style.visibility = text === null ? '' : 'hidden'
    faceText.style.visibility = text === null ? 'hidden' : 'visible'
    if (text !== null) fitText(faceText, text, 230, 60)
    if (text !== null && !stillness())
      faceText.animate([{ scale: '1.3', opacity: 0.3 }, { scale: '1', opacity: 1 }], { duration: 170, easing: 'cubic-bezier(.2,1.6,.4,1)' })
  }
  const idle = () => say(lang() === 'ar' ? words.dont : null)

  const hit = v.appendChild(document.createElement('button'))
  hit.type = 'button'
  hit.className = 'pr-hit'
  hit.setAttribute('aria-label', words.hero)
  // A little bigger than the dome itself, so it's an easy target for a thumb on a small slide.
  hit.style.cssText = `left:${(hero.dome.cx - hero.dome.rx * 1.2) * 1000}px;top:${(hero.dome.top[1] - 0.03) * 1000}px;width:${hero.dome.rx * 2400}px;height:${(hero.dome.cy + hero.dome.ry * 1.25 - hero.dome.top[1] + 0.03) * 1000}px`

  const size = () => {
    v.style.transform = `scale(${slot.clientWidth / 1000})`
    if (faceText.style.visibility !== 'hidden' && faceText.textContent) fitText(faceText, faceText.textContent, 230, 60)
  }
  const ro = new ResizeObserver(size)
  ro.observe(slot)
  signal.addEventListener('abort', () => ro.disconnect())

  Promise.all(loading).then(
    () => {
      if (signal.aborted) return
      size()
      idle()
      stage.classList.add('is-ready')
      // The flat picture stays underneath until the layers have painted over it, then steps aside so a pressed dome shows no ghost.
      setTimeout(() => {
        const flat = slot.querySelector<HTMLElement>(':scope > img')
        if (flat && !signal.aborted) flat.style.visibility = 'hidden'
      }, 120)
    },
    // Without its layers the slide is simply the picture it always was.
    () => stage.remove(),
  )

  let busy = false
  const squash = (on: boolean) => stage.classList.toggle('is-down', on)
  const tempted = (on: boolean) => stage.classList.toggle('is-tempted', on && !busy)
  hit.addEventListener('pointerenter', () => tempted(true), { signal })
  hit.addEventListener('pointerleave', () => tempted(false), { signal })
  hit.addEventListener('focus', () => tempted(hit.matches(':focus-visible')), { signal })
  hit.addEventListener('blur', () => tempted(false), { signal })
  hit.addEventListener(
    'pointerdown',
    e => {
      // A press on the dome is a press, and never the start of a swipe on the hero.
      e.stopPropagation()
      if (busy) return
      wake()
      squash(true)
      sound.thunk()
      buzz(16)
    },
    { signal },
  )
  // Slide off the dome before letting go and you've thought better of it.
  window.addEventListener('pointerup', e => {
    if (!busy && e.target !== hit) squash(false)
  }, { signal })
  window.addEventListener('pointercancel', () => {
    if (!busy) squash(false)
  }, { signal })

  const reset = () => {
    busy = false
    stage.classList.remove('is-alarm')
    squash(false)
    idle()
    sound.hush()
  }

  hit.addEventListener(
    'click',
    async e => {
      if (busy) return
      busy = true
      tempted(false)
      if (e.detail === 0) {
        wake()
        squash(true)
        sound.thunk()
      }
      stage.classList.add('is-alarm')
      setTimeout(() => {
        say(words.said)
        sound.clack()
      }, 130)
      setTimeout(() => squash(false), 220)
      sound.siren(1.6)
      buzz([40, 30, 40])
      if (!stillness()) {
        slot.animate(
          [0, 1, -1, 1, -1, 0.6, -0.6, 0].map(k => ({ translate: `${k * 5}px ${k * -2}px` })),
          { duration: 460 },
        )
      }
      const b = hit.getBoundingClientRect()
      const started = performance.now()
      const game = await import('./press-game')
      await game.loadGame()
      await new Promise(r => setTimeout(r, Math.max(0, (stillness() ? 500 : 980) - (performance.now() - started))))
      if (signal.aborted) return
      game.openGame({ x: b.left + b.width / 2, y: b.top + b.height / 2, back: hit, onClose: reset })
    },
    { signal },
  )
}
