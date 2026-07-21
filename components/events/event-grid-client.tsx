'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { Calendar, MapPin, Clock3, Ticket, ArrowRight } from 'lucide-react'
import type { Event } from '@/lib/supabase-client'
import { getEventCategoryLabel } from '@/lib/event-categories'
import { cn } from '@/lib/utils'

const TicketPurchaseDialog = dynamic(
  () =>
    import('@/components/events/ticket-purchase-dialog').then(
      (mod) => mod.TicketPurchaseDialog
    ),
  { ssr: false }
)

function formatEventDate(dateString: string): string {
  const date = new Date(dateString)
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

function formatEventTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatCurrencyAmount(currency: string | undefined, amount: number) {
  const safeCurrency = currency || 'USD'
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: safeCurrency,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${safeCurrency} ${Math.floor(amount).toLocaleString()}`
  }
}

function startingPrice(event: Event) {
  if (event.ticket_types && event.ticket_types.length > 0) {
    const prices = event.ticket_types.map((t) => t.price || 0)
    return Math.min(...prices)
  }
  return event.ticket_price || 0
}

interface EventGridProps {
  events: Event[]
}

type PublicEventCardProps = {
  event: Event
  idx?: number
  onClick?: () => void
}

export function PublicEventCard({ event, idx = 0, onClick }: PublicEventCardProps) {
  const ticketCount = event.ticket_types?.length || 0
  const price = startingPrice(event)
  const available = Math.max(event.tickets_available || 0, 0)
  const lowStock = available > 0 && available <= 50
  const soldOut = available === 0 && (event.total_tickets || 0) > 0

  return (
    <article
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white',
        'shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[border-color,box-shadow,transform] duration-300',
        'hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]',
        'focus-within:border-slate-300 focus-within:shadow-[0_8px_24px_rgba(15,23,42,0.08)]',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
    >
      <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-slate-100">
        {event.image_url ? (
          <Image
            src={event.image_url}
            alt={event.name}
            fill
            priority={idx < 3}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.03]"
            {...(idx < 3 ? {} : { loading: 'lazy' as const })}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100">
            <Ticket className="h-10 w-10 text-slate-300" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent" />

        {event.category ? (
          <div className="absolute left-3 top-3">
            <span className="inline-flex rounded-md border border-white/20 bg-white/95 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-700 shadow-sm backdrop-blur-sm">
              {getEventCategoryLabel(event.category)}
            </span>
          </div>
        ) : null}

        {soldOut ? (
          <div className="absolute right-3 top-3">
            <span className="rounded-md bg-slate-900/90 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
              Sold out
            </span>
          </div>
        ) : lowStock ? (
          <div className="absolute right-3 top-3">
            <span className="rounded-md border border-amber-200/80 bg-amber-50/95 px-2 py-1 text-[11px] font-semibold text-amber-800 shadow-sm backdrop-blur-sm">
              Limited
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex-1">
          <h3 className="line-clamp-2 min-h-[3.25rem] text-lg font-semibold leading-snug tracking-tight text-slate-900 transition-colors group-hover:text-slate-700">
            {event.name}
          </h3>

          <p className="mt-2 truncate text-sm text-slate-500">
            Hosted by{' '}
            <span className="font-medium text-slate-700">{event.organizer_name}</span>
          </p>

          <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2.5 text-sm text-slate-600">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <dt className="sr-only">Date</dt>
              <dd>{formatEventDate(event.date)}</dd>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-slate-600">
              <Clock3 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <dt className="sr-only">Time</dt>
              <dd>{formatEventTime(event.date)}</dd>
            </div>
            <div className="flex min-w-0 items-center gap-2.5 text-sm text-slate-600">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <dt className="sr-only">Venue</dt>
              <dd className="truncate">{event.venue}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-5 flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              From
            </p>
            <p className="mt-0.5 text-lg font-bold tracking-tight text-slate-900">
              {formatCurrencyAmount(event.currency, price)}
            </p>
          </div>

          <div
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors',
              soldOut
                ? 'bg-slate-100 text-slate-500'
                : 'bg-slate-900 text-white group-hover:bg-slate-800'
            )}
          >
            <span>{soldOut ? 'View details' : ticketCount > 0 ? 'View tickets' : 'View event'}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </article>
  )
}

export function EventGridClient({ events }: EventGridProps) {
  const [activeEvent, setActiveEvent] = React.useState<Event | null>(null)
  const [dialogKey, setDialogKey] = React.useState(0)

  React.useEffect(() => {
    const handlePopState = () => {
      if (activeEvent) setActiveEvent(null)
    }

    if (activeEvent) {
      window.addEventListener('popstate', handlePopState)
    }

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [activeEvent])

  const openEvent = (event: Event) => {
    setDialogKey((prev) => prev + 1)
    setActiveEvent(event)
  }

  const closeDialog = () => {
    setActiveEvent(null)
  }

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
        <Ticket className="mx-auto mb-4 h-10 w-10 text-slate-300" />
        <h3 className="text-lg font-semibold text-slate-900">No events available</h3>
        <p className="mt-1 text-sm text-slate-500">
          Check back soon for upcoming events
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {events.map((event, idx) => (
          <PublicEventCard
            key={event.id}
            event={event}
            idx={idx}
            onClick={() => openEvent(event)}
          />
        ))}
      </div>

      {activeEvent ? (
        <TicketPurchaseDialog
          key={dialogKey}
          event={activeEvent}
          onPurchaseComplete={closeDialog}
          onDialogClose={closeDialog}
          trigger={null}
        />
      ) : null}
    </>
  )
}
