// BeMore — Static assets only service worker
// NEVER caches API calls, HTML navigation, or dynamic content
const CACHE_NAME = 'bemore-static-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll([
      '/favicon.ico',
      '/icons/icon-192.png',
      '/icons/icon-512.png',
    ])).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // NEVER cache: API calls, HTML, non-GET, non-http
  if (event.request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;
  if (url.pathname.startsWith('/api')) return;
  if (event.request.mode === 'navigate') return;
  if (event.request.headers.get('accept')?.includes('text/html')) return;

  // Only cache: CSS, JS, fonts, images, icons
  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff') ||
    url.pathname === '/favicon.ico';

  if (!isStaticAsset) return;

  // Stale-while-revalidate for static assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetching = fetch(event.request).then(response => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetching;
    })
  );
});
