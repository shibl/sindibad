// رحلات سندباد وياسمينة — core app entry point.
//
// Responsibilities of the core (see SPEC.md): screens/navigation, the world
// map, the ship, save data and progress. Subject content never lives here —
// it lives in plugins/ and talks to the core through the plugin interface,
// so adding a topic never requires editing this file.

import { defsSVG, shipSVG, palmSVG, gullSVG, cloudSVG, skylineSVG, shoreSVG, heroSVG, hudhudSVG } from './art/art.js';
import { save } from './core/save.js';
import { initMap, enter as enterMap } from './core/map.js';
import { initLesson, startLesson } from './core/lesson.js';
import { sfx, toggleMute } from './core/sound.js';
import world from './worlds/grade6.js';
import './plugins/index.js';

// ---------- Backdrop ----------

function paintScene() {
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
export function showScreen(name, detail) {
  document.querySelectorAll('.screen').forEach(el => {
    el.toggleAttribute('data-active', el.id === `screen-${name}`);
  });
  document.body.dataset.screen = name;
  if (name === 'map') {
    const hero = save.get().hero || 'sindbad';
    document.getElementById('hero-btn').innerHTML = `<span class="hero-face">${heroSVG(hero)}</span>`;
    enterMap(detail);
  }
}

function wireNavigation() {
  document.addEventListener('click', e => {
    const target = e.target.closest('[data-go]');
    if (target) { sfx.tap(); showScreen(target.dataset.go); }
  });
  const mute = document.getElementById('mute-btn');
  const paintMute = () => { mute.textContent = save.get().muted ? '🔇' : '🔊'; };
  mute.addEventListener('click', () => { toggleMute(); paintMute(); sfx.tap(); });
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
    showScreen('map');
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

// ---------- Boot ----------

paintScene();
paintShip(document.querySelector('.ship--title'), ['sindbad', 'yasmina']);
wireNavigation();
wireHeroSelect();
initMap(document.getElementById('map'), world, { openTopic: startLesson });
initLesson({ showScreen, onReturn: after => showScreen('map', after) });
registerServiceWorker();

// Returning players skip straight past the title once they've chosen a hero.
document.querySelector('#screen-title [data-go]').dataset.go = save.get().hero ? 'map' : 'select';
