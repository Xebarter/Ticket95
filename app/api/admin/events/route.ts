import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/session';
import type { Event, TicketType, Sponsor } from '@/lib/supabase-client';

// GET handler for minimal event data
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const fields = searchParams
      .get('fields')
      ?.split(',')
      .map((f) => f.trim())
      .filter(Boolean);

    // Build a lean, projection-based query so we only fetch the
    // columns the admin dashboard actually needs.
    let query = supabaseAdmin.from('events');

    if (fields && fields.length > 0) {
      query = query.select(fields.join(','));
    } else {
      // Fallback for callers that don't specify fields
      query = query.select('*');
    }

    // Consistent ordering: newest events first for admin views
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching admin events:', error);
      return NextResponse.json(
        { error: 'Failed to fetch events', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ events: data ?? [] });
  } catch (error: any) {
    console.error('Unexpected admin events error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message ?? String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { eventData, ticketTypes, sponsors } = body;

    // Validate required fields
    if (!eventData || !eventData.name || !eventData.date || !eventData.venue || !eventData.organizer_name) {
      return NextResponse.json(
        { error: 'Missing required event fields' },
        { status: 400 }
      );
    }

    if (!ticketTypes || ticketTypes.length === 0) {
      return NextResponse.json(
        { error: 'At least one ticket type is required' },
        { status: 400 }
      );
    }

    // Calculate ticket_price and total_tickets from ticket types
    const ticketPrice = Math.min(...ticketTypes.map((tt: any) => tt.price));
    const totalTickets = ticketTypes.reduce((sum: number, tt: any) => sum + tt.total_quantity, 0);

    // Add calculated fields to eventData
    const eventDataWithPrices = {
      ...eventData,
      ticket_price: ticketPrice,
      total_tickets: totalTickets,
      tickets_available: totalTickets
    };

    // Create event using admin client (bypasses RLS)
    const { data: createdEvent, error: eventError } = await supabaseAdmin
      .from('events')
      .insert([eventDataWithPrices])
      .select()
      .single();

    if (eventError) {
      console.error('Error creating event:', eventError);
      return NextResponse.json(
        { error: 'Failed to create event', details: eventError.message },
        { status: 500 }
      );
    }

    // Create ticket types
    const ticketTypesWithEventId = ticketTypes.map((tt: any) => ({
      ...tt,
      event_id: createdEvent.id,
      available_quantity: tt.total_quantity // Set available_quantity equal to total_quantity initially
    }));

    const { error: ticketTypesError } = await supabaseAdmin
      .from('ticket_types')
      .insert(ticketTypesWithEventId);

    if (ticketTypesError) {
      console.error('Error creating ticket types:', ticketTypesError);
      // Rollback: delete the event
      await supabaseAdmin.from('events').delete().eq('id', createdEvent.id);
      return NextResponse.json(
        { error: 'Failed to create ticket types', details: ticketTypesError.message },
        { status: 500 }
      );
    }

    // Create sponsors if provided
    if (sponsors && sponsors.length > 0) {
      const sponsorsWithEventId = sponsors.map((sponsor: any) => ({
        ...sponsor,
        event_id: createdEvent.id
      }));

      const { error: sponsorsError } = await supabaseAdmin
        .from('sponsors')
        .insert(sponsorsWithEventId);

      if (sponsorsError) {
        console.error('Error creating sponsors:', sponsorsError);
        // Continue anyway - sponsors are optional
      }
    }

    return NextResponse.json(
      {
        success: true,
        event: createdEvent
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Admin create event error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
