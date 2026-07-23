import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getServerAuthUser } from '@/lib/server-auth';
import { performTicketCheckIn } from '@/lib/ticket-check-in';

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

    const result = await performTicketCheckIn({
      ticketId,
      eventId,
      verifierSessionId: null,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.message,
          reason: result.reason,
          ticket: result.ticket,
        },
        { status: result.statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.markedUsed
        ? 'Ticket marked as used.'
        : 'Ticket checked in for today.',
      ticket: result.ticket,
      checkInDay: result.checkInDay,
      markedUsed: result.markedUsed,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
