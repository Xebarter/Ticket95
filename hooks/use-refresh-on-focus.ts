'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Refetch RSC props when the tab becomes visible again (drops soft-deleted events). */
export function useRefreshOnFocus() {
  const router = useRouter()

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        router.refresh()
      }
    }
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [router])
}
