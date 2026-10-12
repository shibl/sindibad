// رحلات سندباد وياسمينة — core app entry point.
//
// Responsibilities of the core (see SPEC.md): screens/navigation, the world
// map, the ship, save data and progress. Subject content never lives here —
// it lives in plugins/ and talks to the core through the plugin interface,
// so adding a topic never requires editing this file.

import { wipe } from './core/fx.js';
import { openSettings, applySettings } from './core/settings.js';
import { startAmbience, stopAmbience } from './core/ambience.js';
import { defsSVG, shipSVG, palmSVG, gullSVG, cloudSVG, skylineSVG, shoreSVG, heroSVG, hudhudSVG } from './art/art.js';
import { save } from './core/save.js';
import { initMap, enter as enterMap, totalStars, badgeState, preloadMapView, debugSea, debugSeaLook } from './core/map.js';
import { renderChapters } from './core/chapters.js';
import { STAGES, CHAPTERS } from './worlds/chapters.js';
import { renderJourney } from './core/journey.js';
import { openShop, applyStyle } from './core/shop.js';
import { showStory } from './core/story.js';
import { initFamily, renderWho, renderParentGate } from './core/family.js';
import { playMusic } from './core/music.js';
import { profileList, addPlayTime, activeProfile } from './core/save.js';
import { initOverworld, enterIsland, lessonReturned, debugState, debugBlocked, debugPlace } from './core/overworld.js';
import arabicIsland from './worlds/grade6/arabic.js';
import mathIsland from './worlds/grade6/math.js';
import socialIsland from './worlds/grade6/social.js';
import treasureIsland from './worlds/grade6/treasure.js';
import { initLesson, startLesson, streak } from './core/lesson.js';
import { sfx } from './core/sound.js';
import world from './worlds/grade6.js';
import { num } from './core/format.js';
import { STAGING, storeKey } from './core/env.js';
import { stopSpeaking } from './core/voice.js';
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

// Show one screen by name ("title", "select", "chapters", "map", "activity" …); hides the rest.
let place = 'title';   // which music theme is playing

export function showScreen(name, detail) {
  document.querySelectorAll('.screen').forEach(el => {
    el.toggleAttribute('data-active', el.id === `screen-${name}`);
  });
  document.body.dataset.screen = name;
  if (name === 'island' || name === 'farm' || name === 'tunes' || name === 'lab') startAmbience(); else stopAmbience();
  if (name === 'title' || name === 'map' || name === 'chapters') { place = name === 'chapters' ? 'map' : name; playMusic(place); }
  if (name === 'chapters') {
    renderChapters(document.getElementById('chapters'), {
      stages: STAGES,
      chapters: CHAPTERS,
      // Only voyage 6 is open: its world is worlds/grade6.js.
      progress: () => ({ ...totalStars(), badges: world.regions.filter(r => badgeState(r.id)).length, badgeMax: world.regions.length }),
      open: () => wipe(() => showScreen('map')),
    });
  }
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
  document.getElementById('mute-btn').addEventListener('click', () => { sfx.tap(); openSettings(); });
  applySettings();
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
    if (save.get().storySeen) showScreen('chapters');
    else showStory(() => showScreen('chapters'));
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
  // A new version arrived while the old one was open: reload to show it,
  // but only between activities (title, voyages, sea map), never mid-lesson.
  // The first install (no old version) never reloads.
  const hadOld = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadOld || reloading) return;
    // (No screen name yet = the title screen, before any tap.)
    if (['title', 'chapters', 'map'].includes(document.body.dataset.screen || 'title')) { reloading = true; location.reload(); }
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
  if (document.hidden) stopSpeaking();   // sound itself pauses in core/sound.js
});

// ---------- Boot ----------

applyStyle();
paintScene();
paintShip(document.querySelector('.ship--title'), ['sindbad', 'yasmina']);
wireNavigation();
wireHeroSelect();
const ISLANDS = { arabic: arabicIsland, math: mathIsland, social: socialIsland, treasure: treasureIsland };
let lessonFromIsland = false, lessonFromFarm = false, lessonFromTunes = false, lessonFromLab = false;
// The farm is a 3D island: its code (and three.js) loads only when a child
// first sails there, so the rest of the game starts as fast as before.
let farm = null;
const loadFarm = () => (farm ||= import('./core/farm/farm.js').then(m => {
  m.initFarm({
    leave: after => wipe(() => showScreen('map', after)),
    startLesson: id => { lessonFromFarm = true; wipe(() => startLesson(id)); },
  });
  return m;
}));
function enterFarm(region) {
  loadFarm().then(m => wipe(() => { showScreen('farm'); m.enterFarm(region); place = 'farm'; playMusic('farm'); }))
    .catch(err => { console.error('The farm failed to load', err); farm = null; });
}
// The music island is 3D too (core/tunes/), loaded the same way.
let tunes = null;
const loadTunes = () => (tunes ||= import('./core/tunes/tunes.js').then(m => {
  m.initTunes({
    leave: after => wipe(() => showScreen('map', after)),
    startLesson: id => { lessonFromTunes = true; wipe(() => startLesson(id)); },
  });
  return m;
}));
function enterTunes(region) {
  loadTunes().then(m => wipe(() => { showScreen('tunes'); m.enterTunes(region); place = 'music'; playMusic('music'); }))
    .catch(err => { console.error('The music island failed to load', err); tunes = null; });
}
// And the science island (core/lab/).
let lab = null;
const loadLab = () => (lab ||= import('./core/lab/lab.js').then(m => {
  m.initLab({
    leave: after => wipe(() => showScreen('map', after)),
    startLesson: id => { lessonFromLab = true; wipe(() => startLesson(id)); },
  });
  return m;
}));
function enterLab(region) {
  loadLab().then(m => wipe(() => { showScreen('lab'); m.enterLab(region); place = 'science'; playMusic('science'); }))
    .catch(err => { console.error('The science island failed to load', err); lab = null; });
}
initMap(document.getElementById('map'), world, {
  openTopic: startLesson,
  islands: { ...ISLANDS, farm: true, music: true, science: true },
  enterIsland: id => {
    const region = world.regions.find(r => r.id === id);
    if (region.kind === 'farm') { enterFarm(region); return; }
    if (region.kind === 'tunes') { enterTunes(region); return; }
    if (region.kind === 'lab') { enterLab(region); return; }
    wipe(() => { showScreen('island'); enterIsland(ISLANDS[id], region); place = id; playMusic(id); });
  },
});
// The 3D sea map (staging) loads while the child is still on the title
// screen, so the map is ready when they get there.
setTimeout(() => preloadMapView(), 800);
initOverworld({
  startLesson: (id, host) => { lessonFromIsland = true; wipe(() => startLesson(id, { host })); },
  leave: after => wipe(() => showScreen('map', after)),
});
initLesson({
  showScreen,
  onReturn: after => {
    if (lessonFromIsland) { lessonFromIsland = false; wipe(() => { showScreen('island'); lessonReturned(after); }); }
    else if (lessonFromFarm) { lessonFromFarm = false; loadFarm().then(m => wipe(() => { showScreen('farm'); m.lessonReturned(after); })); }
    else if (lessonFromTunes) { lessonFromTunes = false; loadTunes().then(m => wipe(() => { showScreen('tunes'); m.lessonReturned(after); })); }
    else if (lessonFromLab) { lessonFromLab = false; loadLab().then(m => wipe(() => { showScreen('lab'); m.lessonReturned(after); })); }
    else showScreen('map', after);
  },
});

// The staging copy wears a ribbon, so nobody mistakes it for the live game.
if (STAGING) {
  document.documentElement.dataset.env = 'staging';
  document.title = `🧪 ${document.title}`;
}
registerServiceWorker();

initFamily({ worldDef: world, showScreen });
try {
  const boot = sessionStorage.getItem(storeKey('boot'));
  if (boot) { sessionStorage.removeItem(storeKey('boot')); showScreen(boot); }
} catch { /* ignore */ }

// Count play time for the parents' page (only while the game is visible).
setInterval(() => { if (!document.hidden && document.body.dataset.screen !== 'title') addPlayTime(15); }, 15000);

// Start button: several children → "who is playing?"; a new device → ask
// the child's name; one returning child → straight back to the voyages.
{
  const start = document.querySelector('#screen-title [data-go]');
  const list = profileList();
  if (list.length > 1) { start.dataset.go = 'who'; start.textContent = 'مَن يلعب؟'; }
  else if (!list.length || !list[0].name && !save.get().hero) start.dataset.go = 'who';
}
if (save.get().hero && profileList().length <= 1) {
  const start = document.querySelector('#screen-title [data-go]');
  start.dataset.go = 'chapters';
  start.textContent = 'تابِع الرحلة';
  document.getElementById('title-tag').textContent = `مرحباً بعودتك يا ${save.get().hero === 'yasmina' ? 'ياسمينة' : 'سندباد'}! ⛵`;
  // A "welcome back" card: face, name, stars and the day streak.
  const { stars, max } = totalStars();
  const days = streak();
  const card = document.createElement('div');
  card.className = 'title-card';
  card.innerHTML = `<span class="title-card__face">${heroSVG(save.get().hero)}</span>
    <b>${activeProfile()?.name || (save.get().hero === 'yasmina' ? 'ياسمينة' : 'سندباد')}</b>
    <span class="title-card__stat">★ ${num(stars)}<small>/${num(max)}</small></span>
    ${days ? `<span class="title-card__stat title-card__stat--fire">🔥 ${num(days)}</span>` : ''}`;
  start.before(card);
}

// Gentle parallax on the title scene: layers drift with the finger/mouse.
document.getElementById('screen-title').addEventListener('pointermove', e => {
  const scene = document.getElementById('scene');
  scene.style.setProperty('--px', ((e.clientX / innerWidth) - 0.5).toFixed(3));
  scene.style.setProperty('--py', ((e.clientY / innerHeight) - 0.5).toFixed(3));
});

// Test hook: lets headless tests read the hero's position on an island.
if (window.__SINDBAD_TEST__) Object.assign(window, { __island: debugState, __blocked: debugBlocked, __place: debugPlace, __lesson: startLesson, __farm: () => loadFarm().then(m => m.debugFarm()), __tunes: () => loadTunes().then(m => m.debugTunes()), __tunesDo: (fn, ...a) => loadTunes().then(m => m[fn](...a)), __lab: () => loadLab().then(m => m.debugLab()), __labDo: (fn, ...a) => loadLab().then(m => m[fn](...a)), __sea: debugSea, __seaLook: debugSeaLook });
