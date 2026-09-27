// Sorting engine: one card at a time; the student taps the basket it
// belongs in.
//
// sort({ bins, items, count, intro, prompt })
// bins:  [{ id, label, icon }]
// items: [{ text, bin, hint, explain }]

import { runRounds, pick, h } from './kit.js';

export function sort({ bins, items, count = 9, intro, prompt = 'إلى أي سلّة تنتمي هذه الكلمة؟' }) {
  return (container, onComplete, ctx) => {
    const tally = Object.fromEntries(bins.map(b => [b.id, 0]));
    runRounds({
      container, ctx, items: pick(items, count), onComplete, intro,
      renderRound(item, round, stage) {
        stage.append(h(`<p class="prompt">${prompt}</p>`));
        const card = h(`<div class="sort-card"><span>${item.text}</span></div>`);
        stage.append(card);
        const row = h(`<div class="bins bins--${bins.length}"></div>`);
        bins.forEach(bin => {
          const b = h(`<button class="bin" data-bin="${bin.id}">
              <span class="bin__icon">${bin.icon || '🧺'}</span>
              <span class="bin__label">${bin.label}</span>
              <span class="bin__count">${ctx.num(tally[bin.id])}</span>
            </button>`);
          b.addEventListener('click', () => {
            if (bin.id === item.bin) {
              tally[bin.id] += 1;
              b.querySelector('.bin__count').textContent = ctx.num(tally[bin.id]);
              b.classList.add('is-right');
              card.classList.add('is-sorted');
              const dx = b.getBoundingClientRect().left + b.offsetWidth / 2 - (card.getBoundingClientRect().left + card.offsetWidth / 2);
              card.style.setProperty('--dx', `${dx}px`);
              row.classList.add('is-locked');
              round.right();
            } else {
              b.classList.add('is-wrong');
              setTimeout(() => b.classList.remove('is-wrong'), 600);
              round.wrong(item.hint);
            }
          });
          row.append(b);
        });
        round.onReveal = () => { row.classList.add('is-locked'); row.querySelector(`[data-bin="${item.bin}"]`).classList.add('is-right'); };
        stage.append(row);
      },
    });
  };
}
