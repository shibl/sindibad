// The world map: islands (one per subject), fog over locked ones, a dotted
// sea route, and the ship that sails the chosen hero between islands.
// Tapping an unlocked island sails there and opens its panel of topics.
//
// Two ways to draw it: the flat map (SVG, below) and the 3D sea (core/sea/),
// a preview on the staging copy. Both share the island buttons, so labels,
// taps, stars and badges work the same.

import { islandSVG, shipSVG, compassSVG, whaleSVG, cloudSVG, hudhudSVG, medalSVG, g, STYLE, styleKey } from '../art/art.js';
import { streak, todayLessons, DAILY_GOAL } from './lesson.js';
import { save } from './save.js';
import { topicsIn, getTopic } from './topics.js';
import { sfx } from './sound.js';
import { num } from './format.js';
import { showFinale } from './finale.js';
import { awardSticker } from './stickers.js';
import { rankInfo } from './ranks.js';
import { STAGING, storeKey } from './env.js';
import { onLongPress, buzz } from './haptics.js';
import type { GameSave } from './save.js';
import type { Topic } from './topics.js';
import type { LessonReturn } from './lesson.js';
import type { Totals } from './finale.js';
import type { RankInfo } from './ranks.js';
import type { Region, World } from './journey.js';
import type { Sea, SeaDebug, Rect } from './sea/sea.js';

/** The home port on the map (worlds/grade6.js). */
export interface HomePort { id: string; name: string; art: string; pos: number[] }

/** An island as the map reads it (worlds/grade6.js). */
export interface MapRegion extends Region {
  /** Its drawing (art/art.js islandSVG) and its 3D model (core/sea/models.js). */
  art: string;
  /** [x%, y%] on a portrait map. */
  pos: number[];
  intro: string;
  /** Under fog until `region` has `stars` stars in total; null = open from the start. */
  unlock: { region: string; stars: number } | null;
  /** Draw the sea route from this stop instead of the island before it (a side trip). */
  from?: string;
  /** A 3D island's kind ('farm', 'tunes'…). */
  kind?: string;
}

/** A grade's world as the map reads it: the home port and the islands. */
export interface MapWorld extends World { home: HomePort; regions: MapRegion[] }

/** What app.ts gives the map. */
export interface MapHooks {
  /** Start a topic's lesson. */
  openTopic: (topicId: string) => void;
  /** Island id → its walkable data, or true for a 3D island: tapping it goes ashore. */
  islands?: Record<string, unknown>;
  /** Go ashore on an island. */
  enterIsland: (id: string) => void;
}

/** A badge won on an island: every topic has a star (silver), or three (gold). */
export type Badge = 'silver' | 'gold';

/** The save, with the fields only the map keeps: where the ship is, the greeting, the rank. */
type MapSave = GameSave & { at?: string; greeted?: boolean; rankLevel?: number };

interface Point { x: number; y: number }
interface Layout { w: number; h: number; size: number; portrait: boolean; points: Record<string, Point> }

let world: MapWorld;          // the current grade world (worlds/grade6.js)
let el: HTMLElement;             // the .map element
let onOpenTopic: (topicId: string) => void;    // callback(topicId)
let layout: Layout | null = null;  // { w, h, size, points: {id: {x, y}} }
let sailing = false;
let walkable: Record<string, unknown> = {};     // island id → walkable island data (worlds/grade6/*.js)
let onEnterIsland: (id: string) => void;    // callback(id) to go ashore

export function initMap(mapEl: HTMLElement, worldDef: MapWorld, { openTopic, islands = {}, enterIsland }: MapHooks): void {
  el = mapEl;
  world = worldDef;
  onOpenTopic = openTopic;
  walkable = islands;
  onEnterIsland = enterIsland;
  new ResizeObserver(() => { if (el.offsetParent) render(); }).observe(el);
  el.addEventListener('click', onClick);
  // Press and hold an island: Hudhud tells what is there, without sailing.
  onLongPress(el, '.isle', b => peek(b.dataset.region!));
  initViewToggle();
  document.getElementById('sheet')!.addEventListener('click', e => {
    if ((e.target as Element).id === 'sheet' || (e.target as Element).closest('[data-close]')) closeSheet();
    const t = (e.target as Element).closest<HTMLElement>('[data-topic]');
    if (t) { sfx.tap(); closeSheet(); onOpenTopic(t.dataset.topic!); }
  });
}

// ---------- Progress helpers ----------

export function regionStars(regionId: string): Totals {
  const list = topicsIn(regionId);
  const topics = save.get().topics;
  const stars = list.reduce((s, t) => s + (topics[t.id]?.stars || 0), 0);
  return { stars, max: list.length * 3 };
}

// On the staging copy every island is open, so the developers can try any
// of them without earning stars first.
export function isUnlocked(region: MapRegion): boolean {
  if (!region.unlock || STAGING) return true;
  return regionStars(region.unlock.region).stars >= region.unlock.stars;
}

export function totalStars(): Totals {
  return world.regions.reduce((a, r) => {
    const s = regionStars(r.id);
    return { stars: a.stars + s.stars, max: a.max + s.max };
  }, { stars: 0, max: 0 });
}

// null (not yet) | 'silver' (every topic has a star) | 'gold' (all three stars).
export function badgeState(regionId: string): Badge | null {
  const list = topicsIn(regionId);
  if (!list.length) return null;
  const topics = save.get().topics;
  const stars = list.map(t => topics[t.id]?.stars || 0);
  if (stars.every(n => n >= 3)) return 'gold';
  if (stars.every(n => n >= 1)) return 'silver';
  return null;
}

// Topics whose spaced-review date has come (only ones already played).
export function dueReviews(now = Date.now()): Topic[] {
  const s = save.get();
  return Object.entries(s.review || {})
    .filter(([id, r]) => r.due <= now && getTopic(id))
    .sort((a, b) => a[1].due - b[1].due)
    .map(([id]) => getTopic(id)!);
}

const starRow = (n: number, max = 3) => '★'.repeat(n) + '☆'.repeat(Math.max(0, max - n));

// ---------- The 3D sea (a preview on the staging copy) ----------
// Staging shows the sea map in 3D by default, with a button to compare it
// with the flat map; the live game keeps the flat map until the developers
// decide. ?map=3d or ?map=2d picks one on any copy. Phones without WebGL,
// or if the 3D sea fails to load, get the flat map.

const forcedView = new URLSearchParams(location.search).get('map');
let viewChoice = '2d';
let view: Sea | null = null;        // the 3D sea (core/sea/sea.ts), once loaded
let viewLoad: Promise<Sea | null> | null = null;
let viewFailed = false;
let webgl: boolean | undefined;

function hasWebGL() {
  if (webgl === undefined) {
    try {
      // WebGL 1 is enough when index.html loaded the older three.js for it.
      const gl = document.createElement('canvas').getContext(window.__SINDBAD_WEBGL1__ ? 'webgl' : 'webgl2') as WebGLRenderingContext | null;
      webgl = !!gl;
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch { webgl = false; }
  }
  return webgl;
}
const want3D = () => viewChoice === '3d' && !viewFailed && hasWebGL();
const is3D = () => !!view && el.classList.contains('map--3d');

function initViewToggle() {
  let stored = null;
  try { stored = localStorage.getItem(storeKey('mapView')); } catch { /* private mode */ }
  viewChoice = (['2d', '3d'] as (string | null)[]).includes(forcedView) ? forcedView! : STAGING ? stored || '3d' : '2d';
  const btn = document.getElementById('map-view');
  if (!btn || !(STAGING || forcedView)) return;
  btn.hidden = false;
  btn.addEventListener('click', () => {
    if (sailing) return;
    sfx.tap();
    viewChoice = viewChoice === '3d' ? '2d' : '3d';
    try { localStorage.setItem(storeKey('mapView'), viewChoice); } catch { /* private mode */ }
    if (viewChoice === '3d' && !hasWebGL()) toast('هذا الجهاز لا يرسم الأشكال ثلاثية الأبعاد، فبقيت الخريطة المسطّحة.');
    render();
  });
}

function paintToggle() {
  const btn = document.getElementById('map-view');
  if (!btn || btn.hidden) return;
  const on = viewChoice === '3d';
  btn.textContent = on ? '🗺️ 2D' : '🧊 3D';
  btn.setAttribute('aria-label', on ? 'الخريطة المسطّحة' : 'الخريطة ثلاثية الأبعاد');
}

// Load the 3D sea early (app.js calls this after start-up), so it is ready
// when the child reaches the map. three.js comes from the offline copy.
export function preloadMapView(): Promise<Sea | null> {
  if (!want3D()) return Promise.resolve(null);
  return (viewLoad ||= import('./sea/sea.js').then(m => {
    view = m.createSea(world, { lite: document.body.classList.contains('lite') });
    view.onLayout(placeLabels);
    return view;
  }).catch(err => {
    console.warn('The 3D sea failed to load', err);
    viewFailed = true;
    return null;
  }));
}

// Keep each island's button (its hit area and label) over the island.
function placeLabels(rects: Record<string, Rect>) {
  const W = el.clientWidth;
  for (const b of el.querySelectorAll<HTMLElement & { _lw?: number }>('.map__labels .isle')) {
    const r = rects[b.dataset.region!];
    if (!r) continue;
    b.style.left = `${r.x}px`; b.style.top = `${r.y}px`;
    b.style.width = `${r.w}px`; b.style.height = `${r.h}px`;
    // keep the label on screen near the edges
    const label = b.querySelector<HTMLElement>('.isle__label');
    if (!label) continue;
    b._lw ||= label.offsetWidth;
    const cx = r.x + r.w / 2, half = b._lw / 2 + 6;
    label.style.setProperty('--dx', `${Math.max(half - cx, Math.min(0, W - half - cx))}px`);
  }
}

function render3D() {
  const s = save.get() as MapSave;
  if (!el.classList.contains('map--3d') || !el.querySelector('.map3d')) {
    el.classList.add('map--3d');
    el.innerHTML = `<div class="map3d"></div><div class="map__labels"></div><div class="map__compass">${compassSVG()}</div>`;
  }
  view!.mount(el.querySelector<HTMLElement>('.map3d')!);
  const due = new Set(dueReviews().map(t => t.region));
  const next = nextIsland(due);
  el.querySelector('.map__labels')!.innerHTML = isleButton(world.home, 'isle--home', `<b>${world.home.name}</b>`, world.home.name)
    + world.regions.map(r => islandButton(r, due, next)).join('');
  const nextRegion = world.regions.find(r => r.id === next);
  view!.update({
    time: document.body.dataset.time || 'day',
    regions: world.regions.map(r => ({ id: r.id, open: isUnlocked(r), fog: !isUnlocked(r) || pendingReveal(r) })),
    next: nextRegion && !pendingReveal(nextRegion) ? next : null,
    at: s.at || 'home',
    hero: s.hero || 'sindbad',
    styleKey: styleKey(),
    style: { sail: STYLE.sail, flag: STYLE.flag },
  });
  view!.relayout();
  updateStarsBadge();
  paintToggle();
}

// ---------- Layout ----------

// The map fills the screen under the top bar (style.css): how far down from
// the map's top its floating buttons reach. 0 when the map is not shown.
export function mapTopInset(map: HTMLElement): number {
  const b = document.querySelector('.map-voyages')?.getBoundingClientRect();
  return b?.height ? Math.max(0, b.bottom - map.getBoundingClientRect().top) : 0;
}

function computeLayout(): Layout {
  const w = el.clientWidth, h = el.clientHeight;
  const portrait = h >= w * 0.9;
  const size = Math.min(portrait ? w * 0.38 : w * 0.2, portrait ? h * 0.2 : h * 0.34, 240);
  const padX = size * 0.55, padY = size * 0.5;
  // The top bar floats over the sea: islands start below its buttons.
  const top = Math.max(padY, mapTopInset(el) + size * 0.3);
  const place = ([px, py]: number[]): Point => {
    // Portrait uses the authored positions; landscape turns the map so the
    // voyage runs right → left (RTL reading order).
    const [x, y] = portrait ? [px, py] : [py, px];
    return { x: padX + (x / 100) * (w - 2 * padX), y: top + (y / 100) * (h - top - padY) };
  };
  const points: Record<string, Point> = { home: place(world.home.pos) };
  world.regions.forEach(r => { points[r.id] = place(r.pos); });
  return { w, h, size, portrait, points };
}

// Where the ship anchors next to an island.
function berth(id: string): Point {
  const p = layout!.points[id];
  // Moor on the open-sea side of the island so the ship doesn't hide its label.
  const side = p.x > layout!.w / 2 ? -1 : 1;
  const half = layout!.size * 0.33;
  const x = Math.max(half, Math.min(layout!.w - half, p.x + side * layout!.size * 0.72));
  return { x, y: p.y + layout!.size * 0.12 };
}

// ---------- Render ----------

export function render(): void {
  if (want3D()) {
    if (view) { render3D(); return; }
    // Not loaded yet: show the flat map, and switch when the 3D sea is ready.
    preloadMapView().then(v => { if (v && el.offsetParent && !sailing) render(); });
  }
  if (el.classList.contains('map--3d')) { view?.stop(); el.classList.remove('map--3d'); }
  render2D();
  paintToggle();
}

// An island's button: its label (name and stars, or what opens it), badge,
// review sign and the "here next" beacon. `inner` adds the flat map's art.
function isleButton(r: { id: string }, cls: string, label: string, aria: string, { style = '', inner = '' }: { style?: string; inner?: string } = {}) {
  return `
    <button class="isle ${cls}" data-region="${r.id}" aria-label="${aria}"${style ? ` style="${style}"` : ''}>
      ${inner}
      <span class="isle__label">${label}</span>
    </button>`;
}

function islandButton(r: MapRegion, due: Set<string>, next: string | undefined, flat: { style: string } | null = null) {
  const open = isUnlocked(r);
  const pending = open && pendingReveal(r);
  const { stars, max } = regionStars(r.id);
  const badge = badgeState(r.id);
  const prev = r.unlock && world.regions.find(x => x.id === r.unlock!.region);
  const label = `<b>${r.name}</b>${open ? `<span class="isle__stars">${starRow(Math.round((stars / (max || 1)) * 3))}</span>` : `<span class="isle__need">🔒 ${num(r.unlock!.stars)}★ في ${prev!.name}</span>`}`
    + (badge && !pending ? `<span class="isle__badge isle__badge--${badge}" title="${r.badge.name}">${r.badge.icon}</span>` : '')
    + (open && !pending && due.has(r.id) ? '<span class="isle__review" title="حان وقت المراجعة">🔁</span>' : '');
  const aria = open && !pending
    ? `${r.name}، ${r.subject}، ${num(stars)} من ${num(max)} نجوم${badge ? `، شارة ${r.badge.name}` : ''}`
    : `${r.name}، يغطيها الضباب`;
  const beacon = r.id === next && !pending ? '<span class="isle__beacon" aria-hidden="true"><i>هنا!</i></span><span class="isle__ring" aria-hidden="true"></span>' : '';
  const fog = !flat || (open && !pending) ? '' : `
      <span class="fog" aria-hidden="true">
        ${cloudSVG()}${cloudSVG()}${cloudSVG()}
      </span>`;
  return isleButton(r, `${open ? '' : 'isle--locked'} ${beacon ? 'isle--next' : ''}`, label, aria, flat ? { ...flat, inner: `<span class="isle__art">${islandSVG(r.art)}</span>` } : {})
    .replace('</button>', `${fog}${beacon}</button>`);
}

function render2D() {
  layout = computeLayout();
  const { w, h, size, points } = layout;
  const s = save.get() as MapSave;
  const here = s.at && points[s.at] ? s.at : 'home';

  // Each island's route comes from the one before it, or from `from` for a
  // side trip (worlds/grade6.js).
  let prev = 'home';
  const routes = world.regions.map(r => {
    const a = points[r.from || prev], b = points[r.id];
    if (!r.from) prev = r.id;
    const mx = (a.x + b.x) / 2 + (b.y - a.y) * 0.18, my = (a.y + b.y) / 2 - (b.x - a.x) * 0.18;
    const open = isUnlocked(r);
    return `<path d="M${a.x} ${a.y} Q${mx} ${my} ${b.x} ${b.y}" class="route ${open ? 'route--open' : ''}"/>`;
  }).join('');

  const place = (r: { id: string }) => ({ style: `left:${points[r.id].x}px;top:${points[r.id].y}px;width:${size}px` });
  const due = new Set(dueReviews().map(t => t.region));
  const next = nextIsland(due);
  const islands = world.regions.map(r => islandButton(r, due, next, place(r))).join('');

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
    ${isleButton(world.home, 'isle--home', `<b>${world.home.name}</b>`, world.home.name, { ...place(world.home), inner: `<span class="isle__art">${islandSVG(world.home.art)}</span>` })}
    ${islands}
    <div class="map__ship" style="width:${size * 0.62}px">
      <div class="ship__wake"><i></i><i></i><i></i></div>
      <div class="ship__flip"><div class="ship__bob">${shipSVG({ crew: [s.hero || 'sindbad'] })}</div></div>
    </div>
`;
  placeShip(berth(here));
  updateStarsBadge();
}

// The island Hudhud suggests next: the first open one with lessons still
// to try, else one with a review due, else the first not yet mastered.
function nextIsland(due: Set<string>): string | undefined {
  const open = world.regions.filter(r => isUnlocked(r));
  return (open.find(r => !badgeState(r.id)) || open.find(r => due.has(r.id)) || open.find(r => badgeState(r.id) !== 'gold'))?.id;
}

const pendingReveal = (r: MapRegion) => r.unlock && !STAGING && isUnlocked(r) && !(save.get().revealed || []).includes(r.id);
const wait = (ms: number) => new Promise(res => setTimeout(res, ms));
let reviewNagged = false;

// Show the map and play whatever happened since last time, in order:
// stars just earned → fog lifting → new badges → review reminder / greeting.
// `after` = { topicId, stars } when returning from a lesson.
export async function enter(after?: LessonReturn): Promise<void> {
  render();
  const s = save.get() as MapSave;
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
  for (const r of earned) { await showBadge(r, badgeState(r.id)!); spoke = true; }
  // Promotion to a new sailor rank.
  const { stars: total, max: maxStars } = totalStars();
  const info = rankInfo(s.hero || 'sindbad', total, maxStars);
  if (s.rankLevel === undefined) save.update(v => { v.rankLevel = info.level; });
  else if (info.level > s.rankLevel) { await showRankUp(info); spoke = true; }
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
  if (!todayLessons() && streak() > 0 && !reviewNagged) {
    reviewNagged = true;
    await wait(600);
    toast(`🔥 سلسلتك ${num(streak())} ${streak() === 1 ? 'يوم' : 'أيام'}! أنهِ درساً اليوم كي لا تنطفئ النار. هدف اليوم: ${num(DAILY_GOAL)} دروس.`, 6000);
    return;
  }
  if (due.length && !reviewNagged) {
    reviewNagged = true;
    await wait(600);
    toast(`🔁 حان وقت مراجعة «<b>${due[0].title}</b>». المراجعة بعد أيام تثبّت ما تعلّمته في الذاكرة!`, 6000);
  }
}

function heroName(): string { return save.get().hero === 'yasmina' ? 'ياسمينة' : 'سندباد'; }

function updateStarsBadge(): void {
  const { stars, max } = totalStars();
  const badge = document.getElementById('stars-total');
  if (badge) badge.textContent = `${num(stars)} / ${num(max)}`;
  const pearlEl = document.getElementById('pearl-total');
  if (pearlEl) pearlEl.textContent = num(save.get().pearls || 0);
  const pill = document.getElementById('streak-pill');
  if (pill) {
    const today = Math.min(todayLessons(), DAILY_GOAL);
    document.getElementById('streak-n')!.textContent = num(streak());
    pill.style.setProperty('--goal', `${(today / DAILY_GOAL) * 100}%`);
    pill.classList.toggle('is-done', today >= DAILY_GOAL);
    pill.classList.toggle('is-cold', !todayLessons());
    pill.title = `هدف اليوم: ${num(today)} من ${num(DAILY_GOAL)} دروس • ${num(streak())} ${streak() === 1 ? 'يوم' : 'أيام'} متتالية`;
  }
}

// Lift the fog from a newly unlocked island.
async function revealIsland(r: MapRegion): Promise<void> {
  await wait(500);
  save.update(v => { v.revealed = [...new Set([...(v.revealed || []), r.id])]; });
  const isleEl = el.querySelector(`.isle[data-region="${r.id}"]`);
  if (is3D()) {
    sfx.reveal();
    isleEl?.classList.remove('isle--locked');
    toast(`انقشع الضباب! ظهرت <b>${r.name}</b> — جزيرة ${r.subject}. هيّا نُبحر إليها!`, 6000);
    await view!.reveal(r.id);
    render();
    return;
  }
  const fog = isleEl?.querySelector('.fog');
  if (!fog) return;
  sfx.reveal();
  fog.classList.add('fog--lifting');
  isleEl!.classList.remove('isle--locked');
  isleEl!.classList.add('isle--revealed');
  fog.addEventListener('animationend', () => { fog.remove(); render(); }, { once: true });
  toast(`انقشع الضباب! ظهرت <b>${r.name}</b> — جزيرة ${r.subject}. هيّا نُبحر إليها!`, 6000);
}

// Little stars shoot from the island up to the stars counter.
function flyStars(regionId: string, n: number): void {
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
      const b = document.querySelector<HTMLElement>('.stars-badge')!;
      b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
    });
  }
}

// A promotion card when the child reaches a new rank.
function showRankUp(info: RankInfo): Promise<void> {
  return new Promise<void>(resolve => {
    save.update(v => { v.rankLevel = info.level; });
    const modal = document.getElementById('badge-modal')!;
    modal.innerHTML = `
      <div class="badge-modal__rays"></div>
      <div class="badge-modal__card rankup" role="dialog" aria-modal="true" aria-labelledby="rank-title">
        <div class="rankup__icon">🎖️</div>
        <p class="badge-modal__kicker">ترقية!</p>
        <h3 id="rank-title">${info.rank}</h3>
        <p>أحسنت يا ${heroName()}! ${info.next ? `الرتبة التالية: <b>${info.next}</b>` : 'بلغت أعلى رتبة في البحر كلّه! 👑'}</p>
        <button class="btn btn--gold" data-close-badge>هيّا!</button>
      </div>`;
    modal.hidden = false;
    sfx.fanfare();
    const btn = modal.querySelector<HTMLElement>('[data-close-badge]')!;
    btn.focus({ preventScroll: true });
    btn.addEventListener('click', () => { sfx.tap(); modal.hidden = true; resolve(); }, { once: true });
  });
}

// Award an island badge with a full-screen moment.
function showBadge(region: MapRegion, state: Badge): Promise<void> {
  return new Promise<void>(resolve => {
    const first = !(save.get().badges || {})[region.id];
    save.update(v => { v.badges = { ...(v.badges || {}), [region.id]: state }; });
    if (first && region.id !== 'treasure' && !region.kind) setTimeout(() => awardSticker('treasure'), 900);
    const modal = document.getElementById('badge-modal')!;
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
    const btn = modal.querySelector<HTMLElement>('[data-close-badge]')!;
    btn.focus({ preventScroll: true });
    btn.addEventListener('click', () => { sfx.tap(); modal.hidden = true; render(); resolve(); }, { once: true });
  });
}

// ---------- Ship ----------

function placeShip({ x, y }: Point) {
  const ship = el.querySelector<HTMLElement>('.map__ship')!;
  ship.style.transform = `translate(${x}px, ${y}px) translate(-50%, -78%)`;
}

function sailTo(id: string, then: () => void) {
  const s = save.get() as MapSave;
  if (is3D()) {
    const fromId = s.at && (s.at === 'home' || world.regions.some(r => r.id === s.at)) ? s.at : 'home';
    if (fromId === id) { then(); return; }
    sailing = true;
    sfx.sail();
    view!.sail(fromId, id).then(() => { sailing = false; save.update(v => { v.at = id; }); then(); });
    return;
  }
  const fromId = s.at && layout!.points[s.at] ? s.at : 'home';
  if (fromId === id) { then(); return; }
  const a = berth(fromId), b = berth(id);
  const ship = el.querySelector<HTMLElement>('.map__ship')!;
  const flip = ship.querySelector('.ship__flip')!;
  flip.classList.toggle('is-east', b.x > a.x); // art faces west; mirror when heading east
  const cx = (a.x + b.x) / 2 + (b.y - a.y) * 0.18, cy = (a.y + b.y) / 2 - (b.x - a.x) * 0.18;
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const duration = Math.min(2600, 700 + dist * 2.2);
  const t0 = performance.now();
  sailing = true;
  ship.classList.add('is-sailing');
  sfx.sail();
  const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  function frame(now: number) {
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

// What Hudhud says about an island held down on the map: its subject, its
// stars and lessons, its badge, or what lifts its fog.
function peek(id: string) {
  if (id === 'home') { toast(`<b>${world.home.name}</b>: بيتنا ومنه تبدأ كل رحلة. ⚓`); return; }
  const r = world.regions.find(x => x.id === id);
  if (!r) return;
  const { stars, max } = regionStars(r.id);
  const n = topicsIn(r.id).length, badge = badgeState(r.id);
  if (!isUnlocked(r)) {
    const req = world.regions.find(x => x.id === r.unlock!.region)!;
    toast(`<b>${r.name}</b> (${r.subject}) تحت الضباب. 🌫️ اجمع <b>${num(r.unlock!.stars)}</b> نجوم في <b>${req.name}</b> ليتبدّد.`);
    return;
  }
  toast(`<b>${r.name}</b> — ${r.subject}. ${r.intro}<br>⭐ ${num(stars)} من ${num(max)} • 📚 ${num(n)} ${n > 10 ? 'درساً' : 'دروس'}${badge ? ` • ${r.badge.icon} ${r.badge.name}` : ''}<br><small>اضغط عليها لتبحر إليها ⛵</small>`, 7000);
}

// The sea answers a tap too: a ripple, and now and then a fish jumps.
let splashes = 0;
function splash(e: MouseEvent) {
  const box = el.getBoundingClientRect(), x = e.clientX - box.left, y = e.clientY - box.top;
  const s = document.createElement('i');
  s.className = 'map__splash';
  s.style.left = `${x}px`; s.style.top = `${y}px`;
  if (++splashes % 4 === 0) s.innerHTML = `<span>${['🐟', '🐠', '🐡'][splashes % 3]}</span>`;
  el.append(s);
  sfx.tick();
  setTimeout(() => s.remove(), 1400);
}

function onClick(e: MouseEvent) {
  const btn = (e.target as Element).closest<HTMLElement>('.isle');
  if (!btn && !sailing && (e.target as Element).closest('.map__whale')) {
    const w = el.querySelector<HTMLElement>('.map__whale')!;
    w.classList.remove('is-spouting'); void w.offsetWidth; w.classList.add('is-spouting');
    buzz('press'); sfx.blip(180);
    return;
  }
  if (!btn && !sailing && (e.target as Element).closest('.map__sea, .map__routes') && !el.classList.contains('map--3d')) { splash(e); return; }
  if (!btn || sailing) return;
  const id = btn.dataset.region!;
  if (id === 'home') {
    sfx.tap();
    sailTo('home', () => toast(`هنا ميناء أرواد، بيتنا. الجزر تنتظرك يا <b>${heroName()}</b>!`));
    return;
  }
  const region = world.regions.find(r => r.id === id)!;
  if (!isUnlocked(region)) {
    sfx.bad();
    btn.classList.remove('isle--nope'); void btn.offsetWidth; btn.classList.add('isle--nope');
    const req = world.regions.find(r => r.id === region.unlock!.region)!;
    const { stars } = regionStars(req.id);
    toast(`الضباب كثيف هنا! اجمع <b>${num(region.unlock!.stars)}</b> نجوم في <b>${req.name}</b> ليتبدّد. معك الآن ${num(stars)}.`);
    return;
  }
  sfx.tap();
  sailTo(id, () => (walkable[id] ? onEnterIsland(id) : openSheet(region)));
}

let toastTimer: number | undefined;
export function toast(html: string, ms = 5000): void {
  const t = document.getElementById('map-toast')!;
  if (!t.querySelector('.hudhud')) t.querySelector('.guide__bird')!.innerHTML = hudhudSVG();
  t.querySelector('.bubble')!.innerHTML = html;
  t.hidden = false;
  t.classList.remove('is-in'); void t.offsetWidth; t.classList.add('is-in');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}

// ---------- Island panel ----------

function openSheet(region: MapRegion) {
  const sheet = document.getElementById('sheet')!;
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
              <span class="topic-card__stars" aria-label="${num(st)} من 3 نجوم">${starRow(st)}</span>
            </button>
          </li>`;
        }).join('') || '<li class="topic-list__empty">الدروس في الطريق…</li>'}
      </ul>
    </div>`;
  sheet.hidden = false;
  requestAnimationFrame(() => sheet.classList.add('is-open'));
  sheet.querySelector<HTMLElement>('.topic-card')?.focus({ preventScroll: true });
}

// Test hook (tests/e2e.mjs): the 3D sea's state, or null on the flat map.
export const debugSea = (): SeaDebug | null => (is3D() ? view!.debug() : null);
export const debugSeaLook = (...a: Parameters<Sea['look']>): void => view?.look(...a);

export function closeSheet(): void {
  const sheet = document.getElementById('sheet')!;
  sheet.classList.remove('is-open');
  setTimeout(() => { sheet.hidden = true; }, 250);
}
