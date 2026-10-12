// The grade finale: opening the treasure chest, fireworks, and a
// certificate with the hero's name. Shown once when the treasure island is
// first completed; the certificate can be reopened from "رحلتي".

import { chestSVG, heroSVG, hudhudSVG, HEROES, g } from '../art/art.js';
import { save, activeProfile } from './save.js';
import { sfx } from './sound.js';
import { num } from './format.js';

function el() {
  let f = document.getElementById('finale');
  if (!f) {
    f = document.createElement('div');
    f.id = 'finale';
    f.className = 'finale';
    document.getElementById('app').append(f);
  }
  return f;
}

function fireworks(n = 7) {
  const colors = ['#f2c14e', '#d0507e', '#1f9aa0', '#8fe07a', '#fff'];
  return Array.from({ length: n }, (_, i) => `
    <div class="burst" style="left:${10 + ((i * 37) % 80)}%;top:${8 + ((i * 23) % 40)}%;--d:${(i * 0.45).toFixed(2)}s;--c:${colors[i % colors.length]}">
      ${Array.from({ length: 12 }, (_, k) => `<i style="--a:${k * 30}deg"></i>`).join('')}
    </div>`).join('');
}

export function certificateHTML({ stars, max }) {
  const s = save.get();
  const hero = s.hero || 'sindbad';
  const date = new Date(s.finale?.at || Date.now()).toLocaleDateString('ar-SY', { year: 'numeric', month: 'long', day: 'numeric' });
  return `
    <div class="cert" role="document">
      <div class="cert__inner">
        <p class="cert__kicker">⚓ رحلات سندباد وياسمينة ⚓</p>
        <h3 class="cert__title">شهادة ${g(hero, 'بحّار', 'بحّارة')} الصف السادس</h3>
        <div class="cert__row">
          <div class="cert__hero">${heroSVG(hero)}</div>
          <div class="cert__text">
            <p>تشهد هيئة البحّارة بأنّ</p>
            <p class="cert__name">${activeProfile()?.name || HEROES[hero].name}</p>
            <p>${g(hero,
              'قد أبحر في بحر الصف السادس، وفكّ شيفرات الحروف، واهتدى بمنارة الأرقام، واكتشف أسرار العلوم، وعرف معالم بلاده، ففتح صندوق الكنز.',
              'قد أبحرت في بحر الصف السادس، وفكّت شيفرات الحروف، واهتدت بمنارة الأرقام، واكتشفت أسرار العلوم، وعرفت معالم بلادها، ففتحت صندوق الكنز.')}</p>
          </div>
        </div>
        <p class="cert__stars">★ ${num(stars)} من ${num(max)} نجمة</p>
        <div class="cert__sign">
          <span>${date}</span>
          <span class="cert__bird">${hudhudSVG()}<small>هُدهُد، دليل الرحلة</small></span>
        </div>
      </div>
    </div>`;
}

// Play the full finale. Resolves when the student closes it.
export function showFinale(totals) {
  return new Promise(resolve => {
    save.update(s => { s.finale = { at: Date.now() }; });
    const f = el();
    f.innerHTML = `
      <div class="finale__sky">${fireworks()}</div>
      <div class="finale__stage">
        <p class="finale__line">لقد وجدت الكنز!</p>
        <div class="finale__chest">${chestSVG()}</div>
        <p class="finale__sub">الكنز الحقيقي هو ما تعلّمته في رحلتك ✨</p>
        <button class="btn btn--gold btn--big" data-finale="cert">افتح شهادتي 📜</button>
      </div>`;
    f.hidden = false;
    requestAnimationFrame(() => f.classList.add('is-open'));
    setTimeout(() => sfx.reveal(), 900);
    setTimeout(() => sfx.win(), 1600);
    f.onclick = e => {
      const b = e.target.closest('[data-finale]');
      if (!b) return;
      sfx.tap();
      if (b.dataset.finale === 'cert') showCertificate(totals, resolve);
    };
  });
}

// Just the certificate (from the journey page).
export function showCertificate(totals, onClose = () => {}) {
  const f = el();
  f.innerHTML = `
    <div class="finale__sky">${fireworks(4)}</div>
    <div class="finale__stage finale__stage--cert">
      ${certificateHTML(totals)}
      <button class="btn btn--gold" data-finale="close">العودة إلى البحر ⛵</button>
    </div>`;
  f.hidden = false;
  f.classList.add('is-open');
  f.onclick = e => {
    if (!e.target.closest('[data-finale="close"]')) return;
    sfx.tap();
    f.classList.remove('is-open');
    f.hidden = true;
    onClose();
  };
}
