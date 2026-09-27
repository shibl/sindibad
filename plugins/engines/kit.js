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
  const total = items.length;
  container.classList.add('engine');
  if (intro) ctx.say(intro, 'happy');

  function next() {
    if (ctx.signal.aborted) return;
    if (i >= total) { onComplete({ correct, total }); return; }
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
        ctx.sfx.good();
        const praise = PRAISE[Math.floor(Math.random() * PRAISE.length)].replace('{name}', ctx.heroName);
        ctx.say(note ? `${praise} ${note}` : praise, 'cheer');
        stage.classList.add('is-solved');
        setTimeout(advance, note ? 1900 : 1100);
      },
      wrong(hint) {
        if (done) return;
        attempts += 1;
        ctx.sfx.bad();
        if (attempts < 2) {
          ctx.say(`ليس تماماً… ${hint || 'فكّر مرة أخرى!'}`, 'think');
          return;
        }
        done = true;
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
