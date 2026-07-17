import { HeaderClient } from '@/components/layout/header-client';
import { Footer } from '@/components/layout/footer';
import { EventsPageClient } from './events-page-client';
import { getApprovedEventsForLanding } from '@/lib/supabase-db';
import { cache } from 'react';
import type { Event } from '@/lib/supabase-client';

interface EventsPageProps {
  searchParams?: Promise<{
    search?: string;
  }>;
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const unwrappedSearchParams = searchParams ? await searchParams : {};
  const searchQuery = unwrappedSearchParams?.search || '';

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

      <EventsPageClient
        initialEvents={events}
        initialSearch={searchQuery}
      />

      <Footer />
    </main>
  );
}
