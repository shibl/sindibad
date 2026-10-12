// The voyages chart: the meta map above the sea maps, one voyage (chapter)
// per school grade, grouped by age stage. Open voyages lead to their sea
// map; locked ones wait under the fog. Content: worlds/chapters.js.

import { num } from './format.js';
import { sfx } from './sound.js';

let noteTimer = 0;

// renderChapters(el, { stages, chapters, progress, open })
//   progress(chapter) → { stars, max, badges, badgeMax } for an open voyage
//   open(chapter)     → the student tapped an open voyage
export function renderChapters(el, { stages, chapters, progress, open }) {
  const voyage = c => {
    if (!c.open) {
      return `<button class="voyage voyage--locked" data-grade="${c.grade}" aria-label="${c.name}، ${c.gradeName}: قريباً">
          <span class="voyage__medal"><b>${num(c.grade)}</b><i aria-hidden="true">🔒</i></span>
          <span class="voyage__text"><b>${c.name}</b><small>${c.gradeName} • قريباً</small></span>
        </button>`;
    }
    const p = progress(c);
    return `<button class="voyage voyage--open" data-grade="${c.grade}" aria-label="${c.name}، ${c.gradeName}">
        <span class="voyage__medal"><b>${num(c.grade)}</b><i aria-hidden="true">⛵</i></span>
        <span class="voyage__text"><b>${c.name}</b><small>${c.gradeName}</small>
          <span class="voyage__stats">★ ${num(p.stars)}/${num(p.max)} &nbsp; 🏅 ${num(p.badges)}/${num(p.badgeMax)}</span></span>
        <span class="voyage__go">أبحر</span>
      </button>`;
  };

  el.innerHTML = `
    <div class="chart">
      ${stages.map(st => `
        <section class="chart__stage" style="--stage:${st.color}">
          <h3 class="chart__head"><span aria-hidden="true">${st.icon}</span> ${st.name}
            <small>الصفوف ${num(st.grades[0])} إلى ${num(st.grades[1])}${st.exam ? ` • ${st.exam}` : ''}</small></h3>
          ${chapters.filter(c => c.grade >= st.grades[0] && c.grade <= st.grades[1]).map(voyage).join('')}
        </section>`).join('')}
    </div>
    <p class="chart__note bubble" aria-live="polite" hidden></p>`;

  const note = el.querySelector('.chart__note');
  el.querySelectorAll('.voyage').forEach(b => b.addEventListener('click', () => {
    const c = chapters.find(x => x.grade === Number(b.dataset.grade));
    if (c.open) { sfx.tap(); open(c); return; }
    sfx.bad();
    b.classList.remove('is-shake'); void b.offsetWidth; b.classList.add('is-shake');
    note.innerHTML = `<b>${c.name}</b> ما زالت تحت الضباب… سنُبحر إليها قريباً! ⛵`;
    note.hidden = false;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => { note.hidden = true; }, 3200);
  }));

  // Start with the open voyage in view.
  requestAnimationFrame(() => el.querySelector('.voyage--open')?.scrollIntoView({ block: 'center' }));
}
