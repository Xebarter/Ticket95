import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getServerAuthUser } from '@/lib/server-auth';
import { parseTicketQr, normalizeQrValue } from '@/lib/ticket-verification';

type EventRecord = {
  id: string;
  name: string;
  date: string;
  venue: string;
  organizer_id: string;
};

async function getAccessibleEvent(eventId: string, userId: string, role: 'admin' | 'organizer' | 'customer') {
  const { data, error } = await supabaseAdmin
    .from('events')
    .select('id, name, date, venue, organizer_id')
    .eq('id', eventId)
    .single<EventRecord>();

  if (error || !data) return null;
  if (role === 'admin') return data;
  if (role === 'organizer' && data.organizer_id === userId) return data;
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthUser(request);
    if (!session || (session.role !== 'admin' && session.role !== 'organizer')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const eventId = String(body?.eventId || '').trim();
    const scannedRaw = normalizeQrValue(body?.qrData);

    if (!eventId || !scannedRaw) {
      return NextResponse.json({ error: 'Event and QR payload are required' }, { status: 400 });
    }

    const event = await getAccessibleEvent(eventId, session.userId, session.role);
    if (!event) {
      return NextResponse.json({ error: 'Event not found or access denied' }, { status: 404 });
    }

    const parsed = parseTicketQr(scannedRaw);
    if (!parsed) {
      return NextResponse.json({
        valid: false,
        reason: 'invalid_qr_format',
        message: 'Invalid QR payload format.',
      });
    }

    const ticketSelect = 'id, event_id, event_name, ticket_type_name, status, created_at, updated_at, qr_code';

    let ticket: any = null;
    if (parsed.kind === 'ticket-id') {
      const { data: byId, error: byIdError } = await supabaseAdmin
        .from('tickets')
        .select(ticketSelect)
        .eq('id', parsed.ticketId)
        .limit(1);

      if (byIdError) {
        return NextResponse.json({ error: byIdError.message }, { status: 500 });
      }

      ticket = byId?.[0] ?? null;
    }

    if (!ticket) {
      const lookupRaw = parsed.kind === 'opaque' ? parsed.raw : scannedRaw;
      const { data: byQrCode, error: byQrCodeError } = await supabaseAdmin
        .from('tickets')
        .select(ticketSelect)
        .eq('qr_code', lookupRaw)
        .limit(1);

      if (byQrCodeError) {
        return NextResponse.json({ error: byQrCodeError.message }, { status: 500 });
      }

      ticket = byQrCode?.[0] ?? null;
    }

    if (!ticket) {
      return NextResponse.json({
        valid: false,
        reason: 'ticket_not_found',
        message: 'Ticket not found.',
      });
    }

    if (ticket.event_id !== event.id) {
      return NextResponse.json({
        valid: false,
        reason: 'wrong_event',
        message: `This ticket does not belong to "${event.name}".`,
        ticket: {
          id: ticket.id,
          eventName: ticket.event_name,
          status: ticket.status,
        },
      });
    }

    if (ticket.status !== 'valid') {
      const message =
        ticket.status === 'used'
          ? 'Ticket already used.'
          : `Ticket is not valid for entry (${ticket.status}).`;

      return NextResponse.json({
        valid: false,
        reason: ticket.status === 'used' ? 'already_used' : 'invalid_status',
        message,
        ticket: {
          id: ticket.id,
          eventName: ticket.event_name,
          ticketTypeName: ticket.ticket_type_name,
          status: ticket.status,
          updatedAt: ticket.updated_at,
        },
      });
    }

    return NextResponse.json({
      valid: true,
      reason: 'ok',
      message: 'Valid ticket.',
      ticket: {
        id: ticket.id,
        eventName: ticket.event_name,
        ticketTypeName: ticket.ticket_type_name,
        status: ticket.status,
        createdAt: ticket.created_at,
        updatedAt: ticket.updated_at,
      },
      event: {
        id: event.id,
        name: event.name,
      },
      canMarkUsed: true,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
