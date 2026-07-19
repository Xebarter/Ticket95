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

type EventSearchContextValue = {
  query: string
  setQuery: (query: string) => void
  clearQuery: () => void
  catalog: Event[]
  /** Merge/replace the in-memory catalog used for instant matching. */
  seedCatalog: (events: Event[]) => void
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
  const seededIds = useRef(new Set<string>())

  const setQuery = useCallback((next: string) => {
    setQueryState(next)
  }, [])

  const clearQuery = useCallback(() => {
    setQueryState('')
  }, [])

  const seedCatalog = useCallback((events: Event[]) => {
    if (!events.length) return

    setCatalog((prev) => {
      let changed = false
      const next = [...prev]

      for (const event of events) {
        if (seededIds.current.has(event.id)) continue
        seededIds.current.add(event.id)
        next.push(event)
        changed = true
      }

      return changed ? next : prev
    })
  }, [])

  // Warm the catalog once so search is fast even before visiting home/events.
  useEffect(() => {
    let cancelled = false

    fetch('/api/events?status=approved&limit=100')
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        if (cancelled || !Array.isArray(data)) return
        seedCatalog(data as Event[])
      })
      .catch(() => {
        // Silent — pages can still seed from SSR data.
      })

    return () => {
      cancelled = true
    }
  }, [seedCatalog])

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
