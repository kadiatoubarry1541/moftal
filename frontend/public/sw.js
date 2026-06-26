// Service worker minimal — requis pour activer l'installation PWA sur Android/Chrome
const CACHE = 'moftal-sw-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

// Réseau en priorité, cache en fallback (évite les pages blanches hors-ligne)
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Mettre en cache uniquement les ressources statiques
        if (res.ok && (e.request.url.match(/\.(js|css|png|svg|webp|jpg|woff2?)$/))) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
