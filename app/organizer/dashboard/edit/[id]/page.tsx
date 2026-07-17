'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/supabase-auth-context';
import { getEventById, getSponsorsByEvent, getTicketTypesByEvent } from '@/lib/supabase-db';
import { EventCreationWizard } from '@/components/organizer/event-creation-wizard';
import ProfileLayoutShell from '@/app/profile/ProfileLayoutShell';
import type { Event } from '@/lib/supabase-client';

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

type InitialEventData = {
  id?: string;
  name?: string;
  description?: string;
  date?: string;
  venue?: string;
  ticket_price?: number;
  total_tickets?: number;
  tickets_available?: number;
  organizer_name?: string;
  organizer_phone?: string;
  organizer_logo_url?: string;
  image_url?: string;
  image_urls?: string[];
};

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user } = useAuth();

  const [initialEvent, setInitialEvent] = useState<InitialEventData | undefined>(undefined);
  const [initialSponsors, setInitialSponsors] = useState<Array<{ id: string; name: string; logo?: string }> | undefined>(undefined);
  const [initialTicketTypes, setInitialTicketTypes] = useState<
    Array<{ id: string; name: string; description?: string; price: number; total_quantity: number; available_quantity: number; order_index: number }> | undefined
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

        setInitialEvent(event as unknown as Event);
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
        <div className="flex min-h-[320px] items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-muted-foreground">Loading event...</p>
          </div>
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
        onDone={() => router.push('/profile')}
      />
    </ProfileLayoutShell>
  );
}
