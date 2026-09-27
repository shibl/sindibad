// Multiple-choice engine.
//
// quiz({ questions, count, intro }) → render function for registerTopic.
// questions: [{ q: html, options: [html, …], answer: index into options,
//               hint: html, explain: html }]
// Options are shuffled; `count` questions are drawn at random.

import { runRounds, pick, shuffle, h } from './kit.js';

export function quiz({ questions, count = 8, intro }) {
  return (container, onComplete, ctx) => {
    const items = pick(typeof questions === 'function' ? questions() : questions, count);
    runRounds({
      container, ctx, items, onComplete, intro,
      renderRound(item, round, stage) {
        const opts = shuffle(item.options.map((html, idx) => ({ html, ok: idx === item.answer })));
        stage.append(h(`<p class="prompt">${item.q}</p>`));
        const grid = h(`<div class="choices ${opts.some(o => o.html.replace(/<[^>]*>/g, '').length > 22) ? 'choices--wide' : ''}"></div>`);
        opts.forEach(o => {
          const b = h(`<button class="choice">${o.html}</button>`);
          b.addEventListener('click', () => {
            if (o.ok) { b.classList.add('is-right'); grid.classList.add('is-locked'); round.right(); }
            else { b.classList.add('is-wrong'); b.disabled = true; round.wrong(item.hint); }
          });
          grid.append(b);
        });
        round.onReveal = () => {
          grid.classList.add('is-locked');
          [...grid.children].forEach((b, k) => { if (opts[k].ok) b.classList.add('is-right'); });
        };
        stage.append(grid);
      },
    });
  };
}
