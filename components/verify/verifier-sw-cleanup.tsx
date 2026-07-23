'use client'

import { useEffect } from 'react'

/**
 * Removes broken verifier service-worker registrations:
 * - root-scoped /verify-sw.js (old build that redirected the whole site)
 * - /verify/sw.js (short-lived path that some devices registered)
 *
 * Leaves a healthy /verify-sw.js registration with scope /verify/ alone.
 */
export function VerifierSwCleanup() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    void (async () => {
      try {
        const origin = window.location.origin
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(
          registrations.map(async (registration) => {
            const scriptUrl =
              registration.active?.scriptURL ||
              registration.waiting?.scriptURL ||
              registration.installing?.scriptURL ||
              ''
            const scopeUrl = registration.scope

            if (scriptUrl.includes('/verify/sw.js')) {
              await registration.unregister()
              return
            }

            // Only remove verify-sw.js if it claimed the whole origin (hijack bug)
            if (scriptUrl.endsWith('/verify-sw.js') && scopeUrl === `${origin}/`) {
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
