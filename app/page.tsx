import { FooterServer } from '@/components/layout/footer-server';
import { HeaderClient } from '@/components/layout/header-client';
import { HomeClient } from './home-client';
import { getApprovedEventsForLanding, getFeaturedEvents } from '@/lib/supabase-db';


import type { Event } from '@/lib/supabase-client';

export default async function Home() {
  let events: Event[];
  let featuredEvents: Event[];
  try {
    [events, featuredEvents] = await Promise.all([
      getApprovedEventsForLanding(),
      getFeaturedEvents()
    ]);
  } catch (error) {
    console.error('Failed to fetch events for landing page:', error);
    events = [];
    featuredEvents = [];
  }

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <HeaderClient />

      <HomeClient events={events} featuredEvents={featuredEvents} />

      <FooterServer />
    </main>
  );
}
