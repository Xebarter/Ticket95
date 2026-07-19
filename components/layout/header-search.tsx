'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Calendar, MapPin, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useEventSearch } from '@/lib/event-search-context'
import type { Event } from '@/lib/supabase-client'
import dynamic from 'next/dynamic'

const TicketPurchaseDialog = dynamic(
  () =>
    import('@/components/events/ticket-purchase-dialog').then(
      (mod) => mod.TicketPurchaseDialog
    ),
  { ssr: false }
)

type HeaderSearchProps = {
  className?: string
  /** Tighter padding for the sticky mobile search bar */
  compact?: boolean
}

function formatEventDate(dateString: string): string {
  const date = new Date(dateString)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

export function HeaderSearch({ className, compact = false }: HeaderSearchProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { query, setQuery, clearQuery, results } = useEventSearch()
  const [open, setOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const urlSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const suggestions = useMemo(() => {
    if (!query.trim() || !open) return []
    return results.slice(0, 6)
  }, [query, open, results])

  // Keep /events?search= in sync without blocking keystrokes.
  useEffect(() => {
    if (pathname !== '/events') return

    if (urlSyncTimer.current) clearTimeout(urlSyncTimer.current)

    urlSyncTimer.current = setTimeout(() => {
      const trimmed = query.trim()
      const currentParams = new URLSearchParams(window.location.search)
      const currentSearch = currentParams.get('search') || ''
      if (trimmed === currentSearch) return

      const nextParams = new URLSearchParams()
      if (trimmed) nextParams.set('search', trimmed)
      const category = currentParams.get('category')
      if (category) nextParams.set('category', category)

      const qs = nextParams.toString()
      router.replace(qs ? `/events?${qs}` : '/events', { scroll: false })
    }, 180)

    return () => {
      if (urlSyncTimer.current) clearTimeout(urlSyncTimer.current)
    }
  }, [query, pathname, router])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const handleChange = (value: string) => {
    setQuery(value)
    setOpen(true)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setOpen(false)
    const trimmed = query.trim()
    if (pathname === '/' || pathname === '/events') {
      document.getElementById('event-search-results')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
      return
    }
    router.push(trimmed ? `/events?search=${encodeURIComponent(trimmed)}` : '/events')
  }

  const handleClear = () => {
    clearQuery()
    setOpen(false)
    if (pathname === '/events') {
      const category = new URLSearchParams(window.location.search).get('category')
      router.replace(
        category ? `/events?category=${encodeURIComponent(category)}` : '/events',
        { scroll: false }
      )
    }
  }

  const handleSelect = (event: Event) => {
    setOpen(false)
    setSelectedEvent(event)
  }

  return (
    <div ref={rootRef} className={cn('relative w-full', className)}>
      <form
        onSubmit={handleSubmit}
        role="search"
        className={cn(
          'header-search-field relative transition-[border-color,box-shadow] duration-200',
          compact ? 'header-search-field--compact' : null
        )}
      >
        <Search
          className={cn(
            'pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-400',
            compact ? 'h-4 w-4' : 'h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]'
          )}
        />
        <Input
          type="text"
          value={query}
          onChange={(event) => handleChange(event.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search events..."
          aria-label="Search events"
          autoComplete="off"
          enterKeyHint="search"
          className={cn(
            'w-full border-0 bg-transparent pr-[5.5rem] text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0',
            compact
              ? 'h-10 pl-9 text-sm'
              : 'h-10 pl-9 text-sm sm:h-11 sm:pl-10 sm:text-[0.9375rem]'
          )}
        />
        <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
          {query ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              onClick={handleClear}
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          <Button
            type="submit"
            size="sm"
            className="h-7 bg-slate-900 px-3 text-xs font-medium text-white shadow-none hover:bg-slate-800"
          >
            Search
          </Button>
        </div>
      </form>

      {suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-[60] mt-1.5 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <ul className="max-h-[min(24rem,70vh)] overflow-y-auto" role="listbox">
            {suggestions.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(event)}
                  className="flex w-full items-center gap-3 border-b border-border/60 p-3 text-left transition-colors last:border-b-0 hover:bg-muted/50"
                >
                  <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                    {event.image_url ? (
                      <Image
                        src={event.image_url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Calendar className="h-4 w-4 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {event.name}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <Calendar className="h-3 w-3 shrink-0" />
                        <span className="truncate">{formatEventDate(event.date)}</span>
                      </span>
                      <span className="text-border">·</span>
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{event.venue}</span>
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          {results.length > suggestions.length && (
            <button
              type="button"
              className="w-full border-t border-border/60 bg-muted/30 px-3 py-2.5 text-center text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              onClick={() => {
                setOpen(false)
                if (pathname !== '/events') {
                  router.push(`/events?search=${encodeURIComponent(query.trim())}`)
                } else {
                  document.getElementById('event-search-results')?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  })
                }
              }}
            >
              See all {results.length} results
            </button>
          )}
        </div>
      )}

      {query.trim() && open && results.length === 0 && (
        <div className="absolute left-0 right-0 top-full z-[60] mt-1.5 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-2xl">
          No events match “{query.trim()}”
        </div>
      )}

      {selectedEvent && (
        <TicketPurchaseDialog
          key={selectedEvent.id}
          event={selectedEvent}
          onPurchaseComplete={() => setSelectedEvent(null)}
          trigger={null}
        />
      )}
    </div>
  )
}
