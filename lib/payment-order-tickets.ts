import { supabaseAdmin } from '@/lib/supabase-admin';

export type PaymentOrderTicketsPayload = {
  tickets: Array<Record<string, unknown>>;
  event: {
    id: string;
    name: string;
    date: string;
    venue: string;
    organizer_name: string;
    organizer_logo_url?: string | null;
    image_url?: string | null;
    image_urls?: string[] | null;
    sponsors: Array<{ name: string; logo_url?: string | null }>;
  } | null;
  order: {
    isGuest: boolean;
    customerEmail: string | null;
    isFree: boolean;
  };
};

/**
 * Load tickets + event + sponsors for a completed order (shared by tickets API, verify, initialize).
 */
export async function getPaymentOrderTicketsPayload(options: {
  orderId: string;
  userId?: string | null;
  paymentProvider?: string | null;
  paymentMetadata?: Record<string, unknown> | null;
  eventId?: string | null;
}): Promise<PaymentOrderTicketsPayload> {
  const { orderId, userId, paymentProvider, paymentMetadata, eventId } = options;

  const customerEmail =
    (paymentMetadata as { customer?: { email?: string | null } } | null)?.customer?.email || null;
  const isFreeProvider = String(paymentProvider || '').toLowerCase() === 'free';

  const { data: tickets, error: ticketsError } = await supabaseAdmin
    .from('tickets')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  if (ticketsError) throw ticketsError;

  let event: PaymentOrderTicketsPayload['event'] = null;
  let eventSponsors: Array<{ name: string; logo_url?: string | null }> = [];

  if (eventId) {
    const [{ data: eventRow }, { data: sponsorRows }] = await Promise.all([
      supabaseAdmin
        .from('events')
        .select('id, name, date, venue, organizer_name, organizer_logo_url, image_url, image_urls')
        .eq('id', eventId)
        .maybeSingle(),
      supabaseAdmin
        .from('sponsors')
        .select('name, logo_url')
        .eq('event_id', eventId)
        .order('order_index', { ascending: true }),
    ]);

    eventSponsors = (sponsorRows || []).map((sponsor) => ({
      name: sponsor.name,
      logo_url: sponsor.logo_url || undefined,
    }));

    if (eventRow) {
      event = {
        ...eventRow,
        sponsors: eventSponsors,
      };
    }
  }

  const ticketsWithDetails = (tickets || []).map((ticket) => {
    const ticketSponsors = Array.isArray(ticket.sponsors) ? ticket.sponsors : [];
    return {
      ...ticket,
      organizer_name: ticket.organizer_name || event?.organizer_name || '',
      organizer_logo_url: ticket.organizer_logo_url || event?.organizer_logo_url || null,
      sponsors: ticketSponsors.length > 0 ? ticketSponsors : eventSponsors,
    };
  });

  return {
    tickets: ticketsWithDetails,
    event,
    order: {
      isGuest: !userId,
      customerEmail,
      isFree: isFreeProvider,
    },
  };
}
