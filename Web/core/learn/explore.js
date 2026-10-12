// «أتعلّم»: a lesson step that teaches by discovery, before any question.
//
// A picture (a `view`) has spots that glow. Tapping one shows one small idea
// (a title and a sentence or two), plays its sound and ticks it off. When
// every spot is found the helper sums up and «فهمت» moves on to the
// questions. Nothing here is scored: it is the teaching, not the test.
//
// step = {
//   kind: 'explore', title, say?,          // say: the helper's opening line
//   view?,                                 // a picture drawn by opts.views[view](step); spots inside it
//                                          // carry data-spot="<id>". Spots not found in it become cards.
//   spots: [{ id, title, text, icon?, art?, label?, say?, ...anything onSpot needs }],
//   guided?,                               // true: one spot at a time, in order
//   cols?, theme?,                         // cards per row; a look (e.g. 'stage') for the cards
//   done?, sum?,                           // the helper's last line; a short recap (html)
// }
// opts = { views, onSpot(spot, el, host), art: { key: svg },
//         mount(host, step, tap) — wires a view's own controls (a slider…);
//         tap(el) opens a spot as if it were tapped }
//
// Test hook: every spot that may be tapped now carries data-ok; «فهمت»
// carries data-next data-step.

const TEST = typeof window !== 'undefined' && !!window.__SINDBAD_TEST__;
const bump = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

// A spot drawn in SVG glows (and is tapped) through its .lx-hit rectangle;
// grow that rectangle to cover everything the spot draws, so a tap anywhere
// on the part opens it.
export function fitHits(root) {
  for (const g of root.querySelectorAll('svg g[data-spot]')) {
    const hit = g.querySelector(':scope > .lx-hit');
    if (!hit || !g.getBBox) continue;
    try {
      const b = g.getBBox(), pad = 3;
      const x0 = Math.min(b.x - pad, +hit.getAttribute('x')), y0 = Math.min(b.y - pad, +hit.getAttribute('y'));
      const x1 = Math.max(b.x + b.width + pad, +hit.getAttribute('x') + +hit.getAttribute('width'));
      const y1 = Math.max(b.y + b.height + pad, +hit.getAttribute('y') + +hit.getAttribute('height'));
      hit.setAttribute('x', x0); hit.setAttribute('y', y0); hit.setAttribute('width', x1 - x0); hit.setAttribute('height', y1 - y0);
    } catch { /* not laid out: keep the drawn rectangle */ }
  }
}

function cardHTML(s, art) {
  const pic = s.art && art[s.art] ? `<span class="lx-card__art">${art[s.art]}</span>` : s.icon ? `<span class="lx-card__icon">${s.icon}</span>` : '';
  return `<button class="lx-card" data-spot="${s.id}">${pic}<span class="lx-card__label">${s.label ?? s.title}</span><i class="lx-tick" aria-hidden="true">✓</i></button>`;
}

export function explore(step, host, ctx, resolve, { views = {}, onSpot = null, art = {}, mount = null } = {}) {
  const pic = step.view && views[step.view] ? views[step.view](step) : '';
  host.innerHTML = `<div class="lx${step.guided ? ' lx--guided' : ''}${step.theme ? ` lx--${step.theme}` : ''}">
    <h3 class="lx-title"><span class="lx-chip">📖 أتعلّم</span>${step.title}</h3>
    ${pic ? `<div class="lx-view">${pic}</div>` : ''}
    <div class="lx-cards"></div>
    <div class="lx-note" aria-live="polite"><p class="lx-hint">👆 ${step.tap || (step.guided ? 'اضغط على ما يلمع' : 'اضغط على كل ما يلمع لتكتشفه')}</p></div>
    <div class="lx-foot"><span class="lx-count"></span></div></div>`;
  const view = host.querySelector('.lx-view'), cards = host.querySelector('.lx-cards');
  const note = host.querySelector('.lx-note'), count = host.querySelector('.lx-count'), foot = host.querySelector('.lx-foot');

  // Each spot: in the picture if the view drew it, else a card.
  const loose = step.spots.filter(s => !view?.querySelector(`[data-spot="${CSS.escape(s.id)}"]`));
  if (loose.length) cards.innerHTML = loose.map(s => cardHTML(s, art)).join('');
  else cards.remove();
  if (step.cols) cards.style.setProperty('--cols', step.cols);
  const els = step.spots.map(s => host.querySelector(`[data-spot="${CSS.escape(s.id)}"]`));
  els.forEach((el, i) => {
    el.classList.add('lx-spot');
    if (el.tagName !== 'BUTTON') {
      el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', step.spots[i].label ?? step.spots[i].title);
    }
  });

  const found = new Set();
  let finished = false;
  const nextIndex = () => step.spots.findIndex(s => !found.has(s.id));
  const mark = () => {
    const next = nextIndex();
    els.forEach((el, i) => {
      const s = step.spots[i], open = !found.has(s.id) && (!step.guided || i === next);
      el.classList.toggle('is-found', found.has(s.id));
      el.classList.toggle('is-new', open);
      el.classList.toggle('is-next', !!step.guided && i === next);
      el.toggleAttribute('data-ok', open);
    });
    count.textContent = `🔍 ${found.size} / ${step.spots.length}`;
  };

  const show = (s, el) => {
    const picHTML = s.art && art[s.art] ? `<span class="lx-note__art">${art[s.art]}</span>` : s.icon ? `<span class="lx-note__icon">${s.icon}</span>` : '';
    note.innerHTML = `<div class="lx-note__card">${picHTML}<div><b class="lx-note__t">${s.title}</b><p>${s.text}</p></div></div>`;
    bump(note.firstElementChild, 'is-pop');
    // A part of the picture shows its name once found: its label, or a
    // short title.
    const label = el.querySelector('.lx-label');
    const name = s.label ?? (s.title.length <= 16 ? s.title : null);
    if (label && name != null) label.textContent = name;
    onSpot?.(s, el, host);
    if (s.say) ctx.say(s.say);
  };

  const done = () => {
    finished = true;
    ctx.sfx.good();
    if (step.done) ctx.say(step.done, 'cheer');
    if (step.sum) note.insertAdjacentHTML('beforeend', `<div class="lx-sum"><b>✨ الخلاصة</b>${step.sum}</div>`);
    const b = document.createElement('button');
    b.className = 'btn btn--gold lx-go';
    b.setAttribute('data-next', ''); b.setAttribute('data-step', '');
    b.textContent = 'فهمت! ◀';
    foot.append(b);
    b.focus({ preventScroll: true });
    b.addEventListener('click', () => { ctx.sfx.tap(); resolve({ ok: 0, total: 0 }); }, { once: true });
  };

  const tap = el => {
    const i = els.indexOf(el);
    if (i < 0) return;
    const s = step.spots[i];
    if (!found.has(s.id)) {
      // Guided: only the glowing spot opens; another tap points at it.
      if (step.guided && i !== nextIndex()) { bump(els[nextIndex()], 'is-nudge'); return; }
      found.add(s.id);
      ctx.sfx.tap();
      bump(el, 'is-pop');
    }
    show(s, el);
    mark();
    if (!finished && found.size === step.spots.length) setTimeout(done, TEST ? 0 : 450);
  };
  host.querySelector('.lx').addEventListener('click', e => { const el = e.target.closest('.lx-spot'); if (el) tap(el); });
  host.querySelector('.lx').addEventListener('keydown', e => {
    const el = e.target.closest('.lx-spot');
    if (el && el.tagName !== 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); tap(el); }
  });
  mount?.(host, step, tap);
  fitHits(host);
  if (step.say) ctx.say(step.say);
  mark();
}
