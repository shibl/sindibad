// Multiple-choice engine.
//
// quiz({ questions, count, intro }) → render function for registerTopic.
// questions: [{ q: html, options: [html, …], answer: index into options,
//               hint: html, explain: html }]
// Options are shuffled; `count` questions are drawn at random.

import { runRounds, draw, shuffle, h, TEST } from './kit.js';
import type { Render } from '../../core/topics.js';

/** A multiple-choice question. */
export interface QuizQuestion {
  /** Preserve the target words in mixed Arabic reviews. */
  curriculum?: 'arabic';
  /** The question (html). */
  q: string;
  /** The choices (html); they are shuffled. */
  options: string[];
  /** Index into options of the right one. */
  answer: number;
  hint?: string;
  explain?: string;
}
export interface QuizOptions {
  /** The questions, or a function that makes them. */
  questions: QuizQuestion[] | (() => QuizQuestion[]);
  /** How many are drawn (default 8). */
  count?: number;
  /** Hudhud's first line. */
  intro?: string;
}

export function quiz({ questions, count = 8, intro }: QuizOptions): Render {
  return (container, onComplete, ctx) => {
    const items = draw(ctx, typeof questions === 'function' ? questions() : questions, count);
    runRounds({
      container, ctx, items, onComplete, intro,
      renderRound(item, round, stage) {
        if (item.curriculum) stage.dataset.curriculum = item.curriculum;
        const opts = shuffle(item.options.map((html, idx) => ({ html, ok: idx === item.answer })));
        stage.append(h(`<p class="prompt">${item.q}</p>`));
        const grid = h(`<div class="choices ${opts.some(o => o.html.replace(/<[^>]*>/g, '').length > 22) ? 'choices--wide' : ''}"></div>`);
        opts.forEach(o => {
          const b = h<HTMLButtonElement>(`<button class="choice">${o.html}</button>`);
          if (TEST && o.ok) b.dataset.ok = '';
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
