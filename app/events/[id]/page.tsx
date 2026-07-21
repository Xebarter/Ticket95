import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getEventById, getTicketTypesForEvent } from '@/lib/supabase-db';
import { TicketPurchaseDialog } from '@/components/events/ticket-purchase-dialog';
import { AffiliateRefCapture } from '@/components/affiliates/affiliate-ref-capture';
import { HeaderClient } from '@/components/layout/header-client';
import { Footer } from '@/components/layout/footer';
import Image from 'next/image';
import { Calendar, MapPin, ShieldCheck } from 'lucide-react';

interface EventPageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default async function EventPage({ params }: EventPageProps) {
  const resolved = await Promise.resolve(params);
  const event = await getEventById(resolved.id);
  if (!event) {
    notFound();
  }

  const ticketTypes = await getTicketTypesForEvent(resolved.id);

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <HeaderClient />

      <Suspense fallback={null}>
        <AffiliateRefCapture />
      </Suspense>

      <div className="py-12 sm:py-16 flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-4">{event.name}</h1>

          {event.image_url && (
            <div className="relative h-64 sm:h-80 mb-6">
              <Image
                src={event.image_url}
                alt={event.name}
                fill
                className="object-cover rounded-lg"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
            <div className="inline-flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(event.date).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              <span>{event.venue}</span>
            </div>
            <div className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Verified organizer</span>
            </div>
          </div>

          <p className="mb-8 text-muted-foreground">{event.description}</p>

          <TicketPurchaseDialog event={event} ticketTypes={ticketTypes} />
        </div>
      </div>

      <Footer />
    </main>
  );
}
