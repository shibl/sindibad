// The world map: islands (one per subject), fog over locked ones, a dotted
// sea route, and the ship that sails the chosen hero between islands.
// Tapping an unlocked island sails there and opens its panel of topics.

import { islandSVG, shipSVG, compassSVG, whaleSVG, cloudSVG, hudhudSVG } from '../art/art.js';
import { save } from './save.js';
import { topicsIn } from './topics.js';
import { sfx } from './sound.js';
import { num } from './format.js';

let world;          // the current grade world (worlds/grade6.js)
let el;             // the .map element
let onOpenTopic;    // callback(topicId)
let layout = null;  // { w, h, size, points: {id: {x, y}} }
let sailing = false;

export function initMap(mapEl, worldDef, { openTopic }) {
  el = mapEl;
  world = worldDef;
  onOpenTopic = openTopic;
  new ResizeObserver(() => { if (el.offsetParent) render(); }).observe(el);
  el.addEventListener('click', onClick);
  document.getElementById('sheet').addEventListener('click', e => {
    if (e.target.id === 'sheet' || e.target.closest('[data-close]')) closeSheet();
    const t = e.target.closest('[data-topic]');
    if (t) { sfx.tap(); closeSheet(); onOpenTopic(t.dataset.topic); }
  });
}

// ---------- Progress helpers ----------

export function regionStars(regionId) {
  const list = topicsIn(regionId);
  const topics = save.get().topics;
  const stars = list.reduce((s, t) => s + (topics[t.id]?.stars || 0), 0);
  return { stars, max: list.length * 3 };
}

export function isUnlocked(region) {
  if (!region.unlock) return true;
  return regionStars(region.unlock.region).stars >= region.unlock.stars;
}

export function totalStars() {
  return world.regions.reduce((a, r) => {
    const s = regionStars(r.id);
    return { stars: a.stars + s.stars, max: a.max + s.max };
  }, { stars: 0, max: 0 });
}

const starRow = (n, max = 3) => '★'.repeat(n) + '☆'.repeat(Math.max(0, max - n));

// ---------- Layout ----------

function computeLayout() {
  const w = el.clientWidth, h = el.clientHeight;
  const portrait = h >= w * 0.9;
  const size = Math.min(portrait ? w * 0.38 : w * 0.2, portrait ? h * 0.2 : h * 0.34, 240);
  const padX = size * 0.55, padY = size * 0.5;
  const place = ([px, py]) => {
    // Portrait uses the authored positions; landscape turns the map so the
    // voyage runs right → left (RTL reading order).
    const [x, y] = portrait ? [px, py] : [py, px];
    return { x: padX + (x / 100) * (w - 2 * padX), y: padY + (y / 100) * (h - 2 * padY) };
  };
  const points = { home: place(world.home.pos) };
  world.regions.forEach(r => { points[r.id] = place(r.pos); });
  return { w, h, size, portrait, points };
}

// Where the ship anchors next to an island.
function berth(id) {
  const p = layout.points[id];
  // Moor on the open-sea side of the island so the ship doesn't hide its label.
  const side = p.x > layout.w / 2 ? -1 : 1;
  return { x: p.x + side * layout.size * 0.5, y: p.y + layout.size * 0.2 };
}

// ---------- Render ----------

export function render() {
  layout = computeLayout();
  const { w, h, size, points } = layout;
  const s = save.get();
  const here = s.at && points[s.at] ? s.at : 'home';

  const stops = ['home', ...world.regions.map(r => r.id)];
  const routes = stops.slice(1).map((id, i) => {
    const a = points[stops[i]], b = points[id];
    const mx = (a.x + b.x) / 2 + (b.y - a.y) * 0.18, my = (a.y + b.y) / 2 - (b.x - a.x) * 0.18;
    const open = isUnlocked(world.regions[i]);
    return `<path d="M${a.x} ${a.y} Q${mx} ${my} ${b.x} ${b.y}" class="route ${open ? 'route--open' : ''}"/>`;
  }).join('');

  const isle = (r, kind, name, extra = '') => {
    const p = points[r.id];
    return `
    <button class="isle ${extra}" data-region="${r.id}"
            style="left:${p.x}px;top:${p.y}px;width:${size}px">
      <span class="isle__art">${islandSVG(kind)}</span>
      <span class="isle__label">${name}</span>
    </button>`;
  };

  const newlyRevealed = [];
  const islands = world.regions.map(r => {
    const open = isUnlocked(r);
    if (open && r.unlock && !(s.revealed || []).includes(r.id)) newlyRevealed.push(r.id);
    const { stars, max } = regionStars(r.id);
    const label = `<b>${r.name}</b>${open ? `<span class="isle__stars">${starRow(Math.round((stars / (max || 1)) * 3))}</span>` : ''}`;
    const fog = open && !newlyRevealed.includes(r.id) ? '' : `
      <span class="fog" aria-hidden="true">
        ${cloudSVG()}${cloudSVG()}${cloudSVG()}
        <span class="fog__lock">🔒</span>
      </span>`;
    return isle(r, r.art, label, open ? '' : 'isle--locked').replace('</button>', `${fog}</button>`);
  }).join('');

  el.innerHTML = `
    <div class="map__sea"></div>
    <svg class="map__routes" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">${routes}</svg>
    <div class="map__whale" style="left:${layout.portrait ? w * 0.72 : w * 0.5}px;top:${layout.portrait ? h * 0.8 : h * 0.78}px">${whaleSVG()}</div>
    <div class="map__compass">${compassSVG()}</div>
    ${isle({ id: 'home' }, world.home.art, `<b>${world.home.name}</b>`, 'isle--home')}
    ${islands}
    <div class="map__ship" style="width:${size * 0.62}px">
      <div class="ship__flip"><div class="ship__bob">${shipSVG({ crew: [s.hero || 'sindbad'] })}</div></div>
    </div>
`;
  placeShip(berth(here));
  updateStarsBadge();

  if (newlyRevealed.length) revealIslands(newlyRevealed);
  else if (!s.greeted) {
    save.update(v => { v.greeted = true; });
    toast(`مرحباً يا <b>${heroName()}</b>! هذه خريطة بحر الصف السادس. الضباب يخفي الجزر… ابدأ بـ<b>جزيرة الحروف</b>!`, 7000);
  }
}

function heroName() { return save.get().hero === 'yasmina' ? 'ياسمينة' : 'سندباد'; }

function updateStarsBadge() {
  const { stars, max } = totalStars();
  const badge = document.getElementById('stars-total');
  if (badge) badge.textContent = `${num(stars)} / ${num(max)}`;
}

// Lift the fog from newly unlocked islands, one after another.
function revealIslands(ids) {
  ids.forEach((id, i) => {
    setTimeout(() => {
      const isleEl = el.querySelector(`.isle[data-region="${id}"]`);
      const fog = isleEl?.querySelector('.fog');
      if (!fog) return;
      sfx.reveal();
      fog.classList.add('fog--lifting');
      isleEl.classList.add('isle--revealed');
      fog.addEventListener('animationend', () => fog.remove(), { once: true });
      const r = world.regions.find(x => x.id === id);
      toast(`انقشع الضباب! ظهرت <b>${r.name}</b> — جزيرة ${r.subject}. هيّا نُبحر إليها!`, 6000);
      save.update(v => { v.revealed = [...new Set([...(v.revealed || []), id])]; });
    }, 700 + i * 1600);
  });
}

// ---------- Ship ----------

function placeShip({ x, y }) {
  const ship = el.querySelector('.map__ship');
  ship.style.transform = `translate(${x}px, ${y}px) translate(-50%, -78%)`;
}

function sailTo(id, then) {
  const s = save.get();
  const fromId = s.at && layout.points[s.at] ? s.at : 'home';
  if (fromId === id) { then(); return; }
  const a = berth(fromId), b = berth(id);
  const ship = el.querySelector('.map__ship');
  const flip = ship.querySelector('.ship__flip');
  flip.classList.toggle('is-east', b.x > a.x); // art faces west; mirror when heading east
  const cx = (a.x + b.x) / 2 + (b.y - a.y) * 0.18, cy = (a.y + b.y) / 2 - (b.x - a.x) * 0.18;
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const duration = Math.min(2600, 700 + dist * 2.2);
  const t0 = performance.now();
  sailing = true;
  ship.classList.add('is-sailing');
  sfx.sail();
  const ease = t => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  function frame(now) {
    const t = ease(Math.min(1, (now - t0) / duration));
    const x = (1 - t) ** 2 * a.x + 2 * (1 - t) * t * cx + t * t * b.x;
    const y = (1 - t) ** 2 * a.y + 2 * (1 - t) * t * cy + t * t * b.y;
    placeShip({ x, y });
    if (t < 1) requestAnimationFrame(frame);
    else {
      sailing = false;
      ship.classList.remove('is-sailing');
      save.update(v => { v.at = id; });
      then();
    }
  }
  requestAnimationFrame(frame);
}

// ---------- Interaction ----------

function onClick(e) {
  const btn = e.target.closest('.isle');
  if (!btn || sailing) return;
  const id = btn.dataset.region;
  if (id === 'home') {
    sfx.tap();
    sailTo('home', () => toast(`هنا ميناء أرواد، بيتنا. الجزر تنتظرك يا <b>${heroName()}</b>!`));
    return;
  }
  const region = world.regions.find(r => r.id === id);
  if (!isUnlocked(region)) {
    sfx.bad();
    btn.classList.remove('isle--nope'); void btn.offsetWidth; btn.classList.add('isle--nope');
    const req = world.regions.find(r => r.id === region.unlock.region);
    const { stars } = regionStars(req.id);
    toast(`الضباب كثيف هنا! اجمع <b>${num(region.unlock.stars)}</b> نجوم في <b>${req.name}</b> ليتبدّد. معك الآن ${num(stars)}.`);
    return;
  }
  sfx.tap();
  sailTo(id, () => openSheet(region));
}

let toastTimer;
export function toast(html, ms = 5000) {
  const t = document.getElementById('map-toast');
  if (!t.querySelector('.hudhud')) t.querySelector('.guide__bird').innerHTML = hudhudSVG();
  t.querySelector('.bubble').innerHTML = html;
  t.hidden = false;
  t.classList.remove('is-in'); void t.offsetWidth; t.classList.add('is-in');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}

// ---------- Island panel ----------

function openSheet(region) {
  const sheet = document.getElementById('sheet');
  const topics = topicsIn(region.id);
  const saved = save.get().topics;
  const { stars, max } = regionStars(region.id);
  sheet.innerHTML = `
    <div class="sheet__card" role="dialog" aria-modal="true" aria-labelledby="sheet-title" style="--region:${region.color}">
      <button class="btn btn--round sheet__close" data-close aria-label="إغلاق">✕</button>
      <header class="sheet__head">
        <div class="sheet__isle">${islandSVG(region.art)}</div>
        <div>
          <h3 id="sheet-title">${region.name}</h3>
          <p class="sheet__subject">${region.subject} • <span class="stars-inline">★ ${num(stars)} / ${num(max)}</span></p>
        </div>
      </header>
      <div class="guide guide--sheet">
        <div class="guide__bird">${hudhudSVG()}</div>
        <p class="bubble">${region.intro}</p>
      </div>
      <ul class="topic-list">
        ${topics.map((t, i) => {
          const st = saved[t.id]?.stars || 0;
          return `<li style="--i:${i}">
            <button class="topic-card" data-topic="${t.id}">
              <span class="topic-card__icon">${t.icon}</span>
              <span class="topic-card__text"><b>${t.title}</b><small>${t.blurb}</small></span>
              <span class="topic-card__stars" aria-label="${num(st)} من ٣ نجوم">${starRow(st)}</span>
            </button>
          </li>`;
        }).join('') || '<li class="topic-list__empty">الدروس في الطريق…</li>'}
      </ul>
    </div>`;
  sheet.hidden = false;
  requestAnimationFrame(() => sheet.classList.add('is-open'));
  sheet.querySelector('.topic-card')?.focus({ preventScroll: true });
}

export function closeSheet() {
  const sheet = document.getElementById('sheet');
  sheet.classList.remove('is-open');
  setTimeout(() => { sheet.hidden = true; }, 250);
}
