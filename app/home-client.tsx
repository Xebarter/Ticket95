'use client'

import { Suspense, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { FeaturedCarousel } from '@/components/home/featured-carousel'
import { HomeDiscoveryFeed } from '@/components/home/home-discovery-feed'
import { EventGridClient } from '@/components/events/event-grid-client'
import { DiscoveryFilterNav } from '@/components/events/discovery-filter-nav'
import { useEventSearch } from '@/lib/event-search-context'
import { filterEvents } from '@/lib/event-search'
import {
  applyDiscoveryFilter,
  getDiscoveryFilterLabel,
  isDiscoveryFilterId,
} from '@/lib/event-discovery-filters'
import { useNearMeLocation } from '@/hooks/use-near-me-location'
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus'
import type { Event } from '@/lib/supabase-client'

interface HomeClientProps {
  events: Event[]
  featuredEvents: Event[]
}

function HomeBrowseSection({ events, featuredEvents }: HomeClientProps) {
  const searchParams = useSearchParams()
  const { query, seedCatalog } = useEventSearch()
  useRefreshOnFocus()

  const rawFilter = searchParams.get('filter')
  const discoveryFilter = isDiscoveryFilterId(rawFilter) ? rawFilter : null
  const nearMeActive = discoveryFilter === 'near-me'
  const { status: nearMeStatus, context: nearMeContext, label: nearMeLabel, retry } =
    useNearMeLocation(nearMeActive)

  useEffect(() => {
    seedCatalog(events)
  }, [events, seedCatalog])

  const trimmedQuery = query.trim()
  const sourceEvents = events

  const filteredEvents = useMemo(() => {
    const searched = filterEvents(sourceEvents, query)
    if (!discoveryFilter) return searched
    if (discoveryFilter === 'near-me' && nearMeStatus === 'loading') {
      return []
    }
    return applyDiscoveryFilter(searched, discoveryFilter, nearMeContext)
  }, [sourceEvents, query, discoveryFilter, nearMeContext, nearMeStatus])

  const isFilteredBrowse = Boolean(trimmedQuery || discoveryFilter)
  const showFeatured = !trimmedQuery && !discoveryFilter && featuredEvents.length > 0

  const sectionTitle = trimmedQuery
    ? `Results for "${trimmedQuery}"`
    : discoveryFilter
      ? getDiscoveryFilterLabel(discoveryFilter)
      : 'Discover'

  let emptyMessage = 'No events available at the moment.'
  if (trimmedQuery) {
    emptyMessage = `No events found matching "${trimmedQuery}"`
  } else if (discoveryFilter === 'near-me') {
    if (nearMeStatus === 'loading') {
      emptyMessage = 'Finding events near you…'
    } else if (nearMeStatus === 'denied') {
      emptyMessage = 'Location access is needed to show events near you.'
    } else if (nearMeStatus === 'unavailable' || nearMeStatus === 'error') {
      emptyMessage = 'We couldn’t determine your location. Try again or browse all events.'
    } else if (nearMeLabel) {
      emptyMessage = `No upcoming events match venues near ${nearMeLabel}.`
    } else {
      emptyMessage = 'No upcoming events found near you.'
    }
  } else if (discoveryFilter) {
    emptyMessage = `No events for ${getDiscoveryFilterLabel(discoveryFilter).toLowerCase()} right now.`
  }

  return (
    <>
      {showFeatured ? (
        <section className="border-b border-slate-100 bg-white py-10 sm:py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FeaturedCarousel events={featuredEvents} />
          </div>
        </section>
      ) : null}

      <section
        id="event-search-results"
        className="flex-1 scroll-mt-24 bg-slate-50 py-12 sm:py-16"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9A7B2F]">
                {isFilteredBrowse ? 'Browse' : 'On Ticket95'}
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {sectionTitle}
              </h2>
              {discoveryFilter === 'near-me' && nearMeStatus === 'ready' && nearMeLabel ? (
                <p className="mt-1 text-sm text-slate-500">Near {nearMeLabel}</p>
              ) : !isFilteredBrowse ? (
                <p className="mt-1 max-w-xl text-sm text-slate-500">
                  Full event cards, image collections, and a continuous scroll through what’s live.
                </p>
              ) : null}
            </div>
            {isFilteredBrowse ? (
              <p className="text-sm text-slate-500">
                {nearMeActive && nearMeStatus === 'loading'
                  ? 'Locating…'
                  : `${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''} found`}
              </p>
            ) : null}
          </div>

          {!trimmedQuery ? (
            <div className="mb-8 hidden flex-wrap items-center gap-3 lg:flex">
              <DiscoveryFilterNav variant="chips" linkTarget="home" />
              {discoveryFilter ? (
                <Link
                  href="/"
                  scroll={false}
                  className="text-sm font-medium text-slate-500 underline-offset-4 transition-colors hover:text-slate-900 hover:underline"
                >
                  Clear
                </Link>
              ) : null}
            </div>
          ) : null}

          {isFilteredBrowse ? (
            <>
              <EventGridClient events={filteredEvents} interaction="split" />
              {filteredEvents.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-slate-500">{emptyMessage}</p>
                  {discoveryFilter === 'near-me' &&
                  (nearMeStatus === 'denied' ||
                    nearMeStatus === 'unavailable' ||
                    nearMeStatus === 'error') ? (
                    <button
                      type="button"
                      onClick={() => void retry()}
                      className="mt-4 text-sm font-medium text-slate-900 underline-offset-4 hover:underline"
                    >
                      Try again
                    </button>
                  ) : null}
                  {discoveryFilter ? (
                    <div className="mt-4">
                      <Link
                        href="/"
                        scroll={false}
                        className="text-sm font-medium text-slate-900 underline-offset-4 hover:underline"
                      >
                        Show all events
                      </Link>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <HomeDiscoveryFeed events={filteredEvents} />
          )}
        </div>
      </section>
    </>
  )
}

export function HomeClient({ events, featuredEvents }: HomeClientProps) {
  return (
    <>
      <section className="relative overflow-hidden border-b border-slate-200/80">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(154,123,47,0.12),_transparent_55%),linear-gradient(165deg,#f8fafc_0%,#eef2f7_45%,#f1f5f9_100%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(15,23,42,0.06) 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
          aria-hidden
        />

        <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-9">
          <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9A7B2F]">
              Event tickets
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.05]">
              Ticket<span className="text-[#9A7B2F]">95</span>.com
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-600 sm:text-base">
              Discover concerts, sports, and live experiences, then book in a few taps.
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="#event-search-results"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                Browse events
              </Link>
              <Link
                href="/events"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white/80 px-5 text-sm font-semibold text-slate-800 backdrop-blur-sm transition-colors hover:bg-white"
              >
                All listings
              </Link>
            </div>

            <div className="mt-5 hidden w-full lg:block">
              <Suspense fallback={null}>
                <DiscoveryFilterNav
                  variant="chips"
                  linkTarget="home"
                  className="justify-center"
                />
              </Suspense>
            </div>
          </div>
        </div>
      </section>

      <Suspense
        fallback={
          <section className="flex-1 bg-slate-50 py-12 sm:py-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-64 animate-pulse rounded-xl bg-slate-200" />
                ))}
              </div>
            </div>
          </section>
        }
      >
        <HomeBrowseSection events={events} featuredEvents={featuredEvents} />
      </Suspense>
    </>
  )
}
