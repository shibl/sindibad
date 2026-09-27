// رحلات سندباد وياسمينة — core app entry point.
//
// Responsibilities of the core (see SPEC.md): screens/navigation, the world
// map, the ship, save data and progress. Subject content never lives here —
// it lives in plugins/ and talks to the core through the plugin interface
// (BACKLOG item 2), so adding a topic never requires editing this file.

import { shipSVG, palmSVG, gullSVG } from './art/art.js';

// ---------- Backdrop ----------

function paintScene() {
  document.querySelectorAll('.palm').forEach(el => { el.innerHTML = palmSVG(); });
  document.querySelectorAll('.ship').forEach(el => { el.innerHTML = shipSVG(); });

  const gulls = document.querySelector('.gulls');
  [
    { top: '30%', duration: 11, delay: 0 },
    { top: '50%', duration: 15, delay: -5 },
  ].forEach(({ top, duration, delay }) => {
    gulls.insertAdjacentHTML('beforeend', gullSVG());
    const g = gulls.lastElementChild;
    g.style.top = top;
    g.style.animationDuration = `${duration}s`;
    g.style.animationDelay = `${delay}s`;
  });
}

// ---------- Screens ----------

// Show one screen by name ("title", "map", "activity"); hides the rest.
export function showScreen(name) {
  document.querySelectorAll('.screen').forEach(el => {
    el.toggleAttribute('data-active', el.id === `screen-${name}`);
  });
}

function wireNavigation() {
  document.addEventListener('click', e => {
    const target = e.target.closest('[data-go]');
    if (target) showScreen(target.dataset.go);
  });
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
wireNavigation();
registerServiceWorker();
