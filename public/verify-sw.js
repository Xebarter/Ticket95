/* Ticket95 Verifier SW — verify scope only; never serve the main site */
const CACHE = 'ticket95-verifier-shell-v2'
const LAST_SLUG_KEY = 'ticket95.lastVerifySlug'

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

self.addEventListener('message', (event) => {
  const data = event.data
  if (data && data.type === 'SET_LAST_SLUG' && typeof data.slug === 'string') {
    event.waitUntil(
      caches.open(CACHE).then((cache) =>
        cache.put(
          LAST_SLUG_KEY,
          new Response(JSON.stringify({ slug: data.slug }), {
            headers: { 'Content-Type': 'application/json' },
          })
        )
      )
    )
  }
})

async function lastVerifyPath() {
  try {
    const cache = await caches.open(CACHE)
    const res = await cache.match(LAST_SLUG_KEY)
    if (!res) return '/verify/'
    const data = await res.json()
    if (data?.slug) return `/verify/${data.slug}?source=pwa`
  } catch {
    // ignore
  }
  return '/verify/'
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET') return

  // Keep installed PWA inside /verify — bounce other documents back
  if (event.request.mode === 'navigate' && !url.pathname.startsWith('/verify')) {
    event.respondWith(
      lastVerifyPath().then((path) => Response.redirect(new URL(path, url.origin), 302))
    )
    return
  }

  if (!url.pathname.startsWith('/verify')) return

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
