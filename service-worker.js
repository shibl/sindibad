// Service worker: makes the app fully playable offline after the first load.
//
// Strategy: precache the whole app shell on install, then serve cache-first.
// When you add or rename a file the app needs offline (including new plugin
// files), add it to APP_SHELL and bump CACHE_VERSION so clients pick it up.
// BACKLOG item 6 hardens and verifies this end to end.

const CACHE_VERSION = 'v1';
const CACHE_NAME = `sindbad-${CACHE_VERSION}`;

const APP_SHELL = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'art/art.js',
  'manifest.json',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  // Drop caches from older versions.
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith('sindbad-') && k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        // Cache anything else same-origin we successfully fetch, so content
        // visited once online stays available offline.
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      }).catch(() => {
        // Offline and not cached: fall back to the app shell for navigations.
        if (request.mode === 'navigate') return caches.match('index.html');
        return Response.error();
      });
    })
  );
});
