// رحلات سندباد وياسمينة — core app entry point.
//
// Responsibilities of the core (see SPEC.md): screens/navigation, the world
// map, the ship, save data and progress. Subject content never lives here —
// it lives in plugins/ and talks to the core through the plugin interface,
// so adding a topic never requires editing this file.

import { wipe } from './core/fx.js';
import { defsSVG, shipSVG, palmSVG, gullSVG, cloudSVG, skylineSVG, shoreSVG, heroSVG, hudhudSVG } from './art/art.js';
import { save } from './core/save.js';
import { initMap, enter as enterMap } from './core/map.js';
import { renderJourney } from './core/journey.js';
import { openShop, applyStyle } from './core/shop.js';
import { showStory } from './core/story.js';
import { initFamily, renderWho, renderParentGate } from './core/family.js';
import { playMusic, refreshMusicVolume } from './core/music.js';
import { profileList, addPlayTime } from './core/save.js';
import { initOverworld, enterIsland, lessonReturned, debugState, debugBlocked, debugPlace } from './core/overworld.js';
import arabicIsland from './worlds/grade6/arabic.js';
import mathIsland from './worlds/grade6/math.js';
import scienceIsland from './worlds/grade6/science.js';
import socialIsland from './worlds/grade6/social.js';
import treasureIsland from './worlds/grade6/treasure.js';
import { initLesson, startLesson } from './core/lesson.js';
import { sfx, toggleMute } from './core/sound.js';
import world from './worlds/grade6.js';
import './plugins/index.js';

// ---------- Backdrop ----------

// Day, sunset or night, from the device clock (override with ?time=night).
function timeOfDay() {
  const forced = new URLSearchParams(location.search).get('time');
  if (['day', 'sunset', 'night'].includes(forced)) return forced;
  const h = new Date().getHours();
  return h >= 6 && h < 16 ? 'day' : h >= 16 && h < 19 ? 'sunset' : 'night';
}

function paintScene() {
  document.body.dataset.time = timeOfDay();
  const stars = document.querySelector('.stars');
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  stars.innerHTML = Array.from({ length: 70 }, () =>
    `<i style="left:${(rnd() * 100).toFixed(1)}%;top:${(rnd() * 100).toFixed(1)}%;--s:${(1 + rnd() * 2.2).toFixed(1)}px;animation-delay:${(-rnd() * 4).toFixed(1)}s"></i>`).join('');
  document.body.insertAdjacentHTML('afterbegin', defsSVG());
  document.querySelector('.skyline').innerHTML = skylineSVG();
  document.querySelector('.shore').innerHTML = shoreSVG();
  document.querySelectorAll('.palm').forEach(el => { el.innerHTML = palmSVG(); });
  document.querySelectorAll('.guide__bird').forEach(el => { el.innerHTML = hudhudSVG(); });

  const clouds = document.querySelector('.clouds');
  [
    { top: 6, width: 30, duration: 90, delay: -20 },
    { top: 22, width: 20, duration: 120, delay: -70 },
    { top: 14, width: 24, duration: 105, delay: -45 },
  ].forEach(({ top, width, duration, delay }) => {
    clouds.insertAdjacentHTML('beforeend', cloudSVG());
    const c = clouds.lastElementChild;
    Object.assign(c.style, { top: `${top}%`, width: `${width}vmin`, animationDuration: `${duration}s`, animationDelay: `${delay}s` });
  });

  const gulls = document.querySelector('.gulls');
  [
    { top: 34, duration: 16, delay: 0 },
    { top: 42, duration: 22, delay: -9 },
    { top: 38, duration: 19, delay: -4 },
  ].forEach(({ top, duration, delay }) => {
    gulls.insertAdjacentHTML('beforeend', gullSVG());
    const g = gulls.lastElementChild;
    Object.assign(g.style, { top: `${top}%`, animationDuration: `${duration}s`, animationDelay: `${delay}s` });
  });
}

// Draw a ship into `el` with the given crew; wraps it so it can bob.
function paintShip(el, crew) {
  el.innerHTML = `<div class="ship__bob">${shipSVG({ crew })}</div>`;
}

// ---------- Screens ----------

// Show one screen by name ("title", "select", "map", "activity"); hides the rest.
let place = 'title';   // which music theme is playing

export function showScreen(name, detail) {
  document.querySelectorAll('.screen').forEach(el => {
    el.toggleAttribute('data-active', el.id === `screen-${name}`);
  });
  document.body.dataset.screen = name;
  if (name === 'title' || name === 'map') { place = name; playMusic(place); }
  if (name === 'map') {
    const hero = save.get().hero || 'sindbad';
    document.getElementById('hero-btn').innerHTML = `<span class="hero-face">${heroSVG(hero)}</span>`;
    enterMap(detail);
  }
  if (name === 'who') renderWho(document.getElementById('who'));
  if (name === 'parents') renderParentGate(document.getElementById('parents'));
  if (name === 'journey') renderJourney(document.getElementById('journey'), world, { showScreen });
}

function wireNavigation() {
  document.addEventListener('click', e => {
    const target = e.target.closest('[data-go]');
    if (target) { sfx.tap(); showScreen(target.dataset.go); }
  });
  document.getElementById('pearl-btn').addEventListener('click', () => openShop({
    changed: () => {
      paintShip(document.querySelector('.ship--title'), ['sindbad', 'yasmina']);
      document.getElementById('hero-btn').innerHTML = `<span class="hero-face">${heroSVG(save.get().hero || 'sindbad')}</span>`;
      enterMap();
    },
  }));
  const mute = document.getElementById('mute-btn');
  const paintMute = () => { mute.textContent = save.get().muted ? '🔇' : '🔊'; };
  mute.addEventListener('click', () => { toggleMute(); paintMute(); refreshMusicVolume(); sfx.tap(); });
  paintMute();
}

// ---------- Character select ----------

const HERO_LINES = {
  sindbad: '<b>سندباد</b> البحّار الشجاع! لا يخاف الموج ولا الأسئلة الصعبة.',
  yasmina: '<b>ياسمينة</b> المستكشفة الذكية! عينها على كل سرّ في الخريطة.',
};

function wireHeroSelect() {
  const cards = [...document.querySelectorAll('.hero-card')];
  const group = document.querySelector('.heroes');
  const go = document.getElementById('select-go');
  const bubble = document.getElementById('select-bubble');

  cards.forEach(card => {
    card.querySelector('.hero-card__art').innerHTML = heroSVG(card.dataset.hero);
  });

  function choose(id, { announce = true } = {}) {
    cards.forEach(c => c.setAttribute('aria-checked', String(c.dataset.hero === id)));
    group.classList.add('has-choice');
    go.disabled = false;
    if (announce) {
      bubble.innerHTML = HERO_LINES[id];
      bubble.classList.remove('pop'); void bubble.offsetWidth; bubble.classList.add('pop');
    }
  }

  cards.forEach(card => card.addEventListener('click', () => choose(card.dataset.hero)));
  go.addEventListener('click', () => {
    const chosen = cards.find(c => c.getAttribute('aria-checked') === 'true');
    if (!chosen) return;
    save.update(s => { s.hero = chosen.dataset.hero; });
    applyStyle();
    if (save.get().storySeen) showScreen('map');
    else showStory(() => showScreen('map'));
  });

  const saved = save.get().hero;
  if (saved) choose(saved, { announce: false });
}

// ---------- Offline support ----------

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // Service workers need a secure context (https or localhost) — skip
  // silently otherwise, e.g. when opened straight from file://.
  if (!window.isSecureContext) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(err => {
      console.warn('Service worker registration failed:', err);
    });
  });
}

// Lite mode for budget phones: ≤ 2 GB memory or ≤ 4 cores.
// ?lite=1 / ?lite=0 force it on or off.
{
  const forced = new URLSearchParams(location.search).get('lite');
  const weak = (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  if (forced === '1' || (forced !== '0' && weak)) document.body.classList.add('lite');
}

// Browsers only allow sound after the first tap: start the music then.
window.addEventListener('pointerdown', () => playMusic(place), { once: true });
window.addEventListener('keydown', () => playMusic(place), { once: true });

// Pause every animation while the app is in the background (saves battery
// on low-end phones).
document.addEventListener('visibilitychange', () => {
  document.body.classList.toggle('is-paused', document.hidden);
});

// ---------- Boot ----------

applyStyle();
paintScene();
paintShip(document.querySelector('.ship--title'), ['sindbad', 'yasmina']);
wireNavigation();
wireHeroSelect();
const ISLANDS = { arabic: arabicIsland, math: mathIsland, science: scienceIsland, social: socialIsland, treasure: treasureIsland };
let lessonFromIsland = false;
initMap(document.getElementById('map'), world, {
  openTopic: startLesson,
  islands: ISLANDS,
  enterIsland: id => wipe(() => { showScreen('island'); enterIsland(ISLANDS[id], world.regions.find(r => r.id === id)); place = id; playMusic(id); }),
});
initOverworld({
  startLesson: (id, host) => { lessonFromIsland = true; wipe(() => startLesson(id, { host })); },
  leave: after => wipe(() => showScreen('map', after)),
});
initLesson({
  showScreen,
  onReturn: after => {
    if (lessonFromIsland) { lessonFromIsland = false; wipe(() => { showScreen('island'); lessonReturned(after); }); }
    else showScreen('map', after);
  },
});
registerServiceWorker();

initFamily({ worldDef: world, showScreen });
try {
  const boot = sessionStorage.getItem('sindbad.boot');
  if (boot) { sessionStorage.removeItem('sindbad.boot'); showScreen(boot); }
} catch { /* ignore */ }

// Count play time for the parents' page (only while the game is visible).
setInterval(() => { if (!document.hidden && document.body.dataset.screen !== 'title') addPlayTime(15); }, 15000);

// Start button: several children → "who is playing?"; a new device → ask
// the child's name; one returning child → straight back to the map.
{
  const start = document.querySelector('#screen-title [data-go]');
  const list = profileList();
  if (list.length > 1) { start.dataset.go = 'who'; start.textContent = 'مَن يلعب؟'; }
  else if (!list.length || !list[0].name && !save.get().hero) start.dataset.go = 'who';
}
if (save.get().hero && profileList().length <= 1) {
  const start = document.querySelector('#screen-title [data-go]');
  start.dataset.go = 'map';
  start.textContent = 'تابِع الرحلة';
  document.getElementById('title-tag').textContent = `مرحباً بعودتك يا ${save.get().hero === 'yasmina' ? 'ياسمينة' : 'سندباد'}! ⛵`;
}

// Test hook: lets headless tests read the hero's position on an island.
if (window.__SINDBAD_TEST__) Object.assign(window, { __island: debugState, __blocked: debugBlocked, __place: debugPlace, __lesson: startLesson });
