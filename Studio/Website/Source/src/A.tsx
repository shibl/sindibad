import { createSignal, For, createEffect, Show } from 'solid-js'
import { pageUrl, useContent } from './content'
import Year from './components/Year'
import { shots } from './shots'
import { aContent } from './AContent'
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
import './A.css'

const art = [craft1, craft2, craft3, craft4]
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
type Card = { title: string; body: string; image?: string; tag?: string }

function CardRail(props: {
  id: string
  title: string
  cards: Card[]
  open: (card: Card) => void
  arabic: boolean
}) {
  const [index, setIndex] = createSignal(0)
  let rail!: HTMLDivElement
  let dragX = 0
  let originIndex = 0
  let dragged = false
  const move = (step: number) =>
    setIndex(Math.max(0, Math.min(props.cards.length - 1, index() + step)))
  return (
    <section id={props.id} class="a-rail a-space" aria-label={props.title}>
      <div class="a-rail-row">
        <h2 class="a-vertical">{props.title}</h2>
        <div
          ref={rail}
          class="a-rail-window"
          tabindex="0"
          aria-label={
            props.arabic
              ? 'استخدم الأسهم لتصفّح البطاقات'
              : 'Use arrow keys to browse cards'
          }
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
              e.preventDefault()
              e.currentTarget.focus()
              move((e.key === 'ArrowRight' ? 1 : -1) * (props.arabic ? -1 : 1))
            }
          }}
          onPointerDown={(e) => {
            dragX = e.clientX
            originIndex = index()
            dragged = false
          }}
          onPointerMove={(e) => {
            if (e.buttons !== 1 && e.pointerType !== 'touch') return
            if (Math.abs(e.clientX - dragX) > 35) dragged = true
          }}
          onPointerUp={(e) => {
            const dx = (e.clientX - dragX) * (props.arabic ? -1 : 1)
            if (Math.abs(dx) > 50) {
              dragged = true
              setIndex(
                Math.max(
                  0,
                  Math.min(
                    props.cards.length - 1,
                    originIndex + (dx < 0 ? 1 : -1),
                  ),
                ),
              )
            }
          }}
        >
          <div
            class="a-rail-track"
            style={{ '--slide': index(), '--direction': props.arabic ? 1 : -1 }}
          >
            <For each={props.cards}>
              {(card, i) => (
                <button
                  type="button"
                  class="a-image-card"
                  tabindex={i() === index() ? 0 : -1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') dragged = false
                  }}
                  onClick={() => {
                    if (!dragged) props.open(card)
                    dragged = false
                  }}
                >
                  <Show when={card.image}>
                    <img
                      src={card.image}
                      alt=""
                      loading="lazy"
                      draggable="false"
                    />
                  </Show>
                  <span class="a-card-shade" />
                  <span class="a-card-content">
                    <Show when={card.tag}>
                      <small>{card.tag}</small>
                    </Show>
                    <h3>{card.title}</h3>
                    <p>{card.body}</p>
                  </span>
                </button>
              )}
            </For>
          </div>
        </div>
      </div>
      <div class="a-rail-controls">
        <div class="a-progress">
          <span
            style={{ width: `${((index() + 1) / props.cards.length) * 100}%` }}
          />
        </div>
        <div class="a-arrows">
          <button
            class="a-circle"
            aria-label={
              props.arabic ? 'السابق' : `Previous ${props.title.toLowerCase()}`
            }
            disabled={index() === 0}
            onClick={() => move(-1)}
          >
            <Arrow back />
          </button>
          <button
            class="a-circle"
            aria-label={
              props.arabic ? 'التالي' : `Next ${props.title.toLowerCase()}`
            }
            disabled={index() === props.cards.length - 1}
            onClick={() => move(1)}
          >
            <Arrow />
          </button>
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
  const open = (card: Card) => {
    previousFocus = document.activeElement as HTMLElement
    setDetail(card)
    dialog.showModal()
  }
  const close = () => {
    dialog.close()
    setDetail(null)
    previousFocus?.focus()
  }
  const nav = [
    { href: '#top', label: ar ? 'الرئيسية' : 'Home' },
    { href: '#insights', label: ar ? 'أفكار' : 'Learn' },
    { href: '#technology', label: ar ? 'ما نصنعه' : 'What we do' },
    { href: '#studio', label: ar ? 'عنّا' : 'About' },
  ]
  const techCards = t.technology.items.map((item, i) => ({
    title: item.title,
    body: item.body,
    image: art[i],
  }))
  const projects = c.projects.map((p) => ({
    title: p.title,
    body: p.description,
    image: p.kind === 'concept' ? undefined : shots[p.kind],
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
        onCancel={close}
        onClick={(e) => {
          if (e.target === dialog) close()
        }}
      >
        <div class="a-dialog-content">
          <button
            class="a-circle a-pink a-dialog-close"
            onClick={close}
            aria-label={ar ? 'إغلاق' : 'Close details'}
          >
            ×
          </button>
          <Show when={detail()}>
            {(card) => (
              <>
                <Show when={card().image}>
                  <img class="a-detail-image" src={card().image} alt="" />
                </Show>
                <h2 id="a-detail-title">{card().title}</h2>
                <p>{card().body}</p>
                <a class="a-pill" href="#contact" onClick={close}>
                  {ar ? 'تعرّف على الاستوديو' : 'Meet the studio'}
                </a>
              </>
            )}
          </Show>
        </div>
      </dialog>
    </div>
  )
}
