import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getServerAuthUser } from '@/lib/server-auth';

type EventRecord = {
  id: string;
  organizer_id: string;
};

async function getOwnedEvent(eventId: string, userId: string, role: string) {
  const { data, error } = await supabaseAdmin
    .from('events')
    .select('id, organizer_id')
    .eq('id', eventId)
    .single<EventRecord>();
  if (error || !data) return null;
  if (role !== 'admin' && data.organizer_id !== userId) return null;
  return data;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getServerAuthUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const eventId = String(body?.eventId || '').trim();
    const ticketId = String(body?.ticketId || '').trim();

    if (!eventId || !ticketId) {
      return NextResponse.json({ error: 'Event and ticket are required' }, { status: 400 });
    }

    const event = await getOwnedEvent(eventId, auth.userId, auth.role);
    if (!event) {
      return NextResponse.json({ error: 'Invalid verification link.' }, { status: 404 });
    }

    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('tickets')
      .select('id, event_id, status')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    if (ticket.event_id !== event.id) {
      return NextResponse.json({ error: 'Ticket does not belong to this event' }, { status: 400 });
    }

    if (ticket.status !== 'valid') {
      return NextResponse.json({ error: `Ticket cannot be marked used (${ticket.status})` }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('tickets')
      .update({
        status: 'used',
        checked_in_at: nowIso,
      })
      .eq('id', ticketId)
      .eq('event_id', event.id)
      .eq('status', 'valid')
      .select('id, status, updated_at, checked_in_at')
      .single();

    if (updateError || !updated) {
      return NextResponse.json({ error: 'Ticket was already updated. Please scan again.' }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      message: 'Ticket marked as used.',
      ticket: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
