// Shared helpers for activity engines. An engine is a reusable game
// mechanic (multiple choice, tap-the-word, sorting, number line, matching);
// a topic plugin feeds it content. See plugins/README.md.

// Automated tests set window.__SINDBAD_TEST__ before the app loads; engines
// then tag the right answer with data-ok so a headless browser can play a
// perfect round. Normal play never sets it.
export const TEST = typeof window !== 'undefined' && !!window.__SINDBAD_TEST__;

export function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const pick = (list, n) => shuffle(list).slice(0, n);

// A stable key for a content item, so the lesson runner can remember which
// ones a child got wrong and bring them back next time.
export function itemKey(it) {
  const raw = it.q || it.text || it.label || it.a || (it.words ? it.words.join(' ') + (it.ask || '') : '') || JSON.stringify(it);
  return String(raw).replace(/<[^>]*>/g, '').slice(0, 80);
}

// Draw n items for a lesson: the runner's adaptive choice (missed items
// first) when available, otherwise at random.
export const draw = (ctx, list, n) => (ctx.choose ? ctx.choose(list, n) : pick(list, n));

const PRAISE = [
  'أحسنت يا {name}!', 'إجابة صحيحة! ⭐', 'ممتاز! هكذا يفعل البحّارة.', 'رائع، تابع!',
  'عين الصواب!', 'بارك الله فيك!', 'صحيح! الريح في صالحنا.',
];

// Run a lesson as a series of rounds.
//
// renderRound(item, round) draws one question. It reports the student's
// answers through the `round` object:
//   round.right(note?)      correct answer — praise, then move on
//   round.wrong(hint)       wrong answer — the first time Hudhud gives the
//                           hint; the second time the round is lost:
//                           round.onReveal() is called so the engine can
//                           show the right answer, Hudhud explains, and a
//                           "next" button appears.
//   round.explain           set this to the explanation shown on reveal
//
// Only answers right on the first try count toward stars.
export function runRounds({ container, ctx, items, onComplete, renderRound, intro }) {
  let i = 0;
  let correct = 0;
  let streak = 0;   // answers right first time in a row
  let best = 0;
  const total = items.length;
  container.classList.add('engine');
  if (intro) ctx.say(intro, 'happy');

  function next() {
    if (ctx.signal.aborted) return;
    if (i >= total) { combo(container, 0); onComplete({ correct, total, streak: best }); return; }
    ctx.progress(i, total);
    const item = items[i];
    let attempts = 0;
    let done = false;
    const stage = document.createElement('div');
    stage.className = 'round';
    container.replaceChildren(stage);

    const advance = () => { i += 1; next(); };
    const round = {
      explain: item.explain || '',
      onReveal: () => {},
      right(note) {
        if (done) return;
        done = true;
        if (attempts === 0) correct += 1;
        ctx.mark?.(item, attempts === 0);
        ctx.sfx.good();
        streak = attempts === 0 ? streak + 1 : 0;
        best = Math.max(best, streak);
        const hit = stage.querySelector('.is-right');
        if (hit) burst(hit, attempts === 0 ? '+١' : '');
        combo(container, streak);
        if (streak >= 3) setTimeout(() => ctx.sfx.star(Math.min(streak - 3, 4)), 250);
        const praise = PRAISE[Math.floor(Math.random() * PRAISE.length)].replace('{name}', ctx.heroName);
        ctx.say(note ? `${praise} ${note}` : praise, 'cheer');
        stage.classList.add('is-solved');
        setTimeout(advance, note ? 1900 : 1100);
      },
      wrong(hint) {
        if (done) return;
        attempts += 1;
        ctx.sfx.bad();
        streak = 0;
        combo(container, 0);
        if (attempts < 2) {
          ctx.say(`ليس تماماً… ${hint || 'فكّر مرة أخرى!'}`, 'think');
          return;
        }
        done = true;
        ctx.mark?.(item, false);
        round.onReveal();
        ctx.say(`لا بأس، هذه هي الإجابة الصحيحة. ${round.explain}`, 'oops');
        const btn = document.createElement('button');
        btn.className = 'btn btn--gold round__next';
        btn.textContent = 'التالي ←';
        btn.addEventListener('click', () => { ctx.sfx.tap(); advance(); }, { once: true });
        stage.append(btn);
        btn.focus({ preventScroll: true });
      },
    };
    renderRound(item, round, stage);
  }
  next();
}

// Make an element from an HTML string.
export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

// ---------- Juice ----------

// A burst of little stars from an element, and a floating "+1".
export function burst(el, label = '') {
  if (!el?.getBoundingClientRect || document.body.classList.contains('lite')) return;
  const r = el.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const colors = ['#ffd23f', '#ff8fb1', '#7ee0c3', '#fff', '#9fd4ff'];
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2 + Math.random() * 0.4, d = 50 + Math.random() * 50;
    const sp = document.createElement('i');
    sp.className = 'spark';
    sp.textContent = k % 3 ? '★' : '✦';
    sp.style.cssText = `left:${x}px;top:${y}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;color:${colors[k % colors.length]};--rot:${Math.random() * 360}deg`;
    document.body.append(sp);
    sp.addEventListener('animationend', () => sp.remove(), { once: true });
  }
  if (label) {
    const f = document.createElement('b');
    f.className = 'float-plus';
    f.textContent = `${label} ⭐`;
    f.style.cssText = `left:${x}px;top:${r.top}px`;
    document.body.append(f);
    f.addEventListener('animationend', () => f.remove(), { once: true });
  }
}

// "🔥 ×3" combo badge for answers right first time in a row.
const COMBO_WORDS = ['', '', 'رائع!', 'مذهل!', 'لا يُوقَف!', 'أسطوري!'];
function combo(container, n) {
  const host = container.closest('.screen') || container.parentElement;
  let el = host.querySelector('.combo');
  if (n < 2) { el?.classList.remove('is-on'); return; }
  if (!el) { el = document.createElement('div'); el.className = 'combo'; el.setAttribute('aria-hidden', 'true'); host.append(el); }
  el.innerHTML = `<b>🔥 ×${'٠١٢٣٤٥٦٧٨٩'[n] || n}</b><small>${COMBO_WORDS[Math.min(n, 5)]}</small>`;
  el.classList.remove('is-on'); void el.offsetWidth; el.classList.add('is-on');
  el.dataset.level = Math.min(n, 5);
}
