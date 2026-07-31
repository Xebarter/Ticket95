'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Ticket } from 'lucide-react'
import type { Event } from '@/lib/supabase-client'
import { cn } from '@/lib/utils'

type HomeImageRailProps = {
  events: Event[]
  onSelectEvent?: (event: Event) => void
  className?: string
}

/** Continuous horizontal image strip. Pauses on hover/focus; respects reduced motion. */
export function HomeImageRail({ events, onSelectEvent, className }: HomeImageRailProps) {
  const [paused, setPaused] = useState(false)
  const tiles = events.filter((event) => Boolean((event.image_url || '').trim()))
  if (tiles.length < 4) return null

  // Duplicate for seamless loop
  const loop = [...tiles, ...tiles]

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100',
        'shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
        className
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setPaused(false)
        }
      }}
    >
      <div
        className={cn(
          'home-image-rail flex w-max gap-1.5 py-1.5 pl-1.5',
          paused && 'home-image-rail--paused'
        )}
        aria-hidden={false}
      >
        {loop.map((event, index) => (
          <button
            key={`${event.id}-${index}`}
            type="button"
            onClick={() => onSelectEvent?.(event)}
            aria-label={event.name}
            className={cn(
              'relative h-28 w-40 shrink-0 overflow-hidden rounded-xl bg-slate-200 sm:h-32 sm:w-48',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2'
            )}
          >
            {event.image_url ? (
              <Image
                src={event.image_url}
                alt=""
                fill
                sizes="192px"
                className="object-cover"
                loading="lazy"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center">
                <Ticket className="h-6 w-6 text-slate-300" />
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
