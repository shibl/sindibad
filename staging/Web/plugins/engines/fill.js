// Fill engine: "fill the bucket for the waterwheel". A glass bucket split
// into `parts` equal parts; the student fills it part by part (tap a level,
// or ▲ / ▼) and pours it into the noria, which turns. Good for equivalent
// fractions, simplifying, and fractions ↔ decimals ↔ percentages.
//
// fill({ items, count, intro })
// items: [{ q: html, parts: 8, answer: 6, hint, explain, note }]
//   answer = how many of the `parts` must be full (here 6/8, e.g. for ¾).

import { runRounds, draw, h, TEST } from './kit.js';
import { frac } from '../../core/format.js';

// Bucket and wheel geometry (viewBox units).
const TX = 34, TW = 112, TY = 18, TH = 226;    // the bucket
const NX = 262, NY = 128, NR = 76;             // the noria

const wheel = () => {
  let s = '';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, x = NX + Math.cos(a) * NR, y = NY + Math.sin(a) * NR;
    s += `<line x1="${NX}" y1="${NY}" x2="${x}" y2="${y}" class="fill__spoke"/>
          <rect x="${x - 9}" y="${y - 9}" width="18" height="18" rx="3" class="fill__cup" transform="rotate(${i * 45} ${x} ${y})"/>`;
  }
  return `<circle cx="${NX}" cy="${NY}" r="${NR}" class="fill__rim"/><circle cx="${NX}" cy="${NY}" r="${NR - 22}" class="fill__rim fill__rim--in"/>${s}
          <circle cx="${NX}" cy="${NY}" r="11" class="fill__hub"/>`;
};

export function fill({ items, count = 8, intro }) {
  return (container, onComplete, ctx) => {
    let turns = 0;   // the wheel keeps turning through the lesson
    runRounds({
      container, ctx, items: draw(ctx, items, count), onComplete, intro,
      renderRound(item, round, stage) {
        const { parts, answer } = item;
        const band = TH / parts;
        let level = 0, locked = false;

        stage.classList.add('round--compact');
        stage.append(h(`<p class="prompt">${item.q}</p>`));
        let lines = '', hits = '';
        for (let k = 1; k <= parts; k++) {
          const y = TY + TH - k * band;
          if (k < parts) lines += `<line x1="${TX}" x2="${TX + TW}" y1="${y}" y2="${y}" class="fill__line"/><line x1="${TX - 8}" x2="${TX}" y1="${y}" y2="${y}" class="fill__mark"/>`;
          hits += `<rect x="${TX}" y="${y}" width="${TW}" height="${band}" class="fill__hit" data-level="${k}"/>`;
        }
        const box = h(`
          <div class="fill">
            <div class="fill__scene" dir="ltr">
              <svg viewBox="0 0 352 262" class="fill__svg">
                <defs><clipPath id="fill-clip"><rect x="${TX}" y="${TY}" width="${TW}" height="${TH}" rx="14"/></clipPath></defs>
                <path d="M${NX - 46} ${NY + NR + 8} L${NX - 20} ${NY - 6} H${NX + 20} L${NX + 46} ${NY + NR + 8}" class="fill__stand"/>
                <path d="M190 ${NY + NR + 10} q20 -8 40 0 t40 0 t40 0 t40 0" class="fill__river"/>
                <g class="fill__wheel" style="transform: rotate(${turns * 45}deg)">${wheel()}</g>
                <path d="M${TX + TW - 6} ${TY + 10} Q${NX - 60} ${TY - 6} ${NX - NR + 8} ${NY - 40}" class="fill__stream"/>
                <rect x="${TX}" y="${TY}" width="${TW}" height="${TH}" rx="14" class="fill__glass"/>
                <g clip-path="url(#fill-clip)">
                  <g class="fill__water">
                    <path d="M${TX - 20} ${TY + TH + 4} q14 -7 28 0 t28 0 t28 0 t28 0 t28 0 V${TY + 2 * TH}H${TX - 20}Z" class="fill__wave"/>
                  </g>
                </g>
                ${lines}
                <rect x="${TX}" y="${TY}" width="${TW}" height="${TH}" rx="14" class="fill__frame"/>
                ${hits}
              </svg>
            </div>
            <div class="fill__controls">
              <button class="btn btn--round" data-pour="-1" aria-label="أنقِص جزءاً">▼</button>
              <output class="fill__read" aria-live="polite"></output>
              <button class="btn btn--round" data-pour="1" aria-label="أضِف جزءاً">▲</button>
              <button class="btn btn--gold fill__go">اسكب 💧</button>
            </div>
          </div>`);
        const water = box.querySelector('.fill__water');
        const read = box.querySelector('.fill__read');
        const wheelG = box.querySelector('.fill__wheel');
        const goBtn = box.querySelector('.fill__go');
        const controls = box.querySelector('.fill__controls');

        function set(n) {
          level = Math.max(0, Math.min(parts, n));
          water.style.transform = `translateY(${-level * band}px)`;
          read.innerHTML = frac(level, parts);
          if (TEST) mark();
        }
        // Test hook: the next ▲/▼ press towards the answer, then "pour".
        function mark() {
          stage.querySelectorAll('[data-step], [data-ok]').forEach(b => { delete b.dataset.step; delete b.dataset.ok; });
          if (locked) return;
          if (level === answer) goBtn.dataset.ok = '';
          else controls.querySelector(`[data-pour="${level < answer ? 1 : -1}"]`).dataset.step = '';
        }

        box.querySelector('svg').addEventListener('click', e => {
          const hit = e.target.closest('[data-level]');
          if (!hit || locked) return;
          const k = Number(hit.dataset.level);
          ctx.sfx.tap();
          set(k === level ? k - 1 : k);   // tap the top part again to empty it
        });
        controls.addEventListener('click', e => {
          const b = e.target.closest('[data-pour]');
          if (!b || locked) return;
          ctx.sfx.tap();
          set(level + Number(b.dataset.pour));
        });

        const finish = () => {
          locked = true;
          box.classList.add('is-locked');
          controls.style.visibility = 'hidden';
          if (TEST) mark();
        };
        goBtn.addEventListener('click', () => {
          if (locked) return;
          if (!level) { ctx.say('املأ الدلو أولاً، ثم اسكبه.', 'think'); return; }
          if (level === answer) {
            finish();
            box.classList.add('is-right', 'is-pouring');
            turns += 1;
            setTimeout(() => {
              if (ctx.signal.aborted) return;
              water.style.transform = 'translateY(0)';
              wheelG.style.transform = `rotate(${turns * 45}deg)`;
            }, 350);
            round.right(item.note);
            return;
          }
          box.classList.remove('is-wrong'); void box.offsetWidth; box.classList.add('is-wrong');
          round.wrong(item.hint);
        });
        round.onReveal = () => { set(answer); finish(); box.querySelector('.fill__scene').classList.add('is-right'); };

        stage.append(box);
        set(0);
      },
    });
  };
}
