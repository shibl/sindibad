// Number-line engine: "sail the boat to the number". A number line from
// `min` to `max` with `ticks` equal steps; the student taps where the value
// lies and the little boat sails there.
//
// numberline({ items, count, intro })
// items: [{ value: 0.75, label: html, min: 0, max: 1, ticks: 4,
//           labels: [[0,'٠'], [1,'١']], hint, explain }]
// A tap counts if it lands within half a tick of the value.

import { runRounds, pick, h } from './kit.js';

export function numberline({ items, count = 7, intro }) {
  return (container, onComplete, ctx) => {
    runRounds({
      container, ctx, items: pick(items, count), onComplete, intro,
      renderRound(item, round, stage) {
        const { min = 0, max = 1, ticks = 10 } = item;
        stage.append(h(`<p class="prompt">أوصِل القارب إلى العدد <span class="target">${item.label}</span></p>`));
        const W = 1000, PAD = 60, Y = 120;
        const xOf = v => PAD + ((v - min) / (max - min)) * (W - 2 * PAD);
        // Numbers grow left → right, as in Syrian maths textbooks.
        let tickMarks = '';
        for (let k = 0; k <= ticks; k++) {
          const x = PAD + (k / ticks) * (W - 2 * PAD);
          tickMarks += `<line x1="${x}" x2="${x}" y1="${Y - 16}" y2="${Y + 16}" class="nl__tick"/>`;
        }
        const labels = (item.labels || [[min, ctx.num(min)], [max, ctx.num(max)]])
          .map(([v, t]) => `<g transform="translate(${xOf(v)} ${Y + 66})"><circle r="30" class="nl__badge"/><text y="14" class="nl__label">${t}</text></g>`).join('');
        const svg = h(`
          <div class="nl" dir="ltr">
            <svg viewBox="0 -40 ${W} 260" class="nl__svg">
              <rect x="0" y="${Y - 44}" width="${W}" height="88" rx="44" class="nl__water"/>
              <path d="M20 ${Y - 20} q20 -10 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" class="nl__ripple"/>
              <line x1="${PAD}" x2="${W - PAD}" y1="${Y}" y2="${Y}" class="nl__axis"/>
              ${tickMarks}${labels}
              <g class="nl__flag" style="display:none"><line y1="${Y}" y2="${Y - 70}" class="nl__pole"/><path d="M0 ${Y - 70} l34 12 l-34 12Z" class="nl__pennant"/></g>
              <g class="nl__boat" transform="translate(${xOf(min)} ${Y})">
                <g transform="scale(1.9)">
                  <path d="M-26 -8 Q0 14 26 -8 L20 6 Q0 16 -20 6Z" class="nl__hull"/>
                  <path d="M0 -8 V-54" class="nl__mast"/>
                  <path d="M2 -52 Q26 -30 2 -12Z" class="nl__sail"/>
                  <path d="M0 -54 l14 4 l-14 4Z" class="nl__pennant"/>
                </g>
              </g>
            </svg>
          </div>`);
        const boat = svg.querySelector('.nl__boat');
        const flag = svg.querySelector('.nl__flag');
        let locked = false;
        svg.addEventListener('click', e => {
          if (locked) return;
          const r = svg.querySelector('svg').getBoundingClientRect();
          const x = ((e.clientX - r.left) / r.width) * W;
          const v = min + ((Math.max(PAD, Math.min(W - PAD, x)) - PAD) / (W - 2 * PAD)) * (max - min);
          const step = (max - min) / ticks;
          // Snap to the nearest tick so the boat lands where the child aimed.
          const snapped = min + Math.round((v - min) / step) * step;
          boat.setAttribute('transform', `translate(${xOf(snapped)} ${Y})`);
          if (Math.abs(snapped - item.value) < step / 2) {
            locked = true;
            svg.classList.add('is-right');
            round.right(item.note);
          } else {
            svg.classList.remove('is-wrong'); void svg.offsetWidth; svg.classList.add('is-wrong');
            round.wrong(item.hint);
          }
        });
        round.onReveal = () => {
          locked = true;
          flag.style.display = '';
          flag.setAttribute('transform', `translate(${xOf(item.value)} 0)`);
          boat.setAttribute('transform', `translate(${xOf(item.value)} ${Y})`);
        };
        stage.append(svg);
        stage.append(h('<p class="nl__help">اضغط على خط الأعداد لتُبحر ⛵</p>'));
      },
    });
  };
}
