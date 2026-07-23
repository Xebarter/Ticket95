'use client'

import { useEffect } from 'react'

/**
 * Unregisters the legacy verifier service worker that lived at /verify-sw.js
 * and (on older builds) redirected the entire origin to /verify/{slug}?source=pwa.
 */
export function VerifierSwCleanup() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    void (async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(
          registrations.map(async (registration) => {
            const scriptUrl =
              registration.active?.scriptURL ||
              registration.waiting?.scriptURL ||
              registration.installing?.scriptURL ||
              ''
            if (scriptUrl.endsWith('/verify-sw.js')) {
              await registration.unregister()
            }
          })
        )
      } catch {
        // ignore
      }
    })()
  }, [])

  return null
}
