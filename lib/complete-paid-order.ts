import { supabaseAdmin } from '@/lib/supabase-admin';

type OrderRow = {
  id: string;
  status: string;
  event_id: string;
  user_id: string | null;
  payment_metadata: Record<string, unknown> | null;
};

type TicketSelection = {
  ticketTypeId: string;
  ticketTypeName: string;
  ticketPrice: number;
  quantity: number;
};

async function getEventByIdAdmin(eventId: string) {
  const { data, error } = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

async function getTicketTypeByIdAdmin(ticketTypeId: string) {
  const { data, error } = await supabaseAdmin
    .from('ticket_types')
    .select('*')
    .eq('id', ticketTypeId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

async function updateTicketTypeQuantityAdmin(ticketTypeId: string, quantitySold: number) {
  const { data: ticketType, error: fetchError } = await supabaseAdmin
    .from('ticket_types')
    .select('available_quantity')
    .eq('id', ticketTypeId)
    .single();

  if (fetchError) throw fetchError;

  const newAvailable = Math.max(0, (ticketType?.available_quantity || 0) - quantitySold);
  const { error: updateError } = await supabaseAdmin
    .from('ticket_types')
    .update({ available_quantity: newAvailable })
    .eq('id', ticketTypeId);

  if (updateError) throw updateError;
}

async function createTicketsAdmin(ticketsPayload: Record<string, unknown>[]) {
  const { error } = await supabaseAdmin.from('tickets').insert(ticketsPayload);
  if (error) throw error;
}

async function updateEventTicketsAdmin(eventId: string, quantity: number) {
  const { data: event, error: fetchError } = await supabaseAdmin
    .from('events')
    .select('tickets_available')
    .eq('id', eventId)
    .single();

  if (fetchError) throw fetchError;

  const newAvailable = Math.max(0, (event?.tickets_available || 0) - quantity);
  const { error: updateError } = await supabaseAdmin
    .from('events')
    .update({ tickets_available: newAvailable })
    .eq('id', eventId);

  if (updateError) throw updateError;
}

export async function completePaidOrder(order: OrderRow) {
  if (order.status === 'completed') {
    return { alreadyCompleted: true };
  }

  const metadata = (order.payment_metadata || {}) as {
    ticketSelections?: TicketSelection[];
  };

  const selections = metadata.ticketSelections || [];
  if (!selections.length) {
    throw new Error('Missing ticket selection metadata');
  }

  const event = await getEventByIdAdmin(order.event_id);
  if (!event) {
    throw new Error('Event not found for order');
  }

  const totalQuantity = selections.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  if (totalQuantity < 1) {
    throw new Error('Invalid ticket selections');
  }

  const ticketsPayload: Array<{
    order_id: string;
    event_id: string;
    user_id: string | null;
    event_name: string;
    organizer_name: string;
    organizer_logo_url?: string;
    sponsors: Array<{ name: string; logo_url?: string }>;
    ticket_type_id?: string;
    ticket_type_name?: string;
    ticket_price?: number;
    status: 'valid';
    qr_code: string;
  }> = [];

  let ticketIndex = 0;
  for (const selection of selections) {
    if (selection.quantity <= 0) continue;

    const ticketType = await getTicketTypeByIdAdmin(selection.ticketTypeId);
    if (!ticketType) {
      throw new Error(`Ticket type not found: ${selection.ticketTypeName}`);
    }

    if (ticketType.available_quantity < selection.quantity) {
      throw new Error(`Not enough availability for ${selection.ticketTypeName}`);
    }

    await updateTicketTypeQuantityAdmin(selection.ticketTypeId, selection.quantity);

    for (let i = 0; i < selection.quantity; i += 1) {
      ticketsPayload.push({
        order_id: order.id,
        event_id: order.event_id,
        user_id: order.user_id,
        event_name: event.name,
        organizer_name: event.organizer_name,
        organizer_logo_url: event.organizer_logo_url,
        sponsors: event.sponsors || [],
        ticket_type_id: selection.ticketTypeId,
        ticket_type_name: selection.ticketTypeName,
        ticket_price: selection.ticketPrice,
        status: 'valid',
        qr_code: JSON.stringify({
          orderId: order.id,
          ticketIndex: ticketIndex++,
          ticketTypeId: selection.ticketTypeId,
        }),
      });
    }
  }

  await createTicketsAdmin(ticketsPayload);
  await updateEventTicketsAdmin(order.event_id, totalQuantity);

  const { error: updateOrderError } = await supabaseAdmin
    .from('orders')
    .update({ status: 'completed' })
    .eq('id', order.id);

  if (updateOrderError) throw updateOrderError;

  return { alreadyCompleted: false };
}
