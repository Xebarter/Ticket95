"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { EventGridClient } from '@/components/events/event-grid-client';
import { DiscoveryFilterNav } from '@/components/events/discovery-filter-nav';
import { Button } from '@/components/ui/button';
import { Search, Filter } from 'lucide-react';
import { useEventSearch } from '@/lib/event-search-context';
import { filterEvents } from '@/lib/event-search';
import {
  applyDiscoveryFilter,
  getDiscoveryFilterLabel,
  isDiscoveryFilterId,
} from '@/lib/event-discovery-filters';
import {
  getEventCategoryLabel,
  isEventCategoryId,
  type EventCategoryId,
} from '@/lib/event-categories';
import { useNearMeLocation } from '@/hooks/use-near-me-location';
import type { Event } from '@/lib/supabase-client';

interface EventsPageClientProps {
  initialEvents: Event[];
  initialSearch: string;
  initialCategory?: string;
}

export function EventsPageClient({
  initialEvents,
  initialSearch,
  initialCategory = '',
}: EventsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { query, setQuery, clearQuery, seedCatalog, catalog } = useEventSearch();
  const [events] = useState<Event[]>(initialEvents);
  const hydrated = useRef(false);

  const categoryParam = searchParams.get('category') ?? initialCategory;
  const category: EventCategoryId | null = isEventCategoryId(categoryParam)
    ? categoryParam
    : null;

  const rawFilter = searchParams.get('filter');
  const discoveryFilter = isDiscoveryFilterId(rawFilter) ? rawFilter : null;
  const nearMeActive = discoveryFilter === 'near-me';
  const { status: nearMeStatus, context: nearMeContext, label: nearMeLabel, retry } =
    useNearMeLocation(nearMeActive);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    if (initialSearch.trim()) {
      setQuery(initialSearch.trim());
    }
  }, [initialSearch, setQuery]);

  useEffect(() => {
    const onPopState = () => {
      const fromUrl = new URLSearchParams(window.location.search).get('search') || '';
      setQuery(fromUrl);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [setQuery]);

  useEffect(() => {
    seedCatalog(events);
  }, [events, seedCatalog]);

  const sourceEvents = catalog.length > events.length ? catalog : events;

  const filteredEvents = useMemo(() => {
    const searched = filterEvents(sourceEvents, query, category);
    if (!discoveryFilter) return searched;
    if (discoveryFilter === 'near-me' && nearMeStatus === 'loading') {
      return [];
    }
    return applyDiscoveryFilter(searched, discoveryFilter, nearMeContext);
  }, [sourceEvents, query, category, discoveryFilter, nearMeContext, nearMeStatus]);

  const trimmedQuery = query.trim();

  const handleClearFilters = () => {
    clearQuery();
    router.replace('/events', { scroll: false });
  };

  const title = trimmedQuery
    ? `Results for "${trimmedQuery}"`
    : discoveryFilter
      ? getDiscoveryFilterLabel(discoveryFilter)
      : category
        ? getEventCategoryLabel(category)
        : 'Discover Amazing Events';

  const hasActiveFilters = Boolean(trimmedQuery || category || discoveryFilter);

  let emptyDetail = 'Check back soon for upcoming events.';
  if (trimmedQuery) {
    emptyDetail = `We couldn't find any events matching "${trimmedQuery}". Try adjusting your search terms.`;
  } else if (discoveryFilter === 'near-me') {
    if (nearMeStatus === 'loading') {
      emptyDetail = 'Finding events near you…';
    } else if (nearMeStatus === 'denied') {
      emptyDetail = 'Location access is needed to show events near you.';
    } else if (nearMeStatus === 'unavailable' || nearMeStatus === 'error') {
      emptyDetail = 'We couldn’t determine your location. Try again or clear the filter.';
    } else if (nearMeLabel) {
      emptyDetail = `No upcoming events match venues near ${nearMeLabel}.`;
    } else {
      emptyDetail = 'No upcoming events found near you.';
    }
  } else if (discoveryFilter) {
    emptyDetail = `No events for ${getDiscoveryFilterLabel(discoveryFilter).toLowerCase()} right now.`;
  } else if (category) {
    emptyDetail = `No ${getEventCategoryLabel(category).toLowerCase()} are listed right now.`;
  }

  return (
    <div id="event-search-results" className="flex-1 scroll-mt-24 py-8 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            {hasActiveFilters
              ? nearMeActive && nearMeStatus === 'loading'
                ? 'Locating…'
                : `${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''} found`
              : 'Find concerts, conferences, workshops, and more. Book your tickets today!'}
          </p>
          {discoveryFilter === 'near-me' && nearMeStatus === 'ready' && nearMeLabel ? (
            <p className="mt-1 text-sm text-slate-500">Near {nearMeLabel}</p>
          ) : null}
        </div>

        <div className="mb-10 hidden flex-wrap items-center justify-center gap-3 lg:flex">
          <DiscoveryFilterNav variant="chips" linkTarget="events" className="justify-center" />
          {discoveryFilter ? (
            <Link
              href={category ? `/events?category=${category}` : '/events'}
              scroll={false}
              className="text-sm font-medium text-slate-500 underline-offset-4 transition-colors hover:text-slate-900 hover:underline"
            >
              Clear filter
            </Link>
          ) : null}
        </div>

        {filteredEvents.length > 0 ? (
          <EventGridClient events={filteredEvents} interaction="split" />
        ) : (
          <div className="py-16 text-center">
            <div className="mx-auto max-w-md">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">
                {hasActiveFilters ? 'No events found' : 'No events available'}
              </h3>
              <p className="mb-6 text-muted-foreground">{emptyDetail}</p>
              {discoveryFilter === 'near-me' &&
              (nearMeStatus === 'denied' ||
                nearMeStatus === 'unavailable' ||
                nearMeStatus === 'error') ? (
                <Button variant="outline" onClick={() => void retry()} className="mb-3 gap-2">
                  Try again
                </Button>
              ) : null}
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  className="gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
