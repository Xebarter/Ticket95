import { Suspense } from 'react';
import { HeaderClient } from '@/components/layout/header-client';
import { Footer } from '@/components/layout/footer';
import { EventsPageClient } from './events-page-client';
import { EventGridSkeleton } from '@/components/events/event-grid-skeleton';
import { getApprovedEventsForLanding } from '@/lib/supabase-db';
import { cache } from 'react';
import type { Event } from '@/lib/supabase-client';

interface EventsPageProps {
  searchParams?: Promise<{
    search?: string;
    category?: string;
  }>;
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const unwrappedSearchParams = searchParams ? await searchParams : {};
  const searchQuery = unwrappedSearchParams?.search || '';
  const categoryQuery = unwrappedSearchParams?.category || '';

  // Cache the events fetch for request deduplication
  const getCachedEvents = cache(async () => {
    try {
      return await getApprovedEventsForLanding(50);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      return [] as Event[];
    }
  });

  const events = await getCachedEvents();

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <HeaderClient />

      <Suspense fallback={<div className="flex-1 py-8 sm:py-12"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><EventGridSkeleton /></div></div>}>
        <EventsPageClient
          initialEvents={events}
          initialSearch={searchQuery}
          initialCategory={categoryQuery}
        />
      </Suspense>

      <Footer />
    </main>
  );
}
