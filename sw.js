const CACHE_NAME = 'racktag-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/racktag.css',
  '/racktag.js',
  '/manifest.json',
  '/data/locations.json',
  'https://unpkg.com/qrcodejs@1.0.0/qrcode.js'
];

// Install: cache all core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch: cache-first strategy
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      return (
        cached ||
        fetch(event.request).catch(() => cached)
      );
    })
  );
});
