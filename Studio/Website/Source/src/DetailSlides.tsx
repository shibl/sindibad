import { createEffect, createSignal, For, Show } from 'solid-js'
import './DetailSlides.css'

export type DetailSlide = {
  id: string
  title: string
  body: string
  image?: string
  video?: string
  tone?: 'chemistry' | 'physics' | 'studio'
  portrait?: boolean
}

export type DetailCard = {
  title: string
  body: string
  details?: string
  image?: string
  video?: string
  tag?: string
  href?: string
  kind?: 'game' | 'chemistry' | 'physics'
  slides?: DetailSlide[]
  initialSlide?: number
}

const Chevron = (props: { up?: boolean }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d={props.up ? 'm7 14 5-5 5 5' : 'm7 10 5 5 5-5'} />
  </svg>
)

function SlideVideo(props: { slide: DetailSlide; active: boolean }) {
  let video!: HTMLVideoElement
  createEffect(
    () => props.active,
    (active) => {
      if (!active || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        video.pause()
        return
      }
      let current = true
      void video.play().then(() => { if (!current) video.pause() }).catch(() => {})
      return () => { current = false; video.pause() }
    },
  )
  return <video ref={video} src={props.slide.video} poster={props.slide.image}
    muted loop playsinline preload="none" controls={props.active}
    tabindex={props.active ? 0 : -1} aria-label={props.slide.title} />
}

function Feature(props: { slide: DetailSlide; active: boolean; select: () => void }) {
  let feature!: HTMLDivElement
  let label!: HTMLSpanElement
  createEffect(
    () => true,
    () => {
      const measure = () => {
        feature.style.setProperty('--pill-width', `${label.offsetWidth + 50}px`)
        // Keep line wrapping fixed while the surrounding pill changes width.
        feature.style.setProperty('--feature-copy-width', `${feature.parentElement!.clientWidth}px`)
      }
      const observer = new ResizeObserver(measure)
      observer.observe(label)
      observer.observe(feature.parentElement!)
      measure()
      return () => observer.disconnect()
    },
  )
  return (
    <div ref={feature} class="a-feature" data-active={props.active ? 'true' : undefined}>
      <button type="button" class="a-feature-trigger" onClick={props.select}
        aria-expanded={props.active ? 'true' : 'false'} aria-controls={`a-feature-${props.slide.id}`}>
        <span class="a-feature-symbol" aria-hidden="true">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="10" cy="10" r="7.5" />
            <path d="M6.5 10h7M10 6.5v7" />
          </svg>
        </span>
        <span ref={label} class="a-feature-label">{props.slide.title}</span>
      </button>
      <div class="a-feature-reveal" id={`a-feature-${props.slide.id}`} aria-hidden={props.active ? 'false' : 'true'}>
        <div><p>{props.slide.body}</p></div>
      </div>
    </div>
  )
}

export default function DetailSlides(props: { card: DetailCard; arabic: boolean; close: () => void }) {
  const slides: DetailSlide[] = props.card.slides ?? [{
    id: 'overview', title: props.arabic ? 'نظرة أقرب' : 'A closer look',
    body: props.card.details ?? props.card.body, image: props.card.image,
    tone: props.card.kind === 'chemistry' || props.card.kind === 'physics' ? props.card.kind : 'studio',
  } satisfies DetailSlide]
  const [active, setActive] = createSignal(props.card.initialSlide ?? 0)
  let list!: HTMLDivElement
  let touchStart: { x: number; y: number } | undefined
  const select = (index: number) => {
    const next = Math.max(0, Math.min(slides.length - 1, index))
    if (next === active()) return
    setActive(next)
  }
  const onKeys = (event: KeyboardEvent) => {
    if (event.target instanceof HTMLVideoElement || event.target instanceof HTMLInputElement) return
    const offset = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? slides.length - 1 : active() + offset
    if (!offset && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    select(next)
    list.querySelectorAll<HTMLButtonElement>('.a-feature-trigger')[next]?.focus({ preventScroll: true })
  }
  return (
    <div class="a-detail-tour" onKeyDown={onKeys}>
      <header class="a-detail-heading">
        <Show when={props.card.tag}><span>{props.card.tag}</span></Show>
        <h2 id="a-detail-title">{props.card.title}</h2>
      </header>
      <div class="a-detail-explorer">
        <aside class="a-detail-sidebar">
          <Show when={slides.length > 1}>
            <div class="a-detail-stepper" aria-label={props.arabic ? 'تصفّح التفاصيل' : 'Browse details'}>
              <button type="button" disabled={active() === 0} onClick={() => select(active() - 1)}
                aria-label={props.arabic ? 'التفصيل السابق' : 'Previous detail'}><Chevron up /></button>
              <button type="button" disabled={active() === slides.length - 1} onClick={() => select(active() + 1)}
                aria-label={props.arabic ? 'التفصيل التالي' : 'Next detail'}><Chevron /></button>
            </div>
          </Show>
          <div ref={list} class="a-detail-features">
            <For each={slides}>{(slide, index) => (
              <Feature slide={slide} active={active() === index()} select={() => select(index())} />
            )}</For>
          </div>
        </aside>
        <div class="a-detail-stage"
          onPointerDown={(event) => {
            if (event.pointerType === 'touch') touchStart = { x: event.clientX, y: event.clientY }
          }}
          onPointerCancel={() => { touchStart = undefined }}
          onPointerUp={(event) => {
            if (!touchStart) return
            const dx = event.clientX - touchStart.x, dy = event.clientY - touchStart.y
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
              select(active() + (dx < 0 ? 1 : -1) * (props.arabic ? -1 : 1))
            }
            touchStart = undefined
          }}>
          <div class="a-detail-visuals">
              <For each={slides}>{(slide, index) => (
                <figure class={['a-detail-visual', { 'is-active': active() === index(), 'is-portrait': slide.portrait }]}
                  aria-hidden={active() !== index() ? 'true' : 'false'}>
                  <Show when={slide.video} fallback={
                    <Show when={slide.image} fallback={
                      <div class={`a-detail-placeholder a-project-${slide.tone ?? 'studio'}`}>
                        <span>{props.card.kind ? (props.arabic ? 'قريباً' : 'Coming soon') : 'Sindibad Studios'}</span>
                        <strong>{props.card.title}</strong>
                      </div>
                    }><img src={slide.image} alt={slide.title} draggable="false" /></Show>
                  }><SlideVideo slide={slide} active={active() === index()} /></Show>
                </figure>
              )}</For>
          </div>
          <span class="a-detail-count" aria-live="polite" aria-atomic="true">{active() + 1} / {slides.length}</span>
        </div>
      </div>
      <footer class="a-detail-footer">
        <a class="a-pill a-detail-cta" href={props.card.href ?? '#contact'}
          target={props.card.href ? '_blank' : undefined}
          rel={props.card.href ? 'noopener noreferrer' : undefined}
          onClick={props.close}>
          {props.card.href ? (props.arabic ? 'ابدأ اللعب' : 'Get started')
            : props.card.kind ? (props.arabic ? 'تواصل معنا' : 'Get in touch')
            : (props.arabic ? 'تعرّف على الاستوديو' : 'Meet the studio')}
        </a>
      </footer>
    </div>
  )
}
