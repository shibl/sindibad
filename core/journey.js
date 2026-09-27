// "رحلتي" — the player's journey page: hero, stars, badge shelf, progress
// per subject, change hero, and start over.

import { heroSVG, medalSVG, HEROES } from '../art/art.js';
import { save } from './save.js';
import { regionStars, badgeState, totalStars } from './map.js';
import { sfx } from './sound.js';
import { num } from './format.js';

export function renderJourney(el, world, { showScreen }) {
  const s = save.get();
  const hero = s.hero || 'sindbad';
  const { stars, max } = totalStars();
  const earned = world.regions.filter(r => badgeState(r.id)).length;
  const played = Object.values(s.topics).filter(t => t.plays).length;
  const rank = stars >= max * 0.9 ? 'قائد الأسطول الصغير' : stars >= max * 0.6 ? 'ربّان ماهر' : stars >= max * 0.3 ? 'بحّار نشيط' : 'بحّار مبتدئ';

  el.innerHTML = `
    <div class="journey__hero">
      <div class="journey__portrait">${heroSVG(hero)}</div>
      <div>
        <h3>${HEROES[hero].name}</h3>
        <p class="journey__rank">🎖️ ${rank}</p>
        <div class="journey__stats">
          <span><b>★ ${num(stars)}</b> من ${num(max)}</span>
          <span><b>🏅 ${num(earned)}</b> شارات</span>
          <span><b>📚 ${num(played)}</b> دروس</span>
        </div>
      </div>
    </div>
    <h4 class="journey__h">خزانة الشارات</h4>
    <div class="shelf">
      ${world.regions.map(r => {
        const b = badgeState(r.id);
        return `<div class="shelf__item ${b ? '' : 'is-empty'}" title="${r.badge.name}">
          ${medalSVG(b ? r.badge.icon : '❔', { gold: b === 'gold', color: b ? r.color : '#b9b0a0' })}
          <small>${b ? r.badge.name : r.name}</small>
        </div>`;
      }).join('')}
    </div>
    <h4 class="journey__h">تقدّمي في المواد</h4>
    <div class="subjects">
      ${world.regions.map(r => {
        const { stars: st, max: mx } = regionStars(r.id);
        const pct = mx ? Math.round((st / mx) * 100) : 0;
        return `<div class="subject" style="--region:${r.color}">
          <span class="subject__name">${r.subject}</span>
          <span class="subject__bar"><i style="width:${pct}%"></i></span>
          <span class="subject__num">${num(st)}/${num(mx)}</span>
        </div>`;
      }).join('')}
    </div>
    <div class="journey__actions">
      <button class="btn btn--ghost" data-j="hero">🔄 تغيير البطل</button>
      <button class="btn btn--ghost btn--danger" data-j="reset">🗑️ ابدأ من جديد</button>
    </div>
    <p class="journey__privacy">🔒 كل تقدّمك محفوظ على هذا الجهاز فقط. لا نجمع أي بيانات.</p>`;

  el.onclick = e => {
    const b = e.target.closest('[data-j]');
    if (!b) return;
    sfx.tap();
    if (b.dataset.j === 'hero') showScreen('select');
    if (b.dataset.j === 'reset') {
      if (b.dataset.armed) {
        save.reset();
        location.reload();
      } else {
        b.dataset.armed = '1';
        b.textContent = '⚠️ متأكد؟ اضغط مرة أخرى لمسح كل النجوم';
        setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = '🗑️ ابدأ من جديد'; } }, 4000);
      }
    }
  };
}
