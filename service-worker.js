// Service worker: makes the app fully playable offline after the first load.
//
// Strategy: precache the whole app shell on install, then serve cache-first.
// APP_SHELL and CACHE_VERSION are generated — after adding or changing any
// file run `node tools/update-shell.mjs` (tests/check-shell.mjs fails if you
// forget). A new version makes clients download the new files once.

const CACHE_VERSION = 'e32f7b0b30';
const CACHE_NAME = `sindbad-${CACHE_VERSION}`;

const APP_SHELL = [
  // <app-shell>
  './',
  'index.html',
  'about.html',
  'style.css',
  'app.js',
  'manifest.json',
  'art/art.js',
  'art/sprites.js',
  'core/ambience.js',
  'core/battle.js',
  'core/family.js',
  'core/finale.js',
  'core/format.js',
  'core/fx.js',
  'core/journey.js',
  'core/lesson.js',
  'core/map.js',
  'core/music.js',
  'core/overworld.js',
  'core/ranks.js',
  'core/save.js',
  'core/settings.js',
  'core/shop.js',
  'core/sound.js',
  'core/stickers.js',
  'core/story.js',
  'core/topics.js',
  'core/voice.js',
  'plugins/arabic/fael-mafool.js',
  'plugins/arabic/five-verbs.js',
  'plugins/arabic/inna.js',
  'plugins/arabic/kana.js',
  'plugins/arabic/mubtada-khabar.js',
  'plugins/arabic/plurals.js',
  'plugins/arabic/tenses.js',
  'plugins/engines/kit.js',
  'plugins/engines/match.js',
  'plugins/engines/numberline.js',
  'plugins/engines/quiz.js',
  'plugins/engines/sort.js',
  'plugins/engines/tapword.js',
  'plugins/engines/visuals.js',
  'plugins/index.js',
  'plugins/math/area.js',
  'plugins/math/decimals.js',
  'plugins/math/divisibility.js',
  'plugins/math/fraction-ops.js',
  'plugins/math/fractions-line.js',
  'plugins/math/integers.js',
  'plugins/math/percent.js',
  'plugins/math/ratio.js',
  'plugins/review/pools.js',
  'plugins/review/treasure.js',
  'plugins/science/body.js',
  'plugins/science/electricity.js',
  'plugins/science/light.js',
  'plugins/science/machines.js',
  'plugins/science/matter.js',
  'plugins/science/planets.js',
  'plugins/science/plants.js',
  'plugins/social/capitals.js',
  'plugins/social/civilizations.js',
  'plugins/social/climate.js',
  'plugins/social/geography.js',
  'plugins/social/landmarks.js',
  'worlds/grade6.js',
  'worlds/grade6/arabic.js',
  'worlds/grade6/math.js',
  'worlds/grade6/science.js',
  'worlds/grade6/social.js',
  'worlds/grade6/treasure.js',
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
