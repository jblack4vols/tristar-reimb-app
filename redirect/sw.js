// Replaces the calculator service worker. Browsers that already registered
// /sw.js would otherwise keep the old app shell. This worker clears those
// caches and unregisters. It does not intercept fetches, so the move notice
// is always loaded from the network.
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
    await self.registration.unregister();
  })());
});
