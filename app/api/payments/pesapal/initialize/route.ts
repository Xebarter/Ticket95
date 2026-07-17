import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { submitPesapalOrder } from '@/lib/pesapal';
import { supabaseAdmin } from '@/lib/supabase-admin';

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

async function getTicketTypesByEventAdmin(eventId: string) {
  const { data, error } = await supabaseAdmin
    .from('ticket_types')
    .select('*')
    .eq('event_id', eventId)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function createOrderAdmin(orderData: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .insert([orderData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateOrderAdmin(orderId: string, orderData: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .update(orderData)
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;
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

async function createTicketsAdmin(ticketsPayload: Record<string, unknown>[]) {
  const { error } = await supabaseAdmin
    .from('tickets')
    .insert(ticketsPayload);

  if (error) throw error;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    const body = await request.json();
    const eventId = body?.eventId as string;
    const selectedQuantities = (body?.selectedQuantities || {}) as Record<string, number>;
    const rawCustomerEmail = typeof body?.customerEmail === 'string' ? body.customerEmail.trim() : '';
    const rawCustomerName = typeof body?.customerName === 'string' ? body.customerName.trim() : '';
    const rawCustomerPhone = typeof body?.customerPhone === 'string' ? body.customerPhone.trim() : '';

    if (!eventId || !selectedQuantities || typeof selectedQuantities !== 'object') {
      return NextResponse.json({ error: 'Invalid checkout payload' }, { status: 400 });
    }

    const checkoutEmail = session?.email || rawCustomerEmail;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!checkoutEmail || !emailPattern.test(checkoutEmail)) {
      return NextResponse.json(
        { error: 'A valid email address is required to continue checkout.' },
        { status: 400 }
      );
    }

    const [derivedFirstName, ...remainingNameParts] = (rawCustomerName || checkoutEmail.split('@')[0] || 'Customer')
      .split(' ')
      .filter(Boolean);
    const firstName = derivedFirstName || 'Customer';
    const lastName = remainingNameParts.join(' ') || 'Guest';

    const event = await getEventByIdAdmin(eventId);
    if (!event || event.status !== 'approved') {
      return NextResponse.json({ error: 'Event not available for purchase' }, { status: 400 });
    }

    const ticketTypes = await getTicketTypesByEventAdmin(eventId);
    if (!ticketTypes.length) {
      return NextResponse.json({ error: 'No ticket types available for this event' }, { status: 400 });
    }

    const normalizedSelections = ticketTypes
      .map((ticketType) => ({
        ticketTypeId: ticketType.id,
        ticketTypeName: ticketType.name,
        ticketPrice: ticketType.price,
        quantity: Number(selectedQuantities[ticketType.id] || 0),
      }))
      .filter((selection) => selection.quantity > 0);

    if (!normalizedSelections.length) {
      return NextResponse.json({ error: 'Please select at least one ticket' }, { status: 400 });
    }

    for (const selection of normalizedSelections) {
      const ticketType = ticketTypes.find((ticket) => ticket.id === selection.ticketTypeId);
      if (!ticketType || selection.quantity > ticketType.available_quantity) {
        return NextResponse.json(
          { error: `Not enough availability for ${selection.ticketTypeName}` },
          { status: 400 }
        );
      }
    }

    const totalQuantity = normalizedSelections.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = normalizedSelections.reduce(
      (sum, item) => sum + item.quantity * item.ticketPrice,
      0
    );

    const order = await createOrderAdmin({
      event_id: eventId,
      user_id: session?.userId || null,
      quantity: totalQuantity,
      total_price: totalPrice,
      currency: event.currency || 'USD',
      status: 'pending',
      payment_provider: totalPrice <= 0 ? 'free' : 'pesapal',
      payment_metadata: {
        ticketSelections: normalizedSelections,
        customer: {
          email: checkoutEmail,
          name: rawCustomerName || null,
          phone: rawCustomerPhone || null,
          userId: session?.userId || null,
        },
      },
    });

    // Free checkout: complete immediately and skip Pesapal redirect.
    if (totalPrice <= 0) {
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
      for (const selection of normalizedSelections) {
        if (selection.quantity <= 0) continue;

        await updateTicketTypeQuantityAdmin(selection.ticketTypeId, selection.quantity);

        for (let i = 0; i < selection.quantity; i++) {
          ticketsPayload.push({
            order_id: order.id,
            event_id: eventId,
            user_id: session?.userId || null,
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
      await updateEventTicketsAdmin(eventId, totalQuantity);
      await updateOrderAdmin(order.id, {
        status: 'completed',
        payment_metadata: {
          ...(order.payment_metadata || {}),
          checkoutMode: 'free',
          completedAt: new Date().toISOString(),
        },
      });

      return NextResponse.json({
        success: true,
        freeCheckout: true,
        orderId: order.id,
        status: 'completed',
        redirectUrl: `/payment-complete?freeCheckout=1&guestCheckout=${session?.userId ? '0' : '1'}&orderId=${encodeURIComponent(order.id)}&customerEmail=${encodeURIComponent(checkoutEmail)}`,
      });
    }

    const pesapalOrder = await submitPesapalOrder({
      merchantReference: order.id,
      amount: totalPrice,
      currency: event.currency || 'USD',
      description: `Ticket purchase for ${event.name}`,
      email: checkoutEmail,
      firstName,
      lastName,
      phone: rawCustomerPhone || undefined,
    });

    await updateOrderAdmin(order.id, {
      payment_merchant_reference: pesapalOrder.merchant_reference || order.id,
      payment_tracking_id: pesapalOrder.order_tracking_id,
      payment_metadata: {
        ...(order.payment_metadata || {}),
        ticketSelections: normalizedSelections,
        pesapalInit: pesapalOrder,
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      redirectUrl: pesapalOrder.redirect_url,
      orderTrackingId: pesapalOrder.order_tracking_id,
      merchantReference: pesapalOrder.merchant_reference || order.id,
    });
  } catch (error: any) {
    console.error('Pesapal initialize error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to initialize payment' },
      { status: 500 }
    );
  }
}
