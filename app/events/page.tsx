import type { Metadata } from 'next';
import { Suspense } from 'react';
import { HeaderClient } from '@/components/layout/header-client';
import { Footer } from '@/components/layout/footer';
import { EventsPageClient } from './events-page-client';
import { EventGridSkeleton } from '@/components/events/event-grid-skeleton';
import { getApprovedEventsForLanding } from '@/lib/supabase-db';
import { cache } from 'react';
import type { Event } from '@/lib/supabase-client';
import { getEventCategoryLabel, isEventCategoryId } from '@/lib/event-categories';
import { buildPageMetadata } from '@/lib/seo';
import {
  CATEGORY_KEYWORDS,
  EVENTS_LISTING_DESCRIPTION,
  LOCAL_SEO_KEYWORDS,
  uniqueKeywords,
} from '@/lib/seo-keywords';

export const dynamic = 'force-dynamic';

interface EventsPageProps {
  searchParams?: Promise<{
    search?: string;
    category?: string;
    filter?: string;
  }>;
}

export async function generateMetadata({ searchParams }: EventsPageProps): Promise<Metadata> {
  const query = searchParams ? await searchParams : {};
  const category = (query.category || '').trim();
  const search = (query.search || '').trim();

  if (isEventCategoryId(category)) {
    const label = getEventCategoryLabel(category);
    return buildPageMetadata({
      title: `${label} Events & Tickets in Uganda`,
      description: `Buy ${label.toLowerCase()} tickets online on Ticket95 — event ticketing for ${label.toLowerCase()} in Kampala and across Uganda. Digital tickets, QR code ticketing, and secure checkout.`,
      path: `/events?category=${encodeURIComponent(category)}`,
      keywords: uniqueKeywords([
        `${label} tickets`,
        `${label} Uganda`,
        `Kampala ${label.toLowerCase()}`,
        ...LOCAL_SEO_KEYWORDS.slice(0, 8),
        ...CATEGORY_KEYWORDS.slice(0, 8),
      ]),
    });
  }

  if (search) {
    return buildPageMetadata({
      title: `Events matching “${search.slice(0, 60)}”`,
      description: `Find events related to “${search.slice(0, 80)}” and buy tickets online on Ticket95.`,
      path: `/events?search=${encodeURIComponent(search)}`,
      noIndex: true,
    });
  }

  return buildPageMetadata({
    title: 'Uganda Events — Buy Tickets Online',
    description: EVENTS_LISTING_DESCRIPTION,
    path: '/events',
    keywords: uniqueKeywords([
      ...LOCAL_SEO_KEYWORDS,
      ...CATEGORY_KEYWORDS.slice(0, 16),
      'buy tickets online',
      'event tickets',
      'Ticket95',
    ]),
  });
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
