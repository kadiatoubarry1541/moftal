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
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// SPA : toutes les navigations servent index.html (sauf /api/ et /uploads/)
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/\/api\//, /\/uploads\//]
  })
)

// API : pas de cache — toujours réseau direct (auth, données temps réel)

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
        // Si un onglet de l'app est déjà ouvert, on le focus et on navigue
        for (const client of clientList) {
          if ('focus' in client) {
            (client as WindowClient).navigate(targetUrl)
            return (client as WindowClient).focus()
          }
        }
        // Sinon on ouvre un nouvel onglet
        return self.clients.openWindow(targetUrl)
      })
  )
})
