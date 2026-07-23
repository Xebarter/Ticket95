import { supabaseAdmin } from '@/lib/supabase-admin';
import { getEventLifecycleStatus } from '@/lib/event-status';
import type { Event, Order, Sponsor, TicketType } from '@/lib/supabase-client';

export type AdminEventDetails = Event & {
  sponsors: Sponsor[];
  ticket_types: TicketType[];
  lifecycleStatus: ReturnType<typeof getEventLifecycleStatus>;
};

export type AdminEventStats = {
  orderCount: number;
  completedOrders: number;
  ticketCount: number;
  validTickets: number;
  usedTickets: number;
  revenue: number;
};

export async function getAdminEventDetails(eventId: string): Promise<{
  event: AdminEventDetails | null;
  stats: AdminEventStats;
  recentOrders: Pick<Order, 'id' | 'quantity' | 'total_price' | 'currency' | 'status' | 'created_at'>[];
}> {
  const emptyStats: AdminEventStats = {
    orderCount: 0,
    completedOrders: 0,
    ticketCount: 0,
    validTickets: 0,
    usedTickets: 0,
    revenue: 0,
  };

  const { data: event, error } = await supabaseAdmin
    .from('events')
    .select('*, sponsors(*), ticket_types(*)')
    .eq('id', eventId)
    .maybeSingle();

  if (error || !event) {
    if (error) console.error('getAdminEventDetails event error:', error);
    return { event: null, stats: emptyStats, recentOrders: [] };
  }

  const sponsors = Array.isArray(event.sponsors)
    ? [...event.sponsors].sort((a: Sponsor, b: Sponsor) => (a.order_index ?? 0) - (b.order_index ?? 0))
    : [];
  const ticketTypes = Array.isArray(event.ticket_types)
    ? [...event.ticket_types].sort((a: TicketType, b: TicketType) => (a.order_index ?? 0) - (b.order_index ?? 0))
    : [];

  const [{ data: orders }, { data: tickets }] = await Promise.all([
    supabaseAdmin
      .from('orders')
      .select('id, quantity, total_price, currency, status, created_at')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false }),
    supabaseAdmin.from('tickets').select('id, status').eq('event_id', eventId),
  ]);

  const orderRows = orders ?? [];
  const ticketRows = tickets ?? [];
  const completed = orderRows.filter((o) => o.status === 'completed');

  const stats: AdminEventStats = {
    orderCount: orderRows.length,
    completedOrders: completed.length,
    ticketCount: ticketRows.length,
    validTickets: ticketRows.filter((t) => t.status === 'valid').length,
    usedTickets: ticketRows.filter((t) => t.status === 'used').length,
    revenue: completed.reduce((sum, o) => sum + Number(o.total_price || 0), 0),
  };

  return {
    event: {
      ...(event as Event),
      sponsors,
      ticket_types: ticketTypes,
      lifecycleStatus: getEventLifecycleStatus(event as Event),
    },
    stats,
    recentOrders: orderRows.slice(0, 8),
  };
}

/**
 * Deletes an event and dependent rows that would otherwise block removal
 * (orders use ON DELETE RESTRICT).
 */
export async function deleteAdminEvent(eventId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: event, error: fetchError } = await supabaseAdmin
    .from('events')
    .select('id, name')
    .eq('id', eventId)
    .maybeSingle();

  if (fetchError || !event) {
    return { ok: false, error: 'Event not found' };
  }

  // Tickets → orders → event. Affiliate commissions cascade from orders.
  const { error: ticketsError } = await supabaseAdmin.from('tickets').delete().eq('event_id', eventId);
  if (ticketsError) {
    console.error('deleteAdminEvent tickets:', ticketsError);
    return { ok: false, error: `Failed to delete tickets: ${ticketsError.message}` };
  }

  const { error: ordersError } = await supabaseAdmin.from('orders').delete().eq('event_id', eventId);
  if (ordersError) {
    console.error('deleteAdminEvent orders:', ordersError);
    return { ok: false, error: `Failed to delete orders: ${ordersError.message}` };
  }

  const { error: eventError } = await supabaseAdmin.from('events').delete().eq('id', eventId);
  if (eventError) {
    console.error('deleteAdminEvent event:', eventError);
    return { ok: false, error: `Failed to delete event: ${eventError.message}` };
  }

  return { ok: true };
}
