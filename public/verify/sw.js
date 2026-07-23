/**
 * Legacy path: older clients registered /verify/sw.js.
 * This stub only unregisters itself so door devices recover.
 * Do not redirect or intercept fetches.
 */
self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(Promise.resolve())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        await self.registration.unregister()
      } catch {
        // ignore
      }
    })()
  )
})
