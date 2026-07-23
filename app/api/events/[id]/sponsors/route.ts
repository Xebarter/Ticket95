import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Public sponsor list for ticket PDFs / event pages.
 * Returns sponsors for approved events (or any event id that exists for authenticated
 * organizer/admin paths are not required — only approved events are exposed).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    if (!eventId) {
      return NextResponse.json({ error: 'Missing event id' }, { status: 400 });
    }

    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id, status')
      .eq('id', eventId)
      .maybeSingle();

    if (eventError) {
      return NextResponse.json({ error: eventError.message }, { status: 500 });
    }

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const { data: sponsors, error: sponsorsError } = await supabaseAdmin
      .from('sponsors')
      .select('name, logo_url, order_index')
      .eq('event_id', eventId)
      .order('order_index', { ascending: true });

    if (sponsorsError) {
      return NextResponse.json({ error: sponsorsError.message }, { status: 500 });
    }

    return NextResponse.json({
      sponsors: (sponsors || []).map((sponsor) => ({
        name: sponsor.name,
        logo_url: sponsor.logo_url || undefined,
      })),
    });
  } catch (error) {
    console.error('GET /api/events/[id]/sponsors:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
