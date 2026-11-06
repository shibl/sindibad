// Development only: mounts the concept on the real page without the switcher knowing, so it can be tested before index.ts exists.
// Open the site with ?about=original and import this module from the console or a capture script.
import { createMark } from '../../mark'
import type { AboutCtx } from '../../types'
import { mountHoopoe } from '../main'

const section = document.querySelector<HTMLElement>('#about')!
const copy = section.querySelector<HTMLElement>('.a-intro-copy')!
const headline = copy.querySelector('h2')!
const body = copy.querySelector('p')!
const cta = copy.querySelector<HTMLAnchorElement>('a.a-pill')!
const lang = document.documentElement.lang === 'ar' ? 'ar' : 'en'
const rtl = lang === 'ar'
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
const touch = matchMedia('(pointer: coarse)').matches && innerWidth < 900
section.dataset.about = 'hoopoe'
const ac = new AbortController()
const stage = document.createElement('div')
stage.className = 'about-stage'
section.append(stage)
const mark = createMark(rtl, reduce, ac.signal)
copy.insertBefore(mark.el, headline)
let pinned = false
const fns: ((p: number, dt: number) => void)[] = []
const progress = () => {
  const r = section.getBoundingClientRect()
  const vh = innerHeight
  const t = pinned ? -r.top / Math.max(1, r.height - vh) : (vh - r.top) / Math.max(1, vh + r.height)
  return Math.max(0, Math.min(1, t))
}
let last = performance.now()
const loop = (now: number) => {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  const p = progress()
  for (const fn of fns) fn(p, dt)
  requestAnimationFrame(loop)
}
const ctx: AboutCtx = {
  section, stage, copy, headline, body, cta, mark, lang, rtl, reduce, touch, signal: ac.signal, base: import.meta.env.BASE_URL,
  pin(length) {
    pinned = true
    stage.classList.add('is-pinned')
    section.style.height = `calc(100svh + ${length * 100}svh)`
  },
  frame(fn) {
    fns.push(fn)
  },
}
;(window as any).__progress = progress
await mountHoopoe(ctx)
requestAnimationFrame(loop)
;(window as any).__mounted = true
export {}
