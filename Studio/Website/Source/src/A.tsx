import { createSignal, For, createEffect, Show } from 'solid-js'
import { pageUrl, useContent } from './content'
import Year from './components/Year'
import { aContent } from './AContent'
import DetailSlides, { type DetailCard as Card, type DetailSlide } from './DetailSlides'
import { projectSlides } from './detail-content'
import remote from './assets/a/remote.svg'
import hug from './assets/a/hug.svg'
import coffee from './assets/a/mobile-cup.svg'
import union from './assets/a/union-pink.svg'
import quote from './assets/a/quote-pink.svg'
import watermark from './assets/a/99-quote.svg'
import craft1 from './assets/a/craft-1.avif'
import craft2 from './assets/a/craft-2.avif'
import craft3 from './assets/a/craft-3.avif'
import craft4 from './assets/a/craft-4.avif'
import voiceArt from './assets/a/real-voices.svg'
import './A.css'

const art = [craft1, craft2, craft3, craft4, voiceArt]
const tongues = ['العربية', 'English']
const Arrow = (props: { back?: boolean }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d={props.back ? 'M19 12H5m7-7-7 7 7 7' : 'M5 12h14m-7-7 7 7-7 7'} />
  </svg>
)
function CardMedia(props: { card: Card }) {
  const [playing, setPlaying] = createSignal(false)
  let video: HTMLVideoElement | undefined
  let active = false
  const stop = () => {
    active = false
    video?.pause()
    if (video) video.currentTime = 0
    setPlaying(false)
  }
  const start = () => {
    if (!video || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    active = true
    void video.play().then(() => {
      if (active) setPlaying(true)
      else video?.pause()
    }).catch(() => setPlaying(false))
  }
  return (
    <span class="a-project-media" onPointerEnter={start} onPointerLeave={stop}>
      <Show when={props.card.image}>
        <img src={props.card.image} alt="" loading="lazy" draggable="false" />
      </Show>
      <Show when={props.card.video}>
        <video ref={video} class={{ 'is-playing': playing() }} src={props.card.video}
          poster={props.card.image} muted loop playsinline preload="none" aria-hidden="true"
          onError={stop} />
      </Show>
      <span class="a-card-shade" />
      <span class="a-card-content">
        <Show when={props.card.tag}><small>{props.card.tag}</small></Show>
        <h3>{props.card.title}</h3>
        <p>{props.card.body}</p>
        <Show when={props.card.href}><span class="a-project-arrow" aria-hidden="true">↗</span></Show>
      </span>
    </span>
  )
}

function CardRail(props: {
  id: string
  title: string
  cards: Card[]
  open: (card: Card) => void
  arabic: boolean
}) {
  const [progress, setProgress] = createSignal(0)
  let rail!: HTMLDivElement
  let startX = 0
  let startScroll = 0
  let dragging = false
  let dragged = false
  const move = (step: number) => {
    const card = rail.querySelector<HTMLElement>('.a-image-card')
    const distance = card ? card.getBoundingClientRect().width + 24 : rail.clientWidth
    rail.scrollBy({ left: step * distance * (props.arabic ? -1 : 1),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }
  const followScroll = () => {
    const max = rail.scrollWidth - rail.clientWidth
    setProgress(max > 1 ? Math.min(1, Math.abs(rail.scrollLeft) / max) : 0)
  }
  return (
    <section id={props.id} class="a-rail a-space" aria-label={props.title}>
      <div class="a-rail-row">
        <h2 class="a-vertical">{props.title}</h2>
        <div ref={rail} class="a-rail-window" tabindex="0" data-lenis-prevent-horizontal
          aria-label={props.arabic ? 'مرّر أفقياً أو استخدم الأسهم لتصفّح البطاقات' : 'Scroll horizontally or use arrow keys to browse cards'}
          onScroll={followScroll}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
              e.preventDefault()
              move((e.key === 'ArrowRight' ? 1 : -1) * (props.arabic ? -1 : 1))
            }
          }}
          onPointerDown={(e) => {
            dragged = false
            if (e.pointerType !== 'mouse' || e.button !== 0) return
            startX = e.clientX
            startScroll = rail.scrollLeft
            dragging = true
          }}
          onPointerMove={(e) => {
            if (!dragging || e.buttons !== 1) return
            const delta = e.clientX - startX
            if (Math.abs(delta) > 6) {
              dragged = true
              rail.setPointerCapture(e.pointerId)
              rail.scrollLeft = startScroll - delta
            }
          }}
          onPointerUp={() => { dragging = false }}
          onPointerCancel={() => { dragging = false }}>
          <div class="a-rail-track">
            <For each={props.cards}>
              {(card) => (
                <button type="button" class={`a-image-card${card.kind ? ` a-project-${card.kind}` : ''}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') dragged = false
                  }}
                  onClick={() => {
                    if (!dragged) props.open(card)
                    dragged = false
                  }}><CardMedia card={card} /></button>
              )}
            </For>
          </div>
        </div>
      </div>
      <div class="a-rail-controls">
        <div class="a-progress"><span style={{ width: `${(1 / props.cards.length + progress() * (1 - 1 / props.cards.length)) * 100}%` }} /></div>
        <div class="a-arrows">
          <button class="a-circle" aria-label={props.arabic ? 'السابق' : `Previous ${props.title.toLowerCase()}`}
            disabled={progress() <= 0.001} onClick={() => move(-1)}><Arrow back /></button>
          <button class="a-circle" aria-label={props.arabic ? 'التالي' : `Next ${props.title.toLowerCase()}`}
            disabled={progress() >= 0.999} onClick={() => move(1)}><Arrow /></button>
        </div>
      </div>
    </section>
  )
}

export default function A() {
  const t = useContent()
  const ar = t.lang === 'ar'
  const c = aContent(t.lang)
  const [step, setStep] = createSignal(0)
  const [flips, setFlips] = createSignal(0)
  let tongueEl!: HTMLSpanElement
  let footerReveal!: HTMLDivElement
  let footer!: HTMLElement
  // Measure the real content so both languages and responsive layouts can reveal
  // without a hard-coded footer height or clipped content.
  createEffect(
    () => true,
    () => {
      const measure = () => {
        footerReveal.style.setProperty('--footer-height', `${footer.offsetHeight}px`)
        footerReveal.dataset.ready = ''
      }
      const observer = new ResizeObserver(measure)
      observer.observe(footer)
      measure()
      return () => observer.disconnect()
    },
  )
  // The language word only changes while someone can see it, and never for reduced motion.
  createEffect(
    () => true,
    () => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
      let seen = false
      const io = new IntersectionObserver(([e]) => (seen = e.isIntersecting))
      io.observe(tongueEl)
      const timer = setInterval(() => {
        if (seen && !document.hidden) setFlips(flips() + 1)
      }, 2600)
      return () => {
        clearInterval(timer)
        io.disconnect()
      }
    },
  )
  const [hidden, setHidden] = createSignal(false)
  const [menu, setMenu] = createSignal(false)
  const [detail, setDetail] = createSignal<Card | null>(null)
  let dialog!: HTMLDialogElement
  let previousFocus: HTMLElement | null = null
  let closeTimer: ReturnType<typeof setTimeout> | undefined
  const open = (card: Card) => {
    clearTimeout(closeTimer)
    delete dialog.dataset.closing
    previousFocus = document.activeElement as HTMLElement
    setDetail(card)
    dialog.showModal()
    dialog.scrollTop = 0
  }
  const finishClose = () => {
    dialog.close()
    delete dialog.dataset.closing
    setDetail(null)
    previousFocus?.focus({ preventScroll: true })
  }
  const close = () => {
    if (!dialog.open || dialog.dataset.closing) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finishClose()
      return
    }
    dialog.dataset.closing = 'true'
    closeTimer = setTimeout(finishClose, 240)
  }
  createEffect(
    () => true,
    () => () => {
      clearTimeout(closeTimer)
    },
  )
  const nav = [
    { href: '#top', label: ar ? 'الرئيسية' : 'Home' },
    { href: '#insights', label: ar ? 'أفكار' : 'Learn' },
    { href: '#technology', label: ar ? 'ما نصنعه' : 'What we do' },
    { href: '#studio', label: ar ? 'عنّا' : 'About' },
  ]
  const techSlides: DetailSlide[] = t.technology.items.map((item, i) => ({
    id: `technology-${i}`,
    title: item.title,
    body: item.body,
    image: art[i],
  }))
  const techCards: Card[] = techSlides.map((slide, i) => ({
    title: slide.title, body: slide.body, image: slide.image,
    slides: techSlides, initialSlide: i,
  }))
  const projects = c.projects.map((p) => ({
    title: p.title,
    body: p.description,
    details: p.details,
    slides: projectSlides(p, ar),
    kind: p.kind,
    image: p.kind === 'game' ? pageUrl('media/sindibad-yasmina-poster.jpg') : undefined,
    video: p.kind === 'game' ? pageUrl('media/sindibad-yasmina-gameplay.mp4') : undefined,
    tag: p.kind === 'game' ? (ar ? 'مغامرة تعلّم' : 'A learning adventure') : (ar ? 'قريباً' : 'Coming soon'),
    href: p.kind === 'game' ? 'https://sindiyasmina.sindibad.studio' : undefined,
  }))
  // Which section the reader is in, shown by the pink line in the header. Sections without a nav entry of
  // their own count as the one above them; Projects has none, so the line steps aside there.
  const [active, setActive] = createSignal('#top')
  const spy: [string, string][] = [
    ['top', '#top'],
    ['about', '#top'],
    ['technology', '#technology'],
    ['studio', '#studio'],
    ['games', ''],
    ['insights', '#insights'],
    ['contact', '#contact'],
  ]
  // A nav click scrolls smoothly past other sections; the line goes straight to the clicked link and stays
  // there (with the header showing) until the scroll settles.
  let pinned = false
  let settle = 0
  const go = (href: string, ev: MouseEvent) => {
    // Lenis does the smooth scroll; stopping the browser's own jump keeps it from flashing the target first.
    ev.preventDefault()
    history.replaceState(history.state, '', href)
    setMenu(false)
    setActive(href)
    setHidden(false)
    pinned = true
    clearTimeout(settle)
    settle = window.setTimeout(() => (pinned = false), 1200)
  }
  createEffect(
    () => true,
    () => {
      let lastY = window.scrollY
      let raf = 0
      const where = () => {
        const line = Math.min(window.innerHeight * 0.4, 420)
        const atEnd =
          window.innerHeight + window.scrollY >=
          document.documentElement.scrollHeight - 4
        let href = '#top'
        for (const [id, h] of spy) {
          const el = document.getElementById(id)
          if (el && el.getBoundingClientRect().top <= line) href = h
        }
        return atEnd ? '#contact' : href
      }
      const scroll = () => {
        if (raf) return
        raf = requestAnimationFrame(() => {
          const y = window.scrollY
          if (pinned || document.documentElement.hasAttribute('data-about-moving')) {
            clearTimeout(settle)
            settle = window.setTimeout(() => (pinned = false), 400)
            lastY = y
          } else {
            setActive(where())
            if (Math.abs(y - lastY) > 5) {
              setHidden(y > lastY && y > 120)
              lastY = y
            }
          }
          raf = 0
        })
      }
      setActive(where())
      window.addEventListener('scroll', scroll, { passive: true })
      return () => {
        window.removeEventListener('scroll', scroll)
        cancelAnimationFrame(raf)
        clearTimeout(settle)
      }
    },
  )
  // The pink line is one element that slides from link to link, with a little springy overshoot.
  let navEl!: HTMLElement
  let lineEl!: HTMLSpanElement
  createEffect(
    () => [active(), menu()] as const,
    ([href]) => {
      const place = () => {
        const link = navEl.querySelector<HTMLElement>(`a[href="${href}"]`)
        const label = link?.querySelector<HTMLElement>('.a-nav-label') ?? link
        if (!link || !label || !link.offsetWidth) {
          lineEl.style.opacity = '0'
          return
        }
        lineEl.style.opacity = '1'
        lineEl.style.width = `${label.offsetWidth}px`
        const inner = label === link ? { x: 0, y: 0 } : { x: label.offsetLeft, y: label.offsetTop }
        lineEl.style.transform = `translate(${link.offsetLeft + inner.x}px, ${link.offsetTop + inner.y - 8}px)`
      }
      place()
      const ro = new ResizeObserver(place)
      ro.observe(navEl)
      document.fonts?.ready.then(place)
      if (!lineEl.dataset.ready) requestAnimationFrame(() => (lineEl.dataset.ready = ''))
      return () => ro.disconnect()
    },
  )
  const Brand = () => (
    <span class="a-brand">
      {ar ? 'سندباد' : 'Sindibad'}
      <br />
      <span>{ar ? 'استوديو' : 'Studios'}</span>
    </span>
  )
  return (
    <div class="design-a" dir={ar ? 'rtl' : 'ltr'}>
      <a class="a-skip" href="#a-main">
        {ar ? 'انتقل للمحتوى' : 'Skip to content'}
      </a>
      <header class={`a-header ${hidden() && !menu() ? 'is-hidden' : ''}`}>
        <div class="a-header-inner">
          <a
            class="a-brand-link"
            href="#top"
            aria-label={t.brand}
            onClick={(e) => go('#top', e)}
          >
            <Brand />
          </a>
          <button
            class="a-menu-toggle a-circle"
            aria-expanded={menu() ? 'true' : 'false'}
            aria-controls="a-navigation"
            aria-label={ar ? 'القائمة' : 'Toggle navigation'}
            onClick={() => setMenu(!menu())}
          >
            {menu() ? '×' : '☰'}
          </button>
          <nav
            ref={navEl}
            id="a-navigation"
            class={menu() ? 'is-open' : ''}
            aria-label={ar ? 'القائمة الرئيسية' : 'Main navigation'}
          >
            <span class="a-nav-line" ref={lineEl} aria-hidden="true" />
            <For each={nav}>
              {(n, i) => (
                <a
                  href={n.href}
                  aria-current={active() === n.href ? 'location' : undefined}
                  onClick={(e) => go(n.href, e)}
                >
                  {n.label}
                  {i() === 2 ? (
                    <span class="a-chevron" aria-hidden="true">
                      <svg viewBox="0 0 13 8" fill="none">
                        <path
                          d="M1.5 1.5l5 5 5-5"
                          stroke="currentColor"
                          stroke-width="2.4"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </span>
                  ) : null}
                </a>
              )}
            </For>
            <a
              class="a-header-contact"
              href="#contact"
              aria-current={active() === '#contact' ? 'location' : undefined}
              onClick={(e) => go('#contact', e)}
            >
              <span class="a-nav-label">{t.contact.label}</span>
              <span class="a-circle a-pink">
                <Arrow />
              </span>
            </a>
            <a
              class="a-language"
              href={pageUrl(t.altLang.path)}
              lang={t.altLang.lang}
            >
              {t.altLang.short}
            </a>
          </nav>
        </div>
      </header>
      <main id="a-main">
        <section id="top" class="a-hero a-space">
          <div class="a-hero-inner">
            <div class="a-hero-copy">
              <p class="a-eyebrow">
                {ar ? 'استوديو ألعاب · ' : 'Independent game studio · '}
                <button
                  type="button"
                  class="a-dubai"
                  aria-expanded="false"
                  onClick={(e) => {
                    const word = e.currentTarget
                    void import('./dubai').then((m) => m.openDubai(word))
                  }}
                  onPointerEnter={() => void import('./dubai').then((m) => m.warm())}
                >
                  {ar ? 'دبي' : 'Dubai'}
                </button>
              </p>
              <h1>
                {ar ? (
                  <>
                    <span>ألعاب ملهمة.</span>
                    <span>عوالم مرحة.</span>
                    <span>تجارب تبقى.</span>
                  </>
                ) : (
                  <>
                    <span>Meaningful</span>
                    <span>playful</span>
                    <span>experiences.</span>
                  </>
                )}
              </h1>
              <p class="a-hero-description">
                {ar
                  ? 'خيال واسع، وتصميم مدروس، وشغف باللعب. نصنع ألعاباً بالعربية والإنجليزية، لكل هاتف ولكل مغامر.'
                  : 'Thoughtful design and a spirit of adventure. We make beautiful games in Arabic and English, for every phone.'}
              </p>
            </div>
            <a
              href="#about"
              class="a-scroll"
              aria-label={ar ? 'انتقل للقسم التالي' : 'Scroll to next section'}
            >
              <span class="a-circle a-pink">
                <Arrow />
              </span>
            </a>
          </div>
        </section>
        <section id="about" class="a-intro a-space a-wrap">
          <img
            class="a-intro-art"
            src={remote}
            alt={
              ar ? 'رسم لشخص يبتكر تحت شجرة' : 'A creator working under a tree'
            }
            loading="lazy"
          />
          <div class="a-intro-copy">
            <img class="a-union" src={union} alt="" />
            <h2>
              {ar
                ? 'عوالم تدفعك للاكتشاف، وألعاب تصنع فرقاً وتبقى في الذاكرة.'
                : 'Beautiful worlds, powered by research and grounded in play.'}
            </h2>
            <p>
              {t.hero.statement} {t.about.body}
            </p>
            <a class="a-pill" href="#contact">
              {t.hero.secondary}
            </a>
          </div>
        </section>
        <CardRail
          id="technology"
          title={ar ? 'ما نصنعه' : 'What we do'}
          cards={techCards}
          open={open}
          arabic={ar}
        />
        <section
          id="studio"
          class="a-principles a-space"
          aria-label={ar ? 'مبادئ الاستوديو' : 'Studio principles'}
        >
          <div class="a-principles-inner">
            <div class="a-principles-copy">
              <h2>
                {ar ? (
                  <>
                    ما <em>يمكنك توقّعه</em> عندما نصنع معاً
                  </>
                ) : (
                  <>
                    What <em>you can expect</em> when we play together
                  </>
                )}
              </h2>
              <div class="a-quote">
                <img class="a-quote-mark" src={quote} alt="" />
                <span class="a-sr" aria-live="polite">
                  {c.principles[step()].quote}
                </span>
                <div class="a-quote-lines" aria-hidden="true">
                  <For each={c.principles}>
                    {(item, i) => (
                      <p
                        class={
                          i() === step()
                            ? 'is-current'
                            : i() < step()
                              ? 'is-past'
                              : ''
                        }
                      >
                        {item.quote.split(' ').map((word, w) => (
                          <>
                            <span class="a-quote-word" style={{ '--w': w }}>
                              {word}
                            </span>{' '}
                          </>
                        ))}
                      </p>
                    )}
                  </For>
                </div>
                <small>– {ar ? 'من مبادئ سندباد' : 'The Sindibad way'}</small>
                <img class="a-watermark" src={watermark} alt="" />
              </div>
            </div>
            <div class="a-principle-panel">
              <div class="a-principle-window">
                <div
                  class="a-principle-track"
                  style={{ '--slide': step(), '--direction': ar ? 1 : -1 }}
                >
                  <For each={c.principles}>
                    {(item, i) => (
                      <article
                        class={i() === step() ? 'is-current' : ''}
                        aria-hidden={i() !== step() ? 'true' : 'false'}
                      >
                        <h3>{item.title}</h3>
                        <p>{item.body}</p>
                      </article>
                    )}
                  </For>
                </div>
              </div>
              <div class="a-principle-controls">
                <span class="a-floor">
                  <span class="a-sr" aria-live="polite">
                    {step() + 1}/9
                  </span>
                  <span class="a-floor-shaft" aria-hidden="true">
                    <span class="a-floor-car" style={{ '--floor': step() }}>
                      <For each={c.principles}>
                        {(_, i) => (
                          <span class={i() === step() ? 'is-current' : ''}>
                            {i() + 1}
                          </span>
                        )}
                      </For>
                    </span>
                  </span>
                  <span aria-hidden="true">/9</span>
                </span>
                <div class="a-arrows">
                  <button
                    class="a-circle a-pink"
                    aria-label={ar ? 'المبدأ السابق' : 'Previous principle'}
                    disabled={step() === 0}
                    onClick={() => setStep(step() - 1)}
                  >
                    <Arrow back />
                  </button>
                  <button
                    class="a-circle a-pink"
                    aria-label={ar ? 'المبدأ التالي' : 'Next principle'}
                    disabled={step() === 8}
                    onClick={() => setStep(step() + 1)}
                  >
                    <Arrow />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
        <div class="a-places a-space" aria-label={t.studio.title}>
          <For each={t.studio.locations}>
            {(location, i) => (
              <div>
                <span class="a-place-symbol" aria-hidden="true">
                  {['◈', '✳', '◎', '❋', '▧'][i()]}
                </span>
                <strong>{location}</strong>
                <small>
                  {i() === 0
                    ? t.studio.hqLong
                    : ar
                      ? 'طاقم سندباد'
                      : 'Sindibad crew'}
                </small>
              </div>
            )}
          </For>
          <div>
            <span class="a-place-symbol" aria-hidden="true">
              <svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.8">
                <circle cx="18" cy="18" r="14" />
                <ellipse cx="18" cy="18" rx="6" ry="14" />
                <path d="M4 18h28M7 10h22M7 26h22" />
              </svg>
            </span>
            <strong>
              <span class="a-sr">{tongues.join('، ')}</span>
              <span
                ref={tongueEl}
                class={`a-tongue${flips() ? ' is-live' : ''}`}
                aria-hidden="true"
              >
                <For each={tongues}>
                  {(word, i) => (
                    <span
                      class={`a-tongue-word${i() === flips() % tongues.length ? ' is-current' : ''}`}
                      lang={i() === 0 ? 'ar' : 'en'}
                    >
                      {word}
                      <span class="a-tongue-spark" />
                    </span>
                  )}
                </For>
              </span>
            </strong>
            <small>{ar ? 'لغات. عالم واحد.' : 'Languages. One World.'}</small>
          </div>
        </div>
        <CardRail
          id="games"
          title={ar ? 'مشاريعنا' : 'Projects'}
          cards={projects}
          open={open}
          arabic={ar}
        />
        <section id="insights" class="a-insights a-space">
          <div class="a-insights-grid">
            <h2 class="a-vertical">{ar ? 'أفكار' : 'Insights'}</h2>
            <For each={c.insights}>
              {(item, i) => (
                <button
                  class={`a-insight a-insight-${i()}`}
                  onClick={() => open({ title: item.title, body: item.body })}
                >
                  <h3>{item.title}</h3>
                  <span>
                    {ar ? 'اقرأ الفكرة' : 'Read story'} <b>→</b>
                  </span>
                </button>
              )}
            </For>
          </div>
        </section>
        <section class="a-welcome a-space">
          <div class="a-welcome-copy">
            <h2>{ar ? 'أهلاً. مرحباً. يا هلا.' : 'Hello. Ahlan. Marhaba.'}</h2>
            <p class="a-welcome-lead">
              {ar
                ? 'أينما كنت، هناك عالم جديد نبتكره معاً.'
                : 'Wherever you are, there’s a new world to make together.'}
            </p>
            <p>
              {t.studio.crewTitle} {t.about.body}
            </p>
            <div class="a-welcome-actions">
              <a class="a-pill" href="#contact">
                {t.hero.secondary}
              </a>
              <a class="a-pill a-pill-neutral" href="#studio">
                {ar ? 'عن سندباد' : 'About Sindibad'}
              </a>
            </div>
          </div>
          <img src={hug} alt="" loading="lazy" />
        </section>
      </main>
      <div id="contact" class="a-footer-reveal" ref={footerReveal}>
        <div class="a-footer-track">
          <footer class="a-footer" ref={footer}>
            <div class="a-footer-main">
              <div class="a-footer-top">
                <a href="#top" class="a-footer-brand">
                  <span class="a-smile" aria-hidden="true">
                    ☺
                  </span>
                  <Brand />
                </a>
                <p>{t.hero.statement}</p>
                <a class="a-footer-social" href="https://github.com/shibl/sindibad">
                  ↗ {ar ? 'استكشف مشروع سندباد' : 'Explore the Sindibad project'}
                </a>
                <a
                  class="a-footer-social"
                  href={pageUrl(t.altLang.path)}
                >
                  {t.altLang.long}
                </a>
              </div>
              <div class="a-footer-middle">
                <div>
                  <strong class="a-footer-location">
                    DUBAI<span>✳</span>
                  </strong>
                  <p>{t.studio.crewTitle}</p>
                </div>
                <nav aria-label={ar ? 'روابط التذييل' : 'Footer navigation'}>
                  <For each={nav}>{(n) => <a href={n.href}>{n.label}</a>}</For>
                  <a href="#contact">{t.contact.label}</a>
                </nav>
              </div>
              <div class="a-footer-bottom">
                <small>
                  © <Year /> {t.brand}
                </small>
                <span>
                  {ar ? 'ألعاب. أبحاث. اكتشاف.' : 'Games / Research / Discovery'}
                </span>
              </div>
            </div>
            <div class="a-footer-cta">
              <h2>
                {ar
                  ? 'لنصنع المغامرة القادمة معاً.'
                  : 'Tell us about your next adventure'}
              </h2>
              <p>
                {ar
                  ? 'رحلتنا الأولى بدأت. اكتشف ما نصنعه وكيف نفكّر في الألعاب والتعلّم.'
                  : 'Our first voyage is underway. Explore what we’re building and the ideas behind our games.'}
              </p>
              <a class="a-pill" href="https://github.com/shibl/sindibad">
                {ar ? 'اكتشف المشروع' : 'Explore the project'}
              </a>
              <p class="a-contact-location">
                {t.contact.rows.find((r) => !r.placeholder)?.value}
              </p>
              <img src={coffee} alt="" loading="lazy" />
            </div>
          </footer>
        </div>
      </div>
      <dialog
        data-lenis-prevent
        ref={dialog}
        class="a-dialog"
        aria-labelledby="a-detail-title"
        onCancel={(event) => {
          event.preventDefault()
          close()
        }}
        onClick={(e) => {
          if (e.target === dialog) close()
        }}
      >
        <div class="a-dialog-content">
          <button
            class="a-circle a-dialog-close"
            onClick={close}
            aria-label={ar ? 'إغلاق' : 'Close details'}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
          <Show when={detail()}>
            {(card) => (
              <DetailSlides card={card()} arabic={ar} close={close} />
            )}
          </Show>
        </div>
      </dialog>
    </div>
  )
}
