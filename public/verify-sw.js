/* Ticket95 Verifier service worker — caches the verify shell only */
const CACHE = 'ticket95-verifier-shell-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['/offline-verifier.html']).catch(() => undefined))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET') return
  if (!url.pathname.startsWith('/verify')) return
  // Network-first for app shell; fall back to cache for offline reopen
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone()
        if (response.ok && event.request.destination === 'document') {
          caches.open(CACHE).then((cache) => cache.put(event.request, copy))
        }
        return response
      })
      .catch(async () => {
        const cached = await caches.match(event.request)
        if (cached) return cached
        return (
          (await caches.match('/offline-verifier.html')) ||
          new Response('Verifier offline', { status: 503, statusText: 'Offline' })
        )
      })
  )
})
