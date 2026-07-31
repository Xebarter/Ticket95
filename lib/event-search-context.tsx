'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { Event } from '@/lib/supabase-client'
import { filterEvents } from '@/lib/event-search'

type SeedMode = 'merge' | 'replace'

type EventSearchContextValue = {
  query: string
  setQuery: (query: string) => void
  clearQuery: () => void
  catalog: Event[]
  /**
   * Update the in-memory catalog used for instant header search.
   * - `merge` (default): upsert by id while the catalog is still warming.
   *   After an authoritative `replace`, merge only refreshes known ids (won't
   *   reintroduce soft-deleted events from a stale SSR payload).
   * - `replace`: set catalog to exactly this list (approved feed).
   */
  seedCatalog: (events: Event[], mode?: SeedMode) => void
  results: Event[]
  filter: (events: Event[]) => Event[]
}

const EventSearchContext = createContext<EventSearchContextValue | null>(null)

export function EventSearchProvider({
  children,
  initialQuery = '',
}: {
  children: React.ReactNode
  initialQuery?: string
}) {
  const [query, setQueryState] = useState(initialQuery)
  const [catalog, setCatalog] = useState<Event[]>([])
  const hasAuthoritativeCatalog = useRef(false)

  const setQuery = useCallback((next: string) => {
    setQueryState(next)
  }, [])

  const clearQuery = useCallback(() => {
    setQueryState('')
  }, [])

  const seedCatalog = useCallback((events: Event[], mode: SeedMode = 'merge') => {
    if (mode === 'replace') {
      hasAuthoritativeCatalog.current = true
      setCatalog(events)
      return
    }

    if (!events.length) return

    setCatalog((prev) => {
      const byId = new Map(prev.map((event) => [event.id, event]))
      let changed = false
      const allowAdd = !hasAuthoritativeCatalog.current

      for (const event of events) {
        if (byId.has(event.id)) {
          byId.set(event.id, event)
          changed = true
        } else if (allowAdd) {
          byId.set(event.id, event)
          changed = true
        }
      }

      return changed ? Array.from(byId.values()) : prev
    })
  }, [])

  const loadApprovedCatalog = useCallback(() => {
    fetch('/api/events?status=approved&limit=100', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        if (!Array.isArray(data)) return
        seedCatalog(data as Event[], 'replace')
      })
      .catch(() => {
        // Silent — pages can still seed from SSR data.
      })
  }, [seedCatalog])

  // Warm + refresh so soft-deleted events drop out of header search.
  useEffect(() => {
    loadApprovedCatalog()

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        loadApprovedCatalog()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', loadApprovedCatalog)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', loadApprovedCatalog)
    }
  }, [loadApprovedCatalog])

  const results = useMemo(() => filterEvents(catalog, query), [catalog, query])

  const filter = useCallback(
    (events: Event[]) => filterEvents(events, query),
    [query]
  )

  const value = useMemo(
    () => ({
      query,
      setQuery,
      clearQuery,
      catalog,
      seedCatalog,
      results,
      filter,
    }),
    [query, setQuery, clearQuery, catalog, seedCatalog, results, filter]
  )

  return (
    <EventSearchContext.Provider value={value}>{children}</EventSearchContext.Provider>
  )
}

export function useEventSearch() {
  const context = useContext(EventSearchContext)
  if (!context) {
    throw new Error('useEventSearch must be used within EventSearchProvider')
  }
  return context
}
