// Made from settings.ts by tools/build.ts. Edit that file, then run: npm run build
// Settings (⚙️ on the map): sound effects, music, vibration, large text and
// calm mode. Saved per child. Calm mode (also on when the device asks for
// reduced motion) turns off screen shake, iris wipes and parallax.
import { save } from './save.js';
import { sfx } from './sound.js';
import { buzz, hapticsAvailable } from './haptics.js';
import { refreshMusicVolume } from './music.js';
import { refreshAmbience } from './ambience.js';
const OPTIONS = [
    ['muted', '🔊', 'المؤثّرات الصوتية', true],
    ['musicOff', '🎵', 'الموسيقى', true],
    ['noVibrate', '📳', 'الاهتزاز', true],
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
    // Phones and tablets without vibration don't show its switch.
    const options = OPTIONS.filter(([key]) => key !== 'noVibrate' || hapticsAvailable());
    const draw = () => {
        const s = save.get();
        el.innerHTML = `
      <div class="settings__card" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header><h3 id="settings-title">⚙️ الإعدادات</h3><button class="btn btn--round" data-close aria-label="إغلاق">✕</button></header>
        ${options.map(([key, icon, label, inverted]) => {
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
        const t = e.target;
        if (t === el || t.closest('[data-close]')) {
            el.remove();
            sfx.tap();
            return;
        }
        const row = t.closest('[data-key]');
        if (!row)
            return;
        const key = row.dataset.key;
        save.update((v) => { v[key] = !v[key]; });
        applySettings();
        sfx.tap();
        // Turning vibration on: feel it straight away.
        if (key === 'noVibrate' && !save.get().noVibrate)
            buzz('success');
        draw();
    };
}
