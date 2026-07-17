import { NextRequest, NextResponse } from 'next/server';
import { getPesapalTransactionStatus, isPesapalPaymentSuccessful } from '@/lib/pesapal';
import { supabaseAdmin } from '@/lib/supabase-admin';

type Selection = {
  ticketTypeId: string;
  ticketTypeName: string;
  ticketPrice: number;
  quantity: number;
};

async function getOrderByIdAdmin(orderId: string) {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

function getOrderCustomerEmail(order: any): string | null {
  const metadata = (order?.payment_metadata || {}) as {
    customer?: { email?: string | null };
  };
  return metadata.customer?.email || null;
}

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

async function updateOrderAdmin(orderId: string, orderData: Record<string, unknown>) {
  const { error } = await supabaseAdmin
    .from('orders')
    .update(orderData)
    .eq('id', orderId);

  if (error) throw error;
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
  const { error } = await supabaseAdmin
    .from('tickets')
    .insert(ticketsPayload);

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const orderTrackingId = body?.orderTrackingId as string | undefined;
    const orderId = (body?.orderId as string | undefined) || (body?.orderMerchantReference as string | undefined);

    if (!orderTrackingId || !orderId) {
      return NextResponse.json({ error: 'Missing verification details' }, { status: 400 });
    }

    const order = await getOrderByIdAdmin(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status === 'completed') {
      return NextResponse.json({
        success: true,
        status: 'completed',
        orderId: order.id,
        isGuest: !order.user_id,
        customerEmail: getOrderCustomerEmail(order),
      });
    }

    const statusPayload = await getPesapalTransactionStatus(orderTrackingId);
    const paymentStatus = statusPayload.payment_status_description || statusPayload.status || 'unknown';
    const paid = isPesapalPaymentSuccessful(paymentStatus);

    if (!paid) {
      await updateOrderAdmin(order.id, {
        status: paymentStatus.toLowerCase().includes('pending') ? 'pending' : 'failed',
        payment_tracking_id: orderTrackingId,
      });

      return NextResponse.json({
        success: false,
        status: paymentStatus,
        orderId: order.id,
      });
    }

    const event = await getEventByIdAdmin(order.event_id);
    if (!event) {
      return NextResponse.json({ error: 'Event not found for order' }, { status: 404 });
    }

    const metadata = (order.payment_metadata || {}) as { ticketSelections?: Selection[] };
    const selections = metadata.ticketSelections || [];
    if (!selections.length) {
      return NextResponse.json({ error: 'Missing ticket selection metadata' }, { status: 400 });
    }

    const totalQuantity = selections.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    if (totalQuantity < 1) {
      return NextResponse.json({ error: 'Invalid ticket selections' }, { status: 400 });
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
        return NextResponse.json(
          { error: `Ticket type not found: ${selection.ticketTypeName}` },
          { status: 400 }
        );
      }
      if (ticketType.available_quantity < selection.quantity) {
        return NextResponse.json(
          { error: `Not enough availability for ${selection.ticketTypeName}` },
          { status: 400 }
        );
      }

      await updateTicketTypeQuantityAdmin(selection.ticketTypeId, selection.quantity);

      for (let i = 0; i < selection.quantity; i++) {
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
    await updateOrderAdmin(order.id, {
      status: 'completed',
      payment_tracking_id: orderTrackingId,
      payment_merchant_reference: order.id,
      payment_metadata: {
        ...(order.payment_metadata || {}),
        verification: statusPayload,
      },
    });

    return NextResponse.json({
      success: true,
      status: paymentStatus,
      orderId: order.id,
      isGuest: !order.user_id,
      customerEmail: getOrderCustomerEmail(order),
    });
  } catch (error: any) {
    console.error('Pesapal verify error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
