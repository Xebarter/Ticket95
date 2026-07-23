import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getServerAuthUser } from '@/lib/server-auth';
import { normalizeQrValue, parseTicketQr } from '@/lib/ticket-verification';

type EventRecord = {
  id: string;
  name: string;
  organizer_id: string;
};

async function getOwnedEvent(eventId: string, userId: string, role: string) {
  const { data, error } = await supabaseAdmin
    .from('events')
    .select('id, name, organizer_id')
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
    const scannedRaw = normalizeQrValue(body?.qrData);

    if (!eventId || !scannedRaw) {
      return NextResponse.json({ error: 'Event and QR payload are required' }, { status: 400 });
    }

    const event = await getOwnedEvent(eventId, auth.userId, auth.role);
    if (!event) {
      return NextResponse.json({ error: 'Invalid verification link.' }, { status: 404 });
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

      if (byIdError) return NextResponse.json({ error: byIdError.message }, { status: 500 });
      ticket = byId?.[0] ?? null;
    }

    if (!ticket) {
      const lookupRaw = parsed.kind === 'opaque' ? parsed.raw : scannedRaw;
      const { data: byQrCode, error: byQrCodeError } = await supabaseAdmin
        .from('tickets')
        .select(ticketSelect)
        .eq('qr_code', lookupRaw)
        .limit(1);

      if (byQrCodeError) return NextResponse.json({ error: byQrCodeError.message }, { status: 500 });
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
        message: 'This ticket belongs to a different event.',
        ticket: {
          id: ticket.id,
          status: ticket.status,
        },
      });
    }

    if (ticket.status !== 'valid') {
      return NextResponse.json({
        valid: false,
        reason: ticket.status === 'used' ? 'already_used' : 'invalid_status',
        message: ticket.status === 'used' ? 'Ticket already used.' : `Ticket is not valid for entry (${ticket.status}).`,
        ticket: {
          id: ticket.id,
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
        ticketTypeName: ticket.ticket_type_name,
        status: ticket.status,
        createdAt: ticket.created_at,
        updatedAt: ticket.updated_at,
      },
      canMarkUsed: true,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
