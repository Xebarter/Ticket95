'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock3,
  MapPin,
  Ticket,
} from 'lucide-react'
import type { Event } from '@/lib/supabase-client'
import { getEventCategoryLabel } from '@/lib/event-categories'
import { formatDisplayPrice } from '@/lib/event-display'
import { cn } from '@/lib/utils'

interface FeaturedCarouselProps {
  events: Event[]
}

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
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function startingPrice(event: Event) {
  if (event.ticket_types && event.ticket_types.length > 0) {
    return Math.min(...event.ticket_types.map((t) => t.price || 0))
  }
  return event.ticket_price || 0
}

const AUTOPLAY_MS = 6000

export function FeaturedCarousel({ events }: FeaturedCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [progress, setProgress] = useState(0)
  const pauseReasons = useRef({ hover: false, focus: false })

  const syncAutoplay = useCallback(() => {
    const { hover, focus } = pauseReasons.current
    setIsAutoPlaying(!(hover || focus) && events.length > 1)
  }, [events.length])

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % events.length)
    setProgress(0)
  }, [events.length])

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + events.length) % events.length)
    setProgress(0)
  }, [events.length])

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
    setProgress(0)
  }

  useEffect(() => {
    if (!isAutoPlaying || events.length <= 1) {
      setProgress(0)
      return
    }

    const started = Date.now()
    const tick = window.setInterval(() => {
      const elapsed = Date.now() - started
      setProgress(Math.min(100, (elapsed / AUTOPLAY_MS) * 100))
    }, 50)

    const advance = window.setTimeout(nextSlide, AUTOPLAY_MS)

    return () => {
      window.clearInterval(tick)
      window.clearTimeout(advance)
    }
  }, [isAutoPlaying, currentIndex, events.length, nextSlide])

  useEffect(() => {
    if (events.length <= 1) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        nextSlide()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        prevSlide()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [events.length, nextSlide, prevSlide])

  if (events.length === 0) return null

  const event = events[currentIndex]
  const price = startingPrice(event)
  const available = Math.max(event.tickets_available || 0, 0)
  const total = event.total_tickets || 0
  const lowStock = available > 0 && available <= 50

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9A7B2F]">
            Featured
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Happening soon
          </h2>
        </div>
        {events.length > 1 ? (
          <p className="text-sm text-slate-500">
            {currentIndex + 1} of {events.length}
          </p>
        ) : null}
      </div>

      <div
        className="relative"
        onMouseEnter={() => {
          pauseReasons.current.hover = true
          syncAutoplay()
        }}
        onMouseLeave={() => {
          pauseReasons.current.hover = false
          syncAutoplay()
        }}
        onFocusCapture={() => {
          pauseReasons.current.focus = true
          syncAutoplay()
        }}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            pauseReasons.current.focus = false
            syncAutoplay()
          }
        }}
      >
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)]">
          <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
            {/* Media */}
            <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 lg:aspect-auto lg:min-h-[420px]">
              {event.image_url ? (
                <Image
                  key={event.id}
                  src={event.image_url}
                  alt={event.name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 58vw"
                  className="object-cover transition-transform duration-[1.2s] ease-out motion-safe:hover:scale-[1.02]"
                />
              ) : (
                <div className="flex h-full min-h-[280px] w-full items-center justify-center bg-slate-100 lg:min-h-[420px]">
                  <Ticket className="h-16 w-16 text-slate-300" />
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/15 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-slate-950/10" />

              <div className="absolute left-4 top-4 sm:left-5 sm:top-5">
                <span className="inline-flex items-center rounded-md border border-[#9A7B2F]/25 bg-white/95 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a6224] shadow-sm backdrop-blur-sm">
                  Featured
                </span>
              </div>

              {event.category ? (
                <div className="absolute bottom-4 left-4 sm:bottom-5 sm:left-5 lg:hidden">
                  <span className="rounded-md bg-black/45 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    {getEventCategoryLabel(event.category)}
                  </span>
                </div>
              ) : null}
            </div>

            {/* Details */}
            <div className="flex flex-col justify-between p-6 sm:p-8 lg:p-9">
              <div>
                {event.category ? (
                  <p className="mb-3 hidden text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 lg:block">
                    {getEventCategoryLabel(event.category)}
                  </p>
                ) : null}

                <h3 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem] sm:leading-tight">
                  {event.name}
                </h3>

                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-500 sm:text-[0.9375rem]">
                  {event.description ||
                    'An unforgettable experience worth securing your seat for.'}
                </p>

                <dl className="mt-6 space-y-3 border-t border-slate-100 pt-5">
                  <div className="flex items-start gap-3">
                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div>
                      <dt className="sr-only">Date</dt>
                      <dd className="text-sm font-medium text-slate-800">
                        {formatEventDate(event.date)}
                      </dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div>
                      <dt className="sr-only">Time</dt>
                      <dd className="text-sm font-medium text-slate-800">
                        {formatEventTime(event.date)}
                      </dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div>
                      <dt className="sr-only">Venue</dt>
                      <dd className="line-clamp-2 text-sm font-medium text-slate-800">
                        {event.venue}
                      </dd>
                    </div>
                  </div>
                </dl>

                <p className="mt-5 text-sm text-slate-500">
                  Hosted by{' '}
                  <span className="font-semibold text-slate-800">
                    {event.organizer_name}
                  </span>
                </p>
              </div>

              <div className="mt-8 border-t border-slate-100 pt-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      From
                    </p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                      {formatDisplayPrice(event.currency, price)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Available
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {available.toLocaleString()}
                      {total > 0 ? (
                        <span className="font-normal text-slate-400">
                          {' '}
                          / {total.toLocaleString()}
                        </span>
                      ) : null}
                    </p>
                  </div>
                </div>

                {lowStock ? (
                  <p className="mt-3 text-xs font-medium text-amber-700">
                    Limited tickets remaining
                  </p>
                ) : null}

                <Button
                  asChild
                  className="mt-5 h-11 w-full rounded-lg bg-slate-900 text-sm font-semibold text-white shadow-none hover:bg-slate-800"
                  size="lg"
                >
                  <Link href={`/events/${event.id}?tickets=1`}>
                    <Ticket className="mr-2 h-4 w-4" />
                    View tickets
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Autoplay progress */}
          {events.length > 1 ? (
            <div className="h-0.5 w-full bg-slate-100">
              <div
                className="h-full bg-[#9A7B2F]/70 transition-[width] duration-75 ease-linear"
                style={{ width: `${isAutoPlaying ? progress : 0}%` }}
              />
            </div>
          ) : null}
        </article>

        {/* Controls */}
        {events.length > 1 ? (
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={prevSlide}
                className="h-9 w-9 rounded-lg border-slate-200 bg-white text-slate-700 shadow-none hover:bg-slate-50"
                aria-label="Previous featured event"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={nextSlide}
                className="h-9 w-9 rounded-lg border-slate-200 bg-white text-slate-700 shadow-none hover:bg-slate-50"
                aria-label="Next featured event"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-1.5" role="tablist" aria-label="Featured slides">
              {events.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={index === currentIndex}
                  aria-label={`Show ${item.name}`}
                  onClick={() => goToSlide(index)}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    index === currentIndex
                      ? 'w-6 bg-slate-900'
                      : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                  )}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}
