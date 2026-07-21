/// <reference lib="WebWorker" />
/// <reference types="vite-plugin-pwa/client" />

import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { clientsClaim, skipWaiting } from 'workbox-core'

declare const self: ServiceWorkerGlobalScope

skipWaiting()
clientsClaim()

// Intercepte le fetch du manifest.webmanifest avant Workbox.
// Quand Chrome vérifie l'installabilité PWA, le SW lui retourne le bon manifest
// selon la page active (gestion interne ou app principale).
// C'est la seule méthode fiable : Chrome lit le manifest avant que main.tsx s'exécute.
self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url)
  if (url.pathname !== '/manifest.webmanifest') return

  event.respondWith(
    (async () => {
      try {
        const client = event.clientId ? await self.clients.get(event.clientId) : null
        const clientPath = client ? new URL(client.url).pathname : ''

        const gestionMatch = clientPath.match(/^\/gestion-[^/]+\/([^/]+)/)
        const proMatch = clientPath.match(/^\/espace-pro\/([^/]+)/)

        if (gestionMatch) {
          const tenantCode = gestionMatch[1]
          const res = await fetch(
            `/api/professionals/pro-manifest/by-tenant/${tenantCode}?startUrl=${encodeURIComponent(clientPath)}`
          )
          if (res.ok) return res
        } else if (proMatch) {
          const res = await fetch(`/api/professionals/pro-manifest/${proMatch[1]}`)
          if (res.ok) return res
        }
      } catch { /* silencieux — fallback ci-dessous */ }

      return fetch(event.request)
    })()
  )
})

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// À chaque nouvelle version du SW qui prend le relais, on vide le cache de
// pages (pages-cache) : sans ça, un utilisateur avec une connexion lente peut
// continuer à voir une page mise en cache il y a plusieurs jours (jusqu'à 7j)
// même après plusieurs nouveaux déploiements, car NetworkFirst ne retombe sur
// le réseau que si le cache est absent ou expiré — jamais "juste parce qu'il y
// a une nouvelle version".
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(caches.delete('pages-cache'))
})

// Navigation SPA : NetworkFirst — essaie toujours le réseau en priorité.
// Si réseau indisponible → sert index.html depuis le cache (app fonctionne quand même).
// Ainsi l'app s'ouvre toujours, que ce soit /espace-pro/:id, /gestion-*, ou la home.
registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: 'pages-cache',
      networkTimeoutSeconds: 5, // 5s max d'attente réseau, sinon bascule sur le cache
      plugins: [
        // maxAgeSeconds court : filet de sécurité en plus du vidage sur activate() —
        // borne le risque de page périmée à 1 jour max, pas 7.
        new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 24 * 60 * 60 })
      ]
    }),
    { denylist: [/\/api\//, /\/uploads\//] }
  )
)

// Google Fonts : Cache First (1 an)
registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 31_536_000 })]
  })
)

// Uploads distants : Cache First (30 jours)
registerRoute(
  /\/uploads\/.*/i,
  new CacheFirst({
    cacheName: 'uploads-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 2_592_000 })]
  })
)

// Images locales : Stale-While-Revalidate (7 jours)
registerRoute(
  /\.(svg|png|webp|ico)$/i,
  new StaleWhileRevalidate({
    cacheName: 'images-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 604_800 })]
  })
)

// ─── Web Push ────────────────────────────────────────────────────────────────

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return
  const data = event.data.json()
  const title = data.title || 'Moftal'
  const options: NotificationOptions = {
    body: data.message || '',
    icon: '/logo-moftal.svg',
    badge: '/logo-moftal.svg',
    tag: data.id || 'moftal-notif',
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' }
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const targetUrl = (event.notification.data?.url as string) || '/'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if ('focus' in client) {
            (client as WindowClient).navigate(targetUrl)
            return (client as WindowClient).focus()
          }
        }
        return self.clients.openWindow(targetUrl)
      })
  )
})
