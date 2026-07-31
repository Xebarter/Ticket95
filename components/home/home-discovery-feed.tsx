'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Ticket } from 'lucide-react'
import { PublicEventCard } from '@/components/events/event-grid-client'
import { ImageEventMosaic } from '@/components/events/event-bundle-card'
import { HomeImageRail } from '@/components/home/home-image-rail'
import {
  buildHomeDiscoveryFeed,
  HOME_FEED_BATCH_SIZE,
  HOME_FEED_INITIAL_BLOCKS,
  type HomeFeedBlock,
} from '@/lib/home-feed'
import { cn } from '@/lib/utils'
import type { Event } from '@/lib/supabase-client'

const TicketPurchaseDialog = dynamic(
  () =>
    import('@/components/events/ticket-purchase-dialog').then(
      (mod) => mod.TicketPurchaseDialog
    ),
  { ssr: false }
)

type HomeDiscoveryFeedProps = {
  events: Event[]
}

function FeedBlockView({
  block,
  onSelect,
  cardOffset,
}: {
  block: HomeFeedBlock
  onSelect: (event: Event) => void
  cardOffset: number
}) {
  if (block.type === 'cards') {
    return (
      <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {block.events.map((event, idx) => (
          <PublicEventCard
            key={event.id}
            event={event}
            idx={cardOffset + idx}
            onClick={() => onSelect(event)}
            detailsHref={`/events/${event.id}`}
          />
        ))}
      </div>
    )
  }

  if (block.type === 'mosaic') {
    return <ImageEventMosaic events={block.events} onSelectEvent={onSelect} />
  }

  return <HomeImageRail events={block.events} onSelectEvent={onSelect} />
}

export function HomeDiscoveryFeed({ events }: HomeDiscoveryFeedProps) {
  const blocks = useMemo(() => buildHomeDiscoveryFeed(events), [events])
  const [visibleCount, setVisibleCount] = useState(HOME_FEED_INITIAL_BLOCKS)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const [activeEvent, setActiveEvent] = useState<Event | null>(null)
  const [dialogKey, setDialogKey] = useState(0)

  useEffect(() => {
    setVisibleCount(HOME_FEED_INITIAL_BLOCKS)
  }, [events])

  useEffect(() => {
    const handlePopState = () => {
      if (activeEvent) setActiveEvent(null)
    }
    if (activeEvent) {
      window.addEventListener('popstate', handlePopState)
    }
    return () => window.removeEventListener('popstate', handlePopState)
  }, [activeEvent])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || visibleCount >= blocks.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((current) =>
            Math.min(current + HOME_FEED_BATCH_SIZE, blocks.length)
          )
        }
      },
      { rootMargin: '280px 0px' }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [blocks.length, visibleCount])

  const openPurchaseDialog = (event: Event) => {
    setDialogKey((prev) => prev + 1)
    setActiveEvent(event)
  }

  const closeDialog = () => setActiveEvent(null)

  if (!events.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
        <Ticket className="mx-auto mb-4 h-10 w-10 text-slate-300" />
        <h3 className="text-lg font-semibold text-slate-900">No events available</h3>
        <p className="mt-1 text-sm text-slate-500">Check back soon for upcoming events</p>
      </div>
    )
  }

  const visibleBlocks = blocks.slice(0, visibleCount)
  let cardOffset = 0

  return (
    <>
      <div className="space-y-8 sm:space-y-10">
        {visibleBlocks.map((block, index) => {
          const offset = cardOffset
          if (block.type === 'cards') {
            cardOffset += block.events.length
          }
          return (
            <div
              key={block.id}
              className={cn(
                'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-500',
                index === 0 && 'motion-safe:delay-0'
              )}
            >
              <FeedBlockView
                block={block}
                onSelect={openPurchaseDialog}
                cardOffset={offset}
              />
            </div>
          )
        })}
      </div>

      {visibleCount < blocks.length ? (
        <div
          ref={sentinelRef}
          className="flex h-16 items-center justify-center"
          aria-hidden
        >
          <div className="h-1.5 w-16 animate-pulse rounded-full bg-slate-200" />
        </div>
      ) : null}

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
