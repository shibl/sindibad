// The game moved to Web/. Devices that played before still run the old
// offline copy from the site's top folder. When they check for updates they
// get this worker instead: it deletes that old copy, removes itself and
// reloads open pages, which then forward to the game in Web/. Saved
// progress is kept: it belongs to the site, not to a folder.
//
// The site publishes service-worker.js, made from this file by the game's
// build (Web: npm run build); its types: tsconfig.json here.

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  (event as ExtendableEvent).waitUntil((async () => {
    const keys = await caches.keys();
    // Only the old copy (sindbad-<version>); the new game uses sindbad-web-…
    await Promise.all(keys.filter(k => /^sindbad-[0-9a-f]+$/.test(k)).map(k => caches.delete(k)));
    await self.registration.unregister();
    const pages = await self.clients.matchAll({ type: 'window' });
    pages.forEach(page => page.navigate(page.url));
  })());
});
