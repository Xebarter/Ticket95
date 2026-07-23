"use client";

import { Suspense, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FeaturedCarousel } from '@/components/home/featured-carousel';
import { EventGridClient } from '@/components/events/event-grid-client';
import { DiscoveryFilterNav } from '@/components/events/discovery-filter-nav';
import { useEventSearch } from '@/lib/event-search-context';
import { filterEvents } from '@/lib/event-search';
import {
  applyDiscoveryFilter,
  getDiscoveryFilterLabel,
  isDiscoveryFilterId,
} from '@/lib/event-discovery-filters';
import { useNearMeLocation } from '@/hooks/use-near-me-location';
import type { Event } from '@/lib/supabase-client';

interface HomeClientProps {
  events: Event[];
  featuredEvents: Event[];
}

function HomeBrowseSection({
  events,
  featuredEvents,
}: HomeClientProps) {
  const searchParams = useSearchParams();
  const { query, seedCatalog, catalog } = useEventSearch();

  const rawFilter = searchParams.get('filter');
  const discoveryFilter = isDiscoveryFilterId(rawFilter) ? rawFilter : null;
  const nearMeActive = discoveryFilter === 'near-me';
  const { status: nearMeStatus, context: nearMeContext, label: nearMeLabel, retry } =
    useNearMeLocation(nearMeActive);

  useEffect(() => {
    seedCatalog(events);
  }, [events, seedCatalog]);

  const trimmedQuery = query.trim();
  const sourceEvents =
    discoveryFilter && catalog.length > 0 ? catalog : events;

  const filteredEvents = useMemo(() => {
    const searched = filterEvents(sourceEvents, query);
    if (!discoveryFilter) return searched;
    if (discoveryFilter === 'near-me' && nearMeStatus === 'loading') {
      return [];
    }
    return applyDiscoveryFilter(searched, discoveryFilter, nearMeContext);
  }, [sourceEvents, query, discoveryFilter, nearMeContext, nearMeStatus]);

  const sectionTitle = trimmedQuery
    ? `Results for "${trimmedQuery}"`
    : discoveryFilter
      ? getDiscoveryFilterLabel(discoveryFilter)
      : 'Available events';

  const showFeatured = !trimmedQuery && !discoveryFilter && featuredEvents.length > 0;
  const showCount = Boolean(trimmedQuery || discoveryFilter);

  let emptyMessage = 'No events available at the moment.';
  if (trimmedQuery) {
    emptyMessage = `No events found matching "${trimmedQuery}"`;
  } else if (discoveryFilter === 'near-me') {
    if (nearMeStatus === 'loading') {
      emptyMessage = 'Finding events near you…';
    } else if (nearMeStatus === 'denied') {
      emptyMessage = 'Location access is needed to show events near you.';
    } else if (nearMeStatus === 'unavailable' || nearMeStatus === 'error') {
      emptyMessage = 'We couldn’t determine your location. Try again or browse all events.';
    } else if (nearMeLabel) {
      emptyMessage = `No upcoming events match venues near ${nearMeLabel}.`;
    } else {
      emptyMessage = 'No upcoming events found near you.';
    }
  } else if (discoveryFilter) {
    emptyMessage = `No events for ${getDiscoveryFilterLabel(discoveryFilter).toLowerCase()} right now.`;
  }

  return (
    <>
      {showFeatured && (
        <section className="border-b border-slate-100 bg-white py-10 sm:py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FeaturedCarousel events={featuredEvents} />
          </div>
        </section>
      )}

      <section id="event-search-results" className="flex-1 scroll-mt-24 bg-slate-50 py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9A7B2F]">
                Browse
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {sectionTitle}
              </h2>
              {discoveryFilter === 'near-me' && nearMeStatus === 'ready' && nearMeLabel ? (
                <p className="mt-1 text-sm text-slate-500">Near {nearMeLabel}</p>
              ) : null}
            </div>
            {showCount && (
              <p className="text-sm text-slate-500">
                {nearMeActive && nearMeStatus === 'loading'
                  ? 'Locating…'
                  : `${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''} found`}
              </p>
            )}
          </div>

          {!trimmedQuery && (
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
          )}

          <EventGridClient events={filteredEvents} interaction="split" />

          {filteredEvents.length === 0 && (
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
          )}
        </div>
      </section>
    </>
  );
}

export function HomeClient({ events, featuredEvents }: HomeClientProps) {
  return (
    <>
      <section className="border-b bg-gradient-to-br from-slate-50 to-blue-50 py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Discover Amazing Events
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Find concerts, conferences, workshops, and more. Book your tickets today!
          </p>
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
  );
}
