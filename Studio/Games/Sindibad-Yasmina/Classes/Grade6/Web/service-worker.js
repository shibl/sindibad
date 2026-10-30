// Service worker: makes the app fully playable offline after the first load.
//
// Strategy: precache the whole app shell on install, then serve cache-first.
// APP_SHELL and CACHE_VERSION are generated — after adding or changing any
// file run `node tools/update-shell.ts` (tests/check-shell.ts fails if you
// forget). A new version makes clients download the new files once.

const CACHE_VERSION = '981665255a';
// The staging copy (under /staging/, see core/env.js) keeps its own offline
// copy, so it never clears the live game's, nor the live game its.
const CACHE_PREFIX = /\/staging\//.test(self.location.pathname) ? 'sindbad-staging-' : 'sindbad-web-';
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;

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
  'core/api.js',
  'core/atlas/atlas.js',
  'core/atlas/games.js',
  'core/atlas/globe.js',
  'core/atlas/models.js',
  'core/atlas/views.js',
  'core/battle.js',
  'core/chapters.js',
  'core/english/english.js',
  'core/english/games.js',
  'core/english/models.js',
  'core/english/views.js',
  'core/english/words.js',
  'core/env.js',
  'core/family.js',
  'core/farm/farm.js',
  'core/farm/models.js',
  'core/farm/scene.js',
  'core/finale.js',
  'core/format.js',
  'core/fx.js',
  'core/haptics.js',
  'core/i18n.js',
  'core/i18n/arabic-en.js',
  'core/i18n/content-en.js',
  'core/i18n/en.js',
  'core/i18n/math-en.js',
  'core/isle/ground.js',
  'core/isle/island.js',
  'core/isle/kit.js',
  'core/journey.js',
  'core/lab/games.js',
  'core/lab/lab.js',
  'core/lab/models.js',
  'core/lab/views-machines.js',
  'core/lab/views.js',
  'core/learn/explore.js',
  'core/learn/steps.js',
  'core/learn/svg.js',
  'core/learn/util.js',
  'core/lesson.js',
  'core/map.js',
  'core/merge.js',
  'core/music.js',
  'core/overworld.js',
  'core/ranks.js',
  'core/save.js',
  'core/sea/models.js',
  'core/sea/sea.js',
  'core/settings.js',
  'core/shop.js',
  'core/sound.js',
  'core/stickers.js',
  'core/story.js',
  'core/studio/art.js',
  'core/studio/easel.js',
  'core/studio/games.js',
  'core/studio/models.js',
  'core/studio/studio.js',
  'core/studio/svg.js',
  'core/studio/views-1.js',
  'core/studio/views-2.js',
  'core/studio/views-3.js',
  'core/studio/views.js',
  'core/sync.js',
  'core/telemetry.js',
  'core/topics.js',
  'core/touch.js',
  'core/tunes/games.js',
  'core/tunes/models.js',
  'core/tunes/synth.js',
  'core/tunes/tunes.js',
  'core/voice.js',
  'plugins/agriculture/bees.js',
  'plugins/agriculture/beet.js',
  'plugins/agriculture/cheese.js',
  'plugins/agriculture/cotton.js',
  'plugins/agriculture/cow.js',
  'plugins/agriculture/potato.js',
  'plugins/agriculture/tomato.js',
  'plugins/arabic/build.js',
  'plugins/arabic/fael-mafool.js',
  'plugins/arabic/five-verbs.js',
  'plugins/arabic/inna.js',
  'plugins/arabic/kana.js',
  'plugins/arabic/mubtada-khabar.js',
  'plugins/arabic/plurals.js',
  'plugins/arabic/tenses.js',
  'plugins/art/reviews.js',
  'plugins/engines/blocks.js',
  'plugins/engines/fill.js',
  'plugins/engines/helm.js',
  'plugins/engines/kit.js',
  'plugins/engines/market.js',
  'plugins/engines/match.js',
  'plugins/engines/numberline.js',
  'plugins/engines/quiz.js',
  'plugins/engines/sort.js',
  'plugins/engines/tapword.js',
  'plugins/engines/visuals.js',
  'plugins/english/reviews.js',
  'plugins/index.js',
  'plugins/math/angles.js',
  'plugins/math/area.js',
  'plugins/math/decimals.js',
  'plugins/math/divisibility.js',
  'plugins/math/equivalent.js',
  'plugins/math/fraction-ops.js',
  'plugins/math/fractions-line.js',
  'plugins/math/integers.js',
  'plugins/math/market.js',
  'plugins/math/percent.js',
  'plugins/math/ratio.js',
  'plugins/music/reviews.js',
  'plugins/review/pools.js',
  'plugins/review/treasure.js',
  'plugins/science/reviews.js',
  'plugins/social/reviews.js',
  'worlds/atlas/countries.js',
  'worlds/atlas/shapes.js',
  'worlds/chapters.js',
  'worlds/grade6.js',
  'worlds/grade6/arabic.js',
  'worlds/grade6/atlas.js',
  'worlds/grade6/atlas/unit1.js',
  'worlds/grade6/atlas/unit2.js',
  'worlds/grade6/atlas/unit3.js',
  'worlds/grade6/atlas/unit4.js',
  'worlds/grade6/atlas/unit5.js',
  'worlds/grade6/english.js',
  'worlds/grade6/english/block1.js',
  'worlds/grade6/english/block2.js',
  'worlds/grade6/english/block3.js',
  'worlds/grade6/english/block4.js',
  'worlds/grade6/english/kit.js',
  'worlds/grade6/farm.js',
  'worlds/grade6/lab.js',
  'worlds/grade6/lab/body.js',
  'worlds/grade6/lab/forces.js',
  'worlds/grade6/lab/life.js',
  'worlds/grade6/lab/machines.js',
  'worlds/grade6/math.js',
  'worlds/grade6/studio.js',
  'worlds/grade6/studio/part1.js',
  'worlds/grade6/studio/part2.js',
  'worlds/grade6/studio/part3.js',
  'worlds/grade6/treasure.js',
  'worlds/grade6/tunes.js',
  'vendor/three-webgl1/three.module.min.js',
  'vendor/three/three.module.min.js',
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
      // Straight from the server: the browser's own short-lived cache could
      // still hold the previous version's files.
      .then(cache => cache.addAll(APP_SHELL.map(url => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  // Drop caches from older versions.
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// The page asks which version it is running (core/telemetry.js).
self.addEventListener('message', event => {
  if (event.data === 'version') event.source?.postMessage({ version: CACHE_VERSION });
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
