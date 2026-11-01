/* ことばのカード — Service Worker (minimal offline cache) */
const CACHE_NAME = 'kotoba-card-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&display=swap'
];

/* Install: pre-cache local assets */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache local assets only (fonts may fail due to CORS — that's OK)
      return cache.addAll(['./', './index.html', './manifest.json']).catch(() => {});
    })
  );
  self.skipWaiting();
});

/* Activate: clean up old caches */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/* Fetch: cache-first for same-origin, network-first for Google Fonts */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Google Fonts — network first, fall back to cache
  if (url.hostname.includes('fonts.g')) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Everything else — cache first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        return res;
      });
    })
  );
});
