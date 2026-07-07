const CACHE_NAME = 'racktag-v1';
const ASSETS = [
  './',
  './index.html',
  './racktag.css',
  './racktag.js',
  './data/locations.json',
  'https://unpkg.com/qrcodejs@1.0.0/qrcode.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});