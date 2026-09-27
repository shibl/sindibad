// سوق الميناء — the pearl shop. Pearls come from exploring (pearls, chests,
// riddles) and from new stars (+5 each). They buy cosmetics only: nothing
// here makes lessons easier, so progress always comes from learning.

import { shipSVG, hudhudSVG, heroSVG, setStyle, STYLE } from '../art/art.js';
import { burst } from '../plugins/engines/kit.js';
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
let tab = 'sail';
let trying = null;   // an item being tried on (not bought yet)

const TABS = [['sail', '⛵', 'الأشرعة'], ['flag', '🚩', 'الرايات'], ['outfit', '👕', 'الثياب'], ['hat', '🦜', 'هدهد']];
const rarity = price => price >= 50 ? ['legend', 'أسطوري'] : price >= 35 ? ['epic', 'نادر جداً'] : price >= 20 ? ['rare', 'نادر'] : ['common', 'عادي'];

export function openShop({ changed = () => {} } = {}) {
  onChange = changed;
  trying = null;
  const el = document.getElementById('shop');
  draw(el);
  el.hidden = false;
  sfx.tap();
}

// The look to show: the saved style plus whatever is being tried on.
function previewStyle() {
  const style = { ...(save.get().style || {}) };
  if (trying) style[trying.slot] = trying.value;
  return style;
}

function preview(hero) {
  setStyle(previewStyle());
  const html = tab === 'outfit' ? `<div class="shop__hero">${heroSVG(hero)}</div>`
    : tab === 'hat' ? `<div class="shop__bird shop__bird--big">${hudhudSVG()}</div>`
    : `<div class="shop__ship">${shipSVG({ crew: [hero] })}</div>`;
  applyStyle(); // the rest of the game keeps the saved look
  return html;
}

function draw(el) {
  const s = save.get();
  const owned = new Set(s.owned || []);
  const style = s.style || {};
  const hero = s.hero || 'sindbad';
  const items = CATALOG.filter(i => i.slot === tab);
  el.innerHTML = `
    <div class="shop__card" role="dialog" aria-modal="true" aria-labelledby="shop-title">
      <header class="shop__head">
        <h3 id="shop-title">🦪 سوق الميناء</h3>
        <span class="shop__purse">🦪 <b>${num(pearls())}</b></span>
        <button class="btn btn--round shop__close" data-shop="close" aria-label="إغلاق">✕</button>
      </header>
      <div class="shop__stage">${preview(hero)}${trying ? '<span class="shop__trying">تجربة 👀</span>' : ''}</div>
      <nav class="shop__tabs" role="tablist">
        ${TABS.map(([id, icon, name]) => `<button role="tab" aria-selected="${id === tab}" class="shop__tab ${id === tab ? 'is-on' : ''}" data-shop="tab" data-tab="${id}"><span>${icon}</span>${name}</button>`).join('')}
      </nav>
      <div class="shop__grid">
        <button class="shop__item ${!style[tab] && !trying ? 'is-on' : ''}" data-shop="wear" data-slot="${tab}" data-id="">
          <span class="shop__swatch shop__swatch--none">↺</span><small>الأصلي</small><em>${!style[tab] ? '✔' : 'ارتدِ'}</em>
        </button>
        ${items.map(i => {
          const have = owned.has(i.id), on = style[tab] === i.value, [rk, rn] = rarity(i.price);
          const tried = trying?.id === i.id;
          return `<button class="shop__item shop__item--${rk} ${on ? 'is-on' : ''} ${tried ? 'is-trying' : ''} ${!have && pearls() < i.price ? 'is-poor' : ''}" data-shop="${have ? 'wear' : 'try'}" data-slot="${tab}" data-id="${i.id}">
            ${have ? '' : `<i class="shop__rarity">${rn}</i>`}
            <span class="shop__swatch" style="background:${i.swatch || '#fff'}">${i.icon || ''}</span>
            <small>${i.name}</small>
            <em>${have ? (on ? '✔ مُرتدى' : 'ارتدِ') : `🦪 ${num(i.price)}`}</em>
          </button>`;
        }).join('')}
      </div>
      <footer class="shop__foot">
        ${trying ? (pearls() >= trying.price
          ? `<button class="btn btn--gold shop__buy" data-shop="buy" data-id="${trying.id}">اشترِ «${trying.name}» بـ 🦪 ${num(trying.price)}</button>`
          : `<p class="shop__need">تحتاج ${num(trying.price - pearls())} لؤلؤة أخرى 🦪 — اجمعها من الجزر!</p>`)
          : '<p class="shop__note">اضغط على أي شيء لتجرّبه قبل أن تشتريه. اجمع اللآلئ من الجزر، و٥ لآلئ عن كل نجمة جديدة.</p>'}
      </footer>
    </div>`;
  el.onclick = e => {
    if (e.target === el) { close(el); return; }
    const b = e.target.closest('[data-shop]');
    if (!b) return;
    const act = b.dataset.shop;
    if (act === 'close') { close(el); return; }
    if (act === 'tab') { sfx.tap(); tab = b.dataset.tab; trying = null; draw(el); return; }
    const item = CATALOG.find(i => i.id === b.dataset.id);
    if (act === 'try') { sfx.tap(); trying = trying?.id === item.id ? null : item; draw(el); return; }
    if (act === 'buy') {
      if (pearls() < item.price) { sfx.bad(); return; }
      save.update(v => { v.pearls -= item.price; v.owned = [...(v.owned || []), item.id]; v.style = { ...(v.style || {}), [item.slot]: item.value }; });
      trying = null;
      sfx.win();
      applyStyle(); onChange(); draw(el);
      const stage = el.querySelector('.shop__stage');
      stage.classList.add('is-bought');
      burst(stage, '');
      return;
    }
    sfx.tap();
    trying = null;
    save.update(v => { v.style = { ...(v.style || {}), [b.dataset.slot]: item ? item.value : null }; });
    applyStyle();
    onChange();
    draw(el);
  };
}

function close(el) { el.hidden = true; trying = null; applyStyle(); sfx.tap(); onChange(); }
