/**
 * Legacy Ticket95 verifier SW (was registered at origin root /verify-sw.js).
 * Older versions redirected ALL site navigations back to /verify/{slug}?source=pwa.
 *
 * This file now only self-unregisters so the main site works again.
 * New installs use /verify/sw.js with scope /verify/.
 */
self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(Promise.resolve())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys()
        await Promise.all(
          keys
            .filter((k) => k.startsWith('ticket95-verifier') || k === 'ticket95.lastVerifySlug')
            .map((k) => caches.delete(k))
        )
      } catch {
        // ignore
      }
      try {
        await self.registration.unregister()
      } catch {
        // ignore
      }
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of clients) {
        // Nudge controlled pages to reload once so they drop the old controller
        try {
          client.postMessage({ type: 'VERIFIER_SW_RETIRED' })
        } catch {
          // ignore
        }
      }
    })()
  )
})

// Intentionally no fetch handler — do not redirect the main site.
