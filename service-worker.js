// Service worker: makes the app fully playable offline after the first load.
//
// Strategy: precache the whole app shell on install, then serve cache-first.
// APP_SHELL and CACHE_VERSION are generated — after adding or changing any
// file run `node tools/update-shell.mjs` (tests/check-shell.mjs fails if you
// forget). A new version makes clients download the new files once.

const CACHE_VERSION = 'd4dbc5c25e';
const CACHE_NAME = `sindbad-${CACHE_VERSION}`;

const APP_SHELL = [
  // <app-shell>
  './',
  'index.html',
  'style.css',
  'app.js',
  'manifest.json',
  'art/art.js',
  'art/sprites.js',
  'core/finale.js',
  'core/format.js',
  'core/journey.js',
  'core/lesson.js',
  'core/map.js',
  'core/overworld.js',
  'core/save.js',
  'core/sound.js',
  'core/topics.js',
  'plugins/arabic/fael-mafool.js',
  'plugins/arabic/mubtada-khabar.js',
  'plugins/arabic/plurals.js',
  'plugins/engines/kit.js',
  'plugins/engines/match.js',
  'plugins/engines/numberline.js',
  'plugins/engines/quiz.js',
  'plugins/engines/sort.js',
  'plugins/engines/tapword.js',
  'plugins/engines/visuals.js',
  'plugins/index.js',
  'plugins/math/decimals.js',
  'plugins/math/fraction-ops.js',
  'plugins/math/fractions-line.js',
  'plugins/math/percent.js',
  'plugins/review/treasure.js',
  'plugins/science/body.js',
  'plugins/science/matter.js',
  'plugins/science/planets.js',
  'plugins/social/geography.js',
  'plugins/social/landmarks.js',
  'worlds/grade6.js',
  'worlds/grade6/arabic.js',
  'fonts/baloo-bhaijaan-2-arabic-500-normal.woff2',
  'fonts/baloo-bhaijaan-2-arabic-800-normal.woff2',
  'fonts/baloo-bhaijaan-2-latin-500-normal.woff2',
  'fonts/baloo-bhaijaan-2-latin-800-normal.woff2',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon.svg',
  // </app-shell>
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
