// Matching engine: two columns; tap an item on one side, then its partner
// on the other. Each board has `perBoard` pairs; every pair is one point
// (first try only).
//
// match({ pairs, boards, perBoard, intro, left, right })
// pairs: [{ a: html, b: html, hint }]   (a shown in the right column in RTL)

import { shuffle, draw, burst, h, TEST } from './kit.js';

export function match({ pairs, boards = 2, perBoard = 4, intro, headA = '', headB = '' }) {
  return (container, onComplete, ctx) => {
    const chosen = draw(ctx, pairs, boards * perBoard);
    let board = 0;
    let correct = 0;
    const total = chosen.length;
    container.classList.add('engine');
    if (intro) ctx.say(intro, 'happy');

    function drawBoard() {
      if (ctx.signal.aborted) return;
      if (board >= boards) { onComplete({ correct, total }); return; }
      const set = chosen.slice(board * perBoard, board * perBoard + perBoard);
      const colA = shuffle(set), colB = shuffle(set);
      const stage = h(`<div class="round match">
          <p class="prompt">صِل كل عنصر بما يناسبه:</p>
          <div class="match__cols">
            <div class="match__col"><div class="match__head">${headA}</div></div>
            <div class="match__col"><div class="match__head">${headB}</div></div>
          </div>
        </div>`);
      const [ca, cb] = stage.querySelectorAll('.match__col');
      const missed = new Set();
      let sel = null;
      let left = set.length;
      const mk = (p, side) => {
        const b = h(`<button class="match__item" data-side="${side}">${side === 'a' ? p.a : p.b}</button>`);
        b._pair = p;
        if (TEST) b.dataset.pair = String(set.indexOf(p));
        b.addEventListener('click', () => {
          if (b.classList.contains('is-done')) return;
          ctx.sfx.tap();
          if (!sel || sel.dataset.side === side) {
            sel?.classList.remove('is-sel');
            sel = b; b.classList.add('is-sel');
            return;
          }
          if (sel._pair === p) {
            const hue = (set.length - left) * 67;
            [sel, b].forEach(x => { x.classList.remove('is-sel'); x.classList.add('is-done'); x.style.setProperty('--hue', hue); });
            if (!missed.has(p)) correct += 1;
            burst(b, missed.has(p) ? '' : '+١');
            ctx.mark?.(p, !missed.has(p));
            left -= 1;
            ctx.sfx.good();
            ctx.progress(board * perBoard + (set.length - left), total);
            if (left === 0) {
              ctx.say(`أحسنت يا ${ctx.heroName}! لوحة كاملة ✔`, 'cheer');
              board += 1;
              setTimeout(drawBoard, 1200);
            } else ctx.say('صحيح! تابع…', 'cheer');
          } else {
            missed.add(p); missed.add(sel._pair);
            ctx.sfx.bad();
            [sel, b].forEach(x => { x.classList.add('is-wrong'); setTimeout(() => x.classList.remove('is-wrong', 'is-sel'), 600); });
            ctx.say(`ليس تماماً… ${sel._pair.hint || p.hint || 'جرّب مرة أخرى.'}`, 'think');
            sel = null;
          }
        });
        return b;
      };
      colA.forEach(p => ca.append(mk(p, 'a')));
      colB.forEach(p => cb.append(mk(p, 'b')));
      container.replaceChildren(stage);
      ctx.progress(board * perBoard, total);
    }
    drawBoard();
  };
}
