import { NextRequest, NextResponse } from 'next/server';
import { getTicketById, getEventById, getSponsorsByEvent } from '@/lib/supabase-db';
import { getSession } from '@/lib/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const ticket = await getTicketById(id);

    if (!ticket || ticket.user_id !== session.userId) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const event = await getEventById(ticket.event_id);
    const sponsors = await getSponsorsByEvent(ticket.event_id);

    return NextResponse.json({
      ticket,
      event: { ...event, sponsors },
    }, { status: 200 });
  } catch (error) {
    console.error('Get ticket error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}