// Service worker: makes the app fully playable offline after the first load.
//
// Strategy: precache the whole app shell on install, then serve cache-first.
// The browser loads service-worker.js, made from this file by `npm run
// build`, which also fills in APP_SHELL and CACHE_VERSION there
// (tools/update-shell.ts; tests/check-shell.ts fails if they are stale).
// A new version makes clients download the new files once.

const CACHE_VERSION = '';
// The staging copy (under /staging/, see core/env.js) keeps its own offline
// copy, so it never clears the live game's, nor the live game its.
const CACHE_PREFIX = /\/staging\//.test(self.location.pathname) ? 'sindbad-staging-' : 'sindbad-web-';
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;

const APP_SHELL: string[] = [
  // <app-shell>
  // </app-shell>
];

// Each listener says which service worker event it gets (sw-globals.d.ts).
self.addEventListener('install', event => {
  (event as ExtendableEvent).waitUntil(
    caches.open(CACHE_NAME)
      // Straight from the server: the browser's own short-lived cache could
      // still hold the previous version's files.
      .then(cache => cache.addAll(APP_SHELL.map(url => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  // Drop caches from older versions.
  (event as ExtendableEvent).waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// The page asks which version it is running (core/telemetry.js).
self.addEventListener('message', event => {
  const { data, source } = event as ExtendableMessageEvent;
  if (data === 'version') source?.postMessage({ version: CACHE_VERSION });
});

self.addEventListener('fetch', event => {
  const { request } = event as FetchEvent;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  (event as FetchEvent).respondWith(
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
        // (index.html is cached at install; if it is not, the same error.)
        if (request.mode === 'navigate') return caches.match('index.html').then(page => page ?? Response.error());
        return Response.error();
      });
    })
  );
});
