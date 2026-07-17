import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { getNowIso } from '@/lib/event-status';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = searchParams.get('limit');

    // Build the query - fetch only essential fields for performance
    let query = supabase
      .from('events')
      .select(`
        id,
        name,
        description,
        date,
        venue,
        image_url,
        organizer_id,
        organizer_name,
        organizer_logo_url,
        status,
        currency,
        ticket_price,
        total_tickets,
        tickets_available
      `);

    const nowIso = getNowIso();

    // Apply filters
    if (status) {
      query = query.eq('status', status);
      if (status === 'approved') {
        query = query.gt('date', nowIso);
      }
    }

    // Apply search filter
    if (search) {
      const searchTerm = search.toLowerCase().trim();
      query = query.or(
        `name.ilike.%${searchTerm}%,venue.ilike.%${searchTerm}%,organizer_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
      );
    }

    // Apply ordering
    query = query.order('date', { ascending: true });

    // Apply limit
    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum) && limitNum > 0) {
        query = query.limit(limitNum);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || [], { status: 200 });
  } catch (error) {
    console.error('Get events error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Keep existing POST implementation
  try {
    const body = await request.json();
    const {
      name,
      description,
      date,
      venue,
      ticketTypes,
      organizerName,
      organizerLogoUrl,
      currency = 'USD',
      sponsors = [],
    } = body;

    if (!name || !date || !venue || !ticketTypes || ticketTypes.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate total tickets and starting price
    const totalTickets = ticketTypes.reduce((sum: number, tt: any) => sum + (tt.quantity || 0), 0);
    const startingPrice = Math.min(...ticketTypes.map((tt: any) => tt.price || 0));

    // Create event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert([
        {
          name,
          description: description || null,
          date,
          venue,
          organizer_name: organizerName,
          organizer_logo_url: organizerLogoUrl || null,
          currency,
          ticket_price: startingPrice,
          total_tickets: totalTickets,
          tickets_available: totalTickets,
          status: 'approved', // For simplicity, approve all events
        }
      ])
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
    const ticketTypesData = ticketTypes.map((tt: any) => ({
      event_id: event.id,
      name: tt.name,
      description: tt.description || null,
      price: tt.price || 0,
      total_quantity: tt.quantity || 0,
      available_quantity: tt.quantity || 0,
      order_index: tt.orderIndex || 0,
    }));

    const { error: ticketTypesError } = await supabase
      .from('ticket_types')
      .insert(ticketTypesData);

    if (ticketTypesError) {
      console.error('Error creating ticket types:', ticketTypesError);
      // Rollback: delete the event
      await supabase.from('events').delete().eq('id', event.id);
      return NextResponse.json(
        { error: 'Failed to create ticket types', details: ticketTypesError.message },
        { status: 500 }
      );
    }

    // Create sponsors if provided
    if (sponsors.length > 0) {
      const sponsorsData = sponsors.map((sponsor: any, index: number) => ({
        event_id: event.id,
        name: sponsor.name,
        logo_url: sponsor.logoUrl || null,
        order_index: index,
      }));

      const { error: sponsorsError } = await supabase
        .from('sponsors')
        .insert(sponsorsData);

      if (sponsorsError) {
        console.error('Error creating sponsors:', sponsorsError);
        // Continue anyway - sponsors are optional
      }
    }

    return NextResponse.json(
      {
        success: true,
        event
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create event error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
