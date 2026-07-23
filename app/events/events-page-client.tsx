"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EventGridClient } from '@/components/events/event-grid-client';
import { Button } from '@/components/ui/button';
import { Search, Filter } from 'lucide-react';
import { useEventSearch } from '@/lib/event-search-context';
import { filterEvents } from '@/lib/event-search';
import {
  getEventCategoryLabel,
  isEventCategoryId,
  type EventCategoryId,
} from '@/lib/event-categories';
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
  const { query, setQuery, clearQuery, seedCatalog } = useEventSearch();
  const [events] = useState<Event[]>(initialEvents);
  const hydrated = useRef(false);

  const categoryParam = searchParams.get('category') ?? initialCategory;
  const category: EventCategoryId | null = isEventCategoryId(categoryParam)
    ? categoryParam
    : null;

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

  const filteredEvents = useMemo(
    () => filterEvents(events, query, category),
    [events, query, category]
  );
  const trimmedQuery = query.trim();

  const handleClearSearch = () => {
    clearQuery();
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    const qs = params.toString();
    router.replace(qs ? `/events?${qs}` : '/events', { scroll: false });
  };

  const title = trimmedQuery
    ? `Results for "${trimmedQuery}"`
    : category
      ? getEventCategoryLabel(category)
      : 'Discover Amazing Events';

  return (
    <div id="event-search-results" className="flex-1 scroll-mt-24 py-8 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            {trimmedQuery || category
              ? `${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''} found`
              : 'Find concerts, conferences, workshops, and more. Book your tickets today!'}
          </p>
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
                {trimmedQuery || category ? 'No events found' : 'No events available'}
              </h3>
              <p className="mb-6 text-muted-foreground">
                {trimmedQuery
                  ? `We couldn't find any events matching "${trimmedQuery}". Try adjusting your search terms.`
                  : category
                    ? `No ${getEventCategoryLabel(category).toLowerCase()} are listed right now.`
                    : 'Check back soon for upcoming events.'}
              </p>
              {(trimmedQuery || category) && (
                <Button
                  variant="outline"
                  onClick={handleClearSearch}
                  className="gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Clear Search
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
