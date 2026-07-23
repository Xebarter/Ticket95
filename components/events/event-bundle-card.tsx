'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Ticket } from 'lucide-react'
import type { Event } from '@/lib/supabase-client'
import { getEventCategoryLabel } from '@/lib/event-categories'
import { formatDisplayPrice } from '@/lib/event-display'
import { cn } from '@/lib/utils'

function startingPrice(event: Event) {
  if (event.ticket_types && event.ticket_types.length > 0) {
    return Math.min(...event.ticket_types.map((t) => t.price || 0))
  }
  return event.ticket_price || 0
}

function formatShortDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

type EventBundleTileProps = {
  event: Event
  onSelect?: (event: Event) => void
}

export function EventBundleTile({ event, onSelect }: EventBundleTileProps) {
  const price = startingPrice(event)
  const available = Math.max(event.tickets_available || 0, 0)
  const soldOut = available === 0 && (event.total_tickets || 0) > 0

  return (
    <button
      type="button"
      onClick={() => onSelect?.(event)}
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-xl text-left',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400'
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">
        {event.image_url ? (
          <Image
            src={event.image_url}
            alt={event.name}
            fill
            sizes="(max-width: 640px) 45vw, 220px"
            className="object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Ticket className="h-8 w-8 text-slate-300" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
        {event.category ? (
          <span className="absolute left-2 top-2 rounded-md border border-white/25 bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-700 shadow-sm backdrop-blur-sm">
            {getEventCategoryLabel(event.category)}
          </span>
        ) : null}
        {soldOut ? (
          <span className="absolute right-2 top-2 rounded-md bg-slate-900/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
            Sold out
          </span>
        ) : null}
      </div>

      <div className="mt-2.5 min-w-0 px-0.5">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900 transition-colors group-hover:text-slate-700">
          {event.name}
        </h3>
        <p className="mt-1 truncate text-xs text-slate-500">
          {formatShortDate(event.date)}
          {event.venue ? ` · ${event.venue}` : ''}
        </p>
        <p className="mt-1.5 text-sm font-bold tabular-nums text-slate-900">
          From {formatDisplayPrice(event.currency, price)}
        </p>
      </div>
    </button>
  )
}

type EventBundleCardProps = {
  events: Event[]
  onSelectEvent?: (event: Event) => void
  title?: string
}

export function EventBundleCard({ events, onSelectEvent, title }: EventBundleCardProps) {
  if (!events.length) return null

  const sharedCategory =
    events.length > 1 && events.every((e) => e.category && e.category === events[0].category)
      ? events[0].category
      : null

  const heading =
    title ||
    (sharedCategory ? getEventCategoryLabel(sharedCategory) : 'Coming up')

  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-slate-200 bg-white',
        'shadow-[0_1px_2px_rgba(15,23,42,0.04)]'
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A7B2F]">
            Collection
          </p>
          <h2 className="mt-0.5 text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
            {heading}
          </h2>
        </div>
        {sharedCategory ? (
          <Link
            href={`/events?category=${encodeURIComponent(sharedCategory)}`}
            className="shrink-0 text-xs font-semibold text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
          >
            View all
          </Link>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 p-3 sm:gap-4 sm:p-5">
        {events.slice(0, 4).map((event) => (
          <EventBundleTile key={event.id} event={event} onSelect={onSelectEvent} />
        ))}
      </div>
    </section>
  )
}
