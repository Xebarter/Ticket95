import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { VERIFIER_TICKET_SELECT } from '@/lib/verifier-auth'
import { getVerifierSession } from '@/lib/verifier-session'

export async function GET(request: NextRequest) {
  try {
    const session = await getVerifierSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: event } = await supabaseAdmin
      .from('events')
      .select('id, name, date, venue, verify_slug')
      .eq('id', session.eventId)
      .maybeSingle()

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const { data: tickets, error } = await supabaseAdmin
      .from('tickets')
      .select(VERIFIER_TICKET_SELECT)
      .eq('event_id', session.eventId)
      .order('updated_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = tickets || []
    const checkedIn = rows.filter((t) => t.status === 'used').length
    const valid = rows.filter((t) => t.status === 'valid').length

    return NextResponse.json({
      event: {
        id: event.id,
        name: event.name,
        date: event.date,
        venue: event.venue,
        slug: event.verify_slug,
      },
      deviceName: session.deviceName,
      tickets: rows,
      stats: {
        loaded: rows.length,
        checkedIn,
        remaining: valid,
      },
      syncedAt: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
