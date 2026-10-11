// Helm engine: "steer the ship". The ship sits at the corner of an angle
// whose first side points east (0°). The student turns the course line —
// drag or tap the dial, the − / + buttons, or the arrow keys — then presses
// "sail". Good for angles: measuring, types of angle, complementary and
// supplementary angles, the angles of a triangle, clock hands.
//
// helm({ items, count, intro, step })
// items: [{ q: html, angle: 60, hint, explain, note }]           one exact angle
//        [{ q: html, range: [95, 175], show: 120, hint, … }]      any angle in the range;
//                                                                 `show` is used on reveal
// Angles are in degrees from 0 to 180, snapped to `step` (default 5).

import { runRounds, draw, h, TEST } from './kit.js';

const W = 400, VX = 200, VY = 206, R = 172;
const rad = d => (d * Math.PI) / 180;
const at = (d, r) => [VX + Math.cos(rad(d)) * r, VY - Math.sin(rad(d)) * r];

export function helm({ items, count = 8, intro, step = 5 }) {
  return (container, onComplete, ctx) => {
    runRounds({
      container, ctx, items: draw(ctx, items, count), onComplete, intro,
      renderRound(item, round, stage) {
        const target = item.angle ?? item.show ?? Math.round((item.range[0] + item.range[1]) / 2 / step) * step;
        const ok = a => (item.range ? a >= item.range[0] && a <= item.range[1] : a === item.angle);
        let angle = 0, locked = false;

        stage.classList.add('round--compact');
        stage.append(h(`<p class="prompt">${item.q}</p>`));
        let ticks = '';
        for (let d = 0; d <= 180; d += 10) {
          const [x1, y1] = at(d, R), [x2, y2] = at(d, d % 30 ? R - 12 : R - 22);
          ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="helm__tick"/>`;
          if (d % 30 === 0) { const [tx, ty] = at(d, R - 42); ticks += `<text x="${tx}" y="${ty + 8}" class="helm__num">${ctx.num(d)}</text>`; }
        }
        const dial = h(`
          <div class="helm" dir="ltr" role="slider" tabindex="0" aria-label="زاوية الدفّة"
               aria-valuemin="0" aria-valuemax="180">
            <svg viewBox="0 24 ${W} 206" class="helm__svg">
              <path d="M${VX - R} ${VY} A${R} ${R} 0 0 1 ${VX + R} ${VY}Z" class="helm__sea"/>
              <path d="M${VX - R + 30} ${VY - 26} q14 -8 28 0 t28 0 M${VX + 60} ${VY - 90} q14 -8 28 0 t28 0 M${VX - 120} ${VY - 110} q14 -8 28 0 t28 0" class="helm__ripple"/>
              ${ticks}
              <path class="helm__wedge"/>
              <line x1="${VX}" y1="${VY}" x2="${VX + R + 14}" y2="${VY}" class="helm__base"/>
              <line x1="${VX}" y1="${VY}" class="helm__course"/>
              <text class="helm__deg"></text>
              <g class="helm__buoy" style="display:none">
                <circle r="13" class="helm__buoy-body"/><path d="M0 -12 V-38 l18 7 l-18 7" class="helm__flag"/>
              </g>
              <g class="helm__ship">
                <path d="M-24 -10 Q8 -13 28 0 Q8 13 -24 10 Q-29 0 -24 -10Z" class="helm__hull"/>
                <path d="M-6 -11 Q4 0 -6 11" class="helm__sail"/>
                <circle cx="-6" cy="0" r="3.5" class="helm__mast"/>
              </g>
              <circle cx="${VX}" cy="${VY}" r="7" class="helm__pin"/>
            </svg>
          </div>`);
        const svg = dial.querySelector('svg');
        const course = dial.querySelector('.helm__course');
        const wedge = dial.querySelector('.helm__wedge');
        const deg = dial.querySelector('.helm__deg');
        const ship = dial.querySelector('.helm__ship');
        const buoy = dial.querySelector('.helm__buoy');

        const controls = h(`
          <div class="helm__controls">
            <button class="btn btn--round helm__turn" data-turn="-1" aria-label="أنقص الزاوية">−</button>
            <button class="btn btn--gold helm__go">أبحر ⛵</button>
            <button class="btn btn--round helm__turn" data-turn="1" aria-label="زِد الزاوية">+</button>
          </div>`);
        const sail = controls.querySelector('.helm__go');

        const shipAt = r => { const [x, y] = at(angle, r); ship.style.transform = `translate(${x}px, ${y}px) rotate(${-angle}deg)`; };
        function set(a) {
          angle = Math.max(0, Math.min(180, Math.round(a / step) * step));
          const [cx, cy] = at(angle, R + 14), [wx, wy] = at(angle, 58), [tx, ty] = at(angle / 2, 84);
          course.setAttribute('x2', cx); course.setAttribute('y2', cy);
          wedge.setAttribute('d', angle ? `M${VX} ${VY} L${VX + 58} ${VY} A58 58 0 0 0 ${wx} ${wy}Z` : '');
          deg.setAttribute('x', tx); deg.setAttribute('y', ty + 9);
          deg.textContent = angle ? `${ctx.num(angle)}°` : '';
          dial.setAttribute('aria-valuenow', angle);
          dial.setAttribute('aria-valuetext', `${ctx.num(angle)} درجة`);
          shipAt(36);
          if (TEST) mark();
        }
        // Test hook: the next click that brings the course to the target.
        function mark() {
          stage.querySelectorAll('[data-step], [data-ok]').forEach(b => { delete b.dataset.step; delete b.dataset.ok; });
          if (locked) return;
          if (angle === target) sail.dataset.ok = '';
          else controls.querySelector(`[data-turn="${angle < target ? 1 : -1}"]`).dataset.step = '';
        }

        // Drag or tap anywhere on the dial: the course follows the pointer.
        const fromPointer = e => {
          const pt = svg.createSVGPoint();
          pt.x = e.clientX; pt.y = e.clientY;
          const p = pt.matrixTransform(svg.getScreenCTM().inverse());
          let a = (Math.atan2(VY - p.y, p.x - VX) * 180) / Math.PI;
          if (a < 0) a = a < -90 ? 180 : 0;   // below the baseline: snap to the nearest end
          set(a);
        };
        let dragging = false;
        dial.addEventListener('pointerdown', e => {
          if (locked) return;
          dragging = true; dial.setPointerCapture(e.pointerId); fromPointer(e); ctx.sfx.tap();
        });
        dial.addEventListener('pointermove', e => { if (dragging && !locked) fromPointer(e); });
        dial.addEventListener('pointerup', () => { dragging = false; });
        dial.addEventListener('pointercancel', () => { dragging = false; });
        dial.addEventListener('keydown', e => {
          if (locked) return;
          const k = { ArrowLeft: 1, ArrowUp: 1, ArrowRight: -1, ArrowDown: -1 }[e.key];
          if (k) { e.preventDefault(); set(angle + k * step); }
          if (e.key === 'Home') { e.preventDefault(); set(0); }
          if (e.key === 'End') { e.preventDefault(); set(180); }
          if (e.key === 'Enter') sail.click();
        });
        controls.addEventListener('click', e => {
          const b = e.target.closest('[data-turn]');
          if (!b || locked) return;
          ctx.sfx.tap();
          set(angle + Number(b.dataset.turn) * step);
        });

        // Sail along the course; the buoy shows where it led.
        const arrive = () => {
          locked = true;
          dial.classList.add('is-locked'); controls.classList.add('is-locked'); controls.style.visibility = 'hidden';
          const [bx, by] = at(angle, R - 4);
          buoy.setAttribute('transform', `translate(${bx} ${by})`);
          buoy.style.display = '';
          dial.classList.add('is-sailing');
          requestAnimationFrame(() => shipAt(R - 34));
          if (TEST) mark();
        };
        sail.addEventListener('click', () => {
          if (locked) return;
          if (ok(angle)) { arrive(); dial.classList.add('is-right'); round.right(item.note); }
          else {
            dial.classList.remove('is-wrong'); void dial.offsetWidth; dial.classList.add('is-wrong');
            round.wrong(item.hint);
          }
        });
        round.onReveal = () => { set(target); arrive(); };

        stage.append(dial, controls);
        set(0);
      },
    });
  };
}
