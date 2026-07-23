/* Ticket95 Verifier SW — scope /verify/ only. Does not touch the main site. */
const CACHE = 'ticket95-verifier-shell-v4'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['/offline-verifier.html']).catch(() => undefined))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((k) => k.startsWith('ticket95-verifier') && k !== CACHE)
          .map((k) => caches.delete(k))
      )
      await self.clients.claim()
    })()
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET') return

  // Only document navigations under /verify — never APIs or the main site
  if (event.request.mode !== 'navigate') return
  if (!url.pathname.startsWith('/verify')) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone()
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
