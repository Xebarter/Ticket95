import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/session';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id: eventId } = await params;

    const { data: event, error } = await supabaseAdmin
      .from('events')
      .select('*, sponsors(*), ticket_types(*)')
      .eq('id', eventId)
      .single();

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch event: ${error.message}`, details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Error in GET /api/admin/events/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const body = await request.json();
    console.log('Update request body:', JSON.stringify(body, null, 2));
    
    const { eventData, ticketTypes, sponsors } = body;
    const { id: eventId } = await params;
    
    console.log('Updating event:', eventId);

    // Update event using admin client (bypasses RLS)
    const { data: updatedEvent, error: eventError } = await supabaseAdmin
      .from('events')
      .update(eventData)
      .eq('id', eventId)
      .select()
      .single();

    if (eventError) {
      console.error('Error updating event:', eventError);
      return NextResponse.json(
        { error: `Failed to update event: ${eventError.message}`, details: eventError },
        { status: 500 }
      );
    }
    
    console.log('Event updated successfully:', updatedEvent.id);

    // Delete existing ticket types for this event
    console.log('Deleting old ticket types for event:', eventId);
    const { error: deleteTicketTypesError } = await supabaseAdmin
      .from('ticket_types')
      .delete()
      .eq('event_id', eventId);

    if (deleteTicketTypesError) {
      console.error('Error deleting old ticket types:', deleteTicketTypesError);
      // Continue anyway, we'll try to insert new ones
    } else {
      console.log('Old ticket types deleted successfully');
    }

    // Insert new ticket types
    if (ticketTypes && ticketTypes.length > 0) {
      const ticketTypesWithEventId = ticketTypes.map((tt: any) => ({
        ...tt,
        event_id: eventId,
      }));

      console.log('Inserting new ticket types:', ticketTypesWithEventId);
      const { error: ticketTypesError } = await supabaseAdmin
        .from('ticket_types')
        .insert(ticketTypesWithEventId);

      if (ticketTypesError) {
        console.error('Error inserting ticket types:', ticketTypesError);
        return NextResponse.json(
          { error: `Failed to update ticket types: ${ticketTypesError.message}`, details: ticketTypesError },
          { status: 500 }
        );
      }
      console.log('Ticket types inserted successfully');
    }

    // Delete existing sponsors for this event
    const { error: deleteSponsorsError } = await supabaseAdmin
      .from('sponsors')
      .delete()
      .eq('event_id', eventId);

    if (deleteSponsorsError) {
      console.error('Error deleting old sponsors:', deleteSponsorsError);
      // Continue anyway
    }

    // Insert new sponsors (if any)
    if (sponsors && sponsors.length > 0) {
      const sponsorsWithEventId = sponsors.map((sponsor: any) => ({
        ...sponsor,
        event_id: eventId,
      }));

      const { error: sponsorsError } = await supabaseAdmin
        .from('sponsors')
        .insert(sponsorsWithEventId);

      if (sponsorsError) {
        console.error('Error inserting sponsors:', sponsorsError);
        // Sponsors are optional, so we don't fail the whole update
      }
    }

    return NextResponse.json({
      success: true,
      event: updatedEvent,
    });
  } catch (error) {
    console.error('Error in PUT /api/admin/events/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
