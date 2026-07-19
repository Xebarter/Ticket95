"use client";

import { useEffect, useMemo } from 'react';
import { FeaturedCarousel } from '@/components/home/featured-carousel';
import { EventGridClient } from '@/components/events/event-grid-client';
import { useEventSearch } from '@/lib/event-search-context';
import type { Event } from '@/lib/supabase-client';

interface HomeClientProps {
  events: Event[];
  featuredEvents: Event[];
}

export function HomeClient({ events, featuredEvents }: HomeClientProps) {
  const { query, seedCatalog, filter } = useEventSearch();

  useEffect(() => {
    seedCatalog(events);
  }, [events, seedCatalog]);

  const filteredEvents = useMemo(() => filter(events), [events, filter]);
  const trimmedQuery = query.trim();

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

      {!trimmedQuery && featuredEvents.length > 0 && (
        <section className="bg-background py-8 sm:py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FeaturedCarousel events={featuredEvents} />
          </div>
        </section>
      )}

      <section id="event-search-results" className="flex-1 scroll-mt-24 bg-muted/30 py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {trimmedQuery
                ? `Results for "${trimmedQuery}"`
                : 'All Available Events'}
            </h2>
            {trimmedQuery && (
              <p className="text-sm text-muted-foreground">
                {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} found
              </p>
            )}
          </div>

          <EventGridClient events={filteredEvents} />

          {filteredEvents.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">
                {trimmedQuery
                  ? `No events found matching "${trimmedQuery}"`
                  : 'No events available at the moment.'}
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
