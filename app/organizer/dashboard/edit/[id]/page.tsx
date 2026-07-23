'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/supabase-auth-context';
import { getEventById, getSponsorsByEvent, getTicketTypesByEvent } from '@/lib/supabase-db';
import { EventCreationWizard } from '@/components/organizer/event-creation-wizard';
import ProfileLayoutShell from '@/app/profile/ProfileLayoutShell';
import type { EventCategoryId } from '@/lib/event-categories';

type SponsorRow = { id: string; name: string; logo_url?: string };
type TicketTypeRow = {
  id: string;
  name: string;
  description?: string;
  price: number;
  total_quantity: number;
  available_quantity: number;
  order_index: number;
};

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user } = useAuth();

  const [initialEvent, setInitialEvent] = useState<
    | {
        id: string;
        name: string;
        description?: string;
        date: string;
        end_date?: string | null;
        venue: string;
        currency?: string;
        category?: EventCategoryId;
        ticket_price: number;
        total_tickets: number;
        tickets_available: number;
        organizer_name: string;
        organizer_phone?: string;
        organizer_logo_url?: string;
        image_url?: string;
        image_urls?: string[];
        status: 'pending' | 'approved' | 'rejected';
        rejection_reason?: string | null;
        affiliates_enabled?: boolean;
        affiliate_commission_percent?: number;
      }
    | undefined
  >(undefined);
  const [initialSponsors, setInitialSponsors] = useState<
    Array<{ id: string; name: string; logo?: string }> | undefined
  >(undefined);
  const [initialTicketTypes, setInitialTicketTypes] = useState<
    | Array<{
        id: string;
        name: string;
        description?: string;
        price: number;
        total_quantity: number;
        available_quantity: number;
        order_index: number;
      }>
    | undefined
  >(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        if (!user) {
          router.push('/login?redirect=/profile');
          return;
        }

        const eventId = params?.id;
        if (!eventId) return;

        const event = await getEventById(eventId);
        if (!event) {
          router.push('/profile');
          return;
        }

        if (event.organizer_id !== user.id) {
          router.push('/profile');
          return;
        }

        const [sponsors, ticketTypes] = await Promise.all([
          getSponsorsByEvent(eventId),
          getTicketTypesByEvent(eventId),
        ]);

        setInitialEvent({
          id: event.id,
          name: event.name,
          description: event.description,
          date: event.date,
          end_date: event.end_date,
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
          affiliate_commission_percent: event.affiliate_commission_percent,
        });
        setInitialSponsors(
          (sponsors as SponsorRow[]).map((s) => ({
            id: s.id,
            name: s.name,
            logo: s.logo_url,
          }))
        );
        setInitialTicketTypes(
          (ticketTypes as TicketTypeRow[]).map((ticketType) => ({
            id: ticketType.id,
            name: ticketType.name,
            description: ticketType.description,
            price: ticketType.price,
            total_quantity: ticketType.total_quantity,
            available_quantity: ticketType.available_quantity,
            order_index: ticketType.order_index,
          }))
        );
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [params?.id, router, user]);

  if (loading) {
    return (
      <ProfileLayoutShell>
        <div className="flex min-h-[280px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </ProfileLayoutShell>
    );
  }

  return (
    <ProfileLayoutShell>
      <EventCreationWizard
        mode="edit"
        eventId={params.id}
        initialEvent={initialEvent}
        initialSponsors={initialSponsors}
        initialTicketTypes={initialTicketTypes}
        onDone={() => router.push('/profile/events')}
      />
    </ProfileLayoutShell>
  );
}
