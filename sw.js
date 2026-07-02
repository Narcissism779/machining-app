var CACHE = 'machining-v1';
var PRECACHE_URLS = [
  '/', '/index.html', '/css/style.css',
  '/js/services/db.js',
  '/js/pages/dashboard.js', '/js/pages/orders.js',
  '/js/pages/order-detail.js', '/js/pages/daily-plan.js',
  '/js/pages/statistics.js', '/js/pages/settings.js', '/js/app.js',
  '/manifest.json', '/assets/icons/icon-512.svg'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) { return c.addAll(PRECACHE_URLS); }).then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(function(r) { return r || fetch(e.request); })
  );
});