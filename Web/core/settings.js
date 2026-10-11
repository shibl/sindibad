// Settings (⚙️ on the map): sound effects, music, large text and calm mode.
// Saved per child. Calm mode (also on when the device asks for reduced
// motion) turns off screen shake, iris wipes and parallax.

import { save } from './save.js';
import { sfx } from './sound.js';
import { refreshMusicVolume } from './music.js';
import { refreshAmbience } from './ambience.js';

const OPTIONS = [
  ['muted', '🔊', 'المؤثّرات الصوتية', true],   // stored inverted: muted = off
  ['musicOff', '🎵', 'الموسيقى', true],
  ['bigText', '🔠', 'خطّ كبير', false],
  ['calm', '🐢', 'وضع هادئ (حركة أقل)', false],
];

export function applySettings() {
  const s = save.get();
  document.body.classList.toggle('big-text', !!s.bigText);
  document.body.classList.toggle('calm', !!s.calm || matchMedia('(prefers-reduced-motion: reduce)').matches);
  refreshMusicVolume();
  refreshAmbience();
}

export function openSettings() {
  const el = document.createElement('div');
  el.className = 'settings';
  const draw = () => {
    const s = save.get();
    el.innerHTML = `
      <div class="settings__card" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header><h3 id="settings-title">⚙️ الإعدادات</h3><button class="btn btn--round" data-close aria-label="إغلاق">✕</button></header>
        ${OPTIONS.map(([key, icon, label, inverted]) => {
          const on = inverted ? !s[key] : !!s[key];
          return `<button class="switch-row" role="switch" aria-checked="${on}" data-key="${key}" data-inv="${inverted ? 1 : ''}">
            <span class="switch-row__icon">${icon}</span><b>${label}</b><span class="switch ${on ? 'is-on' : ''}"><i></i></span>
          </button>`;
        }).join('')}
        <p class="settings__note">تُحفظ الإعدادات لكل طفل على هذا الجهاز.</p>
      </div>`;
  };
  draw();
  document.body.append(el);
  el.onclick = e => {
    if (e.target === el || e.target.closest('[data-close]')) { el.remove(); sfx.tap(); return; }
    const row = e.target.closest('[data-key]');
    if (!row) return;
    save.update(s => { s[row.dataset.key] = !s[row.dataset.key]; });
    applySettings();
    sfx.tap();
    draw();
  };
}
