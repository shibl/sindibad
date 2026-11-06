// The About section: the storybook is the section, and the other concepts are chapters inside it. The book stays loaded while a
// chapter is open, and every move between them goes through the book (see storybook/main.ts for the flight itself).
// Loaded in both development and production by entry-client.tsx.
// See README.md in this folder for the contract each concept follows.
import type Lenis from 'lenis'
import './about.css'
import { BOOK_WORDS, ICONS } from './chapters'
import { createMark } from './mark'
import type { AboutCtx, AboutMark, AboutMount, BookApi, BookTrip } from './types'

// The review bar. Nothing on the page opens it now the book does the switching: only the H key, for the team.
const CONCEPTS = [
  { id: 'original', label: 'Original', note: 'The section as it was' },
  { id: 'storybook', label: 'Storybook', note: 'A pop-up book opens as you scroll' },
  { id: 'xray', label: 'X-ray', note: 'A lens shows the research under the world' },
  { id: 'lantern', label: 'Lantern', note: 'A lantern throws a shadow world across the page' },
  { id: 'phone', label: 'Phone', note: 'A world pours out of a cheap phone' },
  { id: 'hoopoe', label: 'Hoopoe', note: 'The game’s guide lives on the page' },
  { id: 'sail', label: 'Set sail', note: 'A playable Unity sea behind one click' },
]
const HOME = 'storybook'
const loaders = import.meta.glob<{ default: AboutMount }>('./*/index.ts')
const loaderFor = (id: string) => loaders[`./${id}/index.ts`]
const known = (id: string | null) => !!id && CONCEPTS.some(c => c.id === id)

let lenis: Lenis | null = null
export const useLenis = (instance: Lenis) => {
  lenis = instance
}

const initial = (): string => {
  const asked = new URLSearchParams(location.search).get('about')
  return known(asked) ? asked! : HOME
}

type Layer = {
  id: string
  stage: HTMLElement
  ac: AbortController
  mark: AboutMark
  fns: ((p: number, dt: number) => void)[]
  near: boolean
  length: number
  raf: number
  /** Not drawing: the book while a chapter is open, a chapter while it waits behind shut doors. */
  held: boolean
  /** Draw even if the section has left the screen, as a flight mustn't stop halfway. */
  always: boolean
  frames: number
  cleanup: (() => void) | void
}

function start() {
  const section = document.querySelector<HTMLElement>('#about')
  const copy = section?.querySelector<HTMLElement>('.a-intro-copy')
  const headline = copy?.querySelector('h2')
  const body = copy?.querySelector('p')
  const cta = copy?.querySelector<HTMLAnchorElement>('a.a-pill')
  if (!section || !copy || !headline || !body || !cta) {
    requestAnimationFrame(start)
    return
  }

  const lang = document.documentElement.lang === 'ar' ? 'ar' : 'en'
  const rtl = lang === 'ar'
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  const touch = matchMedia('(pointer: coarse)').matches && innerWidth < 900
  const copyHome = { parent: copy.parentElement!, next: copy.nextSibling }
  const base = import.meta.env.BASE_URL

  let book: Layer | null = null
  let bookApi: BookApi | null = null
  let bookMounted: Promise<void> | null = null
  let chapter: Layer | null = null
  /** The layer whose height the section takes. */
  let active: Layer | null = null
  /** Which concept is showing, or on its way. */
  let current = ''
  let busy = false
  let queued: string | null = null

  const applyHeight = () => {
    if (active?.stage.classList.contains('is-pinned')) section.style.height = `calc(100svh + ${active.length * 100}svh)`
  }
  const activate = (layer: Layer) => {
    active = layer
    section.removeAttribute('style')
    section.dataset.about = layer.id
    document.documentElement.dataset.aboutConcept = layer.id
    applyHeight()
  }
  const wordsHome = () => {
    copy.querySelector('.about-mark')?.remove()
    // A concept may restyle or move the text. Put everything back as it was.
    for (const el of [copy, headline, body, cta]) {
      el.removeAttribute('style')
      el.removeAttribute('data-state')
    }
    copy.className = 'a-intro-copy'
    if (copy.parentElement !== copyHome.parent) copyHome.parent.insertBefore(copy, copyHome.next)
  }

  const makeLayer = (id: string): Layer => {
    const ac = new AbortController()
    const stage = document.createElement('div')
    // The book's stage has a class of its own: other concepts style `.about-stage`, and the book can be on screen with them.
    stage.className = id === HOME ? 'about-book' : 'about-stage'
    section.append(stage)
    const layer: Layer = { id, stage, ac, mark: createMark(rtl, reduce, ac.signal), fns: [], near: true, length: 0, raf: 0, held: false, always: false, frames: 0, cleanup: undefined }
    const watch = new IntersectionObserver(([e]) => (layer.near = e.isIntersecting), { rootMargin: '25% 0px' })
    watch.observe(section)
    ac.signal.addEventListener('abort', () => watch.disconnect())
    return layer
  }
  const makeCtx = (layer: Layer, parked: boolean): AboutCtx => ({
    section,
    stage: layer.stage,
    copy,
    headline,
    body,
    cta,
    mark: layer.mark,
    lang,
    rtl,
    reduce,
    touch,
    signal: layer.ac.signal,
    base,
    pin(length) {
      layer.length = length
      layer.stage.classList.add('is-pinned')
      if (active === layer) applyHeight()
    },
    frame(fn) {
      layer.fns.push(fn)
    },
    chapters:
      layer.id === HOME
        ? {
            go: id => go(id),
            preload: id => void loaderFor(id)?.(),
            register: api => {
              bookApi = api
            },
            parked,
          }
        : undefined,
  })
  const runLayer = async (layer: Layer, parked = false) => {
    const load = loaderFor(layer.id)
    if (!load) return
    const ctx = makeCtx(layer, parked)
    const module = await load()
    if (layer.ac.signal.aborted) return
    layer.cleanup = await module.default(ctx)
    if (layer.ac.signal.aborted) {
      layer.cleanup?.()
      return
    }
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if ((layer.near || layer.always) && !layer.held && !layer.ac.signal.aborted) {
        const r = section.getBoundingClientRect()
        const vh = innerHeight
        const pinned = layer.stage.classList.contains('is-pinned')
        const t = pinned ? -r.top / Math.max(1, r.height - vh) : (vh - r.top) / Math.max(1, vh + r.height)
        const p = Math.max(0, Math.min(1, t))
        for (const fn of layer.fns) fn(p, dt)
        layer.frames++
      }
      if (!layer.ac.signal.aborted) layer.raf = requestAnimationFrame(loop)
    }
    layer.raf = requestAnimationFrame(loop)
  }
  const dropLayer = (layer: Layer) => {
    layer.ac.abort()
    try {
      layer.cleanup?.()
    } catch (err) {
      console.error('[about] cleanup failed', err)
    }
    layer.cleanup = undefined
    cancelAnimationFrame(layer.raf)
    layer.stage.remove()
  }

  const scrollTo = (top: number) => {
    if (lenis) lenis.scrollTo(top, { immediate: true, force: true })
    else window.scrollTo({ top, behavior: 'instant' as ScrollBehavior })
  }
  const sectionTop = () => section.getBoundingClientRect().top + scrollY
  // The Lens's section slides under the hero, whose edge and buttons would show along the top of the screen, over the flying book, and go
  // in one frame when the chapter closes. So a chapter lands just clear of them. In the other worlds the hero already ends above the section.
  const heroOverlap = () => {
    const top = section.getBoundingClientRect().top
    let low = top
    for (const el of document.querySelectorAll('.a-hero, .a-scroll, .hc-ctl')) low = Math.max(low, el.getBoundingClientRect().bottom)
    return low - top
  }
  const toSectionTop = () => scrollTo(sectionTop() + heroOverlap())
  const hush = (on: boolean) => {
    if (on) lenis?.stop()
    else lenis?.start()
  }
  const stageState = (layer: Layer, state: 'flying' | 'parked' | 'home') => {
    layer.stage.classList.toggle('is-flying', state === 'flying')
    layer.stage.classList.toggle('is-parked', state === 'parked')
  }

  // The book, the section's home. It may have been loaded behind a chapter, if the reader arrived straight in one.
  const ensureBook = (parked: boolean) => {
    if (!bookMounted) {
      const layer = makeLayer(HOME)
      book = layer
      if (parked) {
        stageState(layer, 'parked')
        layer.held = true
      } else {
        copy.insertBefore(layer.mark.el, headline)
        activate(layer)
      }
      bookMounted = runLayer(layer, parked).then(() => {
        if (parked) bookApi?.park(current)
      }).catch(err => console.error('[about] the book failed to mount', err))
    }
    return bookMounted
  }

  // Starts a chapter behind whatever is on screen. The trip tells the book when it can open its doors.
  const startChapter = (id: string): BookTrip => {
    const layer = makeLayer(id)
    chapter = layer
    activate(layer)
    toSectionTop()
    copy.insertBefore(layer.mark.el, headline)
    let opened = false
    const ready = runLayer(layer)
      .catch(err => console.error(`[about] ${id} failed to mount`, err))
      .then(
        () =>
          new Promise<void>(res => {
            // Some concepts move the section as they mount, so find its top again. Wait for two drawn frames, then keep it still till the doors open.
            toSectionTop()
            const t0 = performance.now()
            const wait = () => {
              if (layer.frames >= 2 || performance.now() - t0 > 700 || layer.ac.signal.aborted) {
                if (!opened) layer.held = true
                res()
              } else requestAnimationFrame(wait)
            }
            wait()
          }),
      )
    return {
      stage: layer.stage,
      ready,
      opening: () => {
        opened = true
        layer.held = false
      },
    }
  }

  // ------------------------------------------------------------------------------------------------------------ moving
  const back = document.createElement('button')
  let sectionSeen = true
  const showBack = () => {
    const on = !!chapter && !busy && sectionSeen
    back.classList.toggle('is-on', on)
    back.tabIndex = on ? 0 : -1
  }

  const reflect = () => {
    for (const [id, b] of buttons) {
      b.setAttribute('aria-pressed', String(id === current))
      // On a phone the bar scrolls sideways, so keep the current concept in view.
      if (id === current) bar.scrollTo({ left: b.offsetLeft - (bar.clientWidth - b.offsetWidth) / 2 })
    }
    const url = new URL(location.href)
    url.searchParams.set('about', current)
    history.replaceState(history.state, '', url)
  }

  const fly = async (id: string) => {
    await ensureBook(!!chapter)
    const api = bookApi
    if (!api || !book) return
    const from = chapter
    const bookLayer = book
    bookLayer.held = false
    bookLayer.always = true
    if (!reduce) stageState(bookLayer, 'flying')
    hush(true)

    if (id === HOME) {
      if (from) {
        await api.back(from.id, from.stage, p => {
          dropLayer(from)
          chapter = null
          wordsHome()
          activate(bookLayer)
          const r = section.getBoundingClientRect()
          scrollTo(r.top + scrollY + p * Math.max(0, r.height - innerHeight))
        })
      }
      stageState(bookLayer, 'home')
    } else if (from) {
      await api.hop(from.id, from.stage, id, () => {
        dropLayer(from)
        chapter = null
        wordsHome()
        return startChapter(id)
      })
      stageState(bookLayer, 'parked')
      bookLayer.held = true
    } else {
      // The book keeps a picture of the words on its page, so the real ones can go ahead to the chapter.
      api.lend()
      wordsHome()
      const flown = api.depart(id, startChapter(id))
      await flown
      stageState(bookLayer, 'parked')
      bookLayer.held = true
    }
    bookLayer.always = false
    hush(false)
  }

  async function go(id: string) {
    if (busy) {
      queued = id
      return
    }
    if (id === current) return
    busy = true
    // Moving between worlds jumps the scroll, which isn't the reader scrolling: the top bar stays as they left it.
    document.documentElement.toggleAttribute('data-about-moving', true)
    current = id
    reflect()
    showBack()
    const hadFocus = document.activeElement
    // Only keyboard readers: after a mouse click there's nothing to keep their place for, and it would leave a tab lit up.
    const typing = !!(hadFocus as HTMLElement | null)?.matches?.(':focus-visible')
    const fromBack = typing && back === hadFocus
    const fromBook = typing && !!(hadFocus as HTMLElement | null)?.closest?.('.sb-chapters')
    try {
      if (id === 'original') showOriginal()
      else if (section!.dataset.about === 'original' || !bookMounted) {
        // From the old section there's no book on screen to travel through.
        await arrive(id)
      } else await fly(id)
    } catch (err) {
      console.error('[about] move failed', err)
    }
    busy = false
    // The bar reads the scroll a frame late, so it's let go a frame after that.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (!busy) document.documentElement.toggleAttribute('data-about-moving', false)
      }),
    )
    showBack()
    // Keyboard readers stay with the control that does the same job on the other side.
    if (fromBook || fromBack) {
      const target = chapter ? back : section!.querySelector<HTMLElement>('.sb-ch')
      target?.focus({ preventScroll: true })
    } else if (!chapter && document.activeElement === back) back.blur() // It's hidden now, and would swallow the space bar.
    const next = queued
    queued = null
    if (next && next !== current) void go(next)
  }

  /** Straight to a concept with no flight: on load, or from the old section. */
  const arrive = async (id: string) => {
    if (id === HOME) {
      await ensureBook(false)
      return
    }
    const trip = startChapter(id)
    trip.opening()
    await trip.ready
    trip.opening()
    // The book loads behind it, ready for the way back.
    const idle = (cb: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(cb, { timeout: 2000 }) : setTimeout(cb, 800))
    idle(() => void ensureBook(true))
  }

  const showOriginal = () => {
    if (chapter) dropLayer(chapter)
    if (book) dropLayer(book)
    chapter = book = null
    bookApi = null
    bookMounted = null
    active = null
    wordsHome()
    section.removeAttribute('style')
    section.dataset.about = 'original'
    document.documentElement.dataset.aboutConcept = 'original'
    hush(false)
  }

  const jump = () => {
    const top = sectionTop() - (current === 'original' ? 140 : 0)
    scrollTo(top)
  }

  // ------------------------------------------------------------------------------------------- the way back from a chapter
  // Only this. The other worlds are chosen in the book.
  const words = BOOK_WORDS[lang]
  back.type = 'button'
  back.className = 'about-back'
  back.dir = rtl ? 'rtl' : 'ltr'
  const NS = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('viewBox', '0 0 100 100')
  svg.setAttribute('aria-hidden', 'true')
  const path = document.createElementNS(NS, 'path')
  path.setAttribute('d', ICONS.book)
  path.setAttribute('fill-rule', 'evenodd')
  svg.append(path)
  const backWord = document.createElement('span')
  backWord.textContent = words.back
  back.append(svg, backWord)
  back.addEventListener('click', () => void go(HOME))
  document.body.append(back)
  const backWatch = new IntersectionObserver(
    ([e]) => {
      sectionSeen = e.isIntersecting
      showBack()
    },
    { rootMargin: '-35% 0px -35% 0px' },
  )
  backWatch.observe(section)

  // ------------------------------------------------------------------------------------------------------- the review bar
  const buttons = new Map<string, HTMLButtonElement>()
  const bar = document.createElement('div')
  bar.className = 'about-switch-bar'
  bar.setAttribute('role', 'group')
  bar.setAttribute('aria-label', 'About section concept')
  const root = document.createElement('div')
  root.className = 'about-switch is-hidden'
  root.dir = 'ltr'
  root.lang = 'en'
  const choose = async (id: string) => {
    await go(id)
    requestAnimationFrame(jump)
  }
  CONCEPTS.forEach((concept, i) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.title = concept.note
    const label = document.createElement('span')
    label.textContent = concept.label
    const key = document.createElement('kbd')
    key.textContent = String(i)
    b.append(key, label)
    b.addEventListener('click', () => void choose(concept.id))
    buttons.set(concept.id, b)
    bar.append(b)
  })
  const rule = document.createElement('i')
  rule.className = 'about-switch-rule'
  const language = document.createElement('a')
  language.lang = rtl ? 'en' : 'ar'
  language.textContent = rtl ? 'English' : 'عربي'
  language.title = 'See this concept in the other language'
  language.addEventListener('click', () => {
    const path = location.pathname.replace(/\/?ar\/?$/, '/')
    location.href = `${rtl ? path : `${path.replace(/\/?$/, '/')}ar/`}?about=${current}#about`
  })
  const hide = document.createElement('button')
  hide.type = 'button'
  hide.className = 'about-switch-icon'
  hide.title = 'Hide the switcher (H)'
  hide.setAttribute('aria-label', 'Hide the switcher')
  hide.textContent = '×'
  const toggle = () => root.classList.toggle('is-hidden')
  hide.addEventListener('click', toggle)
  bar.append(rule, language, hide)
  root.append(bar)
  document.body.append(root)

  window.addEventListener('keydown', e => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
    if ((e.target as HTMLElement).closest?.('input, textarea, select, [contenteditable]')) return
    if (e.key === 'Escape' && chapter && sectionSeen) void go(HOME)
    if (e.key === 'h' || e.key === 'H') toggle()
    const concept = CONCEPTS[Number(e.key)]
    if (concept && /^[0-9]$/.test(e.key)) void choose(concept.id)
  })

  // Chrome restores the scroll position before a pinned concept has grown to its full height, then carries the reader
  // far past it. So keep the place here and put it back once the concept is mounted.
  const PLACE = 'sindibad-about-place'
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
  const returning = nav?.type === 'reload' || nav?.type === 'back_forward'
  let place = NaN
  try {
    if (returning) place = Number(sessionStorage.getItem(PLACE) ?? NaN)
    sessionStorage.removeItem(PLACE)
  } catch {
    // Storage can be refused. The reader just starts from the top.
  }
  history.scrollRestoration = 'manual'
  const keep = () => {
    try {
      sessionStorage.setItem(PLACE, String(scrollY))
    } catch {
      // Nothing to do: the place just isn't kept.
    }
  }
  addEventListener('pagehide', keep)

  const wantsAbout = location.hash === '#about'
  const first = initial()
  current = first
  void (async () => {
    if (first === 'original') showOriginal()
    else await arrive(first)
    reflect()
    showBack()
    if (wantsAbout) requestAnimationFrame(jump)
    else if (Number.isFinite(place)) requestAnimationFrame(() => window.scrollTo({ top: place, behavior: 'instant' as ScrollBehavior }))
  })()

  // A hot reload rebuilds the page but not this module, so start over on the new page.
  if (import.meta.hot) {
    const id = setInterval(() => {
      if (section.isConnected) return
      clearInterval(id)
      removeEventListener('pagehide', keep)
      backWatch.disconnect()
      if (chapter) dropLayer(chapter)
      if (book) dropLayer(book)
      root.remove()
      back.remove()
      start()
    }, 200)
  }
}

start()
