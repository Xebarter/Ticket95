import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { VERIFIER_TICKET_SELECT } from '@/lib/verifier-auth'
import { broadcastTicketUpdate, getVerifierSession } from '@/lib/verifier-session'

export async function POST(request: NextRequest) {
  try {
    const session = await getVerifierSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const ticketId = String(body?.ticketId || '').trim()
    if (!ticketId) {
      return NextResponse.json({ error: 'ticketId is required' }, { status: 400 })
    }

    const nowIso = new Date().toISOString()

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('tickets')
      .update({
        status: 'used',
        checked_in_at: nowIso,
        checked_in_by: session.sessionId,
      })
      .eq('id', ticketId)
      .eq('event_id', session.eventId)
      .eq('status', 'valid')
      .select(VERIFIER_TICKET_SELECT)
      .maybeSingle()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    if (!updated) {
      const { data: existing } = await supabaseAdmin
        .from('tickets')
        .select(VERIFIER_TICKET_SELECT)
        .eq('id', ticketId)
        .eq('event_id', session.eventId)
        .maybeSingle()

      return NextResponse.json(
        {
          error: 'Ticket was already checked in or is not valid',
          conflict: true,
          ticket: existing,
        },
        { status: 409 }
      )
    }

    void broadcastTicketUpdate(session.eventId, updated)

    return NextResponse.json({
      success: true,
      ticket: updated,
      checkedInBy: session.deviceName,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
