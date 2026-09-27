// The world map: islands (one per subject), fog over locked ones, a dotted
// sea route, and the ship that sails the chosen hero between islands.
// Tapping an unlocked island sails there and opens its panel of topics.

import { islandSVG, shipSVG, compassSVG, whaleSVG, cloudSVG, hudhudSVG, medalSVG, g } from '../art/art.js';
import { save } from './save.js';
import { topicsIn, getTopic } from './topics.js';
import { sfx } from './sound.js';
import { num } from './format.js';
import { showFinale } from './finale.js';

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

// null (not yet) | 'silver' (every topic has a star) | 'gold' (all three stars).
export function badgeState(regionId) {
  const list = topicsIn(regionId);
  if (!list.length) return null;
  const topics = save.get().topics;
  const stars = list.map(t => topics[t.id]?.stars || 0);
  if (stars.every(n => n >= 3)) return 'gold';
  if (stars.every(n => n >= 1)) return 'silver';
  return null;
}

// Topics whose spaced-review date has come (only ones already played).
export function dueReviews(now = Date.now()) {
  const s = save.get();
  return Object.entries(s.review || {})
    .filter(([id, r]) => r.due <= now && getTopic(id))
    .sort((a, b) => a[1].due - b[1].due)
    .map(([id]) => getTopic(id));
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
  const half = layout.size * 0.33;
  const x = Math.max(half, Math.min(layout.w - half, p.x + side * layout.size * 0.72));
  return { x, y: p.y + layout.size * 0.12 };
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

  const isle = (r, kind, name, extra = '', aria = '') => {
    const p = points[r.id];
    return `
    <button class="isle ${extra}" data-region="${r.id}" aria-label="${aria}"
            style="left:${p.x}px;top:${p.y}px;width:${size}px">
      <span class="isle__art">${islandSVG(kind)}</span>
      <span class="isle__label">${name}</span>
    </button>`;
  };

  const due = new Set(dueReviews().map(t => t.region));
  const islands = world.regions.map(r => {
    const open = isUnlocked(r);
    const pending = open && pendingReveal(r);
    const { stars, max } = regionStars(r.id);
    const badge = badgeState(r.id);
    const label = `<b>${r.name}</b>${open ? `<span class="isle__stars">${starRow(Math.round((stars / (max || 1)) * 3))}</span>` : ''}`
      + (badge && !pending ? `<span class="isle__badge isle__badge--${badge}" title="${r.badge.name}">${r.badge.icon}</span>` : '')
      + (open && !pending && due.has(r.id) ? '<span class="isle__review" title="حان وقت المراجعة">🔁</span>' : '');
    const fog = open && !pending ? '' : `
      <span class="fog" aria-hidden="true">
        ${cloudSVG()}${cloudSVG()}${cloudSVG()}
        <span class="fog__lock">🔒</span>
      </span>`;
    const aria = open && !pending
      ? `${r.name}، ${r.subject}، ${num(stars)} من ${num(max)} نجوم${badge ? `، شارة ${r.badge.name}` : ''}`
      : `${r.name}، يغطيها الضباب`;
    return isle(r, r.art, label, open ? '' : 'isle--locked', aria).replace('</button>', `${fog}</button>`);
  }).join('');

  el.innerHTML = `
    <div class="map__sea"></div>
    <svg class="map__routes" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">${routes}</svg>
    <div class="map__whale" style="left:${layout.portrait ? w * 0.72 : w * 0.5}px;top:${layout.portrait ? h * 0.8 : h * 0.78}px">${whaleSVG()}</div>
    <div class="map__compass">${compassSVG()}</div>
    ${[[18, 30], [80, 44], [44, 60], [62, 12], [12, 84], [88, 76]].map(([x, y], i) =>
      `<i class="sparkle" style="left:${x}%;top:${y}%;animation-delay:${-i * 0.7}s"></i>`).join('')}
    <div class="map__fish" style="left:${layout.portrait ? 16 : 30}%;top:${layout.portrait ? 52 : 70}%"><span>🐟</span></div>
    <div class="map__fish map__fish--2" style="left:${layout.portrait ? 82 : 64}%;top:${layout.portrait ? 34 : 24}%"><span>🐠</span></div>
    <div class="map__gulls">${'<svg viewBox="0 0 24 12"><path d="M1 8 Q6 1 12 8 Q18 1 23 8" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>'.repeat(3)}</div>
    ${isle({ id: 'home' }, world.home.art, `<b>${world.home.name}</b>`, 'isle--home', world.home.name)}
    ${islands}
    <div class="map__ship" style="width:${size * 0.62}px">
      <div class="ship__wake"><i></i><i></i><i></i></div>
      <div class="ship__flip"><div class="ship__bob">${shipSVG({ crew: [s.hero || 'sindbad'] })}</div></div>
    </div>
`;
  placeShip(berth(here));
  updateStarsBadge();
}

const pendingReveal = r => r.unlock && isUnlocked(r) && !(save.get().revealed || []).includes(r.id);
const wait = ms => new Promise(res => setTimeout(res, ms));
let reviewNagged = false;

// Show the map and play whatever happened since last time, in order:
// stars just earned → fog lifting → new badges → review reminder / greeting.
// `after` = { topicId, stars } when returning from a lesson.
export async function enter(after) {
  render();
  const s = save.get();
  let spoke = false;
  if (after && after.gained > 0) {
    await wait(350);
    flyStars(after.topic.region, after.gained);
    toast(`حصلت على ${'★'.repeat(after.gained)} ${after.gained === 1 ? 'نجمة جديدة' : 'نجوم جديدة'} في «${after.topic.title}»!`, 4200);
    spoke = true;
    await wait(1600);
  }
  const reveals = world.regions.filter(pendingReveal);
  for (const r of reveals) { await revealIsland(r); spoke = true; await wait(1700); }
  const earned = world.regions.filter(r => {
    const b = badgeState(r.id);
    return b && (s.badges || {})[r.id] !== b;
  });
  for (const r of earned) { await showBadge(r, badgeState(r.id)); spoke = true; }
  // Grade complete: the treasure island has at least one star.
  const last = world.regions[world.regions.length - 1];
  if (!s.finale && regionStars(last.id).stars > 0) { await showFinale(totalStars()); render(); return; }
  if (spoke) return;
  if (!s.greeted) {
    save.update(v => { v.greeted = true; });
    await wait(500);
    toast(`مرحباً يا <b>${heroName()}</b>! هذه خريطة بحر الصف السادس. الضباب يخفي الجزر… ابدأ بـ<b>جزيرة الحروف</b>!`, 7000);
    return;
  }
  const due = dueReviews();
  if (due.length && !reviewNagged) {
    reviewNagged = true;
    await wait(600);
    toast(`🔁 حان وقت مراجعة «<b>${due[0].title}</b>». المراجعة بعد أيام تثبّت ما تعلّمته في الذاكرة!`, 6000);
  }
}

function heroName() { return save.get().hero === 'yasmina' ? 'ياسمينة' : 'سندباد'; }

function updateStarsBadge() {
  const { stars, max } = totalStars();
  const badge = document.getElementById('stars-total');
  if (badge) badge.textContent = `${num(stars)} / ${num(max)}`;
}

// Lift the fog from a newly unlocked island.
async function revealIsland(r) {
  await wait(500);
  save.update(v => { v.revealed = [...new Set([...(v.revealed || []), r.id])]; });
  const isleEl = el.querySelector(`.isle[data-region="${r.id}"]`);
  const fog = isleEl?.querySelector('.fog');
  if (!fog) return;
  sfx.reveal();
  fog.classList.add('fog--lifting');
  isleEl.classList.remove('isle--locked');
  isleEl.classList.add('isle--revealed');
  fog.addEventListener('animationend', () => { fog.remove(); render(); }, { once: true });
  toast(`انقشع الضباب! ظهرت <b>${r.name}</b> — جزيرة ${r.subject}. هيّا نُبحر إليها!`, 6000);
}

// Little stars shoot from the island up to the stars counter.
function flyStars(regionId, n) {
  const from = el.querySelector(`.isle[data-region="${regionId}"]`)?.getBoundingClientRect();
  const to = document.querySelector('.stars-badge')?.getBoundingClientRect();
  if (!from || !to) return;
  for (let i = 0; i < n; i++) {
    const star = document.createElement('span');
    star.className = 'fly-star';
    star.textContent = '★';
    star.style.left = `${from.left + from.width / 2}px`;
    star.style.top = `${from.top + from.height / 3}px`;
    star.style.setProperty('--tx', `${to.left + to.width / 2 - (from.left + from.width / 2)}px`);
    star.style.setProperty('--ty', `${to.top + to.height / 2 - (from.top + from.height / 3)}px`);
    star.style.animationDelay = `${i * 0.18}s`;
    document.body.append(star);
    setTimeout(() => sfx.star(i), 700 + i * 180);
    star.addEventListener('animationend', () => {
      star.remove();
      const b = document.querySelector('.stars-badge');
      b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
    });
  }
}

// Award an island badge with a full-screen moment.
function showBadge(region, state) {
  return new Promise(resolve => {
    save.update(v => { v.badges = { ...(v.badges || {}), [region.id]: state }; });
    const modal = document.getElementById('badge-modal');
    const gold = state === 'gold';
    modal.innerHTML = `
      <div class="badge-modal__rays"></div>
      <div class="badge-modal__card" role="dialog" aria-modal="true" aria-labelledby="badge-title">
        <div class="badge-modal__medal">${medalSVG(region.badge.icon, { gold, color: region.color })}</div>
        <p class="badge-modal__kicker">${gold ? 'شارة ذهبية!' : 'شارة جديدة!'}</p>
        <h3 id="badge-title">${region.badge.name}</h3>
        <p>${gold
          ? `أتقنت كل دروس ${region.name} بثلاث نجوم. أنت ${g(save.get().hero, 'بحّار أسطوري', 'بحّارة أسطورية')} يا ${heroName()}!`
          : `أنهيت كل دروس ${region.name}. اجمع ثلاث نجوم في كل درس لتصبح الشارة ذهبية!`}</p>
        <button class="btn btn--gold" data-close-badge>رائع!</button>
      </div>`;
    modal.hidden = false;
    sfx.win();
    const btn = modal.querySelector('[data-close-badge]');
    btn.focus({ preventScroll: true });
    btn.addEventListener('click', () => { sfx.tap(); modal.hidden = true; render(); resolve(); }, { once: true });
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
  const due = new Set(dueReviews().map(t => t.id));
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
              <span class="topic-card__text"><b>${t.title}</b><small>${t.blurb}</small>${due.has(t.id) ? '<em class="tag-review">🔁 وقت المراجعة</em>' : ''}</span>
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
