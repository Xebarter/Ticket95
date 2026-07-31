'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowRight, Calendar, MapPin, Search, Ticket, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useEventSearch } from '@/lib/event-search-context'
import { getEventCategoryLabel } from '@/lib/event-categories'
import { formatDisplayPrice } from '@/lib/event-display'
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

function startingPrice(event: Event) {
  if (event.ticket_types && event.ticket_types.length > 0) {
    return Math.min(...event.ticket_types.map((t) => t.price || 0))
  }
  return event.ticket_price || 0
}

function SearchSuggestionCard({
  event,
  onSelect,
}: {
  event: Event
  onSelect: (event: Event) => void
}) {
  const available = Math.max(event.tickets_available || 0, 0)
  const soldOut = available === 0 && (event.total_tickets || 0) > 0
  const price = startingPrice(event)

  return (
    <button
      type="button"
      onClick={() => onSelect(event)}
      className={cn(
        'group flex w-full items-stretch gap-3 rounded-xl p-2 text-left transition-colors',
        'hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none',
        'focus-visible:ring-2 focus-visible:ring-[#9A7B2F]/25'
      )}
    >
      <div className="relative h-[4.5rem] w-[5.5rem] shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:h-20 sm:w-28">
        {event.image_url ? (
          <Image
            src={event.image_url}
            alt=""
            fill
            className="object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.04]"
            sizes="112px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Ticket className="h-5 w-5 text-slate-300" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent" />
        {event.category ? (
          <span className="absolute left-1.5 top-1.5 max-w-[calc(100%-0.75rem)] truncate rounded-md border border-white/25 bg-white/95 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-700 shadow-sm backdrop-blur-sm">
            {getEventCategoryLabel(event.category)}
          </span>
        ) : null}
        {soldOut ? (
          <span className="absolute bottom-1.5 left-1.5 rounded-md bg-slate-900/90 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
            Sold out
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center py-0.5">
        <p className="line-clamp-2 text-sm font-semibold leading-snug tracking-tight text-slate-900 transition-colors group-hover:text-slate-700">
          {event.name}
        </p>
        <div className="mt-1.5 space-y-1">
          <p className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
            <Calendar className="h-3 w-3 shrink-0 text-slate-400" />
            <span className="truncate">{formatEventDate(event.date)}</span>
          </p>
          <p className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
            <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
            <span className="truncate">{event.venue}</span>
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end justify-between py-0.5 pl-1">
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            From
          </p>
          <p className="mt-0.5 text-sm font-bold tabular-nums tracking-tight text-slate-900">
            {soldOut ? '—' : formatDisplayPrice(event.currency, price)}
          </p>
        </div>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 opacity-0 shadow-sm transition-all group-hover:opacity-100 group-focus-visible:opacity-100">
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  )
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

  const trimmedQuery = query.trim()

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

      {suggestions.length > 0 ? (
        <div className="absolute left-0 right-0 top-full z-[60] mt-2 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.14)]">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5 sm:px-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A7B2F]">
              Suggestions
            </p>
            <p className="text-[11px] tabular-nums text-slate-400">
              {results.length} match{results.length === 1 ? '' : 'es'}
            </p>
          </div>
          <ul className="max-h-[min(28rem,70vh)] space-y-0.5 overflow-y-auto p-1.5" role="listbox">
            {suggestions.map((event) => (
              <li key={event.id} role="option">
                <SearchSuggestionCard event={event} onSelect={handleSelect} />
              </li>
            ))}
          </ul>
          {results.length > suggestions.length ? (
            <button
              type="button"
              className="flex w-full items-center justify-center gap-1.5 border-t border-slate-100 bg-slate-50/80 px-3 py-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
              onClick={() => {
                setOpen(false)
                if (pathname !== '/events') {
                  router.push(`/events?search=${encodeURIComponent(trimmedQuery)}`)
                } else {
                  document.getElementById('event-search-results')?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  })
                }
              }}
            >
              See all {results.length} results
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      ) : null}

      {trimmedQuery && open && results.length === 0 ? (
        <div className="absolute left-0 right-0 top-full z-[60] mt-2 overflow-hidden rounded-2xl border border-slate-200/90 bg-white px-4 py-5 shadow-[0_12px_40px_rgba(15,23,42,0.14)]">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-900">No matching events</p>
            <p className="mt-1 max-w-[16rem] text-xs leading-relaxed text-slate-500">
              Nothing matched “{trimmedQuery}”. Try another name, venue, or organizer.
            </p>
          </div>
        </div>
      ) : null}

      {selectedEvent ? (
        <TicketPurchaseDialog
          key={selectedEvent.id}
          event={selectedEvent}
          onPurchaseComplete={() => setSelectedEvent(null)}
          trigger={null}
        />
      ) : null}
    </div>
  )
}
