import { NextRequest, NextResponse } from 'next/server';
import { getOrdersByUser, getEventById, createOrder, createTickets, updateEventTickets } from '@/lib/supabase-db';
import { getSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer_id');

    // If customer_id is provided and user is admin, fetch for that customer
    // Otherwise fetch for current user
    const targetCustomerId = customerId || session.userId;
    const orders = await getOrdersByUser(targetCustomerId);

    return NextResponse.json(orders, { status: 200 });
  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { eventId, quantity } = body;

    if (!eventId || !quantity || quantity < 1) {
      return NextResponse.json(
        { error: 'Invalid event or quantity' },
        { status: 400 }
      );
    }

    // Get event details
    const event = await getEventById(eventId);

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.status !== 'approved') {
      return NextResponse.json(
        { error: 'Event not available for purchase' },
        { status: 400 }
      );
    }

    if (event.tickets_available < quantity) {
      return NextResponse.json(
        { error: 'Not enough tickets available' },
        { status: 400 }
      );
    }

    // Calculate total price
    const totalPrice = event.ticket_price * quantity;

    // Create order
    const order = await createOrder({
      event_id: eventId,
      user_id: session.userId,
      quantity,
      total_price: totalPrice,
      status: 'completed'
    });

    // Create tickets
    const ticketsData = Array.from({ length: quantity }).map(() => ({
      order_id: order.id,
      event_id: eventId,
      user_id: session.userId,
      event_name: event.name,
      organizer_name: event.organizer_name,
      organizer_logo_url: event.organizer_logo_url,
      sponsors: event.sponsors || [],
      ticket_type_id: undefined,
      ticket_type_name: undefined,
      ticket_price: event.ticket_price,
      status: 'valid' as const,
      qr_code: JSON.stringify({
        ticketId: order.id,
        eventId,
        userId: session.userId
      })
    }));

    const tickets = await createTickets(ticketsData);

    // Update available tickets
    await updateEventTickets(eventId, quantity);

    return NextResponse.json(
      {
        success: true,
        order: {
          id: order.id,
          eventId,
          quantity,
          totalPrice,
        },
        tickets: tickets.map(t => t.id)
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
