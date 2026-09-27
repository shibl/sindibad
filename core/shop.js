// سوق الميناء — the pearl shop. Pearls come from exploring (pearls, chests,
// riddles) and from new stars (+5 each). They buy cosmetics only: nothing
// here makes lessons easier, so progress always comes from learning.

import { shipSVG, hudhudSVG, setStyle, STYLE } from '../art/art.js';
import { save } from './save.js';
import { sfx } from './sound.js';
import { num } from './format.js';

export const CATALOG = [
  { id: 'sail-rose', slot: 'sail', value: '#f6c3d3', name: 'شراع وردي', price: 15, swatch: '#f6c3d3' },
  { id: 'sail-sky', slot: 'sail', value: '#c4e6f7', name: 'شراع سماوي', price: 15, swatch: '#c4e6f7' },
  { id: 'sail-stripes', slot: 'sail', value: 'stripes', name: 'شراع مخطّط', price: 25, swatch: 'repeating-linear-gradient(45deg,#fbf1dc 0 6px,#c7373f 6px 12px)' },
  { id: 'sail-gold', slot: 'sail', value: '#ffe08a', name: 'شراع ذهبي', price: 35, swatch: '#ffe08a' },
  { id: 'flag-green', slot: 'flag', value: '#2f8a5f', name: 'راية خضراء', price: 8, swatch: '#2f8a5f' },
  { id: 'flag-teal', slot: 'flag', value: '#1f9aa0', name: 'راية فيروزية', price: 8, swatch: '#1f9aa0' },
  { id: 'flag-gold', slot: 'flag', value: '#f2c14e', name: 'راية ذهبية', price: 12, swatch: '#f2c14e' },
  { id: 'outfit-teal', slot: 'outfit', value: '#1f9aa0', name: 'لباس فيروزي', price: 20, swatch: '#1f9aa0' },
  { id: 'outfit-purple', slot: 'outfit', value: '#7a4ac2', name: 'لباس بنفسجي', price: 20, swatch: '#7a4ac2' },
  { id: 'outfit-green', slot: 'outfit', value: '#2f8a5f', name: 'لباس أخضر', price: 20, swatch: '#2f8a5f' },
  { id: 'outfit-navy', slot: 'outfit', value: '#2c3e7a', name: 'لباس كُحلي', price: 25, swatch: '#2c3e7a' },
  { id: 'hat-flower', slot: 'hat', value: 'flower', name: 'ياسمينة لهدهد', price: 15, icon: '🌼' },
  { id: 'hat-fez', slot: 'hat', value: 'fez', name: 'طربوش لهدهد', price: 25, icon: '🎩' },
  { id: 'hat-grad', slot: 'hat', value: 'grad', name: 'قبعة التخرّج', price: 35, icon: '🎓' },
  { id: 'hat-crown', slot: 'hat', value: 'crown', name: 'تاج لهدهد', price: 50, icon: '👑' },
];

export const pearls = () => save.get().pearls || 0;
export function addPearls(n) { save.update(s => { s.pearls = (s.pearls || 0) + n; }); }

// Apply the saved look to the art (call at boot and after changes).
export function applyStyle() { setStyle(save.get().style || {}); }

let onChange = () => {};

export function openShop({ changed = () => {} } = {}) {
  onChange = changed;
  const el = document.getElementById('shop');
  draw(el);
  el.hidden = false;
  sfx.tap();
}

function draw(el) {
  const s = save.get();
  const owned = new Set(s.owned || []);
  const style = s.style || {};
  const hero = s.hero || 'sindbad';
  const slots = [['sail', '⛵ الأشرعة'], ['flag', '🚩 الرايات'], ['outfit', '👕 ثياب البطل'], ['hat', '🦜 قبعات هدهد']];
  el.innerHTML = `
    <div class="shop__card" role="dialog" aria-modal="true" aria-labelledby="shop-title">
      <button class="btn btn--round shop__close" data-shop="close" aria-label="إغلاق">✕</button>
      <h3 id="shop-title">🦪 سوق الميناء</h3>
      <p class="shop__purse">معك <b>${num(pearls())}</b> لؤلؤة</p>
      <div class="shop__preview">
        <div class="shop__ship">${shipSVG({ crew: [hero] })}</div>
        <div class="shop__bird">${hudhudSVG()}</div>
      </div>
      ${slots.map(([slot, title]) => `
        <h4>${title}</h4>
        <div class="shop__row">
          <button class="shop__item ${!style[slot] ? 'is-on' : ''}" data-shop="wear" data-slot="${slot}" data-id="">
            <span class="shop__swatch shop__swatch--none">✕</span><small>الأصلي</small>
          </button>
          ${CATALOG.filter(i => i.slot === slot).map(i => {
            const have = owned.has(i.id), on = style[slot] === i.value;
            return `<button class="shop__item ${on ? 'is-on' : ''} ${!have && pearls() < i.price ? 'is-poor' : ''}" data-shop="${have ? 'wear' : 'buy'}" data-slot="${slot}" data-id="${i.id}">
              <span class="shop__swatch" style="background:${i.swatch || '#fff'}">${i.icon || ''}</span>
              <small>${i.name}</small>
              <em>${have ? (on ? '✔ مُرتدى' : 'ارتدِ') : `🦪 ${num(i.price)}`}</em>
            </button>`;
          }).join('')}
        </div>`).join('')}
      <p class="shop__note">اجمع اللآلئ من الجزر والصناديق والألغاز، ونل ٥ لآلئ عن كل نجمة جديدة.</p>
    </div>`;
  el.onclick = e => {
    if (e.target === el) { close(el); return; }
    const b = e.target.closest('[data-shop]');
    if (!b) return;
    const act = b.dataset.shop;
    if (act === 'close') { close(el); return; }
    const item = CATALOG.find(i => i.id === b.dataset.id);
    if (act === 'buy') {
      if (pearls() < item.price) { sfx.bad(); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); return; }
      save.update(v => { v.pearls -= item.price; v.owned = [...(v.owned || []), item.id]; });
      sfx.win();
    } else sfx.tap();
    save.update(v => { v.style = { ...(v.style || {}), [b.dataset.slot]: item ? item.value : null }; });
    applyStyle();
    onChange();
    draw(el);
  };
}

function close(el) { el.hidden = true; sfx.tap(); onChange(); }
