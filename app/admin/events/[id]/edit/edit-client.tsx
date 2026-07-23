'use client';

import { useRouter } from 'next/navigation';
import { EventCreationWizard } from '@/components/organizer/event-creation-wizard';
import type { AdminEventDetails } from '@/lib/admin-event-details';

export default function AdminEditEventClient({ event }: { event: AdminEventDetails }) {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-5xl">
      <EventCreationWizard
      mode="edit"
      context="admin"
      eventId={event.id}
      initialEvent={{
        id: event.id,
        name: event.name,
        description: event.description,
        date: event.date,
        venue: event.venue,
        currency: event.currency,
        category: event.category,
        ticket_price: event.ticket_price,
        total_tickets: event.total_tickets,
        tickets_available: event.tickets_available,
        organizer_name: event.organizer_name,
        organizer_phone: event.organizer_phone,
        organizer_logo_url: event.organizer_logo_url,
        image_url: event.image_url,
        image_urls: event.image_urls,
        status: event.status,
        rejection_reason: event.rejection_reason,
        affiliates_enabled: event.affiliates_enabled,
        is_featured: event.is_featured,
      }}
      initialSponsors={event.sponsors.map((sponsor) => ({
        id: sponsor.id,
        name: sponsor.name,
        logo: sponsor.logo_url,
      }))}
      initialTicketTypes={event.ticket_types.map((ticketType) => ({
        id: ticketType.id,
        name: ticketType.name,
        description: ticketType.description,
        price: ticketType.price,
        total_quantity: ticketType.total_quantity,
        available_quantity: ticketType.available_quantity,
        order_index: ticketType.order_index,
      }))}
      onCancel={() => router.push(`/admin/events/${event.id}`)}
      onDone={() => router.push(`/admin/events/${event.id}`)}
    />
    </div>
  );
}
