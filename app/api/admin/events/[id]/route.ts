import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/session';
import { deleteAdminEvent } from '@/lib/admin-event-details';
import { clampAffiliateCommissionPercent } from '@/lib/affiliate-constants';

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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: eventId } = await params;

    const result = await deleteAdminEvent(eventId);
    if (!result.ok) {
      const status = result.error === 'Event not found' ? 404 : 500;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/events/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { eventData, ticketTypes, sponsors } = body;
    const { id: eventId } = await params;

    if (!eventData || typeof eventData !== 'object') {
      return NextResponse.json({ error: 'eventData is required' }, { status: 400 });
    }

    // Only persist real event columns — ignore client-only fields like lifecycleStatus.
    const allowedFields = [
      'name',
      'description',
      'date',
      'end_date',
      'venue',
      'currency',
      'category',
      'ticket_price',
      'total_tickets',
      'tickets_available',
      'organizer_name',
      'organizer_phone',
      'organizer_logo_url',
      'image_url',
      'image_urls',
      'status',
      'rejection_reason',
      'is_featured',
      'affiliates_enabled',
      'affiliate_commission_percent',
    ] as const;

    const sanitizedEventData: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(eventData, key) && eventData[key] !== undefined) {
        sanitizedEventData[key] = eventData[key];
      }
    }

    if (sanitizedEventData.affiliate_commission_percent != null) {
      sanitizedEventData.affiliate_commission_percent = clampAffiliateCommissionPercent(
        sanitizedEventData.affiliate_commission_percent
      );
    }

    if (Object.keys(sanitizedEventData).length === 0) {
      return NextResponse.json({ error: 'No valid event fields to update' }, { status: 400 });
    }

    const { data: updatedEvent, error: eventError } = await supabaseAdmin
      .from('events')
      .update(sanitizedEventData)
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

    // Delete existing ticket types for this event
    const { error: deleteTicketTypesError } = await supabaseAdmin
      .from('ticket_types')
      .delete()
      .eq('event_id', eventId);

    if (deleteTicketTypesError) {
      console.error('Error deleting old ticket types:', deleteTicketTypesError);
    }

    // Insert new ticket types
    if (ticketTypes && ticketTypes.length > 0) {
      const ticketTypesWithEventId = ticketTypes.map((tt: any) => ({
        ...tt,
        event_id: eventId,
      }));

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
    }

    // Delete existing sponsors for this event
    const { error: deleteSponsorsError } = await supabaseAdmin
      .from('sponsors')
      .delete()
      .eq('event_id', eventId);

    if (deleteSponsorsError) {
      console.error('Error deleting old sponsors:', deleteSponsorsError);
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
