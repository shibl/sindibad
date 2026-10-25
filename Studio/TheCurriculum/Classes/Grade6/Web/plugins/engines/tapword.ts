// Tap-the-word engine: a sentence is shown as word tiles and the student
// taps the word with the asked role (e.g. the subject, the predicate).
//
// tapword({ items, count, intro })
// items: [{ words: ['كتبَ', 'الطالبُ', 'الدرسَ'], ask: 'الفاعل', answer: 1,
//           hint, explain }]

import { runRounds, draw, h, TEST } from './kit.js';
import type { Render } from '../../core/topics.js';

/** A sentence as word tiles, and the word to tap. */
export interface TapwordItem {
  /** The sentence's words, in order. */
  words: string[];
  /** The role asked for (html), e.g. 'الفاعل'. */
  ask: string;
  /** Index into words of the right one. */
  answer: number;
  hint?: string;
  explain?: string;
  /** Said with the praise when right. */
  note?: string;
}
export interface TapwordOptions {
  items: TapwordItem[];
  /** How many are drawn (default 8). */
  count?: number;
  /** Hudhud's first line. */
  intro?: string;
}

export function tapword({ items, count = 8, intro }: TapwordOptions): Render {
  return (container, onComplete, ctx) => {
    runRounds({
      container, ctx, items: draw(ctx, items, count), onComplete, intro,
      renderRound(item, round, stage) {
        stage.append(h(`<p class="prompt">اضغط على <b class="ask">${item.ask}</b> في الجملة:</p>`));
        const line = h('<div class="sentence" dir="rtl"></div>');
        item.words.forEach((w, idx) => {
          const b = h(`<button class="word">${w}</button>`);
          if (TEST && idx === item.answer) b.dataset.ok = '';
          b.addEventListener('click', () => {
            if (idx === item.answer) { b.classList.add('is-right'); line.classList.add('is-locked'); round.right(item.note); }
            else { b.classList.add('is-wrong'); setTimeout(() => b.classList.remove('is-wrong'), 600); round.wrong(item.hint); }
          });
          line.append(b);
        });
        round.onReveal = () => { line.classList.add('is-locked'); line.children[item.answer].classList.add('is-right'); };
        stage.append(line);
      },
    });
  };
}
