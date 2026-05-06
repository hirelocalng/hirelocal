const CACHE_NAME = 'hirelocal-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/search.html',
  '/register.html',
  '/login.html',
  '/css/style.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});